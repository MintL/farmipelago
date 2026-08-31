const STORAGE_KEY = 'farmipelago.gameState';
const SCHEMA_VERSION = 2;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validState(state, schemaVersion = SCHEMA_VERSION) {
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
    && isObject(state.ui);
}

function litresContents(contents) {
  if (!isObject(contents)) return {};
  return Object.fromEntries(Object.entries(contents).flatMap(([cropId, amount]) => {
    const litres = Math.max(0, Math.floor(Number(amount) || 0)) * 100;
    return litres ? [[cropId, litres]] : [];
  }));
}

function migrateVersion1(state) {
  return {
    ...state,
    schemaVersion: SCHEMA_VERSION,
    progression: {
      ...state.progression,
      delivered: litresContents(state.progression.delivered),
    },
    vehicles: state.vehicles.map(vehicle => ({
      ...vehicle,
      storage: litresContents(vehicle.storage),
    })),
    buildings: state.buildings.map(building => ({
      ...building,
      contents: litresContents(building.contents),
    })),
  };
}

export function loadGameState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return { state: null, invalid: false, unavailable: false };
    const state = JSON.parse(serialized);
    if (validState(state)) return { state, invalid: false, unavailable: false };
    if (validState(state, 1)) return { state: migrateVersion1(state), invalid: false, unavailable: false };
    localStorage.removeItem(STORAGE_KEY);
    return { state: null, invalid: true, unavailable: false };
  }
  catch (error) {
    console.warn('Unable to load the Farmipelago save.', error);
    try { localStorage.removeItem(STORAGE_KEY); }
    catch {}
    return { state: null, invalid: true, unavailable: error?.name === 'SecurityError' };
  }
}

export function saveGameState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      schemaVersion: SCHEMA_VERSION,
      savedAt: Date.now(),
    }));
    return true;
  }
  catch (error) {
    console.warn('Unable to save Farmipelago.', error);
    return false;
  }
}

export function deleteGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }
  catch (error) {
    console.warn('Unable to delete the Farmipelago save.', error);
    return false;
  }
}
