import { createIslandOutline } from '../islands/selection-outline.js';
import { createBuildingPopupAnchor } from '../buildings/popup-anchor.js';

export function createStorehouseInteraction(parent, roots, boundsFor, activeRoots = () => roots) {
  const outlines = roots.map(group => ({ group, outline: createIslandOutline({ group }, { groundOverlay: true }) }));
  const popupView = createBuildingPopupAnchor(parent, boundsFor, activeRoots);
  return {
    ownsHit(object) {
      const active = activeRoots();
      for (let part = object; part; part = part.parent) if (active.includes(part)) return true;
      return false;
    },
    popupView,
    calloutView: popupView,
    setOutline(selected, visible) {
      const active = activeRoots();
      for (const entry of outlines) entry.outline.update(selected, visible && active.includes(entry.group));
    },
  };
}
