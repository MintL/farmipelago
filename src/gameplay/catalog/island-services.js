// Explicit testing mix suppresses random opportunities for new Tier 2 encounters.
export const TEST_ENCOUNTER_SERVICES = ['windmill', 'oil-press'];

export const ISLAND_SERVICES = {
  windmill: {
    name: 'Windmill', kind: 'processor', minimumTier: 2, chance: .25, capacity: 8000, inputCapacity: 8000,
    inputs: [{ itemId: 'wheat' }, { itemId: 'barley' }], outputItemId: 'flour', outputs: { flour: 1 },
    litresPerSecond: 1000 / 60, visual: 'windmill', islandSettings: { radius: 6.5 },
    footprint: { minX: -3, maxX: 3, minZ: -2, maxZ: 4 },
    ports: { input: { x: -1, y: .8, z: 2.4 }, output: { x: 1, y: .6, z: 2.4 } },
  },
  'oil-press': {
    name: 'Oil Press', kind: 'processor', minimumTier: 2, chance: .25, capacity: 8000, inputCapacity: 8000,
    inputs: [{ itemId: 'canola' }], outputItemId: 'vegetable-oil', outputs: { 'vegetable-oil': 1 },
    litresPerSecond: 1000 / 60, outputYield: .5, inputLabel: 'Canola', visual: 'oil-press', islandSettings: { radius: 6.5 },
    footprint: { minX: -3, maxX: 3, minZ: -2, maxZ: 4 },
    ports: { input: { x: -1, y: .8, z: 2.4 }, output: { x: 1, y: .6, z: 2.4 } },
  },
  'oil-trader': {
    name: 'Oil Trader', kind: 'trade', minimumTier: 2, chance: .5, tradeLimit: 1, capacity: 4,
    inputs: [{ itemId: 'canola', amount: 3600 }], outputs: { 'vegetable-oil': 4 }, visual: 'trading-stall',
    footprint: { minX: -2, maxX: 2, minZ: -1, maxZ: 3 },
  },
  'old-miller': {
    name: 'Old Miller', kind: 'trade', minimumTier: 2, chance: .5, tradeLimit: 1, capacity: 4,
    inputs: [{ itemId: 'wheat', amount: 1800 }, { itemId: 'barley', amount: 1800 }],
    outputs: { flour: 4 }, visual: 'trading-stall',
    footprint: { minX: -2, maxX: 2, minZ: -1, maxZ: 3 },
  },
};
