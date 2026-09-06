# Drifting Islands — Environmental Cues Implementation Plan

**Status:** In progress; Steps 1–2 accepted, Step 3 implementation complete with manual visual/performance acceptance pending
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
2. Add directional wind-borne dust and leaf particles over the islands.
3. Add a vast, fog-muted planetary surface scrolling far below the islands.
4. Trail the waterfall and its mist backward through the air.
5. Add distant non-interactive rock and debris silhouettes.
6. Prototype lightweight moving cloud shadows and make a measured keep/remove
   decision.

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

## Step 2 — Add Directional Wind-Borne Particles

### Goal

Carry small dust motes and loose leaves northeast across the islands, opposite
their implied southwest travel. The particles should make the airflow tangible
near the playable land without turning the farm into a storm, particle tunnel,
or collectible field.

### Implementation

Create a focused module such as `src/world/environment/wind-particles.js`,
composed by the environment facade. Use separate fixed instance pools for dust
and leaves, shared primitive geometry within each pool, and as few opaque
materials and draw calls as practical.

- Derive deterministic emitter anchors once from generated island data. Favor
  open dry or bare ground for dust and areas around trees or vegetation for
  leaves; do not emit leaves uniformly from water, buildings, or empty sky.
- Do not perform terrain raycasts, collision queries, or tile searches per
  particle per frame. Cache the valid anchors and their local surface heights
  when the Farmipelago is initialized or regenerated.
- Begin with a conservative phone-safe fixed count, then tune dust/leaf balance
  during visual review. Keep pool capacity constant; gusts may activate a
  bounded subset but must never allocate or spawn new scene objects.
- Author dust as tiny voxel motes or short clustered flecks in subdued earth and
  atmospheric colors. Author leaves as slightly larger voxel chips using muted
  vegetation/autumn variants that remain readable without looking like crops,
  seeds, rewards, or interaction markers.
- Move every particle primarily northeast from the shared travel direction.
  Add small deterministic differences in speed, height, lift, and lateral
  wander, but never let random motion overwhelm the common direction.
- Keep motion in a shallow band over and just beyond the island surfaces. Dust
  should skim low; leaves may lift higher during gusts. Particles must not pass
  densely through the tractor, buildings, bridge deck, or active work area.
- Recycle particles downstream into suitable cached upstream anchors. Stagger
  phases so refresh, regeneration, and gust changes never produce a synchronized
  burst or visible whole-pool reset.
- Let the shared gust modestly increase speed, lift, and lateral spread. It must
  remain a presentation effect with no force, collision, crop, or tree-state
  consequences.
- Use solid voxel colors and atmospheric fog for depth rather than relying on
  large transparent sprites. Drive palette brightness from the existing
  day/night state so particles remain legible by day and subdued at night.
- In reduced motion, keep a smaller visible subset moving steadily at lower
  speed, suppress abrupt gust lift and tumbling, and retain the directional cue.

This step replaces the rejected abstract world-crossing wind-streak prototype.
It does not add edge-wide updrafts, persistent weather, harvest debris, or
gameplay-affecting wind.

### Step 2 completion criteria

- Dust and leaves visibly travel opposite Farmipelago motion while the vehicle
  is parked.
- The two particle types have plausible source areas and remain visually
  distinct without implying collectible or crop items.
- The effect uses fixed pools, cached emitters, and no per-frame allocations or
  terrain/physics queries.
- Gust modulation is subtle and directionally coherent with tree sway and cloud
  travel.
- Particles do not obscure farming, pass densely through structures, or dominate
  the phone viewport.
- Reduced motion remains calm and directional.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 1 baseline.

### Step 2 hard manual test gate

1. Repeat the parked two-island and four-camera-orientation direction test.
2. Watch representative dry/open ground, planted fields, tree clusters, water,
   and settlement areas. Confirm dust and leaf origins feel plausible and do not
   appear uniformly across invalid surfaces.
3. Drive through fields, across the bridge, around the settlement, and in
   construction view. Confirm particles never interfere with tile, vehicle,
   crop, or placement readability.
4. Observe calm and peak gust moments beside trees. Confirm particles, tree sway,
   and clouds agree on direction without moving in perfect mechanical lockstep.
5. Inspect all four day phases and the narrow phone viewport.
6. Refresh and regenerate. Confirm emitters follow the new generated layout and
   no old particles or anchors remain.
7. Repeat with reduced motion after a reload.
8. Run for 15 minutes and confirm fixed counts and stable frame pacing.
9. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 2 verification record

