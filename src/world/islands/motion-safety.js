import { THREE, TILE, LAYER_DEPTH } from '../../core/shared.js';
import { routeReservationBoxes, reservationsOverlap } from './route-reservations.js';

export const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });
export const ZERO_VELOCITY = ORIGIN;
const EPSILON = .00001;
const CELL = 8 * TILE;
const boxOf = (x, y, z, width, height, depth) => ({
  minX: x - width / 2, maxX: x + width / 2, minY: y - height / 2, maxY: y + height / 2,
  minZ: z - depth / 2, maxZ: z + depth / 2,
});
export const translateBox = (box, p) => ({ minX: box.minX + p.x, maxX: box.maxX + p.x,
  minY: box.minY + (p.y || 0), maxY: box.maxY + (p.y || 0), minZ: box.minZ + p.z, maxZ: box.maxZ + p.z });
export function unionBoxes(boxes) {
  const result = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (const box of boxes) for (const axis of ['X', 'Y', 'Z']) {
    result[`min${axis}`] = Math.min(result[`min${axis}`], box[`min${axis}`]);
    result[`max${axis}`] = Math.max(result[`max${axis}`], box[`max${axis}`]);
  }
  return result;
}
export function sweptBounds(box, displacement, margin = 0) {
  const result = { ...box };
  for (const [axis, key] of [['X', 'x'], ['Y', 'y'], ['Z', 'z']]) {
    result[`min${axis}`] += Math.min(0, displacement[key] || 0) - margin;
    result[`max${axis}`] += Math.max(0, displacement[key] || 0) + margin;
  }
  return result;
}
// Continuous slab intersection over normalized time, including relative motion.
export function sweptIntersection(a, b, delta, margin = 0) {
  let enter = 0, leave = 1;
  for (const [axis, key] of [['X', 'x'], ['Y', 'y'], ['Z', 'z']]) {
    const low = b[`min${axis}`] - a[`max${axis}`] - margin + EPSILON;
    const high = b[`max${axis}`] - a[`min${axis}`] + margin - EPSILON;
    const speed = delta[key] || 0;
    if (Math.abs(speed) < EPSILON) { if (low >= 0 || high <= 0) return false; }
    else {
      const t0 = low / speed, t1 = high / speed;
      enter = Math.max(enter, Math.min(t0, t1));
      leave = Math.min(leave, Math.max(t0, t1));
      if (enter > leave) return false;
    }
  }
  return enter <= leave;
}

export function terrainBoxes(terrain) {
  return [...terrain.values()].map(tile => ({ ...boxOf(tile.x, (tile.topY + tile.baseY - 1) / 2, tile.z,
    TILE, tile.topY - tile.baseY + 1, TILE), islandId: tile.islandId, isTerrain: true }));
}
export function blockBoxes(blocks = []) {
  return blocks.map(block => {
    let width = block.width || TILE, height = block.height || LAYER_DEPTH, depth = block.depth || TILE;
    if (block.rotation || block.yaw) {
      const yaw = block.yaw || 0;
      const q = block.rotation || { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
      const e = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).elements;
      const w = width, h = height, d = depth;
      width = Math.abs(e[0]) * w + Math.abs(e[4]) * h + Math.abs(e[8]) * d;
      height = Math.abs(e[1]) * w + Math.abs(e[5]) * h + Math.abs(e[9]) * d;
      depth = Math.abs(e[2]) * w + Math.abs(e[6]) * h + Math.abs(e[10]) * d;
    }
    return { ...boxOf(block.x, block.y, block.z, width, height, depth), islandId: block.islandId, source: block };
  });
}

export function obstacleBoxes(obstacles = []) {
  return obstacles.map(o => {
    const c = Math.abs(Math.cos(o.yaw || 0)), s = Math.abs(Math.sin(o.yaw || 0));
    const w = o.width || o.radius * 2, d = o.depth || o.radius * 2;
    return { ...boxOf(o.x, o.y + o.height / 2, o.z, c * w + s * d, o.height, s * w + c * d), islandId: o.islandId };
  });
}

// Cache conservative voxel columns. Unlike one bounding box this retains bays.
function columnsOf(boxes) {
  const columns = new Map();
  for (const box of boxes) {
    if (![box.minX, box.maxX, box.minY, box.maxY, box.minZ, box.maxZ].every(Number.isFinite)) continue;
    for (let x = Math.floor(box.minX / TILE + .5); x < Math.ceil(box.maxX / TILE + .5 - EPSILON); x++) {
      for (let z = Math.floor(box.minZ / TILE + .5); z < Math.ceil(box.maxZ / TILE + .5 - EPSILON); z++) {
        const key = `${x},${z}`;
        const old = columns.get(key);
        if (old) { old.minY = Math.min(old.minY, box.minY); old.maxY = Math.max(old.maxY, box.maxY); }
        else columns.set(key, { minX: (x - .5) * TILE, maxX: (x + .5) * TILE,
          minZ: (z - .5) * TILE, maxZ: (z + .5) * TILE, minY: box.minY, maxY: box.maxY });
      }
    }
  }
  return [...columns.values()];
}

