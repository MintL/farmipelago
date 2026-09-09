import { THREE, gridKey } from '../../core/shared.js';

const DUST_COUNT = 48;
const LEAF_COUNT = 24;
const REDUCED_DUST_COUNT = 24;
const REDUCED_LEAF_COUNT = 12;
const DUST_EMITTER_COUNT = 18;
const LEAF_EMITTER_COUNT = 16;
const TAU = Math.PI * 2;
const ZERO_OFFSET = Object.freeze({ x: 0, y: 0, z: 0 });
const DAY_TINT = new THREE.Color(0xffffff);
const DUST_NIGHT_TINT = new THREE.Color(0x71818b);
const LEAF_NIGHT_TINT = new THREE.Color(0x64766d);
const DUST_COLORS = [0xa98864, 0xb49a77, 0x8d765f].map(value => new THREE.Color(value));
const LEAF_COLORS = [0x66784d, 0x87905a, 0x9a7f4f].map(value => new THREE.Color(value));

const clamp01 = value => Math.max(0, Math.min(1, value));
const fraction = value => value - Math.floor(value);
const smoothstep01 = value => value * value * (3 - 2 * value);

function hash01(index, salt) {
  let value = Math.imul((index | 0) + 1, 0x9e3779b1) ^ Math.imul((salt | 0) + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function tileHash(tile, seed, salt) {
  const index = (seed ^ Math.imul(tile.gx, 0x1f123bb5) ^ Math.imul(tile.gz, 0x5f356495)) >>> 0;
  return hash01(index, salt);
}

function pathIsOpen(tile, terrain, motionX, motionZ, isBlockedAt) {
  const stepX = Math.sign(motionX);
  const stepZ = Math.sign(motionZ);
  for (let step = 1; step <= 3; step++) {
    const next = terrain.get(gridKey(tile.gx + stepX * step, tile.gz + stepZ * step));
    if (!next || next.islandId !== tile.islandId) break;
    if (next.reserved || next.noDecoration || next.topY > tile.topY + .05 || isBlockedAt(next.x, next.z)) return false;
  }
  return true;
}

function selectSpaced(candidates, maximum) {
  const groups = new Map();
  for (const candidate of candidates) {
    if (!groups.has(candidate.tile.islandId)) groups.set(candidate.tile.islandId, []);
    groups.get(candidate.tile.islandId).push(candidate);
  }
  for (const group of groups.values()) group.sort((a, b) => b.score - a.score || a.tile.gx - b.tile.gx || a.tile.gz - b.tile.gz);

  const selected = [];
  const selectedTiles = new Set();
  const groupLimit = Math.max(1, Math.ceil(maximum / Math.max(1, groups.size)));
  const addCandidate = candidate => {
    if (selectedTiles.has(candidate.tile)) return false;
    if (selected.some(existing => existing.tile.islandId === candidate.tile.islandId &&
      Math.hypot(existing.tile.gx - candidate.tile.gx, existing.tile.gz - candidate.tile.gz) < 1.8)) return false;
    selected.push(candidate);
    selectedTiles.add(candidate.tile);
    return true;
  };

  for (const group of groups.values()) {
    let added = 0;
    for (const candidate of group) {
      if (added >= groupLimit || selected.length >= maximum) break;
      if (addCandidate(candidate)) added++;
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.tile.gx - b.tile.gx || a.tile.gz - b.tile.gz);
  for (const candidate of candidates) {
    if (selected.length >= maximum) break;
    addCandidate(candidate);
  }
  return selected;
}

function createAnchors({ terrain, seed, kind, motionX, motionZ, presentationOffsetForIsland, isBlockedAt }) {
  const candidates = [];
  for (const tile of terrain.values()) {
    if (tile.water || tile.reserved || tile.noDecoration || isBlockedAt(tile.x, tile.z) ||
      !pathIsOpen(tile, terrain, motionX, motionZ, isBlockedAt)) continue;
    const moisture = clamp01(Number(tile.environment?.moisture) || 0);
    const sun = clamp01(Number(tile.environment?.sun) || 0);
    const dry = 1 - moisture;
    if (kind === 'dust') {
      if (tile.hasTree || tile.hasVegetation || (dry < .34 && tile.bareSoil < .16) ||
        (tile.radial < .42 && tile.bareSoil < .2)) continue;
      candidates.push({
        tile,
        score: dry * .62 + sun * .14 + clamp01(tile.bareSoil) * .5 + clamp01(tile.radial) * .14 + tileHash(tile, seed, 17) * .09,
      });
    }
    else {
      if (!tile.hasTree && !tile.hasVegetation) continue;
      candidates.push({
        tile,
        score: (tile.hasTree ? .82 : .28) + moisture * .16 + (1 - sun) * .06 + tileHash(tile, seed, 31) * .1,
      });
    }
  }

  const maximum = kind === 'dust' ? DUST_EMITTER_COUNT : LEAF_EMITTER_COUNT;
  return selectSpaced(candidates, maximum).map(({ tile }, index) => {
    const angle = tileHash(tile, seed, kind === 'dust' ? 47 : 59) * TAU;
    const radius = (kind === 'dust' ? .12 : .2) + tileHash(tile, seed, 71 + index) * (kind === 'dust' ? .25 : .2);
    return {
      x: tile.x + Math.cos(angle) * radius,
      y: tile.topY,
      z: tile.z + Math.sin(angle) * radius,
      islandId: tile.islandId,
      offset: presentationOffsetForIsland(tile.islandId) || ZERO_OFFSET,
    };
  });
}

function createPool({ name, count, geometry, material, colors, salt, kind }) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const records = Array.from({ length: count }, (_, index) => ({
    anchor: null,
    phase: hash01(index, salt),
    speed: (kind === 'dust' ? .72 : .84) + hash01(index, salt + 1) * (kind === 'dust' ? .25 : .34),
    pathLength: (kind === 'dust' ? 3.8 : 4.3) + hash01(index, salt + 2) * (kind === 'dust' ? 2.4 : 2.9),
    wander: (kind === 'dust' ? .06 : .12) + hash01(index, salt + 3) * (kind === 'dust' ? .11 : .18),
    lateralBias: (hash01(index, salt + 4) - .5) * (kind === 'dust' ? .42 : .58),
    baseHeight: (kind === 'dust' ? .1 : .2) + hash01(index, salt + 5) * (kind === 'dust' ? .09 : .16),
    lift: (kind === 'dust' ? .04 : .16) + hash01(index, salt + 6) * (kind === 'dust' ? .07 : .22),
    flutter: (kind === 'dust' ? .008 : .025) + hash01(index, salt + 7) * (kind === 'dust' ? .014 : .04),
    rising: false,
    groundClearance: .065 + hash01(index, salt + 8) * .035,
    riseHeight: .5 + hash01(index, salt + 9) * .42,
    fadeStart: .48 + hash01(index, salt + 10) * .16,
    lateralFrequencyA: 1 + Math.floor(hash01(index, salt + 11) * (kind === 'dust' ? 2 : 3)),
    lateralFrequencyB: 3 + Math.floor(hash01(index, salt + 12) * (kind === 'dust' ? 2 : 3)),
    verticalFrequency: 2 + Math.floor(hash01(index, salt + 13) * (kind === 'dust' ? 3 : 4)),
    lateralPhaseA: hash01(index, salt + 14) * TAU,
    lateralPhaseB: hash01(index, salt + 15) * TAU,
    verticalPhase: hash01(index, salt + 16) * TAU,
    tumbleSpeedX: 1.35 + hash01(index, salt + 17) * 1.25,
    tumbleSpeedZ: 1.1 + hash01(index, salt + 18) * 1.15,
    yaw: (hash01(index, salt + 19) - .5) * .5,
    scaleX: (kind === 'dust' ? .035 : .075) + hash01(index, salt + 20) * (kind === 'dust' ? .035 : .055),
    scaleY: (kind === 'dust' ? .025 : .018) + hash01(index, salt + 21) * (kind === 'dust' ? .025 : .018),
    scaleZ: (kind === 'dust' ? .065 : .095) + hash01(index, salt + 22) * (kind === 'dust' ? .07 : .065),
  }));
  for (let index = 0; index < count; index++) mesh.setColorAt(index, colors[Math.floor(hash01(index, salt + 23) * colors.length)]);
  mesh.instanceColor.needsUpdate = true;
  mesh.visible = false;
  return { mesh, records, kind };
}

function assignAnchors(pool, anchors, seed, salt) {
  const count = anchors.length;
  for (let index = 0; index < pool.records.length; index++) {
    const record = pool.records[index];
    record.anchor = count ? anchors[(index + Math.floor(hash01(index, seed ^ salt) * count)) % count] : null;
    record.phase = hash01(index, seed ^ (salt + 1));
    record.lateralPhaseA = hash01(index, seed ^ (salt + 2)) * TAU;
    record.lateralPhaseB = hash01(index, seed ^ (salt + 3)) * TAU;
    record.verticalPhase = hash01(index, seed ^ (salt + 4)) * TAU;
    record.rising = pool.kind === 'leaves' && hash01(index, seed ^ (salt + 5)) < .42;
  }
  pool.mesh.visible = count > 0;
}

export function createWindParticleSystem({ reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'wind-particles';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const dustMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: true });
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: true });
  const dust = createPool({ name: 'wind-dust', count: DUST_COUNT, geometry, material: dustMaterial, colors: DUST_COLORS, salt: 101, kind: 'dust' });
  const leaves = createPool({ name: 'wind-leaves', count: LEAF_COUNT, geometry, material: leafMaterial, colors: LEAF_COLORS, salt: 211, kind: 'leaves' });
  dust.mesh.count = reducedMotion ? REDUCED_DUST_COUNT : DUST_COUNT;
  leaves.mesh.count = reducedMotion ? REDUCED_LEAF_COUNT : LEAF_COUNT;
  dust.mesh.renderOrder = 3;
  leaves.mesh.renderOrder = 3;
  group.add(dust.mesh, leaves.mesh);

  const transform = new THREE.Object3D();
  const dustTint = new THREE.Color();
  const leafTint = new THREE.Color();
  let sources = null;
  let sourceSector = -1;
  let airDistance = 0;
  let lastTravelDistance = 0;

  const positionPool = (pool, elapsed, gust, motionX, motionZ, lateralX, lateralZ, heading) => {
    if (!pool.mesh.visible) return;
    const leafPool = pool.kind === 'leaves';
    for (let index = 0; index < pool.mesh.count; index++) {
      const record = pool.records[index];
      const progress = fraction(record.phase + airDistance * record.speed / record.pathLength);
      if (record.lastProgress != null && progress < record.lastProgress && record.nextAnchor !== undefined) {
        record.anchor = record.nextAnchor;
        delete record.nextAnchor;
      }
      record.lastProgress = progress;
      const anchor = record.anchor;
      if (!anchor) {
        transform.scale.set(0, 0, 0); transform.updateMatrix();
        pool.mesh.setMatrixAt(index, transform.matrix);
        continue;
      }
      const edgeAmount = Math.min(1, Math.min(progress, 1 - progress) / .16);
      const envelope = smoothstep01(edgeAmount);
      const along = progress * record.pathLength;
      const lateralPrimary = Math.sin(progress * TAU * record.lateralFrequencyA + record.lateralPhaseA) -
        Math.sin(record.lateralPhaseA);
      const lateralSecondary = Math.sin(progress * TAU * record.lateralFrequencyB + record.lateralPhaseB) -
        Math.sin(record.lateralPhaseB);
      const meanderScale = reducedMotion ? .2 : .7 + gust * .3;
      const meander = (lateralPrimary * .72 + lateralSecondary * .28) * record.wander * meanderScale;
      const lateral = record.lateralBias * (reducedMotion ? .5 : 1) + meander;
      const verticalWave = Math.sin(progress * TAU * record.verticalFrequency + record.verticalPhase) -
        Math.sin(record.verticalPhase);
      const flutterScale = reducedMotion ? (leafPool ? .16 : 0) : 1;
      const arc = Math.sin(progress * Math.PI);
      let height;
      let lifecycleScale = 1;
      if (leafPool && record.rising) {
        const riseProgress = smoothstep01(progress);
        const riseHeight = record.riseHeight * (reducedMotion ? .52 : 1) + (reducedMotion ? 0 : gust * .24);
        height = record.baseHeight + riseProgress * riseHeight + verticalWave * record.flutter * flutterScale;
        const fadeProgress = clamp01((progress - record.fadeStart) / (1 - record.fadeStart));
        lifecycleScale = 1 - smoothstep01(fadeProgress);
      }
      else if (leafPool) {
        const fallProgress = smoothstep01(progress);
        const fallingFlutter = verticalWave * record.flutter * flutterScale * (1 - fallProgress * .72);
        height = record.baseHeight + (record.groundClearance - record.baseHeight) * fallProgress + fallingFlutter +
          (reducedMotion ? 0 : arc * gust * .035);
        height = Math.max(record.groundClearance, height);
      }
      else height = record.baseHeight + arc * (record.lift + (reducedMotion ? 0 : gust * .025)) +
        verticalWave * record.flutter * flutterScale;
      transform.position.set(
        anchor.x + anchor.offset.x + motionX * along + lateralX * lateral,
        anchor.y + anchor.offset.y + height,
        anchor.z + anchor.offset.z + motionZ * along + lateralZ * lateral,
      );
      if (leafPool && !reducedMotion) {
        transform.rotation.set(
          Math.sin(elapsed * record.tumbleSpeedX + record.lateralPhaseA) * .48,
          heading + record.yaw + progress * TAU,
          Math.cos(elapsed * record.tumbleSpeedZ + record.verticalPhase) * .34,
        );
      }
      else transform.rotation.set(0, heading + record.yaw, 0);
      const scale = envelope * lifecycleScale;
      transform.scale.set(record.scaleX * scale, record.scaleY * scale, record.scaleZ * scale);
      transform.updateMatrix();
      pool.mesh.setMatrixAt(index, transform.matrix);
    }
    pool.mesh.instanceMatrix.needsUpdate = true;
  };

  const update = (elapsed, travelState) => {
    const directionX = Number(travelState?.direction?.x) || 0;
    const directionZ = Number(travelState?.direction?.z) || 0;
    const directionLength = Math.hypot(directionX, directionZ);
    if (directionLength < .0001) return;
    const motionX = -directionX / directionLength;
    const motionZ = -directionZ / directionLength;
    const lateralX = -motionZ;
    const lateralZ = motionX;
    const heading = Math.atan2(motionX, motionZ);
    const sector = Math.floor((heading + Math.PI) / (Math.PI / 8));
    if (sources && sector !== sourceSector) {
      sourceSector = sector;
      // Recheck emission corridors; existing particles finish their lifecycle.
      for (const pool of [dust, leaves]) for (const record of pool.records) record.nextAnchor = null;
      const options = { ...sources, motionX, motionZ };
      for (const pool of [dust, leaves]) {
        const anchors = createAnchors({ ...options, kind: pool.kind });
        pool.records.forEach((record, index) => { record.nextAnchor = anchors[index % anchors.length] || null; });
      }
    }
    const distance = Math.max(0, Number(travelState?.distance) || 0);
    const gust = reducedMotion ? 0 : clamp01(Number(travelState?.gust) || 0);
    const deltaDistance = Math.max(0, distance - lastTravelDistance);
    airDistance += deltaDistance * (1 + gust * .16);
    lastTravelDistance = distance;
    positionPool(dust, elapsed, gust, motionX, motionZ, lateralX, lateralZ, heading);
    positionPool(leaves, elapsed, gust, motionX, motionZ, lateralX, lateralZ, heading);
  };

  return {
    group,
    applyPalette(fogColor, nightAmount) {
      const night = clamp01(Number(nightAmount) || 0);
      dustTint.copy(DAY_TINT).lerp(DUST_NIGHT_TINT, night).lerp(fogColor, .1 + night * .12);
      leafTint.copy(DAY_TINT).lerp(LEAF_NIGHT_TINT, night).lerp(fogColor, .05 + night * .08);
      dustMaterial.color.copy(dustTint);
      leafMaterial.color.copy(leafTint);
    },
    setSources({ terrain, seed = 0, presentationOffsetForIsland = () => ZERO_OFFSET, isBlockedAt = () => false }, travelState) {
      const directionX = Number(travelState?.direction?.x) || 0;
      const directionZ = Number(travelState?.direction?.z) || 0;
      const directionLength = Math.hypot(directionX, directionZ) || 1;
      const motionX = -directionX / directionLength;
      const motionZ = -directionZ / directionLength;
      const sourceOptions = { terrain, seed: seed >>> 0, motionX, motionZ, presentationOffsetForIsland, isBlockedAt };
      sources = sourceOptions;
      sourceSector = -1;
      const dustAnchors = createAnchors({ ...sourceOptions, kind: 'dust' });
      const leafAnchors = createAnchors({ ...sourceOptions, kind: 'leaves' });
      assignAnchors(dust, dustAnchors, seed, 307);
      assignAnchors(leaves, leafAnchors, seed, 401);
      airDistance = Math.max(0, Number(travelState?.distance) || 0);
      lastTravelDistance = airDistance;
      update(0, travelState);
    },
    update,
  };
}
