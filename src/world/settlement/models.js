import { THREE, TILE, MODEL_VOXEL, createVoxelModel, mats } from '../../core/shared.js';
import { voxelKit } from '../buildings/kit.js';
import { createHybridCottage } from '../buildings/cottage-hybrid.js';
import { createStorehouseConcept } from '../buildings/storehouse-concept.js';
import { settlementCells, settlementRoadAt } from './layout.js';
import {
  p, h, material, hybridModel, finishHybrid, hall, roof, frontWindow, sideWindow,
  block, cylinder, bar, ring, badge, crate, flowers, lantern, smoke, bake,
} from '../buildings/hybrid-kit.js';

// Approved settlement models, shared by gameplay and the comparison gallery.
const amber = material('settlement-amber-roof', 0xc58c34);
const paving = material('settlement-limestone', 0xc6bfa6);
const soil = material('settlement-garden-soil', 0x665443);
const pink = material('settlement-pink-flowers', 0xc76d88);

function kitModel(name, author) {
  const kit = voxelKit(name);
  author(kit);
  const { group } = kit.finish();
  return { group, bounds: new THREE.Box3().setFromObject(group), animate() {}, setLighting() {} };
}

function modelMeshes(group) {
  const meshes = [];
  group.traverse(object => { if (object.isMesh) meshes.push(object); });
  return meshes;
}

// Stable part IDs describe what survives an upgrade, independently of the
// material batches used to render it. A version changes only with that part.
function composeUpgradeModel(name, parts) {
  const group = new THREE.Group(); group.name = name;
  const bounds = new THREE.Box3();
  for (const { model } of parts) {
    group.add(model.group); bounds.union(model.bounds);
  }
  return {
    group, bounds, upgradeFamily: name,
    upgradeParts: parts.map(({ id, version, model }) => ({ id, version, meshes: modelMeshes(model.group) })),
    animate(...args) { parts.forEach(({ model }) => model.animate(...args)); },
    setLighting(lighting) { parts.forEach(({ model }) => model.setLighting(lighting)); },
  };
}

function windowMaterial(model) {
  const glass = material('settlement-warm-window', 0xabc6c5, .35);
  glass.emissive.setHex(0xffc172); glass.emissiveIntensity = .12;
  model.lamps.push(glass);
  return glass;
}

export function receivingHall() {
  const model = hybridModel('hamlet-receiving-hall'), { kit, structure } = model;
  hall(kit, { width: 20, depth: 14, height: 11, opening: 10 });
  roof(kit, { left: -11, width: 22, back: -8, depth: 17, y: 11, color: h.teal, step: 2 });
  for (const x of [-10, 8]) sideWindow(kit, x, 5, -3, 4, 3, h.teal);
  kit.add(p.wood, -7, 1, 7, 14, 1, 4);
  for (const x of [-8, 6]) {
    kit.add(h.teal, x, 2, 6, 2, 8, 1);
    kit.add(p.wood, x, 3, -5, 2, 1, 8);
    kit.add(p.wood, x, 6, -5, 2, 1, 8);
  }
  kit.add(p.dark, -3, 2, -6, 6, 6, 1);
  badge(structure, 0, 2.2, 1.58, 'wheat', h.teal, .65);
  const stocks = [];
  for (const side of [-1, 1]) for (const z of [-.65, .1]) {
    const stock = new THREE.Group(); model.group.add(stock); stocks.push(stock);
    crate(stock, side * 1.35, .8, z, .46, p.grain); bake(stock);
  }
  crate(structure, -1.7, .4, 1.45, .55, p.grain);
  lantern(model, 1.25, 1.85, 1.5);
  return { ...finishHybrid(model), setStockLevel(ratio) {
    const count = Math.round(THREE.MathUtils.clamp(ratio, 0, 1) * stocks.length);
    stocks.forEach((stock, index) => { stock.visible = index < count; });
  } };

}