- Status: **Accepted by the user for Step 3 progression**
- Date/build: 2026-09-06 / 0.266
- Tester and device/browser: User visual review; device/browser not recorded
- Step 1 FPS / accepted FPS: Not recorded
- Notes and accepted limitations: Build succeeds with fixed pools of 48 dust
  motes and 24 leaf chips across two added instanced draw calls; reduced motion
  renders fixed subsets of 24 and 12. Emitter anchors are deterministically
  cached from terrain metadata and replace the rejected abstract wind-streak
  treatment. Build 0.265 adds seed-stable multi-frequency lateral meander and
  vertical flutter that close smoothly at recycle boundaries, with wider motion
  reserved for leaves and strongly reduced amplitudes under reduced motion.
  Build 0.266 divides leaf records into deterministic falling and wind-caught
  lifecycles: falling chips settle toward cached ground clearance, while rising
  chips gain lift and shrink smoothly before recycling. The user approved the
  resulting visual behavior and explicitly requested that work continue. The
  extended FPS comparison, 15-minute stability check, and full manual gameplay
  regression were not separately reported.

## Step 3 — Add a Distant Moving Surface

### Goal

Add the impression of a vast, unreachable planetary surface far below the
Farmipelago. It should use the same broad terrain language as the playable
islands—green grass, blue water, brown dirt, blocky cliffs, and dense tiny trees—but
with much lower detail, contrast, and runtime cost. Heavy fog should make it
feel remote while its slow northeast passage strengthens the existing illusion
that the attached islands travel southwest.

This replaces the earlier distant-static-planet proposal. It preserves the
GDD's lack of visible celestial discs and changes Step 6 from an absolute fixed
reference into the broadest and slowest moving travel cue. If accepted, update
the GDD to describe the distant passing surface and its relationship to the
cloud layers.

### 3.1 Prove the flat surface before adding landmarks

Start with a deliberately cheap graybox containing only a horizontal plane and
a small generated top-down texture. Do not begin with a render target, cube map,
perspective-baked image, displaced mesh, or detailed tree population.

- Place the plane far below the playable island undersides and keep it large
  enough to cover every supported drive, construction, and cinematic view.
- Begin with a 512×512 generated texture. Increase it only if visible sampling
  or repetition survives fog on the phone-sized target.
- Use only three base terrain colors: green grass, blue water, and brown dirt.
  Narrow palette variation for readability is acceptable, but do not introduce
  detailed ground materials or a second art style.
- Generate the texture from directly overhead. The gameplay camera supplies the
  final perspective when it views the horizontal plane; a perspective-baked
  image would distort when its UV coordinates scroll.
- Compare plane height, repeat span, fog coverage, and apparent speed from the
  default phone camera before constructing cliffs or trees.

The graybox passes only if it reads as distant terrain moving below the islands,
not as a nearby floor, map overlay, ocean sheet, or reachable extension of the
farm.

### 3.2 Give the surface a focused presentation boundary

Create a focused module such as
`src/world/environment/distant-surface.js`, composed by the environment facade.
It should own only:

- deterministic backdrop-map generation derived from the world seed;
- the generated tile-color texture and horizontal base plane;
- bounded quantized plateau and tree presentation records and geometry;
- travel-offset synchronization, wrapping, palette response, and disposal.

Reuse pure generation helpers from `src/world/islands/procedural.js` where they
fit, or extract narrowly reusable pure helpers if necessary. Do not call the
full `generateFarm()` path: it also creates gameplay terrain records, water
systems, props, buildings, persistence state, occlusion entries, and physics
inputs that the backdrop must never own.

The system receives only the stable travel frame, a seed derived from the world
seed, the read-only travel snapshot, and the current environment palette. Give
it no colliders, raycast targets, farming capabilities, interaction state,
camera fading, save payload, or fixed-step work. Regeneration must dispose or
reuse the previous texture and meshes without leaving a duplicate root.

### 3.3 Generate one periodic terrain map

Generate one large square repeat cell whose opposite edges agree. All visible
layers must be derived from the same periodic coordinate domain:

- a broad grass/water/dirt classification for the color texture;
- a small set of major elevated footprints and discrete height levels for
  cliffs;
- sparse forest regions and individual tree positions restricted to grass;
- stable local heights so trees remain on top of elevated terrain.

Render the accepted classification into explicit square logical tiles rather
than evaluating a smooth color field per texture pixel. Tile colors should use
discrete variants of the playable grass-top, raised-grass, water, soil, and
woodland palette; shore and biome boundaries must step along the tile grid with
no drawn grid-line overlay. Cliff footprints and tree anchors use the same tile
centers and edges. Preserve those cells through mip filtering at the oblique
phone camera while avoiding severe shimmer.

