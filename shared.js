import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

export { THREE };

export const TILE = 1;
export const LEVEL_HEIGHT = 1;
export const GRASS_TOP = 0.1;
export const SOIL_DEPTH = LEVEL_HEIGHT - GRASS_TOP;
export const LAYER_DEPTH = LEVEL_HEIGHT;

export const mats = {
  grass: new THREE.MeshStandardMaterial({ color: 0x71b65a, roughness: 0.95 }),
  grassHigh: new THREE.MeshStandardMaterial({ color: 0x83c968, roughness: 0.95 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x8f5b3c, roughness: 1 }),
  ploughed: new THREE.MeshStandardMaterial({ color: 0x6f412d, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x777c78, roughness: 1 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x646a66, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x80502f, roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x4d9b4f, roughness: 1 }),
  leavesLight: new THREE.MeshStandardMaterial({ color: 0x6eb957, roughness: 1 }),
  tractor: new THREE.MeshStandardMaterial({ color: 0xe3b434, roughness: 0.72 }),
  tractorDark: new THREE.MeshStandardMaterial({ color: 0xa06b22, roughness: 0.8 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x9ed8dd, roughness: 0.35, metalness: 0.08 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x292d2c, roughness: 0.92 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xd7c7a0, roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb64d35, roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb7b6aa, roughness: 0.7 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0x9a6438, roughness: 0.88 }),
  bridgeDark: new THREE.MeshStandardMaterial({ color: 0x694127, roughness: 0.92 }),
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
