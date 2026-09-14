import { createHudFrame } from './hud-frame.js';
import { projectBuildingPopup, positionBuildingPopup } from './building-popup.js';

export function createStorehouseCallout(camera, open) {
  const hud = document.querySelector('#hud');
  const popup = document.createElement('div');
  popup.id = 'storehouseCallout';
  popup.hidden = true;
  popup.innerHTML = `<button class="storehouseCalloutName" type="button"
    aria-label="Open Settlement" aria-controls="villageNeeds">Settlement</button>`;
  hud.append(popup);
  createHudFrame(popup, { leaves: 'left' });
  popup.querySelector('button').addEventListener('click', open);
  return {
    update(view) {
      const anchor = projectBuildingPopup(view, camera);
      popup.hidden = !anchor;
      if (anchor) positionBuildingPopup(popup, anchor);
    },
  };
}
