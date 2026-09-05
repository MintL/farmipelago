import { THREE } from '../../core/shared.js';
import { FRONT_EQUIPMENT_IDS, REAR_EQUIPMENT_IDS } from '../catalog/equipment.js';
import { createLoadoutAsset } from './assets.js';

export function createLoadoutPreview(canvas, category) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  camera.position.set(0, 2.7, 5.5);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x25231a, 1.45));
  const key = new THREE.DirectionalLight(0xffd89b, 1.55);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa1cfff, .65);
  rim.position.set(4, 2, -4);
  scene.add(rim);

  const ids = category === 'vehicles'
    ? ['tractor', 'harvester']
    : category === 'equipment'
      ? REAR_EQUIPMENT_IDS
      : FRONT_EQUIPMENT_IDS;
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
    current = models[nextItem] ? nextItem : null;
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
      const previewLift = category === 'vehicles' ? .16 : .3;
      stage.position.y = previewLift + Math.sin(time * 1.2) * .025;
      const visibleEntries = category === 'vehicles' ? modelEntries.filter(([name]) => name === current) : modelEntries;
      const canvasRect = canvas.getBoundingClientRect();
      const optionRects = category === 'vehicles'
        ? [canvasRect]
        : [...canvas.parentElement.querySelectorAll('.loadoutOption')].map(option => option.getBoundingClientRect());
      visibleEntries.forEach(([, model], index) => {
        const rect = optionRects[index];
        if (!rect) return;
        const viewportWidth = Math.max(1, rect.width);
        const viewportHeight = Math.max(1, rect.height);
        const x = Math.max(0, rect.left - canvasRect.left);
        const y = Math.max(0, height - (rect.bottom - canvasRect.top));
        model.visible = true;
        camera.aspect = viewportWidth / viewportHeight;
        camera.updateProjectionMatrix();
        camera.lookAt(0, .65, 0);
        renderer.setViewport(x, y, viewportWidth, viewportHeight);
        renderer.setScissor(x, y, viewportWidth, viewportHeight);
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
