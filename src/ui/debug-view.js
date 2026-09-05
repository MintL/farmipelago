import { dayPhaseLabel } from '../world/environment/index.js';

export function createDebugView({
  cameraPresets,
  timeSlider,
  timeValue,
  unlockList,
  milestoneList,
  clearOverrides,
}) {
  return {
    renderCameraPresets(activeFov) {
      for (const button of cameraPresets) {
        const selected = Number(button.dataset.cameraFov) === activeFov;
        const state = button.querySelector('.debugUnlockState');
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label', `${button.dataset.cameraLabel}: ${selected ? 'Active' : 'Select preset'}`);
        state.textContent = selected ? 'Active' : 'Select';
      }
    },
    renderTimeOfDay(dayPhase) {
      const totalMinutes = Math.round(dayPhase * 24 * 60) % (24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const label = dayPhaseLabel(dayPhase);
      timeSlider.value = String(totalMinutes);
      timeSlider.setAttribute('aria-valuetext', `${clock}, ${label}`);
      timeValue.value = `${clock} · ${label}`;
      timeValue.textContent = timeValue.value;
    },
    renderUnlockables(unlockables) {
      unlockList.replaceChildren();
      for (const unlockable of unlockables) {
        const overridden = Boolean(unlockable.overridden);
        const state = overridden ? 'Override on' : unlockable.unlocked ? 'Unlocked' : 'Locked';
        unlockList.append(debugButton({
          name: unlockable.name,
          category: unlockable.category,
          state,
          className: 'debugUnlock',
          dataKey: 'unlockId',
          dataValue: unlockable.id,
          pressed: overridden,
          disabled: !unlockable.canOverride,
          label: `${unlockable.name}: ${state}${unlockable.canOverride ? '. Toggle override' : '. Unlocked by progression'}`,
        }));
      }
      clearOverrides.hidden = !unlockables.some(unlockable => unlockable.overridden);
    },
    renderMilestones(milestones) {
      milestoneList.replaceChildren();
      for (const milestone of milestones) {
        milestoneList.append(debugButton({
          name: milestone.title,
          category: 'Milestone',
          state: milestone.active ? 'Active' : 'Switch',
          className: 'debugUnlock debugMilestone',
          dataKey: 'milestoneId',
          dataValue: milestone.id,
          pressed: milestone.active,
          disabled: milestone.active,
          label: `${milestone.title}: ${milestone.active ? 'Active milestone' : 'Switch to this milestone and clear its progress'}`,
        }));
      }
    },
  };
}

function debugButton({ name, category, state, className, dataKey, dataValue, pressed, disabled, label }) {
  const button = document.createElement('button');
  const details = document.createElement('span');
  const nameElement = document.createElement('strong');
  const categoryElement = document.createElement('small');
  const stateElement = document.createElement('small');
  nameElement.textContent = name;
  categoryElement.textContent = category;
  stateElement.className = 'debugUnlockState';
  stateElement.textContent = state;
  details.append(nameElement, categoryElement);
  button.className = className;
  button.type = 'button';
  button.dataset[dataKey] = dataValue;
  button.setAttribute('aria-pressed', String(pressed));
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  button.append(details, stateElement);
  return button;
}
