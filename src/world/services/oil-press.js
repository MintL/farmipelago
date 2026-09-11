import { MODEL_VOXEL, createVoxelModel, mats } from '../../core/shared.js';

export function createOilPress(island, service) {
  const site = service.position, parts = [];
  const run = (material, at, size) => {
    parts.push({ material, at, size });
    island.obstacles.push({ shape: 'box', x: site.x + (at[0] + size[0] / 2) * MODEL_VOXEL,
      y: site.y + at[1] * MODEL_VOXEL, z: site.z + (at[2] + size[2] / 2) * MODEL_VOXEL,
      width: size[0] * MODEL_VOXEL, height: size[1] * MODEL_VOXEL, depth: size[2] * MODEL_VOXEL, yaw: 0 });
  };
  // Three-tile cream workshop, open front bay, thick window jambs and stepped roof.
  run(mats.trunk, [-7, 0, -6], [14, 1, 12]);
  run(mats.combineCream, [-7, 1, -6], [14, 9, 2]);
  for (const x of [-7, 5]) {
    run(mats.combineCream, [x, 1, -4], [2, 3, 10]);
    run(mats.combineCream, [x, 4, -4], [2, 3, 2]);
    run(mats.combineCream, [x, 4, 2], [2, 3, 4]);
    run(mats.trunk, [x, 3, -2], [2, 1, 4]);
    run(mats.combineCream, [x, 7, -4], [2, 3, 10]);
  }
  for (const x of [-5, 3]) run(mats.trunk, [x, 1, 4], [2, 8, 2]);
  run(mats.trunk, [-5, 8, 4], [10, 2, 2]);
  for (let step = 0; step < 7; step++) {
    for (const x of [-8 + step, 7 - step]) run(mats.red, [x, 10 + step, -7], [1, 1, 14]);
  }
  run(mats.trunk, [-1, 17, -7], [2, 1, 14]);
  // An exposed screw press within the bay, plus grain hopper and golden oil cans.
  for (const x of [-3, 2]) run(mats.trunk, [x, 1, -2], [1, 6, 3]);
  run(mats.trunk, [-3, 7, -2], [6, 1, 3]);
  run(mats.combineCream, [-1, 3, -1], [2, 4, 1]);
  run(mats.bale, [-2, 2, -2], [4, 1, 3]);
  run(mats.trunk, [-7, 1, 6], [4, 2, 3]);
  run(mats.canolaFlower, [-6, 3, 7], [2, 1, 1]);
  for (const x of [3, 5]) {
    run(mats.bale, [x, 1, 6], [2, 3, 2]);
    run(mats.trunk, [x, 4, 6], [1, 1, 1]);
  }
  const model = createVoxelModel(parts, { name: 'oil-press' });
  model.position.set(site.x, site.y, site.z);
  island.group.add(model);
  return null;
}