export function solidVisualBoxes(group, relativeTo = group, skipBuildings = false) {
  const boxes = [];
  group.updateWorldMatrix(true, true);
  relativeTo.updateWorldMatrix(true, false);
  const inverse = relativeTo.matrixWorld.clone().invert();
  const matrix = new THREE.Matrix4(), instance = new THREE.Matrix4();
  const box = new THREE.Box3();
  const visit = object => {
    if (skipBuildings && /^(silo|cattle-barn|barn-pen|pen-lasso)/.test(object.name)) return;
    if (object !== group && /^(water|passing-islands|island-placement-ghost|connection-chains|drifting-island-)/.test(object.name)) return;
    if (object.isMesh && !/^(terrain-|lower-layers-|ground-|tall-grass|crop|furrow)/.test(object.name)
      && !object.userData.isAttachmentGhost && object.renderOrder !== 90) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (!materials.some(m => m.isShaderMaterial)) {
        object.geometry.computeBoundingBox();
        for (let i = 0; i < (object.isInstancedMesh ? object.count : 1); i++) {
          matrix.multiplyMatrices(inverse, object.matrixWorld);
          if (object.isInstancedMesh) { object.getMatrixAt(i, instance); matrix.multiply(instance); }
          box.copy(object.geometry.boundingBox).applyMatrix4(matrix);
          // Includes the modest authored tree sway, without a huge decorative radius.
          boxes.push({ minX: box.min.x - .5, maxX: box.max.x + .5, minY: box.min.y - .1,
            maxY: box.max.y + .5, minZ: box.min.z - .5, maxZ: box.max.z + .5 });
        }
      }
    }
    for (const child of object.children) visit(child);
  };
  visit(group);
  return boxes;
}
export function createEnvelope(island) {
  const boxes = columnsOf([...terrainBoxes(island.terrain), ...blockBoxes(island.lowerBlocks),
    ...obstacleBoxes(island.obstacles), ...solidVisualBoxes(island.group), ...(island.extraMotionBoxes || [])]);
  return { boxes, bounds: unionBoxes(boxes) };
}

export function envelopesIntersect(a, pa, da, b, pb, db = ORIGIN, margin = 0) {
  const relative = { x: da.x - db.x, y: (da.y || 0) - (db.y || 0), z: da.z - db.z };
  if (!sweptIntersection(translateBox(a.bounds, pa), translateBox(b.bounds, pb), relative, margin)) return false;
  for (const boxA of a.boxes) {
    const worldA = translateBox(boxA, pa);
    if (!sweptIntersection(worldA, translateBox(b.bounds, pb), relative, margin)) continue;
    for (const boxB of b.boxes) if (sweptIntersection(worldA, translateBox(boxB, pb), relative, margin)) return true;
  }
  return false;
}

