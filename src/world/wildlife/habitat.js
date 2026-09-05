import { LEVEL_HEIGHT, TILE, gridKey } from '../../core/shared.js';
import { CARDINAL_STEPS, MIN_REGION_TILES, NORTH_ISLAND_ID, SNOW_LEVEL, STARTER_ISLAND_ID } from './config.js';

function connectedRegions(habitat, minimumTiles) {
  const regions = [];
  const visited = new Set();
  for (const [startKey, start] of habitat) {
    if (visited.has(startKey)) continue;
    const tiles = [];
    const queue = [start];
    visited.add(startKey);
    while (queue.length) {
      const tile = queue.shift();
      tiles.push(tile);
      for (const [dx, dz] of CARDINAL_STEPS) {
        const key = gridKey(tile.gx + dx, tile.gz + dz);
        const neighbor = habitat.get(key);
        if (!neighbor || visited.has(key) || neighbor.islandId !== start.islandId ||
          Math.abs(neighbor.topY - tile.topY) > LEVEL_HEIGHT + .01) continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }
    if (tiles.length >= minimumTiles) {
      regions.push({
        tiles,
        tileSet: new Set(tiles.map(tile => gridKey(tile.gx, tile.gz))),
        islandId: start.islandId,
      });
    }
  }
  return regions;
}

export function isSnowTile(tile) {
  return tile?.islandId === NORTH_ISLAND_ID && tile.topY - tile.baseY >= SNOW_LEVEL - .01;
}

export function forestRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (tile.islandId === STARTER_ISLAND_ID || tile.water || tile.hasTree || tile.stones.length ||
      tile.reserved || tile.ploughed || tile.crop) continue;
    let nearbyTrees = 0;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (!dx && !dz) continue;
        const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
        if (neighbor?.hasTree && neighbor.islandId === tile.islandId && Math.abs(neighbor.topY - tile.topY) < .01) nearbyTrees++;
      }
    }
    if (nearbyTrees >= 2) habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, MIN_REGION_TILES);
}

export function snowRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (!isSnowTile(tile) || tile.water || tile.hasTree || tile.stones.length || tile.reserved || tile.ploughed || tile.crop) continue;
    habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, 1);
}

export function clearLandRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (tile.islandId === STARTER_ISLAND_ID || isSnowTile(tile) || tile.water || tile.hasTree ||
      tile.stones.length || tile.reserved || tile.ploughed || tile.crop) continue;
    habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, MIN_REGION_TILES);
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function largestRegion(regions) {
  return [...regions].sort((a, b) => b.tiles.length - a.tiles.length)[0] || null;
}

export function randomTile(region, random, occupied = new Set(), near = null) {
  const candidates = near
    ? region.tiles.filter(tile => Math.hypot(tile.x - near.x, tile.z - near.z) <= 2.25 * TILE)
    : region.tiles;
  const available = candidates.filter(tile => !occupied.has(gridKey(tile.gx, tile.gz)));
  const pool = available.length ? available : candidates.length ? candidates : region.tiles;
  return pool[Math.floor(random() * pool.length)];
}

