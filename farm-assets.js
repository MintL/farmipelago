import { box, mats, THREE } from './shared.js?v=crop-diversity-20260831-1';

const previewMats = {
  green: new THREE.MeshStandardMaterial({ color: 0x6eab37, roughness: .7 }),
  greenDark: new THREE.MeshStandardMaterial({ color: 0x28451e, roughness: .8 }),
  greenLight: new THREE.MeshStandardMaterial({ color: 0xa6d957, roughness: .62 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xd8c79b, roughness: .8 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb7412e, roughness: .75 }),
};

function addWheel(parent, x, y, z, radius, width, materials, detailed = false) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  const roller = new THREE.Group();
  holder.add(roller);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), mats.tire);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  roller.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .43, radius * .43, width + .025, 12), materials.hub);
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  roller.add(hub);
  if (detailed) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * .16, radius * .16, width + .04, 10), materials.cap);
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    roller.add(cap);
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      const tread = box(width + .04, .07, .14, materials.tread);
      tread.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      tread.rotation.x = -angle;
      roller.add(tread);
    }
  }
  parent.add(holder);
  return { holder, roller, tire, hub, radius };
}

export function createTractorAsset() {
  const group = new THREE.Group();
  const wheels = [];
  const chassis = box(.98, .18, 1.36, mats.tractorDark); chassis.position.y = .4; group.add(chassis);
  const body = box(.94, .42, 1.22, mats.tractor); body.position.y = .61; group.add(body);
  const hood = box(.88, .38, .7, mats.tractorAccent); hood.position.set(0, .83, -.54); group.add(hood);
  const hoodStripe = box(.58, .045, .74, mats.tractorCream); hoodStripe.position.set(0, 1.04, -.54); group.add(hoodStripe);
  const grille = box(.58, .24, .045, mats.tractorDark); grille.position.set(0, .79, -.913); group.add(grille);
  for (const x of [-.28, .28]) {
    const lamp = box(.16, .14, .055, mats.headlamp); lamp.position.set(x, .86, -.94); group.add(lamp);
  }

  const cab = new THREE.Group();
  cab.position.z = .26;
  group.add(cab);
  const roof = box(.92, .13, .75, mats.tractorCream); roof.position.set(0, 1.52, 0); cab.add(roof);
  for (const x of [-.37, .37]) for (const z of [-.25, .25]) {
    const post = box(.09, .76, .09, mats.tractorDark); post.position.set(x, 1.15, z); cab.add(post);
  }
  const windscreen = box(.64, .53, .035, mats.cab, false); windscreen.position.set(0, 1.19, -.265); cab.add(windscreen);
  const backWindow = box(.64, .53, .035, mats.cab, false); backWindow.position.set(0, 1.19, .265); cab.add(backWindow);
  for (const x of [-.39, .39]) {
    const sideWindow = box(.035, .53, .42, mats.cab, false); sideWindow.position.set(x, 1.19, 0); cab.add(sideWindow);
  }
  const seat = box(.42, .16, .32, mats.tire); seat.position.set(0, .84, .29); group.add(seat);
  const steeringColumn = box(.055, .34, .055, mats.tractorDark); steeringColumn.position.set(0, 1, -.02); steeringColumn.rotation.x = -.38; group.add(steeringColumn);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(.17, .027, 6, 10), mats.tractorCream);
  steeringWheel.position.set(0, 1.16, -.085); steeringWheel.rotation.x = Math.PI * .54; steeringWheel.castShadow = true; group.add(steeringWheel);
  const exhaust = box(.1, .56, .1, mats.tractorDark); exhaust.position.set(-.28, 1.17, -.72); group.add(exhaust);
  const exhaustTip = box(.15, .07, .15, mats.metal); exhaustTip.position.set(-.28, 1.47, -.72); group.add(exhaustTip);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 10), mats.headlamp);
  beacon.position.set(0, 1.66, .18); beacon.castShadow = true; group.add(beacon);

  const wheelMaterials = { hub: mats.hub, cap: mats.tractorCream, tread: mats.tractorDark };
  const addTractorWheel = (x, y, z, radius, width, front) => {
    wheels.push({ ...addWheel(group, x, y, z, radius, width, wheelMaterials, true), front, spin: 0, phase: Math.random() * Math.PI * 2 });
  };
  addTractorWheel(-.58, .35, -.4, .34, .25, true);
  addTractorWheel(.58, .35, -.4, .34, .25, true);
  addTractorWheel(-.6, .43, .47, .45, .28, false);
  addTractorWheel(.6, .43, .47, .45, .28, false);
  return { group, wheels };
}

