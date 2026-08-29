import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

// Phone-first floating farming/driving prototype.
// Terrain uses coarse cells; the tractor, props and animation use finer geometry.

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9def1);
scene.fog = new THREE.Fog(0xb9def1, 28, 48);

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);
const CAMERA_POS = new THREE.Vector3(13.5, 22, 25.5);
const CAMERA_LOOK = new THREE.Vector3(0, 0.8, -4.7);
camera.position.copy(CAMERA_POS);
camera.lookAt(CAMERA_LOOK);

const hemi = new THREE.HemisphereLight(0xf6fbff, 0x7d9a74, 2.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2cf, 4.1);
sun.position.set(-8, 18, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 55;
scene.add(sun);

const TILE = 1.18;
const GRASS_TOP = 0.14;
const SOIL_DEPTH = 0.70;
const LAYER_DEPTH = 0.70;
const tractorRideHeight = 0.43;

const mats = {
  grass: new THREE.MeshStandardMaterial({ color: 0x71b65a, roughness: 0.95 }),
  grassSide: new THREE.MeshStandardMaterial({ color: 0x679f4f, roughness: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x8f5b3c, roughness: 1 }),
  ploughed: new THREE.MeshStandardMaterial({ color: 0x6f412d, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x777c78, roughness: 1 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x646a66, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x80502f, roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x4d9b4f, roughness: 1 }),
  leavesLight: new THREE.MeshStandardMaterial({ color: 0x6eb957, roughness: 1 }),
  tractor: new THREE.MeshStandardMaterial({ color: 0xe3b434, roughness: 0.72 }),
  tractorDark: new THREE.MeshStandardMaterial({ color: 0xa06b22, roughness: 0.8 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x9ed8dd, roughness: 0.35, metalness: 0.08 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x292d2c, roughness: 0.92 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xd7c7a0, roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb64d35, roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb7b6aa, roughness: 0.65, metalness: 0.18 }),
};

let world = new THREE.Group();
scene.add(world);
let terrain = new Map();
let obstacles = [];
let spawn = { x: 0, z: 0, y: 0 };
let ploughedCount = 0;
let rng = Math.random;
let currentSeed = 0;

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(gx, gz) { return `${gx},${gz}`; }
function gridForWorld(v) { return Math.floor(v / TILE + 0.5); }

function box(w, h, d, material, cast = true, receive = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function addTile(gx, gz, topY, islandId, radial) {
  const x = gx * TILE;
  const z = gz * TILE;

  const dirt = box(TILE * 0.98, SOIL_DEPTH, TILE * 0.98, mats.soil, false, true);
  dirt.position.set(x, topY - GRASS_TOP - SOIL_DEPTH / 2, z);
  world.add(dirt);

  const top = box(TILE * 0.99, GRASS_TOP, TILE * 0.99, mats.grass, false, true);
  top.position.set(x, topY - GRASS_TOP / 2, z);
  world.add(top);

  terrain.set(key(gx, gz), {
    gx, gz, x, z, topY, islandId, topMesh: top, ploughed: false, radial
  });
}

function createOrganicCells(cx, cz, radius, noiseSeed) {
  const cells = [];
  const local = seededRandom(noiseSeed);
  for (let dx = -Math.ceil(radius) - 1; dx <= Math.ceil(radius) + 1; dx++) {
    for (let dz = -Math.ceil(radius) - 1; dz <= Math.ceil(radius) + 1; dz++) {
      const dist = Math.hypot(dx, dz);
      const edgeNoise = (local() - 0.5) * 0.75;
      if (dist <= radius + edgeNoise) cells.push({ gx: cx + dx, gz: cz + dz, dx, dz, dist });
    }
  }
  // Ensure a useful center even if noise was unkind.
  if (!cells.some(c => c.gx === cx && c.gz === cz)) cells.push({ gx: cx, gz: cz, dx: 0, dz: 0, dist: 0 });
  return cells;
}

function addTaperedLowerLayers(cells, topY, radius) {
  for (let layer = 1; layer <= 4; layer++) {
    const shrink = layer * 0.48;
    const maxR = radius - shrink;
    if (maxR < 0.35) break;
    const mat = layer < 3 ? mats.soil : (layer % 2 ? mats.stone : mats.stoneDark);
    const y = topY - GRASS_TOP - SOIL_DEPTH - (layer - 0.5) * LAYER_DEPTH;

    for (const c of cells) {
      // Extra deterministic edge breakup keeps the underside blocky, not conical.
      const wobble = Math.sin((c.gx * 17.1 + c.gz * 9.7 + layer * 3.2)) * 0.16;
      if (c.dist <= maxR + wobble) {
        const b = box(TILE * 0.95, LAYER_DEPTH * 0.97, TILE * 0.95, mat, false, true);
        b.position.set(c.gx * TILE, y, c.gz * TILE);
        world.add(b);
      }
    }
  }
}

function addVoxelStone(x, y, z, scale = 1) {
  const g = new THREE.Group();
  const voxel = 0.16 * scale;
  const pieces = [
    [-1,0,0],[0,0,0],[1,0,0],[0,0,1],[0,0,-1],
    [0,1,0],[1,1,0],[-1,1,0]
  ];
  for (const [px, py, pz] of pieces) {
    const b = box(voxel * 1.05, voxel * 0.9, voxel * 1.05, py ? mats.stone : mats.stoneDark);
    b.position.set(px * voxel * .75, py * voxel * .72, pz * voxel * .75);
    g.add(b);
  }
  g.position.set(x, y + voxel * .45, z);
  world.add(g);
  obstacles.push({ x, z, r: 0.28 * scale, type: 'stone' });
}

function addTree(x, y, z, large = false) {
  const g = new THREE.Group();
  const v = large ? 0.22 : 0.17;
  const trunkH = large ? 1.75 : 1.08;
  const trunk = box(v * 1.25, trunkH, v * 1.25, mats.trunk);
  trunk.position.y = trunkH / 2;
  g.add(trunk);

  const leafCoords = large
    ? [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[1,0,1],[-1,0,-1],[-1,0,1],[1,0,-1],[0,1,0],[1,1,0],[-1,1,0],[0,1,1],[0,1,-1],[0,2,0]]
    : [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]];
  const leafSize = large ? v * 2.15 : v * 2.1;
  const leafBaseY = trunkH - (large ? 0.15 : 0.08);
  for (let i = 0; i < leafCoords.length; i++) {
    const [lx, ly, lz] = leafCoords[i];
    const b = box(leafSize, leafSize, leafSize, i % 3 === 0 ? mats.leavesLight : mats.leaves);
    b.position.set(lx * leafSize * .75, leafBaseY + ly * leafSize * .72, lz * leafSize * .75);
    g.add(b);
  }
  g.position.set(x, y, z);
  g.rotation.y = rng() * Math.PI * 2;
  world.add(g);
  obstacles.push({ x, z, r: large ? 0.47 : 0.32, type: 'tree' });
}

function groundAt(x, z) {
  const gx = gridForWorld(x);
  const gz = gridForWorld(z);
  return terrain.get(key(gx, gz)) || null;
}

function generateFarm(seed = (Math.random() * 0xffffffff) >>> 0) {
  currentSeed = seed >>> 0;
  rng = seededRandom(currentSeed);
  scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  terrain = new Map();
  obstacles = [];
  ploughedCount = 0;

  // A generated vertical-ish chain suits portrait, with branches and jumpable gaps.
  const backbone = [
    { cx: 0,  cz: 8,   h: 0.0, r: 2.35 },
    { cx: -3, cz: 3,   h: 0.8, r: 2.20 },
    { cx: 2,  cz: -1,  h: 1.6, r: 2.30 },
    { cx: -2, cz: -6,  h: 0.8, r: 2.15 },
    { cx: 2,  cz: -11, h: 1.6, r: 2.30 },
    { cx: -1, cz: -16, h: 2.4, r: 2.20 },
  ];
  const branch = {
    cx: (rng() > .5 ? 1 : -1) * 5,
    cz: -7 + Math.round((rng() - .5) * 2),
    h: rng() > .5 ? 0.0 : 1.6,
    r: 1.85 + rng() * .25
  };
  const islands = [...backbone, branch];

  islands.forEach((island, id) => {
    // Small seeded variation without destroying jump reachability.
    if (id > 0 && id < backbone.length) island.cx += Math.round((rng() - .5) * 1.1);
    island.r += (rng() - .5) * 0.22;

    const cells = createOrganicCells(island.cx, island.cz, island.r, currentSeed + id * 911);
    for (const c of cells) addTile(c.gx, c.gz, island.h, id, c.dist / island.r);
    addTaperedLowerLayers(cells, island.h, island.r);

    // Props: keep island centers reasonably drivable; vary density.
    const candidates = cells.filter(c => c.dist > 0.65 && c.dist < island.r - 0.15);
    for (const c of candidates) {
      if (id === 0 && Math.hypot(c.dx, c.dz) < 1.35) continue;
      const roll = rng();
      const tx = c.gx * TILE + (rng() - .5) * .18;
      const tz = c.gz * TILE + (rng() - .5) * .18;
      if (roll < 0.055) addTree(tx, island.h, tz, true);
      else if (roll < 0.13) addTree(tx, island.h, tz, false);
      else if (roll < 0.23) addVoxelStone(tx, island.h, tz, 0.8 + rng() * .5);
    }
  });

  const startTile = terrain.get(key(backbone[0].cx, backbone[0].cz)) || [...terrain.values()][0];
  spawn = { x: startTile.x, z: startTile.z, y: startTile.topY + tractorRideHeight };
  updateStatus();
}

// Tractor ---------------------------------------------------------------------
const tractor = new THREE.Group();
scene.add(tractor);
const tractorVisual = new THREE.Group();
tractor.add(tractorVisual);

const body = box(0.80, 0.36, 1.15, mats.tractor);
body.position.y = 0.42;
tractorVisual.add(body);
const hood = box(0.72, 0.32, 0.62, mats.tractorDark);
hood.position.set(0, 0.62, -0.47);
tractorVisual.add(hood);
const cab = box(0.68, 0.70, 0.55, mats.cab);
cab.position.set(0, 0.83, 0.25);
tractorVisual.add(cab);
const roof = box(0.78, 0.11, 0.65, mats.tractor);
roof.position.set(0, 1.22, 0.25);
tractorVisual.add(roof);
const exhaust = box(0.10, 0.48, 0.10, mats.stoneDark);
exhaust.position.set(-0.23, 0.93, -0.62);
tractorVisual.add(exhaust);

const wheelHolders = [];
function createWheel(x, y, z, radius, width, front) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 8), mats.tire);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  holder.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .42, radius * .42, width + .012, 8), mats.hub);
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  holder.add(hub);
  tractorVisual.add(holder);
  wheelHolders.push({ holder, tire, hub, front, spin: 0 });
}
createWheel(-0.48, 0.29, -0.39, 0.28, 0.20, true);
createWheel( 0.48, 0.29, -0.39, 0.28, 0.20, true);
createWheel(-0.50, 0.31,  0.42, 0.34, 0.22, false);
createWheel( 0.50, 0.31,  0.42, 0.34, 0.22, false);

