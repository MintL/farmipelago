import { THREE } from './shared.js?v=persistence-20260831-1';
import { crops } from './crops.js?v=cargo-litres-20260831-1';
import { createPhysics } from './physics.js?v=persistence-20260831-1';
import { createLoadoutPreview, createVehicle } from './tractor.js?v=trailer-grain-world-splash-20260831-1';
import { createUi } from './ui.js?v=progression-gates-20260901-1';
import { createBuildingManager } from './buildings.js?v=transfer-batching-20260831-1';
import { generateFarm } from './world-generator.js?v=trailer-grain-size-20260831-1';
import { createMilestoneProgression } from './progression.js?v=progression-gates-20260901-1';
import { deleteGameState, loadGameState, saveGameState } from './persistence.js?v=cargo-litres-20260831-1';
import { OWNED_VEHICLES, TRAILER_STORAGE_CAPACITY, vehicleType } from './vehicles.js?v=trailer-capacity-20260831-1';

const pixelRatioCap = 1.5;
const targetFrameInterval = 1000 / 60 * .96;
const fpsSampleInterval = 500;
const poseCheckpointInterval = 2;
const saveDebounceMs = 250;
const vehicleSwitchSeconds = .6;
const transferLitresPerTick = 10;
const transferTicksPerSecond = 120;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loadResult = loadGameState();
document.body.dataset.renderQuality = 'high';
const fpsValue = document.querySelector('#fpsValue');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .94;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc7dce0);
scene.fog = new THREE.Fog(0xc7dce0, 34, 92);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 200);
const driveCameraOffset = new THREE.Vector3(12, 20, 28);
const mapCameraOffset = new THREE.Vector3(0, 44, 19);
const buildCameraOffset = new THREE.Vector3(22, 30, 28);
const cameraForward = new THREE.Vector2(-driveCameraOffset.x, -driveCameraOffset.z).normalize();
const cameraRight = new THREE.Vector2(-cameraForward.y, cameraForward.x);
const driveCameraTarget = new THREE.Vector3();
const mapCameraTarget = new THREE.Vector3();
camera.position.copy(driveCameraOffset);
camera.lookAt(driveCameraTarget);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xf3f6f1, 0x728277, 1.05));
const sun = new THREE.DirectionalLight(0xffefd0, 1.55);
sun.position.set(-16, 26, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 38; sun.shadow.camera.bottom = -38;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
sun.shadow.bias = -.0002; sun.shadow.normalBias = .045; sun.shadow.radius = 3;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbcd5ed, .5);
fill.position.set(22, 14, -26);
scene.add(fill);

const clouds = createClouds();
scene.add(clouds.group);

function createClouds() {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0xf7fbfa, transparent: true, opacity: .88, fog: false, depthWrite: false });
  const cloudGeometry = new THREE.BoxGeometry(1, 1, 1);
  const definitions = [
    { x: -13, y: -7, z: 18, width: 6.8, height: 2.4, depth: 3.2, phase: 0 },
    { x: -11.5, y: -6.2, z: 19, width: 3.8, height: 3.1, depth: 3.5, phase: .9 },
    { x: 13, y: -7.2, z: 13, width: 7.1, height: 2.6, depth: 3.3, phase: 1.7 },
    { x: 11.5, y: -6.3, z: 12, width: 3.5, height: 3.2, depth: 3.6, phase: 2.5 },
    { x: 5, y: -6, z: 2, width: 6.5, height: 2.5, depth: 3.1, phase: 3.3 },
    { x: -7, y: -5.8, z: -15, width: 7.2, height: 2.7, depth: 3.4, phase: 4.1 },
    { x: -6, y: -5.1, z: -16, width: 3.5, height: 3.2, depth: 3.7, phase: 5 },
    { x: 11.5, y: -6.4, z: -30, width: 6.5, height: 2.8, depth: 3.5, phase: 5.8 },
    { x: 7.5, y: -5.5, z: -31, width: 3.5, height: 3.4, depth: 3.7, phase: 6.6 },
    { x: -7, y: -5.4, z: -47, width: 6.8, height: 2.6, depth: 3.2, phase: 7.4 },
    { x: 9, y: -5.9, z: -61, width: 7.1, height: 2.7, depth: 3.4, phase: 8.2 },
    { x: 7, y: -5.1, z: -62, width: 3, height: 3.3, depth: 3.5, phase: 9 },
  ];
  const cloudData = definitions.map(definition => {
    const cloud = new THREE.Mesh(cloudGeometry, material);
    cloud.position.set(definition.x, definition.y, definition.z);
    cloud.scale.set(definition.width, definition.height, definition.depth);
    cloud.castShadow = false;
    cloud.receiveShadow = false;
    group.add(cloud);
    return { cloud, ...definition };
  });

  return {
    group,
    animate(elapsed) {
      for (const cloud of cloudData) cloud.cloud.position.y = cloud.y + Math.sin(elapsed * .3 + cloud.phase) * .12;
    },
  };
}

