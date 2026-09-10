import { cropIds, crops } from './crops.js';

// Product identity is independent of planting and storage compatibility.
export const goods = {
  ...Object.fromEntries(cropIds.map(id => [id, {
    id, name: crops[id].name, icon: id, unit: 'litres', category: 'crop', storageKinds: ['crop', 'bulk'],
  }])),
  milk: { id: 'milk', name: 'Milk', icon: 'milk', unit: 'litres', category: 'animal', storageKinds: ['liquid'] },
  flour: { id: 'flour', name: 'Flour', icon: 'flour', unit: 'pallets', category: 'processed', storageKinds: ['pallet'], debugOnly: true },
};

export const goodDefinition = id => Object.hasOwn(goods, id) ? goods[id] : null;
export const storageAcceptsGood = (kind, id) => goodDefinition(id)?.storageKinds.includes(kind) || false;
export const siloGoodIds = Object.keys(goods).filter(id => storageAcceptsGood('bulk', id));
