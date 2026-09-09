import { THREE } from '../../core/shared.js';
import { TRAVEL_DIRECTION } from '../travel.js';

const DISTANT_CLOUD_COUNT = 216;
const NEAR_CLOUD_COUNT = 24;
const DISTANT_SPEED = .78;
const NEAR_SPEED = 1.9;
const REDUCED_NEAR_SPEED = 1.02;

function silhouetteLayer(rows, y, scaleY) {
  if (!rows.length) return [];
  const width = Math.max(...rows.map(row => row.length));
  const depth = rows.length;
  const parts = [];
  rows.forEach((source, z) => {
    const row = source.padEnd(width, '.');
    let start = -1;
    for (let x = 0; x <= width; x++) {
      if (row[x] === '#' && start < 0) start = x;
      if ((row[x] !== '#' || x === width) && start >= 0) {
        const length = x - start;
        parts.push([
          (start + length * .5) / width - .5,
          y,
          (z + .5) / depth - .5,
          length / width * 1.04,
          scaleY,
          1 / depth * 1.08,
        ]);
        start = -1;
      }
    }
  });
  return parts;
}

const voxelCloud = (base, crown, cap = []) => [
  ...silhouetteLayer(base, -.10, .65),
  ...silhouetteLayer(crown, .24, .50),
  ...silhouetteLayer(cap, .49, .34),
];

const DISTANT_SILHOUETTES = [
  voxelCloud(
    ['..###...', '.######.', '########', '..#####.'],
    ['........', '..###...', '.#####..', '........'],
  ),
  voxelCloud(
    ['...###..', '.######.', '#######.', '.####...'],
    ['........', '...##...', '..####..', '........'],
  ),
  voxelCloud(
    ['..##....', '.######.', '####.###', '..#####.'],
    ['........', '..####..', '.###....', '........'],
  ),
];

const NEAR_SILHOUETTES = [
  voxelCloud(
    ['....#####...', '..#########.', '.###########', '###########.', '..#######...'],
    ['............', '....#####...', '..########..', '...######...', '............'],
    ['............', '............', '....####....', '............', '............'],
  ),
  voxelCloud(
    ['...####......', '.##########..', '######.######', '.###########.', '....######...'],
    ['.............', '....#####....', '..########...', '....#####....', '.............'],
    ['.............', '.............', '.....###.....', '.............', '.............'],
  ),
  voxelCloud(
    ['.....####.....', '..##########..', '.############.', '#############.', '..##########..', '....######....'],
    ['..............', '.....####.....', '...########...', '..#########...', '.....####.....', '..............'],
    ['..............', '..............', '.....#####....', '......###.....', '..............', '..............'],
  ),
  voxelCloud(
    ['....####.......', '..##########...', '.######.#######', '##############.', '..############.', '.....#######...'],
    ['...............', '.....#####.....', '...#########...', '..####.#####...', '.....#####.....', '...............'],
    ['...............', '...............', '.....#####.....', '......####.....', '...............', '...............'],
  ),
];

const hash01 = (index, salt) => {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
};

const wrappedCoordinate = (value, halfSpan) => {
  const span = halfSpan * 2;
  return ((value + halfSpan) % span + span) % span - halfSpan;
};

function spacedPositions(count, salt, wideGapIndexes = []) {
  const gaps = Array.from({ length: count }, (_, index) => {
    const gap = .52 + hash01(index, salt) * 1.08;
    return wideGapIndexes.includes(index) ? gap * 2.15 : gap;
  });
  const total = gaps.reduce((sum, gap) => sum + gap, 0);
  const positions = [];
  let cursor = 0;
  for (const gap of gaps) {
    positions.push(-1 + (cursor + gap * .5) / total * 2);
    cursor += gap;
  }
  return positions;
}

function createCloudRecords({ count, salt, silhouettes, near = false }) {
  const positions = spacedPositions(count, salt, near ? [2, 7] : [13, 38, 59]);
  const lateralPositions = spacedPositions(count, salt + 97);
  let instanceCount = 0;
  const clouds = positions.map((s, index) => {
    const silhouette = silhouettes[Math.floor(hash01(index, salt + 1) * silhouettes.length)];
    const broadLane = 14 + hash01(index, salt + 2) * 19;
    const laneSign = hash01(index, salt + 3) < .5 ? -1 : 1;
    const crossesIsland = near && (index === 1 || index === 5 || index === 8);
    const lane = near
      ? (crossesIsland ? (hash01(index, salt + 4) - .5) * 13 : laneSign * broadLane)
      : (hash01(index, salt + 4) - .5) * 76;
    const scale = near ? .92 + hash01(index, salt + 5) * .34 : .82 + hash01(index, salt + 5) * .38;
    const width = (near ? 18 + hash01(index, salt + 6) * 7 : 5.2 + hash01(index, salt + 6) * 2) * scale;
    const height = (near ? 3 + hash01(index, salt + 7) * 1.4 : 1.4 + hash01(index, salt + 7) * .7) * scale;
    const depth = (near ? 7.2 + hash01(index, salt + 8) * 3.8 : 2.5 + hash01(index, salt + 8) * 1.3) * scale;
    const cloud = {
      s,
      lane,
      homeX: s,
      homeZ: lateralPositions[(index * (near ? 7 : 79)) % count],
      y: near ? -4.2 - hash01(index, salt + 9) * 3.8 : -18 - hash01(index, salt + 9) * 12,
      width,
      height,
      depth,
      silhouette,
      instanceStart: instanceCount,
      bobPhase: hash01(index, salt + 10) * Math.PI * 2,
      bobSpeed: .18 + hash01(index, salt + 11) * .12,
      bobAmount: near ? .08 + hash01(index, salt + 12) * .08 : .05 + hash01(index, salt + 12) * .07,
    };
    instanceCount += silhouette.length;
    return cloud;
  });
  return { clouds, instanceCount };
}

