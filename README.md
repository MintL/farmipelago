# Floating Farm Prototype

A phone-first Three.js prototype for a playful farming/driving game on generated floating islands.

## Included

- portrait-first UI
- smooth high-angle follow camera that keeps the tractor framed
- generated archipelago with a level starter farmyard, walk-in 3×3 barn, larger lobed islands, stepped height levels, and bridges across wide gaps
- generated props that fade when they block the camera's view of the tractor
- one broad raised plot and one broad base level on each non-starter island, both kept clear as usable farm plots
- small procedural lakes that feed animated rivers and waterfalls spilling below the islands
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse, clustered visual-only grass tufts that the tractor can drive through and plough clear
- red-and-gold hero tractor with a glazed cab, treaded wheels, lamps, beacon, and squash-and-stretch jumps
- visible four-share plough that changes grass tiles into ploughed soil
- two larger toy-like tree silhouettes—forked orchard and umbrella—that sway in the wind, plus voxel stones
- camera-relative virtual stick: point where the tractor should drive on screen
- jump button; no ramps required
- falling and automatic tractor rescue
- regenerate button for a new procedural farm
- keyboard fallback: WASD/arrows + Space
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers

## Code layout

- `main.js` — rendering, camera, and gameplay loop
- `physics.js` — Rapier world, seamless static meshes, and tractor character controller
- `world-generator.js` — procedural islands, terrain meshes, and collider inputs
- `tractor.js` — tractor and plough visuals
- `ui.js` — touch and keyboard controls, HUD, and toasts
- `shared.js` — shared Three.js materials, constants, and mesh helpers

## Run

The prototype imports Three.js and Rapier from jsDelivr, so it needs an internet connection.

Serve this folder with any static HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` on desktop, or expose the server on your LAN and open it from a phone.

For a phone-only test, deploying the folder to any static host also works.
