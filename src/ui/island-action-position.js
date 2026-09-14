// Prefer above the island, then nearby alternatives that avoid real HUD controls.
export function islandActionPosition(anchor, size, viewport, obstacles = [], islandBounds = null) {
  const margin = viewport.safe || { top: 12, right: 12, bottom: 12, left: 12 };
  const gap = 18;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const target = islandBounds || { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const candidates = [
    { x: anchor.x - size.width / 2, y: target.top - size.height - gap },
    { x: target.right + gap, y: anchor.y - size.height / 2 },
    { x: target.left - size.width - gap, y: anchor.y - size.height / 2 },
    { x: anchor.x - size.width / 2, y: target.bottom + gap },
  ];
  // Also consider the space immediately above/beside any obstructing control.
  for (const rect of obstacles) candidates.push(
    { x: anchor.x - size.width / 2, y: rect.top - size.height - gap },
    { x: rect.left - size.width - gap, y: anchor.y - size.height / 2 },
    { x: rect.right + gap, y: anchor.y - size.height / 2 },
  );
  let best = null;
  for (const candidate of candidates) {
    const x = clamp(candidate.x, margin.left, viewport.width - size.width - margin.right);
    const y = clamp(candidate.y, margin.top, viewport.height - size.height - margin.bottom);
    let score = Math.hypot(x + size.width / 2 - anchor.x, y + size.height / 2 - anchor.y);
    for (const rect of [...obstacles, ...(islandBounds ? [islandBounds] : [])]) {
      const width = Math.max(0, Math.min(x + size.width + 6, rect.right) - Math.max(x - 6, rect.left));
      const height = Math.max(0, Math.min(y + size.height + 6, rect.bottom) - Math.max(y - 6, rect.top));
      score += width * height * (rect === islandBounds ? 100 : 1000);
    }
    if (!best || score < best.score) best = { x, y, score };
  }
  return best;
}
