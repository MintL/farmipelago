# Farmipelago contributor guide

## Project at a glance

This is a small, phone-first 3D farming prototype. It is plain browser ES
modules: there is no package manager, bundler, linter, or automated test suite.
Three.js and Rapier are loaded from pinned jsDelivr ESM URLs, so an internet
connection is required while running the game.

Serve the repository with a static HTTP server (do not open `index.html`
directly):

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Test both desktop keyboard input and a narrow,
touch-sized viewport when changing interaction or layout.

## Code map

- `index.html` contains the complete HUD markup and CSS.
- `main.js` owns renderer/scene setup, camera-relative movement, the animation
  loop, regeneration, rescue, and plough application.
- `world-generator.js` builds seeded floating islands, decorative meshes,
  bridges, tile metadata, and collider inputs. `generateFarm()` returns the
  rendered group, spawn point, terrain map, and `ploughAt()` API.
- `physics.js` owns the Rapier world and the kinematic capsule controller.
  Simulation runs at a fixed 60 Hz behind the variable-rate render loop.
- `tractor.js` contains only tractor/plough visuals and visual animation.
- `ui.js` translates touch and keyboard input, owns the HUD state, and calls
  callbacks supplied by `main.js`.
- `shared.js` is the source of truth for Three.js, tile/layer dimensions,
  shared materials, box meshes, and `gridKey()`.

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
- Keep mobile controls usable with safe-area insets and `pointer` events.
  Keyboard controls (WASD/arrows and Space) are a required fallback.
- Keep rendering work out of the fixed physics step. Clamp frame deltas before
  passing them into gameplay as `main.js` does.
- Update `README.md` when player-visible controls, setup, dependencies, or
  major game features change.

## Manual verification checklist

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
