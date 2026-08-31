export const TRAILER_STORAGE_CAPACITY = 20000;

export const VEHICLE_TYPES = {
  tractor: {
    id: 'tractor',
    name: 'Farm Tractor',
    icon: 'tractor',
    slots: ['tool', 'frontTool'],
    defaultLoadout: { tool: 'plough', frontTool: 'loader' },
    storageCapacity: 0,
  },
  harvester: {
    id: 'harvester',
    name: 'Combine Harvester',
    icon: 'harvester',
    slots: [],
    defaultLoadout: {},
    storageCapacity: 3600,
  },
};

export const OWNED_VEHICLES = [
  { id: 'tractor-1', type: 'tractor' },
  { id: 'harvester-1', type: 'harvester' },
];

export function vehicleType(type) {
  const definition = VEHICLE_TYPES[type];
  if (!definition) throw new Error(`Unknown vehicle type: ${type}`);
  return definition;
}
