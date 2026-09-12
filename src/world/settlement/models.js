import { THREE, TILE, MODEL_VOXEL, createVoxelModel, mats, box } from '../../core/shared.js';
import { voxelKit } from '../buildings/kit.js';
import { treeFoliagePalette, groundCoverDesign, groundCoverMaterials } from '../vegetation/designs.js';
import { createIslandTreeModel } from '../vegetation/tree-model.js';
import { createHybridCottage } from '../buildings/cottage-hybrid.js';
import { createStorehouseConcept } from '../buildings/storehouse-concept.js';
import { settlementCells, settlementRoadTierAt } from './layout.js';
import { createSettlementRoadSurface } from './roads.js';
import {
  p, h, material, hybridModel, finishHybrid, hall, roof, frontWindow, sideWindow,
  block, cylinder, bar, ring, badge, crate, flowers, lantern, smoke, bake,
} from '../buildings/hybrid-kit.js';

// Approved settlement models, shared by gameplay and the comparison gallery.
const amber = material('settlement-amber-roof', 0xc58c34);
const paving = material('settlement-limestone', 0xc6bfa6);
const soil = material('settlement-garden-soil', 0x665443);
const pink = material('settlement-pink-flowers', 0xc76d88);
const wellWater = material('settlement-well-water', 0x329fdf, .24);
const islandGroundCoverMaterials = groundCoverMaterials();

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

// Animate small rigid details on their own pivots, outside the static bake.
// Phase offsets keep neighboring buildings from moving in lockstep.
function ambientDetail(model, position, author, { axis = 'z', speed = .85, amount = .12, phase = 0 } = {}) {
  const pivot = new THREE.Group();
  author(pivot); bake(pivot);
  pivot.position.set(...position); model.group.add(pivot);
  model.motions.push((time, working, reduced, elapsed) => {
    const wave = Math.sin(elapsed * speed * (reduced ? .55 : 1) + phase);
    pivot.rotation[axis] = wave * amount * (reduced ? .2 : 1.7);
  });
  return pivot;
}

function hangingSign(model, x, y, z, color = h.teal, phase = 0) {
  ambientDetail(model, [x, y, z], pivot => {
    for (const side of [-.17, .17]) bar(pivot, p.steel, [side, 0, 0], [side, -.14, 0], .015);
    block(pivot, p.wood, 0, -.3, 0, .56, .35, .07, .01);
    badge(pivot, 0, -.3, .045, 'wheat', color, .25);
  }, { axis: 'x', speed: .9, amount: .16, phase });
}

