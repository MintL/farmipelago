import { cropIcon } from './format.js';

export function buildingStockCard(iconId, label, quantity, fraction = null) {
  const card = document.createElement('div');
  card.className = 'buildingStockCard';
  const icon = document.createElement('span');
  icon.className = 'settlementRequirementIcon';
  icon.append(cropIcon(iconId, label));
  const details = document.createElement('div');
  details.className = 'settlementRequirementDetails';
  const name = document.createElement('strong');
  name.textContent = label;
  const amount = document.createElement('span');
  amount.className = 'villageNeedAmount';
  amount.textContent = quantity;
  details.append(name, amount);
  card.append(icon, details);
  if (fraction !== null) {
    const track = document.createElement('div');
    track.className = 'settlementRequirementTrack';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    track.append(fill);
    card.append(track);
  }
  return card;
}
