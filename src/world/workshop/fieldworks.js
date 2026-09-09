import { THREE, MODEL_VOXEL, mats, createVoxelModel } from '../../core/shared.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
const palette = {
  honey: material(0xb99261), cream: material(0xe0d8b6),
  teal: material(0x447e7b), dark: material(0x35484c), glass: material(0x70bdcf),
};

export function createFieldworksWorkshop() {
  const parts = [];
  const add = (material, x, y, z, w = 1, h = 1, d = 1) => parts.push({ material, at: [x, y, z], size: [w, h, d] });
  const wall = palette.teal;
  const frame = palette.dark;
  const roof = palette.dark;
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: .25, roughness: .38,
  });
  // All structure and furniture use integer cells on the shared 5-per-tile grid.
  // The primary enclosure stays 15 x 15 with the gantry on the reserved apron.
  add(mats.stoneDark, -1, 0, -1, 17, 1, 17);
  for (let z = 1; z < 14; z++) for (let x = 1; x < 14; x++) {
    const inChannel = x >= 6 && x <= 8 && z >= 2 && z < 9;
    add(inChannel ? (z % 2 ? mats.stoneDark : mats.metal) : mats.stone, x, 1, z);
  }
  for (let x = 0; x < 15; x++) for (let y = 1; y < 12; y++) {
    if (x < 3 || x > 11 || y >= 10) add(wall, x, y, 0);
    if (!(x >= 5 && x <= 9 && y >= 5 && y <= 8)) add(wall, x, y, 14);
  }
  for (const x of [0, 14]) for (let z = 1; z < 14; z++) for (let y = 1; y < 12; y++) {
    if (!((z >= 3 && z <= 5 || z >= 9 && z <= 11) && y >= 5 && y <= 8)) {
      add(wall, x, y, z);
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
  // Open, recessed bay with a raised steel shutter.
  for (let y = 10; y < 13; y++) add(y % 2 ? mats.metal : palette.cream, 3, y, -1, 9, 1, 1);
  // Visible back-wall pegboard, spanners, bench, vise and drawer cabinet.
  add(frame, 2, 2, 11, 1, 3, 2); add(frame, 10, 2, 11, 1, 3, 2);
  add(palette.honey, 2, 5, 11, 9, 1, 2);
  add(frame, 3, 7, 13, 8, 3, 1);
  for (const x of [3, 6, 9]) { add(mats.metal, x, 7, 12, 1, 2, 1); add(mats.metal, x, 9, 12, 2, 1, 1); }
  add(mats.metal, 3, 6, 10, 2, 1, 3); add(palette.dark, 3, 7, 10);
  add(mats.tractor, 11, 2, 8, 2, 4, 4);
  for (const y of [3, 5]) add(mats.metal, 10, y, 9, 1, 1, 2);
  // A gridded service channel and inset cream approach markers.
  for (const x of [4, 10]) add(palette.cream, x, 0, -6, 1, 1, 7);

  // Twin northlight roof teeth: block-step slopes and inset vertical glazing.
  for (const start of [-1, 7]) {
    for (let step = 0; step < 8; step++) {
      const y = 12 + Math.floor(step / 2);
      add(roof, start + step, y, -1, 1, 1, 17);
      add(palette.cream, start + step, y, -2);
      for (const z of [0, 14]) add(wall, start + step, 12, z, 1, Math.max(1, y - 11), 1);
    }
    add(palette.glass, start + 7, 12, 1, 1, 3, 13);
    for (const z of [1, 5, 9, 13]) add(mats.metal, start + 8, 12, z, 1, 3, 1);
    add(mats.metal, start + 8, 15, 0, 1, 1, 15);
  }
  // Outdoor lifting gantry with a block-built hanging chain and hook.
  for (const x of [1, 13]) { add(mats.stoneDark, x - 1, 1, -6, 3, 1, 3); add(palette.dark, x, 2, -5, 1, 11); }
  add(mats.combineAccent, 0, 13, -5, 15, 2, 1);
  for (const x of [1, 4, 7, 10, 13]) add(palette.dark, x, 13, -6);
  add(mats.metal, 7, 11, -5, 2, 2, 2); add(palette.dark, 8, 11, -5, 1, 2);
  add(mats.metal, 8, 10, -5, 2); add(mats.metal, 9, 11, -5);
  // Side compressor and rooftop vent.
  add(mats.metal, -4, 1, 8, 3, 5, 5);
  for (const y of [2, 4]) add(palette.dark, -5, y, 9, 1, 1, 3);
  add(mats.metal, 2, 16, 10, 3, 1, 3); add(palette.dark, 3, 17, 11, 1, 2);
  add(mats.metal, 2, 19, 10, 3, 1, 3);
  // Stacked open-centred tyres, oil tins, crate and a gridded hanging lamp.
  for (const y of [1, 2, 3]) {
    add(mats.tire, 16, y, 7, 3, 1, 1); add(mats.tire, 16, y, 9, 3, 1, 1);
    add(mats.tire, 16, y, 8); add(mats.tire, 18, y, 8);
  }
  add(mats.red, 16, 1, 2, 2, 3, 2); add(mats.metal, 16, 4, 2, 2, 1, 2);
  add(palette.honey, 16, 1, 12, 3, 3, 3);
  for (const x of [16, 18]) add(frame, x, 1, 11, 1, 3);
  add(frame, 12, 11, -3, 1, 1, 2); add(palette.dark, 12, 9, -3, 1, 2);
  add(palette.dark, 11, 8, -4, 3, 1, 3); add(glowMaterial, 12, 6, -3, 1, 2);
  add(palette.dark, 11, 5, -4, 3, 1, 3);
  const occupiedParts = resolveOccupiedParts(parts);
  return {
    group: createVoxelModel(occupiedParts, { name: 'fieldworks-workshop', origin: [-7.5, 0, -7.5] }),
    colliders: mergeSolidCells(occupiedParts),
    glowMaterial,
    lightPosition: new THREE.Vector3(5 * MODEL_VOXEL, 7 * MODEL_VOXEL, -10 * MODEL_VOXEL),
  };
}

// Construction details replace the underlying cell rather than intersecting it.
// Later-authored posts, trim and fittings own their cells. Merge adjacent cells
// of the same material into disjoint horizontal runs for the shared renderer.
function resolveOccupiedParts(parts) {
  const rows = new Map();
  for (const { material, at: [x, y, z], size: [w, h, d] } of parts) {
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) {
      const key = `${y + dy},${z + dz}`;
      if (!rows.has(key)) rows.set(key, { y: y + dy, z: z + dz, cells: new Map() });
      const { cells } = rows.get(key);
      for (let dx = 0; dx < w; dx++) cells.set(x + dx, material);
    }
  }
  const occupiedParts = [];
  for (const { y, z, cells } of rows.values()) {
    let run = null;
    for (const x of [...cells.keys()].sort((a, b) => a - b)) {
      const material = cells.get(x);
      if (run && run.material === material && run.at[0] + run.size[0] === x) {
        run.size[0]++;
      } else {
        run = { material, at: [x, y, z], size: [1, 1, 1] };
        occupiedParts.push(run);
      }
    }
  }
  return occupiedParts;
}