const physics = await createPhysics();
const fleet = OWNED_VEHICLES.map(owned => {
  const definition = vehicleType(owned.type);
  const visual = createVehicle(scene, owned.type);
  const loadout = { ...definition.defaultLoadout };
  visual.setLoadout(loadout);
  return {
    ...owned,
    definition,
    visual,
    loadout,
    heading: 0,
    toolEnabled: false,
    spawn: null,
    storage: { capacity: definition.storageCapacity, contents: {} },
  };
});
let activeVehicleIndex = 0;
let farm;
let ui;
let buildings;
let loadoutPreviews = null;
let elapsed = 0;
let last = performance.now();
let animationLast = last;
let frameBudget = targetFrameInterval;
let fpsWindowStarted = last;
let fpsFrameCount = 0;
let gameplayWasBlocked = false;
let renderRequested = true;
let viewMode = 'drive';
let progression;
let saveTimer = null;
let persistenceEnabled = !loadResult.unavailable;
let persistenceReady = false;
let lastPoseCheckpoint = 0;
let vehicleTransition = null;
let visualDriveAmount = 0;
let visualSteer = 0;
let activeTransfer = null;
let lastTrailerGrainTrail = -Infinity;
const buildRaycaster = new THREE.Raycaster();
const buildPointer = new THREE.Vector2();
const buildPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const buildWorldPoint = new THREE.Vector3();
const siloPopupWorld = new THREE.Vector3();
function activeVehicle() {
  return fleet[activeVehicleIndex];
}

function activeVehicleState() {
  return physics.vehicleState(activeVehicle().id);
}

function storageCapacityFor(vehicle) {
  return vehicle.type === 'tractor' && vehicle.loadout.tool === 'trailer'
    ? TRAILER_STORAGE_CAPACITY
    : vehicle.definition.storageCapacity;
}

function setStorageCapacity(vehicle) {
  vehicle.storage.capacity = storageCapacityFor(vehicle);
  vehicle.visual.setStorageAmount(storageAmount(vehicle), vehicle.storage.capacity);
}

function canTransferCargo(vehicle = activeVehicle()) {
  return vehicle.storage.capacity > 0;
}

function persistentState() {
  return {
    world: farm.persistentState(elapsed),
    buildings: buildings.persistentState(),
    progression: progression.persistentState(),
    vehicles: fleet.map(vehicle => {
      const state = physics.vehicleState(vehicle.id);
      return {
        id: vehicle.id,
        type: vehicle.type,
        position: { x: state.x, y: state.y, z: state.z },
        grounded: state.grounded,
        heading: vehicle.heading,
        loadout: { ...vehicle.loadout },
        toolEnabled: vehicle.toolEnabled,
        storage: { ...vehicle.storage.contents },
      };
    }),
    activeVehicleId: activeVehicle().id,
    ui: ui.persistentState(),
  };
}

function writeSave() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!persistenceEnabled || !persistenceReady) return true;
  const saved = saveGameState(persistentState());
  if (!saved) {
    persistenceEnabled = false;
  }
  return saved;
}

function scheduleSave(delay = saveDebounceMs) {
  if (!persistenceEnabled || !persistenceReady) return;
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(writeSave, delay);
}

function restartGame() {
  const wasPersistenceEnabled = persistenceEnabled;
  persistenceEnabled = false;
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!deleteGameState()) {
    persistenceEnabled = wasPersistenceEnabled;
    return false;
  }
  location.reload();
  return true;
}

function resetFpsMeter(now) {
  fpsWindowStarted = now;
  fpsFrameCount = 0;
  fpsValue.textContent = '-- FPS';
}

function recordRenderedFrame(now) {
  fpsFrameCount++;
  const sampleTime = now - fpsWindowStarted;
  if (sampleTime < fpsSampleInterval) return;
  fpsValue.textContent = `${Math.round(fpsFrameCount * 1000 / sampleTime)} FPS`;
  fpsWindowStarted = now;
  fpsFrameCount = 0;
}

function updateDriveCamera(state, dt, snap = false) {
  const goal = new THREE.Vector3(state.x, state.y + .75, state.z);
  driveCameraTarget.lerp(goal, snap ? 1 : 1 - Math.exp(-2.2 * dt));
  camera.position.copy(driveCameraTarget).add(driveCameraOffset);
  camera.lookAt(driveCameraTarget);
}

function syncFleetVisuals(dt) {
  for (const vehicle of fleet) {
    const state = physics.vehicleState(vehicle.id);
    vehicle.visual.sync(
      state,
      vehicle.heading,
      vehicle === activeVehicle() ? visualSteer : 0,
      vehicle === activeVehicle() ? visualDriveAmount : 0,
      dt,
      elapsed,
    );
  }
}

function updateMapCamera() {
  camera.position.copy(mapCameraTarget).add(mapCameraOffset);
  camera.lookAt(mapCameraTarget);
}

function updateBuildCamera() {
  camera.position.copy(mapCameraTarget).add(buildCameraOffset);
  camera.lookAt(mapCameraTarget);
}

