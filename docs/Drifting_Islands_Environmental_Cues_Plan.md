# Drifting Islands — Environmental Cues Implementation Plan

**Status:** In progress; Step 1 is implemented but no step is accepted yet  
**Scope:** Improve the fixed Farmipelago's illusion of southwest travel without
moving playable islands or gameplay state  
**Execution rule:** Complete, build, manually verify, and record each numbered
step before starting the next one

## Outcome

The attached Farm Island and Settlement Island should read as one massive
landform travelling southwest through the sky while their gameplay coordinates
remain fixed. The illusion should be understandable within several seconds
while a vehicle is parked, remain calm enough for long farming sessions, and
stay legible on the phone-first camera.

The implementation order is:

1. Improve the existing cloud system.
2. Add sparse directional voxel wind streaks.
3. Trail the waterfall and its mist backward through the air.
4. Add distant non-interactive rock and debris silhouettes.
5. Prototype lightweight moving cloud shadows and make a measured keep/remove
   decision.
6. Reveal a distant forest or desert planet as a fixed celestial reference.

This plan deliberately does not include relative movement or unsynchronized
bobbing of playable islands. The permanent pair, bridge, terrain grid,
colliders, buildings, vehicles, water, and saved island-local poses must remain
stationary and synchronized.

## Starting Baseline

The working tree at the start of this plan established the shared presentation
model that all six steps must respect:

- `src/world/travel.js` owns a normalized southwest travel direction,
  presentation-only distance, conservative speed, and a deterministic gust.
- `src/app/main.js` advances that model once per clamped render update and
  passes the same snapshot to the environment and farm animation.
- `src/world/environment/index.js` renders a wrapped northeast-moving main
  cloud field and a faster foreground band with instanced box geometry.
- `src/world/generator.js` gives existing tree sway a directional bias from the
  shared travel state.
- The starter Farm Island has a generated lake, river, vertical waterfall sheet,
  and three reusable animated foam streams.
- Reduced motion slows cloud translation and removes cloud bob and gust pulses.

This is the starting point, not proof that the cloud presentation is finished.
Step 1 owns both improving the current cloud work and closing its verification
gate.

## Shared Contracts for Every Step

### One motion source

Every cue must consume the existing read-only travel snapshot. No effect may
invent a separate travel heading, independent elapsed-distance model, or
camera-relative direction. For the current southwest Farmipelago travel vector:

- the Farmipelago's implied movement is `travelState.direction`;
- air, clouds, mist, and background scenery move primarily in the opposite
  direction;
- gust may modulate presentation but must never affect physics or input.

### Presentation only

The new effects must not change:

- island transforms or tile coordinates;
- bridge endpoints or construction footprints;
- Rapier colliders, vehicle motion, bales, jumping, rescue, or grounding;
- crop, livestock, logistics, progression, or persistence state;
- opening attachment lifecycle or save validation.

All movement belongs in the render update. None belongs in the fixed physics
step.

### Stable world frame

Effects must wrap through the stable travel frame derived when the Farmipelago
is initialized or regenerated. They must not follow the active vehicle, camera
focus, construction view, or cinematic target. A 90-degree camera turn may
change screen-space motion but never world-space travel.

### Bounded runtime cost

Each system must use fixed reusable geometry, materials, instances, and records.
Do not create or dispose scene objects per frame. Counts must remain constant
through pause/resume, refresh, regeneration, camera modes, and at least 15
minutes of runtime.

Before each step, record the accepted previous step's visible FPS in the same
scene, camera orientation, viewport, and device/browser. A step fails its gate
if it causes sustained degradation or visible frame pacing problems on the
phone-sized target. If exact GPU timing is unavailable, use the in-game FPS
badge plus visual frame-pacing judgment and record both.

### Visual restraint

The world and farming actions remain dominant. Effects must not:

- obscure the active vehicle, field state, bridge deck, building entrances, or
  interaction zones;
- resemble rewards, collectibles, navigation markers, or hazards;
- flash, pulse aggressively, or fill the screen with uniform motion;
- depend on a full-screen overlay or conventional textured skybox;
- introduce non-voxel visual language that fights the miniature diorama style.

### Accessibility

Normal motion may include parallax, gentle bob, and gust modulation. Reduced
motion must retain a slow steady directional cue so the setting still reads,
while removing or substantially reducing bob, pulsing, rapid near-camera
crossings, and turbulent variation.

