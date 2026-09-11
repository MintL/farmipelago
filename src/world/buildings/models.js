import { THREE, MODEL_VOXEL } from '../../core/shared.js';
import { palette as p, voxelKit, gable, frontWindow, crate, sack, can, wheatEmblem, animatedPart, finishBuilding } from './kit.js';

export function createWindmillModel() {
  const kit = voxelKit('windmill'), { add, cut } = kit;
  add(p.darkStone, -7, 0, -7, 14, 2, 14);
  // A tapered, hollow masonry tower, with an oak gallery around its waist.
  for (let y = 2; y < 23; y++) {
    const radius = y < 10 ? 7 : y < 17 ? 6 : 5;
    add(y % 7 === 2 ? p.white : p.cream, -radius, y, -radius, radius * 2, 1, 2);
    add(p.cream, -radius, y, radius - 2, radius * 2, 1, 2);
    for (const x of [-radius, radius - 2]) add(p.cream, x, y, -radius + 2, 2, 1, radius * 2 - 4);
  }
  cut(-2, 2, 5, 4, 6, 2);
  for (const x of [-3, 2]) add(p.timber, x, 2, 6, 1, 6, 1);
  add(p.wood, -3, 8, 6, 6, 1, 1);
  add(p.wood, -8, 10, -8, 16, 1, 16);
  cut(-5, 10, -5, 10, 1, 10);
  for (const x of [-8, -4, 3, 7]) for (const z of [-8, 7]) add(p.timber, x, 11, z, 1, 3, 1);
  for (const z of [-8, 7]) add(p.wood, -8, 14, z, 16, 1, 1);
  for (const x of [-8, 7]) add(p.wood, x, 14, -8, 1, 1, 16);
  frontWindow(kit, -1, 17, -5, { width: 2, height: 3, shutter: p.blue });
  for (const x of [-6, 5]) {
    cut(x, 13, -1, 1, 3, 3);
    add(p.glass, x === -6 ? -5 : 4, 13, -1, 1, 3, 3);
    add(p.timber, x, 12, -2, 1, 1, 5);
  }
  for (let level = 0; level < 6; level++) add(level === 5 ? p.gold : p.roof, -6 + level, 23 + level, -6 + level, 12 - level * 2, 1, 12 - level * 2);
  crate(kit, -7, 2, 7); sack(kit, 3, 2, 7); sack(kit, 5, 2, 7);
  const model = kit.finish();
  const rotor = animatedPart(model, 'lattice-sails', [0, 24, 9], sails => {
    // Quarter-turns are authored as integer cells rather than angled slabs.
    const parts = [
      [0, 0, 1, 12], [0, -12, 1, 12], [-12, 0, 12, 1], [0, 0, 12, 1],
    ];
    for (const [x, y, w, h] of parts) sails.add(p.timber, x, y, 0, w, h, 1);
    for (let i = 4; i < 12; i++) {
      const fabric = i % 2 ? p.white : p.cream;
      sails.add(fabric, 1, i, 0, 3, 1, 1); sails.add(fabric, -4, -i - 1, 0, 3, 1, 1);
      sails.add(fabric, i, -4, 0, 1, 3, 1); sails.add(fabric, -i - 1, 1, 0, 1, 3, 1);
      if (i % 2 === 0) {
        sails.add(p.wood, 1, i, 1, 3, 1, 1); sails.add(p.wood, -4, -i - 1, 1, 3, 1, 1);
        sails.add(p.wood, i, -4, 1, 1, 3, 1); sails.add(p.wood, -i - 1, 1, 1, 3, 1);
      }
    }
    sails.add(p.timber, -2, -2, 0, 4, 4, 2); sails.add(p.gold, -1, -1, 2, 2, 2, 1);
  }, (part, time, working, reduced) => { part.rotation.z = -time * (reduced ? .2 : .65); });
  model.rotor = rotor;
  model.productionOnly = true;
  // The complete diagonal blade sweep participates in physics and island travel.
  model.colliders.push({ shape: 'box', x: 0, y: 11 * MODEL_VOXEL, z: 10.5 * MODEL_VOXEL,
    width: 26 * MODEL_VOXEL, height: 26 * MODEL_VOXEL, depth: 3 * MODEL_VOXEL, yaw: 0 });
  finishBuilding(model);
  model.bounds.union(new THREE.Box3(new THREE.Vector3(-2.6, 2.2, 1.8), new THREE.Vector3(2.6, 7.4, 2.4)));
  return model;
}

