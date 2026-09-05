import { THREE } from '../core/shared.js';

const DB_NAME = 'farmipelago-voxel-studio';
const DB_VERSION = 1;
const STORE = 'models';
const TEST_ID = 'builtin-test-tractor';

const hardcodedTractor = {
  format: 'farmipelago-voxel',
  version: 1,
  id: TEST_ID,
  name: 'Test Tractor',
  category: 'vehicle',
  grid: { voxelSize: 0.11, up: 'y', forward: '-z' },
  origin: [0, 0, 0],
  materials: {
    body: { color: '#2878c8', roughness: 0.68 },
    accent: { color: '#56b5f5', roughness: 0.55 },
    dark: { color: '#123b78', roughness: 0.8 },
    tire: { color: '#26302e', roughness: 0.96 },
    cream: { color: '#d7ecff', roughness: 0.74 },
    glass: { color: '#81c9f5', roughness: 0.22, opacity: 0.72 },
    lamp: { color: '#ffe49a', roughness: 0.45, emissive: '#ffbd46', emissiveIntensity: 1.15 }
  },
  parts: [
    { box: [-5, 3, -7, 10, 3, 13], material: 'body' },
    { box: [-4, 6, -8, 8, 3, 7], material: 'accent' },
    { box: [-4, 5, 0, 8, 2, 6], material: 'body' },
    { box: [-4, 8, 0, 8, 1, 6], material: 'cream' },
    { box: [-3, 9, 0, 6, 5, 5], material: 'glass' },
    { box: [-4, 14, 0, 8, 1, 6], material: 'cream' },
    { box: [-4, 7, -9, 8, 2, 1], material: 'dark' },
    { mirror: 'x', parts: [
      { box: [1, 7, -10, 2, 2, 1], material: 'lamp' },
      { box: [4, 1, -6, 3, 6, 5], material: 'tire' },
      { box: [4, 0, 1, 4, 8, 6], material: 'tire' },
      { box: [5, 3, -5, 1, 2, 3], material: 'cream' },
      { box: [5, 3, 2, 2, 2, 4], material: 'cream' }
    ] },
    { box: [-3, 9, -1, 6, 4, 1], material: 'glass' },
    { box: [-3, 9, 5, 6, 4, 1], material: 'glass' },
    { mirror: 'x', parts: [
      { box: [3, 9, 0, 1, 4, 5], material: 'glass' },
      { box: [4, 8, 1, 1, 6, 1], material: 'dark' }
    ] },
    { box: [-2, 6, -10, 4, 1, 1], material: 'cream' },
    { box: [-3, 9, -6, 1, 5, 1], material: 'dark' },
    { voxel: [-3, 14, -6], material: 'dark' },
    { voxel: [0, 15, 3], material: 'lamp' }
  ]
};

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

function createMaterial(def) {
  const opacity = def.opacity ?? 1;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color ?? '#ffffff'),
    roughness: def.roughness ?? 0.8,
    metalness: def.metalness ?? 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  if (def.emissive) {
    material.emissive = new THREE.Color(def.emissive);
    material.emissiveIntensity = def.emissiveIntensity ?? 1;
  }
  return material;
}

function normalizePart(part, mirrored = false) {
  const result = [];
  if (Array.isArray(part.parts)) {
    for (const child of part.parts) {
      result.push(...normalizePart(child, false));
      if (part.mirror === 'x') result.push(...normalizePart(child, true));
    }
    return result;
  }

  if (part.box) {
    const [x, y, z, w, h, d] = part.box;
    result.push({
      type: part.remove ? 'removeBox' : 'box',
      x: mirrored ? -x - w : x,
      y, z, w, h, d,
      material: part.material,
    });
  } else if (part.voxel) {
    const [x, y, z] = part.voxel;
    result.push({
      type: part.remove ? 'removeVoxel' : 'voxel',
      x: mirrored ? -x - 1 : x,
      y, z,
      material: part.material,
    });
  } else if (part.remove?.box) {
    const [x, y, z, w, h, d] = part.remove.box;
    result.push({ type: 'removeBox', x: mirrored ? -x - w : x, y, z, w, h, d });
  } else if (part.remove?.voxel) {
    const [x, y, z] = part.remove.voxel;
    result.push({ type: 'removeVoxel', x: mirrored ? -x - 1 : x, y, z });
  }
  return result;
}

function expandModel(model) {
  const voxels = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;

  for (const root of model.parts ?? []) {
    for (const part of normalizePart(root)) {
      if (part.type === 'box' || part.type === 'removeBox') {
        for (let x = part.x; x < part.x + part.w; x++) {
          for (let y = part.y; y < part.y + part.h; y++) {
            for (let z = part.z; z < part.z + part.d; z++) {
              if (part.type === 'removeBox') voxels.delete(key(x, y, z));
              else voxels.set(key(x, y, z), { x, y, z, material: part.material });
            }
          }
        }
      } else if (part.type === 'removeVoxel') {
        voxels.delete(key(part.x, part.y, part.z));
      } else {
        voxels.set(key(part.x, part.y, part.z), {
          x: part.x, y: part.y, z: part.z, material: part.material,
        });
      }
    }
  }

  return [...voxels.values()];
}

function buildVoxelGroup(model) {
  const group = new THREE.Group();
  const voxelSize = model.grid?.voxelSize ?? 0.1;
  const voxels = expandModel(model);
  const byMaterial = new Map();

  for (const voxel of voxels) {
    if (!byMaterial.has(voxel.material)) byMaterial.set(voxel.material, []);
    byMaterial.get(voxel.material).push(voxel);
  }

  const geometry = new THREE.BoxGeometry(voxelSize * 0.985, voxelSize * 0.985, voxelSize * 0.985);
  const dummy = new THREE.Object3D();

  for (const [materialName, entries] of byMaterial) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      createMaterial(model.materials?.[materialName] ?? {}),
      entries.length,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    entries.forEach((entry, index) => {
      dummy.position.set(
        (entry.x + 0.5) * voxelSize,
        (entry.y + 0.5) * voxelSize,
        (entry.z + 0.5) * voxelSize,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.userData.bounds = bounds.getSize(new THREE.Vector3());
  return group;
}

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

function validateModel(model) {
  if (!model || model.format !== 'farmipelago-voxel' || model.version !== 1) {
    throw new Error('Unsupported voxel model format');
  }
  if (!model.name || !Array.isArray(model.parts) || !model.materials) {
    throw new Error('Voxel model is missing required fields');
  }
  return {
    ...model,
    id: model.id || `model-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
    category: model.category || 'model',
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadStoredModels() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putModel(model) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(model);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function removeStoredModel(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
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
  models = [hardcodedTractor, ...(await loadStoredModels()).filter(model => model.id !== TEST_ID)];
  renderLibrary();
}

async function deleteModel(model) {
  if (model.id === TEST_ID) {
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
  models = [hardcodedTractor, ...stored.filter(model => model.id !== TEST_ID)];
  renderLibrary();
  frame();
}

init();