### Gate discipline

For every step:

1. Finish the implementation and its focused code review.
2. Increment the `0.x` build version in `index.html` for that change set.
3. Update the GDD, README, and architecture notes only where the accepted
   behavior changes their source-of-truth descriptions.
4. Run `npm run build` successfully.
5. Have a person complete the step's hard manual test gate. Do not automate
   browser input, viewport checks, save manipulation, or gameplay scenarios
   unless automation is requested separately.
6. Append the date, build version, tester, device/browser, baseline/result FPS,
   and notes to that step's verification record.
7. Mark the step accepted before beginning work on the next step.

A successful production build alone never unlocks the next step.

## Step 1 — Improve and Verify the Cloud System

### Goal

Make the clouds the primary always-on travel cue. The player should see many
small distant clouds moving slowly, then occasional much larger clouds moving
faster beside and below the islands. No cloud may rise above the playable
terrain plane. Count, apparent size, speed, and overlap must combine into an
obvious depth hierarchy without reading as repeated boxes moving on lanes.

Keep the GDD's flat time-of-day backdrop. “Cloud system” here means layered
world geometry below and around the high-angle play view, not a textured cube
skybox.

### 1.1 Capture the baseline before changing it

Record the current cloud counts, draw calls if readily available, visible FPS,
and screenshots from:

- the default drive camera on both islands;
- all four camera orientations;
- construction view;
- dawn, day, dusk, and night;
- a narrow touch-sized viewport;
- normal and reduced-motion preferences.

Watch the parked Farmipelago for at least two minutes. Note obvious patterns,
empty periods, cloud intersections, wrap pops, foreground occlusion, and times
when travel direction becomes ambiguous. These observations define the concrete
problems the step must solve.

### 1.2 Give clouds a focused module boundary

`src/world/environment/index.js` is already at the project's preferred upper
size. Move cloud creation and animation into a focused module such as
`src/world/environment/clouds.js` before adding more behavior.

The cloud facade should expose only what the environment needs, for example:

- a root group to add to the scene;
- palette/day-night application;
- travel-frame initialization;
- an allocation-free `update(elapsed, travelState)` method;
- disposal if the environment later gains an explicit teardown boundary.

The cloud module may import Three.js primitives but must not import the app,
physics, UI, persistence, vehicles, or world generator. `src/app/main.js` should
continue to know only about the environment facade, not individual clouds.

### 1.3 Establish distinct visual bands

Retain at least two speed/depth bands, with this count/scale relationship treated
as fixed art direction:

- **Distant cloud field:** the more numerous layer, made from small compact voxel
  clouds moving slowly. Begin around 200–240 clusters with roughly 5–8 stepped
  runs each, then tune from phone-scale observation and the performance
  baseline. This layer provides continuous depth texture and direction rather
  than a few huge background masses.
- **Near island-edge clouds:** a much smaller population of substantially larger
  clusters moving faster beside and beneath the playable islands. Begin around
  16–28 clusters with roughly 9–14 stepped runs each. Their highest crown,
  including normal-motion bob, must remain at or below the `y = 0` playable
  terrain plane. Broad spacing keeps these large passes occasional.

Keep the near band around two and a half times the distant band's speed as the
initial target; the current `1.9` versus `0.78` relationship is already close.
Tune the absolute speeds only after the size and depth placement are correct,
because apparent speed depends strongly on proximity.

Use a small vocabulary of voxel-lobe arrangements instead of one identical
three-box silhouette. Variation may include lobe count, stepped height, length,
depth, asymmetry, and gaps, but all dimensions should retain the chunky voxel
language.

Keep geometry and material sharing. If different lobe counts require separate
instance pools, cap the number of pools and confirm the extra draw calls remain
acceptable before keeping them.

### 1.4 Remove mechanical repetition

Replace evenly spaced and modulo-lane-looking placement with deterministic
variation computed once during cloud creation. Use a stable index hash or local
seeded generator; do not call `Math.random()` during updates.

Vary:

- along-corridor spacing;
- lateral lane offset within safe bounds;
- height;
- overall scale and aspect ratio;
- silhouette/archetype;
- subtle bob phase and amount for normal motion.

