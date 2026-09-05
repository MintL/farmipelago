import { MODEL_VOXEL, THREE, createVoxelLantern, createVoxelModel, mats } from '../../core/shared.js';

const DECK_HEIGHT = .18;
const DECK_CLEARANCE = .04;
const DECK_WIDTH = 4.9;
const DECK_DEPTH = 5.4;
const DECK_CENTER_Z = 2.12;
const FIRST_VISIT_DELAY = 5;
const REPEAT_VISIT_DELAY = 60;
const APPROACH_SECONDS = 1.1;
const DESCEND_SECONDS = 2.5;
const DWELL_SECONDS = 1.4;
const PICKUP_SECONDS = 1;
const ASCEND_SECONDS = 2.5;
const DEPART_SECONDS = 1.3;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ease = value => value * value * (3 - 2 * value);
const easeOutCubic = value => 1 - (1 - value) ** 3;
const easeInCubic = value => value ** 3;

export function cargoDeckContains(site, x, z, margin = 0) {
  const yaw = Math.atan2(site.outward.x, site.outward.z);
  const dx = x - site.x;
  const dz = z - site.z;
  const localX = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const localZ = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  return Math.abs(localX) <= DECK_WIDTH * .5 + margin &&
    Math.abs(localZ - DECK_CENTER_Z) <= DECK_DEPTH * .5 + margin;
}

