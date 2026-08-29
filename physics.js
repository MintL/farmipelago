import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm';
import { GRASS_TOP, LAYER_DEPTH, SOIL_DEPTH, TILE, gridKey } from './shared.js';

const FIXED_TIMESTEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;
const GRAVITY = -18;
const GROUND_SPEED = 6.4;
const AIR_SPEED = 4.1;
const GROUND_ACCELERATION = 36;
const AIR_ACCELERATION = 11;
const JUMP_SPEED = 10.5;
const JUMP_BUFFER_TIME = 0.14;
const CONTACT_GRACE_TIME = 0.11;
const TRACTOR_COLLIDER_RADIUS = 0.44;
const TRACTOR_CAPSULE_HALF_HEIGHT = 0.20;
const TRACTOR_COLLIDER_CENTER_Y = TRACTOR_CAPSULE_HALF_HEIGHT + TRACTOR_COLLIDER_RADIUS;

export async function createPhysics() {
  await RAPIER.init({});
  return new FarmPhysics();
}

class FarmPhysics {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = FIXED_TIMESTEP;
    this.staticColliders = [];
    this.tractorBody = null;
    this.tractorCollider = null;
    this.characterController = this.world.createCharacterController(0.03);
    this.characterController.enableSnapToGround(0.28);
    this.characterController.setMaxSlopeClimbAngle(Math.PI * 0.28);
    this.characterController.setMinSlopeSlideAngle(Math.PI * 0.34);
    this.characterController.setSlideEnabled(true);
    this.accumulator = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.measuredVelocity = { x: 0, y: 0, z: 0 };
    this.driveDirection = { x: 0, z: -1 };
    this.driveStrength = 0;
    this.jumpBuffer = 0;
    this.groundGrace = 0;
    this.wallGrace = 0;
    this.grounded = false;
    this.touchingWall = false;
  }

  rebuildStaticColliders(terrain, obstacles, lowerBlocks = [], bridgeBlocks = []) {
    for (const collider of this.staticColliders) this.world.removeCollider(collider, true);
    this.staticColliders = [];

    const terrainMesh = buildTerrainMesh(terrain);
    this.addStaticMesh(terrainMesh.vertices, terrainMesh.indices, 0.72);

    const undersideMesh = buildBlockMesh(lowerBlocks);
    this.addStaticMesh(undersideMesh.vertices, undersideMesh.indices, 0.82);

    for (const bridge of bridgeBlocks) {
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(bridge.width * .5, bridge.height * .5, bridge.depth * .5)
          .setTranslation(bridge.x, bridge.y, bridge.z)
          .setRotation({ x: 0, y: Math.sin(bridge.yaw * .5), z: 0, w: Math.cos(bridge.yaw * .5) })
          .setFriction(0.9)
          .setRestitution(0)
      );
      this.staticColliders.push(collider);
    }

    for (const obstacle of obstacles) {
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cylinder(obstacle.height * 0.5, obstacle.radius)
          .setTranslation(obstacle.x, obstacle.y + obstacle.height * 0.5, obstacle.z)
          .setFriction(0.9)
          .setRestitution(0)
      );
      this.staticColliders.push(collider);
    }
    // Rapier refreshes its spatial query pipeline during a world step. Static
    // geometry is already motionless, so this is safe and makes regenerated
    // terrain available to the character controller immediately.
    this.world.step();
  }

  addStaticMesh(vertices, indices, friction) {
    if (!indices.length) return;
    const flags = (RAPIER.TriMeshFlags?.FIX_INTERNAL_EDGES ?? 0)
      | (RAPIER.TriMeshFlags?.MERGE_DUPLICATE_VERTICES ?? 0);
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(vertices),
        new Uint32Array(indices),
        flags
      ).setFriction(friction).setRestitution(0)
    );
    this.staticColliders.push(collider);
  }

  createTractor(spawn) {
    if (this.tractorBody) this.world.removeRigidBody(this.tractorBody);

    this.tractorBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(spawn.x, spawn.y + 0.02, spawn.z)
    );
    this.tractorCollider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(TRACTOR_CAPSULE_HALF_HEIGHT, TRACTOR_COLLIDER_RADIUS)
        .setTranslation(0, TRACTOR_COLLIDER_CENTER_Y, 0)
        .setFriction(0)
        .setRestitution(0),
      this.tractorBody
    );
    this.world.propagateModifiedBodyPositionsToColliders();
    this.clearMotion();
  }

  resetTractor(spawn) {
    this.tractorBody.setTranslation({ x: spawn.x, y: spawn.y + 0.02, z: spawn.z }, true);
    this.tractorBody.setNextKinematicTranslation({ x: spawn.x, y: spawn.y + 0.02, z: spawn.z });
    this.world.propagateModifiedBodyPositionsToColliders();
    this.clearMotion();
  }

  clearMotion() {
    this.accumulator = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.measuredVelocity = { x: 0, y: 0, z: 0 };
    this.jumpBuffer = 0;
    this.groundGrace = 0;
    this.wallGrace = 0;
    this.grounded = false;
    this.touchingWall = false;
  }

  drive(_dt, direction, strength, jump) {
    const length = Math.hypot(direction.x, direction.z);
    if (length > 0.001) {
      this.driveDirection.x = direction.x / length;
      this.driveDirection.z = direction.z / length;
    }
    this.driveStrength = Math.max(0, Math.min(1, strength));
    if (jump) this.jumpBuffer = JUMP_BUFFER_TIME;
  }

  step(dt) {
    this.accumulator = Math.min(this.accumulator + Math.min(dt, MAX_FRAME_TIME), MAX_FRAME_TIME);
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.fixedStep(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }
  }

  fixedStep(dt) {
    if (!this.tractorBody || !this.tractorCollider) return;

    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.groundGrace = Math.max(0, this.groundGrace - dt);
    this.wallGrace = Math.max(0, this.wallGrace - dt);

    const supported = this.grounded || this.groundGrace > 0;
    const targetSpeed = (supported ? GROUND_SPEED : AIR_SPEED) * this.driveStrength;
    const acceleration = supported ? GROUND_ACCELERATION : AIR_ACCELERATION;
    this.velocity.x = approach(this.velocity.x, this.driveDirection.x * targetSpeed, acceleration * dt);
    this.velocity.z = approach(this.velocity.z, this.driveDirection.z * targetSpeed, acceleration * dt);

    const canJump = supported || this.touchingWall || this.wallGrace > 0;
    if (this.jumpBuffer > 0 && canJump) {
      this.velocity.y = JUMP_SPEED;
      if (!supported) {
        this.velocity.x += this.driveDirection.x * 2.4;
        this.velocity.z += this.driveDirection.z * 2.4;
      }
      this.jumpBuffer = 0;
      this.grounded = false;
      this.groundGrace = 0;
    } else if (supported && this.velocity.y <= 0) {
      // A small downward motion keeps snap-to-ground and edge detection active.
      this.velocity.y = -1;
    } else {
      this.velocity.y += GRAVITY * dt;
    }

    const desiredMovement = {
      x: this.velocity.x * dt,
      y: this.velocity.y * dt,
      z: this.velocity.z * dt,
    };
    const before = this.tractorBody.translation();
    this.characterController.computeColliderMovement(this.tractorCollider, desiredMovement);
    const movement = this.characterController.computedMovement();

    this.grounded = this.characterController.computedGrounded();
    this.touchingWall = false;
    for (let i = 0; i < this.characterController.numComputedCollisions(); i++) {
      const collision = this.characterController.computedCollision(i);
      if (collision.normal1.y > 0.62) {
        this.grounded = true;
      } else if (Math.abs(collision.normal1.y) < 0.55) {
        this.touchingWall = true;
      }
    }
    if (this.grounded) this.groundGrace = CONTACT_GRACE_TIME;
    if (this.touchingWall) this.wallGrace = CONTACT_GRACE_TIME;

    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
    if (Math.abs(movement.y - desiredMovement.y) > 0.002 && this.velocity.y > 0) this.velocity.y = 0;

    this.tractorBody.setNextKinematicTranslation({
      x: before.x + movement.x,
      y: before.y + movement.y,
      z: before.z + movement.z,
    });
    this.world.step();
    this.measuredVelocity = {
      x: movement.x / dt,
      y: movement.y / dt,
      z: movement.z / dt,
    };
  }

  tractorState() {
    const position = this.tractorBody.translation();
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      speed: Math.hypot(this.measuredVelocity.x, this.measuredVelocity.z),
      verticalSpeed: this.measuredVelocity.y,
      grounded: this.grounded,
      touchingWall: this.touchingWall,
    };
  }
}

