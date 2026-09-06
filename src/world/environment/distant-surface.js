import { LEVEL_HEIGHT, THREE } from '../../core/shared.js';
import { seededRandom } from '../islands/procedural.js';

const TEXTURE_SIZE = 512;
const REPEAT_SPAN = 160;
const HALF_REPEAT = REPEAT_SPAN * .5;
const HORIZON_BIAS = HALF_REPEAT;
const MAP_TILE_COUNT = 128;
const MAP_TILE_SPAN = REPEAT_SPAN / MAP_TILE_COUNT;
const PIXELS_PER_TILE = TEXTURE_SIZE / MAP_TILE_COUNT;
const PLANE_SIZE = 720;
const HEIGHT_GRID_COUNT = 64;
const HEIGHT_CELL_SPAN = REPEAT_SPAN / HEIGHT_GRID_COUNT;
const HEIGHT_LEVEL_COUNT = 5;
const PLANE_Y = -54;
const SURFACE_SPEED = .34;
const TREE_CAP = 1000;
const TREE_OCCUPANCY = .29;
const TREE_JITTER = .82;
const CELL_RADIUS = 1;
const TAU = Math.PI * 2;

export const DISTANT_SURFACE_BUDGET = Object.freeze({
  textureSize: TEXTURE_SIZE,
  anisotropyCap: 4,
  repeatSpan: REPEAT_SPAN,
  horizonBias: HORIZON_BIAS,
  mapTileCount: MAP_TILE_COUNT,
  mapTileSpan: MAP_TILE_SPAN,
  sourceTileCount: MAP_TILE_COUNT ** 2,
  heightGridCount: HEIGHT_GRID_COUNT,
  heightCellSpan: HEIGHT_CELL_SPAN,
  heightLevelCount: HEIGHT_LEVEL_COUNT,
  heightLevelStep: LEVEL_HEIGHT,
  planeSize: PLANE_SIZE,
  planeTriangles: 2,
  planeY: PLANE_Y,
  treeRecordCap: TREE_CAP,
  repeatedCells: (CELL_RADIUS * 2 + 1) ** 2,
  drawCalls: 4,
  sceneChildren: 1,
});

const PALETTE = Object.freeze({
  water: [25, 127, 178],
  grass: [104, 168, 88],
  grassHigh: [143, 189, 99],
  forest: [57, 125, 69],
  dirt: [160, 109, 70],
});
const PALETTE_KEYS = Object.freeze(['water', 'grass', 'grassHigh', 'forest', 'dirt']);
const COLOR_STEPS = [-6, -3, 0, 3, 6, 9];

const fraction = value => ((value % 1) + 1) % 1;
const wrapCoordinate = value => ((value + HALF_REPEAT) % REPEAT_SPAN + REPEAT_SPAN) % REPEAT_SPAN - HALF_REPEAT;
const wrappedIndex = (value, count) => ((value % count) + count) % count;

const hash01 = (index, salt) => {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
};

function createField(random, frequencies) {
  const weights = frequencies.map((_, index) => 1 / (index + 1));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  return frequencies.map(([x, z], index) => ({
    x,
    z,
    phase: random() * TAU,
    weight: weights[index] / weightTotal,
  }));
}

function sampleField(terms, x, z) {
  const u = x / REPEAT_SPAN;
  const v = z / REPEAT_SPAN;
  let value = 0;
  for (const term of terms) value += Math.sin(TAU * (u * term.x + v * term.z) + term.phase) * term.weight;
  return value;
}