function createPloughAsset() {
  const group = new THREE.Group();
  group.name = 'attachment-plough';
  const hitch = box(.28, .16, .34, mats.tractorDark); hitch.position.z = -.15; group.add(hitch);
  const beam = box(1.62, .13, .16, mats.tractorAccent); beam.position.y = .1; group.add(beam);
  for (const x of [-.57, -.19, .19, .57]) {
    const arm = box(.09, .46, .11, mats.tractorDark); arm.position.set(x, -.1, .16); arm.rotation.x = -.38; group.add(arm);
    const blade = box(.29, .11, .43, mats.tractor); blade.position.set(x, -.29, .35); blade.rotation.y = -.28; blade.rotation.x = -.22; group.add(blade);
    const tip = box(.1, .08, .16, mats.metal); tip.position.set(x + .1, -.34, .53); tip.rotation.y = -.28; group.add(tip);
  }
  return group;
}

function createSeederAsset() {
  const group = new THREE.Group();
  group.name = 'attachment-seeder';
  const hitch = box(.28, .16, .34, mats.tractorDark); hitch.position.z = -.15; group.add(hitch);
  const seedBox = box(1.12, .38, .54, mats.tractorAccent); seedBox.position.set(0, .08, .25); group.add(seedBox);
  const seedLid = box(1.2, .08, .62, mats.tractorCream); seedLid.position.set(0, .31, .25); group.add(seedLid);
  for (const x of [-.32, .32]) {
    const coulter = box(.08, .3, .08, mats.metal); coulter.position.set(x, -.18, .52); group.add(coulter);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .07, 10), mats.tire);
    wheel.position.set(x, -.16, .5); wheel.rotation.z = Math.PI / 2; wheel.castShadow = true; group.add(wheel);
  }
  return group;
}

function createSprayerAsset() {
  const group = new THREE.Group();
  group.name = 'attachment-sprayer';
  const hitch = box(.28, .16, .34, mats.tractorDark); hitch.position.z = -.15; group.add(hitch);
  const tank = box(.82, .42, .54, mats.tractorCream); tank.position.set(0, .08, .18); group.add(tank);
  const tankBand = box(.88, .09, .59, mats.tractorAccent); tankBand.position.set(0, .08, .18); group.add(tankBand);
  const boom = box(2.85, .08, .09, mats.metal); boom.position.set(0, -.1, .58); group.add(boom);
  for (const x of [-1.15, -.77, -.38, 0, .38, .77, 1.15]) {
    const nozzle = box(.07, .13, .07, mats.tractorAccent); nozzle.position.set(x, -.19, .58); group.add(nozzle);
  }
  return group;
}

export function createRearToolAsset(type) {
  const factories = { plough: createPloughAsset, seeder: createSeederAsset, sprayer: createSprayerAsset };
  return factories[type]?.() || null;
}

