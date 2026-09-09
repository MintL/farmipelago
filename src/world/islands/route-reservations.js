// Subdivide long diagonal sweeps so their reserved volume follows the route,
// rather than reserving the entire rectangle between distant endpoints.
export function routeReservationBoxes(bounds, route, margin, maxSegment) {
  const boxes = [];
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1], to = route[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x,
      (to.y || 0) - (from.y || 0), to.z - from.z) / maxSegment));
    for (let step = 0; step < steps; step++) {
      const box = {};
      for (const [axis, key] of [['X', 'x'], ['Y', 'y'], ['Z', 'z']]) {
        const start = from[key] || 0, delta = (to[key] || 0) - start;
        const a = start + delta * step / steps, b = start + delta * (step + 1) / steps;
        box[`min${axis}`] = bounds[`min${axis}`] + Math.min(a, b) - margin;
        box[`max${axis}`] = bounds[`max${axis}`] + Math.max(a, b) + margin;
      }
      boxes.push(box);
    }
  }
  return boxes;
}

// Compare the volumes that will actually be reserved in both directions.
// Checking only a new centerline against an old corridor is not symmetric.
export function reservationsOverlap(first, second) {
  return first.some(a => second.some(b => a.minX < b.maxX && a.maxX > b.minX
    && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ));
}
