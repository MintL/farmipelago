import { createPlaceableBuilding } from '../../world/buildings/game.js';
import { THREE, TILE, box, mats } from '../../core/shared.js';
import { barnPenConnectorSegments, cornerToWorld } from './pen-geometry.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cowWhite = new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: .9 });
const cowBrown = new THREE.MeshStandardMaterial({ color: 0x684638, roughness: .92 });
const cowMuzzle = new THREE.MeshStandardMaterial({ color: 0xc9937a, roughness: .92 });
const cowDark = new THREE.MeshStandardMaterial({ color: 0x332a26, roughness: .94 });
const fenceWood = new THREE.MeshStandardMaterial({ color: 0x8b603d, roughness: .96 });
const fenceDark = new THREE.MeshStandardMaterial({ color: 0x5d3d2b, roughness: .98 });
const validMaterial = new THREE.MeshBasicMaterial({ color: 0x91d55e, transparent: true, opacity: .72, depthWrite: false });
const invalidMaterial = new THREE.MeshBasicMaterial({ color: 0xe36d63, transparent: true, opacity: .76, depthWrite: false });
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createCattleBarnVisual() {
  return createPlaceableBuilding('cattle-barn');
}

export function createPenVisual(geometry, levelY, building, editing = false) {
  const group = new THREE.Group();
  group.name = `${building.id}-pen`;
  const parts = [];
  const fenceSegmentGroup = (a, b) => {
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    const segmentGroup = new THREE.Group();
    segmentGroup.position.set((a.x + b.x) * .5, levelY, (a.z + b.z) * .5);
    if (!horizontal) segmentGroup.rotation.y = Math.PI * .5;
    const posts = Math.max(1, Math.round(length / TILE));
    for (let postIndex = 0; postIndex <= posts; postIndex++) {
      const post = box(.12, .82, .12, fenceDark);
      post.position.set(-length * .5 + postIndex / posts * length, .41, 0);
      segmentGroup.add(post);
    }
    for (const y of [.3, .62]) {
      const rail = box(length, .1, .1, fenceWood); rail.position.y = y; segmentGroup.add(rail);
    }
    return { segmentGroup, horizontal, length };
  };
  geometry.segments.forEach((segment, index) => {
    const a = cornerToWorld(segment.a), b = cornerToWorld(segment.b);
    const { segmentGroup, length } = fenceSegmentGroup(a, b);
    segmentGroup.userData.building = building;
    segmentGroup.userData.penPart = { type: 'segment', index };
    const hit = box(length + .28, 1.05, .62, validMaterial, false, false);
    hit.material = hit.material.clone(); hit.material.opacity = 0; hit.visible = editing;
    hit.position.y = .48;
    hit.userData.building = building;
    hit.userData.penPart = { type: 'segment', index };
    segmentGroup.add(hit);
    group.add(segmentGroup);
    parts.push(hit);
  });
  for (const connector of barnPenConnectorSegments(building.site)) {
    group.add(fenceSegmentGroup(connector.a, connector.b).segmentGroup);
  }
  const handleHits = [];
  const handles = geometry.vertices.map((vertex, index) => {
    const world = cornerToWorld(vertex);
    const fixed = index === 0 || index === geometry.vertices.length - 1;
    const handle = new THREE.Mesh(new THREE.SphereGeometry(fixed ? .2 : .27, 12, 9), (fixed ? fenceDark : validMaterial).clone());
    handle.position.set(world.x, levelY + .92, world.z);
    handle.visible = editing;
    handle.userData.building = building;
    handle.userData.penPart = { type: 'corner', index };
    group.add(handle);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.44, 10, 8), validMaterial.clone());
    hit.material.opacity = 0;
    hit.visible = editing;
    hit.position.copy(handle.position);
    hit.userData.building = building;
    hit.userData.penPart = { type: 'corner', index };
    group.add(hit);
    handleHits.push(hit);
    return handle;
  });
  return { group, parts, handles, setEditing(enabled) { [...parts, ...handles, ...handleHits].forEach(part => { part.visible = enabled; }); } };
}