export function createCargoPort(site, worldSeed = 0) {
  const group = new THREE.Group();
  const padRoot = new THREE.Group();
  const staticGroup = new THREE.Group();
  const cargoGroup = new THREE.Group();
  const craftRoot = new THREE.Group();
  const colliders = [];
  const outwardYaw = Math.atan2(site.outward.x, site.outward.z);
  let lanternRandomState = (Number(worldSeed) ^ Math.imul(Math.round(site.x * 97), 0x45d9f3b) ^ Math.imul(Math.round(site.z * 101), 0x119de1f3)) >>> 0;
  const lanternRandom = () => {
    lanternRandomState = (Math.imul(lanternRandomState, 1664525) + 1013904223) >>> 0;
    return lanternRandomState / 0x100000000;
  };
  let loadRatio = 0;
  let phase = 'cooldown';
  let phaseTime = 0;
  let cooldown = FIRST_VISIT_DELAY;
  let startDistance = 34;
  let pickupQueued = false;
  let shipmentCollected = false;
  let cargoKind = 'crops';
  let transferActive = false;
  let transferPulseCursor = 0;

  group.name = 'cargo-port';
  const deckBaseY = site.y + DECK_CLEARANCE;
  group.position.set(site.x, deckBaseY, site.z);
  group.rotation.y = outwardYaw;
  padRoot.name = 'cargo-pad';
  padRoot.userData.occlusionIgnoreAtVehicle = vehicleState => Boolean(vehicleState.grounded)
    && cargoDeckContains(site, vehicleState.x, vehicleState.z, .35)
    && vehicleState.y <= site.y + DECK_CLEARANCE + DECK_HEIGHT + .35;
  padRoot.add(staticGroup, cargoGroup);
  group.add(padRoot, craftRoot);

  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x46535a, roughness: .82, metalness: .16 });
  const deckEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: .78, metalness: .22 });
  const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf0c554, emissive: 0x7a4f12, emissiveIntensity: .18, roughness: .72 });
  const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0xd4743f, roughness: .82 });
  const cargoDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3d29, roughness: .88 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x78c7da, emissive: 0x174452, emissiveIntensity: .28, roughness: .2, metalness: .12 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffe990, emissive: 0xffb82d, emissiveIntensity: 1.5, roughness: .35 });
  const redLightMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b55, emissive: 0xa51f18, emissiveIntensity: 1.45, roughness: .35 });
  const lanternGlowMaterial = new THREE.MeshStandardMaterial({ color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: .25, roughness: .38 });
  markingMaterial.name = 'cargo-marking-light';
  lightMaterial.name = 'cargo-warm-light';
  redLightMaterial.name = 'cargo-red-light';
  lanternGlowMaterial.name = 'cargo-lantern-glow';
  const materials = [deckMaterial, deckEdgeMaterial, markingMaterial, cargoMaterial, cargoDarkMaterial, glassMaterial, lightMaterial, redLightMaterial, lanternGlowMaterial];
  const lanternPositions = [];
  const lightSurfaceQuads = [];
  let nightMaterials = null;

  const localToWorld = (x, z) => ({
    x: site.x + x * Math.cos(outwardYaw) + z * Math.sin(outwardYaw),
    z: site.z - x * Math.sin(outwardYaw) + z * Math.cos(outwardYaw),
  });

  const addCollider = (x, y, z, width, height, depth, yaw = 0) => {
    const world = localToWorld(x, z);
    colliders.push({
      shape: 'box',
      x: world.x,
      y: deckBaseY + y,
      z: world.z,
      width,
      height,
      depth,
      yaw: outwardYaw + yaw,
    });
  };

  const deckParts = [];
  const addDeckVoxels = (material, at, size) => deckParts.push({ material, at, size });
  const markingCells = new Set();
  for (let gx = 0; gx < 25; gx++) for (let gz = 0; gz < 27; gz++) {
    const distance = Math.hypot(gx - 12, gz - 14);
    if ((distance >= 5.7 && distance <= 6.7) ||
      (gx === 12 && Math.abs(gz - 14) <= 2) || (gz === 14 && Math.abs(gx - 12) <= 2)) {
      markingCells.add(`${gx},${gz}`);
    }
  }
  for (let gz = 0; gz < 27; gz++) {
    let start = 0;
    while (start < 25) {
      const marked = markingCells.has(`${start},${gz}`);
      let end = start + 1;
      while (end < 25 && markingCells.has(`${end},${gz}`) === marked) end++;
      addDeckVoxels(marked ? markingMaterial : deckMaterial, [start, 0, gz], [end - start, 1, 1]);
      start = end;
    }
  }
  addDeckVoxels(deckEdgeMaterial, [0, 1, 26], [25, 1, 1]);
  for (const edgeX of [0, 24]) {
    addDeckVoxels(deckEdgeMaterial, [edgeX, 1, 16], [1, 2, 10]);
    addDeckVoxels(markingMaterial, [edgeX, 1, 3], [1, 3, 1]);
  }
  addDeckVoxels(cargoDarkMaterial, [2, 1, 0], [7, 1, 4]);
  addDeckVoxels(deckEdgeMaterial, [2, 2, 1], [2, 5, 2]);
  staticGroup.add(createVoxelModel(deckParts, {
    name: 'cargo-pad-model',
    origin: [-12.5, 0, -3],
  }));
  for (let gz = 0; gz < 27; gz++) for (let gx = 0; gx < 25; gx++) {
    const left = (-12.5 + gx) * MODEL_VOXEL;
    const right = left + MODEL_VOXEL;
    const near = (-3 + gz) * MODEL_VOXEL;
    const far = near + MODEL_VOXEL;
    const y = MODEL_VOXEL + .004;
    lightSurfaceQuads.push([
      new THREE.Vector3(left, y, near),
      new THREE.Vector3(right, y, near),
      new THREE.Vector3(left, y, far),
      new THREE.Vector3(right, y, far),
    ]);
  }

  const addHangingLantern = (name, poleX, poleTopY, poleZ, yaw) => {
    const { group: lantern } = createVoxelLantern({
      glowMaterial: lanternGlowMaterial,
      hanging: true,
      name,
    });
    lantern.position.set(
      poleX - Math.sin(yaw) * .5,
      poleTopY - .8,
      poleZ - Math.cos(yaw) * .5,
    );
    lantern.rotation.y = yaw;
    lanternPositions.push(lantern.position.clone().add(new THREE.Vector3(0, .1, 0)));
    staticGroup.add(lantern);
  };

  addHangingLantern('cargo-pole-lantern', -1.9, 1.4, -.2, lanternRandom() * Math.PI * 2);

  // Gameplay collision keeps the established dimensions and positions even
  // though the visible pad now resolves to the small construction grid.
  addCollider(0, 0, DECK_CENTER_Z, DECK_WIDTH, DECK_HEIGHT, DECK_DEPTH);
  addCollider(0, DECK_HEIGHT, 4.77, 5.05, .13, .16);
  for (const x of [-2.37, 2.37]) {
    addCollider(x, DECK_HEIGHT, 3.66, .16, .32, 2.1);
    addCollider(x, DECK_HEIGHT, .05, .22, .5, .22);
  }
  addCollider(-1.5, DECK_HEIGHT, -.14, 1.45, .12, .72);
  addCollider(-2.0, DECK_HEIGHT, -.1, .38, 1.18, .38);

  const companionAnchors = [[-2.16, .48], [2.16, .48], [-2.16, 4.32], [2.16, 4.32]];
  const [companionAnchorX, companionAnchorZ] = companionAnchors[Math.floor(lanternRandom() * companionAnchors.length)];
  const companionX = companionAnchorX + (lanternRandom() - .5) * .18;
  const companionZ = companionAnchorZ + (lanternRandom() - .5) * .24;
  const companionPole = createVoxelModel([
    { material: deckEdgeMaterial, at: [0, 0, 0], size: [2, 6, 2] },
  ], { name: 'cargo-companion-lantern-pole', origin: [-1, 0, -1] });
  companionPole.position.set(companionX, DECK_HEIGHT, companionZ);
  staticGroup.add(companionPole);
  addHangingLantern(
    'cargo-companion-lantern',
    companionX,
    DECK_HEIGHT + 1.2,
    companionZ,
    lanternRandom() * Math.PI * 2,
  );
  addCollider(companionX, DECK_HEIGHT, companionZ, .38, 1.2, .38);

  const crates = [];
  for (const [index, position] of [[0, [1.48, .39, -.05]], [1, [1.95, .39, -.05]], [2, [1.72, .81, -.05]]]) {
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
  for (const [index, position] of [[0, [1.28, .48, -.05]], [1, [1.96, .48, -.05]], [2, [1.28, 1.07, -.05]], [3, [1.96, 1.07, -.05]]]) {
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
  for (const [index, position] of [[0, [1.25, .42, -.05]], [1, [1.7, .42, -.05]], [2, [2.15, .42, -.05]], [3, [1.7, .92, -.05]]]) {
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

  const craft = createVtol({ deckMaterial, deckEdgeMaterial, markingMaterial, cargoMaterial, cargoDarkMaterial, glassMaterial, lightMaterial, redLightMaterial });
  craftRoot.add(craft.group);
  craftRoot.visible = false;

  const landing = new THREE.Vector3(0, .13, 2.3);
  const hover = new THREE.Vector3(0, 6.4, 2.3);
  const start = new THREE.Vector3(0, 14, startDistance);
  const approachCurve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(-9.6, 15.6, startDistance * .5), hover);
  const departCurve = new THREE.QuadraticBezierCurve3(hover, new THREE.Vector3(10.8, 10.2, startDistance * .52), start);
  const flightPoint = new THREE.Vector3();

  const placeBetween = (from, to, amount) => {
    craftRoot.position.lerpVectors(from, to, ease(amount));
  };

  const placeOnCurve = (curve, amount) => {
    curve.getPoint(amount, flightPoint);
    craftRoot.position.copy(flightPoint);
  };

  const chooseOffscreenStart = camera => {
    startDistance = 34;
    if (camera) {
      for (let attempts = 0; attempts < 5; attempts++) {
        const projected = group.localToWorld(new THREE.Vector3(0, 14, startDistance)).project(camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.18 || Math.abs(projected.y) > 1.18) break;
        startDistance += 12;
      }
    }
    start.set(0, 14, startDistance);
    approachCurve.v1.set(-9.6, 15.6, startDistance * .5);
    departCurve.v1.set(10.8, 10.2, startDistance * .52);
    craftRoot.position.copy(start);
  };

  return {
    group,
    lanternPositions,
    lightSurfaceQuads,
    occluders: [padRoot, craftRoot],
    colliders,
    isNear(x, z, range = 3.15) {
      return Math.hypot(x - site.x, z - site.z) <= range;
    },
    unloadTarget() {
      const target = localToWorld(1.72, -.05);
      return { x: target.x, y: deckBaseY + .92, z: target.z };
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
    setNightAmount(amount, lanternAmountInput = amount) {
      const nightAmount = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
      const lanternAmount = THREE.MathUtils.clamp(Number(lanternAmountInput) || 0, 0, 1);
      if (!nightMaterials) {
        nightMaterials = { marking: new Set(), warm: new Set(), red: new Set(), lantern: new Set() };
        group.traverse(child => {
          const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of childMaterials) {
            if (material?.name === 'cargo-marking-light') nightMaterials.marking.add(material);
            else if (material?.name === 'cargo-warm-light') nightMaterials.warm.add(material);
            else if (material?.name === 'cargo-red-light') nightMaterials.red.add(material);
            else if (material?.name === 'cargo-lantern-glow') nightMaterials.lantern.add(material);
          }
        });
      }
      nightMaterials.marking.forEach(material => { material.emissiveIntensity = .18 + nightAmount * .16; });
      nightMaterials.warm.forEach(material => { material.emissiveIntensity = 1.5 + nightAmount * 1.3; });
      nightMaterials.red.forEach(material => { material.emissiveIntensity = 1.45 + nightAmount * .75; });
      nightMaterials.lantern.forEach(material => { material.emissiveIntensity = .25 + lanternAmount * 2.75; });
    },
    requestPickup(camera) {
      pickupQueued = true;
      if (phase === 'cooldown' || phase === 'ascend' || phase === 'depart') {
        phase = 'approach';
        phaseTime = 0;
        craftRoot.rotation.y = 0;
        chooseOffscreenStart(camera);
        craftRoot.visible = true;
      }
    },
    cinematicView() {
      const deck = localToWorld(0, DECK_CENTER_Z);
      const cameraPoint = localToWorld(-9.4, -7.8);
      const craftPosition = craftRoot.visible ? craftRoot.getWorldPosition(new THREE.Vector3()) : null;
      return {
        deck: new THREE.Vector3(deck.x, deckBaseY + 1.1, deck.z),
        camera: new THREE.Vector3(cameraPoint.x, deckBaseY + 9.7, cameraPoint.z),
        craft: craftPosition,
        phase,
      };
    },
    update(dt, camera, pickupReady) {
      let departed = false;
      let shipmentPickedUp = false;
      phaseTime += dt;
      if (phase === 'cooldown') {
        if (phaseTime >= cooldown) {
          phase = 'approach';
          phaseTime = 0;
          pickupQueued = false;
          chooseOffscreenStart(camera);
          craftRoot.visible = true;
        }
      }
      else if (phase === 'approach') {
        placeOnCurve(approachCurve, easeOutCubic(Math.min(1, phaseTime / APPROACH_SECONDS)));
        if (phaseTime >= APPROACH_SECONDS) { phase = 'descend'; phaseTime = 0; }
      }
      else if (phase === 'descend') {
        placeBetween(hover, landing, Math.min(1, phaseTime / DESCEND_SECONDS));
        if (phaseTime >= DESCEND_SECONDS) { phase = 'dwell'; phaseTime = 0; }
      }
      else if (phase === 'dwell') {
        craftRoot.position.copy(landing);
        pickupQueued ||= pickupReady;
        if (phaseTime >= DWELL_SECONDS) {
          if (pickupQueued && reducedMotion) {
            shipmentCollected = true;
            shipmentPickedUp = true;
            this.setLoadRatio(0);
          }
          phase = pickupQueued && !reducedMotion ? 'pickup' : 'ascend';
          phaseTime = 0;
        }
      }
      else if (phase === 'pickup') {
        craftRoot.position.copy(landing);
        craftRoot.updateMatrixWorld(true);
        const target = craft.group.localToWorld(craft.cargoTarget.clone());
        cargoGroup.worldToLocal(target);
        cargoItems().forEach((item, index) => {
          if (!item.visible) return;
          const progress = THREE.MathUtils.clamp((phaseTime / PICKUP_SECONDS - index * .16) / .68, 0, 1);
          const amount = ease(progress);
          item.position.lerpVectors(item.userData.basePosition, target, amount);
          item.position.y += Math.sin(progress * Math.PI) * .72;
          const scale = 1 + Math.sin(progress * Math.PI) * .24 - amount * .72;
          item.scale.set(scale, scale * (1 + Math.sin(progress * Math.PI) * .28), scale);
          if (progress >= 1) item.visible = false;
        });
        if (phaseTime >= PICKUP_SECONDS) {
          shipmentCollected = true;
          shipmentPickedUp = true;
          this.setLoadRatio(0);
          phase = 'ascend';
          phaseTime = 0;
        }
      }
      else if (phase === 'ascend') {
        const amount = Math.min(1, phaseTime / ASCEND_SECONDS);
        placeBetween(landing, hover, amount);
        craftRoot.rotation.y = Math.PI * ease(amount);
        if (phaseTime >= ASCEND_SECONDS) { phase = 'depart'; phaseTime = 0; }
      }
      else if (phase === 'depart') {
        placeOnCurve(departCurve, easeInCubic(Math.min(1, phaseTime / DEPART_SECONDS)));
        if (phaseTime >= DEPART_SECONDS) {
          departed = shipmentCollected;
          shipmentCollected = false;
          phase = 'cooldown';
          phaseTime = 0;
          cooldown = REPEAT_VISIT_DELAY;
          craftRoot.visible = false;
          craftRoot.rotation.y = 0;
        }
      }
      cargoItems().forEach(item => {
        if (!item.visible || phase === 'pickup') return;
        item.userData.pop = Math.max(0, item.userData.pop - dt * 4.5);
        const pop = item.userData.pop;
        item.position.copy(item.userData.basePosition);
        item.position.y += pop * .08 + (!reducedMotion && transferActive ? Math.sin(phaseTime * 12 + item.userData.basePosition.x * 2) * .012 : 0);
        item.scale.set(1 + pop * .14, 1 - pop * .12, 1 + pop * .14);
      });
      const flightPower = phase === 'dwell' || phase === 'pickup' ? .48 : 1;
      craft.animate(dt, flightPower, phase === 'dwell' || phase === 'pickup', phase === 'pickup' ? phaseTime / PICKUP_SECONDS : 0);
      return { shipmentPickedUp, departed };
    },
    dispose() {
      for (const material of materials) material.dispose();
    },
  };
}

function createVtol(mats) {
  const group = new THREE.Group();
  const modelRoot = new THREE.Group();
  const rotors = [];
  group.add(modelRoot);
  modelRoot.position.y = .06;

  const bodyParts = [
    { material: mats.cargoDarkMaterial, at: [1, 2, 1], size: [10, 3, 14] },
    { material: mats.cargoMaterial, at: [0, 5, 0], size: [12, 4, 16] },
    { material: mats.cargoMaterial, at: [1, 9, 2], size: [10, 2, 12] },
    { material: mats.markingMaterial, at: [2, 11, 4], size: [8, 2, 8] },
    { material: mats.cargoDarkMaterial, at: [-1, 7, 4], size: [1, 1, 8] },
    { material: mats.cargoDarkMaterial, at: [12, 7, 4], size: [1, 1, 8] },
    { material: mats.glassMaterial, at: [2, 7, -1], size: [8, 3, 1] },
    { material: mats.glassMaterial, at: [3, 10, 0], size: [6, 1, 1] },
    { material: mats.cargoMaterial, at: [4, 5, 16], size: [4, 4, 6] },
    { material: mats.markingMaterial, at: [5, 9, 18], size: [2, 3, 3] },
    { material: mats.markingMaterial, at: [5, 12, 19], size: [2, 4, 2] },
    { material: mats.deckEdgeMaterial, at: [1, 0, 2], size: [1, 1, 12] },
    { material: mats.deckEdgeMaterial, at: [10, 0, 2], size: [1, 1, 12] },
    { material: mats.deckEdgeMaterial, at: [1, 1, 3], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [1, 1, 12], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [10, 1, 3], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [10, 1, 12], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [-5, 8, 3], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [12, 8, 3], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [-5, 8, 13], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [12, 8, 13], size: [5, 1, 2] },
    { material: mats.lightMaterial, at: [5, 5, -1], size: [2, 1, 1] },
    { material: mats.redLightMaterial, at: [-1, 8, 2], size: [1, 1, 1] },
    { material: mats.lightMaterial, at: [12, 8, 2], size: [1, 1, 1] },
  ];
  modelRoot.add(createVoxelModel(bodyParts, {
    name: 'cargo-vtol-body',
    origin: [-6, 0, -9],
  }));

  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(0, 1.53, 1.66);
  modelRoot.add(hatchPivot);
  hatchPivot.add(createVoxelModel([
    { material: mats.cargoDarkMaterial, at: [0, 0, 0], size: [6, 1, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 3, 0], size: [6, 1, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 1, 0], size: [1, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [5, 1, 0], size: [1, 2, 1] },
    { material: mats.cargoMaterial, at: [1, 1, 0], size: [4, 2, 1] },
  ], { name: 'cargo-vtol-hatch', origin: [-3, -4, -.5] }));

  const podParts = [
    { material: mats.cargoDarkMaterial, at: [1, 0, 0], size: [5, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [1, 0, 6], size: [5, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 0, 1], size: [1, 2, 5] },
    { material: mats.cargoDarkMaterial, at: [6, 0, 1], size: [1, 2, 5] },
    { material: mats.deckMaterial, at: [2, 2, 1], size: [3, 1, 1] },
    { material: mats.deckMaterial, at: [2, 2, 5], size: [3, 1, 1] },
    { material: mats.deckMaterial, at: [1, 2, 2], size: [1, 1, 3] },
    { material: mats.deckMaterial, at: [5, 2, 2], size: [1, 1, 3] },
  ];
  const rotorParts = [
    { material: mats.markingMaterial, at: [2, 0, 2], size: [1, 1, 1] },
    { material: mats.markingMaterial, at: [0, 0, 2], size: [2, 1, 1] },
    { material: mats.markingMaterial, at: [3, 0, 2], size: [2, 1, 1] },
    { material: mats.markingMaterial, at: [2, 0, 0], size: [1, 1, 2] },
    { material: mats.markingMaterial, at: [2, 0, 3], size: [1, 1, 2] },
  ];
  for (const side of [-1, 1]) for (const z of [-1, 1]) {
    const pod = new THREE.Group();
    pod.position.set(side * 2.2, 1.66, z);
    pod.add(createVoxelModel(podParts, {
      name: 'cargo-vtol-fan-housing',
      origin: [-3.5, -1, -3.5],
    }));
    const rotor = new THREE.Group();
    rotor.position.y = .46;
    rotor.add(createVoxelModel(rotorParts, {
      name: 'cargo-vtol-rotor',
      origin: [-2.5, -.5, -2.5],
      receive: false,
    }));
    pod.add(rotor);
    modelRoot.add(pod);
    rotors.push(rotor);
  }
  group.scale.setScalar(.92);

  return {
    group,
    cargoTarget: new THREE.Vector3(0, 1.13, 1.38),
    animate(dt, power, landed, pickupProgress = 0) {
      for (const rotor of rotors) rotor.rotation.y += dt * (18 + power * 42);
      group.position.y = landed ? Math.sin(performance.now() * .003) * .025 : 0;
      group.rotation.z = landed ? 0 : Math.sin(performance.now() * .0018) * .025;
      hatchPivot.rotation.x = -ease(THREE.MathUtils.clamp(pickupProgress * 2.2, 0, 1)) * 1.3;
      const loadBounce = pickupProgress > 0 ? Math.sin(pickupProgress * Math.PI * 3) * .035 : 0;
      group.scale.setScalar(.92 * (1 - loadBounce));
    },
  };
}
