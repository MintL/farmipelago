import { THREE } from '../../core/shared.js';

export function chooseGrassPatches(cells, random, count) {
  const patches = [];
  const candidates = [...cells];
  while (candidates.length && patches.length < count) {
    const candidate = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
    if (patches.some(patch => Math.hypot(patch.dx - candidate.dx, patch.dz - candidate.dz) < 2.7)) continue;
    patches.push({ ...candidate, radius: 1.55 + random() * .75 });
  }
  return patches;
}

export function chooseTreeSilhouette(profile, random) {
  const choices = [
    { value: 0, weight: .35 + profile.shady * .45 },
    { value: 1, weight: .35 + profile.wet * .35 },
    { value: 2, weight: profile.veryWet * profile.veryShady * 4.2 },
    { value: 3, weight: profile.veryWet * profile.shady * 3.4 },
    { value: 4, weight: profile.shady * (1 - profile.veryDry) * 2.4 },
    { value: 5, weight: profile.dry * (.45 + profile.shady) * 2.8 },
  ];
  return weightedChoice(choices, random);
}

export function treeFoliagePalette(profile) {
  const rainforest = profile.veryWet * profile.veryShady;
  const yellowing = profile.dry * (.35 + profile.sunny * .65);
  if (rainforest > .48) return { key: 'rainforest', dark: 0x28563f, light: 0x4a8663 };
  if (profile.wet * profile.shady > .35) return { key: 'jungle', dark: 0x3e6a4d, light: 0x699b68 };
  if (yellowing > .62) return { key: 'golden-dry', dark: 0x7c7048, light: 0xa59358 };
  if (profile.dry > .45) return { key: 'dry-olive', dark: 0x696e46, light: 0x91905c };
  if (profile.sunny > .58) return { key: 'sunny-lush', dark: 0x618355, light: 0x8eaa68 };
  return { key: 'woodland', dark: 0x50754d, light: 0x789361 };
}

export function chooseGroundCover(profile, nearWater, random) {
  return weightedChoice([
    { value: 'flowers', weight: profile.sunny * (.25 + profile.wet * 1.5) },
    { value: 'ferns', weight: profile.wet * profile.shady * (1 + nearWater) * 1.7 },
    { value: 'reeds', weight: profile.wet * nearWater * 3.2 },
    { value: 'leafyBush', weight: profile.wet * (.35 + profile.shady) * 1.2 },
    { value: 'yellowGrass', weight: profile.dry * profile.sunny * 2.4 },
    { value: 'darkGrass', weight: profile.wet * profile.shady * 2.1 },
    { value: 'mushrooms', weight: profile.wet * profile.veryShady * 1.15 },
    { value: 'dryScrub', weight: profile.dry * (.35 + profile.sunny) * (1 - nearWater) * 1.8 },
    { value: 'brightGrass', weight: .18 + profile.sunny * (1 - profile.veryDry) + profile.wet * profile.sunny },
  ], random);
}

function weightedChoice(choices, random) {
  const total = choices.reduce((sum, choice) => sum + Math.max(0, choice.weight), 0);
  let roll = random() * total;
  for (const choice of choices) {
    roll -= Math.max(0, choice.weight);
    if (roll <= 0) return choice.value;
  }
  return choices.at(-1).value;
}

export function groundCoverMaterials() {
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1 });
  return {
    brightGrass: material(0x83a966),
    darkGrass: material(0x45654c),
    dryGrass: material(0xb09c62),
    fern: material(0x496c50),
    lushLeaf: material(0x5e8058),
    flower: material(0xdec4d2),
    flowerGold: material(0xdacb70),
    mushroom: material(0xcec9b7),
    mushroomCap: material(0xa9685e),
    reed: material(0x778867),
    reedTip: material(0x806b52),
    scrub: material(0x7a765a),
  };
}

