import { THREE, TILE, MODEL_VOXEL, gridKey } from '../../core/shared.js';
import { SETTLEMENT_ROAD_COLOR } from './layout.js';
import { dressSettlementGround } from './ground-dressing.js';

export const SETTLEMENT_ROAD_STAGES = ['Worn dirt tracks', 'Packed earth roads', 'Gravel roads', 'Stone paving', 'Dressed limestone'];
const colors = [0xa58b67, SETTLEMENT_ROAD_COLOR, 0xb3aa91, 0xaaa797, 0xc9c3ae].map(value => new THREE.Color(value));
const edgeColor = new THREE.Color(0x858777);
const tierIndex = tier => THREE.MathUtils.clamp(Math.floor(tier) - 1, 0, 4);

// The mesh and terrain use the same cell painter. Cache each tier once, then
// reveal changed cells along the street during construction without new meshes.
export function createSettlementRoadSurface(pathTiles, seed, initialTier = 1, origin = { x: 0, z: 0 }) {
  const islandId = pathTiles[0]?.islandId;
  const cells = [], attributes = new Set();
  const bounds = new THREE.Box3();
  const networks = colors.map((_, level) => {
    const activeTiles = pathTiles.filter(tile => (tile.settlementRoadTier ?? 1) <= level + 1);
    const roadTiles = new Map(activeTiles.map(tile => [gridKey(tile.gx, tile.gz), tile]));
    const edges = [];
    for (const tile of activeTiles) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbor = roadTiles.get(gridKey(tile.gx + dx, tile.gz + dz));
        if (neighbor && Math.abs(neighbor.topY - tile.topY) < .01) continue;
        const x = tile.x + dx * TILE * .5, z = tile.z + dz * TILE * .5;
        edges.push({ minX: x - Math.abs(dz) * TILE * .5, maxX: x + Math.abs(dz) * TILE * .5,
          minZ: z - Math.abs(dx) * TILE * .5, maxZ: z + Math.abs(dx) * TILE * .5, y: tile.topY });
      }
    }
    return { roadTiles, edges };
  });
  let tier = initialTier, target = null;
  const tint = new THREE.Color();
  const paint = (tile, x, z, base, variation, level) => {
    const cellX = Math.round(x / MODEL_VOXEL), cellZ = Math.round(z / MODEL_VOXEL);
    let hash = seed ^ Math.imul(cellX, 0x1f123bb5) ^ Math.imul(cellZ, 0x5f356495);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
    const color = dressSettlementGround(base.clone(), (x - origin.x) / TILE, (z - origin.z) / TILE, level + 1, hash);
    const { roadTiles, edges } = networks[level];
    if (tile.islandId !== islandId || !edges.length) return color;
    let distanceSquared = Infinity;
    for (const edge of edges) {
      if (Math.abs(edge.y - tile.topY) > .01) continue;
      const dx = x - THREE.MathUtils.clamp(x, edge.minX, edge.maxX);
      const dz = z - THREE.MathUtils.clamp(z, edge.minZ, edge.maxZ);
      distanceSquared = Math.min(distanceSquared, dx * dx + dz * dz);
    }
    if (!Number.isFinite(distanceSquared)) return color;
    const distance = Math.sqrt(distanceSquared) / TILE * (roadTiles.has(gridKey(tile.gx, tile.gz)) ? 1 : -1);
    const fringe = (hash % 9 / 8 - .5) * (level < 2 ? .18 : .08);
    const inset = level === 0 ? .34 : 0;
    const amount = Math.round(THREE.MathUtils.smoothstep(distance + fringe - inset, -.18, .4) * 5) / 5;
    if (!amount) return color;
    tint.copy(colors[level]);
    if (level === 2) tint.multiplyScalar(.92 + hash % 7 * .025);
    else if (level >= 3) {
      const row = Math.floor(cellZ / 2), column = Math.floor((cellX + (row % 2) * 2) / 4);
      const slab = Math.abs(Math.imul(row, 73) ^ Math.imul(column, 137)) % 5;
      tint.multiplyScalar(.94 + slab * .025);
      // Dressed perimeter stones and quiet staggered slab variation, flush with
      // the grass. No drawn checkerboard or dark grout grid across the street.
      if (level === 4 && distance > .16 && distance < .4) tint.lerp(edgeColor, .45);
    }
    else tint.multiplyScalar(1 + variation * .3);
    if (tile.normalGrassColor) tint.lerp(tile.normalGrassColor, .04);
    return color.lerp(tint, amount);
  };
  const write = (cell, color) => {
    for (let corner = 0; corner < 4; corner++) cell.attribute.setXYZ(cell.offset + corner, color.r, color.g, color.b);
  };
  const dirty = () => attributes.forEach(attribute => { attribute.needsUpdate = true; });
  return {
    bounds,
    registerCell(tile, x, z, base, variation, attribute, offset) {
      if (tile.islandId !== islandId || tile.water) return base;
      const appearances = colors.map((_, level) => paint(tile, x, z, base, variation, level));
      if (appearances.some(color => !color.equals(base))) {
        cells.push({ x, z, attribute, offset, appearances }); attributes.add(attribute);
        bounds.expandByPoint(new THREE.Vector3(x, tile.topY, z));
      }
      return appearances[tierIndex(tier)];
    },
    setTier(value) {
      tier = value; target = null;
      for (const cell of cells) write(cell, cell.appearances[tierIndex(tier)]);
      dirty();
    },
    beginUpgrade(value) { target = value; return bounds; },
    setConstructionProgress(progress) {
      if (target === null) return;
      const span = Math.max(TILE, bounds.max.z - bounds.min.z);
      for (const cell of cells) {
        const order = (bounds.max.z - cell.z) / span;
        const amount = THREE.MathUtils.smoothstep(progress, order * .8, order * .8 + .2);
        tint.copy(cell.appearances[tierIndex(tier)]).lerp(cell.appearances[tierIndex(target)], amount);
        write(cell, tint);
      }
      dirty();
    },
    finishUpgrade() { if (target !== null) this.setTier(target); },
  };
}
