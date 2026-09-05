import { THREE } from '../core/shared.js';
import { crops } from '../gameplay/catalog/crops.js';
import { createPhysics } from '../physics/index.js';
import { createVehicle } from '../gameplay/vehicles/visual.js';
import { createLoadoutPreview } from '../gameplay/vehicles/loadout-preview.js';
import { createUi } from '../ui/index.js';
import { createBuildingManager } from '../gameplay/construction/index.js';
import { generateFarm } from '../world/generator.js';
import { createArchipelagoRuntime } from '../world/archipelago/runtime.js';
import { createSaveCoordinator } from './save-coordinator.js';
import { createMilestoneProgression } from '../gameplay/progression/index.js';
import { loadGameState } from '../persistence/index.js';
import { OWNED_VEHICLES, vehicleType } from '../gameplay/catalog/vehicles.js';
import { BALER_STORAGE_CAPACITY, equipmentDefinition, normalizeLoadout } from '../gameplay/catalog/equipment.js';
import { HAY_BALE_LITRES } from '../gameplay/livestock/index.js';
import { createEnvironment, DEFAULT_DAY_PHASE } from '../world/environment/index.js';
import { createTransferEffects } from '../gameplay/logistics/transfer-effects.js';
import { createTransferController } from '../gameplay/logistics/transfer-controller.js';

