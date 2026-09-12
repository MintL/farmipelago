// Attach a short, stepped speech tail to the edge facing the world target.
export function positionVoxelDialog(popup, target) {
  const rect = popup.getBoundingClientRect();
  const inset = 6;
  const x = Math.max(inset, Math.min(rect.width - inset, target.x - rect.left));
  const y = Math.max(inset, Math.min(rect.height - inset, target.y - rect.top));
  const dx = target.x - rect.left - x, dy = target.y - rect.top - y;
  const distance = Math.hypot(dx, dy);
  popup.style.setProperty('--tail-x', `${x}px`);
  popup.style.setProperty('--tail-y', `${y}px`);
  popup.style.setProperty('--tail-length', `${Math.min(20, distance)}px`);
  popup.style.setProperty('--tail-angle', `${Math.atan2(dy, dx)}rad`);
}
