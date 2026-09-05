import { crops } from '../catalog/crops.js';
import { HAY_BALE_LITRES } from '../livestock/index.js';

const TRANSFER_LITRES_PER_TICK = 10;
const TRANSFER_TICKS_PER_SECOND = 120;

export function createTransferController({
  physics,
  effects,
  getFleet,
  getActiveVehicle,
  getActiveVehicleState,
  getBuildings,
  getFarm,
  getProgression,
  getUi,
  getElapsed,
  isCinematicActive,
  canTransferCargo,
  vehicleStorageKind,
  storageAmount,
  storageItemId,
  syncInventoryUi,
  syncCargoPort,
  beginMilestoneCinematic,
  scheduleSave,
}) {
  let activeTransfer = null;

  const transferVehicle = () => activeTransfer
    ? getFleet().find(vehicle => vehicle.id === activeTransfer.vehicleId) || null
    : null;

  const transferIsInRange = (transfer, vehicle) => {
    const state = physics.vehicleState(vehicle.id);
    if (transfer.kind === 'cargo') return getFarm().cargoPort.isNear(state.x, state.z);
    if (transfer.kind === 'barn-load-milk') {
      const barn = getBuildings()?.cattleBarn(transfer.barnId);
      return Boolean(barn?.pen && Math.hypot(state.x - barn.site.x, state.z - barn.site.z) <= 3.05);
    }
    return getBuildings()?.siloAt(state.x, state.z)?.id === transfer.siloId;
  };

  const finish = () => {
    const transfer = activeTransfer;
    if (!transfer) return;
    const vehicle = transferVehicle();
    activeTransfer = null;
    transfer.visuals?.setActive(false);
    effects.finish();
    if (vehicle?.id === getActiveVehicle().id) syncInventoryUi();
    if (transfer.kind === 'cargo') {
      getUi().setMilestone(getProgression().state());
      syncCargoPort();
    }
    scheduleSave();
  };

  const start = transfer => {
    if (activeTransfer) return false;
    const vehicle = getFleet().find(candidate => candidate.id === transfer.vehicleId);
    if (!vehicle) return false;
    const { itemId } = transfer;
    const vehiclePort = direction => vehicle.visual.transferPort(direction, itemId);
    const buildings = getBuildings();
    const farm = getFarm();
    let source;
    let target;
    let setActive;
    let pulseTarget;
    if (transfer.kind === 'load') {
      source = () => buildings.transferPort(transfer.siloId, 'output', itemId);
      target = () => vehiclePort('input');
      setActive = active => {
        buildings.setTransferState(transfer.siloId, { active, direction: 'output', itemId, elapsed: getElapsed() });
        vehicle.visual.setTransferState({ active, direction: 'input', itemId, elapsed: getElapsed() });
      };
      pulseTarget = () => vehicle.visual.pulseTransfer('input');
    }
    else if (transfer.kind === 'unload') {
      source = () => vehiclePort('output');
      target = () => buildings.transferPort(transfer.siloId, 'input', itemId);
      setActive = active => {
        vehicle.visual.setTransferState({ active, direction: 'output', target: target(), itemId, elapsed: getElapsed() });
        buildings.setTransferState(transfer.siloId, { active, direction: 'input', itemId, elapsed: getElapsed() });
      };
      pulseTarget = () => buildings.pulseTransfer(transfer.siloId, 'input');
    }
    else if (transfer.kind === 'barn-load-milk') {
      source = () => buildings.transferPort(transfer.barnId, 'output', itemId);
      target = () => vehiclePort('input');
      setActive = active => {
        buildings.setTransferState(transfer.barnId, { active, direction: 'output', itemId, elapsed: getElapsed() });
        vehicle.visual.setTransferState({ active, direction: 'input', itemId, elapsed: getElapsed() });
      };
      pulseTarget = () => vehicle.visual.pulseTransfer('input');
    }
    else {
      source = () => vehiclePort('output');
      target = () => farm.cargoPort.transferPort();
      setActive = active => {
        vehicle.visual.setTransferState({ active, direction: 'output', target: target(), itemId, elapsed: getElapsed() });
        farm.cargoPort.setTransferState({ active, direction: 'input', itemId, elapsed: getElapsed() });
      };
      pulseTarget = () => farm.cargoPort.pulseTransfer('input');
    }
    const visuals = { source, target, setActive, pulseTarget };
    activeTransfer = { ...transfer, remaining: transfer.amount, moved: 0, tickElapsed: 0, visuals };
    visuals.setActive(true);
    effects.begin({ source, target, itemId, onArrive: pulseTarget });
    return true;
  };

  const transferTick = () => {
    const transfer = activeTransfer;
    const vehicle = transferVehicle();
    if (!transfer) return false;
    if (!vehicle || vehicle.id !== getActiveVehicle().id || !transferIsInRange(transfer, vehicle)) {
      finish();
      return false;
    }
    const amount = Math.min(TRANSFER_LITRES_PER_TICK, transfer.remaining);
    const buildings = getBuildings();
    const progression = getProgression();
    let moved = 0;
    if (transfer.kind === 'load') {
      moved = buildings.takeFrom(transfer.siloId, transfer.itemId, amount, false);
      if (moved) vehicle.storage.contents[transfer.itemId] = (vehicle.storage.contents[transfer.itemId] || 0) + moved;
    }
    else if (transfer.kind === 'unload') {
      const available = Math.max(0, vehicle.storage.contents[transfer.itemId] || 0);
      moved = Math.min(amount, available);
      if (moved && buildings.storeIn(transfer.siloId, transfer.itemId, moved, getElapsed(), false)) {
        vehicle.storage.contents[transfer.itemId] -= moved;
        if (!vehicle.storage.contents[transfer.itemId]) delete vehicle.storage.contents[transfer.itemId];
      }
      else moved = 0;
    }
    else if (transfer.kind === 'barn-load-milk') {
      const space = vehicle.storage.capacity - storageAmount(vehicle);
      moved = buildings.takeMilk(transfer.barnId, Math.min(amount, space), false);
      if (moved) vehicle.storage.contents.milk = (vehicle.storage.contents.milk || 0) + moved;
    }
    else {
      const wasComplete = progression.state().complete;
      const accepted = progression.accept({ [transfer.itemId]: amount });
      moved = accepted[transfer.itemId] || 0;
      if (moved) {
        vehicle.storage.contents[transfer.itemId] -= moved;
        if (!vehicle.storage.contents[transfer.itemId]) delete vehicle.storage.contents[transfer.itemId];
        if (!wasComplete && progression.state().complete) beginMilestoneCinematic(progression.state());
      }
    }
    if (!moved) {
      finish();
      return false;
    }
    transfer.remaining -= moved;
    transfer.moved += moved;
    effects.emitMovedAmount(moved, getElapsed());
    if (transfer.remaining <= 0) finish();
    return true;
  };

  return {
    isActive: () => Boolean(activeTransfer),
    cancel() {
      if (!activeTransfer) return;
      activeTransfer.visuals?.setActive(false);
      activeTransfer = null;
      effects.clear();
    },
    update(dt) {
      if (!activeTransfer) return;
      activeTransfer.tickElapsed += dt;
      const ticks = Math.floor(activeTransfer.tickElapsed * TRANSFER_TICKS_PER_SECOND);
      if (!ticks) return;
      activeTransfer.tickElapsed -= ticks / TRANSFER_TICKS_PER_SECOND;
      let changed = false;
      let cargoChanged = false;
      for (let index = 0; index < ticks && activeTransfer; index++) {
        const kind = activeTransfer.kind;
        if (transferTick()) {
          changed = true;
          cargoChanged ||= kind === 'cargo';
        }
      }
      if (!changed) return;
      syncInventoryUi();
      if (cargoChanged) {
        getUi().setMilestone(getProgression().state());
        syncCargoPort();
      }
      scheduleSave();
    },
    unloadSilo(siloId) {
      const vehicle = getActiveVehicle();
      if (!canTransferCargo(vehicle) || vehicleStorageKind(vehicle) !== 'crop') return;
      const state = getActiveVehicleState();
      const amount = storageAmount();
      if (!amount) return;
      const itemId = storageItemId();
      const silo = getBuildings()?.siloAt(state.x, state.z);
      if (silo?.id !== siloId) return;
      start({
        kind: 'unload', vehicleId: vehicle.id, siloId, itemId, amount,
        target: { x: silo.site.x, y: silo.site.y + 3.58, z: silo.site.z },
      });
    },
    loadSilo(siloId, cropId) {
      if (!crops[cropId]) return;
      const vehicle = getActiveVehicle();
      if (!canTransferCargo(vehicle) || vehicleStorageKind(vehicle) !== 'crop') return;
      const state = getActiveVehicleState();
      const silo = getBuildings()?.siloAt(state.x, state.z);
      if (silo?.id !== siloId || (storageItemId() && storageItemId() !== cropId)) return;
      const amount = Math.min(
        Math.max(0, Math.floor(Number(silo.contents[cropId]) || 0)),
        vehicle.storage.capacity - storageAmount(),
      );
      if (amount) start({ kind: 'load', vehicleId: vehicle.id, siloId, itemId: cropId, amount });
    },
    feedBarn(barnId) {
      const vehicle = getActiveVehicle();
      const state = getActiveVehicleState();
      const buildings = getBuildings();
      const farm = getFarm();
      const barn = buildings?.cattleBarn(barnId);
      if (!barn?.pen || Math.hypot(state.x - barn.site.x, state.z - barn.site.z) > 3.05) return;
      const baleId = vehicle.equipmentState.carriedBaleId;
      if (!baleId || !farm.hasBale(baleId) || !buildings.addHayBale(barnId, HAY_BALE_LITRES)) return;
      if (!farm.removeBale(baleId)) return;
      vehicle.equipmentState.carriedBaleId = null;
      vehicle.baleReleasePending = false;
      vehicle.balePickupCooldown = getElapsed() + .65;
      scheduleSave();
    },
    loadBarnMilk(barnId) {
      const vehicle = getActiveVehicle();
      if (vehicleStorageKind(vehicle) !== 'liquid') return;
      const state = getActiveVehicleState();
      const barn = getBuildings()?.cattleBarn(barnId);
      if (!barn?.pen || Math.hypot(state.x - barn.site.x, state.z - barn.site.z) > 3.05
        || (storageItemId(vehicle) && storageItemId(vehicle) !== 'milk')) return;
      const amount = Math.min(Math.floor(barn.milkLitres), vehicle.storage.capacity - storageAmount(vehicle));
      if (amount > 0) start({ kind: 'barn-load-milk', vehicleId: vehicle.id, barnId, itemId: 'milk', amount });
    },
    dropOffCargo(selectedItemId = null) {
      if (isCinematicActive()) return;
      const vehicle = getActiveVehicle();
      const state = getActiveVehicleState();
      const farm = getFarm();
      const progression = getProgression();
      const ui = getUi();
      if (!farm.cargoPort.isNear(state.x, state.z)) return;
      const milestone = progression.state();
      if (milestone.complete) return;
      const baleRequirement = milestone.requirements.find(requirement => requirement.itemId === 'hay-bale');
      if (selectedItemId === 'hay-bale' || (!canTransferCargo(vehicle) && baleRequirement)) {
        const baleId = vehicle.equipmentState.carriedBaleId;
        if (!baleRequirement?.accepting || !baleId || !farm.hasBale(baleId)) return;
        const wasComplete = milestone.complete;
        const accepted = progression.accept({ 'hay-bale': 1 });
        if (!accepted['hay-bale'] || !farm.removeBale(baleId)) return;
        vehicle.equipmentState.carriedBaleId = null;
        vehicle.baleReleasePending = false;
        vehicle.balePickupCooldown = getElapsed() + .65;
        ui.setMilestone(progression.state());
        syncCargoPort();
        if (!wasComplete && progression.state().complete) beginMilestoneCinematic(progression.state());
        scheduleSave();
        return;
      }
      if (!canTransferCargo(vehicle) || !storageAmount()) return;
      const storage = vehicle.storage;
      const storedItemId = storageItemId();
      const itemId = selectedItemId && storage.contents[selectedItemId] > 0 ? selectedItemId : storedItemId;
      const requirement = milestone.requirements.find(entry => (entry.itemId || entry.cropId) === itemId);
      const amount = requirement?.accepting
        ? Math.min(storage.contents[itemId] || 0, Math.max(0, requirement.target - requirement.delivered))
        : 0;
      if (amount) start({
        kind: 'cargo', vehicleId: vehicle.id, itemId, amount,
        target: farm.cargoPort.unloadTarget(),
      });
    },
  };
}
