import { createFieldworksWorkshop } from '../world/workshop/fieldworks.js';
import { THREE, mats, createVoxelModel } from '../core/shared.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
const palette = {
  honey: material(0xb99261), cream: material(0xe0d8b6), wine: material(0x713e3d),
  teal: material(0x447e7b), dark: material(0x35484c), copper: material(0xad7250),
  stone: material(0xaaa99a), sandstone: material(0x8c9187), glass: material(0x70bdcf),
};

export function createWorkshopAlternative(kind) {
  if (kind === 1) return createFieldworksWorkshop().group;
  const parts = [];
  const add = (m, x, y, z, w = 1, h = 1, d = 1) => parts.push({ material: m, at: [x, y, z], size: [w, h, d] });
  const wall = [palette.honey, palette.teal, palette.stone][kind];
  const frame = [mats.bridgeDark, palette.dark, palette.sandstone][kind];
  const roof = [palette.wine, palette.dark, palette.copper][kind];
  // All structure and furniture use integer cells on the shared 5-per-tile grid.
  // The primary enclosure stays 15 x 15; the porches are visual concept options.
  add(mats.stoneDark, -1, 0, -1, 17, 1, 17);
  add(mats.stone, 1, 1, 1, 13, 1, 13);
  for (let x = 0; x < 15; x++) for (let y = 1; y < 12; y++) {
    if (x < 3 || x > 11 || y >= 10) add(wall, x, y, 0);
    if (!(x >= 5 && x <= 9 && y >= 5 && y <= 8)) add(wall, x, y, 14);
  }
  for (const x of [0, 14]) for (let z = 1; z < 14; z++) for (let y = 1; y < 12; y++) {
    if (!((z >= 3 && z <= 5 || z >= 9 && z <= 11) && y >= 5 && y <= 8)) {
      add(kind === 2 && (y + z) % 7 === 0 ? palette.sandstone : wall, x, y, z);
    }
  }
  for (const x of [0, 14]) for (const z of [0, 7, 14]) add(frame, x, 1, z, 1, 11, 1);
  for (const x of [0, 14]) {
    add(frame, x, 11, 0, 1, 1, 15);
    for (const z of [3, 9]) {
      add(palette.glass, x, 5, z, 1, 4, 3);
      const outer = x === 0 ? -1 : 15;
      add(palette.cream, outer, 4, z - 1, 1, 1, 5);
      add(frame, outer, 9, z - 1, 1, 1, 5);
      for (const edge of [z - 1, z + 3]) add(frame, outer, 5, edge, 1, 4, 1);
      add(frame, outer, 5, z + 1, 1, 4, 1);
    }
  }
  add(palette.glass, 5, 5, 14, 5, 4, 1);
  add(frame, 0, 11, 0, 15, 1, 1);
  add(frame, 2, 1, -1, 1, 9, 2);
  add(frame, 12, 1, -1, 1, 9, 2);
  add(frame, 2, 10, -1, 11, 1, 2);
  // Open, recessed bay with raised shutter or folded timber leaves.
  if (kind === 1) {
    for (let y = 10; y < 13; y++) add(y % 2 ? mats.metal : palette.cream, 3, y, -1, 9, 1, 1);
  } else {
    for (const x of [0, 13]) {
      add(kind === 0 ? palette.wine : palette.teal, x, 1, -2, 2, 8, 1);
      for (const y of [2, 7]) add(frame, x, y, -3, 2, 1, 1);
    }
  }
  // Visible back-wall pegboard, spanners, bench, vise and drawer cabinet.
  add(frame, 2, 2, 11, 1, 3, 2); add(frame, 10, 2, 11, 1, 3, 2);
  add(palette.honey, 2, 5, 11, 9, 1, 2);
  add(frame, 3, 7, 13, 8, 3, 1);
  for (const x of [3, 6, 9]) { add(mats.metal, x, 7, 12, 1, 2, 1); add(mats.metal, x, 9, 12, 2, 1, 1); }
  add(mats.metal, 3, 6, 10, 2, 1, 3); add(palette.dark, 3, 7, 10);
  add(mats.tractor, 11, 2, 8, 2, 4, 4);
  for (const y of [3, 5]) add(mats.metal, 10, y, 9, 1, 1, 2);
  // A gridded service channel and inset cream approach markers.
  for (const x of [4, 10]) add(palette.cream, x, 1, -6, 1, 1, 7);
  add(mats.stoneDark, 6, 1, 2, 3, 1, 7);
  for (let z = 2; z < 9; z += 2) add(mats.metal, 6, 2, z, 3, 1, 1);

  if (kind === 0) {
    // Broad stepped gable, cream verge and an actual inset loft opening.
    for (let step = 0; step < 8; step++) {
      const y = 12 + step;
      for (const x of [-1 + step, 15 - step]) {
        add(roof, x, y, -2, 1, 1, 19);
        add(palette.cream, x, y, -3); add(palette.cream, x, y, 17);
      }
      if (step < 7) for (let x = step; x < 15 - step; x++) {
        if (!(x >= 6 && x <= 8 && y <= 16)) add(wall, x, y, 0);
        add(wall, x, y, 14);
      }
    }
    add(roof, 7, 20, -2, 1, 1, 19);
    add(palette.wine, 6, 12, 1, 3, 5, 1);
    add(palette.cream, 5, 12, -1, 1, 5); add(palette.cream, 9, 12, -1, 1, 5);
    add(palette.cream, 5, 17, -1, 5); add(palette.cream, 5, 12, -1, 5);
    add(frame, 7, 13, 0, 1, 3);
    // Side porch, stepped lean-to, exposed supports and a rack of lumber.
    for (const z of [0, 12]) add(frame, -5, 1, z, 1, 7);
    for (let x = -5; x < 0; x++) add(roof, x, 8 + Math.floor((x + 5) / 2), -1, 1, 1, 15);
    for (const z of [3, 5, 7]) add(palette.honey, -5, 1, z, 4, 1, 1);
    add(frame, -5, 3, 10, 4, 1, 2);
    for (const x of [-5, -2]) add(frame, x, 1, 10, 1, 2, 2);
    // Brick flue and cap.
    add(mats.red, 11, 14, 10, 2, 7, 2); add(frame, 10, 21, 9, 4, 1, 4);
  } else {
    // Stepped hipped copper cap with inset front dormer.
    for (let step = 0; step < 6; step++) {
      const lo = -2 + step, width = 19 - step * 2, y = 12 + step;
      add(roof, lo, y, lo, width, 1, 1); add(roof, lo, y, 16 - step, width, 1, 1);
      add(roof, lo, y, lo + 1, 1, 1, width - 2); add(roof, 16 - step, y, lo + 1, 1, 1, width - 2);
    }
    add(roof, 4, 18, 4, 7, 1, 7);
    add(frame, 5, 12, -1, 1, 4); add(frame, 9, 12, -1, 1, 4);
    add(palette.teal, 6, 12, 0, 3, 3); add(palette.cream, 5, 15, -1, 5);
    for (let step = 0; step < 3; step++) add(roof, 4 + step, 16 + step, -2, 7 - step * 2, 1, 4);
    // Battered forge chimney built from alternating stone courses, open cap.
    add(frame, -4, 0, 9, 5, 3, 5);
    for (let y = 3; y < 23; y++) add(y % 4 === 0 ? palette.stone : frame, -3, y, 10, 3, 1, 3);
    add(palette.dark, -2, 23, 11); add(palette.stone, -4, 22, 9, 5, 1, 5);
    for (const x of [-3, -1]) for (const z of [10, 12]) add(frame, x, 23, z, 1, 2);
    add(roof, -4, 25, 9, 5, 1, 5);
    // Side forge alcove and anvil with stepped shoulders.
    add(frame, -5, 1, 2, 4, 2, 5); add(frame, -5, 3, 5, 4, 4, 2);
    add(mats.headlamp, -4, 3, 4, 2, 1, 1);
    add(palette.dark, -5, 7, 3, 4, 1, 4); add(palette.dark, -4, 8, 4, 3, 1, 3);
    add(mats.bridgeDark, -4, 1, -3, 3, 2, 3); add(mats.metal, -3, 3, -2, 1, 2);
    add(palette.dark, -5, 5, -2, 4, 1, 2); add(mats.metal, -6, 5, -2);
    for (const x of [0, 14]) for (const y of [2, 5, 8]) add(palette.stone, x - 1, y, -1, 3, 1, 2);
  }
  // Stacked open-centred tyres, oil tins, crate and a gridded hanging lamp.
  for (const y of [1, 2, 3]) {
    add(mats.tire, 16, y, 7, 3, 1, 1); add(mats.tire, 16, y, 9, 3, 1, 1);
    add(mats.tire, 16, y, 8); add(mats.tire, 18, y, 8);
  }
  add(mats.red, 16, 1, 2, 2, 3, 2); add(mats.metal, 16, 4, 2, 2, 1, 2);
  add(palette.honey, 16, 1, 12, 3, 3, 3);
  for (const x of [16, 18]) add(frame, x, 1, 11, 1, 3);
  add(frame, 12, 11, -3, 1, 1, 2); add(palette.dark, 12, 9, -3, 1, 2);
  add(palette.dark, 11, 8, -4, 3, 1, 3); add(mats.headlamp, 12, 6, -3, 1, 2);
  add(palette.dark, 11, 5, -4, 3, 1, 3);
  return createVoxelModel(parts, { name: `workshop-alternative-${kind + 1}`, origin: [-7.5, 0, -7.5] });
}