Preserve intentional clear intervals, especially between the large near-cloud
passes. The numerous distant field may maintain broad continuous coverage, but
must still have irregular gaps. Avoid synchronized wrapping or a visible row of
clouds reappearing together.

### 1.5 Make wrapping invisible in normal play

Derive all wrapping from the existing stable travel frame. Place the recycle
boundary far enough beyond the normal camera and fog transition that individual
clouds never pop beside the farm.

Confirm that:

- regeneration explicitly supplies the new Farmipelago frame;
- camera rotation, camera zoom, vehicle switching, construction view, opening
  and milestone cinematics, and lighting focus do not redefine it;
- long frames are clamped through the existing app update path;
- pause/resume does not create a large distance jump;
- clouds never acquire physics, collisions, shadows, or persistence.

Do not recompute the world frame every render update.

### 1.6 Improve palette and layering

Tune each band separately through the existing day/night palette. Small distant
clouds should sit closer to the fog/horizon color; large near clouds may retain
slightly stronger contrast. Check transparent overlap and `depthWrite` behavior
from all four camera orientations.

Cloud geometry must remain non-shadow-casting during this step. Moving cloud
shadows are a separate final prototype so cloud art, shadow cost, and ground
readability can be judged independently.

Large fast clouds are intended to pass beside the island edges and through the
underside altitude range, never above the playable surface. Keep them opaque,
grid-aligned, and widely spaced enough that the vehicle, bridge, field state,
and construction feedback remain understandable. If a pass obscures play for
too long, adjust thickness, height, or spacing; do not make clouds steer around
or follow the active vehicle.

### 1.7 Reduced motion

For reduced motion:

- retain a slower constant translation in the same world direction;
- remove cloud bob and gust-driven acceleration;
- suppress the fastest near island-edge passes or reduce their relative speed
  and contrast if they still produce uncomfortable crossings;
- do not replace direction with camera-relative movement.

### Step 1 completion criteria

- A parked Farmipelago reads as travelling southwest within several seconds.
- The distant field is clearly more numerous, smaller, and slower than the
  sparse large clouds passing beside and beneath the islands.
- Placement does not reveal obvious rows, equal spacing, or synchronized wraps.
- No cloud follows the camera or active vehicle.
- No part of a near cloud, including its highest crown and bob, rises above the
  playable terrain plane.
- Day/night and reduced-motion treatments remain readable.
- Instance, geometry, material, and scene-child counts remain bounded.
- `npm run build` succeeds.

### Step 1 hard manual test gate

Do not start Step 2 until a person has completed and recorded all checks:

1. Park for at least 60 seconds on the Farm and 60 seconds on Settlement. State
   the perceived Farmipelago travel direction before consulting the configured
   vector.
2. Rotate through all four drive-camera orientations. Confirm the same world
   vector is preserved and that cloud depth remains understandable.
3. Drive, jump, cross the bridge, and switch vehicles. Observe at least one
   large cloud pass beside or below the islands. Confirm no cloud rises over the
   playable surface, no cloud responds to player or camera velocity, and the
   pass never compromises steering or depth judgment.
4. Enter and leave construction view, pause/resume, run the opening cinematic on
   a fresh game, run a milestone cinematic if available naturally, refresh, and
   regenerate. Confirm the field resumes without jumps or visible wrap resets.
5. Inspect dawn, day, dusk, and night with the debug time control. Confirm both
   bands stay distinct without glowing unnaturally or disappearing completely.
6. Repeat the stationary and driving checks at a narrow phone-sized viewport.
7. Enable reduced motion, reload, and repeat the stationary, camera-rotation,
   and driving checks. Restore the preference and reload afterward.
8. Leave the game running for at least 15 minutes. Confirm stable FPS and no
   growth in cloud instances, scene children, geometries, or materials.
9. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 1 verification record

- Status: **Accepted by the user for Step 2 progression**
- Date/build: 2026-09-06 / 0.263
- Tester and device/browser: User visual review; device/browser not recorded
- Baseline FPS / accepted FPS: Not recorded
- Notes and accepted limitations: The pre-Step-1 code baseline contained 84
  distant and 10 foreground clusters, 282 lobe instances, six instanced cloud
  draw calls, one geometry, and two materials. Build 0.255 contains 72 distant
  and 10 near clusters, 269 lobe instances, two instanced cloud draw calls, one
  geometry, and two materials. Subsequent visual tuning through build 0.263 uses
  216 distant and 24 near clusters, 1,648 opaque stepped instances, two draw
  calls, grid-aligned silhouettes, distant heights of `y = -18…-30`, and near
  centers at `y = -4.2…-8` so their crowns remain below the terrain plane. The
  user approved the first-pass visual result and explicitly unlocked Step 2.
  The extended FPS/resource-duration checks and complete `AGENTS.md` regression
  checklist were not separately reported.

