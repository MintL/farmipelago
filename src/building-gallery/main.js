import { THREE, MODEL_VOXEL, createVoxelModel, mats } from '../core/shared.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDING_MODELS } from '../world/buildings/models.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce7e8);
const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch {
  $('renderError').hidden = false;
  $('renderError').textContent = 'The 3D viewer needs WebGL. Enable hardware acceleration or open this page in another browser.';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reducedMotion;
controls.enablePan = false;
controls.minPolarAngle = .01;
controls.maxPolarAngle = Math.PI * .49;
controls.autoRotateSpeed = .7;
const ambient = new THREE.HemisphereLight(0xd9efff, 0x887253, 2.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffedce, 4.2);
sun.position.set(-8, 13, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -9;
sun.shadow.camera.right = sun.shadow.camera.top = 9;
sun.shadow.normalBias = .025;
sun.shadow.bias = -.0001;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb2dcff, 1.3);
fill.position.set(8, 6, -8); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xdce7e8, roughness: 1 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.46; floor.receiveShadow = true; scene.add(floor);
const plinth = createVoxelModel([
  { material: mats.stoneDark, at: [-13, -2, -13], size: [26, 1, 26] },
  { material: mats.soil, at: [-14, -1, -14], size: [28, 1, 28] },
], { name: 'island-plinth' });
const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x829b5c, roughness: 1 });
const ground = new THREE.Mesh(new THREE.BoxGeometry(5.6, .08, 5.6), grassMaterial);
ground.position.y = -.04; ground.receiveShadow = true; plinth.add(ground); scene.add(plinth);
let current = null, modelIndex = 0, elapsed = 0, machineTime = 0, viewDistance = 16;
const models = new Map();
const vector = new THREE.Vector3();

function setView(view = 'perspective') {
  const direction = { perspective: [1, .74, 1.35], front: [0, .16, 1], back: [0, .16, -1], top: [0, 1, .001] }[view];
  direction[2] *= current.front || 1;
  vector.set(...direction).normalize().multiplyScalar(viewDistance);
  camera.position.copy(controls.target).add(vector);
  camera.lookAt(controls.target);
  controls.update();
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('selected', button.dataset.view === view);
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  });
}

function fitModel() {
  const size = current.bounds.getSize(new THREE.Vector3());
  current.bounds.getCenter(controls.target);
  controls.target.y = size.y * .44;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  viewDistance = Math.max(size.y * 2.4, Math.max(size.x, size.z, 5.6) * 2.0 / Math.min(aspect, 1.4));
  controls.minDistance = viewDistance * .36;
  controls.maxDistance = viewDistance * 2;
  setView();
}

function selectModel(index, updateHash = true) {
  modelIndex = index;
  if (current) scene.remove(current.group);
  const definition = BUILDING_MODELS[index];
  if (!models.has(definition.id)) models.set(definition.id, definition.create());
  current = models.get(definition.id);
  scene.add(current.group);
  $('modelName').textContent = definition.name;
  $('modelCategory').textContent = definition.category;
  $('modelCue').textContent = definition.cue;
  $('motionDescription').textContent = definition.motion;
  document.querySelectorAll('.model-button').forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
  if (updateHash) history.replaceState(null, '', `#${definition.id}`);
  elapsed = machineTime = 0;
  current.animate(0, true, reducedMotion);
  fitModel();
}

$('modelCount').textContent = String(BUILDING_MODELS.length).padStart(2, '0');
BUILDING_MODELS.forEach((definition, index) => {
  const button = document.createElement('button');
  button.className = 'model-button';
  button.style.setProperty('--swatch', definition.color);
  button.innerHTML = `<span class="model-number">${String(index + 1).padStart(2, '0')}</span><strong></strong><span class="model-swatch" aria-hidden="true"></span>`;
  button.querySelector('strong').textContent = definition.name;
  button.addEventListener('click', () => selectModel(index));
  $('modelList').append(button);
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('resetView').addEventListener('click', fitModel);
$('autoRotate').addEventListener('change', event => { controls.autoRotate = event.target.checked; });
$('animate').checked = !reducedMotion;
const animationStatus = () => { $('motionStatus').textContent = $('animate').checked ? 'Animation playing' : 'Animation paused'; };
$('animate').addEventListener('change', animationStatus);
animationStatus();
$('lighting').addEventListener('change', event => {
  const evening = event.target.value === 'evening', studio = event.target.value === 'studio';
  const color = evening ? 0xb9bccf : studio ? 0xe5e8eb : 0xdce7e8;
  scene.background.setHex(color); floor.material.color.setHex(color);
  sun.color.setHex(evening ? 0xffaf72 : 0xffedce);
  sun.intensity = evening ? 2.5 : 4.2;
  sun.position.set(-8, evening ? 5 : 13, 9);
  ambient.intensity = evening ? 1.3 : 2.6;
  fill.intensity = studio ? 2 : 1.3;
});
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', ' '].includes(event.key)) return;
  event.preventDefault();
  if (event.key === ' ') { $('animate').checked = !$('animate').checked; animationStatus(); return; }
  if (event.key === '0') { fitModel(); return; }
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta -= .15;
  if (event.key === 'ArrowRight') spherical.theta += .15;
  if (event.key === 'ArrowUp') spherical.phi -= .1;
  if (event.key === 'ArrowDown') spherical.phi += .1;
  if (['+', '='].includes(event.key)) spherical.radius *= .9;
  if (event.key === '-') spherical.radius *= 1.1;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setFromSpherical(spherical)); controls.update();
});

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  if (current) fitModel();
}
new ResizeObserver(resize).observe(canvas.parentElement);
window.addEventListener('hashchange', () => {
  const index = BUILDING_MODELS.findIndex(model => model.id === location.hash.slice(1));
  if (index >= 0 && index !== modelIndex) selectModel(index, false);
});
selectModel(Math.max(0, BUILDING_MODELS.findIndex(model => model.id === location.hash.slice(1))), false);
resize();
let previous = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
  if (document.hidden) return;
  if ($('animate').checked) {
    elapsed += dt;
    if ($('working').checked) machineTime += dt;
    current.animate(current.productionOnly ? machineTime : elapsed, $('working').checked, reducedMotion, machineTime);
  }
  controls.update(dt);
  renderer.render(scene, camera);
});
