# Drifting Islands — Steps 1 and 1.5 Plan

**Status:** Planned vertical slices
**Scope:** Reduce the permanent world to two starter islands, then make that
stationary gameplay space read as a Farmipelago travelling through the sky.
**Concept source:** [`Farmipelago_Drifting_Islands_Concept.md`](Farmipelago_Drifting_Islands_Concept.md)

## Outcome

After these slices, a fresh save opens with a short cinematic on the stationary
Settlement Island as the Farm Island visibly approaches from the south and
attaches immediately.
The resulting save contains only the two connected starter islands. Existing
saves from the previous seven-island world are not loaded into
the new direction, but their legacy storage entry is left untouched so the reset
is reversible during development or rollback. The existing farming loop remains
playable and persistent from the new baseline. Once the opening attachment
completes, the islands and their physics stay fixed in world space, while
environmental motion makes the connected Farmipelago appear to travel
continuously.

These slices deliberately do not add passing candidate islands, boarding,
general attachment scheduling, settlement needs/population simulation, new
progression, or placement UI. Step 1 does establish the one-time opening Farm
attachment and the physical Settlement Island with a readable building cluster.

## Current Baseline

The structural work already present is partial groundwork for independently
generated and moving islands, but it does not complete step 2:

- `src/world/islands/model.js` creates stable island records with an ID, seed,
  role, lifecycle status, transform, local bounds, and island-local terrain.
- That record builder currently derives `hub` and `northern-farm` roles from
  numeric legacy IDs instead of accepting configured identity as authoritative.
- `src/world/archipelago/runtime.js` resolves local/world positions and stores
  island-local content, connections, building poses, and vehicle poses.
- The current persistence code carries migrations for prototype schemas 6–10.
  None of that history needs to survive the new starting-world baseline.
- Physics state reports the supporting island for grounded vehicles and
  sleeping bales.
- Terrain rendering already creates separate surface batches per island.

There is not yet an independently callable island generator. Tile creation,
undersides, terrain batches, vegetation, stones, water, and obstacles are still
created by closures inside the whole-farm generator. Step 2 must therefore be
completed and pass its own gate after steps 1 and 1.5, before step 3 begins.

The remaining whole-world assumptions relevant to these slices are:

- `src/world/config.js` defines seven initial islands and six initial bridge
  pairs.
- `src/world/generator.js` generates every configured island in one pass and
  uses array indices as legacy island IDs in several places.
- The generator retries when no later island produces a watercourse. With only
  legacy islands 0 and 1, that condition can never be satisfied.
- Static terrain, obstacle, underside, and bridge colliders are rebuilt from
  explicit opening-state subsets so the stationary Settlement is solid before
  the Farm and bridge become solid together.
- All pre-reset saves describe the old seven-island world and must not be loaded
  into the new starting topology.
- The environmental cloud meshes only bob vertically. The low fog planes and
  horizontal cloud positions are static, so the world does not yet communicate
  travel.

## Decisions for These Slices

### The starter pair

Step 1 replaces the current hub + northern-farm interpretation with the
concept's Farm Island + Settlement Island opening:

- `island-0`: `farm`
- `island-1`: `settlement`

Keep the current public island IDs (`island-0` and `island-1`) and their numeric
legacy seed inputs for deterministic continuity, but make configured IDs, roles,
and capabilities authoritative. A numeric `legacyId` or `generationIndex` may be
used only as a seed input; it must not determine identity, role, lifecycle, or
land-use policy.

The Farm Island retains the workshop, starter field space, starter lake, and
agricultural gameplay. The Settlement Island becomes
a deliberately small, mostly level destination containing the cargo hub and a
compact voxel-built settlement shell plus the tractor and combine starting
area. It should read as a community outpost that receives the arriving farm,
not as a second general-purpose farming island.

Keep the Settlement Island stationary directly north of the Farm Island, with
their center X coordinates aligned. Generate both organic footprints in local
coordinates, then measure their actual facing shores and resolve their final
separation. The modeled bridge deck targets `2.0` terrain tiles with a
`±0.25`-tile tolerance; the independent square-edge terrain gap must remain
strictly greater than one tile. The deck begins `0.48` tile inward from each
landing tile center, while the terrain gap measures the empty distance between
the square tile edges.