export function createOilPressModel() {
  const kit = voxelKit('oil-press'), { add, cut } = kit;
  add(p.darkStone, -7, 0, -6, 14, 1, 12);
  add(p.cream, -7, 1, -6, 14, 9, 2);
  for (const x of [-7, 5]) {
    add(p.cream, x, 1, -4, 2, 9, 10);
    cut(x, 4, -2, 2, 3, 3);
    add(p.glass, x === -7 ? -6 : 5, 4, -2, 1, 3, 3);
    add(p.teal, x, 3, -3, 2, 1, 5);
  }
  for (const x of [-6, 5]) add(p.teal, x, 1, 5, 1, 9, 1);
  add(p.teal, -6, 9, 5, 12, 1, 1);
  gable(kit, { x: -7, z: -6, width: 14, depth: 12, y: 10, roof: p.teal, step: 2 });
  // Oil-drop landmark sits against a dark gable, legible at gameplay distance.
  add(p.timber, -3, 10, 6, 6, 5, 1);
  add(p.gold, -1, 11, 7, 2, 3, 1); add(p.gold, -2, 11, 7, 4, 2, 1);
  add(p.gold, 0, 14, 7);
  // Exposed press frame and collecting trough, all clear of the receiving yard.
  for (const x of [-4, 2]) add(p.timber, x, 1, 1, 2, 7, 2);
  add(p.wood, -4, 8, 1, 8, 2, 2);
  add(p.copper, -3, 1, 1, 6, 1, 4);
  for (const z of [1, 4]) add(p.copper, -3, 2, z, 6, 1, 1);
  add(p.gold, -2, 2, 2, 4, 1, 2);
  add(p.metal, 4, 5, 1, 3, 1, 1);
  crate(kit, -7, 1, 6, p.gold, 4);
  for (const x of [3, 5]) can(kit, x, 1, 6);
  // Side oil reservoir with stepped shoulders and copper plumbing.
  add(p.teal, -6, 2, -3, 4, 5, 4); add(p.copper, -5, 7, -2, 2, 1, 2);
  add(p.copper, -4, 8, -1, 1, 1, 4);
  const model = kit.finish();
  animatedPart(model, 'press-platen', [0, 0, 0], part => {
    part.add(p.metal, -1, 5, 1, 2, 4, 2);
    for (const y of [5, 7]) part.add(p.timber, -2, y, 1, 4, 1, 2);
    part.add(p.wood, -3, 4, 1, 6, 1, 3);
  }, (part, time, working, reduced) => { part.position.y = Math.sin(time * (reduced ? 1 : 2.2)) * MODEL_VOXEL; });
  // Rotate around the central voxel's centre, aligned with the fixed axle.
  // Cell coordinates describe corners, so this odd-width wheel needs a half-cell origin.
  animatedPart(model, 'press-flywheel', [7, 5.5, 1.5], part => {
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      const radius = a * a + b * b;
      if (radius >= 6 && radius <= 12 || a === 0 || b === 0) part.add(radius > 6 ? p.gold : p.timber, 0, a, b);
    }
  }, (part, time, working, reduced) => { part.rotation.x = -time * (reduced ? .6 : 2.2); }, { origin: [0, -.5, -.5] });
  model.colliders.push({ shape: 'box', x: 0, y: .6, z: .5, width: 1.2, height: 1.4, depth: .6, yaw: 0 },
    { shape: 'box', x: 1.5, y: .2, z: .3, width: .2, height: 1.8, depth: 1.8, yaw: 0 });
  model.productionOnly = true;
  return finishBuilding(model);
}

