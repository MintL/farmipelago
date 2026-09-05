import { cropIds } from '../catalog/crops.js';

const CONSTRUCTION_PHASES = new Set(['draft', 'pen-draft', 'complete']);

export const isDraft = building => building?.constructionPhase === 'draft';
export const isPenDraft = building => building?.constructionPhase === 'pen-draft';
export const isComplete = building => building?.constructionPhase === 'complete';

export function normalizedConstructionPhase(saved) {
  if (saved?.type === 'silo' && ['draft', 'complete'].includes(saved?.constructionPhase)) return saved.constructionPhase;
  if (saved?.type === 'cattle-barn' && CONSTRUCTION_PHASES.has(saved?.constructionPhase)) return saved.constructionPhase;
  if (saved?.type === 'silo' || saved?.pen?.vertices?.length >= 4 || saved?.animals?.length) return 'complete';
  return 'draft';
}

export function normalizedContents(contents) {
  return Object.fromEntries(cropIds.flatMap(cropId => {
    const amount = Math.max(0, Math.floor(Number(contents?.[cropId]) || 0));
    return amount ? [[cropId, amount]] : [];
  }));
}
