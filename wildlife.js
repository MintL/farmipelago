import { LEVEL_HEIGHT, MODEL_VOXEL, TILE, THREE, box, gridKey } from './shared.js';

const MIN_REGION_TILES = 6;
const MIN_REINDEER_REGION_TILES = 20;
const MIN_REINDEER_ISLAND_TILES = 180;
const REINDEER_PER_QUALIFYING_ISLAND = 2;
const STARTER_ISLAND_ID = 0;
const NORTH_ISLAND_ID = 1;
const SNOW_LEVEL = 2;
const CARDINAL_STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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

function jumpMotion(progress, height = 0) {
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

function createReindeerVisual(scale = 1) {
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

function createFoxVisual(scale = 1, snow = false) {
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

function connectedRegions(habitat, minimumTiles) {
  const regions = [];
  const visited = new Set();
  for (const [startKey, start] of habitat) {
    if (visited.has(startKey)) continue;
    const tiles = [];
    const queue = [start];
    visited.add(startKey);
    while (queue.length) {
      const tile = queue.shift();
      tiles.push(tile);
      for (const [dx, dz] of CARDINAL_STEPS) {
        const key = gridKey(tile.gx + dx, tile.gz + dz);
        const neighbor = habitat.get(key);
        if (!neighbor || visited.has(key) || neighbor.islandId !== start.islandId ||
          Math.abs(neighbor.topY - tile.topY) > LEVEL_HEIGHT + .01) continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }
    if (tiles.length >= minimumTiles) {
      regions.push({
        tiles,
        tileSet: new Set(tiles.map(tile => gridKey(tile.gx, tile.gz))),
        islandId: start.islandId,
      });
    }
  }
  return regions;
}

function isSnowTile(tile) {
  return tile?.islandId === NORTH_ISLAND_ID && tile.topY - tile.baseY >= SNOW_LEVEL - .01;
}

function forestRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (tile.islandId === STARTER_ISLAND_ID || tile.water || tile.hasTree || tile.stones.length ||
      tile.reserved || tile.ploughed || tile.crop) continue;
    let nearbyTrees = 0;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (!dx && !dz) continue;
        const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
        if (neighbor?.hasTree && neighbor.islandId === tile.islandId && Math.abs(neighbor.topY - tile.topY) < .01) nearbyTrees++;
      }
    }
    if (nearbyTrees >= 2) habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, MIN_REGION_TILES);
}

function snowRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (!isSnowTile(tile) || tile.water || tile.hasTree || tile.stones.length || tile.reserved || tile.ploughed || tile.crop) continue;
    habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, 1);
}

