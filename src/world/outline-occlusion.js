import { THREE } from '../core/shared.js';

// Mark only vehicle pixels that pass the scene depth test. The building outline
// skips these pixels so visible machinery stays in front of the ground overlay.
export function createOutlineOcclusion(root) {
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, depthTest: true,
    transparent: true, stencilWrite: true, stencilRef: 4,
    stencilWriteMask: 4, stencilFuncMask: 4,
    stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  });
  const sources = [];
  root.traverse(source => {
    if (!source.isMesh) return;
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    if (materials.every(surface => surface.depthWrite && !surface.transparent)) sources.push(source);
  });
  const masks = sources.map(source => {
    const mask = source.isInstancedMesh ? new THREE.InstancedMesh(source.geometry, material, 0) : new THREE.Mesh(source.geometry, material);
    if (source.isInstancedMesh) {
      mask.instanceMatrix = source.instanceMatrix;
      mask.count = source.count;
      mask.onBeforeRender = () => { mask.count = source.count; };
    }
    mask.name = 'vehicle-outline-occlusion';
    mask.renderOrder = 89;
    mask.visible = false;
    mask.frustumCulled = false;
    mask.userData.noOcclusion = true;
    mask.raycast = () => {};
    // A child inherits the exact animated pose and equipment visibility.
    source.add(mask);
    return mask;
  });
  return { setVisible(visible) { masks.forEach(mask => { mask.visible = visible; }); } };
}
