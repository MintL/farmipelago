import { THREE, TILE } from '../../core/shared.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as art from './models.js';
import { settlementCells } from './layout.js';
import { SETTLEMENT_ROAD_STAGES } from './roads.js';

export const SETTLEMENT_STAGES = [
  { tier: 1, name: 'Sparse hamlet', description: 'Two little homes and a place for the harvest.',
    changes: 'A modest Storehouse, blue and red cottages, and worn dirt paths.' },
  { tier: 2, name: 'Busier hamlet', description: 'The beginnings of a shared village life.',
    changes: 'A timber well, market wheelbarrow and pergola with a bench establish shared spaces. A short fence and the first lanterns sit outside the streets.' },
  { tier: 3, name: 'Established village', description: 'Another home. A little more care everywhere.',
    changes: 'An amber cottage and a covered market arrive. The blue cottage gains painted trim; the well, canopy and fence improve, with small gardens beside the homes.' },
  { tier: 4, name: 'Prosperous village', description: 'A fuller neighborhood, with room to move.',
    changes: 'The red cottage becomes two taller homes. The amber cottage gains painted trim, and stone paving finishes the open delivery court.' },
  { tier: 5, name: 'Mature settlement', description: 'A small island, made into a place to belong.',
    changes: 'A civic Storehouse replaces the modest hall and canopy. A bell tower rises beside the well, and the market gains painted counters, crests, lanterns and flowers.' },
];
SETTLEMENT_STAGES.forEach((stage, index) => { stage.changes += ` Roads: ${SETTLEMENT_ROAD_STAGES[index].toLowerCase()}.`; });

export const settlementTier = value => Math.max(1, Math.min(5, Math.floor(Number(value)) || 1));
const clamp = value => THREE.MathUtils.clamp(value, 0, 1);
const ease = value => value * value * (3 - 2 * value);

// Reserve streets for the largest variants first, including roof overhangs,
// porch steps and stock. The plinth keeps these routes open in every tier:
// three-tile housing street and market approach, a four-tile arrival court,
// and an eight-by-three-tile delivery court in front of the Storehouse.
// Earlier variants occupy these same parcels; furnishings stay off the routes.
const sites = [
  ['hall', 'storehouse', 1, 4, -5, 2, art.receivingHall],
  ['hall', 'storehouse', 5, 5, -5, 2, art.civicStorehouse],
  ['canopy', 'storehouse', 1, 2, -5, 2, () => art.receivingCanopy(false)],
  ['canopy', 'storehouse', 3, 4, -5, 2, () => art.receivingCanopy(true)],
  ['flag', 'storehouse', 1, 4, -8.2, .4, art.villageFlag],
  ['blue-home', 'homes', 1, 2, -1.8, -6, () => art.cottage('blue')],
  ['blue-home', 'homes', 3, 5, -1.8, -6, () => art.cottage('blue', true)],
  ['red-home', 'homes', 1, 3, 4.6, -6, () => art.cottage('red')],
  ['red-home', 'homes', 4, 5, 4.6, -6, art.townhouses],
  ['amber-home', 'homes', 3, 3, -6.4, -6, () => art.cottage('amber')],
  ['amber-home', 'homes', 4, 5, -6.4, -6, () => art.cottage('amber', true)],
  ['well', 'well', 2, 2, 4.2, 6.4, () => art.well(false)],
  ['well', 'well', 3, 5, 4.2, 6.4, () => art.well(true)],
  ['market', 'market', 2, 2, 6.2, 2.4, art.handcart, -Math.PI / 2],
  ['market', 'market', 3, 4, 6.2, 2.4, () => art.market(false), -Math.PI / 2],
  ['market', 'market', 5, 5, 6.2, 2.4, () => art.market(true), -Math.PI / 2],
  ['pergola', 'commons', 2, 5, -7.2, 6.4, art.pergola, Math.PI / 2],
  ['west-bench', 'commons', 2, 5, -7.2, 6.4, art.bench, Math.PI / 2, .2],
  ['hall-grass', 'gardens', 1, 5, -8.8, 4.1, () => art.islandGroundCover('yellowGrass')],
  ['hall-ferns', 'gardens', 1, 5, -9, 1.2, () => art.islandGroundCover('ferns')],
  ['blue-back-grass', 'gardens', 1, 5, -1.8, -8.4, () => art.islandGroundCover('darkGrass')],
  ['blue-front-grass', 'gardens', 1, 5, 0, -4.4, () => art.islandGroundCover('brightGrass')],
  ['red-back-grass', 'gardens', 1, 5, 4.6, -8.4, () => art.islandGroundCover('yellowGrass')],
  ['red-flowers', 'gardens', 1, 5, 8, -7.1, () => art.islandGroundCover('flowers')],
  ['tree-mushrooms', 'gardens', 1, 5, -9.4, -8.3, () => art.islandGroundCover('mushrooms')],
  ['tree-grass', 'gardens', 1, 5, 9.6, -8.3, () => art.islandGroundCover('darkGrass')],
  ['well-grass', 'gardens', 2, 5, 4.4, 4.6, () => art.islandGroundCover('darkGrass')],
  ['market-grass', 'gardens', 2, 5, 8.3, 2.2, () => art.islandGroundCover('yellowGrass')],
  ['pergola-ferns', 'gardens', 2, 5, -8.7, 6.1, () => art.islandGroundCover('ferns')],
  ['amber-back-grass', 'gardens', 3, 5, -6.4, -8.4, () => art.islandGroundCover('darkGrass')],
  ['amber-flowers', 'gardens', 3, 5, -8.7, -6.5, () => art.islandGroundCover('flowers')],
  ['hall-logs', 'gardens', 1, 5, -8.8, 2.5, () => art.groundProps('logs')],
  ['blue-pots', 'gardens', 1, 5, .2, -5.8, () => art.groundProps('pots')],
  ['red-pots', 'gardens', 1, 5, 1.4, -7.3, () => art.groundProps('pots')],
  ['amber-logs', 'gardens', 3, 5, -9, -5.2, () => art.groundProps('logs')],
  ['west-tree', 'gardens', 1, 5, -9.6, -7.4, () => art.villageTree(0)],
  ['east-tree', 'gardens', 1, 5, 9.6, -7.4, () => art.villageTree(1)],
  ['east-fence', 'gardens', 2, 2, 3.2, 8, () => art.fence(10)],
  ['east-fence', 'gardens', 3, 5, 3.2, 8, () => art.fence(10, true)],
  ['amber-garden', 'gardens', 3, 5, -6.4, -3.8, () => art.garden(12, 2)],
  ['red-garden', 'gardens', 3, 5, 7.8, -5.6, () => art.garden(8, 4), Math.PI / 2],
  ['square', 'square', 4, 5, -5.4, 5.6, () => art.pavingPatch(40, 15), 0, -.18],
  ['market-paving', 'square', 3, 5, 1.6, .6, () => art.pavingPatch(15, 15), 0, -.18],
  ['bell-tower', 'commons', 5, 5, 7.4, 6.4, art.bellTower],
  ['lamp-entry', 'lighting', 2, 5, 3, 4.8, art.pathLamp],
  ['lamp-well', 'lighting', 2, 5, 5.8, 7.8, art.pathLamp],
  ['lamp-homes', 'lighting', 3, 5, .6, -4.2, art.pathLamp],
  ['lamp-market', 'lighting', 4, 5, 8.4, .2, art.pathLamp],
];

