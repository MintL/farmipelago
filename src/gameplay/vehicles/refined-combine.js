import { THREE, mats } from '../../core/shared.js';
import { assembly, wheel } from './detail-model.js';

const groupFor = name => { const group = new THREE.Group(); group.name = name; return group; };

export function createCombineAsset() {
  const group = groupFor('combine-harvester');
  const body = assembly('combine-body');
  const add = body.add;
  // Slim chassis, engine housing, recessed vents and rear access panels.
  add(mats.combineDark, -13, 8, -18, 26, 4, 40);
  add(mats.combine, -13, 12, -8, 26, 12, 30);
  add(mats.combineAccent, -13, 18, -2, 26, 4, 22);
  for (const x of [-14, 13]) {
    add(mats.combine, x, 14, 5, 1, 10, 15);
    for (const z of [7, 10, 13, 16]) add(mats.combineDark, x, 17, z, 1, 5, 1);
    add(mats.metal, x, 15, 5, 1, 1, 2);
  }
  add(mats.combineDark, -10, 13, 22, 20, 7, 1);
  for (const x of [-11, 8]) add(mats.red, x, 19, 23, 3, 2, 1);
  add(mats.metal, -13, 8, 22, 26, 2, 2);
  // Grain hopper has real wall thickness and a recessed inset lid.
  add(mats.combineDark, -11, 24, 4, 22, 1, 16);
  for (const x of [-12, 11]) add(mats.combine, x, 25, 3, 1, 9, 18);
  for (const z of [3, 20]) add(mats.combine, -11, 25, z, 22, 9, 1);
  add(mats.combineCream, -11, 32, 4, 22, 1, 16);
  for (const x of [-13, 12]) add(mats.combineDark, x, 34, 2, 1, 1, 20);
  for (const z of [2, 21]) add(mats.combineDark, -12, 34, z, 24, 1, 1);
  // Forward-offset glazed cab, with slender posts and an interior seat.
  add(mats.combineDark, -12, 22, -17, 17, 2, 16);
  for (const x of [-12, 3]) for (const z of [-17, -3]) add(mats.combineDark, x, 24, z, 2, 15, 2);
  for (const z of [-17, -2]) add(mats.cab, -10, 27, z, 13, 11, 1);
  for (const x of [-12, 4]) add(mats.cab, x, 27, -15, 1, 11, 12);
  for (const z of [-17, -2]) add(mats.combine, -10, 24, z, 13, 3, 1);
  for (const x of [-12, 4]) add(mats.combine, x, 24, -15, 1, 3, 12);
  add(mats.combineCream, -13, 39, -18, 19, 2, 18);
  add(mats.combine, -12, 41, -17, 17, 1, 16);
  add(mats.tire, -8, 25, -9, 8, 2, 5);
  add(mats.tire, -8, 27, -5, 8, 6, 1);
  add(mats.combineDark, -8, 27, -14, 8, 2, 2);
  add(mats.metal, -5, 29, -13, 2, 3, 1);
  add(mats.combineCream, -7, 32, -13, 6, 1, 1);
  for (const x of [-11, 1]) add(mats.headlamp, x, 37, -18, 3, 2, 1);
  add(mats.combineDark, -5, 42, -9, 3, 1, 3);
  add(mats.headlamp, -4, 43, -8, 2, 2, 2);
  // Exhaust and a ladder in the clear space between the wheel envelopes.
  add(mats.combineDark, 8, 24, 11, 2, 17, 2);
  add(mats.metal, 7, 41, 10, 4, 1, 4);
  for (const z of [9, 10]) add(mats.combineDark, -16, 7, z, 1, 18, 1);
  for (const y of [7, 11, 15, 19, 23]) add(mats.metal, -16, y, 9, 4, 1, 2);
  // Auger bearing is contiguous with the engine wall and the pipe pivot.
  add(mats.combineDark, 13, 27, 13, 2, 2, 2);
  group.add(body.build());

  const wheelMats = { hub: mats.combineAccent, cap: mats.combineCream, tread: mats.combineDark };
  const wheels = [];
  for (const x of [-.86, .86]) wheels.push(wheel(group, x, .6, -.16, 24, false, { ...wheelMats, width: 6 }));
  for (const x of [-.85, .85]) wheels.push({ ...wheel(group, x, .375, .95, 15, false, wheelMats), steer: true });

  const auger = groupFor('combine-unloading-auger'); auger.position.set(.75, 1.4, .7); group.add(auger);
  const pipe = assembly('combine-auger-pipe');
  pipe.add(mats.combineAccent, 0, -1, -1, 28, 2, 2);
  for (const x of [3, 16, 26]) pipe.add(mats.combineCream, x, -1, -1, 1, 2, 2);
  auger.add(pipe.build());
  const augerTip = groupFor('combine-auger-outlet'); augerTip.position.set(1.4, -.1, 0); auger.add(augerTip);
  const tip = assembly('combine-outlet-blocks'); tip.add(mats.combineDark, 0, -1, -1, 3, 4, 2); augerTip.add(tip.build());

  // Preserve the existing header and reel pivots used by the animation system.
  const header = groupFor('combine-header'); header.position.set(0, .42, -1.72); group.add(header);
  const deck = assembly('combine-header-frame');
  deck.add(mats.combineDark, -33, -1, -6, 66, 2, 12);
  deck.add(mats.combine, -33, 1, 5, 66, 5, 1);
  deck.add(mats.metal, -35, -2, -8, 70, 1, 2);
  for (let x = -32; x <= 32; x += 4) deck.add(mats.combineAccent, x, -2, -12, 1, 1, 4);
  for (const x of [-34, 33]) {
    deck.add(mats.combineAccent, x, -1, -7, 1, 3, 13);
    deck.add(mats.combineDark, x, 2, -4, 1, 7, 2);
  }
  // Feeder throat moves with the header and reaches the chassis underside.
  deck.add(mats.combineDark, -7, 1, 6, 14, 3, 10);
  deck.add(mats.combine, -6, 4, 6, 12, 1, 10);
  header.add(deck.build());
  const reel = groupFor('combine-header-reel'); reel.position.set(0, .42, -.16); header.add(reel);
  const rotor = assembly('combine-reel');
  rotor.add(mats.combineDark, -33, -1, -1, 66, 2, 2);
  // Small-block open spokes and six bats share a single occupied-cell map.
  for (const x of [-31, 30]) for (let y = -6; y < 6; y++) for (let z = -6; z < 6; z++) {
    const r = Math.hypot(y + .5, z + .5);
    if (r <= 6 && (r > 5 || Math.abs(y + .5) < 1 || Math.abs(z + .5) < 1)) rotor.add(mats.combineAccent, x, y, z);
  }
  for (const [y, z] of [[5, 0], [2, 5], [-3, 5], [-6, -1], [-3, -6], [2, -6]]) {
    rotor.add(mats.combineCream, -30, y, z, 60, 1, 1);
  }
  reel.add(rotor.build());
  return { group, wheels, header, reel, auger, augerTip };
}
