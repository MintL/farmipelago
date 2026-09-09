import { finishPreparation } from '../../core/preparation.js';
import { THREE } from '../../core/shared.js';

// Keep each animated tree's pivot while batching its authored voxel pieces.
export function batchIslandProps(root, water) {
  return finishPreparation(batchIslandPropSteps(root, water));
}

export function* batchIslandPropSteps(root, water) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  let used = false;
  const batch = function* (parent) {
    yield;
    if (parent === water) return;
    for (const child of [...parent.children]) if (child.isGroup) yield* batch(child);
    const boxes = parent.children.filter(child => child.isMesh && !child.isInstancedMesh
      && child.geometry.type === 'BoxGeometry' && !Array.isArray(child.material));
    if (boxes.length < 4) return;
    const byMaterial = new Map();
    for (const box of boxes) {
      if (!byMaterial.has(box.material)) byMaterial.set(box.material, []);
      byMaterial.get(box.material).push(box);
    }
    const matrix = new THREE.Matrix4();
    const dimensions = new THREE.Matrix4();
    for (const [material, pieces] of byMaterial) {
      yield;
      const mesh = new THREE.InstancedMesh(geometry, material, pieces.length);
      mesh.castShadow = pieces.some(piece => piece.castShadow);
      mesh.receiveShadow = pieces.some(piece => piece.receiveShadow);
      pieces.forEach((piece, index) => {
        piece.updateMatrix();
        const { width, height, depth } = piece.geometry.parameters;
        dimensions.makeScale(width, height, depth);
        matrix.copy(piece.matrix).multiply(dimensions);
        mesh.setMatrixAt(index, matrix);
        piece.userData.batchedInstance = { mesh, index };
        piece.removeFromParent();
        piece.geometry.dispose();
      });
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      parent.add(mesh);
      used = true;
    }
  };
  try { yield* batch(root); }
  finally { if (!used) geometry.dispose(); }
}
