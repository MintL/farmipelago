import { createPloughAsset } from './refined-tractor.js';
export { createTractorAsset } from './refined-tractor.js';
import { createFlatbedAsset, createSeederAsset, createSprayerAsset, createMowerDeckAsset, createTrailerAsset, createBalerAsset, createLiquidTankAsset, createFrontAsset } from './refined-tools.js';
export { createTrailerAsset, createBalerAsset, createLiquidTankAsset } from './refined-tools.js';

export const TRACTOR_MOUNTS = Object.freeze({ frontZ: -1, rearZ: 1.4, towZ: 1.2, downY: .3, upY: .78, pinY: .4 });

export function createRearToolAsset(type) {
  const factories = { plough: createPloughAsset, seeder: createSeederAsset, sprayer: createSprayerAsset,
    'rear-mower': () => createMowerDeckAsset(false), baler: () => createBalerAsset().group,
    flatbed: () => createFlatbedAsset().group, trailer: () => createTrailerAsset().group, 'liquid-tank': () => createLiquidTankAsset().group };
  return factories[type]?.() || null;
}
export function createFrontToolAsset(type) {
  return ['loader', 'front-mower', 'bale-fork', 'forks', 'weight'].includes(type) ? createFrontAsset(type) : null;
}
