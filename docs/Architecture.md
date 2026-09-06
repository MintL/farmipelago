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
