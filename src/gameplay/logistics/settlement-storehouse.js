import { THREE } from '../../core/shared.js';
import { createGameBuilding } from '../../world/buildings/game.js';
import { worldColliders } from '../../world/buildings/kit.js';

export function createSettlementStorehouse(site, visual = createGameBuilding('storehouse')) {
  const { group } = visual;
  group.name = 'settlement-storehouse';
  group.position.set(site.x, site.y, site.z);
  const yaw = Math.atan2(site.outward.x, site.outward.z);
  group.rotation.y = yaw;
  const localToWorld = point => ({
    x: site.x + point.x * Math.cos(yaw) + point.z * Math.sin(yaw),
    y: site.y + point.y,
    z: site.z - point.x * Math.sin(yaw) + point.z * Math.cos(yaw),
  });
  let transferActive = false, receivingTime = null;
  return {
    group,
    colliders: worldColliders(visual.colliders, site, yaw),
    occluders: [group], lanternPositions: visual.lanternPositions,
    lightSurfaceQuads: [[new THREE.Vector3(-1.4, .02, -1.4), new THREE.Vector3(1.4, .02, -1.4),
      new THREE.Vector3(-1.4, .02, 0), new THREE.Vector3(1.4, .02, 0)]],
    isNear(x, z, range = 3.15) {
      const dx = x - site.x, dz = z - site.z;
      return dx * Math.sin(yaw) + dz * Math.cos(yaw) <= .2 && Math.hypot(dx, dz) <= range;
    },
    unloadTarget: () => localToWorld(visual.ports.input),
    transferPort: () => localToWorld(visual.ports.input),
    setTransferState({ active }) { transferActive = active; if (!active) visual.stop(); },
    pulseTransfer() {},
    setLoadRatio: ratio => visual.setStockLevel(ratio),
    setCargoKind() {},
    setNightAmount: (amount, lanternAmount = amount) => visual.setNightAmount(lanternAmount),
    receiveShipment() { receivingTime = 0; },
    cinematicView() {
      const point = localToWorld({ x: -6, y: 7, z: -8 });
      return { target: new THREE.Vector3(site.x, site.y + 1, site.z), camera: new THREE.Vector3(point.x, point.y, point.z) };
    },
    update(dt) {
      visual.update(dt, transferActive || receivingTime !== null);
      if (receivingTime === null) return { shipmentReceived: false };
      receivingTime += dt;
      if (receivingTime < 1.4) return { shipmentReceived: false };
      receivingTime = null;
      return { shipmentReceived: true };
    },
    dispose() {},
  };
}
