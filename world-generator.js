import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, MODEL_VOXEL, SOIL_DEPTH, TILE, box, createVoxelLantern, createVoxelModel, gridKey, THREE } from './shared.js';
import { crops } from './crops.js';
import { cargoDeckContains, createCargoPort } from './cargo-port.js';
import { createForageSystem } from './forage.js';
import { createWildlifeSystem } from './wildlife.js';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const BRIDGE_GAP_TILES = 1;
const BRIDGE_WIDTH = TILE * 2;
const BRIDGE_THICKNESS = 0.18;
const BRIDGE_SEGMENT_LENGTH = .42;
const BRIDGE_ARCH_MIN_RISE = .25;
const BRIDGE_ARCH_MAX_RISE = .6;
const BRIDGE_ARCH_RISE_PER_UNIT = .06;
const BRIDGE_MAX_PITCH = THREE.MathUtils.degToRad(40);
const BRIDGE_RAIL_HEIGHT = .8;
const BRIDGE_RAIL_THICKNESS = MODEL_VOXEL;
const BRIDGE_RAIL_LOWER_Y = .38;
const BRIDGE_RAIL_UPPER_Y = .72;
const BRIDGE_RAIL_POST_SPACING = TILE * 1.15;
const BRIDGE_SHORT_LANTERN_SPAN = TILE * 2.5;
const BRIDGE_OCCLUSION_END_CLEARANCE = TILE * 2.25;
const BRIDGE_OCCLUSION_SIDE_CLEARANCE = TILE * .75;
const BRIDGE_OCCLUSION_HEIGHT_CLEARANCE = TILE * .75;
const STARTER_ISLAND_ID = 0;
const NORTH_ISLAND_ID = 1;
const WORKSHOP_TREE_CLEARANCE = 3.5 * TILE;
const WORKSHOP_YAW = Math.PI * 1.5;
const WATER_DEPTH = .22;
const ISLAND_LAYOUT_SCALE = 1.5;
const STARTER_HUB_RADIUS = 7.2;
const SECOND_STARTER_RADIUS = 7.0;
const CROP_STAGE_SECONDS = 3;
const GRASS_STAGE_SECONDS = 10;
const TILE_YIELD_LITRES = 200;
const WEED_CHANCE = .4;
const READY_PULSE_SECONDS = 3.2;
const PROP_SPREAD = TILE * .64;
const TREE_CHANCE_CAP = .22;
const ROCK_CHANCE_CAP = .12;
const GROUND_COVER_CHANCE_CAP = .42;
const GRASS_EDGE_CAP_DEPTH = .022;
const GRASS_EDGE_CAP_HEIGHT = .05;
const GRASS_EDGE_CAP_RECESS = .012;
const SURFACE_TOP_LIFT = .002;
const SURFACE_CELL_COUNT = Math.round(TILE / MODEL_VOXEL);
const SURFACE_CELL_VARIATION = .1;
const SURFACE_CELL_LEVELS = [-1, -.5, -.25, 0, 0, .25, .5, 1];
const SNOW_COLOR = new THREE.Color(0xe8f0ed);
const CONTACT_BED_HEIGHT = .008;
const BARE_SOIL_COLOR = new THREE.Color(0x94795d);
const PROP_DIRT_COLOR = new THREE.Color(0x82694f);
const SOIL_STRATA_HEIGHT = .28;
const SOIL_STRATA_COLORS = [0x896754, 0x8f6b55, 0x83614e, 0x8b6751].map(color => new THREE.Color(color));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = value => value * value * (3 - 2 * value);

