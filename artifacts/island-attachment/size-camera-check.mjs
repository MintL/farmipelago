import assert from 'node:assert/strict';
globalThis.matchMedia = () => ({ matches: false });
const { THREE } = await import('../../src/core/shared.js');
const { generateIsland } = await import('../../src/world/generator.js');
const { randomIslandSettings } = await import('../../src/world/islands/generation-settings.js');
const { attachmentCameraSide, attachmentCameraFrame } = await import('../../src/app/attachment-camera.js');
let small = 0;
for (let seed = 1; seed <= 1000; seed++) small += randomIslandSettings(seed * 137).radius < 6;
assert(small > 750 && small < 850);
for (let seed = 1; seed <= 64; seed++) {
  const island = generateIsland(seed * 137);
  assert(island.terrain.size > 20);
  assert([...island.terrain.values()].some(tile => tile.water));
  assert([...island.terrain.values()].some(tile => !tile.water && !tile.hasTree && tile.topY === 0));
  island.dispose();
}
console.log('PASS mostly small islands; 64 seeded islands retain water and usable dry land',small / 10 + '% small');
for (const aspect of [390 / 844, 16 / 9]) for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  const rotate = vector => vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  const arrival = { chainPairs: [-4, 4].map(x => ({ start: rotate(new THREE.Vector3(x, -1.2, 0)), end: rotate(new THREE.Vector3(x, -1.2, 10)) })), bridgeCenter: { y: 0 } };
  const side = attachmentCameraSide(arrival, new THREE.Vector3(15, 20, 25));
  for (const buildingBridge of [false, true]) {
    const frame = attachmentCameraFrame({ ...arrival, buildingBridge }, side, aspect);
    const camera = new THREE.PerspectiveCamera(frame.fov, aspect, .1, 1000);
    camera.position.copy(frame.position); camera.lookAt(frame.target); camera.updateMatrixWorld();
    for (const point of arrival.chainPairs.flatMap(pair => [pair.start, pair.end])) {
      const clip = point.clone().project(camera);
      assert(Math.abs(clip.x) < .85 && Math.abs(clip.y) < .85 && clip.z < 1, 'all chain anchors must fit with screen margin');
    }
  }
}
console.log('PASS chain and bridge camera frames all anchors on four shores in portrait and landscape');
