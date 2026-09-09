const INITIAL_GATES = ['crop:wheat', 'crop:barley', 'crop:canola'];

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
].map(need => ({ ...need, target: 3600, consumptionPerMinute: 60 }));

export function createVillageNeeds(savedState = null) {
  const isVillage = savedState?.kind === 'village';
  const earnedGates = new Set(INITIAL_GATES);
  if (isVillage) {
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
  const stock = Object.fromEntries(NEEDS.map(need => {
    const value = Number((isVillage ? savedState.stock : savedState?.delivered)?.[need.cropId]);
    return [need.cropId, Number.isFinite(value) ? Math.max(0, value) : 0];
  }));
  const unlockedGates = () => [...new Set([...earnedGates, ...overrideGates])];
  return {
    isUnlocked: gate => earnedGates.has(gate) || overrideGates.has(gate),
    state() {
      return {
        id: 'village-tier-1',
        tier: 1,
        needs: NEEDS.map(need => ({ ...need, amount: stock[need.cropId], supplied: stock[need.cropId] > 0 })),
        unlockedGates: unlockedGates(),
        unlockables: UNLOCKABLES.map(unlockable => ({
          ...unlockable,
          unlocked: earnedGates.has(unlockable.id) || overrideGates.has(unlockable.id),
          overridden: overrideGates.has(unlockable.id),
          canOverride: !earnedGates.has(unlockable.id),
        })),
      };
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return false;
      let changed = false;
      for (const need of NEEDS) {
        const previous = stock[need.cropId];
        stock[need.cropId] = Math.max(0, previous - need.consumptionPerMinute / 60 * dt);
        changed ||= previous !== stock[need.cropId];
      }
      return changed;
    },
    accept(contents) {
      for (const need of NEEDS) {
        const amount = contents[need.cropId];
        if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(stock[need.cropId] + amount)) continue;
        stock[need.cropId] += amount;
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
      return { kind: 'village', tier: 1, stock: { ...stock }, earnedGates: [...earnedGates], overrideGates: [...overrideGates] };
    },
  };
}