export function groundCoverDesign(type) {
  const part = (x, y, z, w, h, d, material, rz = 0, ry = 0) => ({ x, y, z, w, h, d, material, rz, ry });
  const blades = (material, height = .58) => [
    part(-.22, height * .5, -.12, .045, height, .05, material, -.14),
    part(-.08, height * .58, .16, .04, height * 1.15, .045, material, .12),
    part(.08, height * .48, -.2, .05, height * .9, .04, material, -.08),
    part(.22, height * .54, .08, .04, height * 1.05, .05, material, .16),
    part(0, height * .42, 0, .055, height * .8, .045, material, -.1),
  ];
  if (type === 'flowers') return [
    part(-.17, .22, -.08, .035, .44, .035, 'brightGrass'), part(.12, .17, .12, .035, .34, .035, 'brightGrass'),
    part(.02, .25, -.18, .035, .5, .035, 'brightGrass'), part(-.17, .46, -.08, .13, .1, .13, 'flower'),
    part(.12, .36, .12, .12, .1, .12, 'flowerGold'), part(.02, .52, -.18, .13, .1, .13, 'flower'),
  ];
  if (type === 'ferns') return [
    part(0, .18, 0, .06, .36, .06, 'fern'),
    part(-.19, .22, 0, .42, .045, .1, 'fern', .35), part(.19, .25, 0, .42, .045, .1, 'fern', -.35),
    part(0, .28, -.18, .1, .045, .42, 'fern', .3, Math.PI * .5), part(0, .2, .18, .1, .045, .42, 'fern', -.3, Math.PI * .5),
  ];
  if (type === 'reeds') return [
    part(-.22, .43, -.13, .035, .86, .035, 'reed'), part(-.05, .52, .12, .035, 1.04, .035, 'reed'),
    part(.12, .46, -.18, .035, .92, .035, 'reed'), part(.24, .38, .1, .035, .76, .035, 'reed'),
    part(-.05, 1.04, .12, .07, .16, .07, 'reedTip'), part(.12, .94, -.18, .07, .15, .07, 'reedTip'),
  ];
  if (type === 'leafyBush') return [
    part(0, .18, 0, .07, .36, .07, 'scrub'), part(-.2, .35, 0, .32, .28, .34, 'lushLeaf'),
    part(.19, .32, .08, .34, .3, .32, 'lushLeaf'), part(0, .48, -.1, .36, .32, .34, 'lushLeaf'),
  ];
  if (type === 'yellowGrass') return blades('dryGrass', .7);
  if (type === 'darkGrass') return blades('darkGrass', .76);
  if (type === 'mushrooms') return [
    part(-.13, .12, -.08, .055, .24, .055, 'mushroom'), part(.13, .09, .1, .05, .18, .05, 'mushroom'),
    part(-.13, .25, -.08, .2, .09, .2, 'mushroomCap'), part(.13, .19, .1, .16, .075, .16, 'mushroomCap'),
  ];
  if (type === 'dryScrub') return [
    part(0, .2, 0, .055, .4, .055, 'scrub', .18), part(-.14, .31, 0, .32, .045, .055, 'scrub', .4),
    part(.15, .42, .03, .34, .045, .055, 'scrub', -.48), part(-.24, .42, 0, .14, .11, .14, 'dryGrass'),
    part(.25, .5, .03, .13, .1, .13, 'dryGrass'),
  ];
  return blades('brightGrass', .64);
}