## Step 2 — Add Directional Voxel Wind Streaks

### Goal

Add a sparse mid-distance cue that remains visible when clouds are outside the
camera view. Wind streaks should clarify direction, not turn the farm into a
storm or particle tunnel.

### Implementation

Create a focused fixed-pool effect, such as
`src/world/environment/wind-streaks.js`, composed by the environment facade.
Use one shared cuboid geometry and as few instanced materials as practical.

- Begin with a conservative fixed count suitable for mobile.
- Author short, narrow voxel dashes with varied length, height, lateral offset,
  opacity, and phase.
- Move them northeast from the shared travel distance and direction.
- Wrap them through the same stable world frame as clouds, with staggered
  deterministic positions.
- Let gust modestly affect speed, length, or lean in normal motion, but never
  spawn extra instances dynamically.
- Keep most streaks around the island silhouette and open air; avoid dense lines
  directly across fields, vehicles, buildings, or HUD-heavy screen regions.
- Use a fog/day-night-aware color close to the atmosphere palette. They must not
  resemble interaction markers, rain, projectiles, or collectible trails.
- In reduced motion, keep fewer or subtler streaks moving steadily without gust
  pulses or near-camera rushes.

Do not add free-flying leaves in this step. Leaves imply a source biome and need
their own emission/ownership rules; universal abstract voxel streaks are the
smaller coherent slice.

### Step 2 completion criteria

- Travel direction remains readable during cloud-clear intervals.
- The effect uses a fixed pool and adds no per-frame allocations.
- Gust modulation is subtle and directionally coherent with tree sway.
- Streaks do not obscure farming, resemble gameplay objects, or dominate the
  phone viewport.
- Reduced motion remains calm and directional.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 1 baseline.

### Step 2 hard manual test gate

1. Repeat the parked two-island and four-camera-orientation direction test.
2. Drive through fields, across the bridge, around the settlement, and in
   construction view. Confirm streaks never interfere with tile, vehicle, or
   placement readability.
3. Observe calm and peak gust moments beside trees. Confirm both cues agree but
   do not move in perfect mechanical lockstep.
4. Inspect all four day phases and the narrow phone viewport.
5. Repeat with reduced motion after a reload.
6. Run for 15 minutes and confirm fixed counts and stable frame pacing.
7. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 2 verification record

- Status: **Ready for implementation after Step 1 user acceptance**
- Date/build:
- Tester and device/browser:
- Step 1 FPS / accepted FPS:
- Notes and accepted limitations:

## Step 3 — Trail the Waterfall and Mist Backward

### Goal

Make the starter waterfall visibly respond to the Farmipelago pushing through
the air. The water should stay attached to its outlet while its lower stream and
mist trail northeast, opposite southwest travel.

### Implementation

Extend each generated waterfall record with stable outlet position, fall height,
edge/outlet direction, and the reusable visual children needed for animation.
Keep these records owned by the Farm Island's existing water root so the opening
arrival transform carries the complete effect correctly.

- Keep the top of the main water sheet fixed at the terrain outlet.
- Give the lower sheet or foam-stream path a modest horizontal displacement in
  the air-motion direction. The result should read as wind drag, not a rigid
  diagonal pipe.
- Animate existing foam streams along a top-to-bottom parameter so horizontal
  displacement increases with fall progress.
- Add a small fixed pool of voxel mist/spray near the lower fall. Recycle it
  without creating or disposing meshes at runtime.
- Use the existing water/foam day-night palette and rendering order.
- Let gust slightly vary mist spread and trailing distance in normal motion.
- For reduced motion, retain a static backward lean and slow steady mist drift
  while removing turbulent pulses.

The visual stream may trail outside the vertical terrain footprint, but it must
not change water gameplay, terrain, collision, splash physics, or saved state.

### Step 3 completion criteria