function clearLandRegions(terrain) {
  const habitat = new Map();
  for (const tile of terrain.values()) {
    if (tile.islandId === STARTER_ISLAND_ID || isSnowTile(tile) || tile.water || tile.hasTree ||
      tile.stones.length || tile.reserved || tile.ploughed || tile.crop) continue;
    habitat.set(gridKey(tile.gx, tile.gz), tile);
  }
  return connectedRegions(habitat, MIN_REGION_TILES);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function largestRegion(regions) {
  return [...regions].sort((a, b) => b.tiles.length - a.tiles.length)[0] || null;
}

function randomTile(region, random, occupied = new Set(), near = null) {
  const candidates = near
    ? region.tiles.filter(tile => Math.hypot(tile.x - near.x, tile.z - near.z) <= 2.25 * TILE)
    : region.tiles;
  const available = candidates.filter(tile => !occupied.has(gridKey(tile.gx, tile.gz)));
  const pool = available.length ? available : candidates.length ? candidates : region.tiles;
  return pool[Math.floor(random() * pool.length)];
}

export function createWildlifeSystem(terrain, parent, seed) {
  const group = new THREE.Group();
  group.name = 'forest-wildlife';
  parent.add(group);
  const random = seededRandom(seed ^ 0x91e10da5);
  const regions = forestRegions(terrain);
  const snowyRegions = snowRegions(terrain);
  const islandSizes = new Map();
  for (const tile of terrain.values()) {
    if (!tile.water && tile.islandId !== STARTER_ISLAND_ID) {
      islandSizes.set(tile.islandId, (islandSizes.get(tile.islandId) || 0) + 1);
    }
  }
  const reindeerRegions = new Map();
  for (const region of regions) {
    if (region.tiles.length < MIN_REINDEER_REGION_TILES ||
      (islandSizes.get(region.islandId) || 0) < MIN_REINDEER_ISLAND_TILES) continue;
    const current = reindeerRegions.get(region.islandId);
    if (!current || region.tiles.length > current.tiles.length) reindeerRegions.set(region.islandId, region);
  }
  const foxRegion = largestRegion(regions.filter(region => !isSnowTile(region.tiles[0]))) ||
    largestRegion(clearLandRegions(terrain));
  const snowFoxRegion = largestRegion(snowyRegions);
  const animals = [];

  const addAnimal = (species, region, tile, herd = null, index = 0) => {
    const visual = species === 'reindeer'
      ? createReindeerVisual(.9 + random() * .12)
      : createFoxVisual(.88 + random() * .12, species === 'snow-fox');
    const animal = {
      species, region, herd, visual, currentTile: tile, targetTile: null, previousKey: null,
      x: tile.x + (random() - .5) * .16, z: tile.z + (random() - .5) * .16,
      startX: tile.x, startZ: tile.z, heading: random() * Math.PI * 2,
      progress: 0, idleSeconds: .5 + random() * 2, jumping: false,
      phase: random() * Math.PI * 2, index,
    };
    visual.group.position.set(animal.x, tile.topY + .02, animal.z);
    visual.group.rotation.y = animal.heading;
    group.add(visual.group);
    animals.push(animal);
    return animal;
  };

  for (const region of reindeerRegions.values()) {
    const occupied = new Set();
    const anchor = randomTile(region, random, occupied);
    const herd = { animals: [] };
    for (let index = 0; index < REINDEER_PER_QUALIFYING_ISLAND; index++) {
      const tile = index ? randomTile(region, random, occupied, anchor) : anchor;
      occupied.add(gridKey(tile.gx, tile.gz));
      herd.animals.push(addAnimal('reindeer', region, tile, herd, index));
    }
  }
  if (foxRegion) addAnimal('fox', foxRegion, randomTile(foxRegion, random));
  if (snowFoxRegion) addAnimal('snow-fox', snowFoxRegion, randomTile(snowFoxRegion, random));

  const tileOpen = (tile, isBlockedAt) => tile && !tile.water && !tile.hasTree && !tile.stones.length && !tile.reserved &&
    !tile.ploughed && !tile.crop && !isBlockedAt(tile.x, tile.z);

  const rehome = (animal, isBlockedAt) => {
    const candidates = animal.region.tiles.filter(tile => tileOpen(tile, isBlockedAt));
    if (!candidates.length) {
      animal.visual.group.visible = false;
      return false;
    }
    candidates.sort((a, b) => Math.hypot(a.x - animal.x, a.z - animal.z) - Math.hypot(b.x - animal.x, b.z - animal.z));
    const tile = candidates[0];
    animal.currentTile = tile;
    animal.targetTile = null;
    animal.jumping = false;
    animal.x = tile.x;
    animal.z = tile.z;
    animal.visual.group.visible = true;
    return true;
  };

  const chooseTarget = (animal, isBlockedAt) => {
    const candidates = CARDINAL_STEPS
      .map(([dx, dz]) => terrain.get(gridKey(animal.currentTile.gx + dx, animal.currentTile.gz + dz)))
      .filter(tile => tile && animal.region.tileSet.has(gridKey(tile.gx, tile.gz)) &&
        Math.abs(tile.topY - animal.currentTile.topY) <= LEVEL_HEIGHT + .01 && tileOpen(tile, isBlockedAt));
    if (!candidates.length) return false;
    const leader = animal.herd?.animals[0];
    const focus = leader && leader !== animal ? leader.targetTile || leader.currentTile : null;
    let best = candidates[0];
    let bestScore = -Infinity;
    for (const tile of candidates) {
      const key = gridKey(tile.gx, tile.gz);
      let score = random() * 1.8 - (key === animal.previousKey ? 1.15 : 0);
      if (focus) score -= Math.hypot(tile.x - focus.x, tile.z - focus.z) * .7;
      if (score > bestScore) { best = tile; bestScore = score; }
    }
    animal.previousKey = gridKey(animal.currentTile.gx, animal.currentTile.gz);
    animal.targetTile = best;
    animal.startX = animal.x;
    animal.startZ = animal.z;
    animal.progress = 0;
    animal.jumping = best.topY > animal.currentTile.topY + .01;
    return true;
  };

  return {
    group,
    animate(elapsed, delta, isBlockedAt = () => false) {
      const dt = Math.min(.05, Math.max(0, Number(delta) || 0));
      for (const animal of animals) {
        if (!tileOpen(animal.currentTile, isBlockedAt) && !rehome(animal, isBlockedAt)) continue;
        if (animal.targetTile && !tileOpen(animal.targetTile, isBlockedAt)) {
          animal.targetTile = null;
          animal.jumping = false;
        }
        if (!animal.targetTile) {
          animal.idleSeconds -= dt;
          if (animal.idleSeconds <= 0 && !chooseTarget(animal, isBlockedAt)) animal.idleSeconds = .8;
        }

        let speed = 0;
        let jump = jumpMotion(null);
        let groundY = animal.currentTile.topY;
        if (animal.targetTile) {
          const walkSpeed = animal.species === 'fox' ? .6 : .48;
          speed = animal.species === 'snow-fox' ? .6 : walkSpeed;
          const distance = Math.max(.001, Math.hypot(animal.targetTile.x - animal.startX, animal.targetTile.z - animal.startZ));
          animal.progress = Math.min(1, animal.progress + dt * speed / distance);
          groundY = THREE.MathUtils.lerp(animal.currentTile.topY, animal.targetTile.topY, animal.progress);
          if (animal.jumping) {
            const height = animal.species === 'reindeer' ? .7 : .58;
            jump = jumpMotion(animal.progress, height);
          }
          animal.x = THREE.MathUtils.lerp(animal.startX, animal.targetTile.x, animal.progress);
          animal.z = THREE.MathUtils.lerp(animal.startZ, animal.targetTile.z, animal.progress);
          const dx = animal.targetTile.x - animal.startX;
          const dz = animal.targetTile.z - animal.startZ;
          const desired = Math.atan2(-dx, -dz);
          const turn = Math.atan2(Math.sin(desired - animal.heading), Math.cos(desired - animal.heading));
          animal.heading += turn * (1 - Math.exp(-10 * dt));
          if (animal.progress >= 1) {
            animal.currentTile = animal.targetTile;
            animal.targetTile = null;
            animal.progress = 0;
            animal.jumping = false;
            animal.idleSeconds = .65 + random() * 1.9;
          }
        }
        animal.visual.group.position.set(animal.x, groundY + .02 + jump.height, animal.z);
        animal.visual.group.rotation.y = animal.heading;
        animal.visual.animate(elapsed + animal.phase, speed, jump);
      }
    },
  };
}
