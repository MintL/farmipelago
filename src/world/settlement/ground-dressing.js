import { THREE } from '../../core/shared.js';

// Local tile coordinates shared by the gallery and generated settlement.
// Foundation dirt arrives with its building, never hinting at absent homes.
const soilColors = [0x9b8059, 0xb49a73, 0x74684e, 0x82704c].map(color => new THREE.Color(color));
const patches = [
  [-5, 2, 2.85, 2.05, 0, 1],
  [-1.8, -6, 1.95, 1.65, 1, 1], [4.6, -6, 2.15, 1.9, 1, 1],
  [-6.4, -6, 1.95, 1.65, 1, 3],
  [4.2, 6.4, 1.35, 1.35, 2, 2],
  [6.2, 2.4, 1.15, 1.7, 0, 2], [6.2, 2.4, 1.9, 2.4, 0, 3],
  [-7.2, 6.4, 1.3, 1.6, 0, 2],
  [-9.6, -7.4, 1.05, 1, 3, 1], [9.6, -7.4, 1.05, 1, 3, 1],
  [-6.4, -3.8, 1.5, .65, 2, 3], [7.8, -5.6, .85, 1.25, 2, 3],
  [7.4, 6.4, 1.35, 1.35, 1, 5],
];

export function dressSettlementGround(color, x, z, tier, hash) {
  for (const [cx, cz, rx, rz, soil, from] of patches) {
    if (tier < from) continue;
    const dx = Math.abs(x - (cx - .1)) / rx, dz = Math.abs(z - (cz - .1)) / rz;
    const distance = soil === 3 ? Math.hypot(dx, dz) : Math.pow(dx ** 4 + dz ** 4, .25);
    const noise = ((hash >>> (soil * 3)) % 13 / 12 - .5) * .18;
    const coverage = 1 - THREE.MathUtils.smoothstep(distance + noise, .65, 1.14);
    const amount = Math.round(coverage * 5) / 5 * (soil === 2 ? .6 : .74);
    color.lerp(soilColors[soil], amount);
  }
  return color;
}