function createDomain(seed) {
  const random = seededRandom(seed);
  const elevation = createField(random, [[4, 0], [0, 4], [5, 3], [7, -4], [10, 7]]);
  const dryness = createField(random, [[3, -5], [6, 3], [5, 7], [9, -6]]);
  const forest = createField(random, [[5, 5], [8, -3], [10, 4], [6, 11]]);
  const relief = createField(random, [[1, 0], [0, 1], [1, 1], [2, -1], [2, 2]]);
  const tiles = [];
  for (let gz = 0; gz < MAP_TILE_COUNT; gz++) {
    for (let gx = 0; gx < MAP_TILE_COUNT; gx++) {
      const x = -HALF_REPEAT + (gx + .5) * MAP_TILE_SPAN;
      const z = -HALF_REPEAT + (gz + .5) * MAP_TILE_SPAN;
      const elevationValue = sampleField(elevation, x, z);
      const terrain = elevationValue < -.1
        ? 'water'
        : sampleField(dryness, x, z) > .28 ? 'dirt' : 'grass';
      const forestDensity = sampleField(forest, x, z);
      const forestGround = terrain === 'grass' && forestDensity > .1;
      const variation = COLOR_STEPS[Math.floor(hash01(gz * MAP_TILE_COUNT + gx, seed) * COLOR_STEPS.length)];
      tiles.push({ gx, gz, x, z, terrain, forestDensity, forestGround, variation });
    }
  }
  return { seed: seed >>> 0, forest, relief, tiles };
}

function createPlateaus(domain) {
  const sourceTilesPerCell = MAP_TILE_COUNT / HEIGHT_GRID_COUNT;
  const plateaus = [];
  for (let gz = 0; gz < HEIGHT_GRID_COUNT; gz++) {
    for (let gx = 0; gx < HEIGHT_GRID_COUNT; gx++) {
      const sourceTiles = [];
      for (let dz = 0; dz < sourceTilesPerCell; dz++) {
        for (let dx = 0; dx < sourceTilesPerCell; dx++) {
          sourceTiles.push(domain.tiles[
            (gz * sourceTilesPerCell + dz) * MAP_TILE_COUNT + gx * sourceTilesPerCell + dx
          ]);
        }
      }
      const x = -HALF_REPEAT + (gx + .5) * HEIGHT_CELL_SPAN;
      const z = -HALF_REPEAT + (gz + .5) * HEIGHT_CELL_SPAN;
      const relief = sampleField(domain.relief, x, z);
      const touchesWater = sourceTiles.some(tile => tile.terrain === 'water');
      const level = touchesWater ? 0
        : relief < -.24 ? 0
          : relief < -.05 ? 1
            : relief < .14 ? 2
              : relief < .31 ? 3 : 4;
      const forestGround = sourceTiles.filter(tile => tile.forestGround).length >= 2;
      const variation = Math.round(sourceTiles.reduce((sum, tile) => sum + tile.variation, 0) / sourceTiles.length);
      plateaus.push({ gx, gz, x, z, level, forestGround, variation });
    }
  }
  return plateaus;
}

function plateauAt(plateaus, gx, gz) {
  return plateaus[wrappedIndex(gz, HEIGHT_GRID_COUNT) * HEIGHT_GRID_COUNT + wrappedIndex(gx, HEIGHT_GRID_COUNT)];
}

function plateauHeightAt(plateaus, x, z) {
  const gx = Math.floor((wrapCoordinate(x) + HALF_REPEAT) / HEIGHT_CELL_SPAN);
  const gz = Math.floor((wrapCoordinate(z) + HALF_REPEAT) / HEIGHT_CELL_SPAN);
  return plateauAt(plateaus, gx, gz).level * LEVEL_HEIGHT;
}

function createTrees(domain, plateaus) {
  const trees = [];
  for (const tile of domain.tiles) {
    if (tile.terrain !== 'grass') continue;
    const index = tile.gz * MAP_TILE_COUNT + tile.gx;
    const x = tile.x + (hash01(index, domain.seed ^ 0x045d9f3b) - .5) * MAP_TILE_SPAN * TREE_JITTER;
    const z = tile.z + (hash01(index, domain.seed ^ 0x119de1f3) - .5) * MAP_TILE_SPAN * TREE_JITTER;
    const density = Math.max(0, Math.min(1, (sampleField(domain.forest, x, z) + .14) / .42));
    if (hash01(index, domain.seed ^ 0x68bc21eb) >= density * TREE_OCCUPANCY) continue;
    trees.push({
      x,
      z,
      surfaceY: plateauHeightAt(plateaus, x, z) + .06,
      scale: .84 + hash01(index, domain.seed ^ 0x02e5be93) * .32,
      yaw: Math.floor(hash01(index, domain.seed ^ 0x27d4eb2f) * 4) * Math.PI * .5,
      priority: density + hash01(index, domain.seed ^ 0x165667b1) * .08,
    });
  }
  if (trees.length > TREE_CAP) trees.sort((a, b) => b.priority - a.priority).length = TREE_CAP;
  return trees;
}

