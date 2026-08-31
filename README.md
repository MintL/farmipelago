# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with an environmental crop-planning view.

## Included

- modern phone-first HUD with safe-area support, a dynamic touch joystick, input-aware desktop hints, and a discreet build/FPS readout
- smooth high-angle follow camera that keeps the tractor framed
- generated archipelago with a level starter farmyard, walk-in 3×3 barn, roughly 1.5×-size lobed islands, stepped height levels, and bridges across wide gaps
- generated props that fade when they block the camera's view of the tractor
- one broad raised plot and one broad base level on each non-starter island, both kept clear as usable farm plots
- small procedural lakes that feed animated rivers and waterfalls spilling below the islands
- high-contrast generated moisture and sunlight fields that tint grass, gather trees into cool damp groves, and leave bright dry areas rockier and mostly treeless
- crop suitability mode with Wheat, Corn, Rice, and Potato views; selecting it switches to an elevated map camera with drag and keyboard panning
- a second, round build button beneath suitability: open it to enter a pannable construction view, select the free detailed grain silo, and drag it onto a clear level patch; placed silos have physical collision and can be repositioned in build mode
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse, clustered visual-only grass tufts that the tractor can drive through and plough clear
- blue hero tractor with a glazed cab, treaded wheels, lamps, beacon, and squash-and-stretch jumps
- barn-style loadout room with live 3D vehicle, rear-tool, and front-tool previews; choose either the Farm Tractor or Combine Harvester for mature-crop collection (its built-in header disables the tractor's front and rear tool bays); drive beside a placed silo and use the unload action to empty its grain tank
- visible four-share plough that changes grass tiles into ploughed soil
- seeded corn tiles grow through four fast-testing cuboid stages; stage two can show bright weeds and the final stage is ready to harvest
- input-aware tool control that raises or lowers tractor attachments, or starts and stops the combine header; harvested ready crops fill the on-screen grain tank meter according to their suitability score
- two larger toy-like tree silhouettes—forked orchard and umbrella—that sway in the wind, plus voxel stones
- camera-relative dynamic virtual stick: touch anywhere in the lower-left drive zone and point where the tractor should move on screen
- jump button; no ramps required
- falling and automatic tractor rescue
- pause menu with a controls reference and confirmed generation of a new procedural farm
- keyboard fallback: WASD/arrows to drive, Space to jump, E to raise/lower the tool, F to empty a combine beside a silo, B for the build menu, Escape to leave building/suitability view or open the menu, and 1–3 for equipment inside the barn workshop
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers

## Code layout

- `main.js` — rendering, tractor gameplay, camera modes, and gameplay loop
- `physics.js` — Rapier world, seamless static meshes, and tractor character controller
- `world-generator.js` — procedural islands, environmental fields, terrain meshes, and collider inputs
- `crops.js` — crop environmental profiles and pure suitability/growth/yield calculations
- `buildings.js` — detailed procedural silo, placement animation/audio feedback, and placed-building state
- `tractor.js` — tractor and swappable attachment visuals
- `farm-assets.js` — reusable procedural vehicle and equipment factories shared by gameplay and UI previews
- `ui.js` — touch and keyboard controls, HUD, workshop, menus, and suitability controls
- `shared.js` — shared Three.js materials, constants, and mesh helpers

## Run

The prototype imports Three.js and Rapier from jsDelivr, so it needs an internet connection.

Serve this folder with any static HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` on desktop, or expose the server on your LAN and open it from a phone.

For a phone-only test, deploying the folder to any static host also works.
