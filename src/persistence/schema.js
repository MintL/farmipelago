export const SCHEMA_VERSION = 10;
export const DEFAULT_DAY_PHASE = 10 / 24;

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validState(state, schemaVersion = SCHEMA_VERSION) {
  return isObject(state)
    && state.schemaVersion === schemaVersion
    && isObject(state.world)
    && Number.isInteger(state.world.seed)
    && state.world.seed >= 0
    && state.world.seed <= 0xffffffff
    && Array.isArray(state.world.tiles)
    && Array.isArray(state.buildings)
    && isObject(state.progression)
    && Array.isArray(state.vehicles)
    && typeof state.activeVehicleId === 'string'
    && isObject(state.ui)
    && (schemaVersion < 9 || (
      isObject(state.environment)
      && Number.isFinite(state.environment.phase)
      && state.environment.phase >= 0
      && state.environment.phase < 1
    ))
    && (schemaVersion < 10 || (
      Array.isArray(state.world.islands)
      && Array.isArray(state.world.connections)
    ));
}
