// Builds 0.373/0.374 represented Debug Flour as bulk litres or duplicated
// world/island bale records. Consume those representations once, before restore.
export function migratePalletState(saved) {
  if (!saved) return saved;
  const state = structuredClone(saved);
  const stock = state.palletStock ||= { enabled: false, source: {}, destination: {} };
  let recovered = 0;
  const seen = new Set();
  const strip = (records, duplicates = seen) => (records || []).filter(record => {
    if (record?.itemId !== 'flour') return true;
    if (!duplicates.has(record.id) && Number.isFinite(record.amount) && record.amount > 0) {
      recovered += Math.max(1, Math.floor(record.amount));
      duplicates.add(record.id);
      seen.add(record.id);
    }
    return false;
  });
  state.world.forage.bales = strip(state.world.forage.bales);
  for (const island of state.world.islands) island.content.forage.bales = strip(island.content.forage.bales);
  const pending = state.world.pendingAttachment;
  if (pending) { strip(pending.pallets, new Set()); delete pending.pallets; }
  for (const island of state.environment.encounters?.islands || []) {
    strip(island.pallets, new Set()); delete island.pallets;
  }
  const bulk = contents => {
    if (Number.isFinite(contents?.flour) && contents.flour > 0) recovered += Math.ceil(contents.flour / 1000);
    if (contents) delete contents.flour;
  };
  for (const building of state.buildings) bulk(building.contents);
  for (const vehicle of state.vehicles) {
    if (vehicle.loadout?.tool !== 'flatbed') bulk(vehicle.storage);
    if (seen.has(vehicle.equipmentState?.carriedBaleId)) vehicle.equipmentState.carriedBaleId = null;
  }
  if (recovered) {
    stock.source ||= {};
    stock.source.flour = (Number.isSafeInteger(stock.source.flour) ? stock.source.flour : 0) + recovered;
    stock.enabled = true;
  }
  return state;
}
