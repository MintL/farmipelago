import { mats } from '../../core/shared.js';
import { crops, cropStageSeconds } from '../../gameplay/catalog/crops.js';

const clamp = value => Math.min(1, Math.max(0, Number(value) || 0));
export const cropProgress = (crop, elapsed, fastGrowth) => crop.stage >= 4 ? 0
  : crop.frozenProgress ?? clamp((elapsed - crop.stageStarted) / cropStageSeconds(crop.cropId, fastGrowth));

export function saveFieldTiles(terrain, elapsed, fastGrowth) {
  return [...terrain].flatMap(([key, tile]) => {
    if (!tile.ploughed && !tile.crop) return [];
    return [{ key, ploughed: tile.ploughed,
      crop: tile.crop ? { cropId: tile.crop.cropId, stage: tile.crop.stage,
        stageProgress: cropProgress(tile.crop, elapsed, fastGrowth),
        weeds: Boolean(tile.crop.weeds) } : null }];
  });
}

export function restoreCrop(saved, elapsed, fastGrowth) {
  if (!Object.hasOwn(crops, saved?.cropId) || !Number.isInteger(saved.stage) || saved.stage < 1 || saved.stage > 4) return null;
  // Older saves used seconds at the prototype speed, never normal-speed seconds.
  const progress = saved.stageProgress == null
    ? clamp((Number(saved.stageElapsed) || 0) / cropStageSeconds(saved.cropId, true)) : clamp(saved.stageProgress);
  return { cropId: saved.cropId, stage: saved.stage,
    stageStarted: elapsed - progress * cropStageSeconds(saved.cropId, fastGrowth),
    weeds: saved.cropId !== 'grass' && saved.stage >= 2 && Boolean(saved.weeds) };
}

export function paintFieldTile(tile) {
  const color = mats.ploughed.color;
  tile.surfaceBatch.setColorAt(tile.surfaceInstance, color);
  tile.surfaceBatch.instanceColor.needsUpdate = true;
  const attribute = tile.surfaceTopBatch?.geometry.getAttribute('color');
  if (!attribute || tile.surfaceTopColorOffset < 0) return;
  for (let index = 0; index < tile.surfaceTopColorCount; index++) {
    attribute.setXYZ(tile.surfaceTopColorOffset + index, color.r, color.g, color.b);
  }
  attribute.needsUpdate = true;
}