// Visible plough behind the tractor.
const plough = new THREE.Group();
plough.position.set(0, 0.19, 1.15);
tractorVisual.add(plough);
const ploughBar = box(1.18, 0.12, 0.12, mats.red);
plough.add(ploughBar);
for (const x of [-0.42, 0, 0.42]) {
  const arm = box(0.10, 0.36, 0.32, mats.red);
  arm.position.set(x, -0.09, 0.15);
  arm.rotation.x = -0.35;
  plough.add(arm);
  const blade = box(0.30, 0.12, 0.34, mats.metal);
  blade.position.set(x, -0.21, 0.31);
  blade.rotation.y = -0.18;
  plough.add(blade);
}

let tractorState = {
  x: 0, z: 0, y: 0,
  heading: 0,
  speed: 0,
  vy: 0,
  grounded: true,
  landingSquash: 0,
  respawning: false,
};

function resetTractor(showMessage = false) {
  tractorState.x = spawn.x;
  tractorState.z = spawn.z;
  tractorState.y = spawn.y;
  tractorState.heading = 0;
  tractorState.speed = 0;
  tractorState.vy = 0;
  tractorState.grounded = true;
  tractorState.landingSquash = 0.4;
  tractorState.respawning = false;
  if (showMessage) toast('TRACTOR RESCUE!');
}

