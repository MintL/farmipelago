import { createSettlementDevelopment } from '../world/settlement/development.js';

export { SETTLEMENT_STAGES, settlementTier } from '../world/settlement/development.js';
export const createSettlementStudy = () => createSettlementDevelopment({ ground: true });
