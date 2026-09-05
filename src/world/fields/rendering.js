import { TILE, THREE, gridKey, mats } from '../../core/shared.js';
import { READY_PULSE_SECONDS } from './config.js';

const ease = value => value * value * (3 - 2 * value);

export function createCropInstances(tileCapacity, group) {
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
    refreshFurrows(tiles) {
      const matrix = new THREE.Matrix4();
      let count = 0;
      for (const tile of tiles) {
        for (const offset of [-.26, 0, .26]) {
          matrix.makeTranslation(tile.x, tile.topY + .018, tile.z + offset);
          furrows.setMatrixAt(count++, matrix);
        }
      }
      updateInstances(furrows, count);
    },
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

export function createFieldEffects(group) {
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

export function renderCropTile(instances, tile) {
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

export function tileAt(x, z, terrain) {
  return terrain.get(gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5)));
}

export function tileAtLevel(x, z, levelY, terrain) {
  const tile = tileAt(x, z, terrain);
  if (!tile || (levelY !== null && Math.abs(tile.topY - levelY) > .01)) return null;
  return tile;
}
