import { TILE } from '../../core/shared.js';

export function islandToWorld(transform, localPosition) {
  const yaw = transform.yaw || 0;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return {
    x: transform.x + localPosition.x * cosine + localPosition.z * sine,
    y: transform.y + (localPosition.y || 0),
    z: transform.z - localPosition.x * sine + localPosition.z * cosine,
  };
}

export function worldToIsland(transform, worldPosition) {
  const yaw = transform.yaw || 0;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const offsetX = worldPosition.x - transform.x;
  const offsetZ = worldPosition.z - transform.z;
  return {
    x: offsetX * cosine - offsetZ * sine,
    y: (worldPosition.y || 0) - transform.y,
    z: offsetX * sine + offsetZ * cosine,
  };
}

export function localTileCoordinates(island, tile) {
  return {
    gx: tile.gx - island.gridOrigin.gx,
    gz: tile.gz - island.gridOrigin.gz,
  };
}

export function worldTileCoordinates(island, localGx, localGz) {
  const world = islandToWorld(island.transform, {
    x: localGx * TILE,
    y: 0,
    z: localGz * TILE,
  });
  return {
    gx: Math.round(world.x / TILE),
    gz: Math.round(world.z / TILE),
  };
}