- The waterfall remains visibly anchored to the river outlet.
- Lower water and mist trail opposite Farmipelago travel.
- The bend is readable at phone scale without looking horizontal or detached.
- The full waterfall follows the Farm Island during the opening approach and is
  correctly placed after attachment, refresh, and regeneration.
- Mist uses fixed resources and remains behind gameplay surfaces where
  appropriate.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 2 baseline.

### Step 3 hard manual test gate

1. Observe the waterfall from every reachable camera orientation and from both
   nearby and ordinary drive framing. Confirm the top stays attached and the
   trail direction is coherent.
2. Watch normal gust variation for at least two minutes. Confirm there are no
   discontinuities when foam and mist recycle.
3. Play the fresh opening and confirm the lake, river, waterfall, foam, and mist
   travel together with the approaching Farm and settle without a duplicate or
   position jump.
4. Refresh, regenerate, pause/resume, and inspect all four day phases.
5. Repeat at phone size and with reduced motion.
6. Run for 15 minutes and confirm mist counts and frame pacing stay stable.
7. Re-run the complete project manual gameplay checklist from `AGENTS.md`, with
   special attention to water visuals and Farm arrival.

### Step 3 verification record

- Status: **Blocked by Step 2 acceptance**
- Date/build:
- Tester and device/browser:
- Step 2 FPS / accepted FPS:
- Notes and accepted limitations:

## Step 4 — Add Distant Rock and Debris Silhouettes

### Goal

Create slow far-field parallax that makes the sky feel large and inhabited
without teaching the player that visible candidate islands are merely scenery.

### Visual-language boundary

Start with unmistakably ambient shapes: isolated rock needles, tiny fragmented
voxel clusters, and atmospheric debris. Do not add recognizable farmable island
tops, trees, buildings, bridges, lights, fields, landing points, or candidate
interaction silhouettes in this step.

When boardable passing islands are implemented later, their scale, approach
lane, surface detail, and interaction framing must remain visually distinct from
this ambient layer. If that distinction cannot be maintained, remove ambient
island-like forms and keep only rocks/debris.

### Implementation

Create a world-owned far-scenery module composed by the environment.

- Build a small deterministic catalog from shared low-detail voxel geometry.
- Reuse fixed instance pools and fog-compatible matte materials.
- Place scenery outside the playable bounds and normal collision space.
- Move it northeast more slowly than foreground clouds and wind streaks, using
  the same travel distance and stable wrap frame.
- Vary lateral distance, height, scale, and spacing without following the camera.
- Fade forms into atmospheric fog before recycling them so wrap events are not
  visible.
- Keep all forms non-interactive, non-shadow-casting, unsaved, and absent from
  terrain queries, support resolution, rescue, and physics.
- Reduce contrast, count, and near crossings under reduced motion; do not add
  bobbing to compensate.

### Step 4 completion criteria

- Far scenery produces a clear slower parallax layer.
- No silhouette can reasonably be mistaken for a boardable or farmable island.
- Nothing enters playable space, affects camera collision/fading, or appears in
  world/persistence records.
- Recycling is hidden by spacing and fog.
- The world remains visually dominant and uncluttered at phone scale.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 3 baseline.

### Step 4 hard manual test gate

1. Observe from both islands and all four camera orientations for at least three
   minutes. Confirm the far layer moves coherently and recycles invisibly.
2. Ask the tester what the silhouettes represent and whether any looks like a
   reachable destination. Reject or revise the art if the answer is ambiguous.
3. Drive, jump, cross the bridge, enter construction view, switch vehicles, and
   play available cinematics. Confirm scenery never affects input, collision,
   fades, camera focus, or depth judgment.
4. Inspect day/night, fog transitions, phone size, and reduced motion.
5. Refresh and regenerate; confirm no accumulating roots or stale frame.
6. Run for 15 minutes and confirm fixed counts and stable frame pacing.
7. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 4 verification record

- Status: **Blocked by Step 3 acceptance**
- Date/build:
- Tester and device/browser:
- Step 3 FPS / accepted FPS:
- Notes and accepted limitations:

## Step 5 — Prototype Lightweight Moving Cloud Shadows

### Goal

Determine whether soft moving ground shade materially strengthens travel without
hurting field-state readability or the mobile rendering budget.

