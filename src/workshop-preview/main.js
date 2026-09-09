import { THREE, TILE, mats, box, createVoxelModel } from '../core/shared.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTractorAsset } from '../gameplay/vehicles/assets.js';
import { createWorkshopAlternative } from './models.js';

// Deliberately isolated entry: no game session, generator, physics or save imports.
const views = [...document.querySelectorAll('canvas')].map((canvas, index) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xd9ecff, 0x77684c, 2.4));
  const sun = new THREE.DirectionalLight(0xffebcc, 3.3);
  sun.position.set(-6, 12, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .1, far: 40 });
  sun.shadow.normalBias = .035;
  scene.add(sun);
  // Terrain uses the game's tile dimensions and layered flat materials.
  for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
    if (Math.abs(gx) === 3 && Math.abs(gz) === 3) continue;
    const grass = box(TILE, .18, TILE, (gx * gx + gz) % 4 === 0 ? mats.grassHigh : mats.grass);
    grass.position.set(gx * TILE, -.09, gz * TILE); scene.add(grass);
    const soil = box(TILE, .65, TILE, mats.soil);
    soil.position.set(gx * TILE, -.505, gz * TILE); scene.add(soil);
    const depth = 1 + Math.max(0, 2 - Math.max(Math.abs(gx), Math.abs(gz))) * .45;
    const rock = box(TILE, depth, TILE, mats.stoneDark);
    rock.position.set(gx * TILE, -.83 - depth / 2, gz * TILE); scene.add(rock);
  }
  const path = box(2, .025, 2, mats.bridge);
  path.position.set(0, .015, -2.4); scene.add(path);
  scene.add(createWorkshopAlternative(index));
  // Shared hero vehicle provides an honest, identical scale reference.
  const tractor = createTractorAsset().group;
  tractor.scale.setScalar(.92);
  tractor.position.set(1.7, .08, -2.35);
  tractor.rotation.y = -.22;
  scene.add(tractor);
  const greens = [];
  for (const [x, z] of [[-14, 11], [12, 13], [-13, -11]]) {
    greens.push({ material: mats.trunk, at: [x, 0, z], size: [1, 4, 1] });
    greens.push({ material: mats.leaves, at: [x - 2, 3, z - 1], size: [5, 3, 3] });
    greens.push({ material: mats.leavesLight, at: [x - 1, 6, z], size: [3, 2, 2] });
  }
  scene.add(createVoxelModel(greens, { name: 'preview-shrubs' }));
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(-9, 8, -13);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, .9, 0);
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * .48;
  controls.update(); controls.saveState();
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix(); render();
  });
  resize.observe(canvas);
  return { controls, render };
});
document.querySelector('#reset').addEventListener('click', () => views.forEach(view => { view.controls.reset(); view.render(); }));
