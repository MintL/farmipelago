import { THREE, TILE } from '../../core/shared.js';
import { voxelKit } from './kit.js';
import { palette as p, material, mesh, block, cylinder, bar, disc, ring, wheat, bake, sack } from './concept-kit.js';

export { THREE, p, material, mesh, block, cylinder, bar, disc, ring, wheat, bake, sack };
export const h = {
  timber: material('hybrid-oak-frame', 0x67503b),
  teal: material('hybrid-painted-teal', 0x347f7c, .65),
  tealDark: material('hybrid-teal-frame', 0x244b50),
  tealLight: material('hybrid-teal-trim', 0x69aaa2),
  red: material('hybrid-barn-red', 0xb95342),
  redDark: material('hybrid-red-shadow', 0x803f39),
  slate: material('hybrid-slate-roof', 0x354c5b),
  slateLight: material('hybrid-slate-edge', 0x536e7a),
  green: material('hybrid-garden-green', 0x628251),
  leaf: material('hybrid-fresh-leaf', 0x83a25f),
  copper: material('hybrid-copper-pipe', 0xc77e45, .48),
  flower: material('hybrid-bluebell', 0x878acc),
};

export function hybridModel(name) {
  const group = new THREE.Group(); group.name = name;
  const structure = new THREE.Group(); group.add(structure);
  return { group, structure, kit: voxelKit(`${name}-architecture`), motions: [], lamps: [] };
}

export function finishHybrid(model, motionBounds) {
  const architecture = model.kit.finish().group;
  architecture.scale.setScalar(1 / TILE); model.group.add(architecture);
  // Voxel instances stay outside the ordinary-mesh material bake.
  bake(model.structure);
  model.group.scale.setScalar(TILE);
  const animate = (time, working = true, reduced = false, elapsed = time) => {
    for (const motion of model.motions) motion(time, working, reduced, elapsed);
  };
  animate(0);
  const bounds = new THREE.Box3().setFromObject(model.group);
  if (motionBounds) bounds.union(new THREE.Box3(
    new THREE.Vector3(...motionBounds[0]).multiplyScalar(TILE),
    new THREE.Vector3(...motionBounds[1]).multiplyScalar(TILE),
  ));
  bounds.expandByScalar(.04 * TILE);
  return { group: model.group, bounds, animate, setLighting: lighting => {
    for (const lamp of model.lamps) lamp.emissiveIntensity = lighting === 'evening' ? 1.2 : .12;
  } };
}

// Cell-based structural helpers: all walls have two-cell thickness and all
// openings are cut through them before their recessed glazing is installed.
export function hall(kit, { width = 22, depth = 16, height = 12, wall = p.cream, frame = h.timber, opening = 14 } = {}) {
  const left = -width / 2, back = -depth / 2, front = depth / 2 - 2;
  kit.add(p.base, left - 1, 0, back - 1, width + 2, 1, depth + 3);
  kit.add(p.stone, left, 1, back, width, 1, depth + 1);
  kit.add(wall, left, 2, back, width, height - 2, 2);
  for (const x of [left, -left - 2]) kit.add(wall, x, 2, back + 2, 2, height - 2, depth - 4);
  kit.add(wall, left, 2, front, width, height - 2, 2);
  if (opening) kit.cut(-opening / 2, 2, front, opening, height - 3, 2);
  for (const x of [left, -left - 2]) for (const z of [back, front]) kit.add(frame, x, 2, z, 2, height - 2, 2);
  if (opening) kit.add(p.wood, -opening / 2, height - 1, front, opening, 1, 2);
}

export function roof(kit, { left, width, back, depth, y, step = 2, color = h.slate, wall = p.cream, trim = p.chalk }) {
  for (let inset = 0, level = 0; width - inset * 2 > 0; inset += step, level++) {
    const span = width - inset * 2, edge = Math.min(step + 1, span);
    for (const z of [back + 1, back + depth - 2]) kit.add(wall, left + inset, y + level, z, span, 1, 1);
    if (span <= edge * 2) {
      kit.add(color, left + inset, y + level, back, span, 1, depth);
      for (const z of [back, back + depth - 1]) kit.add(trim, left + inset, y + level, z, span, 1, 1);
      break;
    }
    for (const x of [left + inset, left + width - inset - edge]) {
      kit.add(color, x, y + level, back, edge, 1, depth);
      for (const z of [back, back + depth - 1]) kit.add(trim, x, y + level, z, edge, 1, 1);
    }
  }
}

