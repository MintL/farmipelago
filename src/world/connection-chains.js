import { LEVEL_HEIGHT, MODEL_VOXEL, TILE, THREE, gridKey } from '../core/shared.js';

// Two exposed shore-face anchors straddle each bridge. Use the authored tile
// edge, rather than burying the chain endpoint inside a terrain tile's center.
export function attachmentChainPairs(terrain, incoming, placement) {
  const face = (tiles, islandId, near, toward) => {
    let best = null, bestScore = Infinity;
    for (const tile of tiles.values()) {
      if (tile.islandId !== islandId || Math.abs(tile.topY - near.y) > .6) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (tiles.has(gridKey(tile.gx + dx, tile.gz + dz))) continue;
        const point = new THREE.Vector3(tile.x + dx * TILE * .5, tile.topY - .65, tile.z + dz * TILE * .5);
        if ((toward.x - point.x) * dx + (toward.z - point.z) * dz <= 0) continue;
        const score = (point.x - near.x) ** 2 + (point.z - near.z) ** 2;
        if (score < bestScore) { best = point; bestScore = score; }
      }
    }
    return best;
  };
  return placement.gaps.flatMap(gap => {
    const along = new THREE.Vector3(gap.to.x - gap.from.x, 0, gap.to.z - gap.from.z).normalize();
    const side = new THREE.Vector3(-along.z, 0, along.x);
    return [-1, 1].map(sign => {
      const from = new THREE.Vector3(gap.from.x, gap.from.topY, gap.from.z).addScaledVector(side, sign * TILE * 1.5);
      const to = new THREE.Vector3(gap.to.x, gap.to.topY, gap.to.z).addScaledVector(side, sign * TILE * 1.5);
      const start = face(terrain, gap.from.islandId, from, to)
        || new THREE.Vector3(gap.from.x, gap.from.topY - .65, gap.from.z).addScaledVector(along, TILE * .5);
      const localTo = to.clone().sub(new THREE.Vector3(placement.x, 0, placement.z));
      const localFrom = from.clone().sub(new THREE.Vector3(placement.x, 0, placement.z));
      const end = face(incoming, gap.to.islandId, localTo, localFrom);
      return { start, end: end ? end.add(new THREE.Vector3(placement.x, 0, placement.z))
        : new THREE.Vector3(gap.to.x, gap.to.topY - .65, gap.to.z).addScaledVector(along, -TILE * .5) };
    });
  });
}

// Measure the full island width, then follow its facing perimeter at chain height.
function perimeterAnchor(blocks, terrain, tile, fraction, towardZ) {
  const tiles = [...terrain.values()].filter(candidate => candidate.islandId === tile.islandId);
  const minX = Math.min(...tiles.map(candidate => candidate.x - TILE * .5));
  const maxX = Math.max(...tiles.map(candidate => candidate.x + TILE * .5));
  const targetX = THREE.MathUtils.lerp(minX, maxX, fraction);
  const targetY = tile.topY - 2.5 + LEVEL_HEIGHT;
  const islandBlocks = blocks.filter(block => block.islandId === tile.islandId);
  const levelDistance = Math.min(...islandBlocks.map(block => Math.abs(block.y - targetY)));
  const level = islandBlocks.filter(block => Math.abs(block.y - targetY) <= levelDistance + .001);
  let anchor = null;
  for (const block of level) {
    const distance = Math.abs(block.x - targetX);
    const bestDistance = anchor ? Math.abs(anchor.x - targetX) : Infinity;
    if (distance < bestDistance - .001 || Math.abs(distance - bestDistance) < .001
      && (!anchor || towardZ * block.z > towardZ * anchor.z)) anchor = block;
  }
  // The outermost cell in the selected column faces the other island.
  return anchor ? new THREE.Vector3(anchor.x, anchor.y, anchor.z + towardZ * anchor.depth * .48)
    : new THREE.Vector3(targetX, targetY, tile.z);
}

export function createConnectionChains(group, gap, lowerBlocks, terrain, incomingSide = 'from') {
  const pairs = [.25, .75].map(fraction => ({
    start: perimeterAnchor(lowerBlocks, terrain, gap.to, fraction, 1),
    end: perimeterAnchor(lowerBlocks, terrain, gap.from, fraction, -1),
  }));
  if (incomingSide === 'to') pairs.forEach(pair => { [pair.start, pair.end] = [pair.end, pair.start]; });
  const chains = createAnchorChains(group, pairs);
  return { update(farmOffsetZ, extension) { chains.update(new THREE.Vector3(0, 0, farmOffsetZ), extension); } };
}

// Shared voxel links; arbitrary world anchors support connections on every shore.
export function createAnchorChains(group, pairs) {
  const root = new THREE.Group();
  root.name = 'island-connection-chains';
  group.add(root);
  const material = new THREE.MeshStandardMaterial({ color: 0x85959b, metalness: .65, roughness: .48 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const maxLinks = 160;
  const chains = pairs.map(pair => {
    const mesh = new THREE.InstancedMesh(geometry, material, maxLinks * 4);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    root.add(mesh);
    return {
      mesh,
      start: pair.start,
      end: pair.end,
    };
  });
  const transform = new THREE.Object3D();
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const end = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 0, 1);
  const twist = new THREE.Quaternion();
  const orientation = new THREE.Quaternion();
  const offset = new THREE.Vector3();
  const length = MODEL_VOXEL * 1.8;
  const width = MODEL_VOXEL;
  const thickness = MODEL_VOXEL * .3;
  return {
    dispose() { root.removeFromParent(); geometry.dispose(); material.dispose(); },
    update(offsetPosition, extension, tension = 0) {
      root.visible = extension > 0;
      for (const chain of chains) {
        end.copy(chain.end);
        end.add(offsetPosition);
        const distance = chain.start.distanceTo(end);
        const links = Math.min(maxLinks, Math.max(2, Math.ceil(distance / (length * .72))));
        const visibleLinks = Math.floor(links * extension);
        const sag = THREE.MathUtils.lerp(Math.min(1.5, distance * .12), .08, tension);
        for (let index = 0; index < visibleLinks; index++) {
          const t = (index + .5) / links;
          point.lerpVectors(chain.start, end, t);
          point.y -= Math.sin(t * Math.PI) * sag;
          tangent.subVectors(end, chain.start);
          tangent.y -= Math.cos(t * Math.PI) * Math.PI * sag;
          orientation.setFromUnitVectors(axis, tangent.normalize());
          twist.setFromAxisAngle(axis, index % 2 ? Math.PI * .5 : 0);
          orientation.multiply(twist);
          for (let bar = 0; bar < 4; bar++) {
            const long = bar < 2;
            offset.set(long ? (bar ? 1 : -1) * width * .5 : 0, 0,
              long ? 0 : (bar === 2 ? -1 : 1) * length * .5);
            transform.position.copy(offset.applyQuaternion(orientation)).add(point);
            transform.quaternion.copy(orientation);
            transform.scale.set(long ? thickness : width + thickness, thickness, long ? length : thickness);
            transform.updateMatrix();
            chain.mesh.setMatrixAt(index * 4 + bar, transform.matrix);
          }
        }
        chain.mesh.count = visibleLinks * 4;
        chain.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