Automatic color-averaging mipmaps can wash terrain classes toward gray because
each source tile occupies only four texels per axis. Build a deterministic mip
chain that selects the dominant terrain class in every 2×2 downsample block,
then carries a quantized variation of that class forward. Nearest texel sampling
with restrained linear blending only between these palette-preserving mip
levels should retain class identity without the shimmer of an unmipmapped map.

Favor large readable regions over high-frequency noise. The distant world is
not another playable Farmipelago and does not need fields, buildings, roads,
vehicles, crops, waterfalls, island undersides, or simulated water. Avoid an
obvious checkerboard of separate islands, and keep distinctive repeated
landmarks far enough apart that fog and the long repeat span hide repetition.

Create the top-down color map once during world initialization or regeneration
with a `CanvasTexture` or equivalently small generated pixel buffer. Use texture
wrapping and mip filtering that prevent shimmer at the camera's shallow viewing
angle. Do not render a temporary 3D scene merely to obtain this texture.

Pair it with one substantially lower-resolution periodic height grid derived
from the same tile classifications and broad deterministic relief field. Water
stays at the base level and land quantizes into a few discrete plateau levels.
Build those levels as merged top and exposed-side geometry with flat normals;
do not displace the base plane, create smooth slopes, or create gameplay height
records.

### 3.4 Scroll UVs from the shared travel state

The generated texture must move through UV transformation rather than moving
or regenerating the large plane. Derive its displacement from the same shared
travel state used by clouds:

- use `-travelState.direction` so the distant surface passes northeast while
  the Farmipelago's implied travel remains southwest;
- convert `travelState.distance` into UV offset using the repeat cell's world
  span, so scale and speed have one explicit relationship;
- wrap both axes continuously and never reset to a visibly different texture;
- do not add an independent clock, gust response, camera-relative heading, or
  active-vehicle dependency;
- let the existing reduced-motion travel speed slow this layer automatically.

The plane texture, plateau root, and trees must all consume one calculated
backdrop travel offset. Do not update three loosely equivalent motion
implementations.

### 3.5 Add only major cliffs as real geometry

After the flat surface passes, convert the lower-resolution periodic height grid
into a bounded field of stepped plateaus. These supply genuine vertical
silhouettes and camera parallax without constructing a second full world.

- Emit one grass/forest-colored top face for every raised height cell and one
  brown vertical wall only where its periodic neighbor is lower.
- Include only visible tops and vertical sides. Omit deep undersides, collision,
  shadow casting, high-frequency edge damage, and decorative strata.
- Do not emit bottoms, equal-height internal walls, or a wall from the lower side
  of a height transition. A multi-level difference remains one clean wall.
- Merge one repeat cell's plateau tops and sides into two meshes, then instance
  those complete cells for bounded coverage rather than creating one object per
  height cell.
- Repeat enough neighboring copies of the periodic cell that the visible fog
  region remains covered while the shared backdrop root translates and wraps.
- Move that root by the world-space equivalent of the UV offset, modulo the same
  repeat span. A modulo reset must be visually identical because the data is
  periodic and the reset occurs outside the useful fog radius.

Choose and record the height-grid resolution, level count, top-face count, and
exposed-side count. Treat those as the fixed geometry budget rather than adding
separate arbitrary cliff footprints.

### 3.6 Add dense tiny instanced trees

Do not bake individual trees into the horizontal texture. At the gameplay
camera angle they would flatten into ground marks rather than reading as a
distant forest.

- Paint only broad forest-color regions into the texture.
- Retain the seamless periodic forest field and combine its continuous density
  with deterministic per-tile hash occupancy, sub-cell jitter, scale, and yaw.
  This keeps grove interiors dense, feathers their edges, and prevents the
  logical tile grid from visibly stamping the silhouettes.
- Add tiny 3D trees above those regions using one combined vertex-colored
  trunk-and-canopy geometry and one instanced mesh/material draw.
- Place trees only on grass-compatible texture tiles and set each cached Y
  position from the matching quantized plateau level.
- Move and wrap the tree root with exactly the same world-space backdrop offset
  as the cliff root so trees never slide across the terrain.
- Disable shadow casting, animation, physics, interaction, and per-frame
  instance updates. The shared root transform should provide all motion.
- Keep colors muted toward the current fog palette and judge density by forest
  silhouette at phone scale, not by close inspection.

Choose and record a hard source-record cap before final tuning. Prefer density
controlled by the forest mask rather than filling that cap indiscriminately,
and increase distant population without increasing tree draw calls.

