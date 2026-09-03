import { THREE } from './shared.js?v=bale-wrapper-20260902-1';
import { crops } from './crops.js?v=bale-wrapper-20260902-1';
import { createPhysics } from './physics.js?v=persistence-20260831-1';
import { createLoadoutPreview, createVehicle } from './tractor.js?v=cattle-20260902-2';
import { createUi } from './ui.js?v=construction-20260902-12';
import { createBuildingManager } from './buildings.js?v=construction-20260902-13';
import { generateFarm } from './world-generator.js?v=cattle-20260902-1';
import { createMilestoneProgression } from './progression.js?v=cattle-20260902-1';
import { deleteGameState, loadGameState, saveGameState } from './persistence.js?v=construction-20260902-1';
import { OWNED_VEHICLES, vehicleType } from './vehicles.js?v=cattle-20260902-1';
import { BALER_STORAGE_CAPACITY, equipmentDefinition, normalizeLoadout } from './equipment.js?v=cattle-20260902-1';
import { HAY_BALE_LITRES } from './livestock.js?v=construction-20260902-8';

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
const cinematicCameraFov = 44;
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
    frontToolEnabled: false,
    rearToolEnabled: false,
    equipmentState: { balerLitres: 0, carriedBaleId: null },
    baleReleasePending: false,
    balePickupCooldown: 0,
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
let milestoneCinematic = null;
const buildRaycaster = new THREE.Raycaster();
const buildPointer = new THREE.Vector2();
const buildPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const buildWorldPoint = new THREE.Vector3();
const siloPopupWorld = new THREE.Vector3();
const constructionPopupWorld = new THREE.Vector3();
function activeVehicle() {
  return fleet[activeVehicleIndex];
}

function activeVehicleState() {
  return physics.vehicleState(activeVehicle().id);
}

function storageCapacityFor(vehicle) {
  const equipmentInventory = equipmentDefinition(vehicle.loadout.tool)?.inventory;
  return equipmentInventory && !equipmentInventory.stateKey
    ? equipmentInventory.capacity
    : vehicle.definition.storageCapacity;
}

const transportItems = {
  milk: { id: 'milk', name: 'Milk', icon: 'milk', unit: 'litres', kind: 'liquid' },
};

function storageItemDefinition(id) {
  if (crops[id]) return { ...crops[id], id, kind: 'crop' };
  return transportItems[id] || null;
}

function activeInventoryDefinition(vehicle = activeVehicle()) {
  return equipmentDefinition(vehicle.loadout.tool)?.inventory || null;
}