function setCameraView(nextMode, snapTarget = false) {
  viewMode = nextMode;
  if (viewMode === 'overlay') {
    const state = activeVehicleState();
    if (snapTarget) mapCameraTarget.set(state.x, 0, state.z);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    updateMapCamera();
  }
  else if (viewMode === 'build') {
    const state = activeVehicleState();
    if (snapTarget) mapCameraTarget.set(state.x, 0, state.z);
    camera.fov = 44;
    camera.updateProjectionMatrix();
    updateBuildCamera();
  }
  else {
    camera.fov = 38;
    camera.updateProjectionMatrix();
    updateDriveCamera(activeVehicleState(), 0, true);
  }
}

function applyCropOverlay() {
  if (!farm || !ui) return;
  const overlay = ui.cropOverlayState();
  if (overlay.enabled) {
    farm.setCropOverlay(overlay.cropId);
    setCameraView('overlay', viewMode !== 'overlay');
  }
  else {
    farm.hideCropOverlay();
    setCameraView('drive');
  }
}

function applyBuildMode(enabled) {
  if (!farm) return;
  buildings?.setBuildMode(enabled);
  if (enabled) {
    farm.hideCropOverlay();
    setCameraView('build', viewMode !== 'build');
  }
  else if (viewMode === 'build') setCameraView('drive');
}

function worldAtScreenPoint(point) {
  buildPointer.set(point.x / innerWidth * 2 - 1, -(point.y / innerHeight) * 2 + 1);
  buildRaycaster.setFromCamera(buildPointer, camera);
  return buildRaycaster.ray.intersectPlane(buildPlane, buildWorldPoint) ? buildWorldPoint.clone() : null;
}

function buildingAtScreenPoint(point) {
  buildPointer.set(point.x / innerWidth * 2 - 1, -(point.y / innerHeight) * 2 + 1);
  buildRaycaster.setFromCamera(buildPointer, camera);
  for (const hit of buildRaycaster.intersectObject(farm.group, true)) {
    const building = buildings?.selectFromObject(hit.object);
    if (building) return building;
  }
  return null;
}

function beginBuildingDrag(point) {
  const worldPoint = worldAtScreenPoint(point);
  if (!worldPoint || !buildings) return false;
  return buildings.beginDrag(worldPoint, ui.buildState().selectedBuilding, buildingAtScreenPoint(point));
}

function resetActiveVehicle() {
  const vehicle = activeVehicle();
  physics.resetVehicle(vehicle.id, vehicle.spawn);
  vehicle.heading = 0;
  const state = activeVehicleState();
  vehicle.visual.sync(state, vehicle.heading, 0, 0, 0, elapsed);
  if (viewMode === 'overlay' || viewMode === 'build') {
    mapCameraTarget.set(state.x, 0, state.z);
    if (viewMode === 'build') updateBuildCamera();
    else updateMapCamera();
  }
  else updateDriveCamera(state, 0, true);
  scheduleSave();
}

function resetFleet() {
  fleet.forEach((vehicle, index) => {
    const spawn = farm.vehicleSpawns[index % farm.vehicleSpawns.length];
    vehicle.spawn = spawn;
    vehicle.heading = 0;
    vehicle.toolEnabled = false;
    vehicle.storage.contents = {};
    setStorageCapacity(vehicle);
    vehicle.visual.setLoadout(vehicle.loadout);
    vehicle.visual.setToolEnabled(false, true);
    if (physics.hasVehicle(vehicle.id)) physics.resetVehicle(vehicle.id, spawn);
    else physics.createVehicle(vehicle.id, spawn);
  });
  physics.setActiveVehicle(activeVehicle().id);
  fleet.forEach(vehicle => {
    const state = physics.vehicleState(vehicle.id);
    vehicle.visual.sync({ ...state, grounded: true }, vehicle.heading, 0, 0, 0, elapsed);
  });
}

function validSavedPosition(position) {
  if (![position?.x, position?.y, position?.z].every(Number.isFinite) || position.y < -11) return false;
  const tiles = [...farm.terrain.values()];
  const minX = Math.min(...tiles.map(tile => tile.x)) - 6;
  const maxX = Math.max(...tiles.map(tile => tile.x)) + 6;
  const minZ = Math.min(...tiles.map(tile => tile.z)) - 6;
  const maxZ = Math.max(...tiles.map(tile => tile.z)) + 6;
  const maxY = Math.max(...tiles.map(tile => tile.topY)) + 7;
  return position.x >= minX && position.x <= maxX
    && position.z >= minZ && position.z <= maxZ
    && position.y <= maxY;
}

