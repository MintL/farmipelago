import { THREE, mats } from '../../core/shared.js';
import { assembly, wheel } from './detail-model.js';

export function createTractorAsset() {
  const group = new THREE.Group(); group.name = 'farm-tractor';
  const v = assembly('tractor-detailed-body');
  const headlampMaterial = mats.headlamp.clone(); headlampMaterial.emissiveIntensity = .12;
  // Slim blue body, raised bonnet and an inset grille with individual slats.
  v.add(mats.tractorDark, -8, 6, -16, 16, 4, 32);
  v.add(mats.tractor, -8, 10, -18, 16, 6, 18);
  v.add(mats.tractorAccent, -8, 16, -18, 16, 3, 15);
  v.add(mats.tractorAccent, -7, 19, -17, 14, 1, 13);
  v.add(mats.tractorCream, -2, 20, -17, 4, 1, 13);
  v.add(mats.tractorDark, -5, 12, -19, 10, 5, 1);
  for (let x = -4; x <= 4; x += 2) v.add(mats.metal, x, 12, -20, 1, 5, 1);
  for (const x of [-8, 5]) v.add(headlampMaterial, x, 16, -19, 3, 3, 1);
  v.add(mats.metal, -10, 8, -20, 20, 2, 3);
  // Cab glazing fits between slender posts, with a real seat and dashboard.
  v.add(mats.tractorDark, -8, 10, 0, 16, 2, 14);
  for (const x of [-8, 6]) for (const z of [0, 12]) v.add(mats.tractorDark, x, 12, z, 2, 18, 2);
  for (const z of [0, 13]) {
    v.add(mats.cab, -6, 18, z, 12, 11, 1);
    v.add(mats.tractor, -6, 12, z, 12, 6, 1);
  }
  for (const x of [-8, 7]) {
    v.add(mats.cab, x, 18, 2, 1, 11, 10);
    v.add(mats.tractor, x, 12, 2, 1, 6, 10);
    v.add(mats.metal, x, 17, 5, 1, 1, 3);
  }
  v.add(mats.tractorCream, -9, 30, -1, 18, 2, 16);
  v.add(mats.tractorAccent, -8, 32, 0, 16, 1, 14);
  v.add(mats.tractorDark, -2, 33, 5, 4, 1, 4);
  v.add(mats.headlamp, -1, 34, 6, 2, 2, 2);
  v.add(mats.tire, -4, 15, 6, 8, 2, 6);
  v.add(mats.tire, -4, 17, 10, 8, 7, 2);
  v.add(mats.tractorDark, -4, 18, 2, 8, 2, 2);
  // Exhaust, mirrors, rear lamps and wheel-clear mudguards.
  v.add(mats.tractorDark, -7, 20, -14, 2, 10, 2);
  v.add(mats.metal, -8, 30, -15, 4, 1, 4);
  for (const x of [-12, 10]) {
    v.add(mats.tractorDark, x, 25, 0, 2, 1, 3);
    v.add(mats.metal, x, 23, -1, 2, 4, 1);
  }
  for (const x of [-10, 8]) v.add(mats.tractorDark, x, 25, 1, 2, 1, 1);
  for (const x of [-9, 8]) v.add(mats.tractor, x, 19, 5, 1, 1, 5);
  for (const x of [-15, 9]) {
    v.add(mats.tractor, x, 19, 3, 6, 2, 14);
    v.add(mats.tractorCream, x, 21, 4, 6, 1, 12);
    v.add(mats.red, x + 1, 17, 16, 4, 2, 1);
  }
  for (const x of [-10, 8]) v.add(mats.metal, x, 5, 0, 2, 1, 2);
  for (const x of [-9, 8]) v.add(mats.tractorDark, x, 6, 0, 1, 5, 1);
  // Mounting bosses terminate at the same faces as the existing lift links.
  for (const x of [-8, 4]) v.add(mats.tractorDark, x, 6, 14, 4, 4, 2);
  v.add(mats.tractorDark, -2, 14, 14, 4, 4, 2);
  group.add(v.build());
  // Angled steering yoke, assembled separately inside the glazing.
  const steering = assembly('tractor-steering');
  steering.add(mats.tractorDark, -1, 0, -1, 2, 4, 2);
  steering.add(mats.tractorCream, -3, 4, -1, 6, 1, 1);
  const steeringModel = steering.build(); steeringModel.position.set(0, 1 + .05 * Math.sin(.3), .19); steeringModel.rotation.x = -.3;
  group.add(steeringModel);
  const hitch = assembly('tractor-tow-clevis');
  hitch.add(mats.tractorDark, -3, 5, 16, 6, 2, 11);
  hitch.add(mats.metal, -3, 12, 20, 6, 2, 7);
  hitch.add(mats.tractorDark, -3, 7, 16, 6, 5, 4);
  const towHitch = hitch.build(); group.add(towHitch);
  const wheels = [];
  for (const x of [-.61, .61]) {
    wheels.push(wheel(group, x, .325, -.4, 13, true));
    wheels.push(wheel(group, x, .425, .5, 17, false));
  }
  const headlights = [];
  for (const x of [-.325, .325]) {
    const beam = new THREE.SpotLight(0xffd68a, 0, 9, .36, .62, 1.45);
    beam.name = `tractor-headlight-${x < 0 ? 'left' : 'right'}`;
    beam.position.set(x, .875, -.97); beam.visible = false;
    const target = new THREE.Object3D(); target.position.set(x, .38, -7.2);
    group.add(beam, target); beam.target = target; headlights.push(beam);
  }
  return { group, wheels, headlights, headlampMaterial, towHitch };
}

export function createPloughAsset() {
  const group = new THREE.Group(); group.name = 'attachment-plough';
  const v = assembly('plough-frame');
  // Fine steel frame retains all three existing linkage socket faces.
  v.add(mats.tractorAccent, -16, 1, 2, 32, 2, 3);
  for (const x of [-7, 5]) {
    v.add(mats.tractorDark, x, 3, -2, 2, 3, 7);
    v.add(mats.metal, x, 5, -4, 2, 2, 2);
  }
  v.add(mats.tractorDark, -1, 3, 2, 2, 10, 2);
  v.add(mats.metal, -2, 13, 0, 4, 2, 2);
  v.add(mats.tractorDark, -6, 10, 2, 12, 1, 2);
  group.add(v.build());
  // Four swept shares: each shank and blade share one rotated local assembly,
  // with disjoint cells even at the steel cutting edge.
  for (const x of [-.6, -.2, .2, .6]) {
    const share = assembly('plough-share');
    share.add(mats.tractorDark, -1, -7, 0, 2, 7, 2);
    share.add(mats.tractor, -3, -8, 0, 6, 1, 6);
    share.add(mats.tractorAccent, -3, -7, 2, 2, 1, 3);
    share.add(mats.metal, -3, -8, 6, 6, 1, 2);
    const model = share.build();
    model.rotation.set(-.24, -.28, 0);
    const topCorner = new THREE.Vector3(.05, 0, .1).applyEuler(model.rotation);
    model.position.set(x, .05 - topCorner.y, .15);
    group.add(model);
  }
  return group;
}
