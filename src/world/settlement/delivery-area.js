import { THREE, TILE } from '../../core/shared.js';

// Invisible proximity around the building footprint, shared by every cargo type.
export function createDeliveryArea(parent, boundsFor, islandId, enabled = () => true) {
  const point = new THREE.Vector3();
  const localPoint = (x, y, z) => { parent.updateWorldMatrix(true, false); return parent.worldToLocal(point.set(x, y, z)); };
  const inside = point => {
    const bounds = boundsFor();
    const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
    const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
    return Math.hypot(dx, dz) <= 5 * TILE;
  };
  return {
    contains: state => Boolean(state?.grounded && enabled() && state.supportIslandId === islandId &&
      inside(localPoint(state.x, state.y, state.z)) && Math.abs(point.y) <= .35 * TILE),
    containsXZ(x, z) { return enabled() && inside(localPoint(x, parent.getWorldPosition(new THREE.Vector3()).y, z)); },
  };
}
