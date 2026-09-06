# Farmipelago architecture

Farmipelago uses native ES modules. `src/app/main.js` composes the game; feature
modules own their state and expose small public facades. Rendering, gameplay,
physics, UI, and persistence should communicate through those facades rather
than importing one another's internal helpers.

## Source boundaries

- `src/app/` composes systems and owns the render/update loop.
- `src/core/` contains shared low-level Three.js and voxel primitives.
- `src/world/` generates and queries islands, terrain, water, vegetation, and
  wildlife.
- `src/gameplay/` contains player-facing systems such as vehicles, fields,
  construction, logistics, livestock, and progression.
- `src/physics/` owns Rapier bodies, colliders, and fixed-step simulation.
- `src/ui/` owns DOM state and input translation.
- `src/persistence/` validates, reads, and writes save data.
- `src/voxel-studio/` is a separate Vite entry point and tool boundary.

Prefer one cohesive responsibility per file. Aim for 100–300 lines and treat
350 lines as a prompt to look for a real boundary, not as a reason to split a
single procedural model into arbitrary fragments.

## Island ownership

The world generator creates the Farm Island and Settlement Island footprints in
local tile coordinates before placing either one. `src/world/config.js` owns
each island's stable string ID, legacy seed ID, role, placement rule, and
explicit farming/construction capabilities. Generation order and numeric seed
IDs do not determine identity, lifecycle, or land-use policy. The opening
placement keeps center X equal and measures the generated facing shores before
choosing the final Z separation: the terrain edge gap must exceed one tile and
the inset bridge deck targets `2.0 ± 0.25` tiles.

An island record owns:

- a stable string ID, deterministic seed, role, lifecycle status, and explicit
  farming/construction capabilities;
- a world transform and local bounds;
- a local terrain map keyed by `gridKey(localGx, localGz)`;
- future island-local buildings, vehicles, forage, wildlife, and effects.

World-space tile lookup remains available at the runtime boundary. Code stored
inside an island should use local coordinates; references crossing an island
boundary use `{ islandId, gx, gz }`. Bridges are connection records with an
anchor on each island instead of being treated as anonymous world geometry.
Named tractor and combine spawn points belong to Settlement, are stored as
island-local poses, and are resolved through the archipelago runtime when a
vehicle is created or rescued.

Settlement is fixed and collider-active throughout the opening. The Farm's
authored visual roots are temporarily parented to one non-colliding arrival
transform that advances from the south along negative Z; this includes its
terrain, underside, props, workshop, lake, river, waterfall, foam, and animated
children, so no stale clone or duplicate final water is rendered. On completion,
one world update reparents those same roots to their authored parents at zero
offset, reveals the fixed bridge, changes lifecycle status to `attached`, and
rebuilds the full static collider set. Vehicle models and their transient effect
pools remain scene-owned and are asserted never to enter the arrival transform.
There is no moving-ground physics. A passing candidate island may later need a
more general transform model, but that belongs to step 2 and later.

The shared water shader renders and computes Fresnel in world space, but derives
its wave and ripple pattern from world XZ minus the owning island presentation
offset. Each water draw supplies that offset from its water root without cloning
the material. The moving Farm therefore carries its pattern with it, while a
stationary island supplies zero offset and remains stable through camera and FOV
changes.

The app owns the opening camera and input lifecycle. It begins before the first
render with both parked Settlement vehicles framed, eases its target toward the
approaching Farm while retaining Settlement context, tracks the Farm through
docking, then interpolates from that exact camera pose back to the normal active
vehicle camera. The standard sequence spends 1.4 seconds establishing, reaches
the reveal-to-tracking handoff at 3.6 seconds, docks at 6 seconds, and releases
controls after a 2.4-second return. Reduced motion preserves the same four beats
at 0.45, 1.1, 2, and 3 seconds with smaller camera offsets. UI cinematic state
clears held input, makes the HUD inert and invisible, and suppresses driving,
jumping, tools, construction, vehicle switching, camera gestures, transfers,
and contextual popups until the camera is back at its exact drive framing.

