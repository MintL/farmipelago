import { createHudFrame } from './hud-frame.js';

// The frame and tail share a single contour, including their bevel and depth.
export function positionVoxelDialog(popup, target) {
  const rect = popup.getBoundingClientRect();
  createHudFrame(popup).setTarget(target ? { x: target.x - rect.left, y: target.y - rect.top } : null);
}
