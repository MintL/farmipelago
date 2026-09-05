import { TILE, gridKey } from '../core/shared.js';
import { cargoDeckContains } from '../gameplay/logistics/cargo-port.js';
import { STARTER_ISLAND_ID, WORKSHOP_YAW } from './config.js';

export function findWorkshopSite(terrain, island) {
  const candidates = [];
  for (const tile of terrain.values()) {
    if (tile.islandId !== STARTER_ISLAND_ID) continue;
    const hasWorkshopPad = [-1, 0, 1].every(dx => [-1, 0, 1].every(dz => {
      const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      return neighbor?.islandId === STARTER_ISLAND_ID && Math.abs(neighbor.topY - tile.topY) < .01;
    }));
    if (!hasWorkshopPad) continue;
    // Prefer the westernmost safe 3x3 footprint, then the northernmost site
    // along that edge. The workshop's open bay faces east.
    candidates.push({ ...tile });
  }
  candidates.sort((first, second) => first.gx - second.gx || first.gz - second.gz);
  return candidates[0];
}

export function reserveWorkshopGround(terrain, site) {
  const yaw = WORKSHOP_YAW;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (const tile of terrain.values()) {
    if (tile.islandId !== STARTER_ISLAND_ID) continue;
    const dx = tile.x - site.x;
    const dz = tile.z - site.z;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const onWorkshopPad = Math.abs(localX) <= 2.45 && localZ >= -3.15 && localZ <= 2.0;
    if (onWorkshopPad) {
      tile.noDecoration = true;
      tile.reserved = true;
    }
  }
}

export function findVehicleSpawns(terrain, start, workshopArea) {
  const outsideWorkshop = tile => {
    if (!workshopArea) return true;
    const dx = tile.x - workshopArea.x;
    const dz = tile.z - workshopArea.z;
    const localX = dx * Math.cos(workshopArea.yaw) - dz * Math.sin(workshopArea.yaw);
    const localZ = dx * Math.sin(workshopArea.yaw) + dz * Math.cos(workshopArea.yaw);
    const clearWidth = workshopArea.spawnClearanceWidth || workshopArea.width;
    const clearDepth = workshopArea.spawnClearanceDepth || workshopArea.depth;
    return Math.abs(localX) > clearWidth * .5 + .8 || Math.abs(localZ) > clearDepth * .5 + .8;
  };
  const candidates = [...terrain.values()].filter(tile =>
    tile.islandId === STARTER_ISLAND_ID && !tile.water && !tile.hasTree && !tile.reserved &&
    Math.abs(tile.topY - start.topY) < .01 && outsideWorkshop(tile)
  );
  candidates.sort((first, second) => {
    const firstDistance = Math.hypot(first.x - start.x, first.z - start.z);
    const secondDistance = Math.hypot(second.x - start.x, second.z - start.z);
    return firstDistance - secondDistance || first.gx - second.gx || first.gz - second.gz;
  });
  const selected = [];
  for (const tile of candidates) {
    if (selected.every(spawn => Math.hypot(tile.x - spawn.x, tile.z - spawn.z) >= 3.5)) {
      selected.push({ x: tile.x, y: tile.topY, z: tile.z });
      if (selected.length === 8) break;
    }
  }
  if (selected.length < 2) {
    for (const tile of candidates) {
      if (selected.some(spawn => spawn.x === tile.x && spawn.z === tile.z)) continue;
      selected.push({ x: tile.x, y: tile.topY, z: tile.z });
      if (selected.length === 2) break;
    }
  }
  return selected.length ? selected : [{ x: start.x, y: start.topY, z: start.z }];
}

export function findCargoSite(terrain, island, workshopSite) {
  // Keep cargo infrastructure on the hub's open west side and face the deck due west.
  const outward = { x: -1, z: 0 };
  const islandTiles = [...terrain.values()].filter(tile => tile.islandId === island.id);
  const candidates = [];

  // The half-diagonal margin treats each terrain tile as a full square rather
  // than only testing its center against the rotated deck footprint.
  const deckIsClear = site => [...terrain.values()].every(tile =>
    !cargoDeckContains(site, tile.x, tile.z, TILE * .72) || tile.topY <= site.y + .01
  );

  const approachIsClear = site => {
    const lateral = { x: -site.outward.z, z: site.outward.x };
    for (const depth of [0, 1, 2]) {
      for (const across of [-1, 0, 1]) {
        const gx = Math.round(site.x / TILE - site.outward.x * depth + lateral.x * across);
        const gz = Math.round(site.z / TILE - site.outward.z * depth + lateral.z * across);
        const approach = terrain.get(gridKey(gx, gz));
        if (!approach || approach.islandId !== island.id || approach.water || Math.abs(approach.topY - site.y) > .01) return false;
      }
    }
    return true;
  };

  for (const tile of islandTiles) {
    // Cargo infrastructure is only allowed on the island's first/base floor.
    if (tile.water || Math.abs(tile.topY - tile.baseY) > .01) continue;
    const dx = tile.gx - island.cx;
    const dz = tile.gz - island.cz;
    if (tile.radial < .62 || dx >= -island.r * .45) continue;
    if (workshopSite && Math.hypot(tile.x - workshopSite.x, tile.z - workshopSite.z) < 5.5 * TILE) continue;
    const site = { x: tile.x, y: tile.topY, z: tile.z, outward };
    if (!approachIsClear(site) || !deckIsClear(site)) continue;
    candidates.push({ site, tile });
  }

  // Prefer the westernmost valid anchor, then the southernmost site along that
  // edge so the cargo bay sits opposite the workshop.
  candidates.sort((a, b) => a.tile.gx - b.tile.gx || b.tile.gz - a.tile.gz);
  if (candidates.length) return candidates[0].site;

  const safeFallback = islandTiles
    .filter(tile => !tile.water && Math.abs(tile.topY - tile.baseY) <= .01 &&
      tile.radial >= .62 && tile.gx - island.cx < -island.r * .45 &&
      (!workshopSite || Math.hypot(tile.x - workshopSite.x, tile.z - workshopSite.z) >= 5.5 * TILE))
    .map(tile => ({ site: { x: tile.x, y: tile.topY, z: tile.z, outward }, tile }))
    .filter(candidate => deckIsClear(candidate.site))
    .sort((a, b) => a.tile.gx - b.tile.gx || b.tile.gz - a.tile.gz)[0];
  return safeFallback?.site || null;
}

export function reserveCargoApproach(terrain, site, islandId) {
  if (!site) return;
  for (const tile of terrain.values()) {
    if (tile.islandId !== islandId) continue;
    const approach = Math.abs(tile.topY - site.y) <= .01 && Math.hypot(tile.x - site.x, tile.z - site.z) <= 2.35;
    if (approach || cargoDeckContains(site, tile.x, tile.z, TILE * .85)) tile.reserved = true;
    // Tree crowns reach farther than their trunks; keep decorations clear
    // without unnecessarily removing the surrounding tiles from farming.
    if (cargoDeckContains(site, tile.x, tile.z, TILE * 2.75)) tile.noDecoration = true;
  }
}

