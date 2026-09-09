import { createCombineAsset } from './refined-combine.js';
export { createCombineAsset } from './refined-combine.js';
import { createTractorAsset, createRearToolAsset, createFrontToolAsset } from './tractor-assets.js';
export { createTractorAsset, createRearToolAsset, createFrontToolAsset, createTrailerAsset, createBalerAsset, createLiquidTankAsset } from './tractor-assets.js';

export function createVehicleAsset(type) {
  if (type === 'tractor') return createTractorAsset().group;
  if (type === 'harvester') return createCombineAsset().group;
  return null;
}

export function createLoadoutAsset(category, id) {
  if (category === 'vehicles') return createVehicleAsset(id);
  if (category === 'equipment') return createRearToolAsset(id);
  if (category === 'front-tools') return createFrontToolAsset(id);
  return null;
}
