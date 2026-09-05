import { THREE, TILE, gridKey } from '../../core/shared.js';
import { BARN_HAY_CAPACITY, BARN_MILK_CAPACITY, BIRTH_INTERVAL_SECONDS, CALF_GROWTH_SECONDS, CALF_HAY_FACTOR, GRAZING_MILK_FACTOR, HAY_LITRES_PER_ADULT_SECOND, MILK_LITRES_PER_ADULT_SECOND } from './config.js';
import { removeCollinearVertices } from './pen-geometry.js';
import { createCowVisual } from './visuals.js';

const COW_ROUTE_MIN_DISTANCE = TILE * 1.75;
const COW_ROUTE_MAX_DISTANCE = TILE * 5;
const COW_ROUTE_CLEARANCE = TILE * .2;
const COW_TARGET_OFFSET = TILE * .18;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isSafeInteger(Math.round(Number(value))) ? Math.round(Number(value)) : fallback;

export function normalizeCattleBarnState(saved, context = {}) {
  const vertices = Array.isArray(saved?.pen?.vertices) ? saved.pen.vertices.map(vertex => ({ cx: integer(vertex?.cx), cz: integer(vertex?.cz) })) : null;
  const animals = Array.isArray(saved?.animals) ? saved.animals.flatMap((animal, index) => {
    if (!animal || (animal.stage !== 'adult' && animal.stage !== 'calf')) return [];
    const jitterX = finite(animal.jitterX, ((index * 37) % 11 - 5) * .025);
    const jitterZ = finite(animal.jitterZ, ((index * 53) % 13 - 6) * .022);
    return [{
      id: typeof animal.id === 'string' ? animal.id : `cow-${index + 1}`,
      stage: animal.stage,
      age: animal.stage === 'calf' ? Math.max(0, finite(animal.age)) : 0,
      tileKey: typeof animal.tileKey === 'string' ? animal.tileKey : null,
      targetTileKey: typeof animal.targetTileKey === 'string' ? animal.targetTileKey : null,
      moveProgress: THREE.MathUtils.clamp(finite(animal.moveProgress), 0, 1),
      heading: finite(animal.heading),
      idleSeconds: Math.max(0, finite(animal.idleSeconds)),
      jitterX,
      jitterZ,
      targetJitterX: finite(animal.targetJitterX, jitterX),
      targetJitterZ: finite(animal.targetJitterZ, jitterZ),
      visual: null,
    }];
  }) : [];
  return {
    pen: vertices?.length >= 4 ? { vertices: removeCollinearVertices(vertices) } : null,
    hayLitres: THREE.MathUtils.clamp(finite(saved?.hayLitres), 0, BARN_HAY_CAPACITY),
    milkLitres: THREE.MathUtils.clamp(finite(saved?.milkLitres), 0, BARN_MILK_CAPACITY),
    birthProgress: THREE.MathUtils.clamp(finite(saved?.birthProgress), 0, BIRTH_INTERVAL_SECONDS),
    starterCowsGranted: Boolean(saved?.starterCowsGranted),
    animals,
    nextCowId: Math.max(1, ...animals.map(animal => integer(animal.id.match(/^cow-(\d+)$/)?.[1], 0) + 1)),
    context,
  };
}

function nearestValidTile(building, tileKey = null) {
  const tiles = building.derived?.tiles || [];
  if (!tiles.length) return null;
  const [gx, gz] = String(tileKey || '').split(',').map(Number);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return tiles[0];
  return [...tiles].sort((a, b) => Math.hypot(a.gx - gx, a.gz - gz) - Math.hypot(b.gx - gx, b.gz - gz))[0];
}

function tileFor(building, tileKey, terrain) {
  return terrain?.get(tileKey) || building.derived?.tiles.find(tile => gridKey(tile.gx, tile.gz) === tileKey) || null;
}

