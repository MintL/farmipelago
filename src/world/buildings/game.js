import { THREE, TILE } from '../../core/shared.js';
import { createBuildingPopupAnchor } from './popup-anchor.js';
import { createIslandOutline } from '../islands/selection-outline.js';
import { createGrainMillConcept } from './grain-mill-concept.js';
import { createStorehouseConcept } from './storehouse-concept.js';
import { createHybridOilPress } from './oil-press-hybrid.js';
import { createHybridWorkshop } from './workshop-hybrid.js';
import { createHybridBarn } from './barn-hybrid.js';
import { createHybridSilo } from './silo-hybrid.js';
import { createHybridCottage } from './cottage-hybrid.js';
import { createHybridTrader } from './trader-hybrid.js';

// Architecture stays at its authored MODEL_VOXEL size for every building.
// Placement may rotate or translate a model, but must never resize its cells.
const definitions = {
  windmill: { create: () => createGrainMillConcept({ hybrid: true }),
    ports: { input: [-2.27, 1.53, .27], output: [2.8, .8, 1.18] },
    solids: [[-.55, .4, .55, 1.28, .6, 1.28], [-2.2, 0, .4, 1.1, 1.65, 1.1],
      [2.1, 0, 1.18, 2.15, .48, .8], [-.55, .64, 1.88, 4.82, 4.82, .6]] },
  'oil-press': { create: createHybridOilPress,
    ports: { input: [-2.2, 1.98, .4], output: [2.32, .65, 1.12] },
    solids: [[-.05, .4, .55, 1.56, 1.7, 1.15], [.97, .4, 1.08, .95, 1.3, .4],
      [-2.2, 0, .4, .9, 1.98, .9], [-1.23, .4, 1.75, .64, .7, .64], [.15, .4, 1.66, .65, .42, .5], [2.32, 0, 1.12, .65, .8, .65]] },
  workshop: { create: () => createHybridWorkshop({ clearBay: true }), yaw: Math.PI,
    lights: [[-2.05, 2.2, 1.99], [2.05, 2.2, 1.99]],
    solids: [[0, .4, -.96, 3.4, .67, .75], [1.56, .4, .61, .7, .85, .63],
      [2.98, 0, -.34, .72, .8, .72], [-2.93, 0, -.56, .6, 1.12, .75], [1.3, .8, 2.7, 1.3, 1.5, .4]] },
  storehouse: { create: () => createStorehouseConcept({ hybrid: true }), yaw: Math.PI, offset: [0, 0, 2.8], startTime: 1,
    ports: { input: [0, 1.1, 1.96] }, lights: [[-1.97, 2.06, 1.67], [1.97, 2.06, 1.67]],
    solids: [[-1.37, .4, -.35, 1.15, 1.65, 1.8], [1.37, .4, -.35, 1.15, 1.65, 1.8],
      [-2.8, 0, -.1, .65, 1.3, 1.4], [2.74, 0, -.48, .9, 1.4, .9]] },
  'cattle-barn': { create: createHybridBarn, offset: [0, 0, -2.2],
    ports: { input: [-1.47, .82, 1.97], output: [1.74, 1.13, 2.35] },
    solids: [[-1.47, .4, 1.97, .86, .42, .64], [2.86, 0, -.45, .72, .83, .83],
      [1.74, .4, 2.35, .6, .75, .5], [1.75, .4, .93, .4, .45, .4]] },
  silo: { create: createHybridSilo,
    ports: { input: [-1.71, 1.2, 1.09], output: [1.54, 1.27, 1.81] },
    solids: [[-1.71, .4, 1.09, .9, .8, .9], [1.55, 0, 1.88, .92, .55, .92]] },
  'home-blue': { create: () => createHybridCottage('blue'),
    lights: [[-.06, 1.54, 1.3]], solids: [[-1.55, 0, -.3, .6, .76, .6]] },
  'home-red': { create: () => createHybridCottage('red'),
    lights: [[.54, 1.54, 1.3]], solids: [[-.82, .4, 1.55, .6, 1, .85], [.72, .4, 1.56, .46, .5, .4]] },
  'old-miller': { create: () => createHybridTrader('old-miller'),
    ports: { output: [0, 1.3, 1.65] }, solids: [[-1.69, 0, .5, .65, .7, 1.18], [1.63, 0, .87, .62, .6, .5]] },
  'oil-trader': { create: () => createHybridTrader('oil-trader'),
    ports: { output: [0, 1.3, 1.65] }, solids: [[-1.76, 0, -.1, .65, 1.1, .65], [1.68, 0, .92, .62, .8, .5]] },
};
const gameVisuals = new WeakMap();

function transformedCollider(collider, matrix) {
  const { x, y, z, width, height, depth } = collider;
  const bounds = new THREE.Box3(new THREE.Vector3(x - width / 2, y, z - depth / 2),
    new THREE.Vector3(x + width / 2, y + height, z + depth / 2)).applyMatrix4(matrix);
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  return { shape: 'box', x: center.x, y: bounds.min.y, z: center.z,
    width: size.x, height: size.y, depth: size.z, radius: Math.hypot(size.x, size.z) / 2, yaw: 0 };
}

