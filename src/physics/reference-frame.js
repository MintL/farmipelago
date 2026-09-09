import RAPIER from '@dimforge/rapier3d-compat';

// Gameplay/rendering keep their persistent world coordinates. Rapier runs in a
// translating frame whose selected island is fixed. Changing frames changes
// velocities, never positions, so landing cannot teleport any world object.
export class IslandReferenceFrame {
  constructor() {
    this.origin = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.bodies = new Map();
    this.activeHandle = null;
  }

  toPhysics(position) {
    return { x: position.x - this.origin.x, y: position.y, z: position.z - this.origin.z };
  }

  toWorld(position) {
    return { x: position.x + this.origin.x, y: position.y, z: position.z + this.origin.z };
  }

  add(body) {
    this.bodies.set(body.handle, { body, velocity: { x: 0, y: 0, z: 0 } });
    this.apply(body.handle);
  }

  setVelocity(body, velocity) {
    const record = this.bodies.get(body.handle);
    if (!record) return;
    if (record.velocity.x === velocity.x && record.velocity.y === velocity.y && record.velocity.z === velocity.z) return;
    Object.assign(record.velocity, velocity);
    this.apply(body.handle);
  }

  select(handle) {
    const next = this.bodies.get(handle);
    if (!next) return null;
    if (this.activeHandle === handle && next.velocity.x === this.velocity.x
      && next.velocity.z === this.velocity.z) return null;
    const delta = { x: next.velocity.x - this.velocity.x, y: 0, z: next.velocity.z - this.velocity.z };
    this.activeHandle = handle;
    Object.assign(this.velocity, next.velocity);
    for (const key of this.bodies.keys()) this.apply(key);
    return delta;
  }

  apply(handle) {
    const { body, velocity } = this.bodies.get(handle);
    const relative = { x: velocity.x - this.velocity.x, y: velocity.y, z: velocity.z - this.velocity.z };
    const type = relative.x === 0 && relative.y === 0 && relative.z === 0
      ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.KinematicVelocityBased;
    // Clear a former moving body's velocity before fixing it; fixed bodies do
    // not accept velocity changes on every Rapier code path.
    if (type === RAPIER.RigidBodyType.Fixed && body.isKinematic()) body.setLinvel(relative, true);
    if (body.bodyType() !== type) body.setBodyType(type, true);
    body.setLinvel(relative, true);
  }

  advance(dt) {
    this.origin.x += this.velocity.x * dt;
    this.origin.z += this.velocity.z * dt;
  }
}
