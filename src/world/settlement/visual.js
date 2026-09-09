import { MODEL_VOXEL, TILE, THREE, createVoxelModel, gridKey, mats } from '../../core/shared.js';
import { createVillageFlag } from './flag.js';

const BUILDING_HEIGHT = MODEL_VOXEL * 10;

function addRun(parts, material, at, size) {
  parts.push({ material, at, size });
}

function createBuildingModel({ name, width = 9, depth = 9, wallMaterial, roofMaterial, accentMaterial }) {
  const parts = [];
  const doorLeft = Math.floor((width - 3) * .5);
  addRun(parts, mats.stone, [0, 0, 0], [width, 1, depth]);
  addRun(parts, wallMaterial, [0, 1, depth - 1], [width, 6, 1]);
  addRun(parts, wallMaterial, [0, 1, 0], [doorLeft, 6, 1]);
  addRun(parts, wallMaterial, [doorLeft + 3, 1, 0], [width - doorLeft - 3, 6, 1]);
  addRun(parts, wallMaterial, [doorLeft, 6, 0], [3, 1, 1]);
  addRun(parts, accentMaterial, [doorLeft, 1, 1], [3, 5, 1]);
  for (const sideX of [0, width - 1]) {
    addRun(parts, wallMaterial, [sideX, 1, 0], [1, 2, depth]);
    addRun(parts, wallMaterial, [sideX, 5, 0], [1, 2, depth]);
    addRun(parts, wallMaterial, [sideX, 3, 0], [1, 2, 3]);
    addRun(parts, wallMaterial, [sideX, 3, 6], [1, 2, depth - 6]);
    addRun(parts, mats.cab, [sideX, 3, 3], [1, 2, 3]);
  }
  const roofDepth = depth + 2;
  const roofCourses = Math.ceil(width / 4);
  for (let course = 0; course < roofCourses; course++) {
    const left = course * 2 - 1;
    const right = width - course * 2 - 1;
    if (right - left <= 2) {
      addRun(parts, roofMaterial, [left, 7 + course, -1], [right - left + 2, 1, roofDepth]);
      break;
    }
    addRun(parts, roofMaterial, [left, 7 + course, -1], [2, 1, roofDepth]);
    addRun(parts, roofMaterial, [right, 7 + course, -1], [2, 1, roofDepth]);
  }
  addRun(parts, accentMaterial, [width - 3, 2, depth], [2, 2, 1]);
  return createVoxelModel(parts, {
    name,
    origin: [-width * .5, 0, -depth * .5],
  });
}

function footprintIsClear(terrain, tile, islandId, spanX, spanZ) {
  for (let dx = -spanX; dx <= spanX; dx++) {
    for (let dz = -spanZ; dz <= spanZ; dz++) {
      const candidate = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      if (!candidate || candidate.islandId !== islandId || candidate.water || candidate.reserved ||
        Math.abs(candidate.topY - tile.topY) > .01) return false;
    }
  }
  return true;
}

function reserveFootprint(terrain, tile, spanX, spanZ) {
  for (let dx = -spanX; dx <= spanX; dx++) {
    for (let dz = -spanZ; dz <= spanZ; dz++) {
      const candidate = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      if (!candidate) continue;
      candidate.reserved = true;
      candidate.noDecoration = true;
    }
  }
}

function reservePath(terrain, islandId, from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz || 1;
  const tiles = [];
  for (const tile of terrain.values()) {
    if (tile.islandId !== islandId || tile.water) continue;
    const progress = THREE.MathUtils.clamp(((tile.x - from.x) * dx + (tile.z - from.z) * dz) / lengthSquared, 0, 1);
    const x = from.x + dx * progress;
    const z = from.z + dz * progress;
    if (Math.hypot(tile.x - x, tile.z - z) > TILE * .72) continue;
    tile.reserved = true;
    tile.noDecoration = true;
    tiles.push(tile);
  }
  return tiles;
}

export function createSettlementVisual({ island, terrain, cargoSite, bridgeLanding, reducedMotion = false }) {
  const group = new THREE.Group();
  group.name = 'settlement';
  const colliders = [];
  const occluders = [];
  const lanternPositions = [];
  const lightSurfaceQuads = [];
  let receivingSite = null;
  const pathTiles = reservePath(terrain, island.id, bridgeLanding, cargoSite);
  const candidates = [...terrain.values()].filter(tile => tile.islandId === island.id && !tile.water);
  const specs = [
    { name: 'settlement-receiving-house', dx: -1.0, dz: -3.0, width: 11, wall: mats.tractorCream, roof: mats.red, accent: mats.bridgeDark },
    { name: 'settlement-home-blue', dx: -4.2, dz: -3.0, width: 9, wall: mats.tractorCream, roof: mats.tractor, accent: mats.bridgeDark },
    { name: 'settlement-home-red', dx: 2.3, dz: -3.0, width: 9, wall: mats.tractorCream, roof: mats.red, accent: mats.tractorDark },
  ];

  for (const spec of specs) {
    const targetX = (island.cx + spec.dx) * TILE;
    const targetZ = (island.cz + spec.dz) * TILE;
    const tile = candidates
      .filter(candidate => footprintIsClear(terrain, candidate, island.id, 1, 1))
      .sort((first, second) => Math.hypot(first.x - targetX, first.z - targetZ) - Math.hypot(second.x - targetX, second.z - targetZ))[0];
    if (!tile) throw new Error(`Settlement requires a clear site for ${spec.name}`);
    reserveFootprint(terrain, tile, 1, 1);
    if (spec.name === 'settlement-receiving-house') {
      receivingSite = { x: tile.x, y: tile.topY, z: tile.z + MODEL_VOXEL * 4.5, outward: { x: 0, z: -1 } };
      for (let dz = 1; dz <= 2; dz++) {
        const approach = terrain.get(gridKey(tile.gx, tile.gz + dz));
        if (!approach || approach.islandId !== island.id || approach.water) continue;
        approach.reserved = true;
        approach.noDecoration = true;
        pathTiles.push(approach);
      }
      continue;
    }
    const building = createBuildingModel({
      name: spec.name,
      width: spec.width,
      wallMaterial: spec.wall,
      roofMaterial: spec.roof,
      accentMaterial: spec.accent,
    });
    building.position.set(tile.x, tile.topY + .01, tile.z);
    building.rotation.y = Math.PI;
    group.add(building);
    occluders.push(building);
    colliders.push({
      islandId: island.id,
      shape: 'box',
      x: tile.x,
      y: tile.topY,
      z: tile.z,
      width: spec.width * MODEL_VOXEL,
      height: BUILDING_HEIGHT,
      depth: 9 * MODEL_VOXEL,
      radius: spec.width * MODEL_VOXEL * .5,
    });
    for (let dz = 1; dz <= 2; dz++) {
      const approach = terrain.get(gridKey(tile.gx, tile.gz + dz));
      if (!approach || approach.islandId !== island.id || approach.water) continue;
      approach.reserved = true;
      approach.noDecoration = true;
      pathTiles.push(approach);
    }
  }

  const flag = createVillageFlag(receivingSite, { reducedMotion });
  group.add(flag.group);
  colliders.push(...flag.colliders.map(collider => ({ ...collider, islandId: island.id })));

  return {
    group,
    receivingSite,
    colliders,
    occluders,
    lanternPositions,
    lightSurfaceQuads,
    pathTiles,
    animate: flag.animate,
  };
}