### 3.7 Keep water, fog, and lighting simple

Water in the distant surface is plain blue. It needs no existing water shader,
reflection, transparency, scrolling normal, foam, waterfall, or separate
animation. Grass remains green and exposed soil and cliff faces remain brown.
Use a saturated but coherent extension of the playable grass, raised-grass,
forest, water, soil, trunk, and canopy palette so the classes remain distinct
under distant sampling. Do not use emissive color, transparency, or opacity to
recover contrast.

Visual review found that scene fog erased the backdrop's separated terrain
colors. Keep `fog: false` on only the four distant-surface materials and leave
global scene fog and every other material unchanged. Physical separation,
horizon-biased coverage beyond the camera frustum, exposure, and global lighting
must keep the backdrop subordinate. Do not recreate the playable world's
lighting rig, shadow map, or local lights below.

Fit the system inside the existing camera far plane if possible. Static camera
analysis later confirmed that top-screen intersections at `y = -48` exceeded
the original 200-unit far plane, so build 0.278 uses the smallest robust round
increase to 400 while retaining `near = 0.1` and expanding only the cheap base
plane for coverage.

### 3.8 Enforce a small fixed runtime budget

The intended steady-state budget is approximately:

- one generated 512×512 tile-color texture;
- one two-triangle horizontal base-plane draw;
- two instanced plateau draws for merged tops and exposed sides;
- one instanced tree draw using combined trunk-and-canopy geometry;
- no shadow-map draws, render targets, per-frame geometry changes, or scene
  object creation.

Only the texture offset and shared presentation-root position should change per
frame. Record accepted texture size, triangle count, instance
count, draw-call change, and scene-child change in the verification record.

### 3.9 Reduce the fixed detailed footprint before adding complexity

The build 0.275 configuration repeats the complete plateau and tree cell over a
fixed 5×5 area. For verification seed 99173 this submits 644,652 effective
triangles and 21,950 trees even though much of that detail lies outside the
useful phone view. The 512×512 diffuse texture is not the main waste: unseen
texels consume fixed memory, but they do not generate off-screen fragments.

Use the following fixed reduction before considering greedy meshing, dynamic
chunk selection, or runtime LOD. Complete and verify each phase before starting
the next.

#### 3.9.1 Hide the terminal boundary through fixed coverage

- Keep fog disabled on the four distant-surface materials so the accepted
  saturated terrain classes remain visible. Preserve global fog unchanged and
  place the finite backdrop edges beyond the camera frustum through fixed
  coverage rather than color convergence.
- Keep the inexpensive two-triangle diffuse plane large enough to cover every
  drive, rotation, construction, and cinematic composition. Enlarging this
  plane is acceptable because it does not meaningfully increase geometry cost.
- Keep the accepted `y = -54` elevation unchanged. Bias the fixed coverage
  horizontally toward the default-view horizon instead of lowering it;
  vertical distance does not reduce submission cost. If static frustum analysis
  proves the camera clips that accepted geometry, expand the far plane and
  inexpensive base plane together without changing detailed repetition.
- Verify the four camera headings, the full rotation transition, phone and wide
  aspect ratios, construction panning, opening, vehicle handoff, and milestone
  cinematics before reducing detailed coverage.

#### 3.9.2 Shrink only the expensive plateau/tree repetition

- Reduce the repeated plateau and tree field from 5×5 cells to a centered 3×3
  field without tying that expensive footprint to the diffuse-plane size.
- Keep the plateau tops, plateau sides, and trees on the same 3×3 transform set
  so their periodic phases cannot separate.
- Do not add camera-following, runtime chunk updates, per-frame frustum tests, or
  another LOD draw in this pass. The smaller field may transition to a
  diffuse-texture-only extreme band but must not reveal the base-plane edge.
- For verification seed 99173, the expected fixed cost falls from 21,950 to
  7,902 tree instances and from approximately 644,652 to 232,076 total effective
  triangles, a reduction of about 64%, while retaining four draw calls.
- Confirm that rotation and maximum wrap offset do not make the transition from
  3D detail to the accepted diffuse-only extreme band read as a hard cutoff.

#### 3.9.3 Bias coverage toward the horizon at the accepted distance

Keep the complete distant surface at the accepted `y = -54`. Build 0.279 makes
this exact six-unit visual adjustment from the prior `y = -48`; it does not
change submitted geometry, draw calls, or texture cost. Continue to shift the
fixed plane and shared plateau/tree footprint 80 units horizontally
toward the default drive-view horizon. Derive that direction once from the
initial camera-forward axis; do not follow camera rotation or add runtime view
selection. This reallocates fixed coverage from the lower, behind-camera region
toward the upper visible region while keeping the diffuse, plateau, and tree
phases aligned. The plane and shared plateau/tree root must retain the exact
`y = -54` elevation through initialization, travel, wrapping, and regeneration.

