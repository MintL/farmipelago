export const FARM_ISLAND_ID = 'island-0';
export const SETTLEMENT_ISLAND_ID = 'island-1';
export const WORKSHOP_YAW = Math.PI * 1.5;
export const ISLAND_LAYOUT_SCALE = 1.5;
export const SETTLEMENT_BRIDGE_TARGET_SPAN_TILES = 2;
export const SETTLEMENT_BRIDGE_SPAN_TOLERANCE_TILES = .25;
export const SETTLEMENT_MINIMUM_GAP_TILES = 1;

export const STARTER_ISLAND_LAYOUT = [
  {
    id: FARM_ISLAND_ID,
    legacyId: 0,
    role: 'farm',
    capabilities: { farming: true, construction: true },
    cx: 0,
    cz: 0,
    h: 0,
    r: 7.2,
  },
  {
    id: SETTLEMENT_ISLAND_ID,
    legacyId: 1,
    role: 'settlement',
    capabilities: { farming: false, construction: false },
    cx: 0,
    cz: 0,
    h: 0,
    r: 4.8,
    placement: {
      relativeTo: FARM_ISLAND_ID,
      direction: 'north',
      bridgeSpanTiles: SETTLEMENT_BRIDGE_TARGET_SPAN_TILES,
      bridgeSpanToleranceTiles: SETTLEMENT_BRIDGE_SPAN_TOLERANCE_TILES,
      minimumTerrainGapTiles: SETTLEMENT_MINIMUM_GAP_TILES,
    },
  },
];

export const STARTER_ISLAND_CONNECTIONS = [
  { id: 'connection-0', kind: 'bridge', fromId: FARM_ISLAND_ID, toId: SETTLEMENT_ISLAND_ID },
];

export function validateIslandConfiguration(layout = STARTER_ISLAND_LAYOUT, connections = STARTER_ISLAND_CONNECTIONS) {
  const ids = new Set();
  const connectionIds = new Set();
  for (const island of layout) {
    if (typeof island.id !== 'string' || !island.id || ids.has(island.id)) {
      throw new Error(`Island configuration requires unique stable IDs; received ${island.id}`);
    }
    if (typeof island.role !== 'string' || !island.role) throw new Error(`Island ${island.id} requires a role`);
    if (typeof island.capabilities?.farming !== 'boolean' || typeof island.capabilities?.construction !== 'boolean') {
      throw new Error(`Island ${island.id} requires boolean land-use capabilities`);
    }
    ids.add(island.id);
  }
  for (const connection of connections) {
    if (typeof connection.id !== 'string' || !connection.id || connectionIds.has(connection.id) ||
      !ids.has(connection.fromId) || !ids.has(connection.toId) || connection.fromId === connection.toId) {
      throw new Error(`Connection ${connection.id} has invalid island endpoints`);
    }
    connectionIds.add(connection.id);
  }
  const farm = layout.find(island => island.role === 'farm');
  const settlement = layout.find(island => island.role === 'settlement');
  if (!farm || !settlement || settlement.cx !== farm.cx || settlement.placement?.relativeTo !== farm.id ||
    settlement.placement.direction !== 'north' ||
    settlement.placement.bridgeSpanTiles !== SETTLEMENT_BRIDGE_TARGET_SPAN_TILES ||
    settlement.placement.bridgeSpanToleranceTiles !== SETTLEMENT_BRIDGE_SPAN_TOLERANCE_TILES ||
    settlement.placement.minimumTerrainGapTiles !== SETTLEMENT_MINIMUM_GAP_TILES) {
    throw new Error('The permanent Settlement Island requires its north-shore placement rule');
  }
  if (connections.length !== 1 || connections[0].fromId !== farm.id || connections[0].toId !== settlement.id) {
    throw new Error('The permanent bridge must connect the Farm Island to the Settlement Island');
  }
  return true;
}