On a fresh farm, restart, or regeneration, show the Farm Island starting well
south of that final transform and moving north along negative Z. Both vehicles
spawn parked on the stationary Settlement. Begin before the first rendered
frame with both vehicles clearly composed, then pan to reveal the approaching
Farm while retaining Settlement context, travel with the Farm through docking,
and ease continuously back over the active vehicle into the exact normal drive
camera before enabling controls. The moving Farm is visual-only and begins
beyond jump reach: it owns no active
terrain, underside, obstacle, or bridge collision. When it reaches the final
placement, freeze it and atomically reveal and activate the final Farm and
bridge geometry and colliders. This is a one-time opening, not the general
candidate-island travel and boarding system planned for step 2.

Move the actual Farm-owned visual roots under one arrival transform rather than
deep-cloning a snapshot. Terrain, underside, vegetation, stones, workshop,
lake, river, waterfall, foam, and their animated children must share that exact
transform and return to their authored parents at zero offset on docking. Keep
the final bridge hidden until then. Vehicle models and transient vehicle/field/
transfer effect pools remain outside the island presentation root; clear
transient vehicle and transfer visuals when beginning the intro, without
changing persistent equipment or inventory state.

Use a 6-second approach and a 2.4-second return for the normal cinematic: hold
the two-vehicle establishing composition until 1.4 seconds, complete the
Settlement-to-Farm reveal at 3.6 seconds, track the incoming Farm through its
6-second docking, then return. Keep position, look target, field of view, fog,
and occlusion updates continuous across phase boundaries. During the full
8.4-second sequence, clear and suppress driving, jumping, tools, construction,
vehicle switching, camera rotation, transfers, and contextual popups; keep the
HUD hidden and inert without mutating persistent gameplay state. Reduced motion
keeps the same narrative beats with smaller offsets at 0.45, 1.1, and 2 seconds,
followed by a 1-second return. A valid `approaching` refresh replays from the
establishing shot; a saved `attached` refresh skips the cinematic.

Remove the old `northern-farm` identity, snowy terraces, and north-specific
generation from the permanent starter pair. The initial settlement is physical
and recognizable, but its inhabitants, needs, tiers, consumption, services,
and growth are later gameplay slices.

### Stable gameplay frame

After the step 1 opening attachment, do not physically translate the two
starter islands in step 1.5. Terrain,
buildings, vehicles, bridges, water, farming queries, camera targets, and Rapier
colliders remain in their existing world coordinates.

The Farmipelago travels southwest. In world coordinates, where north is
negative Z, use the normalized direction `(-√½, 0, +√½)`: negative X and
positive Z. Travel is conveyed by moving environmental reference layers in the
opposite northeast direction. This avoids introducing moving-ground physics
before the boardable candidate-island slice.

### Fresh-save boundary

Treat the two-island world as a new persistence lineage. Delete the old
migration chain, reset the new lineage's save schema to `0`, and write it under
the new storage key `farmipelago.gameState.v2`. The loader must read only that
key. A save under the legacy `farmipelago.gameState` key is not migrated or
loaded, but it is also not removed or overwritten.

Do not import progression, fields, buildings, livestock, vehicles, inventory,
or world state from the seven-island prototype. The reset is intentional and
should be called out in the implementation handoff, together with the fact that
the legacy browser-local value remains available for rollback or manual
recovery.

## Step 1 — Two-Island Starting Farmipelago

### 1. Define the permanent starter topology and roles

In `src/world/config.js`, `src/world/islands/model.js`,
`src/world/islands/procedural.js`, and `src/world/generator.js`:

- Replace the seven-island initial layout with a named permanent starter layout
  containing two explicit records: `island-0` / legacy seed ID `0` / role
  `farm`, and `island-1` / legacy seed ID `1` / role `settlement`.
