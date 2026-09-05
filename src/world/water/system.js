import { TILE, THREE, box, gridKey, mats } from '../../core/shared.js';
import { shuffle } from '../../core/random.js';

export const WATER_DEPTH = .22;

export function addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random, strictBanks) {
  const candidates = shuffle(cells.filter(cell => {
    if (cell.dist < 1.25 || cell.dist > island.r - 1.55) return false;
    const center = terrain.get(gridKey(cell.gx, cell.gz));
    if (!center || center.islandId !== island.id) return false;
    return [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dz]) => {
      const neighbor = terrain.get(gridKey(cell.gx + dx, cell.gz + dz));
      return neighbor?.islandId === island.id && Math.abs(neighbor.topY - center.topY) < .01 &&
        (strictBanks ? hasSolidSurroundings(neighbor, terrain, island.id) : hasCardinalBlocks(neighbor, terrain, island.id));
    });
  }), random);

  for (const candidate of candidates) {
    const lakeKeys = new Set([[0, 0], [1, 0], [0, 1], [1, 1]]
      .map(([dx, dz]) => gridKey(candidate.gx + dx, candidate.gz + dz)));
    const source = terrain.get(gridKey(candidate.gx + 1, candidate.gz + 1));
    const route = findWaterRoute(source, lakeKeys, terrain, island.id, strictBanks);
    if (!route) continue;

    const waterKeys = new Set([...lakeKeys, ...route.path.map(tile => gridKey(tile.gx, tile.gz))]);
    for (const key of waterKeys) {
      const tile = terrain.get(key);
      excavateWaterTile(tile);
      tile.water = true;
      addWaterSurface(tile, water, lakeKeys.has(key));
    }

    route.path.forEach((tile, index) => {
      const next = route.path[index + 1];
      const direction = next
        ? { x: Math.sign(next.x - tile.x), z: Math.sign(next.z - tile.z) }
        : route.outlet;
      addCurrentStreak(tile, direction, water, waterMotion, random);
      if (next && tile.topY > next.topY + .01) addRiverDrop(tile, next, direction, water);
    });
    addWaterfall(route.path.at(-1), route.outlet, water, waterfalls, random);
    return waterKeys;
  }
  return new Set();
}