function restoreFleet(savedVehicles, savedActiveVehicleId) {
  resetFleet();
  const savedById = new Map(Array.isArray(savedVehicles)
    ? savedVehicles.filter(saved => typeof saved?.id === 'string').map(saved => [saved.id, saved])
    : []);
  for (const vehicle of fleet) {
    const saved = savedById.get(vehicle.id);
    if (!saved || saved.type !== vehicle.type) continue;
    const loadout = { ...vehicle.definition.defaultLoadout };
    if (vehicle.definition.slots.includes('tool') && ['plough', 'seeder', 'sprayer', 'trailer'].includes(saved.loadout?.tool)) {
      loadout.tool = saved.loadout.tool;
    }
    if (vehicle.definition.slots.includes('frontTool') && saved.loadout?.frontTool === 'loader') {
      loadout.frontTool = saved.loadout.frontTool;
    }
    vehicle.loadout = loadout;
    setStorageCapacity(vehicle);
    vehicle.heading = Number.isFinite(saved.heading)
      ? Math.atan2(Math.sin(saved.heading), Math.cos(saved.heading))
      : 0;
    vehicle.toolEnabled = Boolean(saved.toolEnabled);
    vehicle.storage.contents = {};
    let remaining = vehicle.storage.capacity;
    for (const [cropId, savedAmount] of Object.entries(saved.storage || {})) {
      if (!crops[cropId] || remaining <= 0) continue;
      const amount = Math.min(remaining, Math.max(0, Math.floor(Number(savedAmount) || 0)));
      if (!amount) continue;
      vehicle.storage.contents[cropId] = amount;
      remaining -= amount;
    }
    vehicle.visual.setLoadout(vehicle.loadout);
    vehicle.visual.setStorageAmount(storageAmount(vehicle), vehicle.storage.capacity);
    vehicle.visual.setToolEnabled(vehicle.toolEnabled, true);
    if (validSavedPosition(saved.position)) physics.placeVehicle(vehicle.id, saved.position, saved.grounded);
  }
  const savedActiveIndex = fleet.findIndex(vehicle => vehicle.id === savedActiveVehicleId);
  activeVehicleIndex = savedActiveIndex === -1 ? 0 : savedActiveIndex;
  physics.setActiveVehicle(activeVehicle().id);
  for (const vehicle of fleet) {
    const state = physics.vehicleState(vehicle.id);
    vehicle.visual.sync(state, vehicle.heading, 0, 0, 0, elapsed);
  }
}

function initializeFarm(savedState) {
  farm = generateFarm(scene, physics, savedState?.world?.seed, 0, scheduleSave);
  buildings.setParent(farm.group);
  progression = createMilestoneProgression(savedState?.progression);
  ui.setUnlockedGates(progression.state().unlockedGates);
  if (savedState) {
    farm.restorePersistentState(savedState.world, elapsed);
    buildings.restorePersistentState(savedState.buildings);
    ui.restorePersistentState(savedState.ui);
    restoreFleet(savedState.vehicles, savedState.activeVehicleId);
  }
  else resetFleet();
  syncActiveVehicleUi();
  ui.setMilestone(progression.state());
  syncStorageUi();
  farm.cargoPort.setLoadRatio(milestoneLoadRatio());
  applyCropOverlay();
  updateDriveCamera(activeVehicleState(), 0, true);
  persistenceReady = true;
  writeSave();
}

function storageAmount(vehicle = activeVehicle()) {
  return Object.values(vehicle.storage.contents).reduce((sum, amount) => sum + amount, 0);
}

function storageCropId(vehicle = activeVehicle()) {
  const storage = vehicle.storage;
  return Object.keys(storage.contents).find(cropId => storage.contents[cropId] > 0) || null;
}

function storageLabel() {
  const vehicle = activeVehicle();
  const cropId = storageCropId(vehicle);
  if (vehicle.type === 'tractor' && vehicle.loadout.tool === 'trailer') return cropId ? crops[cropId]?.name || 'Trailer' : 'Trailer';
  return cropId ? crops[cropId]?.name || 'Storage' : 'Storage';
}

function syncStorageUi() {
  const vehicle = activeVehicle();
  const storage = vehicle.storage;
  vehicle.visual.setStorageAmount(storageAmount(vehicle), storage.capacity);
  ui?.setHarvestMeter(storageAmount(vehicle), storage.capacity, storageLabel());
}

function syncActiveVehicleUi() {
  if (!ui) return;
  const vehicle = activeVehicle();
  ui.setActiveVehicle({
    id: vehicle.id,
    type: vehicle.type,
    name: vehicle.definition.name,
    icon: vehicle.definition.icon,
    slots: [...vehicle.definition.slots],
    loadout: { ...vehicle.loadout },
    toolEnabled: vehicle.toolEnabled,
  });
  syncStorageUi();
}

function cycleVehicle() {
  if (vehicleTransition || activeTransfer) return;
  const previous = activeVehicle();
  const from = driveCameraTarget.clone();
  ui.setBarnAvailable(false);
  activeVehicleIndex = (activeVehicleIndex + 1) % fleet.length;
  const vehicle = activeVehicle();
  physics.setActiveVehicle(vehicle.id);
  previous.visual.setSelected(false);
  vehicle.visual.setSelected(true);
  syncActiveVehicleUi();
  const state = activeVehicleState();
  if (reducedMotion) {
    updateDriveCamera(state, 0, true);
    farm.updateOcclusion(camera.position, state, 0);
  }
  else {
    vehicleTransition = {
      elapsed: 0,
      from,
      destination: new THREE.Vector3(state.x, state.y + .75, state.z),
    };
  }
  scheduleSave();
}