#### 3.9.4 Fixed-footprint optimization gate

Before accepting this simpler optimization:

- no base-plane or camera far-clip edge is visible in any supported camera
  composition or during rotation and wrapping; the detail transition into the
  diffuse-only extreme band is acceptable only if it does not read as a cutoff;
- diffuse tiles, plateaus, and trees remain phase-locked;
- the expected 3×3 triangle and tree-instance reduction is confirmed in the
  recorded runtime budget;
- distant-surface draw calls remain at four and no per-frame allocation,
  geometry rebuild, frustum calculation, or instance-buffer rewrite is added;
- the lower world still reads at phone scale with the accepted no-fog material
  treatment and `y = -54` distance;
- the 15-minute phone test and complete `AGENTS.md` manual regression checklist
  pass before Step 3 is accepted and Step 4 begins.

Only if the 3×3 field still fails performance or exposes detail edges should a
second optimization pass add greedy plateau meshing or view-aware LOD/chunking.
Those mechanisms add implementation and pop-management complexity and require a
new measured plan rather than being included preemptively. The user explicitly
rejected greedy meshing, dynamic chunks, camera-aware culling, and LOD for this
pass.

### Step 3 completion criteria

- An uninformed tester describes a large, distant landscape passing below the
  Farmipelago and does not mistake it for reachable land.
- Grass is plainly green, water plainly blue, and soil and cliff faces plainly
  brown without a complex water or terrain shader.
- Major cliffs have real vertical silhouettes from all supported camera views.
- Dense tiny trees read as distant forest and stay correctly planted on flat and
  elevated terrain.
- Diffuse UVs, plateaus, and trees remain synchronized through continuous travel
  and wrapping, with no swimming, popping, seams, or direction disagreement.
- The surface remains subordinate to gameplay and the playable island
  silhouette through drive view, construction view, cinematics, and the full
  day/night cycle.
- Regeneration produces deterministic backdrop data for its seed and never
  leaves duplicate resources or roots.
- The accepted texture, geometry, instance, draw-call, and scene-child costs are
  recorded and bounded.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 2 result.

### Step 3 hard manual test gate

1. Park in the default drive view for at least two minutes. Confirm the surface
   travels northeast steadily and the attached islands still read as moving
   southwest rather than descending toward a floor.
2. Follow several recognizable cliff-and-tree groups through motion and at least
   one wrap. Confirm the color map, cliff geometry, and trees never separate,
   jump, or change relative placement.
3. Rotate through all four drive-camera orientations in both directions.
   Confirm motion remains correct in world space and cliffs retain convincing
   vertical faces without perspective-baked distortion.
4. Drive between the far sides of both islands, cross the bridge, and switch
   vehicles. Confirm camera-target movement does not steer or recenter the
   backdrop and that it never reads as nearby traversable terrain.
5. Ask an uninformed tester what lies below, which direction the Farmipelago is
   travelling, whether the lower surface seems reachable, and whether its trees
   and cliffs are legible at a glance.
6. Play the fresh opening and an available milestone cinematic, then enter,
   pan, and leave construction view. Confirm the plane covers every composition
   without a visible edge, clipping, or stealing focus.
7. Inspect dawn, day, dusk, and night. Confirm the simple green/blue/brown
   palette remains coherent and subordinate without emissive-looking water or
   an independently lit lower world.
8. Repeat the stationary, rotation, and wrap checks at a narrow phone viewport
   and with reduced motion enabled after reload.
9. Pause/resume, refresh, and regenerate. Confirm motion resumes coherently,
   the same seed produces stable backdrop data, and no duplicate root or stale
   texture remains.
10. Run for at least 15 minutes while comparing FPS, frame pacing, draw calls if
    available, and scene counts against the accepted Step 2 result.
11. Re-run the complete project manual gameplay checklist from `AGENTS.md`.

### Step 3 verification record

