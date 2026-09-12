import { THREE, TILE, mats, box } from '../core/shared.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTractorAsset } from '../gameplay/vehicles/assets.js';
import { BUILDING_STUDIES, BUILDING_STYLES, volumeCorners } from './models.js';
import { SETTLEMENT_STAGES, settlementTier } from './settlement.js';

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
let selectedTier = 1, upgrade = null;
let framingPoints = [], framingTarget = [0, 2, 0];
const target = new THREE.Vector3(), models = new Map();
const groundFraming = volumeCorners([[[-3.6, -.4, -2.6], [3.6, 0, 3]]]);
const apronFraming = volumeCorners([[[-3.6, -.4, 2.5], [3.6, 0, 4.6]], [[-2.9, 0, 2.7], [-.5, 1.9, 4.3]]]);

function updateScaleReference() {
  tractor.visible = $('tractor').checked;
  tractor.position.set(...definition.tractor.map(value => value * TILE));
  tractor.rotation.y = definition.tractorYaw;
  ground.visible = !definition.ownGround;
  frontApron.visible = !definition.ownGround && tractor.visible && !!definition.frontApron;
  $('scaleCaption').textContent = tractor.visible ? 'The farm tractor, at its actual game scale.' : content.caption;
}

function readSelection() {
  const [id, style, tier] = location.hash.slice(1).split('/');
  if (id === 'settlement') return [id, 'hybrid', settlementTier(tier)];
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

function selectionHash() {
  return `#${definition.id}/${selectedStyle}${definition.kind === 'settlement' ? `/${selectedTier}` : ''}`;
}

function syncSettlementControls() {
  if (definition.kind !== 'settlement') return;
  const stage = SETTLEMENT_STAGES[selectedTier - 1];
  $('modelName').textContent = stage.name;
  $('modelCategory').textContent = 'Settlement / Five stages of village life';
  $('styleTag').textContent = `Tier ${selectedTier}`;
  $('styleNote').textContent = stage.changes;
  $('modelIntro').textContent = stage.description;
  content.caption = stage.description;
  canvas.setAttribute('aria-label', `Settlement, Tier ${selectedTier}: ${stage.name}. Drag to orbit, pinch or scroll to zoom. Arrow keys orbit, plus and minus zoom, 0 resets, Space pauses.`);
  document.title = `Settlement · Tier ${selectedTier} · Farmipelago`;
  document.querySelectorAll('[data-tier]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.tier) === selectedTier));
    button.title = SETTLEMENT_STAGES[Number(button.dataset.tier) - 1].name;
  });
  $('nextUpgrade').disabled = Boolean(upgrade) || selectedTier === 5;
  $('replayUpgrade').disabled = Boolean(upgrade) || selectedTier === 1;
  $('nextUpgrade').textContent = selectedTier === 5 ? 'Final tier' : `Upgrade to Tier ${selectedTier + 1} →`;
  $('upgradeProgress').hidden = !upgrade;
  $('upgradeStatus').textContent = upgrade ? `Tier ${selectedTier - 1} → ${selectedTier} · Piece-by-piece construction`
    : selectedTier === 5 ? 'The finished village. Replay its final transformation.' : 'Choose a tier, or watch the next upgrade.';
  updateScaleReference();
}

function setCameraPose(pose) {
  camera.position.copy(pose.position); controls.target.copy(pose.target);
  camera.lookAt(controls.target); controls.update();
}

function restoreUpgradeCamera() {
  if (!upgrade) return;
  setCameraPose(upgrade.returnPose);
  activeView = upgrade.returnView; selectViewButtons(activeView);
  controls.enabled = true; controls.enableDamping = !reducedMotion;
  document.querySelectorAll('[data-view], #resetView').forEach(button => { button.disabled = false; });
}

function cancelUpgrade() {
  if (!upgrade) return;
  model.finishUpgrade(); restoreUpgradeCamera(); upgrade = null;
}

