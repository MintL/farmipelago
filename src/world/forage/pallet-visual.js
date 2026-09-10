import { THREE, mats } from '../../core/shared.js';

// Packaged cargo visual: .82 × .56 × 1.15 model units; no loose-body physics.
export function createPalletVisual(geometry) {
  const group = new THREE.Group();
  group.name = 'flour-pallet';
  const part = (material, x, y, z, width, height, depth) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const x of [-.32, 0, .32]) part(mats.trunk, x, .055, 0, .12, .11, 1.15);
  for (const z of [-.46, -.23, 0, .23, .46]) part(mats.trunk, 0, .14, z, .82, .06, .18);
  for (const y of [.26, .45]) for (const x of [-.2, .2]) for (const z of [-.28, .28]) {
    part(mats.combineCream, x, y, z, .37, .16, .49);
    part(mats.bale, x, y + .085, z, .25, .01, .025);
  }
  return group;
}
