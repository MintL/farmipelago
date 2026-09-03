import { THREE, TILE, box, gridKey, mats } from './shared.js?v=workshop-voxels-20260903-1';

export const STARTER_COW_COUNT = 2;
export const PEN_TILES_PER_COW = 4;
export const HAY_BALE_LITRES = 3600;
export const BARN_HAY_CAPACITY = 14400;
export const BARN_MILK_CAPACITY = 10000;
export const LIQUID_TANK_CAPACITY = 6000;
export const CALF_GROWTH_SECONDS = 90;
export const BIRTH_INTERVAL_SECONDS = 120;
export const MILK_LITRES_PER_ADULT_SECOND = 2;
export const GRAZING_MILK_FACTOR = .2;
export const HAY_LITRES_PER_ADULT_SECOND = 1.5;
export const CALF_HAY_FACTOR = .5;

const cowWhite = new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: .9 });
const cowBrown = new THREE.MeshStandardMaterial({ color: 0x684638, roughness: .92 });
const cowMuzzle = new THREE.MeshStandardMaterial({ color: 0xc9937a, roughness: .92 });
const cowDark = new THREE.MeshStandardMaterial({ color: 0x332a26, roughness: .94 });
const barnRed = new THREE.MeshStandardMaterial({ color: 0x9d493b, roughness: .92 });
const barnDark = new THREE.MeshStandardMaterial({ color: 0x4a302a, roughness: .94 });
const barnCream = new THREE.MeshStandardMaterial({ color: 0xe2d1aa, roughness: .9 });
const fenceWood = new THREE.MeshStandardMaterial({ color: 0x8b603d, roughness: .96 });
const fenceDark = new THREE.MeshStandardMaterial({ color: 0x5d3d2b, roughness: .98 });
const validMaterial = new THREE.MeshBasicMaterial({ color: 0x91d55e, transparent: true, opacity: .72, depthWrite: false });
const invalidMaterial = new THREE.MeshBasicMaterial({ color: 0xe36d63, transparent: true, opacity: .76, depthWrite: false });

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

export function createCattleBarnVisual() {
  const group = new THREE.Group();
  const spring = new THREE.Group();
  const shell = new THREE.Group();
  const redMaterial = barnRed.clone();
  const darkMaterial = barnDark.clone();
  const creamMaterial = barnCream.clone();
  group.name = 'cattle-barn';
  group.add(spring);
  spring.add(shell);
  const foundation = box(2.65, .16, 2.05, darkMaterial); foundation.position.y = .08; shell.add(foundation);
  const body = box(2.45, 1.65, 1.85, redMaterial); body.position.y = .9; shell.add(body);
  const roofLeft = box(1.68, .16, 2.22, creamMaterial); roofLeft.position.set(-.62, 1.94, 0); roofLeft.rotation.z = -.48; shell.add(roofLeft);
  const roofRight = roofLeft.clone(); roofRight.position.x = .62; roofRight.rotation.z = .48; shell.add(roofRight);
  const doorway = box(1.02, 1.18, .08, darkMaterial); doorway.position.set(0, .65, 0.965); shell.add(doorway);
  const trim = box(1.24, .12, .12, creamMaterial); trim.position.set(0, 1.3, 1.0); shell.add(trim);
  const hay = box(.58, .42, .38, mats.bale); hay.position.set(-.82, .3, 1.12); shell.add(hay);
  const milkCan = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .52, 10), mats.metal);
  milkCan.position.set(.86, .3, 1.08); milkCan.castShadow = true; shell.add(milkCan);
  const ringMaterial = validMaterial.clone();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.75, 32), ringMaterial);
  ring.rotation.x = -Math.PI * .5; ring.position.y = .02; ring.visible = false; group.add(ring);
  let dragging = false, valid = true, droppedAt = null;
  const updateAppearance = () => {
    ringMaterial.color.copy((valid ? validMaterial : invalidMaterial).color);
    for (const material of [redMaterial, darkMaterial, creamMaterial]) {
      material.transparent = dragging;
      material.opacity = dragging ? .7 : 1;
    }
  };
  return {
    group,
    setDragging(nextValid) { dragging = true; valid = nextValid; ring.visible = true; updateAppearance(); },
    setSelected(nextSelected) { if (!dragging) ring.visible = nextSelected; },
    setPenComplete() {},
    drop() { dragging = false; valid = true; droppedAt = null; updateAppearance(); },
    settle() { dragging = false; valid = true; updateAppearance(); },
    animate(elapsed, active) {
      if (dragging || active) {
        spring.position.y = .12 + Math.sin(elapsed * 16) * .025;
        spring.rotation.z = Math.sin(elapsed * 13) * .025;
        return;
      }
      if (droppedAt === null) droppedAt = elapsed;
      const age = elapsed - droppedAt;
      const bounce = age < .7 ? Math.sin(age * 19) * Math.exp(-age * 5) : 0;
      spring.position.y = 0; spring.rotation.z = 0;
      spring.scale.set(1 - bounce * .08, 1 + bounce * .18, 1 - bounce * .08);
    },
  };
}

