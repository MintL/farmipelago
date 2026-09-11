import { THREE, p, h, mesh, block, cylinder, bar, bake, hybridModel, finishHybrid, badge, wheel, pipe, crate, stream } from './hybrid-kit.js';

export function createHybridSilo() {
  const model=hybridModel('hybrid-grain-silo'), {kit,structure,group}=model;
  // Pixel-rounded masonry and galvanized courses retain the construction grid.
  for (let x=-7;x<7;x++) for (let z=-7;z<7;z++) {
    const radius=Math.hypot(x+.5,z+.5);
    if (radius<6.8) kit.add(p.base,x,0,z,1,2,1);
    if (radius<5.9&&radius>3.8) {
      kit.add(p.steel,x,2,z,1,19,1);
      for (const y of [3,10,19]) kit.add(h.teal,x,y,z,1,1,1);
    }
    for (let step=0;step<5;step++) if (radius<6.8-step*1.2) kit.add(step===0?h.teal:h.slate,x,21+step,z,1,1,1);
  }
  kit.add(h.tealDark,-2,26,-2,4,1,4);
  // The yellow elevator has an open front where the grain buckets can be seen.
  kit.add(p.base,-11,0,-1,4,2,6);
  kit.add(p.gold,-10,2,0,3,22,1);
  for (const x of [-10,-8]) kit.add(p.gold,x,2,1,1,22,2);
  kit.add(h.tealDark,-10,2,3,3,3,1);
  kit.add(h.tealDark,-10,22,3,3,2,1);
  for (const y of [7,15]) kit.add(p.steel,-8,y,-1,4,1,1);
  pipe(structure,[[-1.7,4.8,.35],[-1.7,5.03,.3],[-.2,5.23,.1],[0,5.15,0]],.115,p.gold);
  cylinder(structure,p.gold,-1.71,.88,1.09,.18,.58,.43,8);
  cylinder(structure,p.grain,-1.71,1.17,1.09,.385,.02,.385,8);
  pipe(structure,[[-1.71,.59,1.09],[-1.71,.48,.83],[-1.71,.64,.48]],.115,h.copper);
  const buckets=[];
  for (let i=0;i<8;i++) {
    const bucket=new THREE.Group(); group.add(bucket);
    block(bucket,p.steel,0,0,0,.18,.12,.18,.012);
    block(bucket,p.grain,0,.064,.01,.14,.025,.13,.006);
    bake(bucket); buckets.push(bucket);
  }
  const drive=wheel(group,-1.71,4.59,.67,.17,h.copper);
  badge(structure,0,2.75,1.24,'wheat',h.tealDark,.86);
  // Fine ladder rungs and handrails sit proud of the stepped shell.
  for (const x of [.61,.97]) bar(structure,h.tealDark,[x,.36,1.2],[x,4.21,1.2],.031);
  for (let y=.55;y<4.2;y+=.25) bar(structure,p.steel,[.61,y,1.2],[.97,y,1.2],.026);
  pipe(structure,[[.61,4.06,1.2],[.61,4.53,1.13],[.61,4.65,.89]],.031,h.tealDark);
  pipe(structure,[[.97,4.06,1.2],[.97,4.38,1.12],[.97,4.47,.89]],.031,h.tealDark);
  pipe(structure,[[.18,.79,1.03],[.2,1.05,1.31],[1.24,1.45,1.58],[1.54,1.27,1.81]],.12,h.teal);
  const valve=wheel(group,.22,1.12,1.51,.22,p.gold);
  crate(structure,1.55,0,1.88,.92,p.grain);
  const discharge = stream(model,[1.55,1.23,1.83],[1.55,.52,1.88],{count:12,radius:.035,speed:1.55});
  const vent=new THREE.Group(); vent.position.set(0,5.63,0); group.add(vent);
  cylinder(structure,p.steel,0,5.47,0,.16,.22,.16,10);
  cylinder(vent,h.teal,0,0,0,.25,.21,.14,10);
  for (let i=0;i<8;i++) {
    const fin=block(vent,p.steel,Math.sin(i*Math.PI/4)*.23,0,Math.cos(i*Math.PI/4)*.23,.045,.23,.15,.008);
    fin.rotation.y=i*Math.PI/4+.4;
  }
  bake(vent);
  let direction = null, inputTime = 0, outputTime = 0, previousTime = 0;
  model.motions.push((time,working,reduced,elapsed)=>{
    if (direction === null) inputTime = outputTime = time;
    else if (working) {
      const delta = Math.max(0, time - previousTime);
      if (direction === 'input') inputTime += delta;
      else outputTime += delta;
    }
    previousTime = time;
    buckets.forEach((bucket,i)=>bucket.position.set(-1.7,.54+((inputTime*.18+i/8)%1)*4.06,.44));
    drive.rotation.z=-inputTime*2.4;
    valve.rotation.z=Math.sin(outputTime*.6)*.1;
    discharge.forEach(part => { part.visible = working && !reduced && direction !== 'input'; });
    vent.rotation.y=elapsed*(reduced?.35:1.3);
  });
  return { ...finishHybrid(model,[[-2.21,0,-1.5],[2.12,5.84,2.36]]),
    setTransferDirection: next => { if (next === 'input' || next === 'output') direction = next; },
  };
}
