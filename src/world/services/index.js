import { TILE, gridKey } from '../../core/shared.js';
import { ISLAND_SERVICES, TEST_ENCOUNTER_SERVICES } from '../../gameplay/catalog/island-services.js';
import { islandToWorld } from '../islands/coordinates.js';
import { createProcessorVisual } from './visual.js';
import { processService, quantity } from './processor.js';
import { seededRandom } from '../islands/procedural.js';

const serviceVisuals = new WeakMap();

export function chooseIslandService(seed, tier) {
  const testing = TEST_ENCOUNTER_SERVICES.filter(id => tier >= ISLAND_SERVICES[id].minimumTier);
  if (testing.length) return testing[Math.floor(seededRandom(seed ^ 0x39c715bd)() * testing.length)];
  return Object.entries(ISLAND_SERVICES).find(([id, definition]) => tier >= definition.minimumTier
    && seededRandom([...id].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), seed ^ 0x39c715bd))() < definition.chance)?.[0] || null;
}

export function serviceIslandSettings(definitionId) {
  return { radius: 5.5, maxElevation: 0, terraceCoverage: .2, treeDensity: 0, treeBaseChance: 0,
    rockDensity: 0, groundCoverDensity: 0, waterStyle: 'none', ...ISLAND_SERVICES[definitionId].islandSettings };
}

export function restoreStock(saved, ids, capacity, whole = false) {
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
    serviceVisuals.set(restored, createProcessorVisual(island, restored));
    const area = definition.footprint || { minX: -3, maxX: 3, minZ: -2, maxZ: 3 };
    if (area) for (let dx = area.minX; dx <= area.maxX; dx++) for (let dz = area.minZ; dz <= area.maxZ; dz++) {
      const tile = island.terrain.get(gridKey(Math.round(restored.position.x / TILE) + dx, Math.round(restored.position.z / TILE) + dz));
      if (tile) tile.reserved = true;
    }
  }
}

export function addIslandService(island, definitionId) {
  if (!definitionId) { island.services = []; return true; }
  const area = ISLAND_SERVICES[definitionId].footprint || { minX: -3, maxX: 3, minZ: -2, maxZ: 3 };
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

export function islandServicePorts(records, visualFor = service => serviceVisuals.get(service)) {
  return records.flatMap(record => record.status !== 'attached' || record.source?.status !== 'attached' ? []
    : (record.source?.services || []).flatMap(service => {
      const definition = ISLAND_SERVICES[service.definitionId];
      const visual = visualFor(service);
      const base = { id: `${record.id}:${service.id}`, label: definition.name, definition, service,
        setTransferState: state => {
          if (!visual) return;
          visual.transferring = Boolean(state.active);
          if (!state.active && definition.kind === 'trade') visual.stop();
        } };
      const point = offset => islandToWorld(record.transform, { x: service.position.x + offset.x,
        y: service.position.y + offset.y, z: service.position.z + offset.z });
      if (definition.kind === 'processor') return [
        { ...base, id: `${base.id}:input`, role: 'input', stock: service.inputStock, capacity: definition.inputCapacity,
          accepts: definition.inputs.map(input => input.itemId), point: point(visual?.ports.input || definition.ports.input), canLoad: false, canUnload: true, stockUnit: 'litres' },
        { ...base, id: `${base.id}:output`, role: 'output', stock: service.stock, capacity: definition.capacity,
          accepts: Object.keys(definition.outputs), point: point(visual?.ports.output || definition.ports.output), canLoad: true, canUnload: false, stockUnit: 'litres' },
      ];
      return [{ ...base, stock: service.stock, capacity: definition.capacity, accepts: Object.keys(definition.outputs),
        point: point(visual?.ports.output || { x: 0, y: .6, z: 1.6 }), canLoad: true, canUnload: false, stockUnit: 'pallets' }];
    }));
}

export function updateIslandServices(records, dt) {
  for (const record of records) {
    const attached = record.status === 'attached' && record.source?.status === 'attached';
    for (const service of record.source?.services || []) {
      const definition = ISLAND_SERVICES[service.definitionId], visual = serviceVisuals.get(service);
      if (!attached) { visual?.stop(); continue; }
      const working = definition.kind === 'processor'
        ? processService(service, definition, dt) > 0 : Boolean(visual?.transferring);
      visual?.update(dt, working);
    }
  }
}