export function createPenGateVisual(site) {
  const group = new THREE.Group();
  group.name = 'barn-pen-gate-cue';
  group.position.set(site.x, site.y, site.z);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xb9f36d, transparent: true, opacity: .38, depthWrite: false });
  const doorMaterial = new THREE.MeshBasicMaterial({ color: 0xd9ff83, transparent: true, opacity: .9, depthWrite: false });
  const paneMaterial = doorMaterial.clone();
  paneMaterial.opacity = .2;
  const gx = Math.round(site.x / TILE), gz = Math.round(site.z / TILE) + 2;
  for (const dx of [-1, 0, 1]) {
    const tile = box(TILE * .88, .025, TILE * .88, groundMaterial, false, false);
    tile.position.set((gx + dx) * TILE - site.x, .035, gz * TILE - site.z);
    group.add(tile);
  }
  const path = box(.72, .03, 1.02, groundMaterial, false, false);
  path.position.set(0, .045, 1.48);
  group.add(path);
  const door = new THREE.Group();
  door.position.set(0, 0, 1.025);
  const pane = box(1.05, 1.22, .025, paneMaterial, false, false);
  pane.position.y = .66;
  door.add(pane);
  for (const x of [-.58, .58]) {
    const side = box(.09, 1.38, .055, doorMaterial, false, false);
    side.position.set(x, .69, .015);
    door.add(side);
  }
  const top = box(1.25, .09, .055, doorMaterial, false, false);
  top.position.set(0, 1.38, .015);
  door.add(top);
  const beacon = new THREE.Mesh(new THREE.TorusGeometry(.3, .075, 8, 20), doorMaterial);
  beacon.rotation.x = Math.PI * .5;
  beacon.position.set(0, 1.72, .16);
  door.add(beacon);
  group.add(door);
  return {
    group,
    animate(elapsed) {
      const pulse = Math.sin(elapsed * 4) * .5 + .5;
      groundMaterial.opacity = .32 + pulse * .28;
      doorMaterial.opacity = .7 + pulse * .3;
      paneMaterial.opacity = .14 + pulse * .2;
      door.scale.setScalar(1 + pulse * .035);
    },
  };
}

export function createPenLassoPreview(samples, result, levelY) {
  const group = new THREE.Group();
  group.name = 'pen-lasso-preview';
  const addTiles = (tiles, material) => {
    for (const entry of tiles || []) {
      const gx = entry.gx ?? entry.tile?.gx;
      const gz = entry.gz ?? entry.tile?.gz;
      if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
      const tile = box(TILE * .86, .02, TILE * .86, material, false, false);
      tile.position.set(gx * TILE, finite(entry.topY ?? entry.tile?.topY, levelY) + .045, gz * TILE);
      group.add(tile);
    }
  };
  const selectedMaterial = validMaterial.clone(); selectedMaterial.opacity = .28;
  const trimmedMaterial = invalidMaterial.clone(); trimmedMaterial.color.setHex(0xd89343); trimmedMaterial.opacity = .3;
  addTiles(result?.selectedTiles, selectedMaterial);
  addTiles(result?.trimmedTiles, trimmedMaterial);
  if (samples.length > 1) {
    const points = samples.map(sample => new THREE.Vector3(sample.x, levelY + .12, sample.z));
    points.push(points[0].clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: result?.valid ? 0x7eb650 : 0xd45d52, transparent: true, opacity: .9 }),
    );
    group.add(line);
  }
  if (result?.valid) group.add(createPenPreview(result.vertices, levelY, true));
  return group;
}

export function createPenPreview(vertices, levelY, valid = false) {
  const group = new THREE.Group();
  const material = (valid ? validMaterial : invalidMaterial).clone();
  for (let index = 0; index < vertices.length - 1; index++) {
    const a = cornerToWorld(vertices[index]), b = cornerToWorld(vertices[index + 1]);
    const horizontal = Math.abs(b.x - a.x) > .01;
    const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    if (!length) continue;
    const rail = box(horizontal ? length : .13, .13, horizontal ? .13 : length, material, false, false);
    rail.position.set((a.x + b.x) * .5, levelY + .48, (a.z + b.z) * .5);
    group.add(rail);
  }
  return group;
}