This is a go/no-go prototype. Completion means either accepting a verified
lightweight implementation or completely removing the prototype and documenting
why it failed. Do not leave dormant shader hooks, unused materials, debug UI, or
half-integrated shadow proxies behind.

### Rejected default approach

Do not enable shadow casting on the visible cloud meshes. They currently live
below/around the islands, and real voxel-cloud casting would add shadow-map
draws, couple visual placement to the celestial light, and likely exceed the
value of the cue on mobile.

### Prototype approach

Prototype a fake world-space mask that darkens terrain softly as broad patches
move northeast. Prefer extending only the terrain surface materials through a
small, documented shader hook or another single-pass technique. Do not add a
second full terrain render, per-tile overlay meshes, a screen-space filter, or a
large field of transparent planes.

The mask should:

- use the same travel direction and a slow cloud-compatible speed;
- use world XZ coordinates so it does not swim with the camera or individual
  terrain meshes;
- contain only a few broad, soft-edged, low-contrast patches;
- weaken substantially at dawn/dusk and disappear or become nearly imperceptible
  under moonlight;
- avoid darkening water, UI, buildings, vehicles, bridge decking, and interaction
  highlights in the first prototype;
- require only bounded uniform updates, with no per-frame material compilation
  or allocations;
- become steady and lower contrast under reduced motion.

Before changing shared materials, inventory every consumer of each targeted
material. The shader hook must preserve existing environment-driven grass
colors, standard lighting, fog, tone mapping, ploughed/soil readability, and
material sharing. If a safe surface-only boundary cannot be maintained, stop
and record a no-go rather than spreading cloud-shadow logic through gameplay
visual modules.

### Acceptance criteria

Keep the effect only if all are true:

- A parked-island comparison shows a clearly stronger sense of travel.
- Ploughed, planted, ready, cut, wet, dry, sunny, and shady terrain states remain
  immediately distinguishable.
- The patch does not look like a weather hazard, crop status, selection overlay,
  lighting bug, or cloud physically passing below the ground.
- It remains subordinate to real sun/moon shadows and local lighting.
- Phone frame pacing remains acceptably close to the accepted Step 4 baseline.
- Day/night, fog, reduced motion, refresh, and regeneration behave correctly.

If any criterion cannot be met after one bounded tuning pass, remove the
prototype, record the reason, and close the step as a verified no-go.

### Step 5 hard manual test gate

1. Compare the same parked camera with the effect off and on. Have the tester
   identify which version communicates travel more strongly without being told
   which is expected to win.
2. Inspect representative grass, environment variants, ploughed soil, every crop
   stage, cut grass/windrows, water edges, bridge approaches, and construction
   previews while shade passes over nearby terrain.
3. Drive and perform field work beneath a patch. Confirm it never masks tool
   feedback, crop readiness, collision edges, or vehicle heading.
4. Inspect dawn, day, dusk, and night, including moving real celestial shadows.
5. Repeat at a narrow phone viewport and with reduced motion.
6. Refresh, regenerate, pause/resume, and run for 15 minutes while comparing FPS
   and frame pacing with the accepted Step 4 baseline.
7. Re-run the complete project manual gameplay checklist from `AGENTS.md`.
8. Record **accepted** or **removed/no-go** with the evidence. If removed, verify
   the clean post-removal build and scene before closing the step.

### Step 5 verification record

- Status: **Blocked by Step 4 acceptance**
- Decision: Accepted / Removed as no-go
- Date/build:
- Tester and device/browser:
- Step 4 FPS / prototype FPS / final FPS:
- Evidence and rationale:

## Step 6 — Reveal a Distant Static Planet

### Goal

Add one unmistakably distant planet to the backdrop. It provides an absolute
visual reference while clouds, wind streaks, mist, and debris move past the
Farmipelago. The planet itself must remain fixed in the world sky: the reveal
comes from moving atmosphere crossing in front of it, not from the planet
sliding, bobbing, rotating, pulsing, or following the camera.

This step deliberately changes the present art-direction statement that the
backdrop has no visible celestial discs. If accepted, update the GDD to
distinguish the distant planet from the still-invisible sun and moon used by the
lighting rig.

### 6.1 Choose the biome treatment before detailed construction

Build a cheap graybox at the intended apparent size and compare two restrained
palette treatments from the same camera and time of day:

- **Desert planet — recommended first pass:** warm sand, ochre, pale stone, and
  a few darker canyon or mesa bands. It should separate clearly from the green
  farm, blue atmosphere, and white clouds.
