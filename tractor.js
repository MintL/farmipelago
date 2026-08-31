import { createCombineAsset, createLoadoutAsset, createRearToolAsset, createTrailerAsset, createTractorAsset } from './farm-assets.js?v=trailer-coupling-20260831-1';
import { THREE } from './shared.js?v=crop-diversity-20260831-1';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createVehicle(scene, vehicle) {
  const root = new THREE.Group();
  const tractor = vehicle === 'tractor' ? createTractorAsset() : null;
  const combine = vehicle === 'harvester' ? createCombineAsset() : null;
  let wasGrounded = false;
  let lastVerticalSpeed = 0;
  let landingSquash = 0;
  root.scale.setScalar(.92);
  root.add(tractor?.group || combine.group);
  scene.add(root);
  const toolDownY = .3;
  const toolUpY = .78;
  let toolTargetY = toolUpY;
  let toolY = toolUpY;
  let toolVelocity = 0;
  let headerY = .42;
  let headerVelocity = 0;
  let selectionPulse = 0;
  let selectionDirection = 0;
  let sprayCooldown = 0;
  let unload = null;
  let augerYaw = 0;
  let augerExtension = 0;
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  const trailer = tractor ? createTrailerAsset() : null;
  const attachments = tractor ? Object.fromEntries(['plough', 'seeder', 'sprayer', 'trailer'].map(type => {
    const attachment = type === 'trailer' ? trailer.group : createRearToolAsset(type);
    attachment.position.set(0, type === 'trailer' ? 0 : toolUpY, type === 'trailer' ? 1.18 : 1.38);
    tractor.group.add(attachment);
    return [type, attachment];
  })) : {};
  let loadout = 'plough';
  Object.entries(attachments).forEach(([name, attachment]) => { attachment.visible = name === loadout; });

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

  return {
    setLoadout(nextLoadout) {
      const nextTool = nextLoadout.tool || loadout;
      if (attachments[nextTool]) loadout = nextTool;
      Object.entries(attachments).forEach(([name, attachment]) => {
        attachment.visible = name === loadout;
      });
    },
    setStorageAmount(amount, capacity) {
      if (!trailer) return;
      const ratio = capacity ? THREE.MathUtils.clamp(amount / capacity, 0, 1) : 0;
      trailer.grain.visible = ratio > 0;
      trailer.grain.scale.set(1, Math.max(.12, ratio * 3.6), 1);
      trailer.grain.position.y = .08 + ratio * .19;
    },
    setToolEnabled(enabled, immediate = false) {
      toolTargetY = enabled ? toolDownY : toolUpY;
      if (!immediate && !reducedMotion) return;
      toolY = toolTargetY;
      toolVelocity = 0;
      headerY = enabled ? .24 : .42;
      headerVelocity = 0;
    },
    setSelected(selected) {
      if (reducedMotion) return;
      selectionDirection = selected ? 1 : -1;
      selectionPulse = 1;
    },
    playUnload(target, _cropId, elapsed) {
      if (reducedMotion || (!combine && !trailer) || !target) return false;
      if (combine) {
        root.updateMatrixWorld(true);
        localPoint.set(target.x, target.y, target.z);
        root.worldToLocal(localPoint);
      }
      if (unload) {
        if (combine) unload.targetYaw = Math.atan2(-localPoint.z, localPoint.x);
        unload.activeUntil = elapsed + 1.15;
      }
      else unload = {
        started: elapsed,
        targetYaw: combine ? Math.atan2(-localPoint.z, localPoint.x) : 0,
        activeUntil: elapsed + 1.15,
      };
      return true;
    },
    stopUnload() {
      unload = null;
    },
    sync(state, heading, steer, driveAmount, dt, elapsed) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.y = heading;
      if (state.grounded && !wasGrounded && lastVerticalSpeed < -1.4) {
        landingSquash = Math.min(.3, .12 + Math.abs(lastVerticalSpeed) * .018);
      }
      landingSquash *= Math.exp(-7 * dt);
      wasGrounded = state.grounded;
      lastVerticalSpeed = state.verticalSpeed;
      const toolSpring = spring(toolY, toolVelocity, toolTargetY, dt);
      toolY = toolSpring.value;
      toolVelocity = toolSpring.velocity;
      const attachment = attachments[loadout];
      if (attachment && loadout !== 'trailer') {
        attachment.position.y = toolY;
        attachment.rotation.x = toolVelocity * .035;
      }
      if (combine) {
        const headerTargetY = toolTargetY === toolDownY ? .24 : .42;
        const headerSpring = spring(headerY, headerVelocity, headerTargetY, dt);
        headerY = headerSpring.value;
        headerVelocity = headerSpring.velocity;
        combine.header.position.y = headerY;
        combine.header.rotation.x = headerVelocity * .035;
      }

      const speedFactor = Math.min(1, state.speed / 5.5);
      const activeWheels = combine ? combine.wheels : [...tractor.wheels, ...(loadout === 'trailer' ? trailer.wheels : [])];
      activeWheels.forEach(wheel => {
        wheel.spin += state.speed * dt / wheel.radius;
        wheel.roller.rotation.x = wheel.spin;
        if (wheel.front || wheel.steer) wheel.holder.rotation.y = steer * .38;
        const wobble = Math.sin(elapsed * (8 + speedFactor * 15) + wheel.phase) * (.012 + speedFactor * .065);
        wheel.holder.rotation.z = wobble;
      });
      const engineBob = state.grounded ? Math.sin(elapsed * (8 + Math.min(1, state.speed / 4) * 5)) * .04 * Math.min(1, state.speed / 4) : 0;
      const airStretch = state.grounded ? 0 : .14;
      selectionPulse *= Math.exp(-7 * dt);
      const selection = selectionDirection * selectionPulse;
      const squash = landingSquash - airStretch + selection * .09 + Math.abs(toolVelocity) * .006;
      const visual = combine ? combine.group : tractor.group;
      visual.position.y = engineBob;
      visual.scale.set(1 + squash * .9, 1 - squash, 1 + squash * .9);
      visual.rotation.z = -steer * Math.min(1, state.speed / 4) * .1;
      visual.rotation.x = state.grounded ? -driveAmount * .035 : THREE.MathUtils.clamp(-state.verticalSpeed * .045, -.28, .28);
      if (combine) combine.reel.rotation.x -= (toolTargetY === toolDownY ? Math.max(.7, state.speed * 3.2) : 0) * dt;
      root.updateMatrixWorld(true);
      sprayCooldown -= dt;
      if (!reducedMotion && tractor && loadout === 'sprayer' && toolTargetY === toolDownY && state.grounded && state.speed >= .4 && sprayCooldown <= 0) {
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
      const activeUnload = unload && elapsed < unload.activeUntil;
      if (combine) {
        const targetYaw = activeUnload ? unload.targetYaw : 0;
        augerYaw += (targetYaw - augerYaw) * (1 - Math.exp(-12 * dt));
        const targetExtension = activeUnload ? 1 : 0;
        augerExtension += (targetExtension - augerExtension) * (1 - Math.exp(-9 * dt));
        combine.auger.rotation.y = augerYaw;
        const pulse = activeUnload ? 1 + Math.sin((elapsed - unload.started) * 12) * .025 : 1;
        combine.auger.scale.x = Math.max(.04, augerExtension * pulse);
      }
      if (trailer) {
        const tilt = activeUnload && loadout === 'trailer' ? .56 : 0;
        trailer.bed.rotation.x += (tilt - trailer.bed.rotation.x) * (1 - Math.exp(-10 * dt));
        trailer.tailgate.rotation.x = activeUnload && loadout === 'trailer' ? .82 : 0;
      }
      if (unload && !activeUnload) unload = null;
    },
  };
}

