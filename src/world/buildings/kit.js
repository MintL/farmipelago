import { THREE, MODEL_VOXEL, createVoxelModel, mats } from '../../core/shared.js';

const material = (name, color, extra = {}) => Object.assign(new THREE.MeshStandardMaterial({ color, roughness: .86, ...extra }), { name });
export const palette = {
  cream: material('building-plaster', 0xf2e4c2), white: material('building-trim', 0xfff3d5),
  timber: material('building-timber', 0x614635), wood: material('building-oak', 0xb98148),
  red: material('building-barn-red', 0xb84f3e), redDark: material('building-red-shadow', 0x82392f),
  teal: material('building-teal', 0x318d8b), blue: material('building-blue', 0x4a83aa),
  roof: material('building-slate', 0x344c60), roofLight: material('building-slate-edge', 0x516d81),
  charcoal: material('building-warehouse-roof', 0x354246),
  copper: material('building-copper', 0xc57b43, { metalness: .18 }),
  gold: material('building-gold', 0xe9b941), green: material('building-green', 0x507d45),
  glass: material('building-window', 0x88c5d2, { roughness: .3, metalness: .12 }),
  stone: mats.stone, darkStone: mats.stoneDark, metal: mats.metal, dark: mats.tire,
};

const cellKey = (x, y, z) => `${x},${y},${z}`;

// One owner per cell prevents coincident faces at posts, roof edges and trim.
// Greedy cuboids keep both draw instances and static collider counts compact.
function mergeCells(source, ignoreMaterials = false) {
  const cells = new Map(source);
  const runs = [];
  for (const [key, material] of cells) {
    const [x, y, z] = key.split(',').map(Number);
    const has = (dx, dy, dz) => {
      const value = cells.get(cellKey(x + dx, y + dy, z + dz));
      return value !== undefined && (ignoreMaterials || value === material);
    };
    let w = 1, d = 1, h = 1;
    while (has(w, 0, 0)) w++;
    const row = (dy, dz) => {
      for (let dx = 0; dx < w; dx++) if (!has(dx, dy, dz)) return false;
      return true;
    };
    while (row(0, d)) d++;
    const layer = dy => {
      for (let dz = 0; dz < d; dz++) if (!row(dy, dz)) return false;
      return true;
    };
    while (layer(h)) h++;
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      cells.delete(cellKey(x + dx, y + dy, z + dz));
    }
    runs.push({ material, at: [x, y, z], size: [w, h, d] });
  }
  return runs;
}

export function voxelKit(name) {
  const cells = new Map();
  const add = (material, x, y, z, w = 1, h = 1, d = 1) => {
    if (![x, y, z, w, h, d].every(Number.isInteger) || Math.min(w, h, d) <= 0) throw new Error(`Invalid building cells in ${name}`);
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      cells.set(cellKey(x + dx, y + dy, z + dz), material);
    }
  };
  const cut = (x, y, z, w, h, d) => {
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      cells.delete(cellKey(x + dx, y + dy, z + dz));
    }
  };
  const finish = (origin = [0, 0, 0]) => {
    const runs = mergeCells(cells);
    const group = createVoxelModel(runs, { name, origin });
    const colliders = mergeCells(cells, true).map(({ at, size }) => ({
      shape: 'box', x: (at[0] + origin[0] + size[0] / 2) * MODEL_VOXEL,
      y: (at[1] + origin[1]) * MODEL_VOXEL, z: (at[2] + origin[2] + size[2] / 2) * MODEL_VOXEL,
      width: size[0] * MODEL_VOXEL, height: size[1] * MODEL_VOXEL, depth: size[2] * MODEL_VOXEL, yaw: 0,
    }));
    group.userData.voxelCount = cells.size;
    group.userData.buildingColliders = colliders;
    return { group, colliders };
  };
  return { add, cut, finish };
}

export function gable(kit, { x, z, width, depth, y, wall = palette.cream, roof = palette.roof, step = 1 }) {
  const { add } = kit;
  for (let inset = 0; inset <= Math.floor((width + 1) / 2); inset += step) {
    const span = width + 2 - inset * 2;
    if (span <= 0) break;
    const height = y + Math.floor(inset / step);
    for (const end of [z, z + depth - 1]) add(wall, x - 1 + inset, height, end, span, 1, 1);
    add(roof, x - 1 + inset, height, z - 1, Math.min(step, span), 1, depth + 2);
    if (span > step) add(roof, x + width + 1 - inset - Math.min(step, span), height, z - 1, Math.min(step, span), 1, depth + 2);
    if (span <= step * 2 + 1) { add(roof, x - 1 + inset, height + 1, z - 1, span, 1, depth + 2); break; }
  }
}

export function frontWindow(kit, x, y, z, { width = 3, height = 3, trim = palette.white, shutter = palette.teal } = {}) {
  const { add, cut } = kit;
  cut(x, y, z, width, height, 2);
  add(palette.glass, x, y, z + 1, width, height, 1);
  add(trim, x - 1, y - 1, z - 1, width + 2, 1, 2);
  add(trim, x - 1, y + height, z - 1, width + 2, 1, 1);
  for (const side of [x - 1, x + width]) add(shutter, side, y, z, 1, height, 1);
  if (width >= 3) add(trim, x + Math.floor(width / 2), y, z, 1, height, 1);
}

export function crate(kit, x, y, z, fill = palette.gold, width = 3) {
  const { add } = kit;
  add(palette.wood, x, y, z, width, 2, 3);
  for (const edge of [x, x + width - 1]) add(palette.timber, edge, y, z, 1, 2, 3);
  add(fill, x + 1, y + 2, z + 1, Math.max(1, width - 2), 1, 1);
}

export function sack(kit, x, y, z) {
  kit.add(palette.cream, x, y, z, 2, 3, 2);
  kit.add(palette.wood, x, y + 3, z, 1, 1, 1);
}

export function can(kit, x, y, z, material = palette.gold) {
  kit.add(material, x, y, z, 2, 3, 2);
  kit.add(palette.dark, x, y + 3, z, 1, 1, 1);
  kit.add(palette.metal, x, y + 2, z + 2, 2, 1, 1);
}

export function wheatEmblem(kit, x, y, z, material = palette.gold) {
  kit.add(material, x, y, z, 1, 5, 1);
  for (const level of [1, 3]) {
    kit.add(material, x - 1, y + level, z, 1, 1, 1);
    kit.add(material, x + 1, y + level + 1, z, 1, 1, 1);
  }
}

export function animatedPart(model, name, at, author, update, { origin = [0, 0, 0] } = {}) {
  const kit = voxelKit(name);
  author(kit);
  const part = kit.finish(origin).group;
  part.position.set(...at.map(value => value * MODEL_VOXEL));
  model.group.add(part);
  (model.motions ||= []).push((time, working, reduced, machineTime) => update(part, time, working, reduced, machineTime));
  return part;
}

export function finishBuilding(model) {
  model.bounds = new THREE.Box3().setFromObject(model.group);
  model.animate = (time, working = true, reduced = false, machineTime = time) => {
    for (const motion of model.motions || []) motion(time, working, reduced, machineTime);
  };
  return model;
}

export function worldColliders(colliders, site, yaw = 0) {
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  return colliders.map(collider => ({ ...collider,
    x: site.x + collider.x * cos + collider.z * sin,
    y: site.y + collider.y, z: site.z - collider.x * sin + collider.z * cos, yaw,
  }));
}
