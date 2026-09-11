import { THREE, TILE } from '../core/shared.js';
import { createGrainMillConcept } from '../world/buildings/grain-mill-concept.js';
import { createStorehouseConcept } from '../world/buildings/storehouse-concept.js';
import { BUILDING_MODELS } from '../world/buildings/models.js';
import { HYBRID_STUDIES } from './hybrid-studies.js';

export const BUILDING_STYLES = [
  { id: 'voxel', name: 'Voxel' },
  { id: 'low-poly', name: 'Low poly' },
  { id: 'hybrid', name: 'Hybrid' },
];

function originalModel(definition) {
  const original = definition.create();
  const group = new THREE.Group(); group.add(original.group);
  if (original.front === -1) group.rotation.y = Math.PI;
  group.updateMatrixWorld(true);
  const bounds = original.bounds.clone().applyMatrix4(group.matrixWorld);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x, 0, -center.z);
  bounds.translate(group.position);
  return {
    group, bounds,
    animate: (time, working, reduced, elapsed = time) => original.animate(original.productionOnly ? time : elapsed, working, reduced, time),
    setLighting: lighting => {
      if (original.glowMaterial) original.glowMaterial.emissiveIntensity = lighting === 'evening' ? 1.3 : .28;
    },
  };
}

function voxelVariant(original) {
  return {
    create: () => originalModel(original),
    caption: original.cue,
    intro: original.cue.replaceAll(' · ', '\n'),
    note: original.motion,
    steps: [],
  };
}

export function volumeCorners(volumes) {
  const points = [];
  for (const [min, max] of volumes) {
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
      points.push(new THREE.Vector3(x, y, z).multiplyScalar(TILE));
    }
  }
  return points;
}

// Preserve the accepted mill's framing, including the full rotating sail sweep.
const millFraming = volumeCorners([
  [[-1.95, 0, -1.5], [.9, 3.98, 1.3]],
  [[-2.95, 0, -.95], [3.2, 2.12, 1.75]],
]);
for (let i = 0; i < 32; i++) {
  const angle = i * Math.PI / 16;
  millFraming.push(new THREE.Vector3(-.55 + Math.cos(angle) * 2.41, 3.05 + Math.sin(angle) * 2.41, 2.18).multiplyScalar(TILE));
}

const modernStudies = [
  {
    id: 'grain-mill', name: 'Grain mill', category: 'Processing', color: '#2878c8',
    subtitle: 'Wheat & barley → Flour', status: 'Milling',
    intro: 'Big sails. Busy millstones.\nA fresh sack of flour.',
    caption: 'A little mill with a big job.',
    steps: [
      ['Feed the hopper', 'Golden grain feeds into the mill.'],
      ['Turn the stones', 'Sails, shaft and flywheel bring the milling bay to life.'],
      ['Bag the flour', 'Sacks fill and roll out, ready to collect.'],
    ],
    target: [.1, 2.05, .35], framing: millFraming,
    tractor: [-1.7, .015, 3.5], tractorYaw: Math.PI / 2, frontApron: true,
    previous: 'windmill', create: createGrainMillConcept,
  },
  {
    id: 'storehouse', name: 'Settlement Storehouse', category: 'Settlement deliveries', color: '#347a79',
    subtitle: 'Agricultural goods → Settlement', status: 'Handling cargo',
    intro: 'A place for the harvest.\nA heart for the settlement.',
    caption: 'Bring the harvest home.',
    steps: [
      ['Deliver to the dock', 'Room to receive the harvest.'],
      ['Lift it into the hall', 'The hoist carries crates inside.'],
      ['Supply the settlement', 'Stocked shelves. A waving flag.'],
    ],
    target: [0, 1.8, .45],
    framing: volumeCorners([
      [[-2.61, 0, -1.9], [2.61, 2.55, 2.67]],
      [[-2.09, 2.55, -1.7], [2.09, 3.09, 1.59]],
      [[-1.3, 3.09, -1.7], [1.3, 3.58, 1.59]],
      [[-.68, 3.5, -.75], [.59, 4.66, -.4]],
      [[-3.13, 0, -1], [3.21, 1.4, .6]],
    ]),
    tractor: [-1.7, .015, 3.5], tractorYaw: Math.PI / 2, frontApron: true,
    previous: 'storehouse', create: createStorehouseConcept,
  },
];

export const BUILDING_STUDIES = modernStudies.map(study => {
  const original = BUILDING_MODELS.find(model => model.id === study.previous);
  const grainMill = study.id === 'grain-mill';
  return {
    ...study,
    target: grainMill ? [0, 2.75, .2] : study.target,
    defaultStyle: 'hybrid',
    variants: {
      voxel: voxelVariant(original),
      'low-poly': { create: study.create, framing: study.framing, note: grainMill ? 'Faceted forms and exposed machinery.' : 'A broad warehouse with an animated receiving bay.' },
      hybrid: grainMill ? {
        create: () => createGrainMillConcept({ hybrid: true }),
        caption: 'Block-built character. Freely modeled machinery.',
        intro: 'Stepped roof. Heavy timber.\nA working mill inside.',
        note: 'Voxel architecture with detailed sails, millstones and grain handling.',
        steps: [
          ['Chunky architecture', 'Stepped roof, thick walls and a timber balcony.'],
          ['Detailed machinery', 'Sails, pipes, stones and gears keep their finer forms.'],
          ['Grain becomes flour', 'The hopper feeds the stones and sacks fill at the chute.'],
        ],
        framing: [...millFraming, ...volumeCorners([[[-2.05, 0, -1.45], [.85, 4.65, 1.45]]])],
      } : {
        create: () => createStorehouseConcept({ hybrid: true }),
        caption: 'A chunky hall for the harvest.',
        intro: 'Stepped teal roof. Stocked shelves.\nA busy settlement dock.',
        note: 'Voxel walls and roof with a detailed crate hoist, cargo and village flag.',
        steps: [
          ['Built for the harvest', 'Thick walls, recessed windows and a broad stepped roof.'],
          ['A working receiving dock', 'The hoist lifts a loaded pallet and carries it inside.'],
          ['The settlement is supplied', 'Stocked racks, warm lanterns and a waving village flag.'],
        ],
        framing: volumeCorners([
          [[-2.6, 0, -2.2], [2.6, 2.8, 2.8]],
          [[-2.4, 2.8, -1.8], [2.4, 3.2, 1.6]],
          [[-1.6, 3.2, -1.8], [1.6, 3.6, 1.6]],
          [[-.5, 2.45, 1.4], [.5, 3.65, 1.9]],
          [[-.8, 3.4, -.83], [.59, 4.74, -.4]],
          [[-3.13, 0, -1], [3.21, 1.4, .6]],
        ]),
      },
    },
  };
});

// Every original building now has a purpose-built hybrid review option.
// Low-poly options remain available for the two studies made in that style.
for (const original of BUILDING_MODELS) {
  if (modernStudies.some(study => study.previous === original.id)) continue;
  BUILDING_STUDIES.push({
    id: original.id, name: original.name, category: original.category, color: original.color,
    subtitle: original.category, status: 'Animating', caption: original.cue,
    intro: original.cue, steps: [], defaultStyle: 'hybrid',
    tractor: [-2.7, .015, 3.5], tractorYaw: Math.PI / 2, frontApron: true,
    variants: { voxel: voxelVariant(original), hybrid: HYBRID_STUDIES[original.id] },
  });
}
