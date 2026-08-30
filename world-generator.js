import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, SOIL_DEPTH, TILE, box, gridKey, THREE } from './shared.js?v=combine-fix-20260830-6';
import { cropStats as environmentalCropStats, crops } from './crops.js?v=combine-fix-20260830-6';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const BRIDGE_GAP_TILES = 1;
const BRIDGE_WIDTH = TILE * 1.25;
const BRIDGE_THICKNESS = 0.18;
const STARTER_ISLAND_ID = 0;
const BARN_TREE_CLEARANCE = 3.5 * TILE;
const WATER_DEPTH = .22;
const ISLAND_LAYOUT_SCALE = 1.5;
const CROP_STAGE_SECONDS = 3;
const WEED_CHANCE = .4;

export function generateFarm(scene, physics, seed = (Math.random() * 0xffffffff) >>> 0, attempt = 0) {
  const random = seededRandom(seed);
  const terrainNoise = createPerlin(seed ^ 0x9e3779b9);
  const moistureNoise = createPerlin(seed ^ 0x243f6a88);
  const sunNoise = createPerlin(seed ^ 0xb7e15162);
  const group = new THREE.Group();
  const terrain = new Map();
  const obstacles = [];
  const lowerBlocks = [];
  const bridgeBlocks = [];
  const buildingObstacles = new Map();
  const trees = [];
  const tallGrass = new THREE.Group();
  const water = new THREE.Group();
  const waterMotion = [];
  const waterfalls = [];
  const waterParticles = [];
  const grassMaterials = new Map();
  let barnArea = null;
  let plantedCount = 0;
  let readyCount = 0;
  let weedCount = 0;
  let cropInstancesDirty = false;
  let furrowInstancesDirty = false;
  const growingCrops = new Set();
  const ploughedTiles = [];
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
    const environment = {
      moisture: environmentalAxis(moistureNoise(gx * .18 + 17.3, gz * .18 - 8.1)),
      sun: environmentalAxis(sunNoise(gx * .16 - 31.7, gz * .16 + 22.4)),
    };
    terrain.set(gridKey(gx, gz), {
      gx, gz, x, z, topY, baseY, islandId, radial, topMesh: top, dirtMesh: dirt, dirtDepth,
      environment, normalGrassMaterial: null, tallGrass: null, stones: [], hasTree: false,
      ploughed: false, water: false, crop: null,
    });
  };

  const grassMaterialFor = tile => {
    const raised = tile.topY > tile.baseY + .01;
    const { moisture, sun } = tile.environment;
    const shade = 1 - sun;
    const wetShade = moisture * shade;
    const darkening = THREE.MathUtils.smoothstep(wetShade, .20, .50);
    // Keep the grass hue fixed. Most terrain remains normal green, while the
    // wettest shaded pockets move through to a saturated dark green.
    const hue = .31;
    const saturation = .42 + moisture * .04 + darkening * .14;
    const minLightness = .28;
    const maxLightness = raised ? .47 : .455;
    const lightness = THREE.MathUtils.clamp(
      .43 + sun * .01 - moisture * .005 - shade * .005 - darkening * .14 + (raised ? .015 : 0),
      minLightness,
      maxLightness,
    );
    const saturationStep = Math.round((saturation - .42) / .18 * 7);
    const lightnessStep = Math.round((lightness - minLightness) / (maxLightness - minLightness) * 8);
    const quantizedSaturation = .42 + saturationStep * .18 / 7;
    const quantizedLightness = minLightness + lightnessStep * (maxLightness - minLightness) / 8;
    const variant = `${raised ? 'high' : 'base'}-${saturationStep}-${lightnessStep}`;
    if (!grassMaterials.has(variant)) {
      grassMaterials.set(variant, new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, quantizedSaturation, quantizedLightness),
        roughness: 1,
      }));
    }
    return grassMaterials.get(variant);
  };

  const finalizeEnvironment = (cells, waterTiles) => {
    const waterCells = [...waterTiles].map(key => terrain.get(key)).filter(Boolean);
    for (const cell of cells) {
      const tile = terrain.get(gridKey(cell.gx, cell.gz));
      if (!tile) continue;
      let waterBonus = 0;
      for (const waterTile of waterCells) {
        const distance = Math.hypot(tile.gx - waterTile.gx, tile.gz - waterTile.gz);
        waterBonus = Math.max(waterBonus, THREE.MathUtils.clamp(1 - distance / 4, 0, 1) * .58);
      }
      tile.environment.moisture = tile.water ? 1 : THREE.MathUtils.clamp(tile.environment.moisture + waterBonus, 0, 1);
      if (!tile.water) {
        tile.normalGrassMaterial = grassMaterialFor(tile);
        tile.topMesh.material = tile.normalGrassMaterial;
      }
    }
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
    const tile = tileAt(x, z, terrain);
    if (tile) tile.hasTree = true;
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
    const tile = tileAt(x, z, terrain);
    if (tile) tile.stones.push(stone);
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
    barnArea = { x, z, width, depth, yaw };

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
  ].map(scaleIslandLayout);
  const branch = scaleIslandLayout({
    cx: (random() > .5 ? 1 : -1) * 20,
    cz: -22 + Math.round((random() - .5) * 2),
    h: random() > .5 ? 0 : 2,
    r: 3.5,
  });
  const islands = [...backbone, branch].map((island, id) => ({ ...island, id }));
  let barnSite;
  let waterFeatureCount = 0;

  islands.forEach((island, id) => {
    if (id > 0 && id < backbone.length) {
      island.cx = Math.round(island.cx + Math.round((random() - .5) * 1.1) * ISLAND_LAYOUT_SCALE);
    }
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
    let waterTiles = id > 0 && (id === 2 || id === 4 || random() < .25)
      ? addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random, true)
      : new Set();
    if (waterTiles.size) waterFeatureCount++;
    finalizeEnvironment(cells, waterTiles);
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
      const tile = terrain.get(gridKey(cell.gx, cell.gz));
      const { moisture, sun } = tile.environment;
      const treeChance = .014 + moisture * .045 + (1 - sun) * .022 + moisture * (1 - sun) * .04;
      const rockChance = .04 + (1 - moisture) * .07 + sun * .02;
      const roll = random();
      const nearBarn = barnSite && id === STARTER_ISLAND_ID &&
        Math.hypot(x - barnSite.x, z - barnSite.z) < BARN_TREE_CLEARANCE;
      if (roll < treeChance) {
        if (!nearBarn) addTree(x, y, z, random() < .35);
      }
      else if (roll < treeChance + rockChance) addStone(x, y, z, .8 + random() * .5);
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

  if (!waterFeatureCount && attempt < 7) {
    scene.remove(group);
    disposeObjectResources(group);
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1);
  }

  const cropInstances = createCropInstances(terrain.size, group);
  const cropOverlay = createCropOverlay(terrain, group);
  const refreshFurrowInstances = () => {
    const matrix = new THREE.Matrix4();
    let furrowCount = 0;
    for (const tile of ploughedTiles) {
      for (const offset of [-.26, 0, .26]) {
        matrix.makeTranslation(tile.x, tile.topY + .018, tile.z + offset);
        cropInstances.furrows.setMatrixAt(furrowCount++, matrix);
      }
    }
    updateInstances(cropInstances.furrows, furrowCount);
    furrowInstancesDirty = false;
  };
  const refreshCropInstances = () => {
    const matrix = new THREE.Matrix4();
    const stemCounts = [0, 0, 0, 0];
    let leafCount = 0;
    let earCount = 0;
    let weedPartCount = 0;
    for (const tile of terrain.values()) {
      if (!tile.crop) continue;
      const stageIndex = tile.crop.stage - 1;
      const height = cropInstances.heights[stageIndex];
      matrix.makeTranslation(tile.x, tile.topY + height * .5, tile.z);
      cropInstances.stems[stageIndex].setMatrixAt(stemCounts[stageIndex]++, matrix);
      const stageLeafCount = tile.crop.stage + 1;
      for (let index = 0; index < stageLeafCount; index++) {
        const side = index % 2 ? -1 : 1;
        matrix.makeRotationY(side * .42);
        matrix.setPosition(
          tile.x + side * .12,
          tile.topY + height * (.28 + index / (stageLeafCount + 2)),
          tile.z + side * .05,
        );
        cropInstances.leaves.setMatrixAt(leafCount++, matrix);
      }
      if (tile.crop.stage === 4) {
        for (const side of [-1, 1]) {
          matrix.makeTranslation(tile.x + side * .09, tile.topY + height * .67, tile.z);
          cropInstances.ears.setMatrixAt(earCount++, matrix);
        }
      }
      if (!tile.crop.weeds) continue;
      for (let index = 0; index < 5; index++) {
        const angle = index / 5 * Math.PI * 2;
        matrix.makeRotationZ(Math.sin(angle) * .34);
        matrix.setPosition(
          tile.x + Math.cos(angle) * .18,
          tile.topY + .21,
          tile.z + Math.sin(angle) * .18,
        );
        cropInstances.weedStalks.setMatrixAt(weedPartCount, matrix);
        matrix.makeTranslation(
          tile.x + Math.cos(angle) * .25,
          tile.topY + .44,
          tile.z + Math.sin(angle) * .25,
        );
        cropInstances.weedFlowers.setMatrixAt(weedPartCount++, matrix);
      }
    }
    cropInstances.stems.forEach((mesh, index) => updateInstances(mesh, stemCounts[index]));
    updateInstances(cropInstances.leaves, leafCount);
    updateInstances(cropInstances.ears, earCount);
    updateInstances(cropInstances.weedStalks, weedPartCount);
    updateInstances(cropInstances.weedFlowers, weedPartCount);
    cropInstancesDirty = false;
  };

  const occlusion = createOcclusionSystem(group);
  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const start = terrain.get(gridKey(backbone[0].cx, backbone[0].cz)) || terrain.values().next().value;
  return {
    group,
    terrain,
    spawn: { x: start.x, y: start.topY, z: start.z },
    dispose() {
      disposeObjectResources(group);
    },
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
        if (age > 1.15) {
          water.remove(particle.mesh);
          particle.mesh.geometry.dispose();
          waterParticles.splice(index, 1);
          continue;
        }
        particle.mesh.position.set(
          particle.x + particle.vx * age,
          particle.y + particle.vy * age - 7.2 * age * age,
          particle.z + particle.vz * age,
        );
        particle.mesh.rotation.x = age * particle.spinX;
        particle.mesh.rotation.z = age * particle.spinZ;
      }
      for (const tile of growingCrops) {
        if (elapsed - tile.crop.stageStarted < CROP_STAGE_SECONDS) continue;
        tile.crop.stageStarted += CROP_STAGE_SECONDS;
        tile.crop.stage++;
        if (tile.crop.stage === 2 && random() < WEED_CHANCE) {
          tile.crop.weeds = true;
          weedCount++;
        }
        if (tile.crop.stage === 4) {
          readyCount++;
          growingCrops.delete(tile);
        }
        cropInstancesDirty = true;
      }
      if (cropInstancesDirty) refreshCropInstances();
      if (furrowInstancesDirty) refreshFurrowInstances();
    },
    updateOcclusion(cameraPosition, tractorState, delta) {
      occlusion.update(cameraPosition, tractorState, delta);
    },
    farmingLevelNear(x, z) {
      const gx = Math.floor(x / TILE + .5);
      const gz = Math.floor(z / TILE + .5);
      const center = terrain.get(gridKey(gx, gz));
      if (center) return center.topY;
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const neighbor = terrain.get(gridKey(gx + dx, gz + dz));
        if (neighbor) return neighbor.topY;
      }
      return null;
    },
    buildingSiteAt(x, z, radius) {
      const gx = Math.floor(x / TILE + .5);
      const gz = Math.floor(z / TILE + .5);
      const center = terrain.get(gridKey(gx, gz));
      if (!center || center.water) return null;
      const span = Math.max(0, Math.ceil(radius - .5));
      for (let dx = -span; dx <= span; dx++) {
        for (let dz = -span; dz <= span; dz++) {
          const tile = terrain.get(gridKey(gx + dx, gz + dz));
          if (!tile || tile.water || tile.hasTree || Math.abs(tile.topY - center.topY) > .01) return null;
        }
      }
      if (barnArea) {
        const dx = center.x - barnArea.x;
        const dz = center.z - barnArea.z;
        const localX = dx * Math.cos(barnArea.yaw) - dz * Math.sin(barnArea.yaw);
        const localZ = dx * Math.sin(barnArea.yaw) + dz * Math.cos(barnArea.yaw);
        if (Math.abs(localX) < barnArea.width * .5 + radius && Math.abs(localZ) < barnArea.depth * .5 + radius) return null;
      }
      for (const obstacle of buildingObstacles.values()) {
        if (Math.hypot(center.x - obstacle.x, center.z - obstacle.z) < radius + obstacle.radius + .25) return null;
      }
      return { x: center.x, y: center.topY, z: center.z };
    },
    setBuildingCollider(id, obstacle) {
      const existing = buildingObstacles.get(id);
      if (existing) {
        const index = obstacles.indexOf(existing);
        if (index !== -1) obstacles.splice(index, 1);
        buildingObstacles.delete(id);
      }
      if (obstacle) {
        buildingObstacles.set(id, obstacle);
        obstacles.push(obstacle);
      }
      physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
    },
    ploughAt(x, z, levelY) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (!tile || tile.ploughed || tile.water || tile.hasTree) return false;
      tile.ploughed = true;
      tile.topMesh.material = mats.ploughed;
      tile.topMesh.material.needsUpdate = true;
      if (tile.tallGrass) tile.tallGrass.visible = false;
      for (const stone of tile.stones) group.remove(stone);
      tile.stones.length = 0;
      ploughedTiles.push(tile);
      furrowInstancesDirty = true;
      return true;
    },
    setCropOverlay(cropId) {
      if (!crops[cropId]) return false;
      cropOverlay.show(cropId);
      return true;
    },
    hideCropOverlay() {
      cropOverlay.hide();
    },
    cropStatsAt(x, z, cropId) {
      const tile = tileAt(x, z, terrain);
      const crop = crops[cropId];
      return tile && crop ? environmentalCropStats(tile.environment, crop) : null;
    },
    seedAt(x, z, levelY, elapsed, cropId = 'corn') {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (!tile || !tile.ploughed || tile.crop || !crops[cropId]) return false;
      tile.crop = { cropId, stage: 1, stageStarted: elapsed, weeds: false };
      plantedCount++;
      growingCrops.add(tile);
      cropInstancesDirty = true;
      return true;
    },
    sprayAt(x, z, levelY) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (!tile?.crop?.weeds) return false;
      tile.crop.weeds = false;
      weedCount--;
      cropInstancesDirty = true;
      return true;
    },
    harvestAt(x, z, levelY) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (tile?.crop?.stage !== 4) return false;
      const crop = crops[tile.crop.cropId] || crops.corn;
      const { suitability, yieldMultiplier } = environmentalCropStats(tile.environment, crop);
      const yieldAmount = Math.max(1, Math.round(yieldMultiplier * 4));
      if (tile.crop.weeds) weedCount = Math.max(0, weedCount - 1);
      tile.crop = null;
      plantedCount = Math.max(0, plantedCount - 1);
      readyCount = Math.max(0, readyCount - 1);
      cropInstancesDirty = true;
      return { yieldAmount, suitability };
    },
    cropStats() {
      return { planted: plantedCount, ready: readyCount, weeds: weedCount };
    },
    insideBarn(x, z) {
      if (!barnArea) return false;
      const dx = x - barnArea.x;
      const dz = z - barnArea.z;
      const localX = dx * Math.cos(barnArea.yaw) - dz * Math.sin(barnArea.yaw);
      const localZ = dx * Math.sin(barnArea.yaw) + dz * Math.cos(barnArea.yaw);
      return Math.abs(localX) < barnArea.width * .5 - .2 && Math.abs(localZ) < barnArea.depth * .5 - .2;
    },
    splashAt(x, z, impact) {
      const tile = terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
      if (!tile?.water) return false;
      const count = 10 + Math.round(Math.min(8, impact * 1.2));
      for (let index = 0; index < count; index++) {
        const size = .13 + random() * .13;
        const mesh = box(size, size, size, mats.waterSplash, false, false);
        mesh.position.set(x, tile.topY + WATER_DEPTH + .32, z);
        mesh.renderOrder = 10;
        water.add(mesh);
        const angle = random() * Math.PI * 2;
        const speed = .65 + random() * (1.1 + impact * .07);
        waterParticles.push({
          mesh,
          x: x + (random() - .5) * .14,
          y: tile.topY + WATER_DEPTH + .28 + random() * .18,
          z: z + (random() - .5) * .14,
          vx: Math.cos(angle) * speed,
          vy: 3.15 + random() * 1.65 + impact * .18,
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

function createCropInstances(tileCapacity, group) {
  const heights = [.22, .48, .78, 1.04];
  const addInstances = (width, height, depth, material, capacity) => {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
      capacity,
    );
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  return {
    heights,
    stems: heights.map(height => addInstances(.11, height, .11, mats.cornStem, tileCapacity)),
    leaves: addInstances(.42, .055, .13, mats.cornLeaf, tileCapacity * 5),
    ears: addInstances(.13, .28, .13, mats.cornRipe, tileCapacity * 2),
    weedStalks: addInstances(.055, .42, .055, mats.weed, tileCapacity * 5),
    weedFlowers: addInstances(.13, .13, .13, mats.weed, tileCapacity * 5),
    furrows: addInstances(.78, .025, .07, mats.furrow, tileCapacity * 3),
  };
}

function updateInstances(mesh, count) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (!count) return;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

function createCropOverlay(terrain, group) {
  const tiles = [...terrain.values()].filter(tile => !tile.water);
  const overlay = new THREE.Group();
  overlay.name = 'crop-overlay';
  overlay.visible = false;
  const geometry = new THREE.PlaneGeometry(TILE * .94, TILE * .94);
  geometry.rotateX(-Math.PI * .5);
  const matrix = new THREE.Matrix4();
  const colorFor = suitability => {
    const color = new THREE.Color();
    if (suitability < .5) color.setHSL(THREE.MathUtils.lerp(.02, .14, suitability * 2), .82, .52);
    else color.setHSL(THREE.MathUtils.lerp(.14, .33, (suitability - .5) * 2), .76, .46);
    return color;
  };
  const paletteSize = 16;
  const palette = Array.from({ length: paletteSize }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: colorFor(index / (paletteSize - 1)),
      transparent: true,
      opacity: .68,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    overlay.add(mesh);
    return mesh;
  });
  group.add(overlay);

  return {
    show(cropId) {
      const crop = crops[cropId];
      const counts = Array(paletteSize).fill(0);
      for (const tile of tiles) {
        const suitability = environmentalCropStats(tile.environment, crop).suitability;
        const bucket = Math.round(suitability * (paletteSize - 1));
        const mesh = palette[bucket];
        matrix.makeTranslation(tile.x, tile.topY + .028, tile.z);
        mesh.setMatrixAt(counts[bucket]++, matrix);
      }
      palette.forEach((mesh, index) => {
        mesh.count = counts[index];
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      });
      overlay.visible = true;
    },
    hide() { overlay.visible = false; },
  };
}

function tileAt(x, z, terrain) {
  return terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
}

function tileAtLevel(x, z, levelY, terrain) {
  const tile = tileAt(x, z, terrain);
  if (!tile || (levelY !== null && Math.abs(tile.topY - levelY) > .01)) return null;
  return tile;
}

function createOcclusionSystem(group) {
  const ray = new THREE.Ray();
  const sightline = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  let refreshElapsed = Infinity;
  const entries = group.children
    .filter(child => child.isGroup && child.name !== 'tall-grass' && child.name !== 'water' && child.name !== 'crop-overlay')
    .map(object => ({ object, bounds: new THREE.Box3(), materials: cloneTransparentMaterials(object), opacity: 1, targetOpacity: 1 }));

  return {
    update(cameraPosition, tractorState, delta) {
      if (!cameraPosition || !tractorState) return;
      refreshElapsed += delta;
      const fadeAmount = 1 - Math.exp(-12 * Math.min(.1, delta));
      if (refreshElapsed >= 1 / 12) {
        refreshElapsed = 0;
        sightline.set(tractorState.x, tractorState.y + .75, tractorState.z).sub(cameraPosition);
        const sightlineLength = sightline.length();
        if (sightlineLength >= .001) {
          ray.set(cameraPosition, sightline.multiplyScalar(1 / sightlineLength));
          for (const entry of entries) {
            entry.bounds.setFromObject(entry.object);
            const hit = ray.intersectBox(entry.bounds, hitPoint);
            entry.targetOpacity = hit && hit.distanceTo(cameraPosition) < sightlineLength - .2 ? .18 : 1;
          }
        }
      }
      for (const entry of entries) {
        entry.opacity = THREE.MathUtils.lerp(entry.opacity, entry.targetOpacity, fadeAmount);
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

function disposeObjectResources(root) {
  const sharedMaterials = new Set(Object.values(mats));
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (material && !sharedMaterials.has(material)) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
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

function addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random, strictBanks) {
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

function findWaterRoute(source, lakeKeys, terrain, islandId, strictBanks) {
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
    if (outlets.length === 1 && current.path.length >= 4 &&
      hasBanks(current.tile, terrain, islandId, outlets[0])) {
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

function scaleIslandLayout(island) {
  return {
    ...island,
    cx: Math.round(island.cx * ISLAND_LAYOUT_SCALE),
    cz: Math.round(island.cz * ISLAND_LAYOUT_SCALE),
    r: island.r * ISLAND_LAYOUT_SCALE,
  };
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

function normalizeNoise(value) {
  return THREE.MathUtils.clamp(value * .5 + .5, 0, 1);
}

function environmentalAxis(value) {
  const normalized = normalizeNoise(value);
  return THREE.MathUtils.clamp(.5 + (normalized - .5) * 2, 0, 1);
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
