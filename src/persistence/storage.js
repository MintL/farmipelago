export const STORAGE_KEY = 'farmipelago.gameState';

export function readStoredState() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  return serialized ? JSON.parse(serialized) : null;
}

export function writeStoredState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function removeStoredState() {
  localStorage.removeItem(STORAGE_KEY);
}