function disposeParts(parts) {
  for (const part of parts || []) {
    part.group.removeFromParent();
    part.group.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose(); object.material.dispose();
    });
  }
}

function restoreMeshes(entry, retainedOnly = false) {
  for (const [mesh, visible] of entry.meshVisibility || []) {
    mesh.visible = visible && (!retainedOnly || entry.retained.has(mesh));
  }
}

function retainSharedParts(previous, next) {
  const before = previous.model, after = next.model;
  if (!before.upgradeFamily || before.upgradeFamily !== after.upgradeFamily) return;
  const retainedBefore = new Set(), retainedAfter = new Set();
  for (const part of before.upgradeParts) {
    const match = after.upgradeParts.find(candidate => candidate.id === part.id && candidate.version === part.version);
    if (!match) continue;
    part.meshes.forEach(mesh => retainedBefore.add(mesh));
    match.meshes.forEach(mesh => retainedAfter.add(mesh));
  }
  if (!retainedBefore.size || !retainedAfter.size) return;
  previous.retained = retainedBefore; next.retained = retainedAfter;
  next.previous = previous;
  for (const entry of [previous, next]) {
    entry.meshVisibility = new Map();
    entry.model.group.traverse(object => {
      if (object.isMesh) entry.meshVisibility.set(object, object.visible);
    });
  }
}

