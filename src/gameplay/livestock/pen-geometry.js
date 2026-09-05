import { TILE, gridKey } from '../../core/shared.js';
import { PEN_TILES_PER_COW } from './config.js';

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isSafeInteger(Math.round(Number(value))) ? Math.round(Number(value)) : fallback;

export function cornerToWorld(vertex) {
  return { x: (vertex.cx + .5) * TILE, z: (vertex.cz + .5) * TILE };
}

export function worldToCorner(point) {
  return { cx: Math.round(point.x / TILE - .5), cz: Math.round(point.z / TILE - .5) };
}

export function snapPenPoint(worldPoint) {
  const corner = worldToCorner(worldPoint);
  return { ...corner, ...cornerToWorld(corner) };
}

const sameVertex = (a, b) => a?.cx === b?.cx && a?.cz === b?.cz;

export function removeCollinearVertices(vertices) {
  const result = [];
  for (const source of vertices || []) {
    const vertex = { cx: integer(source?.cx), cz: integer(source?.cz) };
    if (sameVertex(vertex, result.at(-1))) continue;
    result.push(vertex);
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3);
      if ((a.cx === b.cx && b.cx === c.cx) || (a.cz === b.cz && b.cz === c.cz)) result.splice(-2, 1);
      else break;
    }
    if (result.length >= 2 && sameVertex(result.at(-1), result.at(-2))) result.pop();
  }
  return result;
}

export function isOrthogonal(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 4) return false;
  return vertices.every((vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return !sameVertex(vertex, next) && (vertex.cx === next.cx || vertex.cz === next.cz);
  });
}

const segmentIntersection = (a, b) => {
  const aHorizontal = a.a.cz === a.b.cz;
  const bHorizontal = b.a.cz === b.b.cz;
  if (aHorizontal === bHorizontal) {
    if (aHorizontal && a.a.cz !== b.a.cz) return false;
    if (!aHorizontal && a.a.cx !== b.a.cx) return false;
    const a0 = aHorizontal ? Math.min(a.a.cx, a.b.cx) : Math.min(a.a.cz, a.b.cz);
    const a1 = aHorizontal ? Math.max(a.a.cx, a.b.cx) : Math.max(a.a.cz, a.b.cz);
    const b0 = aHorizontal ? Math.min(b.a.cx, b.b.cx) : Math.min(b.a.cz, b.b.cz);
    const b1 = aHorizontal ? Math.max(b.a.cx, b.b.cx) : Math.max(b.a.cz, b.b.cz);
    return Math.min(a1, b1) >= Math.max(a0, b0);
  }
  const horizontal = aHorizontal ? a : b;
  const vertical = aHorizontal ? b : a;
  return vertical.a.cx >= Math.min(horizontal.a.cx, horizontal.b.cx)
    && vertical.a.cx <= Math.max(horizontal.a.cx, horizontal.b.cx)
    && horizontal.a.cz >= Math.min(vertical.a.cz, vertical.b.cz)
    && horizontal.a.cz <= Math.max(vertical.a.cz, vertical.b.cz);
};

export function segmentsFor(vertices) {
  return (vertices || []).map((vertex, index) => ({ a: vertex, b: vertices[(index + 1) % vertices.length], hidden: index === vertices.length - 1 }));
}

export function hasSelfIntersection(vertices) {
  const segments = segmentsFor(vertices);
  for (let a = 0; a < segments.length; a++) {
    for (let b = a + 1; b < segments.length; b++) {
      if (b === a + 1 || (a === 0 && b === segments.length - 1)) continue;
      if (segmentIntersection(segments[a], segments[b])) return true;
    }
  }
  return false;
}

