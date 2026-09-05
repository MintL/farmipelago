import { THREE } from '../core/shared.js';
import { buildVoxelGroup, validateModel } from './model.js';
import { TEST_MODEL_ID, testTractor } from './sample-model.js';
import { loadStoredModels, putModel, removeStoredModel } from './storage.js';

const canvas = document.querySelector('#renderCanvas');
const studioEl = document.querySelector('#studio');
const gridEl = document.querySelector('#modelGrid');
const emptyState = document.querySelector('#emptyState');
const detailEl = document.querySelector('#detail');
const detailStage = document.querySelector('#detailStage');
const detailTitle = document.querySelector('#detailTitle');
const fileInput = document.querySelector('#fileInput');

// The WebGL canvas lives behind the HTML. Keep the preview surfaces mostly clear so
// the model is not washed out by several translucent overlays stacked above it.
detailEl.style.background = 'transparent';
detailStage.style.background = 'rgba(239, 230, 207, .10)';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x6f6b59, 1.75));
const sun = new THREE.DirectionalLight(0xfff4d8, 2.7);
sun.position.set(-8, 12, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const cards = new Map();
let models = [];
let detailModel = null;
let detailPreview = null;
let detailYaw = -0.72;
let detailPitch = 0.42;
let detailZoom = 1;
let pointerStart = null;
let pinchStart = null;

 function createPreview(model, element) {
  const root = new THREE.Group();
  root.add(buildVoxelGroup(model));
  root.rotation.set(0.32, -0.72, 0);
  scene.add(root);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  camera.position.set(3.6, 2.9, 4.4);
  camera.lookAt(0, 0, 0);
  cards.set(model.id, { model, element, root, camera });
}

function fitCamera(preview, width, height, zoom = 1) {
  const bounds = preview.root.children[0]?.userData.bounds ?? new THREE.Vector3(1, 1, 1);
  const aspect = width / Math.max(1, height);
  const size = Math.max(bounds.x, bounds.y, bounds.z) * 0.68 / zoom;
  preview.camera.left = -size * aspect;
  preview.camera.right = size * aspect;
  preview.camera.top = size;
  preview.camera.bottom = -size;
  preview.camera.updateProjectionMatrix();
}

function allPreviewRoots() {
  const roots = [...cards.values()].map(preview => preview.root);
  if (detailPreview) roots.push(detailPreview.root);
  return roots;
}

function clearCards() {
  for (const preview of cards.values()) scene.remove(preview.root);
  cards.clear();
  gridEl.innerHTML = '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function renderLibrary() {
  clearCards();
  emptyState.hidden = models.length > 0;

  for (const model of models) {
    const card = document.createElement('article');
    card.className = 'modelCard';
    card.style.background = 'rgba(239, 230, 207, .18)';
    card.innerHTML = `
      <div class="modelViewport" aria-label="Open ${escapeHtml(model.name)}"></div>
      <div class="modelFooter">
        <div class="modelText">
          <div class="modelName">${escapeHtml(model.name)}</div>
          <div class="modelCategory">${escapeHtml(model.category ?? 'model')}</div>
        </div>
        <button class="cardDelete" type="button" aria-label="Delete ${escapeHtml(model.name)}">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
        </button>`;

    gridEl.appendChild(card);
    const viewport = card.querySelector('.modelViewport');
    viewport.addEventListener('click', () => openDetail(model));
    card.querySelector('.cardDelete').addEventListener('click', event => {
      event.stopPropagation();
      deleteModel(model);
    });
    createPreview(model, viewport);
  }
}

async function enterFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    // Fullscreen is optional and browser-controlled.
  }
}

function makeFullscreenButton() {
  const button = document.createElement('button');
  button.className = 'iconButton';
  button.type = 'button';
  button.setAttribute('aria-label', 'Fullscreen');
  button.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5m13 5h5v-5"/></svg>';
  button.addEventListener('click', enterFullscreen);
  return button;
}

const libraryFullscreen = makeFullscreenButton();
document.querySelector('.topActions')?.prepend(libraryFullscreen);
const detailFullscreen = makeFullscreenButton();
document.querySelector('#detailHeader')?.insertBefore(detailFullscreen, document.querySelector('#exportButton'));

function openDetail(model) {
  // This runs directly from the model tap, so mobile browsers can honor the fullscreen request.
  enterFullscreen();
  detailModel = model;
  detailTitle.textContent = model.name;
  detailEl.hidden = false;
  studioEl.hidden = true;
  detailYaw = -0.72;
  detailPitch = 0.42;
  detailZoom = 1;
  rebuildDetailPreview();
}

function rebuildDetailPreview() {
  if (detailPreview) scene.remove(detailPreview.root);
  const root = new THREE.Group();
  root.add(buildVoxelGroup(detailModel));
  root.rotation.set(detailPitch, detailYaw, 0);
  scene.add(root);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  camera.position.set(3.6, 2.9, 4.4);
  camera.lookAt(0, 0, 0);
  detailPreview = { root, camera, element: detailStage };
}