- Store an explicit `capabilities: { farming, construction }` object on each
  configured/runtime island record. Set both flags to `true` for the Farm Island
  and both to `false` for the Settlement Island in this slice.
- Replace the full connection list with one connection whose endpoints refer to
  the two stable string IDs rather than array positions.
- Preserve the Farm Island's current authored terrain and ID. Replace island
  1's northern-farm terrain profile with a much smaller, mostly level settlement
  profile while keeping its ID stable in the new schema-0 saves.
- Move island 1 directly north of island 0. Connect the Farm Island's north
  shore to the Settlement Island's south shore and keep their center X
  coordinates aligned. Generate both shapes locally and resolve their final
  separation from their actual facing shore widths. Assert after generation
  that their terrain tiles neither overlap nor touch, their square-edge gap is
  greater than one tile, and their modeled bridge deck remains within `2.0 ±
  0.25` tiles.
- Make each configuration record's `id`, `role`, and `capabilities` the source
  of truth copied into its runtime island record. Assert that stable IDs are
  unique and that every configured connection resolves two existing IDs.
- Remove `islandRole(legacyId)` and every equivalent mapping from numeric ID or
  array position. Preserve `legacyId` only where it is still needed to reproduce
  the current seed stream.
- Replace `STARTER_ISLAND_ID` with explicit farm/settlement role or ID constants
  where authored behavior needs them. Remove `NORTH_ISLAND_ID` and north/snow
  branches from the starting topology. Do not use numeric comparisons such as
  `id > 1` to encode lifecycle or role.

Expected topology:

```text
island-1 (settlement: homes, cargo hub, vehicle spawns)
                         |
                      bridge
                         |
island-0 (farm: workshop, starter field, lake)
                       NORTH
```

### 2. Establish the physical Settlement Island

In `src/world/generator.js` and a focused static presentation module such as
`src/world/settlement/visual.js`:

- Generate island 1 as a compact, mostly level island targeting roughly 40–50%
  of the Farm Island's usable tile count. As an initial tuning range, use an
  unscaled radius around 4.6–5.1 versus the Farm Island's current 7.2, then
  adjust only as needed for a valid layout.
- Keep it stationary directly north of the Farm Island's measured final
  position without overlap. Keep the bridge and both approaches aligned and
  easy to drive on a phone.
- Budget its land tightly: it needs the bridge landing, cargo hub, settlement
  cluster, connective paths, two named vehicle spawns with safe turnaround
  space, and a limited
  reserve for later settlement growth. It should not provide a second broad
  area for fields or unrestricted player construction.
- Move cargo-site selection and the existing functional cargo hub from the Farm
  Island to the Settlement Island. Remove assertions that require the cargo deck
  to occupy the starter hub's west side and replace them with role-based
  settlement-site validation.
- Add a small authored cluster that reads as a travelling community: a few
  homes, one communal/receiving structure, paths or worn ground, and restrained
  warm lighting.
- Follow the GDD's Building Voxel Construction Standard for every settlement
  structure. Use `MODEL_VOXEL` and `createVoxelModel()`, stepped roofs, real wall
  thickness, constructed openings, and voxel-sized details.
- Keep the settlement buildings non-interactive in this slice. Do not add
  inhabitants, housing management, need meters, consumption, services, growth,
  or construction controls.
- Reserve settlement footprints and approaches so player construction,
  vegetation, rocks, and farming operations cannot overlap the authored
  cluster or block the receiving route.
- Enforce the Settlement Island's disabled farming/construction capabilities
  across all of its remaining land as well as the reserved cluster. Manual and
  automatic building placement must skip it. Ploughing, seeding, spraying,
  mowing, baling, and harvesting must not turn its decorative ground into a
  productive field. Vehicle traversal and cargo interaction remain allowed.
- Route those checks through the island record/capability boundary rather than
  marking every settlement tile `reserved`; `reserved` remains the local rule
  for authored footprints and approaches. Apply the same capability checks when
  restoring field, forage, and player-building state.
- Keep the Farm Island visually and mechanically dominant. From the normal
  camera, the Settlement Island should be unmistakably the smaller member of
  the starting pair.
