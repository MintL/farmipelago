const INITIAL_GATES = ['crop:wheat'];

const UNLOCKABLES = [
  { id: 'crop:wheat', name: 'Wheat', category: 'Crops' },
  { id: 'crop:barley', name: 'Barley', category: 'Crops' },
  { id: 'crop:canola', name: 'Canola', category: 'Crops' },
  { id: 'crop:soybean', name: 'Soybeans', category: 'Crops' },
  { id: 'crop:corn', name: 'Corn', category: 'Crops' },
];
const unlockableIds = new Set(UNLOCKABLES.map(unlockable => unlockable.id));

const MILESTONES = [
  {
    id: 'getting-started',
    title: 'Getting started',
    requirements: [
      { cropId: 'wheat', name: 'Wheat', target: 3600 },
    ],
    unlocks: ['crop:barley', 'crop:canola', 'crop:soybean'],
  },
  {
    id: 'crop-diversity',
    title: 'Crop diversity',
    hint: 'Choose any 2',
    choiceLimit: 2,
    requirements: [
      { cropId: 'wheat', name: 'Wheat', target: 3600 },
      { cropId: 'barley', name: 'Barley', target: 3600 },
      { cropId: 'canola', name: 'Canola', target: 3600 },
      { cropId: 'soybean', name: 'Soybeans', target: 3600 },
    ],
    unlocks: ['crop:corn'],
  },
];

const lastMilestoneIndex = MILESTONES.length - 1;

const blankDelivery = milestone => Object.fromEntries(milestone.requirements.map(requirement => [requirement.cropId, 0]));

