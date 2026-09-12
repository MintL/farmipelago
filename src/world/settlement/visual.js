import { THREE, TILE, gridKey } from '../../core/shared.js';
import { createSettlementDevelopment, settlementTier } from './development.js';
import { createLegacySettlementVisual } from './legacy-visual.js';
import { settlementRoadAt } from './layout.js';
import { createStaticLanternLighting, STATIC_LANTERN_LIGHT_RADIUS } from '../bridges.js';

const extraSolids = entry => {
  if (entry.id === 'blue-home' || entry.id === 'amber-home') return [[-1.55, 0, -.3, .6, .76, .6]];
  if (entry.id === 'red-home' && entry.from < 4) return [[-.82, .4, 1.55, .6, 1, .85], [.72, .4, 1.56, .46, .5, .4]];
  if (entry.id === 'hall' && entry.from === 5) return [[-1.37, .4, -.35, 1.15, 1.65, 1.8],
    [1.37, .4, -.35, 1.15, 1.65, 1.8], [-2.8, 0, -.1, .65, 1.3, 1.4], [2.74, 0, -.48, .9, 1.4, .9]];
  return [];
};

function colliderAt(collider, matrix, islandId) {
  const { x, y, z, width, height, depth } = collider;
  const bounds = new THREE.Box3(new THREE.Vector3(x - width / 2, y, z - depth / 2),
    new THREE.Vector3(x + width / 2, y + height, z + depth / 2)).applyMatrix4(matrix);
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  return { shape: 'box', x: center.x, y: bounds.min.y, z: center.z, width: size.x,
    height: size.y, depth: size.z, yaw: 0, islandId, settlementDevelopment: true };
}

export function createSettlementVisual(options) {
  if (!options.developed) return createLegacySettlementVisual(options);
  const { island, terrain, reducedMotion = false, initialTier = 1 } = options;
  const development = createSettlementDevelopment(), { group } = development;
  group.name = 'settlement';
  const ground = terrain.get(gridKey(island.cx, island.cz));
  // Center the gallery's five-cell terrain tiles on the game's tile centers.
  group.position.set((island.cx - .1) * TILE, ground.topY, (island.cz - .1) * TILE);
  const pathTiles = [];
  for (const tile of terrain.values()) {
    if (tile.islandId !== island.id) continue;
    tile.noDecoration = true; tile.reserved = true;
    if (settlementRoadAt(tile.gx - island.cx, tile.gz - island.cz)) pathTiles.push(tile);
  }
  const owned = new Map();
  group.traverse(object => {
    if (!object.isMesh) return;
    const clone = material => {
      if (!owned.has(material)) {
        const copy = material.clone();
        copy.userData.buildingLight = Boolean(material.emissive?.getHex() && material.emissiveIntensity > 0);
        owned.set(material, copy);
      }
      return owned.get(material);
    };
    object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
  });
  group.updateMatrixWorld(true);
  const colliderCache = new Map();
  const collidersFor = tier => {
    const value = settlementTier(tier);
    if (!colliderCache.has(value)) {
      const colliders = [];
      for (const entry of development.entriesAt(value)) {
        entry.model.group.traverse(object => {
          for (const collider of object.userData.buildingColliders || []) {
            colliders.push(colliderAt(collider, object.matrixWorld, island.id));
          }
        });
        for (const [x, y, z, width, height, depth] of extraSolids(entry)) {
          colliders.push(colliderAt({ x, y, z, width, height, depth }, entry.model.group.matrixWorld, island.id));
        }
      }
      colliderCache.set(value, colliders);
    }
    return colliderCache.get(value);
  };
  // Cache in the final world frame before the opening moves the visual island.
  for (let tier = 1; tier <= 5; tier++) collidersFor(tier);
  let night = 0, groundLight = null, productionTime = 1, working = false, receivingTime = null;
  const floorQuads = [...terrain.values()].filter(tile => tile.islandId === island.id).map(tile =>
    [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].map(([x, z]) =>
      new THREE.Vector3(tile.x + x * TILE, tile.topY + .035, tile.z + z * TILE).sub(group.position)));
  const rebuildLighting = () => {
    if (groundLight?.mesh) {
      groundLight.mesh.removeFromParent(); groundLight.mesh.geometry.dispose(); groundLight.mesh.material.dispose();
    }
    const lamps = [];
    for (const entry of development.entriesAt()) {
      entry.model.group.traverse(object => {
        if (!object.isMesh || !object.material?.userData.buildingLight) return;
        const bounds = new THREE.Box3().setFromObject(object);
        lamps.push(bounds.getCenter(new THREE.Vector3()).sub(group.position));
      });
    }
    groundLight = createStaticLanternLighting(lamps, floorQuads, STATIC_LANTERN_LIGHT_RADIUS);
    if (groundLight.mesh) group.add(groundLight.mesh);
    groundLight.setAmount(night);
  };
  const setTier = tier => { development.setTier(tier); group.updateMatrixWorld(true); rebuildLighting(); };
  setTier(initialTier);
  const anchor = new THREE.Group(); anchor.name = 'settlement-storehouse';
  anchor.position.copy(group.position).add(new THREE.Vector3(-5 * TILE, 0, 5.8 * TILE));
  const input = () => {
    const hall = development.entriesAt().find(entry => entry.id === 'hall');
    return { x: anchor.position.x, y: ground.topY + (hall.from === 5 ? 1.1 : .8) * TILE,
      z: group.position.z + (2 + (hall.from === 5 ? 1.96 : 1.45)) * TILE };
  };
  const cargoPort = {
    group: anchor, colliders: [], occluders: [], lanternPositions: [], lightSurfaceQuads: [],
    isNear(x, z, range = 3.15) {
      return !development.upgrading && z >= anchor.position.z - .4 * TILE && Math.hypot(x - anchor.position.x, z - anchor.position.z) <= range;
    },
    unloadTarget: input, transferPort: input,
    setTransferState({ active }) { working = active; }, pulseTransfer() {}, setCargoKind() {}, setNightAmount() {},
    setLoadRatio(ratio) { development.allEntries.filter(entry => entry.id === 'hall').forEach(entry => entry.model.setStockLevel?.(ratio)); },
    receiveShipment() { receivingTime = 0; },
    cinematicView() { return { target: anchor.position.clone().add(new THREE.Vector3(0, 1, 0)),
      camera: anchor.position.clone().add(new THREE.Vector3(-6, 7, 8)) }; },
    update(dt) {
      if (working || receivingTime !== null) productionTime += dt;
      if (receivingTime === null) return { shipmentReceived: false };
      receivingTime += dt;
      if (receivingTime < 1.4) return { shipmentReceived: false };
      receivingTime = null; return { shipmentReceived: true };
    },
    dispose() {},
  };
  return {
    group, cargoPort, development, pathTiles, collidersFor, setTier,
    colliders: collidersFor(initialTier), lanternPositions: [], lightSurfaceQuads: [],
    occluders: development.allEntries.map(entry => entry.root),
    setNightAmount(amount) {
      night = THREE.MathUtils.clamp(amount, 0, 1);
      group.traverse(object => {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => { if (material?.userData.buildingLight) material.emissiveIntensity = .12 + night * 2.1; });
      });
      groundLight.setAmount(night);
    },
    finishUpgrade() { development.finishUpgrade(); group.updateMatrixWorld(true); rebuildLighting(); },
    animate(elapsed) { development.animate(productionTime, working || receivingTime !== null, reducedMotion, elapsed); },
    dispose() { development.dispose(); owned.forEach(material => material.dispose()); },
  };
}
