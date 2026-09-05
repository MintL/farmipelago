import { mats, THREE } from '../../core/shared.js';

export const DAY_CYCLE_SECONDS = 10 * 60;
export const DEFAULT_DAY_PHASE = 10 / 24;

const DAWN_START_HOUR = 2;
const DAY_START_HOUR = 4;
const DUSK_START_HOUR = 20;
const NIGHT_START_HOUR = 22;

const color = value => new THREE.Color(value);
const waterSplashDayColor = new THREE.Color().setRGB(.035, .24, .34);
const waterSplashNightColor = new THREE.Color().setRGB(.025, .10, .22);
const keyframes = [
  { hour: 0, horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .58, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .48, fill: color(0x7998c4), fillIntensity: .13, exposure: .96 },
  { hour: 2, horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .58, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .48, fill: color(0x7998c4), fillIntensity: .13, exposure: .96 },
  { hour: 3, horizon: color(0xc18a99), fog: color(0x7b8392), key: color(0xb7cff5), keyIntensity: .9, hemiSky: color(0xa5b8d2), hemiGround: color(0x514f5d), hemiIntensity: .76, fill: color(0xa0b7d5), fillIntensity: .3, exposure: 1.08 },
  { hour: 3.5, horizon: color(0xffad73), fog: color(0xb99a86), key: color(0xffb56d), keyIntensity: 1.45, hemiSky: color(0xb8c7d5), hemiGround: color(0x6a665d), hemiIntensity: .8, fill: color(0x9fb6d2), fillIntensity: .3, exposure: 1.04 },
  { hour: 4, horizon: color(0xe2eee7), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 20, horizon: color(0xe2eee7), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 20.5, horizon: color(0xf59b6e), fog: color(0xb6847a), key: color(0xffa45e), keyIntensity: 1.5, hemiSky: color(0xc5b6bc), hemiGround: color(0x62534e), hemiIntensity: .78, fill: color(0x9da9c8), fillIntensity: .3, exposure: 1.04 },
  { hour: 21.25, horizon: color(0xb27e91), fog: color(0x7a7889), key: color(0xbdd3f7), keyIntensity: .9, hemiSky: color(0xa4b9d8), hemiGround: color(0x504e5d), hemiIntensity: .76, fill: color(0x9db7d8), fillIntensity: .3, exposure: 1.08 },
  { hour: 22, horizon: color(0x55738d), fog: color(0x49657a), key: color(0x96b5e2), keyIntensity: .45, hemiSky: color(0x7896c7), hemiGround: color(0x253146), hemiIntensity: .5, fill: color(0x7998c4), fillIntensity: .15, exposure: .98 },
  { hour: 24, horizon: color(0x496984), fog: color(0x405c72), key: color(0x9dbde8), keyIntensity: .58, hemiSky: color(0x7896c7), hemiGround: color(0x202b3d), hemiIntensity: .48, fill: color(0x7998c4), fillIntensity: .13, exposure: .96 },
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
  if (hour >= DUSK_START_HOUR) return THREE.MathUtils.smoothstep(hour, DUSK_START_HOUR, NIGHT_START_HOUR);
  if (hour < DAY_START_HOUR) return 1 - THREE.MathUtils.smoothstep(hour, DAWN_START_HOUR, DAY_START_HOUR);
  return 0;
};

const lanternAmountAt = hour => {
  if (hour >= 19) return THREE.MathUtils.smoothstep(hour, 19, DUSK_START_HOUR);
  if (hour < DAY_START_HOUR) return 1 - THREE.MathUtils.smoothstep(hour, 3, DAY_START_HOUR);
  return 0;
};

export function dayPhaseLabel(phase) {
  const hour = clampPhase(phase) * 24;
  if (hour >= NIGHT_START_HOUR || hour < DAWN_START_HOUR) return 'Moonlight';
  if (hour < DAY_START_HOUR) return 'Dawn';
  if (hour < DUSK_START_HOUR) return 'Day';
  return 'Dusk';
}

const sunOrbitAt = hour => {
  if (hour >= DAY_START_HOUR && hour < DUSK_START_HOUR) {
    return (hour - DAY_START_HOUR) / (DUSK_START_HOUR - DAY_START_HOUR) * Math.PI;
  }
  const nightHour = hour >= DUSK_START_HOUR ? hour - DUSK_START_HOUR : hour + 24 - DUSK_START_HOUR;
  const nightHours = 24 - DUSK_START_HOUR + DAY_START_HOUR;
  return Math.PI + nightHour / nightHours * Math.PI;
};

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

export function createEnvironment({ scene, renderer, initialPhase = DEFAULT_DAY_PHASE, fogNear = 30, fogFar = 92 }) {
  let phase = clampPhase(initialPhase);
  let cloudElapsed = 0;
  const focus = new THREE.Vector3();
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
  const shadowMapSize = Math.min(innerWidth, innerHeight) <= 680 ? 1024 : 2048;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.camera.left = -30; key.shadow.camera.right = 30;
  key.shadow.camera.top = 34; key.shadow.camera.bottom = -34;
  key.shadow.camera.near = 1; key.shadow.camera.far = 90;
  key.shadow.bias = -.0001; key.shadow.normalBias = .025;
  key.shadow.radius = 2.4; key.shadow.intensity = .88;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa9c4dc, .2);
  scene.add(fill, fill.target);

  const lowFog = createLowFog();
  scene.add(lowFog.group);
  const cloudLayer = createClouds();
  scene.add(cloudLayer.group);

  const apply = (nextFocus = focus) => {
    focus.copy(nextFocus);
    const hour = phase * 24;
    sample(hour, 'horizon', skyHorizon);
    sample(hour, 'fog', fogColor);
    sample(hour, 'key', keyColor);
    sample(hour, 'hemiSky', hemiSky);
    sample(hour, 'hemiGround', hemiGround);
    sample(hour, 'fill', fillColor);

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

    const orbit = sunOrbitAt(hour);
    const orbitCos = Math.cos(orbit);
    const orbitSin = Math.sin(orbit);
    sunDirection.set(
      orbitCos * .707 - orbitSin * .246,
      orbitSin * .937,
      orbitCos * .707 + orbitSin * .246,
    ).normalize();
    moonDirection.copy(sunDirection).multiplyScalar(-1);
    const useSun = hour >= 3 && hour < 21.25;
    activeDirection.copy(useSun ? sunDirection : moonDirection);
    activeDirection.y = Math.max(.14, activeDirection.y);
    activeDirection.normalize();
    key.position.copy(focus).addScaledVector(activeDirection, 45);
    key.target.position.copy(focus);
    fill.position.set(focus.x + 22, focus.y + 14, focus.z - 26);
    fill.target.position.copy(focus);

    const nightAmount = nightAmountAt(hour);
    const lanternAmount = lanternAmountAt(hour);
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
