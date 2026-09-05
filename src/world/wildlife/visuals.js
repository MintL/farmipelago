import { MODEL_VOXEL, THREE, box } from '../../core/shared.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reindeerCoat = new THREE.MeshStandardMaterial({ color: 0x76513d, roughness: .96 });
const reindeerDark = new THREE.MeshStandardMaterial({ color: 0x3e2d27, roughness: .98 });
const reindeerCream = new THREE.MeshStandardMaterial({ color: 0xc8ad88, roughness: .96 });
const antlerMaterial = new THREE.MeshStandardMaterial({ color: 0x9a7956, roughness: .98 });
const foxCoat = new THREE.MeshStandardMaterial({ color: 0xc65f32, roughness: .94 });
const foxDark = new THREE.MeshStandardMaterial({ color: 0x3a2927, roughness: .98 });
const foxCream = new THREE.MeshStandardMaterial({ color: 0xead7b7, roughness: .94 });
const snowFoxCoat = new THREE.MeshStandardMaterial({ color: 0xe8efec, roughness: .94 });
const snowFoxDark = new THREE.MeshStandardMaterial({ color: 0x89999e, roughness: .98 });
const snowFoxCream = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92 });

const voxel = (width, height, depth, material) =>
  box(width * MODEL_VOXEL, height * MODEL_VOXEL, depth * MODEL_VOXEL, material);

export function jumpMotion(progress, height = 0) {
  if (!Number.isFinite(progress)) return { active: false, height: 0, x: 1, y: 1, z: 1, pitch: 0 };
  const amount = THREE.MathUtils.clamp(progress, 0, 1);
  const airAmount = THREE.MathUtils.clamp((amount - .12) / .72, 0, 1);
  const arc = Math.sin(airAmount * Math.PI);
  if (reducedMotion) return { active: true, height: arc * height, x: 1, y: 1, z: 1, pitch: 0 };
  const anticipation = amount < .18 ? Math.sin(amount / .18 * Math.PI) * .22 : 0;
  const landing = amount > .8 ? Math.sin((amount - .8) / .2 * Math.PI) * .28 : 0;
  const stretch = arc * .17;
  return {
    active: true,
    height: arc * height,
    x: 1 + (anticipation + landing) * .72 - stretch * .28,
    y: 1 - anticipation - landing + stretch,
    z: 1 + (anticipation + landing) * .72 - stretch * .28,
    pitch: Math.cos(airAmount * Math.PI) * arc * .11,
  };
}

function addLeg(group, x, z, material, phase) {
  const pivot = new THREE.Group();
  pivot.position.set(x, .72, z);
  const leg = voxel(1, 3, 1, material);
  leg.position.y = -.3;
  const hoof = voxel(1, 1, 1, reindeerDark);
  hoof.position.set(0, -.62, -.025);
  pivot.add(leg, hoof);
  pivot.userData.phase = phase;
  group.add(pivot);
  return pivot;
}

export function createReindeerVisual(scale = 1) {
  const group = new THREE.Group();
  group.name = 'wild-reindeer';
  group.scale.setScalar(scale);
  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  const body = voxel(3, 3, 5, reindeerCoat);
  body.position.set(0, .9, .08);
  const chest = voxel(3, 2, 1, reindeerCream);
  chest.position.set(0, .86, -.52);
  const neck = voxel(2, 4, 2, reindeerCoat);
  neck.position.set(0, 1.16, -.52);
  bodyRig.add(body, chest, neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.35, -.64);
  const head = voxel(2, 2, 3, reindeerCoat);
  head.position.z = -.18;
  const muzzle = voxel(2, 1, 1, reindeerCream);
  muzzle.position.set(0, -.08, -.57);
  const nose = voxel(1, 1, 1, reindeerDark);
  nose.position.set(0, -.08, -.76);
  headPivot.add(head, muzzle, nose);
  for (const side of [-1, 1]) {
    const ear = voxel(1, 1, 1, reindeerDark);
    ear.position.set(side * .29, .18, -.1);
    headPivot.add(ear);
    const antler = new THREE.Group();
    antler.position.set(side * .14, .15, -.1);
    const stem = voxel(1, 2, 1, antlerMaterial);
    stem.position.y = .2;
    const beam = voxel(2, 1, 1, antlerMaterial);
    beam.position.set(side * .1, .37, -.03);
    const tine = voxel(1, 1, 1, antlerMaterial);
    tine.position.set(side * .24, .52, -.03);
    antler.add(stem, beam, tine);
    headPivot.add(antler);
  }
  bodyRig.add(headPivot);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.03, .61);
  const tail = voxel(1, 2, 1, reindeerCream);
  tail.position.set(0, .05, .13);
  tail.rotation.x = -.55;
  tailPivot.add(tail);
  bodyRig.add(tailPivot);

  const legs = [
    addLeg(group, -.2, -.3, reindeerDark, 0),
    addLeg(group, .2, -.3, reindeerDark, Math.PI),
    addLeg(group, -.2, .36, reindeerDark, Math.PI),
    addLeg(group, .2, .36, reindeerDark, 0),
  ];
  const bodyBase = bodyRig.position.y;
  return {
    group,
    animate(elapsed, speed, jump) {
      const moving = speed > .02;
      const pace = 6.2;
      const gait = moving && !reducedMotion ? Math.sin(elapsed * pace + group.id * .37) : 0;
      const swing = .42;
      legs.forEach(leg => {
        leg.rotation.x = jump.active ? -.52 + Math.cos(leg.userData.phase) * .1 : gait * swing * Math.cos(leg.userData.phase);
      });
      bodyRig.position.y = bodyBase + (moving && !reducedMotion && !jump.active ? Math.abs(gait) * .04 : 0);
      bodyRig.rotation.x = jump.pitch;
      headPivot.rotation.x = moving ? -.04 : Math.sin(elapsed * 1.25 + group.id) * (reducedMotion ? .025 : .075);
      tailPivot.rotation.z = Math.sin(elapsed * 2.2 + group.id) * (reducedMotion ? .04 : jump.active ? .28 : .2);
      group.scale.set(scale * jump.x, scale * jump.y, scale * jump.z);
    },
  };
}