- Add matching static obstacle colliders and register relevant occluders. Keep
  visual geometry separate from simple gameplay collision.
- Preserve the existing milestone delivery behavior at the relocated cargo hub,
  including staged cargo, VTOL pickup, lighting, transfer effects, and camera
  occlusion.

### 3. Remove generator assumptions about later islands

In `src/world/generator.js`:

- Generate only the configured starter records.
- Build only the one configured bridge.
- Resolve bridge endpoints through an ID map instead of `islands[fromId]` and
  `islands[toId]`.
- Pass configured stable identity, role, and capabilities into
  `createIslandRecords()`; generation loop order must not change those values.
- Preserve the starter lake, workshop, relocated settlement cargo site,
  separate tractor/combine spawns, ground reservations, fields, decorations,
  water, occlusion, lighting, crop instances, forage, and building-site queries.
- Temporarily disable ambient wildlife generation. Do not spawn reindeer, the
  red fox, or the snow fox on the two-island starting world. This does not remove
  cattle or other gameplay livestock systems.
- Remove the whole-world retry whose only purpose is guaranteeing a watercourse
  on islands beyond the starter pair. Keep the cargo-site validity retry.
- Replace later-island density and watercourse branches based on numeric IDs
  with explicit role/capability checks where those branches remain relevant.
- During the opening, build only Settlement terrain, underside, obstacle, and
  vehicle collision. The approaching Farm is a non-colliding visual and the
  bridge stays absent. At docking, activate the final Farm and bridge visuals
  and rebuild the complete static collider set in the same update. Do not add
  general moving-ground or candidate-island physics.
- Confirm disposal still removes every visual and gameplay resource created for
  the smaller farm.

The output facade of `generateFarm()` should remain compatible with the app:
`group`, `terrain`, `islands`, `connections`, `vehicleSpawnPoints`, farming
operations, animation, persistence, and disposal remain available.

### 4. Start a recoverable schema-0 persistence lineage

In `src/persistence/schema.js`, `src/persistence/index.js`,
`src/persistence/migrations.js`, and `src/persistence/storage.js`:

- Set `SCHEMA_VERSION` to `0` and treat that as the first format for the new
  two-island direction.
- Change the active storage key from `farmipelago.gameState` to
  `farmipelago.gameState.v2`. Do not read, migrate, delete, or overwrite the
  legacy key during normal load, save, restart, or invalid-state recovery.
- Remove the migrations for schemas 6–10 and delete `migrations.js` when it no
  longer has a responsibility.
- Remove `migrateState()` from the load path. Validate stored state directly
  against schema 0.
- Keep `loadGameState()` behavior explicit: an incompatible value under the new
  v2 key is removed from that key only, and initialization receives no saved
  state, producing a new seed and clean progression, buildings, vehicles,
  inventories, UI, and environment state.
- Replace version-gated compatibility checks in `validState()` with one explicit
  schema-0 validator. It must require the existing top-level gameplay fields,
  the persisted environment phase, `world.tiles`, `world.islands`, and
  `world.connections`; schema 0 must not inherit the old `schemaVersion < 9` or
  `< 10` exemptions.
- For this slice, validate exactly two island records with unique IDs
  `island-0` and `island-1`, roles `farm` and `settlement`, valid transforms and
  boolean `capabilities.farming` / `capabilities.construction` values, plus
  exactly one connection whose endpoints resolve those two IDs. Settlement is
  always `attached`; Farm and bridge are coherently either `approaching` or
  `attached`. Reject
  duplicate/dangling IDs and island-local building or vehicle poses that
  reference an unknown island.
- Confirm the first automatic save writes schema 0 with exactly two
  islands and one connection.
- Confirm refresh after attachment restores the already settled pair. Refresh
  during approach deterministically replays the approach from its start while
  retaining the otherwise valid schema-0 state.

No ownership filtering, pose conversion, or partial state preservation from the
legacy save is part of this slice.

### 5. Audit systems that count or target islands

Check the following without expanding their designs:

