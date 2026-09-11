import { THREE, p, h, mesh, block, cylinder, bar, disc, ring, bake, hybridModel, finishHybrid, hall, sideWindow, badge, wrench, lantern } from './hybrid-kit.js';

function tire(parent, x, y, z, radius = .36) {
  const group = new THREE.Group(); group.position.set(x,y,z); parent.add(group);
  ring(group, p.dark, 0, 0, 0, radius * .72, radius * .28);
  cylinder(group, p.steel, 0, 0, 0, radius * .47, .18, radius * .47, 12).rotation.x = Math.PI / 2;
  disc(group, p.gold, 0, 0, .11, radius * .23, .04, 10);
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI / 7;
    const lug = block(group, p.dark, Math.sin(a)*radius*.94, Math.cos(a)*radius*.94, 0, .14, .07, .25, .012);
    lug.rotation.z = -a;
  }
  return bake(group);
}

export function createHybridWorkshop({ clearBay = false } = {}) {
  const model = hybridModel('hybrid-fieldworks-workshop'), { kit, structure, group } = model;
  // The fitted game workshop needs three extra courses above the tractor's cab.
  const extraHeight = 0, roofLift = extraHeight * .2;
  hall(kit, { width: 24, depth: 18, height: 13 + extraHeight, wall: h.teal, frame: h.slate, opening: 18 });
  for (const x of [-12,10]) for (const z of [-5,1]) sideWindow(kit,x,6,z,4,4,h.slate);
  // Two sawtooth ranges with actual upright skylights between stepped courses.
  for (const start of [-13,0]) {
    for (let x = 0; x < 13; x++) {
      const y = 13 + extraHeight + Math.floor(x / 3);
      kit.add(h.slate, start+x, y, -10, 1, 1, 20);
      for (const z of [-9,8]) kit.add(h.teal, start+x, 13 + extraHeight, z, 1, y-12-extraHeight, 1);
      kit.add(p.chalk,start+x,y,9,1,1,1);
    }
    kit.add(p.glass,start+12,13+extraHeight,-8,1,4,16);
    for (const z of [-8,-3,2,7]) kit.add(p.steel,start+13,13+extraHeight,z,1,4,1);
    kit.add(h.slateLight,start+12,17+extraHeight,-10,2,1,20);
  }
  // Deep bay jambs, a rolled door and a separate freestanding lifting gantry.
  kit.add(p.chalk,-9,12+extraHeight,9,18,1,1);
  for (const x of [-11,10]) {
    kit.add(h.slate,x,2,9,1,11+extraHeight,1);
    kit.add(p.base,x-1,0,12,3,2,3);
    kit.add(h.slate,x,2,13,1,12,1);
  }
  kit.add(p.gold,-12,14,13,25,2,1);
  for (const x of [-11,-7,-3,1,5,9]) kit.add(h.slate,x,14,14,1,1,1);
  badge(structure,-1.37,3.48,2.04,'wrench',h.slate,.93);
  for (let y = 2.37; y <= 2.57; y += .1) block(structure,p.steel,0,y+roofLift,1.82,3.55,.07,.14);
  // Tool storage is visible through the bay rather than painted onto its wall.
  block(structure,p.wood,0,.98,-.96,3.4,.17,.75);
  for (const x of [-1.46,1.46]) block(structure,h.slate,x,.69,-.96,.16,.58,.6);
  block(structure,h.slate,0,1.83,-1.35,3.42,1.2,.13);
  for (const x of [-1.15,-.6,.05,.7,1.24]) wrench(structure,x,1.8,-1.24,.51,p.steel);
  block(structure,p.blue,-.91,1.2,-.83,.6,.25,.42);
  for (const x of [-1.18,-.65]) block(structure,p.steel,x,1.33,-.83,.1,.27,.31);
  cylinder(structure,p.steel,-.91,1.16,-.51,.045,.75,.045,8).rotation.z = Math.PI/2;
  const chest = new THREE.Group(); chest.position.set(1.56,.4,.61); structure.add(chest);
  block(chest,h.red,0,.42,0,.68,.74,.61);
  for (const y of [.24,.45,.66]) {
    block(chest,h.redDark,0,y,.32,.59,.17,.025);
    bar(chest,p.steel,[-.19,y,.36],[.19,y,.36],.024);
  }
  for (const x of [-.24,.24]) for (const z of [-.21,.21]) cylinder(chest,p.dark,x,.06,z,.065,.08,.065,8).rotation.z=Math.PI/2;
  for (const y of [.14,.39,.64]) tire(structure,2.98,y,-.34,.34).rotation.x=Math.PI/2;
  block(structure,p.base,-2.93,.16,-.56,.57,.32,.7);
  cylinder(structure,p.steel,-2.93,.66,-.56,.25,.75,.25,10);
  pipeHose(structure);
  lantern(model,-2.05,2.2,1.99); lantern(model,2.05,2.2,1.99);
  // Trolley, drum, cable and lifted wheel form one continuously connected rig.
  const trolley = new THREE.Group(); trolley.position.set(0,2.65,2.7); group.add(trolley);
  block(trolley,h.slate,0,0,0,.55,.25,.34);
  for (const x of [-.21,.21]) cylinder(trolley,p.dark,x,.2,0,.11,.14,.11,10).rotation.z=Math.PI/2;
  disc(trolley,p.gold,.05,-.08,.22,.17,.12,12); bake(trolley);
  const cable = cylinder(group,p.steel,0,2,2.7,.025,1,.025,8);
  const load = tire(group,0,1.28,2.7,.45);
  const hook = ring(group,p.gold,0,1.83,2.7,.11,.035);
  // The complete wheel is suspended below the hook, leaving the floor clear.
  const sling = bar(group,p.steel,[0,1.35,2.7],[0,1.77,2.7],.025);
  model.motions.push(time => {
    const x = clearBay ? 1.3 + Math.sin(time*.45)*.18 : Math.sin(time*.45)*.62;
    const lift = (1-Math.cos(time*.9))*.12;
    trolley.position.x=x; cable.position.set(x,2.22+lift*.5,2.7); cable.scale.y=.71-lift;
    load.position.set(x,1.28+lift,2.7); hook.position.set(x,1.83+lift,2.7);
    sling.position.set(x,1.56+lift,2.7);
  });
  return finishHybrid(model);
}

function pipeHose(parent) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.93,1.04,-.4),new THREE.Vector3(-2.77,1.13,.15),
    new THREE.Vector3(-2.57,.39,.38),new THREE.Vector3(-2.75,.25,.85),
  ]);
  mesh(parent,new THREE.TubeGeometry(curve,16,.035,7,false),p.dark);
}