function pastureLineOfSight(building, start, target) {
  const dx = target.x - start.x, dz = target.z - start.z;
  const distance = Math.hypot(dx, dz);
  if (distance < .001) return true;
  const sideX = -dz / distance * COW_ROUTE_CLEARANCE;
  const sideZ = dx / distance * COW_ROUTE_CLEARANCE;
  const steps = Math.max(1, Math.ceil(distance / (TILE * .15)));
  for (let step = 0; step <= steps; step++) {
    const amount = step / steps;
    const x = THREE.MathUtils.lerp(start.x, target.x, amount);
    const z = THREE.MathUtils.lerp(start.z, target.z, amount);
    for (const side of [-1, 0, 1]) {
      const key = gridKey(Math.round((x + sideX * side) / TILE), Math.round((z + sideZ * side) / TILE));
      if (!building.derived.tileSet.has(key)) return false;
    }
  }
  return true;
}

const cowIdNumber = id => [...String(id)].reduce((sum, character) => sum * 31 + character.charCodeAt(0), 7);

function cowRouteChoices(building, current, animal, elapsed, minimumDistance) {
  const start = { x: current.x + animal.jitterX, z: current.z + animal.jitterZ };
  const idNumber = cowIdNumber(animal.id);
  return building.derived.tiles.flatMap((tile, index) => {
    if (gridKey(tile.gx, tile.gz) === animal.tileKey) return [];
    const seed = elapsed * .73 + idNumber * .019 + index * 1.71;
    const jitterX = Math.sin(seed * 2.17 + tile.gx * .83) * COW_TARGET_OFFSET;
    const jitterZ = Math.sin(seed * 3.11 + tile.gz * 1.07) * COW_TARGET_OFFSET;
    const target = { x: tile.x + jitterX, z: tile.z + jitterZ };
    const distance = Math.hypot(target.x - start.x, target.z - start.z);
    if (distance < minimumDistance || distance > COW_ROUTE_MAX_DISTANCE || !pastureLineOfSight(building, start, target)) return [];
    return [{ tile, jitterX, jitterZ }];
  });
}

export function reconcileCattleBarnAnimals(building, context = {}) {
  if (!building.derived?.valid) return;
  for (const animal of building.animals) {
    let relocated = false;
    if (!building.derived.tileSet.has(animal.tileKey)) {
      const tile = nearestValidTile(building, animal.tileKey);
      animal.tileKey = gridKey(tile.gx, tile.gz);
      relocated = true;
    }
    const current = tileFor(building, animal.tileKey, context.terrain);
    const target = tileFor(building, animal.targetTileKey, context.terrain);
    const startPoint = current ? { x: current.x + animal.jitterX, z: current.z + animal.jitterZ } : null;
    const targetPoint = target ? { x: target.x + animal.targetJitterX, z: target.z + animal.targetJitterZ } : null;
    if (relocated || !target || !startPoint || !pastureLineOfSight(building, startPoint, targetPoint)) {
      animal.targetTileKey = null;
      animal.moveProgress = 0;
      animal.targetJitterX = animal.jitterX;
      animal.targetJitterZ = animal.jitterZ;
    }
    if (!animal.visual) {
      animal.visual = createCowVisual(animal.stage);
      context.parent?.add(animal.visual.group);
    }
  }
}

function newCalf(building, context) {
  const adult = building.animals.find(animal => animal.stage === 'adult');
  const tile = nearestValidTile(building, adult?.tileKey);
  const animal = {
    id: `cow-${building.nextCowId++}`, stage: 'calf', age: 0,
    tileKey: gridKey(tile.gx, tile.gz), targetTileKey: null, moveProgress: 0,
    heading: 0, idleSeconds: 1.2, jitterX: .08, jitterZ: -.06,
    targetJitterX: .08, targetJitterZ: -.06, visual: null,
  };
  building.animals.push(animal);
  reconcileCattleBarnAnimals(building, context);
}

