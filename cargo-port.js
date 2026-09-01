import { THREE, box } from './shared.js?v=crop-diversity-20260831-1';

const DECK_HEIGHT = .18;
const DECK_CLEARANCE = .04;
const DECK_WIDTH = 4.9;
const DECK_DEPTH = 5.4;
const DECK_CENTER_Z = 2.12;
const FIRST_VISIT_DELAY = 5;
const REPEAT_VISIT_DELAY = 60;
const APPROACH_SECONDS = 1.4;
const DESCEND_SECONDS = 4.6;
const DWELL_SECONDS = 4;
const PICKUP_SECONDS = 1.2;
const ASCEND_SECONDS = 4.6;
const DEPART_SECONDS = 1.6;
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

export function createCargoPort(site) {
  const group = new THREE.Group();
  const staticGroup = new THREE.Group();
  const cargoGroup = new THREE.Group();
  const craftRoot = new THREE.Group();
  const colliders = [];
  const outwardYaw = Math.atan2(site.outward.x, site.outward.z);
  let loadRatio = 0;
  let phase = 'cooldown';
  let phaseTime = 0;
  let cooldown = FIRST_VISIT_DELAY;
  let startDistance = 34;
  let pickupQueued = false;
  let shipmentCollected = false;

  group.name = 'cargo-port';
  const deckBaseY = site.y + DECK_CLEARANCE;
  group.position.set(site.x, deckBaseY, site.z);
  group.rotation.y = outwardYaw;
  group.add(staticGroup, cargoGroup, craftRoot);

  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x46535a, roughness: .82, metalness: .16 });
  const deckEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: .78, metalness: .22 });
  const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf0c554, emissive: 0x7a4f12, emissiveIntensity: .18, roughness: .72 });
  const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0xd4743f, roughness: .82 });
  const cargoDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3d29, roughness: .88 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x78c7da, emissive: 0x174452, emissiveIntensity: .28, roughness: .2, metalness: .12 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffe990, emissive: 0xffb82d, emissiveIntensity: 1.5, roughness: .35 });
  const redLightMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b55, emissive: 0xa51f18, emissiveIntensity: 1.45, roughness: .35 });
  const materials = [deckMaterial, deckEdgeMaterial, markingMaterial, cargoMaterial, cargoDarkMaterial, glassMaterial, lightMaterial, redLightMaterial];

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

  const addStaticBox = (width, height, depth, material, x, y, z, collider = false) => {
    const mesh = box(width, height, depth, material);
    mesh.position.set(x, y + height * .5, z);
    staticGroup.add(mesh);
    if (collider) addCollider(x, y, z, width, height, depth);
    return mesh;
  };

  addStaticBox(DECK_WIDTH, DECK_HEIGHT, DECK_DEPTH, deckMaterial, 0, 0, DECK_CENTER_Z, true);
  addStaticBox(5.05, .13, .16, deckEdgeMaterial, 0, DECK_HEIGHT, 4.77, true);
  for (const x of [-2.37, 2.37]) {
    addStaticBox(.16, .32, 2.1, deckEdgeMaterial, x, DECK_HEIGHT, 3.66, true);
    addStaticBox(.22, .5, .22, markingMaterial, x, DECK_HEIGHT, .05, true);
  }
  addStaticBox(1.45, .12, .72, cargoDarkMaterial, -1.5, DECK_HEIGHT, -.14, true);
  addStaticBox(.38, 1.18, .38, deckEdgeMaterial, -2.0, DECK_HEIGHT, -.1, true);
  addStaticBox(.52, .12, .52, lightMaterial, -2.0, DECK_HEIGHT + 1.18, -.1);

  for (let index = 0; index < 12; index++) {
    const angle = index / 12 * Math.PI * 2;
    const stripe = addStaticBox(.5, .035, .14, markingMaterial, Math.sin(angle) * 1.48, DECK_HEIGHT + .006, 2.3 + Math.cos(angle) * 1.48);
    stripe.rotation.y = angle;
  }
  const centerMark = addStaticBox(.22, .04, 1.05, markingMaterial, 0, DECK_HEIGHT + .008, 2.3);
  const crossMark = addStaticBox(1.05, .04, .22, markingMaterial, 0, DECK_HEIGHT + .009, 2.3);
  centerMark.castShadow = crossMark.castShadow = false;

  for (const [x, z] of [[-2.18, .35], [2.18, .35], [-2.18, 4.45], [2.18, 4.45]]) {
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .2, 8), lightMaterial);
    beacon.position.set(x, DECK_HEIGHT + .1, z);
    beacon.castShadow = true;
    staticGroup.add(beacon);
    addCollider(x, DECK_HEIGHT, z, .2, .2, .2);
  }

  const crates = [];
  for (const [index, position] of [[0, [1.48, .39, -.05]], [1, [1.95, .39, -.05]], [2, [1.72, .81, -.05]]]) {
    const crate = new THREE.Group();
    const body = box(.42, .42, .42, cargoMaterial);
    const bandX = box(.47, .08, .46, cargoDarkMaterial);
    const bandZ = box(.46, .08, .47, cargoDarkMaterial);
    bandX.position.y = bandZ.position.y = .03;
    bandZ.rotation.y = Math.PI * .5;
    crate.add(body, bandX, bandZ);
    crate.position.set(...position);
    crate.userData.basePosition = new THREE.Vector3(...position);
    crate.userData.pop = 0;
    crate.visible = false;
    cargoGroup.add(crate);
    crates[index] = crate;
  }

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
    colliders,
    isNear(x, z, range = 3.15) {
      return Math.hypot(x - site.x, z - site.z) <= range;
    },
    unloadTarget() {
      const target = localToWorld(-1.5, -.14);
      return { x: target.x, y: deckBaseY + .72, z: target.z };
    },
    setLoadRatio(nextRatio) {
      loadRatio = THREE.MathUtils.clamp(nextRatio, 0, 1);
      crates.forEach((crate, index) => {
        const visible = loadRatio > index / crates.length + .001;
        if (visible && !crate.visible) crate.userData.pop = 1;
        crate.visible = visible;
      });
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
        crates.forEach((crate, index) => {
          if (!crate.visible) return;
          const progress = THREE.MathUtils.clamp((phaseTime / PICKUP_SECONDS - index * .16) / .68, 0, 1);
          const amount = ease(progress);
          crate.position.lerpVectors(crate.userData.basePosition, target, amount);
          crate.position.y += Math.sin(progress * Math.PI) * .72;
          const scale = 1 + Math.sin(progress * Math.PI) * .24 - amount * .72;
          crate.scale.set(scale, scale * (1 + Math.sin(progress * Math.PI) * .28), scale);
          if (progress >= 1) crate.visible = false;
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
      crates.forEach(crate => {
        if (!crate.visible || phase === 'pickup') return;
        crate.userData.pop = Math.max(0, crate.userData.pop - dt * 4.5);
        const pop = crate.userData.pop;
        crate.position.copy(crate.userData.basePosition);
        crate.position.y += pop * .08;
        crate.scale.set(1 + pop * .14, 1 - pop * .12, 1 + pop * .14);
      });
      const flightPower = phase === 'dwell' || phase === 'pickup' ? .48 : 1;
      craft.animate(dt, flightPower, phase === 'dwell' || phase === 'pickup', phase === 'pickup' ? phaseTime / PICKUP_SECONDS : 0);
      for (const [index, beacon] of staticGroup.children.filter(child => child.geometry?.type === 'CylinderGeometry').entries()) {
        beacon.scale.y = .88 + Math.sin(phaseTime * 4 + index) * .12;
      }
      return { shipmentPickedUp, departed };
    },
    dispose() {
      for (const material of materials) material.dispose();
    },
  };
}

