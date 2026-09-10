import { createPalletVisual } from '../../world/forage/pallet-visual.js';
import { THREE, mats } from '../../core/shared.js';
import { assembly, wheel } from './detail-model.js';

const groupFor = name => { const group = new THREE.Group(); group.name = name; return group; };
const model = (name, author) => { const v = assembly(name); author(v.add); return v.build(); };
const mount = (add, front = false) => {
  const left = front ? -11 : -7, right = front ? 9 : 5, z = front ? 0 : -4;
  for (const x of [left, right]) {
    add(mats.metal, x, 5, z, 2, 2, 2);
    add(mats.tractorDark, x, 2, z + 2, 2, 4, 4 - z);
  }
  add(mats.tractorDark, left, 2, 4, right - left + 2, 2, 2);
  add(mats.tractorDark, -1, 4, 4, 2, 9, 2);
  add(mats.metal, -2, 13, 0, 4, 2, 4);
};
const tow = add => {
  add(mats.metal, -2, 8, 0, 4, 3, 3);
  add(mats.tractorDark, -1, 8, 3, 2, 2, 9);
};
const fineWheels = (group, x, y, z, diameter = 12) => [-x, x].map(side => wheel(group, side, y, z, diameter, true));

export function createSeederAsset() {
  const group = groupFor('attachment-seeder');
  group.add(model('seeder-hopper', add => {
    mount(add);
    add(mats.tractorDark, -12, -1, 6, 24, 2, 2);
    // Tapered hopper, narrow rim, lid handles and metering outlets.
    for (let y = 0; y < 8; y++) {
      const half = 8 + Math.floor(y / 2);
      add(mats.tractorAccent, -half, y, 6, half * 2, 1, 8);
    }
    add(mats.tractorCream, -12, 8, 5, 24, 1, 10);
    for (const x of [-8, 6]) {
      add(mats.tractorDark, x, 9, 8, 2, 1, 3);
      add(mats.metal, x, -4, 9, 2, 4, 2);
      add(mats.tractorDark, x, -5, 11, 2, 1, 3);
    }
    add(mats.tractorCream, -4, 4, 14, 8, 2, 1);
  }));
  fineWheels(group, .7, -.12, .52, 6);
  return group;
}

export function createSprayerAsset() {
  const group = groupFor('attachment-sprayer');
  group.add(model('sprayer-tank-and-boom', add => {
    mount(add);
    for (let y = 0; y < 10; y++) {
      const half = y < 2 || y > 7 ? 6 : 8;
      add(mats.tractorCream, -half, y, 5, half * 2, 1, 9);
    }
    for (const z of [6, 11]) add(mats.tractorAccent, -8, 2, z, 16, 6, 1);
    add(mats.metal, -2, 10, 8, 4, 1, 3);
    // Open truss instead of a wall-sized boom.
    for (const y of [-1, 2]) add(mats.metal, -28, y, 14, 56, 1, 1);
    for (let x = -28; x <= 26; x += 6) add(mats.tractorDark, x, 0, 14, 1, 2, 1);
    for (const x of [-23, -15, -8, 0, 8, 15, 23]) {
      add(mats.tractorAccent, x, -3, 13, 1, 2, 2);
      add(mats.metal, x, -4, 13, 1, 1, 2);
    }
    for (const x of [-4, 3]) add(mats.tractorDark, x, -1, 8, 1, 1, 6);
  }));
  return group;
}

export function createMowerDeckAsset(front = false) {
  const group = groupFor(front ? 'attachment-front-mower' : 'attachment-rear-mower');
  const start = front ? -13 : 0, width = front ? 26 : 34, count = front ? 3 : 4;
  group.add(model('mower-shell', add => {
    mount(add, front);
    add(mats.tractorDark, -1, 0, 3, front ? 2 : 18, 2, 2);
    add(mats.tractorAccent, start, -2, 4, width, 2, 10);
    add(mats.tractorCream, start + 1, 0, 5, width - 2, 1, 8);
    for (const x of [start, start + width - 1]) add(mats.tractorDark, x, -4, 4, 1, 2, 10);
    add(mats.tire, start + 1, -3, 13, width - 2, 1, 1);
    for (let x = start + 3; x < start + width - 2; x += 6) add(mats.metal, x, 1, 7, 2, 1, 3);
  }));
  const rotors = groupFor('mower-rotors'); group.add(rotors);
  for (let i = 0; i < count; i++) {
    const rotor = groupFor('mower-rotor');
    rotor.position.set((start + 5 + i * 8) * .05, -.15, .425);
    rotor.userData.spinDirection = i % 2 ? -1 : 1;
    rotor.add(model('mower-cutting-disc', add => {
      for (let x = -3; x < 3; x++) for (let z = -3; z < 3; z++) {
        if (Math.hypot(x + .5, z + .5) < 3) add(mats.metal, x, -1, z);
      }
      add(mats.tractorDark, -3, -2, -1, 6, 1, 2);
    }));
    rotors.add(rotor);
  }
  return group;
}