- Ambient wildlife must not be created or animated in this temporary starting
  slice. Its implementation may remain available for a later reintroduction,
  but the farm should own no wildlife system or wildlife scene objects.
- Construction must continue to reserve workshop, cargo, bridge, and
  vehicle-spawn ground plus the authored settlement cluster and its approaches.
- Farming, forage, construction, and restoration queries must operate only on
  retained terrain whose owning island permits the requested operation.
- Camera occlusion and rescue must not retain bounds or targets from removed
  islands; both named rescue targets belong to Settlement.
- Debug UI, milestone logic, and README claims must not promise the former
  seven-island starting world.
- Regeneration must remove the old farm group and colliders, reset both vehicles
  to their named Settlement spawns, reset field counters, and replay the
  collision-safe opening approach.

### 6. Documentation and versioning

- Update `docs/Farmipelago_GDD.md` and `README.md` to describe the Farm Island +
  Settlement Island opening, relocated cargo hub, minimal non-simulated
  settlement shell, and temporary absence of ambient wildlife when
  implementation lands.
- Update `docs/Architecture.md` to describe configuration-owned island identity,
  role and land-use capabilities, plus the new schema-0/v2 storage lineage.
- Increment the `#buildVersion` in `index.html` for the implementation change
  set.

### Step 1 completion criteria

- A fresh seed creates exactly two physically separate island records and one
  approaching connection. The stationary Settlement and both parked vehicles
  are immediately visible in the establishing shot, but HUD and gameplay input
  stay suppressed until docking and the continuous return to the normal drive
  camera finish. The visible, non-colliding Farm approaches from the south,
  then the Farm and bridge become attached, visible, and collider-active in one
  transition.
- The final centers share X exactly. Their terrain does not overlap or touch,
  the square-edge gap is greater than one tile, and the modeled bridge deck is
  `2.0 ± 0.25` tiles across their only connection.
- No terrain, underside, bridge, decoration, wildlife, water, or collider from
  removed islands remains.
- No ambient reindeer, red fox, or snow fox is present. Cattle remain available
  through the existing livestock progression.
- The Farm Island contains the workshop, starter lake, and starter field space.
  The Settlement Island visibly reads as a small community, occupies roughly
  two-fifths to one-half of the Farm Island's usable footprint, sits directly
  north of the Farm Island, and contains the usable cargo hub plus distinct
  tractor and combine spawns with clear turnaround space.
- Runtime records expose the configured `farm` and `settlement` roles and their
  land-use capabilities; neither role nor capability is inferred from array
  order or numeric comparison.
- Settlement buildings, paths, cargo approaches, bridge landings, and colliders
  do not overlap, float, or block the required driving route.
- Unreserved Settlement Island terrain remains traversable but rejects player
  construction and all field/forage work in both fresh and restored state.
- Existing crop, hay, cattle, construction, storage, logistics, milestone,
  vehicle-switching, day/night, and save systems still initialize.
- Any incompatible value under `farmipelago.gameState.v2` is rejected, removed
  from that key, and replaced by a fresh two-island save. A pre-step legacy save
  under `farmipelago.gameState` is ignored and left byte-for-byte unchanged.
- Refresh during approach replays the deterministic opening from its start;
  refresh after attachment restores the already settled pair and saved state.
- Regeneration produces a new playable Settlement and repeats the Farm approach
  without ghost collision.

### Step 1 hard manual test gate

Do not begin step 1.5 until a person has completed this gate:

1. Start a fresh farm and confirm the opening begins with both parked vehicles
   clearly visible on the stationary Settlement, slowly reveals the Farm while
   retaining the vehicles in the composition, travels with its final approach,
   and eases continuously back to the normal drive framing without a camera
   snap. Confirm the HUD stays hidden and driving, jump, tool, build,
   vehicle-switch, camera-rotation, and interaction inputs have no effect until
   the return completes, then become available together. Confirm the Farm
   visibly approaches from the south along negative Z while remaining
   non-colliding and initially beyond jump reach.
   Confirm it stops directly south with exact center-X alignment, then the Farm
   and bridge appear and become solid together without a ghost or early
   collider. Confirm the final bridge is about two tiles long across a visible
   non-touching air gap and is the only connection. Confirm no ambient reindeer,
   red fox, or snow fox is spawned.
