import { TILE } from '../../core/shared.js';
import { voxelKit } from './kit.js';
import { palette as p } from './concept-kit.js';

export function addHybridStorehouseArchitecture(parent, { teal, tealLight, tealDark }) {
  const kit = voxelKit('hybrid-storehouse-architecture');
  const { add, cut } = kit;

  // Two foundation courses put the hall and receiving dock on one level.
  add(p.base, -13, 0, -9, 26, 1, 22);
  add(p.stone, -12, 1, -8, 24, 1, 15);
  add(p.wood, -13, 1, 7, 26, 1, 6);
  for (const x of [-11, -6, 4, 9]) {
    add(tealDark, x, 0, 13, 2, 2, 1);
    add(p.gold, x, 2, 13, 2, 1, 1);
  }

  // Thick cream walls surround the open receiving hall. Glass sits a cell
  // behind each projecting sill and frame, above the stocked interior racks.
  add(p.cream, -12, 2, -8, 24, 11, 2);
  for (const x of [-12, 10]) {
    add(p.cream, x, 2, -6, 2, 11, 12);
    for (const z of [-5, 1]) {
      cut(x, 8, z, 2, 3, 4);
      const paneX = x < 0 ? x + 1 : x;
      const outside = x < 0 ? x - 1 : x + 2;
      add(p.glass, paneX, 8, z, 1, 3, 4);
      for (const y of [7, 11]) add(p.wood, outside, y, z - 1, 1, 1, 6);
      for (const edge of [z - 1, z + 4]) add(teal, outside, 8, edge, 1, 3, 1);
      add(tealLight, x < 0 ? x : x + 1, 8, z + 2, 1, 3, 1);
    }
    for (const z of [-8, 5]) {
      add(tealDark, x, 2, z, 2, 11, 2);
      add(p.gold, x, 2, z, 2, 1, 2);
    }
  }

  // Parked door leaves and deep jambs frame a clear central cargo route.
  for (const x of [-11, 9]) {
    add(teal, x, 2, 7, 2, 10, 1);
    for (const y of [3, 6, 9]) add(tealLight, x, y, 7, 2, 1, 1);
    add(p.steel, x < 0 ? x + 1 : x, 6, 8, 1, 2, 1);
  }
  for (const x of [-9, 8]) add(tealDark, x, 2, 6, 1, 11, 1);
  for (const x of [-12, 10]) add(p.gold, x, 12, 7, 2, 1, 1);

  // A broad, stepped barrel silhouette: the upper courses flatten out into
  // a wide ridge, keeping the warehouse distinct from the mill's tall cap.
  const courses = [
    { y: 13, left: -13, width: 26, edge: 2 },
    { y: 14, left: -12, width: 24, edge: 3 },
    { y: 15, left: -10, width: 20, edge: 3 },
    { y: 16, left: -8, width: 16, edge: 3 },
    { y: 17, left: -6, width: 12, edge: 6 },
  ];
  for (const { y, left, width, edge } of courses) {
    for (const z of [-8, 6]) add(p.cream, left, y, z, width, 1, 1);
    for (const x of [left, left + width - edge]) {
      add(teal, x, y, -9, edge, 1, 17);
      for (const z of [-9, 7]) add(p.chalk, x, y, z, edge, 1, 1);
      // Two raised metal straps follow the courses without outlining each cell.
      for (const z of [-5, 2]) add(tealLight, x, y, z, edge, 1, 1);
    }
  }
  for (const z of [-8, 6]) {
    add(p.wood, -11, 13, z, 22, 1, 1);
    add(p.wood, -1, 14, z, 2, 3, 1);
    for (const x of [-8, 7]) add(p.wood, x, 14, z, 1, 2, 1);
  }
  add(tealDark, -2, 14, 7, 4, 3, 1);
  for (const z of [-5, 3]) add(p.wood, -10, 13, z, 20, 1, 1);

  // A deep awning with a stepped fascia shelters the dock and clears the
  // trolley and rail; corbels stay against the side posts, outside the load.
  add(teal, -13, 13, 7, 26, 1, 5);
  add(tealDark, -13, 13, 12, 26, 1, 1);
  add(p.gold, -13, 12, 12, 26, 1, 1);
  for (const x of [-12, 11]) {
    add(p.wood, x, 10, 7, 1, 3, 1);
    add(p.wood, x, 11, 8, 1, 2, 1);
    add(p.wood, x, 12, 9, 1, 1, 2);
  }

  // The back receives the same constructed openings as the working facade.
  cut(-2, 2, -8, 4, 7, 2);
  add(teal, -2, 2, -7, 4, 7, 1);
  for (const x of [-3, 2]) add(tealDark, x, 2, -9, 1, 7, 2);
  add(p.wood, -3, 9, -9, 6, 1, 2);
  add(p.gold, -2, 5, -8, 1, 1, 1);
  add(p.stone, -3, 0, -11, 6, 1, 2);
  add(p.wood, -3, 1, -10, 6, 1, 1);
  for (const x of [-9, 5]) {
    cut(x, 9, -8, 4, 2, 2);
    add(p.dark, x, 9, -7, 4, 2, 1);
    add(tealDark, x, 10, -8, 4, 1, 1);
    add(p.wood, x - 1, 8, -9, 6, 1, 1);
  }

  const architecture = kit.finish().group;
  // Keep instanced voxel meshes outside the ordinary-mesh detail bake.
  architecture.scale.setScalar(1 / TILE);
  parent.add(architecture);
}
