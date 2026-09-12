import { THREE, box, mats } from '../../core/shared.js';
import { treeDesign } from './designs.js';

// Shared geometry for generated islands and authored settlement scenery.
export function createIslandTreeModel(silhouette, scale, foliage) {
  const tree = new THREE.Group(), sway = new THREE.Group(); tree.add(sway);
  const design = treeDesign(silhouette);
  const voxel = .27 * scale;
  const trunkHeight = design.trunkHeight * scale;
  const trunk = box(.15 * scale, trunkHeight, .15 * scale, mats.trunk);
  trunk.position.y = trunkHeight * 0.5;
  sway.add(trunk);
  const addBranch = (start, end) => {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const branch = box(.105 * scale, .105 * scale, direction.length(), mats.trunk);
    branch.position.set(
      (start[0] + end[0]) * .5,
      (start[1] + end[1]) * .5,
      (start[2] + end[2]) * .5,
    );
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
    sway.add(branch);
  };
  design.branches.forEach(([sx, sy, sz, ex, ey, ez]) => {
    addBranch([sx * scale, sy * scale, sz * scale], [ex * scale, ey * scale, ez * scale]);
  });
  design.leaves.forEach(([lx, ly, lz], index) => {
    const leaf = box(voxel, voxel, voxel, index % 3 === 0 ? foliage.light : foliage.dark);
    leaf.position.set(lx * voxel, design.leafBaseY * scale + ly * voxel, lz * voxel);
    sway.add(leaf);
  });
  return { tree, sway, trunkHeight, radius: design.radius * scale };
}
