import { THREE, MODEL_VOXEL, createVoxelModel, mats } from '../../core/shared.js';

export function createWindmill(island, service) {
  const site = service.position, parts = [];
  const run = (material, at, size) => {
    parts.push({ material, at, size });
    island.obstacles.push({ shape: 'box', x: site.x + (at[0] + size[0] / 2) * MODEL_VOXEL,
      y: site.y + at[1] * MODEL_VOXEL, z: site.z + (at[2] + size[2] / 2) * MODEL_VOXEL,
      width: size[0] * MODEL_VOXEL, height: size[1] * MODEL_VOXEL, depth: size[2] * MODEL_VOXEL, yaw: 0 });
  };
  // Thick walls, a constructed doorway and recessed window openings.
  run(mats.trunk, [-7, 0, -7], [14, 1, 14]);
  run(mats.combineCream, [-7, 1, -7], [14, 17, 2]);
  for (const x of [-7, 5]) {
    run(mats.combineCream, [x, 1, -5], [2, 7, 12]);
    run(mats.combineCream, [x, 8, -5], [2, 4, 4]);
    run(mats.combineCream, [x, 8, 3], [2, 4, 4]);
    run(mats.combineCream, [x, 12, -5], [2, 6, 12]);
    run(mats.trunk, [x, 7, -1], [2, 1, 4]);
  }
  run(mats.combineCream, [-5, 1, 5], [3, 7, 2]);
  run(mats.combineCream, [2, 1, 5], [3, 7, 2]);
  run(mats.trunk, [-2, 7, 5], [4, 1, 2]);
  run(mats.combineCream, [-5, 8, 5], [10, 10, 2]);
  for (let step = 0; step < 5; step++) {
    run(mats.red, [-8 + step, 18 + step, -8 + step], [16 - step * 2, 1, 16 - step * 2]);
  }
  // Receiving bin and output sacks, with an open yard in front.
  run(mats.trunk, [-7, 1, 7], [4, 2, 3]);
  run(mats.wheatRipe, [-6, 3, 8], [2, 1, 1]);
  for (const x of [3, 5]) run(mats.combineCream, [x, 1, 7], [2, 3, 2]);
  const model = createVoxelModel(parts, { name: 'windmill' });
  model.position.set(site.x, site.y, site.z);
  island.group.add(model);
  const sails = createVoxelModel([
    { material: mats.trunk, at: [-1, -11, 0], size: [2, 22, 1] },
    { material: mats.trunk, at: [-11, -1, 0], size: [22, 2, 1] },
    { material: mats.combineCream, at: [1, 3, 0], size: [3, 8, 1] },
    { material: mats.combineCream, at: [-4, -11, 0], size: [3, 8, 1] },
    { material: mats.combineCream, at: [3, -4, 0], size: [8, 3, 1] },
    { material: mats.combineCream, at: [-11, 1, 0], size: [8, 3, 1] },
    { material: mats.trunk, at: [-2, -2, 1], size: [4, 4, 2] },
  ], { name: 'windmill-sails' });
  sails.position.set(0, 24 * MODEL_VOXEL, 9 * MODEL_VOXEL);
  model.add(sails);
  // Conservative full rotation envelope, above vehicle access height.
  island.obstacles.push({ shape: 'box', x: site.x, y: site.y + 12 * MODEL_VOXEL,
    z: site.z + 10 * MODEL_VOXEL, width: 24 * MODEL_VOXEL, height: 24 * MODEL_VOXEL,
    depth: 4 * MODEL_VOXEL, yaw: 0 });
  const sweep = new THREE.Box3(
    new THREE.Vector3(site.x - 12 * MODEL_VOXEL, site.y + 12 * MODEL_VOXEL, site.z + 8 * MODEL_VOXEL),
    new THREE.Vector3(site.x + 12 * MODEL_VOXEL, site.y + 36 * MODEL_VOXEL, site.z + 12 * MODEL_VOXEL),
  );
  if (island.serviceBounds) island.serviceBounds.union(sweep);
  else island.serviceBounds = sweep;
  return sails;
}
