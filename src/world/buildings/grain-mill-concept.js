import { THREE, TILE } from '../../core/shared.js';
import { addHybridMillArchitecture } from './grain-mill-hybrid.js';
import { palette as p, mesh, block, cylinder, bar, disc, ring, wheat, bake, sack } from './concept-kit.js';

// The gallery and game each supply their own working clock.
function wallCourse(parent, low, high, bottomRadius, topRadius, openFront = false) {
  // Thick octagonal wall segments leave a real open machine bay at the front.
  for (let i = 0; i < 8; i++) {
    if (openFront && [0, 1, 7].includes(i)) continue;
    const a = i * Math.PI / 4 - Math.PI / 8, b = a + Math.PI / 4;
    const point = (r, y, t) => [Math.sin(t) * r, y, Math.cos(t) * r];
    const vertices = [point(bottomRadius, low, a), point(bottomRadius, low, b),
      point(topRadius, high, b), point(topRadius, high, a),
      point(bottomRadius - .18, low, a), point(bottomRadius - .18, low, b),
      point(topRadius - .18, high, b), point(topRadius - .18, high, a)];
    const indices = [0, 1, 2, 0, 2, 3, 5, 4, 7, 5, 7, 6, 4, 0, 3, 4, 3, 7,
      1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 4, 5, 1, 4, 1, 0];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    mesh(parent, geometry, p.cream);
  }
}

