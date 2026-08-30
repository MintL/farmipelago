import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, SOIL_DEPTH, TILE, box, gridKey, THREE } from './shared.js';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const BRIDGE_GAP_TILES = 3;
const BRIDGE_WIDTH = TILE * 1.25;
const BRIDGE_THICKNESS = 0.18;
const STARTER_ISLAND_ID = 0;
const BARN_TREE_CLEARANCE = 3.5 * TILE;
const WATER_DEPTH = .22;

export function generateFarm(scene, physics, seed = (Math.random() * 0xffffffff) >>> 0) {
  const random = seededRandom(seed);
  const terrainNoise = createPerlin(seed ^ 0x9e3779b9);
  const group = new THREE.Group();
  const terrain = new Map();
  const obstacles = [];
  const lowerBlocks = [];
  const bridgeBlocks = [];
  const trees = [];
  const tallGrass = new THREE.Group();
  const water = new THREE.Group();
  const waterMotion = [];
  const waterfalls = [];
  const waterParticles = [];
  let waterElapsed = 0;
  tallGrass.name = 'tall-grass';
  water.name = 'water';
  scene.add(group);
  group.add(tallGrass);
  group.add(water);

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
    terrain.set(gridKey(gx, gz), {
      gx, gz, x, z, topY, baseY, islandId, radial, topMesh: top, dirtMesh: dirt, dirtDepth,
      tallGrass: null, ploughed: false, water: false,
    });
  };

  const addTallGrass = tile => {
    const tuft = new THREE.Group();
    tuft.position.set(tile.x, tile.topY, tile.z);
    for (let index = 0; index < 9; index++) {
      const height = .55 + random() * .38;
      const blade = box(.05, height, .065, mats.tallGrass, false, false);
      blade.position.set((random() - .5) * .5, height * .5, (random() - .5) * .5);
      blade.rotation.set((random() - .5) * .18, random() * Math.PI, (random() - .5) * .18);
      tuft.add(blade);
    }
    tallGrass.add(tuft);
    tile.tallGrass = tuft;
  };

  const addLowerLayers = (cells, topY, radius) => {
    for (let layer = 1; layer <= 8; layer++) {
      const maxRadius = radius - layer * 0.34;
      if (maxRadius < 0.35) break;
      const material = layer < 2 ? mats.soil : (layer % 2 ? mats.stone : mats.stoneDark);
      const y = topY - GRASS_TOP - SOIL_DEPTH - (layer - 0.5) * LAYER_DEPTH;
      for (const cell of cells) {
        const wobble = terrainNoise(cell.gx * .22 + layer * 2.7, cell.gz * .22 - layer * 1.9) * (0.13 + layer * 0.018);
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
    const silhouette = Math.floor(random() * 2);
    const scale = large ? 1.5 : 1.14;
    const design = treeDesign(silhouette);
    const voxel = .27 * scale;
    const trunkHeight = design.trunkHeight * scale;
    const trunk = box(.15 * scale, trunkHeight, .15 * scale, mats.trunk);
    trunk.position.y = trunkHeight * 0.5;
    sway.add(trunk);
    const addBranch = (start, end) => {
      const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
      const branch = box(.105 * scale, .105 * scale, direction.length(), mats.trunk);
      branch.position.set(
        (start[0] + end[0]) * .5,
        (start[1] + end[1]) * .5,
        (start[2] + end[2]) * .5,
      );
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
      sway.add(branch);
    };
    design.branches.forEach(([sx, sy, sz, ex, ey, ez]) => {
      addBranch([sx * scale, sy * scale, sz * scale], [ex * scale, ey * scale, ez * scale]);
    });
    design.leaves.forEach(([lx, ly, lz], index) => {
      const leaf = box(voxel, voxel, voxel, index % 3 === 0 ? mats.leavesLight : mats.leaves);
      leaf.position.set(lx * voxel, design.leafBaseY * scale + ly * voxel, lz * voxel);
      sway.add(leaf);
    });
    tree.position.set(x, y, z);
    tree.rotation.y = random() * Math.PI * 2;
    group.add(tree);
    trees.push({
      sway,
      phase: random() * Math.PI * 2,
      strength: large ? .052 : .065,
    });
    obstacles.push({ x, y, z, radius: design.radius * scale, height: trunkHeight });
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

  const addBarn = (x, y, z) => {
    const barn = new THREE.Group();
    const width = TILE * 3;
    const depth = TILE * 3;
    const wallHeight = 2.25;
    const roofHeight = .95;
    const wallThickness = .16;
    const doorwayWidth = TILE * 1.08;
    const frontWallWidth = (width - doorwayWidth) * .5;
    const yaw = Math.PI * 1.5;
    const roofPitch = Math.atan2(roofHeight, width * .5);
    barn.name = 'barn';
    barn.position.set(x, y, z);
    barn.rotation.y = yaw;
    group.add(barn);

    const addWall = (wallWidth, wallDepth, localX, localZ) => {
      const wall = box(wallWidth, wallHeight, wallDepth, mats.red);
      wall.position.set(localX, wallHeight * .5, localZ);
      barn.add(wall);
    };
    const wallEdgeX = width * .5 - wallThickness * .5;
    const wallEdgeZ = depth * .5 - wallThickness * .5;
    addWall(width, wallThickness, 0, wallEdgeZ);
    addWall(wallThickness, depth, -wallEdgeX, 0);
    addWall(wallThickness, depth, wallEdgeX, 0);
    for (const side of [-1, 1]) {
      const localX = side * (doorwayWidth + frontWallWidth) * .5;
      addWall(frontWallWidth, wallThickness, localX, -wallEdgeZ);
    }

    const loft = box(.72, .38, .065, mats.bridgeDark);
    loft.position.set(0, 1.72, -wallEdgeZ - .04);
    barn.add(loft);
    for (const side of [-1, 1]) {
      const openDoor = box(doorwayWidth * .46, 1.42, .09, mats.bridgeDark);
      openDoor.position.set(side * (doorwayWidth * .5 + .18), .71, -depth * .5 - .22);
      openDoor.rotation.y = side * .8;
      barn.add(openDoor);
    }

    for (const side of [-1, 1]) {
      const roof = box(width * .59, .18, depth + .24, mats.bridgeDark);
      roof.position.set(side * width * .25, wallHeight + roofHeight * .47, 0);
      roof.rotation.z = -side * roofPitch;
      barn.add(roof);
    }

    const addWallCollider = (wallWidth, wallDepth, localX, localZ) => {
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      obstacles.push({
        shape: 'box',
        x: x + localX * cos + localZ * sin,
        y,
        z: z - localX * sin + localZ * cos,
        width: wallWidth,
        height: wallHeight,
        depth: wallDepth,
        yaw,
      });
    };
    addWallCollider(width, wallThickness, 0, wallEdgeZ);
    addWallCollider(wallThickness, depth, -wallEdgeX, 0);
    addWallCollider(wallThickness, depth, wallEdgeX, 0);
    for (const side of [-1, 1]) {
      const localX = side * (doorwayWidth + frontWallWidth) * .5;
      addWallCollider(frontWallWidth, wallThickness, localX, -wallEdgeZ);
    }
  };

  const backbone = [
    { cx: 0, cz: 11, h: 0, r: 5.6 }, { cx: -4, cz: 0, h: 1, r: 3.6 },
    { cx: 3, cz: -10, h: 2, r: 3.8 }, { cx: -3, cz: -20, h: 1, r: 5.5 },
    { cx: 3, cz: -31, h: 2, r: 3.8 }, { cx: -2, cz: -41, h: 3, r: 3.7 },
  ];
  const branch = { cx: (random() > .5 ? 1 : -1) * 20, cz: -22 + Math.round((random() - .5) * 2), h: random() > .5 ? 0 : 2, r: 3.5 };
  const islands = [...backbone, branch].map((island, id) => ({ ...island, id }));
  let barnSite;

  islands.forEach((island, id) => {
    if (id > 0 && id < backbone.length) island.cx += Math.round((random() - .5) * 1.1);
    island.r += (random() - .5) * 0.22;
    const cells = createOrganicCells(island.cx, island.cz, island.r, seed + id * 911);
    const angle = random() * Math.PI * 2;
    const tileHeight = cell => id === STARTER_ISLAND_ID
      ? 0
      : plateauHeight(cell, island, angle);
    cells.forEach(cell => addTile(cell.gx, cell.gz, island.h + tileHeight(cell), id, cell.dist / island.r, island.h));
    addLowerLayers(cells, island.h, island.r);
    // Two backbone islands always try to grow water, with occasional extra
    // courses elsewhere so regenerated farms remain varied without going dry.
    const waterTiles = id > 0 && (id === 2 || id === 4 || random() < .25)
      ? addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random)
      : new Set();
    if (id === STARTER_ISLAND_ID) barnSite = findBarnSite(terrain, island);

    const clearCells = cells.filter(candidate => {
      const starterField = id === STARTER_ISLAND_ID && Math.abs(candidate.dx) <= 3 && Math.abs(candidate.dz) <= 3;
      return candidate.dist > 1.1 && candidate.dist < island.r - .15 && !starterField &&
        tileHeight(candidate) === 0 && !waterTiles.has(gridKey(candidate.gx, candidate.gz));
    });
    const grassPatches = chooseGrassPatches(clearCells, random, id === STARTER_ISLAND_ID ? 1 : 2);
    for (const cell of clearCells) {
      const x = cell.gx * TILE + (random() - .5) * .18;
      const z = cell.gz * TILE + (random() - .5) * .18;
      const y = terrain.get(gridKey(cell.gx, cell.gz))?.topY ?? island.h;
      const roll = random();
      const nearBarn = barnSite && id === STARTER_ISLAND_ID &&
        Math.hypot(x - barnSite.x, z - barnSite.z) < BARN_TREE_CLEARANCE;
      if (roll < .025) {
        if (!nearBarn) addTree(x, y, z, true);
      }
      else if (roll < .07) {
        if (!nearBarn) addTree(x, y, z, false);
      }
      else if (roll < .17) addStone(x, y, z, .8 + random() * .5);
      else if (grassPatches.some(patch => Math.hypot(cell.dx - patch.dx, cell.dz - patch.dz) < patch.radius)) {
        addTallGrass(terrain.get(gridKey(cell.gx, cell.gz)));
      }
    }
  });

  if (barnSite) addBarn(barnSite.x, barnSite.topY, barnSite.z);

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

  const occlusion = createOcclusionSystem(group);
  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const start = terrain.get(gridKey(backbone[0].cx, backbone[0].cz)) || terrain.values().next().value;
  return {
    group,
    terrain,
    spawn: { x: start.x, y: start.topY, z: start.z },
    animate(elapsed) {
      waterElapsed = elapsed;
      mats.water.uniforms.time.value = elapsed;
      for (const tree of trees) {
        const gust = Math.sin(elapsed * .55 + tree.phase) * .35 + Math.sin(elapsed * 1.3 + tree.phase * 1.7) * .12;
        tree.sway.rotation.z = Math.sin(elapsed * 1.15 + tree.phase) * tree.strength + gust * .018;
        tree.sway.rotation.x = Math.cos(elapsed * .9 + tree.phase * .73) * tree.strength * .62 + gust * .012;
      }
      for (const current of waterMotion) {
        const travel = ((elapsed * .72 + current.phase) % 1 - .5) * .54;
        current.mesh.position.set(
          current.x + current.direction.x * travel,
          current.y,
          current.z + current.direction.z * travel,
        );
      }
      for (const waterfall of waterfalls) {
        for (const stream of waterfall.streams) {
          const progress = (elapsed * .78 + stream.phase) % 1;
          stream.mesh.position.y = waterfall.topY - progress * waterfall.height;
        }
      }
      for (let index = waterParticles.length - 1; index >= 0; index--) {
        const particle = waterParticles[index];
        const age = elapsed - particle.born;
        if (age > .62) {
          water.remove(particle.mesh);
          particle.mesh.geometry.dispose();
          waterParticles.splice(index, 1);
          continue;
        }
        particle.mesh.position.set(
          particle.x + particle.vx * age,
          particle.y + particle.vy * age - 7.8 * age * age,
          particle.z + particle.vz * age,
        );
        particle.mesh.rotation.x = age * particle.spinX;
        particle.mesh.rotation.z = age * particle.spinZ;
      }
    },
    updateOcclusion(cameraPosition, tractorState, delta) {
      occlusion.update(cameraPosition, tractorState, delta);
    },
    ploughAt(x, z) {
      const tile = terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
      if (!tile || tile.ploughed || tile.water) return false;
      tile.ploughed = true;
      tile.topMesh.material = mats.ploughed;
      if (tile.tallGrass) tile.tallGrass.visible = false;
      return true;
    },
    splashAt(x, z, impact) {
      const tile = terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
      if (!tile?.water) return false;
      const count = 7 + Math.round(Math.min(7, impact));
      for (let index = 0; index < count; index++) {
        const size = .065 + random() * .07;
        const mesh = box(size, size, size, mats.waterSplash, false, false);
        mesh.position.set(x, tile.topY + .06, z);
        water.add(mesh);
        const angle = random() * Math.PI * 2;
        const speed = .65 + random() * (1.1 + impact * .07);
        waterParticles.push({
          mesh,
          x: x + (random() - .5) * .14,
          y: tile.topY + .06 + random() * .06,
          z: z + (random() - .5) * .14,
          vx: Math.cos(angle) * speed,
          vy: .8 + random() * .75 + impact * .05,
          vz: Math.sin(angle) * speed,
          spinX: (random() - .5) * 18,
          spinZ: (random() - .5) * 18,
          born: waterElapsed,
        });
      }
      return true;
    },
  };
}

function createOcclusionSystem(group) {
  const ray = new THREE.Ray();
  const sightline = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const entries = group.children
    .filter(child => child.isGroup && child.name !== 'tall-grass' && child.name !== 'water')
    .map(object => ({ object, bounds: new THREE.Box3(), materials: cloneTransparentMaterials(object), opacity: 1 }));

  return {
    update(cameraPosition, tractorState, delta) {
      if (!cameraPosition || !tractorState) return;
      sightline.set(tractorState.x, tractorState.y + .75, tractorState.z).sub(cameraPosition);
      const sightlineLength = sightline.length();
      if (sightlineLength < .001) return;
      ray.set(cameraPosition, sightline.multiplyScalar(1 / sightlineLength));
      const fadeAmount = 1 - Math.exp(-12 * Math.min(.1, delta));

      for (const entry of entries) {
        entry.bounds.setFromObject(entry.object);
        const hit = ray.intersectBox(entry.bounds, hitPoint);
        const targetOpacity = hit && hit.distanceTo(cameraPosition) < sightlineLength - .2 ? .18 : 1;
        entry.opacity = THREE.MathUtils.lerp(entry.opacity, targetOpacity, fadeAmount);
        entry.materials.forEach(material => { material.opacity = entry.opacity; });
      }
    },
  };
}

function cloneTransparentMaterials(object) {
  const materialClones = new Map();
  object.traverse(child => {
    if (!child.isMesh) return;
    const cloneMaterial = material => {
      if (!materialClones.has(material)) {
        const clone = material.clone();
        clone.transparent = true;
        clone.depthWrite = false;
        materialClones.set(material, clone);
      }
      return materialClones.get(material);
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
  });
  return [...materialClones.values()];
}

function findBarnSite(terrain, island) {
  const candidates = [];
  for (const tile of terrain.values()) {
    if (tile.islandId !== STARTER_ISLAND_ID) continue;
    const hasPad = [-1, 0, 1].every(dx => [-1, 0, 1].every(dz => {
      const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      return neighbor?.islandId === STARTER_ISLAND_ID && Math.abs(neighbor.topY - tile.topY) < .01;
    }));
    if (!hasPad) continue;
    const score = Math.hypot(tile.gx - (island.cx - 2), tile.gz - (island.cz + 2));
    candidates.push({ ...tile, score });
  }
  candidates.sort((first, second) => first.score - second.score);
  return candidates[0];
}

function addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random) {
  const candidates = shuffle(cells.filter(cell => {
    if (cell.dist < 1.25 || cell.dist > island.r - 1.55) return false;
    const center = terrain.get(gridKey(cell.gx, cell.gz));
    if (!center || center.islandId !== island.id) return false;
    return [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dz]) => {
      const neighbor = terrain.get(gridKey(cell.gx + dx, cell.gz + dz));
      return neighbor?.islandId === island.id && Math.abs(neighbor.topY - center.topY) < .01 &&
        hasSolidSurroundings(neighbor, terrain, island.id);
    });
  }), random);

  for (const candidate of candidates) {
    const lakeKeys = new Set([[0, 0], [1, 0], [0, 1], [1, 1]]
      .map(([dx, dz]) => gridKey(candidate.gx + dx, candidate.gz + dz)));
    const source = terrain.get(gridKey(candidate.gx + 1, candidate.gz + 1));
    const route = findWaterRoute(source, lakeKeys, terrain, island.id);
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

function excavateWaterTile(tile) {
  const loweredTop = tile.topY - WATER_DEPTH;
  const loweredDirtDepth = tile.dirtDepth - WATER_DEPTH;
  tile.topY = loweredTop;
  tile.dirtMesh.scale.y = loweredDirtDepth / tile.dirtDepth;
  tile.dirtMesh.position.y = loweredTop - GRASS_TOP - loweredDirtDepth * .5;
  tile.topMesh.position.y = loweredTop - GRASS_TOP * .5;
  tile.topMesh.material = mats.stoneDark;
  removeTopFace(tile.topMesh);
  removeTopFace(tile.dirtMesh);
  tile.topMesh.visible = false;
  tile.dirtMesh.visible = false;
}

function removeTopFace(mesh) {
  const original = mesh.geometry;
  const openTop = original.clone();
  openTop.clearGroups();
  original.groups.forEach((group, index) => {
    // BoxGeometry builds faces in +x, -x, +y, -y, +z, -z order; omit +y.
    if (index !== 2) openTop.addGroup(group.start, group.count, 0);
  });
  mesh.geometry = openTop;
  original.dispose();
}

function findWaterRoute(source, lakeKeys, terrain, islandId) {
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
    if (outlets.length === 1 && current.path.length >= 4 &&
      hasSolidSurroundings(current.tile, terrain, islandId, outlets[0])) {
      return { path: current.path, outlet: outlets[0] };
    }
    if (outlets.length) continue;

    for (const direction of directions) {
      const key = gridKey(current.tile.gx + direction.x, current.tile.gz + direction.z);
      const neighbor = terrain.get(key);
      if (!neighbor || neighbor.islandId !== islandId || lakeKeys.has(key) || visited.has(key)) continue;
      // A river may run along a level surface or tumble down a terrace, but it
      // never climbs uphill on its way to the island edge.
      if (neighbor.topY > current.tile.topY + .01) continue;
      const downhill = neighbor.topY < current.tile.topY - .01;
      if (!hasSolidSurroundings(current.tile, terrain, islandId, downhill ? direction : null)) continue;
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

function shuffle(values, random) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function chooseGrassPatches(cells, random, count) {
  const patches = [];
  const candidates = [...cells];
  while (candidates.length && patches.length < count) {
    const candidate = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
    if (patches.some(patch => Math.hypot(patch.dx - candidate.dx, patch.dz - candidate.dz) < 2.7)) continue;
    patches.push({ ...candidate, radius: 1.55 + random() * .75 });
  }
  return patches;
}

function treeDesign(silhouette) {
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

function createPerlin(seed) {
  const random = seededRandom(seed);
  const permutation = Array.from({ length: 256 }, (_, index) => index);
  for (let index = permutation.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [permutation[index], permutation[swap]] = [permutation[swap], permutation[index]];
  }
  const table = [...permutation, ...permutation];
  const fade = value => value * value * value * (value * (value * 6 - 15) + 10);
  const interpolate = (from, to, amount) => from + (to - from) * amount;
  const gradient = (hash, x, y) => {
    const direction = hash & 3;
    if (direction === 0) return x + y;
    if (direction === 1) return -x + y;
    if (direction === 2) return x - y;
    return -x - y;
  };

  return (x, y) => {
    const gridX = Math.floor(x) & 255;
    const gridY = Math.floor(y) & 255;
    const localX = x - Math.floor(x);
    const localY = y - Math.floor(y);
    const blendX = fade(localX);
    const blendY = fade(localY);
    const aa = table[table[gridX] + gridY];
    const ab = table[table[gridX] + gridY + 1];
    const ba = table[table[gridX + 1] + gridY];
    const bb = table[table[gridX + 1] + gridY + 1];
    return interpolate(
      interpolate(gradient(aa, localX, localY), gradient(ba, localX - 1, localY), blendX),
      interpolate(gradient(ab, localX, localY - 1), gradient(bb, localX - 1, localY - 1), blendX),
      blendY,
    ) * .7;
  };
}

function createOrganicCells(cx, cz, radius, seed) {
  const cells = [];
  const random = seededRandom(seed);
  const perlin = createPerlin(seed ^ 0x85ebca6b);
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
    const broadNoise = perlin(rx * .24, rz * .24) * .48;
    const edgeNoise = perlin(rx * .65 + 19.7, rz * .65 - 11.3) * .16;
    const boundary = radius * (1 + Math.sin(angle * 3 + lobePhase) * .18 + Math.sin(angle * 5 + ridgePhase) * .09 - Math.pow(Math.max(0, Math.cos(angle - notchAngle)), 8) * .16) + broadNoise + edgeNoise;
    if (distance <= boundary) cells.push({ gx: cx + dx, gz: cz + dz, dx, dz, dist: distance });
  }
  if (!cells.some(cell => cell.gx === cx && cell.gz === cz)) cells.push({ gx: cx, gz: cz, dx: 0, dz: 0, dist: 0 });
  return cells;
}

function plateauHeight(cell, island, angle) {
  const along = cell.dx * Math.cos(angle) + cell.dz * Math.sin(angle);
  const across = -cell.dx * Math.sin(angle) + cell.dz * Math.cos(angle);
  // Every non-starter island uses one large, contiguous raised plot. Its base
  // remains equally broad, so both of the island's two elevations are useful
  // for farming rather than reading as narrow decorative ledges.
  const onRaisedPlot = along >= -island.r * .72 && along <= island.r * .42 &&
    Math.abs(across) <= island.r * .62;
  return onRaisedPlot ? PLATEAU_BLOCK_HEIGHT : 0;
}