2. Confirm the workshop, lake, and starter fields are on the Farm Island, while
   the distinct tractor/combine spawns remain on the Settlement Island with
   usable turnaround space. Confirm the smaller Settlement contains a readable
   voxel-built community and the cargo hub, with no building/collider overlap.
   Confirm it is clearly much smaller than the Farm Island and does not offer a
   second broad farming/construction area. Attempt manual and automatic building
   placement plus ploughing and mowing on otherwise clear settlement ground;
   confirm each is rejected while driving and cargo interaction still work.
3. Drive both vehicles around both islands; cross the bridge and settlement
   approaches in both directions.
4. Test camera-relative keyboard and virtual-stick driving, jumping from ground
   and beside walls, vehicle switching, and rescue after falling below the farm.
5. Plough, seed, grow, harvest, unload to a silo, load a trailer, cross to the
   Settlement Island, and deliver at the relocated cargo hub.
6. Enable each relevant attachment and confirm field counts and tool visuals.
7. Place and confirm a silo. With debug progression where necessary, place a
   cattle barn and pen, feed cattle, and load milk.
8. Refresh during the opening and confirm it restarts deterministically from the
   establishing shot with the HUD and controls still suppressed through release.
   Let attachment complete, refresh again, and confirm the pair starts already
   settled in normal drive view without replaying the cinematic. Confirm terrain
   edits, crops, buildings, livestock, inventories, vehicle poses/loadouts,
   progression, and time of day return correctly.
9. Place one pre-step-1 fixture under the legacy `farmipelago.gameState` key.
   Confirm the game ignores it and starts a completely fresh two-island
   Farmipelago with no retained progress, fields, buildings, livestock,
   vehicles, inventory, or settings from that save. Refresh again and confirm
   the newly written v2 save persists, then confirm the legacy fixture is still
   present and byte-for-byte unchanged.
10. Regenerate and confirm the old group/colliders are gone, both vehicles use
   their own Settlement spawn points, field counters reset, and the Farm
   approach plays again before its atomic collider/bridge activation.
11. Repeat the core checks at a narrow phone-sized viewport and confirm both
    vehicles, the Farm reveal, docking, and camera return stay readable; after
    release the HUD and controls remain usable without scrolling or zoom. Also
    enable reduced motion at the OS/browser level and confirm all four narrative
    beats remain readable in the shorter, gentler sequence.

Record the fresh seed and old-save fixture used for the reset check. A build
pass alone does not satisfy this gate.

## Step 1.5 — Make the Starter Pair Feel in Motion

### Visual target

The player should understand within several seconds that the farm is travelling
through the sky, even while the tractor is stationary. The cue should be calm,
continuous, readable at phone scale, and subordinate to farming.

The motion must not suggest that the bridge or the two connected islands are
sliding relative to one another.

### 1. Add a world-owned visual travel model

Add a small world-level travel module such as `src/world/travel.js`, composed by
`src/app/main.js`. It owns:

- A constant normalized southwest travel direction of
  `(-√½, 0, +√½)` (negative X, positive Z).
- A conservative base travel speed.
- Accumulated visual travel distance derived from clamped frame delta.
- A deterministic, smooth gust signal used only for presentation.

Keep this state independent from island transforms and physics. The app advances
it once per render update and passes one read-only snapshot to environmental
presentation and, if needed, existing vegetation animation. The environment
renderer must not become the source of truth for Farmipelago travel.

The travel state does not need save persistence in this slice because it carries
no gameplay consequence; the time-of-day phase remains persistent as it is now.

Expose only the minimal state useful to presentation, such as current travel
direction, distance, speed, and gust amount. Do not put candidate encounter
timing or lifecycle policy in the travel module.

### 2. Turn the clouds into wrapped parallax bands

