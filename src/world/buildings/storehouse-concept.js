import { THREE, TILE } from '../../core/shared.js';
import { addHybridStorehouseArchitecture } from './storehouse-hybrid.js';
import { palette as p, material, mesh, block, cylinder, bar, disc, wheat, bake, sack } from './concept-kit.js';

const teal = material('storehouse-painted-teal', 0x347a79, .64);
const tealLight = material('storehouse-roof-ribs', 0x67a6a0, .58);
const tealDark = material('storehouse-heavy-frame', 0x234c52);
const amber = material('storehouse-cargo-label', 0xe8a238, .65);

function profile(parent, points, depth, z, mat) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }), mat, 0, 0, z);
}

function pallet(parent, x, y, z, width = 1.02, depth = .8) {
  for (const dx of [-width * .36, 0, width * .36]) block(parent, p.wood, x + dx, y + .045, z, .14, .09, depth);
  for (let i = 0; i < 5; i++) block(parent, p.wood, x, y + .12, z - depth / 2 + .07 + i * (depth - .14) / 4, width, .06, .12, .008);
}

function crate(parent, x, y, z, size = .8, fill = false) {
  const depth = size * .83, height = size * .77;
  if (!fill) block(parent, p.wood, x, y + height / 2, z, size, height, depth, .035);
  else {
    block(parent, p.wood, x, y + .04, z, size, .08, depth);
    for (const dz of [-depth / 2, depth / 2]) block(parent, p.wood, x, y + height / 2, z + dz, size, height, .075);
    for (const dx of [-size / 2, size / 2]) block(parent, p.wood, x + dx, y + height / 2, z, .075, height, depth);
    block(parent, p.grain, x, y + height * .7, z, size - .1, .05, depth - .1);
    for (let i = 0; i < 8; i++) {
      const grain = mesh(parent, new THREE.IcosahedronGeometry(size * .073, 0), p.gold,
        x + Math.sin(i * 2.4) * size * .3, y + height * .77, z + Math.cos(i * 2.4) * depth * .3);
      grain.scale.set(1.1, .7, 1.3);
    }
  }
  for (const dx of [-size * .34, size * .34]) {
    block(parent, tealDark, x + dx, y + height / 2, z + depth / 2 + .012, .065, height + .025, .04, .008);
    block(parent, tealDark, x + dx, y + height / 2, z - depth / 2 - .012, .065, height + .025, .04, .008);
    if (!fill) block(parent, tealDark, x + dx, y + height + .016, z, .065, .032, depth, .008);
  }
  block(parent, p.chalk, x, y + height * .57, z + depth / 2 + .035, size * .28, height * .43, .025, .008);
  wheat(parent, x, y + height * .39, z + depth / 2 + .058, size * .37);
}

