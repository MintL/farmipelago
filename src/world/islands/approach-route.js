import { TILE, gridKey } from '../../core/shared.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Bounded eight-neighbor A*, with full swept envelopes and no corner cutting.
export function planApproach(island, start, goal, safety) {
  const clear = (a, b) => safety.clear(island, a, b);
  if (clear(start, goal)) return [{ ...start }, { ...goal }];
  const origin = { x: Math.round(start.x / TILE) * TILE, y: start.y || 0, z: Math.round(start.z / TILE) * TILE };
  const target = { x: Math.round(goal.x / TILE) * TILE, y: goal.y || 0, z: Math.round(goal.z / TILE) * TILE };
  if (!clear(start, origin) || !clear(target, goal)) return null;
  const key = p => gridKey(p.x / TILE, p.z / TILE);
  const open = [{ ...origin, g: 0, f: distance(origin, goal), parent: null }];
  const best = new Map([[key(origin), 0]]);
  const free = new Map();
  const isFree = p => {
    const k = key(p);
    if (!free.has(k)) free.set(k, clear(p, p));
    return free.get(k);
  };
  let end = null;
  for (let visited = 0; open.length && visited < 6000; visited++) {
    let nearest = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[nearest].f) nearest = i;
    const node = open.splice(nearest, 1)[0];
    if (node.g > best.get(key(node))) continue;
    if (key(node) === key(target)) { end = node; break; }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const next = { x: node.x + dx * TILE, y: node.y, z: node.z + dz * TILE };
      if (!isFree(next)) continue;
      if (dx && dz && (!isFree({ ...node, x: next.x }) || !isFree({ ...node, z: next.z }))) continue;
      const g = node.g + Math.hypot(dx, dz) * TILE;
      if (g >= (best.get(key(next)) ?? Infinity) || !clear(node, next)) continue;
      best.set(key(next), g);
      open.push({ ...next, g, f: g + distance(next, target), parent: node });
    }
  }
  if (!end) return null;
  const points = [{ ...goal }];
  for (let node = end; node; node = node.parent) points.push({ x: node.x, y: node.y, z: node.z });
  points.push({ ...start });
  points.reverse();
  const result = [points[0]];
  for (let i = 0; i < points.length - 1;) {
    let next = points.length - 1;
    while (next > i + 1 && !clear(points[i], points[next])) next--;
    result.push(points[next]);
    i = next;
  }
  return result;
}

export function velocityOnRoute(position, route, index, speed, dt) {
  while (index < route.length && Math.hypot(route[index].x - position.x,
    (route[index].y || 0) - position.y, route[index].z - position.z) < .025) index++;
  if (index >= route.length) return { velocity: { x: 0, y: 0, z: 0 }, index, complete: true };
  const goal = route[index];
  const dx = goal.x - position.x, dy = (goal.y || 0) - position.y, dz = goal.z - position.z;
  const length = Math.hypot(dx, dy, dz);
  const scale = Math.min(speed, length / dt) / length;
  return { velocity: { x: dx * scale, y: dy * scale, z: dz * scale }, index, complete: false };
}
