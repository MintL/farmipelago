import { THREE } from './shared.js?v=crop-diversity-20260831-1';
import { crops } from './crops.js?v=crop-diversity-20260831-1';
import { createPhysics } from './physics.js?v=vehicle-fleet-20260831-1';
import { createLoadoutPreview, createVehicle } from './tractor.js?v=vehicle-fleet-20260831-1';
import { createUi } from './ui.js?v=vehicle-fleet-20260831-1';
import { createBuildingManager } from './buildings.js?v=crop-diversity-20260831-1';
import { generateFarm } from './world-generator.js?v=vehicle-fleet-20260831-1';
import { createMilestoneProgression } from './progression.js?v=crop-diversity-20260831-1';
import { OWNED_VEHICLES, vehicleType } from './vehicles.js?v=vehicle-fleet-20260831-1';

const pixelRatioCap = 1.5;
const targetFrameInterval = 1000 / 60 * .96;
const fpsSampleInterval = 500;
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
let progression = createMilestoneProgression();
const buildRaycaster = new THREE.Raycaster();
const buildPointer = new THREE.Vector2();
const buildPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const buildWorldPoint = new THREE.Vector3();

function activeVehicle() {
  return fleet[activeVehicleIndex];
}

function activeVehicleState() {
  return physics.vehicleState(activeVehicle().id);
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

function resetActiveVehicle(showMessage = false) {
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
  if (showMessage) ui.toast(`${vehicle.definition.name} rescued`);
}

function resetFleet() {
  fleet.forEach((vehicle, index) => {
    const spawn = farm.vehicleSpawns[index % farm.vehicleSpawns.length];
    vehicle.spawn = spawn;
    vehicle.heading = 0;
    vehicle.toolEnabled = false;
    vehicle.storage.contents = {};
    vehicle.visual.setLoadout(vehicle.loadout);
    vehicle.visual.setToolEnabled(false);
    if (physics.hasVehicle(vehicle.id)) physics.resetVehicle(vehicle.id, spawn);
    else physics.createVehicle(vehicle.id, spawn);
  });
  physics.setActiveVehicle(activeVehicle().id);
  fleet.forEach(vehicle => {
    const state = physics.vehicleState(vehicle.id);
    vehicle.visual.sync({ ...state, grounded: true }, vehicle.heading, 0, 0, 0, elapsed);
  });
}

function regenerateFarm() {
  if (farm) {
    farm.dispose();
    buildings?.clear();
    scene.remove(farm.group);
  }
  farm = generateFarm(scene, physics);
  buildings?.setParent(farm.group);
  resetFleet();
  progression = createMilestoneProgression();
  ui?.resetFarm();
  syncActiveVehicleUi();
  ui?.setMilestone(progression.state());
  syncStorageUi();
  farm.cargoPort.setLoadRatio(0);
  applyCropOverlay();
}

function storageAmount() {
  return Object.values(activeVehicle().storage.contents).reduce((sum, amount) => sum + amount, 0);
}

function storageCropId() {
  const storage = activeVehicle().storage;
  return Object.keys(storage.contents).find(cropId => storage.contents[cropId] > 0) || null;
}

function storageLabel() {
  const cropId = storageCropId();
  return cropId ? crops[cropId]?.name || 'Storage' : 'Storage';
}

function syncStorageUi() {
  const storage = activeVehicle().storage;
  ui?.setHarvestMeter(storageAmount(), storage.capacity, storageLabel());
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
  ui.setBarnAvailable(false);
  activeVehicleIndex = (activeVehicleIndex + 1) % fleet.length;
  const vehicle = activeVehicle();
  physics.setActiveVehicle(vehicle.id);
  syncActiveVehicleUi();
  const state = activeVehicleState();
  vehicle.visual.sync(state, vehicle.heading, 0, 0, 0, elapsed);
  updateDriveCamera(state, 0, true);
  farm.updateOcclusion(camera.position, state, 0);
  ui.toast(vehicle.definition.name);
}

function milestoneLoadRatio() {
  const requirements = progression.state().requirements;
  const delivered = requirements.reduce((sum, requirement) => sum + requirement.delivered, 0);
  const target = requirements.reduce((sum, requirement) => sum + requirement.target, 0);
  return target ? delivered / target : 0;
}

function emptyIntoSilo() {
  if (activeVehicle().type !== 'harvester') return;
  const vehicle = activeVehicle();
  const state = activeVehicleState();
  if (!storageAmount()) {
    ui.toast('Grain tank is already empty');
    return;
  }
  if (!buildings?.isNearSilo(state.x, state.z)) {
    ui.toast('Move beside a silo to unload');
    return;
  }
  vehicle.storage.contents = {};
  syncStorageUi();
  ui.toast('Combine emptied into silo');
}

function dropOffCargo() {
  if (activeVehicle().type !== 'harvester') return;
  const storage = activeVehicle().storage;
  const state = activeVehicleState();
  if (!farm.cargoPort.isNear(state.x, state.z)) {
    ui.toast('Move beside the cargo pad');
    return;
  }
  const milestone = progression.state();
  if (milestone.complete) {
    ui.toast('Cargo ready · awaiting VTOL pickup');
    return;
  }
  if (!storageAmount()) {
    ui.toast('Internal storage is empty');
    return;
  }
  const accepted = progression.accept(storage.contents);
  const acceptedAmount = Object.values(accepted).reduce((sum, amount) => sum + amount, 0);
  if (!acceptedAmount) {
    ui.toast(`Milestone ${milestone.number} only needs Corn`);
    return;
  }
  for (const [cropId, amount] of Object.entries(accepted)) {
    storage.contents[cropId] -= amount;
    if (storage.contents[cropId] <= 0) delete storage.contents[cropId];
  }
  const nextState = progression.state();
  syncStorageUi();
  ui.setMilestone(nextState);
  farm.cargoPort.setLoadRatio(milestoneLoadRatio());
  ui.toast(nextState.complete
    ? `Milestone ${nextState.number} complete · awaiting VTOL`
    : `${acceptedAmount} Corn delivered`);
}

function useStorageAction() {
  if (activeVehicle().type !== 'harvester') return;
  const state = activeVehicleState();
  if (farm.cargoPort.isNear(state.x, state.z)) dropOffCargo();
  else if (buildings?.isNearSilo(state.x, state.z)) emptyIntoSilo();
  else ui.toast('Move beside a silo or cargo pad');
}

function storageActionAt(state) {
  if (activeVehicle().type !== 'harvester') return { kind: 'hidden', enabled: false };
  const storage = activeVehicle().storage;
  const amount = storageAmount();
  if (farm.cargoPort.isNear(state.x, state.z)) {
    const milestone = progression.state();
    const accepted = milestone.requirements.some(requirement =>
      requirement.delivered < requirement.target && (storage.contents[requirement.cropId] || 0) > 0
    );
    return { kind: 'cargo', enabled: amount > 0 && accepted && !milestone.complete };
  }
  if (buildings?.isNearSilo(state.x, state.z)) return { kind: 'silo', enabled: amount > 0 };
  return { kind: 'unavailable', enabled: false };
}

ui = createUi({
  onRegenerate: regenerateFarm,
  onLoadoutChange: loadout => {
    const vehicle = activeVehicle();
    vehicle.loadout = { ...vehicle.loadout, ...loadout };
    vehicle.visual.setLoadout(vehicle.loadout);
    syncActiveVehicleUi();
  },
  onLoadoutPreview: loadout => loadoutPreviews?.setLoadout(loadout),
  onToolChange: enabled => {
    const vehicle = activeVehicle();
    vehicle.toolEnabled = enabled;
    vehicle.visual.setToolEnabled(enabled);
  },
  onCycleVehicle: cycleVehicle,
  onStorageAction: useStorageAction,
  onCropOverlayChange: applyCropOverlay,
  onBuildModeChange: applyBuildMode,
  onBuildPointerStart: beginBuildingDrag,
  onBuildPointerMove: point => {
    const worldPoint = worldAtScreenPoint(point);
    if (worldPoint) buildings?.moveDrag(worldPoint);
  },
  onBuildPointerEnd: () => {
    if (buildings?.endDrag()) {
      ui.clearBuildingSelection();
      ui.toast('Silo placed · free');
    }
  },
  onBuildPointerCancel: () => buildings?.cancelDrag(),
  panSurface: renderer.domElement,
});
regenerateFarm();
buildings = createBuildingManager({
  getSiteAt: (x, z, radius) => farm?.buildingSiteAt(x, z, radius),
  setCollider: (id, obstacle) => farm?.setBuildingCollider(id, obstacle),
});
buildings.setParent(farm.group);

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
      farm.ploughAt(x, z, levelY);
    });
  }
  else if (tool === 'seeder') {
    forToolRows(state, [-.32, .32], 1.54, (x, z) => {
      farm.seedAt(x, z, levelY, elapsed, ui.activeSeedId());
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

  physics.drive(dt, driveDirection, driveAmount, ui.consumeJump(), vehicle.toolEnabled);
  physics.step(dt);
  const state = activeVehicleState();
  if (!before.grounded && state.grounded && before.verticalSpeed < -.35) {
    farm.splashAt(state.x, state.z, Math.max(3, Math.abs(before.verticalSpeed), state.speed * .65));
  }
  if (state.y < -12) {
    resetActiveVehicle(true);
    return;
  }

  ui.setBarnAvailable(farm.insideBarn(state.x, state.z));
  applyTool(state);
  ui.setStorageAction(storageActionAt(state));
  vehicle.visual.sync(state, vehicle.heading, steer, driveAmount, dt, elapsed);
  updateDriveCamera(state, dt);
  farm.updateOcclusion(camera.position, state, dt);
}

function updateMap(dt) {
  const pan = ui.consumePan();
  mapCameraTarget.x += pan.keyboardX * 19 * dt - pan.dragX * .055;
  mapCameraTarget.z += pan.keyboardZ * 19 * dt - pan.dragY * .055;
  if (viewMode === 'build') updateBuildCamera();
  else updateMapCamera();
}

function update(dt) {
  if (ui.isGameplayBlocked()) return;
  elapsed += dt;
  if (viewMode === 'overlay' || viewMode === 'build') updateMap(dt);
  else updateDrive(dt);
  const cargoEvent = farm?.cargoPort.update(dt, camera, progression.state().complete);
  if (cargoEvent?.pickedUp) {
    const shipped = progression.state().number;
    if (progression.collect()) {
      const nextState = progression.state();
      ui.setMilestone(nextState);
      farm.cargoPort.setLoadRatio(0);
      ui.toast(`Milestone ${shipped} shipped · Milestone ${nextState.number} ready`);
    }
  }
  farm?.animate(elapsed);
  buildings?.animate(elapsed);
  clouds.animate(elapsed);
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

document.addEventListener('visibilitychange', () => resetFpsMeter(performance.now()));

requestAnimationFrame(animate);
