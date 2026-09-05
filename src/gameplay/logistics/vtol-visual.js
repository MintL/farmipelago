import { MODEL_VOXEL, THREE, createVoxelModel } from '../../core/shared.js';

export function createVtol(mats) {
  const group = new THREE.Group();
  const modelRoot = new THREE.Group();
  const rotors = [];
  group.add(modelRoot);
  modelRoot.position.y = .06;

  const bodyParts = [
    { material: mats.cargoDarkMaterial, at: [1, 2, 1], size: [10, 3, 14] },
    { material: mats.cargoMaterial, at: [0, 5, 0], size: [12, 4, 16] },
    { material: mats.cargoMaterial, at: [1, 9, 2], size: [10, 2, 12] },
    { material: mats.markingMaterial, at: [2, 11, 4], size: [8, 2, 8] },
    { material: mats.cargoDarkMaterial, at: [-1, 7, 4], size: [1, 1, 8] },
    { material: mats.cargoDarkMaterial, at: [12, 7, 4], size: [1, 1, 8] },
    { material: mats.glassMaterial, at: [2, 7, -1], size: [8, 3, 1] },
    { material: mats.glassMaterial, at: [3, 10, 0], size: [6, 1, 1] },
    { material: mats.cargoMaterial, at: [4, 5, 16], size: [4, 4, 6] },
    { material: mats.markingMaterial, at: [5, 9, 18], size: [2, 3, 3] },
    { material: mats.markingMaterial, at: [5, 12, 19], size: [2, 4, 2] },
    { material: mats.deckEdgeMaterial, at: [1, 0, 2], size: [1, 1, 12] },
    { material: mats.deckEdgeMaterial, at: [10, 0, 2], size: [1, 1, 12] },
    { material: mats.deckEdgeMaterial, at: [1, 1, 3], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [1, 1, 12], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [10, 1, 3], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [10, 1, 12], size: [1, 1, 1] },
    { material: mats.deckEdgeMaterial, at: [-5, 8, 3], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [12, 8, 3], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [-5, 8, 13], size: [5, 1, 2] },
    { material: mats.deckEdgeMaterial, at: [12, 8, 13], size: [5, 1, 2] },
    { material: mats.lightMaterial, at: [5, 5, -1], size: [2, 1, 1] },
    { material: mats.redLightMaterial, at: [-1, 8, 2], size: [1, 1, 1] },
    { material: mats.lightMaterial, at: [12, 8, 2], size: [1, 1, 1] },
  ];
  modelRoot.add(createVoxelModel(bodyParts, {
    name: 'cargo-vtol-body',
    origin: [-6, 0, -9],
  }));

  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(0, 1.53, 1.66);
  modelRoot.add(hatchPivot);
  hatchPivot.add(createVoxelModel([
    { material: mats.cargoDarkMaterial, at: [0, 0, 0], size: [6, 1, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 3, 0], size: [6, 1, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 1, 0], size: [1, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [5, 1, 0], size: [1, 2, 1] },
    { material: mats.cargoMaterial, at: [1, 1, 0], size: [4, 2, 1] },
  ], { name: 'cargo-vtol-hatch', origin: [-3, -4, -.5] }));

  const podParts = [
    { material: mats.cargoDarkMaterial, at: [1, 0, 0], size: [5, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [1, 0, 6], size: [5, 2, 1] },
    { material: mats.cargoDarkMaterial, at: [0, 0, 1], size: [1, 2, 5] },
    { material: mats.cargoDarkMaterial, at: [6, 0, 1], size: [1, 2, 5] },
    { material: mats.deckMaterial, at: [2, 2, 1], size: [3, 1, 1] },
    { material: mats.deckMaterial, at: [2, 2, 5], size: [3, 1, 1] },
    { material: mats.deckMaterial, at: [1, 2, 2], size: [1, 1, 3] },
    { material: mats.deckMaterial, at: [5, 2, 2], size: [1, 1, 3] },
  ];
  const rotorParts = [
    { material: mats.markingMaterial, at: [2, 0, 2], size: [1, 1, 1] },
    { material: mats.markingMaterial, at: [0, 0, 2], size: [2, 1, 1] },
    { material: mats.markingMaterial, at: [3, 0, 2], size: [2, 1, 1] },
    { material: mats.markingMaterial, at: [2, 0, 0], size: [1, 1, 2] },
    { material: mats.markingMaterial, at: [2, 0, 3], size: [1, 1, 2] },
  ];
  for (const side of [-1, 1]) for (const z of [-1, 1]) {
    const pod = new THREE.Group();
    pod.position.set(side * 2.2, 1.66, z);
    pod.add(createVoxelModel(podParts, {
      name: 'cargo-vtol-fan-housing',
      origin: [-3.5, -1, -3.5],
    }));
    const rotor = new THREE.Group();
    rotor.position.y = .46;
    rotor.add(createVoxelModel(rotorParts, {
      name: 'cargo-vtol-rotor',
      origin: [-2.5, -.5, -2.5],
      receive: false,
    }));
    pod.add(rotor);
    modelRoot.add(pod);
    rotors.push(rotor);
  }
  group.scale.setScalar(.92);

  return {
    group,
    cargoTarget: new THREE.Vector3(0, 1.13, 1.38),
    animate(dt, power, landed, pickupProgress = 0) {
      for (const rotor of rotors) rotor.rotation.y += dt * (18 + power * 42);
      group.position.y = landed ? Math.sin(performance.now() * .003) * .025 : 0;
      group.rotation.z = landed ? 0 : Math.sin(performance.now() * .0018) * .025;
      hatchPivot.rotation.x = -ease(THREE.MathUtils.clamp(pickupProgress * 2.2, 0, 1)) * 1.3;
      const loadBounce = pickupProgress > 0 ? Math.sin(pickupProgress * Math.PI * 3) * .035 : 0;
      group.scale.setScalar(.92 * (1 - loadBounce));
    },
  };
}