export function createGrainMillConcept({ hybrid = false } = {}) {
  const group = new THREE.Group(); group.name = hybrid ? 'grain-mill-hybrid' : 'grain-mill-concept';
  if (hybrid) addHybridMillArchitecture(group);
  const structure = new THREE.Group(); group.add(structure);
  const tower = new THREE.Group(); tower.position.x = -.55; structure.add(tower);
  if (!hybrid) {
    cylinder(tower, p.base, 0, .13, 0, 1.38, .26, 1.38, 8).rotation.y = Math.PI / 8;
    cylinder(tower, p.darkBlue, 0, .3, 0, 1.26, .12, 1.26, 8).rotation.y = Math.PI / 8;
    wallCourse(tower, .35, 1.64, 1.24, 1.12, true);
    wallCourse(tower, 1.64, 2.83, 1.12, .99);
    for (const x of [-.92, .92]) {
      block(tower, p.darkBlue, x, .98, .76, .18, 1.3, .23);
      block(tower, p.gold, x, 1.57, .8, .24, .17, .28);
    }
    block(tower, p.wood, 0, 1.68, .91, 1.97, .22, .26);
    cylinder(tower, p.darkBlue, 0, 2.86, 0, 1.12, .2, 1.12, 8).rotation.y = Math.PI / 8;
    cylinder(tower, p.blue, 0, 3.26, 0, 1.45, .72, .43, 8).rotation.y = Math.PI / 8;
    cylinder(tower, p.lightBlue, 0, 2.93, 0, 1.45, .1, 1.45, 8).rotation.y = Math.PI / 8;
    cylinder(tower, p.darkBlue, 0, 3.65, 0, .48, .13, .38, 8);
    cylinder(tower, p.gold, 0, 3.83, 0, .21, .3, .09, 8);
    // Cab-like window frames and recessed glazing on the side and rear.
    for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const window = new THREE.Group(); window.rotation.y = angle; tower.add(window);
      disc(window, p.darkBlue, 0, 2.19, .97, .32, .1);
      disc(window, p.glass, 0, 2.19, 1.028, .24, .025);
      ring(window, p.chalk, 0, 2.19, 1.055, .266, .037);
      bar(window, p.chalk, [-.22, 2.19, 1.076], [.22, 2.19, 1.076], .022);
    }
  }
  disc(tower, p.darkBlue, 0, 2.21, 1.055, .35, .09);
  wheat(tower, 0, 1.94, 1.12, .85);
  // Raised trim, bolts and structural feet echo the tractor's chassis.
  for (const x of [-.92, .92]) for (const y of [.55, 1.36]) disc(tower, p.steel, x, y, .89, .045, .03, 6);
  block(tower, p.wood, 0, .24, 1.01, 1.85, .17, .6);
  cylinder(tower, p.stone, 0, .56, .55, .64, .28, .64, 16);
  cylinder(tower, p.dark, 0, .73, .55, .57, .075, .57, 16);
  bar(tower, p.steel, [0, .74, .55], [0, 1.62, .55], .075);
  cylinder(tower, p.gold, 0, 1.38, .55, .12, .28, .32, 8);

  const millstone = new THREE.Group(); millstone.position.set(-.55, .88, .55); group.add(millstone);
  cylinder(millstone, p.stone, 0, 0, 0, .63, .23, .59, 16);
  cylinder(millstone, p.wood, 0, .135, 0, .17, .08, .17, 8);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    bar(millstone, p.cream, [Math.cos(angle) * .25, .123, Math.sin(angle) * .25],
      [Math.cos(angle + .2) * .55, .123, Math.sin(angle + .2) * .55], .018);
  }
  bake(millstone);

  // Four broad tapered sails, clear of the roof and the entire bagging wing.
  bar(structure, p.dark, [-.55, 3.05, .73], [-.55, 3.05, 1.68], .17);
  const rotor = new THREE.Group(); rotor.position.set(-.55, 3.05, 1.78); group.add(rotor);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group(); blade.rotation.z = i * Math.PI / 2; rotor.add(blade);
    block(blade, p.wood, 0, 1.16, 0, .14, 2.22, .15);
    const shape = new THREE.Shape();
    shape.moveTo(-.04, .72); shape.lineTo(.37, .84); shape.lineTo(.65, 2.13);
    shape.lineTo(.59, 2.27); shape.lineTo(-.04, 2.27); shape.closePath();
    mesh(blade, new THREE.ExtrudeGeometry(shape, { depth: .095, bevelEnabled: true,
      bevelSize: .018, bevelThickness: .018, bevelSegments: 1, steps: 1 }), p.chalk, 0, 0, .03);
    block(blade, p.gold, .28, 2.19, .115, .66, .18, .07, .018);
    for (const y of [1.0, 1.39, 1.78]) {
      block(blade, p.wood, .15 + (y - 1) * .09, y, .16, .39 + (y - 1) * .18, .052, .055, .008);
    }
  }
  disc(rotor, p.darkBlue, 0, 0, .08, .33, .29);
  disc(rotor, p.gold, 0, 0, .26, .245, .15);
  disc(rotor, p.steel, 0, 0, .35, .065, .025, 6);
  bake(rotor);

  // Open grain hopper and sloping feeder on the left.
  for (const x of [-2.59, -1.95]) for (const z of [-.05, .58]) {
    block(structure, p.darkBlue, x, .55, z, .09, .94, .09);
  }
  const hopper = new THREE.Group(); hopper.position.set(-2.27, 1.2, .27); group.add(hopper);
  const funnel = new THREE.CylinderGeometry(.62, .22, .6, 4, 1, true);
  funnel.rotateY(Math.PI / 4);
  const hopperMaterial = p.gold.clone(); hopperMaterial.side = THREE.DoubleSide;
  mesh(hopper, funnel, hopperMaterial);
  block(hopper, p.dark, 0, .14, 0, .7, .035, .7);
  for (let i = 0; i < 27; i++) {
    const kernel = mesh(hopper, new THREE.IcosahedronGeometry(.074, 0), i % 3 ? p.grain : p.gold,
      Math.sin(i * 2.4) * .26, .21 + (i % 3) * .035, Math.cos(i * 2.4) * .26);
    kernel.scale.set(.7, .75, 1.35);
  }
  for (const x of [-.44, .44]) block(hopper, p.cream, x, .32, 0, .07, .09, .94);
  for (const z of [-.44, .44]) block(hopper, p.cream, 0, .32, z, .94, .09, .07);
  bake(hopper);
  bar(structure, p.gold, [-2.27, .95, .27], [-1.53, .58, -.45], .115);
  // A compact bucket elevator explains how grain reaches the high feeder.
  block(structure, p.blue, -1.53, 1.1, -.45, .32, 1.68, .34);
  block(structure, p.darkBlue, -1.53, 1.95, -.45, .45, .2, .44);
  bar(structure, p.gold, [-1.53, 1.84, -.45], [-.55, 1.52, .55], .1);

  // Exposed crank wheel drives the shaker, alongside the milling bay.
  const flywheel = new THREE.Group(); flywheel.position.set(.62, .85, 1.13); group.add(flywheel);
  ring(flywheel, p.darkBlue, 0, 0, 0, .38, .065);
  ring(flywheel, p.gold, 0, 0, .07, .38, .025);
  disc(flywheel, p.steel, 0, 0, .02, .11, .19);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    bar(flywheel, p.blue, [0, 0, .025], [Math.cos(angle) * .36, Math.sin(angle) * .36, .025], .042);
  }
  disc(flywheel, p.wood, .21, 0, .15, .065, .08);
  bake(flywheel);
  block(structure, p.darkBlue, .62, .46, .95, .22, .5, .3);

  // Low bagging wing: a thick blue canopy, open front and an exposed flour spout.
  if (!hybrid) {
    block(structure, p.base, 1.73, .1, .05, 2.23, .2, 2.1, .05);
    block(structure, p.cream, 1.75, .87, -.82, 2.05, 1.52, .18);
    block(structure, p.blue, 2.74, .85, -.04, .17, 1.48, 1.72);
    for (const x of [.86, 2.7]) block(structure, p.darkBlue, x, .92, .79, .13, 1.66, .13);
    const canopy = block(structure, p.blue, 1.76, 1.83, -.03, 2.38, .22, 2.1, .045);
    canopy.rotation.x = -.14;
    block(structure, p.lightBlue, 1.76, 1.66, 1.01, 2.45, .17, .18);
    for (const x of [.98, 1.38, 1.78, 2.18, 2.58]) {
      const rib = block(structure, p.lightBlue, x, 1.975, -.05, .045, .04, 1.97, .006);
      rib.rotation.x = -.14;
    }
  }
  bar(structure, p.cream, [.53, 1.47, .36], [1.65, 1.47, .36], .14);
  bar(structure, p.cream, [1.65, 1.47, .36], [1.65, 1.45, 1.18], .14);
  cylinder(structure, p.gold, 1.65, 1.32, 1.18, .13, .25, .19, 8);
  // Flour sacks travel sideways along this small, clearly visible roller table.
  for (const z of [.8, 1.57]) block(structure, p.darkBlue, 2.11, .4, z, 2.1, .16, .09);
  for (const x of [1.17, 3.04]) for (const z of [.83, 1.54]) block(structure, p.darkBlue, x, .22, z, .1, .43, .1);
  for (let i = 0; i < 10; i++) {
    const roller = cylinder(structure, i % 2 ? p.steel : p.dark, 1.2 + i * .2, .43, 1.18, .075, .67, .075, 8);
    roller.rotation.x = Math.PI / 2;
  }
  // Fixed reserve stock sits behind the active filling station.
  for (const [x, z] of [[2.24, -.21], [2.58, .18]]) {
    const stock = sack(); stock.position.set(x, .23, z); stock.rotation.y = -.1; structure.add(stock);
  }
  block(structure, p.wood, 2.38, .2, -.03, .9, .12, .8);
  // Little service door and vents on the back make the rear a finished view too.
  if (!hybrid) {
    block(tower, p.darkBlue, 0, .87, -1.1, .67, 1.04, .12);
    block(tower, p.blue, 0, .88, -1.18, .54, .87, .08);
    block(tower, p.gold, -.17, .83, -1.24, .07, .06, .04);
    for (let y = .7; y < 1.35; y += .14) block(structure, p.darkBlue, 2.84, y, -.05, .05, .055, .65, .006);
  }
  bake(structure);

  const bags = [sack(true), sack(true)];
  bags.forEach(bag => group.add(bag));
  const particles = new THREE.Group(); group.add(particles);
  const grains = [], flour = [];
  const grainGeometry = new THREE.IcosahedronGeometry(.034, 0);
  const flourGeometry = new THREE.IcosahedronGeometry(.023, 0);
  for (let i = 0; i < 12; i++) grains.push(mesh(particles, grainGeometry, p.grain));
  for (let i = 0; i < 14; i++) flour.push(mesh(particles, flourGeometry, p.chalk));
  particles.traverse(part => { if (part.isMesh) part.castShadow = false; });
  group.scale.setScalar(TILE);

  function animate(time, working = true, reduced = false) {
    rotor.rotation.z = -.22 - time * .48;
    millstone.rotation.y = time * 1.9;
    flywheel.rotation.z = -time * 2.4;
    hopper.position.y = 1.2 + (working && !reduced ? Math.sin(time * 19) * .012 : 0);
    const cycle = time % 7;
    const filling = cycle < 4.8;
    const departure = THREE.MathUtils.smoothstep(cycle, 4.8, 6.8);
    const arriving = THREE.MathUtils.smoothstep(cycle, 6.1, 7);
    bags[0].position.set(1.65 + departure * 1.22, .49, 1.18);
    bags[0].scale.set(1, .53 + Math.min(cycle / 4.8, 1) * .47, 1);
    bags[0].visible = cycle < 6.85;
    bags[1].position.set(1.13 + arriving * .52, .49, 1.18);
    bags[1].scale.set(1, .53, 1); bags[1].visible = cycle >= 6.1;
    particles.visible = working && !reduced;
    grains.forEach((part, i) => {
      const t = (time * 1.7 + i / grains.length) % 1;
      part.position.set(-.55 + Math.sin(i * 2.3) * .09, 1.53 - t * .34, .55 + Math.cos(i * 2.3) * .07);
      part.rotation.set(t * 4, i, t * 3);
    });
    flour.forEach((part, i) => {
      const t = (time * 2 + i / flour.length) % 1;
      part.visible = filling;
      const mouth = .49 + .64 * bags[0].scale.y;
      part.position.set(1.65 + Math.sin(i * 2.4) * .06, THREE.MathUtils.lerp(1.2, mouth, t), 1.18 + Math.cos(i * 2.4) * .05);
    });
  }
  animate(0);
  // Include the full moving sail sweep, not just its current pose.
  const bounds = new THREE.Box3(new THREE.Vector3(-2.98, 0, -1.5), new THREE.Vector3(3.18, 5.48, 2.18));
  bounds.min.multiplyScalar(TILE); bounds.max.multiplyScalar(TILE);
  return { group, bounds, animate };
}
