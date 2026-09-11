import { finishPreparation } from '../../core/preparation.js';
import { TILE, gridKey } from '../../core/shared.js';
import { routeLength } from './attachment-route.js';

// Tune these independently of interaction, animation, physics and persistence.
export const ATTACHMENT_RULES = Object.freeze({
  range: 15 * TILE,
  passingClearance: 5.5 * TILE,
  // Five tile centers leave exactly four tiles between the facing edges.
  bridgeMin: 5,
  bridgeMax: 5,
  multipleNeighbors: 10000,
  enclosingSides: 1800,
  shoreContact: 12,
  boundsGrowth: 6,
  centerDistance: 2,
  approachDistance: 100,
  approachSlack: 2 * TILE,
});
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const boundaryTiles = terrain => [...terrain.values()].filter(tile =>
  directions.some(([dx, dz]) => !terrain.has(gridKey(tile.gx + dx, tile.gz + dz))));
const clear = tile => tile && !tile.water && !tile.hasTree && !tile.reserved;

export function findAttachmentPlacement(...args) {
  return finishPreparation(placementSteps(...args));
}

function* placementSteps(incoming, terrain, bridgeBlocks = [], rules = ATTACHMENT_RULES, routeTo = null) {
  if (!incoming.size || !terrain.size) return null;
  const local = [...incoming.values()];
  const existing = [...terrain.values()];
  const shore = boundaryTiles(terrain);
  const incomingShore = boundaryTiles(incoming);
  const minX = Math.min(...existing.map(t => t.gx)), maxX = Math.max(...existing.map(t => t.gx));
  const minZ = Math.min(...existing.map(t => t.gz)), maxZ = Math.max(...existing.map(t => t.gz));
  const localMinX = Math.min(...local.map(t => t.gx)), localMaxX = Math.max(...local.map(t => t.gx));
  const localMinZ = Math.min(...local.map(t => t.gz)), localMaxZ = Math.max(...local.map(t => t.gz));
  const forbidden = new Set();
  // Enforce the stop distance along the entire irregular shore, not just
  // between the two bridge sockets. Measure the nearest tile edges.
  const clearance = rules.bridgeMin - 1;
  const clearanceOffsets = [];
  for (let dx = -Math.ceil(clearance); dx <= Math.ceil(clearance); dx++) {
    for (let dz = -Math.ceil(clearance); dz <= Math.ceil(clearance); dz++) {
      if (Math.hypot(Math.max(0, Math.abs(dx) - 1), Math.max(0, Math.abs(dz) - 1)) < clearance) {
        clearanceOffsets.push([dx, dz]);
      }
    }
  }
  for (const tile of existing) {
    yield;
    for (const [dx, dz] of clearanceOffsets) forbidden.add(gridKey(tile.gx + dx, tile.gz + dz));
  }
  for (const block of bridgeBlocks) {
    const radius = Math.hypot(block.width, block.depth) / (2 * TILE) + 1;
    for (let x = Math.floor(block.x / TILE - radius); x <= Math.ceil(block.x / TILE + radius); x++) {
      for (let z = Math.floor(block.z / TILE - radius); z <= Math.ceil(block.z / TILE + radius); z++) forbidden.add(gridKey(x, z));
    }
  }
  const sockets = new Map();
  for (const from of shore) {
    yield;
    if (!clear(from)) continue;
    for (const [dx, dz] of directions) {
      // Two-tile-wide, level, clear bridge landing on both shores.
      if (![-1, 1].some(side => {
        const beside = terrain.get(gridKey(from.gx - dz * side, from.gz + dx * side));
        return clear(beside) && Math.abs(beside.topY - from.topY) < .1;
      })) continue;
      for (let distance = rules.bridgeMin; distance <= rules.bridgeMax; distance++) {
        let open = true;
        for (let step = 1; step < distance; step++) {
          for (let side = -1; side <= 1; side++) {
            if (terrain.has(gridKey(from.gx + dx * step - dz * side, from.gz + dz * step + dx * side))) open = false;
          }
        }
        if (!open) break;
        const key = gridKey(from.gx + dx * distance, from.gz + dz * distance);
        if (!sockets.has(key)) sockets.set(key, []);
        sockets.get(key).push({ from, dx, dz, distance });
      }
    }
  }
  let best = null;
  const candidates = [];
  const seen = new Set();
  for (const to of incomingShore) {
    if (!clear(to)) continue;
    for (const [key] of sockets) {
      yield;
      const [sx, sz] = key.split(',').map(Number);
      const gx = sx - to.gx, gz = sz - to.gz;
      const poseKey = gridKey(gx, gz);
      if (seen.has(poseKey)) continue;
      seen.add(poseKey);
      if (local.some(tile => forbidden.has(gridKey(tile.gx + gx, tile.gz + gz)))) continue;
      const neighbors = new Map();
      const sides = new Set();
      let contacts = 0;
      for (const end of incomingShore) {
        if (!clear(end)) continue;
        for (const socket of sockets.get(gridKey(end.gx + gx, end.gz + gz)) || []) {
          if (Math.abs(socket.from.topY - end.topY) > .5) continue;
          const { dx, dz, distance } = socket;
          if (![-1, 1].some(side => {
            const beside = incoming.get(gridKey(end.gx - dz * side, end.gz + dx * side));
            return clear(beside) && Math.abs(beside.topY - end.topY) < .1;
          })) continue;
          let open = true;
          for (let step = 1; step < distance; step++) for (let side = -1; side <= 1; side++) {
            if (incoming.has(gridKey(end.gx - dx * step - dz * side, end.gz - dz * step + dx * side))) open = false;
          }
          if (!open) continue;
          contacts++;
          sides.add(`${dx},${dz}`);
          const previous = neighbors.get(socket.from.islandId);
          if (!previous || distance < previous.centerDistance / TILE) neighbors.set(socket.from.islandId, {
            from: socket.from, to: { ...end, gx: end.gx + gx, gz: end.gz + gz, x: (end.gx + gx) * TILE, z: (end.gz + gz) * TILE },
            distance: (distance - 1) * TILE, centerDistance: distance * TILE,
          });
        }
      }
      if (!neighbors.size) continue;
      const area = (Math.max(maxX, localMaxX + gx) - Math.min(minX, localMinX + gx) + 1)
        * (Math.max(maxZ, localMaxZ + gz) - Math.min(minZ, localMinZ + gz) + 1);
      const growth = area - (maxX - minX + 1) * (maxZ - minZ + 1);
      const distance = Math.hypot(gx - (minX + maxX) / 2, gz - (minZ + maxZ) / 2);
      const score = (neighbors.size - 1) * rules.multipleNeighbors + (sides.size - 1) * rules.enclosingSides
        + contacts * rules.shoreContact - growth * rules.boundsGrowth - distance * rules.centerDistance;
      const candidate = { gx, gz, x: gx * TILE, y: 0, z: gz * TILE, score, gaps: [...neighbors.values()], growth, sides: sides.size };
      if (routeTo) candidates.push(candidate);
      if (!best || score > best.score) best = candidate;
    }
  }
  if (routeTo?.collect) return candidates;
  if (!routeTo) return best;
  // Compactness may break ties between nearby routes, but must never buy a
  // long tow to a remote island. Straight-line bounds prune the local search.
  const penalty = (rules.approachDistance ?? 100) / TILE;
  const slack = rules.approachSlack ?? 2 * TILE;
  for (const candidate of candidates) {
    candidate.compactScore = candidate.score;
    candidate.minimumDistance = routeTo.minimumDistance?.(candidate) ?? 0;
  }
  let nearestDistance = Infinity;
  const routed = [];
  for (const candidate of candidates.sort((a, b) => a.minimumDistance - b.minimumDistance || b.score - a.score)) {
    if (candidate.minimumDistance > nearestDistance + slack) break;
    const route = routeTo(candidate);
    if (!route) continue;
    const approachDistance = routeLength(route);
    nearestDistance = Math.min(nearestDistance, approachDistance);
    const score = candidate.compactScore - approachDistance * penalty;
    routed.push({ ...candidate, score, approachDistance, route });
  }
  return routed.filter(candidate => candidate.approachDistance <= nearestDistance + slack)
    .sort((a, b) => b.score - a.score || a.approachDistance - b.approachDistance)[0] ?? null;
}

export function canReleaseIsland(id, islands, connections, rootId = 'island-0') {
  if (id === rootId || id === 'island-1' || ![...islands].some(island => island.id === id && island.status === 'attached')) return false;
  const retained = [...islands].filter(island => island.id !== id && island.status === 'attached');
  const visited = new Set([rootId]);
  const queue = [rootId];
  for (let index = 0; index < queue.length; index++) {
    for (const edge of connections) {
      if (edge.status !== 'attached') continue;
      const a = edge.from.islandId, b = edge.to.islandId;
      if (a === id || b === id) continue;
      const next = a === queue[index] ? b : b === queue[index] ? a : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return retained.every(island => visited.has(island.id));
}

export function attachmentCandidates(incoming, terrain, bridges = [], rules = ATTACHMENT_RULES) {
  return findAttachmentPlacement(incoming, terrain, bridges, rules, { collect: true });
}

export function* attachmentCandidateSteps(incoming, terrain, bridges = [], rules = ATTACHMENT_RULES) {
  return yield* placementSteps(incoming, terrain, bridges, rules, { collect: true });
}
