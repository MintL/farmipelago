import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, SOIL_DEPTH, TILE, box, gridKey, THREE } from './shared.js?v=crop-diversity-20260831-1';
import { cropStats as environmentalCropStats, crops } from './crops.js?v=crop-diversity-20260831-1';
import { cargoDeckContains, createCargoPort } from './cargo-port.js?v=animations-20260831-1';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const BRIDGE_GAP_TILES = 1;
const BRIDGE_WIDTH = TILE * 1.25;
const BRIDGE_THICKNESS = 0.18;
const STARTER_ISLAND_ID = 0;
const CARGO_ISLAND_ID = 1;
const BARN_TREE_CLEARANCE = 3.5 * TILE;
const WATER_DEPTH = .22;
const ISLAND_LAYOUT_SCALE = 1.5;
// The first two islands are the starting farmyard and its cargo hub. They
// need enough clear, level land for the barn, cargo pad, crop variety, and
// early placed buildings without crowding each other out.
const STARTER_FARMYARD_RADIUS = 7.4;
const STARTER_CARGO_RADIUS = 5.2;
const STARTER_CARGO_CENTER = { x: -9, z: -1 };
const CROP_STAGE_SECONDS = 3;
const WEED_CHANCE = .4;
const READY_PULSE_SECONDS = 3.2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = value => value * value * (3 - 2 * value);

