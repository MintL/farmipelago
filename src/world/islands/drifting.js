import { addIslandService, restoreIslandServices, serviceIslandSettings } from '../services/index.js';
import { advancePreparation, finishPreparation } from '../../core/preparation.js';
import { TILE, THREE } from '../../core/shared.js';
import { ATTACHMENT_RULES, attachmentCandidateSteps } from './attachment-placement.js';
import { createAttachmentRoutePlanner, routeLength } from './attachment-route.js';
import { TRAVEL_DIRECTION } from '../travel.js';
import { createMotionSafety, envelopesIntersect, ORIGIN, translateBox, solidVisualBoxes, boxOfBridge } from './motion-safety.js';
import { velocityOnRoute } from './approach-route.js';
import { seededRandom } from './procedural.js';

const ENCOUNTER_SECONDS = 20;
const ENCOUNTER_VARIATION_SECONDS = 4;
// Temporarily paused: distant decoration is not useful on small screens.
const DECORATIVE_ISLANDS_ENABLED = false;
const DECORATION_SECONDS = 20;
const INITIAL_DECORATIONS = 3;
const MAX_DECORATIONS = 4;
const MAX_ISLANDS = 48;
// Use the former maximum encounter cruise for every passing island.
const PASSING_SPEED_MULTIPLIER = 1.8;
const MAX_APPROACHING_ENCOUNTERS = 2;
const VIEW_MARGIN = 2 * TILE;
const copy = p => ({ x: p.x, y: p.y || 0, z: p.z });
const shoreDistance = (island, p, observer) => {
  let nearest = Infinity;
  for (const tile of island.terrain.values()) nearest = Math.min(nearest,
    Math.hypot(Math.max(0, Math.abs(tile.x + p.x - observer.x) - TILE / 2),
      Math.max(0, Math.abs(tile.z + p.z - observer.z) - TILE / 2)));
  return nearest;
};