export function createTrailerAsset() {
  const group = groupFor('attachment-trailer');
  group.add(model('trailer-underframe', add => {
    tow(add);
    for (const x of [-10, 8]) add(mats.tractorDark, x, 5, 12, 2, 3, 44);
    for (const z of [12, 28, 40, 54]) add(mats.tractorDark, -10, 5, z, 20, 3, 2);
    add(mats.metal, -14, 5, 40, 28, 2, 2);
  }));
  const bed = groupFor('trailer-bed'); bed.position.set(0, .4, 1.6); group.add(bed);
  bed.add(model('trailer-body', add => {
    add(mats.tractor, -13, 0, -20, 26, 2, 48);
    add(mats.tractorAccent, -13, 2, -20, 26, 12, 1);
    for (const x of [-14, 13]) {
      add(mats.tractorAccent, x, 0, -20, 1, 14, 48);
      for (const z of [-19, -8, 4, 16, 26]) add(mats.tractorDark, x, 2, z, 1, 12, 1);
      add(mats.tractorCream, x, 14, -20, 1, 1, 48);
    }
  }));
  const tailgate = groupFor('trailer-tailgate'); tailgate.position.set(0, .3, 1.4); bed.add(tailgate);
  tailgate.add(model('trailer-tailgate-panel', add => {
    add(mats.tractorAccent, -13, -4, 0, 26, 12, 1);
    for (const x of [-12, 10]) add(mats.metal, x, -1, 1, 2, 2, 1);
    add(mats.tractorCream, -13, 8, 0, 26, 1, 1);
  }));
  const grain = groupFor('trailer-grain');
  grain.add(model('grain-fill', add => add(mats.wheatRipe, -11, 0, -17, 22, 4, 34)));
  grain.position.set(0, .2, .1); grain.visible = false; bed.add(grain);
  const wheels = fineWheels(group, .8, .3, 2.04);
  return { group, wheels, bed, tailgate, grain };
}

export function createBalerAsset() {
  const group = groupFor('attachment-baler');
  group.add(model('baler-housing', add => {
    tow(add);
    add(mats.tractorDark, -12, 5, 12, 24, 2, 24);
    for (const x of [-13, 11]) {
      add(mats.tractorAccent, x, 7, 12, 2, 14, 24);
      for (const z of [16, 20, 24]) add(mats.tractorDark, x, 13, z, 2, 1, 2);
    }
    add(mats.tractor, -11, 7, 12, 22, 14, 2);
    add(mats.tractorCream, -13, 21, 12, 26, 1, 24);
    add(mats.tractorAccent, -11, 22, 14, 22, 1, 20);
    add(mats.metal, -2, 3, 1, 4, 1, 7);
    for (const x of [-13, 11]) add(mats.tractorDark, x, 4, 3, 2, 3, 9);
  }));
  const pickup = groupFor('baler-pickup'); pickup.position.set(0, .25, .2); group.add(pickup);
  pickup.add(model('baler-pickup-drums', add => {
    for (const begin of [-11, 3]) for (let y = -3; y < 3; y++) for (let z = -3; z < 3; z++) {
      if (Math.hypot(y + .5, z + .5) < 3) add(mats.metal, begin, y, z, 8);
    }
    for (const x of [-10, -7, -4, 3, 6, 9]) {
      add(mats.tractorCream, x, -1, -4, 1, 2, 1);
      add(mats.tractorCream, x, -1, 3, 1, 2, 1);
    }
  }));
  const chute = groupFor('baler-chute'); chute.position.set(0, .25, 1.8); group.add(chute);
  chute.add(model('bale-ejection-tray', add => {
    add(mats.tractorDark, -11, 0, 0, 22, 1, 13);
    for (const x of [-11, 10]) add(mats.metal, x, 1, 0, 1, 1, 13);
  }));
  const formingBale = groupFor('baler-forming-bale'); formingBale.position.set(0, .6, 1.62);
  formingBale.add(model('forming-bale', add => {
    add(mats.bale, -8, -5, -11, 16, 10, 22);
    for (const z of [-6, 5]) {
      for (const y of [-5, 4]) add(mats.baleBand, -8, y, z, 16, 1, 2);
      for (const x of [-8, 7]) add(mats.baleBand, x, -4, z, 1, 8, 2);
    }
  }));
  formingBale.visible = false; group.add(formingBale);
  const wheels = fineWheels(group, .77, .275, 1.16, 11);
  return { group, wheels };
}

