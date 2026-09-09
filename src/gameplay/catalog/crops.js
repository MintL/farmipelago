export const cropIds = ['corn', 'wheat', 'barley', 'canola', 'soybean', 'grass'];

export const crops = {
  corn: { name: 'Corn', growthSeconds: 9, fastGrowthSeconds: 9 },
  wheat: { name: 'Wheat', growthSeconds: 180, fastGrowthSeconds: 9 },
  barley: { name: 'Barley', growthSeconds: 180, fastGrowthSeconds: 9 },
  canola: { name: 'Canola', growthSeconds: 180, fastGrowthSeconds: 9 },
  soybean: { name: 'Soybeans', growthSeconds: 180, fastGrowthSeconds: 9 },
  grass: { name: 'Grass', growthSeconds: 30, fastGrowthSeconds: 30 },
};

// Three timed transitions: planting at stage 1 through maturity at stage 4.
export const cropStageSeconds = (cropId, fastGrowth = true) =>
  (fastGrowth ? crops[cropId].fastGrowthSeconds : crops[cropId].growthSeconds) / 3;