function writePixel(data, index, source, variation) {
  data[index] = Math.max(0, Math.min(255, source[0] + variation));
  data[index + 1] = Math.max(0, Math.min(255, source[1] + variation));
  data[index + 2] = Math.max(0, Math.min(255, source[2] + variation));
  data[index + 3] = 255;
}

function createMipData(cells, count, pixelsPerCell) {
  const size = count * pixelsPerCell;
  const data = new Uint8Array(size * size * 4);
  for (let cellZ = 0; cellZ < count; cellZ++) {
    for (let cellX = 0; cellX < count; cellX++) {
      const cell = cells[cellZ * count + cellX];
      for (let py = 0; py < pixelsPerCell; py++) {
        const row = cellZ * pixelsPerCell + py;
        for (let px = 0; px < pixelsPerCell; px++) {
          const column = cellX * pixelsPerCell + px;
          writePixel(data, (row * size + column) * 4, PALETTE[cell.palette], cell.variation);
        }
      }
    }
  }
  return { data, width: size, height: size };
}

function nearestColorStep(value) {
  return COLOR_STEPS.reduce((nearest, step) =>
    Math.abs(step - value) < Math.abs(nearest - value) ? step : nearest, COLOR_STEPS[0]);
}

function downsampleTerrainCells(cells, count, seed, level) {
  const nextCount = count / 2;
  const next = [];
  for (let gz = 0; gz < nextCount; gz++) {
    for (let gx = 0; gx < nextCount; gx++) {
      const samples = [
        cells[(gz * 2) * count + gx * 2],
        cells[(gz * 2) * count + gx * 2 + 1],
        cells[(gz * 2 + 1) * count + gx * 2],
        cells[(gz * 2 + 1) * count + gx * 2 + 1],
      ];
      const counts = PALETTE_KEYS.map(palette => samples.filter(sample => sample.palette === palette).length);
      const largest = Math.max(...counts);
      const tied = PALETTE_KEYS.filter((_, index) => counts[index] === largest);
      const blockIndex = gz * nextCount + gx;
      const palette = tied[Math.floor(hash01(blockIndex, seed ^ (level * 0x9e3779b1)) * tied.length)];
      const matching = samples.filter(sample => sample.palette === palette);
      const variation = nearestColorStep(matching.reduce((sum, sample) => sum + sample.variation, 0) / matching.length);
      next.push({ palette, variation });
    }
  }
  return next;
}

function createTerrainTexture(domain, anisotropy) {
  let cells = domain.tiles.map(tile => ({
    palette: tile.forestGround ? 'forest' : tile.terrain,
    variation: tile.variation,
  }));
  let count = MAP_TILE_COUNT;
  const mipmaps = [
    createMipData(cells, count, PIXELS_PER_TILE),
    createMipData(cells, count, PIXELS_PER_TILE / 2),
    createMipData(cells, count, 1),
  ];
  for (let level = 3; count > 1; level++) {
    cells = downsampleTerrainCells(cells, count, domain.seed, level);
    count /= 2;
    mipmaps.push(createMipData(cells, count, 1));
  }
  const texture = new THREE.DataTexture(mipmaps[0].data, TEXTURE_SIZE, TEXTURE_SIZE, THREE.RGBAFormat);
  texture.name = 'distant-surface-map';
  texture.mipmaps = mipmaps.slice(1);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = anisotropy;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.mipStrategy = 'dominant-terrain-class';
  texture.userData.mipLevelCount = mipmaps.length;
  texture.needsUpdate = true;
  return texture;
}

