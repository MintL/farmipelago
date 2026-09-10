import { THREE, TILE, MODEL_VOXEL, createVoxelModel, gridKey, mats } from '../../core/shared.js';
import { ISLAND_SERVICES, TEST_ENCOUNTER_SERVICE } from '../../gameplay/catalog/island-services.js';
import { islandToWorld } from '../islands/coordinates.js';
import { createWindmill } from './windmill.js';
import { processService, quantity } from './processor.js';
import { seededRandom } from '../islands/procedural.js';

const serviceVisuals = new WeakMap();

export function chooseIslandService(seed, tier) {
  const testing = ISLAND_SERVICES[TEST_ENCOUNTER_SERVICE];
  if (testing && tier >= testing.minimumTier) return TEST_ENCOUNTER_SERVICE;
  return Object.entries(ISLAND_SERVICES).find(([id, definition]) => tier >= definition.minimumTier
    && seededRandom([...id].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), seed ^ 0x39c715bd))() < definition.chance)?.[0] || null;
}

export function serviceIslandSettings(definitionId) {
  return { radius: 5.5, maxElevation: 0, terraceCoverage: .2, treeDensity: 0, treeBaseChance: 0,
    rockDensity: 0, groundCoverDensity: 0, waterStyle: 'none', ...ISLAND_SERVICES[definitionId].islandSettings };
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

function restoreStock(saved, ids, capacity, whole = false) {
  let space = capacity;
  return Object.fromEntries(ids.map(id => {
    const amount = Math.min(space, whole ? Math.floor(quantity(saved?.[id])) : quantity(saved?.[id]));
    space -= amount;
    return [id, amount];
  }));
}

export function restoreIslandServices(island, saved = []) {
  island.services = [];
  for (const service of Array.isArray(saved) ? saved : []) {
    const definition = ISLAND_SERVICES[service?.definitionId];
    if (!definition || ![service.position?.x, service.position?.y, service.position?.z].every(Number.isFinite)) continue;
    const processor = definition.kind === 'processor';
    const restored = { id: service.definitionId, definitionId: service.definitionId, position: { ...service.position },
      stock: restoreStock(service.stock, Object.keys(definition.outputs), definition.capacity, !processor) };
    if (processor) restored.inputStock = restoreStock(service.inputStock, definition.inputs.map(input => input.itemId), definition.inputCapacity);
    else restored.completedTrades = Math.min(definition.tradeLimit, Math.floor(quantity(service.completedTrades)));
    if (island.services.some(entry => entry.id === restored.id)) continue;
    island.services.push(restored);
    if (processor) serviceVisuals.set(restored, createWindmill(island, restored));
    else createStall(island, restored);
    const area = definition.footprint;
    if (area) for (let dx = area.minX; dx <= area.maxX; dx++) for (let dz = area.minZ; dz <= area.maxZ; dz++) {
      const tile = island.terrain.get(gridKey(Math.round(restored.position.x / TILE) + dx, Math.round(restored.position.z / TILE) + dz));
      if (tile) tile.reserved = true;
    }
  }
}

export function addIslandService(island, definitionId) {
  if (!definitionId) { island.services = []; return true; }
  const area = ISLAND_SERVICES[definitionId].footprint || { minX: -2, maxX: 2, minZ: -2, maxZ: 3 };
  const site = [...island.terrain.values()].find(tile => {
    for (let dx = area.minX; dx <= area.maxX; dx++) for (let dz = area.minZ; dz <= area.maxZ; dz++) {
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
  return records.flatMap(record => record.status !== 'attached' || record.source?.status !== 'attached' ? []
    : (record.source?.services || []).flatMap(service => {
      const definition = ISLAND_SERVICES[service.definitionId];
      const base = { id: `${record.id}:${service.id}`, label: definition.name, definition, service };
      const point = offset => islandToWorld(record.transform, { x: service.position.x + offset.x,
        y: service.position.y + offset.y, z: service.position.z + offset.z });
      if (definition.kind === 'processor') return [
        { ...base, id: `${base.id}:input`, role: 'input', stock: service.inputStock, capacity: definition.inputCapacity,
          accepts: definition.inputs.map(input => input.itemId), point: point(definition.ports.input), canLoad: false, canUnload: true, stockUnit: 'litres' },
        { ...base, id: `${base.id}:output`, role: 'output', stock: service.stock, capacity: definition.capacity,
          accepts: Object.keys(definition.outputs), point: point(definition.ports.output), canLoad: true, canUnload: false, stockUnit: 'litres' },
      ];
      return [{ ...base, stock: service.stock, capacity: definition.capacity, accepts: Object.keys(definition.outputs),
        point: point({ x: 0, y: .6, z: 1.6 }), canLoad: true, canUnload: false, stockUnit: 'pallets' }];
    }));
}

export function updateIslandServices(records, dt) {
  for (const record of records) {
    if (record.status !== 'attached' || record.source?.status !== 'attached') continue;
    for (const service of record.source?.services || []) {
      const definition = ISLAND_SERVICES[service.definitionId];
      if (definition.kind !== 'processor') continue;
      const produced = processService(service, definition, dt);
      const sails = serviceVisuals.get(service);
      if (sails && produced > 0) sails.rotation.z -= produced / definition.litresPerSecond * .65;
    }
  }
}