export function receivingCanopy(rich = false) {
  const model = hybridModel(`receiving-canopy-${rich ? 'painted' : 'timber'}`), { kit } = model;
  const width = rich ? 24 : 16, depth = rich ? 8 : 5;
  for (const x of [-width / 2 + 1, width / 2 - 2]) {
    for (const z of [9, 9 + depth - 2]) {
      kit.add(rich ? p.stone : h.timber, x, 0, z, 2, 2, 2);
      kit.add(rich ? h.teal : p.wood, x, 2, z, 1, z === 9 ? 10 : 8, 1);
    }
  }
  kit.add(p.wood, -width / 2, 9, 9 + depth - 2, width, 1, 2);
  for (let z = 9; z < 9 + depth; z += 2) {
    kit.add(h.teal, -width / 2, 12 - Math.floor((z - 9) / 2), z, width, 1, 2);
  }
  kit.add(rich ? p.chalk : p.wood, -width / 2, 8, 9 + depth - 1, width, 1, 1);
  if (rich) for (const x of [-10, 9]) {
    kit.add(p.chalk, x, 7, 13, 1, 2, 2);
    lantern(model, x * MODEL_VOXEL, 1.45, 3.12);
  }
  return finishHybrid(model);
}

export function civicStorehouse() {
  return createStorehouseConcept({ hybrid: true });
}

export function cottage(kind, rich = false) {
  const model = createHybridCottage(kind === 'amber' ? 'blue' : kind);
  const original = modelMeshes(model.group);
  const frame = new Set(original.filter(mesh => mesh.material === h.timber));
  model.upgradeFamily = `cottage-${kind}`;
  model.upgradeParts = [
    { id: 'body', version: 'original', meshes: original.filter(mesh => !frame.has(mesh)) },
    { id: 'frame', version: rich ? 'painted' : 'timber', meshes: [...frame] },
  ];
  if (kind === 'amber' || rich) {
    model.group.traverse(object => {
      if (!object.isMesh) return;
      const replace = source => {
        if (kind === 'amber' && source === p.blue) return amber;
        if (kind === 'amber' && source === h.teal) return h.green;
        return rich && source === h.timber ? p.chalk : source;
      };
      object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
    });
  }
  if (rich) {
    // Finish the existing facade instead of extending a second porch into the
    // housing street. All trim and flowers fit inside the cottage's old parcel.
    const trim = voxelKit(`cottage-${kind}-painted-trim`);
    const accent = kind === 'amber' ? h.green : h.teal;
    for (const x of [-6, -2]) trim.add(p.chalk, x, 2, 8, 1, 7, 1);
    trim.add(accent, -6, 10, 8, 5, 1, 1);
    trim.add(p.chalk, -6, 9, 8, 5, 1, 1);
    trim.add(p.gold, -6, 9, 8, 1, 1, 1);
    trim.add(p.gold, -2, 9, 8, 1, 1, 1);
    trim.add(accent, 0, 2, 8, 5, 1, 1);
    const trimGroup = trim.finish().group;
    model.group.add(trimGroup);
    const detail = new THREE.Group();
    flowers(detail, 1.2, 0, 1.35, pink, .7);
    badge(detail, -.8, 1.93, 1.82, 'wheat', accent, .3);
    bake(detail); model.group.add(detail);
    model.upgradeParts.push({ id: 'porch-details', version: 'finished',
      meshes: [...modelMeshes(trimGroup), ...modelMeshes(detail)] });
    model.bounds.union(new THREE.Box3().setFromObject(model.group));
  }
  return model;
}

export function townhouses() {
  const model = hybridModel('red-roof-townhouses'), { kit, structure } = model;
  const glass = windowMaterial(model);
  hall(kit, { width: 24, depth: 12, height: 19, opening: 0 });
  for (const center of [-6, 6]) {
    roof(kit, { left: center - 7, width: 14, back: -7, depth: 15, y: 19, step: 2, color: h.red });
    kit.cut(center - 2, 2, 4, 3, 7, 2);
    kit.add(h.green, center - 2, 2, 4, 3, 7, 1);
    for (const x of [center - 3, center + 1]) kit.add(p.chalk, x, 2, 6, 1, 7, 1);
    kit.add(p.wood, center - 3, 9, 6, 5, 1, 1);
    frontWindow(kit, center - 3, 12, 4, 5, 4, h.green, glass);
    kit.add(p.wood, center - 5, 10, 6, 9, 1, 3);
    for (const x of [center - 5, center - 1, center + 3]) kit.add(p.chalk, x, 11, 8, 1, 2, 1);
    kit.add(h.green, center - 5, 13, 8, 9, 1, 1);
    kit.add(p.stone, center - 3, 0, 6, 5, 1, 4);
    lantern(model, (center + 2.5) * .2, 1.55, 1.4);
    flowers(structure, (center - 4.5) * .2, .4, 1.52, pink, .8);
    ring(structure, p.gold, (center - .5) * .2, 1.05, .845, .055, .015);
  }
  for (const x of [-12, 10]) sideWindow(kit, x, 12, -2, 4, 4, h.green);
  kit.add(h.redDark, -9, 19, -4, 2, 8, 2);
  kit.add(p.chalk, -10, 27, -5, 4, 1, 4);
  smoke(model, -1.6, 5.7, -.6);
  return finishHybrid(model);
}

