import { MODEL_VOXEL, THREE, createVoxelLantern, createVoxelModel, mats } from '../../core/shared.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createSettlementStorehouse(site) {
  const group = new THREE.Group();
  group.name = 'settlement-storehouse';
  group.position.set(site.x, site.y, site.z);
  const yaw = Math.atan2(site.outward.x, site.outward.z);
  group.rotation.y = yaw;
  const cargoGroup = new THREE.Group();
  group.add(cargoGroup);
  const colliders = [];
  const localToWorld = (x, z) => ({
    x: site.x + x * Math.cos(yaw) + z * Math.sin(yaw),
    z: site.z - x * Math.sin(yaw) + z * Math.cos(yaw),
  });
  const parts = [];
  // All structural runs share their exact visible bounds with physics.
  const run = (material, at, size) => {
    parts.push({ material, at, size });
    const [x, y, z] = at;
    const [width, height, depth] = size;
    const world = localToWorld((x - 5.5 + width / 2) * MODEL_VOXEL, (z + depth / 2) * MODEL_VOXEL);
    colliders.push({ shape: 'box', x: world.x, y: site.y + y * MODEL_VOXEL, z: world.z,
      width: width * MODEL_VOXEL, height: height * MODEL_VOXEL, depth: depth * MODEL_VOXEL, yaw });
  };
  run(mats.stone, [0, 0, 0], [11, 1, 9]);
  run(mats.tractorCream, [0, 1, 8], [11, 6, 1]);
  for (const x of [0, 10]) {
    run(mats.tractorCream, [x, 1, 0], [1, 6, 3]);
    run(mats.tractorCream, [x, 1, 6], [1, 6, 2]);
    run(mats.tractorCream, [x, 1, 3], [1, 2, 3]);
    run(mats.tractorCream, [x, 5, 3], [1, 2, 3]);
    // Recessed glass between sill, jambs and lintel.
    run(mats.cab, [x === 0 ? 1 : 9, 3, 3], [1, 2, 3]);
  }
  for (const x of [1, 9]) run(mats.bridgeDark, [x, 1, 0], [1, 6, 1]);
  run(mats.bridgeDark, [1, 6, 0], [9, 1, 1]);
  // Stepped gables, roof courses, and ridge above the open loading doorway.
  for (let course = 0; course < 3; course++) {
    const inset = course * 2;
    for (const z of [0, 8]) run(mats.tractorCream, [inset, 7 + course, z], [11 - inset * 2, 1, 1]);
    for (const x of [inset - 1, 10 - inset]) run(mats.red, [x, 7 + course, -1], [2, 1, 11]);
  }
  run(mats.red, [5, 10, -1], [1, 1, 11]);
  group.add(createVoxelModel(parts, { name: 'settlement-storehouse-model', origin: [-5.5, 0, 0] }));
  const lanternGlowMaterial = new THREE.MeshStandardMaterial({ color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: .25, roughness: .38 });
  lanternGlowMaterial.name = 'storehouse-lantern-glow';
  const { group: lantern } = createVoxelLantern({ glowMaterial: lanternGlowMaterial, hanging: true, name: 'storehouse-lantern' });
  lantern.position.set(0, 1.5, -.2);
  group.add(lantern);
  const lanternPositions = [lantern.position.clone()];
  const lightSurfaceQuads = [[new THREE.Vector3(-1.4, .015, -1.4), new THREE.Vector3(1.4, .015, -1.4),
    new THREE.Vector3(-1.4, .015, 0), new THREE.Vector3(1.4, .015, 0)]];
  const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0xd4743f, roughness: .82 });
  const cargoDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3d29, roughness: .88 });
  const materials = [lanternGlowMaterial, cargoMaterial, cargoDarkMaterial];
  let loadRatio = 0;
  let cargoKind = 'crops';
  let transferActive = false;
  let transferPulseCursor = 0;
  let elapsed = 0;
  let receivingTime = null;
  let lanternMaterials = null;

  const crates = [];
  for (const [index, position] of [[0, [-.4, .4, .4]], [1, [.2, .4, .4]], [2, [-.2, .8, .4]]]) {
    const crateParts = [];
    for (let vx = 0; vx < 2; vx++) for (let vy = 0; vy < 2; vy++) for (let vz = 0; vz < 2; vz++) {
      const darkCorner = (vx + vy + vz) % 3 === 0;
      crateParts.push({
        material: darkCorner ? cargoDarkMaterial : cargoMaterial,
        at: [vx, vy, vz],
        size: [1, 1, 1],
      });
    }
    const crate = createVoxelModel(crateParts, { name: 'cargo-crate', origin: [-1, -1, -1] });
    crate.position.set(...position);
    crate.userData.basePosition = new THREE.Vector3(...position);
    crate.userData.pop = 0;
    crate.visible = false;
    cargoGroup.add(crate);
    crates[index] = crate;
  }

  const stagedBales = [];
  for (const [index, position] of [[0, [-.4, .5, .6]], [1, [.4, .5, .6]], [2, [-.4, 1.1, .6]], [3, [.4, 1.1, .6]]]) {
    const bale = createVoxelModel([
      { material: mats.bale, at: [0, 0, 0], size: [4, 3, 1] },
      { material: mats.baleBand, at: [0, 0, 1], size: [4, 3, 1] },
      { material: mats.bale, at: [0, 0, 2], size: [4, 3, 2] },
      { material: mats.baleBand, at: [0, 0, 4], size: [4, 3, 1] },
      { material: mats.bale, at: [0, 0, 5], size: [4, 3, 1] },
    ], { name: 'cargo-hay-bale', origin: [-2, -1.5, -3] });
    bale.position.set(...position);
    bale.userData.basePosition = new THREE.Vector3(...position);
    bale.userData.pop = 0;
    bale.visible = false;
    cargoGroup.add(bale);
    stagedBales[index] = bale;
  }

  const stagedMilk = [];
  const milkMaterial = new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: .62, metalness: .28 });
  const milkBandMaterial = new THREE.MeshStandardMaterial({ color: 0x6fa9bd, roughness: .68, metalness: .16 });
  materials.push(milkMaterial, milkBandMaterial);
  for (const [index, position] of [[0, [-.6, .4, .4]], [1, [0, .4, .4]], [2, [.6, .4, .4]], [3, [0, 1, .4]]]) {
    const can = createVoxelModel([
      { material: milkBandMaterial, at: [0, 0, 0], size: [2, 1, 2] },
      { material: milkMaterial, at: [0, 1, 0], size: [2, 1, 2] },
      { material: milkBandMaterial, at: [0, 2, 0], size: [2, 1, 2] },
      { material: milkBandMaterial, at: [0, 3, 0], size: [1, 1, 1] },
    ], { name: 'cargo-milk-can', origin: [-1, -1, -1] });
    can.position.set(...position); can.userData.basePosition = new THREE.Vector3(...position); can.userData.pop = 0; can.visible = false;
    cargoGroup.add(can); stagedMilk[index] = can;
  }

  const cargoItems = () => cargoKind === 'hay-bale' ? stagedBales : cargoKind === 'milk' ? stagedMilk : crates;

  return {
    group,
    colliders,
    occluders: [group],
    lanternPositions,
    lightSurfaceQuads,
    isNear(x, z, range = 3.15) {
      const dx = x - site.x;
      const dz = z - site.z;
      // Deliver from the front yard, never through the rear wall.
      return dx * Math.sin(yaw) + dz * Math.cos(yaw) <= .2 && Math.hypot(dx, dz) <= range;
    },
    unloadTarget() {
      const target = localToWorld(0, .4);
      return { ...target, y: site.y + .9 };
    },
    transferPort() {
      return this.unloadTarget();
    },
    setTransferState({ active }) {
      transferActive = active;
      if (!active) {
        const items = cargoItems().filter(item => item.visible);
        items.forEach(item => { item.userData.pop = Math.max(item.userData.pop || 0, reducedMotion ? .18 : .72); });
      }
    },
    pulseTransfer() {
      const items = cargoItems().filter(item => item.visible);
      if (!items.length) return;
      const item = items[transferPulseCursor++ % items.length];
      item.userData.pop = Math.max(item.userData.pop || 0, reducedMotion ? .12 : .38);
    },
    setLoadRatio(nextRatio) {
      loadRatio = THREE.MathUtils.clamp(nextRatio, 0, 1);
      const previousItems = new Set(cargoItems().filter(item => item.visible));
      for (const item of [...crates, ...stagedBales, ...stagedMilk]) item.visible = false;
      const items = cargoItems();
      items.forEach((item, index) => {
        item.position.copy(item.userData.basePosition);
        item.scale.set(1, 1, 1);
        const visible = loadRatio > index / items.length + .001;
        if (visible && !previousItems.has(item)) item.userData.pop = reducedMotion ? .15 : 1;
        item.visible = visible;
      });
    },
    setCargoKind(nextKind) {
      cargoKind = ['hay-bale', 'milk'].includes(nextKind) ? nextKind : 'crops';
      this.setLoadRatio(loadRatio);
    },
    setNightAmount(amount, lanternAmount = amount) {
      if (!lanternMaterials) {
        lanternMaterials = new Set();
        group.traverse(child => {
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            if (material?.name === 'storehouse-lantern-glow') lanternMaterials.add(material);
          }
        });
      }
      lanternMaterials.forEach(material => {
        material.emissiveIntensity = .25 + THREE.MathUtils.clamp(lanternAmount, 0, 1) * 2.75;
      });
    },
    receiveShipment() {
      receivingTime = 0;
    },
    cinematicView() {
      const cameraPoint = localToWorld(-4.5, -6);
      return {
        target: new THREE.Vector3(site.x, site.y + 1, site.z),
        camera: new THREE.Vector3(cameraPoint.x, site.y + 5, cameraPoint.z),
      };
    },
    update(dt) {
      elapsed += dt;
      let shipmentReceived = false;
      if (receivingTime !== null) {
        receivingTime += dt;
        const progress = Math.min(1, receivingTime / (reducedMotion ? .35 : 1.4));
        cargoItems().forEach(item => {
          if (!item.visible) return;
          item.position.copy(item.userData.basePosition);
          if (!reducedMotion) {
            item.position.z += progress * .6;
            item.scale.setScalar(1 - progress * .8);
          }
        });
        if (progress >= 1) {
          this.setLoadRatio(0);
          receivingTime = null;
          shipmentReceived = true;
        }
      }
      else cargoItems().forEach(item => {
        if (!item.visible) return;
        item.userData.pop = Math.max(0, item.userData.pop - dt * 4.5);
        const pop = item.userData.pop;
        item.position.copy(item.userData.basePosition);
        item.position.y += pop * .08 + (!reducedMotion && transferActive ? Math.sin(elapsed * 12) * .012 : 0);
        item.scale.set(1 + pop * .14, 1 - pop * .12, 1 + pop * .14);
      });
      return { shipmentReceived };
    },
    dispose() {
      for (const material of materials) material.dispose();
    },
  };
}
