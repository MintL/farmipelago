import { THREE, TILE, box, mats } from '../../core/shared.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cowWhite = new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: .9 });
const cowBrown = new THREE.MeshStandardMaterial({ color: 0x684638, roughness: .92 });
const cowMuzzle = new THREE.MeshStandardMaterial({ color: 0xc9937a, roughness: .92 });
const cowDark = new THREE.MeshStandardMaterial({ color: 0x332a26, roughness: .94 });
const barnRed = new THREE.MeshStandardMaterial({ color: 0x9d493b, roughness: .92 });
const barnDark = new THREE.MeshStandardMaterial({ color: 0x4a302a, roughness: .94 });
const barnCream = new THREE.MeshStandardMaterial({ color: 0xe2d1aa, roughness: .9 });
const fenceWood = new THREE.MeshStandardMaterial({ color: 0x8b603d, roughness: .96 });
const fenceDark = new THREE.MeshStandardMaterial({ color: 0x5d3d2b, roughness: .98 });
const validMaterial = new THREE.MeshBasicMaterial({ color: 0x91d55e, transparent: true, opacity: .72, depthWrite: false });
const invalidMaterial = new THREE.MeshBasicMaterial({ color: 0xe36d63, transparent: true, opacity: .76, depthWrite: false });
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createCattleBarnVisual() {
  const group = new THREE.Group();
  const spring = new THREE.Group();
  const shell = new THREE.Group();
  const redMaterial = barnRed.clone();
  const darkMaterial = barnDark.clone();
  const creamMaterial = barnCream.clone();
  group.name = 'cattle-barn';
  group.add(spring);
  spring.add(shell);
  const foundation = box(2.65, .16, 2.05, darkMaterial); foundation.position.y = .08; shell.add(foundation);
  const body = box(2.45, 1.65, 1.85, redMaterial); body.position.y = .9; shell.add(body);
  const roofLeft = box(1.68, .16, 2.22, creamMaterial); roofLeft.position.set(-.62, 1.94, 0); roofLeft.rotation.z = -.48; shell.add(roofLeft);
  const roofRight = roofLeft.clone(); roofRight.position.x = .62; roofRight.rotation.z = .48; shell.add(roofRight);
  const doorway = box(1.02, 1.18, .08, darkMaterial); doorway.position.set(0, .65, 0.965); shell.add(doorway);
  const trim = box(1.24, .12, .12, creamMaterial); trim.position.set(0, 1.3, 1.0); shell.add(trim);
  const hay = box(.58, .42, .38, mats.bale); hay.position.set(-.82, .3, 1.12); shell.add(hay);
  const milkCan = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .52, 10), mats.metal);
  milkCan.position.set(.86, .3, 1.08); milkCan.castShadow = true; shell.add(milkCan);
  const ringMaterial = validMaterial.clone();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.75, 32), ringMaterial);
  ring.rotation.x = -Math.PI * .5; ring.position.y = .02; ring.visible = false; group.add(ring);
  let dragging = false, valid = true, droppedAt = null;
  let transfer = null, transferPulse = 0;
  const updateAppearance = () => {
    ringMaterial.color.copy((valid ? validMaterial : invalidMaterial).color);
    for (const material of [redMaterial, darkMaterial, creamMaterial]) {
      material.transparent = dragging;
      material.opacity = dragging ? .7 : 1;
    }
  };
  return {
    group,
    setDragging(nextValid) { dragging = true; valid = nextValid; ring.visible = true; updateAppearance(); },
    setSelected(nextSelected) { if (!dragging) ring.visible = nextSelected; },
    setPenComplete() {},
    drop() { dragging = false; valid = true; droppedAt = null; updateAppearance(); },
    settle() { dragging = false; valid = true; updateAppearance(); },
    setTransferState({ active, direction, elapsed = 0 }) {
      if (!active) {
        transfer = null;
        transferPulse = Math.max(transferPulse, reducedMotion ? .28 : 1);
        return;
      }
      transfer = { direction, started: elapsed };
    },
    pulseTransfer(direction) {
      if (direction === 'input') transferPulse = Math.max(transferPulse, reducedMotion ? .24 : .65);
    },
    animate(elapsed, active, dt = 0) {
      if (dragging || active) {
        spring.position.y = .12 + Math.sin(elapsed * 16) * .025;
        spring.rotation.z = Math.sin(elapsed * 13) * .025;
        return;
      }
      if (droppedAt === null) droppedAt = elapsed;
      const age = elapsed - droppedAt;
      transferPulse *= Math.exp(-(reducedMotion ? 11 : 8) * dt);
      const transferAge = transfer ? Math.max(0, elapsed - transfer.started) : 0;
      const transferWobble = !reducedMotion && transfer ? Math.sin(transferAge * 15) * .012 : 0;
      const bounce = (age < .7 ? Math.sin(age * 19) * Math.exp(-age * 5) : 0)
        + transferPulse * (reducedMotion ? .07 : .24);
      spring.position.y = 0; spring.rotation.z = transferWobble;
      spring.scale.set(1 - bounce * .08, 1 + bounce * .18, 1 - bounce * .08);
      const milkJiggle = !reducedMotion && transfer ? Math.sin(transferAge * 24) * .08 : 0;
      milkCan.position.y = .3 + Math.abs(milkJiggle) * .12;
      milkCan.rotation.z = milkJiggle;
    },
  };
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

export function createCowVisual(stage = 'adult') {
  const group = new THREE.Group();
  const body = box(1.02, .58, .58, cowWhite); body.position.y = .7; group.add(body);
  const patch = box(.35, .6, .6, cowBrown); patch.position.set(-.22, .71, 0); group.add(patch);
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
  const setStage = nextStage => {
    group.userData.stage = nextStage;
    group.scale.setScalar(nextStage === 'calf' ? .62 : 1);
  };
  setStage(stage);
  return {
    group,
    setStage,
    animate(elapsed, moving) {
      body.position.y = .7 + Math.sin(elapsed * (moving ? 7 : 2.1) + group.id) * (moving ? .025 : .012);
      legs.forEach(leg => { leg.rotation.x = moving ? Math.sin(elapsed * 7 + leg.userData.phase) * .28 : 0; });
      head.rotation.x = moving ? 0 : Math.sin(elapsed * 1.4 + group.id) * .1;
      tail.rotation.z = Math.sin(elapsed * 2.3 + group.id) * .18;
    },
  };
}

