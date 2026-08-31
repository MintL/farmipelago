import { THREE } from './shared.js?v=combine-fix-20260830-6';
import { createPhysics } from './physics.js?v=combine-fix-20260830-6';
import { createLoadoutPreview, createTractor } from './tractor.js?v=combine-fix-20260830-6';
import { createUi } from './ui.js?v=combine-unload-20260831-17';
import { createBuildingManager } from './buildings.js?v=combine-unload-20260831-17';
import { generateFarm } from './world-generator.js?v=terrain-batch-20260830-12';

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
const tractor = createTractor(scene);
let farm;
let ui;
let buildings;
let loadoutPreviews = null;
let heading = 0;
let elapsed = 0;
let last = performance.now();
let animationLast = last;
let frameBudget = targetFrameInterval;
let fpsWindowStarted = last;
let fpsFrameCount = 0;
let gameplayWasBlocked = false;
let renderRequested = true;
let viewMode = 'drive';
const GRAIN_CAPACITY = 36;
let grainFill = 0;
let activeVehicle = 'tractor';
const buildRaycaster = new THREE.Raycaster();
const buildPointer = new THREE.Vector2();
const buildPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const buildWorldPoint = new THREE.Vector3();

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
    const state = physics.tractorState();
    if (snapTarget) mapCameraTarget.set(state.x, 0, state.z);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    updateMapCamera();
  }
  else if (viewMode === 'build') {
    const state = physics.tractorState();
    if (snapTarget) mapCameraTarget.set(state.x, 0, state.z);
    camera.fov = 44;
    camera.updateProjectionMatrix();
    updateBuildCamera();
  }
  else {
    camera.fov = 38;
    camera.updateProjectionMatrix();
    updateDriveCamera(physics.tractorState(), 0, true);
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

function resetTractor(showMessage = false) {
  physics.resetTractor(farm.spawn);
  heading = 0;
  const state = physics.tractorState();
  tractor.sync(state, heading, 0, 0, 0, elapsed);
  if (viewMode === 'overlay' || viewMode === 'build') {
    mapCameraTarget.set(state.x, 0, state.z);
    if (viewMode === 'build') updateBuildCamera();
    else updateMapCamera();
  }
  else updateDriveCamera(state, 0, true);
  if (showMessage) ui.toast('Tractor rescued');
}

function regenerateFarm() {
  if (farm) {
    farm.dispose();
    buildings?.clear();
    scene.remove(farm.group);
  }
  farm = generateFarm(scene, physics);
  buildings?.setParent(farm.group);
  if (physics.tractorBody) resetTractor();
  else physics.createTractor(farm.spawn);
  ui?.resetFarm();
  grainFill = 0;
  ui?.setHarvestMeter(grainFill, GRAIN_CAPACITY);
  applyCropOverlay();
}

function unloadCombine() {
  if (activeVehicle !== 'harvester') return;
  const state = physics.tractorState();
  if (!grainFill) {
    ui.toast('Grain tank is already empty');
    return;
  }
  if (!buildings?.isNearSilo(state.x, state.z)) {
    ui.toast('Move beside a silo to unload');
    return;
  }
  grainFill = 0;
  ui.setHarvestMeter(grainFill, GRAIN_CAPACITY);
  ui.setUnloadAvailable(false);
  ui.toast('Combine emptied into silo');
}

ui = createUi({
  onRegenerate: regenerateFarm,
  onLoadoutChange: loadout => {
    const vehicleChanged = activeVehicle !== loadout.vehicle;
    activeVehicle = loadout.vehicle;
    if (vehicleChanged) grainFill = 0;
    tractor.setLoadout(loadout);
    ui.setHarvestMeter(grainFill, GRAIN_CAPACITY);
    ui.setUnloadAvailable(false);
  },
  onLoadoutPreview: loadout => loadoutPreviews?.setLoadout(loadout),
  onToolChange: enabled => tractor.setToolEnabled(enabled),
  onUnload: unloadCombine,
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
resetTractor();

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
    freeze() { vehicle.freeze(); tool.freeze(); frontTool.freeze(); },
  };
}

function forToolRows(state, rows, localZ, apply) {
  const sine = Math.sin(heading), cosine = Math.cos(heading);
  for (const localX of rows) {
    const x = state.x + localX * cosine + localZ * sine;
    const z = state.z - localX * sine + localZ * cosine;
    apply(x, z);
  }
}

function applyTool(state) {
  if (!ui.toolEnabled() || !state.grounded || state.speed < .4) return;
  const levelY = farm.farmingLevelNear(state.x, state.z);
  const { tool, vehicle } = ui.activeLoadout();
  if (vehicle === 'harvester') {
    if (grainFill >= GRAIN_CAPACITY) return;
    let collected = 0;
    forToolRows(state, [-1.32, -.88, -.44, 0, .44, .88, 1.32], -1.72, (x, z) => {
      if (grainFill + collected >= GRAIN_CAPACITY) return;
      const harvest = farm.harvestAt(x, z, levelY);
      if (harvest) collected += harvest.yieldAmount;
    });
    if (collected) {
      grainFill = Math.min(GRAIN_CAPACITY, grainFill + collected);
      ui.setHarvestMeter(grainFill, GRAIN_CAPACITY);
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
      farm.seedAt(x, z, levelY, elapsed);
    });
  }
  else if (tool === 'sprayer') {
    forToolRows(state, [-1.15, -.77, -.38, 0, .38, .77, 1.15], 1.58, (x, z) => {
      farm.sprayAt(x, z, levelY);
    });
  }
}

function updateDrive(dt) {
  const input = ui.driveInput();
  const rawDrive = Math.hypot(input.x, input.y);
  const driveAmount = THREE.MathUtils.clamp((rawDrive - .08) / .92, 0, 1);
  const before = physics.tractorState();
  let driveDirection = { x: -Math.sin(heading), z: -Math.cos(heading) };
  let steer = 0;

  if (driveAmount > 0) {
    const unitX = input.x / rawDrive;
    const unitY = input.y / rawDrive;
    const desiredX = cameraRight.x * unitX + cameraForward.x * unitY;
    const desiredZ = cameraRight.y * unitX + cameraForward.y * unitY;
    const desiredHeading = Math.atan2(-desiredX, -desiredZ);
    const turnDelta = Math.atan2(Math.sin(desiredHeading - heading), Math.cos(desiredHeading - heading));
    const maxTurn = (before.grounded ? 2.75 : 1.65) * dt;
    heading += THREE.MathUtils.clamp(turnDelta, -maxTurn, maxTurn);
    steer = THREE.MathUtils.clamp(turnDelta * 1.35, -1, 1);
    driveDirection = { x: desiredX, z: desiredZ };
  }

  physics.drive(dt, driveDirection, driveAmount, ui.consumeJump(), ui.toolEnabled());
  physics.step(dt);
  const state = physics.tractorState();
  if (!before.grounded && state.grounded && before.verticalSpeed < -.35) {
    farm.splashAt(state.x, state.z, Math.max(3, Math.abs(before.verticalSpeed), state.speed * .65));
  }
  if (state.y < -12) {
    resetTractor(true);
    return;
  }

  ui.setBarnAvailable(farm.insideBarn(state.x, state.z));
  applyTool(state);
  ui.setUnloadAvailable(activeVehicle === 'harvester' && grainFill > 0 && buildings?.isNearSilo(state.x, state.z));
  tractor.sync(state, heading, steer, driveAmount, dt, elapsed);
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
      loadoutPreviews.freeze();
    }
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
