import { THREE, TILE, mats } from '../../core/shared.js';
import { goodDefinition, goodDisplayAmount, storageAcceptsGood } from '../catalog/goods.js';
import { processorStatus, quantity, stockTotal } from '../../world/services/processor.js';
import { createPalletVisual } from '../../world/forage/pallet-visual.js';

const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
const total = contents => Object.values(contents).reduce((sum, amount) => sum + count(amount), 0);
const displayItem = (id, amount, target) => {
  const good = goodDefinition(id);
  const display = goodDisplayAmount(id, amount);
  return { id, name: good?.name || id, icon: good?.icon || id, ...display,
    target: target == null ? undefined : goodDisplayAmount(id, target).amount };
};

export function createPalletTransfers({ scene, getVehicle, getState, getFarm, getProgression, getBuildingPorts = () => [], isBlocked, onChange, reducedMotion }) {
  let active = null;
  const flying = createPalletVisual(new THREE.BoxGeometry(1, 1, 1));
  flying.visible = false; flying.scale.setScalar(.92); scene.add(flying);
  const grain = new THREE.Group(), grainGeometry = new THREE.BoxGeometry(.09, .06, .12);
  for (let i = 0; i < 14; i++) {
    const mesh = new THREE.Mesh(grainGeometry, mats.wheatRipe);
    mesh.position.set((i % 3 - 1) * .14, (i % 2) * .08, (Math.floor(i / 3) - 2) * .12);
    grain.add(mesh);
  }
  grain.visible = false; scene.add(grain);
  const ports = () => {
    const requirements = getProgression().state().needs.filter(need => need.available && storageAcceptsGood('pallet', need.id));
    return [...getFarm().servicePorts(), ...getBuildingPorts(),
      ...(requirements.length ? [{ id: 'settlement', label: 'Settlement', point: getFarm().cargoPort.unloadTarget(),
        stock: {}, capacity: Infinity, accepts: requirements.map(need => need.id), canLoad: false, canUnload: true, requirements,
        setTransferState: state => getFarm().cargoPort.setTransferState(state) }] : []),
    ];
  };
  const inRange = port => {
    if (!port?.point) return false;
    const vehicle = getVehicle(), state = getState();
    const bed = vehicle.loadout.tool === 'flatbed' ? vehicle.visual.rearToolPoint(0, 1.8, .5) : state;
    if (port.id === 'settlement') return getFarm().cargoPort.canInteract(state);
    return state.grounded && Math.abs(state.y - port.point.y) < 3 * TILE
      && Math.hypot(bed.x - port.point.x, bed.z - port.point.z) <= 5 * TILE;
  };
  const compatibleGrainVehicle = () => getVehicle().type === 'harvester' || getVehicle().loadout.tool === 'trailer';
  const payment = port => port?.definition?.inputs.find(input => quantity(getVehicle().storage.contents[input.itemId]) >= input.amount);
  const canTrade = port => port?.definition?.kind === 'trade' && !isBlocked() && inRange(port) && compatibleGrainVehicle()
    && port.service?.completedTrades < port.definition.tradeLimit && Boolean(payment(port))
    && total(port.stock) + total(port.definition.outputs) <= port.capacity;
  const palletSize = (port, itemId) => port.stockUnit === 'litres' ? goodDefinition(itemId)?.litresPerPallet || 1 : 1;
  const carriedInput = port => port.accepts.find(id => quantity(getVehicle().storage.contents[id]) > 0);
  const canSupply = (port, itemId = port && carriedInput(port)) => port?.role === 'input'
    && !isBlocked() && inRange(port) && compatibleGrainVehicle() && port.accepts.includes(itemId)
    && quantity(getVehicle().storage.contents[itemId]) > 0 && stockTotal(port.stock) < port.capacity;
  const allowed = (port, direction, itemId) => {
    const vehicle = getVehicle();
    if (isBlocked() || !inRange(port) || vehicle.loadout.tool !== 'flatbed'
      || !storageAcceptsGood('pallet', itemId) || !port.accepts.includes(itemId)) return false;
    const cargo = vehicle.storage.contents;
    if (Object.keys(cargo).some(id => cargo[id] > 0 && id !== itemId)) return false;
    if (direction === 'load') return port.canLoad && quantity(port.stock[itemId]) >= palletSize(port, itemId) && total(cargo) < vehicle.storage.capacity;
    if (!port.canUnload || !count(cargo[itemId])) return false;
    if (port.id === 'settlement') return port.requirements.some(need => need.id === itemId && need.accepting && need.amount < need.target);
    return total(port.stock) < port.capacity;
  };
  const itemFor = (port, direction) => port.accepts.find(id => direction === 'load' ? count(port.stock[id]) : count(getVehicle().storage.contents[id])) || port.accepts[0];
  const cancel = () => {
    active?.setTransferState?.({ active: false });
    if (active) active.vehicle.visual.setPalletCargo(total(active.vehicle.storage.contents));
    active = null; flying.visible = grain.visible = false;
  };
  return {
    cancel,
    context() {
      const vehicle = getVehicle();
      const candidates = ports().filter(port => inRange(port) && (port.definition || vehicle.loadout.tool === 'flatbed')
        && (port.definition?.kind !== 'processor' || port.role === (vehicle.loadout.tool === 'flatbed' ? 'output' : 'input')));
      const port = candidates.find(port => port.id === active?.id) || candidates.sort((a, b) =>
        Math.hypot(getState().x - a.point.x, getState().z - a.point.z) - Math.hypot(getState().x - b.point.x, getState().z - b.point.z))[0];
      if (!port) return null;
      const processor = port.definition?.kind === 'processor' ? port.definition : null;
      const offer = port.definition?.kind === 'trade' ? port.definition : null;
      if (processor) {
        const stockItems = [
          ...processor.inputs.map(input => displayItem(input.itemId, quantity(port.service.inputStock[input.itemId]))),
          { id: processor.outputItemId, name: goodDefinition(processor.outputItemId).name, icon: goodDefinition(processor.outputItemId).icon,
            unit: 'litres', amount: quantity(port.service.stock[processor.outputItemId]), target: processor.capacity },
        ];
        // HUD values are whole litres rounded down; a partial pallet never looks loadable.
        stockItems.forEach(item => { item.amount = Math.floor(item.amount); });
        return { kind: 'pallet', serviceKind: 'processor', id: port.id, label: port.label, point: port.point, stockItems, inputs: [], outputs: [],
          stockLabel: stockItems.map(item => `${item.name}: ${item.amount.toLocaleString()} L`).join(' · '),
          showTrade: false, tradeComplete: false, canTrade: false,
          showLoad: port.role === 'output', showUnload: port.role === 'input', unloadLabel: `Unload ${processor.inputLabel?.toLowerCase() || 'grain'}`,
          canLoad: !active && allowed(port, 'load', itemFor(port, 'load')), canUnload: !active && canSupply(port),
          active: Boolean(active), hint: active ? 'Transferring…' : processorStatus(port.service, processor),
          capacityLabel: `${processor.inputLabel || 'Grain'} ${Math.floor(stockTotal(port.service.inputStock)).toLocaleString()} / ${processor.inputCapacity.toLocaleString()} L`,
        };
      }
      const complete = offer && port.service.completedTrades >= offer.tradeLimit;
      const stockLabel = port.id === 'settlement' ? port.requirements.map(need => `${need.name}: ${goodDisplayAmount(need.id, need.amount).amount.toLocaleString()} / ${goodDisplayAmount(need.id, need.target).amount.toLocaleString()} ${goodDisplayAmount(need.id, need.amount).unit === 'litres' ? 'L' : 'pallets'}`).join(' · ')
        : port.accepts.map(id => `${goodDefinition(id)?.name || id}: ${goodDisplayAmount(id, count(port.stock[id])).amount.toLocaleString()} ${goodDisplayAmount(id, 0).unit === 'litres' ? 'L' : 'pallets'}`).join(' · ');
      return { kind: 'pallet', id: port.id, label: port.label, point: port.point, stockLabel,
        inputs: offer && !complete ? offer.inputs.map(input => displayItem(input.itemId, input.amount)) : [],
        outputs: offer && !complete ? Object.entries(offer.outputs).map(([id, amount]) => displayItem(id, amount)) : [],
        stockItems: offer && !complete ? [] : port.requirements
          ? port.requirements.map(need => displayItem(need.id, need.amount, need.target))
          : port.accepts.map(id => displayItem(id, count(port.stock[id]))),
        showTrade: Boolean(offer), tradeComplete: Boolean(complete), canTrade: !active && canTrade(port),
        showLoad: port.canLoad, showUnload: port.canUnload, unloadLabel: port.id === 'settlement' ? 'Deliver' : 'Unload',
        canLoad: !active && allowed(port, 'load', itemFor(port, 'load')),
        canUnload: !active && allowed(port, 'unload', itemFor(port, 'unload')),
        active: Boolean(active), hint: active ? 'Transferring…' : complete ? 'Trade complete' : '' };
    },
    start(id, direction) {
      const port = ports().find(entry => entry.id === id);
      if (active || !port || !['load', 'unload', 'trade'].includes(direction)) return;
      const supplying = direction === 'unload' && port.role === 'input';
      const input = direction === 'trade' ? payment(port) : null;
      const itemId = supplying ? carriedInput(port) : input?.itemId || itemFor(port, direction);
      if (supplying ? !canSupply(port, itemId) : direction === 'trade' ? !canTrade(port) : !allowed(port, direction, itemId)) return;
      active = { id, direction, itemId, input, supplying, vehicle: getVehicle(), tool: getVehicle().loadout.tool, frontTool: getVehicle().loadout.frontTool,
        setTransferState: port.setTransferState, time: 0 };
      active.setTransferState?.({ active: true, direction: direction === 'load' ? 'output' : 'input' });
    },
    update(dt) {
      if (!active) return;
      const { vehicle, direction, itemId, input, supplying } = active;
      const port = ports().find(entry => entry.id === active.id);
      if (!port || vehicle !== getVehicle() || vehicle.loadout.tool !== active.tool || vehicle.loadout.frontTool !== active.frontTool
        || (supplying ? !canSupply(port, itemId) : direction === 'trade' ? !canTrade(port) || quantity(vehicle.storage.contents[itemId]) < input.amount : !allowed(port, direction, itemId))) { cancel(); return; }
      if (supplying && active.deliveryAmount == null) active.deliveryAmount = Math.min(600, quantity(vehicle.storage.contents[itemId]), port.capacity - stockTotal(port.stock));
      const isGrain = direction === 'trade' || supplying;
      const amount = total(vehicle.storage.contents), slot = direction === 'load' ? amount : amount - 1;
      const building = new THREE.Vector3(port.point.x, port.point.y, port.point.z);
      const bed = isGrain ? vehicle.visual.transferPort('output', itemId) : vehicle.visual.palletSlotPoint(slot);
      if (!bed) { cancel(); return; }
      const from = direction === 'load' ? building : bed, to = direction === 'load' ? bed : building;
      active.time += dt;
      const duration = supplying ? .5 : reducedMotion ? .35 : direction === 'trade' ? 1.2 : .8;
      const t = Math.min(1, active.time / duration);
      const visual = isGrain ? grain : flying;
      visual.visible = true;
      visual.position.lerpVectors(from, to, t * t * (3 - 2 * t));
      visual.position.y += Math.sin(t * Math.PI) * (reducedMotion ? .15 : 1.2);
      if (isGrain) grain.children.forEach(mesh => { mesh.material = itemId === 'canola' ? mats.canolaFlower : itemId === 'barley' ? mats.barleyRipe : mats.wheatRipe; });
      else {
        flying.userData.setGood(itemId);
        flying.rotation.y = vehicle.visual.rearToolHeading();
        vehicle.visual.setPalletCargo(amount, direction === 'unload' ? slot : -1);
      }
      if (t < 1) return;
      // Commit a complete grain exchange or one pallet atomically, never in-flight stock.
      if (supplying) {
        const delivered = Math.min(active.deliveryAmount, quantity(vehicle.storage.contents[itemId]), port.capacity - stockTotal(port.stock));
        vehicle.storage.contents[itemId] -= delivered;
        if (!vehicle.storage.contents[itemId]) delete vehicle.storage.contents[itemId];
        port.stock[itemId] = quantity(port.stock[itemId]) + delivered;
        active.deliveryAmount = null; active.time = 0; grain.visible = false;
        onChange();
        if (!canSupply(port, itemId)) cancel();
        return;
      }
      if (direction === 'trade') {
        vehicle.storage.contents[itemId] -= input.amount;
        if (!vehicle.storage.contents[itemId]) delete vehicle.storage.contents[itemId];
        for (const [id, quantity] of Object.entries(port.definition.outputs)) port.stock[id] = count(port.stock[id]) + quantity;
        port.service.completedTrades++;
        cancel(); onChange(); return;
      }
      if (direction === 'load') {
        port.stock[itemId] -= palletSize(port, itemId);
        if (!port.stock[itemId]) delete port.stock[itemId];
        vehicle.storage.contents[itemId] = count(vehicle.storage.contents[itemId]) + 1;
      } else {
        if (port.id === 'settlement' && getProgression().accept({ [itemId]: 1 })[itemId] !== 1) { cancel(); return; }
        vehicle.storage.contents[itemId]--;
        if (!vehicle.storage.contents[itemId]) delete vehicle.storage.contents[itemId];
        if (port.id !== 'settlement') port.stock[itemId] = count(port.stock[itemId]) + 1;
      }
      active.time = 0; flying.visible = false; onChange();
      if (!allowed(port, direction, itemId)) cancel();
    },
  };
}
