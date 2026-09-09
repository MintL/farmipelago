import { THREE } from '../core/shared.js';

// Look across the gap, rather than along it through one of the shore walls.
// Pick the nearer side once so a changing chain length cannot flip the camera.
export function attachmentCameraSide(arrival, cameraPosition) {
  const pair = arrival.chainPairs[0];
  const along = new THREE.Vector3().subVectors(pair.end, pair.start).setY(0).normalize();
  const side = new THREE.Vector3(-along.z, 0, along.x);
  const center = new THREE.Vector3().addVectors(pair.start, pair.end).multiplyScalar(.5);
  if (side.dot(cameraPosition.clone().sub(center)) < 0) side.negate();
  return side;
}

export function attachmentCameraFrame(arrival, side, aspect) {
  const points = arrival.chainPairs.flatMap(pair => [pair.start, pair.end]);
  const target = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  if (arrival.buildingBridge) target.y = arrival.bridgeCenter.y + .3;
  const radius = Math.max(3.5, ...points.map(point => target.distanceTo(point))) + 2;
  const fov = 42;
  const halfVertical = THREE.MathUtils.degToRad(fov / 2);
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  const distance = radius / Math.sin(Math.min(halfVertical, halfHorizontal));
  const offset = side.clone().setY(arrival.buildingBridge ? .95 : .6).normalize().multiplyScalar(distance);
  return { target, position: target.clone().add(offset), fov };
}
