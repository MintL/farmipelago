import { TILE } from '../core/shared.js';
import { BASE_ISLAND_LAYOUT, ISLAND_CONNECTION_PAIRS, ISLAND_LAYOUT_SCALE } from '../world/config.js';
import { DEFAULT_DAY_PHASE, SCHEMA_VERSION, isObject, validState } from './schema.js';

function migrateSixToSeven(state) {
  const progression = { ...state.progression };
  if (Math.floor(Number(progression.index)) === 2 && progression.collected) {
    Object.assign(progression, { index: 3, collected: false, delivered: { milk: 0 }, selectedCropIds: [] });
  }
  return { ...state, schemaVersion: 7, progression };
}

function migrateSevenToEight(state) {
  const buildings = state.buildings.map(building => {
    if (!isObject(building)) return building;
    if (building.type === 'silo') return { ...building, constructionPhase: 'complete' };
    if (building.type !== 'cattle-barn') return building;
    const hasPen = Array.isArray(building.pen?.vertices) && building.pen.vertices.length >= 4;
    const hasAnimals = Array.isArray(building.animals) && building.animals.length > 0;
    return { ...building, constructionPhase: hasPen || hasAnimals ? 'complete' : 'draft' };
  });
  return { ...state, schemaVersion: 8, buildings };
}

const scaledCoordinate = value => Math.round(value * ISLAND_LAYOUT_SCALE);

function legacyIslandRecords(seed) {
  return BASE_ISLAND_LAYOUT.map((source, legacyId) => ({
    id: `island-${legacyId}`,
    seed: (seed + legacyId * 911) >>> 0,
    role: legacyId === 0 ? 'hub' : legacyId === 1 ? 'northern-farm' : 'farm',
    status: 'attached',
    transform: {
      x: scaledCoordinate(source.cx) * TILE,
      y: source.h,
      z: scaledCoordinate(source.cz) * TILE,
      yaw: 0,
    },
    content: { tiles: [], forage: { tiles: [], bales: [] } },
  }));
}

function legacyConnections() {
  return ISLAND_CONNECTION_PAIRS.map(([fromId, toId], index) => ({
    id: `connection-${index}`,
    kind: 'bridge',
    status: 'attached',
    from: { islandId: `island-${fromId}`, anchor: null },
    to: { islandId: `island-${toId}`, anchor: null },
  }));
}

function localPose(position, heading, islands) {
  if (![position?.x, position?.y, position?.z].every(Number.isFinite)) return null;
  const island = islands.reduce((nearest, candidate) => {
    const distance = Math.hypot(position.x - candidate.transform.x, position.z - candidate.transform.z);
    return !nearest || distance < nearest.distance ? { island: candidate, distance } : nearest;
  }, null)?.island;
  if (!island) return null;
  return {
    islandId: island.id,
    position: {
      x: position.x - island.transform.x,
      y: position.y - island.transform.y,
      z: position.z - island.transform.z,
    },
    heading: Number(heading) || 0,
  };
}

function migrateNineToTen(state) {
  const islands = legacyIslandRecords(state.world.seed);
  return {
    ...state,
    schemaVersion: SCHEMA_VERSION,
    world: { ...state.world, islands, connections: legacyConnections() },
    buildings: state.buildings.map(building => ({
      ...building,
      pose: localPose({ x: building.x, y: 0, z: building.z }, 0, islands),
    })),
    vehicles: state.vehicles.map(vehicle => ({
      ...vehicle,
      pose: localPose(vehicle.position, vehicle.heading, islands),
    })),
  };
}

export function migrateState(input) {
  let state = input;
  if (validState(state, 6)) state = migrateSixToSeven(state);
  if (validState(state, 7)) state = migrateSevenToEight(state);
  if (validState(state, 8)) {
    state = { ...state, schemaVersion: 9, environment: { phase: DEFAULT_DAY_PHASE } };
  }
  if (validState(state, 9)) state = migrateNineToTen(state);
  return state;
}
