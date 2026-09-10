export const ISLAND_SERVICES = {
  'old-miller': {
    name: 'Old Miller', minimumTier: 2, chance: .5, tradeLimit: 1, capacity: 4,
    inputs: [{ itemId: 'wheat', amount: 1800 }, { itemId: 'barley', amount: 1800 }],
    outputs: { flour: 4 }, visual: 'trading-stall',
  },
};
