import { TILE, THREE, gridKey, mats } from './shared.js';

const INITIAL_BALE_CAPACITY = 32;

export function createForageSystem(terrain, group, physics, onChange = () => {}) {
  const forageGroup = new THREE.Group();
  forageGroup.name = 'forage';
  group.add(forageGroup);
  const looseGeometry = new THREE.BoxGeometry(.42, .045, .09);
  const loose = new THREE.InstancedMesh(looseGeometry, mats.cutGrass, terrain.size * 3);
  loose.name = 'loose-cut-grass';
  loose.castShadow = true;
  loose.receiveShadow = true;
  loose.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  forageGroup.add(loose);

  const baleGeometry = new THREE.BoxGeometry(.82, .56, 1.15);
  const bandGeometry = new THREE.BoxGeometry(1, 1, 1);
  let baleCapacity = INITIAL_BALE_CAPACITY;
  let baleBodies;
  let baleBands;
  let nextBaleId = 1;
  const bales = [];
  const transform = new THREE.Object3D();
  const baleQuaternion = new THREE.Quaternion();
  const localOffset = new THREE.Vector3();

  const tileAt = (x, z, levelY = null) => {
    const tile = terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
    if (!tile || (levelY !== null && Math.abs(tile.topY - levelY) > .01)) return null;
    return tile;
  };

  const updateCount = (mesh, count) => {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (count) mesh.computeBoundingSphere();
  };

  const refreshField = () => {
    let looseCount = 0;
    for (const tile of terrain.values()) {
      const looseLitres = Math.max(0, tile.looseGrassLitres || 0);
      if (looseLitres) {
        const fullness = THREE.MathUtils.clamp(looseLitres / 200, .35, 1);
        for (let index = 0; index < 3; index++) {
          transform.position.set(tile.x + (index - 1) * .18, tile.topY + .035, tile.z + (index % 2 ? .16 : -.12));
          transform.rotation.set(0, (index - 1) * .48, 0);
          transform.scale.set(.72 + fullness * .28, fullness, .72 + fullness * .28);
          transform.updateMatrix();
          loose.setMatrixAt(looseCount++, transform.matrix);
        }
      }
    }
    updateCount(loose, looseCount);
  };

  const createBaleMeshes = () => {
    if (baleBodies) forageGroup.remove(baleBodies, baleBands);
    baleBodies = new THREE.InstancedMesh(baleGeometry, mats.bale, baleCapacity);
    baleBands = new THREE.InstancedMesh(bandGeometry, mats.baleBand, baleCapacity * 8);
    baleBodies.name = 'hay-bales';
    baleBands.name = 'hay-bale-bands';
    baleBodies.castShadow = baleBands.castShadow = true;
    baleBodies.receiveShadow = baleBands.receiveShadow = true;
    baleBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    baleBands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    forageGroup.add(baleBodies, baleBands);
  };

  const refreshBales = () => {
    while (bales.length > baleCapacity) baleCapacity *= 2;
    if (!baleBodies || baleBodies.instanceMatrix.count < baleCapacity) createBaleMeshes();
    let bandIndex = 0;
    bales.forEach((bale, index) => {
      const rotation = bale.rotation;
      if ([rotation?.x, rotation?.y, rotation?.z, rotation?.w].every(Number.isFinite)) {
        baleQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w).normalize();
      }
      else baleQuaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, bale.heading);
      const center = localOffset.set(bale.x, bale.y + .28, bale.z);
      transform.position.copy(center);
      transform.quaternion.copy(baleQuaternion);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      baleBodies.setMatrixAt(index, transform.matrix);
      for (const offset of [-.27, .27]) {
        for (const yOffset of [.002, .558]) {
          transform.position.set(0, yOffset - .28, offset).applyQuaternion(baleQuaternion).add(center);
          transform.quaternion.copy(baleQuaternion);
          transform.scale.set(.86, .035, .13);
          transform.updateMatrix();
          baleBands.setMatrixAt(bandIndex++, transform.matrix);
        }
        for (const xOffset of [-.422, .422]) {
          transform.position.set(xOffset, 0, offset).applyQuaternion(baleQuaternion).add(center);
          transform.quaternion.copy(baleQuaternion);
          transform.scale.set(.035, .56, .13);
          transform.updateMatrix();
          baleBands.setMatrixAt(bandIndex++, transform.matrix);
        }
      }
    });
    updateCount(baleBodies, bales.length);
    updateCount(baleBands, bandIndex);
  };

  const yawRotation = heading => ({
    x: 0,
    y: Math.sin(heading * .5),
    z: 0,
    w: Math.cos(heading * .5),
  });

  const syncPhysics = () => {
    let changed = false;
    for (const bale of bales) {
      const state = physics.baleState(bale.id);
      if (!state) continue;
      const y = state.position.y - .28;
      const rotationChanged = !bale.rotation
        || Math.abs(bale.rotation.x - state.rotation.x) > .0001
        || Math.abs(bale.rotation.y - state.rotation.y) > .0001
        || Math.abs(bale.rotation.z - state.rotation.z) > .0001
        || Math.abs(bale.rotation.w - state.rotation.w) > .0001;
      if (Math.abs(bale.x - state.position.x) <= .0001
        && Math.abs(bale.y - y) <= .0001
        && Math.abs(bale.z - state.position.z) <= .0001
        && !rotationChanged) continue;
      bale.x = state.position.x;
      bale.y = y;
      bale.z = state.position.z;
      bale.rotation = state.rotation;
      changed = true;
    }
    if (changed) refreshBales();
    return changed;
  };

  createBaleMeshes();
  refreshField();

  return {
    hasForage(tile) {
      return Boolean(tile?.looseGrassLitres || 0);
    },
    addLoose(tile, litres) {
      if (!tile || litres <= 0) return false;
      tile.looseGrassLitres = Math.max(0, tile.looseGrassLitres || 0) + litres;
      refreshField();
      return true;
    },
    takeLooseAt(x, z, levelY) {
      const tile = tileAt(x, z, levelY);
      const amount = Math.max(0, tile?.looseGrassLitres || 0);
      if (!amount) return 0;
      tile.looseGrassLitres = 0;
      refreshField();
      onChange();
      return amount;
    },
    spawnBale(x, y, z, heading, motion = {}) {
      const rotation = yawRotation(heading);
      const bale = { id: `bale-${nextBaleId++}`, x, y, z, heading, rotation };
      bales.push(bale);
      physics.createBale(bale.id, { x, y: y + .28, z }, rotation, motion);
      refreshBales();
      onChange();
      return bale;
    },
    hasBale(id) {
      return bales.some(bale => bale.id === id);
    },
    baleNear(x, z, levelY, radius = .75) {
      let nearest = null;
      let nearestDistance = radius;
      for (const bale of bales) {
        if (Math.abs(bale.y - levelY) > .65) continue;
        const distance = Math.hypot(bale.x - x, bale.z - z);
        if (distance > nearestDistance) continue;
        nearest = bale;
        nearestDistance = distance;
      }
      return nearest;
    },
    moveBale(id, x, y, z, heading, notify = false) {
      const bale = bales.find(candidate => candidate.id === id);
      if (!bale || ![x, y, z, heading].every(Number.isFinite)) return false;
      bale.x = x;
      bale.y = y;
      bale.z = z;
      bale.heading = heading;
      bale.rotation = yawRotation(heading);
      physics.setBalePose(id, { x, y: y + .28, z }, bale.rotation);
      refreshBales();
      if (notify) onChange();
      return true;
    },
    releaseBale(id, x, y, z, heading, motion = {}) {
      const bale = bales.find(candidate => candidate.id === id);
      if (!bale || ![x, y, z, heading].every(Number.isFinite)) return false;
      bale.x = x;
      bale.y = y;
      bale.z = z;
      bale.heading = heading;
      bale.rotation = yawRotation(heading);
      if (!physics.releaseBale(id, { x, y: y + .28, z }, bale.rotation, motion)) return false;
      refreshBales();
      onChange();
      return true;
    },
    removeBale(id) {
      const index = bales.findIndex(bale => bale.id === id);
      if (index === -1) return false;
      physics.removeBale(id);
      bales.splice(index, 1);
      refreshBales();
      onChange();
      return true;
    },
    persistentState() {
      syncPhysics();
      const tiles = [];
      for (const [key, tile] of terrain) {
        if (!tile.looseGrassLitres) continue;
        tiles.push({
          key,
          looseGrassLitres: Math.max(0, Math.floor(tile.looseGrassLitres || 0)),
        });
      }
      return { tiles, bales: bales.map(bale => ({ ...bale })) };
    },
    restorePersistentState(savedState) {
      for (const tile of terrain.values()) {
        tile.looseGrassLitres = 0;
      }
      for (const savedTile of Array.isArray(savedState?.tiles) ? savedState.tiles : []) {
        const tile = terrain.get(savedTile?.key);
        if (!tile || tile.water) continue;
        tile.looseGrassLitres = Math.max(0, Math.floor(Number(savedTile.looseGrassLitres) || 0))
          + Math.max(0, Math.floor(Number(savedTile.windrowLitres) || 0));
      }
      for (const bale of bales) physics.removeBale(bale.id);
      bales.length = 0;
      for (const saved of Array.isArray(savedState?.bales) ? savedState.bales : []) {
        if (![saved?.x, saved?.y, saved?.z, saved?.heading].every(Number.isFinite)) continue;
        const id = typeof saved.id === 'string' ? saved.id : `bale-${nextBaleId++}`;
        const savedRotation = saved.rotation;
        const rotation = [savedRotation?.x, savedRotation?.y, savedRotation?.z, savedRotation?.w].every(Number.isFinite)
          ? { x: savedRotation.x, y: savedRotation.y, z: savedRotation.z, w: savedRotation.w }
          : yawRotation(saved.heading);
        bales.push({ id, x: saved.x, y: saved.y, z: saved.z, heading: saved.heading, rotation });
        physics.createBale(id, { x: saved.x, y: saved.y + .28, z: saved.z }, rotation, { sleeping: true });
        const numericId = Number(id.match(/(\d+)$/)?.[1]);
        if (Number.isFinite(numericId)) nextBaleId = Math.max(nextBaleId, numericId + 1);
      }
      refreshField();
      refreshBales();
    },
    animate() {
      syncPhysics();
    },
    dispose() {
      for (const bale of bales) physics.removeBale(bale.id);
      looseGeometry.dispose();
      baleGeometry.dispose();
      bandGeometry.dispose();
    },
  };
}
