import { TILE, THREE, gridKey } from '../../core/shared.js';

// Preserve the passage velocity through the catch. The cubic starts with that
// same tangent, bends toward the shore, and reaches docking with zero velocity.
export function positionOnTetherPull(from, destination, pull, elapsed, target) {
  const velocity = new THREE.Vector3(pull.velocity.x, 0, pull.velocity.z);
  if (elapsed <= pull.launchSeconds) return target.copy(from).addScaledVector(velocity, elapsed);
  const catchPosition = new THREE.Vector3().copy(from).addScaledVector(velocity, pull.launchSeconds);
  const control = catchPosition.clone().addScaledVector(velocity, pull.pullSeconds / 3);
  const t = THREE.MathUtils.clamp((elapsed - pull.launchSeconds) / pull.pullSeconds, 0, 1), u = 1 - t;
  return target.copy(catchPosition).multiplyScalar(u * u * u)
    .addScaledVector(control, 3 * u * u * t).addScaledVector(destination, 3 * u * t * t + t * t * t);
}

export function createTetherPull(from, destination, velocity, launchSeconds, reducedMotion) {
  const catchPosition = new THREE.Vector3().copy(from).addScaledVector(velocity, launchSeconds);
  const pull = { velocity: { x: velocity.x, y: 0, z: velocity.z }, launchSeconds,
    pullSeconds: Math.max(reducedMotion ? 3 : 6, catchPosition.distanceTo(destination) / (reducedMotion ? 4 : 8)) };
  const route = [new THREE.Vector3().copy(from), catchPosition];
  // Closely spaced sweeps reserve the curved pull as well as the moving launch.
  const lengthBound = catchPosition.distanceTo(destination) + velocity.length() * pull.pullSeconds;
  const samples = Math.max(24, Math.ceil(lengthBound / (TILE * .2)));
  for (let i = 1; i <= samples; i++) route.push(positionOnTetherPull(from, destination, pull,
    launchSeconds + pull.pullSeconds * i / samples, new THREE.Vector3()));
  return { pull, route };
}

// Sweep the incoming island's complete footprint along a direct approach.
// Expanded terrain and bridge footprints provide clearance around corners.
export function createAttachmentRoutePlanner(incoming, terrain, bridges, start) {
  const occupied = new Set();
  const fixed = [...terrain.values()];
  const moving = [...incoming.values()];
  for (const tile of fixed) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) occupied.add(gridKey(tile.gx + dx, tile.gz + dz));
  for (const block of bridges) {
    const radius = Math.hypot(block.width, block.depth) / (2 * TILE) + 1;
    for (let gx = Math.floor(block.x / TILE - radius); gx <= Math.ceil(block.x / TILE + radius); gx++) {
      for (let gz = Math.floor(block.z / TILE - radius); gz <= Math.ceil(block.z / TILE + radius); gz++) occupied.add(gridKey(gx, gz));
    }
  }
  const cache = new Map();
  const free = (x, z) => {
    const gx = Math.round(x), gz = Math.round(z), key = gridKey(gx, gz);
    if (!cache.has(key)) cache.set(key, !moving.some(tile => occupied.has(gridKey(tile.gx + gx, tile.gz + gz))));
    return cache.get(key);
  };
  const visible = (a, b) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 4));
    for (let step = 0; step <= steps; step++) if (!free(a.x + (b.x - a.x) * step / steps, a.z + (b.z - a.z) * step / steps)) return false;
    return true;
  };
  const origin = { x: start.x / TILE, z: start.z / TILE };
  const plan = destination => {
    const goal = { x: destination.gx, z: destination.gz };
    // Natural arrivals pull directly toward the nearby shore. Do not orbit the
    // Farmipelago to reach a higher-scoring socket on the opposite side.
    if (!visible(origin, goal)) return null;
    return [
      { x: start.x, y: 0, z: start.z },
      { x: destination.x, y: 0, z: destination.z },
    ];
  };
  plan.minimumDistance = destination => Math.hypot(destination.x - start.x, destination.z - start.z);
  return plan;
}

export function routeLength(points) {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.z - points[index].z), 0);
}

export function positionOnRoute(points, distance, target) {
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (distance <= length || index === points.length - 1) {
      const t = Math.min(1, distance / Math.max(.0001, length));
      return target.set(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
    }
    distance -= length;
  }
  return target.copy(points[0]);
}