function approach(value, target, amount) {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}

function createMeshBuilder() {
  const vertices = [];
  const indices = [];
  const vertexMap = new Map();
  const vertex = point => {
    const key = `${point[0].toFixed(4)},${point[1].toFixed(4)},${point[2].toFixed(4)}`;
    let index = vertexMap.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      vertices.push(point[0], point[1], point[2]);
      vertexMap.set(key, index);
    }
    return index;
  };
  return {
    vertices,
    indices,
    quad(a, b, c, d) {
      const ia = vertex(a), ib = vertex(b), ic = vertex(c), id = vertex(d);
      indices.push(ia, ib, ic, ia, ic, id);
    },
  };
}

function buildTerrainMesh(terrain) {
  const mesh = createMeshBuilder();
  const half = TILE * 0.5;
  for (const tile of terrain.values()) {
    const x0 = tile.x - half, x1 = tile.x + half;
    const z0 = tile.z - half, z1 = tile.z + half;
    const top = tile.topY;
    const bottom = tile.baseY - SOIL_DEPTH - GRASS_TOP;

    mesh.quad([x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0]);
    mesh.quad([x0, bottom, z0], [x1, bottom, z0], [x1, bottom, z1], [x0, bottom, z1]);

    const east = terrain.get(gridKey(tile.gx + 1, tile.gz));
    const west = terrain.get(gridKey(tile.gx - 1, tile.gz));
    const south = terrain.get(gridKey(tile.gx, tile.gz + 1));
    const north = terrain.get(gridKey(tile.gx, tile.gz - 1));
    if (!east || east.topY < top - 0.001) {
      const low = east ? east.topY : bottom;
      mesh.quad([x1, low, z0], [x1, top, z0], [x1, top, z1], [x1, low, z1]);
    }
    if (!west || west.topY < top - 0.001) {
      const low = west ? west.topY : bottom;
      mesh.quad([x0, low, z0], [x0, low, z1], [x0, top, z1], [x0, top, z0]);
    }
    if (!south || south.topY < top - 0.001) {
      const low = south ? south.topY : bottom;
      mesh.quad([x0, low, z1], [x1, low, z1], [x1, top, z1], [x0, top, z1]);
    }
    if (!north || north.topY < top - 0.001) {
      const low = north ? north.topY : bottom;
      mesh.quad([x0, low, z0], [x0, top, z0], [x1, top, z0], [x1, low, z0]);
    }
  }
  return mesh;
}