export function createGameBuilding(id) {
  const definition = definitions[id], model = definition.create();
  if (id === 'silo') model.setTransferDirection('input');
  const group = new THREE.Group(), placement = new THREE.Group();
  group.name = `game-${id}`;
  group.add(placement); placement.add(model.group);
  placement.rotation.y = definition.yaw || 0;
  placement.position.set(...(definition.offset || [0, 0, 0]).map(value => value * TILE));
  group.updateMatrixWorld(true);
  const colliders = [];
  model.group.traverse(object => {
    for (const collider of object.userData.buildingColliders || []) colliders.push(transformedCollider(collider, object.matrixWorld));
  });
  for (const [x, y, z, width, height, depth] of definition.solids || []) {
    colliders.push(transformedCollider({ x, y, z, width, height, depth }, model.group.matrixWorld));
  }
  const bounds = model.bounds.clone().applyMatrix4(placement.matrixWorld);
  const localPoint = coordinates => new THREE.Vector3(...coordinates).multiplyScalar(TILE).applyMatrix4(placement.matrix);
  const ports = Object.fromEntries(Object.entries(definition.ports || {}).map(([role, point]) => [role, localPoint(point)]));
  const lanternPositions = (definition.lights || []).map(localPoint);
  // Fade, drag and lighting changes must never mutate a shared vehicle/gallery palette.
  const owned = new Map();
  model.group.traverse(object => {
    if (!object.isMesh) return;
    const clone = material => {
      if (!owned.has(material)) {
        const copy = material.clone();
        copy.userData.buildingLight = Boolean(material.emissive?.getHex() && material.emissiveIntensity > 0);
        owned.set(material, copy);
      }
      return owned.get(material);
    };
    object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
  });
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  let productionTime = definition.startTime || 0, ambientTime = 0, working = false;
  const draw = () => model.animate(productionTime, working, reduced, ambientTime);
  let interactionOutline;
  const visual = {
    group, bounds, colliders, obstacles: colliders, ports, lanternPositions,
    popupView: createBuildingPopupAnchor(group, () => bounds, () => [model.group]),
    ownsHit(object) {
      for (let part = object; part; part = part.parent) if (part === model.group) return true;
      return false;
    },
    setOutline(selected, visible) {
      if (visible) interactionOutline ??= createIslandOutline({ group: model.group }, { groundOverlay: true });
      interactionOutline?.update(selected, visible);
    },
    update(dt = 0, producing = false, elapsed = ambientTime + dt) {
      working = Boolean(producing && dt > 0);
      if (working) productionTime += dt;
      ambientTime = elapsed;
      draw();
    },
    stop(elapsed = ambientTime) { working = false; ambientTime = elapsed; draw(); },
    animateAmbient(elapsed) { ambientTime = elapsed; draw(); },
    setNightAmount(amount) {
      const intensity = .12 + THREE.MathUtils.clamp(amount, 0, 1) * 2.1;
      model.group.traverse(object => {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material?.userData.buildingLight) material.emissiveIntensity = intensity;
        }
      });
    },
    setTransferDirection: direction => model.setTransferDirection?.(direction),
    setStockLevel: ratio => model.setStockLevel?.(THREE.MathUtils.clamp(ratio, 0, 1)),
  };
  gameVisuals.set(group, visual);
  draw();
  return visual;
}

export function setGameBuildingNightAmount(root, amount) {
  root.traverse(object => gameVisuals.get(object)?.setNightAmount(amount));
}

export function animateGameBuildingAmbient(root, elapsed, idle = false) {
  root.traverse(object => {
    const visual = gameVisuals.get(object);
    if (idle) visual?.stop(elapsed);
    else visual?.animateAmbient(elapsed);
  });
}

// Construction keeps its selection/drag interface while the model owns its work clock.
export function createPlaceableBuilding(id) {
  const visual = createGameBuilding(id), { group, bounds } = visual;
  const radius = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z)) + .12;
  const material = new THREE.MeshBasicMaterial({ color: 0x91d55e, transparent: true, opacity: .75, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .065, 32), material);
  ring.rotation.x = -Math.PI / 2; ring.position.y = .02; ring.visible = false; group.add(ring);
  let dragging = false, transfer = null;
  return {
    ...visual,
    setDragging(valid) { dragging = true; ring.visible = true; material.color.setHex(valid ? 0x91d55e : 0xe36d63); },
    setSelected(selected) { if (!dragging) ring.visible = selected; },
    drop() { dragging = false; material.color.setHex(0x91d55e); },
    settle() { dragging = false; material.color.setHex(0x91d55e); },
    setPenComplete() {}, receive() {}, pulseTransfer() {},
    setTransferState(state) {
      transfer = state.active ? state : null;
      visual.setTransferDirection(state.direction);
      if (!state.active && id === 'silo') visual.stop();
    },
    animate(elapsed, moving, dt = 0, producing = false) {
      visual.update(dt, !dragging && !moving && (producing || id === 'silo' && Boolean(transfer)), elapsed);
    },
  };
}
