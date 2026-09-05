import { TILE, gridKey } from '../../core/shared.js';
import { islandToWorld, localTileCoordinates } from './coordinates.js';

const islandId = legacyId => `island-${legacyId}`;

function islandRole(legacyId) {
  if (legacyId === 0) return 'hub';
  if (legacyId === 1) return 'northern-farm';
  return 'farm';
}

function islandBounds(tiles) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (const tile of tiles) {
    bounds.minX = Math.min(bounds.minX, tile.localX - TILE * .5);
    bounds.maxX = Math.max(bounds.maxX, tile.localX + TILE * .5);
    bounds.minY = Math.min(bounds.minY, tile.localTopY);
    bounds.maxY = Math.max(bounds.maxY, tile.localTopY);
    bounds.minZ = Math.min(bounds.minZ, tile.localZ - TILE * .5);
    bounds.maxZ = Math.max(bounds.maxZ, tile.localZ + TILE * .5);
  }
  return bounds;
}

export function createIslandRecords(layout, terrain, worldSeed) {
  const records = layout.map(source => {
    const id = islandId(source.id);
    const transform = { x: source.cx * TILE, y: source.h, z: source.cz * TILE, yaw: 0 };
    const record = {
      id,
      legacyId: source.id,
      seed: (worldSeed + source.id * 911) >>> 0,
      role: islandRole(source.id),
      status: 'attached',
      transform,
      gridOrigin: { gx: source.cx, gz: source.cz },
      bounds: null,
      terrain: new Map(),
    };
    for (const tile of terrain.values()) {
      if (tile.islandId !== source.id) continue;
      const local = localTileCoordinates(record, tile);
      tile.islandId = id;
      tile.localGx = local.gx;
      tile.localGz = local.gz;
      tile.localX = local.gx * TILE;
      tile.localZ = local.gz * TILE;
      tile.localTopY = tile.topY - transform.y;
      record.terrain.set(gridKey(local.gx, local.gz), tile);
    }
    record.bounds = islandBounds(record.terrain.values());
    return record;
  });
  return records;
}

function localAnchor(island, tile) {
  const local = localTileCoordinates(island, tile);
  return { gx: local.gx, gz: local.gz, y: tile.topY - island.transform.y };
}

export function createIslandConnections(pairs, bridgeGaps, islandRecords) {
  const byLegacyId = new Map(islandRecords.map(island => [island.legacyId, island]));
  return pairs.map(([fromLegacyId, toLegacyId], index) => {
    const fromIsland = byLegacyId.get(fromLegacyId);
    const toIsland = byLegacyId.get(toLegacyId);
    const gap = bridgeGaps.find(candidate =>
      candidate.from.islandId === fromIsland.id && candidate.to.islandId === toIsland.id
      || candidate.from.islandId === toIsland.id && candidate.to.islandId === fromIsland.id);
    const forward = gap?.from.islandId === fromIsland.id;
    return {
      id: `connection-${index}`,
      kind: 'bridge',
      status: 'attached',
      from: {
        islandId: fromIsland.id,
        anchor: gap ? localAnchor(fromIsland, forward ? gap.from : gap.to) : null,
      },
      to: {
        islandId: toIsland.id,
        anchor: gap ? localAnchor(toIsland, forward ? gap.to : gap.from) : null,
      },
    };
  });
}

export function serializeIsland(island) {
  return {
    id: island.id,
    seed: island.seed,
    role: island.role,
    status: island.status,
    transform: { ...island.transform },
  };
}

export function anchorWorldPosition(island, anchor) {
  if (!anchor) return null;
  return islandToWorld(island.transform, {
    x: anchor.gx * TILE,
    y: anchor.y,
    z: anchor.gz * TILE,
  });
}
