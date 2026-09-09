import { TILE, THREE, gridKey } from '../../core/shared.js';
import { createIslandRecords } from './model.js';
import { addBridgeBetween } from '../bridges.js';

// Registers normal world-grid content only after docking and bridge construction.
export function createAttachedContent({ group, terrain, obstacles, lowerBlocks, bridgeBlocks, records, connections,
  islandById, physics, fieldsChanged, beforeDetach, afterAttach }) {
  const rebuild = () => physics.rebuildStaticColliders(terrain, obstacles, lowerBlocks, bridgeBlocks);
  const glow = new THREE.MeshStandardMaterial({ color: 0xffdfa0, emissive: 0xffa62e, emissiveIntensity: 1, roughness: .38 });
  return {
    attach(island, placement, complete) {
      if (!complete) {
        group.add(island.group);
        island.links = placement.gaps.map(gap => {
          const blocks = [];
          const visual = addBridgeBetween({ id: gap.from.islandId }, { id: island.id }, terrain, group, blocks, glow, [], [], [], gap);
          if (!visual) throw new Error('Attachment has no traversable bridge');
          return { gap, blocks, visual };
        });
        return island.links.map(link => link.visual);
      }
      const worldTiles = new Map([...island.terrain.values()].map(tile => {
        const world = { ...tile, gx: tile.gx + placement.gx, gz: tile.gz + placement.gz,
          x: tile.x + placement.x, z: tile.z + placement.z, islandId: island.id };
        return [gridKey(world.gx, world.gz), world];
      }));
      for (const key of worldTiles.keys()) if (terrain.has(key)) throw new Error(`Attachment overlaps ${key}`);
      const [record] = createIslandRecords([{ id: island.id, legacyId: 0, role: 'wild',
        cx: placement.gx, cz: placement.gz, h: 0, capabilities: { farming: true, construction: true }, status: 'attached' }], worldTiles, island.seed);
      record.settings = island.settings;
      record.source = island;
      records.push(record);
      island.record = record;
      islandById.set(record.id, record);
      for (const [key, tile] of worldTiles) terrain.set(key, tile);
      island.worldTiles = worldTiles;
      const translated = source => source.map(block => ({ ...block, x: block.x + placement.x, z: block.z + placement.z, islandId: island.id }));
      island.worldObstacles = translated(island.obstacles);
      island.worldLower = translated(island.lowerBlocks);
      obstacles.push(...island.worldObstacles);
      lowerBlocks.push(...island.worldLower);
      for (const link of island.links) {
        bridgeBlocks.push(...link.blocks);
        link.landings = [...terrain.values()].filter(tile => Math.hypot(tile.x - link.gap.from.x, tile.z - link.gap.from.z) <= 1.55 * TILE ||
          Math.hypot(tile.x - link.gap.to.x, tile.z - link.gap.to.z) <= 1.55 * TILE);
        for (const tile of link.landings) {
          if (!tile.attachmentLandingCount) tile.authoredReserved = tile.reserved;
          tile.attachmentLandingCount = (tile.attachmentLandingCount || 0) + 1;
          tile.reserved = true;
        }
        const from = records.find(record => record.id === link.gap.from.islandId);
        connections.push({ id: `join-${from.id}-${island.id}`, kind: 'bridge', status: 'attached',
          from: { islandId: from.id, anchor: { gx: link.gap.from.gx - from.gridOrigin.gx, gz: link.gap.from.gz - from.gridOrigin.gz, y: link.gap.from.topY - from.transform.y } },
          to: { islandId: island.id, anchor: { gx: link.gap.to.gx - placement.gx, gz: link.gap.to.gz - placement.gz, y: link.gap.to.topY } } });
      }
      island.departureFields?.dispose();
      island.departureFields = null;
      fieldsChanged(island, true);
      rebuild();
      afterAttach?.(island);
    },
    detach(island) {
      beforeDetach?.(island);
      for (const [key, world] of island.worldTiles) {
        const local = island.terrain.get(gridKey(world.localGx, world.localGz));
        Object.assign(local, { ploughed: world.ploughed, crop: world.crop, looseGrassLitres: world.looseGrassLitres });
        terrain.delete(key);
      }
      for (const list of [obstacles, lowerBlocks]) {
        for (let index = list.length - 1; index >= 0; index--) if (list[index].islandId === island.id) list.splice(index, 1);
      }
      const removedBlocks = new Set();
      for (const record of records) {
        const source = record.source;
        if (!source) continue;
        source.links = source.links.filter(link => {
          if (link.gap.from.islandId !== island.id && link.gap.to.islandId !== island.id) return true;
          link.blocks.forEach(block => removedBlocks.add(block));
          for (const tile of link.landings || []) {
            tile.attachmentLandingCount--;
            if (!tile.attachmentLandingCount) tile.reserved = tile.authoredReserved;
          }
          link.chains?.dispose();
          link.visual.removeFromParent();
          link.visual.traverse(mesh => { if (mesh.isMesh) mesh.geometry.dispose(); });
          return false;
        });
      }
      for (let index = bridgeBlocks.length - 1; index >= 0; index--) if (removedBlocks.has(bridgeBlocks[index])) bridgeBlocks.splice(index, 1);
      records.splice(records.indexOf(island.record), 1);
      islandById.delete(island.id);
      fieldsChanged(island, false);
      rebuild();
    },
  };
}