export function frontWindow(kit, x, y, z, width = 4, height = 4, accent = h.teal, glass = p.glass) {
  kit.cut(x, y, z, width, height, 2);
  kit.add(glass, x, y, z, width, height, 1);
  for (const yy of [y - 1, y + height]) kit.add(p.wood, x - 1, yy, z + 1, width + 2, 1, 2);
  for (const xx of [x - 1, x + width]) kit.add(accent, xx, y, z + 2, 1, height, 1);
  kit.add(p.chalk, x + Math.floor(width / 2), y, z + 1, 1, height, 1);
}

export function sideWindow(kit, x, y, z, width = 4, height = 3, accent = h.teal) {
  kit.cut(x, y, z, 2, height, width);
  const pane = x < 0 ? x + 1 : x, outer = x < 0 ? x - 1 : x + 2;
  kit.add(p.glass, pane, y, z, 1, height, width);
  for (const yy of [y - 1, y + height]) kit.add(p.wood, outer, yy, z - 1, 1, 1, width + 2);
  for (const zz of [z - 1, z + width]) kit.add(accent, outer, y, zz, 1, height, 1);
  kit.add(p.chalk, x < 0 ? x : x + 1, y, z + Math.floor(width / 2), 1, height, 1);
}

export function profile(parent, points, depth, mat, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape();
  points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py)); shape.closePath();
  return mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }), mat, x, y, z);
}

export function droplet(parent, x, y, z, size = 1, mat = p.gold) {
  const points = [[0, .62], [-.12, .37], [-.26, .13], [-.23, -.09], [-.11, -.22], [.11, -.22], [.23, -.09], [.26, .13], [.12, .37]];
  return profile(parent, points.map(([a, b]) => [a * size, b * size]), .07 * size, mat, x, y, z);
}

export function wrench(parent, x, y, z, size = 1, mat = p.chalk) {
  return profile(parent, [[-.07,-.43],[.08,-.43],[.08,.17],[.25,.29],[.25,.51],[.11,.38],[-.1,.38],[-.25,.51],[-.25,.29],[-.07,.17]].map(([a,b]) => [a*size,b*size]), .07 * size, mat, x, y, z);
}

export function badge(parent, x, y, z, icon = 'wheat', accent = h.teal, size = 1) {
  const group = new THREE.Group(); group.position.set(x, y, z); group.scale.setScalar(size); parent.add(group);
  profile(group, [[-.48,-.2],[-.48,.39],[-.32,.5],[.32,.5],[.48,.39],[.48,-.2],[0,-.48]], .1, accent);
  profile(group, [[-.37,-.14],[-.37,.32],[-.25,.4],[.25,.4],[.37,.32],[.37,-.14],[0,-.35]], .04, p.chalk, 0, 0, .11);
  if (icon === 'oil') droplet(group, 0, -.04, .17, .76);
  else if (icon === 'wrench') wrench(group, 0, 0, .17, .78, accent);
  else if (icon === 'milk') {
    cylinder(group, p.steel, 0, -.03, .25, .17, .42, .12, 10);
    cylinder(group, accent, 0, .2, .25, .13, .06, .13, 10);
    bar(group, accent, [-.12,.16,.25], [-.23,.04,.25], .025);
    bar(group, accent, [.12,.16,.25], [.23,.04,.25], .025);
  } else wheat(group, 0, -.28, .19, .98);
  return group;
}

export function wheel(parent, x, y, z, radius = .4, mat = p.gold) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  ring(pivot, mat, 0, 0, 0, radius, radius * .1);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    bar(pivot, mat, [0,0,0], [Math.cos(a)*radius,Math.sin(a)*radius,0], radius * .055);
  }
  disc(pivot, p.steel, 0, 0, .025, radius * .18, .12, 10);
  return bake(pivot);
}

export function pipe(parent, points, radius = .055, mat = h.copper) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 16, radius, 8, false), mat);
}

