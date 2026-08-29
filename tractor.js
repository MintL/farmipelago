import { box, mats, THREE } from './shared.js';

export function createTractor(scene) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  const wheels = [];
  root.add(visual);
  scene.add(root);

  const body = box(.8, .36, 1.15, mats.tractor); body.position.y = .42; visual.add(body);
  const hood = box(.72, .32, .62, mats.tractorDark); hood.position.set(0, .62, -.47); visual.add(hood);
  const cab = box(.68, .7, .55, mats.cab); cab.position.set(0, .83, .25); visual.add(cab);
  const roof = box(.78, .11, .65, mats.tractor); roof.position.set(0, 1.22, .25); visual.add(roof);
  const exhaust = box(.1, .48, .1, mats.stoneDark); exhaust.position.set(-.23, .93, -.62); visual.add(exhaust);

  const addWheel = (x, y, z, radius, width, front) => {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 8), mats.tire);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; holder.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .42, radius * .42, width + .012, 8), mats.hub);
    hub.rotation.z = Math.PI / 2; hub.castShadow = true; holder.add(hub);
    visual.add(holder);
    wheels.push({ holder, tire, hub, front, spin: 0 });
  };
  addWheel(-.48, .29, -.39, .28, .2, true); addWheel(.48, .29, -.39, .28, .2, true);
  addWheel(-.5, .31, .42, .34, .22, false); addWheel(.5, .31, .42, .34, .22, false);

  const plough = new THREE.Group();
  plough.position.set(0, .19, 1.15);
  visual.add(plough);
  plough.add(box(1.18, .12, .12, mats.red));
  for (const x of [-.42, 0, .42]) {
    const arm = box(.1, .36, .32, mats.red); arm.position.set(x, -.09, .15); arm.rotation.x = -.35; plough.add(arm);
    const blade = box(.3, .12, .34, mats.metal); blade.position.set(x, -.21, .31); blade.rotation.y = -.18; plough.add(blade);
  }
  plough.visible = false;

  return {
    setPloughEnabled(enabled) { plough.visible = enabled; },
    sync(state, heading, steer, driveAmount, dt, elapsed) {
      root.position.set(state.x, state.y, state.z);
      root.rotation.y = heading;
      const wheelSpin = state.speed * dt / .28;
      wheels.forEach(wheel => {
        wheel.spin += wheelSpin;
        wheel.tire.rotation.x = wheel.spin;
        wheel.hub.rotation.x = wheel.spin;
        if (wheel.front) wheel.holder.rotation.y = steer * .38;
      });
      const engineBob = state.grounded ? Math.sin(elapsed * (9 + Math.min(1, state.speed / 4) * 6)) * .018 * Math.min(1, state.speed / 4) : 0;
      visual.position.y = engineBob;
      visual.rotation.z = -steer * Math.min(1, state.speed / 4) * .07;
      visual.rotation.x = state.grounded ? -driveAmount * .018 : THREE.MathUtils.clamp(-state.verticalSpeed * .028, -.16, .16);
    },
  };
}
