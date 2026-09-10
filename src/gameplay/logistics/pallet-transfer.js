import { THREE, TILE } from '../../core/shared.js';
import { storageAcceptsGood } from '../catalog/goods.js';
import { createPalletVisual } from '../../world/forage/pallet-visual.js';

const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
const total = contents => Object.values(contents).reduce((sum, amount) => sum + count(amount), 0);
const contentsOf = contents => Object.fromEntries(Object.entries(contents || {})
  .filter(([id, amount]) => storageAcceptsGood('pallet', id) && count(amount)));

export function createPalletTransfers({ scene, getVehicle, getState, getFarm, isBlocked, onChange, reducedMotion }) {
  let stock = { enabled: false, source: {}, destination: {} };
  let active = null;
  const flying = createPalletVisual(new THREE.BoxGeometry(1, 1, 1));
  flying.visible = false;
  flying.scale.setScalar(.92);
  scene.add(flying);
  const ports = () => [
    { id: 'source', label: 'Debug · Workshop stock', point: getFarm().workshopStockPoint(), capacity: Infinity, accepts: ['flour'] },
    { id: 'destination', label: 'Debug · Storehouse stock', point: getFarm().cargoPort.unloadTarget(), capacity: 8, accepts: ['flour'] },
  ];
  const inRange = port => {
    if (!port?.point) return false;
    const vehicle = getVehicle(), state = getState();
    const bed = vehicle.loadout.tool === 'flatbed' ? vehicle.visual.rearToolPoint(0, 1.8, .5) : state;
    return (port.id !== 'destination' || getFarm().cargoPort.isNear(bed.x, bed.z, 5 * TILE))
      && state.grounded && Math.abs(state.y - port.point.y) < 3 * TILE
      && Math.hypot(bed.x - port.point.x, bed.z - port.point.z) <= 5 * TILE;
  };
  const nearby = () => stock.enabled ? ports().filter(port => (port.id !== 'destination' || getVehicle().loadout.tool === 'flatbed') && inRange(port))
    .sort((a, b) => Math.hypot(getState().x - a.point.x, getState().z - a.point.z)
      - Math.hypot(getState().x - b.point.x, getState().z - b.point.z))[0] : null;
  const allowed = (port, direction, itemId = 'flour') => {
    const vehicle = getVehicle();
    if (isBlocked() || !stock.enabled || !inRange(port) || vehicle.loadout.tool !== 'flatbed'
      || !storageAcceptsGood('pallet', itemId) || !port.accepts.includes(itemId)) return false;
    const cargo = vehicle.storage.contents;
    if (Object.keys(cargo).some(id => cargo[id] > 0 && id !== itemId)) return false;
    return direction === 'load'
      ? count(stock[port.id][itemId]) > 0 && total(cargo) < vehicle.storage.capacity
      : count(cargo[itemId]) > 0 && total(stock[port.id]) < port.capacity;
  };
  const cancel = () => {
    if (active) active.vehicle.visual.setPalletCargo(total(active.vehicle.storage.contents));
    active = null;
    flying.visible = false;
  };
  return {
    cancel,
    restore(saved) {
      cancel();
      stock = { enabled: saved?.enabled === true, source: contentsOf(saved?.source), destination: contentsOf(saved?.destination) };
    },
    snapshot: () => ({ enabled: stock.enabled, source: { ...stock.source }, destination: { ...stock.destination } }),
    recover(itemId, amount) {
      if (!count(amount) || !storageAcceptsGood('pallet', itemId)) return;
      stock.source[itemId] = count(stock.source[itemId]) + amount;
      stock.enabled = true;
    },
    addDebugStock() {
      cancel();
      stock.enabled = true;
      stock.source.flour = count(stock.source.flour) + 4;
      onChange();
      return `Workshop: ${stock.source.flour} Flour pallets. Equip Flatbed, leave the bay and use Load nearby. Unload at Debug Storehouse stock (8 slots).`;
    },
    context() {
      const port = nearby();
      if (!port) return null;
      return { kind: 'pallet', id: port.id, label: port.label, point: port.point,
        amount: count(stock[port.id].flour), capacity: Number.isFinite(port.capacity) ? port.capacity : null,
        canLoad: !active && allowed(port, 'load'), canUnload: !active && allowed(port, 'unload'),
        active: Boolean(active), hint: active ? 'Transferring one pallet at a time' : getVehicle().loadout.tool !== 'flatbed' ? 'Equip Flatbed at Workshop' : 'Flour · whole pallets' };
    },
    start(id, direction) {
      const port = ports().find(entry => entry.id === id);
      if (active || !port || !['load', 'unload'].includes(direction) || !allowed(port, direction)) return;
      active = { id, direction, itemId: 'flour', vehicle: getVehicle(), time: 0 };
    },
    update(dt) {
      if (!active) return;
      const { vehicle, direction, itemId } = active;
      const port = ports().find(entry => entry.id === active.id);
      if (vehicle !== getVehicle() || !allowed(port, direction, itemId)) { cancel(); return; }
      const amount = total(vehicle.storage.contents);
      const slot = direction === 'load' ? amount : amount - 1;
      const bed = vehicle.visual.palletSlotPoint(slot);
      const building = new THREE.Vector3(port.point.x, port.point.y, port.point.z);
      const from = direction === 'load' ? building : bed;
      const to = direction === 'load' ? bed : building;
      active.time += dt;
      const t = Math.min(1, active.time / (reducedMotion ? .35 : .8));
      flying.visible = true;
      flying.position.lerpVectors(from, to, t * t * (3 - 2 * t));
      flying.position.y += Math.sin(t * Math.PI) * (reducedMotion ? .15 : 1.2);
      flying.rotation.y = vehicle.visual.rearToolHeading();
      vehicle.visual.setPalletCargo(amount, direction === 'unload' ? slot : -1);
      if (t < 1) return;
      // A single synchronous commit: every saved snapshot owns this unit exactly once.
      const source = direction === 'load' ? stock[port.id] : vehicle.storage.contents;
      const target = direction === 'load' ? vehicle.storage.contents : stock[port.id];
      source[itemId] -= 1;
      if (!source[itemId]) delete source[itemId];
      target[itemId] = count(target[itemId]) + 1;
      active.time = 0;
      flying.visible = false;
      onChange();
      if (!allowed(port, direction, itemId)) cancel();
    },
  };
}
