import { THREE, createVoxelModel } from '../core/shared.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BUILDING_MATERIALS, createBuildingMaterialPalette } from '../world/buildings/material-palette.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  $('renderError').hidden = false;
  $('renderError').textContent = 'The material viewer needs WebGL. Enable hardware acceleration or open this page in another browser.';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce7e8);
const camera = new THREE.PerspectiveCamera(32, 1, .05, 80);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reducedMotion;
controls.enablePan = false;
controls.minPolarAngle = .01;
controls.maxPolarAngle = Math.PI * .48;
const environment = new RoomEnvironment();
const generator = new THREE.PMREMGenerator(renderer);
const environmentMap = generator.fromScene(environment, .04);
scene.environment = environmentMap.texture;
scene.environmentIntensity = .55;
environment.dispose(); generator.dispose();
const hemi = new THREE.HemisphereLight(0xe1f1ff, 0x8b7e63, 1.8);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0d8, 3.2);
key.position.set(-6, 10, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -6;
key.shadow.camera.right = key.shadow.camera.top = 6;
key.shadow.normalBias = .018; key.shadow.bias = -.0001;
scene.add(key);
const fill = new THREE.DirectionalLight(0xb9dfff, .8);
fill.position.set(6, 4, -5); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0xdce7e8, roughness: 1 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.21; floor.receiveShadow = true; scene.add(floor);
const palette = createBuildingMaterialPalette();
const bases = new THREE.MeshStandardMaterial({ color: 0xd2d9d4, roughness: 1 });
const overview = new THREE.Group();
const samples = new Map();
const pickable = [];
let selected = null, current = overview, fitDistance = 13;

function label(text, x, z, width = 1.2) {
  const image = document.createElement('canvas'); image.width = 384; image.height = 80;
  const context = image.getContext('2d');
  context.font = '500 34px sans-serif'; context.fillStyle = '#425e64';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 192, 40);
  const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, -.015, z); sprite.scale.set(width, width * 80 / 384, 1);
  return sprite;
}

BUILDING_MATERIALS.forEach((definition, index) => {
  const x = (index % 4 - 1.5) * 1.55, z = (Math.floor(index / 4) - 1.5) * 1.7;
  const sample = createVoxelModel([
    { material: bases, at: [-3, -1, -3], size: [6, 1, 6] },
    { material: palette.materials[definition.id], at: [-2, 0, -2], size: [4, 4, 4] },
  ], { name: `material-swatch-${definition.id}` });
  sample.position.set(x, 0, z);
  for (const mesh of sample.children) {
    mesh.userData.materialId = definition.id;
    pickable.push(mesh);
  }
  overview.add(sample, label(`${String(index + 1).padStart(2, '0')}  ${definition.name}`, x, z + .85, 1.45));
  const button = document.createElement('button');
  button.className = 'material-button'; button.style.setProperty('--swatch', definition.color);
  const chip = document.createElement('span'); chip.className = 'material-chip'; chip.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.textContent = definition.name;
  button.append(chip, name); button.dataset.materialId = definition.id;
  button.addEventListener('click', () => selectMaterial(definition.id));
  $('materialList').append(button);
});

function makeDetail(definition) {
  const material = palette.materials[definition.id];
  const group = createVoxelModel([
    { material: bases, at: [-8, -1, -4], size: [18, 1, 10] },
    { material, at: [-7, 0, -2], size: [4, 4, 4] },
    { material, at: [-1, 0, -2], size: [8, 6, 1] },
    { material, at: [-1, 0, 2], size: [8, 1, 2] },
    { material, at: [6, 1, 2], size: [1, 4, 2] },
    { material, at: [8, 0, -2], size: [1, 1, 1] },
  ], { name: `material-detail-${definition.id}` });
  group.add(label('Block', -1, 1.3, .85), label('Joined wall & beam', .6, 1.3, 1.7));
  return group;
}

function setView(front = false) {
  const direction = front ? new THREE.Vector3(0, .25, 1) : new THREE.Vector3(.75, selected ? .65 : 1.4, 1.5);
  camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(fitDistance));
  camera.lookAt(controls.target); controls.update();
}

function fit() {
  const bounds = new THREE.Box3().setFromObject(current);
  const size = bounds.getSize(new THREE.Vector3());
  bounds.getCenter(controls.target);
  controls.target.y = selected ? .5 : 0;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  fitDistance = Math.max(size.x * 2.1 / Math.min(aspect, 1.35), size.z * 1.9, size.y * 3.5);
  controls.minDistance = selected ? 2 : 4;
  controls.maxDistance = fitDistance * 1.6;
  setView();
}

