import { TILE } from '../../core/shared.js';
import { voxelKit } from './kit.js';
import { palette as p, material } from './concept-kit.js';

const timber = material('hybrid-mill-dark-oak', 0x695039);

function addModel(parent, kit, x = 0) {
  const model = kit.finish().group;
  // Concept assemblies use tile units, with TILE applied by their outer group.
  model.scale.setScalar(1 / TILE);
  model.position.x = x;
  parent.add(model);
}

export function addHybridMillArchitecture(parent) {
  const tower = voxelKit('hybrid-mill-tower');
  const { add, cut } = tower;
  // A square, stepped masonry tower surrounds a genuinely open milling bay.
  add(p.base, -7, 0, -7, 14, 1, 14);
  add(p.stone, -6, 1, -6, 12, 1, 12);
  add(p.cream, -6, 2, -6, 12, 6, 2);
  for (const x of [-6, 4]) add(p.cream, x, 2, -4, 2, 6, 8);
  for (const x of [-5, 4]) {
    add(timber, x, 2, 4, 1, 6, 2);
    add(p.wood, x - 1, 1, 4, 2, 1, 2);
    add(p.gold, x, 6, 5, 1, 1, 1);
  }
  add(p.wood, -5, 8, 4, 10, 1, 2);
  for (const y of [3, 6]) {
    add(p.stone, -6, y, -6, 2, 1, 1);
    add(p.chalk, 4, y, -6, 2, 1, 1);
  }
  // The upper wall steps inward; corner posts, sills and glazing occupy cells.
  add(p.chalk, -5, 9, -5, 10, 1, 10);
  add(p.cream, -5, 10, -5, 10, 4, 1);
  add(p.cream, -5, 10, 4, 10, 4, 1);
  for (const x of [-5, 4]) add(p.cream, x, 10, -4, 1, 4, 8);
  for (const x of [-5, 4]) for (const z of [-5, 4]) add(timber, x, 9, z, 1, 5, 1);
  for (const x of [-5, 4]) {
    cut(x, 10, -2, 1, 3, 3);
    add(p.glass, x, 10, -2, 1, 3, 3);
    const outside = x < 0 ? -6 : 5;
    add(p.wood, outside, 9, -3, 1, 1, 5);
    add(p.blue, outside, 10, -3, 1, 3, 1);
    add(p.blue, outside, 10, 1, 1, 3, 1);
    add(p.wood, outside, 13, -3, 1, 1, 5);
    add(p.chalk, outside, 10, -1, 1, 3, 1);
  }
  cut(-1, 10, -5, 3, 3, 1);
  add(p.glass, -1, 10, -5, 3, 3, 1);
  add(p.wood, -2, 9, -6, 5, 1, 1);
  for (const x of [-2, 2]) add(p.blue, x, 10, -6, 1, 3, 1);
  add(p.wood, -2, 13, -6, 5, 1, 1);
  // Three-sided timber balcony leaves the grain path and front mechanism open.
  add(p.wood, -7, 7, -7, 14, 1, 2);
  for (const x of [-7, 5]) add(p.wood, x, 7, -5, 2, 1, x < 0 ? 4 : 9);
  for (const x of [-7, 6]) {
    for (const z of x < 0 ? [-7, -2] : [-7, -2, 3]) add(timber, x, 8, z, 1, 2, 1);
    add(p.wood, x, 10, -7, 1, 1, x < 0 ? 6 : 11);
  }
  for (const x of [-7, -2, 3, 6]) add(timber, x, 8, -7, 1, 2, 1);
  add(p.wood, -7, 10, -7, 14, 1, 1);
  // Chunky stepped courses establish the silhouette, with no painted cube grid.
  add(p.chalk, -7, 14, -7, 14, 1, 14);
  for (let step = 0; step < 6; step++) {
    const lo = -7 + step, span = 14 - step * 2, y = 15 + step;
    add(p.blue, lo, y, lo, span, 1, span);
    add(p.darkBlue, lo, y, lo, 1, 1, span);
    add(p.lightBlue, lo, y, lo + span - 1, span, 1, 1);
  }
  add(p.darkBlue, -1, 21, -1, 2, 1, 2);
  add(p.gold, -1, 22, -1, 2, 1, 2);
  // Recessed rear service door has constructed jambs and an actual inset leaf.
  cut(-2, 2, -6, 4, 5, 2);
  add(p.blue, -2, 2, -5, 4, 5, 1);
  for (const x of [-3, 2]) add(timber, x, 2, -6, 1, 5, 1);
  add(p.wood, -3, 7, -6, 6, 1, 1);
  add(p.gold, -2, 4, -6, 1, 1, 1);
  addModel(parent, tower, -.55);

  const wing = voxelKit('hybrid-mill-bagging-wing');
  wing.add(p.base, 4, 0, -5, 11, 1, 11);
  wing.add(p.cream, 4, 1, -5, 10, 7, 1);
  wing.add(p.cream, 13, 1, -4, 1, 7, 9);
  wing.cut(13, 4, -2, 1, 3, 4);
  wing.add(p.glass, 13, 4, -2, 1, 3, 4);
  wing.add(p.wood, 14, 3, -3, 1, 1, 6);
  wing.add(p.blue, 14, 4, -3, 1, 3, 1);
  wing.add(p.blue, 14, 4, 2, 1, 3, 1);
  for (const x of [4, 13]) {
    wing.add(timber, x, 1, 4, 1, 7, 1);
    wing.add(p.gold, x, 6, 5, 1, 1, 1);
  }
  wing.add(p.wood, 4, 8, 4, 10, 1, 1);
  // The lower roof descends toward the receiving face in three wide courses.
  for (let z = -6; z <= 5; z++) {
    const y = 10 - Math.floor((z + 6) / 4);
    wing.add(p.blue, 3, y, z, 12, 1, 1);
    wing.add(p.darkBlue, 14, y, z, 1, 1, 1);
  }
  wing.add(p.chalk, 3, 8, 5, 12, 1, 1);
  addModel(parent, wing);
}