export function createStorehouseConcept({ hybrid = false } = {}) {
  const group = new THREE.Group(); group.name = hybrid ? 'settlement-storehouse-hybrid' : 'settlement-storehouse-concept';
  if (hybrid) addHybridStorehouseArchitecture(group, { teal, tealLight, tealDark });
  // The voxel dock is two cells high. Shift its shared machinery and stock by
  // the same amount so the pallet, rail, cable and shelves stay registered.
  const details = new THREE.Group(); details.position.y = hybrid ? .08 : 0; group.add(details);
  const structure = new THREE.Group(); details.add(structure);
  if (!hybrid) {
    // Broad and low, with a real open receiving hall and a substantial dock.
    block(structure, p.base, 0, .13, -.08, 4.9, .26, 3.14, .08);
    block(structure, p.cream, 0, .255, .22, 4.8, .13, 3.57, .035);
    block(structure, p.wood, 0, .22, 1.96, 4.85, .2, 1.02, .03);
    for (const x of [-1.95, -.98, .98, 1.95]) {
      block(structure, tealDark, x, .22, 2.49, .33, .26, .15);
      block(structure, p.gold, x, .34, 2.5, .22, .06, .16, .008);
    }
    block(structure, p.cream, 0, 1.3, -1.43, 4.62, 1.97, .2, .035);
    for (const side of [-1, 1]) {
      // High recessed side windows sit above timber cargo racks.
      block(structure, p.cream, side * 2.24, .88, -.04, .2, 1.15, 2.63);
      block(structure, p.cream, side * 2.24, 2.18, -.04, .2, .28, 2.63);
      for (const z of [-1.25, .12, 1.19]) block(structure, p.cream, side * 2.24, 1.75, z, .2, .61, .21);
      block(structure, p.glass, side * 2.245, 1.75, -.56, .06, .58, 1.1, .008);
      block(structure, p.glass, side * 2.245, 1.75, .66, .06, .58, .86, .008);
      for (const y of [1.44, 2.05]) block(structure, teal, side * 2.37, y, -.04, .1, .08, 2.66);
      for (const z of [-1.28, -.58, .11, .69, 1.21]) block(structure, teal, side * 2.37, 1.76, z, .1, .63, .055, .008);
      for (const z of [-1.38, 1.21]) {
        block(structure, tealDark, side * 2.22, 1.35, z, .29, 2.1, .3, .035);
        block(structure, p.gold, side * 2.22, .54, z + .01, .33, .24, .34);
      }
      // Parked sliding doors show that the opening belongs to a working warehouse.
      block(structure, teal, side * 1.94, 1.3, 1.37, .46, 1.83, .13);
      for (let y = .52; y < 2.12; y += .19) block(structure, tealLight, side * 1.94, y, 1.45, .44, .035, .045, .006);
      block(structure, p.steel, side * 1.81, 1.22, 1.49, .05, .25, .04, .008);
    }
    block(structure, tealDark, 0, 2.28, 1.23, 4.76, .24, .31);
    block(structure, p.gold, 0, 2.135, 1.39, 3.54, .07, .1);
    for (const x of [-1.72, 1.72]) {
      block(structure, tealDark, x, 1.26, 1.33, .17, 1.9, .18);
      for (const y of [.55, 1.9]) disc(structure, p.steel, x, y, 1.435, .045, .025, 6);
    }

    // Faceted barrel roof: five broad panels instead of a generic cottage gable.
    const roof = [[-2.57, 2.34], [-2.06, 3.04], [-1.2, 3.42], [1.2, 3.42], [2.06, 3.04], [2.57, 2.34]];
    profile(structure, [...roof, ...roof.toReversed().map(([x, y]) => [x, y - .14])], 3.04, -1.6, teal);
    for (const z of [-1.62, 1.42]) {
      profile(structure, [...roof, ...roof.toReversed().map(([x, y]) => [x, y - .1])], .09, z, p.cream);
    }
    const gable = [[-2.22, 2.28], [-2.22, 2.61], [-1.98, 2.96], [-1.15, 3.29], [1.15, 3.29], [1.98, 2.96], [2.22, 2.61], [2.22, 2.28]];
    profile(structure, gable, .14, -1.43, p.cream);
    profile(structure, gable, .14, 1.18, p.cream);
    for (const z of [-1.12, -.43, .26, .95]) for (let i = 0; i < roof.length - 1; i++) {
      const a = roof[i], b = roof[i + 1];
      bar(structure, tealLight, [a[0], a[1] + .026, z], [b[0], b[1] + .026, z], .03);
    }
    // A cantilevered dock canopy keeps the receiving area clear for vehicles.
    const canopy = block(structure, teal, 0, 2.47, 1.73, 4.97, .18, 1.11, .04);
    canopy.rotation.x = .09;
    block(structure, tealDark, 0, 2.42, 2.29, 5.03, .22, .16);
    block(structure, p.gold, 0, 2.29, 2.31, 4.94, .07, .17, .014);
    for (const x of [-2.2, 2.2]) bar(structure, tealDark, [x, 1.78, 1.25], [x, 2.39, 2.15], .065);
  }

  // One large civic wheat crest reads from across the village.
  const crest = new THREE.Group(); crest.position.set(0, hybrid ? 3.07 : 2.87, hybrid ? 1.62 : 1.41); structure.add(crest);
  profile(crest, [[-.47, -.15], [-.47, .36], [-.33, .46], [.33, .46], [.47, .36], [.47, -.15], [0, -.48]], .12, 0, tealDark);
  profile(crest, [[-.37, -.12], [-.37, .3], [-.26, .35], [.26, .35], [.37, .3], [.37, -.12], [0, -.37]], .055, .125, p.chalk);
  wheat(crest, 0, -.28, .21, .99);
  for (const x of [-.94, .94]) disc(structure, p.gold, x, 2.92, hybrid ? 1.43 : 1.365, .072, .03, 8);

  // Two stocked racks frame the clear central hoist route.
  const stockGroups = [];
  for (const side of [-1, 1]) {
    for (const x of [side * .77, side * 1.93]) for (const z of [-1.05, .16]) block(structure, tealDark, x, 1.18, z, .085, 1.7, .085);
    for (const y of [.42, 1.22, 2.09]) block(structure, p.wood, side * 1.35, y, -.43, 1.28, .11, 1.3);
    const lowerStock = new THREE.Group(), upperStock = new THREE.Group();
    details.add(lowerStock, upperStock); stockGroups.push(lowerStock, upperStock);
    crate(lowerStock, side * 1.37, .48, -.17, .88, true);
    for (const dx of [-.23, .23]) {
      const stock = sack(); stock.position.set(side * 1.35 + dx, 1.28, .02); stock.scale.setScalar(.9); upperStock.add(stock);
    }
    crate(lowerStock, side * 1.35, .48, -.85, .65);
    bake(lowerStock); bake(upperStock);
    block(structure, amber, side * 1.35, 1.21, .26, .22, .1, .035, .008);
  }
  // A small stack on the side apron and a parked pallet truck add human scale.
  const apron = new THREE.Group(); apron.position.y = -details.position.y; structure.add(apron);
  pallet(apron, 2.74, 0, -.48, .84, .8);
  crate(apron, 2.74, .15, -.48, .7);
  crate(apron, 2.74, .71, -.48, .62);
  const jack = new THREE.Group(); jack.position.set(-2.77, .12, -.32); jack.rotation.y = -.27; apron.add(jack);
  for (const x of [-.18, .18]) {
    block(jack, p.gold, x, .065, .08, .12, .09, .79);
    const wheel = cylinder(jack, p.dark, x, 0, .37, .07, .13, .07, 8); wheel.rotation.z = Math.PI / 2;
  }
  cylinder(jack, p.dark, 0, .02, -.35, .11, .21, .11, 8).rotation.z = Math.PI / 2;
  block(jack, p.gold, 0, .2, -.33, .4, .32, .25);
  bar(jack, tealDark, [0, .23, -.32], [0, 1.05, -.58], .045);
  for (const x of [-.16, .16]) bar(jack, tealDark, [0, .93, -.54], [x, 1.15, -.62], .035);
  bar(jack, tealDark, [-.16, 1.15, -.62], [.16, 1.15, -.62], .04);
  if (!hybrid) {
    // Finished rear: an inset service door, painted trim and high warehouse vents.
    block(structure, tealDark, 0, 1.1, -1.56, .89, 1.57, .1);
    block(structure, teal, 0, 1.1, -1.63, .72, 1.39, .07);
    block(structure, p.gold, -.23, 1.0, -1.685, .07, .08, .03, .008);
    for (const x of [-1.35, 1.35]) for (let y = 1.61; y < 2; y += .11) block(structure, tealDark, x, y, -1.555, .69, .045, .055, .007);
    block(structure, p.base, 0, .13, -1.85, 1.02, .26, .49);
  }

  const lamp = material('storehouse-warm-lantern', 0xffe1a0, .55);
  lamp.emissive.setHex(0xffb94e); lamp.emissiveIntensity = .28;
  for (const x of [-1.97, 1.97]) {
    bar(structure, tealDark, [x, 2.15, 1.43], [x, 2.15, 1.67], .035);
    block(structure, lamp, x, 1.98, 1.67, .16, .24, .14, .015);
    for (const y of [1.84, 2.12]) block(structure, tealDark, x, y, 1.67, .22, .05, .21, .015);
    for (const dx of [-.095, .095]) block(structure, tealDark, x + dx, 1.98, 1.76, .025, .26, .025, .004);
  }
  // A continuous monorail reaches from the hall out over the loading dock.
  for (const y of [2.15, 2.32]) block(structure, p.gold, 0, y, .49, .22, .08, 3.4);
  block(structure, amber, 0, 2.235, .49, .07, .13, 3.4, .014);
  for (const z of [-1.1, 2.15]) block(structure, tealDark, 0, 2.26, z, .32, .31, .1);
  if (hybrid) for (const z of [-.9, .7, 1.85]) bar(structure, p.steel, [0, 2.36, z], [0, 2.56, z], .035);
  // Mast is on the roof ridge, distinct from the loading machinery.
  block(structure, tealDark, -.56, 3.49, -.6, .41, .17, .41);
  bar(structure, p.steel, [-.56, 3.53, -.6], [-.56, 4.51, -.6], .04);
  mesh(structure, new THREE.IcosahedronGeometry(.09, 0), p.gold, -.56, 4.56, -.6);
  bake(structure);

  const trolley = new THREE.Group(); details.add(trolley);
  block(trolley, tealDark, 0, 2.1, 0, .45, .19, .34);
  block(trolley, p.gold, 0, 1.99, 0, .33, .16, .28);
  for (const x of [-.175, .175]) for (const z of [-.105, .105]) {
    cylinder(trolley, p.dark, x, 2.26, z, .085, .075, .085, 10).rotation.z = Math.PI / 2;
  }
  bake(trolley);
  const spool = new THREE.Group(); trolley.add(spool);
  disc(spool, p.gold, .24, 2.04, .13, .15, .08);
  bar(spool, tealDark, [.13, 2.04, .185], [.35, 2.04, .185], .025);
  // Recenter the drum so its visible spoke rotates around the axle.
  spool.position.set(.24, 2.04, .13);
  spool.children.forEach(part => part.position.sub(spool.position));
  bake(spool);
  const cable = cylinder(details, p.dark, 0, 1.6, 2, .021, 1, .021, 8);
  const cargo = new THREE.Group(); details.add(cargo);
  pallet(cargo, 0, 0, 0);
  crate(cargo, 0, .16, 0, .91);
  for (const x of [-.41, .41]) for (const z of [-.3, .3]) bar(cargo, p.steel, [x, .84, z], [0, 1.18, 0], .018);
  disc(cargo, p.steel, 0, 1.19, 0, .065, .04, 8);
  bake(cargo);

  // Vertex-colored cloth gives the village flag a cream hoist stripe.
  const flagGeometry = new THREE.PlaneGeometry(1.05, .46, 12, 2);
  const flagPosition = flagGeometry.attributes.position;
  const flagBase = flagPosition.array.slice(), colors = [];
  for (let i = 0; i < flagPosition.count; i++) {
    const color = flagPosition.getX(i) < -.32 ? p.chalk.color : p.gold.color;
    colors.push(color.r, color.g, color.b);
  }
  flagGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const flag = mesh(details, flagGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9 }), -.015, 4.23, -.6);
  flag.castShadow = false;
  group.scale.setScalar(TILE);

  function animate(time, working = true, reduced = false, ambientTime = time) {
    const t = time % 16;
    const smooth = (start, end) => THREE.MathUtils.smoothstep(t, start, end);
    const lift = smooth(1, 2.5) - smooth(5.5, 7) + smooth(9, 10.5) - smooth(13.5, 15);
    const travel = smooth(2.5, 5.5) - smooth(10.5, 13.5);
    cargo.position.set(0, .32 + lift * .38, 1.96 - travel * 2.18);
    trolley.position.z = cargo.position.z;
    spool.rotation.z = lift * 3 + travel * 7;
    const hook = cargo.position.y + 1.22, cableTop = 1.98;
    cable.position.set(0, (hook + cableTop) / 2, cargo.position.z);
    cable.scale.y = cableTop - hook;
    for (let i = 0; i < flagPosition.count; i++) {
      const x = flagBase[i * 3], anchored = (x + .525) / 1.05;
      flagPosition.setZ(i, Math.sin(ambientTime * (reduced ? .8 : 2.5) - anchored * 5) * anchored * (reduced ? .022 : .1));
    }
    flagPosition.needsUpdate = true; flagGeometry.computeVertexNormals();
  }
  animate(0);
  const bounds = new THREE.Box3(new THREE.Vector3(-3.1, 0, -2.1), new THREE.Vector3(3.22, 4.66, 2.65));
  if (hybrid) { bounds.min.set(-3.13, 0, -2.2); bounds.max.set(3.22, 4.74, 2.8); }
  bounds.min.multiplyScalar(TILE); bounds.max.multiplyScalar(TILE);
  const setLighting = lighting => { lamp.emissiveIntensity = lighting === 'evening' ? 1.3 : .28; };
  const setStockLevel = ratio => stockGroups.forEach((stock, index) => { stock.visible = ratio > index / stockGroups.length + .001; });
  return { group, bounds, animate, setLighting, setStockLevel };
}
