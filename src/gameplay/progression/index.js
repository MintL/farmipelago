import { SETTLEMENT_TIERS } from '../catalog/settlement-tiers.js';

const UNLOCKABLES = [
  { id: 'crop:wheat', name: 'Wheat', category: 'Crops' },
  { id: 'crop:barley', name: 'Barley', category: 'Crops' },
  { id: 'crop:canola', name: 'Canola', category: 'Crops' },
  { id: 'crop:soybean', name: 'Soybeans', category: 'Crops' },
  { id: 'crop:corn', name: 'Corn', category: 'Crops' },
  { id: 'crop:grass', name: 'Grass', category: 'Crops' },
  { id: 'equipment:hay', name: 'Hay equipment', category: 'Equipment' },
  { id: 'building:cattle-barn', name: 'Cattle barn', category: 'Buildings' },
  { id: 'equipment:livestock', name: 'Livestock equipment', category: 'Equipment' },
];
const unlockableIds = new Set(UNLOCKABLES.map(unlockable => unlockable.id));

// Retained only to recover earned capabilities from pre-village saves.
const LEGACY_MILESTONES = [
  { unlocks: ['crop:barley', 'crop:canola', 'crop:soybean'] },
  { unlocks: ['crop:corn', 'crop:grass', 'equipment:hay'] },
  { unlocks: ['building:cattle-barn', 'equipment:livestock'] },
  { unlocks: [] },
];

export function createSettlementProgression(savedState = null) {
  const isSettlement = savedState?.kind === 'settlement';
  const isVillage = savedState?.kind === 'village';
  const earnedGates = new Set(SETTLEMENT_TIERS[0].unlocks);
  if (isSettlement || isVillage) {
    for (const gate of Array.isArray(savedState.earnedGates) ? savedState.earnedGates : []) {
      if (unlockableIds.has(gate)) earnedGates.add(gate);
    }
  }
  else {
    const index = Math.min(LEGACY_MILESTONES.length - 1, Math.max(0, Math.floor(Number(savedState?.index)) || 0));
    const completedCount = index + (savedState?.collected ? 1 : 0);
    for (const milestone of LEGACY_MILESTONES.slice(0, completedCount)) {
      for (const gate of milestone.unlocks) earnedGates.add(gate);
    }
  }
  const overrideGates = new Set((Array.isArray(savedState?.overrideGates) ? savedState.overrideGates : [])
    .filter(gate => unlockableIds.has(gate) && !earnedGates.has(gate)));
  const tiers = Object.fromEntries(SETTLEMENT_TIERS.map(definition => [definition.id,
    Object.fromEntries(definition.requirements.map(need => {
      const saved = isSettlement
        ? savedState.tiers?.[definition.id]?.requirements?.[need.id]
          ?? (definition.id === 1 ? savedState.requirements?.[need.id] : null)
        : null;
      let value = Number(isSettlement ? saved?.delivered
        : definition.id === 1 ? (isVillage ? savedState.stock : savedState?.delivered)?.[need.id] : 0);
      if (need.id === 'vegetable-oil' && saved?.unit !== 'pallets') value = Math.ceil(value / 1000);
      const delivered = saved?.complete === true ? need.target
        : Number.isFinite(value) ? Math.min(need.target, Math.max(0, value)) : 0;
      return [need.id, { delivered, complete: delivered >= need.target }];
    }))]));
  let tierIndex = isSettlement ? Math.max(0, SETTLEMENT_TIERS.findIndex(definition => definition.id === savedState.tier)) : 0;
  const completedCount = definition => definition.requirements.filter(need => tiers[definition.id][need.id].complete).length;
  const openTiers = () => {
    for (const definition of SETTLEMENT_TIERS.slice(0, tierIndex + 1)) {
      for (const gate of definition.unlocks) {
        earnedGates.add(gate);
        overrideGates.delete(gate);
      }
    }
  };
  const advance = () => {
    while (tierIndex + 1 < SETTLEMENT_TIERS.length &&
      completedCount(SETTLEMENT_TIERS[tierIndex]) >= SETTLEMENT_TIERS[tierIndex].requiredCompletions) tierIndex++;
    openTiers();
  };
  // Completed saves from the previous build open Tier 2 immediately on load.
  advance();
  const islandCategories = () => [...new Set(SETTLEMENT_TIERS.slice(0, tierIndex + 1)
    .flatMap(definition => definition.islandCategories))];
  const unlockedGates = () => [...new Set([...earnedGates, ...overrideGates])];
  return {
    isUnlocked: gate => earnedGates.has(gate) || overrideGates.has(gate),
    isIslandCategoryUnlocked: category => islandCategories().includes(category),
    state() {
      const definition = SETTLEMENT_TIERS[tierIndex];
      const next = SETTLEMENT_TIERS[tierIndex + 1];
      return {
        id: `settlement-tier-${definition.id}`,
        tier: definition.id,
        tiers: SETTLEMENT_TIERS.map((tier, index) => ({
          id: tier.id, summary: tier.unlockSummary.join(', '),
          active: index === tierIndex, opened: index <= tierIndex,
        })),
        complete: completedCount(definition) >= definition.requiredCompletions,
        completedCount: completedCount(definition),
        requiredCompletions: definition.requiredCompletions,
        nextDevelopment: next ? { unlocks: [...next.unlockSummary] } : null,
        islandCategories: islandCategories(),
        needs: definition.requirements.map(need => ({ ...need, itemId: need.id,
          amount: tiers[definition.id][need.id].delivered,
          complete: tiers[definition.id][need.id].complete,
          accepting: need.available && !tiers[definition.id][need.id].complete,
        })),
        unlockedGates: unlockedGates(),
        unlockables: UNLOCKABLES.map(unlockable => ({
          ...unlockable,
          unlocked: earnedGates.has(unlockable.id) || overrideGates.has(unlockable.id),
          overridden: overrideGates.has(unlockable.id),
          canOverride: !earnedGates.has(unlockable.id),
        })),
      };
    },
    accept(contents) {
      const definition = SETTLEMENT_TIERS[tierIndex];
      for (const need of definition.requirements) {
        const requirement = tiers[definition.id][need.id];
        const offered = contents[need.id];
        if (!need.available || requirement.complete || !Number.isFinite(offered) || offered <= 0) continue;
        const amount = Math.min(offered, need.target - requirement.delivered);
        requirement.delivered += amount;
        requirement.complete = requirement.delivered >= need.target;
        advance();
        return { [need.id]: amount };
      }
      return {};
    },
    openDebugTier(tierId) {
      const nextIndex = SETTLEMENT_TIERS.findIndex(definition => definition.id === tierId);
      if (nextIndex <= tierIndex) return false;
      tierIndex = nextIndex;
      advance();
      return true;
    },
    setUnlockOverride(gate, enabled) {
      if (!unlockableIds.has(gate) || earnedGates.has(gate)) return false;
      if (enabled) overrideGates.add(gate);
      else overrideGates.delete(gate);
      return true;
    },
    persistentState() {
      return { kind: 'settlement', tier: SETTLEMENT_TIERS[tierIndex].id,
        tiers: Object.fromEntries(Object.entries(tiers).map(([id, requirements]) => [id, {
          requirements: Object.fromEntries(Object.entries(requirements).map(([itemId, requirement]) => [itemId, { ...requirement, ...(itemId === 'vegetable-oil' ? { unit: 'pallets' } : {}) }])),
        }])),
        earnedGates: [...earnedGates], overrideGates: [...overrideGates] };
    },
  };
}
