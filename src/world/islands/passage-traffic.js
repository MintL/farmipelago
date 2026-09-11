import { TILE } from '../../core/shared.js';
import { sweptIntersection, translateBox } from './motion-safety.js';

const distance = (a, b) => Math.hypot(b.x - a.x, (b.y || 0) - (a.y || 0), b.z - a.z);
const timeline = (route, speed, delay) => {
  const points = [{ ...route[0], time: 0 }];
  if (delay > 0) points.push({ ...route[0], time: delay });
  for (let i = 1; i < route.length; i++) {
    const duration = distance(route[i - 1], route[i]) / speed;
    if (duration > .000001) points.push({ ...route[i], time: points.at(-1).time + duration });
  }
  return points;
};
const positionAt = (points, time) => {
  const end = points.findIndex(point => point.time > time);
  if (end < 0) return points.at(-1);
  const from = points[end - 1], to = points[end];
  const amount = (time - from.time) / (to.time - from.time);
  return { x: from.x + (to.x - from.x) * amount,
    y: (from.y || 0) + ((to.y || 0) - (from.y || 0)) * amount,
    z: from.z + (to.z - from.z) * amount };
};

// Compare simultaneous swept bounds between every turn/launch event. A normal
// passage retires at its off-screen exit; an already stopped island remains an
// obstacle. Fixed-step collision checks still handle unexpected stops or a
// camera move that delays retirement.
export function passagesClear(first, second, speed) {
  const a = timeline(first.route, speed, first.delay || 0);
  const b = timeline(second.route, speed, second.delay || 0);
  const end = Math.min(a.length > 1 ? a.at(-1).time : Infinity,
    b.length > 1 ? b.at(-1).time : Infinity);
  const times = [...new Set([0, ...a.map(p => p.time), ...b.map(p => p.time),
    Number.isFinite(end) ? end : 0])].filter(time => time <= end).sort((x, y) => x - y);
  for (let i = 0; i < times.length; i++) {
    const pa = positionAt(a, times[i]), pb = positionAt(b, times[i]);
    const qa = positionAt(a, times[i + 1] ?? times[i]), qb = positionAt(b, times[i + 1] ?? times[i]);
    const relative = { x: qa.x - pa.x - (qb.x - pb.x),
      y: (qa.y || 0) - (pa.y || 0) - ((qb.y || 0) - (pb.y || 0)),
      z: qa.z - pa.z - (qb.z - pb.z) };
    if (sweptIntersection(translateBox(first.bounds, pa), translateBox(second.bounds, pb), relative, 2 * TILE)) return false;
  }
  return true;
}
