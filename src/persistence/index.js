import { migrateState } from './migrations.js';
import { SCHEMA_VERSION, validState } from './schema.js';
import { readStoredState, removeStoredState, writeStoredState } from './storage.js';

export function loadGameState() {
  try {
    const storedState = readStoredState();
    if (!storedState) return { state: null, invalid: false, unavailable: false };
    const state = migrateState(storedState);
    if (validState(state)) {
      if (state !== storedState) writeStoredState({ ...state, savedAt: Date.now() });
      return { state, invalid: false, unavailable: false };
    }
    removeStoredState();
    return { state: null, invalid: true, unavailable: false };
  }
  catch (error) {
    console.warn('Unable to load the Farmipelago save.', error);
    try { removeStoredState(); }
    catch {}
    return { state: null, invalid: true, unavailable: error?.name === 'SecurityError' };
  }
}

export function saveGameState(state) {
  try {
    writeStoredState({ ...state, schemaVersion: SCHEMA_VERSION, savedAt: Date.now() });
    return true;
  }
  catch (error) {
    console.warn('Unable to save Farmipelago.', error);
    return false;
  }
}

export function deleteGameState() {
  try {
    removeStoredState();
    return true;
  }
  catch (error) {
    console.warn('Unable to delete the Farmipelago save.', error);
    return false;
  }
}