export function createPenVisual(geometry, levelY, building, editing = false) {
  const group = new THREE.Group();
  group.name = `${building.id}-pen`;
  const parts = [];
  const fenceSegmentGroup = (a, b) => {
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    const segmentGroup = new THREE.Group();
    segmentGroup.position.set((a.x + b.x) * .5, levelY, (a.z + b.z) * .5);
    if (!horizontal) segmentGroup.rotation.y = Math.PI * .5;
    const posts = Math.max(1, Math.round(length / TILE));
    for (let postIndex = 0; postIndex <= posts; postIndex++) {
      const post = box(.12, .82, .12, fenceDark);
      post.position.set(-length * .5 + postIndex / posts * length, .41, 0);
      segmentGroup.add(post);
    }
    for (const y of [.3, .62]) {
      const rail = box(length, .1, .1, fenceWood); rail.position.y = y; segmentGroup.add(rail);
    }
    return { segmentGroup, horizontal, length };
  };
  geometry.segments.forEach((segment, index) => {
    const a = cornerToWorld(segment.a), b = cornerToWorld(segment.b);
    const { segmentGroup, length } = fenceSegmentGroup(a, b);
    segmentGroup.userData.building = building;
    segmentGroup.userData.penPart = { type: 'segment', index };
    const hit = box(length + .28, 1.05, .62, validMaterial, false, false);
    hit.material = hit.material.clone(); hit.material.opacity = 0; hit.visible = editing;
    hit.position.y = .48;
    hit.userData.building = building;
    hit.userData.penPart = { type: 'segment', index };
    segmentGroup.add(hit);
    group.add(segmentGroup);
    parts.push(hit);
  });
  for (const connector of barnPenConnectorSegments(building.site)) {
    group.add(fenceSegmentGroup(connector.a, connector.b).segmentGroup);
  }
  const handleHits = [];
  const handles = geometry.vertices.map((vertex, index) => {
    const world = cornerToWorld(vertex);
    const fixed = index === 0 || index === geometry.vertices.length - 1;
    const handle = new THREE.Mesh(new THREE.SphereGeometry(fixed ? .2 : .27, 12, 9), (fixed ? fenceDark : validMaterial).clone());
    handle.position.set(world.x, levelY + .92, world.z);
    handle.visible = editing;
    handle.userData.building = building;
    handle.userData.penPart = { type: 'corner', index };
    group.add(handle);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.44, 10, 8), validMaterial.clone());
    hit.material.opacity = 0;
    hit.visible = editing;
    hit.position.copy(handle.position);
    hit.userData.building = building;
    hit.userData.penPart = { type: 'corner', index };
    group.add(hit);
    handleHits.push(hit);
    return handle;
  });
  return { group, parts, handles, setEditing(enabled) { [...parts, ...handles, ...handleHits].forEach(part => { part.visible = enabled; }); } };
}