// Split the authored voxel runs into wall/roof courses for construction, without
// changing the complete model or its shared materials. Retained meshes stay in
// the original model; only changed parts get proxies. Fine details arrive last.
function constructionParts(entry) {
  const root = entry.model.group;
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), rows = new Map();
  const instance = new THREE.Matrix4(), matrix = new THREE.Matrix4();
  const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const add = (geometry, material, transform, details = false) => {
    const copy = geometry.clone().applyMatrix4(transform);
    copy.computeBoundingBox();
    const y = copy.boundingBox.getCenter(new THREE.Vector3()).y;
    const row = (details ? 1000 : 0) + Math.floor((y + .001) / (.4 * TILE));
    // Only position, normals and optional vertex color are needed by the palette.
    for (const attribute of Object.keys(copy.attributes)) {
      if (!['position', 'normal', 'color'].includes(attribute)) copy.deleteAttribute(attribute);
    }
    if (material.vertexColors && !copy.hasAttribute('color')) {
      copy.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(copy.attributes.position.count * 3).fill(1), 3));
    }
    const flat = copy.index ? copy.toNonIndexed() : copy;
    if (flat !== copy) copy.dispose();
    if (!rows.has(row)) rows.set(row, new Map());
    const materials = rows.get(row);
    if (!materials.has(material)) materials.set(material, []);
    materials.get(material).push(flat);
  };
  root.traverse(object => {
    if (!object.isMesh || !object.visible || object.userData.ambientParticle || entry.retained?.has(object)) return;
    for (let parent = object.parent; parent && parent !== root; parent = parent.parent) if (!parent.visible) return;
    if (object.material.transparent && object.material.opacity < .3) return; // Smoke, not construction.
    matrix.multiplyMatrices(inverse, object.matrixWorld);
    if (!object.isInstancedMesh) {
      if (!Array.isArray(object.material)) add(object.geometry, object.material, matrix, true);
      return;
    }
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, instance);
      const transform = new THREE.Matrix4().multiplyMatrices(matrix, instance);
      transform.decompose(position, rotation, scale);
      const parameters = object.geometry.parameters;
      if (!parameters?.height) { add(object.geometry, object.material, transform); continue; }
      const height = parameters.height * scale.y;
      const courses = Math.max(1, Math.ceil(height / (.4 * TILE)));
      for (let course = 0; course < courses; course++) {
        const offset = new THREE.Vector3(0, -height / 2 + height / courses * (course + .5), 0).applyQuaternion(rotation);
        const partScale = scale.clone(); partScale.y /= courses;
        const partMatrix = new THREE.Matrix4().compose(position.clone().add(offset), rotation, partScale);
        add(object.geometry, object.material, partMatrix);
      }
    }
  });
  return [...rows].sort(([a], [b]) => a - b).map(([row, materials]) => {
    const group = new THREE.Group(); group.name = `${entry.id}-course-${row}`;
    const ownedMaterials = [];
    for (const [source, geometries] of materials) {
      const geometry = mergeGeometries(geometries);
      geometries.forEach(item => item.dispose());
      const material = source.clone();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
      ownedMaterials.push({ material, source, opacity: source.opacity });
    }
    entry.root.add(group);
    return { group, materials: ownedMaterials };
  });
}

function renderConstruction(entry, amount, incoming, reduced) {
  const t = clamp(amount);
  const retaining = Boolean(entry.retained?.size);
  entry.root.visible = incoming ? t > 0 : t < 1 || retaining;
  if (t === 0 || t === 1) {
    entry.model.group.visible = true;
    restoreMeshes(entry, !incoming && t === 1);
    disposeParts(entry.parts); entry.parts = null;
    // Hand over the retained structure only when the upgraded part is complete.
    // The two complete variants are never drawn on top of each other.
    if (incoming && t === 1 && entry.previous) entry.previous.root.visible = false;
    return;
  }
  if (!entry.parts) {
    restoreMeshes(entry);
    entry.parts = constructionParts(entry);
  }
  entry.model.group.visible = !incoming && retaining;
  if (!incoming && retaining) restoreMeshes(entry, true);
  entry.parts.forEach((part, index, parts) => {
    const order = incoming ? index : parts.length - index - 1;
    const local = clamp((t - order / parts.length * .76) / .24);
    const progress = ease(local);
    part.group.visible = incoming ? local > 0 : local < 1;
    part.group.position.y = reduced ? 0 : incoming ? (1 - progress) * .65 * TILE : progress * .45 * TILE;
    for (const { material, source, opacity } of part.materials) {
      material.emissiveIntensity = source.emissiveIntensity;
      material.transparent = source.transparent || !incoming;
      material.opacity = opacity * (incoming ? 1 : 1 - progress);
    }
  });
}