export function generateFarm(scene, physics, seed = (Math.random() * 0xffffffff) >>> 0, attempt = 0, onChange = () => {}) {
  const random = seededRandom(seed);
  const terrainNoise = createPerlin(seed ^ 0x9e3779b9);
  const moistureNoise = createPerlin(seed ^ 0x243f6a88);
  const sunNoise = createPerlin(seed ^ 0xb7e15162);
  // Ground wear has its own deterministic stream so it cannot perturb island
  // generation or the established prop layout for a saved seed.
  const wearNoise = createPerlin(seed ^ 0xa511e9b3);
  const wearRandom = seededRandom(seed ^ 0x63d83595);
  const contactRandom = seededRandom(seed ^ 0xc2b2ae35);
  const propDirtRandom = seededRandom(seed ^ 0x27d4eb2f);
  const group = new THREE.Group();
  const terrain = new Map();
  const obstacles = [];
  const lowerBlocks = [];
  const bridgeBlocks = [];
  const buildingObstacles = new Map();
  const trees = [];
  const foliageMaterials = new Map();
  const tallGrass = new THREE.Group();
  const groundCoverPlacements = [];
  const contactBedPlacements = [];
  const propDirtSpots = [];
  const water = new THREE.Group();
  const waterMotion = [];
  const waterfalls = [];
  const waterParticles = [];
  const bridgeLanternGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdfa0,
    emissive: 0xffa62e,
    emissiveIntensity: .25,
    roughness: .38,
  });
  const bridgeLanternGlowMeshes = [];
  const bridgeLanternLights = [];
  const soilStrataMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const grainSplashMaterials = Object.fromEntries([
    ['corn', 0xf2c84b], ['wheat', 0xd9b65a], ['barley', 0xc9a552], ['canola', 0xf0ce32], ['soybean', 0xb78e48],
  ].map(([cropId, color]) => [cropId, new THREE.MeshBasicMaterial({ color, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })]));
  let tallGrassGeometry = null;
  let workshopArea = null;
  let setWorkshopNightAmount = () => {};
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
      environment, normalGrassColor: null, bareSoil: 0,
      surfaceBatch: null, surfaceInstance: -1,
      surfaceTopBatch: null, surfaceTopColorOffset: -1, surfaceTopColorCount: 0,
      tallGrass: null, groundCover: [], stones: [], hasTree: false, nearWater: 0,
      ploughed: false, water: false, reserved: false, noDecoration: false, crop: null,
      looseGrassLitres: 0,
    });
  };

  const grassColorFor = tile => {
    const raised = tile.topY > tile.baseY + .01;
    const profile = environmentProfile(tile.environment);
    const dryWarmth = profile.dry * (.5 + profile.sunny * .5);
    const wetDepth = profile.wet * (.6 + profile.shady * .4);
    const hue = .285 - dryWarmth * .105 + wetDepth * .035;
    const saturation = THREE.MathUtils.clamp(.52 + wetDepth * .08 + dryWarmth * .04, .48, .62);
    const lightness = THREE.MathUtils.clamp(
      .45 + (profile.sun - .5) * .045 - profile.shady * .018 - wetDepth * .015 +
        dryWarmth * profile.sunny * .012 + (raised ? .006 : 0),
      .415,
      .48,
    );
    return new THREE.Color().setHSL(hue, saturation, lightness);
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
      tile.nearWater = waterBonus / .58;
      tile.environment.moisture = tile.water ? 1 : THREE.MathUtils.clamp(tile.environment.moisture + waterBonus, 0, 1);
      if (!tile.water) tile.normalGrassColor = grassColorFor(tile);
    }
  };

  const wearLobes = [];
  const addWearPatch = (tile, radius, strength) => {
    if (!tile || tile.water) return;
    const addLobe = (x, z, lobeRadius, lobeStrength) => wearLobes.push({
      x, z, radius: lobeRadius, strength: lobeStrength,
      islandId: tile.islandId, topY: tile.topY,
    });
    addLobe(tile.x, tile.z, radius, strength);
    for (let index = 0; index < 2; index++) {
      const angle = wearRandom() * Math.PI * 2;
      const distance = radius * (.22 + wearRandom() * .3);
      addLobe(
        tile.x + Math.cos(angle) * distance,
        tile.z + Math.sin(angle) * distance,
        radius * (.42 + wearRandom() * .2),
        strength * (.62 + wearRandom() * .18),
      );
    }
  };

  const bareSoilAt = (x, z, islandId, topY) => {
    let amount = 0;
    for (const lobe of wearLobes) {
      if (lobe.islandId !== islandId || Math.abs(lobe.topY - topY) > .01) continue;
      const distance = Math.hypot(x - lobe.x, z - lobe.z) / lobe.radius;
      if (distance >= 1) continue;
      const falloff = 1 - THREE.MathUtils.smoothstep(distance, .16, 1);
      const breakup = .86 + normalizeNoise(wearNoise(x * .46 + 6.3, z * .46 - 12.7)) * .24;
      amount = Math.max(amount, falloff * lobe.strength * breakup);
    }
    return THREE.MathUtils.clamp(amount, 0, 1);
  };

  const buildBareSoilWear = (workshopTile, cargoTile, bridgeGaps, islands) => {
    addWearPatch(workshopTile, 2.75, .92);
    addWearPatch(cargoTile, 2.35, .82);
    for (const gap of bridgeGaps) {
      addWearPatch(gap.from, 1.65 + wearRandom() * .25, .74);
      addWearPatch(gap.to, 1.65 + wearRandom() * .25, .74);
    }

    for (const island of islands) {
      const candidates = [...terrain.values()]
        .filter(tile => tile.islandId === island.id && !tile.water && !tile.reserved && !tile.noDecoration && tile.radial > .62)
        .filter(tile => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => {
          const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
          return !neighbor || neighbor.topY < tile.topY - .01;
        }))
        .map(tile => ({ tile, score: wearRandom() + environmentProfile(tile.environment).dry * .3 }))
        .sort((first, second) => second.score - first.score);
      const patchCount = island.r > 6 ? 2 : 1;
      for (const candidate of candidates.slice(0, patchCount)) {
        const dry = environmentProfile(candidate.tile.environment).dry;
        addWearPatch(candidate.tile, 1.15 + wearRandom() * .65, .46 + dry * .18);
      }
    }

    for (const tile of terrain.values()) {
      if (!tile.water) tile.bareSoil = bareSoilAt(tile.x, tile.z, tile.islandId, tile.topY);
    }
  };

  const addPropDirt = (tile, x, z, scale = 1) => {
    if (!tile || propDirtRandom() > .7) return;
    const spotCount = propDirtRandom() < .32 ? 2 : 1;
    for (let index = 0; index < spotCount; index++) {
      const angle = propDirtRandom() * Math.PI * 2;
      const distance = MODEL_VOXEL * (.28 + propDirtRandom() * .48) * scale;
      propDirtSpots.push({
        x: x + Math.cos(angle) * distance,
        z: z + Math.sin(angle) * distance,
        radius: MODEL_VOXEL * (.9 + propDirtRandom() * .45) * scale,
        strength: .25 + propDirtRandom() * .14,
        islandId: tile.islandId,
        topY: tile.topY,
      });
    }
  };

  const propDirtAt = (x, z, islandId, topY) => {
    let amount = 0;
    for (const spot of propDirtSpots) {
      if (spot.islandId !== islandId || Math.abs(spot.topY - topY) > .01) continue;
      const distance = Math.hypot(x - spot.x, z - spot.z) / spot.radius;
      if (distance >= 1) continue;
      amount = Math.max(amount, (1 - THREE.MathUtils.smoothstep(distance, .12, 1)) * spot.strength);
    }
    return amount;
  };

  const groundCoverPlacement = (tile, type, minScale, scaleRange) => {
    const scale = minScale + random() * scaleRange;
    const placement = {
      tile,
      type,
      offsetX: (random() - .5) * PROP_SPREAD,
      offsetZ: (random() - .5) * PROP_SPREAD,
      yaw: random() * Math.PI * 2,
      mirrorX: random() < .5 ? -1 : 1,
      scaleX: scale * (.92 + random() * .16),
      scaleY: scale * (.9 + random() * .2),
      scaleZ: scale * (.92 + random() * .16),
    };
    groundCoverPlacements.push(placement);
    const soilTolerant = type === 'dryScrub' || type === 'yellowGrass';
    const visible = tile.bareSoil <= .7 && (tile.bareSoil <= .42 || soilTolerant);
    if (visible && soilTolerant) {
      addPropDirt(tile, tile.x + placement.offsetX, tile.z + placement.offsetZ, scale);
    }
  };

  const addTallGrass = tile => {
    groundCoverPlacement(tile, 'brightGrass', .85, .3);
  };

  const addGroundCover = (tile, type) => {
    groundCoverPlacement(tile, type, .82, .36);
  };

  const buildGroundCover = () => {
    if (!groundCoverPlacements.length) return;
    const geometry = tallGrassGeometry ||= new THREE.BoxGeometry(1, 1, 1);
    const materials = groundCoverMaterials();
    const placementsByType = new Map();
    const shadowCastingTypes = new Set(['leafyBush', 'dryScrub', 'yellowGrass', 'darkGrass', 'reeds']);
    for (const placement of groundCoverPlacements) {
      const soilTolerant = placement.type === 'dryScrub' || placement.type === 'yellowGrass';
      if (placement.tile.bareSoil > .7 || (placement.tile.bareSoil > .42 && !soilTolerant)) continue;
      if (!placementsByType.has(placement.type)) placementsByType.set(placement.type, []);
      placementsByType.get(placement.type).push(placement);
      const radius = placement.type === 'leafyBush' ? .28 : placement.type === 'dryScrub' ? .24 : .18;
      contactBedPlacements.push({
        tile: placement.tile,
        x: placement.tile.x + placement.offsetX,
        z: placement.tile.z + placement.offsetZ,
        radius: radius * Math.max(placement.scaleX, placement.scaleZ),
        pieces: placement.type === 'leafyBush' ? 4 : 3,
      });
    }
    const transform = new THREE.Object3D();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const [type, placements] of placementsByType) {
      const design = groundCoverDesign(type);
      design.forEach((part, partIndex) => {
        const mesh = new THREE.InstancedMesh(geometry, materials[part.material], placements.length);
        mesh.name = `ground-cover-${type}-${partIndex}`;
        mesh.castShadow = shadowCastingTypes.has(type);
        mesh.receiveShadow = false;
        placements.forEach((placement, index) => {
          const cos = Math.cos(placement.yaw);
          const sin = Math.sin(placement.yaw);
          const localX = part.x * placement.scaleX * placement.mirrorX;
          const localZ = part.z * placement.scaleZ;
          transform.position.set(
            placement.tile.x + placement.offsetX + localX * cos + localZ * sin,
            placement.tile.topY + part.y * placement.scaleY,
            placement.tile.z + placement.offsetZ - localX * sin + localZ * cos,
          );
          transform.rotation.set(
            part.rx || 0,
            placement.yaw + (part.ry || 0) * placement.mirrorX,
            (part.rz || 0) * placement.mirrorX,
          );
          transform.scale.set(part.w * placement.scaleX, part.h * placement.scaleY, part.d * placement.scaleZ);
          transform.updateMatrix();
          mesh.setMatrixAt(index, transform.matrix);
          placement.tile.groundCover.push({ mesh, index, hidden });
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        tallGrass.add(mesh);
      });
    }
  };

  const buildContactBeds = () => {
    const pieceCount = contactBedPlacements.reduce((sum, placement) => sum + placement.pieces, 0);
    if (!pieceCount) return;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const mesh = new THREE.InstancedMesh(geometry, material, pieceCount);
    const transform = new THREE.Object3D();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    let instance = 0;
    mesh.name = 'ground-contact-beds';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    for (const placement of contactBedPlacements) {
      const baseColor = (placement.tile.normalGrassColor || mats.grass.color).clone()
        .lerp(BARE_SOIL_COLOR, placement.tile.bareSoil * .88);
      for (let piece = 0; piece < placement.pieces; piece++) {
        const angle = contactRandom() * Math.PI * 2;
        const distance = placement.radius * (piece ? .18 + contactRandom() * .62 : contactRandom() * .22);
        transform.position.set(
          placement.x + Math.cos(angle) * distance,
          placement.tile.topY + SURFACE_TOP_LIFT + CONTACT_BED_HEIGHT * .5,
          placement.z + Math.sin(angle) * distance,
        );
        transform.rotation.set(0, Math.round(contactRandom() * 3) * Math.PI * .5, 0);
        transform.scale.set(
          placement.radius * (.7 + contactRandom() * .7),
          CONTACT_BED_HEIGHT,
          placement.radius * (.22 + contactRandom() * .2),
        );
        transform.updateMatrix();
        mesh.setMatrixAt(instance, transform.matrix);
        mesh.setColorAt(instance, baseColor.clone().multiplyScalar(.76 + contactRandom() * .09));
        placement.tile.groundCover.push({ mesh, index: instance, hidden });
        instance++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    tallGrass.add(mesh);
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

  const soilStrata = (x, z, topY, height, width = TILE, depth = TILE) => {
    const bottomY = topY - height;
    const sections = [];
    let sectionTop = topY;
    while (sectionTop > bottomY + .001) {
      const band = Math.floor((sectionTop - .0001) / SOIL_STRATA_HEIGHT);
      const sectionBottom = Math.max(bottomY, band * SOIL_STRATA_HEIGHT);
      const sectionHeight = sectionTop - sectionBottom;
      sections.push({
        x, y: sectionBottom + sectionHeight * .5, z, width, height: sectionHeight, depth, band,
      });
      sectionTop = sectionBottom;
    }
    return sections;
  };

  const soilStrataColor = section => {
    const color = SOIL_STRATA_COLORS[Math.abs(section.band) % SOIL_STRATA_COLORS.length].clone();
    const variation = terrainNoise(section.x * .08 + 41.7, section.z * .08 - 13.2);
    return color.offsetHSL(variation * .006, 0, variation * .012);
  };

  const addLowerLayerInstances = () => {
    const geometry = new THREE.BoxGeometry(TILE, LAYER_DEPTH, TILE);
    const transform = new THREE.Matrix4();
    const lowerBlockKey = (x, y, z) =>
      `${Math.round(x / TILE)},${Math.round(y / LAYER_DEPTH * 2)},${Math.round(z / TILE)}`;
    const occupied = new Set(lowerBlocks.map(block => lowerBlockKey(block.x, block.y, block.z)));
    const shellBlocks = lowerBlocks.filter(block => [
      [TILE, 0, 0], [-TILE, 0, 0], [0, 0, TILE], [0, 0, -TILE],
      [0, -LAYER_DEPTH, 0],
    ].some(([dx, dy, dz]) => !occupied.has(lowerBlockKey(block.x + dx, block.y + dy, block.z + dz))));
    for (const material of [mats.soil, mats.stone, mats.stoneDark]) {
      const blocks = shellBlocks.filter(block => block.material === material);
      if (!blocks.length) continue;
      const renderedBlocks = material === mats.soil
        ? blocks.flatMap(block => soilStrata(
          block.x, block.z, block.y + block.height * .5,
          block.height, block.width, block.depth,
        ))
        : blocks;
      const mesh = new THREE.InstancedMesh(
        geometry,
        material === mats.soil ? soilStrataMaterial : material,
        renderedBlocks.length,
      );
      mesh.name = 'lower-layers';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      renderedBlocks.forEach((block, index) => {
        transform.makeScale(block.width / TILE, block.height / LAYER_DEPTH, block.depth / TILE);
        transform.setPosition(block.x, block.y, block.z);
        mesh.setMatrixAt(index, transform);
        if (material === mats.soil) mesh.setColorAt(index, soilStrataColor(block));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  };

  const grassColorAtCorner = (tile, cornerX, cornerZ) => {
    const color = new THREE.Color(0, 0, 0);
    const xOffsets = cornerX < 0 ? [-1, 0] : [0, 1];
    const zOffsets = cornerZ < 0 ? [-1, 0] : [0, 1];
    let count = 0;
    for (const dx of xOffsets) for (const dz of zOffsets) {
      const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      if (!neighbor || neighbor.water || neighbor.islandId !== tile.islandId || Math.abs(neighbor.topY - tile.topY) > .01) continue;
      color.add(neighbor.normalGrassColor || mats.grass.color);
      count++;
    }
    if (count) color.multiplyScalar(1 / count);
    else color.copy(tile.normalGrassColor || mats.grass.color);
    const x = tile.x + cornerX * TILE * .5;
    const z = tile.z + cornerZ * TILE * .5;
    return color.lerp(BARE_SOIL_COLOR, bareSoilAt(x, z, tile.islandId, tile.topY) * .88);
  };

  const surfaceCellVariationAt = (x, z) => {
    const cellX = Math.floor(x / MODEL_VOXEL);
    const cellZ = Math.floor(z / MODEL_VOXEL);
    let value = (seed ^ Math.imul(cellX, 0x1f123bb5) ^ Math.imul(cellZ, 0x5f356495)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = (value ^ (value >>> 16)) >>> 0;
    return SURFACE_CELL_LEVELS[value & 7] * SURFACE_CELL_VARIATION;
  };

  const plateauLevelFor = tile => Math.round((tile.topY - tile.baseY) / PLATEAU_BLOCK_HEIGHT);
  const isSnowTile = tile => tile?.islandId === NORTH_ISLAND_ID && plateauLevelFor(tile) >= 2;
  const isHighestNorthTerrace = tile => tile?.islandId === NORTH_ISLAND_ID && plateauLevelFor(tile) >= 3;

  const surfaceCellColor = (tile, corners, column, row) => {
    const u = (column + .5) / SURFACE_CELL_COUNT;
    const v = (row + .5) / SURFACE_CELL_COUNT;
    const north = corners[0].clone().lerp(corners[1], u);
    const south = corners[2].clone().lerp(corners[3], u);
    const color = north.lerp(south, v);
    const x = tile.x - TILE * .5 + (column + .5) * MODEL_VOXEL;
    const z = tile.z - TILE * .5 + (row + .5) * MODEL_VOXEL;
    const variation = surfaceCellVariationAt(x, z);
    if (isSnowTile(tile)) {
      return SNOW_COLOR.clone().offsetHSL(variation * .01, 0, variation * .025);
    }
    const bareSoil = bareSoilAt(x, z, tile.islandId, tile.topY);
    const propDirt = propDirtAt(x, z, tile.islandId, tile.topY);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l *= 1 + variation * THREE.MathUtils.clamp(1 - bareSoil - propDirt * 1.5, 0, 1);
    color.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l, 0, 1));
    return color.lerp(PROP_DIRT_COLOR, propDirt);
  };

  const setTileTopColor = (tile, color) => {
    const attribute = tile?.surfaceTopBatch?.geometry.getAttribute('color');
    if (!attribute || tile.surfaceTopColorOffset < 0) return;
    for (let index = 0; index < tile.surfaceTopColorCount; index++) {
      attribute.setXYZ(tile.surfaceTopColorOffset + index, color.r, color.g, color.b);
    }
    attribute.needsUpdate = true;
  };

  const addTerrainInstances = () => {
    const surfaceGeometry = new THREE.BoxGeometry(TILE, GRASS_TOP, TILE);
    const soilGeometry = new THREE.BoxGeometry(TILE, 1, TILE);
    const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const surfaceTopMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true });
    const edgeCapGeometry = new THREE.BoxGeometry(1, GRASS_EDGE_CAP_HEIGHT, 1);
    const edgeCapMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const tilesByIsland = new Map();
    const exposedEdges = [];
    for (const tile of terrain.values()) {
      if (tile.water) continue;
      if (!tilesByIsland.has(tile.islandId)) tilesByIsland.set(tile.islandId, []);
      tilesByIsland.get(tile.islandId).push(tile);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
        if (!neighbor || neighbor.topY < tile.topY - .01) exposedEdges.push({ tile, dx, dz });
      }
    }
    const exposedSoilTiles = new Set(exposedEdges.map(edge => edge.tile));

    for (const [islandId, tiles] of tilesByIsland) {
      const surface = new THREE.InstancedMesh(surfaceGeometry, surfaceMaterial, tiles.length);
      const soilSections = tiles.filter(tile => exposedSoilTiles.has(tile)).flatMap(tile => soilStrata(
        tile.x, tile.z, tile.topY - GRASS_TOP, tile.dirtDepth,
      ));
      const soil = new THREE.InstancedMesh(soilGeometry, soilStrataMaterial, soilSections.length);
      // Five-by-five top cells preserve the model-voxel scale while the
      // instanced terrain boxes continue to provide grass side walls.
      const cellsPerTile = SURFACE_CELL_COUNT * SURFACE_CELL_COUNT;
      const verticesPerTile = cellsPerTile * 4;
      const indicesPerTile = cellsPerTile * 6;
      const topGeometry = new THREE.BufferGeometry();
      const topPositions = new Float32Array(tiles.length * verticesPerTile * 3);
      const topColors = new Float32Array(tiles.length * verticesPerTile * 3);
      const topIndices = new Uint32Array(tiles.length * indicesPerTile);
      const topColorAttribute = new THREE.BufferAttribute(topColors, 3).setUsage(THREE.DynamicDrawUsage);
      topGeometry.setAttribute('position', new THREE.BufferAttribute(topPositions, 3));
      topGeometry.setAttribute('color', topColorAttribute);
      topGeometry.setIndex(new THREE.BufferAttribute(topIndices, 1));
      const top = new THREE.Mesh(topGeometry, surfaceTopMaterial);
      const matrix = new THREE.Matrix4();
      surface.name = `terrain-surface-${islandId}`;
      soil.name = `terrain-soil-${islandId}`;
      top.name = `terrain-surface-top-${islandId}`;
      surface.castShadow = surface.receiveShadow = true;
      soil.castShadow = soil.receiveShadow = true;
      top.castShadow = false;
      top.receiveShadow = true;

      tiles.forEach((tile, index) => {
        matrix.makeTranslation(tile.x, tile.topY - GRASS_TOP * .5, tile.z);
        surface.setMatrixAt(index, matrix);
        surface.setColorAt(index, isSnowTile(tile) ? SNOW_COLOR : tile.normalGrassColor || mats.grass.color);
        tile.surfaceBatch = surface;
        tile.surfaceInstance = index;

        const tileVertexOffset = index * verticesPerTile;
        const grassCorners = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
          .map(([cornerX, cornerZ]) => grassColorAtCorner(tile, cornerX, cornerZ));
        for (let row = 0; row < SURFACE_CELL_COUNT; row++) {
          for (let column = 0; column < SURFACE_CELL_COUNT; column++) {
            const cell = row * SURFACE_CELL_COUNT + column;
            const vertexOffset = tileVertexOffset + cell * 4;
            const positionOffset = vertexOffset * 3;
            const left = tile.x - TILE * .5 + column * MODEL_VOXEL;
            const right = left + MODEL_VOXEL;
            const near = tile.z - TILE * .5 + row * MODEL_VOXEL;
            const far = near + MODEL_VOXEL;
            const positions = [[left, near], [right, near], [left, far], [right, far]];
            const color = surfaceCellColor(tile, grassCorners, column, row);
            positions.forEach(([x, z], cornerIndex) => {
              const offset = positionOffset + cornerIndex * 3;
              topPositions[offset] = x;
              topPositions[offset + 1] = tile.topY + SURFACE_TOP_LIFT;
              topPositions[offset + 2] = z;
              topColors[offset] = color.r;
              topColors[offset + 1] = color.g;
              topColors[offset + 2] = color.b;
            });
            const indexOffset = index * indicesPerTile + cell * 6;
            topIndices.set([
              vertexOffset, vertexOffset + 2, vertexOffset + 1,
              vertexOffset + 1, vertexOffset + 2, vertexOffset + 3,
            ], indexOffset);
          }
        }
        tile.surfaceTopBatch = top;
        tile.surfaceTopColorOffset = tileVertexOffset;
        tile.surfaceTopColorCount = verticesPerTile;

      });

      soilSections.forEach((section, index) => {
        matrix.makeScale(section.width / TILE, section.height, section.depth / TILE);
        matrix.setPosition(section.x, section.y, section.z);
        soil.setMatrixAt(index, matrix);
        soil.setColorAt(index, soilStrataColor(section));
      });

      surface.instanceMatrix.needsUpdate = true;
      surface.instanceColor.needsUpdate = true;
      soil.instanceMatrix.needsUpdate = true;
      soil.instanceColor.needsUpdate = true;
      topColorAttribute.needsUpdate = true;
      topGeometry.computeVertexNormals();
      surface.computeBoundingBox();
      surface.computeBoundingSphere();
      soil.computeBoundingBox();
      soil.computeBoundingSphere();
      topGeometry.computeBoundingBox();
      topGeometry.computeBoundingSphere();
      group.add(surface, soil, top);
    }

    const edgeCaps = new THREE.InstancedMesh(edgeCapGeometry, edgeCapMaterial, exposedEdges.length);
    const edgeCapTransform = new THREE.Matrix4();
    edgeCaps.name = 'terrain-grass-edge-caps';
    edgeCaps.castShadow = false;
    edgeCaps.receiveShadow = true;
    exposedEdges.forEach(({ tile, dx, dz }, index) => {
      edgeCapTransform.makeScale(
        dx ? GRASS_EDGE_CAP_DEPTH : TILE,
        1,
        dz ? GRASS_EDGE_CAP_DEPTH : TILE,
      );
      edgeCapTransform.setPosition(
        tile.x + dx * (TILE * .5 - GRASS_EDGE_CAP_DEPTH * .5),
        tile.topY - GRASS_EDGE_CAP_RECESS - GRASS_EDGE_CAP_HEIGHT * .5,
        tile.z + dz * (TILE * .5 - GRASS_EDGE_CAP_DEPTH * .5),
      );
      edgeCaps.setMatrixAt(index, edgeCapTransform);
      const edgeColor = isSnowTile(tile) ? SNOW_COLOR : tile.normalGrassColor || mats.grass.color;
      edgeCaps.setColorAt(index, edgeColor.clone().multiplyScalar(isSnowTile(tile) ? .92 : .84));
    });
    edgeCaps.instanceMatrix.needsUpdate = true;
    edgeCaps.instanceColor.needsUpdate = true;
    edgeCaps.computeBoundingBox();
    edgeCaps.computeBoundingSphere();
    group.add(edgeCaps);
  };

  const addTree = (x, y, z, silhouette, large, profile) => {
    const tree = new THREE.Group();
    const sway = new THREE.Group();
    tree.add(sway);
    const scale = (large ? 1.5 : 1.14) * (.9 + random() * .2);
    const design = treeDesign(silhouette);
    const palette = treeFoliagePalette(profile);
    if (!foliageMaterials.has(palette.key)) {
      foliageMaterials.set(palette.key, {
        dark: new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 1 }),
        light: new THREE.MeshStandardMaterial({ color: palette.light, roughness: 1 }),
      });
    }
    const foliage = foliageMaterials.get(palette.key);
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
      const leaf = box(voxel, voxel, voxel, index % 3 === 0 ? foliage.light : foliage.dark);
      leaf.position.set(lx * voxel, design.leafBaseY * scale + ly * voxel, lz * voxel);
      sway.add(leaf);
    });
    tree.position.set(x, y, z);
    tree.rotation.y = random() * Math.PI * 2;
    sway.scale.x = random() < .5 ? -1 : 1;
    group.add(tree);
    const tile = tileAt(x, z, terrain);
    if (tile) {
      tile.hasTree = true;
      contactBedPlacements.push({ tile, x, z, radius: design.radius * scale * .82, pieces: 5 });
    }
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
    stone.rotation.y = random() * Math.PI * 2;
    stone.scale.x = random() < .5 ? -1 : 1;
    stone.scale.z = .88 + random() * .24;
    group.add(stone);
    const tile = tileAt(x, z, terrain);
    if (tile) {
      tile.stones.push(stone);
      contactBedPlacements.push({ tile, x, z, radius: .22 * scale, pieces: 3 });
      addPropDirt(tile, x, z, scale);
    }
  };

  const addWorkshop = (x, y, z) => {
    const workshop = new THREE.Group();
    const width = TILE * 3;
    const depth = TILE * 3;
    const wallHeight = 2.25;
    const wallThickness = .16;
    const doorwayWidth = TILE * 1.08;
    const frontWallWidth = (width - doorwayWidth) * .5;
    const yaw = WORKSHOP_YAW;
    workshop.name = 'starter-workshop';
    workshop.position.set(x, y, z);
    workshop.rotation.y = yaw;
    group.add(workshop);
    workshopArea = { x, z, width, depth, yaw, spawnClearanceWidth: width + 1.6, spawnClearanceDepth: depth + 1.7 };

    const localToWorld = (localX, localZ) => ({
      x: x + localX * Math.cos(yaw) + localZ * Math.sin(yaw),
      z: z - localX * Math.sin(yaw) + localZ * Math.cos(yaw),
    });
    const addStaticBox = (boxWidth, boxHeight, boxDepth, localX, localZ, baseY = 0) => {
      const position = localToWorld(localX, localZ);
      obstacles.push({
        shape: 'box', x: position.x, y: y + baseY, z: position.z,
        width: boxWidth, height: boxHeight, depth: boxDepth, yaw,
      });
    };
    const wallEdgeX = width * .5 - wallThickness * .5;
    const wallEdgeZ = depth * .5 - wallThickness * .5;
    const windowBase = .86;
    const windowHeight = .72;
    const windowTop = windowBase + windowHeight;
    const windowWallSegments = [
      { depth: .42, z: -1.29 }, { depth: .72, z: 0 }, { depth: .42, z: 1.29 },
    ];

    const voxelParts = [];
    const addVoxels = (material, at, size) => voxelParts.push({ material, at, size });

    // The workshop occupies a 15 x 15 model-voxel footprint. Its stone base,
    // walls, openings, trim, roof and contents all share that same grid.
    addVoxels(mats.stoneDark, [-1, 0, -1], [17, 1, 17]);
    for (let drivewayZ = -6; drivewayZ < -1; drivewayZ++) {
      addVoxels(drivewayZ % 2 ? mats.stone : mats.stoneDark, [4, 0, drivewayZ], [7, 1, 1]);
    }
    for (const [chockX, material] of [[4, mats.bridgeDark], [10, mats.bridge]]) {
      addVoxels(material, [chockX, 1, -7], [1, 1, 2]);
    }

    // Four true one-voxel corner posts frame wall runs built around openings.
    for (const cornerX of [0, 14]) for (const cornerZ of [0, 14]) {
      addVoxels(mats.bridgeDark, [cornerX, 1, cornerZ], [1, 11, 1]);
    }
    addVoxels(mats.red, [1, 1, 0], [4, 10, 1]);
    addVoxels(mats.red, [10, 1, 0], [4, 10, 1]);
    addVoxels(mats.red, [5, 9, 0], [5, 2, 1]);
    addVoxels(mats.bridgeDark, [1, 11, 0], [13, 1, 1]);

    addVoxels(mats.red, [1, 1, 14], [13, 5, 1]);
    addVoxels(mats.red, [1, 9, 14], [13, 2, 1]);
    addVoxels(mats.red, [1, 6, 14], [4, 3, 1]);
    addVoxels(mats.red, [10, 6, 14], [4, 3, 1]);
    addVoxels(mats.bridgeDark, [1, 11, 14], [13, 1, 1]);

    for (const sideX of [0, 14]) {
      addVoxels(mats.red, [sideX, 1, 1], [1, 4, 13]);
      addVoxels(mats.red, [sideX, 9, 1], [1, 2, 13]);
      for (const [segmentZ, segmentDepth] of [[1, 2], [6, 3], [12, 2]]) {
        addVoxels(mats.red, [sideX, 5, segmentZ], [1, 4, segmentDepth]);
      }
      addVoxels(mats.bridgeDark, [sideX, 11, 1], [1, 1, 13]);
    }

    // Recessed glazing is surrounded by full-voxel sills, lintels and jambs.
    for (const sideX of [-1, 15]) for (const windowZ of [3, 9]) {
      addVoxels(mats.cab, [sideX, 5, windowZ], [1, 4, 3]);
      addVoxels(mats.bridgeDark, [sideX, 4, windowZ - 1], [1, 1, 5]);
      addVoxels(mats.bridgeDark, [sideX, 9, windowZ - 1], [1, 1, 5]);
      addVoxels(mats.bridgeDark, [sideX, 5, windowZ - 1], [1, 4, 1]);
      addVoxels(mats.bridgeDark, [sideX, 5, windowZ + 3], [1, 4, 1]);
    }
    addVoxels(mats.cab, [5, 6, 14], [5, 3, 1]);
    addVoxels(mats.bridgeDark, [4, 5, 15], [7, 1, 1]);
    addVoxels(mats.bridgeDark, [4, 9, 15], [7, 1, 1]);
    addVoxels(mats.bridgeDark, [4, 6, 15], [1, 3, 1]);
    addVoxels(mats.bridgeDark, [10, 6, 15], [1, 3, 1]);

    // The front bay uses a deep voxel frame and a recessed loft panel.
    addVoxels(mats.bridgeDark, [4, 1, -1], [1, 8, 1]);
    addVoxels(mats.bridgeDark, [10, 1, -1], [1, 8, 1]);
    addVoxels(mats.bridgeDark, [4, 9, -1], [7, 1, 1]);
    addVoxels(mats.bridgeDark, [6, 10, -1], [3, 2, 1]);

    // Stepped gables and roof courses replace the former rotated roof slabs.
    for (const [gableY, gableX, gableWidth] of [[12, 1, 14], [13, 3, 10], [14, 5, 6], [15, 7, 2]]) {
      addVoxels(mats.red, [gableX, gableY, 0], [gableWidth, 1, 1]);
      addVoxels(mats.red, [gableX, gableY, 14], [gableWidth, 1, 1]);
    }
    const roofCourses = [
      { y: 12, left: -1, right: 15 },
      { y: 13, left: 1, right: 13 },
      { y: 14, left: 3, right: 11 },
      { y: 15, left: 5, right: 9 },
    ];
    for (const course of roofCourses) {
      for (const courseX of [course.left, course.right]) {
        addVoxels(mats.bridgeDark, [courseX, course.y, 0], [2, 1, 15]);
        addVoxels(mats.tractorCream, [courseX, course.y, -1], [2, 1, 1]);
        addVoxels(mats.tractorCream, [courseX, course.y, 15], [2, 1, 1]);
      }
    }
    addVoxels(mats.bridgeDark, [7, 16, 0], [2, 1, 15]);
    addVoxels(mats.tractorCream, [7, 16, -1], [2, 1, 1]);
    addVoxels(mats.tractorCream, [7, 16, 15], [2, 1, 1]);
    addVoxels(mats.metal, [11, 15, 11], [2, 2, 2]);
    addVoxels(mats.bridgeDark, [10, 17, 10], [4, 1, 4]);

    // Workshop furniture is constructed from the same cells rather than from
    // isolated furniture-sized boxes.
    addVoxels(mats.bridge, [1, 4, 10], [6, 1, 2]);
    addVoxels(mats.bridgeDark, [1, 1, 10], [1, 3, 2]);
    addVoxels(mats.bridgeDark, [6, 1, 10], [1, 3, 2]);
    addVoxels(mats.metal, [1, 5, 13], [4, 4, 1]);
    for (const [toolX, material] of [[1, mats.tire], [3, mats.tractorAccent], [5, mats.tire]]) {
      addVoxels(material, [toolX, 6, 12], [1, 2, 1]);
      addVoxels(mats.metal, [toolX, 8, 12], [2, 1, 1]);
    }
    addVoxels(mats.tractorDark, [11, 1, 10], [3, 6, 3]);
    addVoxels(mats.metal, [11, 7, 10], [3, 1, 3]);
    addVoxels(mats.tractor, [9, 1, 4], [3, 3, 2]);
    addVoxels(mats.metal, [8, 4, 4], [4, 1, 2]);

    // Exterior service props: fuel pump, voxel-ring tyres, and stepped crates.
    addVoxels(mats.stone, [-5, 0, 8], [4, 1, 5]);
    addVoxels(mats.tractor, [-3, 1, 9], [2, 4, 2]);
    addVoxels(mats.metal, [-4, 5, 8], [4, 1, 4]);
    addVoxels(mats.headlamp, [-3, 3, 7], [2, 2, 1]);
    addVoxels(mats.bridgeDark, [16, 0, 8], [5, 1, 5]);
    for (const tyreY of [1, 2, 3]) {
      addVoxels(mats.tire, [16, tyreY, 8], [3, 1, 1]);
      addVoxels(mats.tire, [16, tyreY, 10], [3, 1, 1]);
      addVoxels(mats.tire, [16, tyreY, 9], [1, 1, 1]);
      addVoxels(mats.tire, [18, tyreY, 9], [1, 1, 1]);
    }
    addVoxels(mats.bridge, [16, 0, -1], [5, 1, 4]);
    addVoxels(mats.red, [15, 1, 0], [3, 1, 3]);
    addVoxels(mats.red, [15, 2, 1], [3, 1, 2]);
    addVoxels(mats.bridgeDark, [15, 2, 0], [3, 1, 1]);
    addVoxels(mats.tractorAccent, [18, 1, 0], [2, 3, 2]);
    addVoxels(mats.metal, [18, 2, -1], [2, 1, 1]);

    const workshopModel = createVoxelModel(voxelParts, {
      name: 'starter-workshop-model',
      origin: [-7.5, 0, -7.5],
    });
    workshop.add(workshopModel);

    const lanternGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdfa0,
      emissive: 0xffa62e,
      emissiveIntensity: .25,
      roughness: .38,
    });
    const { group: lantern, glowMesh: lanternGlowMesh } = createVoxelLantern({
      glowMaterial: lanternGlowMaterial,
      hanging: true,
      name: 'starter-workshop-lantern',
    });
    lantern.position.set(0, 1.85, -1.7);
    const lanternLight = new THREE.PointLight(0xffb653, 0, 5, 2);
    lanternLight.position.set(0, .1, 0);
    lanternLight.castShadow = false;
    lantern.add(lanternLight);
    workshop.add(lantern);
    setWorkshopNightAmount = amount => {
      const nightAmount = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
      lanternGlowMesh.material.emissiveIntensity = .25 + nightAmount * 2.75;
      lanternLight.intensity = nightAmount * 6;
    };

    for (const side of [-1, 1]) {
      const doorParts = [
        { material: mats.bridgeDark, at: [0, 0, 0], size: [2, 1, 1] },
        { material: mats.bridgeDark, at: [0, 6, 0], size: [2, 1, 1] },
        { material: mats.bridgeDark, at: [0, 1, 0], size: [1, 5, 1] },
        { material: mats.red, at: [1, 1, 0], size: [1, 5, 1] },
      ];
      const openDoor = createVoxelModel(doorParts, {
        name: 'starter-workshop-door',
        origin: [-1, 0, -.5],
      });
      openDoor.position.set(side * .72, MODEL_VOXEL, -depth * .5 - MODEL_VOXEL);
      openDoor.rotation.y = side * .8;
      workshop.add(openDoor);
    }

    // Keep the established gameplay obstacles independent from the richer visuals.
    addStaticBox(.54, .52, .42, .7, -.48, 0);
    addStaticBox(.34, .92, .34, -2.0, .58, .07);
    for (let index = 0; index < 3; index++) addStaticBox(.48, .18, .48, 1.98, .62, .06 + index * .17);
    addStaticBox(.58, .42, .52, 1.8, -1.25, .09);
    addStaticBox(.38, .56, .42, 2.17, -1.18, .09);

    addStaticBox(width, wallHeight, wallThickness, 0, wallEdgeZ);
    for (const side of [-1, 1]) {
      const localX = side * wallEdgeX;
      addStaticBox(wallThickness, windowBase, depth, localX, 0);
      addStaticBox(wallThickness, wallHeight - windowTop, depth, localX, 0, windowTop);
      windowWallSegments.forEach(segment =>
        addStaticBox(wallThickness, windowHeight, segment.depth, localX, segment.z, windowBase));
    }
    for (const side of [-1, 1]) {
      const localX = side * (doorwayWidth + frontWallWidth) * .5;
      addStaticBox(frontWallWidth, wallHeight, wallThickness, localX, -wallEdgeZ);
    }
  };

  const islandLayout = [
    // Central hub: workshop, vehicles, starter field, cargo pad.
    { cx: 0, cz: 0, h: 0, r: STARTER_HUB_RADIUS },

    // Large northern farming island, with three terraces climbing northward.
    { cx: 1, cz: -16, h: 1, r: SECOND_STARTER_RADIUS },

    // Surrounding islands: deliberately mixed sizes.
    { cx: 15, cz: -6, h: 2, r: 4.8 },
    { cx: 14, cz: 10, h: 1, r: 3.5 },
    { cx: 0, cz: 16, h: 2, r: 5.6 },
    { cx: -14, cz: 10, h: 3, r: 3.8 },
    { cx: -15, cz: -8, h: 1, r: 4.6 },
  ].map(scaleIslandLayout);
  const islands = islandLayout.map((island, id) => ({ ...island, id }));
  const islandConnections = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [4, 5],
    [1, 6],
  ];
  let workshopSite;
  let cargoSite;
  let watercourseCount = 0;
  const islandGeneration = [];

  islands.forEach((island, id) => {
    island.r += (random() - .5) * 0.22;
    const cells = createOrganicCells(island.cx, island.cz, island.r, seed + id * 911);
    const angle = random() * Math.PI * 2;
    const tileHeight = cell => id === STARTER_ISLAND_ID
      ? 0
      : plateauHeight(cell, island, angle);
    cells.forEach(cell => addTile(cell.gx, cell.gz, island.h + tileHeight(cell), id, cell.dist / island.r, island.h));
    addLowerLayers(cells, island.h, island.r);
    const waterTiles = id === STARTER_ISLAND_ID
      ? addStarterCoastLake(
        cells, island, terrain, water, waterMotion, waterfalls, seededRandom(seed ^ 0x6a09e667)
      )
      : id > 1 && (id === 2 || id === 4 || random() < .25)
        ? addWatercourse(cells, island, terrain, water, waterMotion, waterfalls, random, true)
        : new Set();
    if (id !== STARTER_ISLAND_ID && waterTiles.size) watercourseCount++;
    finalizeEnvironment(cells, waterTiles);
    islandGeneration.push({ island, id, cells, waterTiles });
  });

  const hubIsland = islands[STARTER_ISLAND_ID];
  workshopSite = findWorkshopSite(terrain, hubIsland);
  cargoSite = findCargoSite(terrain, hubIsland, workshopSite);
  if (workshopSite) reserveWorkshopGround(terrain, workshopSite);
  reserveCargoApproach(terrain, cargoSite, hubIsland.id);

  const bridgeGaps = islandConnections
    .map(([fromId, toId]) => closestIslandGap(terrain, fromId, toId))
    .filter(Boolean);
  bridgeGaps.forEach(gap => reserveBridgeLandings(terrain, gap));
  const cargoGroundTile = cargoSite
    ? terrain.get(gridKey(Math.round(cargoSite.x / TILE), Math.round(cargoSite.z / TILE)))
    : null;
  buildBareSoilWear(workshopSite, cargoGroundTile, bridgeGaps, islands);

  islandGeneration.forEach(({ island, id, cells, waterTiles }) => {
    const decorationCells = cells.filter(candidate => {
      const starterField = id === STARTER_ISLAND_ID && Math.abs(candidate.dx) <= 3 && Math.abs(candidate.dz) <= 3;
      const tile = terrain.get(gridKey(candidate.gx, candidate.gz));
      return candidate.dist > 1.1 && candidate.dist < island.r - .15 && !starterField &&
        !waterTiles.has(gridKey(candidate.gx, candidate.gz)) &&
        !tile?.reserved && !tile?.noDecoration && !isHighestNorthTerrace(tile);
    });
    const grassPatches = chooseGrassPatches(decorationCells, random, id === STARTER_ISLAND_ID ? 1 : 2);
    for (const cell of decorationCells) {
      const tile = terrain.get(gridKey(cell.gx, cell.gz));
      const profile = environmentProfile(tile.environment);
      const rainforest = profile.veryWet * profile.veryShady;
      const forest = profile.shady * (.35 + profile.moisture * .65) * (1 - profile.veryDry);
      const dryWoodland = profile.shady * profile.dry;
      const treeChance = THREE.MathUtils.clamp(
        .015 + forest * .28 + rainforest * .35 + dryWoodland * .06 + profile.wet * .06 - profile.sunny * .04 - profile.veryDry * .08,
        0,
        .60,
      );
      const rockChance = THREE.MathUtils.clamp(
        .025 + profile.dry * .10 + profile.veryDry * .09 + profile.dry * profile.sunny * .05 - profile.wet * .035 - profile.veryWet * .04,
        .001,
        .25,
      );
      const starterDensityScale = id === STARTER_ISLAND_ID ? .16 : id === 1 ? .45 : 1;
      const effectiveTreeChance = Math.min(
        treeChance * starterDensityScale + (id === STARTER_ISLAND_ID ? .006 : 0),
        TREE_CHANCE_CAP,
      );
      const effectiveRockChance = Math.min(rockChance, ROCK_CHANCE_CAP);
      const groundChance = THREE.MathUtils.clamp(
        .12 + profile.wet * .20 + rainforest * .34 + profile.wet * profile.sunny * .22 + profile.dry * profile.sunny * .2 + profile.shady * .12,
        .12,
        .78,
      );
      const effectiveGroundChance = Math.min(
        groundChance * (id === STARTER_ISLAND_ID ? .70 : 1),
        GROUND_COVER_CHANCE_CAP,
      );
      const clusterChance = THREE.MathUtils.clamp(
        (effectiveTreeChance + effectiveRockChance + effectiveGroundChance) * .35,
        .08,
        .45,
      );
      const propAttempts = 1 + (random() < clusterChance ? 1 : 0) + (random() < clusterChance * .25 ? 1 : 0);
      for (let propIndex = 0; propIndex < propAttempts; propIndex++) {
        const x = cell.gx * TILE + (random() - .5) * PROP_SPREAD;
        const z = cell.gz * TILE + (random() - .5) * PROP_SPREAD;
        const y = tile?.topY ?? island.h;
        const nearWorkshop = workshopSite && id === STARTER_ISLAND_ID &&
          Math.hypot(x - workshopSite.x, z - workshopSite.z) < WORKSHOP_TREE_CLEARANCE;
        let blockingDecoration = false;
        if (!nearWorkshop && random() < effectiveTreeChance) {
          addTree(x, y, z, chooseTreeSilhouette(profile, random), random() < .25 + rainforest * .5, profile);
          blockingDecoration = true;
        }
        else if (random() < effectiveRockChance) {
          addStone(x, y, z, .8 + random() * .5);
          blockingDecoration = true;
        }

        if (random() < effectiveGroundChance) {
          addGroundCover(tile, chooseGroundCover(profile, tile.nearWater, random));
        }
        else if (!blockingDecoration &&
          grassPatches.some(patch => Math.hypot(cell.dx - patch.dx, cell.dz - patch.dz) < patch.radius)) {
          addTallGrass(tile);
        }
      }
    }
  });

  if (!cargoSite) {
    scene.remove(group);
    disposeObjectResources(group);
    if (attempt >= 20) throw new Error('Unable to generate a clear west-side cargo deck site on the starter hub');
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1, onChange);
  }
  const cargoAnchor = terrain.get(gridKey(Math.round(cargoSite.x / TILE), Math.round(cargoSite.z / TILE)));
  if (!cargoAnchor || Math.abs(cargoAnchor.topY - cargoAnchor.baseY) > .01) {
    throw new Error('Cargo deck must be anchored on the first floor');
  }
  if (cargoAnchor.gx >= hubIsland.cx || cargoSite.outward.x !== -1 || cargoSite.outward.z !== 0) {
    throw new Error('Cargo deck must stay on the west side of the starter hub island');
  }
  const terrainOverlap = [...terrain.values()].find(tile =>
    cargoDeckContains(cargoSite, tile.x, tile.z, TILE * .72) && tile.topY > cargoSite.y + .01
  );
  if (terrainOverlap) throw new Error(`Cargo deck clearance failed at ${gridKey(terrainOverlap.gx, terrainOverlap.gz)}`);

  addLowerLayerInstances();

  if (workshopSite) addWorkshop(workshopSite.x, workshopSite.topY, workshopSite.z);
  const cargoPort = createCargoPort(cargoSite, seed);
  group.add(cargoPort.group);
  obstacles.push(...cargoPort.colliders);

  for (const [fromId, toId] of islandConnections) {
    addBridgeBetween(
      islands[fromId],
      islands[toId],
      terrain,
      group,
      bridgeBlocks,
      bridgeLanternGlowMaterial,
      bridgeLanternGlowMeshes,
      bridgeLanternLights,
    );
  }

  if (!watercourseCount && attempt < 7) {
    scene.remove(group);
    disposeObjectResources(group);
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1, onChange);
  }

  addTerrainInstances();
  buildGroundCover();
  buildContactBeds();
  const cropInstances = createCropInstances(terrain.size, group);
  const fieldEffects = createFieldEffects(group);
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
    setTileTopColor(tile, mats.ploughed.color);
    if (tile.tallGrass) tile.tallGrass.visible = false;
    for (const decoration of tile.groundCover) {
      decoration.mesh.setMatrixAt(decoration.index, decoration.hidden);
      decoration.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const stone of tile.stones) group.remove(stone);
    tile.stones.length = 0;
    ploughedTiles.push(tile);
    furrowInstancesDirty = true;
    if (showEffect && !reducedMotion) fieldEffects.plough(tile, heading, effectElapsed);
    return true;
  };

  const forage = createForageSystem(terrain, group, onChange);
  const wildlife = createWildlifeSystem(terrain, group, seed);
  const occlusion = createOcclusionSystem(group, cargoPort.occluders);
  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const starterIsland = islands[STARTER_ISLAND_ID];
  const start = terrain.get(gridKey(starterIsland.cx, starterIsland.cz)) || terrain.values().next().value;
  const vehicleSpawns = findVehicleSpawns(terrain, start, workshopArea);
  return {
    group,
    terrain,
    cargoPort,
    seed,
    spawn: vehicleSpawns[0],
    vehicleSpawns,
    setNightAmount(amount, lanternAmount = amount) {
      setWorkshopNightAmount(lanternAmount);
      cargoPort.setNightAmount(amount, lanternAmount);
      const bridgeLanternAmount = THREE.MathUtils.clamp(Number(lanternAmount) || 0, 0, 1);
      const glowMaterials = new Set(bridgeLanternGlowMeshes.map(mesh => mesh.material));
      glowMaterials.forEach(material => { material.emissiveIntensity = .25 + bridgeLanternAmount * 2.75; });
      bridgeLanternLights.forEach(light => { light.intensity = bridgeLanternAmount * 6; });
    },
    dispose() {
      forage.dispose();
      bridgeLanternGlowMaterial.dispose();
      Object.values(grainSplashMaterials).forEach(material => material.dispose());
      disposeObjectResources(group);
    },
    animate(elapsed, delta = 0, isWildlifeBlockedAt = () => false) {
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
        const stageSeconds = tile.crop.cropId === 'grass' ? GRASS_STAGE_SECONDS : CROP_STAGE_SECONDS;
        if (elapsed - tile.crop.stageStarted < stageSeconds) continue;
        tile.crop.stageStarted += stageSeconds;
        tile.crop.stage++;
        tile.crop.animationStarted = elapsed;
        if (tile.crop.cropId !== 'grass' && tile.crop.stage === 2 && random() < WEED_CHANCE) {
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
      wildlife.animate(elapsed, delta, isWildlifeBlockedAt);
      if (persistentChange) onChange();
    },
    updateOcclusion(cameraPosition, vehicleState, delta) {
      occlusion.update(cameraPosition, vehicleState, delta);
    },
    registerOccluder(object) {
      return occlusion.register(object);
    },
    unregisterOccluder(object) {
      return occlusion.unregister(object);
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
      if (workshopArea) {
        const dx = center.x - workshopArea.x;
        const dz = center.z - workshopArea.z;
        const localX = dx * Math.cos(workshopArea.yaw) - dz * Math.sin(workshopArea.yaw);
        const localZ = dx * Math.sin(workshopArea.yaw) + dz * Math.cos(workshopArea.yaw);
        if (Math.abs(localX) < workshopArea.width * .5 + radius && Math.abs(localZ) < workshopArea.depth * .5 + radius) return null;
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
    mowAt(x, z, levelY, elapsed) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (tile?.crop?.cropId !== 'grass' || tile.crop.stage !== 4 || forage.hasForage(tile)) return 0;
      tile.crop.stage = 1;
      tile.crop.stageStarted = elapsed;
      tile.crop.animationStarted = elapsed;
      tile.crop.weeds = false;
      readyCount = Math.max(0, readyCount - 1);
      growingCrops.add(tile);
      cropInstancesDirty = true;
      forage.addLoose(tile, TILE_YIELD_LITRES);
      onChange();
      return TILE_YIELD_LITRES;
    },
    takeLooseGrassAt(x, z, levelY) {
      return forage.takeLooseAt(x, z, levelY);
    },
    spawnBale(x, y, z, heading) {
      return forage.spawnBale(x, y, z, heading);
    },
    hasBale(id) {
      return forage.hasBale(id);
    },
    baleNear(x, z, levelY, radius) {
      return forage.baleNear(x, z, levelY, radius);
    },
    moveBale(id, x, y, z, heading, notify = false) {
      return forage.moveBale(id, x, y, z, heading, notify);
    },
    removeBale(id) {
      return forage.removeBale(id);
    },
    harvestAt(x, z, levelY, acceptedCropId = null) {
      const tile = tileAtLevel(x, z, levelY, terrain);
      if (tile?.crop?.stage !== 4 || tile.crop.cropId === 'grass') return false;
      const cropId = tile.crop.cropId;
      if (acceptedCropId && cropId !== acceptedCropId) return false;
      if (tile.crop.weeds) weedCount = Math.max(0, weedCount - 1);
      tile.crop = null;
      plantedCount = Math.max(0, plantedCount - 1);
      readyCount = Math.max(0, readyCount - 1);
      cropInstancesDirty = true;
      onChange();
      return { cropId, yieldAmount: TILE_YIELD_LITRES, x: tile.x, y: tile.topY, z: tile.z };
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
              ? THREE.MathUtils.clamp(elapsed - tile.crop.stageStarted, 0, tile.crop.cropId === 'grass' ? GRASS_STAGE_SECONDS : CROP_STAGE_SECONDS)
              : 0,
            weeds: tile.crop.weeds,
          };
        }
        tiles.push(savedTile);
      }
      return { seed, tiles, forage: forage.persistentState() };
    },
    restorePersistentState(savedState, elapsed, isBlockedAt = () => false) {
      if (!Array.isArray(savedState?.tiles)) return;
      const restoredKeys = new Set();
      for (const savedTile of savedState.tiles) {
        if (typeof savedTile?.key !== 'string' || restoredKeys.has(savedTile.key)) continue;
        const tile = terrain.get(savedTile.key);
        if (!tile || tile.water || tile.hasTree || tile.reserved || isBlockedAt(tile.x, tile.z)) continue;
        restoredKeys.add(savedTile.key);
        if (savedTile.ploughed || savedTile.crop) ploughTile(tile, 0, false);
        const savedCrop = savedTile.crop;
        const stage = Math.floor(Number(savedCrop?.stage));
        if (!tile.ploughed || !crops[savedCrop?.cropId] || stage < 1 || stage > 4) continue;
        const stageSeconds = savedCrop.cropId === 'grass' ? GRASS_STAGE_SECONDS : CROP_STAGE_SECONDS;
        const stageElapsed = THREE.MathUtils.clamp(Number(savedCrop.stageElapsed) || 0, 0, stageSeconds);
        tile.crop = {
          cropId: savedCrop.cropId,
          stage,
          stageStarted: elapsed - stageElapsed,
          weeds: savedCrop.cropId !== 'grass' && Boolean(savedCrop.weeds) && stage >= 2,
        };
        plantedCount++;
        if (tile.crop.weeds) weedCount++;
        if (stage === 4) readyCount++;
        else growingCrops.add(tile);
        cropInstancesDirty = true;
      }
      if (furrowInstancesDirty) refreshFurrowInstances();
      if (cropInstancesDirty) refreshCropInstances();
      forage.restorePersistentState(savedState.forage);
    },
    cropStats() {
      return { planted: plantedCount, ready: readyCount, weeds: weedCount };
    },
    insideWorkshop(x, z) {
      if (!workshopArea) return false;
      const dx = x - workshopArea.x;
      const dz = z - workshopArea.z;
      const localX = dx * Math.cos(workshopArea.yaw) - dz * Math.sin(workshopArea.yaw);
      const localZ = dx * Math.sin(workshopArea.yaw) + dz * Math.cos(workshopArea.yaw);
      return Math.abs(localX) < workshopArea.width * .5 - .2 && Math.abs(localZ) < workshopArea.depth * .5 - .2;
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
  addInstances('grassBlade', .055, .72, .07, mats.grassCrop, tileCapacity * 12);
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

  if (cropId === 'grass') {
    const height = stage === 3 ? .42 : .64;
    const offsets = [
      [-.27, -.22], [0, -.25], [.27, -.2],
      [-.3, .02], [-.08, 0], [.16, .04], [.31, .08],
      [-.24, .25], [.03, .23], [.28, .27],
    ];
    offsets.forEach(([dx, dz], index) => {
      const lean = ((index % 3) - 1) * .055;
      place('grassBlade', dx, height * .5, dz, 0, index * .37, lean, 1, height / .72, 1);
    });
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

function tileAt(x, z, terrain) {
  return terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
}

function tileAtLevel(x, z, levelY, terrain) {
  const tile = tileAt(x, z, terrain);
  if (!tile || (levelY !== null && Math.abs(tile.topY - levelY) > .01)) return null;
  return tile;
}

function createOcclusionSystem(group, additionalObjects = []) {
  const ray = new THREE.Ray();
  const sightline = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  let refreshElapsed = Infinity;
  const entries = [];
  const excludedNames = new Set(['tall-grass', 'water', 'field-effects', 'forage', 'cargo-port', 'forest-wildlife']);
  const register = object => {
    if (!object || entries.some(entry => entry.object === object)) return false;
    entries.push({
      object,
      bounds: new THREE.Box3(),
      materials: cloneFadeMaterials(object),
      ignoreAtVehicle: object.userData.occlusionIgnoreAtVehicle,
      opacity: 1,
      targetOpacity: 1,
    });
    return true;
  };
  const unregister = object => {
    const index = entries.findIndex(entry => entry.object === object);
    if (index === -1) return false;
    entries.splice(index, 1);
    return true;
  };

  group.children
    .filter(child => child.isGroup && !excludedNames.has(child.name))
    .forEach(register);
  additionalObjects.forEach(register);

  return {
    register,
    unregister,
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
            if (!entry.object.visible || entry.ignoreAtVehicle?.(vehicleState)) {
              entry.targetOpacity = 1;
              continue;
            }
            entry.bounds.setFromObject(entry.object);
            const hit = ray.intersectBox(entry.bounds, hitPoint);
            entry.targetOpacity = hit && hit.distanceTo(cameraPosition) < sightlineLength - .2 ? .18 : 1;
          }
        }
      }
      for (const entry of entries) {
        entry.opacity = THREE.MathUtils.lerp(entry.opacity, entry.targetOpacity, fadeAmount);
        const faded = entry.opacity < .995;
        entry.materials.forEach(({ material, opacity, transparent, depthWrite }) => {
          const nextTransparent = transparent || faded;
          if (material.transparent !== nextTransparent) {
            material.transparent = nextTransparent;
            material.needsUpdate = true;
          }
          material.opacity = opacity * entry.opacity;
          material.depthWrite = depthWrite;
        });
      }
    },
  };
}