function createBand({ name, material, records, geometry }) {
  const mesh = new THREE.InstancedMesh(geometry, material, records.instanceCount);
  mesh.name = `${name}-clouds`;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return { ...records, mesh };
}

export function createCloudSystem({ reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'travel-clouds';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const distantMaterial = new THREE.MeshLambertMaterial({
    color: 0xf7fbfa,
    fog: true,
  });
  const nearMaterial = new THREE.MeshLambertMaterial({
    color: 0xf7fbfa,
    fog: true,
  });
  const distant = createBand({
    name: 'distant',
    material: distantMaterial,
    records: createCloudRecords({
      count: DISTANT_CLOUD_COUNT,
      salt: 41,
      silhouettes: DISTANT_SILHOUETTES,
    }),
    geometry,
  });
  const near = createBand({
    name: 'near',
    material: nearMaterial,
    records: createCloudRecords({
      count: NEAR_CLOUD_COUNT,
      salt: 173,
      silhouettes: NEAR_SILHOUETTES,
      near: true,
    }),
    geometry,
  });
  distant.mesh.renderOrder = 1;
  near.mesh.renderOrder = 2;
  group.add(distant.mesh, near.mesh);

  const transform = new THREE.Object3D();
  const frame = { centerX: 0, centerZ: 0, halfTravelSpan: 180 };

  const positionBand = (band, elapsed, offsetX, offsetZ, speed) => {
    for (const cloud of band.clouds) {
      // Fixed two-dimensional distribution; changing flow translates, never rotates it.
      const x = frame.centerX + wrappedCoordinate(cloud.homeX * frame.halfTravelSpan - offsetX * speed, frame.halfTravelSpan);
      const z = frame.centerZ + wrappedCoordinate(cloud.homeZ * frame.halfTravelSpan - offsetZ * speed, frame.halfTravelSpan);
      const y = cloud.y + (reducedMotion ? 0 : Math.sin(elapsed * cloud.bobSpeed + cloud.bobPhase) * cloud.bobAmount);
      for (let lobeIndex = 0; lobeIndex < cloud.silhouette.length; lobeIndex++) {
        const [offsetX, offsetY, offsetZ, scaleX, scaleY, scaleZ] = cloud.silhouette[lobeIndex];
        const localX = offsetX * cloud.width;
        const localZ = offsetZ * cloud.depth;
        transform.position.set(
          x + localX,
          y + offsetY * cloud.height,
          z + localZ,
        );
        transform.rotation.set(0, 0, 0);
        transform.scale.set(cloud.width * scaleX, cloud.height * scaleY, cloud.depth * scaleZ);
        transform.updateMatrix();
        band.mesh.setMatrixAt(cloud.instanceStart + lobeIndex, transform.matrix);
      }
    }
    band.mesh.instanceMatrix.needsUpdate = true;
  };

  const update = (elapsed, travelState) => {
    const offsetX = travelState?.offsetX ?? TRAVEL_DIRECTION.x * (travelState?.distance || 0);
    const offsetZ = travelState?.offsetZ ?? TRAVEL_DIRECTION.z * (travelState?.distance || 0);
    positionBand(distant, elapsed, offsetX, offsetZ, DISTANT_SPEED);
    positionBand(near, elapsed, offsetX, offsetZ, reducedMotion ? REDUCED_NEAR_SPEED : NEAR_SPEED);
  };

  return {
    group,
    applyPalette(horizon, cloudWhite) {
      distantMaterial.color.copy(horizon).lerp(cloudWhite, .34);
      nearMaterial.color.copy(horizon).lerp(cloudWhite, reducedMotion ? .42 : .52);
    },
    setTravelFrame(nextFrame, elapsed, travelState) {
      frame.centerX = Number(nextFrame?.centerX) || 0;
      frame.centerZ = Number(nextFrame?.centerZ) || 0;
      const projectedExtent = ((Number(nextFrame?.extentX) || 0) + (Number(nextFrame?.extentZ) || 0)) * Math.SQRT1_2;
      frame.halfTravelSpan = Math.max(180, projectedExtent * .5 + 130);
      update(elapsed, travelState);
    },
    update,
  };
}