function pennants(model, y, z, width, phase = 0) {
  bar(model.structure, p.wood, [-width / 2, y, z], [width / 2, y, z], .018);
  for (let i = 0; i < 5; i++) {
    ambientDetail(model, [(i / 4 - .5) * width, y, z], pivot => {
      block(pivot, i % 2 ? p.chalk : h.teal, 0, -.16, 0, .2, .32, .025, 0);
    }, { axis: 'x', speed: 1.2, amount: .2, phase: phase + i * .7 });
  }
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
  hangingSign(model, -1.25, 2.15, 1.65, h.teal, .4);
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
  pennants(model, 1.58, (9 + depth) * .2, width * .2 - .6, 1.2);
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
  const animateCottage = model.animate;
  const ambientOffset = kind === 'amber' ? 3.8 : kind === 'red' ? 1.7 : 0;
  model.animate = (time, working, reduced, elapsed = time) => animateCottage(time, working, reduced, elapsed + ambientOffset);
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
    ambientDetail(model, [(center + 1) * .2, 2.8, 1.25], pivot => {
      block(pivot, h.green, .15, 0, 0, .3, .72, .07, .01);
      for (const y of [-.24, 0, .24]) block(pivot, p.wood, .15, y, .045, .28, .04, .025, 0);
    }, { axis: 'y', amount: .15, speed: .65, phase: center * .3 });
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
  kit.add(p.dark, -2, 0, -2, 4, 1, 4);
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
  // Keep moving assemblies outside the static structure's material bake.
  const bucket = new THREE.Group(); frame.group.add(bucket);
  // A hollow shell leaves the water visible inside, rather than capping it.
  const bucketProfile = [[0, -.135], [.18, -.135], [.22, .135], [.198, .135], [.158, -.11], [0, -.11]];
  bucket.add(new THREE.Mesh(new THREE.LatheGeometry(
    bucketProfile.map(([radius, y]) => new THREE.Vector2(radius, y)), 10), h.copper));
  ring(bucket, p.steel, 0, .135, 0, .22, .018).rotation.x = Math.PI / 2;
  bake(bucket);
  const water = cylinder(bucket, wellWater, 0, -.1, 0, .19, .012, .19, 10);
  const rope = cylinder(frame.group, p.dark, 0, 0, 0, .025, 1, .025, 8);
  const crank = new THREE.Group(); crank.position.set(.98, 1.65, 0); frame.group.add(crank);
  ring(crank, p.steel, 0, 0, 0, .21, .025).rotation.y = Math.PI / 2;
  bar(crank, p.steel, [0, -.21, 0], [0, .21, 0], .025);
  bar(crank, p.steel, [0, 0, -.21], [0, 0, .21], .025);
  bar(crank, p.wood, [0, .21, 0], [.22, .21, 0], .045);
  bake(crank);
  frame.motions.push((time, working, reduced, elapsed) => {
    // Ambient time keeps the well working without a Storehouse transfer.
    // The handle reverses with the bucket; rope length stays attached at both ends.
    const phase = (elapsed / (reduced ? 20 : 12)) % 1;
    const ease = THREE.MathUtils.smoothstep;
    const descent = ease(phase, 0, .32), ascent = ease(phase, .44, .78);
    const travel = reduced ? .84 : 2.08;
    const lowered = (descent - ascent) * travel;
    bucket.position.y = 1.38 - lowered;
    // Pause down in the shaft to fill, then display the full bucket at the top.
    const fill = ease(phase, .32, .44) * (1 - ease(phase, .9, 1));
    water.visible = fill > .01;
    water.position.y = -.1 + fill * .21;
    water.scale.x = water.scale.z = (.158 + fill * .036) / .19;
    const ropeLength = 1.65 - (bucket.position.y + .135);
    rope.scale.y = ropeLength;
    rope.position.y = 1.65 - ropeLength * .5;
    crank.rotation.x = lowered / .085;
  });
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
  pennants(model, 2.1, 1.5, 2.8, 2.4);
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
  model.motions.push((time, working, reduced, elapsed) => { bell.rotation.z = Math.sin(elapsed * .7) * (reduced ? .012 : .12); });
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
  for (let i = 0; i < 3; i++) {
    ambientDetail(model, [-.22 + i * .22, 2.6, .4], pivot => {
      bar(pivot, p.dark, [0, 0, 0], [0, -.22, 0], .012);
      cylinder(pivot, h.copper, 0, -.38 - i * .035, 0, .035, .32 + i * .07, .035, 8);
    }, { axis: i % 2 ? 'x' : 'z', speed: 1.3 + i * .12, amount: .18, phase: i * 1.4 });
  }
  return finishHybrid(model);
}

export function islandGroundCover(type = 'brightGrass') {
  const group = new THREE.Group(); group.name = `settlement-${type}`;
  const tufts = [];
  for (const [index, [x, z, scale]] of [[-.3, -.12, .75], [.27, .1, .9], [-.05, .32, .65]].entries()) {
    const tuft = new THREE.Group();
    const variant = index === 2 && type !== 'mushrooms' ? 'brightGrass' : type;
    for (const part of groundCoverDesign(variant)) {
      const mesh = box(part.w, part.h, part.d, islandGroundCoverMaterials[part.material]);
      mesh.position.set(part.x, part.y, part.z); mesh.rotation.set(0, part.ry, part.rz);
      tuft.add(mesh);
    }
    bake(tuft); tuft.position.set(x, 0, z); tuft.scale.setScalar(scale);
    tuft.rotation.y = index * 2.1; group.add(tuft); tufts.push(tuft);
  }
  const bounds = new THREE.Box3().setFromObject(group); bounds.expandByScalar(.04);
  // Soft vegetation uses the same non-blocking behavior as island ground cover.
  return { group, bounds, setLighting() {}, animate(time, working, reduced, elapsed = time) {
    tufts.forEach((tuft, index) => {
      tuft.rotation.z = type === 'mushrooms' ? 0 : Math.sin(elapsed * 1.2 + index * 1.8) * (reduced ? .008 : .035);
    });
  } };
}

