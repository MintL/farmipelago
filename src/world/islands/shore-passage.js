import { TILE } from '../../core/shared.js';

// Two quadratic wings share the straight lane's tangent at the shore waypoint.
// Bend outward away from land, keeping the encounter itself within reach.
export function createShorePassage(start, goal, exit, normal, bend) {
  const incoming = Math.hypot(start.x - goal.x, start.z - goal.z);
  const outgoing = Math.hypot(exit.x - goal.x, exit.z - goal.z);
  const amount = Math.min(bend, Math.min(incoming, outgoing) * .15);
  if (!amount) return { route: [start, goal, exit], arrivalIndex: 2 };
  const wing = end => {
    const length = Math.hypot(end.x - goal.x, end.z - goal.z);
    const steps = Math.max(2, Math.ceil((length + 2 * amount) / TILE));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, offset = amount * t * t;
      return { x: goal.x + (end.x - goal.x) * t + normal.x * offset,
        y: goal.y || 0, z: goal.z + (end.z - goal.z) * t + normal.z * offset };
    });
  };
  const approach = wing(start).reverse();
  return { route: [...approach, ...wing(exit).slice(1)], arrivalIndex: approach.length };
}
