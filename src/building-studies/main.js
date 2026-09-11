import { THREE, TILE, mats, box } from '../core/shared.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTractorAsset } from '../gameplay/vehicles/assets.js';
import { BUILDING_STUDIES, BUILDING_STYLES, volumeCorners } from './models.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionPreference.matches;
const scene = new THREE.Scene();
const background = 0xe3eae7;
const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  $('renderError').hidden = false;
  $('renderError').textContent = 'The 3D preview needs WebGL. Enable hardware acceleration or try another browser.';
  throw new Error('Building preview: WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = !reducedMotion;
controls.maxPolarAngle = Math.PI * .48;
controls.minPolarAngle = .15;
controls.autoRotateSpeed = .65;
const ambient = new THREE.HemisphereLight(0xe5f2ff, 0x867853, 2.5); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffedcf, 3.5);
sun.position.set(-6, 11, 7); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 9, bottom: -7, near: .1, far: 40 });
sun.shadow.normalBias = .025; sun.shadow.bias = -.0001; scene.add(sun);
const fill = new THREE.DirectionalLight(0xc7e9ff, 1.5); fill.position.set(7, 6, -5); scene.add(fill);
const floorMaterial = new THREE.ShadowMaterial({ opacity: .1 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMaterial);
floor.rotation.x = -Math.PI / 2; floor.position.y = -.45; floor.receiveShadow = true; scene.add(floor);

// A quiet patch of the real tile grid keeps the building in its game context.
const ground = new THREE.Group(); scene.add(ground);
const grass = new THREE.MeshStandardMaterial({ color: 0x98a977, roughness: 1 });
const path = new THREE.MeshStandardMaterial({ color: 0xbeaf8b, roughness: 1 });
for (let gx = -3; gx <= 3; gx++) for (let gz = -2; gz <= 2; gz++) {
  if (Math.abs(gx) === 3 && gz === -2) continue;
  const tile = box(TILE, .12, TILE, gz === 2 || (gx === 3 && gz > -1) ? path : grass);
  tile.position.set(gx * TILE, -.06, gz * TILE); ground.add(tile);
}
const soil = box(7 * TILE, .16, 4 * TILE, mats.soil); soil.position.set(0, -.2, .5 * TILE); ground.add(soil);
const stone = box(6.6 * TILE, .15, 3.7 * TILE, mats.stoneDark); stone.position.set(0, -.35, .5 * TILE); ground.add(stone);
const rearSoil = box(5 * TILE, .16, TILE, mats.soil); rearSoil.position.set(0, -.2, -2 * TILE); ground.add(rearSoil);
const frontApron = new THREE.Group(); scene.add(frontApron);
for (let gx = -3; gx <= 3; gx++) for (const gz of [3, 4]) {
  const tile = box(TILE, .12, TILE, path); tile.position.set(gx * TILE, -.06, gz * TILE); frontApron.add(tile);
}
const apronSoil = box(7 * TILE, .16, 2 * TILE, mats.soil); apronSoil.position.set(0, -.2, 3.5 * TILE); frontApron.add(apronSoil);
const apronStone = box(6.6 * TILE, .15, 1.7 * TILE, mats.stoneDark); apronStone.position.set(0, -.35, 3.5 * TILE); frontApron.add(apronStone);
frontApron.visible = false;
const tractor = createTractorAsset().group;
tractor.position.set(-2.15 * TILE, .015, 1.85 * TILE); tractor.rotation.y = .45;
tractor.visible = false; scene.add(tractor);

let working = true, time = 0, elapsed = 0, activeView = 'perspective', model, definition, selectedStyle, content;
let framingPoints = [], framingTarget = [0, 2, 0];
const target = new THREE.Vector3(), models = new Map();
const groundFraming = volumeCorners([[[-3.6, -.4, -2.6], [3.6, 0, 3]]]);
const apronFraming = volumeCorners([[[-3.6, -.4, 2.5], [3.6, 0, 4.6]], [[-2.9, 0, 2.7], [-.5, 1.9, 4.3]]]);

function updateScaleReference() {
  tractor.visible = $('tractor').checked;
  tractor.position.set(...definition.tractor.map(value => value * TILE));
  tractor.rotation.y = definition.tractorYaw;
  frontApron.visible = tractor.visible && !!definition.frontApron;
  $('scaleCaption').textContent = tractor.visible ? 'The farm tractor, at its actual game scale.' : content.caption;
}

function readSelection() {
  const [id, style] = location.hash.slice(1).split('/');
  // Retain the earlier voxel gallery's deep links.
  if (id === 'windmill') return ['grain-mill', style || 'voxel'];
  if (id && id !== 'grain-mill' && !style) return [id, 'voxel'];
  return [id || 'grain-mill', style];
}

function boundsCorners(bounds) {
  const points = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function selectModel(id, style) {
  const next = BUILDING_STUDIES.find(study => study.id === id) || BUILDING_STUDIES[0];
  const nextStyle = next.variants[style] ? style : next.defaultStyle;
  const sameBuilding = next === definition;
  if (sameBuilding && nextStyle === selectedStyle) return;
  if (model) scene.remove(model.group);
  definition = next;
  selectedStyle = nextStyle;
  if (!sameBuilding) {
    time = elapsed = 0;
    // One shared camera envelope per building allows direct style comparison.
    // Load only this building's available variants; other buildings stay lazy.
    framingPoints = [];
    for (const [variantId, variant] of Object.entries(next.variants)) {
      const key = `${next.id}/${variantId}`;
      if (!models.has(key)) models.set(key, variant.create());
      const item = models.get(key);
      framingPoints.push(...(variant.framing || boundsCorners(item.bounds)));
    }
    const top = Math.max(...framingPoints.map(point => point.y));
    framingTarget = next.target || [0, top / TILE * .44, 0];
  }
  model = models.get(`${next.id}/${nextStyle}`); scene.add(model.group);
  content = { ...next, ...next.variants[nextStyle] };
  $('modelName').textContent = next.name;
  $('modelCategory').textContent = `${String(BUILDING_STUDIES.indexOf(next) + 1).padStart(2, '0')} / ${next.category}`;
  $('modelIntro').textContent = content.intro;
  $('styleNote').textContent = content.note;
  $('modelProcess').replaceChildren(...content.steps.map(([title, description], index) => {
    const li = document.createElement('li'), number = document.createElement('span'), text = document.createElement('div');
    number.className = 'step'; number.textContent = index + 1;
    const strong = document.createElement('strong'), p = document.createElement('p');
    strong.textContent = title; p.textContent = description;
    text.append(strong, p); li.append(number, text); return li;
  }));
  $('buildingSelect').value = next.id;
  const styleName = BUILDING_STYLES.find(item => item.id === nextStyle).name;
  $('styleTag').textContent = styleName;
  document.querySelectorAll('[data-style]').forEach(button => {
    const available = !!next.variants[button.dataset.style];
    button.disabled = !available;
    button.title = available ? `Show ${button.textContent.toLowerCase()} style` : 'Not designed for this building yet';
    button.setAttribute('aria-pressed', String(button.dataset.style === nextStyle));
  });
  canvas.setAttribute('aria-label', `${next.name}, ${styleName} style. Drag to orbit, pinch or scroll to zoom. Arrow keys orbit, plus and minus zoom, 0 resets, Space pauses.`);
  document.title = `${next.name} · ${styleName} · Farmipelago`;
  model.animate(time, working, reducedMotion, elapsed); model.setLighting?.($('lighting').value);
  updateScaleReference(); updateStatus();
  if (!sameBuilding) setView();
  const hash = `#${next.id}/${nextStyle}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

BUILDING_STUDIES.forEach(study => {
  const option = document.createElement('option'); option.value = study.id; option.textContent = study.name;
  $('buildingSelect').append(option);
});
$('buildingSelect').addEventListener('change', event => {
  const next = BUILDING_STUDIES.find(study => study.id === event.target.value);
  location.hash = `${next.id}/${next.variants[selectedStyle] ? selectedStyle : next.defaultStyle}`;
});
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => {
  location.hash = `${definition.id}/${button.dataset.style}`;
}));
window.addEventListener('hashchange', () => selectModel(...readSelection()));

function selectViewButtons(view) {
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}

function setView(view = 'perspective') {
  if (!model) return;
  activeView = view;
  target.set(...framingTarget).multiplyScalar(TILE);
  const direction = new THREE.Vector3(...{ perspective: [3.8, 3.4, 10], front: [0, 1.6, 10], back: [-4, 3.4, -10] }[view]).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const cameraUp = new THREE.Vector3().crossVectors(direction, right);
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let distance = 0;
  const framing = [...framingPoints, ...groundFraming, ...(frontApron.visible ? apronFraming : [])];
  for (const point of framing) {
    const offset = point.clone().sub(target);
    distance = Math.max(distance, offset.dot(direction) + 1.05 * Math.max(
      Math.abs(offset.dot(cameraUp)) / halfFov,
      Math.abs(offset.dot(right)) / (halfFov * camera.aspect),
    ));
  }
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  controls.minDistance = distance * .4; controls.maxDistance = distance * 1.9;
  camera.lookAt(target); controls.update(); selectViewButtons(view);
}

function updateStatus() {
  $('motionStatus').textContent = !$('animate').checked ? 'Paused' : working ? content.status : 'Idle';
}

function setWorking(value) {
  working = value;
  $('runBuilding').setAttribute('aria-pressed', String(value));
  $('idleBuilding').setAttribute('aria-pressed', String(!value));
  // Immediately clear production particles even when the scene clock is paused.
  model.animate(time, working, reducedMotion, elapsed); updateStatus();
}
$('runBuilding').addEventListener('click', () => setWorking(true));
$('idleBuilding').addEventListener('click', () => setWorking(false));
$('animate').checked = !reducedMotion;
$('animate').addEventListener('change', updateStatus);
$('autoRotate').addEventListener('change', event => { controls.autoRotate = event.target.checked; });
$('tractor').addEventListener('change', () => { updateScaleReference(); setView(activeView); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('resetView').addEventListener('click', () => setView());
controls.addEventListener('start', () => selectViewButtons(null));
$('lighting').addEventListener('change', event => {
  const evening = event.target.value === 'evening', studio = event.target.value === 'studio';
  const color = evening ? 0xc5c7d5 : studio ? 0xe4e9ec : background;
  sun.color.setHex(evening ? 0xffbe87 : 0xffedcf);
  sun.position.y = evening ? 5 : 11; sun.intensity = evening ? 2.4 : 3.5;
  ambient.intensity = evening ? 1.65 : 2.5; fill.intensity = studio ? 2.1 : 1.5;
  document.querySelector('.viewer').style.backgroundColor = `#${color.toString(16)}`;
  model.setLighting?.(event.target.value);
});
motionPreference.addEventListener('change', event => {
  reducedMotion = event.matches; controls.enableDamping = !reducedMotion;
  if (reducedMotion) { $('animate').checked = false; $('autoRotate').checked = false; controls.autoRotate = false; }
  model.animate(time, working, reducedMotion, elapsed); updateStatus();
});

canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', ' '].includes(event.key)) return;
  event.preventDefault();
  if (event.key === '0') { setView(); return; }
  if (event.key === ' ') { $('animate').checked = !$('animate').checked; updateStatus(); return; }
  const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta -= .15;
  if (event.key === 'ArrowRight') spherical.theta += .15;
  if (event.key === 'ArrowUp') spherical.phi -= .1;
  if (event.key === 'ArrowDown') spherical.phi += .1;
  if (['+', '='].includes(event.key)) spherical.radius *= .9;
  if (event.key === '-') spherical.radius *= 1.1;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setFromSpherical(spherical)); controls.update(); selectViewButtons(null);
});
function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix(); setView(activeView);
}
selectModel(...readSelection());
new ResizeObserver(resize).observe(canvas.parentElement); resize();
let previous = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
  if (document.hidden) return;
  const playing = $('animate').checked;
  if (playing) {
    elapsed += dt;
    if (working) time += dt * (reducedMotion ? .45 : 1);
  }
  model.animate(time, working, reducedMotion, elapsed);
  controls.autoRotate = playing && $('autoRotate').checked;
  controls.update(dt); renderer.render(scene, camera);
});