export function well(stone = false) {
  const basin = hybridModel('village-well-basin'), { kit } = basin;
  kit.add(stone ? p.stone : p.wood, -4, 0, -4, 8, 4, 8);
  kit.cut(-2, 1, -2, 4, 4, 4);
  kit.add(p.dark, -2, 1, -2, 4, 1, 4);
  if (stone) {
    kit.add(p.chalk, -5, 4, -5, 10, 1, 10);
    kit.cut(-3, 4, -3, 6, 1, 6);
    for (const x of [-5, 4]) kit.cut(x, 4, -1, 1, 1, 2);
  }
  const frame = hybridModel('village-well-frame'), { structure } = frame;
  for (const x of [-5, 4]) frame.kit.add(p.wood, x, 0, -1, 1, 12, 2);
  const cover = kitModel('village-well-roof', roofKit => {
    roof(roofKit, { left: -6, width: 12, back: -5, depth: 10, y: 12, step: 2, color: stone ? p.blue : h.slate });
  });
  bar(structure, p.wood, [-.85, 1.65, 0], [.85, 1.65, 0], .085);
  bar(structure, p.dark, [0, 1.65, 0], [0, .67, 0], .025);
  cylinder(structure, h.copper, 0, .58, 0, .18, .27, .22, 10);
  ring(structure, p.steel, .98, 1.63, 0, .21, .025).rotation.y = Math.PI / 2;
  return composeUpgradeModel('village-well', [
    { id: 'frame-and-winch', version: 'original', model: finishHybrid(frame) },
    { id: 'basin', version: stone ? 'stone' : 'timber', model: finishHybrid(basin) },
    { id: 'roof', version: stone ? 'blue' : 'slate', model: cover },
  ]);
}

export function market(rich = false) {
  const model = hybridModel('market-structure'), { kit, structure } = model;
  const finishes = hybridModel('market-finishes');
  kit.add(p.stone, -10, 0, -5, 20, 1, 13);
  for (const x of [-9, 0, 8]) for (const z of [-4, 6]) kit.add(p.wood, x, 1, z, 1, 10, 1);
  kit.add(p.wood, -10, 10, 6, 20, 1, 1);
  kit.add(p.wood, -10, 11, -4, 20, 1, 1);
  for (let x = -10; x < 10; x += 2) for (let z = -6; z <= 6; z += 2) {
    kit.add((x + 10) % 4 ? p.chalk : h.green, x, 14 - Math.floor(Math.abs(z) / 2), z, 2, 1, 2);
  }
  for (const center of [-5, 5]) {
    kit.add(p.wood, center - 4, 1, 4, 8, 3, 2);
    // The separate countertop owns its cells where it crosses the corner posts.
    kit.cut(center - 4, 4, 3, 8, 1, 4);
    finishes.kit.add(rich ? h.teal : p.chalk, center - 4, 4, 3, 8, 1, 4);
    kit.add(h.timber, center - 4, 4, -3, 8, 1, 2);
    for (const dx of [-.5, .1, .65]) {
      crate(structure, center * .2 + dx, 1, .85, .42, center < 0 ? p.grain : h.red);
      crate(structure, center * .2 + dx, 1, -.5, .35, h.green);
    }
    if (rich) {
      badge(finishes.structure, center * .2, 1.85, 1.4, 'wheat', h.teal, .45);
      lantern(finishes, center * .2, 1.75, -.85);
    }
  }
  if (rich) for (const x of [-2.2, 2.15]) flowers(finishes.structure, x, 0, 1.15, pink, 1.05);
  return composeUpgradeModel('village-market', [
    { id: 'structure-and-stock', version: 'original', model: finishHybrid(model) },
    { id: 'countertops-and-details', version: rich ? 'finished' : 'plain', model: finishHybrid(finishes) },
  ]);
}

