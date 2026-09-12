import { THREE } from '../core/shared.js';
import { islandActionPosition } from './island-action-position.js';
import { positionVoxelDialog } from './voxel-dialog.js';

export function createStorehouseCallout(camera, open) {
  const hud = document.querySelector('#hud');
  const popup = document.createElement('div');
  popup.id = 'storehouseCallout';
  popup.hidden = true;
  popup.innerHTML = `<button class="storehouseCalloutName" type="button"
    aria-label="Open Settlement" aria-controls="villageNeeds">Settlement</button>`;
  hud.append(popup);
  popup.querySelector('button').addEventListener('click', open);
  const project = point => {
    const p = point.clone().project(camera);
    return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, z: p.z };
  };
  return {
    update(view) {
      popup.hidden = !view;
      if (!view) return;
      const anchor = project(view.target), { min, max } = view.bounds;
      if (anchor.z < -1 || anchor.z > 1 || anchor.x < 0 || anchor.x > innerWidth || anchor.y < 0 || anchor.y > innerHeight) {
        popup.hidden = true;
        return;
      }
      const corners = [];
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
        corners.push(project(new THREE.Vector3(x, y, z)));
      }
      const bounds = { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
        top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
      const obstacles = [...hud.querySelectorAll('#topBar, #stickZone, #cycleVehicle, #actionCluster button, #siloInventory, #desktopHints, #islandAction')]
        .filter(element => element.getClientRects().length && !element.closest('[hidden]'))
        .map(element => element.getBoundingClientRect());
      const size = { width: popup.offsetWidth, height: popup.offsetHeight };
      const position = islandActionPosition({ x: (bounds.left + bounds.right) / 2, y: bounds.top }, size,
        { width: innerWidth, height: innerHeight }, obstacles, bounds);
      popup.style.left = `${position.x}px`;
      popup.style.top = `${position.y}px`;
      positionVoxelDialog(popup, anchor);
    },
  };
}
