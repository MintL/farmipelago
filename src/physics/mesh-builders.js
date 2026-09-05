import { GRASS_TOP, LAYER_DEPTH, SOIL_DEPTH, TILE, gridKey } from '../core/shared.js';

function createMeshBuilder() {
  const vertices = [];
  const indices = [];
  const vertexMap = new Map();
  const vertex = point => {
    const key = `${point[0].toFixed(4)},${point[1].toFixed(4)},${point[2].toFixed(4)}`;
    let index = vertexMap.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      vertices.push(point[0], point[1], point[2]);
      vertexMap.set(key, index);
    }
    return index;
  };
  return {
    vertices,
    indices,
    quad(a, b, c, d) {
      const ia = vertex(a), ib = vertex(b), ic = vertex(c), id = vertex(d);
      indices.push(ia, ib, ic, ia, ic, id);
    },
  };
}

export function buildTerrainMesh(terrain) {
  const mesh = createMeshBuilder();
  const half = TILE * 0.5;
  for (const tile of terrain.values()) {
    const x0 = tile.x - half, x1 = tile.x + half;
    const z0 = tile.z - half, z1 = tile.z + half;
    const top = tile.topY;
    const bottom = tile.baseY - SOIL_DEPTH - GRASS_TOP;

    mesh.quad([x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0]);
    mesh.quad([x0, bottom, z0], [x1, bottom, z0], [x1, bottom, z1], [x0, bottom, z1]);

    const east = terrain.get(gridKey(tile.gx + 1, tile.gz));
    const west = terrain.get(gridKey(tile.gx - 1, tile.gz));
    const south = terrain.get(gridKey(tile.gx, tile.gz + 1));
    const north = terrain.get(gridKey(tile.gx, tile.gz - 1));
    if (!east || east.topY < top - 0.001) {
      const low = east ? east.topY : bottom;
      mesh.quad([x1, low, z0], [x1, top, z0], [x1, top, z1], [x1, low, z1]);
    }
    if (!west || west.topY < top - 0.001) {
      const low = west ? west.topY : bottom;
      mesh.quad([x0, low, z0], [x0, low, z1], [x0, top, z1], [x0, top, z0]);
    }
    if (!south || south.topY < top - 0.001) {
      const low = south ? south.topY : bottom;
      mesh.quad([x0, low, z1], [x1, low, z1], [x1, top, z1], [x0, top, z1]);
    }
    if (!north || north.topY < top - 0.001) {
      const low = north ? north.topY : bottom;
      mesh.quad([x0, low, z0], [x0, top, z0], [x1, top, z0], [x1, low, z0]);
    }
  }
  return mesh;
}

export function buildBlockMesh(blocks) {
  const mesh = createMeshBuilder();
  const occupied = new Set(blocks.map(block => blockKey(block.x, block.y, block.z)));
  for (const block of blocks) {
    const halfX = TILE * 0.5;
    const halfY = LAYER_DEPTH * 0.5;
    const halfZ = TILE * 0.5;
    const x0 = block.x - halfX, x1 = block.x + halfX;
    const y0 = block.y - halfY, y1 = block.y + halfY;
    const z0 = block.z - halfZ, z1 = block.z + halfZ;
    const empty = (dx, dy, dz) => !occupied.has(blockKey(block.x + dx, block.y + dy, block.z + dz));

    if (empty(0, LAYER_DEPTH, 0)) mesh.quad([x0,y1,z0], [x0,y1,z1], [x1,y1,z1], [x1,y1,z0]);
    if (empty(0, -LAYER_DEPTH, 0)) mesh.quad([x0,y0,z0], [x1,y0,z0], [x1,y0,z1], [x0,y0,z1]);
    if (empty(TILE, 0, 0)) mesh.quad([x1,y0,z0], [x1,y1,z0], [x1,y1,z1], [x1,y0,z1]);
    if (empty(-TILE, 0, 0)) mesh.quad([x0,y0,z0], [x0,y0,z1], [x0,y1,z1], [x0,y1,z0]);
    if (empty(0, 0, TILE)) mesh.quad([x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1]);
    if (empty(0, 0, -TILE)) mesh.quad([x0,y0,z0], [x0,y1,z0], [x1,y1,z0], [x1,y0,z0]);
  }
  return mesh;
}

function blockKey(x, y, z) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}