export function createCowVisual(stage = 'adult', spawn = false) {
  const group = new THREE.Group();
  // Adjacent torso sections replace the overlapping patch shell. All three
  // move together, so breathing cannot expose coincident colored surfaces.
  const body = new THREE.Group(); body.position.y = .7; group.add(body);
  for (const [width, x, material] of [[.115, -.4525, cowWhite], [.35, -.22, cowBrown], [.555, .2325, cowWhite]]) {
    const section = box(width, .58, .58, material);
    section.position.x = x;
    body.add(section);
  }
  const head = box(.48, .46, .48, cowBrown); head.position.set(0, .77, -.47); group.add(head);
  const muzzle = box(.36, .22, .25, cowMuzzle); muzzle.position.set(0, .65, -.78); group.add(muzzle);
  const legs = [];
  for (const [x, z, phase] of [[-.34, -.2, 0], [.34, -.2, Math.PI], [-.34, .2, Math.PI], [.34, .2, 0]]) {
    const leg = box(.12, .48, .12, cowDark); leg.position.set(x, .28, z); leg.userData.phase = phase; group.add(leg); legs.push(leg);
  }
  for (const x of [-.28, .28]) {
    const ear = box(.22, .09, .13, cowBrown); ear.position.set(x, 1.0, -.48); group.add(ear);
  }
  const tail = box(.08, .52, .08, cowBrown); tail.position.set(0, .61, .43); tail.rotation.x = -.25; group.add(tail);
  // Put the model origin at the soles so landing squash stays on the ground.
  const model = new THREE.Group();
  for (const part of [...group.children]) model.add(part);
  model.position.y = -.04;
  group.add(model);
  group.visible = false;
  const dropHeight = TILE;
  const gravity = 48; // Match the world's downward acceleration.
  const fallSeconds = Math.sqrt(2 * dropHeight / gravity);
  const squashSeconds = .09, recoverSeconds = .28;
  const spawnSeconds = fallSeconds + squashSeconds + recoverSeconds;
  let spawnAge = spawn && !reducedMotion ? 0 : spawnSeconds;
  const setStage = nextStage => {
    group.userData.stage = nextStage;
    group.scale.setScalar(nextStage === 'calf' ? .62 : 1);
  };
  setStage(stage);
  return {
    group,
    setStage,
    get spawning() { return spawnAge < spawnSeconds; },
    animate(elapsed, moving, dt = 0) {
      group.visible = true;
      spawnAge = Math.min(spawnSeconds, spawnAge + dt);
      let height = 0, squash = 0;
      if (spawnAge < fallSeconds) {
        height = Math.max(0, dropHeight - .5 * gravity * spawnAge * spawnAge);
      } else if (spawnAge < fallSeconds + squashSeconds) {
        squash = Math.sin((spawnAge - fallSeconds) / squashSeconds * Math.PI * .5);
      } else if (spawnAge < spawnSeconds) {
        const recovery = (spawnAge - fallSeconds - squashSeconds) / recoverSeconds;
        squash = (1 - recovery) ** 2;
      }
      const size = group.userData.stage === 'calf' ? .62 : 1;
      const scaleY = 1 - squash * .42;
      const scaleXZ = 1 / Math.sqrt(scaleY);
      group.scale.set(size * scaleXZ, size * scaleY, size * scaleXZ);
      group.position.y += height;
      moving = moving && spawnAge >= spawnSeconds;
      body.position.y = .7 + Math.sin(elapsed * (moving ? 7 : 2.1) + group.id) * (moving ? .025 : .012);
      legs.forEach(leg => { leg.rotation.x = moving ? Math.sin(elapsed * 7 + leg.userData.phase) * .28 : 0; });
      head.rotation.x = moving ? 0 : Math.sin(elapsed * 1.4 + group.id) * .1;
      tail.rotation.z = Math.sin(elapsed * 2.3 + group.id) * .18;
    },
  };
}
