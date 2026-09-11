import { ISLAND_SERVICES } from '../../gameplay/catalog/island-services.js';

export const quantity = value => Number.isFinite(value) && value > 0 ? value : 0;
export const stockTotal = stock => Object.values(stock || {}).reduce((sum, value) => sum + quantity(value), 0);

export function processorStatus(service, definition = ISLAND_SERVICES[service.definitionId]) {
  if (stockTotal(service.stock) >= definition.capacity) return 'Storage full';
  return definition.inputs.some(input => quantity(service.inputStock[input.itemId]) > 0) ? 'Processing' : `Needs ${definition.inputLabel?.toLowerCase() || 'grain'}`;
}

// All processor stock is measured in litres. Pallet conversion belongs to its port.
export function processService(service, definition, dt) {
  const outputYield = definition.outputYield ?? 1;
  let budget = Math.min(Math.max(0, dt) * definition.litresPerSecond,
    Math.max(0, definition.capacity - stockTotal(service.stock)) / outputYield);
  let produced = 0;
  for (const input of definition.inputs) {
    const available = quantity(service.inputStock[input.itemId]);
    const amount = Math.min(available, budget);
    if (!amount) continue;
    service.inputStock[input.itemId] = available - amount;
    budget -= amount;
    produced += amount * outputYield;
  }
  service.stock[definition.outputItemId] = quantity(service.stock[definition.outputItemId]) + produced;
  return produced;
}
