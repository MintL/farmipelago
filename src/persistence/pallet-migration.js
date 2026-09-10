// Remove obsolete Debug/recovery inventories and manual Flour props on load.
// Current flatbed cargo and island service stock are preserved.
export function migratePalletState(saved) {
  if (!saved) return saved;
  const state = structuredClone(saved);
  delete state.palletStock;
  const removedIds = new Set();
  const strip = records => (records || []).filter(record => {
    if (record?.itemId !== 'flour') return true;
    removedIds.add(record.id);
    return false;
  });
  state.world.forage.bales = strip(state.world.forage.bales);
  for (const island of state.world.islands) island.content.forage.bales = strip(island.content.forage.bales);
  const pending = state.world.pendingAttachment;
  if (pending) { strip(pending.pallets); delete pending.pallets; }
  for (const island of state.environment.encounters?.islands || []) {
    strip(island.pallets); delete island.pallets;
  }
  for (const building of state.buildings) if (building.contents) delete building.contents.flour;
  for (const vehicle of state.vehicles) {
    if (vehicle.loadout?.tool !== 'flatbed' && vehicle.storage) delete vehicle.storage.flour;
    if (removedIds.has(vehicle.equipmentState?.carriedBaleId)) vehicle.equipmentState.carriedBaleId = null;
  }
  return state;
}