function pushFace({ positions, normals, colors }, corners, normal, color = null) {
  for (const index of [0, 1, 3, 1, 2, 3]) {
    positions.push(...corners[index]);
    normals.push(...normal);
    if (colors) colors.push(color.r, color.g, color.b);
  }
}

function topColorFor(plateau) {
  const source = plateau.forestGround ? PALETTE.forest : PALETTE.grassHigh;
  return new THREE.Color().setRGB(
    Math.max(0, Math.min(255, source[0] + plateau.variation)) / 255,
    Math.max(0, Math.min(255, source[1] + plateau.variation)) / 255,
    Math.max(0, Math.min(255, source[2] + plateau.variation)) / 255,
    THREE.SRGBColorSpace,
  );
}

function addPlateauTop(builder, plateau) {
  const half = HEIGHT_CELL_SPAN * .5;
  const y = plateau.level * LEVEL_HEIGHT + .012;
  pushFace(builder, [
    [plateau.x - half, y, plateau.z - half],
    [plateau.x - half, y, plateau.z + half],
    [plateau.x + half, y, plateau.z + half],
    [plateau.x + half, y, plateau.z - half],
  ], [0, 1, 0], topColorFor(plateau));
}

function addPlateauSide(builder, plateau, neighbor, dx, dz) {
  const half = HEIGHT_CELL_SPAN * .5;
  const top = plateau.level * LEVEL_HEIGHT;
  const bottom = neighbor.level * LEVEL_HEIGHT;
  if (dx > 0) pushFace(builder, [
    [plateau.x + half, bottom, plateau.z - half], [plateau.x + half, top, plateau.z - half],
    [plateau.x + half, top, plateau.z + half], [plateau.x + half, bottom, plateau.z + half],
  ], [1, 0, 0]);
  else if (dx < 0) pushFace(builder, [
    [plateau.x - half, bottom, plateau.z + half], [plateau.x - half, top, plateau.z + half],
    [plateau.x - half, top, plateau.z - half], [plateau.x - half, bottom, plateau.z - half],
  ], [-1, 0, 0]);
  else if (dz > 0) pushFace(builder, [
    [plateau.x + half, bottom, plateau.z + half], [plateau.x + half, top, plateau.z + half],
    [plateau.x - half, top, plateau.z + half], [plateau.x - half, bottom, plateau.z + half],
  ], [0, 0, 1]);
  else pushFace(builder, [
    [plateau.x - half, bottom, plateau.z - half], [plateau.x - half, top, plateau.z - half],
    [plateau.x + half, top, plateau.z - half], [plateau.x + half, bottom, plateau.z - half],
  ], [0, 0, -1]);
}

