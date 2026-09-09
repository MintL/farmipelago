import { THREE, mats, MODEL_VOXEL, createVoxelModel } from '../../core/shared.js';

// Machinery can use finer blocks. Keep one owner per cell, then merge runs;
// the building construction grid remains untouched.
const DETAIL = .05;
export function assembly(name) {
  const rows = new Map();
  const add = (material, x, y, z, w = 1, h = 1, d = 1) => {
    if (![x, y, z, w, h, d].every(Number.isInteger) || Math.min(w, h, d) < 1) throw new Error(`${name}: invalid detail block`);
    for (let iy = y; iy < y + h; iy++) for (let iz = z; iz < z + d; iz++) {
      const key = `${iy},${iz}`;
      if (!rows.has(key)) rows.set(key, { y: iy, z: iz, cells: new Map() });
      for (let ix = x; ix < x + w; ix++) rows.get(key).cells.set(ix, material);
    }
  };
  const build = (origin = [0, 0, 0]) => {
    const parts = [];
    for (const { y, z, cells } of rows.values()) {
      let run;
      for (const x of [...cells.keys()].sort((a, b) => a - b)) {
        const material = cells.get(x);
        if (run && run.material === material && run.at[0] + run.size[0] === x) run.size[0]++;
        else { run = { material, at: [x, y, z], size: [1, 1, 1] }; parts.push(run); }
      }
    }
    const model = createVoxelModel(parts, { name, origin });
    model.scale.setScalar(DETAIL / MODEL_VOXEL);
    return model;
  };
  return { add, build };
}

export function wheel(parent, x, y, z, diameter, front, materials = {}) {
  const holder = new THREE.Group(); holder.position.set(x, y, z);
  const v = assembly('tractor-fine-wheel');
  const radius = diameter / 2, width = materials.width ?? (front ? 4 : 5);
  for (let iy = 0; iy < diameter; iy++) for (let iz = 0; iz < diameter; iz++) {
    const dy = iy + .5 - radius, dz = iz + .5 - radius;
    const distance = Math.hypot(dy, dz);
    if (distance > radius) continue;
    for (let ix = 0; ix < width; ix++) {
      const side = ix === 0 || ix === width - 1;
      const hub = distance < radius * .47;
      const tread = distance > radius - 1 && (iy + iz) % 3 === 0;
      v.add(hub ? (distance < 1.3 ? (materials.cap ?? mats.tractorCream) : (materials.hub ?? mats.hub)) : tread && !side ? (materials.tread ?? mats.tractorDark) : mats.tire, ix, iy, iz);
    }
  }
  const roller = v.build([-width / 2, -radius, -radius]);
  holder.add(roller); parent.add(holder);
  return { holder, roller, radius: radius * DETAIL, front, spin: 0, phase: 0 };
}
