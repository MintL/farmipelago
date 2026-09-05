import { TILE, gridKey } from '../../core/shared.js';
import { islandToWorld, worldToIsland } from '../islands/coordinates.js';
import { serializeIsland } from '../islands/model.js';

const tileReference = tile => tile && ({
  islandId: tile.islandId,
  gx: tile.localGx,
  gz: tile.localGz,
});

function localTileState(island, savedTile, terrain) {
  const tile = terrain.get(savedTile.key);
  if (!tile || tile.islandId !== island.id) return null;
  return { ...savedTile, key: gridKey(tile.localGx, tile.localGz) };
}

function islandContent(island, state, terrain) {
  const tiles = state.tiles.map(tile => localTileState(island, tile, terrain)).filter(Boolean);
  const forageTiles = (state.forage?.tiles || [])
    .map(tile => localTileState(island, tile, terrain))
    .filter(Boolean);
  const bales = (state.forage?.bales || []).flatMap(bale => {
    const tile = terrain.get(gridKey(Math.floor(bale.x / TILE + .5), Math.floor(bale.z / TILE + .5)));
    if (tile?.islandId !== island.id) return [];
    return [{ ...bale, localPosition: worldToIsland(island.transform, bale) }];
  });
  return { tiles, forage: { tiles: forageTiles, bales } };
}

export function createArchipelagoRuntime(farm) {
  const islands = new Map(farm.islands.map(island => [island.id, island]));
  const runtime = {
    islands,
    connections: farm.connections,
    island(id) {
      return islands.get(id) || null;
    },
    islandAtWorld(x, z) {
      const tile = farm.terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
      return tile ? islands.get(tile.islandId) || null : null;
    },
    tileAtWorld(x, z) {
      return farm.terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5))) || null;
    },
    tileReferenceAtWorld(x, z) {
      return tileReference(this.tileAtWorld(x, z));
    },
    poseAtWorld(position, heading = 0) {
      const island = this.islandAtWorld(position.x, position.z);
      return island ? {
        islandId: island.id,
        position: worldToIsland(island.transform, position),
        heading: heading - island.transform.yaw,
      } : null;
    },
    worldPose(pose) {
      const island = islands.get(pose?.islandId);
      if (!island || !pose?.position) return null;
      return {
        position: islandToWorld(island.transform, pose.position),
        heading: (pose.heading || 0) + island.transform.yaw,
      };
    },
    vehicleSpawnPoint(id) {
      return this.worldPose(farm.vehicleSpawnPoints[id]);
    },
    islandToWorld(islandId, position) {
      const island = islands.get(islandId);
      return island ? islandToWorld(island.transform, position) : null;
    },
    worldToIsland(islandId, position) {
      const island = islands.get(islandId);
      return island ? worldToIsland(island.transform, position) : null;
    },
    persistentState(elapsed) {
      const state = farm.persistentState(elapsed);
      return {
        ...state,
        islands: [...islands.values()].map(island => ({
          ...serializeIsland(island),
          content: islandContent(island, state, farm.terrain),
        })),
        connections: farm.connections.map(connection => ({
          id: connection.id,
          kind: connection.kind,
          status: connection.status,
          from: { islandId: connection.from.islandId, anchor: connection.from.anchor && { ...connection.from.anchor } },
          to: { islandId: connection.to.islandId, anchor: connection.to.anchor && { ...connection.to.anchor } },
        })),
      };
    },
  };
  return new Proxy(runtime, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
      const value = farm[property];
      return typeof value === 'function' ? value.bind(farm) : value;
    },
    set(target, property, value, receiver) {
      if (Reflect.has(target, property)) return Reflect.set(target, property, value, receiver);
      farm[property] = value;
      return true;
    },
  });
}