export function createSiloModel() {
  const kit = voxelKit('grain-silo'), { add } = kit;
  // Stepped round footprint, galvanized shell and contrasting horizontal hoops.
  for (let x = -5; x < 5; x++) for (let z = -5; z < 5; z++) {
    const radius = Math.hypot(x + .5, z + .5);
    if (radius <= 5.2) add(p.darkStone, x, 0, z);
    if (radius <= 4.5) {
      add(p.metal, x, 1, z, 1, 12, 1);
      for (const y of [2, 7, 12]) add(p.teal, x, y, z);
    }
    for (let y = 0; y < 4; y++) if (radius <= 5 - y) add(p.roof, x, 13 + y, z);
  }
  add(p.copper, -1, 17, -1, 2, 1, 2);
  // A bright enclosed grain elevator makes the silo recognizable from its back.
  add(p.gold, -4, 1, -4, 2, 15, 2);
  add(p.timber, -3, 15, -3, 4, 1, 2);
  for (const x of [-2, 1]) add(p.timber, x, 1, 4, 1, 12, 1);
  for (let y = 2; y <= 12; y += 2) add(p.white, -1, y, 4, 2, 1, 1);
  add(p.timber, 2, 1, 3, 2, 4, 1);
  add(p.gold, 2, 2, 4, 2, 2, 1);
  const model = kit.finish();
  animatedPart(model, 'silo-vent', [0, 18, 0], part => {
    part.add(p.metal, -1, -1, -1, 2, 1, 2);
    part.add(p.white, -2, 0, -1, 4, 1, 2);
    part.add(p.teal, -1, 0, -2, 2, 1, 4);
  }, (part, time, working, reduced) => { part.rotation.y = time * (reduced ? .35 : 1.4); });
  model.colliders.push({ shape: 'box', x: 0, y: 3.4, z: 0, width: 1, height: .4, depth: 1, yaw: 0 });
  return finishBuilding(model);
}

export function createBarnModel() {
  const kit = voxelKit('cattle-barn'), { add, cut } = kit;
  add(p.darkStone, -6, 0, -5, 12, 1, 10);
  add(p.red, -6, 1, -5, 12, 6, 1);
  for (const x of [-6, 5]) add(p.red, x, 1, -4, 1, 6, 9);
  add(p.red, -6, 1, 4, 12, 6, 1);
  cut(-3, 1, 3, 6, 5, 2);
  add(p.redDark, -3, 1, 3, 6, 5, 1);
  for (const x of [-6, 5]) for (const z of [-5, 4]) add(p.white, x, 1, z, 1, 6, 1);
  for (const x of [-4, 3]) add(p.white, x, 1, 4, 1, 5, 1);
  add(p.white, -4, 6, 4, 8, 1, 1);
  add(p.white, -1, 1, 4, 1, 5, 1);
  // Stair-stepped cross braces on the recessed barn doors.
  for (let i = 0; i < 3; i++) {
    add(p.white, -3 + i, 1 + i, 4); add(p.white, 2 - i, 1 + i, 4);
  }
  for (const x of [-6, 5]) {
    cut(x, 3, -2, 1, 2, 3); add(p.dark, x === -6 ? -5 : 4, 3, -2, 1, 2, 3);
    add(p.white, x, 2, -3, 1, 1, 5);
  }
  // Broad gambrel shoulders and short upper pitch distinguish it from houses.
  for (const [inset, y] of [[0, 7], [1, 8], [2, 9], [4, 10], [6, 11]]) {
    const width = 14 - inset * 2;
    for (const z of [-5, 4]) add(p.red, -7 + inset, y, z, width, 1, 1);
    if (width <= 2) add(p.roof, -7 + inset, y, -6, width, 1, 12);
    else for (const x of [-7 + inset, 5 - inset]) add(p.roof, x, y, -6, 2, 1, 12);
  }
  add(p.white, -2, 7, 5, 4, 3, 1); add(p.dark, -1, 8, 6, 2, 1, 1);
  add(p.gold, -1, 7, 6, 2, 1, 1);
  // Small ventilated cupola; its spinning cowl adds life without door movement.
  add(p.white, -2, 12, -2, 4, 1, 4);
  add(p.dark, -1, 13, -1, 2, 1, 2);
  add(p.roof, -2, 14, -2, 4, 1, 4);
  crate(kit, -6, 1, 5, p.gold, 3); can(kit, 4, 1, 5, p.metal);
  const model = kit.finish();
  animatedPart(model, 'barn-weather-vane', [0, 16, 0], part => {
    part.add(p.copper, 0, -1, 0, 1, 2, 1);
    part.add(p.gold, -2, 1, 0, 5, 1, 1); part.add(p.gold, 2, 2, 0);
    part.add(p.gold, -2, 2, 0, 2, 1, 1);
  }, (part, time, working, reduced) => { part.rotation.y = .6 + Math.sin(time * .45) * (reduced ? .1 : .45); });
  model.colliders.push({ shape: 'box', x: .1, y: 3, z: .1, width: 1.4, height: .8, depth: 1.4, yaw: 0 });
  return finishBuilding(model);
}

