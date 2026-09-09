import { THREE, TILE, gridKey } from '../core/shared.js';
import { generateFarm } from '../world/generator.js';
import { createPhysics } from '../physics/index.js';
import { createTravelModel } from '../world/travel.js';
import { translateBox } from '../world/islands/motion-safety.js';

// This entry deliberately does not import the game session or persistence.
const canvas = document.querySelector('#map');
const status = document.querySelector('#status'), details = document.querySelector('#details');
const pause = document.querySelector('#pause'), action = document.querySelector('#action');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111f28');
const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, .1, 2000);
camera.up.set(0, 0, -1);
let center = { x: 0, z: 0 }, span = 220;
const sourceScene = new THREE.Scene();
// A stable gameplay-sized view controls off-screen spawning. Inspecting/zooming
// the map must not change routes, spawn distances or encounter timing.
const spawnCamera = new THREE.PerspectiveCamera(28, 16 / 9, .1, 400);
const observer = { x: 0, y: 0, z: 0 };
const colors = { attached: 0x78a98a, encounter: 0x71dccb, decorative: 0x78899c, connecting: 0xebba70, releasing: 0xebba70 };
const square = new THREE.PlaneGeometry(TILE * .96, TILE * .96).rotateX(-Math.PI / 2);
const transform = new THREE.Object3D();
const footprints = new Map();
const routeLayer = new THREE.Group(); scene.add(routeLayer);
const cameraLayer = new THREE.Group(); scene.add(cameraLayer);
let cameraFootprint = [];
const observerMesh = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.8, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
observerMesh.renderOrder = 10; scene.add(observerMesh);
let physics = null, farm = null, travel = null, simTime = 0, paused = false, resetting = false;
let selectedId = null, last = performance.now(), accumulator = 0, displayAt = -Infinity;
let reportWall = last, reportSteps = 0, effectiveSpeed = 0, lastSnapshot = null;
let fixedTileCount = -1;
let ready = false;
function fail(error) {
  ready = false; paused = true; accumulator = 0;
  pause.textContent = 'Resume';
  const message = `Unable to run the debugger: ${error?.message || String(error)}`;
  status.textContent = message;
  document.dispatchEvent(new CustomEvent('island-debug:error', { detail: message }));
  console.error(error);
}

