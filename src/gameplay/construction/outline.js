import { THREE } from '../../core/shared.js';

export function createConstructionOutline(root) {
  const material = new THREE.LineBasicMaterial({
    color: 0xd9ff78,
    transparent: true,
    opacity: .82,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = [];
  root.traverse(part => {
    if (!part.isMesh || !part.castShadow || !part.geometry) return;
    let geometry = new THREE.EdgesGeometry(part.geometry, 24);
    if (part.isInstancedMesh) {
      const source = geometry.attributes.position, positions = new Float32Array(source.count * part.count * 3);
      const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
      for (let instance = 0; instance < part.count; instance++) {
        part.getMatrixAt(instance, matrix);
        for (let index = 0; index < source.count; index++) {
          point.fromBufferAttribute(source, index).applyMatrix4(matrix).toArray(positions, (instance * source.count + index) * 3);
        }
      }
      geometry.dispose();
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
    const line = new THREE.LineSegments(geometry, material);
    line.name = 'construction-outline';
    line.scale.setScalar(1.012);
    line.renderOrder = 8;
    part.add(line);
    lines.push(line);
  });
  return {
    animate(elapsed) {
      material.opacity = .58 + (Math.sin(elapsed * 4.5) * .5 + .5) * .36;
    },
    dispose() {
      for (const line of lines) {
        line.removeFromParent();
        line.geometry.dispose();
      }
      material.dispose();
      lines.length = 0;
    },
  };
}