function milestoneLoadRatio() {
  const milestone = progression.state();
  if (milestone.complete) return 1;
  const requirements = milestone.choiceLimit
    ? milestone.requirements.filter(requirement => requirement.selected)
    : milestone.requirements;
  const delivered = requirements.reduce((sum, requirement) => sum + requirement.delivered, 0);
  const target = milestone.choiceLimit
    ? requirements.length * requirements[0]?.target || 0
    : requirements.reduce((sum, requirement) => sum + requirement.target, 0);
  return target ? delivered / target : 0;
}

function startTransfer(transfer) {
  if (activeTransfer) return false;
  activeTransfer = { ...transfer, remaining: transfer.amount, moved: 0, tickElapsed: 0, lastVisual: -Infinity };
  return true;
}

function transferVehicle() {
  return activeTransfer ? fleet.find(vehicle => vehicle.id === activeTransfer.vehicleId) || null : null;
}

function transferIsInRange(transfer, vehicle) {
  const state = physics.vehicleState(vehicle.id);
  if (transfer.kind === 'cargo') return farm.cargoPort.isNear(state.x, state.z);
  return buildings?.siloAt(state.x, state.z)?.id === transfer.siloId;
}

function finishTransfer() {
  const transfer = activeTransfer;
  if (!transfer) return;
  const vehicle = transferVehicle();
  activeTransfer = null;
  vehicle?.visual.stopUnload();
  if (vehicle?.id === activeVehicle().id) syncStorageUi();
  if (transfer.kind === 'cargo') {
    const nextState = progression.state();
    ui.setMilestone(nextState);
    farm.cargoPort.setLoadRatio(milestoneLoadRatio());
  }
  scheduleSave();
}

function transferTick() {
  const transfer = activeTransfer;
  const vehicle = transferVehicle();
  if (!transfer || !vehicle || vehicle.id !== activeVehicle().id || !transferIsInRange(transfer, vehicle)) return false;
  const amount = Math.min(transferLitresPerTick, transfer.remaining);
  let moved = 0;
  if (transfer.kind === 'load') {
    moved = buildings.takeFrom(transfer.siloId, transfer.cropId, amount, false);
    if (moved) vehicle.storage.contents[transfer.cropId] = (vehicle.storage.contents[transfer.cropId] || 0) + moved;
  }
  else if (transfer.kind === 'unload') {
    const available = Math.max(0, vehicle.storage.contents[transfer.cropId] || 0);
    moved = Math.min(amount, available);
    if (moved && buildings.storeIn(transfer.siloId, transfer.cropId, moved, elapsed, false)) {
      vehicle.storage.contents[transfer.cropId] -= moved;
      if (!vehicle.storage.contents[transfer.cropId]) delete vehicle.storage.contents[transfer.cropId];
    }
    else moved = 0;
  }
  else {
    const accepted = progression.accept({ [transfer.cropId]: amount });
    moved = accepted[transfer.cropId] || 0;
    if (moved) {
      vehicle.storage.contents[transfer.cropId] -= moved;
      if (!vehicle.storage.contents[transfer.cropId]) delete vehicle.storage.contents[transfer.cropId];
    }
  }
  if (!moved) {
    finishTransfer();
    return false;
  }
  transfer.remaining -= moved;
  transfer.moved += moved;
  if ((transfer.kind === 'unload' || transfer.kind === 'cargo') && elapsed - transfer.lastVisual >= .42) {
    vehicle.visual.playUnload(transfer.target, transfer.cropId, elapsed);
    transfer.lastVisual = elapsed;
  }
  if (transfer.remaining <= 0) finishTransfer();
  return true;
}

function updateTransfer(dt) {
  if (!activeTransfer) return;
  activeTransfer.tickElapsed += dt;
  const ticks = Math.floor(activeTransfer.tickElapsed * transferTicksPerSecond);
  if (!ticks) return;
  activeTransfer.tickElapsed -= ticks / transferTicksPerSecond;
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
  syncStorageUi();
  if (cargoChanged) {
    ui.setMilestone(progression.state());
    farm.cargoPort.setLoadRatio(milestoneLoadRatio());
  }
  scheduleSave();
}

function emptyIntoSilo(siloId) {
  const vehicle = activeVehicle();
  if (!canTransferCargo(vehicle)) return;
  const state = activeVehicleState();
  const amount = storageAmount();
  if (!amount) return;
  const cropId = storageCropId();
  const silo = buildings?.siloAt(state.x, state.z);
  if (silo?.id !== siloId) return;
  startTransfer({
    kind: 'unload', vehicleId: vehicle.id, siloId, cropId, amount,
    target: { x: silo.site.x, y: silo.site.y + 3.58, z: silo.site.z },
  });
}

