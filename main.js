import { THREE } from './shared.js';
import { createPhysics } from './physics.js';
import { createTractor } from './tractor.js';
import { createUi } from './ui.js';
import { generateFarm } from './world-generator.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9def1);
scene.fog = new THREE.Fog(0xb9def1, 48, 105);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 200);
const cameraOffset = new THREE.Vector3(12, 20, 28);
const cameraForward = new THREE.Vector2(-cameraOffset.x, -cameraOffset.z).normalize();
const cameraRight = new THREE.Vector2(-cameraForward.y, cameraForward.x);
const cameraTarget = new THREE.Vector3();
camera.position.copy(cameraOffset);
camera.lookAt(cameraTarget);

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x587054, 1.35));
const sun = new THREE.DirectionalLight(0xffefc7, 3);
sun.position.set(-16, 26, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 38; sun.shadow.camera.bottom = -38;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
sun.shadow.bias = -.0002; sun.shadow.normalBias = .035;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa8cfff, .55);
fill.position.set(22, 14, -26);
scene.add(fill);

const physics = await createPhysics();
const tractor = createTractor(scene);
let farm;
let ui;
let heading = 0;
let elapsed = 0;
let last = performance.now();

function updateCamera(state, dt, snap = false) {
  const goal = new THREE.Vector3(state.x, state.y + .75, state.z);
  cameraTarget.lerp(goal, snap ? 1 : 1 - Math.exp(-2.2 * dt));
  camera.position.copy(cameraTarget).add(cameraOffset);
  camera.lookAt(cameraTarget);
}

function resetTractor(showMessage = false) {
  physics.resetTractor(farm.spawn);
  heading = 0;
  const state = physics.tractorState();
  tractor.sync(state, heading, 0, 0, 0, elapsed);
  updateCamera(state, 0, true);
  if (showMessage) ui.toast('TRACTOR RESCUE!');
}

function regenerateFarm() {
  if (farm) scene.remove(farm.group);
  farm = generateFarm(scene, physics);
  if (physics.tractorBody) resetTractor();
  else physics.createTractor(farm.spawn);
  ui?.resetPloughed();
}

ui = createUi({
  onRegenerate: regenerateFarm,
  onPloughChange: enabled => tractor.setPloughEnabled(enabled),
});
regenerateFarm();
resetTractor();

function applyPlough(state) {
  if (!ui.ploughEnabled() || !state.grounded || state.speed < .4) return;
  const sine = Math.sin(heading), cosine = Math.cos(heading);
  for (const localX of [-.4, 0, .4]) {
    const localZ = 1.22;
    const x = state.x + localX * cosine + localZ * sine;
    const z = state.z - localX * sine + localZ * cosine;
    if (farm.ploughAt(x, z)) ui.incrementPloughed();
  }
}

function update(dt) {
  elapsed += dt;
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
    // Movement follows the stick immediately; the tractor body catches up at
    // its turning rate, so it can keep travelling through a wide turn.
    driveDirection = { x: desiredX, z: desiredZ };
  }

  physics.drive(dt, driveDirection, driveAmount, ui.consumeJump());
  physics.step(dt);
  const state = physics.tractorState();
  if (state.y < -12) {
    resetTractor(true);
    return;
  }

  applyPlough(state);
  tractor.sync(state, heading, steer, driveAmount, dt, elapsed);
  updateCamera(state, dt);
  farm?.animate(elapsed);
  farm?.updateOcclusion(camera.position, state, dt);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.033, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
});

requestAnimationFrame(animate);