function obstacleHit(x, z) {
  for (const o of obstacles) {
    if (Math.hypot(x - o.x, z - o.z) < o.r + 0.38) return o;
  }
  return null;
}

function supportInfo(x, z, heading) {
  const points = [
    [-0.36, -0.40], [0.36, -0.40], [-0.40, 0.40], [0.40, 0.40]
  ];
  const s = Math.sin(heading), c = Math.cos(heading);
  const grounds = [];
  for (const [lx, lz] of points) {
    const wx = x + lx * c + lz * s;
    const wz = z - lx * s + lz * c;
    const t = groundAt(wx, wz);
    if (t) grounds.push(t);
  }
  if (!grounds.length) return { count: 0, topY: -Infinity };
  // Most-supported height wins. This prevents snapping between stacked islands.
  const counts = new Map();
  for (const g of grounds) counts.set(g.topY, (counts.get(g.topY) || 0) + 1);
  let bestY = grounds[0].topY, bestCount = 0;
  for (const [y, count] of counts) if (count > bestCount) { bestY = y; bestCount = count; }
  return { count: bestCount, topY: bestY };
}

// Controls --------------------------------------------------------------------
const input = { x: 0, y: 0, jumpQueued: false };
const keys = new Set();
window.addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space') input.jumpQueued = true; });
window.addEventListener('keyup', e => keys.delete(e.code));