export function createLoadoutPreview(canvas, category) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  camera.position.set(0, 2.7, 5.5);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x25231a, 2.8));
  const key = new THREE.DirectionalLight(0xffd89b, 2.5);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa1cfff, 1.3);
  rim.position.set(4, 2, -4);
  scene.add(rim);

  const ids = category === 'vehicles'
    ? ['tractor', 'harvester']
    : category === 'equipment'
      ? ['plough', 'seeder', 'sprayer', 'trailer']
      : ['loader', 'forks', 'weight'];
  const models = Object.fromEntries(ids.map(id => {
    const presentation = new THREE.Group();
    const model = createLoadoutAsset(category, id);
    if (category === 'vehicles') {
      model.rotation.y = Math.PI - .48;
      if (id === 'tractor') model.scale.setScalar(.92);
    }
    else if (category === 'equipment') {
      model.position.y = .38;
      model.rotation.y = -.36;
    }
    else model.rotation.y = -.45;
    presentation.add(model);
    return [id, presentation];
  }));
  const stage = new THREE.Group();
  stage.scale.setScalar(.72);
  scene.add(stage);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .24 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.4, .65, 1);
  stage.add(shadow);
  const modelEntries = Object.entries(models);
  modelEntries.forEach(([, model]) => stage.add(model));
  modelEntries.forEach(([, model]) => { model.visible = false; });
  let current = Object.keys(models)[0];

  const setItem = nextItem => {
    if (!models[nextItem]) return;
    current = nextItem;
    modelEntries.forEach(([name, model]) => model.scale.setScalar(name === current ? 1 : .88));
  };
  setItem(current);

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let frozen = false;

  return {
    setItem,
    render(time) {
      if (frozen) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.autoClear = false;
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.clear();
      stage.rotation.y = Math.sin(time * .45) * .045;
      stage.position.y = Math.sin(time * 1.2) * .025;
      const visibleEntries = category === 'vehicles'
        ? modelEntries.filter(([name]) => name === current)
        : modelEntries;
      const viewportWidth = width / visibleEntries.length;
      visibleEntries.forEach(([, model], index) => {
        model.visible = true;
        camera.aspect = viewportWidth / height;
        camera.updateProjectionMatrix();
        camera.lookAt(0, .65, 0);
        const x = index * viewportWidth;
        renderer.setViewport(x, 0, viewportWidth, height);
        renderer.setScissor(x, 0, viewportWidth, height);
        shadow.visible = true;
        renderer.render(scene, camera);
        model.visible = false;
      });
      shadow.visible = false;
      renderer.setScissorTest(false);
    },
    freeze() {
      if (frozen) return;
      this.render(0);
      const image = new Image();
      image.className = canvas.className;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.src = canvas.toDataURL('image/png');
      canvas.replaceWith(image);
      observer.disconnect();
      renderer.dispose();
      frozen = true;
    },
    dispose() { observer.disconnect(); renderer.dispose(); },
  };
}
