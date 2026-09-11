import { createGameBuilding, createPlaceableBuilding } from '../buildings/game.js';

export function createProcessorVisual(island, service) {
  const visual = createGameBuilding(service.definitionId), site = service.position;
  visual.group.position.set(site.x, site.y, site.z);
  island.group.add(visual.group);
  island.obstacles.push(...visual.colliders.map(collider => ({ ...collider,
    x: site.x + collider.x, y: site.y + collider.y, z: site.z + collider.z })));
  const bounds = visual.bounds.clone().translate(visual.group.position);
  if (island.serviceBounds) island.serviceBounds.union(bounds);
  else island.serviceBounds = bounds;
  return visual;
}

// Construction and suspended-island presentation reuse the exact encounter model.
export function createPlacedProcessorVisual(definitionId) {
  return createPlaceableBuilding(definitionId);
}

export function restorePlacedProcessors(island, saved = []) {
  island.placedProcessors = Array.isArray(saved) ? saved.filter(entry =>
    ['windmill', 'oil-press'].includes(entry?.type) && Number.isFinite(entry.x) && Number.isFinite(entry.z)) : [];
  island.placedProcessorVisuals = island.placedProcessors.map(entry => {
    const visual = createPlacedProcessorVisual(entry.type);
    visual.group.position.set(entry.x, entry.y || 0, entry.z);
    island.group.add(visual.group);
    if (visual.bounds) {
      const bounds = visual.bounds.clone().translate(visual.group.position);
      if (island.serviceBounds) island.serviceBounds.union(bounds);
      else island.serviceBounds = bounds;
    }
    return visual.group;
  });
}
