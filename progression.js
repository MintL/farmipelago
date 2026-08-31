const MILESTONE_TEMPLATE = {
  id: 'corn-delivery',
  title: 'Corn delivery',
  requirements: [
    { cropId: 'corn', name: 'Corn', target: 36 },
  ],
};

export function createMilestoneProgression() {
  let number = 1;
  let delivered = Object.fromEntries(MILESTONE_TEMPLATE.requirements.map(requirement => [requirement.cropId, 0]));

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
