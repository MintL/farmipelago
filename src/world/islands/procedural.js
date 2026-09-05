import { ISLAND_LAYOUT_SCALE, NORTH_ISLAND_ID } from '../config.js';
import { LEVEL_HEIGHT, THREE } from '../../core/shared.js';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;

export function scaleIslandLayout(island) {
  return {
    ...island,
    cx: Math.round(island.cx * ISLAND_LAYOUT_SCALE),
    cz: Math.round(island.cz * ISLAND_LAYOUT_SCALE),
    r: island.r * ISLAND_LAYOUT_SCALE,
  };
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeNoise(value) {
  return THREE.MathUtils.clamp(value * .5 + .5, 0, 1);
}

export function environmentalAxis(value) {
  const normalized = normalizeNoise(value);
  // Expand the middle of Perlin's distribution so each field develops
  // decisive bright/dry and dark/wet regions rather than mostly midtones.
  return THREE.MathUtils.clamp(.5 + (normalized - .5) * 3, 0, 1);
}

export function environmentProfile(environment) {
  const moisture = environment.moisture;
  const sun = environment.sun;
  const shade = 1 - sun;

  const veryWet = THREE.MathUtils.smoothstep(moisture, .68, .92);
  const wet = THREE.MathUtils.smoothstep(moisture, .48, .78);
  const dry = THREE.MathUtils.smoothstep(1 - moisture, .42, .78);
  const veryDry = THREE.MathUtils.smoothstep(1 - moisture, .68, .92);

  const shady = THREE.MathUtils.smoothstep(shade, .38, .72);
  const veryShady = THREE.MathUtils.smoothstep(shade, .62, .90);
  const sunny = THREE.MathUtils.smoothstep(sun, .42, .78);
  const verySunny = THREE.MathUtils.smoothstep(sun, .68, .92);

  return {
    moisture,
    sun,
    shade,
    veryWet,
    wet,
    dry,
    veryDry,
    shady,
    veryShady,
    sunny,
    verySunny,
  };
}

export function createPerlin(seed) {
  const random = seededRandom(seed);
  const permutation = Array.from({ length: 256 }, (_, index) => index);
  for (let index = permutation.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [permutation[index], permutation[swap]] = [permutation[swap], permutation[index]];
  }
  const table = [...permutation, ...permutation];
  const fade = value => value * value * value * (value * (value * 6 - 15) + 10);
  const interpolate = (from, to, amount) => from + (to - from) * amount;
  const gradient = (hash, x, y) => {
    const direction = hash & 3;
    if (direction === 0) return x + y;
    if (direction === 1) return -x + y;
    if (direction === 2) return x - y;
    return -x - y;
  };

  return (x, y) => {
    const gridX = Math.floor(x) & 255;
    const gridY = Math.floor(y) & 255;
    const localX = x - Math.floor(x);
    const localY = y - Math.floor(y);
    const blendX = fade(localX);
    const blendY = fade(localY);
    const aa = table[table[gridX] + gridY];
    const ab = table[table[gridX] + gridY + 1];
    const ba = table[table[gridX + 1] + gridY];
    const bb = table[table[gridX + 1] + gridY + 1];
    return interpolate(
      interpolate(gradient(aa, localX, localY), gradient(ba, localX - 1, localY), blendX),
      interpolate(gradient(ab, localX, localY - 1), gradient(bb, localX - 1, localY - 1), blendX),
      blendY,
    ) * .7;
  };
}

export function createOrganicCells(cx, cz, radius, seed) {
  const cells = [];
  const random = seededRandom(seed);
  const perlin = createPerlin(seed ^ 0x85ebca6b);
  const rotation = random() * Math.PI;
  const stretch = 1.04 + random() * .26;
  const squeeze = .76 + random() * .18;
  const lobePhase = random() * Math.PI * 2;
  const ridgePhase = random() * Math.PI * 2;
  const notchAngle = random() * Math.PI * 2;
  const extent = Math.ceil(radius * stretch) + 2;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  for (let dx = -extent; dx <= extent; dx++) for (let dz = -extent; dz <= extent; dz++) {
    const rx = dx * cos + dz * sin, rz = -dx * sin + dz * cos;
    const distance = Math.hypot(rx / stretch, rz / squeeze);
    const angle = Math.atan2(rz, rx);
    const broadNoise = perlin(rx * .24, rz * .24) * .48;
    const edgeNoise = perlin(rx * .65 + 19.7, rz * .65 - 11.3) * .16;
    const boundary = radius * (1 + Math.sin(angle * 3 + lobePhase) * .18 + Math.sin(angle * 5 + ridgePhase) * .09 - Math.pow(Math.max(0, Math.cos(angle - notchAngle)), 8) * .16) + broadNoise + edgeNoise;
    if (distance <= boundary) cells.push({ gx: cx + dx, gz: cz + dz, dx, dz, dist: distance });
  }
  if (!cells.some(cell => cell.gx === cx && cell.gz === cz)) cells.push({ gx: cx, gz: cz, dx: 0, dz: 0, dist: 0 });
  return cells;
}

export function plateauHeight(cell, island, angle) {
  if (island.id === NORTH_ISLAND_ID) {
    const skew = Math.sin(angle) * .14;
    const northward = -cell.dz + cell.dx * skew;
    const across = cell.dx + cell.dz * skew * .35;
    const terraces = [
      { north: -island.r * .28, width: island.r * .74 },
      { north: 0, width: island.r * .55 },
      { north: island.r * .27, width: island.r * .36 },
    ];
    const plateauLevels = terraces.reduce((levels, terrace) =>
      levels + Number(northward >= terrace.north && Math.abs(across) <= terrace.width), 0);
    return PLATEAU_BLOCK_HEIGHT * plateauLevels;
  }

  const along = cell.dx * Math.cos(angle) + cell.dz * Math.sin(angle);
  const across = -cell.dx * Math.sin(angle) + cell.dz * Math.cos(angle);
  // Every non-starter island uses one large, contiguous raised plot. Its base
  // remains equally broad, so both of the island's two elevations are useful
  // for farming rather than reading as narrow decorative ledges.
  const onRaisedPlot = along >= -island.r * .72 && along <= island.r * .42 &&
    Math.abs(across) <= island.r * .62;
  return onRaisedPlot ? PLATEAU_BLOCK_HEIGHT : 0;
}