export function generateFarm(scene, physics, seed = (Math.random() * 0xffffffff) >>> 0, attempt = 0, onChange = () => {}) {
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
  const grainSplashMaterials = Object.fromEntries([
    ['corn', 0xf2c84b], ['wheat', 0xd9b65a], ['barley', 0xc9a552], ['canola', 0xf0ce32], ['soybean', 0xb78e48],
  ].map(([cropId, color]) => [cropId, new THREE.MeshBasicMaterial({ color, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })]));
  let tallGrassGeometry = null;
  let barnArea = null;
  let plantedCount = 0;
  let readyCount = 0;
  let weedCount = 0;
  let cropInstancesDirty = false;
  let furrowInstancesDirty = false;
  const growingCrops = new Set();
  const ploughedTiles = [];
  let waterElapsed = 0;
  let effectElapsed = 0;
  tallGrass.name = 'tall-grass';
  water.name = 'water';
  scene.add(group);
  group.add(tallGrass);
  group.add(water);

  const emitSplash = (x, y, z, impact, material, countScale = 1, sizeScale = 1) => {
    const count = Math.max(2, Math.round((10 + Math.min(8, impact * 1.2)) * countScale));
    for (let index = 0; index < count; index++) {
      const size = (.13 + random() * .13) * sizeScale;
      const mesh = box(size, size, size, material, false, false);
      mesh.position.set(x, y + .32, z);
      mesh.renderOrder = 10;
      group.add(mesh);
      const angle = random() * Math.PI * 2;
      const velocityScale = .42 + countScale * .58;
      const speed = (.65 + random() * (1.1 + impact * .07)) * velocityScale;
      waterParticles.push({
        mesh,
        x: x + (random() - .5) * .14,
        y: y + .28 + random() * .18,
        z: z + (random() - .5) * .14,
        vx: Math.cos(angle) * speed,
        vy: (3.15 + random() * 1.65 + impact * .18) * velocityScale,
        vz: Math.sin(angle) * speed,
        spinX: (random() - .5) * 18,
        spinZ: (random() - .5) * 18,
        born: waterElapsed,
      });
    }
  };

  const addTile = (gx, gz, topY, islandId, radial, baseY = topY) => {
    const x = gx * TILE;
    const z = gz * TILE;
    const dirtDepth = SOIL_DEPTH + Math.max(0, topY - baseY);
    const environment = {
      moisture: environmentalAxis(moistureNoise(gx * .18 + 17.3, gz * .18 - 8.1)),
      sun: environmentalAxis(sunNoise(gx * .16 - 31.7, gz * .16 + 22.4)),
    };
    terrain.set(gridKey(gx, gz), {
      gx, gz, x, z, topY, baseY, islandId, radial, dirtDepth,
      environment, normalGrassColor: null, surfaceBatch: null, surfaceInstance: -1,
      tallGrass: null, stones: [], hasTree: false,
      ploughed: false, water: false, reserved: false, noDecoration: false, crop: null,
    });
  };

  const grassColorFor = tile => {
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
    return new THREE.Color().setHSL(hue, quantizedSaturation, quantizedLightness);
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
      if (!tile.water) tile.normalGrassColor = grassColorFor(tile);
    }
  };

  const addTallGrass = tile => {
    const tuft = new THREE.Group();
    tuft.position.set(tile.x, tile.topY, tile.z);
    tallGrassGeometry ||= new THREE.BoxGeometry(1, 1, 1);
    const blades = new THREE.InstancedMesh(tallGrassGeometry, mats.tallGrass, 9);
    const bladeTransform = new THREE.Object3D();
    blades.castShadow = false;
    blades.receiveShadow = false;
    for (let index = 0; index < 9; index++) {
      const height = .55 + random() * .38;
      bladeTransform.position.set((random() - .5) * .5, height * .5, (random() - .5) * .5);
      bladeTransform.rotation.set((random() - .5) * .18, random() * Math.PI, (random() - .5) * .18);
      bladeTransform.scale.set(.05, height, .065);
      bladeTransform.updateMatrix();
      blades.setMatrixAt(index, bladeTransform.matrix);
    }
    blades.instanceMatrix.needsUpdate = true;
    blades.computeBoundingSphere();
    tuft.add(blades);
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
          lowerBlocks.push({
            x: cell.gx * TILE,
            y,
            z: cell.gz * TILE,
            width: TILE,
            height: LAYER_DEPTH,
            depth: TILE,
            material,
          });
        }
      }
    }
  };

  const addLowerLayerInstances = () => {
    const geometry = new THREE.BoxGeometry(TILE, LAYER_DEPTH, TILE);
    const transform = new THREE.Matrix4();
    for (const material of [mats.soil, mats.stone, mats.stoneDark]) {
      const blocks = lowerBlocks.filter(block => block.material === material);
      if (!blocks.length) continue;
      const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
      mesh.name = 'lower-layers';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      blocks.forEach((block, index) => {
        transform.makeTranslation(block.x, block.y, block.z);
        mesh.setMatrixAt(index, transform);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  };

  const addTerrainInstances = () => {
    const surfaceGeometry = new THREE.BoxGeometry(TILE, GRASS_TOP, TILE);
    const soilGeometry = new THREE.BoxGeometry(TILE, 1, TILE);
    const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const tilesByIsland = new Map();
    for (const tile of terrain.values()) {
      if (tile.water) continue;
      if (!tilesByIsland.has(tile.islandId)) tilesByIsland.set(tile.islandId, []);
      tilesByIsland.get(tile.islandId).push(tile);
    }

    for (const [islandId, tiles] of tilesByIsland) {
      const surface = new THREE.InstancedMesh(surfaceGeometry, surfaceMaterial, tiles.length);
      const soil = new THREE.InstancedMesh(soilGeometry, mats.soil, tiles.length);
      const matrix = new THREE.Matrix4();
      surface.name = `terrain-surface-${islandId}`;
      soil.name = `terrain-soil-${islandId}`;
      surface.castShadow = surface.receiveShadow = true;
      soil.castShadow = soil.receiveShadow = true;

      tiles.forEach((tile, index) => {
        matrix.makeTranslation(tile.x, tile.topY - GRASS_TOP * .5, tile.z);
        surface.setMatrixAt(index, matrix);
        surface.setColorAt(index, tile.normalGrassColor || mats.grass.color);
        tile.surfaceBatch = surface;
        tile.surfaceInstance = index;

        matrix.makeScale(1, tile.dirtDepth, 1);
        matrix.setPosition(tile.x, tile.topY - GRASS_TOP - tile.dirtDepth * .5, tile.z);
        soil.setMatrixAt(index, matrix);
      });

      surface.instanceMatrix.needsUpdate = true;
      surface.instanceColor.needsUpdate = true;
      soil.instanceMatrix.needsUpdate = true;
      surface.computeBoundingBox();
      surface.computeBoundingSphere();
      soil.computeBoundingBox();
      soil.computeBoundingSphere();
      group.add(surface, soil);
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
    { cx: 0, cz: 11, h: 0, r: STARTER_FARMYARD_RADIUS },
    { cx: STARTER_CARGO_CENTER.x, cz: STARTER_CARGO_CENTER.z, h: 1, r: STARTER_CARGO_RADIUS },
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
  let cargoSite;
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
    if (id === CARGO_ISLAND_ID) {
      cargoSite = findCargoSite(terrain, island);
      reserveCargoApproach(terrain, cargoSite);
    }

    const clearCells = cells.filter(candidate => {
      const starterField = id === STARTER_ISLAND_ID && Math.abs(candidate.dx) <= 3 && Math.abs(candidate.dz) <= 3;
      const tile = terrain.get(gridKey(candidate.gx, candidate.gz));
      return candidate.dist > 1.1 && candidate.dist < island.r - .15 && !starterField &&
        tileHeight(candidate) === 0 && !waterTiles.has(gridKey(candidate.gx, candidate.gz)) &&
        !tile?.reserved && !tile?.noDecoration;
    });
    const grassPatches = chooseGrassPatches(clearCells, random, id === STARTER_ISLAND_ID ? 1 : 2);
    for (const cell of clearCells) {
      const x = cell.gx * TILE + (random() - .5) * .18;
      const z = cell.gz * TILE + (random() - .5) * .18;
      const y = terrain.get(gridKey(cell.gx, cell.gz))?.topY ?? island.h;
      const tile = terrain.get(gridKey(cell.gx, cell.gz));
      const { moisture, sun } = tile.environment;
      // Trees form distinct cool, damp groves instead of appearing evenly
      // throughout the farm. Rocks remain the dry, bright counterpart.
      const wet = THREE.MathUtils.smoothstep(moisture, .38, .78);
      const shade = THREE.MathUtils.smoothstep(1 - sun, .32, .72);
      const dry = THREE.MathUtils.smoothstep(1 - moisture, .36, .76);
      const bright = THREE.MathUtils.smoothstep(sun, .36, .76);
      const treeChance = .002 + wet * shade * .18;
      const rockChance = .03 + dry * .09 + bright * .028;
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

  if (!cargoSite) {
    scene.remove(group);
    disposeObjectResources(group);
    if (attempt >= 20) throw new Error('Unable to generate a clear west-side, first-floor cargo deck site');
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1, onChange);
  }
  const cargoAnchor = terrain.get(gridKey(Math.round(cargoSite.x / TILE), Math.round(cargoSite.z / TILE)));
  if (!cargoAnchor || Math.abs(cargoAnchor.topY - cargoAnchor.baseY) > .01) {
    throw new Error('Cargo deck must be anchored on the first floor');
  }
  if (cargoAnchor.gx >= islands[CARGO_ISLAND_ID].cx || cargoSite.outward.x !== -1 || cargoSite.outward.z !== 0) {
    throw new Error('Cargo deck must stay on the west side of the cargo island');
  }
  const terrainOverlap = [...terrain.values()].find(tile =>
    cargoDeckContains(cargoSite, tile.x, tile.z, TILE * .72) && tile.topY > cargoSite.y + .01
  );
  if (terrainOverlap) throw new Error(`Cargo deck clearance failed at ${gridKey(terrainOverlap.gx, terrainOverlap.gz)}`);

  addLowerLayerInstances();

  if (barnSite) addBarn(barnSite.x, barnSite.topY, barnSite.z);
  const cargoPort = createCargoPort(cargoSite);
  group.add(cargoPort.group);
  obstacles.push(...cargoPort.colliders);

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
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1, onChange);
  }

  addTerrainInstances();
  const cropInstances = createCropInstances(terrain.size, group);
  const fieldEffects = createFieldEffects(group);
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
    cropInstances.begin();
    for (const tile of terrain.values()) {
      if (!tile.crop) continue;
      cropInstances.setCrop(tile);
      renderCropTile(cropInstances, tile);
      cropInstances.clearCrop();
      if (!tile.crop.weeds) continue;
      for (let index = 0; index < 5; index++) {
        const angle = index / 5 * Math.PI * 2;
        cropInstances.place(
          'weedStalk',
          tile.x + Math.cos(angle) * .18,
          tile.topY + .21,
          tile.z + Math.sin(angle) * .18,
          0, 0, Math.sin(angle) * .34,
        );
        cropInstances.place(
          'weedFlower',
          tile.x + Math.cos(angle) * .25,
          tile.topY + .44,
          tile.z + Math.sin(angle) * .25,
        );
      }
    }
    cropInstances.finish();
    cropInstancesDirty = false;
  };
  const ploughTile = (tile, heading = 0, showEffect = true) => {
    if (!tile || tile.ploughed || tile.water || tile.hasTree || tile.reserved) return false;
    tile.ploughed = true;
    tile.surfaceBatch.setColorAt(tile.surfaceInstance, mats.ploughed.color);
    tile.surfaceBatch.instanceColor.needsUpdate = true;
    if (tile.tallGrass) tile.tallGrass.visible = false;
    for (const stone of tile.stones) group.remove(stone);
    tile.stones.length = 0;
    ploughedTiles.push(tile);
    furrowInstancesDirty = true;
    if (showEffect && !reducedMotion) fieldEffects.plough(tile, heading, effectElapsed);
    return true;
  };

  const occlusion = createOcclusionSystem(group);
  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const start = terrain.get(gridKey(backbone[0].cx, backbone[0].cz)) || terrain.values().next().value;
  const vehicleSpawns = findVehicleSpawns(terrain, start, barnArea);
  return {
    group,
    terrain,
    cargoPort,
    seed,
    spawn: vehicleSpawns[0],
    vehicleSpawns,
    dispose() {
      Object.values(grainSplashMaterials).forEach(material => material.dispose());
      disposeObjectResources(group);
    },
    animate(elapsed) {
      let persistentChange = false;
      waterElapsed = elapsed;
      effectElapsed = elapsed;
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
          particle.mesh.removeFromParent();
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
        tile.crop.animationStarted = elapsed;
        if (tile.crop.stage === 2 && random() < WEED_CHANCE) {
          tile.crop.weeds = true;
          weedCount++;
        }
        if (tile.crop.stage === 4) {
          readyCount++;
          growingCrops.delete(tile);
        }
        cropInstancesDirty = true;
        persistentChange = true;
      }
      if (cropInstancesDirty) refreshCropInstances();
      if (furrowInstancesDirty) refreshFurrowInstances();
      if (!reducedMotion) {
        cropInstances.animate(elapsed);
        fieldEffects.animate(elapsed);
      }
      if (persistentChange) onChange();
    },
    updateOcclusion(cameraPosition, vehicleState, delta) {
      occlusion.update(cameraPosition, vehicleState, delta);
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
          if (!tile || tile.water || tile.hasTree || tile.reserved || Math.abs(tile.topY - center.topY) > .01) return null;
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
    ploughAt(x, z, levelY, heading = 0) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (!ploughTile(tile, heading)) return false;
      onChange();
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
      tile.crop = { cropId, stage: 1, stageStarted: elapsed, animationStarted: elapsed, weeds: false };
      plantedCount++;
      growingCrops.add(tile);
      cropInstancesDirty = true;
      onChange();
      return true;
    },
    sprayAt(x, z, levelY) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (!tile?.crop?.weeds) return false;
      tile.crop.weeds = false;
      weedCount--;
      if (!reducedMotion) fieldEffects.weed(tile, effectElapsed);
      cropInstancesDirty = true;
      onChange();
      return true;
    },
    harvestAt(x, z, levelY, acceptedCropId = null) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (tile?.crop?.stage !== 4) return false;
      const cropId = tile.crop.cropId;
      if (acceptedCropId && cropId !== acceptedCropId) return false;
      const crop = crops[tile.crop.cropId] || crops.corn;
      const { suitability } = environmentalCropStats(tile.environment, crop);
      // A planted tile is one compact farm plot. Suitability determines its
      // 50–200 L yield, keeping the combine's capacity meaningful at this scale.
      const yieldAmount = Math.round(50 + suitability * 150);
      if (tile.crop.weeds) weedCount = Math.max(0, weedCount - 1);
      tile.crop = null;
      plantedCount = Math.max(0, plantedCount - 1);
      readyCount = Math.max(0, readyCount - 1);
      cropInstancesDirty = true;
      onChange();
      return { cropId, yieldAmount, suitability, x: tile.x, y: tile.topY, z: tile.z };
    },
    persistentState(elapsed) {
      const tiles = [];
      for (const [key, tile] of terrain) {
        if (!tile.ploughed && !tile.crop) continue;
        const savedTile = { key, ploughed: tile.ploughed };
        if (tile.crop) {
          savedTile.crop = {
            cropId: tile.crop.cropId,
            stage: tile.crop.stage,
            stageElapsed: tile.crop.stage < 4
              ? THREE.MathUtils.clamp(elapsed - tile.crop.stageStarted, 0, CROP_STAGE_SECONDS)
              : 0,
            weeds: tile.crop.weeds,
          };
        }
        tiles.push(savedTile);
      }
      return { seed, tiles };
    },
    restorePersistentState(savedState, elapsed) {
      if (!Array.isArray(savedState?.tiles)) return;
      const restoredKeys = new Set();
      for (const savedTile of savedState.tiles) {
        if (typeof savedTile?.key !== 'string' || restoredKeys.has(savedTile.key)) continue;
        const tile = terrain.get(savedTile.key);
        if (!tile || tile.water || tile.hasTree || tile.reserved) continue;
        restoredKeys.add(savedTile.key);
        if (savedTile.ploughed || savedTile.crop) ploughTile(tile, 0, false);
        const savedCrop = savedTile.crop;
        const stage = Math.floor(Number(savedCrop?.stage));
        if (!tile.ploughed || !crops[savedCrop?.cropId] || stage < 1 || stage > 4) continue;
        const stageElapsed = THREE.MathUtils.clamp(Number(savedCrop.stageElapsed) || 0, 0, CROP_STAGE_SECONDS);
        tile.crop = {
          cropId: savedCrop.cropId,
          stage,
          stageStarted: elapsed - stageElapsed,
          weeds: Boolean(savedCrop.weeds) && stage >= 2,
        };
        plantedCount++;
        if (tile.crop.weeds) weedCount++;
        if (stage === 4) readyCount++;
        else growingCrops.add(tile);
        cropInstancesDirty = true;
      }
      if (furrowInstancesDirty) refreshFurrowInstances();
      if (cropInstancesDirty) refreshCropInstances();
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
      emitSplash(x, tile.topY + WATER_DEPTH, z, impact, mats.waterSplash);
      return true;
    },
    grainSplashAt(x, y, z, impact, cropId, countScale = 1, sizeScale = 1) {
      const material = grainSplashMaterials[cropId];
      if (!material || reducedMotion) return false;
      emitSplash(x, y, z, impact, material, countScale, sizeScale);
      return true;
    },
  };
}

