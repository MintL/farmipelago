import { LEVEL_HEIGHT, TILE, THREE, gridKey } from '../../core/shared.js';
import { CARDINAL_STEPS, MIN_REINDEER_ISLAND_TILES, MIN_REINDEER_REGION_TILES, REINDEER_PER_QUALIFYING_ISLAND, STARTER_ISLAND_ID } from './config.js';
import { clearLandRegions, forestRegions, isSnowTile, largestRegion, randomTile, seededRandom, snowRegions } from './habitat.js';
import { createFoxVisual, createReindeerVisual } from './visuals.js';

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