function geometryFrom(builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(builder.normals, 3));
  if (builder.colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(builder.colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createTreeGeometry() {
  const specs = [
    { size: [.18, .68, .18], y: .34, color: 0x704529 },
    { size: [1.02, .88, .82], y: 1.03, color: 0x2e7c3c },
  ];
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertexOffset = 0;
  for (const spec of specs) {
    const box = new THREE.BoxGeometry(...spec.size);
    box.translate(0, spec.y, 0);
    positions.push(...box.getAttribute('position').array);
    normals.push(...box.getAttribute('normal').array);
    const color = new THREE.Color(spec.color);
    for (let index = 0; index < box.getAttribute('position').count; index++) colors.push(color.r, color.g, color.b);
    for (const index of box.index.array) indices.push(index + vertexOffset);
    vertexOffset += box.getAttribute('position').count;
    box.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createPlateauGeometry(plateaus) {
  const tops = { positions: [], normals: [], colors: [] };
  const sides = { positions: [], normals: [], colors: null };
  const levelCounts = Array.from({ length: HEIGHT_LEVEL_COUNT }, () => 0);
  let topFaceCount = 0;
  let sideFaceCount = 0;
  let hiddenSideFaceCount = 0;
  for (const plateau of plateaus) {
    levelCounts[plateau.level]++;
    if (!plateau.level) continue;
    addPlateauTop(tops, plateau);
    topFaceCount++;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = plateauAt(plateaus, plateau.gx + dx, plateau.gz + dz);
      if (neighbor.level >= plateau.level) {
        hiddenSideFaceCount++;
        continue;
      }
      addPlateauSide(sides, plateau, neighbor, dx, dz);
      sideFaceCount++;
    }
  }
  return {
    top: geometryFrom(tops),
    side: geometryFrom(sides),
    levelCounts,
    topFaceCount,
    sideFaceCount,
    hiddenSideFaceCount,
  };
}

function createRepeatedMesh(geometry, material, name) {
  const count = (CELL_RADIUS * 2 + 1) ** 2;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let cellX = -CELL_RADIUS; cellX <= CELL_RADIUS; cellX++) {
    for (let cellZ = -CELL_RADIUS; cellZ <= CELL_RADIUS; cellZ++) {
      matrix.makeTranslation(cellX * REPEAT_SPAN, 0, cellZ * REPEAT_SPAN);
      mesh.setMatrixAt(index++, matrix);
    }
  }
  mesh.name = name;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = -2;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return mesh;
}

function createTreeMesh(trees, material) {
  const cellCount = (CELL_RADIUS * 2 + 1) ** 2;
  const count = trees.length * cellCount;
  const geometry = createTreeGeometry();
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const transform = new THREE.Object3D();
  let index = 0;
  for (let cellX = -CELL_RADIUS; cellX <= CELL_RADIUS; cellX++) {
    for (let cellZ = -CELL_RADIUS; cellZ <= CELL_RADIUS; cellZ++) {
      for (const tree of trees) {
        const x = tree.x + cellX * REPEAT_SPAN;
        const z = tree.z + cellZ * REPEAT_SPAN;
        transform.position.set(x, tree.surfaceY, z);
        transform.rotation.set(0, tree.yaw, 0);
        transform.scale.set(tree.scale, tree.scale, tree.scale);
        transform.updateMatrix();
        mesh.setMatrixAt(index++, transform.matrix);
      }
    }
  }
  mesh.name = 'distant-surface-trees';
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return { mesh, geometry, instanceCount: count };
}

function createPlane(material) {
  const geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);
  geometry.rotateX(-Math.PI * .5);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index++) {
    uvs.setXY(index, positions.getX(index) / REPEAT_SPAN + .5, positions.getZ(index) / REPEAT_SPAN + .5);
  }
  uvs.needsUpdate = true;
  const plane = new THREE.Mesh(geometry, material);
  plane.name = 'distant-surface-plane';
  plane.position.y = PLANE_Y;
  plane.castShadow = false;
  plane.receiveShadow = false;
  plane.renderOrder = -3;
  return { plane, geometry };
}

