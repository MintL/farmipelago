# Farmipelago contributor guide

## Project at a glance

This is a small, phone-first 3D farming game built with plain JavaScript ES
modules and Vite. Three.js and Rapier are pinned npm dependencies. There is no
framework, linter, or automated test suite.

Install dependencies and start the Vite development server (do not open
`index.html` directly):

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Use
`npm run dev -- --host 0.0.0.0` when testing from another device on the LAN.
Test both desktop keyboard input and a narrow,
touch-sized viewport when changing interaction or layout.

Run `npm run build` before handing off a change. Deploy the generated `dist/`
directory to static hosting; do not deploy the unbuilt source directory.

### Browser automation workaround

If the in-app browser client fails during setup with `Cannot redefine property:
process` or `global.process.on is not a function`, patch its installed
`scripts/browser-client.mjs` before retrying. In the versioned browser-plugin
directory under `~/.codex/plugins/cache/openai-bundled/browser/`, keep the
`processShim`, then replace its direct global-process assignments with this
safe local shim setup:

```js
const process = processShim;
const global = Object.create(globalThis);
Object.defineProperty(global, 'process', { value: processShim, configurable: true, writable: true });
const hasProcessApi = candidate => candidate?.versions?.node && typeof candidate.on === 'function' && typeof candidate.listeners === 'function';
if (!hasProcessApi(globalThis.process)) {
  try { globalThis.process = processShim; }
  catch { try { Object.assign(globalThis.process ?? {}, processShim); } catch {} }
}
globalThis.global = globalThis.global ?? globalThis;
if (!hasProcessApi(globalThis.global.process)) {
  try { globalThis.global.process = globalThis.process ?? processShim; }
  catch { try { Object.assign(globalThis.global.process ?? {}, processShim); } catch {} }
}
```

This preserves the host runtime's locked globals while giving the bundled
client the Node-style `process` API it expects. The patch is local to Codex's
plugin cache and must be reapplied when that browser plugin version changes.

## Game design direction

Read [`docs/Farmipelago_GDD.md`](docs/Farmipelago_GDD.md) in full before
planning or implementing player-visible gameplay, progression, world, UI, or
art changes. It is the living source of truth for the intended game direction.

In particular, preserve these foundations unless a change deliberately updates
the GDD as well:

- The Farmipelago is a single persistent, procedurally generated voxel world;
  regeneration is a development/debug action, not the intended player loop.
- Direct operation of vehicles and compatible front/rear attachments is central
  to farming. Keep the game compact, playful, mobile-first, and readable rather
  than simulating agriculture in excessive detail.
- Progression should add capabilities and meaningful choices: main progression
  comes from increasingly varied delivery requirements, while optional
  milestones reward broad farm development. Do not introduce pressured timers,
  mandatory grinding, or a primarily money-driven equipment ladder.
- Island shape, elevation, and generated dry/wet and sunny/shady conditions
  should make land use meaningful. Prefer features that visibly improve or make
  new use of the physical Farmipelago.
- Keep the world visually dominant. Use modern, minimal, labeled controls and
  avoid free-to-play-style currencies, reward clutter, and decorative panels.

## Code map

- `index.html` contains the HUD markup; `src/styles/` contains its styles.
- `src/app/` owns renderer/scene setup and game-session orchestration.
- `src/world/` owns generated terrain, environment, forage, and wildlife.
- `src/world/archipelago/` owns stable island records, connections, and
  local/world coordinate boundaries. See `docs/Architecture.md`.
- `src/gameplay/` owns vehicles, construction, livestock, logistics, catalogs,
  and progression.
- `src/physics/` owns Rapier simulation and collider construction.
- `src/ui/` translates touch and keyboard input and owns HUD presentation.
- `src/persistence/` owns save validation, migration, loading, and writing.
- `src/core/shared.js` is the source of truth for Three.js, tile/layer
  dimensions, shared materials, the `MODEL_VOXEL` / `createVoxelModel()`
  construction convention, box meshes, and `gridKey()`.

## Important invariants

- Keep terrain visuals and collision data synchronized. When changing island
  tiles, plateaus, undersides, bridges, or obstacles, ensure
  `physics.rebuildStaticColliders()` receives matching data.
- Terrain is addressed on the tile grid with `gridKey(gx, gz)`. Convert world
  coordinates using `TILE`; do not introduce a competing coordinate scheme.
- A regeneration must remove the old `farm.group`, rebuild static colliders,
  reset/create the tractor at `farm.spawn`, and reset the ploughed-tile counter.
- The tractor body is kinematic. Route movement through `FarmPhysics.drive()`
  and `FarmPhysics.step()` rather than setting its position from rendering code.
- Visual heading and physical travel are deliberately separate so input feels
  immediate during turns. Preserve that behavior unless changing the handling
  model intentionally.
- Ploughing changes a tile's material in place and must only count each tile
  once. It is currently gated by enabled state, grounded state, and speed.

## Style and change guidance

- Use native ES modules, two-space indentation, semicolons, and the existing
  concise function/constant style.
- Prefer small procedural primitive meshes and shared materials; do not add an
  asset pipeline or framework for a local feature.
- Before adding or rebuilding any building, follow the GDD's **Building Voxel
  Construction Standard**. Author it on the shared five-model-voxels-per-tile
  grid with `MODEL_VOXEL` and `createVoxelModel()`: use stepped roofs, real
  wall thickness, constructed openings, and voxel-sized structural details.
  Do not introduce wall-sized arbitrary boxes, rotated roof slabs, smooth
  low-poly building forms, visible grid lines, or cube textures.
- Keep mobile controls usable with safe-area insets and `pointer` events.
  Keyboard controls (WASD/arrows and Space) are a required fallback.
- Keep rendering work out of the fixed physics step. Clamp frame deltas before
  passing them into gameplay as `main.js` does.
- Increment the `0.x` `#buildVersion` displayed in `index.html` for every
  change set, so a refreshed game always shows a higher version after an edit.
- Update `README.md` when player-visible controls, setup, dependencies, or
  major game features change.

## Manual verification checklist

Do not automate or attempt to automate these manual tests unless the user
explicitly asks for automated testing. This includes browser automation,
scripted input, synthetic save states, and test-only gameplay hooks. When
automation was not requested, leave the checklist for a person to perform and
report which checks remain manual.

After gameplay, terrain, or UI changes, run the server and verify:

1. Initial farm appears, the tractor spawns on solid ground, and regenerate
   creates a new traversable layout without ghost collisions.
2. Keyboard and virtual-stick driving are camera-relative; jump works from the
   ground and alongside walls; falling below the islands rescues the tractor.
3. Bridges and raised plateaus have matching collision and do not permit obvious
   clipping or falling through.
4. Enabling the plough shows it, ploughs each driven-over tile once, and updates
   the HUD count; regeneration resets that count.
5. On a phone-sized viewport, the HUD remains visible and controls remain
   reachable without scrolling or browser zoom.
