const clamp = value => Math.max(0, Math.min(1, value));

export const crops = {
  wheat: {
    name: 'Wheat',
    moisture: { preferred: .28, tolerance: .28 },
    sun: { preferred: .86, tolerance: .27 },
  },
  corn: {
    name: 'Corn',
    moisture: { preferred: .58, tolerance: .25 },
    sun: { preferred: .8, tolerance: .26 },
  },
  rice: {
    name: 'Rice',
    moisture: { preferred: .9, tolerance: .2 },
    sun: { preferred: .64, tolerance: .3 },
  },
  potato: {
    name: 'Potato',
    moisture: { preferred: .46, tolerance: .25 },
    sun: { preferred: .34, tolerance: .27 },
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