const pixelRatioCap = 1.5;
const targetFrameInterval = 1000 / 60 * .96;
const fpsSampleInterval = 500;
const poseCheckpointInterval = 2;
const vehicleSwitchSeconds = .6;
const cameraRotationSeconds = .22;
const baseDriveCameraFov = 38;
const defaultDriveCameraFov = 28;
const driveCameraFovs = [38, 30, 28, 24];
const driveCameraZoomScale = .9;
const defaultDriveCameraCounterClockwiseDegrees = 12;
const defaultDriveCameraYaw = defaultDriveCameraCounterClockwiseDegrees * Math.PI / 180;
const baseFogNear = 30;
const baseFogFar = 92;
const driveCameraDistanceScale = fov => driveCameraZoomScale * Math.tan(baseDriveCameraFov * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
const initialDriveCameraScale = driveCameraDistanceScale(defaultDriveCameraFov);
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
renderer.toneMappingExposure = .9;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const transferEffects = createTransferEffects(scene, { reducedMotion });
const camera = new THREE.PerspectiveCamera(defaultDriveCameraFov, innerWidth / innerHeight, .1, 200);
const cinematicCameraFov = 44;
const baseDriveCameraOffset = new THREE.Vector3(12, 20, 28);
const cameraUp = new THREE.Vector3(0, 1, 0);
const driveCameraOffset = baseDriveCameraOffset.clone()
  .multiplyScalar(initialDriveCameraScale)
  .applyAxisAngle(cameraUp, defaultDriveCameraYaw);
const buildCameraOffset = new THREE.Vector3(22, 30, 28);
const cameraForward = new THREE.Vector2(-driveCameraOffset.x, -driveCameraOffset.z).normalize();
const cameraRight = new THREE.Vector2(-cameraForward.y, cameraForward.x);
const driveCameraTarget = new THREE.Vector3();
const mapCameraTarget = new THREE.Vector3();
camera.position.copy(driveCameraOffset);
camera.lookAt(driveCameraTarget);
scene.add(camera);
const environment = createEnvironment({
  scene,
  renderer,
  initialPhase: loadResult.state?.environment?.phase ?? DEFAULT_DAY_PHASE,
  fogNear: baseFogNear * initialDriveCameraScale,
  fogFar: baseFogFar * initialDriveCameraScale,
});

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
let driveCameraFov = defaultDriveCameraFov;
let driveCameraRotationStep = 0;
let driveCameraRotation = defaultDriveCameraYaw;
let driveCameraRotationTarget = defaultDriveCameraYaw;
let cameraRotationTransition = null;
let progression;
let lastPoseCheckpoint = 0;
let vehicleTransition = null;
let visualDriveAmount = 0;
let visualSteer = 0;
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
  if (crops[id]) return { ...crops[id], id, icon: crops[id].icon || id, kind: 'crop' };
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
  const savedBuildings = buildings.persistentState().map(building => ({
    ...building,
    pose: farm.poseAtWorld({
      x: building.x,
      y: farm.farmingLevelNear(building.x, building.z) ?? 0,
      z: building.z,
    }),
  }));
  return {
    world: farm.persistentState(elapsed),
    environment: environment.persistentState(),
    buildings: savedBuildings,
    progression: progression.persistentState(),
    vehicles: fleet.map(vehicle => {
      const state = physics.vehicleState(vehicle.id);
      return {
        id: vehicle.id,
        type: vehicle.type,
        position: { x: state.x, y: state.y, z: state.z },
        pose: farm.poseAtWorld({ x: state.x, y: state.y, z: state.z }, vehicle.heading),
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

const saveCoordinator = createSaveCoordinator({
  snapshot: persistentState,
  unavailable: loadResult.unavailable,
});
const writeSave = saveCoordinator.flush;
const scheduleSave = saveCoordinator.schedule;
const restartGame = saveCoordinator.restart;

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

function setCameraFogScale(scale = 1) {
  scene.fog.near = baseFogNear * scale;
  scene.fog.far = baseFogFar * scale;
}

function updateDriveCameraOrientation() {
  const distanceScale = driveCameraDistanceScale(driveCameraFov);
  driveCameraOffset.copy(baseDriveCameraOffset)
    .multiplyScalar(distanceScale)
    .applyAxisAngle(cameraUp, driveCameraRotation);
  cameraForward.set(-driveCameraOffset.x, -driveCameraOffset.z).normalize();
  cameraRight.set(-cameraForward.y, cameraForward.x);
}

function applyDriveCameraProjection() {
  const distanceScale = driveCameraDistanceScale(driveCameraFov);
  updateDriveCameraOrientation();
  camera.fov = driveCameraFov;
  camera.updateProjectionMatrix();
  setCameraFogScale(distanceScale);
}

function setDriveCameraPreset(nextFov) {
  const fov = Number(nextFov);
  if (!driveCameraFovs.includes(fov)) return false;
  driveCameraFov = fov;
  if (viewMode === 'drive' && !milestoneCinematic) {
    applyDriveCameraProjection();
    updateDriveCamera(activeVehicleState(), 0, true);
    renderRequested = true;
  }
  return true;
}

function currentEnvironmentFocus() {
  if (milestoneCinematic) return milestoneCinematic.target;
  return viewMode === 'build' ? mapCameraTarget : driveCameraTarget;
}

function applyNightLighting(state) {
  farm?.setNightAmount(state.nightAmount, state.lanternAmount);
  fleet.forEach(vehicle => vehicle.visual.setNightAmount(state.lanternAmount));
}

function setTimeOfDay(nextPhase) {
  const state = environment.setPhase(nextPhase, currentEnvironmentFocus());
  applyNightLighting(state);
  ui?.setDebugTimeOfDay(state.phase);
  scheduleSave();
  renderRequested = true;
  return true;
}

function rotateDriveCamera(direction) {
  if (viewMode !== 'drive' || milestoneCinematic) return false;
  const step = direction < 0 ? -1 : 1;
  driveCameraRotationStep = (driveCameraRotationStep + step + 4) % 4;
  driveCameraRotationTarget += step * Math.PI * .5;
  if (reducedMotion) {
    driveCameraRotation = driveCameraRotationTarget;
    cameraRotationTransition = null;
    updateDriveCameraOrientation();
    updateDriveCamera(activeVehicleState(), 0, true);
  }
  else {
    cameraRotationTransition = {
      elapsed: 0,
      from: driveCameraRotation,
      to: driveCameraRotationTarget,
    };
  }
  renderRequested = true;
  return true;
}

function updateDriveCameraRotation(dt) {
  if (!cameraRotationTransition) return;
  const transition = cameraRotationTransition;
  transition.elapsed += dt;
  const amount = THREE.MathUtils.smoothstep(transition.elapsed / cameraRotationSeconds, 0, 1);
  driveCameraRotation = THREE.MathUtils.lerp(transition.from, transition.to, amount);
  updateDriveCameraOrientation();
  if (transition.elapsed >= cameraRotationSeconds) {
    driveCameraRotation = transition.to;
    cameraRotationTransition = null;
    updateDriveCameraOrientation();
  }
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
  setCameraFogScale();
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
    vehicle.visual.setBalerFill(vehicle.equipmentState.balerLitres, BALER_STORAGE_CAPACITY);
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

function updateBuildCamera() {
  camera.position.copy(mapCameraTarget).add(buildCameraOffset);
  camera.lookAt(mapCameraTarget);
}

function setCameraView(nextMode, snapTarget = false) {
  viewMode = nextMode;
  if (viewMode === 'build') {
    const state = activeVehicleState();
    if (snapTarget) mapCameraTarget.set(state.x, 0, state.z);
    setCameraFogScale();
    camera.fov = 44;
    camera.updateProjectionMatrix();
    updateBuildCamera();
  }
  else {
    applyDriveCameraProjection();
    updateDriveCamera(activeVehicleState(), 0, true);
  }
}

function applyBuildMode(enabled) {
  if (!farm) return;
  buildings?.setBuildMode(enabled);
  if (enabled) {
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
  const spawn = farm.vehicleSpawnPoint(vehicle.spawnPoint);
  physics.resetVehicle(vehicle.id, spawn.position);
  vehicle.heading = spawn.heading;
  const state = activeVehicleState();
  vehicle.visual.sync(state, vehicle.heading, 0, 0, 0, elapsed);
  if (viewMode === 'build') {
    mapCameraTarget.set(state.x, 0, state.z);
    updateBuildCamera();
  }
  else updateDriveCamera(state, 0, true);
  scheduleSave();
}

function resetFleet() {
  fleet.forEach(vehicle => {
    const spawn = farm.vehicleSpawnPoint(vehicle.spawnPoint);
    vehicle.heading = spawn.heading;
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
    if (physics.hasVehicle(vehicle.id)) physics.resetVehicle(vehicle.id, spawn.position);
    else physics.createVehicle(vehicle.id, spawn.position);
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
    const stored = savedById.get(vehicle.id);
    if (!stored || stored.type !== vehicle.type) continue;
    const worldPose = farm.worldPose(stored.pose);
    const saved = worldPose ? { ...stored, position: worldPose.position, heading: worldPose.heading } : stored;
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
  farm = createArchipelagoRuntime(generateFarm(scene, physics, savedState?.world?.seed, 0, scheduleSave));
  physics.setSupportResolver((x, z) => farm.islandAtWorld(x, z)?.id || null);
  buildings.setParent(farm.group);
  progression = createMilestoneProgression(savedState?.progression);
  syncProgressionUi();
  if (savedState) {
    const savedBuildings = savedState.buildings.map(building => {
      const worldPose = farm.worldPose(building.pose);
      return worldPose ? { ...building, x: worldPose.position.x, z: worldPose.position.z } : building;
    });
    buildings.restorePersistentState(savedBuildings);
    farm.restorePersistentState(savedState.world, elapsed, (x, z) =>
      buildings.isBuildingAt(x, z) || buildings.isPastureAt(x, z));
    ui.restorePersistentState(savedState.ui);
    restoreFleet(savedState.vehicles, savedState.activeVehicleId);
  }
  else resetFleet();
  syncActiveVehicleUi();
  syncProgressionUi();
  syncInventoryUi();
  syncCargoPort();
  updateDriveCamera(activeVehicleState(), 0, true);
  const environmentState = environment.setPhase(savedState?.environment?.phase ?? DEFAULT_DAY_PHASE, driveCameraTarget);
  applyNightLighting(environmentState);
  ui.setDebugTimeOfDay(environmentState.phase);
  if (progression.state().pickupReady) beginMilestoneCinematic(progression.state());
  saveCoordinator.markReady();
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
  transferController.cancel();
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
  if (vehicleTransition || transferController.isActive()) return;
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

const transferController = createTransferController({
  physics,
  effects: transferEffects,
  getFleet: () => fleet,
  getActiveVehicle: activeVehicle,
  getActiveVehicleState: activeVehicleState,
  getBuildings: () => buildings,
  getFarm: () => farm,
  getProgression: () => progression,
  getUi: () => ui,
  getElapsed: () => elapsed,
  isCinematicActive: () => Boolean(milestoneCinematic),
  canTransferCargo,
  vehicleStorageKind,
  storageAmount,
  storageItemId,
  syncInventoryUi,
  syncCargoPort,
  beginMilestoneCinematic,
  scheduleSave,
});

 ui = createUi({
  commands: {
  restart: restartGame,
  changeLoadout: loadout => {
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
  previewLoadout: loadout => loadoutPreviews?.setLoadout(loadout),
  equipmentAction: (slot, enabled) => {
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
  cycleVehicle,
  siloLoad: transferController.loadSilo,
  siloUnload: transferController.unloadSilo,
  barnFeed: transferController.feedBarn,
  barnLoadMilk: transferController.loadBarnMilk,
  repaintPen: () => {
    const changed = buildings?.repaintSelected();
    updateConstructionPopup();
    return changed;
  },
  selectBuildingType: type => {
    const changed = buildings?.placeBuilding(type, mapCameraTarget);
    updateConstructionPopup();
    return changed;
  },
  constructionPrimaryAction: () => {
    const changed = buildings?.confirmSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  constructionCancel: () => {
    const changed = buildings?.cancelSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  constructionUndo: () => {
    const changed = buildings?.undoSelectedConstruction();
    updateConstructionPopup();
    return changed;
  },
  cargoDropOff: transferController.dropOffCargo,
  changeBuildMode: applyBuildMode,
  buildPointerStart: beginBuildingDrag,
  buildPointerMove: point => {
    const worldPoint = worldAtScreenPoint(point, buildings?.interactionLevel());
    if (worldPoint) buildings?.moveDrag(worldPoint);
  },
  buildPointerEnd: point => {
    const worldPoint = worldAtScreenPoint(point, buildings?.interactionLevel());
    if (worldPoint) buildings?.moveDrag(worldPoint);
    if (buildings?.endDrag() === true) ui.clearBuildingSelection();
  },
  buildPointerCancel: () => buildings?.cancelDrag(),
  overrideUnlock: setUnlockOverride,
  clearUnlockOverrides,
  overrideMilestone: setMilestoneOverride,
  changeCameraPreset: setDriveCameraPreset,
  changeTimeOfDay: setTimeOfDay,
  rotateCameraStep: rotateDriveCamera,
  dismissMilestoneCelebration: syncProgressionUi,
  persistentStateChange: scheduleSave,
  },
  cameraPresetFov: defaultDriveCameraFov,
  panSurface: renderer.domElement,
});
buildings = createBuildingManager({
  getSiteAt: (x, z, radius) => farm?.buildingSiteAt(x, z, radius),
  getTerrain: () => farm?.terrain,
  setCollider: (id, obstacle) => farm?.setBuildingCollider(id, obstacle),
  registerOccluder: object => farm?.registerOccluder(object),
  unregisterOccluder: object => farm?.unregisterOccluder(object),
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
  const sidewaysX = Math.cos(pose.heading), sidewaysZ = -Math.sin(pose.heading);
  farm.releaseBale(baleId, pose.x, groundY ?? state.y - .02, pose.z, pose.heading, {
    linearVelocity: { x: Math.sin(pose.heading) * .18, y: .05, z: Math.cos(pose.heading) * .18 },
    angularVelocity: { x: sidewaysX * .45, y: 0, z: sidewaysZ * .45 },
  });
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
      if (buildings?.isBuildingAt(x, z) || buildings?.isPastureAt(x, z)) return;
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
      const drop = toolPoint(state, 0, 3.25 + emitted * .34);
      const ejectSpeed = 1.05 + Math.min(1.2, state.speed * .18);
      const sidewaysX = Math.cos(vehicle.heading), sidewaysZ = -Math.sin(vehicle.heading);
      farm.spawnBale(drop.x, state.y + .2, drop.z, vehicle.heading, {
        linearVelocity: { x: Math.sin(vehicle.heading) * ejectSpeed, y: .18, z: Math.cos(vehicle.heading) * ejectSpeed },
        angularVelocity: { x: sidewaysX * 2.5, y: .18, z: sidewaysZ * 2.5 },
      });
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

  ui.setBarnAvailable(farm.insideWorkshop(state.x, state.z));
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
  updateBuildCamera();
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
      id: milestone.id,
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
  if (viewMode === 'drive' && !milestoneCinematic) updateDriveCameraRotation(dt);
  if (milestoneCinematic) updateMilestoneCinematic(dt);
  else if (vehicleTransition) updateVehicleTransition(dt);
  else if (viewMode === 'build') {
    visualDriveAmount = 0;
    visualSteer = 0;
    updateMap(dt);
  }
  else updateDrive(dt);
  transferController.update(dt);
  const cargoEvent = farm?.cargoPort.update(dt, camera, progression.state().pickupReady);
  if (cargoEvent?.shipmentPickedUp) collectMilestoneShipment();
  if (cargoEvent?.departed) finishMilestoneCinematic();
  syncFleetVisuals(dt);
  const environmentState = environment.update(dt, currentEnvironmentFocus());
  applyNightLighting(environmentState);
  ui.setDebugTimeOfDay(environmentState.phase);
  farm?.animate(elapsed, dt, (x, z) =>
    buildings?.isBuildingAt(x, z) || buildings?.isPastureAt(x, z));
  buildings?.animate(elapsed, dt);
  transferEffects.animate(elapsed);
  updateConstructionPopup();
  updateStoragePopup();
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
