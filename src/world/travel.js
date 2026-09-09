const SQRT_HALF = Math.SQRT1_2;
const MAX_FRAME_DELTA = .05;
const BASE_TRAVEL_SPEED = 1.15;

export const TRAVEL_DIRECTION = Object.freeze({ x: -SQRT_HALF, y: 0, z: SQRT_HALF });

export const TRAVEL_CYCLE_SECONDS = 600;
export const TURN_RATE = Math.PI * 2 / TRAVEL_CYCLE_SECONDS;

export function directionAtPhase(phase) {
  const angle = phase * Math.PI * 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: TRAVEL_DIRECTION.x * c - TRAVEL_DIRECTION.z * s, y: 0,
    z: TRAVEL_DIRECTION.x * s + TRAVEL_DIRECTION.z * c };
}

export function createTravelModel({ reducedMotion = false, saved = null } = {}) {
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const state = {
    phase: ((finite(saved?.phase) % 1) + 1) % 1,
    distance: Math.max(0, finite(saved?.distance)),
    offsetX: finite(saved?.offsetX),
    offsetZ: finite(saved?.offsetZ),
    speed: reducedMotion ? BASE_TRAVEL_SPEED * .48 : BASE_TRAVEL_SPEED,
    gust: 0,
  };
  let direction = directionAtPhase(state.phase);
  const snapshot = Object.freeze({
    get direction() { return direction; },
    get phase() { return state.phase; },
    get distance() { return state.distance; },
    get offsetX() { return state.offsetX; },
    get offsetZ() { return state.offsetZ; },
    get speed() { return state.speed; },
    get gust() { return state.gust; },
  });
  return {
    update(delta) {
      const dt = Math.min(MAX_FRAME_DELTA, Math.max(0, Number(delta) || 0));
      const midpoint = directionAtPhase(state.phase + dt / TRAVEL_CYCLE_SECONDS / 2);
      state.offsetX += midpoint.x * state.speed * dt;
      state.offsetZ += midpoint.z * state.speed * dt;
      state.phase = (state.phase + dt / TRAVEL_CYCLE_SECONDS) % 1;
      direction = directionAtPhase(state.phase);
      state.distance += state.speed * dt;
      state.gust = reducedMotion ? 0
        : .5 + Math.sin(state.distance * .37) * .31 + Math.sin(state.distance * .91 + 1.4) * .19;
      return snapshot;
    },
    snapshot: () => snapshot,
    persistentState: () => ({ phase: state.phase, distance: state.distance, offsetX: state.offsetX, offsetZ: state.offsetZ }),
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
