import { THREE, p, h, material, block, cylinder, bar, ring, bake, hybridModel, finishHybrid, hall, roof, frontWindow, sideWindow, pipe, flowers, lantern, smoke } from './hybrid-kit.js';

function rockingChair(parent, x, y, z) {
  const chair=new THREE.Group(); chair.position.set(x,y,z); parent.add(chair);
  for (const side of [-.24,.24]) {
    pipe(chair,[[side,.12,-.38],[side,.03,0],[side,.12,.4]],.034,h.timber);
    for (const zz of [-.18,.22]) bar(chair,h.timber,[side,.08,zz],[side,.42,zz],.03);
    bar(chair,p.wood,[side,.42,-.2],[side,.94,-.34],.035);
    bar(chair,p.wood,[side,.63,-.2],[side,.6,.25],.03);
  }
  for (const z0 of [-.19,-.06,.07,.2]) block(chair,p.wood,0,.4,z0,.53,.065,.1,.012);
  for (const xx of [-.17,0,.17]) {
    const slat=block(chair,p.wood,xx,.71,-.29,.12,.49,.065,.012); slat.rotation.x=-.22;
  }
  return bake(chair);
}

export function createHybridCottage(kind='blue') {
  const blue=kind==='blue', model=hybridModel(`hybrid-${blue?'bluebell':'clover'}-cottage`);
  // Smaller homes use fewer full-size cells; the tractor remains the scale reference.
  const {kit,structure,group}=model, width=blue?12:14, height=10;
  const accent=blue?h.teal:h.green, roofColor=blue?p.blue:h.red;
  const glazing=material('cottage-warm-window',0xb0d5d6,.35); glazing.emissive.setHex(0xffc478); glazing.emissiveIntensity=.12; model.lamps.push(glazing);
  hall(kit,{width,depth:10,height,frame:h.timber,opening:0});
  roof(kit,{left:-width/2-1,width:width+2,back:-6,depth:12,y:height,step:blue?1:2,color:roofColor});
  for (const x of [-width/2,width/2-2]) sideWindow(kit,x,5,-2,2,3,accent);
  const doorX=blue?-4:-2, doorWidth=blue?3:4;
  kit.cut(doorX,2,3,doorWidth,7,2); kit.add(accent,doorX,2,3,doorWidth,7,1);
  for (const x of [doorX-1,doorX+doorWidth]) kit.add(p.chalk,x,2,5,1,7,1);
  kit.add(p.wood,doorX-1,9,5,doorWidth+2,1,1);
  ring(structure,p.gold,(doorX+.9)*.2,1.09,.825,.057,.018);
  if (blue) {
    frontWindow(kit,1,5,3,2,3,accent,glazing);
    kit.add(p.base,-6,0,5,5,1,4); kit.add(p.wood,-6,1,5,5,1,4);
    kit.add(p.blue,-6,10,5,5,1,3); kit.add(p.chalk,-6,9,7,5,1,1);
    kit.add(p.wood,0,2,6,5,1,2);
    // Keep the projecting dormer as the blue cottage's distinguishing silhouette.
    kit.add(p.chalk,0,11,5,4,4,2); kit.cut(1,12,5,2,2,2);
    kit.add(glazing,1,12,5,2,2,1);
    for (const [x,y,w] of [[-1,15,6],[0,16,4],[1,17,2]]) kit.add(p.blue,x,y,5,w,1,3);
    ring(structure,h.teal,.4,2.6,1.27,.17,.03);
    bar(structure,p.chalk,[.24,2.6,1.31],[.56,2.6,1.31],.025);
    bar(structure,p.chalk,[.4,2.44,1.31],[.4,2.76,1.31],.025);
    flowers(structure,.28,.6,1.45,h.flower,.65); flowers(structure,.7,.6,1.45,h.flower,.6);
    cylinder(structure,p.wood,-1.55,.37,-.3,.27,.71,.29,12);
    for (const y of [.12,.6]) ring(structure,h.tealDark,-1.55,y,-.3,.285,.026).rotation.x=Math.PI/2;
    cylinder(structure,p.dark,-1.55,.73,-.3,.25,.025,.25,12);
    pipe(structure,[[-1.39,2.03,-.55],[-1.49,1.85,-.55],[-1.49,.91,-.4],[-1.55,.77,-.3]],.043,h.teal);
    cylinder(structure,h.teal,-1.52,.17,1.0,.18,.34,.2,10);
    pipe(structure,[[-1.37,.14,1],[-1.16,.19,1],[-1.01,.44,1]],.039,h.teal);
    ring(structure,p.steel,-1.7,.32,1,.19,.022);
    flowers(structure,-.5,.4,1.55,h.flower,.65);
  } else {
    frontWindow(kit,-5,5,3,2,3,accent,glazing);
    frontWindow(kit,3,5,3,2,3,accent,glazing);
    kit.add(p.base,-8,0,5,16,1,5); kit.add(p.wood,-8,1,5,16,1,5);
    for (const x of [-7,6]) kit.add(p.chalk,x,2,8,1,6,1);
    kit.add(h.red,-8,10,5,16,1,2); kit.add(h.red,-8,9,7,16,1,3);
    kit.add(p.chalk,-8,8,9,16,1,1);
    for (const x of [-7,4]) {
      kit.add(h.green,x,2,9,3,1,1);
      kit.add(p.wood,x,5,9,3,1,1);
      kit.add(p.chalk,x+1,3,9,1,2,1);
    }
    const chair=rockingChair(group,-.82,.4,1.55);
    model.motions.push((time,working,reduced,elapsed)=>{chair.rotation.x=Math.sin(elapsed*.85)*(reduced?.015:.065);});
    flowers(structure,1.25,.4,1.65,p.chalk,.65); flowers(structure,1.45,.4,1.87,h.red,.5);
    block(structure,p.wood,.72,.68,1.56,.46,.075,.4);
    for (const x of [.56,.88]) for (const z of [1.43,1.69]) bar(structure,h.timber,[x,.4,z],[x,.65,z],.025);
    cylinder(structure,p.chalk,.74,.79,1.58,.065,.15,.08,8);
    for (const z of [-.55,1.1]) bar(structure,h.timber,[1.85,0,z],[1.85,1.55,z],.035);
    bar(structure,p.wood,[1.85,1.51,-.55],[1.85,1.51,1.1],.015);
    for (let i=0;i<2;i++) {
      const cloth=new THREE.Group(); cloth.position.set(1.85,1.48,-.18+i*.6); group.add(cloth);
      block(cloth,i?h.green:p.chalk,0,-.25,0,.027,.49,.4,.006);
      for (const z of [-.14,.14]) block(structure,p.wood,1.85,1.51,cloth.position.z+z,.05,.1,.04,.005);
      model.motions.push((time,working,reduced,elapsed)=>{cloth.rotation.z=Math.sin(elapsed*1.1+i)*(reduced?.018:.13);});
    }
  }
  kit.cut(0,5,-5,3,3,2); kit.add(glazing,0,5,-4,3,3,1);
  kit.add(p.wood,-1,4,-6,5,1,1); kit.add(p.wood,-1,8,-6,5,1,1);
  for (const x of [-1,3]) kit.add(accent,x,5,-6,1,3,1);
  const chimneyTop=blue?18:16;
  kit.add(h.redDark,2,height,-4,2,chimneyTop-height,2);
  kit.add(p.chalk,1,chimneyTop,-5,4,1,4); kit.add(p.dark,2,chimneyTop+1,-4,2,1,2);
  smoke(model,.6,(chimneyTop+2)*.2,-.6);
  lantern(model,(doorX+doorWidth+.7)*.2,1.54,1.3);
  const shutter=new THREE.Group(); shutter.position.set(blue?.81:1.21,1.32,1.24); group.add(shutter);
  block(shutter,accent,.12,0,0,.24,.63,.075,.01);
  for (const y of [-.22,-.07,.08,.23]) block(shutter,p.wood,.12,y,.045,.21,.035,.025,.005);
  bake(shutter);
  model.motions.push((time,working,reduced,elapsed)=>{shutter.rotation.y=-.28+Math.sin(elapsed*.7)*(reduced?.015:.075);});
  return finishHybrid(model,[[-1.94,0,-1.25],[blue?1.44:1.97,(chimneyTop+2)*.2+1.2,blue?1.84:2.08]]);
}