export function can(parent, x, y, z, scale = 1, mat = p.gold) {
  const group = new THREE.Group(); group.position.set(x, y, z); group.scale.setScalar(scale); parent.add(group);
  block(group, mat, 0, .28, 0, .4, .56, .3, .045);
  cylinder(group, p.dark, .115, .6, -.05, .055, .07, .055, 8);
  for (const xx of [-.13, .04]) bar(group, p.steel, [xx,.56,0], [xx,.7,0], .026);
  bar(group, p.steel, [-.13,.7,0], [.04,.7,0], .026);
  block(group, p.chalk, 0, .3, .16, .22, .25, .025, .008);
  droplet(group, 0, .265, .18, .27, h.copper);
  return group;
}

export function crate(parent, x, y, z, size = .6, fill = p.grain) {
  const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group);
  block(group, p.wood, 0, .06, 0, size, .12, size * .8);
  for (const zz of [-size*.4,size*.4]) block(group, p.wood, 0, size*.32, zz, size, size*.54, .07);
  for (const xx of [-size*.5,size*.5]) block(group, p.wood, xx, size*.32, 0, .07, size*.54, size*.8);
  block(group, fill, 0, size*.52, 0, size*.84, .06, size*.63);
  for (const xx of [-size*.31,size*.31]) block(group, h.timber, xx, size*.32, size*.4+.04, .06, size*.62, .045, .005);
  return group;
}

export function lantern(model, x, y, z) {
  const glow = material('hybrid-lantern-glow', 0xffdf9f, .55); glow.emissive.setHex(0xffbd62); glow.emissiveIntensity = .12;
  model.lamps.push(glow);
  block(model.structure, glow, x, y, z, .18, .26, .16);
  for (const yy of [y-.17,y+.17]) block(model.structure, h.tealDark, x, yy, z, .25, .07, .22);
  for (const xx of [x-.115,x+.115]) bar(model.structure, h.tealDark, [xx,y-.15,z+.09], [xx,y+.15,z+.09], .018);
  bar(model.structure, h.tealDark, [x,y+.22,z-.2], [x,y+.22,z], .03);
}

export function stream(model, from, to, { mat = p.grain, count = 9, radius = .034, speed = 1.8 } = {}) {
  const geometry = new THREE.IcosahedronGeometry(radius, 0), particles = [];
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  for (let i = 0; i < count; i++) particles.push(mesh(model.group, geometry, mat));
  model.motions.push((time, working, reduced) => {
    particles.forEach((part, i) => {
      part.visible = working && !reduced;
      const t = (time * speed + i / count) % 1;
      part.position.lerpVectors(a, b, t); part.position.x += Math.sin(i * 3.4) * radius;
      part.rotation.set(time + i, i * .7, time * 2);
    });
  });
  return particles;
}

export function flowers(parent, x, y, z, color = h.flower, scale = 1) {
  const pot = cylinder(parent, h.copper, x, y + .16 * scale, z, .17 * scale, .32 * scale, .23 * scale, 8);
  cylinder(parent, h.timber, x, y + .325 * scale, z, .2 * scale, .02, .2 * scale, 8);
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4, dx = Math.cos(angle) * .12 * scale, dz = Math.sin(angle) * .12 * scale;
    const top = y + (.52 + (i % 2) * .13) * scale;
    bar(parent, h.green, [x+dx,y+.3*scale,z+dz], [x+dx,top,z+dz], .018*scale);
    const leaf = mesh(parent, new THREE.IcosahedronGeometry(.09*scale, 0), h.leaf, x+dx+.045*scale, top-.1*scale, z+dz);
    leaf.scale.set(1.5,.45,.6); leaf.rotation.z = .4;
    mesh(parent, new THREE.IcosahedronGeometry(.075*scale, 0), color, x+dx, top, z+dz);
    cylinder(parent, p.gold, x+dx, top+.045*scale, z+dz, .024*scale, .035*scale, .024*scale, 6);
  }
  return pot;
}

export function smoke(model, x, y, z) {
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xeee6d5, transparent: true, opacity: .2, depthWrite: false, roughness: 1, flatShading: true });
    const part = mesh(model.group, new THREE.IcosahedronGeometry(.14, 1), mat); part.castShadow = false; puffs.push(part);
  }
  model.motions.push((time, working, reduced, elapsed) => puffs.forEach((part, i) => {
    const t = (elapsed * .19 + i / puffs.length) % 1;
    part.visible = !reduced;
    part.position.set(x + t * .26, y + t * .9, z - t * .12);
    part.scale.setScalar(.6 + t * 1.25); part.material.opacity = Math.sin(t * Math.PI) * .22;
  }));
}
