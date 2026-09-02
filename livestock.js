import { THREE, TILE, box, gridKey, mats } from './shared.js?v=bale-wrapper-20260902-1';

export const STARTER_COW_COUNT = 2;
export const PEN_TILES_PER_COW = 4;
export const HAY_BALE_LITRES = 3600;
export const BARN_HAY_CAPACITY = 14400;
export const BARN_MILK_CAPACITY = 10000;
export const LIQUID_TANK_CAPACITY = 6000;
export const CALF_GROWTH_SECONDS = 90;
export const BIRTH_INTERVAL_SECONDS = 120;
export const MILK_LITRES_PER_ADULT_SECOND = 2;
export const GRAZING_MILK_FACTOR = .2;
export const HAY_LITRES_PER_ADULT_SECOND = 1.5;
export const CALF_HAY_FACTOR = .5;

const cowWhite = new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: .9 });
const cowBrown = new THREE.MeshStandardMaterial({ color: 0x684638, roughness: .92 });
const cowMuzzle = new THREE.MeshStandardMaterial({ color: 0xc9937a, roughness: .92 });
const cowDark = new THREE.MeshStandardMaterial({ color: 0x332a26, roughness: .94 });
const barnRed = new THREE.MeshStandardMaterial({ color: 0x9d493b, roughness: .92 });
const barnDark = new THREE.MeshStandardMaterial({ color: 0x4a302a, roughness: .94 });
const barnCream = new THREE.MeshStandardMaterial({ color: 0xe2d1aa, roughness: .9 });
const fenceWood = new THREE.MeshStandardMaterial({ color: 0x8b603d, roughness: .96 });
const fenceDark = new THREE.MeshStandardMaterial({ color: 0x5d3d2b, roughness: .98 });
const validMaterial = new THREE.MeshBasicMaterial({ color: 0x91d55e, transparent: true, opacity: .72, depthWrite: false });
const invalidMaterial = new THREE.MeshBasicMaterial({ color: 0xe36d63, transparent: true, opacity: .76, depthWrite: false });

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isSafeInteger(Math.round(Number(value))) ? Math.round(Number(value)) : fallback;

export function cornerToWorld(vertex) {
  return { x: (vertex.cx + .5) * TILE, z: (vertex.cz + .5) * TILE };
}

export function worldToCorner(point) {
  return { cx: Math.round(point.x / TILE - .5), cz: Math.round(point.z / TILE - .5) };
}

export function snapPenPoint(worldPoint) {
  const corner = worldToCorner(worldPoint);
  return { ...corner, ...cornerToWorld(corner) };
}

const sameVertex = (a, b) => a?.cx === b?.cx && a?.cz === b?.cz;

export function removeCollinearVertices(vertices) {
  const result = [];
  for (const source of vertices || []) {
    const vertex = { cx: integer(source?.cx), cz: integer(source?.cz) };
    if (sameVertex(vertex, result.at(-1))) continue;
    result.push(vertex);
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3);
      if ((a.cx === b.cx && b.cx === c.cx) || (a.cz === b.cz && b.cz === c.cz)) result.splice(-2, 1);
      else break;
    }
    if (result.length >= 2 && sameVertex(result.at(-1), result.at(-2))) result.pop();
  }
  return result;
}

export function isOrthogonal(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 4) return false;
  return vertices.every((vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return !sameVertex(vertex, next) && (vertex.cx === next.cx || vertex.cz === next.cz);
  });
}

