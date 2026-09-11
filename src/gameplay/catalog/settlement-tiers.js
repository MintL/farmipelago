import { HAY_BALE_LITRES } from '../livestock/config.js';

// Proposal section 4. Tier 2 targets are provisional until its routes are playable.
export const SETTLEMENT_TIERS = [
  {
    id: 1,
    requiredCompletions: 3,
    unlocks: ['crop:wheat', 'crop:barley', 'crop:canola', 'crop:soybean'],
    unlockSummary: ['Basic crop farming'],
    islandCategories: [],
    requirements: [
      { id: 'wheat', name: 'Wheat' },
      { id: 'barley', name: 'Barley' },
      { id: 'canola', name: 'Canola' },
      { id: 'soybean', name: 'Soybeans' },
    ].map(requirement => ({ ...requirement, icon: requirement.id, unit: 'litres', target: 3600, available: true })),
  },
  {
    id: 2,
    requiredCompletions: 3,
    unlocks: ['crop:grass', 'equipment:hay'],
    unlockSummary: ['Hay farming & equipment'],
    islandCategories: ['chicken-farm', 'windmill', 'oil-press'],
    requirements: [
      { id: 'hay-bale', name: 'Hay', icon: 'hay-bale', unit: 'litres', target: 4 * HAY_BALE_LITRES, available: true },
      { id: 'eggs', name: 'Eggs', icon: 'eggs', unit: 'items', target: 24 },
      { id: 'flour', name: 'Flour', icon: 'flour', unit: 'pallets', target: 4, available: true },
      { id: 'vegetable-oil', name: 'Vegetable oil', icon: 'vegetable-oil', unit: 'pallets', target: 4 },
    ].map(requirement => ({ ...requirement, available: true })),
  },
];
