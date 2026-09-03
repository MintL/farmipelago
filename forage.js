import { TILE, THREE, gridKey, mats } from './shared.js';

const INITIAL_BALE_CAPACITY = 32;

export function createForageSystem(terrain, group, onChange = () => {}) {
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
      transform.position.set(bale.x, bale.y + .28, bale.z);
      transform.rotation.set(0, bale.heading, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      baleBodies.setMatrixAt(index, transform.matrix);
      for (const offset of [-.27, .27]) {
        for (const yOffset of [.002, .558]) {
          transform.position.set(
            bale.x + Math.sin(bale.heading) * offset,
            bale.y + yOffset,
            bale.z + Math.cos(bale.heading) * offset,
          );
          transform.rotation.set(0, bale.heading, 0);
          transform.scale.set(.86, .035, .13);
          transform.updateMatrix();
          baleBands.setMatrixAt(bandIndex++, transform.matrix);
        }
        for (const xOffset of [-.422, .422]) {
          transform.position.set(
            bale.x + Math.cos(bale.heading) * xOffset + Math.sin(bale.heading) * offset,
            bale.y + .28,
            bale.z - Math.sin(bale.heading) * xOffset + Math.cos(bale.heading) * offset,
          );
          transform.rotation.set(0, bale.heading, 0);
          transform.scale.set(.035, .56, .13);
          transform.updateMatrix();
          baleBands.setMatrixAt(bandIndex++, transform.matrix);
        }
      }
    });
    updateCount(baleBodies, bales.length);
    updateCount(baleBands, bandIndex);
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
    spawnBale(x, y, z, heading) {
      const bale = { id: `bale-${nextBaleId++}`, x, y, z, heading };
      bales.push(bale);
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
      refreshBales();
      if (notify) onChange();
      return true;
    },
    removeBale(id) {
      const index = bales.findIndex(bale => bale.id === id);
      if (index === -1) return false;
      bales.splice(index, 1);
      refreshBales();
      onChange();
      return true;
    },
    persistentState() {
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
      bales.length = 0;
      for (const saved of Array.isArray(savedState?.bales) ? savedState.bales : []) {
        if (![saved?.x, saved?.y, saved?.z, saved?.heading].every(Number.isFinite)) continue;
        const id = typeof saved.id === 'string' ? saved.id : `bale-${nextBaleId++}`;
        bales.push({ id, x: saved.x, y: saved.y, z: saved.z, heading: saved.heading });
        const numericId = Number(id.match(/(\d+)$/)?.[1]);
        if (Number.isFinite(numericId)) nextBaleId = Math.max(nextBaleId, numericId + 1);
      }
      refreshField();
      refreshBales();
    },
    dispose() {
      looseGeometry.dispose();
      baleGeometry.dispose();
      bandGeometry.dispose();
    },
  };
}