function buildBlockMesh(blocks) {
  const mesh = createMeshBuilder();
  const occupied = new Set(blocks.map(block => blockKey(block.x, block.y, block.z)));
  for (const block of blocks) {
    const halfX = TILE * 0.5;
    const halfY = LAYER_DEPTH * 0.5;
    const halfZ = TILE * 0.5;
    const x0 = block.x - halfX, x1 = block.x + halfX;
    const y0 = block.y - halfY, y1 = block.y + halfY;
    const z0 = block.z - halfZ, z1 = block.z + halfZ;
    const empty = (dx, dy, dz) => !occupied.has(blockKey(block.x + dx, block.y + dy, block.z + dz));

    if (empty(0, LAYER_DEPTH, 0)) mesh.quad([x0,y1,z0], [x0,y1,z1], [x1,y1,z1], [x1,y1,z0]);
    if (empty(0, -LAYER_DEPTH, 0)) mesh.quad([x0,y0,z0], [x1,y0,z0], [x1,y0,z1], [x0,y0,z1]);
    if (empty(TILE, 0, 0)) mesh.quad([x1,y0,z0], [x1,y1,z0], [x1,y1,z1], [x1,y0,z1]);
    if (empty(-TILE, 0, 0)) mesh.quad([x0,y0,z0], [x0,y0,z1], [x0,y1,z1], [x0,y1,z0]);
    if (empty(0, 0, TILE)) mesh.quad([x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1]);
    if (empty(0, 0, -TILE)) mesh.quad([x0,y0,z0], [x0,y1,z0], [x1,y1,z0], [x1,y0,z0]);
  }
  return mesh;
}

function blockKey(x, y, z) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}