export function createHomeModel(kind = 'blue') {
  const blue = kind === 'blue';
  const kit = voxelKit(`settlement-home-${kind}`), { add, cut } = kit;
  const wall = blue ? p.cream : p.white, roof = blue ? p.blue : p.red;
  add(p.darkStone, -4, 0, -4, 8, 1, 8);
  add(wall, -4, 1, -4, 8, 6, 1); add(wall, -4, 1, 3, 8, 6, 1);
  for (const x of [-4, 3]) add(wall, x, 1, -3, 1, 6, 6);
  cut(-3, 1, -4, 2, 4, 1); add(blue ? p.teal : p.redDark, -3, 1, -3, 2, 4, 1);
  add(p.wood, -4, 0, -5, 4, 1, 1);
  add(p.timber, -3, 5, -5, 3, 1, 1);
  frontWindow(kit, 1, 3, -4, { width: 2, height: 2, shutter: blue ? p.teal : p.green });
  for (const x of [-4, 3]) {
    cut(x, 3, -1, 1, 2, 2); add(p.glass, x === -4 ? -3 : 2, 3, -1, 1, 2, 2);
    add(p.white, x, 2, -2, 1, 1, 4);
  }
  gable(kit, { x: -4, z: -4, width: 8, depth: 8, y: 7, wall, roof, step: blue ? 1 : 2 });
  if (blue) {
    // Tall dormer with a tiny attic window and a steep blue roof.
    add(p.white, -1, 8, -5, 3, 3, 2); add(p.glass, 0, 9, -6);
    add(p.blue, -2, 11, -6, 5, 1, 3); add(p.blue, -1, 12, -6, 3, 1, 3);
  } else {
    // Red cottage has a low porch and a planted roof-side box.
    for (const x of [-4, 3]) add(p.wood, x, 1, -5, 1, 5, 1);
    add(p.red, -4, 6, -6, 8, 1, 3);
    add(p.wood, 0, 1, -5, 4, 1, 1);
    for (const x of [0, 2]) { add(p.green, x, 2, -5); add(p.gold, x, 3, -5); }
  }
  add(p.redDark, 2, 7, 1, 2, 5, 2); add(p.cream, 1, 12, 0, 4, 1, 4);
  add(p.dark, 2, 13, 1, 2, 1, 2);
  const model = kit.finish();
  animatedPart(model, 'cottage-shutter', [3, 4, -5], part => {
    part.add(blue ? p.teal : p.green, 0, -1, 0, 1, 2, 1);
  }, (part, time, working, reduced) => { part.rotation.y = Math.sin(time * .8) * (reduced ? .03 : .2); });
  model.front = -1;
  return finishBuilding(model);
}

