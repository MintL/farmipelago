export const TRAILER_STORAGE_CAPACITY = 20000;
export const BALER_STORAGE_CAPACITY = 3600;

export const REAR_EQUIPMENT = [
  { id: 'plough', name: 'Plough', icon: 'plough', description: 'Turns grass tiles into prepared soil across four rows.' },
  { id: 'seeder', name: 'Seeder', icon: 'seeder', description: 'Plants the selected seed in two clean rows of prepared soil.' },
  { id: 'sprayer', name: 'Sprayer', icon: 'sprayer', description: 'Covers a wide strip and clears weeds from growing crops.' },
  { id: 'trailer', name: 'Grain Trailer', icon: 'silo', description: 'Carries up to 20,000 L between silos and the cargo pad.', inventory: { kind: 'crop', capacity: TRAILER_STORAGE_CAPACITY, icon: 'silo' } },
  { id: 'rear-mower', name: 'Rear Mower', icon: 'mower', description: 'Cuts mature grass in an offset swath on the tractor’s right.', gate: 'equipment:hay', working: true },
  { id: 'baler', name: 'Baler', icon: 'baler', description: 'Picks up loose cut grass and compresses each 3,600 L into one bale.', gate: 'equipment:hay', working: true, inventory: { kind: 'grass', capacity: BALER_STORAGE_CAPACITY, icon: 'grass', stateKey: 'balerLitres' } },
].map(item => ({ slot: 'tool', working: item.working ?? !['trailer'].includes(item.id), ...item }));

export const FRONT_EQUIPMENT = [
  { id: 'loader', name: 'Front Loader', icon: 'utility', description: 'Move and lift heavy objects.' },
  { id: 'front-mower', name: 'Front Mower', icon: 'mower', description: 'Cuts a centered strip of mature grass ahead of the tractor.', gate: 'equipment:hay', working: true },
  { id: 'forks', name: 'Pallet Forks', icon: 'utility', description: 'Carry crates and stacked supplies.', unavailable: true },
  { id: 'weight', name: 'Front Weight', icon: 'utility', description: 'Adds stability for heavy rear work.', unavailable: true },
].map(item => ({ slot: 'frontTool', working: item.working ?? false, ...item }));

export const EQUIPMENT = [...REAR_EQUIPMENT, ...FRONT_EQUIPMENT];
export const REAR_EQUIPMENT_IDS = REAR_EQUIPMENT.map(item => item.id);
export const FRONT_EQUIPMENT_IDS = FRONT_EQUIPMENT.map(item => item.id);

export function equipmentDefinition(id) {
  return EQUIPMENT.find(item => item.id === id) || null;
}

export function equipmentUnlocked(id, unlockedGates = []) {
  const item = equipmentDefinition(id);
  if (!item || item.unavailable) return false;
  return !item.gate || unlockedGates.includes(item.gate);
}

export function normalizeLoadout(loadout, unlockedGates = []) {
  return {
    tool: equipmentUnlocked(loadout?.tool, unlockedGates) && equipmentDefinition(loadout.tool)?.slot === 'tool'
      ? loadout.tool
      : 'plough',
    frontTool: equipmentUnlocked(loadout?.frontTool, unlockedGates) && equipmentDefinition(loadout.frontTool)?.slot === 'frontTool'
      ? loadout.frontTool
      : 'loader',
  };
}

export function workingEquipment(loadout) {
  return [loadout?.frontTool, loadout?.tool]
    .map(equipmentDefinition)
    .filter(item => item?.working);
}
