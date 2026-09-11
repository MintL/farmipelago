import { THREE, p, h, block, cylinder, bar, disc, ring, bake, sack, hybridModel, finishHybrid, badge, pipe, can, crate, lantern, stream } from './hybrid-kit.js';

function flourSack(parent,x,y,z,scale=.8) {
  const bag=sack(); bag.position.set(x,y,z); bag.scale.setScalar(scale); parent.add(bag); return bag;
}

export function createHybridTrader(kind='old-miller') {
  const oil=kind==='oil-trader', accent=oil?h.teal:h.red, model=hybridModel(`hybrid-${kind}`);
  const {kit,structure,group}=model;
  // A fourteen-cell market canopy keeps the stall smaller than the farm buildings.
  kit.add(p.base,-7,0,-5,14,1,13); kit.add(p.wood,-6,1,-4,12,1,12);
  kit.add(p.cream,-6,2,-4,12,11,2);
  for (const x of [-6,5]) for (const z of [-4,4]) kit.add(h.timber,x,2,z,1,z<0?11:9,1);
  for (const y of [3,6]) kit.add(p.wood,-5,y,-2,10,1,2);
  kit.add(h.timber,-6,2,6,12,3,2); kit.add(p.wood,-7,5,3,14,1,5);
  for (let x=-6;x<6;x+=3) kit.add(accent,x,2,8,2,3,1);
  for (let z=-5;z<5;z++) for (let x=-7;x<7;x++) {
    const y=13-Math.floor((z+5)/4), color=Math.floor((x+7)/2)%2?accent:p.chalk;
    kit.add(color,x,y,z,1,1,1);
    if (z===4) kit.add(color,x,y-1,z,1,1,1);
  }
  kit.add(h.timber,-6,10,4,12,1,1);
  kit.add(p.wood,-6,12,-3,12,1,1);
  kit.add(accent,-3,4,-5,6,4,1);
  for (const x of [-3,2]) kit.add(h.timber,x,4,-6,1,4,1);
  kit.add(p.wood,-4,3,-6,8,1,1); kit.add(p.wood,-4,8,-6,8,1,1);
  bar(structure,p.steel,[-.11,1.06,-1.22],[.11,1.06,-1.22],.024);
  const sign=new THREE.Group(); sign.position.set(0,2.48,1.08); group.add(sign);
  bar(sign,p.steel,[-.17,0,0],[-.17,-.12,0],.022); bar(sign,p.steel,[.17,0,0],[.17,-.12,0],.022);
  badge(sign,0,-.36,0,oil?'oil':'wheat',accent,.53); bake(sign);
  lantern(model,-1.04,1.74,1.06);
  if (oil) {
    for (const y of [.8,1.4]) for (const x of [-.82,-.3,.3,.82]) can(structure,x,y,-.23,.55);
    can(structure,.9,1.2,.84,.7); can(structure,.42,1.2,.86,.55);
    cylinder(structure,h.copper,-1.76,.52,-.1,.3,.98,.3,12);
    for (const y of [.12,.91]) ring(structure,h.tealDark,-1.76,y,-.1,.31,.026).rotation.x=Math.PI/2;
    cylinder(structure,p.gold,-1.76,1.05,-.1,.09,.08,.09,10);
    pipe(structure,[[-1.76,1.07,-.1],[-1.62,1.38,.04],[-.63,1.45,.25],[-.61,1.58,.9]],.04,h.copper);
    block(structure,h.tealDark,-.62,1.38,1.04,.29,.36,.33);
    cylinder(structure,h.copper,-.62,1.75,1.04,.1,.53,.1,10);
    pipe(structure,[[-.62,1.94,1.04],[-.37,1.96,1.33],[-.16,1.91,1.36],[-.16,1.72,1.36]],.04,h.copper);
    cylinder(structure,p.glass,-.16,1.35,1.36,.13,.3,.18,10);
    cylinder(structure,p.gold,-.16,1.51,1.36,.158,.02,.158,10);
    ring(structure,p.chalk,-.35,1.37,1.36,.12,.023);
    const handle=new THREE.Group(); handle.position.set(-.62,1.9,1.11); group.add(handle);
    bar(handle,p.steel,[0,0,0],[-.36,.11,0],.035); block(handle,h.timber,-.38,.12,0,.15,.08,.12); bake(handle);
    stream(model,[-.16,1.7,1.36],[-.16,1.53,1.36],{mat:p.gold,count:5,radius:.019});
    crate(structure,1.68,0,.92,.55,p.gold); can(structure,1.68,.3,.92,.55);
    model.motions.push(time=>{handle.rotation.z=Math.sin(time*1.6)*.2;});
  } else {
    for (const y of [.8,1.4]) for (const x of [-.8,-.3,.3,.8]) flourSack(structure,x,y,-.23,.56);
    flourSack(structure,-.84,1.2,.9,.66); flourSack(structure,-.36,1.2,.88,.58);
    flourSack(structure,-1.65,0,.82,.92); flourSack(structure,-1.73,0,.2,.7);
    crate(structure,1.63,0,.87,.55,p.chalk);
    block(structure,h.tealDark,.65,1.28,1.34,.7,.16,.46);
    bar(structure,h.copper,[.65,1.35,1.34],[.65,2.04,1.34],.052);
    disc(structure,p.gold,.65,1.94,1.37,.11,.09,10);
    const balance=new THREE.Group(); balance.position.set(.65,1.99,1.37); group.add(balance);
    bar(balance,h.copper,[-.44,0,0],[.44,0,0],.029);
    for (const side of [-1,1]) {
      const x=side*.4;
      for (const dx of [-.14,.14]) bar(balance,p.steel,[x,0,0],[x+dx,-.3,0],.014);
      cylinder(balance,p.gold,x,-.33,0,.16,.08,.21,10);
    }
    flourSack(balance,.4,-.29,0,.42); bake(balance);
    // Keep the scoop and working balance visible beyond the awning.
    const scoop=cylinder(structure,p.steel,-.04,1.27,1.12,.09,.13,.14,8); scoop.rotation.z=.7;
    bar(structure,p.wood,[-.13,1.3,1.12],[-.4,1.47,1.12],.028);
    model.motions.push(time=>{balance.rotation.z=Math.sin(time*1.1)*.075;});
  }
  model.motions.push((time,working,reduced,elapsed)=>{sign.rotation.z=Math.sin(elapsed*1.2)*(reduced?.012:.055);});
  return finishHybrid(model);
}
