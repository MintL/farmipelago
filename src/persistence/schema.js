export const SCHEMA_VERSION = 0;
export const DEFAULT_DAY_PHASE = 10 / 24;

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const EXPECTED_ISLANDS = new Map([
  ['island-0', { role: 'farm', farming: true, construction: true }],
  ['island-1', { role: 'settlement', farming: false, construction: false }],
]);

const finitePosition = value => isObject(value) && [value.x, value.y, value.z].every(Number.isFinite);
const validTransform = value => finitePosition(value) && Number.isFinite(value.yaw);
const validAnchor = value => value === null || (isObject(value) &&
  Number.isFinite(value.gx) && Number.isFinite(value.gz) && Number.isFinite(value.y));
const validPose = (pose, islandIds) => pose == null || (isObject(pose) && islandIds.has(pose.islandId) &&
  finitePosition(pose.position) && Number.isFinite(pose.heading));

function validTopology(world) {
  if (!Array.isArray(world.islands) || world.islands.length !== EXPECTED_ISLANDS.size ||
    !Array.isArray(world.connections) || world.connections.length !== 1) return null;
  const islandIds = new Set();
  let farmStatus = null;
  for (const island of world.islands) {
    const expected = EXPECTED_ISLANDS.get(island?.id);
    const validStatus = expected?.role === 'farm'
      ? island.status === 'approaching' || island.status === 'attached'
      : island.status === 'attached';
    if (!expected || islandIds.has(island.id) || !validStatus || island.role !== expected.role ||
      !Number.isInteger(island.seed) || island.seed < 0 || island.seed > 0xffffffff ||
      !validTransform(island.transform) || !isObject(island.capabilities) ||
      island.capabilities.farming !== expected.farming || island.capabilities.construction !== expected.construction ||
      !isObject(island.content) || !Array.isArray(island.content.tiles) ||
      !isObject(island.content.forage) || !Array.isArray(island.content.forage.tiles) ||
      !Array.isArray(island.content.forage.bales)) return null;
    islandIds.add(island.id);
    if (expected.role === 'farm') farmStatus = island.status;
  }
  const connection = world.connections[0];
  const endpointIds = new Set([connection?.from?.islandId, connection?.to?.islandId]);
  if (typeof connection?.id !== 'string' || connection.status !== farmStatus || connection.kind !== 'bridge' ||
    endpointIds.size !== 2 || ![...EXPECTED_ISLANDS.keys()].every(id => endpointIds.has(id)) ||
    !validAnchor(connection.from?.anchor) || !validAnchor(connection.to?.anchor)) return null;
  return islandIds;
}

export function validState(state) {
  if (!isObject(state) || state.schemaVersion !== SCHEMA_VERSION || !isObject(state.world)) return false;
  const islandIds = validTopology(state.world);
  return Boolean(islandIds)
    && Number.isInteger(state.world.seed)
    && state.world.seed >= 0
    && state.world.seed <= 0xffffffff
    && Array.isArray(state.world.tiles)
    && isObject(state.world.forage)
    && Array.isArray(state.world.forage.tiles)
    && Array.isArray(state.world.forage.bales)
    && Array.isArray(state.buildings)
    && state.buildings.every(building => isObject(building) && validPose(building.pose, islandIds))
    && isObject(state.progression)
    && Array.isArray(state.vehicles)
    && state.vehicles.every(vehicle => isObject(vehicle) && validPose(vehicle.pose, islandIds))
    && typeof state.activeVehicleId === 'string'
    && isObject(state.ui)
    && isObject(state.environment)
    && Number.isFinite(state.environment.phase)
    && state.environment.phase >= 0
    && state.environment.phase < 1;
}
