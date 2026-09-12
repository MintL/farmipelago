import { TILE, THREE, gridKey } from '../../core/shared.js';
import { createGameBuilding } from '../buildings/game.js';

// Reserve the actual full-size model envelope, including its loading apron.
function footprintTiles(terrain, tile, islandId, bounds) {
  const tiles = [];
  for (let dx = Math.floor(bounds.min.x / TILE + .5); dx <= Math.ceil(bounds.max.x / TILE - .5); dx++) {
    for (let dz = Math.floor(bounds.min.z / TILE + .5); dz <= Math.ceil(bounds.max.z / TILE - .5); dz++) {
      const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      if (!neighbor || neighbor.islandId !== islandId || neighbor.water || neighbor.reserved ||
        Math.abs(neighbor.topY - tile.topY) > .01) return null;
      tiles.push(neighbor);
    }
  }
  return tiles;
}

function pathTo(terrain, islandId, from, to, occupied) {
  const start = gridKey(from.gx, from.gz), end = gridKey(to.gx, to.gz);
  const queue = [start], previous = new Map([[start, null]]);
  for (let index = 0; index < queue.length; index++) {
    const key = queue[index];
    if (key === end) {
      const path = [];
      for (let cursor = end; cursor !== null; cursor = previous.get(cursor)) path.push(terrain.get(cursor));
      return path;
    }
    const tile = terrain.get(key);
    for (const [dx, dz] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const next = gridKey(tile.gx + dx, tile.gz + dz), neighbor = terrain.get(next);
      if (previous.has(next) || occupied.has(next) || !neighbor || neighbor.islandId !== islandId ||
        neighbor.water || Math.abs(neighbor.topY - tile.topY) > .01) continue;
      previous.set(next, key); queue.push(next);
    }
  }
  return null;
}

export function createLegacySettlementVisual({ island, terrain, cargoSite, bridgeLanding, reducedMotion = false }) {
  const group = new THREE.Group();
  group.name = 'settlement';
  const colliders = [];
  const visuals = [];
  const occluders = [];
  const lanternPositions = [];
  const lightSurfaceQuads = [];
  let receivingSite = null;
  const pathTiles = [];
  const candidates = [...terrain.values()].filter(tile => tile.islandId === island.id && !tile.water);
  const storehouse = createGameBuilding('storehouse');
  // Its receiving anchor sits at the front; plan the centered world envelope.
  const storeBounds = storehouse.bounds.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
  storeBounds.translate(new THREE.Vector3(0, 0, 2.8 * TILE));
  const specs = [
    { name: 'settlement-receiving-house', bounds: storeBounds, dx: 0, dz: 3 },
    { name: 'settlement-home-blue', model: 'home-blue', dx: -3, dz: -3 },
    { name: 'settlement-home-red', model: 'home-red', dx: 3, dz: -3 },
  ];
  for (const spec of specs) {
    if (spec.model) spec.visual = createGameBuilding(spec.model);
    spec.bounds ||= spec.visual.bounds;
    spec.sites = candidates.map(tile => {
      const tiles = footprintTiles(terrain, tile, island.id, spec.bounds);
      const entrance = terrain.get(gridKey(tile.gx, tile.gz + Math.ceil(spec.bounds.max.z / TILE + .5)));
      return tiles && entrance && !entrance.water && entrance.islandId === island.id
        ? { tile, tiles, entrance } : null;
    }).filter(Boolean).sort((a, b) =>
      Math.hypot(a.tile.gx - island.cx - spec.dx, a.tile.gz - island.cz - spec.dz) -
      Math.hypot(b.tile.gx - island.cx - spec.dx, b.tile.gz - island.cz - spec.dz));
  }
  // Plan all three together: a greedy first choice can strand a larger neighbour.
  function place(index, chosen, occupied) {
    if (index === specs.length) {
      const paths = chosen.map(site => pathTo(terrain, island.id, site.entrance, bridgeLanding, occupied));
      return paths.every(Boolean) ? { chosen, paths } : null;
    }
    for (const site of specs[index].sites) {
      if (site.tiles.some(tile => occupied.has(gridKey(tile.gx, tile.gz))) ||
        occupied.has(gridKey(site.entrance.gx, site.entrance.gz))) continue;
      const next = new Set(occupied);
      site.tiles.forEach(tile => next.add(gridKey(tile.gx, tile.gz)));
      if (chosen.some(other => next.has(gridKey(other.entrance.gx, other.entrance.gz)))) continue;
      const result = place(index + 1, [...chosen, site], next);
      if (result) return result;
    }
    return null;
  }
  const layout = place(0, [], new Set());
  if (!layout) throw new Error('Settlement requires clear full-size building sites and connected entrances');
  layout.paths.flat().forEach(tile => {
    tile.reserved = true; tile.noDecoration = true;
    if (!pathTiles.includes(tile)) pathTiles.push(tile);
  });
  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index], { tile, tiles } = layout.chosen[index];
    tiles.forEach(ground => { ground.reserved = true; ground.noDecoration = true; });
    if (spec.name === 'settlement-receiving-house') {
      receivingSite = { x: tile.x, y: tile.topY, z: tile.z + TILE * 2.8, outward: { x: 0, z: -1 } };
      continue;
    }
    const visual = spec.visual, building = visual.group;
    building.name = spec.name;
    building.position.set(tile.x, tile.topY, tile.z);
    group.add(building);
    visuals.push(visual);
    occluders.push(building);
    colliders.push(...visual.colliders.map(collider => ({ ...collider, islandId: island.id,
      x: tile.x + collider.x, y: tile.topY + collider.y, z: tile.z + collider.z })));
    lanternPositions.push(...visual.lanternPositions.map(point => point.clone().add(building.position)));

  }

  return {
    group,
    receivingSite,
    storehouseVisual: storehouse,
    colliders,
    occluders,
    lanternPositions,
    lightSurfaceQuads,
    pathTiles,
    animate: elapsed => visuals.forEach(visual => visual.animateAmbient(elapsed)),
  };
}
