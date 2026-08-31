# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with an environmental crop-planning view.

## Included

- modern phone-first HUD with safe-area support, a dynamic touch joystick, input-aware desktop hints, and a discreet build/FPS readout
- smooth high-angle follow camera that keeps the controlled vehicle framed
- generated archipelago with a level starter farmyard, walk-in 3×3 barn, roughly 1.5×-size lobed islands, stepped height levels, and bridges across wide gaps
- permanent cargo hub cantilevered from the second island, with a marked landing deck, staged delivery crates, and a chunky four-fan VTOL that visits after startup and then once per minute
- generated props that fade when they block the camera's view of the tractor
- one broad raised plot and one broad base level on each non-starter island, both kept clear as usable farm plots
- small procedural lakes that feed animated rivers and waterfalls spilling below the islands
- high-contrast generated moisture and sunlight fields that tint grass, gather trees into cool damp groves, and leave bright dry areas rockier and mostly treeless
- crop suitability mode with Corn, Wheat, Barley, Canola, and Soybeans views; selecting it switches to an elevated map camera with drag and keyboard panning
- a second, round build button beneath suitability: open it to enter a pannable construction view, select the free detailed grain silo, and drag it onto a clear level patch; placed silos have physical collision and can be repositioned in build mode
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse, clustered visual-only grass tufts that the tractor can drive through and plough clear
- blue hero tractor with a glazed cab, treaded wheels, lamps, beacon, and squash-and-stretch jumps
- a persistent owned Farm Tractor and Combine Harvester: both remain parked as solid world objects, keep their positions, loadouts, and storage, and can be cycled without spawning or teleporting the other vehicle
- barn-style loadout workshop with live 3D previews for the controlled vehicle and its compatible rear/front equipment; the combine's built-in header leaves its attachment bays unavailable, while its single-crop storage can unload at a silo or deliver required produce to the cargo hub
- repeatable 36-Corn milestone tracker: drop-offs count immediately, completed cargo waits visibly at the pad, and the next numbered milestone begins when the VTOL collects it
- visible four-share plough that changes grass tiles into ploughed soil
- the seeder plants selectable Corn, Wheat, Barley, Canola, or Soybeans seed; crops share readable early shoots before developing distinct four-stage voxel silhouettes, and stage two can show bright weeds
- input-aware tool control that raises or lowers tractor attachments, starts and stops the combine header, or cycles seed with the secondary action; harvested ready crops fill the on-screen crop-labeled tank meter according to their suitability score
- two larger toy-like tree silhouettes—forked orchard and umbrella—that sway in the wind, plus voxel stones
- camera-relative dynamic virtual stick: touch anywhere in the lower-left drive zone and point where the vehicle should move on screen
- lower-left cycle-vehicle button that immediately transfers control and camera to the next owned vehicle
- jump button; no ramps required
- falling and automatic tractor rescue
- pause menu with a controls reference and confirmed generation of a new procedural farm
- keyboard fallback: WASD/arrows to drive, Space to jump, E to raise/lower the tool, V to cycle vehicles, F to cycle seed with the seeder or transfer combine storage beside a silo/cargo pad, B for the build menu, Escape to leave building/suitability view or open the menu, and 1–3 for equipment inside the barn workshop
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers

## Code layout

- `main.js` — rendering, fleet gameplay, camera modes, and gameplay loop
- `physics.js` — Rapier world, seamless static meshes, and active-vehicle character controller
- `world-generator.js` — procedural islands, environmental fields, terrain meshes, and collider inputs
- `cargo-port.js` — procedural cargo hub, staged cargo, and recurring VTOL flight cycle
- `progression.js` — delivery milestone requirements, acceptance, completion, and pickup rollover
- `crops.js` — crop environmental profiles and pure suitability/growth/yield calculations
- `buildings.js` — detailed procedural silo, placement animation/audio feedback, and placed-building state
- `tractor.js` — persistent vehicle and swappable attachment visuals
- `vehicles.js` — owned fleet order, vehicle capabilities, and default per-instance loadouts
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
