import assert from 'node:assert/strict';
const { THREE } = await import('../../src/core/shared.js');
const { addBridgeBetween } = await import('../../src/world/bridges.js');
for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const constructionStart of ['from','to']) for (const reducedMotion of [false,true]) {
  const from = { x: 10, z: 20, topY: 0 };
  const to = { x: from.x + dx * 5, z: from.z + dz * 5, topY: 0 };
  const bridge = addBridgeBetween({id:'farmipelago'}, {id:'incoming'}, new Map(), new THREE.Group(), [], new THREE.MeshStandardMaterial(), [], [], [], {from,to,distance:4}, constructionStart);
  bridge.userData.setConstructionProgress(.08, reducedMotion);
  const deck = bridge.children.filter(object => object.isMesh);
  const visible = deck.filter(object => object.visible);
  assert(visible.length > 0 && visible.length < deck.length);
  for (const plank of visible) {
    const distance = (plank.position.x - from.x) * dx + (plank.position.z - from.z) * dz;
    assert(constructionStart === 'from' ? distance < 2.5 : distance > 2.5, 'first planks must appear at the retained shore');
  }
  bridge.userData.setConstructionProgress(1, reducedMotion);
  assert(deck.every(object => object.visible));
}
console.log('PASS expansion bridge grows from Farmipelago on all four shores; intro still grows from Settlement, including reduced motion');