export function treeDesign(silhouette) {
  if (silhouette === 0) {
    return {
      trunkHeight: 3.45,
      leafBaseY: 2.15,
      radius: .34,
      branches: [[0,1.75,0,-.92,2.52,.12], [0,1.9,0,.86,2.65,-.2], [0,2.18,0,-.46,2.9,-.52]],
      leaves: [
        [-5,0,0], [-4,0,-1], [-4,0,0], [-4,0,1], [-3,0,-1], [-3,0,0], [-3,0,1], [-4,1,0], [-3,1,0],
        [2,1,-1], [2,1,0], [2,1,1], [3,0,-1], [3,0,0], [3,0,1], [4,0,0], [3,2,0], [4,1,0],
        [-1,3,-2], [0,3,-2], [0,4,-2],
      ],
    };
  }
  if (silhouette === 1) {
    return {
      trunkHeight: 3.15,
      leafBaseY: 2.46,
      radius: .32,
      branches: [[0,2.18,0,-1.18,2.53,.02], [0,2.2,0,1.22,2.56,.18], [0,2.38,0,.1,2.72,-1.02]],
      leaves: [
        [-6,0,0], [-5,0,-1], [-5,0,0], [-5,0,1], [-4,0,-1], [-4,0,0], [-4,0,1], [-3,0,-2], [-3,0,-1], [-3,0,0], [-3,0,1], [-3,0,2],
        [-2,0,-1], [-2,0,0], [-2,0,1], [-1,1,-1], [-1,1,0], [0,1,-2], [0,1,-1], [0,1,0], [0,1,1], [0,1,2], [1,1,0], [2,0,-1], [2,0,0], [2,0,1], [3,0,-1], [3,0,0], [3,0,1], [4,0,0], [5,0,0],
        [-2,2,0], [0,2,0], [2,2,0],
      ],
    };
  }
  if (silhouette === 2) {
    return {
      trunkHeight: 4.35,
      leafBaseY: 3.38,
      radius: .45,
      branches: [[0,3.1,0,-1.15,3.55,.08], [0,3.18,0,1.18,3.62,-.1], [0,3.35,0,.1,3.72,1.08]],
      leaves: [
        [-4,0,-2],[-4,0,-1],[-4,0,0],[-4,0,1],[-4,0,2],[-3,0,-3],[-3,0,-2],[-3,0,-1],[-3,0,0],[-3,0,1],[-3,0,2],[-3,0,3],
        [-2,0,-4],[-2,0,-3],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-2,0,3],[-2,0,4],[-1,0,-4],[-1,0,-3],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[-1,0,3],[-1,0,4],
        [0,0,-5],[0,0,-4],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[0,0,4],[0,0,5],
        [1,0,-4],[1,0,-3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[1,0,4],[2,0,-4],[2,0,-3],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[2,0,3],[2,0,4],
        [3,0,-3],[3,0,-2],[3,0,-1],[3,0,0],[3,0,1],[3,0,2],[3,0,3],[4,0,-2],[4,0,-1],[4,0,0],[4,0,1],[4,0,2],[-2,1,-2],[0,1,0],[2,1,2],[0,2,0],
      ],
    };
  }
  if (silhouette === 3) {
    return {
      trunkHeight: 3.9,
      leafBaseY: 1.95,
      radius: .42,
      branches: [[0,1.65,0,-.82,2.05,.12],[0,2.3,0,.92,2.62,-.1],[0,2.9,0,-.65,3.2,-.5]],
      leaves: [
        [-3,0,-1],[-3,0,0],[-3,0,1],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[3,0,-1],[3,0,0],[3,0,1],
        [-3,3,0],[-2,3,-1],[-2,3,0],[-2,3,1],[-1,3,-2],[-1,3,-1],[-1,3,0],[-1,3,1],[-1,3,2],[0,3,-2],[0,3,-1],[0,3,0],[0,3,1],[0,3,2],[1,3,-2],[1,3,-1],[1,3,0],[1,3,1],[1,3,2],[2,3,-1],[2,3,0],[2,3,1],[3,3,0],
        [-2,6,0],[-1,6,-1],[-1,6,0],[-1,6,1],[0,6,-2],[0,6,-1],[0,6,0],[0,6,1],[0,6,2],[1,6,-1],[1,6,0],[1,6,1],[2,6,0],
      ],
    };
  }
  if (silhouette === 4) {
    return {
      trunkHeight: 3.5,
      leafBaseY: 2.15,
      radius: .38,
      branches: [[0,1.6,0,-.8,2.25,.15],[0,1.72,0,.82,2.32,-.18],[0,2.05,0,.12,2.65,.72]],
      leaves: [
        [-3,0,-1],[-3,0,0],[-3,0,1],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[3,0,-1],[3,0,0],[3,0,1],[-2,1,0],[-1,1,-1],[-1,1,0],[-1,1,1],[0,1,-1],[0,1,0],[0,1,1],[1,1,-1],[1,1,0],[1,1,1],[2,1,0],[0,2,0],
      ],
    };
  }
  return {
    trunkHeight: 3.1,
    leafBaseY: 2.15,
    radius: .31,
    branches: [[0,.9,0,.28,1.65,.05],[.18,1.5,0,-.72,2.28,.08],[.25,1.72,0,1.05,2.38,-.18],[.1,2.05,0,.2,2.62,.7]],
    leaves: [
      [-3,0,0],[-2,0,-1],[-2,0,0],[-1,0,-1],[-1,0,0],[1,1,0],[2,1,-1],[2,1,0],[2,1,1],[3,1,0],[0,2,2],[1,2,1],[1,2,2],
    ],
  };
}