const segmentIntersection = (a, b) => {
  const aHorizontal = a.a.cz === a.b.cz;
  const bHorizontal = b.a.cz === b.b.cz;
  if (aHorizontal === bHorizontal) {
    if (aHorizontal && a.a.cz !== b.a.cz) return false;
    if (!aHorizontal && a.a.cx !== b.a.cx) return false;
    const a0 = aHorizontal ? Math.min(a.a.cx, a.b.cx) : Math.min(a.a.cz, a.b.cz);
    const a1 = aHorizontal ? Math.max(a.a.cx, a.b.cx) : Math.max(a.a.cz, a.b.cz);
    const b0 = aHorizontal ? Math.min(b.a.cx, b.b.cx) : Math.min(b.a.cz, b.b.cz);
    const b1 = aHorizontal ? Math.max(b.a.cx, b.b.cx) : Math.max(b.a.cz, b.b.cz);
    return Math.min(a1, b1) >= Math.max(a0, b0);
  }
  const horizontal = aHorizontal ? a : b;
  const vertical = aHorizontal ? b : a;
  return vertical.a.cx >= Math.min(horizontal.a.cx, horizontal.b.cx)
    && vertical.a.cx <= Math.max(horizontal.a.cx, horizontal.b.cx)
    && horizontal.a.cz >= Math.min(vertical.a.cz, vertical.b.cz)
    && horizontal.a.cz <= Math.max(vertical.a.cz, vertical.b.cz);
};

export function segmentsFor(vertices) {
  return (vertices || []).map((vertex, index) => ({ a: vertex, b: vertices[(index + 1) % vertices.length], hidden: index === vertices.length - 1 }));
}

export function hasSelfIntersection(vertices) {
  const segments = segmentsFor(vertices);
  for (let a = 0; a < segments.length; a++) {
    for (let b = a + 1; b < segments.length; b++) {
      if (b === a + 1 || (a === 0 && b === segments.length - 1)) continue;
      if (segmentIntersection(segments[a], segments[b])) return true;
    }
  }
  return false;
}

