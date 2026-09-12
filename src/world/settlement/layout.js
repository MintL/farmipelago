// The approved settlement has a fixed footprint and reserves its roads at every
// tier. Coordinates are terrain tiles; buildings still use MODEL_VOXEL.
export const SETTLEMENT_LAYOUT_VERSION = 1;
export const SETTLEMENT_ROAD_COLOR = 0xbca581;
export const SETTLEMENT_ROUTES = [
  // minX, maxX, minZ, maxZ, first visible tier
  [-1, 1, -3, 9, 1],
  [-3, 7, -3, -1, 1],
  [-7, -4, -3, -1, 3], // amber cottage
  [-1, 2, 4, 8, 2], // well approach
  [-5, 2, 6, 8, 1], // Storehouse delivery court
  [2, 4, 1, 3, 2], // market handcart, then covered stall
];

export function settlementCells({ margin = 0, contentBounds = [] } = {}) {
  const cells = [];
  for (let gz = -8; gz <= 8; gz++) for (let gx = -9; gx <= 9; gx++) {
    if ((gx / 10) ** 4 + (gz / 9) ** 4 >= 1 || gx === -9 && gz > 4 || gx > 6 && gz === 8) continue;
    cells.push({ gx, gz, dx: gx, dz: gz, dist: Math.hypot(gx, gz) });
  }
  if (!margin) return cells;
  const expanded = new Map();
  const add = (gx, gz) => expanded.set(`${gx},${gz}`, { gx, gz, dx: gx, dz: gz, dist: Math.hypot(gx, gz) });
  for (const cell of cells) for (let dx = -margin; dx <= margin; dx++) for (let dz = -margin; dz <= margin; dz++) {
    add(cell.gx + dx, cell.gz + dz);
  }
  // Bounds include roof overhangs and furnishings at every tier. Cover their
  // expanded envelopes so even an irregular corner has one full tile of grass.
  for (const bounds of contentBounds) {
    for (let gx = Math.floor(bounds.min.x - margin + .5); gx <= Math.floor(bounds.max.x + margin + .5); gx++) {
      for (let gz = Math.floor(bounds.min.z - margin + .5); gz <= Math.floor(bounds.max.z + margin + .5); gz++) add(gx, gz);
    }
  }
  return [...expanded.values()];
}

// Reserve the finished network, but reveal each branch with its destination.
export const settlementRoadTierAt = (x, z) => SETTLEMENT_ROUTES.reduce((tier, [minX, maxX, minZ, maxZ, from]) =>
  x >= minX && x <= maxX && z >= minZ && z <= maxZ ? Math.min(tier, from) : tier, Infinity);
export const settlementRoadAt = (x, z, tier = 5) => settlementRoadTierAt(x, z) <= tier;