`src/world/travel.js` owns the presentation-only southwest travel direction,
accumulated visual distance, speed, and deterministic gust signal. The app
advances it once per clamped render update and passes the same read-only
snapshot to environment and vegetation presentation; island transforms,
physics, saves, and encounter policy do not depend on it. On world
initialization or regeneration, the app derives one stable travel frame from
the union of the two island records' transformed bounds.
`src/world/environment/clouds.js` owns the cloud presentation behind the
environment facade: 216 smaller distant clusters and 24 substantially larger
near clusters use irregular layered silhouettes assembled from stepped runs.
Both bands share one box geometry and use one fixed `InstancedMesh` and material
each, for two bounded cloud draw calls and 1,648 total instances. Their spacing,
lateral offsets, heights, aspect, silhouettes, and bob parameters are
deterministically generated once; every formation remains aligned to the world
grid and render updates only rewrite the fixed instance matrices. The distant
field wraps northeast at a `.78`
travel-distance multiplier, while the sparse near pass uses `1.9`; reduced
motion removes bob, lowers near contrast, and reduces its multiplier to `1.02`.
Lighting retains its independently moving camera/gameplay focus, so camera
rotation, vehicle switching, construction, and cinematics cannot shift the wrap
boundary. The original broad untextured low-fog planes remain stationary.

`src/world/environment/wind-particles.js` owns two additional fixed opaque
instance pools: 48 dust motes and 24 loose leaf chips in normal motion, reduced
to visible subsets of 24 and 12 without changing pool capacity when reduced
motion is requested. On Farmipelago initialization, the environment caches a
bounded deterministic set of dry/open dust anchors and tree/vegetation leaf
anchors from generated terrain metadata, excluding reserved land and restored
building or pasture footprints. Each anchor retains its island presentation
offset reference so the Farm's particles accompany its opening approach. Frame
updates rewrite only the two fixed instance matrices from the shared travel
direction, distance, and gust; they allocate no scene objects and perform no
terrain, physics, camera, or vehicle queries. Day/night tinting is applied at
the environment facade. Each record carries seed-stable harmonic frequencies,
amplitudes, and phases: dust follows a restrained broad lateral meander, while
leaves use wider overlapping lateral waves and subtler vertical flutter. The
harmonics return to their starting offsets at recycle boundaries, where a
smooth size envelope hides the downstream-to-source reset without transparency.
Leaf records also deterministically divide into falling and wind-caught
lifecycles. Falling chips ease toward a cached clearance above their source
surface, while wind-caught chips rise and progressively shrink away; both paths
reach zero scale before recycling and require no opacity sorting or terrain
lookups during animation.