export function createStorehouseModel() {
  const kit = voxelKit('settlement-storehouse-model'), { add, cut } = kit;
  // Keep the eleven-by-nine foundation and the original open receiving face.
  // Heavy piers and a broad canopy make this a public warehouse at cottage scale.
  add(p.darkStone, -5, 0, 0, 11, 1, 9);
  add(p.cream, -5, 1, 7, 11, 8, 2);
  for (const x of [-5, 4]) {
    add(p.cream, x, 1, 0, 2, 8, 7);
    add(p.stone, x, 1, 0, 2, 1, 7);
    // Recessed warehouse clerestories, above the internal stock shelves.
    cut(x, 5, 3, 2, 2, 3);
    add(p.glass, x === -5 ? -4 : 4, 5, 3, 1, 2, 3);
    add(p.timber, x, 4, 2, 2, 1, 5);
    add(p.timber, x, 7, 2, 2, 1, 5);
    add(p.timber, x, 5, 4, 2, 2, 1);
    for (const z of [0, 7]) add(p.timber, x, 2, z, 2, 7, 2);
  }
  add(p.timber, -5, 8, 0, 11, 1, 2);
  for (const x of [-5, 5]) add(p.gold, x, 3, -1, 1, 1, 1);
  // Low charcoal roof with cream stepped gables and a substantial eave course.
  gable(kit, { x: -5, z: 0, width: 11, depth: 9, y: 9, roof: p.charcoal, step: 2 });
  for (const x of [-6, 6]) add(p.timber, x, 8, 0, 1, 1, 9);
  // The loading canopy occupies the previous sign/roof overhang, without new posts in the yard.
  add(p.charcoal, -6, 8, -3, 13, 1, 3);
  add(p.charcoal, -6, 9, -1, 13, 1, 2);
  add(p.wood, -6, 7, -3, 13, 1, 1);
  for (const x of [-5, 5]) {
    add(p.timber, x, 7, -2, 1, 1, 2);
    add(p.timber, x, 6, -1, 1, 1, 1);
    add(p.gold, x, 7, -3);
  }
  // Raised grain crest: a single large identifying mark, facing the receiving yard.
  add(p.timber, -3, 10, -2, 7, 4, 1);
  add(p.timber, -2, 14, -2, 5, 1, 1);
  add(p.cream, -2, 10, -3, 5, 4, 1);
  add(p.cream, -1, 14, -3, 3, 1, 1);
  wheatEmblem(kit, 0, 10, -4);
  // Back-wall pallet racks remain visible through the open hall.
  for (const x of [-3, 3]) add(p.timber, x, 1, 6, 1, 7, 1);
  for (const y of [1, 4, 7]) add(p.wood, -3, y, 5, 7, 1, 2);
  for (const x of [-2, 1]) {
    crate(kit, x, 2, 5, p.gold, 2);
    add(p.cream, x, 5, 5, 2, 2, 2);
    add(p.wood, x, 6, 5, 1, 1, 2);
  }
  add(p.metal, 0, 9, -2, 1, 1, 8);
  // Gold-and-cream village flag, on a mast seated on the rear roof ridge.
  add(p.timber, -1, 13, 5, 3, 1, 3);
  add(p.metal, 0, 14, 6, 1, 7, 1);
  add(p.gold, 0, 21, 6, 1, 1, 1);
  const glowMaterial = new THREE.MeshStandardMaterial({ name: 'storehouse-lantern-glow',
    color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: .6, roughness: .6 });
  for (const x of [-4, 4]) {
    add(p.timber, x, 7, -2, 1, 1, 1);
    add(glowMaterial, x, 6, -2, 1, 1, 1);
    add(p.timber, x, 5, -2, 1, 1, 1);
  }
  const model = kit.finish();
  // The delivery clock freezes independently of the ambient flag when work is paused.
  const deliveryPose = (machineTime, reduced) => {
    const cycle = machineTime * Math.PI / 3;
    const progress = (1 - Math.cos(cycle)) * .5;
    return { z: (2 + progress * (reduced ? .3 : 2)) * MODEL_VOXEL,
      lift: progress * (reduced ? .25 : 1.5) };
  };
  animatedPart(model, 'storehouse-hoist-trolley', [0, 9, 2], part => {
    part.add(p.charcoal, -1, 0, -1, 3, 1, 2);
    part.add(p.gold, -1, -1, -1, 3, 1, 1);
  }, (part, time, working, reduced, machineTime) => {
    part.position.z = deliveryPose(machineTime, reduced).z;
  });
  animatedPart(model, 'storehouse-hoist-chain', [0, 9, 2], part => {
    part.add(p.metal, 0, -4, 0, 1, 4, 1);
  }, (part, time, working, reduced, machineTime) => {
    const pose = deliveryPose(machineTime, reduced);
    part.position.z = pose.z;
    part.scale.y = (4 - pose.lift) / 4;
  });
  animatedPart(model, 'storehouse-delivery-crate', [0, 1, 2], part => {
    // A banded crate carried as one rigid assembly, with its pallet underneath.
    part.add(p.timber, -2, 0, -1, 4, 1, 3);
    part.add(p.wood, -1, 1, -1, 3, 3, 3);
    for (const z of [-1, 1]) part.add(p.timber, -1, 1, z, 3, 1, 1);
    part.add(p.gold, 0, 1, -2, 1, 2, 1);
    part.add(p.metal, 0, 4, 0, 1, 1, 1);
  }, (part, time, working, reduced, machineTime) => {
    const pose = deliveryPose(machineTime, reduced);
    part.position.set(0, (1 + pose.lift) * MODEL_VOXEL, pose.z);
  });
  // Hinged one-voxel flag strips keep the cloth attached to the mast while it ripples.
  const flagMaterial = p.gold.clone();
  flagMaterial.name = 'storehouse-flag-gold';
  for (let column = 0; column < 5; column++) {
    animatedPart(model, `storehouse-flag-${column}`, [1 + column, 21, 6], part => {
      part.add(column === 0 ? p.cream : flagMaterial, 0, -3, 0, 1, column === 4 ? 2 : 3, 1);
    }, (part, time, working, reduced) => {
      part.position.z = (6 + Math.sin(time * (reduced ? .8 : 2.3) - column * .7) * column * (reduced ? .015 : .06)) * MODEL_VOXEL;
    });
  }
  model.colliders.push({ shape: 'box', x: 0, y: .2, z: .7, width: .8, height: 1.8, depth: 1.4, yaw: 0 });
  model.glowMaterial = glowMaterial;
  model.front = -1;
  finishBuilding(model);
  model.bounds.union(new THREE.Box3(new THREE.Vector3(-.4, .2, 0), new THREE.Vector3(.4, 2, 1.4)));
  return model;
}

