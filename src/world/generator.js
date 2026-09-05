import { GRASS_TOP, LAYER_DEPTH, LEVEL_HEIGHT, mats, MODEL_VOXEL, SOIL_DEPTH, TILE, box, createVoxelLantern, createVoxelModel, gridKey, THREE } from '../core/shared.js';
import { crops } from '../gameplay/catalog/crops.js';
import { cargoDeckContains, createCargoPort } from '../gameplay/logistics/cargo-port.js';
import { createForageSystem } from './forage/index.js';
import { createWildlifeSystem } from './wildlife/index.js';
import { NORTH_ISLAND_ID, STARTER_ISLAND_ID, WORKSHOP_YAW } from './config.js';
import { createOcclusionSystem, disposeObjectResources } from './occlusion.js';
import { findCargoSite, findVehicleSpawns, findWorkshopSite, reserveCargoApproach, reserveWorkshopGround } from './sites.js';
import { createOrganicCells, createPerlin, environmentalAxis, environmentProfile, plateauHeight, scaleIslandLayout, seededRandom } from './islands/procedural.js';
import { STATIC_LANTERN_LIGHT_RADIUS, addBridgeBetween, closestIslandGap, createStaticLanternLighting, reserveBridgeLandings } from './bridges.js';
import { WATER_DEPTH, addStarterCoastLake, addWatercourse } from './water/system.js';
import { chooseGrassPatches, chooseGroundCover, chooseTreeSilhouette, groundCoverDesign, groundCoverMaterials, treeDesign, treeFoliagePalette } from './vegetation/designs.js';
import { CROP_STAGE_SECONDS, GRASS_STAGE_SECONDS, TILE_YIELD_LITRES, WEED_CHANCE } from './fields/config.js';
import { createCropInstances, createFieldEffects, renderCropTile, tileAtLevel } from './fields/rendering.js';

const PLATEAU_BLOCK_HEIGHT = LEVEL_HEIGHT;
const WORKSHOP_TREE_CLEARANCE = 3.5 * TILE;
const STARTER_HUB_RADIUS = 7.2;
const SECOND_STARTER_RADIUS = 7.0;
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
  const staticLanternPositions = [];
  const staticLightSurfaceQuads = [];
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
    const addWorkshopLightSurface = (left, near, right, far) => {
      const corners = [[left, near], [right, near], [left, far], [right, far]];
      staticLightSurfaceQuads.push(corners.map(([localX, localZ]) => {
        const position = localToWorld(localX, localZ);
        return new THREE.Vector3(position.x, y + MODEL_VOXEL + .004, position.z);
      }));
    };
    addWorkshopLightSurface(-1.7, -1.7, 1.7, 1.7);
    addWorkshopLightSurface(-.7, -2.7, .7, -1.7);

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
    const lanternPosition = localToWorld(lantern.position.x, lantern.position.z);
    staticLanternPositions.push(new THREE.Vector3(lanternPosition.x, y + lantern.position.y + .1, lanternPosition.z));
    workshop.add(lantern);
    setWorkshopNightAmount = amount => {
      const nightAmount = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
      lanternGlowMesh.material.emissiveIntensity = .25 + nightAmount * 2.75;
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
  cargoPort.lanternPositions.forEach(position => {
    staticLanternPositions.push(cargoPort.group.localToWorld(position.clone()));
  });
  cargoPort.lightSurfaceQuads.forEach(quad => {
    staticLightSurfaceQuads.push(quad.map(position => cargoPort.group.localToWorld(position.clone())));
  });
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
      staticLanternPositions,
      staticLightSurfaceQuads,
    );
  }

  if (!watercourseCount && attempt < 7) {
    scene.remove(group);
    disposeObjectResources(group);
    return generateFarm(scene, physics, (seed + 0x9e3779b9) >>> 0, attempt + 1, onChange);
  }

  addTerrainInstances();
  for (const tile of terrain.values()) {
    if (tile.water) continue;
    const left = tile.x - TILE * .5;
    const right = tile.x + TILE * .5;
    const near = tile.z - TILE * .5;
    const far = tile.z + TILE * .5;
    const y = tile.topY + SURFACE_TOP_LIFT + .004;
    staticLightSurfaceQuads.push([
      new THREE.Vector3(left, y, near),
      new THREE.Vector3(right, y, near),
      new THREE.Vector3(left, y, far),
      new THREE.Vector3(right, y, far),
    ]);
  }
  const staticLanternLighting = createStaticLanternLighting(
    staticLanternPositions,
    staticLightSurfaceQuads,
    STATIC_LANTERN_LIGHT_RADIUS,
  );
  if (staticLanternLighting.mesh) group.add(staticLanternLighting.mesh);
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

  const forage = createForageSystem(terrain, group, physics, onChange);
  const wildlife = createWildlifeSystem(terrain, group, seed);
  const occlusion = createOcclusionSystem(group, cargoPort.occluders);
  physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const starterIsland = islands[STARTER_ISLAND_ID];
  const start = terrain.get(gridKey(starterIsland.cx, starterIsland.cz)) || terrain.values().next().value;
  const vehicleSpawns = findVehicleSpawns(terrain, start, workshopArea);
  const bridgeLanternGlowMaterials = [...new Set(bridgeLanternGlowMeshes.map(mesh => mesh.material))];
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
      bridgeLanternGlowMaterials.forEach(material => { material.emissiveIntensity = .25 + bridgeLanternAmount * 2.75; });
      staticLanternLighting.setAmount(bridgeLanternAmount);
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
      forage.animate();
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
    spawnBale(x, y, z, heading, motion) {
      return forage.spawnBale(x, y, z, heading, motion);
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
    releaseBale(id, x, y, z, heading, motion) {
      return forage.releaseBale(id, x, y, z, heading, motion);
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