export function addStarterCoastLake(cells, island, terrain, water, waterMotion, waterfalls, random) {
  // A broad, asymmetric footprint keeps the starter lake from reading as the
  // same four-tile square used as the source of the smaller watercourses.
  const lakeOffsets = [
    [-1, -2], [0, -2], [1, -2],
    [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
    [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
    [-1, 1], [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2],
  ];
  const cellKeys = new Set(cells.map(cell => gridKey(cell.gx, cell.gz)));
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const fitsLake = (candidate, requireBank, minimumSouth = 4) => {
    if (candidate.dz < minimumSouth) return false;
    const lakeCells = lakeOffsets.map(([dx, dz]) => ({
      gx: candidate.gx + dx,
      gz: candidate.gz + dz,
    }));
    if (lakeCells.some(cell => Math.abs(cell.gx - island.cx) <= 3 && Math.abs(cell.gz - island.cz) <= 3)) return false;
    return lakeCells.every(cell => cellKeys.has(gridKey(cell.gx, cell.gz)) && (!requireBank ||
      directions.every(([dx, dz]) => cellKeys.has(gridKey(cell.gx + dx, cell.gz + dz)))));
  };
  const target = { dx: island.r * .2, dz: island.r * .52 };
  const sortSouthEast = (first, second) =>
    Math.hypot(first.dx - target.dx, first.dz - target.dz) -
      Math.hypot(second.dx - target.dx, second.dz - target.dz) ||
    second.dz - first.dz;
  const bankedCandidates = cells.filter(candidate => fitsLake(candidate, true)).sort(sortSouthEast);
  // Extremely notched seeds may not have room for a complete one-tile bank;
  // preserve the full lake footprint and southern placement in that case.
  const bankedKeys = new Set(bankedCandidates.map(candidate => gridKey(candidate.gx, candidate.gz)));
  const fallbackCandidates = cells
    .filter(candidate => fitsLake(candidate, false) && !bankedKeys.has(gridKey(candidate.gx, candidate.gz)))
    .sort(sortSouthEast);
  const candidateKeys = new Set([...bankedCandidates, ...fallbackCandidates]
    .map(candidate => gridKey(candidate.gx, candidate.gz)));
  const edgeCaseCandidates = cells
    .filter(candidate => fitsLake(candidate, false, 3) && !candidateKeys.has(gridKey(candidate.gx, candidate.gz)))
    .sort(sortSouthEast);
  const riverSourceOffsets = [[4, 0], [3, -1], [3, 1], [2, -2], [2, 2]];
  const candidates = [...bankedCandidates, ...fallbackCandidates, ...edgeCaseCandidates];
  let selection = null;

  for (const minimumPathLength of [3, 2]) {
    for (const center of candidates) {
      const lakeKeys = new Set(lakeOffsets.map(([dx, dz]) => gridKey(center.gx + dx, center.gz + dz)));
      const routes = riverSourceOffsets
        .map(([dx, dz]) => terrain.get(gridKey(center.gx + dx, center.gz + dz)))
        .filter(Boolean)
        .map(source => findWaterRoute(
          source, lakeKeys, terrain, island.id, true, { x: 1, z: 0 }, minimumPathLength
        ))
        .filter(Boolean)
        .sort((first, second) => first.path.length - second.path.length);
      if (!routes.length) continue;
      selection = { lakeKeys, route: routes[0] };
      break;
    }
    if (selection) break;
  }
  if (!selection) return new Set();

  const { lakeKeys, route } = selection;
  const waterKeys = new Set([...lakeKeys, ...route.path.map(tile => gridKey(tile.gx, tile.gz))]);
  for (const key of waterKeys) {
    const tile = terrain.get(key);
    excavateWaterTile(tile);
    tile.water = true;
    addWaterSurface(tile, water, lakeKeys.has(key));
  }

  route.path.forEach((tile, index) => {
    const next = route.path[index + 1];
    const direction = next
      ? { x: Math.sign(next.x - tile.x), z: Math.sign(next.z - tile.z) }
      : route.outlet;
    addCurrentStreak(tile, direction, water, waterMotion, random);
  });
  addWaterfall(route.path.at(-1), route.outlet, water, waterfalls, random);
  return waterKeys;
}

function excavateWaterTile(tile) {
  tile.topY -= WATER_DEPTH;
  tile.dirtDepth -= WATER_DEPTH;
}

function findWaterRoute(source, lakeKeys, terrain, islandId, strictBanks, requiredOutlet = null, minimumPathLength = 4) {
  const queue = [{ tile: source, path: [source] }];
  const visited = new Set([gridKey(source.gx, source.gz)]);
  const directions = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];

  while (queue.length) {
    const current = queue.shift();
    const outlets = directions.filter(direction => {
      const neighbor = terrain.get(gridKey(current.tile.gx + direction.x, current.tile.gz + direction.z));
      return !neighbor || neighbor.islandId !== islandId;
    });
    // Only the final tile may touch the island edge, and it needs a single,
    // deliberate side for the waterfall rather than a corner-shaped opening.
    const hasBanks = strictBanks ? hasSolidSurroundings : hasCardinalBlocks;
    const facesRequiredOutlet = !requiredOutlet ||
      (outlets[0]?.x === requiredOutlet.x && outlets[0]?.z === requiredOutlet.z);
    if (outlets.length === 1 && facesRequiredOutlet && current.path.length >= minimumPathLength &&
      hasBanks(current.tile, terrain, islandId, outlets[0])) {
      return { path: current.path, outlet: outlets[0] };
    }
    if (outlets.length) continue;

    for (const direction of directions) {
      if (requiredOutlet && direction.x === -requiredOutlet.x && direction.z === -requiredOutlet.z) continue;
      const key = gridKey(current.tile.gx + direction.x, current.tile.gz + direction.z);
      const neighbor = terrain.get(key);
      if (!neighbor || neighbor.islandId !== islandId || lakeKeys.has(key) || visited.has(key)) continue;
      // A river may run along a level surface or tumble down a terrace, but it
      // never climbs uphill on its way to the island edge.
      if (neighbor.topY > current.tile.topY + .01) continue;
      const downhill = neighbor.topY < current.tile.topY - .01;
      if (!hasBanks(current.tile, terrain, islandId, downhill ? direction : null)) continue;
      visited.add(key);
      queue.push({ tile: neighbor, path: [...current.path, neighbor] });
    }
  }
  return null;
}

function hasSolidSurroundings(tile, terrain, islandId, opening = null) {
  return [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]
    .every(direction => {
      const neighbor = terrain.get(gridKey(tile.gx + direction.x, tile.gz + direction.z));
      const isOpening = direction.x === opening?.x && direction.z === opening?.z;
      if (isOpening) {
        // A downhill course exits through one lower, still-solid block. The
        // final waterfall is the only case where this neighbour may be absent.
        return !neighbor || neighbor.islandId !== islandId || neighbor.topY < tile.topY - .01;
      }
      return neighbor?.islandId === islandId && neighbor.topY >= tile.topY - .01;
    });
}

function hasCardinalBlocks(tile, terrain, islandId, opening = null) {
  return [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]
    .filter(direction => direction.x !== opening?.x || direction.z !== opening?.z)
    .every(direction => terrain.get(gridKey(tile.gx + direction.x, tile.gz + direction.z))?.islandId === islandId);
}

function addWaterSurface(tile, water, lake) {
  // Top-only, edge-to-edge planes avoid the dark box sides and gaps that made
  // the first water pass read as individually bordered tiles.
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(TILE, TILE), mats.water);
  surface.rotation.x = -Math.PI * .5;
  surface.position.set(tile.x, tile.topY + .012, tile.z);
  surface.castShadow = false;
  surface.receiveShadow = false;
  surface.name = lake ? 'lake-surface' : 'river-surface';
  water.add(surface);
}

