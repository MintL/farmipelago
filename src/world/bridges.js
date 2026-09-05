import { MODEL_VOXEL, TILE, THREE, box, createVoxelLantern, mats } from '../core/shared.js';

const BRIDGE_GAP_TILES = 1;
const BRIDGE_WIDTH = TILE * 2;
const BRIDGE_THICKNESS = .18;
const BRIDGE_SEGMENT_LENGTH = .42;
const BRIDGE_ARCH_MIN_RISE = .25;
const BRIDGE_ARCH_MAX_RISE = .6;
const BRIDGE_ARCH_RISE_PER_UNIT = .06;
const BRIDGE_MAX_PITCH = THREE.MathUtils.degToRad(40);
const BRIDGE_RAIL_HEIGHT = .8;
const BRIDGE_RAIL_THICKNESS = MODEL_VOXEL;
const BRIDGE_RAIL_LOWER_Y = .38;
const BRIDGE_RAIL_UPPER_Y = .72;
const BRIDGE_RAIL_POST_SPACING = TILE * 1.15;
const BRIDGE_SHORT_LANTERN_SPAN = TILE * 2.5;
const BRIDGE_OCCLUSION_END_CLEARANCE = TILE * 2.25;
const BRIDGE_OCCLUSION_SIDE_CLEARANCE = TILE * .75;
const BRIDGE_OCCLUSION_HEIGHT_CLEARANCE = TILE * .75;
export const STATIC_LANTERN_LIGHT_RADIUS = 5;
const ease = value => value * value * (3 - 2 * value);

export function reserveBridgeLandings(terrain, gap) {
  if (!gap) return;
  for (const tile of terrain.values()) {
    if (Math.hypot(tile.x - gap.from.x, tile.z - gap.from.z) <= 2.6 * TILE ||
      Math.hypot(tile.x - gap.to.x, tile.z - gap.to.z) <= 2.6 * TILE) {
      tile.noDecoration = true;
    }
  }
}

export function createStaticLanternLighting(lanternPositions, surfaceQuads, radius) {
  const positions = [];
  const colors = [];
  const indices = [];
  const lightColor = new THREE.Color(0xffb653);
  const strengthAt = point => {
    let strength = 0;
    for (const lantern of lanternPositions) {
      const distance = Math.hypot(point.x - lantern.x, point.z - lantern.z);
      if (distance >= radius) continue;
      const falloff = 1 - distance / radius;
      strength += falloff * falloff;
    }
    return Math.min(1.25, strength);
  };

  for (const quad of surfaceQuads) {
    const strengths = quad.map(strengthAt);
    if (Math.max(...strengths) < .002) continue;
    const offset = positions.length / 3;
    quad.forEach((point, index) => {
      const strength = strengths[index];
      positions.push(point.x, point.y, point.z);
      colors.push(lightColor.r * strength, lightColor.g * strength, lightColor.b * strength);
    });
    indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
  }

  if (!indices.length) return { mesh: null, setAmount() {} };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'static-lantern-lighting';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 1;
  mesh.visible = false;
  return {
    mesh,
    setAmount(amount) {
      const strength = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
      material.opacity = strength * .34;
      mesh.visible = strength > .01;
    },
  };
}

