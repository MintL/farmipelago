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
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(part.geometry, 24), material);
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
