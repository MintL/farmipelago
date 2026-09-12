import { THREE } from '../../core/shared.js';

// Inverted hull plus stencil: highlight only the outside silhouette, including
// instanced trees/terrain, without redrawing the full world into postprocess masks.
export function createIslandOutline(island, { groundOverlay = false } = {}) {
  if (island.selectionOutline) return island.selectionOutline;
  // Buildings need an independent silhouette mask: terrain must not hide the
  // few pixels of outline extending in front of their foundations and canopy.
  const stencilBit = groundOverlay ? 2 : 1;
  const maskMaterial = groundOverlay ? new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, depthTest: false,
    transparent: true, stencilWrite: true, stencilRef: stencilBit,
    stencilWriteMask: stencilBit, stencilFuncMask: stencilBit,
    stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }) : null;
  const material = new THREE.ShaderMaterial({
    uniforms: { viewport: { value: new THREE.Vector2(innerWidth, innerHeight) }, width: { value: 1 },
      opacity: { value: .65 }, color: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: `
      uniform vec2 viewport;
      uniform float width;
      void main() {
        vec4 local = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          local = instanceMatrix * local;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 view = modelViewMatrix * local;
        gl_Position = projectionMatrix * view;
        vec3 viewNormal = normalize(normalMatrix * n);
        gl_Position.xy += normalize(viewNormal.xy + vec2(.00001)) * width * 2.0 / viewport * gl_Position.w;
      }`,
    fragmentShader: 'uniform float opacity; uniform vec3 color; void main() { gl_FragColor = vec4(color, opacity); }',
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: !groundOverlay,
    stencilWrite: true, stencilRef: groundOverlay ? 0 : stencilBit, stencilWriteMask: stencilBit,
    stencilFuncMask: groundOverlay ? stencilBit | 4 : stencilBit,
    stencilFunc: groundOverlay ? THREE.EqualStencilFunc : THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  const root = new THREE.Group(); root.name = 'island-selection-outline';
  // Shader preparation happens before the island enters selection range.
  // Only the selection view may reveal this outline after its range check.
  root.visible = false;
  const entries = [];
  island.group.updateWorldMatrix(true, true);
  island.group.traverse(source => {
    if (!source.isMesh || source.material.isShaderMaterial || source.material.transparent) return;
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    if (!groundOverlay) materials.forEach(surface => {
      surface.stencilWrite = true; surface.stencilRef = stencilBit;
      surface.stencilWriteMask = stencilBit; surface.stencilFuncMask = stencilBit;
      surface.stencilFunc = THREE.AlwaysStencilFunc; surface.stencilZPass = THREE.ReplaceStencilOp;
    });
    const mesh = source.isInstancedMesh ? new THREE.InstancedMesh(source.geometry, material, 0) : new THREE.Mesh(source.geometry, material);
    if (source.isInstancedMesh) { mesh.instanceMatrix = source.instanceMatrix; mesh.count = source.count; }
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 90;
    mesh.raycast = () => {};
    mesh.userData.noOcclusion = true;
    mesh.frustumCulled = false;
    root.add(mesh); entries.push({ source, mesh });
    if (maskMaterial) {
      const mask = source.isInstancedMesh ? new THREE.InstancedMesh(source.geometry, maskMaterial, 0) : new THREE.Mesh(source.geometry, maskMaterial);
      if (source.isInstancedMesh) { mask.instanceMatrix = source.instanceMatrix; mask.count = source.count; }
      mask.matrixAutoUpdate = false;
      mask.renderOrder = 89;
      mask.raycast = () => {};
      mask.userData.noOcclusion = true;
      mask.frustumCulled = false;
      root.add(mask); entries.push({ source, mesh: mask });
    }
  });
  island.group.add(root);
  const inverse = new THREE.Matrix4();
  island.selectionOutline = {
    update(selected, visible) {
      root.visible = visible;
      if (!visible) return;
      material.uniforms.viewport.value.set(innerWidth, innerHeight);
      material.uniforms.width.value = selected ? 2.5 : groundOverlay ? 2 : 1;
      material.uniforms.opacity.value = selected || groundOverlay ? 1 : .65;
      material.uniforms.color.value.set(1, selected ? .76 : 1, selected ? .24 : 1);
      island.group.updateWorldMatrix(true, true);
      inverse.copy(island.group.matrixWorld).invert();
      for (const { source, mesh } of entries) {
        mesh.matrix.multiplyMatrices(inverse, source.matrixWorld);
        mesh.visible = source.visible;
        if (source.isInstancedMesh) mesh.count = source.count;
      }
    },
    dispose() { root.removeFromParent(); material.dispose(); maskMaterial?.dispose(); delete island.selectionOutline; },
  };
  return island.selectionOutline;
}