export function createLiquidTankAsset() {
  const group = groupFor('attachment-liquid-tank');
  group.add(model('liquid-tank-and-frame', add => {
    tow(add);
    for (const x of [-10, 8]) add(mats.tractorDark, x, 5, 12, 2, 3, 36);
    for (const z of [12, 34, 46]) add(mats.tractorDark, -10, 5, z, 20, 3, 2);
    // Fine circular cross section and inset bands, all made from small blocks.
    for (let x = -12; x < 12; x++) for (let y = 8; y < 32; y++) {
      if (Math.hypot(x + .5, y + .5 - 20) > 12) continue;
      for (let z = 13; z < 46; z++) add(z === 18 || z === 38 ? mats.tractorAccent : mats.tractorCream, x, y, z);
    }
    add(mats.metal, -3, 32, 27, 6, 1, 5);
    for (const x of [-8, 6]) for (const z of [17, 38]) add(mats.tractorDark, x, 8, z, 2, 3, 2);
    for (const z of [43, 47]) add(mats.metal, 12, 7, z, 1, 18, 1);
    for (const y of [8, 12, 16, 20, 24]) add(mats.metal, 12, y, 44, 1, 1, 3);
    add(mats.tractorDark, 12, 10, 25, 1, 17, 5);
  }));
  const liquid = groupFor('tank-level-gauge');
  liquid.add(model('liquid-level', add => add(mats.tractorCream, 0, -8, -3, 1, 16, 6)));
  liquid.position.set(.65, .92, 1.45); liquid.visible = false; group.add(liquid);
  const outlet = groupFor('tank-outlet'); outlet.position.set(.4, .4, 2.3); group.add(outlet);
  outlet.add(model('outlet-valve', add => {
    add(mats.metal, 0, 0, 0, 2, 2, 7);
    add(mats.tractorAccent, -1, 2, 2, 4, 1, 1);
  }));
  const wheels = fineWheels(group, .76, .3, 1.85);
  return { group, wheels, liquid, outlet };
}

export function createFrontAsset(type) {
  if (type === 'front-mower') return createMowerDeckAsset(true);
  const group = groupFor(`attachment-${type}`);
  group.add(model('front-tool-mount', add => {
    mount(add, true);
    if (type === 'loader') for (const x of [-11, 9]) add(mats.tractorDark, x, 6, 4, 2, 5, 2);
  }));
  if (type === 'loader') {
    // Inclined booms are slim rotated block assemblies; the bucket is hollow.
    for (const x of [-.5, .5]) {
      const arm = groupFor('loader-boom'); arm.position.set(x, .45, .3); arm.rotation.x = .25;
      arm.add(model('loader-boom-rail', add => {
        add(mats.tractor, -1, 0, 0, 2, 2, 18);
        add(mats.metal, -1, -1, 2, 2, 1, 12);
      })); group.add(arm);
    }
    const bucket = groupFor('loader-bucket'); bucket.position.set(0, .45 - .9 * Math.sin(.25), .3 + .9 * Math.cos(.25)); bucket.rotation.x = .25;
    bucket.add(model('loader-bucket-shell', add => {
      add(mats.metal, -14, 0, 0, 28, 1, 11);
      add(mats.metal, -14, 1, 0, 28, 7, 1);
      for (const x of [-14, 13]) add(mats.metal, x, 1, 1, 1, 6, 10);
      add(mats.tractorCream, -14, 0, 11, 28, 1, 2);
    })); group.add(bucket);
  } else if (type === 'forks' || type === 'bale-fork') {
    group.add(model('fork-carriage', add => {
      for (const y of [1, 10]) add(mats.tractorAccent, -12, y, 6, 24, 2, 2);
      for (const x of [-12, 10]) add(mats.tractorDark, x, 3, 6, 2, 7, 2);
      for (const x of [-7, 5]) {
        add(mats.metal, x, -3, 7, 2, 14, 1);
        add(mats.metal, x, -3, 8, 2, 1, type === 'bale-fork' ? 20 : 18);
        if (type === 'bale-fork') add(mats.metal, x, -3, 28, 1, 1, 3);
      }
    }));
  } else {
    group.add(model('front-ballast', add => {
      for (let x = -12; x < 12; x += 3) {
        add(mats.tractorDark, x, 0, 6, 2, 10, 8);
        add(mats.tractor, x, 10, 7, 2, 1, 6);
      }
      add(mats.metal, -12, 5, 6, 24, 2, 1);
    }));
  }
  return group;
}

// Four fixed slots share the articulated implement transform.
export const PALLET_SLOTS = [
  { x: -.46, y: .5, z: 1.2 }, { x: .46, y: .5, z: 1.2 },
  { x: -.46, y: .5, z: 2.42 }, { x: .46, y: .5, z: 2.42 },
];

export function createFlatbedAsset() {
  const group = groupFor('attachment-flatbed');
  group.add(model('flatbed-frame', add => {
    tow(add);
    for (const x of [-17, 15]) add(mats.tractorDark, x, 5, 12, 2, 3, 49);
    for (const z of [12, 30, 40, 59]) add(mats.tractorDark, -18, 5, z, 36, 3, 2);
    add(mats.metal, -21, 5, 40, 42, 2, 2);
    add(mats.trunk, -19, 8, 12, 38, 2, 49);
    for (const x of [-20, 19]) add(mats.tractor, x, 8, 12, 1, 2, 49);
    add(mats.tractorAccent, -20, 10, 12, 40, 4, 1);
    for (const x of [-18, 14]) add(mats.tractorAccent, x, 6, 61, 4, 2, 1);
  }));
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const pallets = PALLET_SLOTS.map(slot => {
    const pallet = createPalletVisual(geometry);
    pallet.position.set(slot.x, slot.y, slot.z);
    pallet.visible = false;
    group.add(pallet);
    return pallet;
  });
  return { group, pallets, wheels: fineWheels(group, 1.08, .3, 2.04) };
}
