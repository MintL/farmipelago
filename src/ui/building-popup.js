import { createHudFrame, hudVisualBounds, hudViewport, HUD_DIALOG_OUTSET } from './hud-frame.js';
import { positionVoxelDialog } from './voxel-dialog.js';
export function projectBuildingPopup(view, camera, viewport = { width: innerWidth, height: innerHeight }) {
  if (!view) return null;
  camera.updateWorldMatrix(true, false);
  const project = point => {
    const p = point.clone().project(camera);
    return { x: (p.x + 1) * viewport.width / 2, y: (1 - p.y) * viewport.height / 2, z: p.z };
  };
  const target = project(view.target), corners = view.corners.map(project);
  if (target.z < -1 || target.z > 1 || corners.some(point => point.z < -1)) return null;
  const bounds = { left: Math.min(...corners.map(point => point.x)), right: Math.max(...corners.map(point => point.x)),
    top: Math.min(...corners.map(point => point.y)), bottom: Math.max(...corners.map(point => point.y)) };
  if (bounds.right < 0 || bounds.left > viewport.width || bounds.bottom < 0 || bounds.top > viewport.height) return null;
  return { target, bounds };
}

const overlap = (a, b, gap = 0) => Math.max(0, Math.min(a.right + gap, b.right) - Math.max(a.left - gap, b.left))
  * Math.max(0, Math.min(a.bottom + gap, b.bottom) - Math.max(a.top - gap, b.top));

// Prefer a clear spot immediately above the model. Other sides are fallbacks,
// not competitors that can pull a clear roof label toward a neighboring building.
export function buildingPopupPosition(anchor, size, viewport, obstacles = []) {
  const { target, bounds } = anchor, safe = viewport.safe;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
  const candidates = [
    { x: target.x - size.width / 2, y: bounds.top - size.height, side: 'top' },
    { x: bounds.right, y: target.y - size.height / 2, side: 'right' },
    { x: bounds.left - size.width, y: target.y - size.height / 2, side: 'left' },
    { x: target.x - size.width / 2, y: bounds.bottom, side: 'bottom' },
  ];
  // Slide along the roof line to avoid individual controls without treating
  // empty space between controls as an obstruction.
  for (const rect of obstacles) candidates.push(
    { x: rect.left - size.width - 6, y: bounds.top - size.height, side: 'top' },
    { x: rect.right + 6, y: bounds.top - size.height, side: 'top' },
    { x: target.x - size.width / 2, y: rect.bottom + 6, side: 'fit' },
    { x: target.x - size.width / 2, y: rect.top - size.height - 6, side: 'fit' },
  );
  let best;
  for (const candidate of candidates) {
    const x = clamp(candidate.x, safe.left, viewport.width - safe.right - size.width);
    const y = clamp(candidate.y, safe.top, viewport.height - safe.bottom - size.height);
    const rect = { left: x, top: y, right: x + size.width, bottom: y + size.height };
    const controlOverlap = obstacles.reduce((sum, obstacle) => sum + overlap(rect, obstacle, 5), 0);
    const buildingOverlap = overlap(rect, bounds);
    const coversTarget = target.x >= rect.left && target.x <= rect.right && target.y >= rect.top && target.y <= rect.bottom;
    const distance = Math.hypot(x + size.width / 2 - target.x, y + size.height / 2 - target.y);
    const obstructed = controlOverlap > 0 || buildingOverlap > 0;
    const score = (obstructed ? 1e7 : 0) + (controlOverlap + buildingOverlap) * 1000 + (coversTarget ? 1e9 : 0)
      + distance + (candidate.side === 'top' ? 0 : 120);
    if (!best || score < best.score) best = { x, y, score };
  }
  return best;
}

export function positionBuildingPopup(popup, anchor, { framed = true } = {}) {
  const upperPanel = popup.matches('#siloInventory:not([data-collapsed="true"])');
  if (!anchor && !upperPanel) { popup.hidden = true; if (framed) createHudFrame(popup).setTarget(null); return; }
  const namePopup = popup.matches('#storehouseCallout, #siloInventory[data-collapsed="true"]');
  const viewport = hudViewport(), margin = namePopup ? 6 : HUD_DIALOG_OUTSET;
  // Include the attached action buttons and the frame/arrow in the footprint.
  const rect = popup.getBoundingClientRect();
  let left = rect.left, right = rect.right, top = rect.top, bottom = rect.bottom;
  for (const action of popup.querySelectorAll('button')) {
    if (action.closest('[hidden]') || !action.getClientRects().length) continue;
    const bounds = action.getBoundingClientRect();
    left = Math.min(left, bounds.left); right = Math.max(right, bounds.right);
    top = Math.min(top, bounds.top); bottom = Math.max(bottom, bounds.bottom);
  }
  const size = { width: right - left + margin * 2, height: bottom - top + margin * 2 };
  const controls = document.querySelectorAll('#topBar button, #performanceBadge, #stickZone, #cycleVehicle, #actionCluster button, #inventoryMeter, #desktopHints, #islandAction, #siloInventory, #buildPalette, #viewHint');
  const obstacles = [...controls].filter(element => element !== popup && !element.closest('[hidden]') && element.getClientRects().length
    && getComputedStyle(element).visibility !== 'hidden').map(hudVisualBounds);
  let position;
  if (upperPanel) {
    // Expanded building inventories stay in the upper HUD, independent of the
    // building/camera position, leaving the driving area below visible.
    const topControls = [...document.querySelectorAll('#topBar button, #performanceBadge')]
      .filter(element => !element.closest('[hidden]') && element.getClientRects().length
        && getComputedStyle(element).visibility !== 'hidden').map(hudVisualBounds);
    position = {
      x: Math.max(viewport.safe.left, Math.min((viewport.width - size.width) / 2,
        viewport.width - viewport.safe.right - size.width)),
      y: Math.max(viewport.safe.top, ...topControls.map(bounds => bounds.bottom + 8)),
    };
    createHudFrame(popup).setTarget(null);
  } else {
    position = buildingPopupPosition(anchor, size, viewport, obstacles);
  }
  popup.dataset.anchored = 'true';
  popup.style.left = `${position.x + margin + rect.left - left}px`;
  popup.style.top = `${position.y + margin + rect.top - top}px`;
  if (framed && !upperPanel) positionVoxelDialog(popup, anchor.target);
}
