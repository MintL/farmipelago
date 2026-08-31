import { THREE, box } from './shared.js?v=crop-diversity-20260831-1';

const SILO_RADIUS = 1.05;
const SILO_HEIGHT = 3.7;

export function createBuildingManager({ getSiteAt, setCollider }) {
  let parent = null;
  let active = null;
  let selected = null;
  let nextId = 1;
  const buildings = new Map();

  const addSilo = () => {
    const id = `silo-${nextId++}`;
    const visual = createSilo();
    const building = { id, type: 'silo', visual, placed: false, site: null };
    visual.group.userData.building = building;
    parent?.add(visual.group);
    buildings.set(id, building);
    return building;
  };

  const placementFor = point => {
    const site = getSiteAt(point.x, point.z, SILO_RADIUS);
    if (site) return { ...site, valid: true };
    return { x: point.x, y: 0, z: point.z, valid: false };
  };

  const moveActive = point => {
    if (!active) return;
    const site = placementFor(point);
    active.site = site;
    active.visual.group.position.set(site.x, site.y, site.z);
    active.visual.setDragging(site.valid);
  };

  return {
    setParent(nextParent) {
      parent = nextParent;
      for (const building of buildings.values()) parent.add(building.visual.group);
    },
    setBuildMode(enabled) {
      if (!enabled) selected = null;
    },
    beginDrag(point, type, hitBuilding = null) {
      const building = hitBuilding || (type === 'silo' ? addSilo() : null);
      if (!building) return false;
      building.previousSite = building.placed ? { ...building.site } : null;
      if (building.placed) setCollider(building.id, null);
      active = building;
      selected = building;
      moveActive(point);
      return true;
    },
    moveDrag(point) {
      moveActive(point);
    },
    endDrag() {
      if (!active) return false;
      const building = active;
      active = null;
      if (!building.site?.valid) {
        if (building.previousSite) {
          building.site = building.previousSite;
          building.visual.group.position.set(building.site.x, building.site.y, building.site.z);
          building.visual.settle();
          setCollider(building.id, {
            shape: 'cylinder', x: building.site.x, y: building.site.y, z: building.site.z,
            radius: SILO_RADIUS, height: SILO_HEIGHT,
          });
        }
        else {
          parent?.remove(building.visual.group);
          buildings.delete(building.id);
          if (selected === building) selected = null;
        }
        return false;
      }
      building.placed = true;
      building.previousSite = null;
      building.visual.drop();
      setCollider(building.id, {
        shape: 'cylinder',
        x: building.site.x,
        y: building.site.y,
        z: building.site.z,
        radius: SILO_RADIUS,
        height: SILO_HEIGHT,
      });
      return true;
    },
    cancelDrag() {
      if (!active) return;
      const building = active;
      active = null;
      if (!building.placed) {
        parent?.remove(building.visual.group);
        buildings.delete(building.id);
        if (selected === building) selected = null;
      }
      else if (building.previousSite) {
        building.site = building.previousSite;
        building.visual.group.position.set(building.site.x, building.site.y, building.site.z);
        building.visual.settle();
        setCollider(building.id, {
          shape: 'cylinder', x: building.site.x, y: building.site.y, z: building.site.z,
          radius: SILO_RADIUS, height: SILO_HEIGHT,
        });
      }
    },
    selectFromObject(object) {
      let current = object;
      while (current) {
        if (current.userData.building) {
          selected = current.userData.building;
          return selected;
        }
        current = current.parent;
      }
      return null;
    },
    clear() {
      for (const building of buildings.values()) parent?.remove(building.visual.group);
      buildings.clear();
      active = null;
      selected = null;
    },
    animate(elapsed) {
      for (const building of buildings.values()) {
        building.visual.setSelected(building === selected);
        building.visual.animate(elapsed, building === active);
      }
    },
    isNearSilo(x, z, range = 2.45) {
      for (const building of buildings.values()) {
        if (building.type === 'silo' && building.placed && Math.hypot(x - building.site.x, z - building.site.z) <= range) return true;
      }
      return false;
    },
    isDragging: () => active !== null,
  };
}