Refactor the current cloud definitions into at least two depth/speed bands:

- Lower/near clouds move northeast, opposite the Farmipelago's southwest travel
  direction, quickly enough to establish motion.
- Far clouds move more slowly to create parallax and depth.
- Existing vertical bob remains subtle and secondary to horizontal travel.

Wrap clouds through a generous corridor centered on a stable travel frame
instead of letting them travel away forever. When a farm is initialized or
regenerated, derive that frame once from the union of the two starter islands'
world bounds and give the environment its center and extent. The lighting focus
may continue to follow the drive, construction, or cinematic target, but it must
not be reused as the cloud wrap center. Wrapping must:

- be deterministic and allocation-free during the frame loop;
- avoid visible mass popping inside the normal camera view and fog range;
- preserve varied spacing, height, scale, and phase;
- remain correct after 90-degree camera rotations and while driving across both
  islands;
- keep the same wrap frame through vehicle switches, construction view, and
  milestone cinematics; only explicit world-topology initialization may replace
  it;
- keep cloud meshes non-interactive, non-shadow-casting, and outside physics.

Cloud motion should be world-directional, not camera-directional. Rotating the
camera may change the apparent screen direction, but must not reverse travel.
Driving, changing views, or switching vehicles must not move the wrap boundary
or cause a cloud to inherit camera/vehicle motion. A later attachment slice may
recompute the frame on an explicit topology-change event; do not recompute it
per frame.

### 3. Give low fog a compatible motion cue

The current low fog is a stack of untextured planes, so translating the planes
would be visually invisible. Add only enough structure to make slow relative
motion legible, for example sparse translucent voxel wisps or broad soft patches
below the islands that wrap using the same travel direction.

Requirements:

- Reuse a small fixed mesh/instance pool; do not create or dispose objects per
  frame.
- Keep the layer below traversable terrain and visually behind waterfalls and
  island undersides.
- Preserve day/night color response and fog readability.
- Avoid a dense particle field, screen-space overlay, or shader rewrite in this
  slice.

If cloud parallax alone communicates travel clearly on a phone, defer these
wisps rather than adding visual noise.

### 4. Align existing wind animation

In the farm/world animation facade:

- Feed the shared travel snapshot's direction and gust amount into existing
  tree and crop sway where this can be done without moving simulation state.
- Keep the current authored variation between plants while giving gusts a shared
  directional bias.
- Do not apply wind forces to vehicles, bales, water physics, or character
  handling.
- Do not move planted crops, decorations, buildings, bridge pieces, lanterns,
  water surfaces, or island shadows away from their owning island.

This is polish behind the primary cloud-motion cue. It should be omitted if it
requires broad coupling; neither the environment nor vegetation system should
import the other's internals.

### 5. Keep future candidate islands visually distinct

Step 1.5 environmental motion must leave room for step 3:

- Ambient clouds/fog wrap and have no island lifecycle.
- Future passing islands will have explicit transforms, lifecycle status,
  collision ownership, and spawn/despawn events.
- Do not fake the first candidate with an ambient island silhouette in this
  slice; it could teach the player that islands are scenery rather than
  boardable opportunities.
- Keep the world-owned travel direction available as a default for future
  encounter paths, but do not make the travel or environment module schedule
  encounters.

### 6. Performance and reduced motion

- Reuse geometry/materials and update transforms only.
- Keep all visual movement in the render update, outside the fixed physics step.
- Clamp delta through the existing app update path.
- Respect the game's reduced-motion state. Reduced motion should retain a slow,
  steady translation cue while disabling or greatly reducing bob and gust
  oscillation; removing all travel cues would undermine the setting.
- The current reduced-motion value comes from the operating system/browser
  `prefers-reduced-motion` media query and is captured when modules load. Testing
  it requires changing that preference or browser emulation and reloading the
  page; do not add a new settings UI in this slice.
- Verify there is no unbounded growth in scene children, arrays, geometries, or
  materials after extended runtime.

### Step 1.5 completion criteria

- With both vehicles parked, environmental parallax makes the Farmipelago read
  as continuously travelling.