function loadFromSilo(siloId, cropId) {
  if (!crops[cropId]) return;
  const vehicle = activeVehicle();
  if (!canTransferCargo(vehicle)) return;
  const state = activeVehicleState();
  const silo = buildings?.siloAt(state.x, state.z);
  if (silo?.id !== siloId) return;
  const storedCropId = storageCropId();
  if (storedCropId && storedCropId !== cropId) return;
  const space = vehicle.storage.capacity - storageAmount();
  if (space <= 0) return;
  const available = Math.max(0, Math.floor(Number(silo.contents[cropId]) || 0));
  const amount = Math.min(available, space);
  if (!amount) return;
  startTransfer({ kind: 'load', vehicleId: vehicle.id, siloId, cropId, amount });
}

function dropOffCargo() {
  const vehicle = activeVehicle();
  if (!canTransferCargo(vehicle)) return;
  const storage = vehicle.storage;
  const state = activeVehicleState();
  if (!farm.cargoPort.isNear(state.x, state.z)) return;
  const milestone = progression.state();
  if (milestone.complete) return;
  if (!storageAmount()) return;
  const cropId = storageCropId();
  const requirement = milestone.requirements.find(entry => entry.cropId === cropId);
  const amount = requirement?.accepting
    ? Math.min(storage.contents[cropId] || 0, Math.max(0, requirement.target - requirement.delivered))
    : 0;
  if (!amount) return;
  startTransfer({
    kind: 'cargo', vehicleId: vehicle.id, cropId, amount,
    target: farm.cargoPort.unloadTarget(),
  });
}

ui = createUi({
  onRestart: restartGame,
  onLoadoutChange: loadout => {
    const vehicle = activeVehicle();
    if (vehicle.loadout.tool === 'trailer' && loadout.tool !== 'trailer' && storageAmount(vehicle)) return false;
    vehicle.loadout = { ...vehicle.loadout, ...loadout };
    setStorageCapacity(vehicle);
    vehicle.visual.setLoadout(vehicle.loadout);
    syncActiveVehicleUi();
    scheduleSave();
    return true;
  },
  onLoadoutPreview: loadout => loadoutPreviews?.setLoadout(loadout),
  onToolChange: enabled => {
    const vehicle = activeVehicle();
    vehicle.toolEnabled = enabled;
    vehicle.visual.setToolEnabled(enabled);
    scheduleSave();
  },
  onCycleVehicle: cycleVehicle,
  onSiloLoad: loadFromSilo,
  onSiloUnload: emptyIntoSilo,
  onCargoDropOff: dropOffCargo,
  onCropOverlayChange: applyCropOverlay,
  onBuildModeChange: applyBuildMode,
  onBuildPointerStart: beginBuildingDrag,
  onBuildPointerMove: point => {
    const worldPoint = worldAtScreenPoint(point);
    if (worldPoint) buildings?.moveDrag(worldPoint);
  },
  onBuildPointerEnd: () => { if (buildings?.endDrag()) ui.clearBuildingSelection(); },
  onBuildPointerCancel: () => buildings?.cancelDrag(),
  onPersistentStateChange: scheduleSave,
  panSurface: renderer.domElement,
});
buildings = createBuildingManager({
  getSiteAt: (x, z, radius) => farm?.buildingSiteAt(x, z, radius),
  setCollider: (id, obstacle) => farm?.setBuildingCollider(id, obstacle),
  onChange: scheduleSave,
});
initializeFarm(loadResult.state);

function createLoadoutPreviews() {
  const vehicle = createLoadoutPreview(document.querySelector('#vehiclePreview'), 'vehicles');
  const tool = createLoadoutPreview(document.querySelector('#equipmentPreview'), 'equipment');
  const frontTool = createLoadoutPreview(document.querySelector('#frontToolPreview'), 'front-tools');
  return {
    setLoadout(loadout) {
      vehicle.setItem(loadout.vehicle);
      tool.setItem(loadout.tool);
      frontTool.setItem(loadout.frontTool);
    },
    render(time) { vehicle.render(time); tool.render(time); frontTool.render(time); },
  };
}

function forToolRows(state, rows, localZ, apply) {
  const heading = activeVehicle().heading;
  const sine = Math.sin(heading), cosine = Math.cos(heading);
  for (const localX of rows) {
    const x = state.x + localX * cosine + localZ * sine;
    const z = state.z - localX * sine + localZ * cosine;
    apply(x, z);
  }
}