function createCropInstances(tileCapacity, group) {
  const transform = new THREE.Object3D();
  const counts = {};
  const pools = {};
  const entries = {};
  let activeCrop = null;
  const addInstances = (name, width, height, depth, material, capacity) => {
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
    pools[name] = mesh;
    counts[name] = 0;
    entries[name] = [];
    return mesh;
  };
  addInstances('shootStem', .07, .22, .07, mats.cropShoot, tileCapacity);
  addInstances('shootLeaf', .22, .04, .09, mats.cropShoot, tileCapacity * 4);
  addInstances('youngCerealStem', .08, .42, .08, mats.cerealGreen, tileCapacity);
  addInstances('youngCerealLeaf', .32, .045, .1, mats.cerealGreen, tileCapacity * 4);
  addInstances('youngBroadStem', .08, .34, .08, mats.cropShoot, tileCapacity);
  addInstances('youngBroadLeaf', .24, .05, .16, mats.cropShoot, tileCapacity * 4);
  addInstances('cornStem', .11, 1, .11, mats.cornStem, tileCapacity);
  addInstances('cornLeaf', .42, .055, .13, mats.cornLeaf, tileCapacity * 5);
  addInstances('cornEar', .13, .28, .13, mats.cornRipe, tileCapacity * 2);
  addInstances('wheatStemGreen', .055, 1, .055, mats.cerealGreen, tileCapacity * 4);
  addInstances('wheatStemRipe', .055, 1, .055, mats.wheatRipe, tileCapacity * 4);
  addInstances('wheatHead', .1, .2, .1, mats.wheatRipe, tileCapacity * 4);
  addInstances('barleyStemGreen', .05, 1, .05, mats.cerealGreen, tileCapacity * 4);
  addInstances('barleyStemRipe', .05, 1, .05, mats.barleyRipe, tileCapacity * 4);
  addInstances('barleyHead', .1, .18, .1, mats.barleyRipe, tileCapacity * 4);
  addInstances('barleyAwn', .025, .28, .025, mats.barleyRipe, tileCapacity * 8);
  addInstances('canolaStem', .065, 1, .065, mats.canolaStem, tileCapacity * 3);
  addInstances('canolaBranch', .28, .05, .05, mats.canolaStem, tileCapacity * 4);
  addInstances('canolaFlower', .12, .12, .12, mats.canolaFlower, tileCapacity * 5);
  addInstances('soybeanStem', .065, 1, .065, mats.soybeanStem, tileCapacity * 5);
  addInstances('soybeanLeaf', .24, .05, .16, mats.soybeanLeaf, tileCapacity * 8);
  addInstances('soybeanPod', .08, .18, .08, mats.soybeanPod, tileCapacity * 5);
  addInstances('weedStalk', .055, .42, .055, mats.weed, tileCapacity * 5);
  addInstances('weedFlower', .13, .13, .13, mats.weed, tileCapacity * 5);
  const furrows = addInstances('furrow', .78, .025, .07, mats.furrow, tileCapacity * 3);
  return {
    furrows,
    begin() {
      for (const name of Object.keys(counts)) {
        if (name !== 'furrow') {
          counts[name] = 0;
          entries[name].length = 0;
        }
      }
    },
    setCrop(tile) { activeCrop = tile; },
    clearCrop() { activeCrop = null; },
    place(name, x, y, z, rotationX = 0, rotationY = 0, rotationZ = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
      const mesh = pools[name];
      const index = counts[name]++;
      transform.position.set(x, y, z);
      transform.rotation.set(rotationX, rotationY, rotationZ);
      transform.scale.set(scaleX, scaleY, scaleZ);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      if (activeCrop) {
        entries[name].push({
          x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ,
          pivotX: activeCrop.x,
          pivotY: activeCrop.topY,
          crop: activeCrop.crop,
          wasAnimated: false,
        });
      }
    },
    finish() {
      for (const [name, mesh] of Object.entries(pools)) {
        if (name !== 'furrow') updateInstances(mesh, counts[name]);
      }
    },
    animate(elapsed) {
      const readyPhase = (elapsed % READY_PULSE_SECONDS) / READY_PULSE_SECONDS;
      const readyBump = readyPhase < .15
        ? ease(readyPhase / .15)
        : readyPhase < .48
          ? 1 - ease((readyPhase - .15) / .33)
          : 0;
      for (const [name, mesh] of Object.entries(pools)) {
        if (name === 'furrow') continue;
        let changed = false;
        for (let index = 0; index < entries[name].length; index++) {
          const entry = entries[name][index];
          const crop = entry.crop;
          if (!crop) continue;
          let scaleY = 1;
          let scaleXZ = 1;
          let tilt = 0;
          if (crop.stage === 4) {
            const entranceAge = Number.isFinite(crop.animationStarted) ? Math.max(0, elapsed - crop.animationStarted) : Infinity;
            if (entranceAge < .45) {
              const progress = entranceAge / .45;
              const overshoot = progress < .58
                ? ease(progress / .58)
                : 1 - ease((progress - .58) / .42);
              scaleY = .78 + .22 * Math.min(1, progress / .58) + overshoot * .16;
              scaleXZ = 1 - overshoot * .045;
            }
            else {
              scaleY = 1 + readyBump * .06;
              scaleXZ = 1 - readyBump * .018;
              tilt = readyBump * .035;
            }
          }
          else if (Number.isFinite(crop.animationStarted)) {
            const age = Math.max(0, elapsed - crop.animationStarted);
            const duration = crop.stage === 1 ? .42 : .45;
            if (age < duration) {
              const progress = age / duration;
              const overshoot = progress < .58
                ? ease(progress / .58)
                : 1 - ease((progress - .58) / .42);
              const start = crop.stage === 1 ? .05 : .78;
              scaleY = start + (1 - start) * Math.min(1, progress / .58) + overshoot * .16;
              scaleXZ = 1 - overshoot * .045;
            }
          }
          const animated = Math.abs(scaleY - 1) > .001 || Math.abs(scaleXZ - 1) > .001 || Math.abs(tilt) > .001;
          if (!animated && !entry.wasAnimated) continue;
          const dx = entry.x - entry.pivotX;
          const dy = (entry.y - entry.pivotY) * scaleY;
          const cosine = Math.cos(tilt);
          const sine = Math.sin(tilt);
          transform.position.set(
            entry.pivotX + dx * cosine - dy * sine,
            entry.pivotY + dx * sine + dy * cosine,
            entry.z,
          );
          transform.rotation.set(entry.rotationX, entry.rotationY, entry.rotationZ + tilt);
          transform.scale.set(entry.scaleX * scaleXZ, entry.scaleY * scaleY, entry.scaleZ * scaleXZ);
          transform.updateMatrix();
          mesh.setMatrixAt(index, transform.matrix);
          entry.wasAnimated = animated;
          changed = true;
        }
        if (changed) mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

function createFieldEffects(group) {
  const effects = new THREE.Group();
  effects.name = 'field-effects';
  const transform = new THREE.Object3D();
  group.add(effects);
  const createPool = (name, width, height, depth, material, capacity) => {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(width, height, depth), material, capacity);
    mesh.name = name;
    mesh.count = capacity;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    effects.add(mesh);
    const slots = Array.from({ length: capacity }, () => ({ active: false }));
    for (let index = 0; index < capacity; index++) {
      transform.scale.setScalar(0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { mesh, slots, cursor: 0 };
  };
  const dirt = createPool('plough-soil-effects', .16, .13, .16, mats.ploughed, 64);
  const weeds = createPool('weed-collapse-effects', .07, .32, .07, mats.weed, 48);
  const claim = (pool, data) => {
    const index = pool.slots.findIndex(slot => !slot.active);
    const slotIndex = index === -1 ? pool.cursor++ % pool.slots.length : index;
    Object.assign(pool.slots[slotIndex], data, { active: true });
  };
  const hide = (pool, index) => {
    transform.scale.setScalar(0);
    transform.updateMatrix();
    pool.mesh.setMatrixAt(index, transform.matrix);
    pool.slots[index].active = false;
  };
  return {
    plough(tile, heading, born) {
      const backward = { x: Math.sin(heading), z: Math.cos(heading) };
      for (let index = 0; index < 3; index++) {
        const side = (index - 1) * .18;
        claim(dirt, {
          born, x: tile.x + side * Math.cos(heading), y: tile.topY + .08, z: tile.z - side * Math.sin(heading),
          dx: backward.x * (.22 + index * .06), dz: backward.z * (.22 + index * .06),
          spin: (index - 1) * 4.2, phase: index * .17,
        });
      }
    },
    weed(tile, born) {
      for (let index = 0; index < 3; index++) {
        const angle = index / 3 * Math.PI * 2;
        claim(weeds, {
          born, x: tile.x + Math.cos(angle) * .13, y: tile.topY + .22, z: tile.z + Math.sin(angle) * .13,
          spin: (index - 1) * 1.9, phase: index * .21,
        });
      }
    },
    animate(elapsed) {
      const animatePool = (pool, lifetime, apply) => {
        let changed = false;
        pool.slots.forEach((slot, index) => {
          if (!slot.active) return;
          const progress = (elapsed - slot.born) / lifetime;
          if (progress >= 1) {
            hide(pool, index);
            changed = true;
            return;
          }
          apply(slot, progress);
          transform.updateMatrix();
          pool.mesh.setMatrixAt(index, transform.matrix);
          changed = true;
        });
        if (changed) pool.mesh.instanceMatrix.needsUpdate = true;
      };
      animatePool(dirt, .45, (slot, progress) => {
        const arc = Math.sin(progress * Math.PI) * .24;
        const scale = 1 - progress * .35;
        transform.position.set(slot.x + slot.dx * progress, slot.y + arc, slot.z + slot.dz * progress);
        transform.rotation.set(progress * slot.spin, progress * (slot.spin * .7 + 1.2), progress * slot.spin);
        transform.scale.set(scale, scale * (1 - progress * .36), scale);
      });
      animatePool(weeds, .3, (slot, progress) => {
        const scale = 1 - ease(progress);
        transform.position.set(slot.x, slot.y - progress * .17, slot.z);
        transform.rotation.set(0, progress * slot.spin, progress * slot.spin);
        transform.scale.set(1 - progress * .25, scale, 1 - progress * .25);
      });
    },
  };
}

function renderCropTile(instances, tile) {
  const { cropId, stage } = tile.crop;
  const { x, topY: y, z } = tile;
  const place = (name, dx, dy, dz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    instances.place(name, x + dx, y + dy, z + dz, rx, ry, rz, sx, sy, sz);

  if (stage === 1) {
    place('shootStem', 0, .11, 0);
    place('shootLeaf', -.07, .14, 0, 0, -.38, -.18);
    place('shootLeaf', .07, .17, .02, 0, .38, .18);
    return;
  }

  if (stage === 2) {
    if (cropId === 'corn' || cropId === 'wheat' || cropId === 'barley') {
      place('youngCerealStem', 0, .21, 0);
      place('youngCerealLeaf', -.1, .18, 0, 0, -.35, -.22);
      place('youngCerealLeaf', .1, .27, .02, 0, .35, .22);
    }
    else {
      place('youngBroadStem', 0, .17, 0);
      for (const [dx, dz, rotation] of [[-.1, 0, 0], [.1, 0, Math.PI], [0, -.09, Math.PI * .5], [0, .09, -Math.PI * .5]]) {
        place('youngBroadLeaf', dx, .27, dz, 0, rotation);
      }
    }
    return;
  }

  if (cropId === 'corn') {
    const height = stage === 3 ? .78 : 1.04;
    place('cornStem', 0, height * .5, 0, 0, 0, 0, 1, height, 1);
    const leafCount = stage === 3 ? 4 : 5;
    for (let index = 0; index < leafCount; index++) {
      const side = index % 2 ? -1 : 1;
      place('cornLeaf', side * .12, height * (.3 + index * .11), side * .05, 0, side * .42, side * .13);
    }
    if (stage === 4) {
      place('cornEar', -.09, height * .67, 0, 0, 0, -.12);
      place('cornEar', .09, height * .67, 0, 0, 0, .12);
    }
    return;
  }

  const stalkOffsets = [[-.14, -.08], [.13, -.1], [-.06, .12], [.15, .1]];
  if (cropId === 'wheat' || cropId === 'barley') {
    const barley = cropId === 'barley';
    const height = stage === 3 ? (barley ? .62 : .66) : (barley ? .76 : .8);
    const stemName = `${cropId}Stem${stage === 4 ? 'Ripe' : 'Green'}`;
    stalkOffsets.forEach(([dx, dz], index) => {
      const lean = (index - 1.5) * .025;
      place(stemName, dx, height * .5, dz, 0, 0, lean, 1, height, 1);
      if (stage !== 4) return;
      place(`${cropId}Head`, dx + lean * .4, height + .06, dz, 0, index * .45, lean);
      if (barley) {
        place('barleyAwn', dx - .025, height + .25, dz, 0, 0, -.1 + lean);
        place('barleyAwn', dx + .025, height + .25, dz, 0, 0, .1 + lean);
      }
    });
    return;
  }

  if (cropId === 'canola') {
    const height = stage === 3 ? .62 : .76;
    place('canolaStem', 0, height * .5, 0, 0, 0, 0, 1, height, 1);
    for (const [side, dz, level] of [[-1, -.05, .4], [1, .04, .48], [-1, .08, .58], [1, -.08, .66]]) {
      place('canolaBranch', side * .12, level, dz, 0, side * .18, side * .48);
    }
    if (stage === 4) {
      [[0, .84, 0], [-.2, .68, -.05], [.2, .73, .04], [-.16, .79, .08], [.16, .82, -.08]].forEach(([dx, dy, dz]) =>
        place('canolaFlower', dx, dy, dz));
    }
    return;
  }

  const height = stage === 3 ? .48 : .56;
  place('soybeanStem', 0, height * .5, 0, 0, 0, 0, 1, height, 1);
  for (const [side, dz, level] of [[-1, -.08, .25], [1, .06, .32], [-1, .08, .4], [1, -.06, .47]]) {
    place('soybeanStem', side * .1, level, dz, 0, side * .2, side * .62, 1, .34, 1);
    place('soybeanLeaf', side * .2, level + .08, dz, 0, side < 0 ? 0 : Math.PI);
    place('soybeanLeaf', side * .11, level + .12, dz + side * .1, 0, side * Math.PI * .5);
  }
  if (stage === 4) {
    [[-.12, .3, -.05], [.1, .34, .04], [-.08, .43, .08], [.14, .46, -.06], [0, .51, 0]].forEach(([dx, dy, dz], index) =>
      place('soybeanPod', dx, dy, dz, 0, index * .5, index % 2 ? .22 : -.22));
  }
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
    .filter(child => child.isGroup && child.name !== 'tall-grass' && child.name !== 'water' && child.name !== 'crop-overlay' && child.name !== 'field-effects')
    .map(object => ({ object, bounds: new THREE.Box3(), materials: cloneTransparentMaterials(object), opacity: 1, targetOpacity: 1 }));

  return {
    update(cameraPosition, vehicleState, delta) {
      if (!cameraPosition || !vehicleState) return;
      refreshElapsed += delta;
      const fadeAmount = 1 - Math.exp(-12 * Math.min(.1, delta));
      if (refreshElapsed >= 1 / 12) {
        refreshElapsed = 0;
        sightline.set(vehicleState.x, vehicleState.y + .75, vehicleState.z).sub(cameraPosition);
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

function findVehicleSpawns(terrain, start, barnArea) {
  const outsideBarn = tile => {
    if (!barnArea) return true;
    const dx = tile.x - barnArea.x;
    const dz = tile.z - barnArea.z;
    const localX = dx * Math.cos(barnArea.yaw) - dz * Math.sin(barnArea.yaw);
    const localZ = dx * Math.sin(barnArea.yaw) + dz * Math.cos(barnArea.yaw);
    return Math.abs(localX) > barnArea.width * .5 + .8 || Math.abs(localZ) > barnArea.depth * .5 + .8;
  };
  const candidates = [...terrain.values()].filter(tile =>
    tile.islandId === STARTER_ISLAND_ID && !tile.water && !tile.hasTree && !tile.reserved &&
    Math.abs(tile.topY - start.topY) < .01 && outsideBarn(tile)
  );
  candidates.sort((first, second) => {
    const firstDistance = Math.hypot(first.x - start.x, first.z - start.z);
    const secondDistance = Math.hypot(second.x - start.x, second.z - start.z);
    return firstDistance - secondDistance || first.gx - second.gx || first.gz - second.gz;
  });
  const selected = [];
  for (const tile of candidates) {
    if (selected.every(spawn => Math.hypot(tile.x - spawn.x, tile.z - spawn.z) >= 3.5)) {
      selected.push({ x: tile.x, y: tile.topY, z: tile.z });
      if (selected.length === 8) break;
    }
  }
  if (selected.length < 2) {
    for (const tile of candidates) {
      if (selected.some(spawn => spawn.x === tile.x && spawn.z === tile.z)) continue;
      selected.push({ x: tile.x, y: tile.topY, z: tile.z });
      if (selected.length === 2) break;
    }
  }
  return selected.length ? selected : [{ x: start.x, y: start.topY, z: start.z }];
}

function findCargoSite(terrain, island) {
  // Backbone bridges leave this island toward its north and southeast edges.
  // Keep cargo infrastructure on the west side and face the deck due west.
  const outward = { x: -1, z: 0 };
  const islandTiles = [...terrain.values()].filter(tile => tile.islandId === CARGO_ISLAND_ID);
  const candidates = [];

  // The half-diagonal margin treats each terrain tile as a full square rather
  // than only testing its center against the rotated deck footprint.
  const deckIsClear = site => [...terrain.values()].every(tile =>
    !cargoDeckContains(site, tile.x, tile.z, TILE * .72) || tile.topY <= site.y + .01
  );

  const approachIsClear = site => {
    const lateral = { x: -site.outward.z, z: site.outward.x };
    for (const depth of [0, 1, 2]) {
      for (const across of [-1, 0, 1]) {
        const gx = Math.round(site.x / TILE - site.outward.x * depth + lateral.x * across);
        const gz = Math.round(site.z / TILE - site.outward.z * depth + lateral.z * across);
        const approach = terrain.get(gridKey(gx, gz));
        if (!approach || approach.islandId !== CARGO_ISLAND_ID || approach.water || Math.abs(approach.topY - site.y) > .01) return false;
      }
    }
    return true;
  };

  for (const tile of islandTiles) {
    // Cargo infrastructure is only allowed on the island's first/base floor.
    if (tile.water || Math.abs(tile.topY - tile.baseY) > .01) continue;
    const dx = tile.gx - island.cx;
    const dz = tile.gz - island.cz;
    if (tile.radial < .62 || dx >= -island.r * .45) continue;
    const site = { x: tile.x, y: tile.topY, z: tile.z, outward };
    if (!approachIsClear(site) || !deckIsClear(site)) continue;
    candidates.push({ site, score: -dx * 3 + tile.radial - Math.abs(dz) * .05 });
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length) return candidates[0].site;

  const safeFallback = islandTiles
    .filter(tile => !tile.water && Math.abs(tile.topY - tile.baseY) <= .01 &&
      tile.radial >= .62 && tile.gx - island.cx < -island.r * .45)
    .map(tile => ({ site: { x: tile.x, y: tile.topY, z: tile.z, outward }, tile }))
    .filter(candidate => deckIsClear(candidate.site))
    .sort((a, b) => a.tile.gx - b.tile.gx)[0];
  return safeFallback?.site || null;
}

function reserveCargoApproach(terrain, site) {
  if (!site) return;
  for (const tile of terrain.values()) {
    if (tile.islandId !== CARGO_ISLAND_ID) continue;
    const approach = Math.abs(tile.topY - site.y) <= .01 && Math.hypot(tile.x - site.x, tile.z - site.z) <= 2.35;
    if (approach || cargoDeckContains(site, tile.x, tile.z, TILE * .85)) tile.reserved = true;
    // Tree crowns reach farther than their trunks; keep decorations clear
    // without unnecessarily removing the surrounding tiles from farming.
    if (cargoDeckContains(site, tile.x, tile.z, TILE * 2.75)) tile.noDecoration = true;
  }
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
  tile.topY -= WATER_DEPTH;
  tile.dirtDepth -= WATER_DEPTH;
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
  // Expand the middle of Perlin's distribution so each field develops
  // decisive bright/dry and dark/wet regions rather than mostly midtones.
  return THREE.MathUtils.clamp(.5 + (normalized - .5) * 3, 0, 1);
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