export function pointInsidePolygon(x, z, vertices) {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
    const a = vertices[index], b = vertices[previous];
    const ax = a.cx + .5, az = a.cz + .5, bx = b.cx + .5, bz = b.cz + .5;
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export function tileCenterInsidePolygon(tile, vertices) {
  return pointInsidePolygon(tile.gx, tile.gz, vertices);
}

export function barnPenAnchors(site) {
  const gx = Math.round(site.x / TILE), gz = Math.round(site.z / TILE);
  return [{ cx: gx - 2, cz: gz + 1 }, { cx: gx + 1, cz: gz + 1 }];
}

export function barnPenConnectorSegments(site) {
  const [leftAnchor, rightAnchor] = barnPenAnchors(site).map(cornerToWorld);
  const wallHalfWidth = 1.34;
  return [
    { a: { x: site.x - wallHalfWidth, z: site.z }, b: { x: leftAnchor.x, z: site.z } },
    { a: { x: leftAnchor.x, z: site.z }, b: leftAnchor },
    { a: { x: site.x + wallHalfWidth, z: site.z }, b: { x: rightAnchor.x, z: site.z } },
    { a: { x: rightAnchor.x, z: site.z }, b: rightAnchor },
  ];
}

const fenceCrossesBlockedTiles = (segments, blockedAt) => segments.some(segment => {
  if (segment.a.cz === segment.b.cz) {
    const start = Math.min(segment.a.cx, segment.b.cx);
    const end = Math.max(segment.a.cx, segment.b.cx);
    for (let cx = start; cx < end; cx++) {
      if (blockedAt(cx + 1, segment.a.cz) && blockedAt(cx + 1, segment.a.cz + 1)) return true;
    }
    return false;
  }
  const start = Math.min(segment.a.cz, segment.b.cz);
  const end = Math.max(segment.a.cz, segment.b.cz);
  for (let cz = start; cz < end; cz++) {
    if (blockedAt(segment.a.cx, cz + 1) && blockedAt(segment.a.cx + 1, cz + 1)) return true;
  }
  return false;
});

export function computePenGeometry(vertices, terrain, barnSite, context = {}) {
  const clean = removeCollinearVertices(vertices);
  const invalid = reason => ({ valid: false, reason, vertices: clean, tiles: [], tileSet: new Set(), capacity: 0, segments: [] });
  if (!isOrthogonal(clean) || hasSelfIntersection(clean)) return invalid('Pen must be a simple orthogonal shape');
  const excluded = context.occupiedTileKeys || new Set();
  const barnGx = Math.round(barnSite.x / TILE), barnGz = Math.round(barnSite.z / TILE);
  const blockedAt = (gx, gz) => excluded.has(gridKey(gx, gz))
    || (Math.abs(gx - barnGx) <= 1 && Math.abs(gz - barnGz) <= 1);
  const visibleSegments = segmentsFor(clean).filter(segment => !segment.hidden);
  if (fenceCrossesBlockedTiles(visibleSegments, blockedAt)) return invalid('Fence cannot pass through a building');
  const area = Math.abs(clean.reduce((sum, vertex, index) => {
    const next = clean[(index + 1) % clean.length];
    return sum + vertex.cx * next.cz - next.cx * vertex.cz;
  }, 0)) * .5;
  if (area < 1) return invalid('Pen has no usable area');
  const minX = Math.min(...clean.map(vertex => vertex.cx));
  const maxX = Math.max(...clean.map(vertex => vertex.cx));
  const minZ = Math.min(...clean.map(vertex => vertex.cz));
  const maxZ = Math.max(...clean.map(vertex => vertex.cz));
  const barnLevel = finite(barnSite?.y, NaN);
  const tiles = [];
  for (let gx = minX; gx <= maxX; gx++) {
    for (let gz = minZ; gz <= maxZ; gz++) {
      if (!pointInsidePolygon(gx, gz, clean)) continue;
      const key = gridKey(gx, gz);
      const tile = terrain?.get(key);
      const inBarn = Math.abs(gx - barnGx) <= 1 && Math.abs(gz - barnGz) <= 1;
      if (!tile || tile.water || tile.reserved || tile.ploughed || tile.crop || tile.hasTree
        || Math.abs(tile.topY - barnLevel) > .01 || inBarn || excluded.has(key)) return invalid('The enclosed pasture must be clear, level grass');
      tiles.push(tile);
    }
  }
  const capacity = Math.floor(tiles.length / PEN_TILES_PER_COW);
  const minimum = context.minimumCapacity ?? STARTER_COW_COUNT;
  if (capacity < minimum) return invalid(`Pen needs capacity for ${minimum} cattle`);
  return {
    valid: true,
    reason: '',
    vertices: clean,
    tiles,
    tileSet: new Set(tiles.map(tile => gridKey(tile.gx, tile.gz))),
    capacity,
    segments: segmentsFor(clean).filter(segment => !segment.hidden),
  };
}

const lassoContains = (x, z, samples) => {
  let inside = false;
  for (let index = 0, previous = samples.length - 1; index < samples.length; previous = index++) {
    const a = samples[index], b = samples[previous];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
};

const neighborsOf = (gx, gz) => [[gx + 1, gz], [gx, gz + 1], [gx - 1, gz], [gx, gz - 1]];

function connectedFrom(keys, starts) {
  const connected = new Set();
  const queue = starts.filter(key => keys.has(key));
  while (queue.length) {
    const key = queue.shift();
    if (connected.has(key)) continue;
    connected.add(key);
    const [gx, gz] = key.split(',').map(Number);
    for (const [nx, nz] of neighborsOf(gx, gz)) {
      const neighbor = gridKey(nx, nz);
      if (keys.has(neighbor) && !connected.has(neighbor)) queue.push(neighbor);
    }
  }
  return connected;
}

function enclosedHoles(keys) {
  const cells = [...keys].map(key => key.split(',').map(Number));
  if (!cells.length) return [];
  const minX = Math.min(...cells.map(cell => cell[0])) - 1;
  const maxX = Math.max(...cells.map(cell => cell[0])) + 1;
  const minZ = Math.min(...cells.map(cell => cell[1])) - 1;
  const maxZ = Math.max(...cells.map(cell => cell[1])) + 1;
  const outside = new Set();
  const queue = [[minX, minZ]];
  while (queue.length) {
    const [gx, gz] = queue.shift();
    const key = gridKey(gx, gz);
    if (outside.has(key) || keys.has(key) || gx < minX || gx > maxX || gz < minZ || gz > maxZ) continue;
    outside.add(key);
    queue.push(...neighborsOf(gx, gz));
  }
  const holes = [];
  const visited = new Set(outside);
  for (let gx = minX + 1; gx < maxX; gx++) {
    for (let gz = minZ + 1; gz < maxZ; gz++) {
      const start = gridKey(gx, gz);
      if (keys.has(start) || visited.has(start)) continue;
      const hole = [];
      const pending = [[gx, gz]];
      while (pending.length) {
        const [hx, hz] = pending.shift();
        const key = gridKey(hx, hz);
        if (visited.has(key) || keys.has(key) || hx <= minX || hx >= maxX || hz <= minZ || hz >= maxZ) continue;
        visited.add(key);
        hole.push({ gx: hx, gz: hz });
        pending.push(...neighborsOf(hx, hz));
      }
      if (hole.length) holes.push({ cells: hole, bounds: { minX, maxX, minZ, maxZ } });
    }
  }
  return holes;
}

function openHole(keys, hole, protectedKeys) {
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let best = null;
  for (const cell of hole.cells) {
    for (const [dx, dz] of directions) {
      const path = [];
      let gx = cell.gx, gz = cell.gz;
      while (gx >= hole.bounds.minX && gx <= hole.bounds.maxX && gz >= hole.bounds.minZ && gz <= hole.bounds.maxZ) {
        gx += dx; gz += dz;
        const key = gridKey(gx, gz);
        if (keys.has(key)) path.push(key);
      }
      if (!path.length || path.some(key => protectedKeys.has(key))) continue;
      if (!best || path.length < best.length) best = path;
    }
  }
  if (!best) return false;
  best.forEach(key => keys.delete(key));
  return true;
}

function boundaryLoops(keys) {
  const edges = [];
  const add = (a, b, direction) => edges.push({ a, b, direction });
  for (const key of keys) {
    const [gx, gz] = key.split(',').map(Number);
    if (!keys.has(gridKey(gx, gz - 1))) add({ cx: gx - 1, cz: gz - 1 }, { cx: gx, cz: gz - 1 }, 0);
    if (!keys.has(gridKey(gx + 1, gz))) add({ cx: gx, cz: gz - 1 }, { cx: gx, cz: gz }, 1);
    if (!keys.has(gridKey(gx, gz + 1))) add({ cx: gx, cz: gz }, { cx: gx - 1, cz: gz }, 2);
    if (!keys.has(gridKey(gx - 1, gz))) add({ cx: gx - 1, cz: gz }, { cx: gx - 1, cz: gz - 1 }, 3);
  }
  const pointKey = point => `${point.cx},${point.cz}`;
  const outgoing = new Map();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.a);
    if (!outgoing.has(key)) outgoing.set(key, []);
    outgoing.get(key).push(index);
  });
  const used = new Set();
  const rank = new Map([[1, 0], [0, 1], [3, 2], [2, 3]]);
  const loops = [];
  for (let startIndex = 0; startIndex < edges.length; startIndex++) {
    if (used.has(startIndex)) continue;
    const start = edges[startIndex].a;
    const loop = [{ ...start }];
    let currentIndex = startIndex;
    let closed = false;
    let safety = edges.length + 1;
    while (safety-- > 0) {
      const current = edges[currentIndex];
      used.add(currentIndex);
      if (sameVertex(current.b, start)) {
        closed = true;
        break;
      }
      loop.push({ ...current.b });
      const candidates = (outgoing.get(pointKey(current.b)) || []).filter(index => !used.has(index));
      if (!candidates.length) return [];
      currentIndex = candidates.sort((a, b) => {
        const turnA = (edges[a].direction - current.direction + 4) % 4;
        const turnB = (edges[b].direction - current.direction + 4) % 4;
        return rank.get(turnA) - rank.get(turnB);
      })[0];
    }
    if (!closed) return [];
    loops.push(loop);
  }
  return loops;
}

