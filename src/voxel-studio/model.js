import { THREE } from '../core/shared.js';

function createMaterial(definition) {
  const opacity = definition.opacity ?? 1;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(definition.color ?? '#ffffff'),
    roughness: definition.roughness ?? 0.8,
    metalness: definition.metalness ?? 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  if (definition.emissive) {
    material.emissive = new THREE.Color(definition.emissive);
    material.emissiveIntensity = definition.emissiveIntensity ?? 1;
  }
  return material;
}

function normalizePart(part, mirrored = false) {
  const result = [];
  if (Array.isArray(part.parts)) {
    for (const child of part.parts) {
      result.push(...normalizePart(child, false));
      if (part.mirror === 'x') result.push(...normalizePart(child, true));
    }
    return result;
  }
  if (part.box) {
    const [x, y, z, w, h, d] = part.box;
    result.push({
      type: part.remove ? 'removeBox' : 'box', x: mirrored ? -x - w : x,
      y, z, w, h, d, material: part.material,
    });
  }
  else if (part.voxel) {
    const [x, y, z] = part.voxel;
    result.push({
      type: part.remove ? 'removeVoxel' : 'voxel', x: mirrored ? -x - 1 : x,
      y, z, material: part.material,
    });
  }
  else if (part.remove?.box) {
    const [x, y, z, w, h, d] = part.remove.box;
    result.push({ type: 'removeBox', x: mirrored ? -x - w : x, y, z, w, h, d });
  }
  else if (part.remove?.voxel) {
    const [x, y, z] = part.remove.voxel;
    result.push({ type: 'removeVoxel', x: mirrored ? -x - 1 : x, y, z });
  }
  return result;
}

export function expandModel(model) {
  const voxels = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (const root of model.parts ?? []) {
    for (const part of normalizePart(root)) {
      if (part.type === 'box' || part.type === 'removeBox') {
        for (let x = part.x; x < part.x + part.w; x++) {
          for (let y = part.y; y < part.y + part.h; y++) {
            for (let z = part.z; z < part.z + part.d; z++) {
              if (part.type === 'removeBox') voxels.delete(key(x, y, z));
              else voxels.set(key(x, y, z), { x, y, z, material: part.material });
            }
          }
        }
      }
      else if (part.type === 'removeVoxel') voxels.delete(key(part.x, part.y, part.z));
      else voxels.set(key(part.x, part.y, part.z), { x: part.x, y: part.y, z: part.z, material: part.material });
    }
  }
  return [...voxels.values()];
}

export function buildVoxelGroup(model) {
  const group = new THREE.Group();
  const voxelSize = model.grid?.voxelSize ?? 0.1;
  const byMaterial = new Map();
  for (const voxel of expandModel(model)) {
    if (!byMaterial.has(voxel.material)) byMaterial.set(voxel.material, []);
    byMaterial.get(voxel.material).push(voxel);
  }
  const geometry = new THREE.BoxGeometry(voxelSize * 0.985, voxelSize * 0.985, voxelSize * 0.985);
  const dummy = new THREE.Object3D();
  for (const [materialName, entries] of byMaterial) {
    const mesh = new THREE.InstancedMesh(geometry, createMaterial(model.materials?.[materialName] ?? {}), entries.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    entries.forEach((entry, index) => {
      dummy.position.set((entry.x + 0.5) * voxelSize, (entry.y + 0.5) * voxelSize, (entry.z + 0.5) * voxelSize);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  const bounds = new THREE.Box3().setFromObject(group);
  group.position.sub(bounds.getCenter(new THREE.Vector3()));
  group.userData.bounds = bounds.getSize(new THREE.Vector3());
  return group;
}

export function validateModel(model) {
  if (!model || model.format !== 'farmipelago-voxel' || model.version !== 1) {
    throw new Error('Unsupported voxel model format');
  }
  if (!model.name || !Array.isArray(model.parts) || !model.materials) {
    throw new Error('Voxel model is missing required fields');
  }
  return {
    ...model,
    id: model.id || `model-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
    category: model.category || 'model',
  };
}