export function bellTower() {
  const model = hybridModel('village-bell-tower'), { kit, structure, group } = model;
  kit.add(p.stone, -5, 0, -5, 10, 2, 10);
  kit.add(p.cream, -4, 2, -4, 8, 9, 8);
  kit.cut(-2, 3, 2, 4, 6, 2); kit.add(h.teal, -2, 3, 2, 4, 6, 1);
  kit.add(p.chalk, -5, 11, -5, 10, 1, 10);
  for (const x of [-4, 3]) for (const z of [-4, 3]) kit.add(p.wood, x, 12, z, 1, 10, 1);
  kit.add(p.wood, -4, 21, -4, 8, 1, 8);
  roof(kit, { left: -6, width: 12, back: -6, depth: 12, y: 22, color: h.teal, step: 2 });
  kit.add(p.gold, -1, 25, -1, 2, 4, 2);
  const bell = new THREE.Group(); bell.position.set(0, 4, 0); group.add(bell);
  cylinder(bell, h.copper, 0, -.35, 0, .42, .6, .19, 12);
  ring(bell, p.gold, 0, -.64, 0, .42, .055).rotation.x = Math.PI / 2;
  cylinder(bell, p.dark, 0, -.69, 0, .055, .21, .055, 8);
  bake(bell);
  model.motions.push((time, working, reduced, elapsed) => { bell.rotation.z = Math.sin(elapsed * .7) * (reduced ? .012 : .065); });
  badge(structure, 0, 1.7, .825, 'wheat', h.teal, .55);
  lantern(model, .65, 1.45, .94);
  return finishHybrid(model);
}

export function pergola() {
  const model = hybridModel('community-pergola'), { kit, structure } = model;
  // A shallow shelter for one bench leaves the delivery court and the largest
  // Storehouse canopy clear, without pushing its posts over the island edge.
  kit.add(p.stone, -6, 0, -4, 12, 1, 8);
  for (const x of [-5, 4]) for (const z of [-3, 3]) {
    kit.add(p.chalk, x, 1, z, 1, 11, 1);
    kit.add(p.wood, x - 1, 12, -4, 3, 1, 8);
  }
  for (let z = -4; z <= 4; z += 2) kit.add(p.wood, -7, 13, z, 14, 1, 1);
  for (const x of [-5, 4]) for (let y = 4; y < 14; y += 3) {
    kit.add(y % 2 ? h.green : h.leaf, x - 1, y, -4, 3, 2, 2);
  }
  for (const x of [-1.1, 1.1]) flowers(structure, x, 0, .85, pink, .85);
  return finishHybrid(model);
}

export function fence(length = 20, painted = false) {
  return kitModel(`garden-fence-${painted ? 'painted' : 'rough'}`, kit => {
    for (let x = 0; x <= length; x += 5) kit.add(painted ? p.chalk : h.timber, x, 0, 0, 1, 6, 1);
    for (const y of [2, 4]) kit.add(painted ? h.green : p.wood, 0, y, 0, length, 1, 1);
    if (painted) for (let x = 2; x < length; x += 2) kit.add(p.chalk, x, 1, 1, 1, 4 + x % 3 % 2, 1);
  });
}

export function bench() {
  return kitModel('village-bench', kit => {
    for (const x of [-4, 3]) for (const z of [-1, 2]) kit.add(h.tealDark, x, 0, z, 1, 2, 1);
    kit.add(p.wood, -5, 2, -2, 10, 1, 5);
    for (const x of [-4, 3]) kit.add(h.tealDark, x, 3, -2, 1, 3, 1);
    for (const y of [4, 5]) kit.add(p.wood, -5, y, -2, 10, 1, 1);
  });
}

export function handcart() {
  const model = hybridModel('market-handcart'), { kit, structure } = model;
  kit.add(p.wood, -4, 2, -3, 8, 1, 6);
  for (const x of [-4, 3]) kit.add(p.wood, x, 3, -3, 1, 3, 6);
  for (const z of [-3, 2]) kit.add(p.wood, -4, 3, z, 8, 3, 1);
  for (const x of [-3, 2]) kit.add(p.wood, x, 2, 3, 1, 1, 6);
  for (const x of [-1, 1]) {
    ring(structure, p.dark, x, .4, 0, .35, .065).rotation.y = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 4;
      bar(structure, p.wood, [x, .4 - Math.sin(angle) * .3, -Math.cos(angle) * .3],
        [x, .4 + Math.sin(angle) * .3, Math.cos(angle) * .3], .025);
    }
  }
  crate(structure, 0, .6, 0, .6, p.grain);
  return finishHybrid(model);
}