- Status: **Implementation complete; manual visual/performance acceptance pending**
- Date/build: 2026-09-06 / 0.279
- Tester and device/browser: Static/resource verification only; human visual test pending
- Plane elevation / size / repeat span / accepted texture: `y = -54` / 720×720 world units / 160 world units / one 512×512 RGBA diffuse containing 128×128 logical tiles (four texels / 1.25 world units each), using ten deterministic dominant-terrain-class mip levels, nearest texel sampling, linear mip-level blending, and anisotropy capped at 4
- Plateau grid / levels / visible faces / triangles / draws: 64×64 cells at 2.5 world units, five one-unit levels (`0–4`); verification seed 99173 has level counts `2,580 / 409 / 296 / 240 / 571`, 1,516 source top faces and 841 source exposed-side faces. Across fixed 3×3 coverage that is 13,644 tops / 7,569 sides, 27,288 top triangles / 15,138 side triangles, and two draws.
- Tree instance cap / accepted instances / draws: hard cap 1,000 records per repeat cell; the seamless forest-density mask plus deterministic per-tile occupancy yields 878 records for seed 99173, repeated as 7,902 combined trees across 3×3 coverage in one instanced draw. The combined brown-trunk/green-canopy source geometry is 24 triangles and approximately one unit wide, with restrained scale and quarter-turn yaw variation.
- Step 2 FPS / accepted FPS: Step 2 FPS was not recorded; Step 3 human FPS and frame-pacing comparison pending
- Direction, distance, and reachability notes: Code inspection confirms a `.34` multiplier on `-travelState.direction`, the adjusted distant plane elevation 54 units below terrain, and one fixed 80-unit horizontal bias toward the initial default-view horizon. The bias is derived once and does not follow camera rotation, vehicles, or later focus changes. There is no gameplay, physics, raycast, or persistence integration; human perception and reachability judgment remains pending.
- Wrap and synchronization notes: One modulo-wrapped world offset drives the shared plateau/tree root and its exact negative divided by the 160-unit span drives the diffuse texture. One hundred deterministic seed/reinitialization checks retained the quantized height counts, density-controlled tree placements, two module children, four draws, four intentionally fog-disabled distant materials, and clean disposal. Tree populations ranged from 802 to 980 records for seeds 0–99, all remained on grass-compatible diffuse tiles, all cached a matching quantized plateau height, and the nine repeated transforms and tree instance buffers stayed fixed through travel updates. Focused checks confirm periodic neighbor lookup, tile-aligned plateau edges, jittered tree anchors, invariant geometry/instance buffers, and matching diffuse/root phases across wrap boundaries; the required long visual wrap check remains manual.
- Debug readability tuning: The supplied build 0.269 phone screenshot showed one or two enormous pale geometric regions and no useful cliff/tree scale cues. Build 0.270 raises the periodic terrain harmonics from continent-scale one-to-three-cycle fields to roughly three-to-eight-cycle fields, strengthens the raw green/blue/brown/forest colors, changes the plane material tint to white, shrinks cliff footprints from 12–20 to 6–12 units while raising them from 3–5.5 to 4–7 units, and arranges the unchanged 36-tree cap into nine deterministic groves with larger `3.2 × 2.1 × 2.6` block canopies. A 100-seed resource check retained all counts and the same five draws.
- Tile-rendered texture correction: The user clarified that the generated-texture plane should remain, but its map must read like Farmipelago terrain rather than smooth procedural color blobs. Build 0.271 supersedes the build 0.270 map treatment with 16,384 explicit periodic tile records. Every logical tile fills one exact 4×4-texel square with a discrete color step derived from the playable grass, raised-grass, soil, water, or woodland palette. Shore and biome transitions are grid-stepped without visible grid lines, and all cliff edges and tree anchors snap to the same 1.25-unit tile domain. Verification seed 99173 contains 6,771 water, 6,963 grass/forest, and 2,650 dirt cells. The second supplied phone reference is the target for tile density, palette separation, forest massing, and eventual fog-softened depth.
- Superseded height-relief pass: Build 0.272 briefly used a smooth 32×32 GPU displacement/bump map. The clarified terrain model rejects smooth slopes, so build 0.273 removes that texture, the subdivided plane, and the separate 14 arbitrary cliff footprints.
- Quantized plateau pass: Build 0.273 derives a periodic 64×64 height grid from the same tile domain and broad one-to-two-cycle relief. Any cell touching water stays at level 0; dry land quantizes to levels `0–4`. One merged top mesh contains only raised cells with discrete grass/forest vertex colors. One merged side mesh contains only higher-to-lower periodic boundaries, using single flat dirt walls even across multiple levels. There are no bottoms, equal-height walls, hidden reverse walls, smooth slopes, or per-cell objects. Trees cache the matching plateau level.
- Dense-tree pass: Build 0.274 replaces the 36 oversized two-draw trees with a density-controlled field capped at 1,000 source records. It uses the existing seamless forest harmonics plus deterministic tile occupancy and jitter rather than a new noise dependency. Each record instances one combined 24-triangle tree geometry with vertex-colored trunk and canopy in a single draw; seed 99173 produces 878 source / 21,950 repeated trees.
- Palette/mipmap correction: The same build increases saturation and separation across water, grass, raised grass, forest, dirt sides, trunks, and canopies without emissive or transparency. Blandness came from both the previously restrained source colors and automatic mip averaging across terrain classes. One manually supplied ten-level mip chain now selects a deterministic dominant terrain class per 2×2 downsample block and snaps its restrained variation back to the source variation steps. The texture remains one GPU allocation with nearest texels, linear mip-level blending, and anisotropy capped at 4.
- Distance restoration: Build 0.275 moves the fixed plane and the complete synchronized plateau/tree root from the temporary `y = -24` inspection position back to the original `y = -48`. No density, palette, mip, geometry, motion, camera, gameplay, or Step 4 behavior changes with it.
- Fixed-footprint optimization: Build 0.276 restores fog participation on all four distant materials and reduces the common plateau/tree transform set from 25 to nine centered repeats. The 480-unit plane remains at `y = -48`; lowering it was rejected because elevation does not change submission cost. Instead, the entire backdrop receives a fixed 80-unit horizontal bias toward the initial default-view horizon, keeping plane UVs and detail geometry phase-locked while reallocating coverage away from the behind-camera region. A 3×3 square cell has 334.3 units of projected half-coverage along the diagonal default view. Including the bias and worst synchronized wrap, the horizon-side detail boundary remains at least 222.9 units from the travel-frame center across all four quarter-turn headings, beyond the unchanged 200-unit camera far plane and maximum 134.14-unit fog far distance before bounded island-focus displacement. The biased 480-unit plane retains at least 254.3 units of projected horizon coverage before focus displacement. Human rotation, panning, cinematic, aspect-ratio, and long-wrap confirmation remains required.
- No-fog visibility correction: Build 0.277 retains the complete build 0.276 footprint reduction but disables fog again on the diffuse plane, plateau tops, plateau sides, and combined trees. Visual feedback established that fog made the saturated terrain colors disappear. Global fog is unchanged; fixed horizon-biased coverage beyond the camera frustum hides finite backdrop edges instead.
- Draw-distance correction: Build 0.278 changes the main gameplay camera from `near = 0.1 / far = 200` to `near = 0.1 / far = 400` and enlarges the still-two-triangle diffuse plane from 480 to 720 units. Static analysis found top-screen intersection depths of 207.9–252.9 in the drive presets, 232.6 in construction, up to 239.7 in the opening goals, 302.6 in the stable milestone framing, and 365.5 during the widest milestone-entry transition. The 400-unit far plane covers those cases with margin. A 720-unit square retains at least 421.7 units of projected horizon coverage across the four quarter-turn headings before bounded focus displacement. The 3×3 detailed field deliberately remains unchanged, so the extreme newly visible band may use only the periodic diffuse texture. Increasing the far plane adds no scene objects or draw calls; it exposes more fragments of already-submitted distant meshes and therefore still requires phone fill-rate verification. Keeping `near = 0.1` avoids close-object clipping, and the resulting 4,000:1 ratio remains modest for the existing depth buffer.
- Six-unit depth adjustment: Build 0.279 lowers the complete distant surface from `y = -48` to `y = -54`, keeping plane and landmark root phase-locked. Recalculated top-screen depths are 224.1–275.9 across drive presets, 250.5 in construction, up to 260.0 in the opening goals, 334.1 in the stable milestone framing, and 394.0 during the widest milestone-entry transition. The unchanged `far = 400` retains a 6.0-unit camera-depth margin in the modeled worst case. The 720-unit plane still supplies at least 421.7 units of projected horizon coverage; its maximum modeled top-ray intersection extends 372.3 horizontal units beyond the target. The 3×3 detail boundary remains unchanged and the expanded extreme band is intentionally diffuse-only.
- Accepted limitations: One 512×512 RGBA diffuse texture with a palette-preserving manual mip chain, one 720-unit two-triangle base plane at `y = -54`, four draws, one direct scene child (six module nodes), and 232,076 effective triangles for verification seed 99173: two base-plane, 27,288 plateau-top, 15,138 plateau-side, and 189,648 instanced-tree triangles. The 3×3 field reduces repeated tree instances to 7,902 and total effective triangles by 64.0% from build 0.275. The main camera uses `near = 0.1 / far = 400`; global fog remains unchanged and all four distant materials intentionally use `fog: false`. Manual phone, cinematic, day/night, reduced-motion, worst-case far-margin, texture-only transition, edge-coverage, fill-rate, 15-minute FPS, and full gameplay regression checks remain outstanding, so Step 4 stays blocked.