export function createStallModel(kind = 'old-miller') {
  const oil = kind === 'oil-trader', accent = oil ? p.teal : p.red;
  const kit = voxelKit(kind), { add } = kit;
  add(p.darkStone, -5, 0, -4, 10, 1, 8);
  add(p.cream, -5, 1, -4, 10, 5, 1);
  for (const x of [-5, 4]) for (const z of [-4, 3]) add(p.timber, x, 1, z, 1, 6, 1);
  add(p.wood, -5, 2, 2, 10, 1, 2);
  for (let x = -5; x < 5; x++) add(x % 2 ? accent : p.white, x, 1, 3);
  // A sloping striped canopy, exposed shelves, and a hanging product emblem.
  for (let z = -5; z < 5; z++) for (let x = -6; x < 6; x++) {
    add(Math.floor((x + 6) / 2) % 2 ? accent : p.white, x, 8 - Math.floor((z + 5) / 4), z);
  }
  add(p.wood, -4, 3, -3, 8, 1, 2); add(p.wood, -4, 5, -3, 8, 1, 2);
  for (const x of [-3, 1]) {
    if (oil) { can(kit, x, 1, -2); can(kit, x, 3, 0); }
    else { sack(kit, x, 1, -2); sack(kit, x, 3, 0); }
  }
  crate(kit, -5, 1, 4, oil ? p.gold : p.cream);
  const model = kit.finish();
  animatedPart(model, 'trader-product-sign', [0, 8, 5], part => {
    part.add(p.timber, -2, -3, 0, 5, 4, 1);
    if (oil) {
      part.add(p.gold, -1, -2, 1, 3, 2, 1); part.add(p.gold, 0, 0, 1);
    } else {
      part.add(p.cream, -1, -2, 1, 3, 2, 1); part.add(p.wood, 0, 0, 1);
    }
  }, (part, time, working, reduced) => { part.rotation.z = Math.sin(time * 1.7) * (reduced ? .015 : .09); });
  model.colliders.push({ shape: 'box', x: .1, y: .8, z: 1.2, width: 1.2, height: 1.2, depth: .4, yaw: 0 });
  return finishBuilding(model);
}

