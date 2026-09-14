import { THREE } from '../../core/shared.js';

// Bounds are in the root's local coordinates, never pre-transformed world AABBs.
// Project individual visible model parts instead of the empty corners of the
// full collision/animation envelope, which can float labels above the roof.
export function createBuildingPopupAnchor(root, boundsFor, rootsFor = () => [root]) {
  const ray = new THREE.Raycaster();
  const geometryCorners = new WeakMap();
  const instance = new THREE.Matrix4(), world = new THREE.Matrix4(), projection = new THREE.Matrix4();
  const cameraProjection = new THREE.Matrix4();
  const point = new THREE.Vector3();
  return camera => {
    root.updateWorldMatrix(true, true);
    camera.updateWorldMatrix(true, false);
    cameraProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const bounds = boundsFor();
    if (!bounds || bounds.isEmpty()) return null;
    const target = bounds.getCenter(new THREE.Vector3()).applyMatrix4(root.matrixWorld);
    const origin = camera.getWorldPosition(new THREE.Vector3());
    ray.set(origin, target.clone().sub(origin).normalize());
    const hit = ray.intersectObjects(rootsFor(), true).find(hit => {
      for (let part = hit.object; part; part = part.parent) if (!part.visible) return false;
      return true;
    });
    const corners = Array.from({ length: 4 }, () => new THREE.Vector3());
    const limits = [Infinity, -Infinity, Infinity, -Infinity];
    const include = object => {
      if (!object.isMesh || object.userData.noOcclusion) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (!materials.some(material => material.visible && !material.isShaderMaterial && material.opacity > .1)) return;
      let localCorners = geometryCorners.get(object.geometry);
      if (!localCorners) {
        object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox;
        if (!box || box.isEmpty()) return;
        localCorners = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) localCorners.push(new THREE.Vector3(x, y, z));
        }
        geometryCorners.set(object.geometry, localCorners);
      }
      const count = object.isInstancedMesh ? object.count : 1;
      for (let i = 0; i < count; i++) {
        world.copy(object.matrixWorld);
        if (object.isInstancedMesh) { object.getMatrixAt(i, instance); world.multiply(instance); }
        projection.multiplyMatrices(cameraProjection, world);
        for (const corner of localCorners) {
          point.copy(corner).applyMatrix4(projection);
          for (let edge = 0; edge < 4; edge++) {
            const value = edge < 2 ? point.x : point.y;
            if (edge % 2 ? value <= limits[edge] : value >= limits[edge]) continue;
            limits[edge] = value;
            corners[edge].copy(corner).applyMatrix4(world);
          }
        }
      }
    };
    for (const model of rootsFor()) model.traverseVisible(include);
    if (!Number.isFinite(limits[0])) return null;
    return { corners, target: hit?.point || target };
  };
}
