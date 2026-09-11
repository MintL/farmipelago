import { THREE, mats } from '../../core/shared.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Shared primitive forms and materials for the vehicle-inspired building studies.
export const material = (name, color, roughness = .76) => Object.assign(
  new THREE.MeshStandardMaterial({ color, roughness, flatShading: true }), { name },
);
export const palette = {
  blue: mats.tractor, darkBlue: mats.tractorDark, lightBlue: mats.tractorAccent,
  steel: mats.metal, cream: material('mill-warm-enamel', 0xf1e3bc),
  chalk: material('mill-flour-sacks', 0xfff2d5), gold: material('mill-harvest-gold', 0xe9ad35, .58),
  wood: material('mill-honey-oak', 0xb3804b), dark: material('mill-machine-dark', 0x273b42),
  stone: material('mill-grinding-stone', 0x9a9e95), base: material('mill-foundation', 0x65726d),
  glass: material('mill-blue-glazing', 0x92cdd9, .26), grain: material('mill-grain', 0xd89a2e),
};
const p = palette;
const up = new THREE.Vector3(0, 1, 0);

export function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, mat);
  part.position.set(x, y, z);
  part.castShadow = part.receiveShadow = true;
  parent.add(part);
  return part;
}

export function block(parent, mat, x, y, z, w, h, d, bevel = .025) {
  // A single bevel catches light like painted toy machinery, without a drawn grid.
  const b = Math.min(bevel, w / 4, h / 4, d / 4);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + b, -h / 2);
  shape.lineTo(w / 2 - b, -h / 2); shape.lineTo(w / 2, -h / 2 + b);
  shape.lineTo(w / 2, h / 2 - b); shape.lineTo(w / 2 - b, h / 2);
  shape.lineTo(-w / 2 + b, h / 2); shape.lineTo(-w / 2, h / 2 - b);
  shape.lineTo(-w / 2, -h / 2 + b); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - b * 2, bevelEnabled: b > 0,
    bevelSegments: 1, steps: 1, bevelSize: b, bevelThickness: b, curveSegments: 1 });
  geometry.translate(0, 0, -d / 2 + b);
  return mesh(parent, geometry, mat, x, y, z);
}

export function cylinder(parent, mat, x, y, z, radius, height, top = radius, sides = 12) {
  return mesh(parent, new THREE.CylinderGeometry(top, radius, height, sides), mat, x, y, z);
}

export function bar(parent, mat, from, to, radius = .055) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const part = cylinder(parent, mat, 0, 0, 0, radius, a.distanceTo(b), radius, 8);
  part.position.copy(a).add(b).multiplyScalar(.5);
  part.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
  return part;
}

export function disc(parent, mat, x, y, z, radius, depth, sides = 12) {
  const part = cylinder(parent, mat, x, y, z, radius, depth, radius, sides);
  part.rotation.x = Math.PI / 2;
  return part;
}

export function ring(parent, mat, x, y, z, radius, tube) {
  return mesh(parent, new THREE.TorusGeometry(radius, tube, 4, 16), mat, x, y, z);
}

export function wheat(parent, x, y, z, scale = 1) {
  bar(parent, p.gold, [x, y, z], [x, y + .58 * scale, z], .025 * scale);
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const grain = mesh(parent, new THREE.IcosahedronGeometry(.1 * scale, 0), p.gold,
      x + side * .09 * scale, y + (.12 + i * .15) * scale, z);
    grain.scale.set(.62, 1.1, .5); grain.rotation.z = -side * .65;
  }
}

// Merge each rigid assembly by material. Motion stays on a few explicit pivots.
export function bake(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), batches = new Map(), originals = new Set();
  group.traverse(part => {
    if (!part.isMesh) return;
    const geometry = part.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, part.matrixWorld));
    geometry.deleteAttribute('uv');
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    if (!batches.has(part.material)) batches.set(part.material, []);
    batches.get(part.material).push(flat); originals.add(part.geometry);
  });
  group.clear();
  for (const [mat, geometries] of batches) {
    mesh(group, mergeGeometries(geometries), mat);
    geometries.forEach(geometry => geometry.dispose());
  }
  originals.forEach(geometry => geometry.dispose());
  return group;
}

export function sack(open = false) {
  const group = new THREE.Group();
  const body = mesh(group, new THREE.SphereGeometry(.27, 8, 5), p.chalk, 0, .28, 0);
  body.scale.set(1, 1.25, .78);
  mesh(group, new THREE.CylinderGeometry(.15, .11, .14, 8, 1, open), p.chalk, 0, .57, 0);
  if (open) cylinder(group, p.wood, 0, .55, 0, .12, .015, .12, 8);
  cylinder(group, p.wood, 0, .54, 0, .115, .045, .115, 8);
  block(group, p.blue, 0, .29, .2, .22, .25, .02, .005);
  wheat(group, 0, .205, .223, .3);
  return bake(group);
}

