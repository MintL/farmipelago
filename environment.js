import { mats, THREE } from './shared.js';

export const DAY_CYCLE_SECONDS = 10 * 60;
export const DEFAULT_DAY_PHASE = 10 / 24;

const color = value => new THREE.Color(value);
const waterSplashDayColor = new THREE.Color().setRGB(.035, .24, .34);
const waterSplashNightColor = new THREE.Color().setRGB(.025, .10, .22);
const keyframes = [
  { hour: 0, top: color(0x172843), horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .62, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .5, fill: color(0x7998c4), fillIntensity: .15, exposure: 1 },
  { hour: 2.5, top: color(0x172843), horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .62, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .5, fill: color(0x7998c4), fillIntensity: .15, exposure: 1 },
  { hour: 5, top: color(0x273957), horizon: color(0x8b7181), fog: color(0x667181), key: color(0x9cb5db), keyIntensity: .08, hemiSky: color(0x8194b1), hemiGround: color(0x3c3a45), hemiIntensity: .5, fill: color(0x8099ba), fillIntensity: .16, exposure: .98 },
  { hour: 6.25, top: color(0x61799c), horizon: color(0xe5a678), fog: color(0xb99a86), key: color(0xffb56d), keyIntensity: .72, hemiSky: color(0xb8c7d5), hemiGround: color(0x6a665d), hemiIntensity: .62, fill: color(0x9fb6d2), fillIntensity: .18, exposure: .93 },
  { hour: 7.5, top: color(0xa6c8d5), horizon: color(0xd8e6df), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 17, top: color(0xa6c8d5), horizon: color(0xd8e6df), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 18.5, top: color(0x7582a2), horizon: color(0xe59672), fog: color(0xb6847a), key: color(0xffa45e), keyIntensity: .92, hemiSky: color(0xc5b6bc), hemiGround: color(0x62534e), hemiIntensity: .58, fill: color(0x9da9c8), fillIntensity: .18, exposure: .93 },
  { hour: 20, top: color(0x354766), horizon: color(0x8a6c82), fog: color(0x69677c), key: color(0xa9b8da), keyIntensity: .08, hemiSky: color(0x8497b8), hemiGround: color(0x393744), hemiIntensity: .5, fill: color(0x8199be), fillIntensity: .16, exposure: .98 },
  { hour: 21.5, top: color(0x1f3250), horizon: color(0x55738d), fog: color(0x49657a), key: color(0x96b5e2), keyIntensity: .4, hemiSky: color(0x7896c7), hemiGround: color(0x253146), hemiIntensity: .5, fill: color(0x7998c4), fillIntensity: .15, exposure: 1 },
  { hour: 24, top: color(0x172843), horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .62, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .5, fill: color(0x7998c4), fillIntensity: .15, exposure: 1 },
];

const clampPhase = value => {
  const phase = Number(value);
  return Number.isFinite(phase) ? ((phase % 1) + 1) % 1 : DEFAULT_DAY_PHASE;
};

const sample = (hour, property, target = null) => {
  let upperIndex = keyframes.findIndex(frame => frame.hour >= hour);
  if (upperIndex <= 0) upperIndex = 1;
  const lower = keyframes[upperIndex - 1];
  const upper = keyframes[upperIndex];
  const amount = THREE.MathUtils.smoothstep(hour, lower.hour, upper.hour);
  if (target) return target.copy(lower[property]).lerp(upper[property], amount);
  return THREE.MathUtils.lerp(lower[property], upper[property], amount);
};

const nightAmountAt = hour => {
  if (hour >= 20) return THREE.MathUtils.smoothstep(hour, 20, 21.5);
  if (hour < 5.75) return 1 - THREE.MathUtils.smoothstep(hour, 4.25, 5.75);
  return 0;
};

const lanternAmountAt = hour => {
  if (hour >= 17) return THREE.MathUtils.smoothstep(hour, 17, 18.5);
  if (hour < 8) return 1 - THREE.MathUtils.smoothstep(hour, 6.5, 8);
  return 0;
};

export function dayPhaseLabel(phase) {
  const hour = clampPhase(phase) * 24;
  if (hour >= 21 || hour < 3) return 'Moonlight';
  if (hour < 6) return 'Dawn';
  if (hour < 18) return 'Day';
  return 'Dusk';
}