export function createCombineAsset() {
  const group = new THREE.Group();
  group.name = 'combine-harvester';
  const wheels = [];
  const wheelMats = { hub: mats.combineAccent, cap: mats.combineCream, tread: mats.combineDark };
  const addCombineWheel = (x, y, z, radius, width, steer = false) => {
    wheels.push({ ...addWheel(group, x, y, z, radius, width, wheelMats, true), steer, spin: 0, phase: Math.random() * Math.PI * 2 });
  };
  const chassis = box(1.5, .24, 2.18, mats.combineDark); chassis.position.set(0, .53, .08); group.add(chassis);
  const body = box(1.38, .67, 1.55, mats.combine); body.position.set(0, .86, .22); group.add(body);
  const sidePanel = box(1.47, .33, 1.08, mats.combineAccent); sidePanel.position.set(0, .86, .58); group.add(sidePanel);
  const grainTank = box(1.26, .48, .75, mats.combine); grainTank.position.set(0, 1.43, .57); group.add(grainTank);
  const tankLid = box(1.37, .09, .84, mats.combineCream); tankLid.position.set(0, 1.71, .57); group.add(tankLid);
  const tankRail = box(1.45, .06, .08, mats.combineDark); tankRail.position.set(0, 1.79, .22); group.add(tankRail);
  const cab = new THREE.Group(); cab.position.set(-.2, 1.08, -.35); group.add(cab);
  const cabBase = box(.76, .18, .74, mats.combineDark); cabBase.position.y = .03; cab.add(cabBase);
  const cabRoof = box(.88, .12, .84, mats.combineCream); cabRoof.position.y = .92; cab.add(cabRoof);
  const windscreen = box(.63, .58, .035, mats.cab, false); windscreen.position.set(0, .55, -.39); cab.add(windscreen);
  const rearWindow = box(.63, .58, .035, mats.cab, false); rearWindow.position.set(0, .55, .39); cab.add(rearWindow);
  for (const x of [-.37, .37]) for (const z of [-.34, .34]) {
    const post = box(.07, .72, .07, mats.combineDark); post.position.set(x, .49, z); cab.add(post);
  }
  const seat = box(.38, .14, .3, mats.combineDark); seat.position.set(0, .2, .17); cab.add(seat);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(.15, .023, 6, 10), mats.combineCream);
  steeringWheel.position.set(0, .36, -.1); steeringWheel.rotation.x = Math.PI * .53; steeringWheel.castShadow = true; cab.add(steeringWheel);
  const exhaust = box(.1, .72, .1, mats.combineDark); exhaust.position.set(.48, 1.69, .5); group.add(exhaust);
  const exhaustCap = box(.16, .06, .16, mats.metal); exhaustCap.position.set(.48, 2.07, .5); group.add(exhaustCap);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 10), mats.headlamp);
  beacon.position.set(-.2, 2.08, -.35); beacon.castShadow = true; group.add(beacon);
  const auger = new THREE.Group(); auger.position.set(.78, 1.38, .72); auger.rotation.z = -.21; group.add(auger);
  const augerTube = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 1.55, 10), mats.combineAccent);
  augerTube.rotation.z = Math.PI / 2; augerTube.position.x = .73; augerTube.castShadow = true; auger.add(augerTube);
  const augerTip = box(.16, .18, .16, mats.combineDark); augerTip.position.set(1.49, -.12, 0); auger.add(augerTip);
  const header = new THREE.Group(); header.position.set(0, .42, -1.72); group.add(header);
  const headerFrame = box(3.38, .19, .67, mats.combineDark); headerFrame.position.y = .06; header.add(headerFrame);
  const cutterBar = box(3.58, .07, .16, mats.metal); cutterBar.position.set(0, -.13, -.35); header.add(cutterBar);
  for (let x = -1.58; x <= 1.58; x += .24) {
    const tooth = box(.08, .05, .23, mats.combineAccent); tooth.position.set(x, -.15, -.48); header.add(tooth);
  }
  const reel = new THREE.Group(); reel.position.set(0, .42, -.16); header.add(reel);
  const reelCore = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 3.08, 10), mats.combineAccent);
  reelCore.rotation.z = Math.PI / 2; reelCore.castShadow = true; reel.add(reelCore);
  for (let spoke = 0; spoke < 6; spoke++) {
    const angle = spoke / 6 * Math.PI * 2;
    const bat = box(3.12, .055, .08, mats.combineCream);
    bat.position.set(0, Math.cos(angle) * .35, Math.sin(angle) * .35); bat.rotation.x = angle; reel.add(bat);
  }
  for (const x of [-1.46, 1.46]) {
    const side = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .065, 12), mats.combineAccent);
    side.rotation.z = Math.PI / 2; side.position.set(x, 0, 0); side.castShadow = true; reel.add(side);
  }
  for (const x of [-.98, -.49, 0, .49, .98]) {
    const guard = box(.05, .35, .08, mats.combineCream); guard.position.set(x, .04, -.48); guard.rotation.x = -.35; header.add(guard);
  }
  addCombineWheel(-.86, .58, -.16, .61, .34);
  addCombineWheel(.86, .58, -.16, .61, .34);
  addCombineWheel(-.72, .4, .92, .37, .25, true);
  addCombineWheel(.72, .4, .92, .37, .25, true);
  return { group, wheels, header, reel, auger, augerTip };
}

export function createVehicleAsset(type) {
  if (type === 'tractor') return createTractorAsset().group;
  if (type === 'harvester') return createCombineAsset().group;
  return null;
}

function createFrontLoaderAsset() {
  const group = new THREE.Group();
  const crossbar = box(1.2, .14, .16, previewMats.green); crossbar.position.set(0, .55, .5); group.add(crossbar);
  for (const x of [-.45, .45]) {
    const arm = box(.12, 1.12, .12, previewMats.green); arm.position.set(x, .95, .05); arm.rotation.x = -.54; group.add(arm);
    const support = box(.1, .75, .1, previewMats.greenDark); support.position.set(x, .62, -.28); support.rotation.x = .55; group.add(support);
  }
  const bucket = box(1.42, .42, .62, mats.metal); bucket.position.set(0, .25, 1.05); bucket.rotation.x = -.17; group.add(bucket);
  const lip = box(1.56, .07, .12, previewMats.cream); lip.position.set(0, .03, 1.37); group.add(lip);
  return group;
}

function createForksAsset() {
  const group = new THREE.Group();
  const frame = box(1.3, .82, .1, previewMats.greenDark); frame.position.set(0, .56, .15); group.add(frame);
  for (const x of [-.42, .42]) {
    const fork = box(.12, .08, 1.45, mats.metal); fork.position.set(x, .16, .83); group.add(fork);
  }
  return group;
}

function createFrontWeightAsset() {
  const group = new THREE.Group();
  const weight = box(1.32, .65, .52, previewMats.greenDark); weight.position.y = .43; group.add(weight);
  const cap = box(1.46, .12, .64, previewMats.green); cap.position.y = .82; group.add(cap);
  const mount = box(.48, .32, .16, mats.metal); mount.position.set(0, .93, .18); group.add(mount);
  return group;
}

export function createFrontToolAsset(type) {
  const factories = { loader: createFrontLoaderAsset, forks: createForksAsset, weight: createFrontWeightAsset };
  return factories[type]?.() || null;
}

export function createLoadoutAsset(category, id) {
  if (category === 'vehicles') return createVehicleAsset(id);
  if (category === 'equipment') return createRearToolAsset(id);
  if (category === 'front-tools') return createFrontToolAsset(id);
  return null;
}