const stickZone = document.querySelector('#stickZone');
const stickBase = document.querySelector('#stickBase');
const stickKnob = document.querySelector('#stickKnob');
let stickPointer = null;
const STICK_RADIUS = 46;

function updateStickFromPointer(e) {
  const r = stickBase.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const len = Math.hypot(dx, dy) || 1;
  if (len > STICK_RADIUS) { dx = dx / len * STICK_RADIUS; dy = dy / len * STICK_RADIUS; }
  input.x = dx / STICK_RADIUS;
  input.y = dy / STICK_RADIUS;
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function clearStick() {
  stickPointer = null;
  input.x = input.y = 0;
  stickKnob.style.transform = 'translate(0px,0px)';
}
stickZone.addEventListener('pointerdown', e => {
  if (stickPointer !== null) return;
  stickPointer = e.pointerId;
  stickZone.setPointerCapture(e.pointerId);
  updateStickFromPointer(e);
});
stickZone.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) updateStickFromPointer(e); });
stickZone.addEventListener('pointerup', e => { if (e.pointerId === stickPointer) clearStick(); });
stickZone.addEventListener('pointercancel', e => { if (e.pointerId === stickPointer) clearStick(); });

document.querySelector('#jump').addEventListener('pointerdown', e => {
  e.preventDefault();
  input.jumpQueued = true;
});
document.querySelector('#regen').addEventListener('click', () => {
  generateFarm();
  resetTractor();
  toast('NEW FARM');
});

function keyboardInput() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  return { x, y };
}

// Farming ---------------------------------------------------------------------
function ploughAt(x, z) {
  const t = groundAt(x, z);
  if (!t || t.ploughed) return;
  t.ploughed = true;
  t.topMesh.material = mats.ploughed;
  ploughedCount++;
  updateStatus();
}

function applyPlough() {
  if (!tractorState.grounded || Math.abs(tractorState.speed) < 0.40) return;
  const h = tractorState.heading;
  const s = Math.sin(h), c = Math.cos(h);
  // Behind is +local Z because the tractor's nose points toward -local Z.
  for (const lx of [-0.40, 0, 0.40]) {
    const lz = 1.22;
    const x = tractorState.x + lx * c + lz * s;
    const z = tractorState.z - lx * s + lz * c;
    ploughAt(x, z);
  }
}

function updateStatus() {
  document.querySelector('#status').textContent = `${ploughedCount} tile${ploughedCount === 1 ? '' : 's'} ploughed`;
}

let toastTimer = null;
function toast(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 900);
}

// Physics and animation --------------------------------------------------------
let last = performance.now();
let totalTime = 0;