export function createSettlementDevelopment({ ground = false } = {}) {
  const group = new THREE.Group(); group.name = 'settlement-tier-study';
  const entries = sites.map(([id, parcel, from, until, x, z, create, yaw = 0, y = 0]) => {
    const model = create(), root = new THREE.Group();
    root.name = `${id}-tier-${from}`; root.position.set(x * TILE, y * TILE, z * TILE); root.rotation.y = yaw;
    root.add(model.group); group.add(root);
    return { id, parcel, from, until, root, model, parts: null,
      retained: null, meshVisibility: null, previous: null };
  });
  group.updateMatrixWorld(true);
  const contentBounds = entries.map(entry => {
    const bounds = entry.model.bounds.clone().applyMatrix4(entry.root.matrixWorld);
    bounds.min.divideScalar(TILE); bounds.max.divideScalar(TILE);
    bounds.translate(new THREE.Vector3(-.1, 0, -.1));
    return bounds;
  });
  const landCells = settlementCells({ margin: 1, contentBounds });
  // Carry the central entrance out to the finished southern shore, including
  // breathing room around all future buildings and furnishings.
  const southEdge = Math.max(...landCells.map(cell => cell.gz));
  const landKeys = new Set(landCells.map(cell => `${cell.gx},${cell.gz}`));
  for (let gz = 8; gz <= southEdge; gz++) for (let gx = -1; gx <= 1; gx++) {
    if (!landKeys.has(`${gx},${gz}`)) landCells.push({ gx, gz, dx: gx, dz: gz, dist: Math.hypot(gx, gz) });
  }
  const plinth = ground ? art.islandPlinth(landCells) : null;
  if (plinth) group.add(plinth);
  const groundRoads = plinth?.userData.roadSurface;
  const bounds = new THREE.Box3().setFromObject(group);
  // Include construction lift in the single framing envelope used by all tiers.
  bounds.max.y += .65 * TILE;
  let tier = 1, transition = null;
  const belongs = (entry, value) => entry.from <= value && entry.until >= value;
  const reset = value => {
    tier = settlementTier(value); transition = null;
    groundRoads?.setTier(tier);
    for (const entry of entries) {
      disposeParts(entry.parts); entry.parts = null;
      restoreMeshes(entry);
      entry.retained = entry.meshVisibility = entry.previous = null;
      entry.model.group.visible = true;
      entry.root.visible = belongs(entry, tier);
    }
  };
  const setConstructionProgress = (amount, reduced = false) => {
    if (!transition) return;
    const t = clamp(amount), { parcels } = transition;
    groundRoads?.setConstructionProgress(t);
    for (let index = 0; index < parcels.length; index++) {
      const { outgoing, incoming } = parcels[index];
      const local = clamp(t * parcels.length - index);
      const dismantle = outgoing.length ? .25 : 0;
      for (const entry of outgoing) renderConstruction(entry, local / dismantle, false, reduced);
      for (const entry of incoming) renderConstruction(entry, (local - dismantle) / (1 - dismantle), true, reduced);
    }
  };
  const study = {
    group, bounds, landCells,
    entriesAt(value = tier) { return entries.filter(entry => belongs(entry, settlementTier(value))); },
    allEntries: entries,
    get tier() { return tier; },
    get upgrading() { return Boolean(transition); },
    setTier: reset,
    beginUpgrade(value) {
      const target = settlementTier(value);
      if (target <= 1) { reset(1); return null; }
      reset(target - 1);
      const outgoing = entries.filter(entry => belongs(entry, tier) && !belongs(entry, target));
      const incoming = entries.filter(entry => !belongs(entry, tier) && belongs(entry, target));
      for (const entry of incoming) {
        const previous = outgoing.find(candidate => candidate.id === entry.id && candidate.parcel === entry.parcel);
        if (previous) retainSharedParts(previous, entry);
      }
      const changes = [...outgoing, ...incoming];
      const order = ['square', 'storehouse', 'homes', 'well', 'market', 'commons', 'gardens', 'lighting'];
      const parcels = order.filter(parcel => changes.some(entry => entry.parcel === parcel)).map(parcel => ({
        outgoing: outgoing.filter(entry => entry.parcel === parcel), incoming: incoming.filter(entry => entry.parcel === parcel),
      }));
      const focus = new THREE.Box3();
      for (const entry of changes) {
        entry.root.updateWorldMatrix(true, true);
        focus.union(entry.model.bounds.clone().applyMatrix4(entry.root.matrixWorld));
      }
      if (groundRoads) {
        groundRoads.beginUpgrade(target);
        focus.union(groundRoads.bounds.clone().translate(new THREE.Vector3(.1 * TILE, 0, .1 * TILE)).applyMatrix4(group.matrixWorld));
      }
      focus.max.y += .65 * TILE;
      transition = { target, parcels };
      setConstructionProgress(0);
      return focus;
    },
    setConstructionProgress,
    finishUpgrade() { if (transition) reset(transition.target); },
    animate(time, working, reduced, elapsed) {
      for (const entry of entries) {
        if (entry.root.visible) entry.model.animate(time, working, reduced, elapsed);
      }
    },
    setLighting(lighting) { entries.forEach(entry => entry.model.setLighting?.(lighting)); },
    dispose() {
      reset(tier);
    },
  };
  reset(1);
  return study;
}