- **Forest planet:** muted blue-green land masses, darker forest belts, and
  sparse pale mist or exposed-rock regions. Avoid using the same greens and
  contrast range as the playable terrain.

Select one treatment based on phone-scale silhouette, atmospheric contrast, and
setting fit. Do not ship both, randomize the biome per save, or add a choice UI
in this step. Record the selected treatment and why it won in the Step 6
verification record.

### 6.2 Give the planet its own backdrop boundary

Create a focused module such as
`src/world/environment/backdrop-planet.js`, composed by the environment facade.
It should own only procedural planet geometry, materials, palette response, and
placement.

- Anchor it to a fixed world-space azimuth and elevation derived from the stable
  Farmipelago travel frame.
- Do not advance its position from `travelState.distance`, wind speed, gust,
  elapsed time, active vehicle, camera target, or lighting focus.
- Keep it far enough away, and large enough, that ordinary movement between the
  two islands produces no noticeable parallax.
- Fit it inside the existing camera far plane or explicitly justify the smallest
  safe camera change. Do not increase the far plane merely to hide an incorrect
  scale choice.
- Keep it out of fog attenuation only as much as necessary to remain visible;
  its palette and contrast must still make it feel atmospheric and remote.
- Give it no physics, collider, raycast target, camera fade behavior,
  persistence, terrain record, or interaction state.

It is acceptable—and desirable—for the planet to leave the frame as the player
rotates to face away from its fixed world direction. Do not pin it to screen
coordinates or make it appear in every camera orientation. It must enter and
leave view continuously with camera rotation rather than teleporting between
backdrop positions.

### 6.3 Build a readable low-cost planet

Use procedural geometry and the existing simple-material approach; do not add a
large texture, cube map, external asset pipeline, or full-screen sky shader.

- Start with one low-segment sphere or deliberately faceted planetary body.
- Express the selected biome with a few broad stepped bands, patches, or shallow
  voxel-like surface clusters rather than high-frequency noise.
- Keep the silhouette round enough to read immediately as a planet, not a
  nearby floating island.
- Limit material and draw-call count. Reuse geometry/materials for repeated
  surface patches.
- Use unlit or tightly controlled palette shading so the planet does not imply a
  second conflicting sun direction.
- Avoid animated oceans, city lights, rings, moons, weather simulation, visible
  settlements, or surface vehicles in this slice.

The result should feel like a stylized distant world belonging to the same
miniature universe, while remaining much simpler and lower contrast than the
playable Farmipelago.

### 6.4 Let atmosphere perform the reveal

Place the planet behind the accepted cloud, wind, mist, and debris layers in
rendering and depth order. The cloud composition should provide occasional
partial occlusion and clear intervals so the planet is discovered naturally.

- Do not add a timed reveal animation, tutorial callout, camera cut, UI label,
  glow pulse, or one-time save flag.
- Do not move a foreground cloud solely to uncover the planet on a fixed timer.
- Avoid complete long-term obstruction by the numerous small distant clouds or
  an unfortunately spaced sequence of large near-cloud passes.
- Wind streaks and debris may cross its silhouette but should not form a dense
  halo around it.
- If cloud shadows were removed as a Step 5 no-go, the planet must not depend on
  them.

The planet should be present from world initialization. Its apparent reveal is
repeatable environmental composition, not progression or a gameplay event.

### 6.5 Day/night and reduced motion

Drive the planet's palette and contrast from the existing environment state:

- retain a subdued readable body during day;
- warm or cool it coherently at dawn and dusk without making it look emissive;
- keep a faint silhouette at night without competing with vehicle lamps and
  settlement lighting;
- avoid suggesting that the planet itself is the sun or moon responsible for
  the key light unless the GDD deliberately adopts that fiction later.

The planet needs no special reduced-motion animation because it is static.
Reduced motion changes only how quickly the accepted atmospheric layers cross
and reveal it. Do not compensate with planet fades, scale pulses, or movement.

### Step 6 completion criteria

- A tester identifies the body as a faraway planet rather than a nearby island,
  cloud, sun, or moon.
- The chosen forest or desert treatment remains readable at phone scale and is
  recorded with its rationale.