- The two islands, bridge, buildings, vehicles, water, crops, and colliders do
  not change gameplay coordinates.
- The Farmipelago consistently reads as travelling southwest through camera
  rotations, vehicle switches, construction view, pause/resume, day/night
  changes, refresh, and regeneration.
- Clouds/fog recycle without visible buildup or obvious popping near the farm.
- The presentation remains calm and readable on a narrow phone viewport.
- No environmental motion affects vehicle control, jumping, field work,
  collision, persistence, or rescue.

### Step 1.5 hard manual test gate

Do not begin the passing-candidate slice until a person has completed this gate:

1. Park the tractor for at least 30 seconds at several points on both islands.
   Confirm the Farmipelago reads as travelling southwest while clouds/fog move
   northeast, rather than as random cloud wandering.
2. Rotate the camera through all four orientations and confirm the world travel
   vector remains consistent.
3. Drive and jump while watching near/far clouds. Confirm their speed does not
   track the camera or vehicle and does not impair depth judgment.
4. Observe a full day/night preview using the debug slider. Confirm clouds and
   any fog wisps retain appropriate color, contrast, and layering.
5. Pause/resume, switch vehicles, enter/leave construction view, refresh, and
   regenerate. Confirm environmental motion resumes cleanly without jumps that
   expose wrapping.
6. Test once with normal motion. Then enable the operating system's reduced
   motion preference or the browser's `prefers-reduced-motion: reduce`
   emulation, reload the page, and repeat the test. Restore the preference and
   reload again afterward.
7. Leave the game running for at least 15 minutes. Confirm cloud/fog counts stay
   constant and frame rate does not degrade.
8. Repeat the visual test at a narrow touch-sized viewport and verify the moving
   environment does not compete with HUD legibility.
9. Re-run the complete step 1 farming/regeneration smoke test to confirm this
   visual slice introduced no gameplay regression.

## Required Step 2 Completion Before Step 3

The existing island records, island-local coordinates, support IDs, and
per-island terrain batches are useful groundwork, not a completed independent
island generator.

After steps 1 and 1.5 pass their gates, finish step 2 as its own vertical slice:

- Expose an independently callable generator that returns one island's stable
  record, terrain, visuals, obstacles, underside data, and connection
  candidates without rebuilding the permanent starter pair.
- Keep the returned content owned by one disposable group/facade with an
  explicit cleanup boundary.
- Spawn one third island manually at a fixed transform.
- Verify it looks and collides like an ordinarily generated island while the
  original two islands' island-specific persistent content and runtime
  transforms remain unchanged.
- Remove the third island and confirm its visuals and colliders are fully
  disposed.

Do not begin timed spawning or drift paths until this step-2 gate passes.

## Suggested Commit Boundaries

Keep the hard gates meaningful by avoiding one large commit:

1. `refactor: define permanent starter topology`
2. `feat: establish the starter settlement island`
3. `refactor: temporarily remove ambient wildlife`
4. `chore: reset saves for the starter pair`
5. `docs: describe the two-island starting farm`
6. **Run and record the step 1 manual gate.**
7. `feat: add world travel and environmental parallax`
8. `feat: align ambient wind with farm travel` only if the smaller cue is needed
9. **Run and record the step 1.5 manual gate.**
10. Complete and test step 2 on its own branch or commit sequence before step 3.

Do not start candidate-island scheduling, moving collision, boarding, or Keep UI
until both gates pass.

## Deferred Work

- Settlement inhabitants, needs, consumption, services, growth, and tier
  progression beyond the initial non-interactive building shell.
- Further starter-island art/layout iteration beyond the Farm Island +
  Settlement Island structure established here.
- Reintroduction of ambient wildlife once island lifecycle ownership is ready.
- Physical movement of permanent islands.
- Per-island collider creation/removal for passing candidates.
- Encounter cadence and debug spawning.
- Candidate boarding, rescue timing changes, attachment, bridge creation, and
  permanent-island placement rules.
- Persistence for newly accepted islands.
- Ambient non-interactive distant islands.
