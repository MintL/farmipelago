const MILESTONE_TEMPLATE = {
  id: 'corn-delivery',
  title: 'Corn delivery',
  requirements: [
    { cropId: 'corn', name: 'Corn', target: 3600 },
  ],
};

export function createMilestoneProgression(savedState = null) {
  const savedNumber = Math.floor(Number(savedState?.number));
  let number = Number.isSafeInteger(savedNumber) ? Math.max(1, savedNumber) : 1;
  let delivered = Object.fromEntries(MILESTONE_TEMPLATE.requirements.map(requirement => [
    requirement.cropId,
    Math.min(requirement.target, Math.max(0, Math.floor(Number(savedState?.delivered?.[requirement.cropId]) || 0))),
  ]));

  const complete = () => MILESTONE_TEMPLATE.requirements.every(requirement =>
    delivered[requirement.cropId] >= requirement.target
  );

  return {
    state() {
      return {
        id: MILESTONE_TEMPLATE.id,
        number,
        title: MILESTONE_TEMPLATE.title,
        complete: complete(),
        requirements: MILESTONE_TEMPLATE.requirements.map(requirement => ({
          ...requirement,
          delivered: delivered[requirement.cropId],
        })),
      };
    },
    persistentState() {
      return { number, delivered: { ...delivered } };
    },
    accept(contents) {
      if (complete()) return {};
      const accepted = {};
      for (const requirement of MILESTONE_TEMPLATE.requirements) {
        const available = Math.max(0, contents[requirement.cropId] || 0);
        const remaining = Math.max(0, requirement.target - delivered[requirement.cropId]);
        const amount = Math.min(available, remaining);
        if (!amount) continue;
        accepted[requirement.cropId] = amount;
        delivered[requirement.cropId] += amount;
      }
      return accepted;
    },
    collect() {
      if (!complete()) return false;
      number++;
      delivered = Object.fromEntries(MILESTONE_TEMPLATE.requirements.map(requirement => [requirement.cropId, 0]));
      return true;
    },
  };
}
