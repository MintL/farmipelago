import { createCombineAsset, createLoadoutAsset, createRearToolAsset, createTractorAsset } from './farm-assets.js?v=combine-fix-20260830-6';
import { THREE } from './shared.js?v=combine-fix-20260830-6';

export function createTractor(scene) {
  const root = new THREE.Group();
  const { group: tractorVisual, wheels: tractorWheels } = createTractorAsset();
  const combine = createCombineAsset();
  let wasGrounded = false;
  let lastVerticalSpeed = 0;
  let landingSquash = 0;
  root.scale.setScalar(.92);
  root.add(tractorVisual, combine.group);
  combine.group.visible = false;
  scene.add(root);
  const toolDownY = .3;
  const toolUpY = .78;
  let toolTargetY = toolUpY;
  const attachments = Object.fromEntries(['plough', 'seeder', 'sprayer'].map(type => {
    const attachment = createRearToolAsset(type);
    attachment.position.set(0, toolUpY, 1.38);
    tractorVisual.add(attachment);
    return [type, attachment];
  }));
  let loadout = 'plough';
  let vehicle = 'tractor';
  Object.entries(attachments).forEach(([name, attachment]) => { attachment.visible = name === loadout; });

  return {
    setLoadout(nextLoadout) {
      const nextVehicle = nextLoadout.vehicle || vehicle;
      const nextTool = nextLoadout.tool || loadout;
      vehicle = nextVehicle;
      tractorVisual.visible = vehicle !== 'harvester';
      combine.group.visible = vehicle === 'harvester';
      if (attachments[nextTool]) loadout = nextTool;
      Object.entries(attachments).forEach(([name, attachment]) => {
        attachment.visible = vehicle !== 'harvester' && name === loadout;
      });
    },
    setToolEnabled(enabled) { toolTargetY = enabled ? toolDownY : toolUpY; },
    sync(state, heading, steer, driveAmount, dt, elapsed) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.y = heading;
      if (state.grounded && !wasGrounded && lastVerticalSpeed < -1.4) {
        landingSquash = Math.min(.3, .12 + Math.abs(lastVerticalSpeed) * .018);
      }
      landingSquash *= Math.exp(-7 * dt);
      wasGrounded = state.grounded;
      lastVerticalSpeed = state.verticalSpeed;
      const attachment = attachments[loadout];
      attachment.position.y += (toolTargetY - attachment.position.y) * (1 - Math.exp(-10 * dt));
      const headerTargetY = vehicle === 'harvester' && toolTargetY === toolDownY ? .24 : .42;
      combine.header.position.y += (headerTargetY - combine.header.position.y) * (1 - Math.exp(-10 * dt));

      const speedFactor = Math.min(1, state.speed / 5.5);
      const activeWheels = vehicle === 'harvester' ? combine.wheels : tractorWheels;
      activeWheels.forEach(wheel => {
        wheel.spin += state.speed * dt / wheel.radius;
        wheel.roller.rotation.x = wheel.spin;
        if (wheel.front || wheel.steer) wheel.holder.rotation.y = steer * .38;
        const wobble = Math.sin(elapsed * (8 + speedFactor * 15) + wheel.phase) * (.012 + speedFactor * .065);
        wheel.holder.rotation.z = wobble;
      });
      const engineBob = state.grounded ? Math.sin(elapsed * (8 + Math.min(1, state.speed / 4) * 5)) * .04 * Math.min(1, state.speed / 4) : 0;
      const airStretch = state.grounded ? 0 : .14;
      const squash = landingSquash - airStretch;
      const visual = vehicle === 'harvester' ? combine.group : tractorVisual;
      visual.position.y = engineBob;
      visual.scale.set(1 + squash * .9, 1 - squash, 1 + squash * .9);
      visual.rotation.z = -steer * Math.min(1, state.speed / 4) * .1;
      visual.rotation.x = state.grounded ? -driveAmount * .035 : THREE.MathUtils.clamp(-state.verticalSpeed * .045, -.28, .28);
      if (vehicle === 'harvester') combine.reel.rotation.x -= (toolTargetY === toolDownY ? Math.max(.7, state.speed * 3.2) : 0) * dt;
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
      ? ['plough', 'seeder', 'sprayer']
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
      const viewportWidth = width / modelEntries.length;
      renderer.autoClear = false;
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.clear();
      stage.rotation.y = Math.sin(time * .45) * .045;
      stage.position.y = Math.sin(time * 1.2) * .025;
      modelEntries.forEach(([, model], index) => {
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
