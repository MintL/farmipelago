// The approved settlement has a fixed footprint and reserves its roads at every
// tier. Coordinates are terrain tiles; buildings still use MODEL_VOXEL.
export const SETTLEMENT_LAYOUT_VERSION = 1;
export const SETTLEMENT_ROUTES = [
  [-1, 1, -3, 8],
  [-7, 7, -3, -1],
  [-1, 2, 4, 8],
  [-5, 2, 6, 8],
  [2, 4, 1, 3],
];

export function settlementCells() {
  const cells = [];
  for (let gz = -8; gz <= 8; gz++) for (let gx = -9; gx <= 9; gx++) {
    if ((gx / 10) ** 4 + (gz / 9) ** 4 >= 1 || gx === -9 && gz > 4 || gx > 6 && gz === 8) continue;
    cells.push({ gx, gz, dx: gx, dz: gz, dist: Math.hypot(gx, gz) });
  }
  return cells;
}

export const settlementRoadAt = (x, z) => SETTLEMENT_ROUTES.some(([minX, maxX, minZ, maxZ]) =>
  x >= minX && x <= maxX && z >= minZ && z <= maxZ);