function cloneFadeMaterials(object) {
  const materialClones = new Map();
  object.traverse(child => {
    if (!child.isMesh) return;
    const cloneMaterial = material => {
      if (!materialClones.has(material)) {
        const clone = material.clone();
        clone.transparent = true;
        materialClones.set(material, {
          material: clone,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      }
      return materialClones.get(material).material;
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

function findWorkshopSite(terrain, island) {
  const candidates = [];
  for (const tile of terrain.values()) {
    if (tile.islandId !== STARTER_ISLAND_ID) continue;
    const hasWorkshopPad = [-1, 0, 1].every(dx => [-1, 0, 1].every(dz => {
      const neighbor = terrain.get(gridKey(tile.gx + dx, tile.gz + dz));
      return neighbor?.islandId === STARTER_ISLAND_ID && Math.abs(neighbor.topY - tile.topY) < .01;
    }));
    if (!hasWorkshopPad) continue;
    // Prefer the westernmost safe 3x3 footprint, then the northernmost site
    // along that edge. The workshop's open bay faces east.
    candidates.push({ ...tile });
  }
  candidates.sort((first, second) => first.gx - second.gx || first.gz - second.gz);
  return candidates[0];
}

function reserveWorkshopGround(terrain, site) {
  const yaw = WORKSHOP_YAW;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (const tile of terrain.values()) {
    if (tile.islandId !== STARTER_ISLAND_ID) continue;
    const dx = tile.x - site.x;
    const dz = tile.z - site.z;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const onWorkshopPad = Math.abs(localX) <= 2.45 && localZ >= -3.15 && localZ <= 2.0;
    if (onWorkshopPad) {
      tile.noDecoration = true;
      tile.reserved = true;
    }
  }
}

function findVehicleSpawns(terrain, start, workshopArea) {
  const outsideWorkshop = tile => {
    if (!workshopArea) return true;
    const dx = tile.x - workshopArea.x;
    const dz = tile.z - workshopArea.z;
    const localX = dx * Math.cos(workshopArea.yaw) - dz * Math.sin(workshopArea.yaw);
    const localZ = dx * Math.sin(workshopArea.yaw) + dz * Math.cos(workshopArea.yaw);
    const clearWidth = workshopArea.spawnClearanceWidth || workshopArea.width;
    const clearDepth = workshopArea.spawnClearanceDepth || workshopArea.depth;
    return Math.abs(localX) > clearWidth * .5 + .8 || Math.abs(localZ) > clearDepth * .5 + .8;
  };
  const candidates = [...terrain.values()].filter(tile =>
    tile.islandId === STARTER_ISLAND_ID && !tile.water && !tile.hasTree && !tile.reserved &&
    Math.abs(tile.topY - start.topY) < .01 && outsideWorkshop(tile)
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

function findCargoSite(terrain, island, workshopSite) {
  // Keep cargo infrastructure on the hub's open west side and face the deck due west.
  const outward = { x: -1, z: 0 };
  const islandTiles = [...terrain.values()].filter(tile => tile.islandId === island.id);
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
        if (!approach || approach.islandId !== island.id || approach.water || Math.abs(approach.topY - site.y) > .01) return false;
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
    if (workshopSite && Math.hypot(tile.x - workshopSite.x, tile.z - workshopSite.z) < 5.5 * TILE) continue;
    const site = { x: tile.x, y: tile.topY, z: tile.z, outward };
    if (!approachIsClear(site) || !deckIsClear(site)) continue;
    candidates.push({ site, tile });
  }

  // Prefer the westernmost valid anchor, then the southernmost site along that
  // edge so the cargo bay sits opposite the workshop.
  candidates.sort((a, b) => a.tile.gx - b.tile.gx || b.tile.gz - a.tile.gz);
  if (candidates.length) return candidates[0].site;

  const safeFallback = islandTiles
    .filter(tile => !tile.water && Math.abs(tile.topY - tile.baseY) <= .01 &&
      tile.radial >= .62 && tile.gx - island.cx < -island.r * .45 &&
      (!workshopSite || Math.hypot(tile.x - workshopSite.x, tile.z - workshopSite.z) >= 5.5 * TILE))
    .map(tile => ({ site: { x: tile.x, y: tile.topY, z: tile.z, outward }, tile }))
    .filter(candidate => deckIsClear(candidate.site))
    .sort((a, b) => a.tile.gx - b.tile.gx || b.tile.gz - a.tile.gz)[0];
  return safeFallback?.site || null;
}

function reserveCargoApproach(terrain, site, islandId) {
  if (!site) return;
  for (const tile of terrain.values()) {
    if (tile.islandId !== islandId) continue;
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

function addStarterCoastLake(cells, island, terrain, water, waterMotion, waterfalls, random) {
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

function chooseTreeSilhouette(profile, random) {
  const choices = [
    { value: 0, weight: .35 + profile.shady * .45 },
    { value: 1, weight: .35 + profile.wet * .35 },
    { value: 2, weight: profile.veryWet * profile.veryShady * 4.2 },
    { value: 3, weight: profile.veryWet * profile.shady * 3.4 },
    { value: 4, weight: profile.shady * (1 - profile.veryDry) * 2.4 },
    { value: 5, weight: profile.dry * (.45 + profile.shady) * 2.8 },
  ];
  return weightedChoice(choices, random);
}

function treeFoliagePalette(profile) {
  const rainforest = profile.veryWet * profile.veryShady;
  const yellowing = profile.dry * (.35 + profile.sunny * .65);
  if (rainforest > .48) return { key: 'rainforest', dark: 0x28563f, light: 0x4a8663 };
  if (profile.wet * profile.shady > .35) return { key: 'jungle', dark: 0x3e6a4d, light: 0x699b68 };
  if (yellowing > .62) return { key: 'golden-dry', dark: 0x7c7048, light: 0xa59358 };
  if (profile.dry > .45) return { key: 'dry-olive', dark: 0x696e46, light: 0x91905c };
  if (profile.sunny > .58) return { key: 'sunny-lush', dark: 0x618355, light: 0x8eaa68 };
  return { key: 'woodland', dark: 0x50754d, light: 0x789361 };
}

function chooseGroundCover(profile, nearWater, random) {
  return weightedChoice([
    { value: 'flowers', weight: profile.sunny * (.25 + profile.wet * 1.5) },
    { value: 'ferns', weight: profile.wet * profile.shady * (1 + nearWater) * 1.7 },
    { value: 'reeds', weight: profile.wet * nearWater * 3.2 },
    { value: 'leafyBush', weight: profile.wet * (.35 + profile.shady) * 1.2 },
    { value: 'yellowGrass', weight: profile.dry * profile.sunny * 2.4 },
    { value: 'darkGrass', weight: profile.wet * profile.shady * 2.1 },
    { value: 'mushrooms', weight: profile.wet * profile.veryShady * 1.15 },
    { value: 'dryScrub', weight: profile.dry * (.35 + profile.sunny) * (1 - nearWater) * 1.8 },
    { value: 'brightGrass', weight: .18 + profile.sunny * (1 - profile.veryDry) + profile.wet * profile.sunny },
  ], random);
}

function weightedChoice(choices, random) {
  const total = choices.reduce((sum, choice) => sum + Math.max(0, choice.weight), 0);
  let roll = random() * total;
  for (const choice of choices) {
    roll -= Math.max(0, choice.weight);
    if (roll <= 0) return choice.value;
  }
  return choices.at(-1).value;
}

function groundCoverMaterials() {
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1 });
  return {
    brightGrass: material(0x83a966),
    darkGrass: material(0x45654c),
    dryGrass: material(0xb09c62),
    fern: material(0x496c50),
    lushLeaf: material(0x5e8058),
    flower: material(0xdec4d2),
    flowerGold: material(0xdacb70),
    mushroom: material(0xcec9b7),
    mushroomCap: material(0xa9685e),
    reed: material(0x778867),
    reedTip: material(0x806b52),
    scrub: material(0x7a765a),
  };
}

function groundCoverDesign(type) {
  const part = (x, y, z, w, h, d, material, rz = 0, ry = 0) => ({ x, y, z, w, h, d, material, rz, ry });
  const blades = (material, height = .58) => [
    part(-.22, height * .5, -.12, .045, height, .05, material, -.14),
    part(-.08, height * .58, .16, .04, height * 1.15, .045, material, .12),
    part(.08, height * .48, -.2, .05, height * .9, .04, material, -.08),
    part(.22, height * .54, .08, .04, height * 1.05, .05, material, .16),
    part(0, height * .42, 0, .055, height * .8, .045, material, -.1),
  ];
  if (type === 'flowers') return [
    part(-.17, .22, -.08, .035, .44, .035, 'brightGrass'), part(.12, .17, .12, .035, .34, .035, 'brightGrass'),
    part(.02, .25, -.18, .035, .5, .035, 'brightGrass'), part(-.17, .46, -.08, .13, .1, .13, 'flower'),
    part(.12, .36, .12, .12, .1, .12, 'flowerGold'), part(.02, .52, -.18, .13, .1, .13, 'flower'),
  ];
  if (type === 'ferns') return [
    part(0, .18, 0, .06, .36, .06, 'fern'),
    part(-.19, .22, 0, .42, .045, .1, 'fern', .35), part(.19, .25, 0, .42, .045, .1, 'fern', -.35),
    part(0, .28, -.18, .1, .045, .42, 'fern', .3, Math.PI * .5), part(0, .2, .18, .1, .045, .42, 'fern', -.3, Math.PI * .5),
  ];
  if (type === 'reeds') return [
    part(-.22, .43, -.13, .035, .86, .035, 'reed'), part(-.05, .52, .12, .035, 1.04, .035, 'reed'),
    part(.12, .46, -.18, .035, .92, .035, 'reed'), part(.24, .38, .1, .035, .76, .035, 'reed'),
    part(-.05, 1.04, .12, .07, .16, .07, 'reedTip'), part(.12, .94, -.18, .07, .15, .07, 'reedTip'),
  ];
  if (type === 'leafyBush') return [
    part(0, .18, 0, .07, .36, .07, 'scrub'), part(-.2, .35, 0, .32, .28, .34, 'lushLeaf'),
    part(.19, .32, .08, .34, .3, .32, 'lushLeaf'), part(0, .48, -.1, .36, .32, .34, 'lushLeaf'),
  ];
  if (type === 'yellowGrass') return blades('dryGrass', .7);
  if (type === 'darkGrass') return blades('darkGrass', .76);
  if (type === 'mushrooms') return [
    part(-.13, .12, -.08, .055, .24, .055, 'mushroom'), part(.13, .09, .1, .05, .18, .05, 'mushroom'),
    part(-.13, .25, -.08, .2, .09, .2, 'mushroomCap'), part(.13, .19, .1, .16, .075, .16, 'mushroomCap'),
  ];
  if (type === 'dryScrub') return [
    part(0, .2, 0, .055, .4, .055, 'scrub', .18), part(-.14, .31, 0, .32, .045, .055, 'scrub', .4),
    part(.15, .42, .03, .34, .045, .055, 'scrub', -.48), part(-.24, .42, 0, .14, .11, .14, 'dryGrass'),
    part(.25, .5, .03, .13, .1, .13, 'dryGrass'),
  ];
  return blades('brightGrass', .64);
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
  if (silhouette === 2) {
    return {
      trunkHeight: 4.35,
      leafBaseY: 3.38,
      radius: .45,
      branches: [[0,3.1,0,-1.15,3.55,.08], [0,3.18,0,1.18,3.62,-.1], [0,3.35,0,.1,3.72,1.08]],
      leaves: [
        [-4,0,-2],[-4,0,-1],[-4,0,0],[-4,0,1],[-4,0,2],[-3,0,-3],[-3,0,-2],[-3,0,-1],[-3,0,0],[-3,0,1],[-3,0,2],[-3,0,3],
        [-2,0,-4],[-2,0,-3],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-2,0,3],[-2,0,4],[-1,0,-4],[-1,0,-3],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[-1,0,3],[-1,0,4],
        [0,0,-5],[0,0,-4],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[0,0,4],[0,0,5],
        [1,0,-4],[1,0,-3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[1,0,4],[2,0,-4],[2,0,-3],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[2,0,3],[2,0,4],
        [3,0,-3],[3,0,-2],[3,0,-1],[3,0,0],[3,0,1],[3,0,2],[3,0,3],[4,0,-2],[4,0,-1],[4,0,0],[4,0,1],[4,0,2],[-2,1,-2],[0,1,0],[2,1,2],[0,2,0],
      ],
    };
  }
  if (silhouette === 3) {
    return {
      trunkHeight: 3.9,
      leafBaseY: 1.95,
      radius: .42,
      branches: [[0,1.65,0,-.82,2.05,.12],[0,2.3,0,.92,2.62,-.1],[0,2.9,0,-.65,3.2,-.5]],
      leaves: [
        [-3,0,-1],[-3,0,0],[-3,0,1],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[3,0,-1],[3,0,0],[3,0,1],
        [-3,3,0],[-2,3,-1],[-2,3,0],[-2,3,1],[-1,3,-2],[-1,3,-1],[-1,3,0],[-1,3,1],[-1,3,2],[0,3,-2],[0,3,-1],[0,3,0],[0,3,1],[0,3,2],[1,3,-2],[1,3,-1],[1,3,0],[1,3,1],[1,3,2],[2,3,-1],[2,3,0],[2,3,1],[3,3,0],
        [-2,6,0],[-1,6,-1],[-1,6,0],[-1,6,1],[0,6,-2],[0,6,-1],[0,6,0],[0,6,1],[0,6,2],[1,6,-1],[1,6,0],[1,6,1],[2,6,0],
      ],
    };
  }
  if (silhouette === 4) {
    return {
      trunkHeight: 3.5,
      leafBaseY: 2.15,
      radius: .38,
      branches: [[0,1.6,0,-.8,2.25,.15],[0,1.72,0,.82,2.32,-.18],[0,2.05,0,.12,2.65,.72]],
      leaves: [
        [-3,0,-1],[-3,0,0],[-3,0,1],[-2,0,-2],[-2,0,-1],[-2,0,0],[-2,0,1],[-2,0,2],[-1,0,-2],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,0,2],[0,0,-3],[0,0,-2],[0,0,-1],[0,0,0],[0,0,1],[0,0,2],[0,0,3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[3,0,-1],[3,0,0],[3,0,1],[-2,1,0],[-1,1,-1],[-1,1,0],[-1,1,1],[0,1,-1],[0,1,0],[0,1,1],[1,1,-1],[1,1,0],[1,1,1],[2,1,0],[0,2,0],
      ],
    };
  }
  return {
    trunkHeight: 3.1,
    leafBaseY: 2.15,
    radius: .31,
    branches: [[0,.9,0,.28,1.65,.05],[.18,1.5,0,-.72,2.28,.08],[.25,1.72,0,1.05,2.38,-.18],[.1,2.05,0,.2,2.62,.7]],
    leaves: [
      [-3,0,0],[-2,0,-1],[-2,0,0],[-1,0,-1],[-1,0,0],[1,1,0],[2,1,-1],[2,1,0],[2,1,1],[3,1,0],[0,2,2],[1,2,1],[1,2,2],
    ],
  };
}

function reserveBridgeLandings(terrain, gap) {
  if (!gap) return;
  for (const tile of terrain.values()) {
    if (Math.hypot(tile.x - gap.from.x, tile.z - gap.from.z) <= 2.6 * TILE ||
      Math.hypot(tile.x - gap.to.x, tile.z - gap.to.z) <= 2.6 * TILE) {
      tile.noDecoration = true;
    }
  }
}

function addBridgeBetween(
  fromIsland,
  toIsland,
  terrain,
  group,
  bridgeBlocks,
  lanternGlowMaterial,
  lanternGlowMeshes,
  lanternLights,
) {
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
  const desiredCrownY = Math.max(start.y, end.y) + THREE.MathUtils.clamp(
    span * BRIDGE_ARCH_RISE_PER_UNIT,
    BRIDGE_ARCH_MIN_RISE,
    BRIDGE_ARCH_MAX_RISE,
  );
  // Smoothstep reaches 1.5 times its average grade. Keep that peak below the
  // character controller's slope limit, with extra margin for plank seams.
  const halfSpan = span * .5;
  const safeHalfRise = Math.tan(BRIDGE_MAX_PITCH) * halfSpan / 1.5;
  const safeCrownY = Math.min(start.y + safeHalfRise, end.y + safeHalfRise);
  const hasCrownedMidpoint = safeCrownY >= Math.max(start.y, end.y) + .04;
  const crownY = hasCrownedMidpoint ? Math.min(desiredCrownY, safeCrownY) : 0;
  const bridgeYAt = progress => {
    if (!hasCrownedMidpoint) {
      const baseY = THREE.MathUtils.lerp(start.y, end.y, progress);
      return baseY + Math.sin(progress * Math.PI) * Math.min(.12, span * .02);
    }
    if (progress <= .5) return THREE.MathUtils.lerp(start.y, crownY, ease(progress * 2));
    return THREE.MathUtils.lerp(crownY, end.y, ease((progress - .5) * 2));
  };
  const pointAt = progress => ({
    x: THREE.MathUtils.lerp(start.x, end.x, progress),
    y: bridgeYAt(progress),
    z: THREE.MathUtils.lerp(start.z, end.z, progress),
  });

  const bridge = new THREE.Group();
  const yaw = Math.atan2(direction.x, direction.z);
  const plankCount = Math.ceil(span / BRIDGE_SEGMENT_LENGTH);
  const segmentPoints = Array.from({ length: plankCount + 1 }, (_, index) => pointAt(index / plankCount));
  const sideDirection = { x: direction.z, z: -direction.x };
  const railOffset = BRIDGE_WIDTH * .5;
  const yawRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const pitchRotation = new THREE.Quaternion();
  const segmentRotation = new THREE.Quaternion();
  const deckUp = new THREE.Vector3();
  const localXAxis = new THREE.Vector3(1, 0, 0);
  const localYAxis = new THREE.Vector3(0, 1, 0);
  bridge.name = 'bridge';
  bridge.userData.occlusionIgnoreAtVehicle = vehicleState => {
    const along = (vehicleState.x - start.x) * direction.x + (vehicleState.z - start.z) * direction.z;
    const lateral = Math.abs((vehicleState.x - start.x) * direction.z - (vehicleState.z - start.z) * direction.x);
    if (along < -BRIDGE_OCCLUSION_END_CLEARANCE || along > span + BRIDGE_OCCLUSION_END_CLEARANCE
      || lateral > BRIDGE_WIDTH * .5 + BRIDGE_OCCLUSION_SIDE_CLEARANCE) return false;
    const deckY = bridgeYAt(THREE.MathUtils.clamp(along / span, 0, 1));
    return Math.abs(vehicleState.y - deckY) <= BRIDGE_OCCLUSION_HEIGHT_CLEARANCE;
  };
  group.add(bridge);
  const railingGroups = new Map();
  for (const side of [-1, 1]) {
    const railing = new THREE.Group();
    railing.name = `bridge-railing-${side < 0 ? 'left' : 'right'}`;
    railingGroups.set(side, railing);
    bridge.add(railing);
  }

  for (let index = 0; index < plankCount; index++) {
    const segmentStart = segmentPoints[index];
    const segmentEnd = segmentPoints[index + 1];
    const x = (segmentStart.x + segmentEnd.x) * .5;
    const y = (segmentStart.y + segmentEnd.y) * .5;
    const z = (segmentStart.z + segmentEnd.z) * .5;
    const horizontalLength = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.z - segmentStart.z);
    const rise = segmentEnd.y - segmentStart.y;
    const pitch = Math.atan2(rise, horizontalLength);
    const plankLength = Math.hypot(horizontalLength, rise) + .035;
    pitchRotation.setFromAxisAngle(localXAxis, -pitch);
    segmentRotation.copy(yawRotation).multiply(pitchRotation);
    deckUp.copy(localYAxis).applyQuaternion(segmentRotation);
    const plank = box(BRIDGE_WIDTH, BRIDGE_THICKNESS, plankLength, index % 2 ? mats.bridge : mats.bridgeDark);
    plank.position.set(
      x - deckUp.x * BRIDGE_THICKNESS * .5,
      y - deckUp.y * BRIDGE_THICKNESS * .5,
      z - deckUp.z * BRIDGE_THICKNESS * .5,
    );
    plank.quaternion.copy(segmentRotation);
    bridge.add(plank);
    bridgeBlocks.push({
      x: plank.position.x,
      y: plank.position.y,
      z: plank.position.z,
      width: BRIDGE_WIDTH,
      height: BRIDGE_THICKNESS,
      depth: plankLength,
      rotation: { x: segmentRotation.x, y: segmentRotation.y, z: segmentRotation.z, w: segmentRotation.w },
    });

    for (const side of [-1, 1]) {
      for (const railY of [BRIDGE_RAIL_LOWER_Y, BRIDGE_RAIL_UPPER_Y]) {
        const rail = box(BRIDGE_RAIL_THICKNESS, BRIDGE_RAIL_THICKNESS, plankLength, mats.bridgeDark);
        rail.name = `bridge-railing-${side < 0 ? 'left' : 'right'}-rail`;
        rail.position.set(
          x + sideDirection.x * railOffset * side,
          y + railY,
          z + sideDirection.z * railOffset * side,
        );
        rail.quaternion.copy(segmentRotation);
        railingGroups.get(side).add(rail);
      }
      bridgeBlocks.push({
        x: x + sideDirection.x * railOffset * side,
        y: Math.min(segmentStart.y, segmentEnd.y) + (BRIDGE_RAIL_HEIGHT + Math.abs(rise)) * .5,
        z: z + sideDirection.z * railOffset * side,
        width: BRIDGE_RAIL_THICKNESS,
        height: BRIDGE_RAIL_HEIGHT + Math.abs(rise),
        depth: horizontalLength + .035,
        rotation: { x: yawRotation.x, y: yawRotation.y, z: yawRotation.z, w: yawRotation.w },
      });
    }
  }

  const postProgress = new Set([0, .5, 1]);
  const postSections = Math.max(1, Math.ceil(span / BRIDGE_RAIL_POST_SPACING));
  for (let index = 1; index < postSections; index++) postProgress.add(index / postSections);
  for (const progress of [...postProgress].sort((first, second) => first - second)) {
    const point = pointAt(progress);
    for (const side of [-1, 1]) {
      const post = box(BRIDGE_RAIL_THICKNESS, BRIDGE_RAIL_HEIGHT, BRIDGE_RAIL_THICKNESS, mats.bridgeDark);
      post.name = `bridge-railing-${side < 0 ? 'left' : 'right'}-post`;
      post.position.set(
        point.x + sideDirection.x * railOffset * side,
        point.y + BRIDGE_RAIL_HEIGHT * .5,
        point.z + sideDirection.z * railOffset * side,
      );
      post.rotation.y = yaw;
      railingGroups.get(side).add(post);
    }
  }

  const lanternPlacements = span < BRIDGE_SHORT_LANTERN_SPAN
    ? [[0, -1]]
    : [[0, -1], [0, 1], [1, -1], [1, 1]];
  for (const [progress, side] of lanternPlacements) {
    const point = pointAt(progress);
    const endName = progress === 0 ? 'start' : 'end';
    const sideName = side < 0 ? 'left' : 'right';
    const { group: lantern, glowMesh } = createVoxelLantern({
      glowMaterial: lanternGlowMaterial,
      name: `bridge-${fromIsland.id}-${toIsland.id}-${endName}-${sideName}-lantern`,
    });
    lantern.position.set(
      point.x + sideDirection.x * railOffset * side,
      point.y + BRIDGE_RAIL_HEIGHT + MODEL_VOXEL,
      point.z + sideDirection.z * railOffset * side,
    );
    lantern.rotation.y = yaw;
    const light = new THREE.PointLight(0xffb653, 0, 5, 2);
    light.position.set(0, .1, 0);
    light.castShadow = false;
    lantern.add(light);
    lanternGlowMeshes.push(glowMesh);
    lanternLights.push(light);
    railingGroups.get(side).add(lantern);
  }
}

function closestIslandGap(terrain, fromId, toId) {
  const fromTiles = [];
  const toTiles = [];
  for (const tile of terrain.values()) {
    if (tile.water) continue;
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

function environmentProfile(environment) {
  const moisture = environment.moisture;
  const sun = environment.sun;
  const shade = 1 - sun;

  const veryWet = THREE.MathUtils.smoothstep(moisture, .68, .92);
  const wet = THREE.MathUtils.smoothstep(moisture, .48, .78);
  const dry = THREE.MathUtils.smoothstep(1 - moisture, .42, .78);
  const veryDry = THREE.MathUtils.smoothstep(1 - moisture, .68, .92);

  const shady = THREE.MathUtils.smoothstep(shade, .38, .72);
  const veryShady = THREE.MathUtils.smoothstep(shade, .62, .90);
  const sunny = THREE.MathUtils.smoothstep(sun, .42, .78);
  const verySunny = THREE.MathUtils.smoothstep(sun, .68, .92);

  return {
    moisture,
    sun,
    shade,
    veryWet,
    wet,
    dry,
    veryDry,
    shady,
    veryShady,
    sunny,
    verySunny,
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
  if (island.id === NORTH_ISLAND_ID) {
    const skew = Math.sin(angle) * .14;
    const northward = -cell.dz + cell.dx * skew;
    const across = cell.dx + cell.dz * skew * .35;
    const terraces = [
      { north: -island.r * .28, width: island.r * .74 },
      { north: 0, width: island.r * .55 },
      { north: island.r * .27, width: island.r * .36 },
    ];
    const plateauLevels = terraces.reduce((levels, terrace) =>
      levels + Number(northward >= terrace.north && Math.abs(across) <= terrace.width), 0);
    return PLATEAU_BLOCK_HEIGHT * plateauLevels;
  }

  const along = cell.dx * Math.cos(angle) + cell.dz * Math.sin(angle);
  const across = -cell.dx * Math.sin(angle) + cell.dz * Math.cos(angle);
  // Every non-starter island uses one large, contiguous raised plot. Its base
  // remains equally broad, so both of the island's two elevations are useful
  // for farming rather than reading as narrow decorative ledges.
  const onRaisedPlot = along >= -island.r * .72 && along <= island.r * .42 &&
    Math.abs(across) <= island.r * .62;
  return onRaisedPlot ? PLATEAU_BLOCK_HEIGHT : 0;
}
