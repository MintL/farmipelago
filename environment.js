import { mats, THREE } from './shared.js';

export const DAY_CYCLE_SECONDS = 10 * 60;
export const DEFAULT_DAY_PHASE = 10 / 24;

const DAWN_START_HOUR = 2;
const DAY_START_HOUR = 4;
const DUSK_START_HOUR = 20;
const NIGHT_START_HOUR = 22;

const color = value => new THREE.Color(value);
const waterSplashDayColor = new THREE.Color().setRGB(.035, .24, .34);
const waterSplashNightColor = new THREE.Color().setRGB(.06, .19, .34);
const keyframes = [
  { hour: 0, top: color(0x1c3354), upper: color(0x3c5e82), horizon: color(0x7e9db3), lower: color(0x526f89), fog: color(0x607d94), key: color(0xc8ddff), keyIntensity: 1.25, hemiSky: color(0xa9c5e8), hemiGround: color(0x40536b), hemiIntensity: .78, fill: color(0xa6c1e4), fillIntensity: .34, exposure: 1.12 },
  { hour: 2, top: color(0x1c3354), upper: color(0x3c5e82), horizon: color(0x7e9db3), lower: color(0x526f89), fog: color(0x607d94), key: color(0xc8ddff), keyIntensity: 1.25, hemiSky: color(0xa9c5e8), hemiGround: color(0x40536b), hemiIntensity: .78, fill: color(0xa6c1e4), fillIntensity: .34, exposure: 1.12 },
  { hour: 3, top: color(0x344a6b), upper: color(0x756d91), horizon: color(0xc18a99), lower: color(0x7b667f), fog: color(0x7b8392), key: color(0xb7cff5), keyIntensity: .9, hemiSky: color(0xa5b8d2), hemiGround: color(0x514f5d), hemiIntensity: .76, fill: color(0xa0b7d5), fillIntensity: .3, exposure: 1.08 },
  { hour: 3.5, top: color(0x455f8b), upper: color(0x98789a), horizon: color(0xffad73), lower: color(0xc8796f), fog: color(0xb99a86), key: color(0xffb56d), keyIntensity: 1.45, hemiSky: color(0xb8c7d5), hemiGround: color(0x6a665d), hemiIntensity: .8, fill: color(0x9fb6d2), fillIntensity: .3, exposure: 1.04 },
  { hour: 4, top: color(0x4f8fbd), upper: color(0x85b8d1), horizon: color(0xe2eee7), lower: color(0xb7d3d4), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 20, top: color(0x4f8fbd), upper: color(0x85b8d1), horizon: color(0xe2eee7), lower: color(0xb7d3d4), fog: color(0xc7dce0), key: color(0xffe0ad), keyIntensity: 2.15, hemiSky: color(0xe8f0ef), hemiGround: color(0x657069), hemiIntensity: .68, fill: color(0xa9c4dc), fillIntensity: .2, exposure: .9 },
  { hour: 20.5, top: color(0x495d8b), upper: color(0x9c7290), horizon: color(0xf59b6e), lower: color(0xb56672), fog: color(0xb6847a), key: color(0xffa45e), keyIntensity: 1.5, hemiSky: color(0xc5b6bc), hemiGround: color(0x62534e), hemiIntensity: .78, fill: color(0x9da9c8), fillIntensity: .3, exposure: 1.04 },
  { hour: 21.25, top: color(0x344969), upper: color(0x6b688d), horizon: color(0xb27e91), lower: color(0x75647e), fog: color(0x7a7889), key: color(0xbdd3f7), keyIntensity: .9, hemiSky: color(0xa4b9d8), hemiGround: color(0x504e5d), hemiIntensity: .76, fill: color(0x9db7d8), fillIntensity: .3, exposure: 1.08 },
  { hour: 22, top: color(0x203b5c), upper: color(0x456889), horizon: color(0x86a1b5), lower: color(0x58758d), fog: color(0x667f94), key: color(0xc5dcff), keyIntensity: 1.15, hemiSky: color(0xa6c2e5), hemiGround: color(0x405269), hemiIntensity: .76, fill: color(0xa2bddf), fillIntensity: .32, exposure: 1.1 },
  { hour: 24, top: color(0x1c3354), upper: color(0x3c5e82), horizon: color(0x7e9db3), lower: color(0x526f89), fog: color(0x607d94), key: color(0xc8ddff), keyIntensity: 1.25, hemiSky: color(0xa9c5e8), hemiGround: color(0x40536b), hemiIntensity: .78, fill: color(0xa6c1e4), fillIntensity: .34, exposure: 1.12 },
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

function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color() },
    upperColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    lowerColor: { value: new THREE.Color() },
    sunViewDirection: { value: new THREE.Vector3() },
    moonViewDirection: { value: new THREE.Vector3() },
    sunVisibility: { value: 0 },
    moonVisibility: { value: 0 },
    sunGlowColor: { value: new THREE.Color(0xffbd78) },
    moonGlowColor: { value: new THREE.Color(0x9fc8ff) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    vertexShader: `
      varying vec3 vViewDirection;
      void main() {
        vViewDirection = normalize(mat3(modelViewMatrix) * position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 upperColor;
      uniform vec3 horizonColor;
      uniform vec3 lowerColor;
      uniform vec3 sunViewDirection;
      uniform vec3 moonViewDirection;
      uniform vec3 sunGlowColor;
      uniform vec3 moonGlowColor;
      uniform float sunVisibility;
      uniform float moonVisibility;
      varying vec3 vViewDirection;
      void main() {
        vec3 direction = normalize(vViewDirection);
        float height = direction.y;
        vec3 skyColor = topColor;
        skyColor = mix(skyColor, upperColor, smoothstep(-0.24, -0.08, height));
        skyColor = mix(skyColor, horizonColor, smoothstep(-0.08, 0.055, height));
        skyColor = mix(skyColor, lowerColor, smoothstep(0.085, 0.25, height));

        float silhouetteBand = 1.0 - smoothstep(0.0, 0.13, abs(height - 0.045));
        skyColor = mix(skyColor, horizonColor, silhouetteBand * 0.24);

        float sunAlignment = max(dot(direction, sunViewDirection), 0.0);
        float sunBloom = smoothstep(0.88, 0.995, sunAlignment) * 0.28;
        sunBloom += smoothstep(0.975, 0.9995, sunAlignment) * 0.44;
        skyColor += sunGlowColor * sunBloom * sunVisibility;

        float moonAlignment = max(dot(direction, moonViewDirection), 0.0);
        float moonBloom = smoothstep(0.91, 0.996, moonAlignment) * 0.17;
        moonBloom += smoothstep(0.982, 0.9995, moonAlignment) * 0.25;
        skyColor += moonGlowColor * moonBloom * moonVisibility;

        gl_FragColor = vec4(skyColor, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), material);
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function createCelestialDisc(discColor, radius) {
  const group = new THREE.Group();
  const discMaterial = new THREE.MeshBasicMaterial({
    color: discColor,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), discMaterial);
  group.add(disc);
  group.renderOrder = -80;
  return { group, discMaterial };
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
  const skyUpper = new THREE.Color();
  const skyHorizon = new THREE.Color();
  const skyLower = new THREE.Color();
  const fogColor = new THREE.Color();
  const keyColor = new THREE.Color();
  const hemiSky = new THREE.Color();
  const hemiGround = new THREE.Color();
  const fillColor = new THREE.Color();
  const cloudWhite = new THREE.Color(0xf7fbfa);
  const sunDirection = new THREE.Vector3();
  const moonDirection = new THREE.Vector3();
  const activeDirection = new THREE.Vector3();
  const cameraRightDirection = new THREE.Vector3();
  const celestialHorizontalDirection = new THREE.Vector3();
  const sunBackdropViewDirection = new THREE.Vector3();
  const moonBackdropViewDirection = new THREE.Vector3();
  const celestialWorldDirection = new THREE.Vector3();

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

  const sky = createSky();
  const sun = createCelestialDisc(0xffdda0, 3.15);
  const moon = createCelestialDisc(0xdce9ff, 2.55);
  const skyGroup = new THREE.Group();
  skyGroup.add(sky.mesh, sun.group, moon.group);
  scene.add(skyGroup);
  const lowFog = createLowFog();
  scene.add(lowFog.group);
  const cloudLayer = createClouds();
  scene.add(cloudLayer.group);

  const placeCelestialBackdrop = (celestial, physicalDirection, viewDirection) => {
    celestialHorizontalDirection.set(physicalDirection.x, 0, physicalDirection.z);
    if (celestialHorizontalDirection.lengthSq() < .0001) celestialHorizontalDirection.set(0, 0, -1);
    else celestialHorizontalDirection.normalize();
    const ndcX = THREE.MathUtils.clamp(celestialHorizontalDirection.dot(cameraRightDirection) * .55, -.55, .55);
    const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    viewDirection.set(
      ndcX * halfViewHeight * camera.aspect,
      .36 * halfViewHeight,
      -1,
    ).normalize();
    celestialWorldDirection.copy(viewDirection).applyQuaternion(camera.quaternion);
    celestial.group.position.copy(celestialWorldDirection).multiplyScalar(118);
    celestial.group.quaternion.copy(camera.quaternion);
  };

  const apply = (nextFocus = focus) => {
    focus.copy(nextFocus);
    const hour = phase * 24;
    sample(hour, 'top', skyTop);
    sample(hour, 'upper', skyUpper);
    sample(hour, 'horizon', skyHorizon);
    sample(hour, 'lower', skyLower);
    sample(hour, 'fog', fogColor);
    sample(hour, 'key', keyColor);
    sample(hour, 'hemiSky', hemiSky);
    sample(hour, 'hemiGround', hemiGround);
    sample(hour, 'fill', fillColor);

    sky.uniforms.topColor.value.copy(skyTop);
    sky.uniforms.upperColor.value.copy(skyUpper);
    sky.uniforms.horizonColor.value.copy(skyHorizon);
    sky.uniforms.lowerColor.value.copy(skyLower);
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

    skyGroup.position.copy(camera.position);
    cameraRightDirection.set(1, 0, 0).applyQuaternion(camera.quaternion);
    placeCelestialBackdrop(sun, sunDirection, sunBackdropViewDirection);
    placeCelestialBackdrop(moon, moonDirection, moonBackdropViewDirection);
    const sunVisibility = THREE.MathUtils.smoothstep(sunDirection.y, -.08, .04);
    const moonVisibility = THREE.MathUtils.smoothstep(moonDirection.y, -.08, .04);
    sky.uniforms.sunViewDirection.value.copy(sunBackdropViewDirection);
    sky.uniforms.moonViewDirection.value.copy(moonBackdropViewDirection);
    sky.uniforms.sunVisibility.value = sunVisibility;
    sky.uniforms.moonVisibility.value = moonVisibility;
    sun.discMaterial.opacity = sunVisibility;
    moon.discMaterial.opacity = moonVisibility * .94;
    sun.group.visible = sunVisibility > .001;
    moon.group.visible = moonVisibility > .001;

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