export function createWorkshopModel() {
  const kit = voxelKit('fieldworks-workshop'), { add, cut } = kit;
  add(p.darkStone, -8, 0, -8, 17, 1, 17);
  add(p.stone, -6, 1, -6, 13, 1, 13);
  add(p.teal, -7, 1, 7, 15, 11, 1);
  for (const x of [-7, 7]) {
    add(p.teal, x, 1, -7, 1, 11, 14);
    for (const z of [-4, 2]) {
      cut(x, 5, z, 1, 4, 3); add(p.glass, x, 5, z, 1, 4, 3);
      add(p.white, x === -7 ? -8 : 8, 4, z - 1, 1, 1, 5);
      add(p.roof, x === -7 ? -8 : 8, 5, z + 1, 1, 4, 1);
    }
    for (const z of [-7, 0, 7]) add(p.roof, x, 1, z, 1, 11, 1);
  }
  for (const x of [-7, 5]) add(p.teal, x, 1, -7, 3, 11, 1);
  for (const x of [-5, 5]) add(p.roof, x, 1, -8, 1, 10, 2);
  add(p.white, -5, 10, -8, 11, 1, 2);
  for (const y of [11, 12]) add(y === 11 ? p.metal : p.white, -4, y, -8, 9, 1, 1);
  // Twin sawtooth skylights keep the recognizable Fieldworks roof family.
  for (const start of [-8, 0]) {
    for (let step = 0; step < 8; step++) {
      const y = 12 + Math.floor(step / 2);
      add(p.roof, start + step, y, -8, 1, 1, 17);
      for (const z of [-7, 7]) add(p.teal, start + step, 12, z, 1, y - 11, 1);
      add(p.white, start + step, y, -9);
    }
    add(p.glass, start + 7, 12, -6, 1, 3, 13);
    for (const z of [-6, -2, 2, 6]) add(p.metal, start + 8, 12, z, 1, 3, 1);
    add(p.roofLight, start + 8, 15, -7, 1, 1, 15);
  }
  // Bold yellow gantry, big wrench badge, workshop equipment behind the bay.
  for (const x of [-6, 6]) { add(p.darkStone, x - 1, 1, -13, 3, 1, 3); add(p.roof, x, 2, -12, 1, 11, 1); }
  add(p.gold, -7, 13, -12, 15, 2, 1);
  for (const x of [-6, -3, 0, 3, 6]) add(p.roof, x, 13, -13);
  add(p.roof, -6, 15, -8, 5, 6, 1);
  add(p.white, -4, 16, -9, 1, 3, 1); add(p.white, -5, 18, -9, 3, 1, 1);
  add(p.white, -5, 19, -9); add(p.white, -3, 19, -9);
  add(p.wood, -5, 5, 4, 10, 1, 2);
  for (const x of [-5, 4]) add(p.roof, x, 2, 4, 1, 3, 2);
  add(p.roof, -5, 7, 6, 9, 3, 1);
  for (const x of [-4, -1, 2]) { add(p.metal, x, 7, 5, 1, 2, 1); add(p.metal, x, 9, 5, 2, 1, 1); }
  add(p.red, 4, 2, 1, 2, 4, 3);
  for (const y of [3, 5]) add(p.metal, 4, y, 0, 2, 1, 1);
  for (const y of [1, 2, 3]) {
    add(p.dark, 9, y, 1, 3, 1, 1); add(p.dark, 9, y, 3, 3, 1, 1);
    add(p.dark, 9, y, 2); add(p.dark, 11, y, 2);
  }
  can(kit, 9, 1, -4, p.red); crate(kit, 9, 1, 5, p.metal);
  add(p.metal, -10, 1, 2, 3, 5, 4);
  for (const y of [2, 4]) add(p.roof, -11, y, 3, 1, 1, 2);
  add(p.metal, -5, 16, 4, 3, 1, 3); add(p.roof, -4, 17, 5, 1, 2, 1); add(p.metal, -5, 19, 4, 3, 1, 3);
  const glowMaterial = new THREE.MeshStandardMaterial({ name: 'workshop-lantern-glow', color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: .25 });
  add(p.roof, 5, 9, -10, 1, 2, 1); add(glowMaterial, 5, 7, -10, 1, 2, 1);
  add(p.roof, 4, 6, -11, 3, 1, 3); add(p.roof, 4, 9, -11, 3, 1, 3);
  const model = kit.finish();
  animatedPart(model, 'workshop-hoist', [0, 12, -12], part => {
    part.add(p.metal, -1, 0, 0, 3, 1, 2); part.add(p.roof, 0, -2, 0, 1, 2, 1);
    part.add(p.metal, 0, -3, 0, 2, 1, 1); part.add(p.metal, 1, -2, 0);
  }, (part, time, working, reduced) => {
    part.position.x = Math.sin(time * .55) * (reduced ? .08 : .4);
    part.rotation.z = Math.sin(time * 1.1) * (reduced ? .01 : .05);
  });
  model.colliders.push({ shape: 'box', x: .1, y: 1.6, z: -2.2, width: 1.4, height: 1, depth: .4, yaw: 0 });
  model.glowMaterial = glowMaterial;
  model.lightPosition = new THREE.Vector3(5.5 * MODEL_VOXEL, 8 * MODEL_VOXEL, -9.5 * MODEL_VOXEL);
  model.front = -1;
  return finishBuilding(model);
}