export function createSilo() {
  const group = new THREE.Group();
  const spring = new THREE.Group();
  const shell = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d5e3d, roughness: .78, metalness: .12 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x573824, roughness: .84, metalness: .08 });
  const roofMetal = new THREE.MeshStandardMaterial({ color: 0x70452c, roughness: .72, metalness: .1 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x765442, roughness: .94 });
  const ladderMetal = new THREE.MeshStandardMaterial({ color: 0x67442e, roughness: .76, metalness: .12 });
  const warning = new THREE.MeshStandardMaterial({ color: 0xc18a4d, roughness: .76, metalness: .06 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xe7d56d, transparent: true, opacity: .88, depthWrite: false });
  const materials = [metal, darkMetal, roofMetal, concrete, ladderMetal, warning];
  let dragging = false;
  let valid = true;
  let droppedAt = -10;

  group.name = 'silo';
  group.add(spring);
  spring.add(shell);

  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, .16, 16), concrete);
  foundation.position.y = .08;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  shell.add(foundation);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(.96, .98, 2.7, 16), metal);
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  shell.add(body);

  for (const y of [.58, 2.22]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.01, .05, 6, 20), darkMetal);
    band.rotation.x = Math.PI * .5;
    band.position.y = y;
    band.castShadow = true;
    shell.add(band);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.04, .78, 16), roofMetal);
  roof.position.y = 3.22;
  roof.castShadow = true;
  roof.receiveShadow = true;
  shell.add(roof);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.16, .19, .24, 10), darkMetal);
  cap.position.y = 3.71;
  cap.castShadow = true;
  shell.add(cap);
  const ladder = new THREE.Group();
  ladder.position.set(0, 0, 1.025);
  shell.add(ladder);
  for (const side of [-1, 1]) {
    const rail = box(.045, 2.28, .045, ladderMetal);
    rail.position.set(side * .2, 1.47, 0);
    ladder.add(rail);
  }
  for (let index = 0; index < 7; index++) {
    const rung = box(.44, .04, .05, ladderMetal);
    rung.position.set(0, .58 + index * .29, 0);
    ladder.add(rung);
  }

  const hatch = new THREE.Mesh(new THREE.BoxGeometry(.42, .56, .04), warning);
  hatch.position.set(0, .7, 1.005);
  hatch.castShadow = true;
  shell.add(hatch);

  const ring = new THREE.Mesh(new THREE.RingGeometry(1.27, 1.35, 32), ringMaterial);
  ring.rotation.x = -Math.PI * .5;
  ring.position.y = .018;
  ring.visible = false;
  group.add(ring);

  const setAppearance = () => {
    const tint = valid ? 0x9dd86b : 0xe37167;
    ringMaterial.color.setHex(tint);
    ringMaterial.opacity = dragging ? .92 : .76;
    for (const material of materials) {
      material.transparent = dragging;
      material.opacity = dragging ? .68 : 1;
      material.emissive?.setHex(dragging ? tint : 0x000000);
      if (material.emissive) material.emissiveIntensity = dragging ? .16 : 0;
    }
  };

  return {
    group,
    setDragging(nextValid) {
      dragging = true;
      valid = nextValid;
      ring.visible = true;
      setAppearance();
    },
    setSelected(nextSelected) {
      if (!dragging) ring.visible = nextSelected;
    },
    drop() {
      dragging = false;
      valid = true;
      droppedAt = null;
      ring.visible = true;
      setAppearance();
      squeak();
    },
    settle() {
      dragging = false;
      valid = true;
      ring.visible = true;
      setAppearance();
    },
    animate(elapsed, active) {
      if (dragging || active) {
        const wobble = Math.sin(elapsed * 14) * .035;
        spring.position.y = .16 + Math.sin(elapsed * 18) * .025;
        spring.rotation.z = wobble;
        spring.scale.set(1.055 - wobble * .15, .9 + wobble, 1.055 - wobble * .15);
        return;
      }
      if (droppedAt === null) droppedAt = elapsed;
      const age = Math.max(0, elapsed - droppedAt);
      const bounce = age < .78 ? Math.sin(age * 20) * Math.exp(-age * 5.2) : 0;
      spring.position.y = 0;
      spring.rotation.z = 0;
      spring.scale.set(1 - bounce * .11, 1 + bounce * .24, 1 - bounce * .11);
    },
  };
}

function squeak() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(720, now);
  oscillator.frequency.exponentialRampToValueAtTime(390, now + .14);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.07, now + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + .18);
  oscillator.addEventListener('ended', () => context.close());
}
