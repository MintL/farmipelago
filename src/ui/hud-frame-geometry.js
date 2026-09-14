const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// All contour edges follow the pixel grid, including the blunt speech tail.
export function hudFrameContour(width, height, shape = 'panel', tail = null) {
  const step = shape === 'icon' ? Math.max(3, Math.round(Math.min(width, height) / 10)) : 4;
  // Keep the same grid size, but vary the runs around the circular shoulder.
  const corner = shape === 'icon' ? [[0, 1], [2, 1], [2, 2], [3, 2], [3, 4]] : [[0, 1]];
  const cut = step * (shape === 'icon' ? 4 : 1);
  const points = [];
  const sides = [
    { name: 'top', length: width, map: (x, y) => [x, y] },
    { name: 'right', length: height, map: (x, y) => [width - y, x] },
    { name: 'bottom', length: width, map: (x, y) => [width - x, height - y] },
    { name: 'left', length: height, map: (x, y) => [y, height - x] },
  ];
  for (const side of sides) {
    const add = (x, y) => points.push(side.map(x, y));
    add(cut, 0);
    if (tail?.side === side.name && side.length >= cut * 2 + 18) {
      const reverse = side.name === 'bottom' || side.name === 'left';
      const halfBase = Math.min(8, Math.floor((side.length - cut * 2 - 6) / 2));
      const center = clamp(reverse ? side.length - tail.position : tail.position,
        cut + halfBase + 3, side.length - cut - halfBase - 3);
      const neck = Math.min(5, tail.length / 2);
      add(center - halfBase, 0);
      add(center - halfBase, -neck);
      add(center - 4, -neck);
      add(center - 4, -tail.length);
      add(center + 4, -tail.length);
      add(center + 4, -neck);
      add(center + halfBase, -neck);
      add(center + halfBase, 0);
    }
    add(side.length - cut, 0);
    // The next side starts at the final corner point.
    for (const [x, y] of corner) add(side.length - cut + x * step, y * step);
  }
  if (shape !== 'icon') return points;
  // Omit the outermost step at all four compass points without rescaling the grid.
  const trimmed = points.map(([x, y]) => [clamp(x, step, width - step), clamp(y, step, height - step)])
    .filter(([x, y], i, contour) => {
      const previous = contour[(i + contour.length - 1) % contour.length];
      return x !== previous[0] || y !== previous[1];
    });
  return trimmed.filter(([x, y], i) => {
    const previous = trimmed[(i + trimmed.length - 1) % trimmed.length];
    const next = trimmed[(i + 1) % trimmed.length];
    return !((x === previous[0] && x === next[0]) || (y === previous[1] && y === next[1]));
  });
}

export function insetHudContour(points, inset) {
  return points.map(([x, y], i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const a = Math.hypot(x - previous[0], y - previous[1]);
    const b = Math.hypot(next[0] - x, next[1] - y);
    return [x + ((previous[1] - y) / a + (y - next[1]) / b) * inset,
      y + ((x - previous[0]) / a + (next[0] - x) / b) * inset];
  });
}

export const hudContourPath = points => `M${points.map(point => point.join(',')).join('L')}Z`;

export function hudFrameBevel(points, inset) {
  const light = [], shade = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const path = hudContourPath([points[i], points[next], inset[next], inset[i]]);
    (points[next][0] > points[i][0] || points[next][1] < points[i][1] ? light : shade).push(path);
  }
  return { light: light.join(''), shade: shade.join('') };
}

export function hudSpeechTail(width, height, target) {
  if (!target || (target.x >= 0 && target.x <= width && target.y >= 0 && target.y <= height)) return null;
  const dx = target.x - width / 2, dy = target.y - height / 2;
  const vertical = Math.abs(dy) / height >= Math.abs(dx) / width;
  const side = vertical ? (dy > 0 ? 'bottom' : 'top') : (dx > 0 ? 'right' : 'left');
  const gap = vertical ? (dy > 0 ? target.y - height : -target.y) : (dx > 0 ? target.x - width : -target.x);
  if (gap < 4) return null;
  const length = vertical ? width : height;
  const edgeMargin = Math.min(15, length / 2);
  return { side, position: Math.round(clamp(vertical ? target.x : target.y, edgeMargin, length - edgeMargin)),
    length: Math.min(10, Math.floor(gap)) };
}