export function createPenGateVisual(site) {
  const group = new THREE.Group();
  group.name = 'barn-pen-gate-cue';
  group.position.set(site.x, site.y, site.z);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xb9f36d, transparent: true, opacity: .38, depthWrite: false });
  const doorMaterial = new THREE.MeshBasicMaterial({ color: 0xd9ff83, transparent: true, opacity: .9, depthWrite: false });
  const paneMaterial = doorMaterial.clone();
  paneMaterial.opacity = .2;
  const gx = Math.round(site.x / TILE), gz = Math.round(site.z / TILE) + 2;
  for (const dx of [-1, 0, 1]) {
    const tile = box(TILE * .88, .025, TILE * .88, groundMaterial, false, false);
    tile.position.set((gx + dx) * TILE - site.x, .035, gz * TILE - site.z);
    group.add(tile);
  }
  const path = box(.72, .03, 1.02, groundMaterial, false, false);
  path.position.set(0, .045, 1.48);
  group.add(path);
  const door = new THREE.Group();
  door.position.set(0, 0, 1.025);
  const pane = box(1.05, 1.22, .025, paneMaterial, false, false);
  pane.position.y = .66;
  door.add(pane);
  for (const x of [-.58, .58]) {
    const side = box(.09, 1.38, .055, doorMaterial, false, false);
    side.position.set(x, .69, .015);
    door.add(side);
  }
  const top = box(1.25, .09, .055, doorMaterial, false, false);
  top.position.set(0, 1.38, .015);
  door.add(top);
  const beacon = new THREE.Mesh(new THREE.TorusGeometry(.3, .075, 8, 20), doorMaterial);
  beacon.rotation.x = Math.PI * .5;
  beacon.position.set(0, 1.72, .16);
  door.add(beacon);
  group.add(door);
  return {
    group,
    animate(elapsed) {
      const pulse = Math.sin(elapsed * 4) * .5 + .5;
      groundMaterial.opacity = .32 + pulse * .28;
      doorMaterial.opacity = .7 + pulse * .3;
      paneMaterial.opacity = .14 + pulse * .2;
      door.scale.setScalar(1 + pulse * .035);
    },
  };
}

export function createPenLassoPreview(samples, result, levelY) {
  const group = new THREE.Group();
  group.name = 'pen-lasso-preview';
  const addTiles = (tiles, material) => {
    for (const entry of tiles || []) {
      const gx = entry.gx ?? entry.tile?.gx;
      const gz = entry.gz ?? entry.tile?.gz;
      if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
      const tile = box(TILE * .86, .02, TILE * .86, material, false, false);
      tile.position.set(gx * TILE, finite(entry.topY ?? entry.tile?.topY, levelY) + .045, gz * TILE);
      group.add(tile);
    }
  };
  const selectedMaterial = validMaterial.clone(); selectedMaterial.opacity = .28;
  const trimmedMaterial = invalidMaterial.clone(); trimmedMaterial.color.setHex(0xd89343); trimmedMaterial.opacity = .3;
  addTiles(result?.selectedTiles, selectedMaterial);
  addTiles(result?.trimmedTiles, trimmedMaterial);
  if (samples.length > 1) {
    const points = samples.map(sample => new THREE.Vector3(sample.x, levelY + .12, sample.z));
    points.push(points[0].clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: result?.valid ? 0x7eb650 : 0xd45d52, transparent: true, opacity: .9 }),
    );
    group.add(line);
  }
  if (result?.valid) group.add(createPenPreview(result.vertices, levelY, true));
  return group;
}

export function createPenPreview(vertices, levelY, valid = false) {
  const group = new THREE.Group();
  const material = (valid ? validMaterial : invalidMaterial).clone();
  for (let index = 0; index < vertices.length - 1; index++) {
    const a = cornerToWorld(vertices[index]), b = cornerToWorld(vertices[index + 1]);
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    if (!length) continue;
    const rail = box(horizontal ? length : .13, .13, horizontal ? .13 : length, material, false, false);
    rail.position.set((a.x + b.x) * .5, levelY + .48, (a.z + b.z) * .5);
    group.add(rail);
  }
  return group;
}

export function createCowVisual(stage = 'adult') {
  const group = new THREE.Group();
  const body = box(1.02, .58, .58, cowWhite); body.position.y = .7; group.add(body);
  const patch = box(.35, .6, .6, cowBrown); patch.position.set(-.22, .71, 0); group.add(patch);
  const head = box(.48, .46, .48, cowBrown); head.position.set(0, .77, -.47); group.add(head);
  const muzzle = box(.36, .22, .25, cowMuzzle); muzzle.position.set(0, .65, -.78); group.add(muzzle);
  const legs = [];
  for (const [x, z, phase] of [[-.34, -.2, 0], [.34, -.2, Math.PI], [-.34, .2, Math.PI], [.34, .2, 0]]) {
    const leg = box(.12, .48, .12, cowDark); leg.position.set(x, .28, z); leg.userData.phase = phase; group.add(leg); legs.push(leg);
  }
  for (const x of [-.28, .28]) {
    const ear = box(.22, .09, .13, cowBrown); ear.position.set(x, 1.0, -.48); group.add(ear);
  }
  const tail = box(.08, .52, .08, cowBrown); tail.position.set(0, .61, .43); tail.rotation.x = -.25; group.add(tail);
  const setStage = nextStage => {
    group.userData.stage = nextStage;
    group.scale.setScalar(nextStage === 'calf' ? .62 : 1);
  };
  setStage(stage);
  return {
    group,
    setStage,
    animate(elapsed, moving) {
      body.position.y = .7 + Math.sin(elapsed * (moving ? 7 : 2.1) + group.id) * (moving ? .025 : .012);
      legs.forEach(leg => { leg.rotation.x = moving ? Math.sin(elapsed * 7 + leg.userData.phase) * .28 : 0; });
      head.rotation.x = moving ? 0 : Math.sin(elapsed * 1.4 + group.id) * .1;
      tail.rotation.z = Math.sin(elapsed * 2.3 + group.id) * .18;
    },
  };
}