export function createDistantSurfaceSystem({ anisotropy = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'distant-surface';
  let resources = null;
  let frameCenterX = 0;
  let frameCenterZ = 0;

  const clear = () => {
    if (!resources) return;
    resources.plane.removeFromParent();
    resources.movingRoot.removeFromParent();
    resources.texture.dispose();
    resources.geometries.forEach(geometry => geometry.dispose());
    resources.materials.forEach(material => material.dispose());
    resources = null;
  };

  const update = travelState => {
    if (!resources) return;
    const directionX = Number(travelState?.direction?.x) || 0;
    const directionZ = Number(travelState?.direction?.z) || 0;
    const directionLength = Math.hypot(directionX, directionZ);
    if (directionLength < .0001) return;
    const distance = Math.max(0, Number(travelState?.distance) || 0) * SURFACE_SPEED;
    const offsetX = wrapCoordinate(-directionX / directionLength * distance);
    const offsetZ = wrapCoordinate(-directionZ / directionLength * distance);
    const offsetU = fraction(-offsetX / REPEAT_SPAN);
    const offsetV = fraction(-offsetZ / REPEAT_SPAN);
    resources.texture.offset.set(offsetU, offsetV);
    resources.movingRoot.position.set(frameCenterX + offsetX, PLANE_Y, frameCenterZ + offsetZ);
  };

  return {
    group,
    setWorld(frame, seed, travelState) {
      clear();
      const centerX = Number(frame?.centerX) || 0;
      const centerZ = Number(frame?.centerZ) || 0;
      const horizonX = Number(frame?.horizonX) || 0;
      const horizonZ = Number(frame?.horizonZ) || 0;
      const horizonLength = Math.hypot(horizonX, horizonZ);
      frameCenterX = centerX + (horizonLength ? horizonX / horizonLength * HORIZON_BIAS : 0);
      frameCenterZ = centerZ + (horizonLength ? horizonZ / horizonLength * HORIZON_BIAS : 0);
      const domain = createDomain(seed >>> 0);
      const plateaus = createPlateaus(domain);
      const plateauGeometry = createPlateauGeometry(plateaus);
      const trees = createTrees(domain, plateaus);
      const texture = createTerrainTexture(domain, Math.min(4, Math.max(1, Math.floor(anisotropy))));
      const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture, fog: false });
      const topMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: false });
      const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x8f5b3b, fog: false });
      const treeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: false });
      const planeResult = createPlane(planeMaterial);
      planeResult.plane.position.x = frameCenterX;
      planeResult.plane.position.z = frameCenterZ;
      const movingRoot = new THREE.Group();
      movingRoot.name = 'distant-surface-landmarks';
      movingRoot.position.set(frameCenterX, PLANE_Y, frameCenterZ);
      const plateauTops = createRepeatedMesh(plateauGeometry.top, topMaterial, 'distant-surface-plateau-tops');
      const plateauSides = createRepeatedMesh(plateauGeometry.side, sideMaterial, 'distant-surface-plateau-sides');
      const treeResult = createTreeMesh(trees, treeMaterial);
      for (const mesh of [plateauTops, plateauSides, treeResult.mesh]) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = -2;
        movingRoot.add(mesh);
      }
      group.add(planeResult.plane, movingRoot);
      resources = {
        plane: planeResult.plane,
        movingRoot,
        texture,
        geometries: [planeResult.geometry, plateauGeometry.top, plateauGeometry.side, treeResult.geometry],
        materials: [planeMaterial, topMaterial, sideMaterial, treeMaterial],
      };
      group.userData.resourceBudget = {
        ...DISTANT_SURFACE_BUDGET,
        horizonDirection: horizonLength
          ? { x: horizonX / horizonLength, z: horizonZ / horizonLength }
          : { x: 0, z: 0 },
        heightLevelCounts: plateauGeometry.levelCounts,
        sourcePlateauTopFaces: plateauGeometry.topFaceCount,
        sourcePlateauSideFaces: plateauGeometry.sideFaceCount,
        sourceHiddenSideFaces: plateauGeometry.hiddenSideFaceCount,
        effectivePlateauTopFaces: plateauGeometry.topFaceCount * DISTANT_SURFACE_BUDGET.repeatedCells,
        effectivePlateauSideFaces: plateauGeometry.sideFaceCount * DISTANT_SURFACE_BUDGET.repeatedCells,
        plateauTopTriangles: plateauGeometry.topFaceCount * 2 * DISTANT_SURFACE_BUDGET.repeatedCells,
        plateauSideTriangles: plateauGeometry.sideFaceCount * 2 * DISTANT_SURFACE_BUDGET.repeatedCells,
        treeRecords: trees.length,
        treeInstancesPerDraw: treeResult.instanceCount,
        treeDrawCalls: 1,
        treeGeometryTriangles: treeResult.geometry.index.count / 3,
        treeTriangles: treeResult.instanceCount * (treeResult.geometry.index.count / 3),
        textureCount: 1,
        textureMipLevels: texture.userData.mipLevelCount,
        textureMipStrategy: texture.userData.mipStrategy,
        effectiveTriangles: DISTANT_SURFACE_BUDGET.planeTriangles +
          (plateauGeometry.topFaceCount + plateauGeometry.sideFaceCount) * 2 * DISTANT_SURFACE_BUDGET.repeatedCells +
          treeResult.instanceCount * (treeResult.geometry.index.count / 3),
        descendantNodes: 6,
      };
      update(travelState);
    },
    update,
    dispose: clear,
  };
}
