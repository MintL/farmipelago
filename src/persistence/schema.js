import { TILE } from '../core/shared.js';
import { resolveIslandSettings } from '../world/islands/generation-settings.js';

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

function validNaturalIsland(island) {
  if (!/^drifting-\d+$/.test(island.id) || !Number.isInteger(island.seed) || island.seed < 0 || island.seed > 0xffffffff || !isObject(island.settings)) return false;
  try { resolveIslandSettings(island.seed, island.settings); } catch { return false; }
  return true;
}

function validPending(pending, islandIds) {
  if (pending == null) return true;
  if (!isObject(pending) || !validNaturalIsland(pending) || islandIds.has(pending.id) || !finitePosition(pending.from)) return false;
  const pose = pending.placement;
  if (pose?.pull != null && (!isObject(pose.pull) || !finitePosition(pose.pull.velocity) ||
    pose.pull.velocity.y !== 0 || !Number.isFinite(pose.pull.launchSeconds) || pose.pull.launchSeconds <= 0 ||
    !Number.isFinite(pose.pull.pullSeconds) || pose.pull.pullSeconds <= 0)) return false;
  return isObject(pose) && Number.isInteger(pose.gx) && Number.isInteger(pose.gz) && pose.x === pose.gx * TILE && pose.z === pose.gz * TILE &&
    Array.isArray(pose.route) && pose.route.length >= 2 && pose.route.every(finitePosition) &&
    Array.isArray(pose.gaps) && pose.gaps.length > 0 && pose.gaps.every(gap => isObject(gap) &&
      islandIds.has(gap.from?.islandId) && gap.to?.islandId === pending.id &&
      [gap.distance, gap.centerDistance, gap.from.gx, gap.from.gz, gap.from.x, gap.from.z, gap.from.topY,
        gap.to.gx, gap.to.gz, gap.to.x, gap.to.z, gap.to.topY].every(Number.isFinite));
}

function validEncounters(saved, world, islandIds) {
  // Older saves only stored cadence, or omitted encounters entirely.
  if (saved?.islands === undefined) return true;
  const nonnegative = value => Number.isFinite(value) && value >= 0;
  const position = value => finitePosition(value) && [value.x, value.y, value.z].every(v => Math.abs(v) <= 1e6);
  const box = value => isObject(value) && ['X', 'Y', 'Z'].every(axis =>
    Number.isFinite(value[`min${axis}`]) && Number.isFinite(value[`max${axis}`]) &&
    value[`min${axis}`] <= value[`max${axis}`] &&
    Math.abs(value[`min${axis}`]) <= 1e4 && Math.abs(value[`max${axis}`]) <= 1e4);
  if (!isObject(saved) || !Array.isArray(saved.islands) || saved.islands.length > 48 ||
    ![saved.elapsed, saved.decorationElapsed, saved.retryAt, saved.sinceEncounter].every(nonnegative) ||
    !Number.isSafeInteger(saved.sequence) || saved.sequence < 0 || typeof saved.initialized !== 'boolean' ||
    !(saved.lastArrival === null || nonnegative(saved.lastArrival))) return false;
  const ids = new Set(islandIds);
  if (world.pendingAttachment) ids.add(world.pendingAttachment.id);
  return saved.islands.every(island => {
    if (!isObject(island) || !validNaturalIsland(island) || ids.has(island.id) || !position(island.position) ||
      !['drifting', 'releasing'].includes(island.status) ||
      !['encounter', 'arrived', 'routeComplete'].every(key => typeof island[key] === 'boolean') ||
      !Array.isArray(island.route) || island.route.length < 2 || island.route.length > 2048 || !island.route.every(position) ||
      !Number.isInteger(island.routeIndex) || island.routeIndex < 1 || island.routeIndex > island.route.length ||
      !Number.isFinite(island.speed) || island.speed <= 0 || island.speed > 1000 || !box(island.reservationBounds) ||
      !Array.isArray(island.extraMotionBoxes) || island.extraMotionBoxes.length > 100000 || !island.extraMotionBoxes.every(box)) return false;
    ids.add(island.id);
    if (island.plan === null) return true;
    const plan = island.plan, placement = plan?.placement;
    return isObject(plan) && island.encounter && nonnegative(plan.due) &&
      Number.isInteger(plan.arrivalIndex) && plan.arrivalIndex >= 1 && plan.arrivalIndex <= island.route.length &&
      isObject(placement) && Number.isInteger(placement.gx) && Number.isInteger(placement.gz) &&
      position({ x: placement.x, y: 0, z: placement.z }) &&
      placement.x === placement.gx * TILE && placement.z === placement.gz * TILE;
  });
}

