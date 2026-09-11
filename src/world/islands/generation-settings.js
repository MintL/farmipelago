import { scaleIslandLayout, seededRandom } from './procedural.js';
import { STARTER_ISLAND_LAYOUT } from '../config.js';

// Radius is in terrain tiles; maxElevation and undersideLayers count levels.
export const FARM_GENERATION = Object.freeze({
  radius: scaleIslandLayout(STARTER_ISLAND_LAYOUT.find(island => island.role === 'farm')).r,
  maxElevation: 0,
  terraceCoverage: .46,
  undersideLayers: 8,
  undersideTaper: .34,
  treeDensity: .16,
  treeBaseChance: .006,
  rockDensity: 1,
  groundCoverDensity: .70,
  moistureBias: 0,
  sunlightBias: 0,
  waterStyle: 'coast',
});

export const SETTLEMENT_GENERATION = Object.freeze({
  ...FARM_GENERATION,
  radius: scaleIslandLayout(STARTER_ISLAND_LAYOUT.find(island => island.role === 'settlement')).r,
  treeDensity: .34,
  treeBaseChance: 0,
  groundCoverDensity: .82,
  waterStyle: 'none',
});

const ranges = {
  radius: [4, 12],
  maxElevation: [0, 5],
  terraceCoverage: [.2, .7],
  undersideLayers: [4, 12],
  undersideTaper: [.2, .7],
  treeDensity: [0, 1],
  treeBaseChance: [0, .1],
  rockDensity: [0, 2],
  groundCoverDensity: [0, 1.5],
  moistureBias: [-.4, .4],
  sunlightBias: [-.4, .4],
};

export function randomIslandSettings(seed) {
  // Separate stream: choosing parameters never shifts the terrain/decor RNG.
  const random = seededRandom(seed ^ 0x1f83d9ab);
  const between = (min, max) => min + random() * (max - min);
  const size = random();
  const small = size < .8;
  return {
    radius: small ? 4 + size / .8 * 1.5 : 7 + (size - .8) / .2 * 3,
    maxElevation: 1 + Math.floor(random() * (small ? 2 : 4)),
    terraceCoverage: between(.3, .6),
    undersideLayers: small ? 4 + Math.floor(random() * 3) : 6 + Math.floor(random() * 5),
    undersideTaper: between(.26, .52),
    treeDensity: between(.18, .65),
    treeBaseChance: between(0, .012),
    rockDensity: between(.5, 1.5),
    groundCoverDensity: between(.55, 1.15),
    moistureBias: between(-.22, .22),
    sunlightBias: between(-.22, .22),
    waterStyle: random() < .25 ? (random() < .5 ? 'coast' : 'watercourse') : 'none',
  };
}

export function resolveIslandSettings(seed, overrides = {}) {
  const settings = { ...randomIslandSettings(seed), ...overrides };
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'waterStyle') {
      if (!['none', 'coast', 'watercourse'].includes(value)) throw new Error(`Invalid island waterStyle: ${value}`);
      continue;
    }
    const range = ranges[key];
    if (!range || !Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new Error(`Invalid island generation setting ${key}: ${value}`);
    }
    if (['maxElevation', 'undersideLayers'].includes(key) && !Number.isInteger(value)) {
      throw new Error(`Island ${key} must be a whole number of levels`);
    }
  }
  return Object.freeze(settings);
}
