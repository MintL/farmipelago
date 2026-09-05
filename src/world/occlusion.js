import { THREE, mats } from '../core/shared.js';

export function createOcclusionSystem(group, additionalObjects = []) {
  const ray = new THREE.Ray();
  const sightline = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  let refreshElapsed = Infinity;
  const entries = [];
  const excludedNames = new Set(['tall-grass', 'water', 'field-effects', 'forage', 'cargo-port', 'forest-wildlife']);
  const register = object => {
    if (!object || entries.some(entry => entry.object === object)) return false;
    entries.push({
      object,
      bounds: new THREE.Box3(),
      materials: cloneFadeMaterials(object),
      ignoreAtVehicle: object.userData.occlusionIgnoreAtVehicle,
      opacity: 1,
      targetOpacity: 1,
    });
    return true;
  };
  const unregister = object => {
    const index = entries.findIndex(entry => entry.object === object);
    if (index === -1) return false;
    entries.splice(index, 1);
    return true;
  };

  group.children
    .filter(child => child.isGroup && !excludedNames.has(child.name))
    .forEach(register);
  additionalObjects.forEach(register);

  return {
    register,
    unregister,
    update(cameraPosition, vehicleState, delta) {
      if (!cameraPosition || !vehicleState) return;
      refreshElapsed += delta;
      const fadeAmount = 1 - Math.exp(-12 * Math.min(.1, delta));
      if (refreshElapsed >= 1 / 12) {
        refreshElapsed = 0;
        sightline.set(vehicleState.x, vehicleState.y + .75, vehicleState.z).sub(cameraPosition);
        const sightlineLength = sightline.length();
        if (sightlineLength >= .001) {
          ray.set(cameraPosition, sightline.multiplyScalar(1 / sightlineLength));
          for (const entry of entries) {
            if (!entry.object.visible || entry.ignoreAtVehicle?.(vehicleState)) {
              entry.targetOpacity = 1;
              continue;
            }
            entry.bounds.setFromObject(entry.object);
            const hit = ray.intersectBox(entry.bounds, hitPoint);
            entry.targetOpacity = hit && hit.distanceTo(cameraPosition) < sightlineLength - .2 ? .18 : 1;
          }
        }
      }
      for (const entry of entries) {
        entry.opacity = THREE.MathUtils.lerp(entry.opacity, entry.targetOpacity, fadeAmount);
        const faded = entry.opacity < .995;
        entry.materials.forEach(({ material, opacity, transparent, depthWrite }) => {
          const nextTransparent = transparent || faded;
          if (material.transparent !== nextTransparent) {
            material.transparent = nextTransparent;
            material.needsUpdate = true;
          }
          material.opacity = opacity * entry.opacity;
          material.depthWrite = depthWrite;
        });
      }
    },
  };
}

function cloneFadeMaterials(object) {
  const materialClones = new Map();
  object.traverse(child => {
    if (!child.isMesh) return;
    const cloneMaterial = material => {
      if (!materialClones.has(material)) {
        const clone = material.clone();
        clone.transparent = true;
        materialClones.set(material, {
          material: clone,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      }
      return materialClones.get(material).material;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
  });
  return [...materialClones.values()];
}

export function disposeObjectResources(root) {
  const sharedMaterials = new Set(Object.values(mats));
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (material && !sharedMaterials.has(material)) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