function selectModel(id, style, tier = 1) {
  const next = BUILDING_STUDIES.find(study => study.id === id) || BUILDING_STUDIES[0];
  const nextStyle = next.variants[style] ? style : next.defaultStyle;
  const sameBuilding = next === definition;
  if (sameBuilding && nextStyle === selectedStyle) {
    if (next.kind === 'settlement') {
      cancelUpgrade(); selectedTier = settlementTier(tier); model.setTier(selectedTier);
      syncSettlementControls(); updateStatus();
      if (location.hash !== selectionHash()) history.replaceState(null, '', selectionHash());
    }
    return;
  }
  cancelUpgrade();
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
  const settlement = next.kind === 'settlement';
  selectedTier = settlementTier(tier);
  if (settlement) model.setTier(selectedTier);
  $('styleBar').hidden = settlement;
  $('tierBar').hidden = !settlement;
  $('settlementControls').hidden = !settlement;
  $('operationControls').hidden = settlement;
  $('operationHeading').textContent = settlement ? 'Village life' : 'See it working';
  camera.far = settlement ? 200 : 100; camera.updateProjectionMatrix();
  floor.position.y = settlement ? model.bounds.min.y - .05 : -.45;
  const shadowExtent = settlement ? 18 * TILE : 8;
  Object.assign(sun.shadow.camera, { left: -shadowExtent, right: shadowExtent,
    top: settlement ? shadowExtent : 9, bottom: settlement ? -shadowExtent : -7, far: settlement ? 70 : 40 });
  sun.shadow.camera.updateProjectionMatrix();
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
  syncSettlementControls();
  updateScaleReference(); updateStatus();
  if (!sameBuilding) setView();
  const hash = selectionHash();
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
document.querySelectorAll('[data-tier]').forEach(button => button.addEventListener('click', () => {
  selectModel('settlement', 'hybrid', Number(button.dataset.tier));
}));
window.addEventListener('hashchange', () => selectModel(...readSelection()));

function selectViewButtons(view) {
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}

function framedPose(points, focus, view = 'perspective') {
  const direction = new THREE.Vector3(...{ perspective: [3.8, 3.4, 10], front: [0, 1.6, 10], back: [-4, 3.4, -10] }[view]).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const cameraUp = new THREE.Vector3().crossVectors(direction, right);
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let distance = 0;
  for (const point of points) {
    const offset = point.clone().sub(focus);
    distance = Math.max(distance, offset.dot(direction) + 1.05 * Math.max(
      Math.abs(offset.dot(cameraUp)) / halfFov,
      Math.abs(offset.dot(right)) / (halfFov * camera.aspect),
    ));
  }
  return { position: focus.clone().addScaledVector(direction, distance), target: focus.clone(), distance };
}

function setView(view = 'perspective') {
  if (!model) return;
  activeView = view;
  target.set(...framingTarget).multiplyScalar(TILE);
  const framing = [...framingPoints, ...(definition.ownGround ? [] : groundFraming), ...(frontApron.visible ? apronFraming : [])];
  const pose = framedPose(framing, target, view);
  controls.minDistance = pose.distance * .4; controls.maxDistance = pose.distance * 1.9;
  setCameraPose(pose); selectViewButtons(view);
}

function beginUpgrade(tier) {
  if (definition.kind !== 'settlement' || upgrade || tier < 2 || tier > 5) return;
  // Flush orbit damping before taking the exact view to restore afterward.
  controls.enableDamping = false; controls.autoRotate = false; controls.update();
  const returnPose = { position: camera.position.clone(), target: controls.target.clone() };
  const focus = model.beginUpgrade(tier);
  if (!focus) return;
  const focusTarget = focus.getCenter(new THREE.Vector3());
  const pose = framedPose(boundsCorners(focus), focusTarget);
  upgrade = { elapsed: 0, target: tier, focus, pose, returnPose, returnView: activeView,
    duration: reducedMotion ? 4 : 10, inset: reducedMotion ? 0 : 1 };
  selectedTier = tier;
  $('animate').checked = true;
  controls.enabled = false;
  document.querySelectorAll('[data-view], #resetView').forEach(button => { button.disabled = true; });
  selectViewButtons(null);
  syncSettlementControls(); updateStatus();
  history.replaceState(null, '', selectionHash());
  updateUpgrade(0);
}

function updateUpgrade(dt) {
  if (!upgrade) return;
  upgrade.elapsed = Math.min(upgrade.duration, upgrade.elapsed + dt);
  const { elapsed: clock, duration, inset, pose, returnPose } = upgrade;
  const progress = THREE.MathUtils.clamp((clock - inset) / (duration - 2 * inset), 0, 1);
  model.setConstructionProgress(progress, reducedMotion);
  $('upgradeProgress').setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  $('upgradeProgress').firstElementChild.style.transform = `scaleX(${progress})`;
  if (!reducedMotion) {
    const returning = clock >= duration - inset;
    const blend = THREE.MathUtils.smoothstep(returning ? (clock - duration + inset) / inset : clock / inset, 0, 1);
    camera.position.lerpVectors(returning ? pose.position : returnPose.position, returning ? returnPose.position : pose.position, blend);
    controls.target.lerpVectors(returning ? pose.target : returnPose.target, returning ? returnPose.target : pose.target, blend);
    camera.lookAt(controls.target);
  } else setCameraPose(pose);
  if (clock >= duration) {
    model.finishUpgrade(); restoreUpgradeCamera(); upgrade = null;
    syncSettlementControls(); updateStatus();
  }
}

$('nextUpgrade').addEventListener('click', () => beginUpgrade(selectedTier + 1));
$('replayUpgrade').addEventListener('click', () => beginUpgrade(selectedTier));

function updateStatus() {
  $('motionStatus').textContent = !$('animate').checked ? 'Paused' : upgrade ? 'Building'
    : definition.kind === 'settlement' ? 'Village life' : working ? content.status : 'Idle';
  controls.enabled = !upgrade || !$('animate').checked;
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
$('autoRotate').addEventListener('change', event => { controls.autoRotate = !upgrade && $('animate').checked && event.target.checked; });
$('tractor').addEventListener('change', () => { updateScaleReference(); if (!upgrade) setView(activeView || 'perspective'); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('resetView').addEventListener('click', () => setView());
controls.addEventListener('start', () => { if (!upgrade) activeView = null; selectViewButtons(null); });
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
  cancelUpgrade();
  reducedMotion = event.matches; controls.enableDamping = !reducedMotion;
  if (reducedMotion) { $('animate').checked = false; $('autoRotate').checked = false; controls.autoRotate = false; }
  model.animate(time, working, reducedMotion, elapsed); syncSettlementControls(); updateStatus();
});

canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', ' '].includes(event.key)) return;
  event.preventDefault();
  if (event.key === ' ') { $('animate').checked = !$('animate').checked; updateStatus(); return; }
  if (upgrade) return;
  if (event.key === '0') { setView(); return; }
  const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta -= .15;
  if (event.key === 'ArrowRight') spherical.theta += .15;
  if (event.key === 'ArrowUp') spherical.phi -= .1;
  if (event.key === 'ArrowDown') spherical.phi += .1;
  if (['+', '='].includes(event.key)) spherical.radius *= .9;
  if (event.key === '-') spherical.radius *= 1.1;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setFromSpherical(spherical)); controls.update(); activeView = null; selectViewButtons(null);
});
function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  if (upgrade) {
    const current = upgrade;
    setView(current.returnView || 'perspective');
    current.returnPose = { position: camera.position.clone(), target: controls.target.clone() };
    current.pose = framedPose(boundsCorners(current.focus), current.focus.getCenter(new THREE.Vector3()));
    updateUpgrade(0);
  } else setView(activeView || 'perspective');
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
    if (working && !upgrade) time += dt * (reducedMotion ? .45 : 1);
  }
  model.animate(time, working && !upgrade, reducedMotion, elapsed);
  if (playing) updateUpgrade(dt);
  controls.autoRotate = playing && !upgrade && $('autoRotate').checked;
  controls.update(dt); renderer.render(scene, camera);
});
