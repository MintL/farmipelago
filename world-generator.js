import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, SOIL_DEPTH, TILE, box, gridKey, THREE } from './shared.js';

const PLATEAU_TYPES = ['terraces', 'ridge', 'mesa', 'twin', 'rim', 'shelves'];
const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const BRIDGE_GAP_TILES = 3;
const BRIDGE_WIDTH = TILE * 1.25;
const BRIDGE_THICKNESS = 0.18;

export function generateFarm(scene, physics, seed = (Math.random() * 0xffffffff) >>> 0) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  const terrain = new Map();
  const obstacles = [];
  const lowerBlocks = [];
  const bridgeBlocks = [];
  const trees = [];
  scene.add(group);

  const addTile = (gx, gz, topY, islandId, radial, baseY = topY) => {
    const x = gx * TILE;
    const z = gz * TILE;
    const dirtDepth = SOIL_DEPTH + Math.max(0, topY - baseY);
    const dirt = box(TILE, dirtDepth, TILE, mats.soil);
    dirt.position.set(x, topY - GRASS_TOP - dirtDepth * 0.5, z);
    group.add(dirt);

    const top = box(TILE, GRASS_TOP, TILE, topY > baseY + 0.01 ? mats.grassHigh : mats.grass);
    top.position.set(x, topY - GRASS_TOP * 0.5, z);
    group.add(top);
    terrain.set(gridKey(gx, gz), { gx, gz, x, z, topY, baseY, islandId, radial, topMesh: top, ploughed: false });
  };

  const addLowerLayers = (cells, topY, radius) => {
    for (let layer = 1; layer <= 8; layer++) {
      const maxRadius = radius - layer * 0.34;
      if (maxRadius < 0.35) break;
      const material = layer < 2 ? mats.soil : (layer % 2 ? mats.stone : mats.stoneDark);
      const y = topY - GRASS_TOP - SOIL_DEPTH - (layer - 0.5) * LAYER_DEPTH;
      for (const cell of cells) {
        const wobble = Math.sin(cell.gx * 17.1 + cell.gz * 9.7 + layer * 3.2) * (0.13 + layer * 0.018);
        if (cell.dist <= maxRadius + wobble) {
          const layerMesh = box(TILE, LAYER_DEPTH, TILE, material);
          layerMesh.position.set(cell.gx * TILE, y, cell.gz * TILE);
          group.add(layerMesh);
          lowerBlocks.push({
            x: layerMesh.position.x,
            y,
            z: layerMesh.position.z,
            width: TILE,
            height: LAYER_DEPTH,
            depth: TILE,
          });
        }
      }
    }
  };

  const addTree = (x, y, z, large) => {
    const tree = new THREE.Group();
    const sway = new THREE.Group();
    tree.add(sway);
    const voxel = large ? 0.22 : 0.17;
    const trunkHeight = large ? 1.75 : 1.08;
    const trunk = box(voxel * 1.25, trunkHeight, voxel * 1.25, mats.trunk);
    trunk.position.y = trunkHeight * 0.5;
    sway.add(trunk);
    const leafCoords = large
      ? [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[1,0,1],[-1,0,-1],[-1,0,1],[1,0,-1],[0,1,0],[1,1,0],[-1,1,0],[0,1,1],[0,1,-1],[0,2,0]]
      : [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]];
    const leafSize = large ? voxel * 2.15 : voxel * 2.1;
    const leafBaseY = trunkHeight - (large ? 0.15 : 0.08);
    leafCoords.forEach(([lx, ly, lz], index) => {
      const leaf = box(leafSize, leafSize, leafSize, index % 3 === 0 ? mats.leavesLight : mats.leaves);
      leaf.position.set(lx * leafSize * .75, leafBaseY + ly * leafSize * .72, lz * leafSize * .75);
      sway.add(leaf);
    });
    tree.position.set(x, y, z);
    tree.rotation.y = random() * Math.PI * 2;
    group.add(tree);
    trees.push({ sway, phase: random() * Math.PI * 2, strength: large ? .052 : .065 });
    obstacles.push({ x, y, z, radius: large ? 0.47 : 0.32, height: trunkHeight });
  };

  const addStone = (x, y, z, scale) => {
    const stone = new THREE.Group();
    const voxel = 0.16 * scale;
    for (const [px, py, pz] of [[-1,0,0],[0,0,0],[1,0,0],[0,0,1],[0,0,-1],[0,1,0],[1,1,0],[-1,1,0]]) {
      const piece = box(voxel * 1.05, voxel * 0.9, voxel * 1.05, py ? mats.stone : mats.stoneDark);
      piece.position.set(px * voxel * .75, py * voxel * .72, pz * voxel * .75);
      stone.add(piece);
    }
    stone.position.set(x, y + voxel * .45, z);
    group.add(stone);
  };

  const backbone = [
    { cx: 0, cz: 11, h: 0, r: 5.6 }, { cx: -4, cz: 2, h: 1, r: 3.6 },
    { cx: 3, cz: -6, h: 2, r: 3.8 }, { cx: -3, cz: -14, h: 1, r: 5.5 },
    { cx: 3, cz: -23, h: 2, r: 3.8 }, { cx: -2, cz: -31, h: 3, r: 3.7 },
  ];
  const branch = { cx: (random() > .5 ? 1 : -1) * 17, cz: -19 + Math.round((random() - .5) * 2), h: random() > .5 ? 0 : 2, r: 3.5 };
  const islands = [...backbone, branch].map((island, id) => ({ ...island, id }));

  islands.forEach((island, id) => {
    if (id > 0 && id < backbone.length) island.cx += Math.round((random() - .5) * 1.1);
    island.r += (random() - .5) * 0.22;
    const cells = createOrganicCells(island.cx, island.cz, island.r, seed + id * 911);
    const type = PLATEAU_TYPES[id % PLATEAU_TYPES.length];
    const angle = random() * Math.PI * 2;
    cells.forEach(cell => addTile(cell.gx, cell.gz, island.h + plateauHeight(cell, island, type, angle), id, cell.dist / island.r, island.h));
    addLowerLayers(cells, island.h, island.r);

    for (const cell of cells.filter(candidate => candidate.dist > 1.1 && candidate.dist < island.r - .15)) {
      if (id === 0 && Math.hypot(cell.dx, cell.dz) < 1.35) continue;
      if (plateauHeight(cell, island, type, angle) > 0) continue;
      const x = cell.gx * TILE + (random() - .5) * .18;
      const z = cell.gz * TILE + (random() - .5) * .18;
      const y = terrain.get(gridKey(cell.gx, cell.gz))?.topY ?? island.h;
      const roll = random();
      if (roll < .055) addTree(x, y, z, true);
      else if (roll < .13) addTree(x, y, z, false);
      else if (roll < .23) addStone(x, y, z, .8 + random() * .5);
    }
  });

  for (let index = 0; index < backbone.length - 1; index++) {
    addBridgeBetween(islands[index], islands[index + 1], terrain, group, bridgeBlocks);
  }
  const branchIsland = islands.at(-1);
  const branchAnchor = islands.slice(0, -1).reduce((closest, island) => {
    const closestDistance = Math.hypot(closest.cx - branchIsland.cx, closest.cz - branchIsland.cz);
    const distance = Math.hypot(island.cx - branchIsland.cx, island.cz - branchIsland.cz);
    return distance < closestDistance ? island : closest;
  });
  addBridgeBetween(branchAnchor, branchIsland, terrain, group, bridgeBlocks);

  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const start = terrain.get(gridKey(backbone[0].cx, backbone[0].cz)) || terrain.values().next().value;
  return {
    group,
    terrain,
    spawn: { x: start.x, y: start.topY, z: start.z },
    animate(elapsed) {
      for (const tree of trees) {
        const gust = Math.sin(elapsed * .55 + tree.phase) * .35 + Math.sin(elapsed * 1.3 + tree.phase * 1.7) * .12;
        tree.sway.rotation.z = Math.sin(elapsed * 1.15 + tree.phase) * tree.strength + gust * .018;
        tree.sway.rotation.x = Math.cos(elapsed * .9 + tree.phase * .73) * tree.strength * .62 + gust * .012;
      }
    },
    ploughAt(x, z) {
      const tile = terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
      if (!tile || tile.ploughed) return false;
      tile.ploughed = true;
      tile.topMesh.material = mats.ploughed;
      return true;
    },
  };
}