- The planet remains fixed relative to the world through stationary play,
  driving, camera turns, vehicle switches, construction view, cinematics,
  pause/resume, refresh, and regeneration.
- It never consumes travel distance, follows the active camera target, or wraps
  with moving environmental layers.
- Moving atmosphere naturally obscures and reveals it without a scripted event.
- It remains subordinate to gameplay, real lighting, and the island silhouette
  across the complete day/night cycle.
- Geometry, material, draw-call, and scene-child costs are bounded.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 5 result.

### Step 6 hard manual test gate

1. From the default drive camera, park until clouds both obscure and reveal the
   planet. Confirm the planet itself never moves against fixed world landmarks.
2. Rotate through all four camera orientations in both directions. Confirm the
   planet enters and exits the view consistently with one world-space location
   and never jumps to remain on screen.
3. Drive between the far sides of both islands, cross the bridge, and switch
   vehicles. Confirm there is no noticeable nearby-object parallax and no
   camera-target following.
4. Ask an uninformed tester what the object is, how far away it seems, whether
   it appears reachable, and which biome it suggests. Reject or revise it if it
   reads as a passing island or interaction target.
5. Play the fresh opening and an available milestone cinematic, then enter and
   leave construction view. Confirm the planet supports those compositions
   without stealing focus or clipping through world geometry.
6. Inspect dawn, day, dusk, and night. Confirm it neither disappears
   unintentionally nor behaves like an emissive sun/moon.
7. Repeat the stationary reveal, rotation, and driving checks at a narrow phone
   viewport and with reduced motion enabled after reload.
8. Pause/resume, refresh, and regenerate. Confirm placement is stable and no
   duplicate planet root is created.
9. Run for at least 15 minutes while comparing FPS, frame pacing, draw calls if
   available, and scene counts against the accepted Step 5 result.
10. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 6 verification record

- Status: **Blocked by Step 5 acceptance or verified no-go**
- Selected biome: Desert / Forest
- Selection rationale:
- Date/build:
- Tester and device/browser:
- Step 5 FPS / accepted FPS:
- Object-identification and perceived-distance notes:
- Accepted limitations:

## Final Integration Gate

After Step 6 closes, test the accepted cue stack as a whole rather than assuming
that individually restrained effects remain restrained together.

1. Park for five minutes during ordinary daytime play without interacting. The
   travel fantasy should stay clear but not become tiring.
2. Complete a representative farming sequence: drive, plough, seed, harvest,
   transfer cargo, cross the bridge, switch vehicles, and enter construction
   view.
3. Play fresh arrival and an available milestone cinematic.
4. Inspect all time-of-day phases, phone size, reduced motion, refresh, and
   regeneration. Confirm the planet remains the one static reference while the
   accepted atmospheric layers move past it.
5. Run for at least 30 minutes and confirm stable FPS, memory behavior, scene
   counts, and no synchronized effect resets.
6. If the combined scene is too busy, reduce or remove the lowest-value cue
   rather than increasing contrast elsewhere.
7. Run `npm run build` and record the final accepted build version.

## Suggested Commit Boundaries

Keep each hard gate reversible and reviewable:

1. `refactor: isolate environmental cloud rendering`
2. `feat: improve drifting cloud parallax`
3. **Run and record Step 1 gate.**
4. `feat: add directional voxel wind streaks`
5. **Run and record Step 2 gate.**
6. `feat: trail waterfall spray with farm travel`
7. **Run and record Step 3 gate.**
8. `feat: add distant atmospheric debris`
9. **Run and record Step 4 gate.**
10. `experiment: prototype moving cloud shade`
11. Keep the implementation with an appropriate feature commit, or remove it
    completely and document the no-go.
12. **Run and record Step 5 gate.**
13. `feat: add a distant backdrop planet`
14. **Run and record Step 6 and final integration gates.**

## Deferred Work

These ideas are outside this gated sequence:

- edge-wide updraft emitters;
- a general ambient audio system, dynamic wind loop, and stress sounds;
- new flags, ropes, vines, roots, or other decorative trailing props;
- biome-owned loose leaves or dust;
- real cloud shadow casting;
- physical or visual movement of the attached playable islands;
- unsynchronized island bobbing;
- boardable passing islands, encounter cadence, and candidate-island lifecycle.

They should be reconsidered only after the final integration gate establishes
whether the accepted visual stack still has a clear sensory gap.
