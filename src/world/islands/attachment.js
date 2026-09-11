import { TILE, THREE } from '../../core/shared.js';
import { ATTACHMENT_RULES, boundaryTiles, findAttachmentPlacement, canReleaseIsland } from './attachment-placement.js';
import { createAttachmentRoutePlanner, createTetherPull, positionOnTetherPull } from './attachment-route.js';
import { createAnchorChains, attachmentChainPairs } from '../connection-chains.js';

export function createIslandAttachments({ group, terrain, islands, connections, drifting, bridgeBlocks, attach, detach, onChange, reducedMotion, getObserver }) {
  let selected = null, preview = null, motion = null, waitElapsed = 0;
  const revealSeconds = reducedMotion ? .3 : .65;
  const launchSeconds = reducedMotion ? .7 : 1;
  const pullStartSeconds = revealSeconds + launchSeconds;
  const bridgeSeconds = reducedMotion ? 1.8 : 3;
  const pullEnd = () => motion.placement.pull.launchSeconds + motion.placement.pull.pullSeconds;
  const attached = [];
  const shoreCache = new WeakMap();
  const shore = island => {
    if (!shoreCache.has(island)) shoreCache.set(island, boundaryTiles(island.terrain));
    return shoreCache.get(island);
  };
  const range = island => {
    const observer = getObserver?.();
    if (!observer) return false;
    const position = island.group.position;
    const tiles = island.status === 'attached' ? island.terrain.values() : shore(island);
    for (const tile of tiles) {
      const dx = Math.max(0, Math.abs(tile.x + position.x - observer.x) - TILE / 2);
      const dz = Math.max(0, Math.abs(tile.z + position.z - observer.z) - TILE / 2);
      if (Math.hypot(dx, dz) <= ATTACHMENT_RULES.range) return true;
    }
    return false;
  };
  const choose = island => {
    if (motion && !motion.complete) return;
    api.blockedConnection = null;
    selected = island;
    preview = null;
    if (!island || !range(island)) { selected = null; return; }
    if (island.status !== 'drifting' || !island.encounter) return;
    preview = findAttachmentPlacement(island.terrain, terrain, bridgeBlocks, ATTACHMENT_RULES,
      createAttachmentRoutePlanner(island.terrain, terrain, bridgeBlocks, island.group.position));
  };
  const chainPairs = (island, placement) => attachmentChainPairs(terrain, island.terrain,
    { x: island.group.position.x, z: island.group.position.z, ...placement });
  const makeChains = (island, placement) => createAnchorChains(group, chainPairs(island, placement));
  const api = {
    attached,
    motionState: () => motion && !motion.complete ? { island: motion.island, route: motion.placement.route } : null,
    select: choose,
    available() { return motion && !motion.complete ? [] : [...drifting.active.filter(island => island.status === 'drifting' && island.encounter && range(island)), ...attached.filter(range)]; },
    state() {
      if (selected && !range(selected)) choose(null);
      if (!selected) return null;
      if (selected.status === 'drifting') return {
        island: selected, action: 'Connect', disabled: !preview, waiting: api.blockedConnection === selected.id,
        label: api.blockedConnection === selected.id ? 'Waiting for a clear approach' : preview ? `Join ${preview.gaps.length} ${preview.gaps.length === 1 ? 'island' : 'islands'}` : 'No clear connection site',
      };
      const releasable = canReleaseIsland(selected.id, islands, connections);
      const departure = releasable && drifting.planRelease(selected);
      return { island: selected, action: 'Release', disabled: !departure,
        label: !releasable ? 'Other islands depend on this connection' : departure ? 'Release this island' : 'No clear departure' };
    },
    connect() {
      if (!selected || selected.status !== 'drifting' || !preview || !range(selected) || motion && !motion.complete) return false;
      const island = selected;
      const from = island.group.position.clone();
      const velocity = new THREE.Vector3(island.velocity?.x || 0, 0, island.velocity?.z || 0);
      const catchPosition = from.clone().addScaledVector(velocity, pullStartSeconds);
      const direct = createAttachmentRoutePlanner(island.terrain, terrain, bridgeBlocks, catchPosition);
      const plans = new Map();
      const routeTo = placement => {
        if (!direct(placement)) return null;
        const destination = new THREE.Vector3(placement.x, 0, placement.z);
        const plan = createTetherPull(from, destination, velocity, pullStartSeconds, reducedMotion);
        const towardDock = destination.clone().sub(catchPosition).normalize();
        const force = new THREE.Vector3();
        for (const pair of chainPairs(island, placement)) {
          force.add(pair.start.clone().sub(pair.end).sub(catchPosition).add(destination).normalize());
        }
        // Prefer an actual pulling angle over a socket that needs sideways towing.
        if (force.normalize().dot(towardDock) < .45 || !drifting.canPlanConnection(island, plan.route)) return null;
        plans.set(`${placement.gx},${placement.gz}`, plan);
        return plan.route;
      };
      routeTo.minimumDistance = placement => from.distanceTo(new THREE.Vector3(placement.x, 0, placement.z));
      // The island keeps drifting after selection; rank destinations again
      // using the current launch and catch instead of keeping a stale socket.
      const chosen = findAttachmentPlacement(island.terrain, terrain, bridgeBlocks, ATTACHMENT_RULES, routeTo);
      if (!chosen || !drifting.reserveConnection(island, chosen.route, chosen.gaps)) {
        api.blockedConnection = island.id;
        return false;
      }
      preview = { ...chosen, pull: plans.get(`${chosen.gx},${chosen.gz}`).pull };
      api.blockedConnection = null;
      drifting.take(island);
      island.status = 'connecting';
      const destination = new THREE.Vector3(preview.x, 0, preview.z);
      const chains = makeChains(island, preview);
      chains.update(island.group.position.clone().sub(destination), 0);
      motion = { island, placement: preview, from, destination, chains, chainPairs: chainPairs(island, preview), position: from.clone(), elapsed: 0, complete: false, bridges: null };
      selected = null;
      onChange();
      return true;
    },
    release() {
      const island = selected;
      if (!island || island.status !== 'attached' || !attached.includes(island) || !range(island) || !canReleaseIsland(island.id, islands, connections)) return false;
      const releaseRoute = drifting.planRelease(island, true);
      if (!releaseRoute) return false;
      selected = null;
      // Keep the authored island and its content; only remove playable topology.
      detach(island);
      for (const link of island.links || []) { link.chains?.dispose(); link.visual?.removeFromParent(); }
      for (let index = connections.length - 1; index >= 0; index--) {
        if ([connections[index].from.islandId, connections[index].to.islandId].includes(island.id)) connections.splice(index, 1);
      }
      attached.splice(attached.indexOf(island), 1);
      // A releasable node can be in a cycle. Remove incident chains on either
      // endpoint and rebuild each retained island's remaining chain bundle.
      for (const other of attached) {
        for (const link of other.links) link.chains?.dispose();
        if (other.links.length) {
          const chains = makeChains(other, { gaps: other.links.map(link => link.gap) });
          chains.update(new THREE.Vector3(), 1);
          other.links[0].chains = chains;
        }
      }
      island.status = 'releasing';
      drifting.resume(island, releaseRoute);
      onChange();
      return true;
    },
    advanceMotion(dt) {
      if (!motion || motion.complete) return;
      const next = new THREE.Vector3();
      positionOnTetherPull(motion.from, motion.destination, motion.placement.pull, motion.elapsed + dt, next);
      if (!motion.bridges && !drifting.canMoveConnection(motion.island, motion.position, next)) return;
      motion.position.copy(next);
      motion.elapsed += dt;
    },
    update(dt) {
      waitElapsed += dt;
      if (selected && api.blockedConnection === selected.id && waitElapsed >= 1) { waitElapsed = 0; api.connect(); }
      if (selected && (!range(selected) || selected.status === 'drifting' && !drifting.active.includes(selected))) choose(null);
      if (!motion || motion.complete) return;
      const pullEndSeconds = pullEnd();
      const catchSeconds = motion.placement.pull.launchSeconds;
      const shotStart = catchSeconds * revealSeconds / pullStartSeconds;
      motion.island.group.position.copy(motion.position);
      motion.chains.update(motion.island.group.position.clone().sub(motion.destination),
        THREE.MathUtils.clamp((motion.elapsed - shotStart) / (catchSeconds - shotStart), 0, 1),
        THREE.MathUtils.smoothstep(motion.elapsed, catchSeconds - .15, catchSeconds)
          * (1 - THREE.MathUtils.smoothstep(motion.elapsed, pullEndSeconds, pullEndSeconds + .8)));
      motion.island.animate(motion.elapsed, null);
      if (motion.elapsed >= pullEndSeconds && !motion.bridges) {
        motion.island.group.position.copy(motion.destination);
        motion.bridges = attach(motion.island, motion.placement, false);
        motion.island.links[0].chains = motion.chains;
      }
      const progress = THREE.MathUtils.clamp((motion.elapsed - pullEndSeconds) / bridgeSeconds, 0, 1);
      for (const bridge of motion.bridges || []) bridge.userData.setConstructionProgress(progress, reducedMotion);
      if (progress >= 1) {
        attach(motion.island, motion.placement, true);
        motion.island.status = 'attached';
        attached.push(motion.island);
        drifting.retain(motion.island);
        drifting.clearReservation(motion.island);
        motion.complete = true;
        onChange();
      }
    },
    pendingState() {
      if (!motion || motion.complete) return null;
      const { island, placement, from } = motion;
      const point = tile => ({ gx: tile.gx, gz: tile.gz, x: tile.x, z: tile.z, topY: tile.topY, islandId: tile.islandId });
      return { id: island.id, seed: island.seed, settings: { ...island.settings }, fields: island.persistentFields(), services: structuredClone(island.services || []), placedProcessors: structuredClone(island.placedProcessors || []), from: { x: from.x, y: from.y, z: from.z },
        placement: { gx: placement.gx, gz: placement.gz, x: placement.x, z: placement.z, route: placement.route, pull: placement.pull,
          gaps: placement.gaps.map(gap => ({ from: point(gap.from), to: point(gap.to), distance: gap.distance, centerDistance: gap.centerDistance })) } };
    },
    restorePending(island, saved) {
      const destination = new THREE.Vector3(saved.placement.x, 0, saved.placement.z);
      const placement = { ...saved.placement };
      if (!placement.pull) {
        const plan = createTetherPull(saved.from, destination, new THREE.Vector3(), pullStartSeconds, reducedMotion);
        placement.pull = plan.pull;
        placement.route = plan.route;
      }
      island.group.position.copy(saved.from);
      group.add(island.group);
      island.status = 'connecting';
      const chains = makeChains(island, placement);
      chains.update(island.group.position.clone().sub(destination), 0);
      drifting.restoreConnection(island, placement.route, placement.gaps);
      motion = { island, placement, from: island.group.position.clone(), destination, chains, chainPairs: chainPairs(island, placement), position: island.group.position.clone(), elapsed: 0, complete: false, bridges: null };
    },
    arrivalState() {
      if (!motion) return null;
      const duration = pullEnd() + bridgeSeconds;
      const gap = motion.placement.gaps[0];
      return { complete: motion.complete, duration, progress: Math.min(1, motion.elapsed / duration),
        buildingBridge: Boolean(motion.bridges), farmCenter: motion.island.group.position,
        chainPairs: motion.chainPairs.map(pair => ({
          start: pair.start,
          end: pair.end.clone().add(motion.island.group.position).sub(motion.destination),
        })),
        bridgeCenter: { x: (gap.from.x + gap.to.x) / 2, y: gap.from.topY, z: (gap.from.z + gap.to.z) / 2 } };
    },
    restore(island, placement) {
      island.group.position.set(placement.x, 0, placement.z);
      attach(island, placement, false);
      attach(island, placement, true);
      const chains = makeChains(island, placement);
      chains.update(new THREE.Vector3(), 1);
      island.links[0].chains = chains;
      island.status = 'attached';
      attached.push(island);
      drifting.retain(island);
    },
  };
  drifting.setAttachmentStep(api.advanceMotion);
  return api;
}
