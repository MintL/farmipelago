export function cropIcon(cropId, label, className = 'icon') {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  icon.setAttribute('class', className);
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', label);
  use.setAttribute('href', `#icon-${cropId}`);
  icon.append(use);
  return icon;
}

export function formatLitres(amount) {
  return `${Math.max(0, Number(amount) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} L`;
}

export function formatRequirementAmount(amount, unit = 'litres') {
  if (unit !== 'bales') return formatLitres(amount);
  const count = Math.max(0, Math.floor(Number(amount) || 0));
  return `${count} ${count === 1 ? 'bale' : 'bales'}`;
}

export function formatRequirementProgress(amount, target, unit = 'litres') {
  return unit === 'bales'
    ? `${Math.max(0, Math.floor(Number(amount) || 0))} / ${Math.max(0, Math.floor(Number(target) || 0))} bales`
    : `${formatLitres(amount)} / ${formatLitres(target)}`;
}

export function createCropMeterRenderer() {
  const meters = new WeakMap();
  return (container, { cropId, label, value, percent, ariaLabel, ariaValueText }) => {
    let meter = meters.get(container);
    if (!meter) {
      const heading = document.createElement('div');
      const track = document.createElement('div');
      const fill = document.createElement('span');
      heading.className = 'cropMeterHeading';
      track.className = 'cropMeterTrack';
      track.setAttribute('role', 'progressbar');
      track.append(fill);
      container.replaceChildren(heading, track);
      meter = { heading, track, fill };
      meters.set(container, meter);
    }
    const amount = document.createElement('strong');
    amount.textContent = value;
    meter.heading.replaceChildren(cropIcon(cropId || 'silo', label, 'icon cropMeterIcon'), amount);
    meter.track.setAttribute('aria-label', ariaLabel);
    meter.track.setAttribute('aria-valuemin', '0');
    meter.track.setAttribute('aria-valuemax', '100');
    meter.track.setAttribute('aria-valuenow', String(percent));
    meter.track.setAttribute('aria-valuetext', ariaValueText);
    meter.fill.style.width = `${percent}%`;
  };
}
