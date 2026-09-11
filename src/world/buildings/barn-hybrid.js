import { THREE, p, h, mesh, block, cylinder, bar, ring, bake, hybridModel, finishHybrid, hall, sideWindow, badge, pipe, lantern, stream } from './hybrid-kit.js';

export function createHybridBarn() {
  const model=hybridModel('hybrid-cattle-barn'), { kit, structure, group }=model;
  hall(kit,{width:24,depth:18,height:11,wall:h.red,frame:p.chalk,opening:14});
  for (const x of [-12,10]) sideWindow(kit,x,5,-3,5,3,p.chalk);
  for (const [inset,y,edge] of [[0,11,2],[1,12,3],[3,13,4],[6,14,3],[8,15,3],[10,16,3]]) {
    const width=26-inset*2;
    for (const z of [-9,8]) kit.add(h.red,-13+inset,y,z,width,1,1);
    for (const x of [-13+inset,13-inset-edge]) {
      kit.add(h.slate,x,y,-10,edge,1,20);
      for (const z of [-10,9]) kit.add(p.chalk,x,y,z,edge,1,1);
    }
  }
  // Open loft and parked barn doors keep the hay storage and stall accessible.
  kit.add(p.chalk,-3,11,9,6,4,1); kit.add(h.timber,-2,12,10,4,2,1);
  kit.add(p.gold,-2,12,11,4,1,1);
  for (const x of [-11,8]) {
    kit.add(h.redDark,x,2,9,3,8,1);
    for (const y of [3,8]) kit.add(p.chalk,x,y,10,3,1,1);
    for (let i=0;i<3;i++) kit.add(p.chalk,x+i,4+i,10,1,1,1);
  }
  kit.add(p.wood,-12,1,9,24,1,4);
  kit.add(p.chalk,-2,17,-2,4,3,4);
  for (const z of [-3,2]) kit.add(h.slate,-1,18,z,2,1,1);
  kit.add(h.slate,-3,20,-3,6,1,6); kit.add(h.slate,-2,21,-2,4,1,4);
  badge(structure,-1.6,2.71,1.99,'milk',h.redDark,.72);
  // Hay-filled manger and a rolled bale make the animal's feed legible.
  block(structure,h.timber,-1.47,.56,1.97,.86,.31,.64);
  block(structure,p.grain,-1.47,.76,1.97,.74,.12,.52,.035);
  for (let i=0;i<8;i++) bar(structure,p.gold,[-1.8+i*.09,.81,1.74],[-1.76+i*.09,.8,2.2],.022);
  cylinder(structure,p.grain,2.86,.42,-.45,.41,.72,.41,12).rotation.z=Math.PI/2;
  for (const x of [2.61,3.1]) ring(structure,h.timber,x,.42,-.45,.4,.025).rotation.y=Math.PI/2;
  // Keep the complete fork outside the right wall, beside the hay bale. Its
  // tines rest on the ground and a small wall keeper supports the leaning shaft.
  const fork = new THREE.Group(); fork.position.set(2.75, .045, .85); fork.rotation.z = .14; structure.add(fork);
  bar(fork, p.wood, [0, .34, 0], [0, 1.78, 0], .035);
  cylinder(fork, p.steel, 0, .37, 0, .048, .18, .048, 8);
  bar(fork, p.steel, [-.16, .31, 0], [.16, .31, 0], .026);
  for (const x of [-.14, 0, .14]) pipe(fork, [[x, .31, 0], [x, .16, .025], [x, 0, .11]], .02, p.steel);
  bar(structure, p.steel, [2.4, 1.46, .85], [2.55, 1.46, .85], .022);
  ring(structure, p.steel, 2.55, 1.46, .85, .058, .014).rotation.x = Math.PI / 2;
  // A compact milking stand routes milk to the bright can beside the doorway.
  block(structure,h.tealDark,1.75,.61,.93,.35,.43,.37);
  // Store the loose hose on the stand rather than tethering it to an animal.
  pipe(structure,[[1.74,.88,.91],[1.29,.82,.98],[1.31,.46,1.05],[1.58,.46,1.05],[1.63,.79,.98]],.034,p.dark);
  pipe(structure,[[1.75,.84,.93],[1.89,1.5,1.14],[1.74,1.5,2.29],[1.74,1.3,2.35]],.045,p.steel);
  cylinder(structure,p.steel,1.74,.76,2.35,.24,.7,.21,12);
  cylinder(structure,p.dark,1.74,1.12,2.35,.18,.024,.18,12);
  for (const x of [1.48,2]) ring(structure,p.steel,x,.94,2.35,.11,.024).rotation.y=Math.PI/2;
  stream(model,[1.74,1.28,2.35],[1.74,1.135,2.35],{mat:p.chalk,count:5,radius:.019});
  lantern(model,-2.12,1.85,2.01); lantern(model,2.12,1.85,2.01);
  const vane=new THREE.Group(); vane.position.set(0,4.63,0); group.add(vane);
  bar(structure,p.steel,[0,4.32,0],[0,4.84,0],.029);
  bar(vane,h.copper,[-.38,0,0],[.4,0,0],.028);
  const arrow=mesh(vane,new THREE.ConeGeometry(.11,.24,4),p.gold,.42,0,0); arrow.rotation.z=-Math.PI/2;
  block(vane,p.gold,-.3,.065,0,.18,.21,.055,.009); bake(vane);
  model.motions.push((time,working,reduced,elapsed)=>{
    vane.rotation.y=.5+Math.sin(elapsed*.42)*(reduced?.08:.4);
  });
  return finishHybrid(model,[[-3.2,0,-2.05],[3.32,4.95,2.6]]);
}
