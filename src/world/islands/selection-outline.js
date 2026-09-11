import { THREE } from '../../core/shared.js';

// Inverted hull plus stencil: highlight only the outside silhouette, including
// instanced trees/terrain, without redrawing the full world into postprocess masks.
export function createIslandOutline(island) {
  if (island.selectionOutline) return island.selectionOutline;
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
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
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
    materials.forEach(surface => { surface.stencilWrite = true; surface.stencilRef = 1; surface.stencilFunc = THREE.AlwaysStencilFunc; surface.stencilZPass = THREE.ReplaceStencilOp; });
    const mesh = source.isInstancedMesh ? new THREE.InstancedMesh(source.geometry, material, 0) : new THREE.Mesh(source.geometry, material);
    if (source.isInstancedMesh) { mesh.instanceMatrix = source.instanceMatrix; mesh.count = source.count; }
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 90;
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    root.add(mesh); entries.push({ source, mesh });
  });
  island.group.add(root);
  const inverse = new THREE.Matrix4();
  island.selectionOutline = {
    update(selected, visible) {
      root.visible = visible;
      if (!visible) return;
      material.uniforms.viewport.value.set(innerWidth, innerHeight);
      material.uniforms.width.value = selected ? 2.5 : 1;
      material.uniforms.opacity.value = selected ? 1 : .65;
      material.uniforms.color.value.set(1, selected ? .76 : 1, selected ? .24 : 1);
      island.group.updateWorldMatrix(true, true);
      inverse.copy(island.group.matrixWorld).invert();
      for (const { source, mesh } of entries) {
        mesh.matrix.multiplyMatrices(inverse, source.matrixWorld);
        mesh.visible = source.visible;
        if (source.isInstancedMesh) mesh.count = source.count;
      }
    },
    dispose() { root.removeFromParent(); material.dispose(); delete island.selectionOutline; },
  };
  return island.selectionOutline;
}
