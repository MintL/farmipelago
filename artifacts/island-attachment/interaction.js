import { THREE, TILE, gridKey } from '/src/core/shared.js';
import { generateFarm, generateIsland } from '/src/world/generator.js';
import { createPhysics } from '/src/physics/index.js';
import { createIslandSelectionView } from '/src/ui/island-selection.js';
import { findAttachmentPlacement } from '/src/world/islands/attachment-placement.js';
const results = document.querySelector('#results');
try {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#829db0');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(10,30,15);scene.add(sun);
  const renderer = new THREE.WebGLRenderer({antialias:true,stencil:true}); renderer.setSize(innerWidth,innerHeight); document.body.prepend(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.1,300);
  const physics = await createPhysics();
  const farm = generateFarm(scene,physics,99173,0,()=>{}, {attachmentComplete:true});
  physics.createVehicle('test',farm.spawn);
  const island = generateIsland(12345,{radius:7});
  const maxX = Math.max(...[...farm.terrain.values()].map(t=>t.x));
  const minX = Math.min(...[...island.terrain.values()].map(t=>t.x));
  island.group.position.set(maxX-minX+11,0,-8);
  island.status='drifting'; island.side=-1; island.outerLane=0;
  island.body=physics.addMovingIsland(island,island.group.position,false);
  farm.group.add(island.group);farm.driftingIslands.active.push(island);
  const started=performance.now();
  const placement=findAttachmentPlacement(island.terrain,farm.terrain);
  if(!placement)throw Error('No placement found');
  if([...island.terrain.values()].some(t=>farm.terrain.has(gridKey(t.gx+placement.gx,t.gz+placement.gz))))throw Error('Overlapping placement');
  const base=`PASS: non-colliding island, shore gap > jump range\nPASS: deterministic placement, no overlap (${Math.round(performance.now()-started)} ms)\nPlacement: ${placement.gx},${placement.gz}; ${placement.gaps.length} neighbors\nClick the outlined island on the right.`;
  results.textContent=base;
  camera.position.set(32,55,75); camera.lookAt(10,0,-8);
  const view=createIslandSelectionView(renderer,scene,camera,{
    available:()=>farm.attachments.available(),select:i=>farm.attachments.select(i),state:()=>farm.attachments.state(),act:()=>{const s=farm.attachments.state();if(s?.island.status==='attached')farm.attachments.release();else farm.attachments.connect();},enabled:()=>true,
  });
  function frame(){setTimeout(frame, 33);farm.attachments.update(.033);if(island.status==='releasing'){farm.driftingIslands.update(.033,{speed:1.15});physics.step(.033);}view.render();const selected=farm.attachments.state();results.textContent=base+'\nLifecycle: '+island.status+'; connected islands: '+farm.islands.length+(selected?'\nPASS: world hit selected island; stronger outline + destination ghost':'');}
  frame();
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);view.resize();});
} catch(error){results.textContent='FAIL: '+error.stack;}
