# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with an environmental crop-planning view.

## Included

- modern phone-first HUD with safe-area support, a dynamic touch joystick, input-aware desktop hints, and a discreet build/FPS readout
- smooth high-angle follow camera that keeps the controlled vehicle framed
- generated archipelago with an expanded two-island starter area: a level farmyard with a walk-in 3×3 barn and a separate roomy cargo-hub island, linked by a bridge; the remaining lobed islands use the roughly 1.5× layout scale, stepped height levels, and bridges across wide gaps
- permanent cargo hub cantilevered from the second starter island, with a marked landing deck, staged delivery crates, and a chunky four-fan VTOL that makes a rapid curved arrival and departure while keeping its rotors fixed; completing a delivery milestone summons it straight to the pad for a short celebration flight and an explicit unlock reveal
- generated props that fade when they block the camera's view of the tractor
- one broad raised plot and one broad base level on each non-starter island, both kept clear as usable farm plots
- small procedural lakes that feed animated rivers and waterfalls spilling below the islands
- high-contrast generated moisture and sunlight fields that tint grass, gather trees into cool damp groves, and leave bright dry areas rockier and mostly treeless
- crop suitability mode with Corn, Wheat, Barley, Canola, and Soybeans views; selecting it switches to an elevated map camera with drag and keyboard panning
- a second, round build button beneath suitability: open it to enter a pannable construction view, select the free detailed grain silo, and drag it onto a clear level patch; placed silos have physical collision and can be repositioned in build mode, retain unloaded crops, and show their available crop volumes plus round icon Load / Unload controls beneath the popup; the cargo pad uses the same popup to show each delivery requirement and its Deliver control
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse, clustered visual-only grass tufts that the tractor can drive through and plough clear
- blue hero tractor with a glazed cab, treaded wheels, lamps, beacon, and squash-and-stretch jumps
- a persistent owned Farm Tractor and Combine Harvester: both remain parked as solid world objects, keep their positions, loadouts, and storage, and cycle with a short lift-and-glide camera handoff
- barn-style loadout workshop with live 3D previews for the controlled vehicle and its compatible rear/front equipment; equip the Farm Tractor's 20,000 L Grain Trailer to carry one crop from silos to the cargo hub, while the combine's built-in header leaves its attachment bays unavailable
- progression gates start the farm with Wheat only; Getting started requires 3,600 L Wheat and unlocks Barley, Canola, and Soybeans, then Crop diversity asks the player to choose two of those four crops at 3,600 L each and unlocks Corn. Once both crops are chosen, its tracker and cargo pad show only those two requirements; silo loading, unloading, and cargo delivery move real inventory in rapid 10 L steps, while a completed milestone immediately calls the VTOL to collect the staged cargo and reveal its rewards; the final available milestone instead ends with a clear Farmipelago-complete screen before returning the player to free farming
- automatic browser-local saving of the generated Farmipelago, field and crop state, buildings, delivery progress, vehicle positions, loadouts, storage, and active seed; refreshing restores the same playable state
- visible four-share plough that changes grass tiles into ploughed soil with rolling voxel soil feedback
- the seeder plants selectable Corn, Wheat, Barley, Canola, or Soybeans seed; crops sprout and grow with squash-and-stretch transitions, then all harvest-ready crops pulse in synchronized world time
- input-aware tool control that springs rear attachments and the combine header into position, starts and stops the combine header, or cycles seed with the secondary action; illustrated crop icons use multiple crop colors throughout compact HUD controls and vehicle inventories, while a brief seed-cycle label appears above the control; each ready crop tile yields 50–200 L according to suitability and fills the combine's 3,600 L tank with a 10 L-step ticker
- lowered sprayers emit nozzle droplets and collapse cleared weeds; combines animate crop-colored unloading streams into silos and the cargo pad, whose crates later lift into the visiting VTOL
- two larger toy-like tree silhouettes—forked orchard and umbrella—that sway in the wind, plus voxel stones
- camera-relative dynamic virtual stick: touch anywhere in the lower-left drive zone and point where the vehicle should move on screen
- lower-left cycle-vehicle button that briefly pauses driving while the camera lifts and glides to the next owned vehicle
- jump button; no ramps required
- falling and automatic tractor rescue
- pause menu with a controls reference, saved debug unlock overrides for the current crop progression gates, and a confirmed restart action that deletes the saved farm before generating a new one
- keyboard fallback: WASD/arrows to drive, Space to jump, E to raise/lower the tool, V to cycle vehicles, F to cycle seed with the seeder, B for the build menu, Escape to leave building/suitability view or open the menu, and 1–4 for rear equipment inside the barn workshop; use nearby silo and cargo-pad popups to transfer or deliver combine or trailer cargo. Both popups select the carried crop by default; the silo shows 0 L for a new crop, while the cargo pad selects it only when it is eligible for delivery.
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers

## Code layout

- `main.js` — rendering, fleet gameplay, camera modes, and gameplay loop
- `physics.js` — Rapier world, seamless static meshes, and active-vehicle character controller
- `world-generator.js` — procedural islands, environmental fields, terrain meshes, and collider inputs
- `cargo-port.js` — procedural cargo hub, staged cargo, and recurring VTOL flight cycle
- `progression.js` — delivery milestone requirements, acceptance, completion, and pickup rollover
- `persistence.js` — versioned browser-local save loading, writing, validation, and deletion
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
