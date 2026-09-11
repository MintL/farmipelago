import { THREE, MODEL_VOXEL } from '../../core/shared.js';

const SIZE = 128;
const TAU = Math.PI * 2;
const surfaces = new Map();
const wrap = (value, period) => (value % period + period) % period;
const random = (x, y, seed = 0) => {
  let bits = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + seed * 31, 2246822519);
  bits = Math.imul(bits ^ bits >>> 13, 1274126177);
  return ((bits ^ bits >>> 16) >>> 0) / 4294967295;
};
const smooth = value => value * value * (3 - 2 * value);
const noise = (u, v, frequency, seed = 0) => {
  const x = u * frequency, y = v * frequency;
  const ix = Math.floor(x), iy = Math.floor(y);
  const at = (dx, dy) => random(wrap(ix + dx, frequency), wrap(iy + dy, frequency), seed);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(at(0, 0), at(1, 0), smooth(x - ix)),
    THREE.MathUtils.lerp(at(0, 1), at(1, 1), smooth(x - ix)), smooth(y - iy),
  ) * 2 - 1;
};

// Small, periodic surface maps store colour variation in R and finish variation
// in G. They contain no baked lighting, outlines, joints or fake cube edges.
function surfaceValue(kind, u, v) {
  const fine = noise(u, v, 64, 7), broad = noise(u, v, 6, 11);
  if (kind === 'timber' || kind === 'painted-wood') {
    const bend = Math.sin(v * TAU) * .55 + Math.sin(v * TAU * 2) * .22;
    const grain = Math.pow(.5 + .5 * Math.sin(u * TAU * 14 + bend), 5);
    const growth = Math.sin(u * TAU * 4 + bend * .5) * .18;
    const value = (grain - .25) * -.95 + growth + fine * .12;
    return kind === 'timber' ? value : value * .52 + broad * .12;
  }
  if (kind === 'plaster') return fine * .32 + noise(u, v, 20, 3) * .28 + broad * .17;
  if (kind === 'stone') return broad * .55 + noise(u, v, 19, 2) * .27 + fine * .18;
  if (kind === 'slate') {
    const cleft = Math.sin(v * TAU * 23 + Math.sin(u * TAU * 3) * .55);
    return broad * .3 + cleft * .16 + fine * .12;
  }
  if (kind === 'clay') return broad * .32 + noise(u, v, 30, 4) * .25 + fine * .15;
  if (kind === 'zinc') {
    // Broad, irregular zinc spangles rather than bright per-pixel glitter.
    return noise(u, v, 14, 5) * .7 + noise(u, v, 7, 6) * .18 + fine * .05;
  }
  if (kind === 'copper') return broad * .42 + noise(u, v, 28, 8) * .13;
  if (kind === 'painted-metal') return noise(u, v, 24, 9) * .2 + fine * .12;
  return broad * .08;
}

function getSurface(kind) {
  if (surfaces.has(kind)) return surfaces.get(kind);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const value = THREE.MathUtils.clamp(surfaceValue(kind, x / SIZE, y / SIZE), -1, 1);
    const index = (y * SIZE + x) * 4;
    data[index] = Math.round(128 + value * 120);
    data[index + 1] = Math.round(128 + value * 80);
    data[index + 2] = 128;
    data[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.name = `building-surface-${kind}`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  surfaces.set(kind, texture);
  return texture;
}

export function createSurfaceMaterial(definition, strength) {
  const material = new THREE.MeshStandardMaterial({
    name: `building-palette-${definition.id}`,
    color: definition.color, roughness: definition.roughness,
    metalness: definition.metalness || 0,
  });
  const texture = getSurface(definition.surface);
  const directional = definition.surface === 'timber' || definition.surface === 'painted-wood';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      voxelSurface: { value: texture }, voxelTextureStrength: strength,
      voxelTextureContrast: { value: definition.contrast },
      voxelTextureScale: { value: 1 / (MODEL_VOXEL * 6) },
      voxelDirectionalGrain: { value: directional ? 1 : 0 },
    });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vVoxelSurfacePosition;
      varying vec3 vVoxelSurfaceNormal;
      varying vec3 vVoxelRunSize;
    `).replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 surfacePosition = vec4(position, 1.0);
      vVoxelRunSize = vec3(1.0);
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
        vVoxelRunSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      #endif
      vVoxelSurfacePosition = surfacePosition.xyz;
      vVoxelSurfaceNormal = normal;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D voxelSurface;
      uniform float voxelTextureStrength;
      uniform float voxelTextureContrast;
      uniform float voxelTextureScale;
      uniform float voxelDirectionalGrain;
      varying vec3 vVoxelSurfacePosition;
      varying vec3 vVoxelSurfaceNormal;
      varying vec3 vVoxelRunSize;
    `).replace('#include <map_fragment>', `#include <map_fragment>
      // Object-space projection retains six-voxel texture scale on merged runs.
      // It also follows an animated part instead of swimming through world space.
      vec2 surfaceUv;
      vec2 surfaceSpan;
      vec3 surfaceNormal = abs(vVoxelSurfaceNormal);
      if (surfaceNormal.y > 0.5) {
        surfaceUv = vVoxelSurfacePosition.xz;
        surfaceSpan = vVoxelRunSize.xz;
      } else if (surfaceNormal.x > 0.5) {
        surfaceUv = vVoxelSurfacePosition.zy;
        surfaceSpan = vVoxelRunSize.zy;
      } else {
        surfaceUv = vVoxelSurfacePosition.xy;
        surfaceSpan = vVoxelRunSize.xy;
      }
      // Wood follows the long axis of a beam; upright runs keep vertical grain.
      if (voxelDirectionalGrain > 0.5 && surfaceSpan.x > surfaceSpan.y) surfaceUv = surfaceUv.yx;
      vec2 surfaceDetail = texture2D(voxelSurface, surfaceUv * voxelTextureScale).rg * 2.0 - 1.0;
      diffuseColor.rgb *= 1.0 + surfaceDetail.r * voxelTextureContrast * voxelTextureStrength;
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + surfaceDetail.g * voxelTextureStrength * 0.12, 0.08, 1.0);
    `);
  };
  material.customProgramCacheKey = () => 'farmipelago-voxel-surface-v1';
  return material;
}