function validTopology(world) {
  if (!Array.isArray(world.islands) || world.islands.length < EXPECTED_ISLANDS.size || world.islands.length > 128 ||
    !Array.isArray(world.connections) || world.connections.length < 1) return null;
  const islandIds = new Set();
  if ((world.settlementLayout != null && world.settlementLayout !== 1) ||
    (world.settlementVisualTier != null && (!Number.isInteger(world.settlementVisualTier) ||
      world.settlementVisualTier < 1 || world.settlementVisualTier > 5))) return null;
  const incomingRole = world.settlementLayout === 1 ? 'settlement' : 'farm';
  let incomingStatus = null;
  for (const island of world.islands) {
    const expected = EXPECTED_ISLANDS.get(island?.id) || (typeof island?.id === 'string' && /^drifting-\d+$/.test(island.id)
      ? { role: 'wild', farming: true, construction: true } : null);
    const validStatus = expected?.role === incomingRole
      ? island.status === 'approaching' || island.status === 'attached'
      : island.status === 'attached';
    if (!expected || islandIds.has(island.id) || !validStatus || island.role !== expected.role ||
      !Number.isInteger(island.seed) || island.seed < 0 || island.seed > 0xffffffff ||
      !validTransform(island.transform) || !isObject(island.capabilities) ||
      island.capabilities.farming !== expected.farming || island.capabilities.construction !== expected.construction ||
      !isObject(island.content) || !Array.isArray(island.content.tiles) ||
      !isObject(island.content.forage) || !Array.isArray(island.content.forage.tiles) ||
      !Array.isArray(island.content.forage.bales)) return null;
    if (expected.role === 'wild' && (!validNaturalIsland(island) || island.transform.y !== 0 || island.transform.yaw !== 0 ||
      !Number.isInteger(island.transform.x) || !Number.isInteger(island.transform.z))) return null;
    islandIds.add(island.id);
    if (expected.role === incomingRole) incomingStatus = island.status;
  }
  if (![...EXPECTED_ISLANDS.keys()].every(id => islandIds.has(id))) return null;
  const connection = world.connections[0];
  const endpointIds = new Set([connection?.from?.islandId, connection?.to?.islandId]);
  if (typeof connection?.id !== 'string' || connection.status !== incomingStatus || connection.kind !== 'bridge' ||
    endpointIds.size !== 2 || ![...EXPECTED_ISLANDS.keys()].every(id => endpointIds.has(id)) ||
    !validAnchor(connection.from?.anchor) || !validAnchor(connection.to?.anchor)) return null;
  const ids = new Set([connection.id]);
  for (const edge of world.connections.slice(1)) {
    if (typeof edge?.id !== 'string' || ids.has(edge.id) || edge.kind !== 'bridge' || edge.status !== 'attached' ||
      !islandIds.has(edge.from?.islandId) || !islandIds.has(edge.to?.islandId) || edge.from.islandId === edge.to.islandId ||
      !validAnchor(edge.from.anchor) || !validAnchor(edge.to.anchor) || !edge.from.anchor || !edge.to.anchor) return null;
    ids.add(edge.id);
  }
  const reached = new Set(['island-0']);
  for (let pass = 0; pass < islandIds.size; pass++) for (const edge of world.connections) {
    if (reached.has(edge.from.islandId)) reached.add(edge.to.islandId);
    if (reached.has(edge.to.islandId)) reached.add(edge.from.islandId);
  }
  return reached.size === islandIds.size && validPending(world.pendingAttachment, islandIds) ? islandIds : null;
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
    && validEncounters(state.environment.encounters, state.world, islandIds)
    && Number.isFinite(state.environment.phase)
    && state.environment.phase >= 0
    && state.environment.phase < 1;
}
