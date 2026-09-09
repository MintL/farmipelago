import { TILE, THREE, box, mats } from '../../core/shared.js';

export const WATERFALL_SEGMENT_COUNT = 10;
export const WATERFALL_MIST_COUNT = 24;

const WATERFALL_HEIGHT = 15;
const WATERFALL_TRAIL = 1.45;
const WATERFALL_GUST_TRAIL = .22;
const WATERFALL_SEGMENT_OVERLAP = .035;
const UNIT_Y = new THREE.Vector3(0, 1, 0);
const SEGMENT_ACROSS = new THREE.Vector3();
const SEGMENT_TANGENT = new THREE.Vector3();
const SEGMENT_DELTA = new THREE.Vector3();
const SEGMENT_NORMAL = new THREE.Vector3();
const SEGMENT_BASIS = new THREE.Matrix4();
const TAU = Math.PI * 2;

const fraction = value => value - Math.floor(value);
const smoothstep01 = value => value * value * (3 - 2 * value);
const curveAmount = progress => progress * progress;

function applyWaterPatternOffset(renderer, scene, camera, geometry, material) {
  const offset = this.userData.waterPatternRoot?.userData.waterPatternOffset;
  material.uniforms?.patternOffset?.value.set(offset?.x || 0, offset?.z || 0);
}

function addPatternedWaterMesh(water, mesh) {
  mesh.userData.waterPatternRoot = water;
  mesh.onBeforeRender = applyWaterPatternOffset;
  water.add(mesh);
}

function setSegmentTransform(transform, from, to, edgeDirection) {
  transform.position.set(
    (from.x + to.x) * .5,
    (from.y + to.y) * .5,
    (from.z + to.z) * .5,
  );
  SEGMENT_ACROSS.set(-edgeDirection.z, 0, edgeDirection.x).normalize();
  SEGMENT_DELTA.subVectors(to, from);
  SEGMENT_TANGENT.copy(SEGMENT_DELTA)
    .addScaledVector(SEGMENT_ACROSS, -SEGMENT_DELTA.dot(SEGMENT_ACROSS))
    .normalize();
  SEGMENT_NORMAL.crossVectors(SEGMENT_ACROSS, SEGMENT_TANGENT).normalize();
  SEGMENT_BASIS.makeBasis(SEGMENT_ACROSS, SEGMENT_TANGENT, SEGMENT_NORMAL);
  transform.quaternion.setFromRotationMatrix(SEGMENT_BASIS);
  transform.scale.set(
    TILE * .78,
    SEGMENT_DELTA.dot(SEGMENT_TANGENT) + WATERFALL_SEGMENT_OVERLAP,
    .07,
  );
  transform.updateMatrix();
}

export function addWaterfall(tile, direction, water, waterfalls, random) {
  const atEastWestEdge = direction.x !== 0;
  const outlet = new THREE.Vector3(
    tile.x + direction.x * (TILE * .5 + .02),
    tile.topY + .02,
    tile.z + direction.z * (TILE * .5 + .02),
  );
  const segmentGeometry = new THREE.BoxGeometry(1, 1, 1);
  const segments = new THREE.InstancedMesh(segmentGeometry, mats.water, WATERFALL_SEGMENT_COUNT);
  const segmentTransform = new THREE.Object3D();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  segments.name = 'waterfall-segments';
  segments.castShadow = false;
  segments.receiveShadow = true;
  segments.frustumCulled = false;
  segments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let index = 0; index < WATERFALL_SEGMENT_COUNT; index++) {
    const start = index / WATERFALL_SEGMENT_COUNT;
    const end = (index + 1) / WATERFALL_SEGMENT_COUNT;
    from.set(outlet.x, outlet.y - WATERFALL_HEIGHT * start, outlet.z);
    to.set(outlet.x, outlet.y - WATERFALL_HEIGHT * end, outlet.z);
    setSegmentTransform(segmentTransform, from, to, direction);
    segments.setMatrixAt(index, segmentTransform.matrix);
  }
  segments.instanceMatrix.needsUpdate = true;
  addPatternedWaterMesh(water, segments);

  const streams = [];
  for (let index = 0; index < 3; index++) {
    const stream = box(
      atEastWestEdge ? .084 : .11,
      1.15,
      atEastWestEdge ? .11 : .084,
      mats.waterFoam,
      false,
      false,
    );
    const across = (index - 1) * .22;
    stream.position.set(
      outlet.x + (atEastWestEdge ? 0 : across),
      tile.topY - random() * WATERFALL_HEIGHT,
      outlet.z + (atEastWestEdge ? across : 0),
    );
    stream.renderOrder = 2;
    water.add(stream);
    streams.push({
      mesh: stream,
      phase: random(),
      acrossX: atEastWestEdge ? 0 : across,
      acrossZ: atEastWestEdge ? across : 0,
    });
  }
  waterfalls.push({
    outlet,
    topY: tile.topY + .05,
    height: WATERFALL_HEIGHT,
    edgeDirection: { x: direction.x, z: direction.z },
    atEastWestEdge,
    segments,
    streams,
  });
}

