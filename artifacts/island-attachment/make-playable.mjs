import fs from 'node:fs';
import path from 'node:path';
const main = fs.readFileSync('src/app/main.js','utf8').replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.') ? `from '/${path.posix.normalize('src/app/'+specifier)}'` : match);
const fixture = `
const encounter = generateIsland(12345, { radius: 4.5 });
encounter.group.position.set(30, 0, -8);
encounter.group.position.set(0, 0, Math.max(...[...farm.terrain.values()].map(t => t.z)) - Math.min(...[...encounter.terrain.values()].map(t => t.z)) + 6.5);
encounter.status = 'drifting'; encounter.side = -1; encounter.outerLane = 0;
encounter.body = physics.addMovingIsland(encounter, encounter.group.position, false);
farm.group.add(encounter.group); farm.driftingIslands.active.push(encounter);
physics.placeVehicle(activeVehicle().id, { x: 0, y: 0, z: Math.max(...[...farm.terrain.values()].map(t => t.z)) }, true);
farm.attachments.select(encounter);
if (location.search.includes('phone')) document.body.dataset.inputMode = 'touch';
`;
fs.writeFileSync('artifacts/island-attachment/playable.js',main.replace("import { generateFarm }", "import { generateFarm, generateIsland }")
  .replace('initializeFarm(loadResult.state);','initializeFarm({ world: { seed: 99173, connections: [{status: \'attached\'}] }, buildings: [], vehicles: [], ui: {}, progression: {} });'+fixture).replace('  buildings?.animate(elapsed, dt);', "  buildings?.animate(elapsed, dt);\n  if (encounter.status === 'drifting') physics.setMovingIslandVelocity(encounter.body, { x: 0, y: 0, z: 0 });"));
const html=fs.readFileSync('index.html','utf8').replace(/src="(?:\.\/)?src\/app\/main.js"/,'src="./playable.js"').replace('href="./src/','href="/src/');
fs.writeFileSync('artifacts/island-attachment/playable.html',html);