export function groundProps(kind = 'logs') {
  const model = hybridModel(`settlement-ground-${kind}`), { kit, structure } = model;
  if (kind === 'logs') {
    for (const [x, y] of [[-.18, .14], [.18, .14], [0, .4]]) {
      const log = cylinder(structure, p.wood, x, y, 0, .13, .65, .13, 8); log.rotation.x = Math.PI / 2;
      for (const z of [-.335, .335]) {
        const end = cylinder(structure, p.grain, x, y, z, .095, .015, .095, 8); end.rotation.x = Math.PI / 2;
      }
    }
    // Structural cells provide a matching collider underneath the log stack.
    kit.add(h.timber, -2, 0, -2, 4, 1, 4);
    kit.add(h.timber, -1, 1, -1, 2, 1, 2);
  } else {
    flowers(structure, -.18, 0, 0, kind === 'pots' ? pink : h.flower, .8);
    cylinder(structure, h.copper, .22, .13, .14, .13, .26, .16, 8);
    cylinder(structure, soil, .22, .265, .14, .135, .015, .135, 8);
    kit.add(p.stone, -2, 0, -2, 4, 1, 4);
  }
  for (const [x, z, size] of [[-.45, .28, .12], [.35, -.35, .1], [.12, .45, .08]]) {
    block(structure, paving, x, .035, z, size, .07, size * .8, 0);
  }
  return finishHybrid(model);
}

export function villageTree(silhouette = 0) {
  const palette = treeFoliagePalette({ veryWet: 0, veryShady: 0, dry: .2, sunny: .45, wet: .4, shady: .5 });
  const foliage = { dark: material(`settlement-tree-${palette.key}-dark`, palette.dark, 1),
    light: material(`settlement-tree-${palette.key}-light`, palette.light, 1) };
  const { tree: group, sway, trunkHeight, radius } = createIslandTreeModel(silhouette, 1.14, foliage);
  group.name = 'settlement-island-tree';
  group.userData.buildingColliders = [{ x: 0, y: 0, z: 0, width: radius * 2, height: trunkHeight, depth: radius * 2 }];
  const bounds = new THREE.Box3().setFromObject(group); bounds.expandByScalar(.25);
  return { group, bounds, setLighting() {}, animate(time, working, reduced, elapsed = time) {
    const phase = silhouette * 2.4, strength = reduced ? .012 : .065;
    sway.rotation.z = Math.sin(elapsed * 1.15 + phase) * strength;
    sway.rotation.x = Math.cos(elapsed * .9 + phase * .73) * strength * .62;
  } };
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
  const model = hybridModel('market-wheelbarrow'), { kit, structure } = model;
  // An open, stepped timber tray on a single front wheel, with two rear grips.
  kit.add(h.tealDark, -2, 2, -2, 4, 1, 6);
  kit.add(p.wood, -2, 3, -2, 4, 1, 6);
  for (const x of [-3, 2]) kit.add(p.wood, x, 4, -2, 1, 2, 6);
  for (const z of [-3, 4]) kit.add(p.wood, -3, 4, z, 6, 2, 1);
  for (const x of [-3, 2]) kit.add(h.teal, x, 6, -3, 1, 1, 8);
  for (const z of [-3, 4]) kit.add(h.teal, -2, 6, z, 4, 1, 1);
  for (const side of [-1, 1]) {
    const x = side * .44;
    bar(structure, h.tealDark, [x, .56, .8], [x, .64, -1.15], .045);
    bar(structure, p.wood, [x, .64, -1.15], [x, .65, -1.48], .065);
    bar(structure, h.tealDark, [x, .55, -.32], [x, .06, -.5], .045);
    block(structure, h.tealDark, x, .035, -.5, .16, .07, .24, .01);
    bar(structure, h.tealDark, [x, .55, .7], [side * .16, .34, 1.1], .04);
    for (const z of [-.28, .52]) {
      block(structure, p.steel, side * .607, 1, z, .025, .35, .07, 0);
      for (const y of [.9, 1.12]) cylinder(structure, p.gold, side * .625, y, z, .027, .025, .027, 6).rotation.z = Math.PI / 2;
    }
  }
  const wheel = new THREE.Group(); wheel.position.set(0, .34, 1.1); structure.add(wheel);
  const tire = cylinder(wheel, p.dark, 0, 0, 0, .34, .19, .34, 12); tire.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    ring(wheel, p.steel, side * .105, 0, 0, .24, .025).rotation.y = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      bar(wheel, p.wood, [side * .11, 0, 0], [side * .11, Math.sin(angle) * .23, Math.cos(angle) * .23], .023);
    }
  }
  bar(wheel, p.steel, [-.22, 0, 0], [.22, 0, 0], .065);
  // A few distinct vegetables keep the hollow tray readable.
  for (const [x, z, color] of [[-.17, -.12, h.green], [.16, .15, h.red], [-.12, .43, p.grain]]) {
    const produce = new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 1), color);
    produce.position.set(x, .96, z); structure.add(produce);
    bar(structure, h.green, [x, 1.07, z], [x + .035, 1.18, z], .025);
  }
  hangingSign(model, 0, 1.13, 1.02, h.green, 2.1);
  ambientDetail(model, [-.44, .66, -1.16], pivot => {
    block(pivot, p.chalk, 0, -.18, 0, .26, .36, .025, 0);
    block(pivot, h.teal, 0, -.29, .016, .26, .05, .012, 0);
  }, { axis: 'x', speed: 1.1, amount: .22, phase: .8 });
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
  model.motions.push((time, working, reduced, elapsed) => { flag.rotation.y = Math.sin(elapsed * 1.4) * (reduced ? .035 : .22); });
  return finishHybrid(model);
}