export function createWaterfallEffects(water, waterfalls, random, { reducedMotion = false } = {}) {
  const segmentTransform = new THREE.Object3D();
  const mistTransform = new THREE.Object3D();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const mistGeometry = new THREE.BoxGeometry(1, 1, 1);
  const mistMaterial = new THREE.MeshStandardMaterial({
    color: mats.waterFoam.color.getHex(),
    emissive: mats.waterFoam.emissive.getHex(),
    emissiveIntensity: mats.waterFoam.emissiveIntensity * .72,
    roughness: mats.waterFoam.roughness,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const mist = new THREE.InstancedMesh(mistGeometry, mistMaterial, WATERFALL_MIST_COUNT);
  mist.name = 'waterfall-mist';
  mist.castShadow = false;
  mist.receiveShadow = false;
  mist.frustumCulled = false;
  mist.renderOrder = 2;
  mist.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mist.count = waterfalls.length ? WATERFALL_MIST_COUNT : 0;
  mistTransform.scale.set(0, 0, 0);
  mistTransform.updateMatrix();
  for (let index = 0; index < WATERFALL_MIST_COUNT; index++) mist.setMatrixAt(index, mistTransform.matrix);
  mist.instanceMatrix.needsUpdate = true;
  water.add(mist);

  const mistRecords = Array.from({ length: WATERFALL_MIST_COUNT }, (_, index) => ({
    waterfall: waterfalls.length ? waterfalls[index % waterfalls.length] : null,
    phase: random(),
    speed: .1 + random() * .055,
    startProgress: .79 + random() * .18,
    pathLength: .7 + random() * .75,
    lateral: (random() - .5) * .62,
    lift: .16 + random() * .3,
    fall: .15 + random() * .28,
    turbulence: .035 + random() * .065,
    turbulencePhase: random() * TAU,
    sizeX: .045 + random() * .065,
    sizeY: .035 + random() * .055,
    sizeZ: .045 + random() * .065,
  }));

  const update = (elapsed, travelState) => {
    const directionX = Number(travelState?.direction?.x) || 0;
    const directionZ = Number(travelState?.direction?.z) || 0;
    const directionLength = Math.hypot(directionX, directionZ);
    if (directionLength < .0001) return;
    const motionX = -directionX / directionLength;
    const motionZ = -directionZ / directionLength;
    const lateralX = -motionZ;
    const lateralZ = motionX;
    const gust = reducedMotion ? 0 : THREE.MathUtils.clamp(Number(travelState?.gust) || 0, 0, 1);
    const sine = reducedMotion ? 0 : Math.sin(elapsed * .48) * .045;
    const trail = WATERFALL_TRAIL + gust * WATERFALL_GUST_TRAIL + sine;

    for (const waterfall of waterfalls) {
      for (let index = 0; index < waterfall.segments.count; index++) {
        const start = index / waterfall.segments.count;
        const end = (index + 1) / waterfall.segments.count;
        const startTrail = curveAmount(start) * trail;
        const endTrail = curveAmount(end) * trail;
        from.set(
          waterfall.outlet.x + motionX * startTrail,
          waterfall.outlet.y - waterfall.height * start,
          waterfall.outlet.z + motionZ * startTrail,
        );
        to.set(
          waterfall.outlet.x + motionX * endTrail,
          waterfall.outlet.y - waterfall.height * end,
          waterfall.outlet.z + motionZ * endTrail,
        );
        setSegmentTransform(segmentTransform, from, to, waterfall.edgeDirection);
        waterfall.segments.setMatrixAt(index, segmentTransform.matrix);
      }
      waterfall.segments.instanceMatrix.needsUpdate = true;

      for (const stream of waterfall.streams) {
        const progress = fraction(elapsed * .78 + stream.phase);
        const streamTrail = curveAmount(progress) * trail;
        const tangentProgress = Math.min(1, progress + .02);
        tangent.set(
          motionX * (curveAmount(tangentProgress) - curveAmount(progress)) * trail,
          -waterfall.height * (tangentProgress - progress),
          motionZ * (curveAmount(tangentProgress) - curveAmount(progress)) * trail,
        ).normalize();
        stream.mesh.position.set(
          waterfall.outlet.x + motionX * streamTrail + stream.acrossX,
          waterfall.topY - progress * waterfall.height,
          waterfall.outlet.z + motionZ * streamTrail + stream.acrossZ,
        );
        stream.mesh.quaternion.setFromUnitVectors(UNIT_Y, tangent);
      }
    }

    for (let index = 0; index < mist.count; index++) {
      const record = mistRecords[index];
      const waterfall = record.waterfall;
      const progress = fraction(record.phase + elapsed * record.speed * (reducedMotion ? .55 : 1));
      const edge = Math.min(1, Math.min(progress, 1 - progress) / .13);
      const envelope = smoothstep01(edge);
      const sourceTrail = curveAmount(record.startProgress) * trail;
      const turbulence = reducedMotion ? 0 :
        Math.sin(progress * TAU * 2 + record.turbulencePhase + elapsed * .7) * record.turbulence * (.55 + gust * .45);
      const along = .08 + progress * record.pathLength * (1 + gust * .12);
      const lateral = record.lateral + turbulence;
      mistTransform.position.set(
        waterfall.outlet.x + motionX * (sourceTrail + along) + lateralX * lateral,
        waterfall.topY - waterfall.height * record.startProgress + Math.sin(progress * Math.PI) * record.lift - progress * record.fall,
        waterfall.outlet.z + motionZ * (sourceTrail + along) + lateralZ * lateral,
      );
      mistTransform.rotation.set(0, 0, 0);
      mistTransform.scale.set(record.sizeX * envelope, record.sizeY * envelope, record.sizeZ * envelope);
      mistTransform.updateMatrix();
      mist.setMatrixAt(index, mistTransform.matrix);
    }
    if (mist.count) mist.instanceMatrix.needsUpdate = true;
  };

  return { mist, update };
}
