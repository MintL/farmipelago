const clamp = value => Math.max(0, Math.min(1, value));

export const cropIds = ['corn', 'wheat', 'barley', 'canola', 'soybean'];

export const crops = {
  corn: {
    name: 'Corn',
    moisture: { preferred: .58, tolerance: .25 },
    sun: { preferred: .8, tolerance: .26 },
  },
  wheat: {
    name: 'Wheat',
    moisture: { preferred: .28, tolerance: .28 },
    sun: { preferred: .86, tolerance: .27 },
  },
  barley: {
    name: 'Barley',
    moisture: { preferred: .22, tolerance: .27 },
    sun: { preferred: .72, tolerance: .3 },
  },
  canola: {
    name: 'Canola',
    moisture: { preferred: .68, tolerance: .26 },
    sun: { preferred: .62, tolerance: .3 },
  },
  soybean: {
    name: 'Soybeans',
    moisture: { preferred: .76, tolerance: .25 },
    sun: { preferred: .84, tolerance: .25 },
  },
};

function axisScore(actual, profile) {
  return clamp(1 - Math.abs(actual - profile.preferred) / profile.tolerance);
}

export function cropStats(environment, crop) {
  const moisture = axisScore(environment.moisture, crop.moisture);
  const sun = axisScore(environment.sun, crop.sun);
  const suitability = (moisture + sun) / 2;
  return {
    suitability,
    growthMultiplier: .7 + suitability * .3,
    yieldMultiplier: .5 + suitability * .5,
  };
}