export function addBridgeBetween(
  fromIsland,
  toIsland,
  terrain,
  group,
  bridgeBlocks,
  lanternGlowMaterial,
  lanternGlowMeshes,
  lanternPositions,
  lightSurfaceQuads,
) {
  const gap = closestIslandGap(terrain, fromIsland.id, toIsland.id);
  if (!gap || gap.distance / TILE <= BRIDGE_GAP_TILES) return;

  const centerDistance = Math.hypot(gap.to.x - gap.from.x, gap.to.z - gap.from.z);
  const direction = { x: (gap.to.x - gap.from.x) / centerDistance, z: (gap.to.z - gap.from.z) / centerDistance };
  const start = {
    x: gap.from.x + direction.x * TILE * .48,
    y: gap.from.topY,
    z: gap.from.z + direction.z * TILE * .48,
  };
  const end = {
    x: gap.to.x - direction.x * TILE * .48,
    y: gap.to.topY,
    z: gap.to.z - direction.z * TILE * .48,
  };
  const span = Math.hypot(end.x - start.x, end.z - start.z);
  const desiredCrownY = Math.max(start.y, end.y) + THREE.MathUtils.clamp(
    span * BRIDGE_ARCH_RISE_PER_UNIT,
    BRIDGE_ARCH_MIN_RISE,
    BRIDGE_ARCH_MAX_RISE,
  );
  // Smoothstep reaches 1.5 times its average grade. Keep that peak below the
  // character controller's slope limit, with extra margin for plank seams.
  const halfSpan = span * .5;
  const safeHalfRise = Math.tan(BRIDGE_MAX_PITCH) * halfSpan / 1.5;
  const safeCrownY = Math.min(start.y + safeHalfRise, end.y + safeHalfRise);
  const hasCrownedMidpoint = safeCrownY >= Math.max(start.y, end.y) + .04;
  const crownY = hasCrownedMidpoint ? Math.min(desiredCrownY, safeCrownY) : 0;
  const bridgeYAt = progress => {
    if (!hasCrownedMidpoint) {
      const baseY = THREE.MathUtils.lerp(start.y, end.y, progress);
      return baseY + Math.sin(progress * Math.PI) * Math.min(.12, span * .02);
    }
    if (progress <= .5) return THREE.MathUtils.lerp(start.y, crownY, ease(progress * 2));
    return THREE.MathUtils.lerp(crownY, end.y, ease((progress - .5) * 2));
  };
  const pointAt = progress => ({
    x: THREE.MathUtils.lerp(start.x, end.x, progress),
    y: bridgeYAt(progress),
    z: THREE.MathUtils.lerp(start.z, end.z, progress),
  });

  const bridge = new THREE.Group();
  const yaw = Math.atan2(direction.x, direction.z);
  const plankCount = Math.ceil(span / BRIDGE_SEGMENT_LENGTH);
  const segmentPoints = Array.from({ length: plankCount + 1 }, (_, index) => pointAt(index / plankCount));
  const sideDirection = { x: direction.z, z: -direction.x };
  const railOffset = BRIDGE_WIDTH * .5;
  const yawRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const pitchRotation = new THREE.Quaternion();
  const segmentRotation = new THREE.Quaternion();
  const deckUp = new THREE.Vector3();
  const localXAxis = new THREE.Vector3(1, 0, 0);
  const localYAxis = new THREE.Vector3(0, 1, 0);
  bridge.name = 'bridge';
  bridge.userData.occlusionIgnoreAtVehicle = vehicleState => {
    const along = (vehicleState.x - start.x) * direction.x + (vehicleState.z - start.z) * direction.z;
    const lateral = Math.abs((vehicleState.x - start.x) * direction.z - (vehicleState.z - start.z) * direction.x);
    if (along < -BRIDGE_OCCLUSION_END_CLEARANCE || along > span + BRIDGE_OCCLUSION_END_CLEARANCE
      || lateral > BRIDGE_WIDTH * .5 + BRIDGE_OCCLUSION_SIDE_CLEARANCE) return false;
    const deckY = bridgeYAt(THREE.MathUtils.clamp(along / span, 0, 1));
    return Math.abs(vehicleState.y - deckY) <= BRIDGE_OCCLUSION_HEIGHT_CLEARANCE;
  };
  group.add(bridge);
  const railingGroups = new Map();
  for (const side of [-1, 1]) {
    const railing = new THREE.Group();
    railing.name = `bridge-railing-${side < 0 ? 'left' : 'right'}`;
    railingGroups.set(side, railing);
    bridge.add(railing);
  }

  for (let index = 0; index < plankCount; index++) {
    const segmentStart = segmentPoints[index];
    const segmentEnd = segmentPoints[index + 1];
    const x = (segmentStart.x + segmentEnd.x) * .5;
    const y = (segmentStart.y + segmentEnd.y) * .5;
    const z = (segmentStart.z + segmentEnd.z) * .5;
    const horizontalLength = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.z - segmentStart.z);
    const rise = segmentEnd.y - segmentStart.y;
    const pitch = Math.atan2(rise, horizontalLength);
    const plankLength = Math.hypot(horizontalLength, rise) + .035;
    pitchRotation.setFromAxisAngle(localXAxis, -pitch);
    segmentRotation.copy(yawRotation).multiply(pitchRotation);
    deckUp.copy(localYAxis).applyQuaternion(segmentRotation);
    const plank = box(BRIDGE_WIDTH, BRIDGE_THICKNESS, plankLength, index % 2 ? mats.bridge : mats.bridgeDark);
    plank.position.set(
      x - deckUp.x * BRIDGE_THICKNESS * .5,
      y - deckUp.y * BRIDGE_THICKNESS * .5,
      z - deckUp.z * BRIDGE_THICKNESS * .5,
    );
    plank.quaternion.copy(segmentRotation);
    bridge.add(plank);
    lightSurfaceQuads.push([
      new THREE.Vector3(-BRIDGE_WIDTH * .5, BRIDGE_THICKNESS * .5 + .004, -plankLength * .5),
      new THREE.Vector3(BRIDGE_WIDTH * .5, BRIDGE_THICKNESS * .5 + .004, -plankLength * .5),
      new THREE.Vector3(-BRIDGE_WIDTH * .5, BRIDGE_THICKNESS * .5 + .004, plankLength * .5),
      new THREE.Vector3(BRIDGE_WIDTH * .5, BRIDGE_THICKNESS * .5 + .004, plankLength * .5),
    ].map(position => position.applyQuaternion(segmentRotation).add(plank.position)));
    bridgeBlocks.push({
      x: plank.position.x,
      y: plank.position.y,
      z: plank.position.z,
      width: BRIDGE_WIDTH,
      height: BRIDGE_THICKNESS,
      depth: plankLength,
      rotation: { x: segmentRotation.x, y: segmentRotation.y, z: segmentRotation.z, w: segmentRotation.w },
    });

    for (const side of [-1, 1]) {
      for (const railY of [BRIDGE_RAIL_LOWER_Y, BRIDGE_RAIL_UPPER_Y]) {
        const rail = box(BRIDGE_RAIL_THICKNESS, BRIDGE_RAIL_THICKNESS, plankLength, mats.bridgeDark);
        rail.name = `bridge-railing-${side < 0 ? 'left' : 'right'}-rail`;
        rail.position.set(
          x + sideDirection.x * railOffset * side,
          y + railY,
          z + sideDirection.z * railOffset * side,
        );
        rail.quaternion.copy(segmentRotation);
        railingGroups.get(side).add(rail);
      }
      bridgeBlocks.push({
        x: x + sideDirection.x * railOffset * side,
        y: Math.min(segmentStart.y, segmentEnd.y) + (BRIDGE_RAIL_HEIGHT + Math.abs(rise)) * .5,
        z: z + sideDirection.z * railOffset * side,
        width: BRIDGE_RAIL_THICKNESS,
        height: BRIDGE_RAIL_HEIGHT + Math.abs(rise),
        depth: horizontalLength + .035,
        rotation: { x: yawRotation.x, y: yawRotation.y, z: yawRotation.z, w: yawRotation.w },
      });
    }
  }

  const postProgress = new Set([0, .5, 1]);
  const postSections = Math.max(1, Math.ceil(span / BRIDGE_RAIL_POST_SPACING));
  for (let index = 1; index < postSections; index++) postProgress.add(index / postSections);
  for (const progress of [...postProgress].sort((first, second) => first - second)) {
    const point = pointAt(progress);
    for (const side of [-1, 1]) {
      const post = box(BRIDGE_RAIL_THICKNESS, BRIDGE_RAIL_HEIGHT, BRIDGE_RAIL_THICKNESS, mats.bridgeDark);
      post.name = `bridge-railing-${side < 0 ? 'left' : 'right'}-post`;
      post.position.set(
        point.x + sideDirection.x * railOffset * side,
        point.y + BRIDGE_RAIL_HEIGHT * .5,
        point.z + sideDirection.z * railOffset * side,
      );
      post.rotation.y = yaw;
      railingGroups.get(side).add(post);
    }
  }

  const lanternPlacements = span < BRIDGE_SHORT_LANTERN_SPAN
    ? [[0, -1]]
    : [[0, -1], [0, 1], [1, -1], [1, 1]];
  for (const [progress, side] of lanternPlacements) {
    const point = pointAt(progress);
    const endName = progress === 0 ? 'start' : 'end';
    const sideName = side < 0 ? 'left' : 'right';
    const { group: lantern, glowMesh } = createVoxelLantern({
      glowMaterial: lanternGlowMaterial,
      name: `bridge-${fromIsland.id}-${toIsland.id}-${endName}-${sideName}-lantern`,
    });
    lantern.position.set(
      point.x + sideDirection.x * railOffset * side,
      point.y + BRIDGE_RAIL_HEIGHT + MODEL_VOXEL,
      point.z + sideDirection.z * railOffset * side,
    );
    lantern.rotation.y = yaw;
    lanternPositions.push(lantern.position.clone().add(new THREE.Vector3(0, .1, 0)));
    lanternGlowMeshes.push(glowMesh);
    railingGroups.get(side).add(lantern);
  }
}

export function closestIslandGap(terrain, fromId, toId) {
  const fromTiles = [];
  const toTiles = [];
  for (const tile of terrain.values()) {
    if (tile.water) continue;
    if (tile.islandId === fromId) fromTiles.push(tile);
    else if (tile.islandId === toId) toTiles.push(tile);
  }

  let closest = null;
  for (const from of fromTiles) {
    for (const to of toTiles) {
      const distance = tileEdgeDistance(from, to);
      if (!closest || distance < closest.distance) {
        closest = { from, to, distance };
      }
    }
  }
  return closest;
}

function tileEdgeDistance(first, second) {
  const dx = Math.max(0, Math.abs(first.x - second.x) - TILE);
  const dz = Math.max(0, Math.abs(first.z - second.z) - TILE);
  return Math.hypot(dx, dz);
}
