import { THREE, TILE, box, gridKey } from './shared.js';
import { cropIds } from './crops.js';
import {
  BARN_HAY_CAPACITY, BARN_MILK_CAPACITY, HAY_BALE_LITRES, STARTER_COW_COUNT,
  barnPenAnchors, barnPenConnectorSegments, computePenGeometry, cornerToWorld, createCattleBarnVisual,
  createCowVisual, createPenGateVisual, createPenLassoPreview, createPenPreview,
  createPenVisual, normalizeCattleBarnState, penGeometryFromLasso,
  reconcileCattleBarnAnimals, removeCollinearVertices, snapPenPoint, updateCattleBarn,
} from './livestock.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SILO_RADIUS = 1.05;
const SILO_HEIGHT = 3.7;
const CATTLE_BARN_RADIUS = 1.45;
const CATTLE_BARN_HEIGHT = 2.25;
const BUILDING_HOLD_MS = 280;
const CONSTRUCTION_PHASES = new Set(['draft', 'pen-draft', 'complete']);

const isDraft = building => building?.constructionPhase === 'draft';
const isPenDraft = building => building?.constructionPhase === 'pen-draft';
const isComplete = building => building?.constructionPhase === 'complete';

function createConstructionOutline(root) {
  const material = new THREE.LineBasicMaterial({
    color: 0xd9ff78,
    transparent: true,
    opacity: .82,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = [];
  root.traverse(part => {
    if (!part.isMesh || !part.castShadow || !part.geometry) return;
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(part.geometry, 24), material);
    line.name = 'construction-outline';
    line.scale.setScalar(1.012);
    line.renderOrder = 8;
    part.add(line);
    lines.push(line);
  });
  return {
    animate(elapsed) { material.opacity = .58 + (Math.sin(elapsed * 4.5) * .5 + .5) * .36; },
    dispose() {
      for (const line of lines) {
        line.removeFromParent();
        line.geometry.dispose();
      }
      material.dispose();
      lines.length = 0;
    },
  };
}

function normalizedConstructionPhase(saved) {
  if (saved?.type === 'silo' && ['draft', 'complete'].includes(saved?.constructionPhase)) return saved.constructionPhase;
  if (saved?.type === 'cattle-barn' && CONSTRUCTION_PHASES.has(saved?.constructionPhase)) return saved.constructionPhase;
  if (saved?.type === 'silo' || saved?.pen?.vertices?.length >= 4 || saved?.animals?.length) return 'complete';
  return 'draft';
}

function normalizedContents(contents) {
  return Object.fromEntries(cropIds.flatMap(cropId => {
    const amount = Math.max(0, Math.floor(Number(contents?.[cropId]) || 0));
    return amount ? [[cropId, amount]] : [];
  }));
}

export function createBuildingManager({
  getSiteAt, getTerrain, setCollider, registerOccluder = () => {}, unregisterOccluder = () => {},
  onChange = () => {}, onHint = () => {},
}) {
  let parent = null;
  let operation = null;
  let selected = null;
  let repaintRequested = null;
  let buildMode = false;
  let nextCowId = 1;
  const nextIds = { silo: 1, 'cattle-barn': 1 };
  const buildings = new Map();

  const definitions = {
    silo: { radius: SILO_RADIUS, footprintSpan: 1, height: SILO_HEIGHT, popupHeight: 4.05, createVisual: createSilo },
    'cattle-barn': { radius: CATTLE_BARN_RADIUS, footprintSpan: 1, height: CATTLE_BARN_HEIGHT, popupHeight: 3.15, createVisual: createCattleBarnVisual },
  };

  const addBuilding = (type, savedId) => {
    const definition = definitions[type];
    if (!definition) return null;
    const id = typeof savedId === 'string' && !buildings.has(savedId) ? savedId : `${type}-${nextIds[type]++}`;
    const savedNumber = Number(id.match(new RegExp(`^${type}-(\\d+)$`))?.[1]);
    if (Number.isInteger(savedNumber)) nextIds[type] = Math.max(nextIds[type], savedNumber + 1);
    const visual = definition.createVisual();
    const building = {
      id, type, visual, placed: false, site: null, constructionPhase: 'draft',
      constructionOutline: createConstructionOutline(visual.group),
    };
    if (type === 'silo') building.contents = {};
    else Object.assign(building, normalizeCattleBarnState(null));
    visual.group.userData.building = building;
    parent?.add(visual.group);
    buildings.set(id, building);
    return building;
  };

  const placementFor = (point, type) => {
    const site = getSiteAt(point.x, point.z, definitions[type].radius);
    if (site) return { ...site, valid: true };
    return { x: point.x, y: 0, z: point.z, valid: false };
  };

  const automaticSiteFor = (type, preferredPoint = {}) => {
    const terrain = getTerrain();
    if (!terrain?.size || !definitions[type]) return null;
    const preferredX = Number.isFinite(preferredPoint.x) ? preferredPoint.x : 0;
    const preferredZ = Number.isFinite(preferredPoint.z) ? preferredPoint.z : 0;
    const excluded = occupiedTileKeys(null);
    const clearGrass = (gx, gz, levelY) => {
      const tile = terrain.get(gridKey(gx, gz));
      return tile && !tile.water && !tile.reserved && !tile.ploughed && !tile.crop && !tile.hasTree
        && Math.abs(tile.topY - levelY) <= .01 && !excluded.has(gridKey(gx, gz));
    };
    const candidates = [...terrain.values()].sort((a, b) =>
      Math.hypot(a.x - preferredX, a.z - preferredZ) - Math.hypot(b.x - preferredX, b.z - preferredZ)
    );
    for (const tile of candidates) {
      const site = placementFor(tile, type);
      if (!site.valid || tile.ploughed || tile.crop) continue;
      if (type === 'cattle-barn') {
        const gx = Math.round(site.x / TILE), gz = Math.round(site.z / TILE);
        if (![-1, 0, 1].every(dx => clearGrass(gx + dx, gz + 2, site.y))) continue;
        let pastureTiles = 0;
        for (let dx = -4; dx <= 4; dx++) {
          for (let dz = 2; dz <= 6; dz++) if (clearGrass(gx + dx, gz + dz, site.y)) pastureTiles++;
        }
        if (pastureTiles < STARTER_COW_COUNT * 4) continue;
      }
      return site;
    }
    return null;
  };

  const colliderFor = building => building.type === 'silo'
    ? { shape: 'cylinder', x: building.site.x, y: building.site.y, z: building.site.z, radius: SILO_RADIUS, height: SILO_HEIGHT }
    : { shape: 'box', x: building.site.x, y: building.site.y, z: building.site.z, width: 2.65, height: CATTLE_BARN_HEIGHT, depth: 3, radius: CATTLE_BARN_RADIUS };

  const occupiedTileKeys = except => {
    const keys = new Set();
    for (const building of buildings.values()) {
      if (!building.placed || building === except) continue;
      const gx = Math.round(building.site.x / TILE), gz = Math.round(building.site.z / TILE);
      const span = definitions[building.type].footprintSpan;
      for (let dx = -span; dx <= span; dx++) for (let dz = -span; dz <= span; dz++) keys.add(gridKey(gx + dx, gz + dz));
      if (building.type === 'cattle-barn') for (const key of building.derived?.tileSet || []) keys.add(key);
    }
    return keys;
  };

  const penGeometry = (building, vertices, minimumCapacity = STARTER_COW_COUNT) => {
    const anchors = barnPenAnchors(building.site);
    if (!sameCorner(vertices?.[0], anchors[0]) || !sameCorner(vertices?.at(-1), anchors[1])) {
      return { valid: false, reason: 'Pen must connect both barn anchors', vertices: vertices || [], tiles: [], tileSet: new Set(), capacity: 0, segments: [] };
    }
    return computePenGeometry(vertices, getTerrain(), building.site, { occupiedTileKeys: occupiedTileKeys(building), minimumCapacity });
  };

  const clearPenVisual = building => {
    if (building.penVisual) parent?.remove(building.penVisual.group);
    building.penVisual = null;
    for (const id of building.fenceColliderIds || []) setCollider(id, null);
    building.fenceColliderIds = [];
  };

  const ensureGateVisual = building => {
    if (building.gateVisual) return building.gateVisual;
    building.gateVisual = createPenGateVisual(building.site);
    parent?.add(building.gateVisual.group);
    return building.gateVisual;
  };

  const clearGateVisual = building => {
    if (building.gateVisual) parent?.remove(building.gateVisual.group);
    building.gateVisual = null;
  };

  const clearConstructionOutline = building => {
    building.constructionOutline?.dispose();
    building.constructionOutline = null;
  };

  const registerBuildingOccluder = building => {
    if (!building.placed || !isComplete(building) || building.occluderRegistered) return;
    building.occluderRegistered = registerOccluder(building.visual.group) !== false;
  };

  const unregisterBuildingOccluder = building => {
    if (!building.occluderRegistered) return;
    unregisterOccluder(building.visual.group);
    building.occluderRegistered = false;
  };

  const removeBuilding = building => {
    unregisterBuildingOccluder(building);
    if (building.placed) clearBuildingColliders(building);
    clearPenVisual(building);
    clearGateVisual(building);
    clearConstructionOutline(building);
    for (const animal of building.animals || []) animal.visual?.group.removeFromParent();
    parent?.remove(building.visual.group);
    buildings.delete(building.id);
  };

  const rebuildPen = (building, geometry) => {
    clearPenVisual(building);
    clearGateVisual(building);
    building.derived = geometry;
    if (!geometry?.valid) return;
    building.visual.setPenComplete?.(true);
    building.penVisual = createPenVisual(geometry, building.site.y, building, true);
    parent?.add(building.penVisual.group);
    const colliderSegments = [
      ...geometry.segments.map(segment => ({ a: cornerToWorld(segment.a), b: cornerToWorld(segment.b) })),
      ...barnPenConnectorSegments(building.site),
    ];
    building.fenceColliderIds = colliderSegments.map((segment, index) => {
      const { a, b } = segment;
      const horizontal = Math.abs(b.x - a.x) > .01;
      const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
      const id = `${building.id}:fence:${index}`;
      setCollider(id, {
        shape: 'box', x: (a.x + b.x) * .5, y: building.site.y, z: (a.z + b.z) * .5,
        width: horizontal ? length : .16, height: .82, depth: horizontal ? .16 : length,
        radius: length * .5, yaw: 0,
      });
      return id;
    });
    reconcileCattleBarnAnimals(building, { parent, terrain: getTerrain() });
  };

  const grantStarterCows = building => {
    if (building.starterCowsGranted || !building.derived?.valid) return;
    building.starterCowsGranted = true;
    building.nextCowId = Math.max(building.nextCowId, nextCowId);
    for (let index = 0; index < STARTER_COW_COUNT; index++) {
      const tile = building.derived.tiles[index % building.derived.tiles.length];
      building.animals.push({
        id: `cow-${building.nextCowId++}`, stage: 'adult', age: 0, tileKey: gridKey(tile.gx, tile.gz),
        targetTileKey: null, moveProgress: 0, heading: index * Math.PI, idleSeconds: .8 + index,
        jitterX: index ? .08 : -.08, jitterZ: index ? -.06 : .06,
        targetJitterX: index ? .08 : -.08, targetJitterZ: index ? -.06 : .06, visual: createCowVisual('adult'),
      });
      parent?.add(building.animals.at(-1).visual.group);
    }
    nextCowId = Math.max(nextCowId, building.nextCowId);
    reconcileCattleBarnAnimals(building, { parent, terrain: getTerrain() });
  };

  const clearBuildingColliders = building => {
    setCollider(building.id, null);
  };

  const removeOperationPreview = preview => {
    if (!preview) return;
    parent?.remove(preview);
    preview.traverse?.(part => {
      part.geometry?.dispose?.();
      if (Array.isArray(part.material)) part.material.forEach(material => material.dispose?.());
      else part.material?.dispose?.();
    });
  };

  const restoreBuildingMove = current => {
    const building = current.building;
    building.site = current.previousSite;
    building.visual.group.position.set(building.site.x, building.site.y, building.site.z);
    building.visual.settle();
    setCollider(building.id, colliderFor(building));
  };

  const updateBuildingMove = (current, point) => {
    const building = current.building;
    const placementPoint = { x: point.x - current.grabOffset.x, z: point.z - current.grabOffset.z };
    const site = placementFor(placementPoint, building.type);
    building.site = site;
    building.visual.group.position.set(site.x, site.y, site.z);
    building.visual.setDragging(site.valid);
    Object.assign(current, { site: { ...site }, valid: site.valid });
    onHint(site.valid ? 'RELEASE TO PLACE · TAP TO SELECT' : 'INVALID BUILDING LOCATION');
  };

  const promoteBuildingMove = current => {
    if (current.kind !== 'hold-building') return;
    const building = current.building;
    if (!isDraft(building)) {
      current.kind = 'select-building';
      onHint('');
      return;
    }
    current.kind = 'move-building';
    current.previousSite = { ...building.site };
    clearBuildingColliders(building);
    updateBuildingMove(current, current.point);
  };

  const setPreview = (building, vertices, valid = false) => {
    if (operation?.preview) removeOperationPreview(operation.preview);
    const preview = createPenPreview(vertices, building.site.y, valid);
    parent?.add(preview);
    operation.preview = preview;
  };

  const updatePenLasso = (current, point) => {
    const last = current.samples.at(-1);
    if (!last || Math.hypot(point.x - last.x, point.z - last.z) >= TILE * .2) {
      current.samples.push({ x: point.x, z: point.z });
    }
    current.result = penGeometryFromLasso(current.samples, getTerrain(), current.building.site, {
      occupiedTileKeys: occupiedTileKeys(current.building), minimumCapacity: STARTER_COW_COUNT,
    });
    if (current.preview) removeOperationPreview(current.preview);
    current.preview = createPenLassoPreview(current.samples, current.result, current.building.site.y);
    parent?.add(current.preview);
    onHint('');
  };

  const beginPenLasso = (building, point) => {
    if (!isPenDraft(building) || !building.placed) return false;
    operation = { kind: 'lasso-pen', building, samples: [], result: null, preview: null };
    building.penVisual && (building.penVisual.group.visible = false);
    ensureGateVisual(building);
    updatePenLasso(operation, point);
    selected = building;
    return true;
  };

  const moveOperation = point => {
    if (!operation) return;
    const building = operation.building;
    if (operation.kind === 'hold-building') {
      operation.point = { x: point.x, z: point.z };
      if (performance.now() - operation.startedAt < BUILDING_HOLD_MS) return;
      promoteBuildingMove(operation);
      return;
    }
    if (operation.kind === 'move-building') {
      updateBuildingMove(operation, point);
      return;
    }
    if (operation.kind === 'select-building') return;
    if (operation.kind === 'place-building') {
      const site = placementFor(point, building.type);
      building.site = site;
      building.visual.group.position.set(site.x, site.y, site.z);
      building.visual.setDragging(site.valid);
      return;
    }
    if (operation.kind === 'lasso-pen') {
      updatePenLasso(operation, point);
      return;
    }
    const snapped = snapPenPoint(point);
    if (operation.kind === 'move-corner') {
      const original = operation.original;
      const index = operation.index;
      const previous = original[index - 1], corner = original[index], next = original[index + 1];
      const replacement = [];
      if (previous.cx !== snapped.cx && previous.cz !== snapped.cz) {
        replacement.push(previous.cz === corner.cz
          ? { cx: snapped.cx, cz: previous.cz }
          : { cx: previous.cx, cz: snapped.cz });
      }
      replacement.push({ cx: snapped.cx, cz: snapped.cz });
      if (next.cx !== snapped.cx && next.cz !== snapped.cz) {
        replacement.push(next.cx === corner.cx
          ? { cx: snapped.cx, cz: next.cz }
          : { cx: next.cx, cz: snapped.cz });
      }
      operation.vertices = removeCollinearVertices([
        ...original.slice(0, index), ...replacement, ...original.slice(index + 1),
      ]);
    }
    else if (operation.kind === 'move-segment') {
      const index = operation.index;
      const nextIndex = (index + 1) % operation.vertices.length;
      const originalA = operation.original[index], originalB = operation.original[nextIndex];
      if (originalA.cz === originalB.cz) {
        operation.vertices[index].cz = snapped.cz;
        operation.vertices[nextIndex].cz = snapped.cz;
      }
      else {
        operation.vertices[index].cx = snapped.cx;
        operation.vertices[nextIndex].cx = snapped.cx;
      }
    }
    const geometry = penGeometry(building, operation.vertices, building.animals.length || STARTER_COW_COUNT);
    operation.geometry = geometry;
    setPreview(building, operation.vertices, geometry.valid);
    onHint(geometry.valid
      ? `PEN CAPACITY ${geometry.capacity} · RELEASE TO USE`
      : geometry.reason.toUpperCase());
  };

  return {
    setParent(nextParent) {
      parent = nextParent;
      for (const building of buildings.values()) {
        parent.add(building.visual.group);
        registerBuildingOccluder(building);
        if (building.penVisual) parent.add(building.penVisual.group);
        if (building.gateVisual) parent.add(building.gateVisual.group);
      }
    },
    setBuildMode(enabled) {
      buildMode = enabled;
      if (!enabled) {
        this.cancelDrag();
        let discarded = false;
        for (const building of [...buildings.values()]) {
          if (isComplete(building)) continue;
          removeBuilding(building);
          discarded = true;
        }
        selected = null;
        repaintRequested = null;
        onHint('');
        if (discarded) onChange();
      }
      for (const building of buildings.values()) building.penVisual?.setEditing(enabled && building === selected && isPenDraft(building));
    },
    placeBuilding(type, preferredPoint) {
      if (!buildMode || !definitions[type]) return false;
      this.cancelDrag();
      const site = automaticSiteFor(type, preferredPoint);
      if (!site) {
        onHint('NO CLEAR BUILDING SITE AVAILABLE');
        return false;
      }
      const building = addBuilding(type);
      building.site = { ...site, valid: true };
      building.placed = true;
      building.visual.group.position.set(site.x, site.y, site.z);
      building.visual.drop();
      setCollider(building.id, colliderFor(building));
      selected = building;
      onHint('');
      onChange();
      return true;
    },
    beginDrag(point, type, hit = null) {
      const hitBuilding = hit?.building || (hit?.id ? hit : null);
      if (repaintRequested?.placed && isPenDraft(repaintRequested)) {
        const building = repaintRequested;
        repaintRequested = null;
        return beginPenLasso(building, point);
      }
      if (selected?.type === 'cattle-barn' && isPenDraft(selected) && !selected.pen
        && (!hitBuilding || hitBuilding === selected)) return beginPenLasso(selected, point);
      if (hitBuilding) {
        selected = hitBuilding;
        for (const building of buildings.values()) building.penVisual?.setEditing(building === selected && isPenDraft(building));
        const penPart = hit?.penPart;
        if (hitBuilding.type === 'cattle-barn' && isPenDraft(hitBuilding) && hitBuilding.pen && penPart) {
          if (penPart.type === 'corner' && (penPart.index === 0 || penPart.index === hitBuilding.pen.vertices.length - 1)) return true;
          const vertices = hitBuilding.pen.vertices.map(vertex => ({ ...vertex }));
          operation = {
            kind: penPart.type === 'corner' ? 'move-corner' : 'move-segment', building: hitBuilding,
            index: penPart.index, vertices, original: vertices.map(vertex => ({ ...vertex })), preview: null,
          };
          moveOperation(point);
          return true;
        }
        operation = {
          kind: 'hold-building', building: hitBuilding, point: { x: point.x, z: point.z },
          grabOffset: { x: point.x - hitBuilding.site.x, z: point.z - hitBuilding.site.z },
          startedAt: performance.now(), preview: null,
        };
        onHint(isDraft(hitBuilding) ? 'HOLD TO MOVE BUILDING' : '');
        return true;
      }
      const building = addBuilding(type);
      if (!building) return false;
      operation = { kind: 'place-building', building };
      selected = building;
      moveOperation(point);
      return true;
    },
    moveDrag(point) {
      moveOperation(point);
    },
    endDrag() {
      if (!operation) return false;
      const current = operation;
      const building = current.building;
      if (current.preview) removeOperationPreview(current.preview);
      operation = null;
      if (current.kind === 'select-building') return false;
      onHint('');
      if (current.kind === 'hold-building') return false;
      if (current.kind === 'move-building') {
        if (!current.valid) {
          restoreBuildingMove(current);
          return false;
        }
        building.site = current.site;
        building.visual.drop();
        setCollider(building.id, colliderFor(building));
        onChange();
        return true;
      }
      if (current.kind === 'lasso-pen') {
        const geometry = current.result;
        if (!geometry?.valid) {
          if (building.penVisual) building.penVisual.group.visible = true;
          ensureGateVisual(building);
          onHint((geometry?.reason || 'Circle the pasture again').toUpperCase());
          return false;
        }
        building.pen = { vertices: geometry.vertices.map(vertex => ({ ...vertex })) };
        rebuildPen(building, geometry);
        onChange();
        return true;
      }
      if (current.kind === 'move-corner' || current.kind === 'move-segment') {
        const geometry = current.geometry || penGeometry(building, current.vertices, building.animals.length || STARTER_COW_COUNT);
        if (!geometry.valid) {
          onHint(geometry.reason.toUpperCase());
          return false;
        }
        building.pen = { vertices: geometry.vertices.map(vertex => ({ ...vertex })) };
        rebuildPen(building, geometry);
        onChange();
        return true;
      }
      if (!building.site?.valid) {
        if (building.previousSite) {
          building.site = building.previousSite;
          building.visual.group.position.set(building.site.x, building.site.y, building.site.z);
          building.visual.settle();
          setCollider(building.id, colliderFor(building));
        }
        else {
          parent?.remove(building.visual.group);
          clearConstructionOutline(building);
          buildings.delete(building.id);
          if (selected === building) selected = null;
        }
        return false;
      }
      building.placed = true;
      building.previousSite = null;
      building.visual.drop();
      setCollider(building.id, colliderFor(building));
      onChange();
      selected = building;
      return true;
    },
    cancelDrag() {
      if (!operation) return;
      const current = operation;
      const building = current.building;
      if (current.preview) removeOperationPreview(current.preview);
      operation = null;
      onHint('');
      if (current.kind === 'hold-building' || current.kind === 'select-building') return;
      if (current.kind === 'move-building') {
        restoreBuildingMove(current);
        return;
      }
      if (current.kind === 'lasso-pen') {
        if (building.penVisual) building.penVisual.group.visible = true;
        return;
      }
      if (current.kind.startsWith('move-corner') || current.kind.startsWith('move-segment')) return;
      if (!building.placed) {
        parent?.remove(building.visual.group);
        clearConstructionOutline(building);
        buildings.delete(building.id);
        if (selected === building) selected = null;
      }
      else if (building.previousSite) {
        building.site = building.previousSite;
        building.visual.group.position.set(building.site.x, building.site.y, building.site.z);
        building.visual.settle();
        setCollider(building.id, colliderFor(building));
      }
    },
    selectFromObject(object) {
      let current = object;
      while (current) {
        if (current.userData.building) {
          selected = current.userData.building;
          for (const building of buildings.values()) building.penVisual?.setEditing(building === selected && isPenDraft(building));
          return { building: selected, penPart: current.userData.penPart || null };
        }
        current = current.parent;
      }
      return null;
    },
    clear() {
      for (const building of buildings.values()) {
        unregisterBuildingOccluder(building);
        if (building.placed) setCollider(building.id, null);
        clearPenVisual(building);
        clearGateVisual(building);
        clearConstructionOutline(building);
        for (const animal of building.animals || []) animal.visual?.group.removeFromParent();
        parent?.remove(building.visual.group);
      }
      buildings.clear();
      operation = null;
      selected = null;
      repaintRequested = null;
      nextIds.silo = nextIds['cattle-barn'] = 1;
      nextCowId = 1;
    },
    persistentState() {
      return [...buildings.values()]
        .filter(building => building.placed)
        .map(building => building.type === 'silo' ? {
          id: building.id, type: building.type, x: building.site.x, z: building.site.z,
          constructionPhase: building.constructionPhase, contents: { ...building.contents },
        } : {
          id: building.id, type: building.type, x: building.site.x, z: building.site.z,
          constructionPhase: building.constructionPhase,
          pen: building.pen ? { vertices: building.pen.vertices.map(vertex => ({ ...vertex })) } : null,
          hayLitres: building.hayLitres, milkLitres: building.milkLitres,
          birthProgress: building.birthProgress, starterCowsGranted: building.starterCowsGranted,
          animals: building.animals.map(animal => ({
            id: animal.id, stage: animal.stage, age: animal.age, tileKey: animal.tileKey,
            targetTileKey: animal.targetTileKey, moveProgress: animal.moveProgress,
            heading: animal.heading, idleSeconds: animal.idleSeconds,
            jitterX: animal.jitterX, jitterZ: animal.jitterZ,
            targetJitterX: animal.targetJitterX, targetJitterZ: animal.targetJitterZ,
          })),
        });
    },
    restorePersistentState(savedBuildings) {
      if (!Array.isArray(savedBuildings)) return;
      for (const saved of savedBuildings) {
        if (!definitions[saved?.type] || !Number.isFinite(saved.x) || !Number.isFinite(saved.z)) continue;
        const site = placementFor(saved, saved.type);
        if (!site.valid) continue;
        const building = addBuilding(saved.type, saved.id);
        building.site = site;
        building.placed = true;
        building.constructionPhase = normalizedConstructionPhase(saved);
        if (building.type === 'silo') building.contents = normalizedContents(saved.contents);
        else {
          Object.assign(building, normalizeCattleBarnState(saved));
          if (isDraft(building)) {
            building.pen = null;
            building.animals = [];
            building.starterCowsGranted = false;
          }
          else if (isPenDraft(building)) {
            building.animals = [];
            building.starterCowsGranted = false;
          }
          for (const animal of building.animals) {
            const number = Number(animal.id.match(/^cow-(\d+)$/)?.[1]);
            if (Number.isInteger(number)) nextCowId = Math.max(nextCowId, number + 1);
          }
          building.nextCowId = Math.max(building.nextCowId, nextCowId);
        }
        building.visual.group.position.set(site.x, site.y, site.z);
        building.visual.settle();
        setCollider(building.id, colliderFor(building));
        if (building.pen) {
          const geometry = penGeometry(building, building.pen.vertices, building.animals.length || STARTER_COW_COUNT);
          if (geometry.valid) rebuildPen(building, geometry);
          else {
            building.pen = null;
            building.derived = null;
            building.visual.setPenComplete?.(false);
          }
        }
        else {
          building.visual.setPenComplete?.(false);
          if (isPenDraft(building)) ensureGateVisual(building);
        }
        if (isComplete(building)) {
          clearConstructionOutline(building);
          registerBuildingOccluder(building);
        }
      }
    },
    animate(elapsed, dt = 0) {
      if (operation?.kind === 'hold-building' && performance.now() - operation.startedAt >= BUILDING_HOLD_MS) promoteBuildingMove(operation);
      for (const building of buildings.values()) {
        building.visual.setSelected(building === selected);
        building.visual.animate(elapsed, operation?.building === building, dt);
        building.constructionOutline?.animate(elapsed);
        building.penVisual?.setEditing(buildMode && building === selected && isPenDraft(building));
        if (building.gateVisual) {
          building.gateVisual.group.visible = buildMode && building === selected && isPenDraft(building)
            && (!building.pen || repaintRequested === building || (operation?.kind === 'lasso-pen' && operation.building === building));
          building.gateVisual.animate(elapsed);
        }
        if (building.type === 'cattle-barn' && building.placed && isComplete(building)) {
          building.nextCowId = Math.max(building.nextCowId, nextCowId);
          updateCattleBarn(building, dt, elapsed, { parent, terrain: getTerrain(), onChange });
          nextCowId = Math.max(nextCowId, building.nextCowId);
        }
      }
    },
    isNearSilo(x, z, range = 2.45) {
      return Boolean(this.siloAt(x, z, range));
    },
    siloAt(x, z, range = 2.45) {
      let closest = null;
      for (const building of buildings.values()) {
        if (building.type !== 'silo' || !building.placed || !isComplete(building)) continue;
        const distance = Math.hypot(x - building.site.x, z - building.site.z);
        if (distance > range || (closest && distance >= closest.distance)) continue;
        closest = { building, distance };
      }
      return closest?.building || null;
    },
    storeAt(x, z, contents, elapsed = 0, range = 2.45) {
      const building = this.siloAt(x, z, range);
      if (!building) return null;
      for (const [cropId, amount] of Object.entries(normalizedContents(contents))) {
        building.contents[cropId] = (building.contents[cropId] || 0) + amount;
      }
      building.visual.receive(elapsed);
      onChange();
      return {
        building,
        target: { x: building.site.x, y: building.site.y + 3.58, z: building.site.z },
      };
    },
    storeIn(siloId, cropId, amount, elapsed = 0, notify = true) {
      const building = buildings.get(siloId);
      const storedAmount = cropIds.includes(cropId)
        ? Math.max(0, Math.floor(Number(amount) || 0))
        : 0;
      if (!building || building.type !== 'silo' || !building.placed || !isComplete(building) || !storedAmount) return null;
      building.contents[cropId] = (building.contents[cropId] || 0) + storedAmount;
      building.visual.receive(elapsed);
      if (notify) onChange();
      return { x: building.site.x, y: building.site.y + 3.58, z: building.site.z };
    },
    takeFrom(siloId, cropId, requestedAmount, notify = true) {
      const building = buildings.get(siloId);
      const available = building?.type === 'silo' && building.placed && isComplete(building)
        ? Math.max(0, Math.floor(Number(building.contents[cropId]) || 0))
        : 0;
      const amount = Math.min(available, Math.max(0, Math.floor(Number(requestedAmount) || 0)));
      if (!amount) return 0;
      building.contents[cropId] -= amount;
      if (!building.contents[cropId]) delete building.contents[cropId];
      if (notify) onChange();
      return amount;
    },
    unloadTargetAt(x, z, elapsed = 0, range = 2.45) {
      const building = this.siloAt(x, z, range);
      if (!building) return null;
      building.visual.receive(elapsed);
      return { x: building.site.x, y: building.site.y + 3.58, z: building.site.z };
    },
    cattleBarnAt(x, z, range = 3.05) {
      let closest = null;
      for (const building of buildings.values()) {
        if (building.type !== 'cattle-barn' || !building.placed || !isComplete(building) || !building.pen || !building.derived?.valid) continue;
        const distance = Math.hypot(x - building.site.x, z - building.site.z);
        if (distance <= range && (!closest || distance < closest.distance)) closest = { building, distance };
      }
      return closest?.building || null;
    },
    cattleBarn(id) {
      const building = buildings.get(id);
      return building?.type === 'cattle-barn' && building.placed && isComplete(building) ? building : null;
    },
    cattleBarnSummary(id) {
      const building = this.cattleBarn(id);
      if (!building) return null;
      const adults = building.animals.filter(animal => animal.stage === 'adult').length;
      return {
        id: building.id, complete: Boolean(building.pen && building.derived?.valid),
        herd: building.animals.length, adults, calves: building.animals.length - adults,
        capacity: building.derived?.capacity || 0, hayLitres: Math.floor(building.hayLitres),
        hayCapacity: BARN_HAY_CAPACITY, milkLitres: Math.floor(building.milkLitres), milkCapacity: BARN_MILK_CAPACITY,
      };
    },
    addHayBale(id, litres = HAY_BALE_LITRES) {
      const building = this.cattleBarn(id);
      const amount = Math.max(0, Math.floor(Number(litres) || 0));
      if (!building?.pen || !amount || building.hayLitres + amount > BARN_HAY_CAPACITY) return false;
      building.hayLitres += amount; onChange(); return true;
    },
    takeMilk(id, requestedAmount, notify = true) {
      const building = this.cattleBarn(id);
      if (!building?.pen) return 0;
      const amount = Math.min(Math.floor(building.milkLitres), Math.max(0, Math.floor(Number(requestedAmount) || 0)));
      if (!amount) return 0;
      building.milkLitres -= amount;
      if (notify) onChange();
      return amount;
    },
    transferPort(id, direction, itemId) {
      const building = buildings.get(id);
      if (!building?.placed || !isComplete(building)) return null;
      if (building.type === 'silo' && itemId !== 'milk') {
        return { x: building.site.x, y: building.site.y + 3.76, z: building.site.z };
      }
      if (building.type === 'cattle-barn' && direction === 'output' && itemId === 'milk') {
        return { x: building.site.x + .86, y: building.site.y + .56, z: building.site.z + 1.12 };
      }
      return null;
    },
    setTransferState(id, state) {
      buildings.get(id)?.visual.setTransferState?.(state);
    },
    pulseTransfer(id, direction) {
      buildings.get(id)?.visual.pulseTransfer?.(direction);
    },
    repaintSelected() {
      if (selected?.type !== 'cattle-barn' || !selected.placed || !isPenDraft(selected)) return false;
      this.cancelDrag();
      if (!selected.pen) return false;
      repaintRequested = selected;
      ensureGateVisual(selected);
      onHint('');
      return true;
    },
    isPastureAt(x, z) {
      const key = gridKey(Math.floor(x / TILE + .5), Math.floor(z / TILE + .5));
      return [...buildings.values()].some(building => building.type === 'cattle-barn' && building.derived?.tileSet?.has(key));
    },
    isBuildingAt(x, z) {
      const gx = Math.floor(x / TILE + .5), gz = Math.floor(z / TILE + .5);
      return [...buildings.values()].some(building => {
        if (!building.placed) return false;
        const span = definitions[building.type].footprintSpan;
        const buildingGx = Math.round(building.site.x / TILE), buildingGz = Math.round(building.site.z / TILE);
        return Math.abs(gx - buildingGx) <= span && Math.abs(gz - buildingGz) <= span;
      });
    },
    constructionState() {
      if (!selected?.placed || isComplete(selected)) return null;
      const phase = selected.constructionPhase;
      const primaryAction = selected.type === 'cattle-barn' && phase === 'draft' ? 'draw-pen' : 'confirm';
      return {
        buildingId: selected.id,
        type: selected.type,
        phase,
        x: selected.site.x,
        y: selected.site.y,
        z: selected.site.z,
        popupHeight: definitions[selected.type].popupHeight,
        primaryAction,
        primaryLabel: primaryAction === 'draw-pen' ? 'Draw pen' : 'Confirm',
        canConfirm: phase === 'pen-draft'
          ? Boolean(selected.pen && selected.derived?.valid
            && repaintRequested !== selected && !(operation?.kind === 'lasso-pen' && operation.building === selected))
          : true,
        inputMode: operation?.kind === 'lasso-pen' && operation.building === selected
          ? 'lasso'
          : repaintRequested === selected ? 'lasso-ready'
            : phase === 'pen-draft' && selected.pen ? 'edit' : 'lasso-ready',
        dragging: operation?.building === selected && ['place-building', 'move-building'].includes(operation.kind),
      };
    },
    confirmSelectedConstruction() {
      const building = selected;
      if (!building?.placed || !building.site?.valid || isComplete(building) || operation?.building === building) return false;
      if (building.type === 'silo' && isDraft(building)) {
        building.constructionPhase = 'complete';
        repaintRequested = null;
        clearConstructionOutline(building);
        registerBuildingOccluder(building);
        onHint('');
        onChange();
        return true;
      }
      if (building.type !== 'cattle-barn') return false;
      if (isDraft(building)) {
        clearPenVisual(building);
        building.pen = null;
        building.derived = null;
        building.visual.setPenComplete?.(false);
        building.constructionPhase = 'pen-draft';
        repaintRequested = building;
        ensureGateVisual(building);
        onHint('');
        onChange();
        return true;
      }
      if (!isPenDraft(building) || !building.pen || !building.derived?.valid) return false;
      building.constructionPhase = 'complete';
      repaintRequested = null;
      clearConstructionOutline(building);
      clearGateVisual(building);
      building.penVisual?.setEditing(false);
      grantStarterCows(building);
      registerBuildingOccluder(building);
      onHint('');
      onChange();
      return true;
    },
    cancelSelectedConstruction() {
      const building = selected;
      if (!building?.placed || isComplete(building)) return false;
      this.cancelDrag();
      repaintRequested = null;
      removeBuilding(building);
      selected = null;
      onHint('');
      onChange();
      return true;
    },
    undoSelectedConstruction() {
      const building = selected;
      if (building?.type !== 'cattle-barn' || !building.placed || !isPenDraft(building)) return false;
      this.cancelDrag();
      repaintRequested = null;
      clearPenVisual(building);
      clearGateVisual(building);
      building.pen = null;
      building.derived = null;
      building.visual.setPenComplete?.(false);
      for (const animal of building.animals) animal.visual?.group.removeFromParent();
      building.animals = [];
      building.starterCowsGranted = false;
      building.constructionPhase = 'draft';
      onHint('');
      onChange();
      return true;
    },
    interactionLevel() {
      return operation && ['lasso-pen', 'move-corner', 'move-segment'].includes(operation.kind)
        ? operation.building.site.y
        : 0;
    },
    isDragging: () => operation !== null,
  };
}

function sameCorner(a, b) {
  return a?.cx === b?.cx && a?.cz === b?.cz;
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
  let receivedAt = -10;
  let transfer = null;
  let transferPulse = 0;

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
    receive(elapsed) { receivedAt = elapsed; },
    setTransferState({ active, direction, elapsed = 0 }) {
      if (!active) {
        transfer = null;
        transferPulse = Math.max(transferPulse, reducedMotion ? .28 : 1);
        return;
      }
      transfer = { direction, started: elapsed };
    },
    pulseTransfer(direction) {
      if (direction === 'input') transferPulse = Math.max(transferPulse, reducedMotion ? .24 : .68);
    },
    animate(elapsed, active, dt = 0) {
      if (dragging || active) {
        const wobble = Math.sin(elapsed * 14) * .035;
        spring.position.y = .16 + Math.sin(elapsed * 18) * .025;
        spring.rotation.z = wobble;
        spring.scale.set(1.055 - wobble * .15, .9 + wobble, 1.055 - wobble * .15);
        return;
      }
      if (droppedAt === null) droppedAt = elapsed;
      const age = Math.max(0, elapsed - droppedAt);
      const placementBounce = age < .78 ? Math.sin(age * 20) * Math.exp(-age * 5.2) : 0;
      const receivedAge = Math.max(0, elapsed - receivedAt);
      const receiptBounce = receivedAge < .55
        ? Math.sin(receivedAge * 22) * Math.exp(-receivedAge * 6.8) * (reducedMotion ? .12 : .6)
        : 0;
      transferPulse *= Math.exp(-(reducedMotion ? 11 : 7) * dt);
      const transferAge = transfer ? Math.max(0, elapsed - transfer.started) : 0;
      const transferWobble = !reducedMotion && transfer ? Math.sin(transferAge * 16) * .018 : 0;
      const transferBreath = !reducedMotion && transfer ? Math.sin(transferAge * 9) * .018 : 0;
      const bounce = placementBounce + receiptBounce + transferPulse * (reducedMotion ? .08 : .32);
      spring.position.y = Math.max(0, transferBreath * .4);
      spring.rotation.z = transferWobble;
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