function updateCamera() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const aspect = width / Math.max(1, height);
  camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
  camera.top = span / 2; camera.bottom = -span / 2;
  camera.position.set(center.x, 800, center.z); camera.lookAt(center.x, 0, center.z);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  renderer.setSize(width, height, false);
}
new ResizeObserver(updateCamera).observe(canvas);
function updateSpawnCamera() {
  spawnCamera.position.set(observer.x + 12, 20, observer.z + 28);
  spawnCamera.lookAt(observer.x, 0, observer.z);
  spawnCamera.updateMatrixWorld();
  drawCameraBoundary();
}
function drawCameraBoundary() {
  // Intersect the actual spawning frustum with y=0, including near/far clipping.
  // The debug map's camera and zoom never participate in this calculation.
  const corners = [];
  for (const z of [-1, 1]) for (const y of [-1, 1]) for (const x of [-1, 1]) {
    corners.push(new THREE.Vector3(x, y, z).unproject(spawnCamera));
  }
  const points = [];
  for (let i = 0; i < corners.length; i++) for (const bit of [1, 2, 4]) {
    const j = i ^ bit;
    if (j <= i) continue;
    const a = corners[i], b = corners[j];
    if ((a.y > 0 && b.y > 0) || (a.y < 0 && b.y < 0)) continue;
    if (Math.abs(b.y - a.y) < .000001) continue;
    const point = a.clone().lerp(b, -a.y / (b.y - a.y));
    if (!points.some(p => p.distanceToSquared(point) < .000001)) points.push(point);
  }
  const middle = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(points.length || 1);
  cameraFootprint = points.sort((a, b) => Math.atan2(a.z - middle.z, a.x - middle.x)
    - Math.atan2(b.z - middle.z, b.x - middle.x));
  disposeLayer(cameraLayer);
  if (cameraFootprint.length >= 3) {
    line([...cameraFootprint, cameraFootprint[0]], 0xd7a2ff, false, 1, cameraLayer);
  }
}
function disposeLayer(group) {
  for (const object of [...group.children]) {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
    else object.material?.dispose();
    object.removeFromParent();
  }
}
function removeFootprint(key) {
  const mesh = footprints.get(key);
  mesh.removeFromParent(); mesh.dispose(); mesh.material.dispose(); footprints.delete(key);
}
function makeFootprint(key, tiles, color) {
  if (footprints.has(key)) removeFootprint(key);
  const mesh = new THREE.InstancedMesh(square, new THREE.MeshBasicMaterial({ color }), tiles.length);
  tiles.forEach((tile, index) => {
    transform.position.set(tile.x, 0, tile.z); transform.scale.set(1, 1, 1); transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, new THREE.Color(tile.water ? 0x709ec2 : 0xffffff));
  });
  mesh.frustumCulled = false;
  footprints.set(key, mesh); scene.add(mesh);
  return mesh;
}
function sources() {
  return [...farm.driftingIslands.active, ...farm.attachments.attached,
    ...[farm.attachments.motionState()?.island].filter(Boolean)];
}
function syncFootprints() {
  if (fixedTileCount !== farm.terrain.size) {
    fixedTileCount = farm.terrain.size;
    const starter = [...farm.terrain.values()].filter(tile => ['island-0', 'island-1'].includes(tile.islandId));
    makeFootprint('starter', starter, colors.attached);
  }
  const live = new Set(['starter']);
  for (const island of sources()) {
    live.add(island.id);
    const color = colors[island.status] || (island.encounter ? colors.encounter : colors.decorative);
    const mesh = footprints.get(island.id) || makeFootprint(island.id, [...island.terrain.values()], color);
    const p = island.body ? physics.movingIslandPosition(island.body) : island.group.position;
    mesh.position.set(p.x, .1, p.z);
    mesh.material.color.setHex(island.id === selectedId ? 0xffffff : color);
  }
  for (const key of footprints.keys()) if (!live.has(key)) removeFootprint(key);
  observerMesh.position.set(observer.x, 1, observer.z);
}
function line(points, color, dashed = false, opacity = 1, layer = routeLayer) {
  if (points.length < 2) return;
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, .4, p.z)));
  const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 1.6, gapSize: 1, transparent: true, opacity, depthTest: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const object = new THREE.Line(geometry, material);
  if (dashed) object.computeLineDistances();
  object.renderOrder = layer === cameraLayer ? 8 : 5; layer.add(object);
}
function rectangle(b, color, dashed = false, opacity = .4) {
  line([{ x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ },
    { x: b.minX, z: b.maxZ }, { x: b.minX, z: b.minZ }], color, dashed, opacity);
}
function arrow(a, b, color) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < .2) return;
  const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
  const size = Math.min(2, length * .3);
  line([{ x: b.x - dx * size + dz * size * .5, z: b.z - dz * size - dx * size * .5 }, b,
    { x: b.x - dx * size - dz * size * .5, z: b.z - dz * size + dx * size * .5 }], color);
}
function drawRoutes(snapshot) {
  disposeLayer(routeLayer);
  for (const island of snapshot.islands) {
    const color = colors[island.status] || colors[island.kind];
    line(island.forecast, color, true, .5);
    const intended = [island.position, ...island.route];
    line(intended, color);
    for (let i = 1; i < intended.length; i++) arrow(intended[i - 1], intended[i], color);
    arrow(island.position, { x: island.position.x + island.velocity.x * 8, z: island.position.z + island.velocity.z * 8 }, color);
    if (document.querySelector('#envelopes').checked) rectangle(translateBox(island.envelope, island.position), color, true);
    if (island.destination) rectangle({ minX: island.destination.x - 1, maxX: island.destination.x + 1,
      minZ: island.destination.z - 1, maxZ: island.destination.z + 1 }, color, false, 1);
  }
  const motion = farm.attachments.motionState();
  if (motion) line(motion.route, colors.connecting);
  for (const connection of farm.connections) {
    const from = farm.islands.find(i => i.id === connection.from.islandId);
    const to = farm.islands.find(i => i.id === connection.to.islandId);
    if (from && to) line([
      { x: from.transform.x + (connection.from.anchor?.gx || 0) * TILE, z: from.transform.z + (connection.from.anchor?.gz || 0) * TILE },
      { x: to.transform.x + (connection.to.anchor?.gx || 0) * TILE, z: to.transform.z + (connection.to.anchor?.gz || 0) * TILE },
    ], 0xdfbd8b);
  }
  if (document.querySelector('#envelopes').checked) for (const reserved of snapshot.reservations) {
    // The snapshot retains component reservations; draw their union for legibility.
    const boxes = reserved.boxes;
    if (boxes.length) rectangle({ minX: Math.min(...boxes.map(b => b.minX)), maxX: Math.max(...boxes.map(b => b.maxX)),
      minZ: Math.min(...boxes.map(b => b.minZ)), maxZ: Math.max(...boxes.map(b => b.maxZ)) }, 0xf0ad61, false, .8);
  }
  const direction = snapshot.direction;
  const flowStart = { x: center.x - 10, z: center.z - span * .38 };
  const flowEnd = { x: flowStart.x - direction.x * 15, z: flowStart.z - direction.z * 15 };
  line([flowStart, flowEnd], 0xdfe9e8); arrow(flowStart, flowEnd, 0xdfe9e8);
}
const clock = seconds => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
function updateDisplay(force = false) {
  if (!farm || resetting && !force) return;
  if (!force && simTime - displayAt < 1) return;
  displayAt = simTime;
  lastSnapshot = farm.driftingIslands.inspect();
  drawRoutes(lastSnapshot);
  const snapshot = lastSnapshot;
  const counts = snapshot.islands.reduce((result, island) => { result[island.kind]++; return result; }, { encounter: 0, decorative: 0 });
  const blocked = snapshot.islands.filter(i => i.blocked).length;
  const heading = ((Math.atan2(snapshot.direction.x, -snapshot.direction.z) * 180 / Math.PI) + 360) % 360;
  status.textContent = `Time ${clock(simTime)} · ${effectiveSpeed.toFixed(1)}× effective\nFlow ${heading.toFixed(0)}° · ${(travel.snapshot().phase * 100).toFixed(0)}% of turn\n${counts.encounter} encounters · ${counts.decorative} decorative\n${blocked} yielding · ${snapshot.intersections.length ? `${snapshot.intersections.length} ENVELOPE OVERLAPS` : 'no solid overlaps'}\n${snapshot.encounterStatus}\nNext arrival: ${snapshot.nextArrival == null ? 'planning' : clock(Math.max(simTime, snapshot.nextArrival))}`;
  const selected = sources().find(i => i.id === selectedId);
  const record = snapshot.islands.find(i => i.id === selectedId);
  details.textContent = !selected ? 'Select an island to inspect its route.'
    : `${selected.id}\n${selected.status} · ${selected.encounter ? 'encounter' : 'decorative'}\nSpeed ${Math.hypot(record?.velocity.x || 0, record?.velocity.y || 0, record?.velocity.z || 0).toFixed(2)} tiles/s\nHeight ${(selected.group.position.y || 0).toFixed(1)}\n${record?.blocked || 'Route clear'}${record?.destination ? `\nDestination ${record.destination.x.toFixed(0)}, ${record.destination.z.toFixed(0)}` : ''}`;
  const state = farm.attachments.state();
  action.hidden = !state;
  if (state) {
    action.textContent = state.disabled ? state.label : state.action;
    action.title = state.label; action.disabled = state.disabled;
  }
}
function fit() {
  if (!farm) return;
  const points = [...farm.terrain.values(), ...farm.driftingIslands.active.map(i => i.group.position), ...cameraFootprint];
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
  center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  span = Math.max(100, (maxZ - minZ + 50), (maxX - minX + 50) / (canvas.clientWidth / canvas.clientHeight)) * 1.15;
  updateCamera();
}
async function reset() {
  if (resetting) return;
  resetting = true; ready = false; status.textContent = 'Generating islands…';
  try {
    const previousFarm = farm, previousPhysics = physics;
    farm = null; physics = null;
    previousFarm?.dispose(); previousPhysics?.world.free();
    for (const key of [...footprints.keys()]) removeFootprint(key);
    disposeLayer(routeLayer); sourceScene.clear();
    physics = await createPhysics(); travel = createTravelModel();
    const seed = Number(document.querySelector('#seed').value) >>> 0;
    document.querySelector('#seed').value = seed;
    farm = generateFarm(sourceScene, physics, seed, 0, () => {}, { attachmentComplete: true,
      camera: spawnCamera, getObserver: () => observer });
    const tiles = [...farm.terrain.values()].filter(tile => !tile.water && tile.islandId === 'island-0');
    const tile = tiles.sort((a, b) => b.z - a.z)[0];
    Object.assign(observer, { x: tile.x, y: tile.topY, z: tile.z });
    updateSpawnCamera();
    simTime = 0; accumulator = 0; fixedTileCount = -1; selectedId = null; displayAt = -Infinity;
    farm.driftingIslands.update(0, travel.snapshot());
    syncFootprints(); fit(); updateDisplay(true);
    renderer.render(scene, camera);
    ready = true;
    document.dispatchEvent(new CustomEvent('island-debug:ready'));
  } catch (error) { fail(error); }
  finally { resetting = false; last = performance.now(); }
}
function tick() {
  const dt = 1 / 60;
  physics.step(dt);
  const state = travel.update(dt);
  farm.driftingIslands.update(dt, state);
  farm.attachments.update(dt);
  simTime += dt; reportSteps++;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!ready || resetting) return;
  try {
    if (!paused && !document.hidden) {
      const speed = Number(document.querySelector('#speed').value);
      // Bound wall-time debt, not simulation steps. If overloaded, report the
      // achieved rate instead of jumping clocks or enlarging physics timesteps.
      accumulator = Math.min(accumulator + dt * speed, Math.max(.25, speed * .25));
      const deadline = performance.now() + 12;
      while (accumulator >= 1 / 60 && performance.now() < deadline) {
        tick(); accumulator -= 1 / 60;
      }
    }
    if (now - reportWall >= 1000) {
      effectiveSpeed = reportSteps / 60 / ((now - reportWall) / 1000); reportSteps = 0; reportWall = now;
    }
    syncFootprints(); updateDisplay(); renderer.render(scene, camera);
  } catch (error) { fail(error); }
}
pause.addEventListener('click', () => { if (!ready) return; paused = !paused; accumulator = 0; pause.textContent = paused ? 'Resume' : 'Pause'; updateDisplay(true); });
document.querySelector('#step').addEventListener('click', () => {
  if (!ready || resetting) return;
  paused = true; pause.textContent = 'Resume'; accumulator = 0; tick(); syncFootprints(); updateDisplay(true); renderer.render(scene, camera);
});
document.querySelector('#reset').addEventListener('click', reset);
document.querySelector('#fit').addEventListener('click', fit);
document.querySelector('#envelopes').addEventListener('change', () => updateDisplay(true));
document.querySelector('#cameraBoundary').addEventListener('change', event => { cameraLayer.visible = event.target.checked; });
action.addEventListener('click', () => {
  const state = farm.attachments.state();
  if (!state || state.disabled) return;
  const succeeded = state.action === 'Connect' ? farm.attachments.connect() : farm.attachments.release();
  if (!succeeded) details.textContent += '\nRoute occupied; wait for a clear approach.';
  updateDisplay(true);
});
const pointers = new Map(); let gesture = null;
function worldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector3((event.clientX - rect.left) / rect.width * 2 - 1,
    -(event.clientY - rect.top) / rect.height * 2 + 1, 0).unproject(camera);
}
canvas.addEventListener('pointerdown', event => {
  if (!farm) return;
  canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const p = worldPoint(event);
  gesture = { x: event.clientX, y: event.clientY, moved: false,
    observer: Math.hypot(p.x - observer.x, p.z - observer.z) < Math.max(2, span * .015), point: p, center: { ...center } };
});
canvas.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId) || !gesture) return;
  const old = [...pointers.values()];
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const next = [...pointers.values()];
    span = THREE.MathUtils.clamp(span * Math.hypot(old[0].x - old[1].x, old[0].y - old[1].y)
      / Math.max(1, Math.hypot(next[0].x - next[1].x, next[0].y - next[1].y)), 25, 1000);
    gesture.moved = true; updateCamera(); return;
  }
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4) gesture.moved = true;
  if (gesture.observer) {
    const p = worldPoint(event);
    const tile = farm.terrain.get(gridKey(Math.round(p.x / TILE), Math.round(p.z / TILE)));
    if (tile && !tile.water) { Object.assign(observer, { x: tile.x, y: tile.topY, z: tile.z }); updateSpawnCamera(); }
  } else {
    const scale = span / canvas.clientHeight;
    center = { x: gesture.center.x - (event.clientX - gesture.x) * scale, z: gesture.center.z - (event.clientY - gesture.y) * scale };
    updateCamera();
  }
});
canvas.addEventListener('pointerup', event => {
  if (gesture && !gesture.moved && !gesture.observer) {
    const p = worldPoint(event);
    const chosen = sources().find(island => island.terrain.has(gridKey(Math.round((p.x - island.group.position.x) / TILE), Math.round((p.z - island.group.position.z) / TILE))));
    selectedId = chosen?.id || null;
    farm.attachments.select(chosen?.encounter || chosen?.status === 'attached' ? chosen : null);
    updateDisplay(true);
  }
  pointers.delete(event.pointerId); gesture = null;
});
canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); gesture = null; });
canvas.addEventListener('wheel', event => { event.preventDefault(); span = THREE.MathUtils.clamp(span * Math.exp(event.deltaY * .001), 25, 1000); updateCamera(); }, { passive: false });
document.addEventListener('visibilitychange', () => { last = performance.now(); accumulator = 0; });
await reset();
requestAnimationFrame(frame);