function selectMaterial(id, updateHash = true) {
  const definition = BUILDING_MATERIALS.find(entry => entry.id === id);
  if (!definition) return;
  scene.remove(current);
  if (!samples.has(id)) samples.set(id, makeDetail(definition));
  current = samples.get(id); selected = id; scene.add(current);
  $('materialFamily').textContent = definition.family;
  $('materialName').textContent = definition.name;
  $('materialCue').textContent = definition.detail;
  $('materialFinish').textContent = definition.finish;
  $('materialColor').textContent = definition.color.toUpperCase();
  $('materialUse').textContent = definition.use;
  $('materialDetail').textContent = 'The block, wall and beam share the same surface detail size. Zoom in to inspect; switch textures off to compare the base color.';
  $('sampleCaption').textContent = 'One material · Solid block, joined wall, horizontal beam and single voxel';
  $('showPalette').classList.remove('selected'); $('showPalette').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('.material-button').forEach(button => button.setAttribute('aria-current', String(button.dataset.materialId === id)));
  if (updateHash) history.replaceState(null, '', `#${id}`);
  fit();
}

function showPalette(updateHash = true) {
  scene.remove(current); current = overview; selected = null; scene.add(overview);
  $('materialFamily').textContent = 'Sixteen shared materials'; $('materialName').textContent = 'A palette for the islands.';
  $('materialCue').textContent = 'Select a material to inspect its grain, color and finish.';
  $('materialFinish').textContent = 'A common material language'; $('materialColor').textContent = '16 colors';
  $('materialUse').textContent = 'Light walls and warm timber form the base. Painted accents identify each building; roofs and foundations anchor it.';
  $('materialDetail').textContent = 'Compare the palette together first, then select a material to see a block, a joined wall and a beam at the same texture scale.';
  $('sampleCaption').textContent = 'Plaster & timber / Painted accents / Stone & roofing / Metal & glazing';
  $('showPalette').classList.add('selected'); $('showPalette').setAttribute('aria-pressed', 'true');
  document.querySelectorAll('.material-button').forEach(button => button.setAttribute('aria-current', 'false'));
  if (updateHash) history.replaceState(null, '', location.pathname);
  fit();
}

function updateTextures() {
  const amount = Number($('textureStrength').value);
  palette.setTextureStrength($('textures').checked ? amount / 100 : 0);
  $('textureStrength').disabled = !$('textures').checked;
  $('strengthValue').value = `${amount}%`;
  $('textureStatus').textContent = $('textures').checked ? `Surface detail · ${amount}%` : 'Base colors · textures off';
}
$('textures').addEventListener('change', updateTextures);
$('textureStrength').addEventListener('input', updateTextures);
$('showPalette').addEventListener('click', () => showPalette());
$('frontView').addEventListener('click', () => setView(true));
$('resetView').addEventListener('click', fit);
$('lighting').addEventListener('change', event => {
  const evening = event.target.value === 'evening', day = event.target.value === 'day';
  const color = evening ? 0xbfc3d1 : 0xdce7e8;
  scene.background.setHex(color); floor.material.color.setHex(color);
  key.color.setHex(evening ? 0xffb075 : 0xfff0d8);
  key.position.set(-6, evening ? 4 : 10, 7);
  key.intensity = evening ? 2.3 : day ? 3.8 : 3.2;
  hemi.intensity = evening ? 1.1 : 1.8;
  scene.environmentIntensity = evening ? .35 : .55;
});
let pointerStart = null, pointerCount = 0, gesture = false;
canvas.addEventListener('pointerdown', event => {
  pointerCount++; if (pointerCount > 1) gesture = true;
  pointerStart = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', event => {
  const wasGesture = gesture;
  pointerCount = Math.max(0, pointerCount - 1); if (!pointerCount) gesture = false;
  if (selected || wasGesture || !pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickable, false)[0];
  if (hit) selectMaterial(hit.object.userData.materialId);
});
canvas.addEventListener('pointercancel', () => { pointerCount = 0; gesture = false; pointerStart = null; });
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === '0') return fit();
  if (event.key === 'Escape') return showPalette();
  const offset = camera.position.clone().sub(controls.target);
  const pose = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') pose.theta -= .15;
  if (event.key === 'ArrowRight') pose.theta += .15;
  if (event.key === 'ArrowUp') pose.phi -= .1;
  if (event.key === 'ArrowDown') pose.phi += .1;
  if (event.key === '+' || event.key === '=') pose.radius *= .9;
  if (event.key === '-') pose.radius *= 1.1;
  pose.phi = THREE.MathUtils.clamp(pose.phi, controls.minPolarAngle, controls.maxPolarAngle);
  pose.radius = THREE.MathUtils.clamp(pose.radius, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setFromSpherical(pose)); controls.update();
});
function resize() {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); fit();
}
function readHash() {
  const id = location.hash.slice(1);
  if (BUILDING_MATERIALS.some(material => material.id === id)) selectMaterial(id, false);
  else showPalette(false);
}
window.addEventListener('hashchange', readHash);
new ResizeObserver(resize).observe(canvas.parentElement);
readHash(); resize(); updateTextures();
renderer.setAnimationLoop(() => {
  if (document.hidden) return;
  controls.update(); renderer.render(scene, camera);
});