function vehicleStorageKind(vehicle = activeVehicle()) {
  const inventory = activeInventoryDefinition(vehicle);
  if (inventory && !inventory.stateKey) return inventory.kind;
  return vehicle.type === 'harvester' ? 'crop' : null;
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
        frontToolEnabled: vehicle.frontToolEnabled,
        rearToolEnabled: vehicle.rearToolEnabled,
        equipmentState: { ...vehicle.equipmentState },
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

function beginMilestoneCinematic(milestone) {
  if (milestoneCinematic || !milestone?.pickupReady) return;
  milestoneCinematic = {
    milestone: {
      id: milestone.id,
      title: milestone.title,
      unlocks: [...milestone.unlocks],
      isFinalMilestone: milestone.isFinalMilestone,
    },
    previousView: viewMode,
    target: farm.cargoPort.cinematicView().deck,
    collected: false,
  };
  visualDriveAmount = 0;
  visualSteer = 0;
  ui.setStoragePopup(null);
  ui.setCinematicActive(true);
  camera.fov = cinematicCameraFov;
  camera.updateProjectionMatrix();
  farm.cargoPort.requestPickup(camera);
}

function updateMilestoneCinematic(dt) {
  const cinematic = milestoneCinematic;
  if (!cinematic) return;
  const state = activeVehicleState();
  physics.drive(dt, { x: 0, z: 0 }, 0, false, false);
  physics.step(dt);
  const view = farm.cargoPort.cinematicView();
  const followCraft = view.craft && (view.phase === 'ascend' || view.phase === 'depart');
  const target = followCraft ? view.craft : view.deck;
  cinematic.target.lerp(target, 1 - Math.exp(-3.4 * dt));
  const offset = followCraft ? target.clone().sub(view.deck).multiplyScalar(.4) : new THREE.Vector3();
  const cameraGoal = view.camera.clone().add(offset);
  camera.position.lerp(cameraGoal, 1 - Math.exp(-2.8 * dt));
  camera.lookAt(cinematic.target);
  farm.updateOcclusion(camera.position, state, dt);
}

function collectMilestoneShipment() {
  const cinematic = milestoneCinematic;
  if (!cinematic || cinematic.collected) return false;
  if (!progression.collect()) return false;
  cinematic.collected = true;
  syncUnlockedProgressionUi();
  syncCargoPort();
  ui.setStoragePopup(null);
  scheduleSave();
  return true;
}

function finishMilestoneCinematic() {
  const cinematic = milestoneCinematic;
  if (!cinematic) return;
  milestoneCinematic = null;
  if (!cinematic.collected && !progression.collect()) {
    setCameraView(cinematic.previousView, true);
    ui.setCinematicActive(false);
    return;
  }
  if (!cinematic.collected) syncUnlockedProgressionUi();
  syncCargoPort();
  ui.setStoragePopup(null);
  setCameraView(cinematic.previousView, true);
  ui.setCinematicActive(false);
  ui.showMilestoneCelebration({
    title: cinematic.milestone.title,
    unlocks: cinematic.milestone.unlocks,
    completeGame: cinematic.milestone.isFinalMilestone,
  });
  scheduleSave();
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
    syncCarriedBale(vehicle, state);
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

function worldAtScreenPoint(point, levelY = 0) {
  buildPointer.set(point.x / innerWidth * 2 - 1, -(point.y / innerHeight) * 2 + 1);
  buildRaycaster.setFromCamera(buildPointer, camera);
  buildPlane.constant = -(Number.isFinite(levelY) ? levelY : 0);
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
  if (!buildings) return false;
  const hit = buildingAtScreenPoint(point);
  const construction = buildings.constructionState();
  const worldPoint = worldAtScreenPoint(point, construction?.phase === 'pen-draft' ? construction.y : 0);
  if (!worldPoint) return false;
  return buildings.beginDrag(worldPoint, ui.buildState().selectedBuilding, hit);
}

function updateConstructionPopup() {
  const state = buildings?.constructionState();
  if (!state) {
    ui?.setConstructionPopup(null);
    return;
  }
  if (viewMode !== 'build' || state.dragging) {
    ui?.setConstructionPopup({ ...state, hidden: true });
    return;
  }
  constructionPopupWorld.set(state.x, state.y + state.popupHeight, state.z).project(camera);
  const hidden = constructionPopupWorld.z < -1 || constructionPopupWorld.z > 1
    || Math.abs(constructionPopupWorld.x) > 1 || Math.abs(constructionPopupWorld.y) > 1;
  ui?.setConstructionPopup({
    ...state,
    hidden,
    x: (constructionPopupWorld.x * .5 + .5) * innerWidth,
    y: (-constructionPopupWorld.y * .5 + .5) * innerHeight,
  });
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
    vehicle.frontToolEnabled = false;
    vehicle.rearToolEnabled = false;
    vehicle.equipmentState.balerLitres = 0;
    vehicle.equipmentState.carriedBaleId = null;
    vehicle.baleReleasePending = false;
    vehicle.balePickupCooldown = 0;
    vehicle.storage.contents = {};
    setStorageCapacity(vehicle);
    vehicle.visual.setLoadout(vehicle.loadout);
    vehicle.visual.setToolEnabled('front', false, true);
    vehicle.visual.setToolEnabled('rear', false, true);
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
    const savedLoadout = saved.loadout || vehicle.definition.defaultLoadout;
    const requestedLoadout = savedLoadout.tool === 'windrower'
      ? { ...savedLoadout, tool: 'baler' }
      : savedLoadout;
    const loadout = vehicle.definition.slots.length
      ? normalizeLoadout(requestedLoadout, progression.state().unlockedGates)
      : { ...vehicle.definition.defaultLoadout };
    vehicle.loadout = loadout;
    setStorageCapacity(vehicle);
    vehicle.heading = Number.isFinite(saved.heading)
      ? Math.atan2(Math.sin(saved.heading), Math.cos(saved.heading))
      : 0;
    const loadoutWasNormalized = loadout.tool !== requestedLoadout.tool || loadout.frontTool !== requestedLoadout.frontTool;
    vehicle.frontToolEnabled = !loadoutWasNormalized && Boolean(saved.frontToolEnabled);
    vehicle.rearToolEnabled = !loadoutWasNormalized && Boolean(saved.rearToolEnabled);
    vehicle.equipmentState.balerLitres = THREE.MathUtils.clamp(Math.floor(Number(saved.equipmentState?.balerLitres) || 0), 0, BALER_STORAGE_CAPACITY - 1);
    const savedBaleId = saved.equipmentState?.carriedBaleId;
    vehicle.equipmentState.carriedBaleId = loadout.frontTool === 'bale-fork'
      && typeof savedBaleId === 'string' && farm.hasBale(savedBaleId)
      ? savedBaleId
      : null;
    vehicle.baleReleasePending = false;
    vehicle.balePickupCooldown = 0;
    vehicle.storage.contents = {};
    let remaining = vehicle.storage.capacity;
    const storageKind = vehicleStorageKind(vehicle);
    for (const [itemId, savedAmount] of Object.entries(saved.storage || {})) {
      if (storageItemDefinition(itemId)?.kind !== storageKind || remaining <= 0) continue;
      const amount = Math.min(remaining, Math.max(0, Math.floor(Number(savedAmount) || 0)));
      if (!amount) continue;
      vehicle.storage.contents[itemId] = amount;
      remaining -= amount;
    }
    vehicle.visual.setLoadout(vehicle.loadout);
    vehicle.visual.setStorageAmount(storageAmount(vehicle), vehicle.storage.capacity);
    vehicle.visual.setToolEnabled('front', vehicle.frontToolEnabled, true);
    vehicle.visual.setToolEnabled('rear', vehicle.rearToolEnabled, true);
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
  syncProgressionUi();
  if (savedState) {
    farm.restorePersistentState(savedState.world, elapsed);
    buildings.restorePersistentState(savedState.buildings);
    ui.restorePersistentState(savedState.ui);
    restoreFleet(savedState.vehicles, savedState.activeVehicleId);
  }
  else resetFleet();
  syncActiveVehicleUi();
  syncProgressionUi();
  syncInventoryUi();
  syncCargoPort();
  applyCropOverlay();
  updateDriveCamera(activeVehicleState(), 0, true);
  if (progression.state().pickupReady) beginMilestoneCinematic(progression.state());
  persistenceReady = true;
  writeSave();
}

function syncUnlockedProgressionUi() {
  const state = progression.state();
  for (const vehicle of fleet) {
    if (!vehicle.definition.slots.length) continue;
    const normalized = normalizeLoadout(vehicle.loadout, state.unlockedGates);
    if (normalized.tool === vehicle.loadout.tool && normalized.frontTool === vehicle.loadout.frontTool) continue;
    if (vehicle.loadout.frontTool === 'bale-fork' && normalized.frontTool !== 'bale-fork') {
      dropCarriedBale(vehicle, physics.vehicleState(vehicle.id));
    }
    vehicle.loadout = normalized;
    vehicle.frontToolEnabled = false;
    vehicle.rearToolEnabled = false;
    setStorageCapacity(vehicle);
    vehicle.visual.setLoadout(normalized);
    vehicle.visual.setToolEnabled('front', false, true);
    vehicle.visual.setToolEnabled('rear', false, true);
  }
  ui.setUnlockedGates(state.unlockedGates);
  ui.setDebugUnlockables(state.unlockables);
  ui.setDebugMilestones(state.milestones);
  syncActiveVehicleUi();
  return state;
}

function syncProgressionUi() {
  const state = syncUnlockedProgressionUi();
  ui.setMilestone(state);
  return state;
}

function setUnlockOverride(gateId, enabled) {
  if (!progression.setUnlockOverride(gateId, enabled)) return false;
  syncProgressionUi();
  scheduleSave();
  return true;
}

function clearUnlockOverrides() {
  const overrides = progression.state().unlockables.filter(unlockable => unlockable.overridden);
  let changed = false;
  for (const unlockable of overrides) changed = progression.setUnlockOverride(unlockable.id, false) || changed;
  if (!changed) return false;
  syncProgressionUi();
  scheduleSave();
  return true;
}

function setMilestoneOverride(milestoneId) {
  if (!progression.setMilestoneOverride(milestoneId)) return false;
  if (activeTransfer) {
    transferVehicle()?.visual.stopUnload();
    activeTransfer = null;
  }
  const state = syncProgressionUi();
  syncCargoPort();
  ui.setStoragePopup(null);
  if (state.pickupReady) beginMilestoneCinematic(state);
  scheduleSave();
  return true;
}

function storageAmount(vehicle = activeVehicle()) {
  return Object.values(vehicle.storage.contents).reduce((sum, amount) => sum + amount, 0);
}

function storageItemId(vehicle = activeVehicle()) {
  const storage = vehicle.storage;
  return Object.keys(storage.contents).find(itemId => storage.contents[itemId] > 0) || null;
}

function storageLabel(vehicle = activeVehicle()) {
  const itemId = storageItemId(vehicle);
  const item = storageItemDefinition(itemId);
  if (vehicle.type === 'tractor' && vehicle.loadout.tool === 'trailer') return item?.name || 'Trailer';
  if (vehicle.type === 'tractor' && vehicle.loadout.tool === 'liquid-tank') return item?.name || 'Water / Milk Tank';
  return item?.name || 'Storage';
}

function activeInventoryHud(vehicle = activeVehicle()) {
  const equipment = equipmentDefinition(vehicle.loadout.tool);
  const equipmentInventory = equipment?.inventory;
  if (equipmentInventory?.stateKey) {
    return {
      id: `${vehicle.id}:${equipment.id}`,
      label: equipment.name,
      iconId: equipmentInventory.icon,
      amount: vehicle.equipmentState[equipmentInventory.stateKey] || 0,
      capacity: equipmentInventory.capacity,
    };
  }
  if (!vehicle.storage.capacity) return null;
  const itemId = storageItemId(vehicle);
  return {
    id: `${vehicle.id}:${equipment?.id || 'storage'}`,
    label: storageLabel(vehicle),
    iconId: storageItemDefinition(itemId)?.icon || equipmentInventory?.icon || 'silo',
    amount: storageAmount(vehicle),
    capacity: vehicle.storage.capacity,
  };
}

function syncInventoryUi() {
  const vehicle = activeVehicle();
  const storage = vehicle.storage;
  vehicle.visual.setStorageAmount(storageAmount(vehicle), storage.capacity);
  ui?.setInventoryHud(activeInventoryHud(vehicle));
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
    frontToolEnabled: vehicle.frontToolEnabled,
    rearToolEnabled: vehicle.rearToolEnabled,
  });
  syncInventoryUi();
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

function syncCargoPort() {
  const milestone = progression.state();
  const carriesBales = milestone.requirements.some(requirement => requirement.itemId === 'hay-bale');
  const carriesMilk = milestone.requirements.some(requirement => requirement.itemId === 'milk');
  farm.cargoPort.setCargoKind(carriesBales ? 'hay-bale' : carriesMilk ? 'milk' : 'crops');
  farm.cargoPort.setLoadRatio(milestoneLoadRatio());
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
  if (transfer.kind === 'barn-load-milk') {
    const barn = buildings?.cattleBarn(transfer.barnId);
    return Boolean(barn?.pen && Math.hypot(state.x - barn.site.x, state.z - barn.site.z) <= 3.05);
  }
  return buildings?.siloAt(state.x, state.z)?.id === transfer.siloId;
}

function finishTransfer() {
  const transfer = activeTransfer;
  if (!transfer) return;
  const vehicle = transferVehicle();
  activeTransfer = null;
  vehicle?.visual.stopUnload();
  if (vehicle?.id === activeVehicle().id) syncInventoryUi();
  if (transfer.kind === 'cargo') {
    const nextState = progression.state();
    ui.setMilestone(nextState);
    syncCargoPort();
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
    moved = buildings.takeFrom(transfer.siloId, transfer.itemId, amount, false);
    if (moved) vehicle.storage.contents[transfer.itemId] = (vehicle.storage.contents[transfer.itemId] || 0) + moved;
  }
  else if (transfer.kind === 'unload') {
    const available = Math.max(0, vehicle.storage.contents[transfer.itemId] || 0);
    moved = Math.min(amount, available);
    if (moved && buildings.storeIn(transfer.siloId, transfer.itemId, moved, elapsed, false)) {
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
    finishTransfer();
    return false;
  }
  transfer.remaining -= moved;
  transfer.moved += moved;
  if ((transfer.kind === 'unload' || transfer.kind === 'cargo') && elapsed - transfer.lastVisual >= .42) {
    vehicle.visual.playUnload(transfer.target, transfer.itemId, elapsed);
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
  syncInventoryUi();
  if (cargoChanged) {
    ui.setMilestone(progression.state());
    syncCargoPort();
  }
  scheduleSave();
}

function emptyIntoSilo(siloId) {
  const vehicle = activeVehicle();
  if (!canTransferCargo(vehicle) || vehicleStorageKind(vehicle) !== 'crop') return;
  const state = activeVehicleState();
  const amount = storageAmount();
  if (!amount) return;
  const cropId = storageItemId();
  const silo = buildings?.siloAt(state.x, state.z);
  if (silo?.id !== siloId) return;
  startTransfer({
    kind: 'unload', vehicleId: vehicle.id, siloId, itemId: cropId, amount,
    target: { x: silo.site.x, y: silo.site.y + 3.58, z: silo.site.z },
  });
}

function loadFromSilo(siloId, cropId) {
  if (!crops[cropId]) return;
  const vehicle = activeVehicle();
  if (!canTransferCargo(vehicle) || vehicleStorageKind(vehicle) !== 'crop') return;
  const state = activeVehicleState();
  const silo = buildings?.siloAt(state.x, state.z);
  if (silo?.id !== siloId) return;
  const storedCropId = storageItemId();
  if (storedCropId && storedCropId !== cropId) return;
  const space = vehicle.storage.capacity - storageAmount();
  if (space <= 0) return;
  const available = Math.max(0, Math.floor(Number(silo.contents[cropId]) || 0));
  const amount = Math.min(available, space);
  if (!amount) return;
  startTransfer({ kind: 'load', vehicleId: vehicle.id, siloId, itemId: cropId, amount });
}

function feedBarn(barnId) {
  const vehicle = activeVehicle();
  const state = activeVehicleState();
  const barn = buildings?.cattleBarn(barnId);
  if (!barn?.pen || Math.hypot(state.x - barn.site.x, state.z - barn.site.z) > 3.05) return;
  const baleId = vehicle.equipmentState.carriedBaleId;
  if (!baleId || !farm.hasBale(baleId) || !buildings.addHayBale(barnId, HAY_BALE_LITRES)) return;
  if (!farm.removeBale(baleId)) return;
  vehicle.equipmentState.carriedBaleId = null;
  vehicle.baleReleasePending = false;
  vehicle.balePickupCooldown = elapsed + .65;
  scheduleSave();
}

function loadMilkFromBarn(barnId) {
  const vehicle = activeVehicle();
  if (vehicleStorageKind(vehicle) !== 'liquid') return;
  const state = activeVehicleState();
  const barn = buildings?.cattleBarn(barnId);
  if (!barn?.pen || Math.hypot(state.x - barn.site.x, state.z - barn.site.z) > 3.05
    || (storageItemId(vehicle) && storageItemId(vehicle) !== 'milk')) return;
  const amount = Math.min(Math.floor(barn.milkLitres), vehicle.storage.capacity - storageAmount(vehicle));
  if (amount > 0) startTransfer({ kind: 'barn-load-milk', vehicleId: vehicle.id, barnId, itemId: 'milk', amount });
}

function dropOffCargo(selectedCropId = null) {
  if (milestoneCinematic) return;
  const vehicle = activeVehicle();
  const state = activeVehicleState();
  if (!farm.cargoPort.isNear(state.x, state.z)) return;
  const milestone = progression.state();
  if (milestone.complete) return;
  const baleRequirement = milestone.requirements.find(requirement => requirement.itemId === 'hay-bale');
  if (selectedCropId === 'hay-bale' || (!canTransferCargo(vehicle) && baleRequirement)) {
    const baleId = vehicle.equipmentState.carriedBaleId;
    if (!baleRequirement?.accepting || !baleId || !farm.hasBale(baleId)) return;
    const wasComplete = milestone.complete;
    const accepted = progression.accept({ 'hay-bale': 1 });
    if (!accepted['hay-bale'] || !farm.removeBale(baleId)) return;
    vehicle.equipmentState.carriedBaleId = null;
    vehicle.baleReleasePending = false;
    vehicle.balePickupCooldown = elapsed + .65;
    ui.setMilestone(progression.state());
    syncCargoPort();
    if (!wasComplete && progression.state().complete) beginMilestoneCinematic(progression.state());
    scheduleSave();
    return;
  }
  if (!canTransferCargo(vehicle)) return;
  const storage = vehicle.storage;
  if (!storageAmount()) return;
  const storedItemId = storageItemId();
  const itemId = selectedCropId && storage.contents[selectedCropId] > 0
    ? selectedCropId
    : storedItemId;
  const requirement = milestone.requirements.find(entry => (entry.itemId || entry.cropId) === itemId);
  const amount = requirement?.accepting
    ? Math.min(storage.contents[itemId] || 0, Math.max(0, requirement.target - requirement.delivered))
    : 0;
  if (!amount) return;
  startTransfer({
    kind: 'cargo', vehicleId: vehicle.id, itemId, amount,
    target: farm.cargoPort.unloadTarget(),
  });
}

ui = createUi({
  onRestart: restartGame,
  onLoadoutChange: loadout => {
    const vehicle = activeVehicle();
    const normalized = vehicle.definition.slots.length
      ? normalizeLoadout(loadout, progression.state().unlockedGates)
      : { ...vehicle.loadout };
    if (vehicle.loadout.tool !== normalized.tool && storageAmount(vehicle) && activeInventoryDefinition(vehicle)) return false;
    if (vehicle.loadout.frontTool === 'bale-fork' && normalized.frontTool !== 'bale-fork') {
      dropCarriedBale(vehicle, activeVehicleState());
    }
    vehicle.loadout = normalized;
    vehicle.visual.setLoadout(vehicle.loadout);
    setStorageCapacity(vehicle);
    syncActiveVehicleUi();
    scheduleSave();
    return true;
  },
  onLoadoutPreview: loadout => loadoutPreviews?.setLoadout(loadout),
  onEquipmentAction: (slot, enabled) => {
    const vehicle = activeVehicle();
    if (slot === 'front') {
      vehicle.frontToolEnabled = enabled;
      vehicle.baleReleasePending = enabled
        && vehicle.loadout.frontTool === 'bale-fork'
        && Boolean(vehicle.equipmentState.carriedBaleId);
    }
    else vehicle.rearToolEnabled = enabled;
    vehicle.visual.setToolEnabled(slot, enabled);
    scheduleSave();
  },
  onCycleVehicle: cycleVehicle,
  onSiloLoad: loadFromSilo,
  onSiloUnload: emptyIntoSilo,
  onBarnFeed: feedBarn,
  onBarnLoadMilk: loadMilkFromBarn,
  onPenRepaint: () => {
    const changed = buildings?.repaintSelected();
    updateConstructionPopup();
    return changed;
  },
  onBuildingTypeSelected: type => {
    const changed = buildings?.placeBuilding(type, mapCameraTarget);
    updateConstructionPopup();
    return changed;
  },
  onConstructionPrimaryAction: () => {
    const changed = buildings?.confirmSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  onConstructionCancel: () => {
    const changed = buildings?.cancelSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  onConstructionUndo: () => {
    const changed = buildings?.undoSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  onCargoDropOff: dropOffCargo,
  onCropOverlayChange: applyCropOverlay,
  onBuildModeChange: applyBuildMode,
  onBuildPointerStart: beginBuildingDrag,
  onBuildPointerMove: point => {
    const worldPoint = worldAtScreenPoint(point, buildings?.interactionLevel());
    if (worldPoint) buildings?.moveDrag(worldPoint);
  },
  onBuildPointerEnd: point => {
    const worldPoint = worldAtScreenPoint(point, buildings?.interactionLevel());
    if (worldPoint) buildings?.moveDrag(worldPoint);
    if (buildings?.endDrag() === true) ui.clearBuildingSelection();
  },
  onBuildPointerCancel: () => buildings?.cancelDrag(),
  onUnlockOverride: setUnlockOverride,
  onClearUnlockOverrides: clearUnlockOverrides,
  onMilestoneOverride: setMilestoneOverride,
  onMilestoneCelebrationDismissed: syncProgressionUi,
  onPersistentStateChange: scheduleSave,
  panSurface: renderer.domElement,
});
buildings = createBuildingManager({
  getSiteAt: (x, z, radius) => farm?.buildingSiteAt(x, z, radius),
  getTerrain: () => farm?.terrain,
  setCollider: (id, obstacle) => farm?.setBuildingCollider(id, obstacle),
  onChange: scheduleSave,
  onHint: hint => ui?.setBuildHint(hint),
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

function toolPoint(state, localX, localZ) {
  return vehicleToolPoint(activeVehicle(), state, localX, localZ);
}

function vehicleToolPoint(vehicle, state, localX, localZ) {
  const heading = vehicle.heading;
  const sine = Math.sin(heading), cosine = Math.cos(heading);
  return {
    x: state.x + localX * cosine + localZ * sine,
    z: state.z - localX * sine + localZ * cosine,
  };
}

function baleForkPose(vehicle, state) {
  const point = vehicleToolPoint(vehicle, state, 0, -1.72);
  const lift = vehicle.visual.frontToolLift();
  return { ...point, y: state.y - .02 + lift * .44, heading: vehicle.heading };
}

function dropCarriedBale(vehicle, state) {
  const baleId = vehicle.equipmentState.carriedBaleId;
  if (!baleId || !farm?.hasBale(baleId)) {
    vehicle.equipmentState.carriedBaleId = null;
    vehicle.baleReleasePending = false;
    return false;
  }
  const pose = baleForkPose(vehicle, state);
  const groundY = farm.farmingLevelNear(pose.x, pose.z);
  farm.moveBale(baleId, pose.x, groundY ?? state.y - .02, pose.z, pose.heading, true);
  vehicle.equipmentState.carriedBaleId = null;
  vehicle.baleReleasePending = false;
  vehicle.balePickupCooldown = elapsed + .65;
  scheduleSave();
  return true;
}

function syncCarriedBale(vehicle, state) {
  const baleId = vehicle.equipmentState.carriedBaleId;
  if (!baleId) return;
  if (vehicle.loadout.frontTool !== 'bale-fork' || !farm.hasBale(baleId)) {
    vehicle.equipmentState.carriedBaleId = null;
    vehicle.baleReleasePending = false;
    return;
  }
  const pose = baleForkPose(vehicle, state);
  farm.moveBale(baleId, pose.x, pose.y, pose.z, pose.heading);
  if (vehicle.baleReleasePending && vehicle.visual.frontToolLift() <= .06) {
    dropCarriedBale(vehicle, state);
  }
}

function applyTool(state) {
  const vehicle = activeVehicle();
  if ((!vehicle.frontToolEnabled && !vehicle.rearToolEnabled) || !state.grounded || state.speed < .4) return;
  const levelY = farm.farmingLevelNear(state.x, state.z);
  const { tool, frontTool } = vehicle.loadout;
  if (vehicle.type === 'harvester') {
    if (!vehicle.frontToolEnabled) return;
    const available = vehicle.storage.capacity - storageAmount();
    if (available <= 0) return;
    const collected = {};
    let acceptedCropId = storageItemId();
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
      syncInventoryUi();
    }
    return;
  }
  if (vehicle.frontToolEnabled && frontTool === 'bale-fork'
    && !vehicle.equipmentState.carriedBaleId && elapsed >= vehicle.balePickupCooldown) {
    const pickup = toolPoint(state, 0, -1.72);
    const bale = farm.baleNear(pickup.x, pickup.z, levelY, .72);
    if (bale) {
      vehicle.equipmentState.carriedBaleId = bale.id;
      vehicle.baleReleasePending = false;
      scheduleSave();
    }
  }
  if (vehicle.frontToolEnabled && frontTool === 'front-mower') {
    forToolRows(state, [-.4, 0, .4], -1.28, (x, z) => {
      farm.mowAt(x, z, levelY, elapsed);
    });
  }
  if (!vehicle.rearToolEnabled) return;
  if (tool === 'plough') {
    forToolRows(state, [-.6, -.2, .2, .6], 1.58, (x, z) => {
      if (buildings?.isPastureAt(x, z)) return;
      farm.ploughAt(x, z, levelY, vehicle.heading);
    });
  }
  else if (tool === 'seeder') {
    const cropId = ui.activeSeedId();
    if (!progression.isUnlocked(`crop:${cropId}`)) return;
    forToolRows(state, [-.32, .32], 1.54, (x, z) => {
      if (buildings?.isPastureAt(x, z)) return;
      farm.seedAt(x, z, levelY, elapsed, cropId);
    });
  }
  else if (tool === 'sprayer') {
    forToolRows(state, [-1.15, -.77, -.38, 0, .38, .77, 1.15], 1.58, (x, z) => {
      farm.sprayAt(x, z, levelY);
    });
  }
  else if (tool === 'rear-mower') {
    forToolRows(state, [.45, .85, 1.25, 1.65], 1.5, (x, z) => {
      farm.mowAt(x, z, levelY, elapsed);
    });
  }
  else if (tool === 'baler') {
    let collected = 0;
    forToolRows(state, [-.4, 0, .4], 1.68, (x, z) => {
      collected += farm.takeLooseGrassAt(x, z, levelY);
    });
    if (!collected) return;
    let balerLitres = vehicle.equipmentState.balerLitres + collected;
    let emitted = 0;
    while (balerLitres >= BALER_STORAGE_CAPACITY) {
      const drop = toolPoint(state, 0, 2.52 + emitted * .34);
      farm.spawnBale(drop.x, levelY, drop.z, vehicle.heading);
      vehicle.visual.playBale();
      balerLitres -= BALER_STORAGE_CAPACITY;
      emitted++;
    }
    vehicle.equipmentState.balerLitres = balerLitres;
    syncInventoryUi();
    scheduleSave();
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

  physics.drive(dt, driveDirection, driveAmount, ui.consumeJump(), vehicle.frontToolEnabled || vehicle.rearToolEnabled);
  physics.step(dt);
  const state = activeVehicleState();
  if (!before.grounded && state.grounded && before.verticalSpeed < -.35) {
    const impact = Math.max(3, Math.abs(before.verticalSpeed), state.speed * .65);
    farm.splashAt(state.x, state.z, impact);
    const cropId = storageItemId(vehicle);
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
  const trailerCropId = storageItemId(vehicle);
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
  if (milestoneCinematic) {
    ui.setStoragePopup(null);
    return;
  }
  if (viewMode !== 'drive' || vehicleTransition) {
    ui.setStoragePopup(null);
    return;
  }
  const state = activeVehicleState();
  const machine = {
    type: activeVehicle().type,
    capacity: activeVehicle().storage.capacity,
    contents: activeVehicle().storage.contents,
    canTransfer: canTransferCargo() || Boolean(activeVehicle().equipmentState.carriedBaleId),
    carriedBale: Boolean(activeVehicle().equipmentState.carriedBaleId),
    storageKind: vehicleStorageKind(),
    storageItemId: storageItemId(),
  };
  if (farm.cargoPort.isNear(state.x, state.z)) {
    const milestone = progression.state();
    if (!milestone.requirements.length) {
      ui.setStoragePopup(null);
      return;
    }
    const target = farm.cargoPort.unloadTarget();
    siloPopupWorld.set(target.x, target.y + 1.8, target.z).project(camera);
    if (siloPopupWorld.z < -1 || siloPopupWorld.z > 1 || Math.abs(siloPopupWorld.x) > 1 || Math.abs(siloPopupWorld.y) > 1) {
      ui.setStoragePopup(null);
      return;
    }
    ui.setStoragePopup({
      kind: 'cargo',
      items: milestone.requirements.map(requirement => ({
        id: requirement.itemId || requirement.cropId,
        name: requirement.name,
        icon: requirement.icon || requirement.cropId,
        unit: requirement.unit || 'litres',
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
  const barn = buildings?.cattleBarnAt(state.x, state.z);
  if (barn) {
    const summary = buildings.cattleBarnSummary(barn.id);
    siloPopupWorld.set(barn.site.x, barn.site.y + 3.15, barn.site.z).project(camera);
    if (siloPopupWorld.z >= -1 && siloPopupWorld.z <= 1 && Math.abs(siloPopupWorld.x) <= 1 && Math.abs(siloPopupWorld.y) <= 1) {
      ui.setStoragePopup({
        kind: 'cattle-barn', id: barn.id, ...summary, machine,
        canFeed: machine.carriedBale && barn.hayLitres + HAY_BALE_LITRES <= summary.hayCapacity,
        canLoadMilk: machine.storageKind === 'liquid' && (!machine.storageItemId || machine.storageItemId === 'milk')
          && storageAmount() < machine.capacity && summary.milkLitres > 0,
        x: (siloPopupWorld.x * .5 + .5) * innerWidth,
        y: (-siloPopupWorld.y * .5 + .5) * innerHeight,
      });
      return;
    }
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
  if (milestoneCinematic) updateMilestoneCinematic(dt);
  else if (vehicleTransition) updateVehicleTransition(dt);
  else if (viewMode === 'overlay' || viewMode === 'build') {
    visualDriveAmount = 0;
    visualSteer = 0;
    updateMap(dt);
  }
  else updateDrive(dt);
  updateTransfer(dt);
  const cargoEvent = farm?.cargoPort.update(dt, camera, progression.state().pickupReady);
  if (cargoEvent?.shipmentPickedUp) collectMilestoneShipment();
  if (cargoEvent?.departed) finishMilestoneCinematic();
  syncFleetVisuals(dt);
  farm?.animate(elapsed);
  buildings?.animate(elapsed, dt);
  updateConstructionPopup();
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
