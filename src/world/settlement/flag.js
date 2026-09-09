import { MODEL_VOXEL, THREE, createVoxelModel, mats } from '../../core/shared.js';
import { TRAVEL_DIRECTION } from '../travel.js';

export function createVillageFlag(site, { reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'village-wind-flag';
  // Mount on the storehouse ridge, above the receiving yard and vehicle routes.
  group.position.set(site.x, site.y + 11 * MODEL_VOXEL, site.z - 4.5 * MODEL_VOXEL);
  const parts = [
    { material: mats.bridgeDark, at: [0, 0, -1], size: [1, 1, 3] },
    { material: mats.metal, at: [0, 1, 0], size: [1, 8, 1] },
    { material: mats.combineAccent, at: [0, 9, 0], size: [1, 1, 1] },
  ];
  group.add(createVoxelModel(parts, { name: 'village-flag-mast', origin: [-.5, 0, -.5] }));
  const colliders = parts.map(({ at: [x, y, z], size: [width, height, depth] }) => ({
    shape: 'box',
    x: group.position.x + (x - .5 + width / 2) * MODEL_VOXEL,
    y: group.position.y + y * MODEL_VOXEL,
    z: group.position.z + (z - .5 + depth / 2) * MODEL_VOXEL,
    width: width * MODEL_VOXEL,
    height: height * MODEL_VOXEL,
    depth: depth * MODEL_VOXEL,
  }));

  const width = 8 * MODEL_VOXEL;
  const height = 4 * MODEL_VOXEL;
  const geometry = new THREE.PlaneGeometry(width, height, 16, 4);
  geometry.translate(width / 2, -height / 2, 0);
  const positions = geometry.attributes.position;
  positions.setUsage(THREE.DynamicDrawUsage);
  const rest = positions.array.slice();
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const color = positions.getX(index) <= MODEL_VOXEL ? mats.combineCream.color : mats.combineAccent.color;
    color.toArray(colors, index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: .95,
    side: THREE.DoubleSide,
  });
  const cloth = new THREE.Mesh(geometry, material);
  cloth.name = 'village-flag-cloth';
  cloth.position.set(MODEL_VOXEL / 2, 9 * MODEL_VOXEL, 0);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  const swivel = new THREE.Group();
  swivel.add(cloth);
  group.add(swivel);
  // A fixed conservative bound includes every flutter pose.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(width / 2, -height / 2, 0), width);

  const animate = (elapsed, travelState) => {
    const direction = travelState?.direction || TRAVEL_DIRECTION;
    // Air flows opposite world travel, matching the clouds and loose leaves.
    // The cloth extends along local +X; Three.js yaw maps that to (cos, -sin).
    swivel.rotation.y = Math.atan2(direction.z, -direction.x);
    const gust = THREE.MathUtils.clamp(Number(travelState?.gust) || 0, 0, 1);
    const amplitude = MODEL_VOXEL * (reducedMotion ? .12 : .55 + gust * .4);
    const time = elapsed * (reducedMotion ? 1.4 : 6);
    for (let index = 0; index < positions.count; index++) {
      const offset = index * 3;
      const x = rest[offset];
      const y = rest[offset + 1];
      const along = x / width;
      // Waves travel from the fixed hoist toward the free end.
      const wave = Math.sin(along * Math.PI * 3 - time + y * 1.5);
      const ripple = Math.sin(along * Math.PI * 6 - time * 1.7 + y * 3) * .22;
      positions.setXYZ(index, x,
        y - along * along * MODEL_VOXEL * .5 + wave * amplitude * along * .16,
        (wave + ripple) * amplitude * along);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  animate(0, null);

  return { group, colliders, animate };
}