export function pointInsidePolygon(x, z, vertices) {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
    const a = vertices[index], b = vertices[previous];
    const ax = a.cx + .5, az = a.cz + .5, bx = b.cx + .5, bz = b.cz + .5;
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export function tileCenterInsidePolygon(tile, vertices) {
  return pointInsidePolygon(tile.gx, tile.gz, vertices);
}

export function barnPenAnchors(site) {
  const gx = Math.round(site.x / TILE), gz = Math.round(site.z / TILE);
  return [{ cx: gx - 2, cz: gz + 1 }, { cx: gx + 1, cz: gz + 1 }];
}

export function computePenGeometry(vertices, terrain, barnSite, context = {}) {
  const clean = removeCollinearVertices(vertices);
  const invalid = reason => ({ valid: false, reason, vertices: clean, tiles: [], tileSet: new Set(), capacity: 0, segments: [] });
  if (!isOrthogonal(clean) || hasSelfIntersection(clean)) return invalid('Pen must be a simple orthogonal shape');
  const area = Math.abs(clean.reduce((sum, vertex, index) => {
    const next = clean[(index + 1) % clean.length];
    return sum + vertex.cx * next.cz - next.cx * vertex.cz;
  }, 0)) * .5;
  if (area < 1) return invalid('Pen has no usable area');
  const minX = Math.min(...clean.map(vertex => vertex.cx));
  const maxX = Math.max(...clean.map(vertex => vertex.cx));
  const minZ = Math.min(...clean.map(vertex => vertex.cz));
  const maxZ = Math.max(...clean.map(vertex => vertex.cz));
  const barnLevel = finite(barnSite?.y, NaN);
  const excluded = context.occupiedTileKeys || new Set();
  const barnGx = Math.round(barnSite.x / TILE), barnGz = Math.round(barnSite.z / TILE);
  const tiles = [];
  for (let gx = minX; gx <= maxX; gx++) {
    for (let gz = minZ; gz <= maxZ; gz++) {
      if (!pointInsidePolygon(gx, gz, clean)) continue;
      const key = gridKey(gx, gz);
      const tile = terrain?.get(key);
      const inBarn = Math.abs(gx - barnGx) <= 1 && Math.abs(gz - barnGz) <= 1;
      if (!tile || tile.water || tile.reserved || tile.ploughed || tile.crop || tile.hasTree
        || Math.abs(tile.topY - barnLevel) > .01 || inBarn || excluded.has(key)) return invalid('The enclosed pasture must be clear, level grass');
      tiles.push(tile);
    }
  }
  const capacity = Math.floor(tiles.length / PEN_TILES_PER_COW);
  const minimum = context.minimumCapacity ?? STARTER_COW_COUNT;
  if (capacity < minimum) return invalid(`Pen needs capacity for ${minimum} cattle`);
  return {
    valid: true,
    reason: '',
    vertices: clean,
    tiles,
    tileSet: new Set(tiles.map(tile => gridKey(tile.gx, tile.gz))),
    capacity,
    segments: segmentsFor(clean).filter(segment => !segment.hidden),
  };
}

export function createCattleBarnVisual() {
  const group = new THREE.Group();
  const spring = new THREE.Group();
  const shell = new THREE.Group();
  const redMaterial = barnRed.clone();
  const darkMaterial = barnDark.clone();
  const creamMaterial = barnCream.clone();
  group.name = 'cattle-barn';
  group.add(spring);
  spring.add(shell);
  const foundation = box(2.65, .16, 2.05, darkMaterial); foundation.position.y = .08; shell.add(foundation);
  const body = box(2.45, 1.65, 1.85, redMaterial); body.position.y = .9; shell.add(body);
  const roofLeft = box(1.68, .16, 2.22, creamMaterial); roofLeft.position.set(-.62, 1.94, 0); roofLeft.rotation.z = -.48; shell.add(roofLeft);
  const roofRight = roofLeft.clone(); roofRight.position.x = .62; roofRight.rotation.z = .48; shell.add(roofRight);
  const doorway = box(1.02, 1.18, .08, darkMaterial); doorway.position.set(0, .65, 0.965); shell.add(doorway);
  const trim = box(1.24, .12, .12, creamMaterial); trim.position.set(0, 1.3, 1.0); shell.add(trim);
  const hay = box(.58, .42, .38, mats.bale); hay.position.set(-.82, .3, 1.12); shell.add(hay);
  const milkCan = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .52, 10), mats.metal);
  milkCan.position.set(.86, .3, 1.08); milkCan.castShadow = true; shell.add(milkCan);
  const ringMaterial = validMaterial.clone();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.75, 32), ringMaterial);
  ring.rotation.x = -Math.PI * .5; ring.position.y = .02; ring.visible = false; group.add(ring);
  const anchors = new THREE.Group();
  for (const x of [-1.5, 1.5]) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), validMaterial.clone());
    marker.position.set(x, .16, 1.5); anchors.add(marker);
  }
  anchors.visible = false; group.add(anchors);
  let dragging = false, valid = true, droppedAt = null, penComplete = false;
  const updateAppearance = () => {
    ringMaterial.color.copy((valid ? validMaterial : invalidMaterial).color);
    for (const material of [redMaterial, darkMaterial, creamMaterial]) {
      material.transparent = dragging;
      material.opacity = dragging ? .7 : 1;
    }
  };
  return {
    group,
    setDragging(nextValid) { dragging = true; valid = nextValid; ring.visible = true; updateAppearance(); },
    setSelected(nextSelected) { if (!dragging) ring.visible = nextSelected; anchors.visible = nextSelected && !penComplete; },
    setPenComplete(complete) { penComplete = Boolean(complete); if (penComplete) anchors.visible = false; },
    drop() { dragging = false; valid = true; droppedAt = null; updateAppearance(); },
    settle() { dragging = false; valid = true; updateAppearance(); },
    animate(elapsed, active) {
      if (dragging || active) {
        spring.position.y = .12 + Math.sin(elapsed * 16) * .025;
        spring.rotation.z = Math.sin(elapsed * 13) * .025;
        return;
      }
      if (droppedAt === null) droppedAt = elapsed;
      const age = elapsed - droppedAt;
      const bounce = age < .7 ? Math.sin(age * 19) * Math.exp(-age * 5) : 0;
      spring.position.y = 0; spring.rotation.z = 0;
      spring.scale.set(1 - bounce * .08, 1 + bounce * .18, 1 - bounce * .08);
    },
  };
}