function closeDetail() {
  if (detailPreview) {
    scene.remove(detailPreview.root);
    detailPreview = null;
  }
  detailEl.hidden = true;
  studioEl.hidden = false;
  detailModel = null;
}

 async function importFiles(files) {
  for (const file of files) {
    try {
      const model = validateModel(JSON.parse(await file.text()));
      await putModel(model);
    } catch (error) {
      alert(`${file.name}: ${error.message}`);
    }
  }
  models = [testTractor, ...(await loadStoredModels()).filter(model => model.id !== TEST_MODEL_ID)];
  renderLibrary();
}

async function deleteModel(model) {
  if (model.id === TEST_MODEL_ID) {
    alert('The hardcoded test tractor cannot be deleted yet. Imported models can be deleted.');
    return;
  }
  if (!confirm(`Delete “${model.name}”?`)) return;
  await removeStoredModel(model.id);
  models = models.filter(entry => entry.id !== model.id);
  if (detailModel?.id === model.id) closeDetail();
  renderLibrary();
}

function exportModel(model) {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model'}.fvox.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.querySelector('#importButton').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  await importFiles([...fileInput.files]);
  fileInput.value = '';
});
document.querySelector('#backButton').addEventListener('click', closeDetail);
document.querySelector('#deleteButton').addEventListener('click', () => detailModel && deleteModel(detailModel));
document.querySelector('#exportButton').addEventListener('click', () => detailModel && exportModel(detailModel));

function pointerDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

const activePointers = new Map();
detailStage.addEventListener('pointerdown', event => {
  detailStage.setPointerCapture(event.pointerId);
  activePointers.set(event.pointerId, event);
  if (activePointers.size === 1) {
    pointerStart = { x: event.clientX, y: event.clientY, yaw: detailYaw, pitch: detailPitch };
  }
  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    pinchStart = { distance: pointerDistance(a, b), zoom: detailZoom };
  }
});

detailStage.addEventListener('pointermove', event => {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, event);

  if (activePointers.size === 2 && pinchStart) {
    const [a, b] = [...activePointers.values()];
    detailZoom = THREE.MathUtils.clamp(
      pinchStart.zoom * (pointerDistance(a, b) / Math.max(1, pinchStart.distance)),
      0.65,
      2.3,
    );
  } else if (activePointers.size === 1 && pointerStart) {
    detailYaw = pointerStart.yaw + (event.clientX - pointerStart.x) * 0.009;
    detailPitch = THREE.MathUtils.clamp(
      pointerStart.pitch + (event.clientY - pointerStart.y) * 0.007,
      -0.45,
      1.05,
    );
    if (detailPreview) detailPreview.root.rotation.set(detailPitch, detailYaw, 0);
  }
});

function releasePointer(event) {
  activePointers.delete(event.pointerId);
  if (activePointers.size === 1) {
    const remaining = [...activePointers.values()][0];
    pointerStart = {
      x: remaining.clientX,
      y: remaining.clientY,
      yaw: detailYaw,
      pitch: detailPitch,
    };
  } else {
    pointerStart = null;
  }
  if (activePointers.size < 2) pinchStart = null;
}

detailStage.addEventListener('pointerup', releasePointer);
detailStage.addEventListener('pointercancel', releasePointer);
detailStage.addEventListener('wheel', event => {
  event.preventDefault();
  detailZoom = THREE.MathUtils.clamp(detailZoom * Math.exp(-event.deltaY * 0.001), 0.65, 2.3);
}, { passive: false });

function resizeRenderer() {
  const width = innerWidth;
  const height = innerHeight;
  const targetWidth = Math.floor(width * renderer.getPixelRatio());
  const targetHeight = Math.floor(height * renderer.getPixelRatio());
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) renderer.setSize(width, height, false);
}

function renderPreview(preview) {
  const rect = preview.element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1 || rect.bottom < 0 || rect.top > innerHeight) return;

  // Only the current model may exist for this scissored render. Previously every
  // model was drawn into every viewport, causing ghosted/incorrect silhouettes.
  const roots = allPreviewRoots();
  for (const root of roots) root.visible = false;
  preview.root.visible = true;

  fitCamera(preview, rect.width, rect.height, preview === detailPreview ? detailZoom : 1);
  renderer.setViewport(rect.left, innerHeight - rect.bottom, rect.width, rect.height);
  renderer.setScissor(rect.left, innerHeight - rect.bottom, rect.width, rect.height);
  renderer.setScissorTest(true);
  renderer.render(scene, preview.camera);

  preview.root.visible = false;
}

function frame() {
  resizeRenderer();
  renderer.setScissorTest(false);
  renderer.clear();

  if (detailPreview && !detailEl.hidden) {
    renderPreview(detailPreview);
  } else {
    for (const preview of cards.values()) renderPreview(preview);
  }

  requestAnimationFrame(frame);
}

async function init() {
  const mobileCapable = document.createElement('meta');
  mobileCapable.name = 'mobile-web-app-capable';
  mobileCapable.content = 'yes';
  document.head.appendChild(mobileCapable);

  const stored = await loadStoredModels().catch(() => []);
  models = [testTractor, ...stored.filter(model => model.id !== TEST_MODEL_ID)];
  renderLibrary();
  frame();
}

init();
