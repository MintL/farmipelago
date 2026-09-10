import { THREE, TILE, mats } from '../../core/shared.js';
import { goodDefinition, goodDisplayAmount, storageAcceptsGood } from '../catalog/goods.js';
import { createPalletVisual } from '../../world/forage/pallet-visual.js';

const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
const total = contents => Object.values(contents).reduce((sum, amount) => sum + count(amount), 0);
const contentsOf = contents => Object.fromEntries(Object.entries(contents || {})
  .filter(([id, amount]) => storageAcceptsGood('pallet', id) && count(amount)));
const displayItem = (id, amount, target) => {
  const good = goodDefinition(id);
  const display = goodDisplayAmount(id, amount);
  return { id, name: good?.name || id, icon: good?.icon || id, ...display,
    target: target == null ? undefined : goodDisplayAmount(id, target).amount };
};

export function createPalletTransfers({ scene, getVehicle, getState, getFarm, getProgression, isBlocked, onChange, reducedMotion }) {
  let recovery = {}, active = null;
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
    return [...getFarm().servicePorts(),
      ...(total(recovery) ? [{ id: 'recovery', label: 'Workshop · Recovered stock', point: getFarm().workshopStockPoint(),
        stock: recovery, capacity: Infinity, accepts: Object.keys(recovery), canLoad: true, canUnload: false }] : []),
      ...(requirements.length ? [{ id: 'settlement', label: 'Settlement', point: getFarm().cargoPort.unloadTarget(),
        stock: {}, capacity: Infinity, accepts: requirements.map(need => need.id), canLoad: false, canUnload: true, requirements }] : []),
    ];
  };
  const inRange = port => {
    if (!port?.point) return false;
    const vehicle = getVehicle(), state = getState();
    const bed = vehicle.loadout.tool === 'flatbed' ? vehicle.visual.rearToolPoint(0, 1.8, .5) : state;
    return (port.id !== 'settlement' || getFarm().cargoPort.isNear(bed.x, bed.z, 5 * TILE))
      && state.grounded && Math.abs(state.y - port.point.y) < 3 * TILE
      && Math.hypot(bed.x - port.point.x, bed.z - port.point.z) <= 5 * TILE;
  };
  const compatibleGrainVehicle = () => getVehicle().type === 'harvester' || getVehicle().loadout.tool === 'trailer';
  const payment = port => port?.definition?.inputs.find(input => count(getVehicle().storage.contents[input.itemId]) >= input.amount);
  const canTrade = port => Boolean(port?.definition) && !isBlocked() && inRange(port) && compatibleGrainVehicle()
    && port.service?.completedTrades < port.definition.tradeLimit && Boolean(payment(port))
    && total(port.stock) + total(port.definition.outputs) <= port.capacity;
  const allowed = (port, direction, itemId) => {
    const vehicle = getVehicle();
    if (isBlocked() || !inRange(port) || vehicle.loadout.tool !== 'flatbed'
      || !storageAcceptsGood('pallet', itemId) || !port.accepts.includes(itemId)) return false;
    const cargo = vehicle.storage.contents;
    if (Object.keys(cargo).some(id => cargo[id] > 0 && id !== itemId)) return false;
    if (direction === 'load') return port.canLoad && count(port.stock[itemId]) > 0 && total(cargo) < vehicle.storage.capacity;
    if (!port.canUnload || !count(cargo[itemId])) return false;
    if (port.id === 'settlement') return port.requirements.some(need => need.id === itemId && need.accepting && need.amount < need.target);
    return total(port.stock) < port.capacity;
  };
  const itemFor = (port, direction) => port.accepts.find(id => direction === 'load' ? count(port.stock[id]) : count(getVehicle().storage.contents[id])) || port.accepts[0];
  const cancel = () => {
    if (active) active.vehicle.visual.setPalletCargo(total(active.vehicle.storage.contents));
    active = null; flying.visible = grain.visible = false;
  };
  return {
    cancel,
    restore(saved) {
      cancel(); recovery = contentsOf(saved?.recovery);
      // Old Debug source/receiver stock becomes load-only recovery exactly once.
      for (const contents of [saved?.source, saved?.destination]) for (const [id, amount] of Object.entries(contentsOf(contents))) {
        recovery[id] = count(recovery[id]) + amount;
      }
    },
    snapshot: () => ({ version: 1, recovery: { ...recovery } }),
    recover(itemId, amount) {
      if (count(amount) && storageAcceptsGood('pallet', itemId)) recovery[itemId] = count(recovery[itemId]) + amount;
    },
    context() {
      const vehicle = getVehicle();
      const candidates = ports().filter(port => inRange(port) && (port.definition || vehicle.loadout.tool === 'flatbed'));
      const port = candidates.find(port => port.id === active?.id) || candidates.sort((a, b) =>
        Math.hypot(getState().x - a.point.x, getState().z - a.point.z) - Math.hypot(getState().x - b.point.x, getState().z - b.point.z))[0];
      if (!port) return null;
      const offer = port.definition;
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
      const input = direction === 'trade' ? payment(port) : null;
      const itemId = input?.itemId || itemFor(port, direction);
      if (direction === 'trade' ? !canTrade(port) : !allowed(port, direction, itemId)) return;
      active = { id, direction, itemId, input, vehicle: getVehicle(), tool: getVehicle().loadout.tool, frontTool: getVehicle().loadout.frontTool, time: 0 };
    },
    update(dt) {
      if (!active) return;
      const { vehicle, direction, itemId, input } = active;
      const port = ports().find(entry => entry.id === active.id);
      if (!port || vehicle !== getVehicle() || vehicle.loadout.tool !== active.tool || vehicle.loadout.frontTool !== active.frontTool
        || (direction === 'trade' ? !canTrade(port) || count(vehicle.storage.contents[itemId]) < input.amount : !allowed(port, direction, itemId))) { cancel(); return; }
      const amount = total(vehicle.storage.contents), slot = direction === 'load' ? amount : amount - 1;
      const building = new THREE.Vector3(port.point.x, port.point.y, port.point.z);
      const bed = direction === 'trade' ? vehicle.visual.transferPort('output', itemId) : vehicle.visual.palletSlotPoint(slot);
      if (!bed) { cancel(); return; }
      const from = direction === 'load' ? building : bed, to = direction === 'load' ? bed : building;
      active.time += dt;
      const t = Math.min(1, active.time / (reducedMotion ? .35 : direction === 'trade' ? 1.2 : .8));
      const visual = direction === 'trade' ? grain : flying;
      visual.visible = true;
      visual.position.lerpVectors(from, to, t * t * (3 - 2 * t));
      visual.position.y += Math.sin(t * Math.PI) * (reducedMotion ? .15 : 1.2);
      if (direction === 'trade') grain.children.forEach(mesh => { mesh.material = itemId === 'barley' ? mats.barleyRipe : mats.wheatRipe; });
      else {
        flying.rotation.y = vehicle.visual.rearToolHeading();
        vehicle.visual.setPalletCargo(amount, direction === 'unload' ? slot : -1);
      }
      if (t < 1) return;
      // Commit a complete grain exchange or one pallet atomically, never in-flight stock.
      if (direction === 'trade') {
        vehicle.storage.contents[itemId] -= input.amount;
        if (!vehicle.storage.contents[itemId]) delete vehicle.storage.contents[itemId];
        for (const [id, quantity] of Object.entries(port.definition.outputs)) port.stock[id] = count(port.stock[id]) + quantity;
        port.service.completedTrades++;
        cancel(); onChange(); return;
      }
      if (direction === 'load') {
        port.stock[itemId]--;
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