export function createPenVisual(geometry, levelY, building, editing = false) {
  const group = new THREE.Group();
  group.name = `${building.id}-pen`;
  const parts = [];
  geometry.segments.forEach((segment, index) => {
    const a = cornerToWorld(segment.a), b = cornerToWorld(segment.b);
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    const segmentGroup = new THREE.Group();
    segmentGroup.position.set((a.x + b.x) * .5, levelY, (a.z + b.z) * .5);
    if (!horizontal) segmentGroup.rotation.y = Math.PI * .5;
    segmentGroup.userData.building = building;
    segmentGroup.userData.penPart = { type: 'segment', index };
    const posts = Math.max(1, Math.round(length / TILE));
    for (let postIndex = 0; postIndex <= posts; postIndex++) {
      const post = box(.12, .82, .12, fenceDark);
      post.position.set(-length * .5 + postIndex / posts * length, .41, 0);
      segmentGroup.add(post);
    }
    for (const y of [.3, .62]) {
      const rail = box(length, .1, .1, fenceWood); rail.position.y = y; segmentGroup.add(rail);
    }
    const hit = box(length + .18, .95, .34, validMaterial, false, false);
    hit.material = hit.material.clone(); hit.material.opacity = 0; hit.visible = editing;
    hit.position.y = .48;
    hit.userData.building = building;
    hit.userData.penPart = { type: 'segment', index };
    segmentGroup.add(hit);
    group.add(segmentGroup);
    parts.push(hit);
  });
  const handles = geometry.vertices.map((vertex, index) => {
    const world = cornerToWorld(vertex);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(.19, 10, 8), validMaterial.clone());
    handle.position.set(world.x, levelY + .92, world.z);
    handle.visible = editing;
    handle.userData.building = building;
    handle.userData.penPart = { type: 'corner', index };
    group.add(handle);
    return handle;
  });
  return { group, parts, handles, setEditing(enabled) { [...parts, ...handles].forEach(part => { part.visible = enabled; }); } };
}

export function createPenPreview(vertices, levelY, valid = false) {
  const group = new THREE.Group();
  const material = (valid ? validMaterial : invalidMaterial).clone();
  for (let index = 0; index < vertices.length - 1; index++) {
    const a = cornerToWorld(vertices[index]), b = cornerToWorld(vertices[index + 1]);
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    if (!length) continue;
    const rail = box(horizontal ? length : .13, .13, horizontal ? .13 : length, material, false, false);
    rail.position.set((a.x + b.x) * .5, levelY + .48, (a.z + b.z) * .5);
    group.add(rail);
  }
  return group;
}

export function createCowVisual(stage = 'adult') {
  const group = new THREE.Group();
  const body = box(1.02, .58, .58, cowWhite); body.position.y = .7; group.add(body);
  const patch = box(.35, .6, .6, cowBrown); patch.position.set(-.22, .71, 0); group.add(patch);
  const head = box(.48, .46, .48, cowBrown); head.position.set(0, .77, -.47); group.add(head);
  const muzzle = box(.36, .22, .25, cowMuzzle); muzzle.position.set(0, .65, -.78); group.add(muzzle);
  const legs = [];
  for (const [x, z, phase] of [[-.34, -.2, 0], [.34, -.2, Math.PI], [-.34, .2, Math.PI], [.34, .2, 0]]) {
    const leg = box(.12, .48, .12, cowDark); leg.position.set(x, .28, z); leg.userData.phase = phase; group.add(leg); legs.push(leg);
  }
  for (const x of [-.28, .28]) {
    const ear = box(.22, .09, .13, cowBrown); ear.position.set(x, 1.0, -.48); group.add(ear);
  }
  const tail = box(.08, .52, .08, cowBrown); tail.position.set(0, .61, .43); tail.rotation.x = -.25; group.add(tail);
  const setStage = nextStage => {
    group.userData.stage = nextStage;
    group.scale.setScalar(nextStage === 'calf' ? .62 : 1);
  };
  setStage(stage);
  return {
    group,
    setStage,
    animate(elapsed, moving) {
      body.position.y = .7 + Math.sin(elapsed * (moving ? 7 : 2.1) + group.id) * (moving ? .025 : .012);
      legs.forEach(leg => { leg.rotation.x = moving ? Math.sin(elapsed * 7 + leg.userData.phase) * .28 : 0; });
      head.rotation.x = moving ? 0 : Math.sin(elapsed * 1.4 + group.id) * .1;
      tail.rotation.z = Math.sin(elapsed * 2.3 + group.id) * .18;
    },
  };
}