export function createFoxVisual(scale = 1, snow = false) {
  const coatMaterial = snow ? snowFoxCoat : foxCoat;
  const darkMaterial = snow ? snowFoxDark : foxDark;
  const creamMaterial = snow ? snowFoxCream : foxCream;
  const group = new THREE.Group();
  group.name = snow ? 'wild-snow-fox' : 'wild-fox';
  group.scale.setScalar(scale);
  const bodyRig = new THREE.Group();
  group.add(bodyRig);

  const body = voxel(2, 2, 4, coatMaterial);
  body.position.set(0, .52, .06);
  const chest = voxel(2, 2, 1, creamMaterial);
  chest.position.set(0, .54, -.38);
  bodyRig.add(body, chest);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, .68, -.48);
  const head = voxel(2, 2, 2, coatMaterial);
  const muzzle = voxel(2, 1, 2, creamMaterial);
  muzzle.position.set(0, -.08, -.28);
  const nose = voxel(1, 1, 1, foxDark);
  nose.position.set(0, -.08, -.5);
  headPivot.add(head, muzzle, nose);
  for (const side of [-1, 1]) {
    const ear = voxel(1, 2, 1, darkMaterial);
    ear.position.set(side * .18, .28, 0);
    headPivot.add(ear);
  }
  bodyRig.add(headPivot);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, .59, .47);
  const tailBase = voxel(2, 2, 3, coatMaterial);
  tailBase.position.set(0, .02, .25);
  tailBase.rotation.x = -.28;
  const tailTip = voxel(2, 2, 2, creamMaterial);
  tailTip.position.set(0, -.08, .62);
  tailPivot.add(tailBase, tailTip);
  bodyRig.add(tailPivot);

  const legs = [];
  for (const [x, z, phase] of [[-.13, -.2, 0], [.13, -.2, Math.PI], [-.13, .25, Math.PI], [.13, .25, 0]]) {
    const leg = new THREE.Group();
    leg.position.set(x, .4, z);
    const limb = voxel(1, 2, 1, darkMaterial);
    limb.position.y = -.2;
    leg.add(limb);
    leg.userData.phase = phase;
    group.add(leg);
    legs.push(leg);
  }
  return {
    group,
    animate(elapsed, speed, jump) {
      const moving = speed > .02;
      const pace = 7.4;
      const gait = moving && !reducedMotion ? Math.sin(elapsed * pace + group.id * .29) : 0;
      legs.forEach(leg => {
        leg.rotation.x = jump.active ? -.68 + Math.cos(leg.userData.phase) * .12 : gait * .48 * Math.cos(leg.userData.phase);
      });
      bodyRig.position.y = moving && !reducedMotion && !jump.active ? Math.abs(gait) * .035 : 0;
      bodyRig.rotation.x = jump.pitch * 1.25;
      headPivot.rotation.x = moving ? -.025 : Math.sin(elapsed * 1.7 + group.id) * (reducedMotion ? .025 : .08);
      tailPivot.rotation.y = Math.sin(elapsed * 2.5 + group.id) * (reducedMotion ? .05 : jump.active ? .38 : .28);
      tailPivot.rotation.x = jump.active ? -.2 : 0;
      group.scale.set(scale * jump.x, scale * jump.y, scale * jump.z);
    },
  };
}