function applyTool(state) {
  const vehicle = activeVehicle();
  if (!vehicle.toolEnabled || !state.grounded || state.speed < .4) return;
  const levelY = farm.farmingLevelNear(state.x, state.z);
  const { tool } = vehicle.loadout;
  if (vehicle.type === 'harvester') {
    const available = vehicle.storage.capacity - storageAmount();
    if (available <= 0) return;
    const collected = {};
    let acceptedCropId = storageCropId();
    let collectedAmount = 0;
    forToolRows(state, [-1.32, -.88, -.44, 0, .44, .88, 1.32], -1.72, (x, z) => {
      if (collectedAmount >= available) return;
      const harvest = farm.harvestAt(x, z, levelY, acceptedCropId);
      if (!harvest) return;
      acceptedCropId ||= harvest.cropId;
      const amount = Math.min(harvest.yieldAmount, available - collectedAmount);
      collected[harvest.cropId] = (collected[harvest.cropId] || 0) + amount;
      collectedAmount += amount;
    });
    if (collectedAmount) {
      for (const [cropId, amount] of Object.entries(collected)) {
        vehicle.storage.contents[cropId] = (vehicle.storage.contents[cropId] || 0) + amount;
      }
      syncStorageUi();
    }
    return;
  }
  if (tool === 'plough') {
    forToolRows(state, [-.6, -.2, .2, .6], 1.58, (x, z) => {
      farm.ploughAt(x, z, levelY, vehicle.heading);
    });
  }
  else if (tool === 'seeder') {
    const cropId = ui.activeSeedId();
    if (!progression.isUnlocked(`crop:${cropId}`)) return;
    forToolRows(state, [-.32, .32], 1.54, (x, z) => {
      farm.seedAt(x, z, levelY, elapsed, cropId);
    });
  }
  else if (tool === 'sprayer') {
    forToolRows(state, [-1.15, -.77, -.38, 0, .38, .77, 1.15], 1.58, (x, z) => {
      farm.sprayAt(x, z, levelY);
    });
  }
}

function updateDrive(dt) {
  const vehicle = activeVehicle();
  const input = ui.driveInput();
  const rawDrive = Math.hypot(input.x, input.y);
  const driveAmount = THREE.MathUtils.clamp((rawDrive - .08) / .92, 0, 1);
  visualDriveAmount = driveAmount;
  const before = activeVehicleState();
  let driveDirection = { x: -Math.sin(vehicle.heading), z: -Math.cos(vehicle.heading) };
  let steer = 0;

  if (driveAmount > 0) {
    const unitX = input.x / rawDrive;
    const unitY = input.y / rawDrive;
    const desiredX = cameraRight.x * unitX + cameraForward.x * unitY;
    const desiredZ = cameraRight.y * unitX + cameraForward.y * unitY;
    const desiredHeading = Math.atan2(-desiredX, -desiredZ);
    const turnDelta = Math.atan2(Math.sin(desiredHeading - vehicle.heading), Math.cos(desiredHeading - vehicle.heading));
    const maxTurn = (before.grounded ? 2.75 : 1.65) * dt;
    vehicle.heading += THREE.MathUtils.clamp(turnDelta, -maxTurn, maxTurn);
    steer = THREE.MathUtils.clamp(turnDelta * 1.35, -1, 1);
    driveDirection = { x: desiredX, z: desiredZ };
  }
  visualSteer = steer;

  physics.drive(dt, driveDirection, driveAmount, ui.consumeJump(), vehicle.toolEnabled);
  physics.step(dt);
  const state = activeVehicleState();
  if (!before.grounded && state.grounded && before.verticalSpeed < -.35) {
    const impact = Math.max(3, Math.abs(before.verticalSpeed), state.speed * .65);
    farm.splashAt(state.x, state.z, impact);
    const cropId = storageCropId(vehicle);
    if (vehicle.type === 'tractor' && vehicle.loadout.tool === 'trailer' && cropId) {
      farm.grainSplashAt(
        state.x + Math.sin(vehicle.heading) * 2.54,
        state.y + .58,
        state.z + Math.cos(vehicle.heading) * 2.54,
        impact,
        cropId,
      );
    }
  }
  const trailerCropId = storageCropId(vehicle);
  if (vehicle.type === 'tractor' && vehicle.loadout.tool === 'trailer' && trailerCropId && state.grounded && state.speed >= .7 && elapsed - lastTrailerGrainTrail >= .2) {
    lastTrailerGrainTrail = elapsed;
    farm.grainSplashAt(
      state.x + Math.sin(vehicle.heading) * 2.54,
      state.y + .48,
      state.z + Math.cos(vehicle.heading) * 2.54,
      .4,
      trailerCropId,
      .24,
      1,
    );
  }
  if (state.y < -12) {
    resetActiveVehicle();
    return;
  }

  ui.setBarnAvailable(farm.insideBarn(state.x, state.z));
  applyTool(state);
  updateDriveCamera(state, dt);
  farm.updateOcclusion(camera.position, state, dt);
}

function updateVehicleTransition(dt) {
  visualDriveAmount = 0;
  visualSteer = 0;
  physics.drive(dt, { x: 0, z: 0 }, 0, ui.consumeJump(), false);
  physics.step(dt);
  const state = activeVehicleState();
  vehicleTransition.elapsed += dt;
  vehicleTransition.destination.set(state.x, state.y + .75, state.z);
  const amount = THREE.MathUtils.smoothstep(vehicleTransition.elapsed / vehicleSwitchSeconds, 0, 1);
  driveCameraTarget.lerpVectors(vehicleTransition.from, vehicleTransition.destination, amount);
  camera.position.copy(driveCameraTarget).add(driveCameraOffset);
  camera.position.y += Math.sin(amount * Math.PI) * 4;
  camera.lookAt(driveCameraTarget);
  farm.updateOcclusion(camera.position, state, dt);
  if (vehicleTransition.elapsed >= vehicleSwitchSeconds) {
    vehicleTransition = null;
    updateDriveCamera(state, 0, true);
  }
}

