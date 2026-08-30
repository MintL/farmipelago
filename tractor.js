import { box, mats, THREE } from './shared.js';

export function createTractor(scene) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  const wheels = [];
  let wasGrounded = false;
  let lastVerticalSpeed = 0;
  let landingSquash = 0;
  root.scale.setScalar(.92);
  root.add(visual);
  scene.add(root);

  const chassis = box(.98, .18, 1.36, mats.tractorDark); chassis.position.y = .4; visual.add(chassis);
  const body = box(.94, .42, 1.22, mats.tractor); body.position.y = .61; visual.add(body);
  const hood = box(.88, .38, .7, mats.tractorAccent); hood.position.set(0, .83, -.54); visual.add(hood);
  const hoodStripe = box(.58, .045, .74, mats.tractorCream); hoodStripe.position.set(0, 1.04, -.54); visual.add(hoodStripe);
  const grille = box(.58, .24, .045, mats.tractorDark); grille.position.set(0, .79, -.913); visual.add(grille);
  for (const x of [-.28, .28]) {
    const lamp = box(.16, .14, .055, mats.headlamp); lamp.position.set(x, .86, -.94); visual.add(lamp);
  }

  const cab = new THREE.Group();
  cab.position.z = .26;
  visual.add(cab);
  const roof = box(.92, .13, .75, mats.tractorCream); roof.position.set(0, 1.52, 0); cab.add(roof);
  for (const x of [-.37, .37]) for (const z of [-.25, .25]) {
    const post = box(.09, .76, .09, mats.tractorDark); post.position.set(x, 1.15, z); cab.add(post);
  }
  const windscreen = box(.64, .53, .035, mats.cab, false); windscreen.position.set(0, 1.19, -.265); cab.add(windscreen);
  const backWindow = box(.64, .53, .035, mats.cab, false); backWindow.position.set(0, 1.19, .265); cab.add(backWindow);
  for (const x of [-.39, .39]) {
    const sideWindow = box(.035, .53, .42, mats.cab, false); sideWindow.position.set(x, 1.19, 0); cab.add(sideWindow);
  }
  const seat = box(.42, .16, .32, mats.tire); seat.position.set(0, .84, .29); visual.add(seat);
  const steeringColumn = box(.055, .34, .055, mats.tractorDark); steeringColumn.position.set(0, 1.0, -.02); steeringColumn.rotation.x = -.38; visual.add(steeringColumn);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(.17, .027, 6, 10), mats.tractorCream);
  steeringWheel.position.set(0, 1.16, -.085); steeringWheel.rotation.x = Math.PI * .54; steeringWheel.castShadow = true; visual.add(steeringWheel);
  const exhaust = box(.1, .56, .1, mats.tractorDark); exhaust.position.set(-.28, 1.17, -.72); visual.add(exhaust);
  const exhaustTip = box(.15, .07, .15, mats.metal); exhaustTip.position.set(-.28, 1.47, -.72); visual.add(exhaustTip);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 10), mats.headlamp);
  beacon.position.set(0, 1.66, .18); beacon.castShadow = true; visual.add(beacon);

  const addWheel = (x, y, z, radius, width, front) => {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    const roller = new THREE.Group();
    holder.add(roller);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), mats.tire);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; roller.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .43, radius * .43, width + .025, 12), mats.hub);
    hub.rotation.z = Math.PI / 2; hub.castShadow = true; roller.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * .16, radius * .16, width + .04, 10), mats.tractorCream);
    cap.rotation.z = Math.PI / 2; cap.castShadow = true; roller.add(cap);
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      const tread = box(width + .04, .07, .14, mats.tractorDark);
      tread.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      tread.rotation.x = -angle;
      roller.add(tread);
    }
    visual.add(holder);
    wheels.push({ holder, roller, tire, hub, front, radius, spin: 0, phase: Math.random() * Math.PI * 2 });
  };
  addWheel(-.58, .35, -.4, .34, .25, true); addWheel(.58, .35, -.4, .34, .25, true);
  addWheel(-.6, .43, .47, .45, .28, false); addWheel(.6, .43, .47, .45, .28, false);

  const plough = new THREE.Group();
  plough.position.set(0, .3, 1.38);
  visual.add(plough);
  const hitch = box(.28, .16, .34, mats.tractorDark); hitch.position.z = -.15; plough.add(hitch);
  const ploughBeam = box(1.62, .13, .16, mats.tractorAccent); ploughBeam.position.y = .1; plough.add(ploughBeam);
  for (const x of [-.57, -.19, .19, .57]) {
    const arm = box(.09, .46, .11, mats.tractorDark); arm.position.set(x, -.1, .16); arm.rotation.x = -.38; plough.add(arm);
    const blade = box(.29, .11, .43, mats.tractor); blade.position.set(x, -.29, .35); blade.rotation.y = -.28; blade.rotation.x = -.22; plough.add(blade);
    const tip = box(.1, .08, .16, mats.metal); tip.position.set(x + .1, -.34, .53); tip.rotation.y = -.28; plough.add(tip);
  }
  plough.visible = false;

  return {
    setPloughEnabled(enabled) { plough.visible = enabled; },
    sync(state, heading, steer, driveAmount, dt, elapsed) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.y = heading;
      if (state.grounded && !wasGrounded && lastVerticalSpeed < -1.4) {
        landingSquash = Math.min(.3, .12 + Math.abs(lastVerticalSpeed) * .018);
      }
      landingSquash *= Math.exp(-7 * dt);
      wasGrounded = state.grounded;
      lastVerticalSpeed = state.verticalSpeed;

      const speedFactor = Math.min(1, state.speed / 5.5);
      wheels.forEach(wheel => {
        wheel.spin += state.speed * dt / wheel.radius;
        wheel.roller.rotation.x = wheel.spin;
        if (wheel.front) wheel.holder.rotation.y = steer * .38;
        const wobble = Math.sin(elapsed * (8 + speedFactor * 15) + wheel.phase) * (.012 + speedFactor * .065);
        wheel.holder.rotation.z = wobble;
      });
      const engineBob = state.grounded ? Math.sin(elapsed * (8 + Math.min(1, state.speed / 4) * 5)) * .04 * Math.min(1, state.speed / 4) : 0;
      const airStretch = state.grounded ? 0 : .14;
      const squash = landingSquash - airStretch;
      visual.position.y = engineBob;
      visual.scale.set(1 + squash * .9, 1 - squash, 1 + squash * .9);
      visual.rotation.z = -steer * Math.min(1, state.speed / 4) * .13;
      visual.rotation.x = state.grounded ? -driveAmount * .04 : THREE.MathUtils.clamp(-state.verticalSpeed * .045, -.28, .28);
    },
  };
}