export function updateCattleBarn(building, dt, elapsed, context = {}) {
  if (!building.pen || !building.derived?.valid) return;
  reconcileCattleBarnAnimals(building, context);
  const adults = building.animals.filter(animal => animal.stage === 'adult').length;
  const calves = building.animals.length - adults;
  const hayFed = building.hayLitres > 0;
  const feedRate = adults * HAY_LITRES_PER_ADULT_SECOND + calves * HAY_LITRES_PER_ADULT_SECOND * CALF_HAY_FACTOR;
  building.hayLitres = THREE.MathUtils.clamp(building.hayLitres - Math.min(building.hayLitres, feedRate * dt), 0, BARN_HAY_CAPACITY);
  const productionFactor = hayFed ? 1 : GRAZING_MILK_FACTOR;
  building.milkLitres = THREE.MathUtils.clamp(building.milkLitres + adults * MILK_LITRES_PER_ADULT_SECOND * productionFactor * dt, 0, BARN_MILK_CAPACITY);
  if (adults >= 2 && building.animals.length < building.derived.capacity && building.hayLitres > 0) {
    building.birthProgress += dt;
    if (building.birthProgress >= BIRTH_INTERVAL_SECONDS) {
      building.birthProgress -= BIRTH_INTERVAL_SECONDS;
      newCalf(building, context);
      context.onChange?.();
    }
  }
  for (const animal of building.animals) {
    if (animal.stage === 'calf') {
      animal.age += dt;
      if (animal.age >= CALF_GROWTH_SECONDS) {
        animal.stage = 'adult'; animal.age = 0; animal.visual?.setStage('adult'); context.onChange?.();
      }
    }
    const current = context.terrain?.get(animal.tileKey) || nearestValidTile(building, animal.tileKey);
    let moving = Boolean(animal.targetTileKey);
    if (!moving) {
      animal.idleSeconds -= dt;
      if (animal.idleSeconds <= 0) {
        let choices = cowRouteChoices(building, current, animal, elapsed, COW_ROUTE_MIN_DISTANCE);
        if (!choices.length) choices = cowRouteChoices(building, current, animal, elapsed, TILE * .75);
        if (choices.length) {
          const choiceIndex = Math.abs(Math.floor(Math.sin(elapsed * 1.73 + cowIdNumber(animal.id) * .09 + animal.heading) * 10000)) % choices.length;
          const choice = choices[choiceIndex];
          animal.targetTileKey = gridKey(choice.tile.gx, choice.tile.gz);
          animal.targetJitterX = choice.jitterX;
          animal.targetJitterZ = choice.jitterZ;
          animal.moveProgress = 0;
          moving = true;
        }
        else animal.idleSeconds = 1.4;
      }
    }
    const target = animal.targetTileKey ? tileFor(building, animal.targetTileKey, context.terrain) : null;
    let x = current.x + animal.jitterX, z = current.z + animal.jitterZ;
    if (target) {
      const targetX = target.x + animal.targetJitterX;
      const targetZ = target.z + animal.targetJitterZ;
      const distance = Math.max(.001, Math.hypot(targetX - x, targetZ - z));
      animal.moveProgress += dt * (animal.stage === 'calf' ? .55 : .45) / distance;
      const amount = Math.min(1, animal.moveProgress);
      x = THREE.MathUtils.lerp(x, targetX, amount);
      z = THREE.MathUtils.lerp(z, targetZ, amount);
      const desired = Math.atan2(-(targetX - current.x - animal.jitterX), -(targetZ - current.z - animal.jitterZ));
      const delta = Math.atan2(Math.sin(desired - animal.heading), Math.cos(desired - animal.heading));
      animal.heading += delta * (1 - Math.exp(-8 * dt));
      if (amount >= 1) {
        animal.tileKey = animal.targetTileKey;
        animal.jitterX = animal.targetJitterX;
        animal.jitterZ = animal.targetJitterZ;
        animal.targetTileKey = null;
        animal.moveProgress = 0;
        animal.idleSeconds = .6 + (Math.abs(Math.sin(elapsed + animal.id.length)) * 1.9); moving = false;
      }
    }
    if (animal.visual) {
      animal.visual.group.position.set(x, current.topY + .02, z);
      animal.visual.group.rotation.y = animal.heading;
      animal.visual.animate(elapsed, moving);
    }
  }
}
