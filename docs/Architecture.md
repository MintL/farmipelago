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
- `src/persistence/` validates, migrates, reads, and writes save data.
- `src/voxel-studio/` is a separate Vite entry point and tool boundary.

Prefer one cohesive responsibility per file. Aim for 100–300 lines and treat
350 lines as a prompt to look for a real boundary, not as a reason to split a
single procedural model into arbitrary fragments.

## Island ownership

The world generator still renders the attached archipelago in its established
fixed formation. The runtime now describes that formation as stable island
records and connection records so passing islands can later move independently
without changing existing gameplay first.

An island record owns:

- a stable string ID, deterministic seed, role, and lifecycle status;
- a world transform and local bounds;
- a local terrain map keyed by `gridKey(localGx, localGz)`;
- future island-local buildings, vehicles, forage, wildlife, and effects.

World-space tile lookup remains available at the runtime boundary. Code stored
inside an island should use local coordinates; references crossing an island
boundary use `{ islandId, gx, gz }`. Bridges are connection records with an
anchor on each island instead of being treated as anonymous world geometry.
Named vehicle spawn points are likewise stored as island-local poses and
resolved through the archipelago runtime when a vehicle is created or rescued.

Attached islands currently have identity rotation and fixed transforms. A
passing island may later change its transform, but policy such as encounter
timing, settlement, and attachment belongs outside the coordinate runtime.

## Physics and saves

Physics remains authoritative for vehicle and bale motion. Grounded vehicle and
sleeping bale state includes `supportIslandId`, allowing a future moving island
to carry supported objects without coupling Rapier to world generation.

Save schema 10 records island transforms, content, and connections. Buildings
and vehicles also store an island-local pose while retaining their world pose
for safe migration and current restoration. Schema 9 saves are upgraded using
the deterministic attached-island layout; the next save fills in generated
anchors and island-local content.