// Merge occupied cells independently of their render materials. Every solid
// detail has matching collision, without one Rapier collider per wall voxel.
function mergeSolidCells(parts) {
  const cells = new Set();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (const { at: [x, y, z], size: [w, h, d] } of parts) {
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      cells.add(key(x + dx, y + dy, z + dz));
    }
  }
  const colliders = [];
  for (const cell of cells) {
    const [x, y, z] = cell.split(',').map(Number);
    let w = 1, h = 1, d = 1;
    while (cells.has(key(x + w, y, z))) w++;
    const rowPresent = (dy, dz) => {
      for (let dx = 0; dx < w; dx++) if (!cells.has(key(x + dx, y + dy, z + dz))) return false;
      return true;
    };
    while (rowPresent(0, d)) d++;
    const layerPresent = dy => {
      for (let dz = 0; dz < d; dz++) if (!rowPresent(dy, dz)) return false;
      return true;
    };
    while (layerPresent(h)) h++;
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      cells.delete(key(x + dx, y + dy, z + dz));
    }
    colliders.push({
      x: (x + w / 2 - 7.5) * MODEL_VOXEL,
      z: (z + d / 2 - 7.5) * MODEL_VOXEL,
      y: y * MODEL_VOXEL,
      width: w * MODEL_VOXEL, height: h * MODEL_VOXEL, depth: d * MODEL_VOXEL,
    });
  }
  return colliders;
}
