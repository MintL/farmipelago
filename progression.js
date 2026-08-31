const INITIAL_GATES = ['crop:wheat'];

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

  const unlockedGates = () => {
    const gates = new Set(INITIAL_GATES);
    for (let milestoneIndex = 0; milestoneIndex < index; milestoneIndex++) {
      for (const gate of MILESTONES[milestoneIndex].unlocks || []) gates.add(gate);
    }
    if (collected) {
      for (const gate of current().unlocks || []) gates.add(gate);
    }
    return [...gates];
  };

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
      return {
        id: milestone.id,
        title: milestone.title,
        hint: milestone.hint || '',
        choiceLimit: milestone.choiceLimit || 0,
        selectedCropIds: [...selectedCropIds],
        unlockedGates: unlockedGates(),
        complete: isComplete,
        pickupReady: isComplete && !collected,
        collected,
        requirements: milestone.requirements.map(requirement => ({
          ...requirement,
          delivered: delivered[requirement.cropId],
          selected: selectedCropIds.includes(requirement.cropId),
          accepting: canAccept(requirement),
          locked: Boolean(milestone.choiceLimit && selectedCropIds.length >= milestone.choiceLimit && !selectedCropIds.includes(requirement.cropId)),
        })),
      };
    },
    persistentState() {
      return { index, collected, delivered: { ...delivered }, selectedCropIds: [...selectedCropIds] };
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
      return true;
    },
  };
}