function updateMap(dt) {
  const pan = ui.consumePan();
  mapCameraTarget.x += pan.keyboardX * 19 * dt - pan.dragX * .055;
  mapCameraTarget.z += pan.keyboardZ * 19 * dt - pan.dragY * .055;
  if (viewMode === 'build') updateBuildCamera();
  else updateMapCamera();
}

function updateStoragePopup() {
  if (viewMode !== 'drive' || vehicleTransition) {
    ui.setStoragePopup(null);
    return;
  }
  const state = activeVehicleState();
  const machine = {
    type: activeVehicle().type,
    capacity: activeVehicle().storage.capacity,
    contents: activeVehicle().storage.contents,
    canTransfer: canTransferCargo(),
  };
  if (farm.cargoPort.isNear(state.x, state.z)) {
    const milestone = progression.state();
    const target = farm.cargoPort.unloadTarget();
    siloPopupWorld.set(target.x, target.y + 1.8, target.z).project(camera);
    if (siloPopupWorld.z < -1 || siloPopupWorld.z > 1 || Math.abs(siloPopupWorld.x) > 1 || Math.abs(siloPopupWorld.y) > 1) {
      ui.setStoragePopup(null);
      return;
    }
    ui.setStoragePopup({
      kind: 'cargo',
      items: milestone.requirements.map(requirement => ({
        id: requirement.cropId,
        amount: requirement.delivered,
        target: requirement.target,
        accepting: requirement.accepting,
        locked: requirement.locked,
      })),
      machine,
      x: (siloPopupWorld.x * .5 + .5) * innerWidth,
      y: (-siloPopupWorld.y * .5 + .5) * innerHeight,
    });
    return;
  }
  const silo = buildings?.siloAt(state.x, state.z);
  if (!silo) {
    ui.setStoragePopup(null);
    return;
  }
  siloPopupWorld.set(silo.site.x, silo.site.y + 4.05, silo.site.z).project(camera);
  if (siloPopupWorld.z < -1 || siloPopupWorld.z > 1 || Math.abs(siloPopupWorld.x) > 1 || Math.abs(siloPopupWorld.y) > 1) {
    ui.setStoragePopup(null);
    return;
  }
  ui.setStoragePopup({
    kind: 'silo',
    id: silo.id,
    contents: silo.contents,
    machine,
    x: (siloPopupWorld.x * .5 + .5) * innerWidth,
    y: (-siloPopupWorld.y * .5 + .5) * innerHeight,
  });
}

function update(dt) {
  ui.animate(dt);
  if (ui.isGameplayBlocked()) return;
  elapsed += dt;
  if (vehicleTransition) updateVehicleTransition(dt);
  else if (viewMode === 'overlay' || viewMode === 'build') {
    visualDriveAmount = 0;
    visualSteer = 0;
    updateMap(dt);
  }
  else updateDrive(dt);
  updateTransfer(dt);
  const cargoEvent = farm?.cargoPort.update(dt, camera, progression.state().pickupReady);
  if (cargoEvent?.pickedUp) {
    const shipped = progression.state();
    if (progression.collect()) {
      const nextState = progression.state();
      ui.setMilestone(nextState);
      ui.setUnlockedGates(nextState.unlockedGates);
      farm.cargoPort.setLoadRatio(0);
      scheduleSave();
    }
  }
  syncFleetVisuals(dt);
  farm?.animate(elapsed);
  buildings?.animate(elapsed);
  updateStoragePopup();
  clouds.animate(elapsed);
  if (elapsed - lastPoseCheckpoint >= poseCheckpointInterval) {
    lastPoseCheckpoint = elapsed;
    scheduleSave();
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const gameplayBlocked = ui.isGameplayBlocked();
  if (gameplayBlocked) {
    if (!gameplayWasBlocked) resetFpsMeter(now);
    if (ui.isBarnOpen() && !loadoutPreviews) {
      loadoutPreviews = createLoadoutPreviews();
      loadoutPreviews.setLoadout(ui.activeLoadout());
    }
    if (ui.isBarnOpen()) loadoutPreviews?.render(now / 1000);
    if (!gameplayWasBlocked || renderRequested) renderer.render(scene, camera);
    gameplayWasBlocked = true;
    renderRequested = false;
    last = now;
    animationLast = now;
    frameBudget = targetFrameInterval;
    return;
  }
  if (gameplayWasBlocked) {
    gameplayWasBlocked = false;
    resetFpsMeter(now);
    last = now;
    animationLast = now;
    frameBudget = targetFrameInterval;
  }
  frameBudget += Math.min(100, now - animationLast);
  animationLast = now;
  if (frameBudget < targetFrameInterval) return;
  frameBudget %= targetFrameInterval;
  const dt = Math.min(.033, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  recordRenderedFrame(now);
  renderRequested = false;
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderRequested = true;
});

document.addEventListener('visibilitychange', () => {
  resetFpsMeter(performance.now());
  if (document.visibilityState === 'hidden') writeSave();
});
window.addEventListener('pagehide', writeSave);

requestAnimationFrame(animate);
