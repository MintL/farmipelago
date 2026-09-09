const INITIAL_GATES = ['crop:wheat', 'crop:barley', 'crop:canola', 'crop:soybean'];

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

const NEEDS = [
  { cropId: 'wheat', name: 'Wheat' },
  { cropId: 'barley', name: 'Barley' },
  { cropId: 'canola', name: 'Canola' },
  { cropId: 'soybean', name: 'Soybeans' },
].map(need => ({ ...need, target: 3600 }));
const REQUIRED_COMPLETIONS = 3;
// Source: docs/Settlement_Progression_Proposal.md, section 4, Tier 2.
// Preview only: Tier 2 opening and its playable content belong to later steps.
const NEXT_DEVELOPMENT = {
  unlocks: ['Hay farming & equipment'],
};

export function createSettlementProgression(savedState = null) {
  const isSettlement = savedState?.kind === 'settlement';
  const isVillage = savedState?.kind === 'village';
  const earnedGates = new Set(INITIAL_GATES);
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
  const requirements = Object.fromEntries(NEEDS.map(need => {
    const saved = isSettlement ? savedState.requirements?.[need.cropId] : null;
    const value = Number(isSettlement ? saved?.delivered
      : (isVillage ? savedState.stock : savedState?.delivered)?.[need.cropId]);
    const delivered = saved?.complete === true ? need.target
      : Number.isFinite(value) ? Math.min(need.target, Math.max(0, value)) : 0;
    return [need.cropId, { delivered, complete: delivered >= need.target }];
  }));
  const completedCount = () => Object.values(requirements).filter(requirement => requirement.complete).length;
  const unlockedGates = () => [...new Set([...earnedGates, ...overrideGates])];
  return {
    isUnlocked: gate => earnedGates.has(gate) || overrideGates.has(gate),
    state() {
      return {
        id: 'settlement-tier-1',
        tier: 1,
        complete: completedCount() >= REQUIRED_COMPLETIONS,
        completedCount: completedCount(),
        requiredCompletions: REQUIRED_COMPLETIONS,
        nextDevelopment: { unlocks: [...NEXT_DEVELOPMENT.unlocks] },
        needs: NEEDS.map(need => ({ ...need, amount: requirements[need.cropId].delivered,
          complete: requirements[need.cropId].complete })),
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
      for (const need of NEEDS) {
        const requirement = requirements[need.cropId];
        const offered = contents[need.cropId];
        if (requirement.complete || !Number.isFinite(offered) || offered <= 0) continue;
        const amount = Math.min(offered, need.target - requirement.delivered);
        requirement.delivered += amount;
        requirement.complete = requirement.delivered >= need.target;
        return { [need.cropId]: amount };
      }
      return {};
    },
    setUnlockOverride(gate, enabled) {
      if (!unlockableIds.has(gate) || earnedGates.has(gate)) return false;
      if (enabled) overrideGates.add(gate);
      else overrideGates.delete(gate);
      return true;
    },
    persistentState() {
      return { kind: 'settlement', tier: 1,
        requirements: Object.fromEntries(Object.entries(requirements).map(([id, requirement]) => [id, { ...requirement }])),
        earnedGates: [...earnedGates], overrideGates: [...overrideGates] };
    },
  };
}
