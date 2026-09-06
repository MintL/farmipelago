const SQRT_HALF = Math.SQRT1_2;
const MAX_FRAME_DELTA = .05;
const BASE_TRAVEL_SPEED = 1.15;

export const TRAVEL_DIRECTION = Object.freeze({ x: -SQRT_HALF, y: 0, z: SQRT_HALF });

export function createTravelModel({ reducedMotion = false } = {}) {
  const state = {
    distance: 0,
    speed: reducedMotion ? BASE_TRAVEL_SPEED * .48 : BASE_TRAVEL_SPEED,
    gust: 0,
  };
  const snapshot = Object.freeze({
    direction: TRAVEL_DIRECTION,
    get distance() { return state.distance; },
    get speed() { return state.speed; },
    get gust() { return state.gust; },
  });

  return {
    update(delta) {
      const dt = Math.min(MAX_FRAME_DELTA, Math.max(0, Number(delta) || 0));
      state.distance += state.speed * dt;
      state.gust = reducedMotion
        ? 0
        : .5 + Math.sin(state.distance * .37) * .31 + Math.sin(state.distance * .91 + 1.4) * .19;
      return snapshot;
    },
    snapshot: () => snapshot,
  };
}

export function travelFrameForIslands(islands) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const island of islands) {
    const bounds = island?.bounds;
    const transform = island?.transform;
    if (!bounds || !transform) continue;
    const cosine = Math.cos(Number(transform.yaw) || 0);
    const sine = Math.sin(Number(transform.yaw) || 0);
    for (const localX of [bounds.minX, bounds.maxX]) {
      for (const localZ of [bounds.minZ, bounds.maxZ]) {
        const x = transform.x + localX * cosine - localZ * sine;
        const z = transform.z + localX * sine + localZ * cosine;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return { centerX: 0, centerZ: 0, extentX: 0, extentZ: 0 };
  }
  return {
    centerX: (minX + maxX) * .5,
    centerZ: (minZ + maxZ) * .5,
    extentX: maxX - minX,
    extentZ: maxZ - minZ,
  };
}
