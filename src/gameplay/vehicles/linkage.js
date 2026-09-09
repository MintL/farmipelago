import { THREE, MODEL_VOXEL, mats, createVoxelModel } from '../../core/shared.js';

// Articulated lift links are separate rigid voxel bars. Their longitudinal
// transform follows the lift endpoints, like the existing wheel/joint animation.
export function createLiftLinkage(parent, front = false) {
  const group = new THREE.Group();
  group.name = front ? 'front-lift-linkage' : 'rear-three-point-linkage';
  parent.add(group);
  const links = (front ? [-.5, .5] : [-.3, .3, 0]).map((x, index) => {
    const upper = !front && index === 2;
    const model = createVoxelModel([{ material: upper ? mats.metal : mats.tractorDark, at: [0, 0, 0], size: [1, 1, 1] }], {
      name: 'lift-link', origin: [-.5, -.5, 0],
    });
    group.add(model);
    return { model, start: new THREE.Vector3(x, upper ? .8 : .4, front ? -.8 : .8),
      socket: new THREE.Vector3(front ? -x : x, upper ? .7 : .3, upper || front ? 0 : -.2) };
  });
  const end = new THREE.Vector3(), direction = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 0, 1);
  return {
    update(attachment) {
      group.visible = Boolean(attachment?.visible);
      if (!group.visible) return;
      attachment.updateMatrix();
      for (const { model, start, socket } of links) {
        end.copy(socket).applyMatrix4(attachment.matrix);
        direction.subVectors(end, start);
        const length = direction.length();
        direction.normalize();
        // Keep the angled bar's corners outside the socket and chassis faces.
        // This allows face contact without burying a second solid in the pin.
        const inset = MODEL_VOXEL * .5 * Math.hypot(direction.x, direction.y) / Math.max(.001, Math.abs(direction.z));
        const visibleLength = Math.max(.001, length - inset * 2);
        model.position.copy(start).addScaledVector(direction, Math.min(inset, length * .5));
        model.quaternion.setFromUnitVectors(axis, direction);
        model.scale.z = visibleLength / MODEL_VOXEL;
      }
    },
  };
}
