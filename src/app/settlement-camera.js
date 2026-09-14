import { THREE } from '../core/shared.js';

// The bounds already include construction lift. Fit them with a small edge
// margin, including portrait screens, and refit when the viewport changes.
export function settlementCameraFrame(bounds, aspect) {
  const target = bounds.getCenter(new THREE.Vector3());
  const direction = new THREE.Vector3(.7, 1.1, 1.4).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const fov = 38, vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const horizontal = vertical * Math.max(.2, aspect);
  let distance = 12;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
    for (const z of [bounds.min.z, bounds.max.z]) {
      const corner = new THREE.Vector3(x, y, z).sub(target);
      distance = Math.max(distance, corner.dot(direction) + 1.02 * Math.max(
        Math.abs(corner.dot(right)) / horizontal, Math.abs(corner.dot(up)) / vertical));
    }
  }
  return { target, position: target.clone().addScaledVector(direction, distance), fov };
}