function addBridgeBetween(fromIsland, toIsland, terrain, group, bridgeBlocks) {
  const gap = closestIslandGap(terrain, fromIsland.id, toIsland.id);
  if (!gap || gap.distance / TILE <= BRIDGE_GAP_TILES) return;

  const centerDistance = Math.hypot(gap.to.x - gap.from.x, gap.to.z - gap.from.z);
  const direction = { x: (gap.to.x - gap.from.x) / centerDistance, z: (gap.to.z - gap.from.z) / centerDistance };
  const start = {
    x: gap.from.x + direction.x * TILE * .48,
    y: gap.from.topY,
    z: gap.from.z + direction.z * TILE * .48,
  };
  const end = {
    x: gap.to.x - direction.x * TILE * .48,
    y: gap.to.topY,
    z: gap.to.z - direction.z * TILE * .48,
  };
  const span = Math.hypot(end.x - start.x, end.z - start.z);

  const bridge = new THREE.Group();
  const yaw = Math.atan2(direction.x, direction.z);
  const plankCount = Math.ceil(span / 0.52);
  const plankLength = span / plankCount + 0.025;
  bridge.name = 'bridge';
  group.add(bridge);

  for (let index = 0; index < plankCount; index++) {
    const progress = (index + .5) / plankCount;
    const x = THREE.MathUtils.lerp(start.x, end.x, progress);
    const y = THREE.MathUtils.lerp(start.y, end.y, progress);
    const z = THREE.MathUtils.lerp(start.z, end.z, progress);
    const plank = box(BRIDGE_WIDTH, BRIDGE_THICKNESS, plankLength, index % 2 ? mats.bridge : mats.bridgeDark);
    plank.position.set(x, y - BRIDGE_THICKNESS * .5, z);
    plank.rotation.y = yaw;
    bridge.add(plank);
    bridgeBlocks.push({ x, y: y - BRIDGE_THICKNESS * .5, z, width: BRIDGE_WIDTH, height: BRIDGE_THICKNESS, depth: plankLength, yaw });
  }
}

