import { THREE } from './shared.js';

const PARTICLE_CAPACITY = 96;
const EMISSION_RATE = 46;
const TRANSFER_RATE_LITRES = 1200;
const ITEM_COLORS = {
  corn: 0xf2c84b,
  wheat: 0xd9b65a,
  barley: 0xc9a552,
  canola: 0xf0ce32,
  soybean: 0xb78e48,
  milk: 0xe9f5ff,
};

const pointFrom = value => {
  const point = typeof value === 'function' ? value() : value;
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
    ? new THREE.Vector3(point.x, point.y, point.z)
    : null;
};

export function createTransferEffects(scene, { reducedMotion = false } = {}) {
  const geometry = new THREE.BoxGeometry(.105, .07, .16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const mesh = new THREE.InstancedMesh(geometry, material, PARTICLE_CAPACITY);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  const slots = Array.from({ length: PARTICLE_CAPACITY }, () => ({ active: false }));
  let cursor = 0;
  let transfer = null;
  let colorsDirty = false;

  mesh.name = 'bulk-transfer-swarm';
  mesh.count = PARTICLE_CAPACITY;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const hide = (slot, index) => {
    slot.active = false;
    transform.scale.setScalar(0);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  };

  slots.forEach(hide);
  mesh.instanceMatrix.needsUpdate = true;

  const claim = data => {
    const available = slots.findIndex(slot => !slot.active);
    const index = available === -1 ? cursor++ % slots.length : available;
    Object.assign(slots[index], data, { active: true });
    color.setHex(ITEM_COLORS[data.itemId] || ITEM_COLORS.wheat);
    if (data.itemId === 'milk') color.offsetHSL(data.colorJitter * .015, 0, data.colorJitter * .045);
    else color.offsetHSL(data.colorJitter * .012, data.colorJitter * .04, data.colorJitter * .035);
    mesh.setColorAt(index, color);
    colorsDirty = true;
  };

  const spawn = elapsed => {
    if (!transfer || reducedMotion) return false;
    const start = pointFrom(transfer.source);
    const end = pointFrom(transfer.target);
    if (!start || !end) return false;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.max(.001, Math.hypot(dx, dz));
    const side = new THREE.Vector3(-dz / distance, 0, dx / distance);
    const outer = Math.random() < .2;
    const control = start.clone().lerp(end, .5);
    control.y += Math.min(1.65, .48 + start.distanceTo(end) * .14);
    control.addScaledVector(side, (Math.random() - .5) * (outer ? .8 : .3));
    claim({
      born: elapsed + Math.random() * .045,
      life: .6 + Math.random() * .3,
      start,
      end,
      control,
      side,
      itemId: transfer.itemId,
      phase: Math.random() * Math.PI * 2,
      turns: 2.2 + Math.random() * 2.3,
      orbit: outer ? .24 + Math.random() * .16 : .07 + Math.random() * .11,
      buzz: .025 + Math.random() * .055,
      spinX: (Math.random() - .5) * 15,
      spinY: (Math.random() - .5) * 18,
      spinZ: (Math.random() - .5) * 15,
      scaleX: .65 + Math.random() * .65,
      scaleY: .65 + Math.random() * .55,
      scaleZ: .75 + Math.random() * .8,
      colorJitter: Math.random() - .5,
      onArrive: transfer.onArrive,
    });
    return true;
  };

  return {
    begin({ source, target, itemId, onArrive = null }) {
      transfer = { source, target, itemId, onArrive, emission: 0, started: false };
    },
    emitMovedAmount(amount, elapsed) {
      if (!transfer || !amount) return;
      if (!transfer.started) {
        transfer.started = true;
        for (let index = 0; index < 6; index++) spawn(elapsed + index * .012);
      }
      transfer.emission += amount * EMISSION_RATE / TRANSFER_RATE_LITRES;
      while (transfer.emission >= 1) {
        transfer.emission--;
        spawn(elapsed);
      }
    },
    finish() {
      transfer = null;
    },
    clear() {
      transfer = null;
      slots.forEach(hide);
      mesh.instanceMatrix.needsUpdate = true;
    },
    animate(elapsed) {
      if (reducedMotion) return;
      let matrixChanged = false;
      slots.forEach((slot, index) => {
        if (!slot.active || elapsed < slot.born) return;
        const progress = (elapsed - slot.born) / slot.life;
        if (progress >= 1) {
          hide(slot, index);
          slot.onArrive?.();
          matrixChanged = true;
          return;
        }
        const inverse = 1 - progress;
        const route = Math.sin(progress * Math.PI);
        const orbitAngle = slot.phase + progress * Math.PI * 2 * slot.turns;
        const buzz = Math.sin(slot.phase * 1.7 + progress * 54) * slot.buzz * route;
        transform.position.set(
          inverse * inverse * slot.start.x + 2 * inverse * progress * slot.control.x + progress * progress * slot.end.x,
          inverse * inverse * slot.start.y + 2 * inverse * progress * slot.control.y + progress * progress * slot.end.y,
          inverse * inverse * slot.start.z + 2 * inverse * progress * slot.control.z + progress * progress * slot.end.z,
        );
        transform.position.addScaledVector(slot.side, (Math.cos(orbitAngle) * slot.orbit + buzz) * route);
        transform.position.y += Math.sin(orbitAngle) * slot.orbit * .58 * route;
        transform.rotation.set(
          slot.phase + progress * slot.spinX,
          slot.phase * .7 + progress * slot.spinY,
          progress * slot.spinZ,
        );
        const launch = THREE.MathUtils.smoothstep(progress, 0, .1);
        const arrival = 1 - THREE.MathUtils.smoothstep(progress, .78, 1);
        const scale = Math.max(.01, launch * arrival);
        transform.scale.set(slot.scaleX * scale, slot.scaleY * scale, slot.scaleZ * scale);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
        matrixChanged = true;
      });
      if (matrixChanged) mesh.instanceMatrix.needsUpdate = true;
      if (colorsDirty && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
        colorsDirty = false;
      }
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
