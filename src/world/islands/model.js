import { TILE, gridKey } from '../../core/shared.js';
import { islandToWorld, localTileCoordinates } from './coordinates.js';

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
    const transform = { x: source.cx * TILE, y: source.h, z: source.cz * TILE, yaw: 0 };
    const record = {
      id: source.id,
      legacyId: source.legacyId,
      seed: (worldSeed + source.legacyId * 911) >>> 0,
      role: source.role,
      capabilities: { ...source.capabilities },
      status: source.status || 'attached',
      transform,
      gridOrigin: { gx: source.cx, gz: source.cz },
      bounds: null,
      terrain: new Map(),
    };
    for (const tile of terrain.values()) {
      if (tile.islandId !== source.id) continue;
      const local = localTileCoordinates(record, tile);
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

export function createIslandConnections(connections, bridgeGaps, islandRecords) {
  const byId = new Map(islandRecords.map(island => [island.id, island]));
  return connections.map(source => {
    const fromIsland = byId.get(source.fromId);
    const toIsland = byId.get(source.toId);
    if (!fromIsland || !toIsland) throw new Error(`Connection ${source.id} has unresolved island endpoints`);
    const gap = bridgeGaps.find(candidate =>
      candidate.from.islandId === fromIsland.id && candidate.to.islandId === toIsland.id
      || candidate.from.islandId === toIsland.id && candidate.to.islandId === fromIsland.id);
    const forward = gap?.from.islandId === fromIsland.id;
    return {
      id: source.id,
      kind: source.kind,
      status: source.status || 'attached',
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
    services: structuredClone(island.source?.services || []),
    id: island.id,
    seed: island.seed,
    ...(island.settings ? { settings: { ...island.settings } } : {}),
    role: island.role,
    capabilities: { ...island.capabilities },
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