export function createMotionSafety(getFixed) {
  let fixed = [], fixedBounds = null, index = new Map(), signature = '', revision = 0;
  const envelopes = new WeakMap();
  const reservations = new Map();
  const cells = bounds => {
    const result = [];
    for (let x = Math.floor(bounds.minX / CELL); x <= Math.floor(bounds.maxX / CELL); x++) {
      for (let z = Math.floor(bounds.minZ / CELL); z <= Math.floor(bounds.maxZ / CELL); z++) result.push(`${x},${z}`);
    }
    return result;
  };
  const refresh = () => {
    const data = getFixed();
    const key = `${data.terrain.size}:${data.lowerBlocks.length}:${data.obstacles.length}:${data.bridgeBlocks.length}:${revision}`;
    if (key === signature) return;
    signature = key;
    fixed = [...terrainBoxes(data.terrain), ...blockBoxes(data.lowerBlocks), ...obstacleBoxes(data.obstacles),
      ...blockBoxes(data.bridgeBlocks), ...(typeof data.visualBoxes === 'function' ? data.visualBoxes() : data.visualBoxes || [])];
    fixedBounds = unionBoxes(fixed);
    index = new Map();
    for (const box of fixed) for (const key of cells(box)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(box);
    }
  };
  const envelope = island => {
    if (!envelopes.has(island)) envelopes.set(island, createEnvelope(island));
    return envelopes.get(island);
  };
  // Distant decoration does not need interlocking bays. Reserve its full solid
  // bounds in traffic so neither terrain nor overhanging props can interleave.
  const trafficEnvelope = island => {
    const shape = envelope(island);
    return island.encounter === false ? { boxes: [shape.bounds], bounds: shape.bounds } : shape;
  };
  const reservationFor = (island, route, extras = [], bounds = envelope(island).bounds) => [
    ...routeReservationBoxes(bounds, route, TILE, 2 * TILE),
    ...extras.map(box => sweptBounds(box, ORIGIN, TILE)),
  ];
  const reservationClear = (id, boxes) => [...reservations].every(([otherId, other]) =>
    otherId === id || !reservationsOverlap(boxes, other));
  const clear = (island, from, to, { margin = .1, ignoreId = island.id, reservations: includeReservations = true, ignoreSources = null, traffic = false } = {}) => {
    refresh();
    const shape = traffic ? trafficEnvelope(island) : envelope(island);
    const delta = { x: to.x - from.x, y: (to.y || 0) - (from.y || 0), z: to.z - from.z };
    if (!sweptIntersection(translateBox(shape.bounds, from), fixedBounds, delta, margin) && !reservations.size) return true;
    const candidates = new Set(cells(sweptBounds(translateBox(shape.bounds, from), delta, margin)).flatMap(key => index.get(key) || []));
    if (includeReservations) for (const [id, boxes] of reservations) if (id !== ignoreId) boxes.forEach(box => candidates.add(box));
    for (const obstacle of candidates) {
      if (obstacle.islandId === ignoreId || ignoreSources?.has(obstacle.source)) continue;
      if (!sweptIntersection(translateBox(shape.bounds, from), obstacle, delta, margin)) continue;
      for (const box of shape.boxes) if (sweptIntersection(translateBox(box, from), obstacle, delta, margin)) return false;
    }
    return true;
  };
  return {
    envelope, trafficEnvelope, clear,
    shoreClear(island, from, to, gap = 5.5) {
      refresh();
      const delta = { x: to.x - from.x, y: 0, z: to.z - from.z };
      const shape = envelope(island);
      if (!sweptIntersection(translateBox(shape.bounds, from), fixedBounds, delta, gap)) return true;
      // Flatten each fixed shore tile once per sweep, not once per moving tile.
      const candidates = [...new Set(cells(sweptBounds(translateBox(shape.bounds, from), delta, gap))
        .flatMap(key => index.get(key) || []))]
        .filter(box => box.isTerrain && box.islandId !== island.id)
        .map(box => ({ ...box, minY: -1, maxY: 1 }));
      for (const tile of island.terrain.values()) {
        const a = { minX: tile.x + from.x - TILE / 2, maxX: tile.x + from.x + TILE / 2,
          minZ: tile.z + from.z - TILE / 2, maxZ: tile.z + from.z + TILE / 2, minY: -1, maxY: 1 };
        for (const b of candidates) if (sweptIntersection(a, b, delta, gap)) return false;
      }
      return true;
    },
    invalidate(island) { revision++; if (island) envelopes.delete(island); },
    fixedBounds() { refresh(); return fixedBounds; },
    canReserve(island, route, extras = []) { return reservationClear(island.id, reservationFor(island, route, extras)); },
    reserve(island, route, extras = [], bounds = envelope(island).bounds) {
      const boxes = reservationFor(island, route, extras, bounds);
      if (!reservationClear(island.id, boxes)) return false;
      reservations.set(island.id, boxes);
      return true;
    },
    unreserve(id) { reservations.delete(id); },
    reservationBoxes: () => [...reservations].map(([id, boxes]) => ({ id, boxes: boxes.map(box => ({ ...box })) })),
    routeClear(island, route, options) { return route.slice(1).every((to, i) => clear(island, route[i], to, options)); },
    resolve(records, dt) {
      const result = records.map(record => ({ ...record, velocity: { ...record.velocity }, blocked: null }));
      const movement = record => ({ x: record.velocity.x * dt, y: record.velocity.y * dt, z: record.velocity.z * dt });
      const stop = (record, reason) => { record.velocity = { ...ORIGIN }; record.blocked = reason; };
      for (const record of result) {
        const delta = movement(record);
        const to = { x: record.position.x + delta.x, y: record.position.y + delta.y, z: record.position.z + delta.z };
        if (!clear(record.island, record.position, to)) stop(record, 'Reserved route or retained land');
      }
      // Stopping one member changes relative motion. Repeat until every pair is safe.
      for (let pass = 0; pass <= result.length; pass++) {
        let changed = false;
        for (let a = 0; a < result.length; a++) for (let b = a + 1; b < result.length; b++) {
          const first = result[a], second = result[b];
          if (!envelopesIntersect(trafficEnvelope(first.island), first.position, movement(first),
            trafficEnvelope(second.island), second.position, movement(second), TILE)) continue;
          const lower = (first.priority ?? 2) > (second.priority ?? 2) ? first : second;
          const other = lower === first ? second : first;
          if (Object.values(lower.velocity).some(Boolean)) { stop(lower, `Yielding to ${other.island.id}`); changed = true; }
          if (envelopesIntersect(trafficEnvelope(first.island), first.position, movement(first),
            trafficEnvelope(second.island), second.position, movement(second), TILE)
            && Object.values(other.velocity).some(Boolean)) { stop(other, `Waiting for ${lower.island.id}`); changed = true; }
        }
        if (!changed) break;
      }
      return result;
    },
  };
}

export function boxOfBridge(gap) {
  return { minX: Math.min(gap.from.x, gap.to.x) - 1.5, maxX: Math.max(gap.from.x, gap.to.x) + 1.5,
    minZ: Math.min(gap.from.z, gap.to.z) - 1.5, maxZ: Math.max(gap.from.z, gap.to.z) + 1.5,
    minY: Math.min(gap.from.topY, gap.to.topY) - 1, maxY: Math.max(gap.from.topY, gap.to.topY) + 8 };
}
