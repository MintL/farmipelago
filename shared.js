import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

export { THREE };

export const TILE = 1;
export const LEVEL_HEIGHT = 1;
export const GRASS_TOP = 0.1;
export const SOIL_DEPTH = LEVEL_HEIGHT - GRASS_TOP;
export const LAYER_DEPTH = LEVEL_HEIGHT;

export const mats = {
  grass: new THREE.MeshStandardMaterial({ color: 0x789a67, roughness: 1 }),
  grassHigh: new THREE.MeshStandardMaterial({ color: 0x8caa74, roughness: 1 }),
  tallGrass: new THREE.MeshStandardMaterial({
    color: 0x5e874d,
    emissive: 0x1b2d18,
    emissiveIntensity: .22,
    roughness: 1,
  }),
  soil: new THREE.MeshStandardMaterial({ color: 0x896754, roughness: 1 }),
  ploughed: new THREE.MeshStandardMaterial({ color: 0x654435, roughness: 1 }),
  furrow: new THREE.MeshStandardMaterial({ color: 0x3f2a22, roughness: 1 }),
  cornStem: new THREE.MeshStandardMaterial({ color: 0x4d8739, roughness: .92 }),
  cornLeaf: new THREE.MeshStandardMaterial({ color: 0x75ae45, roughness: .88 }),
  cornRipe: new THREE.MeshStandardMaterial({ color: 0xf2c84b, roughness: .78 }),
  cropShoot: new THREE.MeshStandardMaterial({ color: 0x68a84d, roughness: .92 }),
  cerealGreen: new THREE.MeshStandardMaterial({ color: 0x78a84b, roughness: .92 }),
  wheatRipe: new THREE.MeshStandardMaterial({ color: 0xd9b65a, roughness: .88 }),
  barleyRipe: new THREE.MeshStandardMaterial({ color: 0xc9a552, roughness: .9 }),
  canolaStem: new THREE.MeshStandardMaterial({ color: 0x4e8a42, roughness: .92 }),
  canolaFlower: new THREE.MeshStandardMaterial({ color: 0xf0ce32, roughness: .8 }),
  soybeanStem: new THREE.MeshStandardMaterial({ color: 0x4c7c3d, roughness: .94 }),
  soybeanLeaf: new THREE.MeshStandardMaterial({ color: 0x6b9b48, roughness: .9 }),
  soybeanPod: new THREE.MeshStandardMaterial({ color: 0xb78e48, roughness: .9 }),
  weed: new THREE.MeshStandardMaterial({ color: 0xb23d79, emissive: 0x4d102d, emissiveIntensity: .32, roughness: .8 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7d8580, roughness: 1 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x636b68, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x5e8c55, roughness: 1 }),
  leavesLight: new THREE.MeshStandardMaterial({ color: 0x7da467, roughness: 1 }),
  tractor: new THREE.MeshStandardMaterial({ color: 0x2878c8, roughness: 0.68 }),
  tractorDark: new THREE.MeshStandardMaterial({ color: 0x123b78, roughness: 0.74 }),
  tractorAccent: new THREE.MeshStandardMaterial({ color: 0x56b5f5, roughness: 0.55, metalness: 0.04 }),
  tractorCream: new THREE.MeshStandardMaterial({ color: 0xd7ecff, roughness: 0.74 }),
  combine: new THREE.MeshStandardMaterial({ color: 0x86a83d, roughness: 0.7 }),
  combineDark: new THREE.MeshStandardMaterial({ color: 0x35441f, roughness: 0.82 }),
  combineAccent: new THREE.MeshStandardMaterial({ color: 0xd9b948, roughness: 0.62, metalness: 0.06 }),
  combineCream: new THREE.MeshStandardMaterial({ color: 0xf0dfad, roughness: 0.74 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x81c9f5, roughness: 0.22, metalness: 0.15, transparent: true, opacity: 0.76 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x26302e, roughness: 0.96 }),
  hub: new THREE.MeshStandardMaterial({ color: 0x4f9fdf, roughness: 0.52, metalness: 0.12 }),
  headlamp: new THREE.MeshStandardMaterial({ color: 0xffe49a, emissive: 0xffbd46, emissiveIntensity: 1.25, roughness: 0.45 }),
  red: new THREE.MeshStandardMaterial({ color: 0xae6756, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb9c0b6, roughness: 0.58, metalness: 0.3 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0x9a6438, roughness: 0.88 }),
  bridgeDark: new THREE.MeshStandardMaterial({ color: 0x694127, roughness: 0.92 }),
  water: new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    transparent: false,
    blending: THREE.NoBlending,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float time;
      varying vec3 vWorldPosition;
      varying float vWave;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        float broadWave = sin(worldPosition.x * 2.2 + worldPosition.z * 1.7 + time * 1.15) * .014;
        float fineWave = sin(worldPosition.x * 8.7 - worldPosition.z * 6.2 + time * 2.4) * .006;
        vWave = broadWave + fineWave;
        worldPosition.y += vWave;
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vWorldPosition;
      varying float vWave;

      void main() {
        float ripples = sin(vWorldPosition.x * 13.0 + vWorldPosition.z * 9.0 - time * 2.6);
        ripples += sin(vWorldPosition.x * 7.0 - vWorldPosition.z * 15.0 + time * 1.8) * .55;
        float glint = smoothstep(.72, 1.32, ripples + vWave * 24.0);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDirection, vec3(0.0, 1.0, 0.0)), 0.0), 2.4);
        vec3 water = mix(vec3(.035, .24, .34), vec3(.12, .52, .66), glint * .38 + fresnel * .26);
        gl_FragColor = vec4(water + glint * vec3(.18, .34, .38), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }),
  waterFoam: new THREE.MeshStandardMaterial({
    color: 0xb9e6e8,
    emissive: 0x6abfc5,
    emissiveIntensity: .45,
    roughness: .35,
    transparent: true,
    opacity: .72,
    depthWrite: false,
  }),
  waterSplash: new THREE.MeshBasicMaterial({
    color: 0x62d8ee,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
};

export function box(width, height, depth, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function gridKey(gx, gz) {
  return `${gx},${gz}`;
}
