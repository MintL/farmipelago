import { THREE, p, h, block, cylinder, bar, ring, bake, hybridModel, finishHybrid, hall, roof, sideWindow, badge, wheel, pipe, can, crate, lantern, stream } from './hybrid-kit.js';

export function createHybridOilPress() {
  const model = hybridModel('hybrid-oil-press'), { kit, structure, group } = model;
  hall(kit, { width: 18, depth: 14, height: 11, frame: h.tealDark, opening: 12 });
  for (const x of [-9, 7]) sideWindow(kit, x, 6, -3, 4, 3);
  roof(kit, { left: -10, width: 20, back: -8, depth: 16, y: 11, color: h.teal });
  kit.add(p.wood, -9, 1, 7, 18, 1, 4);
  for (const x of [-9, 8]) { kit.add(h.teal, x, 2, 7, 1, 8, 1); kit.add(p.gold, x, 2, 8, 1, 1, 1); }
  kit.add(h.tealDark, -8, 11, 8, 16, 1, 1);
  kit.add(p.gold, -8, 10, 8, 16, 1, 1);
  badge(structure, 0, 2.76, 1.58, 'oil', h.tealDark, .86);
  // The pressing frame stays open so the screw, platen and seed basket read.
  for (const x of [-.7, .6]) block(structure, h.tealDark, x, 1.2, .55, .18, 1.6, .24);
  block(structure, p.gold, -.05, 1.96, .55, 1.56, .23, .35);
  block(structure, p.base, -.05, .49, .55, 1.4, .18, 1.06);
  cylinder(structure, h.copper, -.05, .77, .55, .48, .43, .48, 12);
  cylinder(structure, p.grain, -.05, .99, .55, .415, .035, .415, 12);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    bar(structure, p.wood, [Math.cos(a)*.48-.05,.59,Math.sin(a)*.48+.55], [Math.cos(a)*.48-.05,.94,Math.sin(a)*.48+.55], .028);
  }
  const screw = new THREE.Group(); screw.position.set(-.05, 1.16, .55); group.add(screw);
  cylinder(screw, p.steel, 0, .35, 0, .075, .82, .075, 10);
  for (let i = 0; i < 7; i++) ring(screw, h.tealDark, 0, .05 + i * .1, 0, .085, .019).rotation.x = Math.PI / 2;
  block(screw, p.gold, .04, .66, .09, .16, .06, .07); bake(screw);
  const platen = cylinder(group, p.steel, -.05, 1.13, .55, .41, .14, .41, 12);
  const flywheel = wheel(group, .97, 1.22, 1.08, .46, p.gold);
  bar(structure, p.steel, [.97,1.22,.88], [.97,1.22,1.2], .06);
  block(structure, h.tealDark, .97, .91, .87, .23, .9, .2);
  // Seed intake and a receiving jug make the pressing process easy to follow.
  cylinder(structure, p.gold, -2.2, 1.65, .4, .16, .63, .45, 8);
  cylinder(structure, p.grain, -2.2, 1.97, .4, .39, .035, .39, 8);
  for (const dx of [-.29,.29]) bar(structure, h.tealDark, [-2.2+dx,.02,.4], [-2.2+dx,1.42,.4], .04);
  kit.cut(-9,5,1,2,2,2);
  pipe(structure, [[-2.2,1.37,.4],[-1.91,1.17,.4],[-.65,1.05,.55]], .11, h.copper);
  crate(structure, -1.23, .4, 1.75, .64);
  // A short outlet stays inside the open bay and pours directly into the jug.
  pipe(structure, [[.05,.95,1],[.15,.95,1.3],[.15,.94,1.58],[.15,.91,1.66]], .05);
  cylinder(structure, p.chalk, .15, .59, 1.66, .2, .38, .25, 10);
  cylinder(structure, p.gold, .15, .785, 1.66, .21, .02, .21, 10);
  ring(structure, h.teal, .4, .61, 1.66, .13, .028);
  stream(model, [.15,.9,1.66], [.15,.8,1.66], { mat: p.gold, count: 4, radius: .02 });
  can(structure, 2.32, 0, 1.12, .85);
  lantern(model, -1.58, 1.78, 1.64);
  model.motions.push(time => {
    screw.rotation.y = time * 2;
    platen.position.y = 1.13 + Math.sin(time * 1.7) * .12;
    flywheel.rotation.z = -time * 2.2;
  });
  return finishHybrid(model);
}
