import { THREE, TILE } from '../core/shared.js';
import { islandActionPosition } from './island-action-position.js';
import { createIslandOutline } from '../world/islands/selection-outline.js';

export function createIslandSelectionView(renderer, scene, camera, { available, select, state, act, enabled, selectObject = () => false, beforeRender = () => {} }) {
  const outlined = new Map();
  const popup = document.createElement('div');
  popup.id = 'islandAction';
  popup.hidden = true;
  popup.setAttribute('role', 'group');
  popup.setAttribute('aria-label', 'Selected island');
  popup.innerHTML = `<button class="islandPrimaryAction" type="button" aria-describedby="islandActionHint">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path/></svg><span>Connect</span></button>
    <button class="islandDismiss" type="button" aria-label="Deselect island"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>
    <span id="islandActionHint"></span>`;
  const hud = document.querySelector('#hud');
  hud.append(popup);
  const leader = document.createElement('div');
  leader.id = 'islandActionLeader';
  leader.setAttribute('aria-hidden', 'true');
  leader.hidden = true;
  hud.append(leader);
  const [action, close] = popup.querySelectorAll('button');
  const actionText = action.querySelector('span');
  const actionIcon = action.querySelector('path');
  const label = popup.querySelector('#islandActionHint');
  const anchors = new WeakMap();
  const footprintPoints = new WeakMap();
  const positionPopup = island => {
    if (!anchors.has(island)) {
      const tiles = [...island.terrain.values()];
      const center = tiles.reduce((point, tile) => point.add(new THREE.Vector3(tile.x, 0, tile.z)), new THREE.Vector3()).multiplyScalar(1 / tiles.length);
      const tile = tiles.reduce((best, candidate) => Math.hypot(candidate.x - center.x, candidate.z - center.z)
        < Math.hypot(best.x - center.x, best.z - center.z) ? candidate : best);
      anchors.set(island, new THREE.Vector3(tile.x, tile.topY + .05, tile.z));
    }
    island.group.updateWorldMatrix(true, false);
    const projected = island.group.localToWorld(anchors.get(island).clone()).project(camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.2 || Math.abs(projected.y) > 1.2) {
      popup.hidden = leader.hidden = true;
      return;
    }
    // Terrain samples stay attached to real land. Group bounds include distant
    // waterfall spray and empty space, which previously displaced the callout.
    if (!footprintPoints.has(island)) {
      const points = [];
      for (const tile of island.terrain.values()) {
        for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) {
          points.push(new THREE.Vector3(tile.x + dx * TILE, tile.topY, tile.z + dz * TILE));
        }
      }
      footprintPoints.set(island, points);
    }
    const rect = renderer.domElement.getBoundingClientRect();
    const corners = [...footprintPoints.get(island), anchors.get(island)].map(local => {
      const point = island.group.localToWorld(local.clone()).project(camera);
      return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
    });
    const islandBounds = { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
      top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
    const anchor = { x: rect.left + (projected.x + 1) * rect.width / 2,
      y: rect.top + (1 - projected.y) * rect.height / 2 };
    const obstacles = [...hud.querySelectorAll('#topBar, #stickZone, #cycleVehicle, #actionCluster button, #siloInventory, #desktopHints')]
      .filter(element => element.getClientRects().length && !element.closest('[hidden]'))
      .map(element => element.getBoundingClientRect());
    const size = { width: popup.offsetWidth, height: popup.offsetHeight };
    const position = islandActionPosition(anchor, size, { width: innerWidth, height: innerHeight }, obstacles, islandBounds);
    popup.style.left = `${position.x}px`;
    popup.style.top = `${position.y}px`;
    const start = { x: Math.max(position.x + 12, Math.min(anchor.x, position.x + size.width - 12)),
      y: Math.max(position.y + 8, Math.min(anchor.y, position.y + size.height - 8)) };
    // The marker ends on the exact tapped surface, never an empty bounding box.
    const dx = anchor.x - start.x, dy = anchor.y - start.y;
    leader.style.left = `${start.x}px`;
    leader.style.top = `${start.y}px`;
    leader.style.width = `${Math.hypot(dx, dy)}px`;
    leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    leader.hidden = false;
  };
  action.addEventListener('click', () => { if (enabled()) act(); });
  close.addEventListener('click', () => select(null));
  const raycaster = new THREE.Raycaster();
  let pointer = null;
  const isWorld = target => target === renderer.domElement || target.closest?.('#stickZone');
  const down = event => {
    if (!enabled() || !isWorld(event.target)) return;
    if (pointer) { pointer = null; return; }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: performance.now(), moved: false };
  };
  const move = event => {
    if (pointer?.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 9) pointer.moved = true;
  };
  const up = event => {
    const start = pointer;
    pointer = null;
    if (!start || start.id !== event.pointerId || start.moved || performance.now() - start.start > 450 || !enabled()) return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2), camera);
    const choices = available();
    const roots = new Map(choices.map(island => [island.group, island]));
    // Occluding terrain wins over an island behind it; never select through land.
    for (const hit of raycaster.intersectObject(scene, true)) {
      let ancestor = hit.object, hidden = false;
      while (ancestor) { if (!ancestor.visible) hidden = true; ancestor = ancestor.parent; }
      if (hidden || hit.object.userData.isAttachmentGhost) continue;
      if (selectObject(hit.object)) { select(null); return; }
      let object = hit.object;
      while (object && !roots.has(object)) object = object.parent;
      if (object) {
        const island = roots.get(object);
        island.group.updateWorldMatrix(true, false);
        anchors.set(island, island.group.worldToLocal(hit.point.clone()));
        select(island);
        return;
      }
      if (hit.object.name.startsWith('terrain-')) break;
    }
    selectObject(null);
    select(null);
  };
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', () => { pointer = null; }, true);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') select(null); });
  return {
    render() {
      if (!enabled()) select(null);
      const current = enabled() ? state() : null;
      const choices = enabled() ? available() : [];
      const visible = new Set(choices.filter(island => island.status === 'drifting' || island === current?.island));
      for (const island of visible) if (!outlined.has(island)) outlined.set(island, createIslandOutline(island));
      for (const [island, outline] of outlined) {
        if (!island.group.parent) { outline.dispose(); outlined.delete(island); }
        else outline.update(island === current?.island, visible.has(island));
      }
      popup.hidden = leader.hidden = !current;
      if (current) {
        label.textContent = current.disabled || current.waiting ? current.label : '';
        label.hidden = !current.waiting;
        popup.title = current.label;
        action.setAttribute('aria-label', current.disabled ? `${current.action} unavailable: ${current.label}` : current.action);
        actionText.textContent = current.disabled ? (current.action === 'Release' ? (current.label === 'No clear departure' ? 'No clear departure' : 'Required link') : 'No clear site') : current.action;
        popup.dataset.action = current.action.toLowerCase();
        actionIcon.setAttribute('d', current.disabled ? 'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3' : current.action === 'Connect'
          ? 'M9 15l6-6M7 14l-1 1a3 3 0 0 0 4 4l3-3M11 8l3-3a3 3 0 0 1 4 4l-1 1'
          : 'M8 5H5v14h3M10 12h10m-4-4 4 4-4 4');
        action.disabled = Boolean(current.disabled);
        positionPopup(current.island);
      }
      beforeRender();
      renderer.render(scene, camera);
    },
    resize() {},
  };
}