function penVerticesFromTiles(keys, barnSite) {
  const [left, right] = barnPenAnchors(barnSite);
  const loop = boundaryLoops(keys).find(candidate =>
    candidate.some(vertex => sameVertex(vertex, left)) && candidate.some(vertex => sameVertex(vertex, right))
  );
  if (!loop) return null;
  const leftIndex = loop.findIndex(vertex => sameVertex(vertex, left));
  const rightIndex = loop.findIndex(vertex => sameVertex(vertex, right));
  const path = (from, to) => {
    const result = [{ ...loop[from] }];
    for (let index = (from + 1) % loop.length; index !== (to + 1) % loop.length; index = (index + 1) % loop.length) {
      result.push({ ...loop[index] });
    }
    return result;
  };
  const forward = path(leftIndex, rightIndex);
  const backward = path(rightIndex, leftIndex);
  const isGate = vertices => vertices.every(vertex => vertex.cz === left.cz)
    && vertices.reduce((sum, vertex, index) => index ? sum + Math.abs(vertex.cx - vertices[index - 1].cx) : 0, 0) === 3;
  if (isGate(forward)) return removeCollinearVertices(backward.reverse());
  if (isGate(backward)) return removeCollinearVertices(forward);
  return null;
}

export function penGeometryFromLasso(samples, terrain, barnSite, context = {}) {
  const gateGx = Math.round(barnSite.x / TILE), gateGz = Math.round(barnSite.z / TILE) + 2;
  const gateTiles = [-1, 0, 1].map(dx => ({ gx: gateGx + dx, gz: gateGz, key: gridKey(gateGx + dx, gateGz) }));
  const base = { valid: false, reason: 'Circle the pasture', vertices: [], tiles: [], tileSet: new Set(), capacity: 0, segments: [], selectedTiles: [], trimmedTiles: [], gateTiles };
  if (!Array.isArray(samples) || samples.length < 3) return base;
  const minX = Math.min(...samples.map(sample => sample.x));
  const maxX = Math.max(...samples.map(sample => sample.x));
  const minZ = Math.min(...samples.map(sample => sample.z));
  const maxZ = Math.max(...samples.map(sample => sample.z));
  const candidates = [];
  for (let gx = Math.floor(minX / TILE) - 1; gx <= Math.ceil(maxX / TILE) + 1; gx++) {
    for (let gz = Math.floor(minZ / TILE) - 1; gz <= Math.ceil(maxZ / TILE) + 1; gz++) {
      const x = gx * TILE, z = gz * TILE;
      if (!lassoContains(x, z, samples)) continue;
      const key = gridKey(gx, gz);
      candidates.push({ gx, gz, x, z, key, tile: terrain?.get(key) || null });
    }
  }
  const candidateKeys = new Set(candidates.map(candidate => candidate.key));
  if (!gateTiles.every(tile => candidateKeys.has(tile.key))) return { ...base, reason: 'Include the glowing barn gate', trimmedTiles: candidates };
  const excluded = context.occupiedTileKeys || new Set();
  const levelY = finite(barnSite.y, NaN);
  const barnGx = Math.round(barnSite.x / TILE), barnGz = Math.round(barnSite.z / TILE);
  const validTile = candidate => {
    const tile = candidate.tile;
    const inBarn = Math.abs(candidate.gx - barnGx) <= 1 && Math.abs(candidate.gz - barnGz) <= 1;
    return tile && !tile.water && !tile.reserved && !tile.ploughed && !tile.crop && !tile.hasTree
      && Math.abs(tile.topY - levelY) <= .01 && !inBarn && !excluded.has(candidate.key);
  };
  if (!gateTiles.every(gate => validTile(candidates.find(candidate => candidate.key === gate.key)))) {
    return { ...base, reason: 'The barn gate needs clear level grass', trimmedTiles: candidates };
  }
  const validKeys = new Set(candidates.filter(validTile).map(candidate => candidate.key));
  let selectedKeys = connectedFrom(validKeys, gateTiles.map(tile => tile.key));
  const protectedKeys = new Set(gateTiles.map(tile => tile.key));
  for (let attempts = 0; attempts < 24; attempts++) {
    const hole = enclosedHoles(selectedKeys)[0];
    if (!hole) break;
    if (!openHole(selectedKeys, hole, protectedKeys)) {
      return { ...base, reason: 'Repaint without enclosing blocked land', trimmedTiles: candidates };
    }
    selectedKeys = connectedFrom(selectedKeys, gateTiles.map(tile => tile.key));
  }
  if (enclosedHoles(selectedKeys).length) return { ...base, reason: 'The pasture shape is too complex', trimmedTiles: candidates };
  const selectedTiles = candidates.filter(candidate => selectedKeys.has(candidate.key)).map(candidate => candidate.tile);
  const trimmedTiles = candidates.filter(candidate => !selectedKeys.has(candidate.key));
  const minimum = context.minimumCapacity ?? STARTER_COW_COUNT;
  if (Math.floor(selectedTiles.length / PEN_TILES_PER_COW) < minimum) {
    return { ...base, reason: `Circle more clear grass for ${minimum} cattle`, selectedTiles, trimmedTiles };
  }
  const vertices = penVerticesFromTiles(selectedKeys, barnSite);
  if (!vertices) return { ...base, reason: 'Repaint a simpler border', selectedTiles, trimmedTiles };
  const geometry = computePenGeometry(vertices, terrain, barnSite, context);
  if (!geometry.valid || geometry.tileSet.size !== selectedKeys.size
    || [...selectedKeys].some(key => !geometry.tileSet.has(key))) {
    return { ...base, reason: geometry.reason || 'Repaint a simpler border', selectedTiles, trimmedTiles };
  }
  return { ...geometry, selectedTiles, trimmedTiles, gateTiles };
}

