export const TEST_MODEL_ID = 'builtin-test-tractor';

export const testTractor = {
  format: 'farmipelago-voxel', version: 1, id: TEST_MODEL_ID,
  name: 'Test Tractor', category: 'vehicle',
  grid: { voxelSize: 0.11, up: 'y', forward: '-z' },
  origin: [0, 0, 0],
  materials: {
    body: { color: '#2878c8', roughness: 0.68 }, accent: { color: '#56b5f5', roughness: 0.55 },
    dark: { color: '#123b78', roughness: 0.8 }, tire: { color: '#26302e', roughness: 0.96 },
    cream: { color: '#d7ecff', roughness: 0.74 }, glass: { color: '#81c9f5', roughness: 0.22, opacity: 0.72 },
    lamp: { color: '#ffe49a', roughness: 0.45, emissive: '#ffbd46', emissiveIntensity: 1.15 },
  },
  parts: [
    { box: [-5, 3, -7, 10, 3, 13], material: 'body' },
    { box: [-4, 6, -8, 8, 3, 7], material: 'accent' },
    { box: [-4, 5, 0, 8, 2, 6], material: 'body' },
    { box: [-4, 8, 0, 8, 1, 6], material: 'cream' },
    { box: [-3, 9, 0, 6, 5, 5], material: 'glass' },
    { box: [-4, 14, 0, 8, 1, 6], material: 'cream' },
    { box: [-4, 7, -9, 8, 2, 1], material: 'dark' },
    { mirror: 'x', parts: [
      { box: [1, 7, -10, 2, 2, 1], material: 'lamp' },
      { box: [4, 1, -6, 3, 6, 5], material: 'tire' },
      { box: [4, 0, 1, 4, 8, 6], material: 'tire' },
      { box: [5, 3, -5, 1, 2, 3], material: 'cream' },
      { box: [5, 3, 2, 2, 2, 4], material: 'cream' },
    ] },
    { box: [-3, 9, -1, 6, 4, 1], material: 'glass' },
    { box: [-3, 9, 5, 6, 4, 1], material: 'glass' },
    { mirror: 'x', parts: [
      { box: [3, 9, 0, 1, 4, 5], material: 'glass' },
      { box: [4, 8, 1, 1, 6, 1], material: 'dark' },
    ] },
    { box: [-2, 6, -10, 4, 1, 1], material: 'cream' },
    { box: [-3, 9, -6, 1, 5, 1], material: 'dark' },
    { voxel: [-3, 14, -6], material: 'dark' },
    { voxel: [0, 15, 3], material: 'lamp' },
  ],
};