function update(dt) {
  totalTime += dt;
  const kb = keyboardInput();
  const steerInput = Math.abs(kb.x) > 0 ? kb.x : input.x;
  const throttleInput = Math.abs(kb.y) > 0 ? -kb.y : -input.y;

  if (tractorState.respawning) return;

  const MAX_FORWARD = 4.0;
  const MAX_REVERSE = -2.0;
  const ACCEL = 6.2;
  const BRAKE = 7.0;
  const DRAG = tractorState.grounded ? 3.1 : 0.22;

  if (Math.abs(throttleInput) > 0.08) {
    const target = throttleInput >= 0 ? throttleInput * MAX_FORWARD : throttleInput * 2.0;
    const rate = (Math.sign(target) !== Math.sign(tractorState.speed) && Math.abs(tractorState.speed) > .15) ? BRAKE : ACCEL;
    tractorState.speed += THREE.MathUtils.clamp(target - tractorState.speed, -rate * dt, rate * dt);
  } else {
    const drag = Math.min(Math.abs(tractorState.speed), DRAG * dt);
    tractorState.speed -= Math.sign(tractorState.speed) * drag;
  }
  tractorState.speed = THREE.MathUtils.clamp(tractorState.speed, MAX_REVERSE, MAX_FORWARD);

  // Steering gets weaker at a standstill and reverses naturally while backing up.
  const speedFactor = THREE.MathUtils.clamp(Math.abs(tractorState.speed) / 1.3, 0.18, 1);
  const steerDir = tractorState.speed < -0.05 ? -1 : 1;
  tractorState.heading -= steerInput * steerDir * (1.65 * speedFactor) * dt;

  if (input.jumpQueued) {
    if (tractorState.grounded) {
      tractorState.vy = 6.8;
      tractorState.grounded = false;
      tractorState.y += 0.035;
      tractorState.landingSquash = -0.16;
    }
    input.jumpQueued = false;
  }

  // Horizontal movement remains controllable in air because this is a playful game,
  // but inertia still dominates.
  const forwardX = Math.sin(tractorState.heading);
  const forwardZ = -Math.cos(tractorState.heading);
  let nx = tractorState.x + forwardX * tractorState.speed * dt;
  let nz = tractorState.z + forwardZ * tractorState.speed * dt;

  if (tractorState.grounded) {
    const hit = obstacleHit(nx, nz);
    if (hit) {
      tractorState.speed *= -0.18;
      nx = tractorState.x;
      nz = tractorState.z;
      tractorState.landingSquash = 0.22;
    }
  }

  tractorState.x = nx;
  tractorState.z = nz;

  const support = supportInfo(tractorState.x, tractorState.z, tractorState.heading);
  if (tractorState.grounded) {
    if (support.count >= 2 && Math.abs((support.topY + tractorRideHeight) - tractorState.y) < 0.35) {
      tractorState.y = support.topY + tractorRideHeight;
    } else {
      tractorState.grounded = false;
      tractorState.vy = Math.min(tractorState.vy, 0);
    }
  } else {
    tractorState.vy -= 11.5 * dt;
    tractorState.y += tractorState.vy * dt;
    if (tractorState.vy <= 0 && support.count >= 2) {
      const landingY = support.topY + tractorRideHeight;
      if (tractorState.y <= landingY + 0.17 && tractorState.y >= landingY - 0.65) {
        tractorState.y = landingY;
        tractorState.vy = 0;
        tractorState.grounded = true;
        tractorState.landingSquash = THREE.MathUtils.clamp(Math.abs(tractorState.speed) * .08 + .20, .20, .48);
      }
    }
  }

  if (tractorState.y < -7) {
    tractorState.respawning = true;
    tractorState.speed = 0;
    setTimeout(() => resetTractor(true), 360);
  }

  applyPlough();

  tractor.position.set(tractorState.x, tractorState.y, tractorState.z);
  tractor.rotation.y = tractorState.heading;

  // Toy-like tractor animation: wheel spin, steering, body bounce/lean and jump squash.
  const wheelSpin = tractorState.speed * dt / .28;
  for (const w of wheelHolders) {
    w.spin += wheelSpin;
    w.tire.rotation.x = w.spin;
    w.hub.rotation.x = w.spin;
    if (w.front) w.holder.rotation.y = steerInput * 0.38;
  }

  tractorState.landingSquash *= Math.pow(0.035, dt);
  const speedNorm = Math.min(1, Math.abs(tractorState.speed) / MAX_FORWARD);
  const engineBob = tractorState.grounded ? Math.sin(totalTime * (9 + speedNorm * 6)) * 0.018 * speedNorm : 0;
  const squash = tractorState.landingSquash;
  tractorVisual.position.y = engineBob - Math.max(0, squash) * .06;
  tractorVisual.rotation.z = -steerInput * speedNorm * 0.07;
  tractorVisual.rotation.x = tractorState.grounded ? -throttleInput * .018 : THREE.MathUtils.clamp(-tractorState.vy * .028, -.16, .16);
  tractorVisual.scale.set(1 + squash * .05, 1 - squash * .10, 1 + squash * .05);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
}
window.addEventListener('resize', resize);

// Start.
generateFarm();
resetTractor();
requestAnimationFrame(animate);