function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vDirection;
      void main() {
        float heightMix = smoothstep(-0.22, 0.72, vDirection.y);
        gl_FragColor = vec4(mix(horizonColor, topColor, heightMix), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), material);
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function createStars() {
  let state = 0x71c3a59d;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const positions = [];
  for (let index = 0; index < 110; index++) {
    const azimuth = random() * Math.PI * 2;
    const y = -.08 + random() * 1.03;
    const radius = Math.sqrt(1 - Math.min(1, y * y));
    positions.push(Math.cos(azimuth) * radius * 124, y * 124, Math.sin(azimuth) * radius * 124);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdce9ff,
    size: 1.05,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -90;
  points.frustumCulled = false;
  return { points, material };
}

function createCelestialDisc(discColor, haloColor, radius) {
  const group = new THREE.Group();
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: haloColor,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const discMaterial = new THREE.MeshBasicMaterial({
    color: discColor,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.75, 28), haloMaterial);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), discMaterial);
  disc.position.z = .02;
  group.add(halo, disc);
  group.renderOrder = -80;
  return { group, haloMaterial, discMaterial };
}

function createLowFog() {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(320, 320);
  const material = new THREE.MeshBasicMaterial({
    color: 0xc7dce0,
    transparent: true,
    opacity: .26,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  for (let y = -1.35; y >= -7.35; y -= 1.5) {
    const layer = new THREE.Mesh(geometry, material);
    layer.position.y = y;
    layer.rotation.x = -Math.PI * .5;
    layer.frustumCulled = false;
    group.add(layer);
  }
  return { group, material };
}

function createClouds() {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0xf7fbfa, transparent: true, opacity: .88, fog: false, depthWrite: false });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const definitions = [
    { x: -13, y: -7, z: 18, width: 6.8, height: 2.4, depth: 3.2, phase: 0 },
    { x: -11.5, y: -6.2, z: 19, width: 3.8, height: 3.1, depth: 3.5, phase: .9 },
    { x: 13, y: -7.2, z: 13, width: 7.1, height: 2.6, depth: 3.3, phase: 1.7 },
    { x: 11.5, y: -6.3, z: 12, width: 3.5, height: 3.2, depth: 3.6, phase: 2.5 },
    { x: 5, y: -6, z: 2, width: 6.5, height: 2.5, depth: 3.1, phase: 3.3 },
    { x: -7, y: -5.8, z: -15, width: 7.2, height: 2.7, depth: 3.4, phase: 4.1 },
    { x: -6, y: -5.1, z: -16, width: 3.5, height: 3.2, depth: 3.7, phase: 5 },
    { x: 11.5, y: -6.4, z: -30, width: 6.5, height: 2.8, depth: 3.5, phase: 5.8 },
    { x: 7.5, y: -5.5, z: -31, width: 3.5, height: 3.4, depth: 3.7, phase: 6.6 },
    { x: -7, y: -5.4, z: -47, width: 6.8, height: 2.6, depth: 3.2, phase: 7.4 },
    { x: 9, y: -5.9, z: -61, width: 7.1, height: 2.7, depth: 3.4, phase: 8.2 },
    { x: 7, y: -5.1, z: -62, width: 3, height: 3.3, depth: 3.5, phase: 9 },
  ];
  const clouds = definitions.map(definition => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(definition.x, definition.y, definition.z);
    mesh.scale.set(definition.width, definition.height, definition.depth);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    return { mesh, ...definition };
  });
  return { group, material, clouds };
}