export function createMilestoneProgression(savedState = null) {
  const savedIndex = Math.floor(Number(savedState?.index));
  let index = Number.isSafeInteger(savedIndex) ? Math.min(lastMilestoneIndex, Math.max(0, savedIndex)) : 0;
  let collected = Boolean(savedState?.collected) && index === lastMilestoneIndex;
  let delivered = {};
  let selectedCropIds = [];
  const overrideGates = new Set((Array.isArray(savedState?.overrideGates) ? savedState.overrideGates : [])
    .filter(gateId => unlockableIds.has(gateId)));

  const current = () => MILESTONES[index];

  const restoreDelivery = () => {
    const milestone = current();
    delivered = Object.fromEntries(milestone.requirements.map(requirement => [
      requirement.cropId,
      Math.min(requirement.target, Math.max(0, Math.floor(Number(savedState?.delivered?.[requirement.cropId]) || 0))),
    ]));
    if (!milestone.choiceLimit) return;
    const validCropIds = new Set(milestone.requirements.map(requirement => requirement.cropId));
    const savedSelections = Array.isArray(savedState?.selectedCropIds) ? savedState.selectedCropIds : [];
    selectedCropIds = [...new Set(savedSelections.filter(cropId => validCropIds.has(cropId)))].slice(0, milestone.choiceLimit);
    if (!selectedCropIds.length) {
      selectedCropIds = milestone.requirements
        .filter(requirement => delivered[requirement.cropId] > 0)
        .map(requirement => requirement.cropId)
        .slice(0, milestone.choiceLimit);
    }
  };
  restoreDelivery();

  const complete = () => {
    const milestone = current();
    if (milestone.choiceLimit) {
      return selectedCropIds.length === milestone.choiceLimit && selectedCropIds.every(cropId =>
        delivered[cropId] >= milestone.requirements.find(requirement => requirement.cropId === cropId).target
      );
    }
    return milestone.requirements.every(requirement => delivered[requirement.cropId] >= requirement.target);
  };
  if (collected && !complete()) collected = false;

  const progressionGates = () => {
    const gates = new Set(INITIAL_GATES);
    for (let milestoneIndex = 0; milestoneIndex < index; milestoneIndex++) {
      for (const gate of MILESTONES[milestoneIndex].unlocks || []) gates.add(gate);
    }
    if (collected) {
      for (const gate of current().unlocks || []) gates.add(gate);
    }
    return [...gates];
  };

  const unlockedGates = () => [...new Set([...progressionGates(), ...overrideGates])];

  const canAccept = requirement => {
    const milestone = current();
    if (complete() || collected || !requirement || delivered[requirement.cropId] >= requirement.target) return false;
    if (!milestone.choiceLimit) return true;
    return selectedCropIds.includes(requirement.cropId) || selectedCropIds.length < milestone.choiceLimit;
  };

  return {
    isUnlocked(gateId) {
      return unlockedGates().includes(gateId);
    },
    state() {
      const milestone = current();
      const isComplete = complete();
      const gameComplete = collected && index === lastMilestoneIndex;
      const naturalGates = new Set(progressionGates());
      const requirements = gameComplete ? [] : milestone.choiceLimit && selectedCropIds.length === milestone.choiceLimit
        ? milestone.requirements.filter(requirement => selectedCropIds.includes(requirement.cropId))
        : milestone.requirements;
      return {
        id: gameComplete ? 'no-milestone' : milestone.id,
        title: gameComplete ? 'No milestone' : milestone.title,
        hint: gameComplete ? 'All current deliveries are complete' : milestone.hint || '',
        unlocks: gameComplete ? [] : [...(milestone.unlocks || [])],
        isFinalMilestone: !gameComplete && index === lastMilestoneIndex,
        choiceLimit: gameComplete ? 0 : milestone.choiceLimit || 0,
        selectedCropIds: gameComplete ? [] : [...selectedCropIds],
        unlockedGates: unlockedGates(),
        unlockables: UNLOCKABLES.map(unlockable => ({
          ...unlockable,
          unlocked: naturalGates.has(unlockable.id) || overrideGates.has(unlockable.id),
          overridden: overrideGates.has(unlockable.id),
          canOverride: !naturalGates.has(unlockable.id),
        })),
        complete: gameComplete ? false : isComplete,
        pickupReady: !gameComplete && isComplete && !collected,
        collected,
        requirements: requirements.map(requirement => ({
          ...requirement,
          delivered: delivered[requirement.cropId],
          selected: selectedCropIds.includes(requirement.cropId),
          accepting: canAccept(requirement),
          locked: Boolean(milestone.choiceLimit && selectedCropIds.length >= milestone.choiceLimit && !selectedCropIds.includes(requirement.cropId)),
        })),
      };
    },
    persistentState() {
      return {
        index,
        collected,
        delivered: { ...delivered },
        selectedCropIds: [...selectedCropIds],
        overrideGates: [...overrideGates],
      };
    },
    setUnlockOverride(gateId, enabled) {
      if (!unlockableIds.has(gateId)) return false;
      const naturalGates = new Set(progressionGates());
      if (naturalGates.has(gateId)) return overrideGates.delete(gateId);
      if (enabled) overrideGates.add(gateId);
      else overrideGates.delete(gateId);
      return true;
    },
    accept(contents) {
      if (complete() || collected) return {};
      for (const requirement of current().requirements) {
        const available = Math.max(0, contents[requirement.cropId] || 0);
        if (!available || !canAccept(requirement)) continue;
        const remaining = Math.max(0, requirement.target - delivered[requirement.cropId]);
        const amount = Math.min(available, remaining);
        if (!amount) continue;
        if (current().choiceLimit && !selectedCropIds.includes(requirement.cropId)) selectedCropIds.push(requirement.cropId);
        delivered[requirement.cropId] += amount;
        return { [requirement.cropId]: amount };
      }
      return {};
    },
    collect() {
      if (!complete() || collected) return false;
      if (index < lastMilestoneIndex) {
        index++;
        delivered = blankDelivery(current());
        selectedCropIds = [];
      }
      else collected = true;
      for (const gateId of progressionGates()) overrideGates.delete(gateId);
      return true;
    },
  };
}