export function createDriftingIslands(parent, terrain, seed, createIsland, physics, camera, options = {}) {
  const root = new THREE.Group();
  root.name = 'passing-islands';
  let initialProps = [];
  parent.add(root);
  const retained = [];
  const bridges = options.bridgeBlocks || [];
  const safety = createMotionSafety(() => ({ terrain, lowerBlocks: options.lowerBlocks || [], obstacles: options.obstacles || [],
    bridgeBlocks: bridges, visualBoxes: () => [...initialProps, ...retained.flatMap(island => safety.envelope(island).boxes
      .map(box => ({ ...translateBox(box, island.group.position), islandId: island.id })))] }));
  const frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
  const bounds = new THREE.Box3(), viewBounds = new THREE.Box3(), sphere = new THREE.Sphere();
  const active = [];
  const savedPopulation = Array.isArray(options.saved?.islands) ? options.saved : null;
  let elapsed = savedPopulation?.elapsed ?? 0, decorationElapsed = savedPopulation?.decorationElapsed ?? 0;
  let retryAt = savedPopulation?.retryAt ?? 0, sequence = savedPopulation?.sequence ?? 0, initialized = false;
  let populationInitialized = savedPopulation?.initialized ?? false;
  let sinceEncounter = savedPopulation?.sinceEncounter ?? Math.min(ENCOUNTER_SECONDS + ENCOUNTER_VARIATION_SECONDS,
    Math.max(0, Number(options.saved?.sinceEncounter) || 0));
  let lastArrival = savedPopulation?.lastArrival ?? null, encounterStatus = 'Preparing first approach';
  let travelState = { direction: TRAVEL_DIRECTION, speed: 1.15, phase: 0 };
  let preparation = null, decorationsQueued = 0, encounterAttempted = false;
  let running = false, attachmentStep = null, pendingEncounter = null, forecastAt = -Infinity, forecastCache = [];
  let fastIslands = options.fastIslands === true;
  const passingSpeed = () => travelState.speed * PASSING_SPEED_MULTIPLIER * (fastIslands ? 10 : 1);
  const approaching = () => active.filter(island => island.plan && !island.arrived);
  const observer = () => options.getObserver?.() || physics.vehicleState() || { x: 0, z: 0 };
  const updateFrustum = () => {
    if (!camera) return;
    camera.updateWorldMatrix(true, false);
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projection);
  };
  const measureVisuals = island => {
    island.visualBounds = bounds.setFromObject(island.group).clone()
      .translate(island.group.position.clone().negate());
    if (island.serviceBounds) island.visualBounds.union(island.serviceBounds);
    island.visualSphere = island.visualBounds.getBoundingSphere(new THREE.Sphere());
  };
  const inView = (island, at = island.group.position, margin = VIEW_MARGIN) => {
    if (!camera) return false;
    if (island.visualBounds) {
      viewBounds.copy(island.visualBounds).translate(new THREE.Vector3(at.x, at.y || 0, at.z)).expandByScalar(margin);
      return frustum.intersectsBox(viewBounds);
    }
    sphere.copy(island.visualSphere || new THREE.Sphere(new THREE.Vector3(), island.radius + 12));
    sphere.center.add(new THREE.Vector3(at.x, at.y || 0, at.z));
    sphere.radius += margin;
    return frustum.intersectsSphere(sphere);
  };
  const visibleLaneGoal = (island, goal, direction) => {
    if (!camera) return goal;
    // Intersect the entire lane with the camera frustum. Its nearest point to
    // the farm may be off-screen even when another part of the lane is visible.
    let enter = -Infinity, leave = Infinity;
    const box = island.visualBounds;
    for (const plane of frustum.planes) {
      const n = plane.normal;
      const support = n.x * (n.x >= 0 ? box.max.x : box.min.x)
        + n.y * (n.y >= 0 ? box.max.y : box.min.y)
        + n.z * (n.z >= 0 ? box.max.z : box.min.z);
      const distance = n.x * goal.x + n.z * goal.z + plane.constant + support;
      const slope = n.x * direction.x + n.z * direction.z;
      if (Math.abs(slope) < .000001) { if (distance < 0) return null; }
      else if (slope > 0) enter = Math.max(enter, -distance / slope);
      else leave = Math.min(leave, -distance / slope);
    }
    if (!Number.isFinite(enter) || !Number.isFinite(leave) || leave - enter < 8 * TILE) return null;
    const near = observer();
    const closest = (near.x - goal.x) * direction.x + (near.z - goal.z) * direction.z;
    const t = Math.max(enter + 2 * TILE, Math.min(leave - 2 * TILE, closest));
    return { x: goal.x + direction.x * t, y: 0, z: goal.z + direction.z * t };
  };
  const clearOfTraffic = (island, from, to = from) => {
    const delta = { x: to.x - from.x, y: (to.y || 0) - (from.y || 0), z: to.z - from.z };
    return active.every(other => other === island || !envelopesIntersect(safety.trafficEnvelope(island), from, delta,
      safety.trafficEnvelope(other), physics.movingIslandPosition(other.body), ORIGIN, TILE));
  };
  const makeIsland = function* (fallback) {
    let island;
    try {
      const islandSeed = (seed + Math.imul(++sequence, 0x9e3779b9)) >>> 0;
      const serviceId = options.chooseService?.(islandSeed) || null;
      const settings = serviceId ? serviceIslandSettings(serviceId) : fallback ? { radius: 4, maxElevation: 0, terraceCoverage: .2, treeDensity: 0, treeBaseChance: 0, rockDensity: 0 } : {};
      island = options.generateIslandSteps
        ? yield* options.generateIslandSteps(islandSeed, settings) : createIsland(islandSeed, settings);
      if (!addIslandService(island, serviceId)) { island.dispose(); retryAt = elapsed + 2; return null; }
    } catch (error) {
      console.error('Unable to generate a passing island:', error);
      retryAt = elapsed + 2;
      return null;
    }
    if ([...terrain.values()].some(tile => tile.islandId === island.id) || active.some(other => other.id === island.id)) {
      island.dispose(); return null;
    }
    island.animate(elapsed, travelState);
    measureVisuals(island);
    return island;
  };
  const publish = island => {
    if (active.length >= MAX_ISLANDS || !island.route || inView(island)
      || inView(island, island.route[island.route.length - 1])
      || !safety.routeClear(island, island.route, { margin: TILE, traffic: true })
      || !island.route.slice(1).every((to, i) => safety.shoreClear(island, island.route[i], to))
      || !routeTrafficClear(island, island.route)
      || !safety.reserve(island, island.route)) return false;
    island.status = 'drifting';
    island.velocity = { ...ORIGIN };
    try {
      island.body = physics.addMovingIsland(island, island.group.position, false);
    } catch (error) { safety.unreserve(island.id); throw error; }
    root.add(island.group);
    active.push(island);
    return true;
  };
  const remove = island => {
    safety.unreserve(island.id);
    physics.removeMovingIsland(island.body);
    active.splice(active.indexOf(island), 1);
    island.dispose();
  };
  const outsideStartSteps = function* (island, goal, normal) {
    // Walk outward to the current camera edge, rather than adding a fixed
    // distance around the whole farm. The full route still needs shore clearance.
    const start = { x: goal.x, y: 0, z: goal.z };
    for (let i = 0; i < 400; i++) {
      yield;
      start.x += normal.x * 2 * TILE;
      start.z += normal.z * 2 * TILE;
      if (!inView(island, start) && safety.clear(island, start, start)
        && safety.shoreClear(island, start, start) && clearOfTraffic(island, start)) return start;
    }
    return null;
  };
  const outsideStart = (...args) => finishPreparation(outsideStartSteps(...args));
  const extendDeparture = island => {
    const route = island.route, end = route[route.length - 1];
    if (!inView(island, end, VIEW_MARGIN + 4 * TILE)) return;
    if (elapsed < (island.departureRetryAt || 0)) return;
    island.departureRetryAt = elapsed + .5;
    // Retain the published heading, including after a released island descends.
    let previous = route.length - 2;
    while (previous >= 0 && Math.hypot(end.x - route[previous].x, end.z - route[previous].z) < .025) previous--;
    if (previous < 0) return;
    const dx = end.x - route[previous].x, dz = end.z - route[previous].z;
    const length = Math.hypot(dx, dz), target = copy(end);
    for (let i = 0; i < 400; i++) {
      target.x += dx / length * 2 * TILE;
      target.z += dz / length * 2 * TILE;
      if (inView(island, target, VIEW_MARGIN + 8 * TILE)) continue;
      const extension = [end, target];
      if (!safety.routeClear(island, extension, { margin: TILE, traffic: true })
        || !safety.shoreClear(island, end, target) || !routeTrafficClear(island, extension)) return;
      // Replace the straight final segment; retain a release's vertical descent.
      const descending = Math.abs((route[route.length - 2].y || 0) - (end.y || 0)) > .025;
      const extended = descending ? [...route, target] : [...route.slice(0, -1), target];
      if (!safety.reserve(island, extended, [], island.reservationBounds || safety.envelope(island).bounds)) return;
      island.routeIndex = Math.min(island.routeIndex, extended.length - 1);
      island.route = extended;
      if (island.plan) island.plan.route = extended;
      island.routeComplete = false;
      forecastAt = -Infinity;
      return;
    }
  };
  const planEncounter = function* (island) {
    const near = copy(observer());
    const incoming = { ...travelState.direction };
    const speed = passingSpeed();
    // One seeded 16–24-second spacing per candidate, independent of generation
    // randomness. Apply it to shore arrivals, then subtract the approach below.
    const interval = ENCOUNTER_SECONDS
      + (seededRandom(island.seed ^ 0x510e527f)() * 2 - 1) * ENCOUNTER_VARIATION_SECONDS;
    const due = Math.max(elapsed + Math.max(0, interval - sinceEncounter),
      ...approaching().map(island => island.plan.due + interval));
    const candidates = yield* attachmentCandidateSteps(island.terrain, terrain, bridges);
    // Prefer the closest shore to the active vehicle; compactness breaks ties.
    for (const p of candidates) {
      yield;
      p.observerDistance = shoreDistance(island, p, near);
    }
    const reachable = candidates.filter(p => p.observerDistance <= ATTACHMENT_RULES.range);
    const choices = (reachable.length ? reachable : candidates)
      .sort((a, b) => a.observerDistance - b.observerDistance || b.score - a.score);
    for (const placement of choices.slice(0, 48)) {
      for (const gap of placement.gaps) for (const offset of [1.6, 2.6, 4.6, 6.6]) {
        yield;
        const dx = gap.to.x - gap.from.x, dz = gap.to.z - gap.from.z, length = Math.hypot(dx, dz);
        const normal = { x: dx / length, z: dz / length };
        const goal = { x: placement.x + normal.x * offset, y: 0, z: placement.z + normal.z * offset };
        if (camera && !inView(island, goal, 0)) continue;
        if (reachable.length && shoreDistance(island, goal, near) > ATTACHMENT_RULES.range) continue;
        if (!safety.clear(island, goal, goal) || !safety.shoreClear(island, goal, goal)) continue;
        yield;
        const pull = createAttachmentRoutePlanner(island.terrain, terrain, bridges, goal)(placement);
        if (!pull || !safety.routeClear(island, pull)) continue;
        // A shore encounter is a pass, not a head-on arrival followed by a turn.
        // Use the same current as decorative lanes, with up to 30 degrees of bias.
        // Both sides must clear land before publishing this straight route.
        for (const angle of [0, Math.PI / 12, -Math.PI / 12, Math.PI / 6, -Math.PI / 6]) {
          yield;
          const c = Math.cos(angle), s = Math.sin(angle);
          const entry = { x: incoming.x * c - incoming.z * s, z: incoming.x * s + incoming.z * c };
          const flow = { x: -entry.x, z: -entry.z };
          const start = yield* outsideStartSteps(island, goal, entry);
          const exit = yield* outsideStartSteps(island, goal, flow);
          if (!start || !exit) continue;
          const route = [start, goal, exit];
          if (!safety.routeClear(island, route, { margin: TILE, traffic: true })
            || !routeTrafficClear(island, route) || !safety.canReserve(island, route)
            || !route.slice(1).every((to, i) => safety.shoreClear(island, route[i], to))) continue;
          const distance = routeLength([start, goal]);
          const duration = distance / speed;
          const launchAt = Math.max(elapsed, due - duration);
          return { route, placement, normal, flow, arrivalIndex: 2, launchAt, due: launchAt + duration,
            goal, observer: copy(near) };
        }
      }
    }
    return null;
  };
  const launchEncounter = () => {
    if (!pendingEncounter) return;
    if (elapsed < pendingEncounter.plan.launchAt) return;
    const island = pendingEncounter;
    pendingEncounter = null;
    const moved = Math.hypot(observer().x - island.plan.observer.x, observer().z - island.plan.observer.z) > 8;
    if (moved || !publish(island)) {
      safety.unreserve(island.id);
      island.dispose(); retryAt = elapsed + 2;
      if (!approaching().length) encounterStatus = 'Waiting for a clear complete passage';
      return;
    }
    island.arrived = false;
    island.plan.due = elapsed + routeLength(island.route.slice(0, island.plan.arrivalIndex)) / passingSpeed();
    encounterStatus = 'Island approaching';
  };
  const planDecoration = function* (island) {
    const b = safety.fixedBounds();
    const center = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
    const entry = { ...travelState.direction };
    const normal = { x: -entry.z, z: entry.x };
    const shape = safety.envelope(island).bounds;
    const tileRadius = TILE / 2 * (Math.abs(normal.x) + Math.abs(normal.z));
    const projections = [...terrain.values()].map(tile => (tile.x - center.x) * normal.x + (tile.z - center.z) * normal.z);
    const edges = { min: Math.min(...projections) - tileRadius, max: Math.max(...projections) + tileRadius };
    const islandRadius = Math.abs(normal.x) * Math.max(Math.abs(shape.minX), Math.abs(shape.maxX))
      + Math.abs(normal.z) * Math.max(Math.abs(shape.minZ), Math.abs(shape.maxZ));
    const clearance = islandRadius + ATTACHMENT_RULES.range + 2 * TILE;
    // Follow the projected shore instead of a much larger enclosing circle.
    // Admit only lanes that actually cross the current gameplay view.
    for (const lane of [1, -1, 2, -2]) {
      yield;
      const side = sequence % 2 ? lane : -lane;
      const offset = (side > 0 ? edges.max + clearance : edges.min - clearance)
        + Math.sign(side) * (Math.abs(side) - 1) * 4 * TILE;
      const goal = visibleLaneGoal(island,
        { x: center.x + normal.x * offset, y: 0, z: center.z + normal.z * offset }, entry);
      if (!goal) continue;
      const start = yield* outsideStartSteps(island, goal, entry);
      const end = yield* outsideStartSteps(island, goal, { x: -entry.x, z: -entry.z });
      if (!start || !end) continue;
      island.route = [start, end];
      island.routeIndex = 1;
      island.group.position.copy(start);
      if (safety.routeClear(island, island.route, { margin: TILE, traffic: true })
        && safety.shoreClear(island, start, end) && routeTrafficClear(island, island.route)
        && safety.canReserve(island, island.route)) return true;
    }
    return false;
  };
  const prepareIsland = function* (encounter) {
    let island = null, visualWork = null;
    try {
      island = yield* makeIsland(encounter && sequence % 3 === 2);
      if (!island) return;
      island.encounter = encounter;
      yield;
      if (encounter) {
        const plan = yield* planEncounter(island);
        if (!plan) return;
        island.plan = plan;
        island.route = plan.route;
        island.routeIndex = 1;
        island.group.position.copy(plan.route[0]);
      } else if (!(yield* planDecoration(island))) return;
      yield;
      if (!safety.reserve(island, island.route)) return;
      if (options.prepareVisuals) {
        let ready = false, failure = null;
        visualWork = Promise.resolve(options.prepareVisuals(island));
        visualWork.then(() => { ready = true; }, error => { failure = error; ready = true; });
        // Waiting on the GPU must not consume the preparation CPU budget.
        while (!ready) yield false;
        if (failure) throw failure;
      }
      if (encounter) {
        pendingEncounter = island;
        if (!approaching().length) encounterStatus = 'Approach reserved; waiting to launch';
      } else if (!publish(island)) return;
      island = null; // Ownership passes to the pending slot or active population.
    } catch (error) {
      console.error('Unable to prepare a passing island:', error);
    } finally {
      if (island) {
        const rejected = island;
        safety.unreserve(rejected.id);
        // compileAsync still uses the materials until its promise settles.
        if (visualWork) visualWork.then(() => rejected.dispose(), () => rejected.dispose());
        else rejected.dispose();
      }
      if (encounter && !pendingEncounter) {
        retryAt = elapsed + 2;
        if (!approaching().length) encounterStatus = 'Waiting for a suitable clear shore';
      }
    }
  };
  const cancelPreparation = () => {
    preparation?.return();
    preparation = null;
  };
  const preparePopulation = () => {
    if (!preparation) {
      const encounterDue = !pendingEncounter && approaching().length < MAX_APPROACHING_ENCOUNTERS
        && elapsed >= retryAt && active.length < MAX_ISLANDS;
      if (encounterDue && (!encounterAttempted || !decorationsQueued)) {
        encounterAttempted = true;
        preparation = prepareIsland(true);
      } else if (decorationsQueued) {
        decorationsQueued--;
        if (active.length < MAX_ISLANDS - 2 && active.filter(island => !island.encounter).length < MAX_DECORATIONS) {
          preparation = prepareIsland(false);
        }
      }
    }
    if (preparation && advancePreparation(preparation).done) preparation = null;
  };
  const propose = (island, position, dt, routeIndex = island.routeIndex) =>
    velocityOnRoute(position, island.route, routeIndex,
      passingSpeed(), dt);
  const step = dt => {
    if (!running) { active.forEach(island => physics.setMovingIslandVelocity(island.body, ORIGIN)); return; }
    attachmentStep?.(dt);
    const proposals = active.map(island => {
      const position = physics.movingIslandPosition(island.body);
      const next = propose(island, position, dt);
      island.routeIndex = next.index;
      island.routeComplete = next.complete;
      if (next.complete && island.status === 'releasing') island.status = 'drifting';
      // Keep the complete reservation, including camera-driven extensions,
      // through retirement. Extensions are checked before entering them.
      return { island, position, velocity: next.velocity, priority: island.status === 'releasing' ? 0 : island.encounter ? 1 : 2 };
    });
    for (const record of safety.resolve(proposals, dt)) {
      record.island.velocity = record.velocity;
      record.island.blocked = record.blocked;
      physics.setMovingIslandVelocity(record.island.body, record.velocity);
    }
  };
  physics.beforeIslandStep = step;
  const routeTrafficClear = (island, route) => route.slice(1).every((to, i) => clearOfTraffic(island, route[i], to));
  const api = {
    active, safety,
    setFastIslands(enabled) { fastIslands = Boolean(enabled); forecastAt = -Infinity; },
    setAttachmentStep(callback) { attachmentStep = callback; },
    restoreConnection(island, route, gaps) {
      if (!safety.reserve(island, route, gaps.map(boxOfBridge))) throw new Error('Saved island connection overlaps a reserved route.');
    },
    canMoveConnection(island, from, to) { return safety.clear(island, from, to) && clearOfTraffic(island, from, to); },
    canPlanConnection(island, route) { return safety.routeClear(island, route) && routeTrafficClear(island, route); },
    retain(island) { cancelPreparation(); if (!retained.includes(island)) retained.push(island); safety.invalidate(); },
    invalidate() { cancelPreparation(); safety.invalidate(); forecastAt = -Infinity; },
    reserveConnection(island, route, gaps) {
      if (!safety.routeClear(island, route) || !routeTrafficClear(island, route)) return false;
      const extras = gaps.map(gap => boxOfBridge(gap));
      // Bridge construction must also have an empty corridor.
      for (const other of active) if (other !== island) {
        const p = physics.movingIslandPosition(other.body);
        const shape = { boxes: extras, bounds: extras.length ? unionBridgeBoxes(extras) : safety.envelope(island).bounds };
        if (extras.length && envelopesIntersect(shape, ORIGIN, ORIGIN, safety.trafficEnvelope(other), p, ORIGIN, TILE)) return false;
      }
      return safety.reserve(island, route, extras);
    },
    clearReservation(island) { cancelPreparation(); safety.unreserve(island.id); safety.invalidate(); },
    take(island) {
      cancelPreparation();
      if (!island.arrived) { sinceEncounter = 0; lastArrival = elapsed; }
      active.splice(active.indexOf(island), 1);
      physics.removeMovingIsland(island.body); island.body = null;
      island.reservationBounds = null;
    },
    planRelease(island, force = false) {
      if (!force && island.releaseCheck && elapsed - island.releaseCheck.time < 1) return island.releaseCheck.route;
      island.extraMotionBoxes = options.getExtraIslandBoxes?.(island) || [];
      safety.invalidate(island);
      const position = copy(island.group.position), b = safety.fixedBounds(), shape = safety.envelope(island).bounds;
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const dx = position.x - cx, dz = position.z - cz, length = Math.hypot(dx, dz) || 1;
      const normal = { x: dx / length || 1, z: dz / length };
      const end = outsideStart(island, position, normal);
      if (!end) { island.releaseCheck = { time: elapsed, route: null }; return null; }
      const ignoreSources = new Set(retained.flatMap(source => (source.links || [])
        .filter(link => source === island || link.gap.from.islandId === island.id).flatMap(link => link.blocks)));
      const height = Math.max(0, b.maxY - shape.minY + 2);
      const lifted = { ...position, y: height }, over = { ...end, y: height };
      const direct = [position, end];
      const route = safety.routeClear(island, direct, { ignoreSources }) ? direct : [position, lifted, over, end];
      const valid = safety.routeClear(island, route, { ignoreSources }) && routeTrafficClear(island, route)
        && safety.canReserve(island, route) && (!force || safety.reserve(island, route));
      island.releaseCheck = { time: elapsed, route: valid ? route : null };
      return island.releaseCheck.route;
    },
    resume(island, route) {
      cancelPreparation();
      const index = retained.indexOf(island); if (index >= 0) retained.splice(index, 1);
      safety.invalidate(island);
      measureVisuals(island);
      island.encounter = true; island.arrived = true; island.plan = null;
      island.route = route; island.routeIndex = 1;
      island.routeComplete = false;
      // planRelease(force=true) acquired this route before detaching the land.
      island.body = physics.addMovingIsland(island, island.group.position, false);
      root.add(island.group); active.push(island);
    },
    restore() {
      // Retained land and pending connection reservations are restored first.
      // Published islands may already be visible, so do not use spawn checks.
      for (const saved of savedPopulation?.islands || []) {
        if (!DECORATIVE_ISLANDS_ENABLED && saved.encounter === false) continue;
        const island = createIsland(saved.seed, saved.settings);
        if (saved.fields) island.restoreFields(saved.fields);
        restoreIslandServices(island, saved.services);
        island.id = saved.id;
        island.terrain.forEach(tile => { tile.islandId = saved.id; });
        island.group.position.copy(saved.position);
        island.status = saved.status;
        island.encounter = saved.encounter;
        island.arrived = saved.arrived;
        island.route = saved.route.map(copy);
        island.routeIndex = saved.routeIndex;
        island.routeComplete = saved.routeComplete;
        island.plan = saved.plan && { ...saved.plan, placement: { ...saved.plan.placement } };
        island.velocity = { ...ORIGIN };
        // Preserve the original reserved envelope, including carried structures.
        island.reservationBounds = { ...saved.reservationBounds };
        island.extraMotionBoxes = saved.extraMotionBoxes.map(box => ({ ...box }));
        measureVisuals(island);
        if (!safety.reserve(island, island.route, [], island.reservationBounds)) {
          island.dispose();
          throw new Error('Saved drifting island overlaps a reserved route.');
        }
        island.body = physics.addMovingIsland(island, saved.position, false);
        root.add(island.group);
        active.push(island);
      }
      if (active.some(island => island.encounter && !island.arrived)) encounterStatus = 'Island approaching';
    },
    persistentState: () => ({
      sinceEncounter, elapsed, decorationElapsed, retryAt, sequence, lastArrival, initialized: populationInitialized,
      islands: active.map(island => ({
        id: island.id, seed: island.seed, settings: { ...island.settings },
        fields: island.persistentFields(), services: structuredClone(island.services || []),
        position: copy(physics.movingIslandPosition(island.body)), status: island.status,
        encounter: Boolean(island.encounter), arrived: Boolean(island.arrived),
        route: island.route.map(copy), routeIndex: island.routeIndex, routeComplete: Boolean(island.routeComplete),
        speed: passingSpeed(),
        reservationBounds: { ...(island.reservationBounds || safety.envelope(island).bounds) },
        extraMotionBoxes: (island.extraMotionBoxes || []).map(box => ({ ...box })),
        plan: island.plan ? { due: island.plan.due, arrivalIndex: island.plan.arrivalIndex,
          placement: { gx: island.plan.placement.gx, gz: island.plan.placement.gz,
            x: island.plan.placement.x, z: island.plan.placement.z } } : null,
      })),
    }),
    update(delta, nextTravel, enabled = true) {
      running = enabled;
      if (nextTravel) travelState = nextTravel;
      const dt = running ? Math.min(.05, Math.max(0, Number(delta) || 0)) : 0;
      elapsed += dt; sinceEncounter += dt;
      if (DECORATIVE_ISLANDS_ENABLED) decorationElapsed += dt;
      updateFrustum();
      for (const island of active) {
        island.group.position.copy(physics.movingIslandPosition(island.body));
        island.animate(elapsed, nextTravel);
        if (island.plan && !island.arrived) {
          // Derive ETA from the shared cruise, including restored older speeds
          // and any safety stop, before scheduling the next arrival.
          const remaining = [copy(island.group.position), ...island.route.slice(island.routeIndex, island.plan.arrivalIndex)];
          island.plan.due = elapsed + routeLength(remaining) / passingSpeed();
        }
        if (island.plan && !island.arrived && island.routeIndex >= island.plan.arrivalIndex) {
          const placement = createAttachmentRoutePlanner(island.terrain, terrain, bridges, island.group.position)(island.plan.placement);
          if (placement && safety.routeClear(island, placement)) {
            island.arrived = true; lastArrival = elapsed; sinceEncounter = 0;
            encounterStatus = 'Suitable island at shore';
          } else { island.arrived = true; encounterStatus = 'Site changed; preparing replacement'; }
        }
      }
      if (!running) return;
      if (!initialized) {
        initialized = true;
        initialProps = solidVisualBoxes(parent, parent, true);
        safety.invalidate();
        if (!populationInitialized) {
          populationInitialized = true;
          // Finish the first encounter attempt before decorative traffic claims lanes.
          decorationsQueued = DECORATIVE_ISLANDS_ENABLED ? INITIAL_DECORATIONS : 0;
        }
      }
      for (const island of [...active]) if (island.routeComplete && !inView(island) && !physics.isReferenceIsland(island.body)) remove(island);
      active.forEach(extendDeparture);
      launchEncounter();
      if (DECORATIVE_ISLANDS_ENABLED && decorationElapsed >= DECORATION_SECONDS) {
        decorationElapsed %= DECORATION_SECONDS;
        decorationsQueued = Math.min(MAX_DECORATIONS, decorationsQueued + 1);
      }
      preparePopulation();
    },
    inspect() {
      if (elapsed - forecastAt >= 1) {
        forecastAt = elapsed;
        const states = active.map(island => ({ island, position: copy(physics.movingIslandPosition(island.body)),
          routeIndex: island.routeIndex, points: [copy(physics.movingIslandPosition(island.body))] }));
        for (let second = 0; second < 60; second++) {
          const proposed = states.map(state => {
            const next = propose(state.island, state.position, 1, state.routeIndex);
            state.routeIndex = next.index;
            return { island: state.island, position: state.position, velocity: next.velocity,
              priority: state.island.status === 'releasing' ? 0 : state.island.encounter ? 1 : 2 };
          });
          safety.resolve(proposed, 1).forEach((record, i) => {
            const state = states[i];
            state.position = { x: state.position.x + record.velocity.x, y: state.position.y + record.velocity.y, z: state.position.z + record.velocity.z };
            state.points.push(copy(state.position));
          });
        }
        forecastCache = states.map(state => ({ id: state.island.id, points: state.points }));
      }
      const intersections = [];
      for (let i = 0; i < active.length; i++) {
        const a = active[i], pa = physics.movingIslandPosition(a.body);
        if (!safety.clear(a, pa, pa, { margin: 0, reservations: false })) intersections.push(`${a.id} / retained land`);
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          if (envelopesIntersect(safety.envelope(a), pa, ORIGIN, safety.envelope(b), physics.movingIslandPosition(b.body))) {
            intersections.push(`${a.id} / ${b.id}`);
          }
        }
      }
      return { elapsed, sinceEncounter, lastArrival, encounterStatus, intersections,
        nextArrival: approaching().length || pendingEncounter
          ? Math.min(...approaching().map(island => island.plan.due), pendingEncounter?.plan.due ?? Infinity) : null,
        direction: { ...travelState.direction }, reservations: safety.reservationBoxes(),
        islands: active.map(island => ({ id: island.id, kind: island.encounter ? 'encounter' : 'decorative', status: island.status,
          position: copy(island.group.position), velocity: { ...island.velocity }, blocked: island.blocked || null,
          route: island.route?.slice(island.routeIndex).map(copy) || [], forecast: forecastCache.find(f => f.id === island.id)?.points.map(copy) || [],
          envelope: { ...safety.envelope(island).bounds }, destination: island.plan ? copy(island.plan.placement) : null })) };
    },
    dispose() {
      cancelPreparation();
      if (physics.beforeIslandStep === step) physics.beforeIslandStep = null;
      if (pendingEncounter) { safety.unreserve(pendingEncounter.id); pendingEncounter.dispose(); }
      [...active].forEach(remove);
      root.removeFromParent();
    },
  };
  return api;
}

function unionBridgeBoxes(boxes) {
  return { minX: Math.min(...boxes.map(b => b.minX)), maxX: Math.max(...boxes.map(b => b.maxX)),
    minY: Math.min(...boxes.map(b => b.minY)), maxY: Math.max(...boxes.map(b => b.maxY)),
    minZ: Math.min(...boxes.map(b => b.minZ)), maxZ: Math.max(...boxes.map(b => b.maxZ)) };
}
