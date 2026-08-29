# Floating Farm Prototype

A phone-first Three.js prototype for a playful farming/driving game on generated floating islands.

## Included

- portrait-first UI
- smooth high-angle follow camera that keeps the tractor framed
- generated archipelago with dramatic lobed islands, oversized hero islands, and stepped height levels
- varied rectangular edge plateaus, kept clear as usable farm plots
- chunky grass / dirt / stone terrain with deep, pointed undersides
- finer-scale animated tractor
- visible three-blade plough that changes grass tiles into ploughed soil
- small trees, large trees and voxel stones
- camera-relative virtual stick: point where the tractor should drive on screen
- jump button; no ramps required
- falling and automatic tractor rescue
- regenerate button for a new procedural farm
- keyboard fallback: WASD/arrows + Space
- Rapier kinematic capsule controller with autostep, ground snapping, wall-contact jumping, and fixed 60 Hz simulation
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
