import { cropIds } from '../catalog/crops.js';
import { BARN_HAY_CAPACITY, BARN_MILK_CAPACITY, HAY_BALE_LITRES } from '../livestock/index.js';
import { isComplete, normalizedContents } from './state.js';

export function createBuildingStorage(buildings, onChange) {
  const siloAt = (x, z, range = 2.45) => nearestBuilding(
    buildings,
    x,
    z,
    range,
    building => building.type === 'silo' && building.placed && isComplete(building),
  );
  const cattleBarn = id => {
    const building = buildings.get(id);
    return building?.type === 'cattle-barn' && building.placed && isComplete(building) ? building : null;
  };
  return {
    isNearSilo: (x, z, range = 2.45) => Boolean(siloAt(x, z, range)),
    siloAt,
    storeAt(x, z, contents, elapsed = 0, range = 2.45) {
      const building = siloAt(x, z, range);
      if (!building) return null;
      for (const [cropId, amount] of Object.entries(normalizedContents(contents))) {
        building.contents[cropId] = (building.contents[cropId] || 0) + amount;
      }
      building.visual.receive(elapsed);
      onChange();
      return { building, target: siloTarget(building) };
    },
    storeIn(siloId, cropId, amount, elapsed = 0, notify = true) {
      const building = buildings.get(siloId);
      const storedAmount = cropIds.includes(cropId) ? Math.max(0, Math.floor(Number(amount) || 0)) : 0;
      if (!building || building.type !== 'silo' || !building.placed || !isComplete(building) || !storedAmount) return null;
      building.contents[cropId] = (building.contents[cropId] || 0) + storedAmount;
      building.visual.receive(elapsed);
      if (notify) onChange();
      return siloTarget(building);
    },
    takeFrom(siloId, cropId, requestedAmount, notify = true) {
      const building = buildings.get(siloId);
      const available = building?.type === 'silo' && building.placed && isComplete(building)
        ? Math.max(0, Math.floor(Number(building.contents[cropId]) || 0)) : 0;
      const amount = Math.min(available, Math.max(0, Math.floor(Number(requestedAmount) || 0)));
      if (!amount) return 0;
      building.contents[cropId] -= amount;
      if (!building.contents[cropId]) delete building.contents[cropId];
      if (notify) onChange();
      return amount;
    },
    unloadTargetAt(x, z, elapsed = 0, range = 2.45) {
      const building = siloAt(x, z, range);
      if (!building) return null;
      building.visual.receive(elapsed);
      return siloTarget(building);
    },
    cattleBarnAt(x, z, range = 3.05) {
      return nearestBuilding(buildings, x, z, range, building =>
        building.type === 'cattle-barn' && building.placed && isComplete(building)
          && building.pen && building.derived?.valid);
    },
    cattleBarn,
    cattleBarnSummary(id) {
      const building = cattleBarn(id);
      if (!building) return null;
      const adults = building.animals.filter(animal => animal.stage === 'adult').length;
      return {
        id: building.id,
        complete: Boolean(building.pen && building.derived?.valid),
        herd: building.animals.length,
        adults,
        calves: building.animals.length - adults,
        capacity: building.derived?.capacity || 0,
        hayLitres: Math.floor(building.hayLitres),
        hayCapacity: BARN_HAY_CAPACITY,
        milkLitres: Math.floor(building.milkLitres),
        milkCapacity: BARN_MILK_CAPACITY,
      };
    },
    addHayBale(id, litres = HAY_BALE_LITRES) {
      const building = cattleBarn(id);
      const amount = Math.max(0, Math.floor(Number(litres) || 0));
      if (!building?.pen || !amount || building.hayLitres + amount > BARN_HAY_CAPACITY) return false;
      building.hayLitres += amount;
      onChange();
      return true;
    },
    takeMilk(id, requestedAmount, notify = true) {
      const building = cattleBarn(id);
      if (!building?.pen) return 0;
      const amount = Math.min(Math.floor(building.milkLitres), Math.max(0, Math.floor(Number(requestedAmount) || 0)));
      if (!amount) return 0;
      building.milkLitres -= amount;
      if (notify) onChange();
      return amount;
    },
    transferPort(id, direction, itemId) {
      const building = buildings.get(id);
      if (!building?.placed || !isComplete(building)) return null;
      if (building.type === 'silo' && itemId !== 'milk') return { x: building.site.x, y: building.site.y + 3.76, z: building.site.z };
      if (building.type === 'cattle-barn' && direction === 'output' && itemId === 'milk') {
        return { x: building.site.x + .86, y: building.site.y + .56, z: building.site.z + 1.12 };
      }
      return null;
    },
    setTransferState(id, state) {
      buildings.get(id)?.visual.setTransferState?.(state);
    },
    pulseTransfer(id, direction) {
      buildings.get(id)?.visual.pulseTransfer?.(direction);
    },
  };
}

function nearestBuilding(buildings, x, z, range, accepts) {
  let closest = null;
  for (const building of buildings.values()) {
    if (!accepts(building)) continue;
    const distance = Math.hypot(x - building.site.x, z - building.site.z);
    if (distance <= range && (!closest || distance < closest.distance)) closest = { building, distance };
  }
  return closest?.building || null;
}

const siloTarget = building => ({ x: building.site.x, y: building.site.y + 3.58, z: building.site.z });