export const BUILDING_MODELS = [
  { id: 'windmill', name: 'Windmill', category: 'Processing', color: '#dfb44f', cue: 'Lattice sails · stone tower · oak balcony', motion: 'Four sails turn as the mill grinds grain.', create: createWindmillModel },
  { id: 'oil-press', name: 'Oil Press', category: 'Processing', color: '#499b93', cue: 'Teal roof · golden oil crest · exposed press', motion: 'The flywheel turns and the screw press rises and falls.', create: createOilPressModel },
  { id: 'workshop', name: 'Fieldworks Workshop', category: 'Machinery', color: '#edbe47', cue: 'Sawtooth skylights · yellow gantry · wrench sign', motion: 'The overhead hoist travels gently along its gantry.', create: createWorkshopModel },
  { id: 'cattle-barn', name: 'Cattle Barn', category: 'Livestock', color: '#bf5644', cue: 'Red timber · gambrel roof · hayloft · weather vane', motion: 'The rooftop weather vane catches the island breeze.', create: createBarnModel },
  { id: 'silo', name: 'Grain Silo', category: 'Storage', color: '#819c9e', cue: 'Galvanized shell · teal hoops · yellow grain elevator', motion: 'A rooftop ventilator spins above the grain store.', create: createSiloModel },
  { id: 'storehouse', name: 'Settlement Storehouse', category: 'Deliveries', color: '#d5ae45', cue: 'Golden wheat crest · charcoal roof · broad loading canopy', motion: 'A village flag ripples above the hall. Working machinery runs the crate hoist; switch it off to inspect the idle building.', create: createStorehouseModel },
  { id: 'home-blue', name: 'Bluebell Cottage', category: 'Settlement', color: '#5a91b5', cue: 'Steep blue roof · attic dormer · teal shutters', motion: 'The cottage shutter stirs in the breeze.', create: () => createHomeModel('blue') },
  { id: 'home-red', name: 'Clover Cottage', category: 'Settlement', color: '#b96c58', cue: 'Low red roof · sheltered porch · flower box', motion: 'A green shutter moves gently beside the flowers.', create: () => createHomeModel('red') },
  { id: 'old-miller', name: 'Old Miller', category: 'Trading', color: '#b76a56', cue: 'Red striped canopy · flour sacks · hanging sack sign', motion: 'The flour merchant’s sign swings beneath the awning.', create: () => createStallModel('old-miller') },
  { id: 'oil-trader', name: 'Oil Trader', category: 'Trading', color: '#4d9b89', cue: 'Teal striped canopy · golden cans · oil-drop sign', motion: 'The oil merchant’s sign swings above the counter.', create: () => createStallModel('oil-trader') },
];