## Step 4 — Trail the Waterfall and Mist Backward

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

### Step 4 completion criteria

- The waterfall remains visibly anchored to the river outlet.
- Lower water and mist trail opposite Farmipelago travel.
- The bend is readable at phone scale without looking horizontal or detached.
- The full waterfall follows the Farm Island during the opening approach and is
  correctly placed after attachment, refresh, and regeneration.
- Mist uses fixed resources and remains behind gameplay surfaces where
  appropriate.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 3 baseline.

### Step 4 hard manual test gate

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

### Step 4 verification record

- Status: **Blocked by Step 3 acceptance**
- Date/build:
- Tester and device/browser:
- Step 2 FPS / accepted FPS:
- Notes and accepted limitations:

## Step 5 — Add Distant Rock and Debris Silhouettes

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
- Move it northeast more slowly than foreground clouds and wind-borne
  particles, using the same travel distance and stable wrap frame.
- Vary lateral distance, height, scale, and spacing without following the camera.
- Fade forms into atmospheric fog before recycling them so wrap events are not
  visible.
- Keep all forms non-interactive, non-shadow-casting, unsaved, and absent from
  terrain queries, support resolution, rescue, and physics.
- Reduce contrast, count, and near crossings under reduced motion; do not add
  bobbing to compensate.