export function pavingPatch(width, depth) {
  return kitModel('village-courtyard-paving', kit => {
    for (let z = 0; z < depth; z += 2) for (let x = 0; x < width; x += 4) {
      kit.add((x + z) % 3 ? paving : p.stone, x, 0, z, Math.min(4, width - x), 1, Math.min(2, depth - z));
    }
  });
}

export function islandPlinth(landCells = settlementCells({ margin: 1 })) {
  const grass = [0x91a773, 0x94aa77, 0x8fa371, 0x98ab79].map((color, i) => material(`village-grass-${i}`, color));
  const parts = [];
  const tiles = landCells.map(({ gx, gz }) => ({ gx, gz, x: gx * TILE, z: gz * TILE, topY: 0, islandId: 'gallery',
    settlementRoadTier: Math.abs(gx) <= 1 && gz >= 8 ? 1 : settlementRoadTierAt(gx, gz),
    normalGrassColor: grass[Math.abs(gx * 73 + gz * 137) % 4].color }));
  const roads = createSettlementRoadSurface(tiles.filter(tile => tile.settlementRoadTier <= 5), 42);
  const positions = [], vertexColors = [], indices = [];
  const colorAttribute = new THREE.Float32BufferAttribute(new Float32Array(tiles.length * 25 * 12), 3);
  for (const tile of tiles) {
    const { gx: x, gz: z } = tile;
    const hash = Math.abs(x * 73 + z * 137);
    const depth = 5 + hash % 3;
    parts.push({ material: grass[hash % 4], at: [x * 5 - 2, -1, z * 5 - 2], size: [5, 1, 5] });
    parts.push({ material: mats.soil, at: [x * 5 - 2, -depth, z * 5 - 2], size: [5, depth - 1, 5] });
    parts.push({ material: hash % 2 ? mats.stone : mats.stoneDark, at: [x * 5 - 2, -depth - 3, z * 5 - 2], size: [5, 3, 5] });
    if (Math.abs(x) < 7 && Math.abs(z) < 6) parts.push({ material: mats.stoneDark,
      at: [x * 5 - 2, Math.floor(-depth - 8 - (6 - Math.abs(x)) / 2), z * 5 - 2], size: [5, 8, 5] });
    for (let row = 0; row < 5; row++) for (let column = 0; column < 5; column++) {
      const offset = positions.length / 3;
      const left = tile.x - .4 * TILE + column * MODEL_VOXEL, near = tile.z - .4 * TILE + row * MODEL_VOXEL;
      const color = roads.registerCell(tile, left, near, tile.normalGrassColor, 0, colorAttribute, offset);
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        positions.push(left + dx * MODEL_VOXEL, .002 * TILE, near + dz * MODEL_VOXEL);
        vertexColors.push(color.r, color.g, color.b);
      }
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
  }
  const group = createVoxelModel(parts, { name: 'settlement-island' });
  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  colorAttribute.array.set(vertexColors); colorAttribute.setUsage(THREE.DynamicDrawUsage);
  topGeometry.setAttribute('color', colorAttribute); topGeometry.setIndex(indices); topGeometry.computeVertexNormals();
  const paths = new THREE.Mesh(topGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }));
  paths.name = 'settlement-road-surface'; paths.receiveShadow = true; group.add(paths);
  group.userData.roadSurface = roads;
  const bridge = [];
  const bridgeStart = (Math.max(...landCells.map(cell => cell.gz)) + .6) * 5;
  for (let z = bridgeStart; z < bridgeStart + 24; z += 2) {
    bridge.push({ material: z % 4 === 1 ? mats.bridge : mats.bridgeDark, at: [-7, -1, z], size: [15, 1, 2] });
    for (const x of [-8, 8]) bridge.push({ material: mats.bridgeDark, at: [x, 3, z], size: [1, 1, 2] });
  }
  for (const x of [-8, 8]) for (const z of [bridgeStart, bridgeStart + 6, bridgeStart + 12, bridgeStart + 18, bridgeStart + 24]) bridge.push({ material: p.wood, at: [x, -1, z], size: [1, 5, 1] });
  group.add(createVoxelModel(bridge, { name: 'settlement-bridge-entrance' }));
  return group;
}
