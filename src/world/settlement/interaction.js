import { THREE, TILE } from '../../core/shared.js';
import { createIslandOutline } from '../islands/selection-outline.js';

export function createStorehouseInteraction(parent, roots, boundsFor, activeRoots = () => roots) {
  const outlines = roots.map(group => ({ group, outline: createIslandOutline({ group }, { groundOverlay: true }) }));
  const ray = new THREE.Raycaster();
  return {
    ownsHit(object) {
      const active = activeRoots();
      for (let part = object; part; part = part.parent) if (active.includes(part)) return true;
      return false;
    },
    calloutView(camera) {
      parent.updateWorldMatrix(true, true);
      const bounds = boundsFor().clone().applyMatrix4(parent.matrixWorld);
      const target = bounds.getCenter(new THREE.Vector3());
      const origin = camera.getWorldPosition(new THREE.Vector3());
      ray.set(origin, target.clone().sub(origin).normalize());
      const hit = ray.intersectObjects(activeRoots(), true).find(hit => {
        for (let part = hit.object; part; part = part.parent) if (!part.visible) return false;
        return true;
      });
      return { bounds, target: hit?.point || target };
    },
    popupTarget() {
      const bounds = boundsFor(), point = bounds.getCenter(new THREE.Vector3());
      point.y = bounds.max.y + .5 * TILE;
      parent.updateWorldMatrix(true, false);
      return parent.localToWorld(point);
    },
    setOutline(selected, visible) {
      const active = activeRoots();
      for (const entry of outlines) entry.outline.update(selected, visible && active.includes(entry.group));
    },
  };
}