`src/world/environment/distant-surface.js` owns the unreachable planetary
backdrop behind the same environment facade. World initialization derives its
seed from the generated Farmipelago seed and supplies the stable travel-frame
center. The module generates one periodic 512×512 RGBA top-down map over a
160-unit cell as 128×128 explicit square terrain tiles (four texels and 1.25
world units per tile), places its fixed 720-unit plane at `y = -54`, and repeats
one 64×64 quantized plateau cell plus up to 1,000 tree records across a 3×3
coverage grid. The plane and detail field share a fixed 80-unit horizontal bias
toward the default drive-view horizon, derived once from the initial camera
forward axis rather than following later camera rotation. The result adds four
draws: one mapped plane, one instanced
merged plateau top, one instanced merged plateau side, and one instanced draw
for combined trunk-and-canopy trees. Build 0.271 classifies and colors the generated map only at
logical tile centers, fills each tile with one discrete palette step based on
the shared grass, raised-grass, soil, water, and woodland colors, and uses
nearest texel sampling with linear mip-level blending so shore and biome edges
stay grid-stepped without a line overlay or severe oblique shimmer. Build 0.274
strengthens the separation of those terrain colors and supplies a deterministic
ten-level mip chain that selects the dominant terrain class in each 2×2 block
and requantizes its variation instead of averaging unlike classes toward gray.
The chain, bounded anisotropy, and base image remain one texture allocation.
Build 0.273
replaces the superseded smooth GPU height map and arbitrary cliff footprints
with five discrete one-unit plateau levels on a 64×64 grid aligned to 2×2
diffuse cells. Water-adjacent height cells stay at zero. Raised cells contribute
one flat grass/forest-colored top; only the higher side of a transition emits
one flat dirt wall, with periodic neighbor lookup suppressing equal-height,
reverse, internal, and bottom faces. The complete source top and side meshes are
instanced nine times rather than creating per-cell objects, and tree bases cache
the matching plateau level. Build 0.274 retains the seamless periodic forest
field, combines its continuous density with deterministic per-tile occupancy,
sub-cell jitter, scale, and quarter-turn yaw, and accepts trees only on grass
tiles. Each tree is one tiny saturated brown trunk box plus one tiny saturated
green canopy box
merged into a fixed 24-triangle vertex-colored geometry. Seed 99173 produces
878 source records and 7,902 repeated instances in one draw. Together with
1,516 source plateau tops and 841 source sides, this produces 232,076 effective
triangles. Frame updates change only the
diffuse map offset and one shared landmark-root transform, both calculated from
the same wrapped northeast offset
at a `.34` travel-distance multiplier. The plane never follows the camera, and
the module owns no gameplay records, raycasts, colliders, shadows, persistence,
or fixed-step work. Reinitialization disposes its previous texture, materials,
and geometries before rebuilding, leaving one direct environment scene child
and no duplicate roots. The production design uses existing exposure and global
lighting for its day/night response without a second lighting rig. Through
build 0.277 it required no camera projection change. Build 0.275 restores the
original `y = -48` distant
elevation for both the plane and shared plateau/tree root. Build 0.276 restores
fog participation on all four distant materials and reduces only the expensive
plateau/tree repetition from 5×5 to a centered 3×3 field, then biases the whole
backdrop horizontally toward the default horizon; the two-triangle 480-unit
diffuse plane remains unchanged in size and at `y = -48`. The plateau tops,
sides, and trees share the identical nine transforms and no runtime culling,
LOD, or greedy meshing was added. Global scene fog and every other material
remain unchanged. Visual review found that fog erased the separated terrain
colors, so build 0.277 opts those four distant materials back out of fog while
retaining every footprint reduction. The 80-unit horizon bias and fixed plane
and detail bounds place their finite edges beyond the camera frustum rather than
depending on material fog to hide them; global fog itself is still unchanged.
Build 0.278 fixes the remaining top-of-screen far clipping by increasing only
the main camera far plane from 200 to 400 while retaining its `0.1` near plane,
and enlarging the still-two-triangle diffuse plane from 480 to 720 units. The
four draws and 3×3 detail budget do not change. The extreme newly visible band
may intentionally contain only the periodic diffuse map; no 5×5 restoration,
greedy meshing, LOD, chunking, or additional scene object accompanies it.
Build 0.279 lowers both the base plane and shared plateau/tree root by exactly
six units from `y = -48` to `y = -54`. Their horizontal origin, texture phase,
3×3 transforms, four draws, and all geometry and instance budgets are unchanged.

Terrain tiles carry their owner's stable string ID from creation. Field and
forage mutations, construction-site selection, and restoration resolve the
owner through the island record and enforce its capability flags. `reserved`
continues to express local footprint and approach exclusions; it is not used as
a substitute for island-wide land-use policy.

## Physics and saves

Physics remains authoritative for vehicle and bale motion. Grounded vehicle and
sleeping bale state includes `supportIslandId`, allowing a future moving island
to carry supported objects without coupling Rapier to world generation.

The two-island direction starts a new schema-0 save lineage at
`farmipelago.gameState.v2`. Its validator requires exactly the configured Farm
and Settlement records, their roles and capabilities, one resolved bridge
connection, the environment phase, and the existing gameplay fields.
Settlement must be `attached`; Farm and bridge must coherently be either
`approaching` or `attached`. An approaching save replays the deterministic
presentation and camera sequence from its start, while an attached save restores
the fixed pair directly in the normal drive view.
Building and vehicle island-local poses may only reference retained islands.
The loader never reads, migrates, deletes, or overwrites the legacy
`farmipelago.gameState` key; incompatible v2 data is removed from the v2 key
only and replaced by a fresh farm.
