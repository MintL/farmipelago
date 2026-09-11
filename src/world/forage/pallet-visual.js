import { THREE, mats } from '../../core/shared.js';

// Packaged cargo visual: .82 × .56 × 1.15 model units; no loose-body physics.
export function createPalletVisual(geometry) {
  const group = new THREE.Group();
  group.name = 'goods-pallet';
  const packages = [], caps = [];
  const part = (material, x, y, z, width, height, depth) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  for (const x of [-.32, 0, .32]) part(mats.trunk, x, .055, 0, .12, .11, 1.15);
  for (const z of [-.46, -.23, 0, .23, .46]) part(mats.trunk, 0, .14, z, .82, .06, .18);
  for (const y of [.26, .45]) for (const x of [-.2, .2]) for (const z of [-.28, .28]) {
    packages.push(part(mats.combineCream, x, y, z, .37, .16, .49));
    caps.push(part(mats.bale, x, y + .085, z, .25, .01, .025));
  }
  group.userData.setGood = itemId => {
    const oil = itemId === 'vegetable-oil';
    packages.forEach(mesh => { mesh.material = oil ? mats.bale : mats.combineCream; });
    caps.forEach(mesh => {
      mesh.material = oil ? mats.trunk : mats.bale;
      mesh.scale.set(oil ? .08 : .25, oil ? .035 : .01, oil ? .08 : .025);
    });
  };
  return group;
}