function createVtol(mats) {
  const group = new THREE.Group();
  const rotors = [];
  const body = box(2.35, 1.25, 3.25, mats.cargoMaterial); body.position.y = 1.28; group.add(body);
  const belly = box(1.82, .5, 2.5, mats.cargoDarkMaterial); belly.position.set(0, .58, .2); group.add(belly);
  const roof = box(1.72, .32, 1.7, mats.markingMaterial); roof.position.set(0, 2.05, .15); group.add(roof);
  const cockpit = box(1.72, .72, .12, mats.glassMaterial); cockpit.position.set(0, 1.5, -1.68); cockpit.rotation.x = -.18; group.add(cockpit);
  const hatchPivot = new THREE.Group(); hatchPivot.position.set(0, 1.53, 1.66); group.add(hatchPivot);
  const hatch = box(1.35, .76, .08, mats.cargoDarkMaterial); hatch.position.y = -.38; hatchPivot.add(hatch);
  const tail = box(.72, .72, 1.05, mats.cargoMaterial); tail.position.set(0, 1.36, 2.08); group.add(tail);
  const tailFin = box(.15, .88, .72, mats.markingMaterial); tailFin.position.set(0, 2.0, 2.14); group.add(tailFin);

  for (const side of [-1, 1]) {
    const boom = box(1.55, .18, .22, mats.deckEdgeMaterial); boom.position.set(side * 1.62, 1.62, .05); group.add(boom);
    const skid = box(.12, .12, 2.2, mats.deckEdgeMaterial); skid.position.set(side * .82, .12, .2); group.add(skid);
    for (const z of [-.72, 1.0]) {
      const leg = box(.1, .52, .1, mats.deckEdgeMaterial); leg.position.set(side * .82, .36, z); leg.rotation.z = side * -.18; group.add(leg);
    }
    for (const z of [-.92, 1.03]) {
      const pod = new THREE.Group();
      pod.position.set(side * 2.18, 1.66, z);
      group.add(pod);
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .32, 12), mats.cargoDarkMaterial);
      housing.position.y = 0;
      housing.castShadow = true;
      pod.add(housing);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.48, .08, 6, 12), mats.deckMaterial);
      ring.rotation.x = Math.PI * .5;
      ring.position.y = .19;
      ring.castShadow = true;
      pod.add(ring);
      const rotor = new THREE.Group(); rotor.position.y = .23; pod.add(rotor);
      const bladeA = box(1.02, .035, .1, mats.markingMaterial); rotor.add(bladeA);
      const bladeB = box(.1, .035, 1.02, mats.markingMaterial); rotor.add(bladeB);
      rotors.push(rotor);
    }
  }

  const noseLight = box(.3, .16, .08, mats.lightMaterial); noseLight.position.set(0, 1.04, -1.76); group.add(noseLight);
  for (const side of [-1, 1]) {
    const light = box(.16, .14, .16, side < 0 ? mats.redLightMaterial : mats.lightMaterial);
    light.position.set(side * 1.16, 1.62, -.9);
    group.add(light);
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
