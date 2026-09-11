import { THREE, TILE, gridKey } from '../../core/shared.js';
import { seededRandom } from '../islands/procedural.js';
import { FARM_ISLAND_ID } from '../config.js';

const WATER_LIFT = .012;
const RADIUS = .29 * TILE;

export function createDuckSystem({ terrain, parent, seed, camera, reducedMotion, splash }) {
  const random = seededRandom(seed ^ 0x5d0c4a17);
  const tiles = [...terrain.values()].filter(tile => tile.islandId === FARM_ISLAND_ID && tile.lake);
  const lake = new Map(tiles.map(tile => [gridKey(tile.gx, tile.gz), tile]));
  const group = new THREE.Group();
  group.name = 'pond-ducks';
  parent.add(group);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [0xbab5a0, 0x376950, 0xe1ad48, 0x69513f, 0xeee4ce, 0x172c30, 0x486a90]
    .map(color => new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  const safe = point => {
    // Sample the complete body footprint, including corners near notched banks.
    for (const dx of [-RADIUS, 0, RADIUS]) for (const dz of [-RADIUS, 0, RADIUS]) {
      const tile = lake.get(gridKey(Math.round((point.x + dx) / TILE), Math.round((point.z + dz) / TILE)));
      if (!tile || Math.abs(tile.topY + WATER_LIFT - point.y) > .04) return false;
    }
    return true;
  };
  const points = tiles.map(tile => new THREE.Vector3(tile.x, tile.topY + WATER_LIFT, tile.z)).filter(safe);
  const segmentSafe = (a, b) => {
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / (.1 * TILE)));
    for (let i = 0; i <= steps; i++) if (!safe(new THREE.Vector3().lerpVectors(a, b, i / steps))) return false;
    return true;
  };
  const ducks = [];
  const part = (root, material, size, position) => {
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.scale.set(...size).multiplyScalar(TILE);
    mesh.position.set(...position).multiplyScalar(TILE);
    root.add(mesh);
    return mesh;
  };
  const makeDuck = index => {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    part(body, 0, [.24, .15, .36], [0, .075, 0]);
    part(body, 3, [.20, .16, .13], [0, .10, .16]);
    part(body, 4, [.12, .04, .12], [0, .20, .16]);
    part(body, index === 1 ? 3 : 1, [.15, .15, .17], [0, .28, .18]);
    part(body, 2, [.12, .045, .12], [0, .24, .31]);
    part(body, 5, [.025, .025, .035], [-.078, .30, .23]);
    part(body, 5, [.025, .025, .035], [.078, .30, .23]);
    part(body, 5, [.12, .065, .12], [0, .12, -.21]);
    const wings = [-1, 1].map(side => {
      const wing = new THREE.Group();
      wing.position.set(side * .12 * TILE, .13 * TILE, -.02 * TILE);
      body.add(wing);
      part(wing, 3, [.20, .045, .27], [side * .09, 0, 0]);
      part(wing, 6, [.13, .025, .085], [side * .11, .03, -.06]);
      return wing;
    });
    const position = points[index % points.length].clone();
    root.position.copy(position);
    group.add(root);
    return { root, body, wings, position, heading: random() * Math.PI * 2,
      target: null, idle: random() * 2, phase: random() * Math.PI * 2,
      state: 'swim', time: 0, sprayTime: 0, index };
  };
  // Spread initial ducks across the pond rather than consecutive tile centers.
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }
  if (points.length >= 3) for (let i = 0; i < 3; i++) ducks.push(makeDuck(i));
  let flock = 'swimming';
  let clock = 0;
  let swimSeconds = 180 + random() * 120;
  const direction = new THREE.Vector3();
  let flightY = 0;
  const worldPoint = new THREE.Vector3();
  const projection = new THREE.Matrix4();
  const frustum = new THREE.Frustum();
  const sphere = new THREE.Sphere(new THREE.Vector3(), TILE);
  const offscreen = point => {
    worldPoint.copy(point);
    parent.localToWorld(worldPoint);
    sphere.center.copy(worldPoint);
    return !frustum.intersectsSphere(sphere);
  };
  const face = (duck, velocity, dt) => {
    if (velocity.x * velocity.x + velocity.z * velocity.z < .000001) return;
    const desired = Math.atan2(velocity.x, velocity.z);
    duck.heading += Math.atan2(Math.sin(desired - duck.heading), Math.cos(desired - duck.heading)) * (1 - Math.exp(-dt * 5));
  };
  const swim = (duck, dt) => {
    duck.idle -= dt;
    if (!duck.target && duck.idle <= 0) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const target = points[Math.floor(random() * points.length)].clone();
        target.x += (random() - .5) * .3 * TILE;
        target.z += (random() - .5) * .3 * TILE;
        if (target.distanceTo(duck.position) > .7 * TILE && segmentSafe(duck.position, target)) {
          duck.target = target;
          break;
        }
      }
      if (!duck.target) duck.idle = 1;
    }
    if (!duck.target) return;
    const velocity = duck.target.clone().sub(duck.position);
    const distance = velocity.length();
    const next = duck.position.clone().addScaledVector(velocity.normalize(), Math.min(distance, dt * .24 * TILE));
    face(duck, velocity, dt);
    const blocked = ducks.some(other => other !== duck && other.root.visible &&
      next.distanceTo(other.position) < .60 * TILE && next.distanceTo(other.position) < duck.position.distanceTo(other.position));
    if (blocked) { duck.target = null; duck.idle = .4 + random(); }
    else duck.position.copy(next);
    if (distance < .05 * TILE) { duck.target = null; duck.idle = .5 + random() * 2; }
  };
  const flightCurve = (surface, outward, bend) => {
    const side = new THREE.Vector3(outward.z, 0, -outward.x);
    const end = surface.clone().addScaledVector(outward, 22 * TILE).addScaledVector(side, bend * 7 * TILE);
    end.y = flightY;
    const first = surface.clone().addScaledVector(outward, 4 * TILE);
    first.y += .15 * TILE;
    const second = end.clone().addScaledVector(outward, -9 * TILE);
    return new THREE.CubicBezierCurve3(surface.clone(), first, second, end);
  };
  const runwayDirection = surface => {
    // Start along the longest clear stretch of lake, gaining speed over water.
    let best = surface;
    for (const point of points) {
      if (point.distanceToSquared(surface) > best.distanceToSquared(surface) && segmentSafe(surface, point)) best = point;
    }
    return best === surface ? direction.clone() : best.clone().sub(surface).setY(0).normalize();
  };
  const prepareDeparture = () => {
    flock = 'departing';
    clock = 0;
    const angle = random() * Math.PI * 2;
    direction.set(Math.sin(angle), 0, Math.cos(angle));
    flightY = [...terrain.values()].reduce((height, tile) => Math.max(height, tile.topY), 0) + 6 * TILE;
    const bend = random() < .5 ? -1 : 1;
    for (const duck of ducks) {
      duck.state = 'waiting';
      duck.time = -duck.index * .5;
      duck.curve = flightCurve(duck.position, runwayDirection(duck.position), bend);
      duck.length = duck.curve.getLength();
      duck.distance = 0;
      duck.speed = .24 * TILE;
      duck.exitDirection = duck.curve.getTangent(1);
      duck.target = null;
    }
  };
  const prepareReturn = () => {
    flock = 'returning';
    const used = [];
    const bend = random() < .5 ? -1 : 1;
    for (const duck of ducks) {
      const landing = points.find(point => used.every(other => other.distanceTo(point) > TILE));
      duck.landing = (landing || points[duck.index]).clone();
      used.push(duck.landing);
      const outward = runwayDirection(duck.landing);
      // Reverse the full takeoff arc: descend while slowing, tangent to the water.
      const departure = flightCurve(duck.landing, outward, bend);
      while (!offscreen(departure.v3)) {
        departure.v3.addScaledVector(outward, 8 * TILE);
        departure.v2.addScaledVector(outward, 8 * TILE);
      }
      duck.curve = new THREE.CubicBezierCurve3(departure.v3, departure.v2, departure.v1, departure.v0);
      duck.length = duck.curve.getLength();
      duck.distance = 0;
      duck.speed = 4 * TILE;
      duck.position.copy(duck.curve.v0);
      duck.skimEnd = duck.landing.clone().addScaledVector(outward, -.3 * TILE);
      if (!segmentSafe(duck.landing, duck.skimEnd)) duck.skimEnd.copy(duck.landing);
      duck.state = 'approach';
      duck.time = -duck.index * .5;
      duck.root.visible = true;
    }
  };

  return {
    update(elapsed, dt, attached) {
      if (!ducks.length || dt <= 0) return;
      if (camera) {
        camera.updateMatrixWorld();
        parent.updateWorldMatrix(true, false);
        projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projection);
      }
      if (attached) clock += dt;
      if (flock === 'swimming' && attached && camera && clock >= swimSeconds) prepareDeparture();
      if (flock === 'absent') {
        if (clock < 60) return;
        prepareReturn();
      }
      for (const duck of ducks) {
        duck.time += dt;
        const before = duck.position.clone();
        if (duck.state === 'swim') swim(duck, dt);
        else if (duck.state === 'waiting' && duck.time >= 0) { duck.state = 'takeoff'; duck.time = 0; }
        else if (duck.state === 'takeoff' || duck.state === 'approach' && duck.time >= 0) {
          const returning = duck.state === 'approach';
          const remaining = Math.max(0, duck.length - duck.distance);
          duck.speed = returning
            ? Math.min(4 * TILE, Math.sqrt((.75 * TILE) ** 2 + 2 * .65 * TILE * remaining))
            : Math.min(4 * TILE, duck.speed + dt * .65 * TILE);
          duck.distance = Math.min(duck.length, duck.distance + duck.speed * dt);
          duck.curve.getPointAt(duck.distance / duck.length, duck.position);
          if (duck.distance >= duck.length) {
            duck.time = 0;
            if (returning) {
              duck.state = 'landing'; duck.sprayTime = 0;
              splash(duck.position, reducedMotion ? .65 : 1.2, .7);
            }
            else duck.state = 'exit';
          }
        }
        else if (duck.state === 'exit') {
          duck.position.addScaledVector(duck.exitDirection, dt * 4 * TILE);
          if (offscreen(duck.position)) { duck.state = 'away'; duck.root.visible = false; }
        }
        else if (duck.state === 'landing') {
          const t = Math.min(1, duck.time / .8);
          duck.position.lerpVectors(duck.landing, duck.skimEnd, 1 - (1 - t) * (1 - t));
          if (!reducedMotion && duck.time - duck.sprayTime >= .18 && t < .8) {
            splash(duck.position, .4, .5);
            duck.sprayTime = duck.time;
          }
          if (t === 1) { duck.state = 'swim'; duck.idle = 1 + random(); }
        }
        if (duck.state !== 'swim') face(duck, duck.position.clone().sub(before), dt);
        if (duck.state === 'waiting') face(duck, duck.curve.getTangent(0), dt);
        duck.root.position.copy(duck.position);
        duck.root.rotation.y = duck.heading;
        const resting = duck.state === 'swim' || duck.state === 'waiting';
        const flare = duck.state === 'landing' || duck.state === 'approach' && duck.length - duck.distance < 2 * TILE;
        const flap = Math.sin(elapsed * (reducedMotion ? 7 : 18) + duck.phase) * (reducedMotion ? .18 : .65);
        const fold = resting ? 1.32 : flare ? -.25 : flap;
        duck.wings.forEach((wing, index) => { wing.rotation.z = (index ? -1 : 1) * fold; });
        duck.body.position.y = resting && !reducedMotion ? Math.sin(elapsed * 2 + duck.phase) * .012 * TILE : 0;
        const velocity = duck.position.clone().sub(before);
        const pitch = resting ? 0 : -Math.atan2(velocity.y, Math.max(.001, Math.hypot(velocity.x, velocity.z)));
        const targetPitch = flare ? -.18 : THREE.MathUtils.clamp(pitch, -.35, .35);
        duck.body.rotation.x = THREE.MathUtils.lerp(duck.body.rotation.x, targetPitch, 1 - Math.exp(-dt * 5));
      }
      if (flock === 'departing' && ducks.every(duck => duck.state === 'away')) { flock = 'absent'; clock = 0; }
      if (flock === 'returning' && ducks.every(duck => duck.state === 'swim')) {
        flock = 'swimming'; clock = 0; swimSeconds = 180 + random() * 120;
      }
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      materials.forEach(material => material.dispose());
    },
  };
}
