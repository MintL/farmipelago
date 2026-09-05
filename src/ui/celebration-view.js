import { crops } from '../gameplay/catalog/crops.js';
import { cropIcon } from './format.js';

export function renderMilestoneCelebration(dom, milestone) {
  const completeGame = Boolean(milestone?.completeGame);
  dom.eyebrow.textContent = completeGame ? 'Current prototype complete' : 'Shipment complete';
  dom.heading.textContent = completeGame ? 'Farmipelago complete' : 'Milestone complete';
  dom.title.textContent = milestone?.title || 'Milestone';
  dom.copy.replaceChildren(
    dom.title,
    document.createTextNode(completeGame
      ? ' was the final available delivery. You have unlocked every current farming capability.'
      : ' has expanded what this Farmipelago can do.'),
  );
  dom.continueLabel.textContent = completeGame ? 'Keep farming' : 'Continue farming';
  dom.unlocks.replaceChildren();
  const unlocks = Array.isArray(milestone?.unlocks) ? milestone.unlocks : [];
  dom.unlocksLabel.hidden = unlocks.length === 0;
  dom.unlocks.hidden = unlocks.length === 0;
  for (const gate of unlocks) dom.unlocks.append(unlockItem(gate));
}

function unlockItem(gate) {
  const cropId = typeof gate === 'string' && gate.startsWith('crop:') ? gate.slice(5) : null;
  const item = document.createElement('li');
  item.className = 'unlockItem';
  let icon = null;
  let label = gate;
  if (cropId && crops[cropId]) {
    icon = cropIcon(cropId, '', 'icon unlockIcon');
    label = crops[cropId].name;
  }
  else if (gate === 'equipment:hay') {
    icon = cropIcon('baler', '', 'icon unlockIcon');
    label = 'Hay equipment';
  }
  else if (gate === 'equipment:livestock' || gate === 'building:cattle-barn') {
    icon = cropIcon(gate === 'equipment:livestock' ? 'milk-tank' : 'cattle-barn', '', 'icon unlockIcon');
    label = gate === 'equipment:livestock' ? 'Livestock equipment' : 'Cattle barn';
  }
  const text = document.createElement('strong');
  text.textContent = label;
  if (icon) {
    icon.setAttribute('aria-hidden', 'true');
    item.append(icon);
  }
  item.append(text);
  return item;
}
