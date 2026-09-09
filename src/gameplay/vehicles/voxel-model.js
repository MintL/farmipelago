import { THREE, MODEL_VOXEL, createVoxelModel, mats } from '../../core/shared.js';

// One material per occupied cell: details replace cells, never overlay solids.
export function voxelAssembly(name) {
  const cells = new Map();
  const add = (material, x, y, z, w = 1, h = 1, d = 1) => {
    if (![x, y, z, w, h, d].every(Number.isInteger) || Math.min(w, h, d) < 1) throw new Error(`${name}: invalid voxel run`);
    for (let dy = 0; dy < h; dy++) for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      const at = [x + dx, y + dy, z + dz];
      cells.set(at.join(','), { material, at, size: [1, 1, 1] });
    }
  };
  const build = (origin = [0, 0, 0]) => createVoxelModel([...cells.values()], { name, origin });
  return { add, build };
}

export function voxelWheel(parent, x, y, z, diameter, width = 1) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  const shape = voxelAssembly('voxel-wheel');
  const radius = diameter / 2;
  for (let iy = 0; iy < diameter; iy++) for (let iz = 0; iz < diameter; iz++) {
    const dy = iy + .5 - radius, dz = iz + .5 - radius;
    if (Math.hypot(dy, dz) > radius) continue;
    const center = Math.abs(dy) <= .5 && Math.abs(dz) <= .5;
    shape.add(center ? mats.hub : mats.tire, 0, iy, iz, width);
  }
  const roller = shape.build([-width / 2, -radius, -radius]);
  holder.add(roller); parent.add(holder);
  return { holder, roller, radius: radius * MODEL_VOXEL, spin: 0, phase: 0 };
}