export function createEnvironment({ scene, renderer, camera, initialPhase = DEFAULT_DAY_PHASE, fogNear = 30, fogFar = 92 }) {
  let phase = clampPhase(initialPhase);
  let cloudElapsed = 0;
  const focus = new THREE.Vector3();
  const skyTop = new THREE.Color();
  const skyHorizon = new THREE.Color();
  const fogColor = new THREE.Color();
  const keyColor = new THREE.Color();
  const hemiSky = new THREE.Color();
  const hemiGround = new THREE.Color();
  const fillColor = new THREE.Color();
  const cloudWhite = new THREE.Color(0xf7fbfa);
  const sunDirection = new THREE.Vector3();
  const moonDirection = new THREE.Vector3();
  const activeDirection = new THREE.Vector3();

  scene.background = new THREE.Color(0xc7dce0);
  scene.fog = new THREE.Fog(0xc7dce0, fogNear, fogFar);

  const hemisphere = new THREE.HemisphereLight(0xe8f0ef, 0x657069, .68);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffe0ad, 2.15);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -30; key.shadow.camera.right = 30;
  key.shadow.camera.top = 34; key.shadow.camera.bottom = -34;
  key.shadow.camera.near = 1; key.shadow.camera.far = 90;
  key.shadow.bias = -.0001; key.shadow.normalBias = .025;
  key.shadow.radius = 2.4; key.shadow.intensity = .88;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa9c4dc, .2);
  scene.add(fill, fill.target);

  const sky = createSky();
  const stars = createStars();
  const sun = createCelestialDisc(0xffdda0, 0xffc56c, 3.15);
  const moon = createCelestialDisc(0xdce9ff, 0x8eb9ed, 2.55);
  const skyGroup = new THREE.Group();
  skyGroup.add(sky.mesh, stars.points, sun.group, moon.group);
  scene.add(skyGroup);
  const lowFog = createLowFog();
  scene.add(lowFog.group);
  const cloudLayer = createClouds();
  scene.add(cloudLayer.group);

  const apply = (nextFocus = focus) => {
    focus.copy(nextFocus);
    const hour = phase * 24;
    sample(hour, 'top', skyTop);
    sample(hour, 'horizon', skyHorizon);
    sample(hour, 'fog', fogColor);
    sample(hour, 'key', keyColor);
    sample(hour, 'hemiSky', hemiSky);
    sample(hour, 'hemiGround', hemiGround);
    sample(hour, 'fill', fillColor);

    sky.uniforms.topColor.value.copy(skyTop);
    sky.uniforms.horizonColor.value.copy(skyHorizon);
    scene.background.copy(skyHorizon);
    scene.fog.color.copy(fogColor);
    lowFog.material.color.copy(fogColor);
    cloudLayer.material.color.copy(skyHorizon).lerp(cloudWhite, .48);
    renderer.toneMappingExposure = sample(hour, 'exposure');

    hemisphere.color.copy(hemiSky);
    hemisphere.groundColor.copy(hemiGround);
    hemisphere.intensity = sample(hour, 'hemiIntensity');
    key.color.copy(keyColor);
    key.intensity = sample(hour, 'keyIntensity');
    fill.color.copy(fillColor);
    fill.intensity = sample(hour, 'fillIntensity');

    const orbit = (hour - 6) / 12 * Math.PI;
    const orbitCos = Math.cos(orbit);
    const orbitSin = Math.sin(orbit);
    sunDirection.set(
      orbitCos * .707 - orbitSin * .246,
      orbitSin * .937,
      orbitCos * .707 + orbitSin * .246,
    ).normalize();
    moonDirection.copy(sunDirection).multiplyScalar(-1);
    const useSun = hour >= 5.5 && hour < 20;
    activeDirection.copy(useSun ? sunDirection : moonDirection);
    activeDirection.y = Math.max(.14, activeDirection.y);
    activeDirection.normalize();
    key.position.copy(focus).addScaledVector(activeDirection, 45);
    key.target.position.copy(focus);
    fill.position.set(focus.x + 22, focus.y + 14, focus.z - 26);
    fill.target.position.copy(focus);

    skyGroup.position.copy(camera.position);
    sun.group.position.copy(sunDirection).multiplyScalar(118);
    moon.group.position.copy(moonDirection).multiplyScalar(118);
    sun.group.quaternion.copy(camera.quaternion);
    moon.group.quaternion.copy(camera.quaternion);
    const sunVisibility = THREE.MathUtils.smoothstep(sunDirection.y, -.08, .04);
    const moonVisibility = THREE.MathUtils.smoothstep(moonDirection.y, -.08, .04);
    sun.discMaterial.opacity = sunVisibility;
    sun.haloMaterial.opacity = sunVisibility * .18;
    moon.discMaterial.opacity = moonVisibility * .94;
    moon.haloMaterial.opacity = moonVisibility * .14;

    const nightAmount = nightAmountAt(hour);
    const lanternAmount = lanternAmountAt(hour);
    stars.material.opacity = THREE.MathUtils.smoothstep(nightAmount, .3, .92) * .82;
    mats.water.uniforms.nightAmount.value = nightAmount;
    mats.waterSplash.color.lerpColors(waterSplashDayColor, waterSplashNightColor, nightAmount);
    return { phase, hour, nightAmount, lanternAmount, label: dayPhaseLabel(phase) };
  };

  const initialState = apply(focus);
  return {
    update(dt, nextFocus) {
      phase = clampPhase(phase + Math.max(0, Number(dt) || 0) / DAY_CYCLE_SECONDS);
      cloudElapsed += Math.max(0, Number(dt) || 0);
      for (const cloud of cloudLayer.clouds) cloud.mesh.position.y = cloud.y + Math.sin(cloudElapsed * .3 + cloud.phase) * .12;
      return apply(nextFocus || focus);
    },
    setPhase(nextPhase, nextFocus) {
      phase = clampPhase(nextPhase);
      return apply(nextFocus || focus);
    },
    state: () => ({
      phase,
      hour: phase * 24,
      nightAmount: nightAmountAt(phase * 24),
      lanternAmount: lanternAmountAt(phase * 24),
      label: dayPhaseLabel(phase),
    }),
    persistentState: () => ({ phase }),
    initialState,
  };
}