export function normalizeCattleBarnState(saved, context = {}) {
  const vertices = Array.isArray(saved?.pen?.vertices) ? saved.pen.vertices.map(vertex => ({ cx: integer(vertex?.cx), cz: integer(vertex?.cz) })) : null;
  const animals = Array.isArray(saved?.animals) ? saved.animals.flatMap((animal, index) => {
    if (!animal || (animal.stage !== 'adult' && animal.stage !== 'calf')) return [];
    return [{
      id: typeof animal.id === 'string' ? animal.id : `cow-${index + 1}`,
      stage: animal.stage,
      age: animal.stage === 'calf' ? Math.max(0, finite(animal.age)) : 0,
      tileKey: typeof animal.tileKey === 'string' ? animal.tileKey : null,
      targetTileKey: typeof animal.targetTileKey === 'string' ? animal.targetTileKey : null,
      moveProgress: THREE.MathUtils.clamp(finite(animal.moveProgress), 0, 1),
      heading: finite(animal.heading),
      idleSeconds: Math.max(0, finite(animal.idleSeconds)),
      jitterX: finite(animal.jitterX, ((index * 37) % 11 - 5) * .025),
      jitterZ: finite(animal.jitterZ, ((index * 53) % 13 - 6) * .022),
      visual: null,
    }];
  }) : [];
  return {
    pen: vertices?.length >= 4 ? { vertices: removeCollinearVertices(vertices) } : null,
    hayLitres: THREE.MathUtils.clamp(finite(saved?.hayLitres), 0, BARN_HAY_CAPACITY),
    milkLitres: THREE.MathUtils.clamp(finite(saved?.milkLitres), 0, BARN_MILK_CAPACITY),
    birthProgress: THREE.MathUtils.clamp(finite(saved?.birthProgress), 0, BIRTH_INTERVAL_SECONDS),
    starterCowsGranted: Boolean(saved?.starterCowsGranted),
    animals,
    nextCowId: Math.max(1, ...animals.map(animal => integer(animal.id.match(/^cow-(\d+)$/)?.[1], 0) + 1)),
    context,
  };
}

function nearestValidTile(building, tileKey = null) {
  const tiles = building.derived?.tiles || [];
  if (!tiles.length) return null;
  const [gx, gz] = String(tileKey || '').split(',').map(Number);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return tiles[0];
  return [...tiles].sort((a, b) => Math.hypot(a.gx - gx, a.gz - gz) - Math.hypot(b.gx - gx, b.gz - gz))[0];
}

export function reconcileCattleBarnAnimals(building, context = {}) {
  if (!building.derived?.valid) return;
  for (const animal of building.animals) {
    let relocated = false;
    if (!building.derived.tileSet.has(animal.tileKey)) {
      const tile = nearestValidTile(building, animal.tileKey);
      animal.tileKey = gridKey(tile.gx, tile.gz);
      relocated = true;
    }
    const [gx, gz] = animal.tileKey.split(',').map(Number);
    const [tx, tz] = String(animal.targetTileKey || '').split(',').map(Number);
    if (relocated || !building.derived.tileSet.has(animal.targetTileKey) || Math.abs(gx - tx) + Math.abs(gz - tz) !== 1) {
      animal.targetTileKey = null;
      animal.moveProgress = 0;
    }
    if (!animal.visual) {
      animal.visual = createCowVisual(animal.stage);
      context.parent?.add(animal.visual.group);
    }
  }
}

