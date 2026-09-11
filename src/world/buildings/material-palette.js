import { createSurfaceMaterial } from './material-surfaces.js';

// Candidate material library: deliberately separate from kit.js until the
// material review is complete. Semantic names will replace per-building tints.
export const BUILDING_MATERIALS = [
  { id: 'cream', name: 'Lime plaster', color: '#e8ddbb', family: 'Masonry', finish: 'Soft matte',
    surface: 'plaster', roughness: .94, contrast: .28,
    use: 'Light walls, mill towers and civic buildings.', detail: 'Fine pores and soft cloudy variation keep large walls from feeling plastic.' },
  { id: 'white', name: 'Chalk timber', color: '#f3ead2', family: 'Timber', finish: 'Painted matte',
    surface: 'painted-wood', roughness: .86, contrast: .32,
    use: 'Window frames, barn braces and roof trim.', detail: 'A faint grain remains visible through the warm white paint.' },
  { id: 'timber', name: 'Dark oak', color: '#634a37', family: 'Timber', finish: 'Dry, worn wood',
    surface: 'timber', roughness: .9, contrast: .4,
    use: 'Structural beams, posts and heavy door frames.', detail: 'Dark growth lines provide weight and texture without black seams.' },
  { id: 'wood', name: 'Honey oak', color: '#b88750', family: 'Timber', finish: 'Cut timber',
    surface: 'timber', roughness: .82, contrast: .36,
    use: 'Crates, pallets, counters, doors and balconies.', detail: 'Warm wood with gently wandering grain; the grain follows long beams.' },
  { id: 'red', name: 'Barn red', color: '#b65343', family: 'Painted timber', finish: 'Weathered paint',
    surface: 'painted-wood', roughness: .86, contrast: .3,
    use: 'Barn walls and small red architectural accents.', detail: 'A muted red surface with fine grain showing through the paint.' },
  { id: 'teal', name: 'Workshop teal', color: '#388888', family: 'Painted timber', finish: 'Satin paint',
    surface: 'painted-wood', roughness: .74, contrast: .28,
    use: 'Workshop walls, processor trim and shutters.', detail: 'A clear teal accent with restrained grain and a slightly smoother finish.' },
  { id: 'blue', name: 'Cottage blue', color: '#5d86a8', family: 'Painted timber', finish: 'Matte paint',
    surface: 'painted-wood', roughness: .84, contrast: .28,
    use: 'Cottage gables, shutters and doors.', detail: 'A quiet blue that stays distinct from teal in the same light.' },
  { id: 'green', name: 'Orchard green', color: '#607d4e', family: 'Painted timber', finish: 'Matte paint',
    surface: 'painted-wood', roughness: .87, contrast: .3,
    use: 'Shutters, small doors and garden-side trim.', detail: 'A natural green accent with the same fine grain as the other painted woods.' },
  { id: 'stone', name: 'Fieldstone', color: '#919487', family: 'Masonry', finish: 'Rough stone',
    surface: 'stone', roughness: .98, contrast: .34,
    use: 'Foundations, mill bases and masonry details.', detail: 'Soft mineral flecks and mottling; stone joints belong in the geometry.' },
  { id: 'darkStone', name: 'Basalt', color: '#626e69', family: 'Masonry', finish: 'Rough stone',
    surface: 'stone', roughness: .96, contrast: .3,
    use: 'Foundation courses, steps and structural bases.', detail: 'The darker stone anchors a building without making every edge black.' },
  { id: 'terracotta', name: 'Terracotta', color: '#ad7253', family: 'Roofing', finish: 'Unglazed clay',
    surface: 'clay', roughness: .9, contrast: .3,
    use: 'Warm stepped roofs, chimney caps and pots.', detail: 'Fine clay pores and gentle firing variation, without a printed tile grid.' },
  { id: 'charcoal', name: 'Charcoal slate', color: '#3b4d55', family: 'Roofing', finish: 'Split slate',
    surface: 'slate', roughness: .84, contrast: .34,
    use: 'Storehouse, barn and workshop roof courses.', detail: 'Subtle mineral layers catch the light across the dark blue-gray surface.' },
  { id: 'metal', name: 'Galvanized steel', color: '#b3bfbb', family: 'Metal', finish: 'Satin zinc',
    surface: 'zinc', roughness: .48, metalness: .58, contrast: .24,
    use: 'Silos, ladders, milk cans and machinery.', detail: 'Broad zinc mottling and a soft sheen make steel read differently from stone.' },
  { id: 'copper', name: 'Warm copper', color: '#bd7e4e', family: 'Metal', finish: 'Aged metal',
    surface: 'copper', roughness: .54, metalness: .52, contrast: .26,
    use: 'Press plumbing, vents and small roof fittings.', detail: 'Mild unevenness in the surface finish adds age while retaining the warm color.' },
  { id: 'gold', name: 'Harvest yellow', color: '#e4b94c', family: 'Painted metal', finish: 'Satin enamel',
    surface: 'painted-metal', roughness: .57, metalness: .12, contrast: .24,
    use: 'Hoists, grain emblems and delivery markers.', detail: 'A smooth, legible accent with a little enamel texture. Use it sparingly.' },
  { id: 'glass', name: 'Sky glazing', color: '#8cc1ce', family: 'Glazing', finish: 'Polished',
    surface: 'glass', roughness: .18, metalness: .22, contrast: .12,
    use: 'Recessed windows and workshop skylights.', detail: 'Almost smooth blue glazing. A readable stylized surface rather than clear glass.' },
];

export function createBuildingMaterialPalette({ strength = .65, textured = true } = {}) {
  const textureStrength = { value: textured ? strength : 0 };
  const materials = Object.fromEntries(BUILDING_MATERIALS.map(definition => [
    definition.id, createSurfaceMaterial(definition, textureStrength),
  ]));
  return {
    materials,
    setTextureStrength(value) { textureStrength.value = Math.max(0, Math.min(1, value)); },
    dispose() { Object.values(materials).forEach(material => material.dispose()); },
  };
}
