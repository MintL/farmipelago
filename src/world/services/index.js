import { THREE, TILE, MODEL_VOXEL, createVoxelModel, gridKey, mats } from '../../core/shared.js';
import { ISLAND_SERVICES } from '../../gameplay/catalog/island-services.js';
import { seededRandom } from '../islands/procedural.js';

export function chooseIslandService(seed, tier) {
  return Object.entries(ISLAND_SERVICES).find(([id, definition]) => tier >= definition.minimumTier
    && seededRandom([...id].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), seed ^ 0x39c715bd))() < definition.chance)?.[0] || null;
}

function createStall(island, service) {
  const definition = ISLAND_SERVICES[service.definitionId], site = service.position;
  const parts = [];
  const run = (material, at, size) => {
    parts.push({ material, at, size });
    island.obstacles.push({ shape: 'box', x: site.x + (at[0] + size[0] / 2) * MODEL_VOXEL,
      y: site.y + at[1] * MODEL_VOXEL, z: site.z + (at[2] + size[2] / 2) * MODEL_VOXEL,
      width: size[0] * MODEL_VOXEL, height: size[1] * MODEL_VOXEL, depth: size[2] * MODEL_VOXEL, yaw: 0 });
  };
  // Two-tile stall: thick back, open receiving face, posts and stepped roof.
  run(mats.trunk, [-5, 0, -4], [10, 1, 8]);
  run(mats.combineCream, [-5, 1, -4], [10, 5, 1]);
  for (const x of [-5, 4]) run(mats.trunk, [x, 1, 3], [1, 6, 1]);
  run(mats.trunk, [-5, 1, 2], [10, 2, 1]);
  for (let course = 0; course < 3; course++) {
    for (const x of [-6 + course * 2, 4 - course * 2]) run(mats.red, [x, 7 + course, -5], [2, 1, 10]);
  }
  for (const x of [-3, 0, 2]) run(mats.combineCream, [x, 1, -2], [2, 2, 2]);
  const model = createVoxelModel(parts, { name: definition.visual });
  model.position.set(site.x, site.y, site.z);
  island.group.add(model);
  // The small sign names the service; the interactive HUD carries the offer.
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#eee4c7'; context.fillRect(0, 0, 256, 64);
  context.fillStyle = '#423425'; context.font = 'bold 30px sans-serif'; context.textAlign = 'center';
  context.fillText(definition.name, 128, 43);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .4), material);
  sign.position.set(site.x, site.y + 1.15, site.z + .81);
  island.group.add(sign);
  (island.serviceTextures ||= []).push(texture);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 2; dz++) {
    const tile = island.terrain.get(gridKey(Math.round(site.x / TILE) + dx, Math.round(site.z / TILE) + dz));
    if (tile) tile.reserved = true;
  }
}

export function restoreIslandServices(island, saved = []) {
  island.services = [];
  for (const service of Array.isArray(saved) ? saved : []) {
    const definition = ISLAND_SERVICES[service?.definitionId];
    if (!definition || ![service.position?.x, service.position?.y, service.position?.z].every(Number.isFinite)) continue;
    const stock = Object.fromEntries(Object.keys(definition.outputs).map(id => [id,
      Math.min(definition.capacity, Math.max(0, Math.floor(Number(service.stock?.[id]) || 0)))]));
    const restored = { id: service.definitionId, definitionId: service.definitionId, position: { ...service.position },
      completedTrades: Math.min(definition.tradeLimit, Math.max(0, Math.floor(Number(service.completedTrades) || 0))), stock };
    if (island.services.some(entry => entry.id === restored.id)) continue;
    island.services.push(restored); createStall(island, restored);
  }
}

export function addIslandService(island, definitionId) {
  if (!definitionId) { island.services = []; return true; }
  const site = [...island.terrain.values()].find(tile => {
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 3; dz++) {
      const neighbor = island.terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      if (!neighbor || neighbor.water || neighbor.hasTree || neighbor.reserved || neighbor.topY !== tile.topY) return false;
    }
    return true;
  });
  if (!site) return false;
  restoreIslandServices(island, [{ definitionId, position: { x: site.x, y: site.topY, z: site.z }, stock: {}, completedTrades: 0 }]);
  return true;
}

export function islandServicePorts(records) {
  return records.flatMap(record => record.status !== 'attached' ? [] : (record.source?.services || []).map(service => {
    const definition = ISLAND_SERVICES[service.definitionId];
    return { id: `${record.id}:${service.id}`, label: definition.name, definition, service,
      stock: service.stock, capacity: definition.capacity, accepts: Object.keys(definition.outputs),
      point: { x: record.transform.x + service.position.x, y: service.position.y + .6,
        z: record.transform.z + service.position.z + 1.6 }, canLoad: true, canUnload: false };
  }));
}