### Step 5 completion criteria

- Far scenery produces a clear slower parallax layer.
- No silhouette can reasonably be mistaken for a boardable or farmable island.
- Nothing enters playable space, affects camera collision/fading, or appears in
  world/persistence records.
- Recycling is hidden by spacing and fog.
- The world remains visually dominant and uncluttered at phone scale.
- `npm run build` succeeds without a meaningful sustained performance loss from
  the accepted Step 4 baseline.

### Step 5 hard manual test gate

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

### Step 5 verification record

- Status: **Blocked by Step 4 acceptance**
- Date/build:
- Tester and device/browser:
- Step 3 FPS / accepted FPS:
- Notes and accepted limitations:

## Step 6 — Prototype Lightweight Moving Cloud Shadows

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
- Phone frame pacing remains acceptably close to the accepted Step 5 baseline.
- Day/night, fog, reduced motion, refresh, and regeneration behave correctly.

If any criterion cannot be met after one bounded tuning pass, remove the
prototype, record the reason, and close the step as a verified no-go.

### Step 6 hard manual test gate

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
   and frame pacing with the accepted Step 5 baseline.
7. Re-run the complete project manual gameplay checklist from `AGENTS.md`.
8. Record **accepted** or **removed/no-go** with the evidence. If removed, verify
   the clean post-removal build and scene before closing the step.

### Step 6 verification record

- Status: **Blocked by Step 5 acceptance**
- Decision: Accepted / Removed as no-go
- Date/build:
- Tester and device/browser:
- Step 4 FPS / prototype FPS / final FPS:
- Evidence and rationale:

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
   regeneration. Confirm the distant surface remains below the Farmipelago and
   its UV, cliff, and tree motion stays synchronized while the atmospheric
   layers retain their intended parallax rates.
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
4. `feat: add directional dust and leaf particles`
5. **Run and record Step 2 gate.**
6. `feat: add a scrolling distant terrain backdrop`
7. **Run and record the Step 3 manual visual/performance acceptance gate.**
8. `feat: trail waterfall spray with farm travel`
9. **Run and record Step 4 gate.**
10. `feat: add distant atmospheric debris`
11. **Run and record Step 5 gate.**
12. `experiment: prototype moving cloud shade`
13. Keep the implementation with an appropriate feature commit, or remove it
    completely and document the no-go.
14. **Run and record Step 6 and final integration gates.**

## Deferred Work

These ideas are outside this gated sequence:

- edge-wide updraft emitters;
- a general ambient audio system, dynamic wind loop, and stress sounds;
- new flags, ropes, vines, roots, or other decorative trailing props;
- abstract world-crossing wind streaks, rejected after the uncommitted build
  0.264 prototype;
- real cloud shadow casting;
- physical or visual movement of the attached playable islands;
- unsynchronized island bobbing;
- visible celestial discs or a distant backdrop planet;
- boardable passing islands, encounter cadence, and candidate-island lifecycle.

They should be reconsidered only after the final integration gate establishes
whether the accepted visual stack still has a clear sensory gap.