export function normalizeCattleBarnState(saved, context = {}) {
  const vertices = Array.isArray(saved?.pen?.vertices) ? saved.pen.vertices.map(vertex => ({ cx: integer(vertex?.cx), cz: integer(vertex?.cz) })) : null;
  const animals = Array.isArray(saved?.animals) ? saved.animals.flatMap((animal, index) => {
    if (!animal || (animal.stage !== 'adult' && animal.stage !== 'calf')) return [];
    return [{
      id: typeof animal.id === 'string' ? animal.id : `cow-${index + 1}`,
      stage: animal.stage,
      age: animal.stage === 'calf' ? Math.max(0, finite(animal.age)) : 0,
      tileKey: typeof animal.tileKey === 'string' ? animal.tileKey : null,
      targetTileKey: typeof animal.targetTileKey === 'string' ? animal.targetTileKey : null,
      moveProgress: THREE.MathUtils.clamp(finite(animal.moveProgress), 0, 1),
      heading: finite(animal.heading),
      idleSeconds: Math.max(0, finite(animal.idleSeconds)),
      jitterX: finite(animal.jitterX, ((index * 37) % 11 - 5) * .025),
      jitterZ: finite(animal.jitterZ, ((index * 53) % 13 - 6) * .022),
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

export function reconcileCattleBarnAnimals(building, context = {}) {
  if (!building.derived?.valid) return;
  for (const animal of building.animals) {
    let relocated = false;
    if (!building.derived.tileSet.has(animal.tileKey)) {
      const tile = nearestValidTile(building, animal.tileKey);
      animal.tileKey = gridKey(tile.gx, tile.gz);
      relocated = true;
    }
    const [gx, gz] = animal.tileKey.split(',').map(Number);
    const [tx, tz] = String(animal.targetTileKey || '').split(',').map(Number);
    if (relocated || !building.derived.tileSet.has(animal.targetTileKey) || Math.abs(gx - tx) + Math.abs(gz - tz) !== 1) {
      animal.targetTileKey = null;
      animal.moveProgress = 0;
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
    heading: 0, idleSeconds: 1.2, jitterX: .08, jitterZ: -.06, visual: null,
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
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dz]) => gridKey(current.gx + dx, current.gz + dz))
          .filter(key => building.derived.tileSet.has(key));
        if (neighbors.length) {
          const choice = Math.abs(Math.floor(Math.sin(elapsed * 1.73 + animal.id.length * 9 + animal.heading) * 10000)) % neighbors.length;
          animal.targetTileKey = neighbors[choice]; animal.moveProgress = 0; moving = true;
        }
        else animal.idleSeconds = 1.4;
      }
    }
    const target = animal.targetTileKey ? context.terrain?.get(animal.targetTileKey) : null;
    let x = current.x, z = current.z;
    if (target) {
      const distance = Math.max(.001, Math.hypot(target.x - current.x, target.z - current.z));
      animal.moveProgress += dt * (animal.stage === 'calf' ? .55 : .45) / distance;
      const amount = Math.min(1, animal.moveProgress);
      x = THREE.MathUtils.lerp(current.x, target.x, amount);
      z = THREE.MathUtils.lerp(current.z, target.z, amount);
      const desired = Math.atan2(-(target.x - current.x), -(target.z - current.z));
      const delta = Math.atan2(Math.sin(desired - animal.heading), Math.cos(desired - animal.heading));
      animal.heading += delta * (1 - Math.exp(-8 * dt));
      if (amount >= 1) {
        animal.tileKey = animal.targetTileKey; animal.targetTileKey = null; animal.moveProgress = 0;
        animal.idleSeconds = .6 + (Math.abs(Math.sin(elapsed + animal.id.length)) * 1.9); moving = false;
      }
    }
    if (animal.visual) {
      animal.visual.group.position.set(x + animal.jitterX, current.topY + .02, z + animal.jitterZ);
      animal.visual.group.rotation.y = animal.heading;
      animal.visual.animate(elapsed, moving);
    }
  }
}
