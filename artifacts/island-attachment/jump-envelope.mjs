import {createPhysics} from '../../src/physics/index.js';
import {gridKey} from '../../src/core/shared.js';
let maximum=0, scenario=null;
for(const height of [0,2,5]) for(let jumpFrame=28;jumpFrame<=62;jumpFrame++) {
  const physics=await createPhysics();
  const terrain=new Map();
  for(let x=-8;x<=0;x++)for(let z=-3;z<=3;z++)terrain.set(gridKey(x,z),{gx:x,gz:z,x,z,topY:height,baseY:height,dirtDepth:.9});
  physics.rebuildStaticColliders(terrain,[]);
  physics.createVehicle('test',{x:-4,y:height,z:0});
  for(let frame=0;frame<150;frame++){
    physics.drive(1/60,{x:1,z:0},1,frame===jumpFrame,false);physics.step(1/60);
    const state=physics.vehicleState('test');
    if(frame>=jumpFrame&&state.y>=-.1&&state.x+.44-.5>maximum){maximum=state.x+.44-.5;scenario={height,jumpFrame};}
  }
  physics.world.free();
}
console.log(JSON.stringify({maximumShoreReach:maximum,scenario,recommendedGap:Math.ceil((maximum+.3)*2)/2}));