function newCalf(building, context) {
  const adult = building.animals.find(animal => animal.stage === 'adult');
  const tile = nearestValidTile(building, adult?.tileKey);
  const animal = {
    id: `cow-${building.nextCowId++}`, stage: 'calf', age: 0,
    tileKey: gridKey(tile.gx, tile.gz), targetTileKey: null, moveProgress: 0,
    heading: 0, idleSeconds: 1.2, jitterX: .08, jitterZ: -.06, visual: null,
  };
  building.animals.push(animal);
  reconcileCattleBarnAnimals(building, context);
}

export function updateCattleBarn(building, dt, elapsed, context = {}) {
  if (!building.pen || !building.derived?.valid) return;
  reconcileCattleBarnAnimals(building, context);
  const adults = building.animals.filter(animal => animal.stage === 'adult').length;
  const calves = building.animals.length - adults;
  const hayFed = building.hayLitres > 0;
  const feedRate = adults * HAY_LITRES_PER_ADULT_SECOND + calves * HAY_LITRES_PER_ADULT_SECOND * CALF_HAY_FACTOR;
  building.hayLitres = THREE.MathUtils.clamp(building.hayLitres - Math.min(building.hayLitres, feedRate * dt), 0, BARN_HAY_CAPACITY);
  const productionFactor = hayFed ? 1 : GRAZING_MILK_FACTOR;
  building.milkLitres = THREE.MathUtils.clamp(building.milkLitres + adults * MILK_LITRES_PER_ADULT_SECOND * productionFactor * dt, 0, BARN_MILK_CAPACITY);
  if (adults >= 2 && building.animals.length < building.derived.capacity && building.hayLitres > 0) {
    building.birthProgress += dt;
    if (building.birthProgress >= BIRTH_INTERVAL_SECONDS) {
      building.birthProgress -= BIRTH_INTERVAL_SECONDS;
      newCalf(building, context);
      context.onChange?.();
    }
  }
  for (const animal of building.animals) {
    if (animal.stage === 'calf') {
      animal.age += dt;
      if (animal.age >= CALF_GROWTH_SECONDS) {
        animal.stage = 'adult'; animal.age = 0; animal.visual?.setStage('adult'); context.onChange?.();
      }
    }
    const current = context.terrain?.get(animal.tileKey) || nearestValidTile(building, animal.tileKey);
    let moving = Boolean(animal.targetTileKey);
    if (!moving) {
      animal.idleSeconds -= dt;
      if (animal.idleSeconds <= 0) {
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dz]) => gridKey(current.gx + dx, current.gz + dz))
          .filter(key => building.derived.tileSet.has(key));
        if (neighbors.length) {
          const choice = Math.abs(Math.floor(Math.sin(elapsed * 1.73 + animal.id.length * 9 + animal.heading) * 10000)) % neighbors.length;
          animal.targetTileKey = neighbors[choice]; animal.moveProgress = 0; moving = true;
        }
        else animal.idleSeconds = 1.4;
      }
    }
    const target = animal.targetTileKey ? context.terrain?.get(animal.targetTileKey) : null;
    let x = current.x, z = current.z;
    if (target) {
      const distance = Math.max(.001, Math.hypot(target.x - current.x, target.z - current.z));
      animal.moveProgress += dt * (animal.stage === 'calf' ? .55 : .45) / distance;
      const amount = Math.min(1, animal.moveProgress);
      x = THREE.MathUtils.lerp(current.x, target.x, amount);
      z = THREE.MathUtils.lerp(current.z, target.z, amount);
      const desired = Math.atan2(-(target.x - current.x), -(target.z - current.z));
      const delta = Math.atan2(Math.sin(desired - animal.heading), Math.cos(desired - animal.heading));
      animal.heading += delta * (1 - Math.exp(-8 * dt));
      if (amount >= 1) {
        animal.tileKey = animal.targetTileKey; animal.targetTileKey = null; animal.moveProgress = 0;
        animal.idleSeconds = .6 + (Math.abs(Math.sin(elapsed + animal.id.length)) * 1.9); moving = false;
      }
    }
    if (animal.visual) {
      animal.visual.group.position.set(x + animal.jitterX, current.topY + .02, z + animal.jitterZ);
      animal.visual.group.rotation.y = animal.heading;
      animal.visual.animate(elapsed, moving);
    }
  }
}