function addCurrentStreak(tile, direction, water, waterMotion, random) {
  if (!direction.x && !direction.z) return;
  for (let index = 0; index < 2; index++) {
    const streak = box(.075, .012, .34, mats.waterFoam, false, false);
    streak.rotation.y = Math.atan2(direction.x, direction.z);
    streak.position.y = tile.topY + .042;
    streak.renderOrder = 2;
    water.add(streak);
    waterMotion.push({
      mesh: streak,
      x: tile.x + (random() - .5) * .34,
      y: tile.topY + .042,
      z: tile.z + (random() - .5) * .34,
      direction,
      phase: random(),
    });
  }
}

function addRiverDrop(from, to, direction, water) {
  const drop = from.topY - to.topY;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(TILE * .94, drop), mats.water);
  sheet.position.set(
    from.x + direction.x * TILE * .5,
    to.topY + drop * .5,
    from.z + direction.z * TILE * .5,
  );
  if (direction.x) sheet.rotation.y = direction.x > 0 ? Math.PI * .5 : -Math.PI * .5;
  else if (direction.z < 0) sheet.rotation.y = Math.PI;
  sheet.name = 'river-drop';
  water.add(sheet);
}

function addWaterfall(tile, direction, water, waterfalls, random) {
  const height = 15;
  const atEastWestEdge = direction.x !== 0;
  const waterfall = box(
    atEastWestEdge ? .07 : TILE * .78,
    height,
    atEastWestEdge ? TILE * .78 : .07,
    mats.water,
    false,
    true,
  );
  waterfall.position.set(
    tile.x + direction.x * (TILE * .5 + .02),
    tile.topY - height * .5 + .02,
    tile.z + direction.z * (TILE * .5 + .02),
  );
  water.add(waterfall);

  const streams = [];
  for (let index = 0; index < 3; index++) {
    const stream = box(
      atEastWestEdge ? .084 : .11,
      1.15,
      atEastWestEdge ? .11 : .084,
      mats.waterFoam,
      false,
      false,
    );
    const across = (index - 1) * .22;
    stream.position.set(
      waterfall.position.x + (atEastWestEdge ? 0 : across),
      tile.topY - random() * height,
      waterfall.position.z + (atEastWestEdge ? across : 0),
    );
    stream.renderOrder = 2;
    water.add(stream);
    streams.push({ mesh: stream, phase: random() });
  }
  waterfalls.push({ streams, topY: tile.topY + .05, height });
}

