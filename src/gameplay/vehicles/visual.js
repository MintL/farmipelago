import { createFlatbedAsset, PALLET_SLOTS } from './refined-tools.js';
import { TRACTOR_MOUNTS } from './tractor-assets.js';
import { createLiftLinkage } from './linkage.js';
import { createBalerAsset, createCombineAsset, createFrontToolAsset, createLiquidTankAsset, createRearToolAsset, createTrailerAsset, createTractorAsset } from './assets.js';
import { FRONT_EQUIPMENT_IDS, REAR_EQUIPMENT_IDS, equipmentDefinition } from '../catalog/equipment.js';
import { THREE } from '../../core/shared.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wakeUpDuration = .78;
const rearJointSoftLimit = THREE.MathUtils.degToRad(50);
const rearJointHardLimit = THREE.MathUtils.degToRad(65);

const wrappedAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createVehicle(scene, vehicle) {
  const root = new THREE.Group();
  const wakeUp = new THREE.Group();
  const tractor = vehicle === 'tractor' ? createTractorAsset() : null;
  const combine = vehicle === 'harvester' ? createCombineAsset() : null;
  let wasGrounded = false;
  let lastVerticalSpeed = 0;
  let landingSquash = 0;
  let wakeUpElapsed = wakeUpDuration;
  root.scale.setScalar(.92);
  root.name = `vehicle-${vehicle}`;
  wakeUp.name = `vehicle-${vehicle}-model`;
  wakeUp.add(tractor?.group || combine.group);
  root.add(wakeUp);
  scene.add(root);
  const toolDownY = TRACTOR_MOUNTS.downY;
  const toolUpY = TRACTOR_MOUNTS.upY;
  let rearToolTargetY = toolUpY;
  let rearToolY = toolUpY;
  let rearToolVelocity = 0;
  let frontToolTargetY = toolUpY;
  let frontToolY = toolUpY;
  let frontToolVelocity = 0;
  let headerY = .42;
  let headerVelocity = 0;
  let selectionPulse = 0;
  let selectionDirection = 0;
  let sprayCooldown = 0;
  let transfer = null;
  let transferPulse = 0;
  let augerYaw = 0;
  let augerExtension = 0;
  let baleKick = 0;
  let vehicleHeading = 0;
  let rearJointYaw = 0;
  let rearJointReady = false;
  let rearAxleTravel = 0;
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  const rearHitch = new THREE.Vector3();
  const previousRearHitch = new THREE.Vector3();
  const rearAxle = new THREE.Vector3();
  const previousRearAxle = new THREE.Vector3();
  const trailer = tractor ? createTrailerAsset() : null;
  const flatbed = tractor ? createFlatbedAsset() : null;
  const baler = tractor ? createBalerAsset() : null;
  const liquidTank = tractor ? createLiquidTankAsset() : null;
  const attachments = tractor ? Object.fromEntries(REAR_EQUIPMENT_IDS.map(type => {
    const attachment = type === 'flatbed' ? flatbed.group : type === 'trailer' ? trailer.group : type === 'baler' ? baler.group : type === 'liquid-tank' ? liquidTank.group : createRearToolAsset(type);
    attachment.position.set(0, ['flatbed', 'trailer', 'liquid-tank', 'baler'].includes(type) ? 0 : toolUpY, ['flatbed', 'trailer', 'liquid-tank', 'baler'].includes(type) ? TRACTOR_MOUNTS.towZ : TRACTOR_MOUNTS.rearZ);
    tractor.group.add(attachment);
    return [type, attachment];
  })) : {};
  const frontAttachments = tractor ? Object.fromEntries(FRONT_EQUIPMENT_IDS.map(type => {
    const attachment = createFrontToolAsset(type);
    attachment.position.set(0, equipmentDefinition(type)?.working ? toolUpY : 0, TRACTOR_MOUNTS.frontZ);
    attachment.rotation.y = Math.PI;
    tractor.group.add(attachment);
    return [type, attachment];
  })) : {};
  const rearLinkage = tractor ? createLiftLinkage(tractor.group) : null;
  const frontLinkage = tractor ? createLiftLinkage(tractor.group, true) : null;
  let loadout = 'plough';
  let frontLoadout = 'loader';
  Object.entries(attachments).forEach(([name, attachment]) => { attachment.visible = name === loadout; });
  Object.entries(frontAttachments).forEach(([name, attachment]) => { attachment.visible = name === frontLoadout; });

  const effectGroup = new THREE.Group();
  effectGroup.name = `${vehicle}-effects`;
  scene.add(effectGroup);
  const createPool = (name, geometry, material, capacity) => {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    const transform = new THREE.Object3D();
    mesh.name = name;
    mesh.count = capacity;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    effectGroup.add(mesh);
    const slots = Array.from({ length: capacity }, () => ({ active: false }));
    for (let index = 0; index < capacity; index++) {
      transform.scale.setScalar(0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { mesh, slots, cursor: 0, transform };
  };
  const spray = createPool('spray-droplets', new THREE.BoxGeometry(.06, .06, .06), new THREE.MeshBasicMaterial({ color: 0xa6ddff, transparent: true, opacity: .82, depthWrite: false }), 64);
  const claim = (pool, data) => {
    const available = pool.slots.findIndex(slot => !slot.active);
    const index = available === -1 ? pool.cursor++ % pool.slots.length : available;
    Object.assign(pool.slots[index], data, { active: true });
  };
  const hide = (pool, index) => {
    pool.transform.scale.setScalar(0);
    pool.transform.updateMatrix();
    pool.mesh.setMatrixAt(index, pool.transform.matrix);
    pool.slots[index].active = false;
  };
  const updatePool = (pool, elapsed, update) => {
    let changed = false;
    pool.slots.forEach((slot, index) => {
      if (!slot.active || elapsed < slot.born) return;
      const progress = (elapsed - slot.born) / slot.life;
      if (progress >= 1) {
        hide(pool, index);
        changed = true;
        return;
      }
      update(slot, progress, pool.transform);
      pool.transform.updateMatrix();
      pool.mesh.setMatrixAt(index, pool.transform.matrix);
      changed = true;
    });
    if (changed) pool.mesh.instanceMatrix.needsUpdate = true;
  };
  const spring = (value, velocity, target, dt, stiffness = 185, damping = 24) => {
    velocity += (target - value) * stiffness * dt;
    velocity *= Math.exp(-damping * dt);
    return { value: value + velocity * dt, velocity };
  };
  const assertSceneOwnership = () => {
    const model = tractor?.group || combine.group;
    if (root.parent !== scene || effectGroup.parent !== scene || model.parent !== wakeUp) {
      throw new Error(`${vehicle} visual must remain scene-owned outside island presentation roots`);
    }
  };
  const currentRearArticulation = () => equipmentDefinition(loadout)?.articulation?.type === 'tow'
    ? equipmentDefinition(loadout).articulation
    : null;
  const resetRearJoint = (yaw = 0) => {
    const nextYaw = Number(yaw);
    rearJointYaw = THREE.MathUtils.clamp(wrappedAngle(Number.isFinite(nextYaw) ? nextYaw : 0), -rearJointHardLimit, rearJointHardLimit);
    rearJointReady = false;
    rearAxleTravel = 0;
    const attachment = attachments[loadout];
    if (attachment) attachment.rotation.y = currentRearArticulation() ? rearJointYaw : 0;
  };
  const updateRearArticulation = (state, heading, dt) => {
    vehicleHeading = heading;
    root.position.set(state.x, state.y, state.z);
    root.rotation.y = heading;
    const attachment = attachments[loadout];
    const articulation = currentRearArticulation();
    if (!attachment || !articulation) {
      rearJointReady = false;
      rearAxleTravel = 0;
      if (attachment) attachment.rotation.y = 0;
      root.updateMatrixWorld(true);
      return;
    }

    const hitchOffset = attachment.position.z;
    rearHitch.set(
      state.x + Math.sin(heading) * hitchOffset,
      state.y,
      state.z + Math.cos(heading) * hitchOffset,
    );
    const absoluteHeading = heading + rearJointYaw;
    if (!rearJointReady || !state.grounded) {
      rearAxle.set(
        rearHitch.x + Math.sin(absoluteHeading) * articulation.axleOffset,
        state.y,
        rearHitch.z + Math.cos(absoluteHeading) * articulation.axleOffset,
      );
      previousRearHitch.copy(rearHitch);
      rearJointReady = Boolean(state.grounded);
    }
    else {
      const hitchDx = rearHitch.x - previousRearHitch.x;
      const hitchDz = rearHitch.z - previousRearHitch.z;
      const hitchDistance = Math.hypot(hitchDx, hitchDz);
      if (hitchDistance > 1.5) {
        resetRearJoint();
        rearAxle.set(
          rearHitch.x + Math.sin(heading) * articulation.axleOffset,
          state.y,
          rearHitch.z + Math.cos(heading) * articulation.axleOffset,
        );
        rearJointReady = true;
      }
      else if (hitchDistance > .00001) {
        previousRearAxle.copy(rearAxle);
        let nextYaw = Math.atan2(rearAxle.x - rearHitch.x, rearAxle.z - rearHitch.z);
        let nextJointYaw = wrappedAngle(nextYaw - heading);
        const reversing = hitchDx * -Math.sin(heading) + hitchDz * -Math.cos(heading) < 0;
        if (reversing && Math.abs(nextJointYaw) > rearJointSoftLimit) {
          const target = Math.sign(nextJointYaw) * rearJointSoftLimit;
          nextJointYaw = THREE.MathUtils.lerp(nextJointYaw, target, 1 - Math.exp(-8 * dt));
        }
        rearJointYaw = THREE.MathUtils.clamp(nextJointYaw, -rearJointHardLimit, rearJointHardLimit);
        nextYaw = heading + rearJointYaw;
        rearAxle.set(
          rearHitch.x + Math.sin(nextYaw) * articulation.axleOffset,
          state.y,
          rearHitch.z + Math.cos(nextYaw) * articulation.axleOffset,
        );
        const axleDx = rearAxle.x - previousRearAxle.x;
        const axleDz = rearAxle.z - previousRearAxle.z;
        rearAxleTravel += axleDx * -Math.sin(nextYaw) + axleDz * -Math.cos(nextYaw);
      }
      previousRearHitch.copy(rearHitch);
    }
    attachment.rotation.y = rearJointYaw;
    root.updateMatrixWorld(true);
  };

  return {
    assertSceneOwnership,
    updateRearArticulation,
    rearJointYaw: () => currentRearArticulation() ? rearJointYaw : 0,
    setRearJointYaw(yaw) {
      resetRearJoint(yaw);
    },
    resetRearJoint,
    rearToolHeading() {
      return wrappedAngle(vehicleHeading + (currentRearArticulation() ? rearJointYaw : 0));
    },
    rearToolPoint(localX, localZ, localY = 0) {
      const attachment = attachments[loadout];
      if (!attachment) return root.getWorldPosition(new THREE.Vector3());
      root.updateMatrixWorld(true);
      worldPoint.set(localX, localY, localZ);
      return attachment.localToWorld(worldPoint.clone());
    },
    resetTransientState() {
      transfer = null;
      transferPulse = 0;
      selectionPulse = 0;
      selectionDirection = 0;
      landingSquash = 0;
      baleKick = 0;
      wakeUpElapsed = wakeUpDuration;
      wakeUp.scale.setScalar(1);
      spray.slots.forEach((slot, index) => hide(spray, index));
      spray.mesh.instanceMatrix.needsUpdate = true;
      if (combine) {
        augerYaw = 0;
        augerExtension = 0;
        combine.auger.rotation.y = 0;
        combine.auger.scale.x = .04;
      }
      assertSceneOwnership();
    },
    setNightAmount(amount) {
      if (!tractor) return;
      const nightAmount = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
      tractor.headlampMaterial.emissiveIntensity = .12 + nightAmount * 2.5;
      for (const headlight of tractor.headlights) {
        headlight.intensity = nightAmount * 18;
        headlight.visible = nightAmount > .01;
      }
    },
    setLoadout(nextLoadout) {
      const previousLoadout = loadout;
      if (nextLoadout?.tool === null || attachments[nextLoadout?.tool]) loadout = nextLoadout.tool;
      if (nextLoadout?.frontTool === null || frontAttachments[nextLoadout?.frontTool]) frontLoadout = nextLoadout.frontTool;
      if (loadout !== previousLoadout) resetRearJoint();
      Object.entries(attachments).forEach(([name, attachment]) => {
        attachment.visible = name === loadout;
      });
      Object.entries(frontAttachments).forEach(([name, attachment]) => {
        attachment.visible = name === frontLoadout;
      });
    },
    palletSlotPoint(index) {
      const slot = PALLET_SLOTS[index];
      root.updateMatrixWorld(true);
      return flatbed.group.localToWorld(new THREE.Vector3(slot.x, slot.y, slot.z));
    },
    setPalletCargo(amount, hiddenSlot = -1) {
      flatbed?.pallets.forEach((pallet, index) => { pallet.visible = index < amount && index !== hiddenSlot; });
    },
    setStorageAmount(amount, capacity) {
      if (flatbed) flatbed.pallets.forEach((pallet, index) => { pallet.visible = loadout === 'flatbed' && index < amount; });
      const ratio = capacity ? THREE.MathUtils.clamp(amount / capacity, 0, 1) : 0;
      if (trailer) {
        trailer.grain.visible = loadout === 'trailer' && ratio > 0;
        trailer.grain.scale.set(1, Math.max(.12, ratio * 2.5), 1);
        trailer.grain.position.y = .1;
      }
      if (liquidTank) {
        liquidTank.liquid.visible = loadout === 'liquid-tank' && ratio > 0;
        liquidTank.liquid.scale.y = Math.max(.08, ratio);
        liquidTank.liquid.position.y = .52 + ratio * .4;
      }
    },
    setBalerFill(amount, capacity) {
      const formingBale = attachments.baler?.getObjectByName('baler-forming-bale');
      if (!formingBale) return;
      const ratio = capacity ? THREE.MathUtils.clamp(amount / capacity, 0, 1) : 0;
      formingBale.visible = loadout === 'baler' && ratio > 0;
      formingBale.scale.z = Math.max(.04, ratio);
      formingBale.position.z = 1.62 + .575 * ratio;
    },
    setToolEnabled(slot, enabled, immediate = false) {
      if (slot === 'front') frontToolTargetY = enabled ? toolDownY : toolUpY;
      else rearToolTargetY = enabled ? toolDownY : toolUpY;
      if (!immediate && !reducedMotion) return;
      if (slot === 'front') {
        frontToolY = frontToolTargetY;
        frontToolVelocity = 0;
        headerY = enabled ? .24 : .42;
        headerVelocity = 0;
      }
      else {
        rearToolY = rearToolTargetY;
        rearToolVelocity = 0;
      }
    },
    frontToolLift() {
      return THREE.MathUtils.clamp((frontToolY - toolDownY) / (toolUpY - toolDownY), 0, 1);
    },
    setSelected(selected) {
      if (reducedMotion) return;
      selectionDirection = selected ? 1 : -1;
      selectionPulse = 1;
      wakeUpElapsed = selected ? 0 : wakeUpDuration;
      if (!selected) {
        wakeUp.scale.setScalar(1);
      }
    },
    transferPort(direction, itemId) {
      root.updateMatrixWorld(true);
      if (combine) {
        if (direction === 'output') return combine.augerTip.getWorldPosition(new THREE.Vector3());
        worldPoint.set(0, 1.78, .57);
        return combine.group.localToWorld(worldPoint.clone());
      }
      if (loadout === 'trailer') {
        worldPoint.set(0, direction === 'input' ? .76 : .18, direction === 'input' ? .05 : 1.34);
        return trailer.bed.localToWorld(worldPoint.clone());
      }
      if (loadout === 'liquid-tank' && itemId === 'milk') {
        if (direction === 'output') return liquidTank.outlet.getWorldPosition(new THREE.Vector3());
        worldPoint.set(0, 1.66, 1.45);
        return liquidTank.group.localToWorld(worldPoint.clone());
      }
      return root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0));
    },
    setTransferState({ active, direction, target = null, itemId = null, elapsed = 0 }) {
      if (!active) {
        transfer = null;
        transferPulse = Math.max(transferPulse, reducedMotion ? .32 : 1);
        return;
      }
      if (combine && direction === 'output' && target) {
        root.updateMatrixWorld(true);
        localPoint.set(target.x, target.y, target.z);
        root.worldToLocal(localPoint);
      }
      transfer = {
        started: elapsed,
        direction,
        targetYaw: combine && direction === 'output' ? Math.atan2(-localPoint.z, localPoint.x) : 0,
        itemId,
      };
    },
    pulseTransfer(direction) {
      if (direction === 'input') transferPulse = Math.max(transferPulse, reducedMotion ? .3 : .72);
    },
    playBale() {
      if (!reducedMotion) baleKick = 1;
    },
    sync(state, heading, steer, driveAmount, dt, elapsed) {
      updateRearArticulation(state, heading, dt);
      if (state.grounded && !wasGrounded && lastVerticalSpeed < -1.4) {
        landingSquash = Math.min(.3, .12 + Math.abs(lastVerticalSpeed) * .018);
      }
      landingSquash *= Math.exp(-7 * dt);
      wasGrounded = state.grounded;
      lastVerticalSpeed = state.verticalSpeed;
      const rearToolSpring = spring(rearToolY, rearToolVelocity, rearToolTargetY, dt);
      rearToolY = rearToolSpring.value;
      rearToolVelocity = rearToolSpring.velocity;
      const frontToolSpring = spring(frontToolY, frontToolVelocity, frontToolTargetY, dt);
      frontToolY = frontToolSpring.value;
      frontToolVelocity = frontToolSpring.velocity;
      const attachment = attachments[loadout];
      if (attachment && !['flatbed', 'trailer', 'liquid-tank', 'baler'].includes(loadout)) {
        attachment.position.y = rearToolY;
        attachment.rotation.x = rearToolVelocity * .035;
      }
      const frontAttachment = frontAttachments[frontLoadout];
      if (frontAttachment && equipmentDefinition(frontLoadout)?.working) {
        frontAttachment.position.y = frontToolY;
        frontAttachment.rotation.x = frontToolVelocity * .035;
      }
      if (tractor) tractor.towHitch.visible = Boolean(currentRearArticulation()) || !attachment;
      rearLinkage?.update(currentRearArticulation() ? null : attachment);
      frontLinkage?.update(frontAttachment);
      if (combine) {
        const headerTargetY = frontToolTargetY === toolDownY ? .24 : .42;
        const headerSpring = spring(headerY, headerVelocity, headerTargetY, dt);
        headerY = headerSpring.value;
        headerVelocity = headerSpring.velocity;
        combine.header.position.y = headerY;
        combine.header.rotation.x = headerVelocity * .035;
      }

      const speedFactor = Math.min(1, state.speed / 5.5);
      const activeWheels = combine ? combine.wheels : tractor.wheels;
      activeWheels.forEach(wheel => {
        wheel.spin += state.speed * dt / wheel.radius;
        wheel.roller.rotation.x = wheel.spin;
        if (wheel.front || wheel.steer) wheel.holder.rotation.y = steer * .38;
        const wobble = Math.sin(elapsed * (8 + speedFactor * 15) + wheel.phase) * (.012 + speedFactor * .065);
        wheel.holder.rotation.z = wobble;
      });
      const towWheels = loadout === 'flatbed' ? flatbed.wheels : loadout === 'trailer' ? trailer.wheels
        : loadout === 'baler' ? baler.wheels
        : loadout === 'liquid-tank' ? liquidTank.wheels
        : [];
      towWheels.forEach(wheel => {
        wheel.spin += rearAxleTravel / wheel.radius;
        wheel.roller.rotation.x = wheel.spin;
        const wobble = Math.sin(elapsed * (8 + speedFactor * 15) + wheel.phase) * (.012 + speedFactor * .065);
        wheel.holder.rotation.z = wobble;
      });
      rearAxleTravel = 0;
      const engineBob = state.grounded ? Math.sin(elapsed * (8 + Math.min(1, state.speed / 4) * 5)) * .04 * Math.min(1, state.speed / 4) : 0;
      const airStretch = state.grounded ? 0 : .14;
      selectionPulse *= Math.exp(-7 * dt);
      transferPulse *= Math.exp(-(reducedMotion ? 11 : 8) * dt);
      wakeUpElapsed = Math.min(wakeUpDuration, wakeUpElapsed + dt);
      if (wakeUpElapsed < wakeUpDuration) {
        const progress = wakeUpElapsed / wakeUpDuration;
        const growProgress = THREE.MathUtils.clamp(progress / .44, 0, 1);
        const settleProgress = THREE.MathUtils.clamp((progress - .44) / .56, 0, 1);
        const growEase = 1 - Math.pow(1 - growProgress, 3);
        const settleEase = THREE.MathUtils.smoothstep(settleProgress, 0, 1);
        const wakeScale = progress < .44
          ? THREE.MathUtils.lerp(1, 1.2, growEase)
          : THREE.MathUtils.lerp(1.2, 1, settleEase);
        wakeUp.scale.setScalar(wakeScale);
      }
      else {
        wakeUp.scale.setScalar(1);
      }
      const selection = selectionDirection * selectionPulse;
      const transferAge = transfer ? Math.max(0, elapsed - transfer.started) : 0;
      const transferAnticipation = !reducedMotion && transfer
        ? Math.sin(Math.min(1, transferAge / .16) * Math.PI) * (transfer.direction === 'output' ? -.055 : .035)
        : 0;
      const transferBuzz = !reducedMotion && transfer ? Math.sin(transferAge * 15) * .012 : 0;
      const squash = landingSquash - airStretch + selection * .09 + transferAnticipation + transferBuzz
        + transferPulse * (reducedMotion ? .025 : .06)
        + Math.max(Math.abs(rearToolVelocity), Math.abs(frontToolVelocity)) * .006;
      const visual = combine ? combine.group : tractor.group;
      visual.position.y = engineBob;
      visual.scale.set(1 + squash * .9, 1 - squash, 1 + squash * .9);
      visual.rotation.z = -steer * Math.min(1, state.speed / 4) * .1;
      visual.rotation.x = state.grounded ? -driveAmount * .035 : THREE.MathUtils.clamp(-state.verticalSpeed * .045, -.28, .28);
      const rearImplementSpeed = rearToolTargetY === toolDownY && state.grounded ? Math.max(.7, state.speed * 3.2) : 0;
      const frontImplementSpeed = frontToolTargetY === toolDownY && state.grounded ? Math.max(.7, state.speed * 3.2) : 0;
      if (combine) combine.reel.rotation.x -= frontImplementSpeed * dt;
      for (const [mower, implementSpeed] of [[attachment, rearImplementSpeed], [frontAttachment, frontImplementSpeed]]) {
        const rotors = mower?.getObjectByName('mower-rotors');
        if (!rotors) continue;
        for (const rotor of rotors.children) rotor.rotation.y += implementSpeed * dt * 2.4 * (rotor.userData.spinDirection || 1);
      }
      const pickup = attachment?.getObjectByName('baler-pickup');
      if (pickup) pickup.rotation.x -= rearImplementSpeed * dt * 1.8;
      baleKick *= Math.exp(-7 * dt);
      const balerChute = attachment?.getObjectByName('baler-chute');
      if (balerChute) balerChute.rotation.x = -.12 - baleKick * .32;
      root.updateMatrixWorld(true);
      sprayCooldown -= dt;
      if (!reducedMotion && tractor && loadout === 'sprayer' && rearToolTargetY === toolDownY && state.grounded && state.speed >= .4 && sprayCooldown <= 0) {
        sprayCooldown = .1;
        for (const x of [-1.15, -.77, -.38, 0, .38, .77, 1.15]) {
          worldPoint.set(x, -.25, .58);
          attachment.localToWorld(worldPoint);
          claim(spray, {
            born: elapsed, life: .35, x: worldPoint.x, y: worldPoint.y, z: worldPoint.z,
            dx: Math.sin(heading) * .2, dz: Math.cos(heading) * .2, phase: x,
          });
        }
      }
      updatePool(spray, elapsed, (slot, progress, transform) => {
        const scale = 1 + progress * .55;
        transform.position.set(slot.x + slot.dx * progress, slot.y - progress * .48 - progress * progress * .12, slot.z + slot.dz * progress);
        transform.rotation.set(progress * 5, slot.phase + progress * 3, progress * 4);
        transform.scale.set(scale, Math.max(.18, 1 - progress), scale);
      });
      const activeOutput = !reducedMotion && transfer?.direction === 'output';
      if (combine) {
        const targetYaw = activeOutput ? transfer.targetYaw : 0;
        augerYaw += (targetYaw - augerYaw) * (1 - Math.exp(-12 * dt));
        const targetExtension = activeOutput ? 1 : 0;
        augerExtension += (targetExtension - augerExtension) * (1 - Math.exp(-9 * dt));
        combine.auger.rotation.y = augerYaw;
        const pulse = activeOutput ? 1 + Math.sin((elapsed - transfer.started) * 12) * .025 : 1;
        combine.auger.scale.x = Math.max(.04, augerExtension * pulse);
      }
      if (trailer) {
        const tilt = activeOutput && loadout === 'trailer' ? .56 : 0;
        trailer.bed.rotation.x += (tilt - trailer.bed.rotation.x) * (1 - Math.exp(-10 * dt));
        trailer.bed.position.y = .4 - (loadout === 'trailer' && transfer?.direction === 'input' ? transferPulse * .055 : 0);
        trailer.tailgate.rotation.x = activeOutput && loadout === 'trailer' ? .82 : 0;
      }
      if (liquidTank) {
        const outletPulse = activeOutput && loadout === 'liquid-tank' ? Math.sin(elapsed * 18) * .12 : 0;
        liquidTank.outlet.scale.setScalar(1 + outletPulse + (transfer?.direction === 'input' ? transferPulse * .08 : 0));
      }
    },
  };
}
