import { deleteGameState, saveGameState } from '../persistence/index.js';

const DEFAULT_DEBOUNCE_MS = 250;

export function createSaveCoordinator({ snapshot, unavailable = false, reload = () => location.reload() }) {
  let enabled = !unavailable;
  let ready = false;
  let timer = null;

  const cancelPending = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    cancelPending();
    if (!enabled || !ready) return true;
    const saved = saveGameState(snapshot());
    if (!saved) enabled = false;
    return saved;
  };

  return {
    schedule(delay = DEFAULT_DEBOUNCE_MS) {
      if (!enabled || !ready) return;
      cancelPending();
      timer = window.setTimeout(flush, delay);
    },
    flush,
    markReady() {
      ready = true;
      return flush();
    },
    restart() {
      const wasEnabled = enabled;
      enabled = false;
      cancelPending();
      if (!deleteGameState()) {
        enabled = wasEnabled;
        return false;
      }
      reload();
      return true;
    },
  };
}