function closestIslandGap(terrain, fromId, toId) {
  const fromTiles = [];
  const toTiles = [];
  for (const tile of terrain.values()) {
    if (tile.islandId === fromId) fromTiles.push(tile);
    else if (tile.islandId === toId) toTiles.push(tile);
  }

  let closest = null;
  for (const from of fromTiles) {
    for (const to of toTiles) {
      const distance = tileEdgeDistance(from, to);
      if (!closest || distance < closest.distance) {
        closest = { from, to, distance };
      }
    }
  }
  return closest;
}

function tileEdgeDistance(first, second) {
  const dx = Math.max(0, Math.abs(first.x - second.x) - TILE);
  const dz = Math.max(0, Math.abs(first.z - second.z) - TILE);
  return Math.hypot(dx, dz);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createOrganicCells(cx, cz, radius, seed) {
  const cells = [];
  const random = seededRandom(seed);
  const rotation = random() * Math.PI;
  const stretch = 1.04 + random() * .26;
  const squeeze = .76 + random() * .18;
  const lobePhase = random() * Math.PI * 2;
  const ridgePhase = random() * Math.PI * 2;
  const notchAngle = random() * Math.PI * 2;
  const extent = Math.ceil(radius * stretch) + 2;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  for (let dx = -extent; dx <= extent; dx++) for (let dz = -extent; dz <= extent; dz++) {
    const rx = dx * cos + dz * sin, rz = -dx * sin + dz * cos;
    const distance = Math.hypot(rx / stretch, rz / squeeze);
    const angle = Math.atan2(rz, rx);
    const boundary = radius * (1 + Math.sin(angle * 3 + lobePhase) * .18 + Math.sin(angle * 5 + ridgePhase) * .09 - Math.pow(Math.max(0, Math.cos(angle - notchAngle)), 8) * .16) + (random() - .5) * .62;
    if (distance <= boundary) cells.push({ gx: cx + dx, gz: cz + dz, dx, dz, dist: distance });
  }
  if (!cells.some(cell => cell.gx === cx && cell.gz === cz)) cells.push({ gx: cx, gz: cz, dx: 0, dz: 0, dist: 0 });
  return cells;
}

function plateauHeight(cell, island, type, angle) {
  const along = cell.dx * Math.cos(angle) + cell.dz * Math.sin(angle);
  const across = -cell.dx * Math.sin(angle) + cell.dz * Math.cos(angle);
  const field = (minAlong, maxAlong, halfWidth, acrossOffset = 0) =>
    along >= island.r * minAlong && along <= island.r * maxAlong &&
    Math.abs(across - island.r * acrossOffset) <= island.r * halfWidth;

  // A one-block-high rectangular field at an island edge. The remaining base
  // stays broad and level, giving each island multiple practical farm areas.
  if (type === 'terraces') return field(.12, .80, .58) ? PLATEAU_BLOCK_HEIGHT : 0;
  if (type === 'ridge') return field(-.80, -.18, .48) ? PLATEAU_BLOCK_HEIGHT : 0;
  if (type === 'mesa') return field(-.74, -.12, .58) ? PLATEAU_BLOCK_HEIGHT : 0;
  if (type === 'twin') {
    const firstField = field(-.78, -.22, .28, -.34);
    const secondField = field(.22, .78, .28, .34);
    return firstField || secondField ? PLATEAU_BLOCK_HEIGHT : 0;
  }
  if (type === 'rim') return field(-.58, .60, .30, .46) ? PLATEAU_BLOCK_HEIGHT : 0;
  return field(-.72, .56, .42, -.36) ? PLATEAU_BLOCK_HEIGHT : 0;
}