export function garden(width = 12, depth = 6, color = pink) {
  const model = hybridModel('flower-garden'), { kit, structure } = model;
  kit.add(soil, -width / 2, 0, -depth / 2, width, 1, depth);
  for (const z of [-depth / 2, depth / 2 - 1]) kit.add(p.stone, -width / 2, 0, z, width, 1, 1);
  for (const x of [-width / 2, width / 2 - 1]) kit.add(p.stone, x, 0, -depth / 2, 1, 1, depth);
  for (let x = -width / 2 + 2; x < width / 2 - 1; x += 3) flowers(structure, x * .2, .12, 0, color, .8);
  return finishHybrid(model);
}

export function pathLamp() {
  const model = hybridModel('village-path-lantern'), { kit } = model;
  kit.add(p.stone, -1, 0, -1, 3, 2, 3);
  kit.add(h.tealDark, 0, 2, 0, 1, 10, 1);
  kit.add(h.tealDark, 0, 11, 0, 1, 1, 3);
  lantern(model, .1, 1.94, .5);
  return finishHybrid(model);
}

export function villageFlag() {
  const model = hybridModel('settlement-village-flag'), { kit, group } = model;
  kit.add(p.stone, -2, 0, -2, 4, 2, 4);
  kit.add(p.wood, 0, 2, 0, 1, 22, 1);
  kit.add(p.gold, 0, 24, 0, 1, 1, 1);
  const flag = new THREE.Group(); flag.position.set(.18, 4.5, .1); group.add(flag);
  block(flag, h.teal, .45, -.35, 0, .9, .65, .035, 0);
  block(flag, p.chalk, .05, -.35, .025, .1, .65, .02, 0);
  badge(flag, .5, -.35, .03, 'wheat', h.teal, .35);
  bake(flag);
  model.motions.push((time, working, reduced, elapsed) => { flag.rotation.y = Math.sin(elapsed * 1.4) * (reduced ? .035 : .13); });
  return finishHybrid(model);
}

export function pavingPatch(width, depth) {
  return kitModel('village-courtyard-paving', kit => {
    for (let z = 0; z < depth; z += 2) for (let x = 0; x < width; x += 4) {
      kit.add((x + z) % 3 ? paving : p.stone, x, 0, z, Math.min(4, width - x), 1, Math.min(2, depth - z));
    }
  });
}

export function islandPlinth() {
  const grass = [0x91a773, 0x94aa77, 0x8fa371, 0x98ab79].map((color, i) => material(`village-grass-${i}`, color));
  const parts = [], pathParts = [];
  const pathMat = material('village-worn-path', 0xbca581);
  for (const { gx: x, gz: z } of settlementCells()) {
    const hash = Math.abs(x * 73 + z * 137);
    const depth = 5 + hash % 3;
    parts.push({ material: grass[hash % 4], at: [x * 5 - 2, -1, z * 5 - 2], size: [5, 1, 5] });
    parts.push({ material: mats.soil, at: [x * 5 - 2, -depth, z * 5 - 2], size: [5, depth - 1, 5] });
    parts.push({ material: hash % 2 ? mats.stone : mats.stoneDark, at: [x * 5 - 2, -depth - 3, z * 5 - 2], size: [5, 3, 5] });
    if (Math.abs(x) < 7 && Math.abs(z) < 6) parts.push({ material: mats.stoneDark,
      at: [x * 5 - 2, Math.floor(-depth - 8 - (6 - Math.abs(x)) / 2), z * 5 - 2], size: [5, 8, 5] });
    const lane = settlementRoadAt(x, z);
    if (lane) pathParts.push({ material: pathMat, at: [x * 5 - 2, 0, z * 5 - 2], size: [5, 1, 5] });
  }
  const group = createVoxelModel(parts, { name: 'settlement-island' });
  const paths = createVoxelModel(pathParts, { name: 'hamlet-dirt-paths' });
  paths.position.y = -.19 * TILE; group.add(paths);
  const bridge = [];
  for (let z = 43; z < 57; z += 2) {
    bridge.push({ material: z % 4 === 1 ? mats.bridge : mats.bridgeDark, at: [-7, -1, z], size: [15, 1, 2] });
    for (const x of [-8, 8]) bridge.push({ material: mats.bridgeDark, at: [x, 3, z], size: [1, 1, 2] });
  }
  for (const x of [-8, 8]) for (const z of [43, 49, 55]) bridge.push({ material: p.wood, at: [x, -1, z], size: [1, 5, 1] });
  group.add(createVoxelModel(bridge, { name: 'settlement-bridge-entrance' }));
  return group;
}
