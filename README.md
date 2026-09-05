# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with persistent fields, vehicles, buildings, and crop logistics.

## Included

- modern phone-first HUD with safe-area support, a fixed touch joystick, input-aware desktop hints, a shared machine-inventory meter, a discreet build/FPS readout below the pause button, and a screenshot mode that hides every HUD layer until a tap, H, or Escape restores it
- smooth high-angle follow camera that keeps the controlled vehicle framed, with four camera-relative 90° orientations selected by a two-finger horizontal swipe over the world or the `[` / `]` desktop fallback and joined by a fast eased quarter-turn
- persistent uniform-speed 10-minute day/night cycle with extended daytime, shorter bright dawn/dusk, a time-varying flat-color backdrop, sun/moon-driven global lighting, a darker readable blue night, animated celestial shadows, precomputed local surface lighting from static lanterns, dynamic vehicle headlights, and a Debug time-of-day scrubber
- generated radial archipelago with a large, level central starter island containing a walk-in workshop at the northern end of its west edge, constructed on a five-small-voxels-per-terrain-tile grid with an east-facing open bay, hanging lantern lit from late afternoon through early morning, stepped rooflines, framed openings, tools, lockers, fuel pump, tyres, crates, and stone apron; the island also contains vehicles, a starter field, and cargo pad, while broad, gently crowned wooden bridges with railings and matching day/night lanterns reach mixed-size surrounding islands
- permanent cargo hub at the southern end of the west edge, with a cantilevered small-voxel landing deck, inlaid stepped markings, two bright hanging voxel lanterns matching the workshop (one on the fixed pole and one seed-varied companion), voxel-built staged cargo, and an articulated four-fan voxel VTOL that makes a rapid curved arrival and departure while keeping its rotors fixed; completing a delivery milestone summons it straight to the pad for a short celebration flight and an explicit unlock reveal
- generated props, bridges, the cargo pad, the visiting VTOL, and completed player-placed buildings fade when they block the camera's view of the active vehicle; bridges and the cargo pad do not fade merely because the vehicle is driving across them
- broad base and raised farming plots on every non-starter island, with environment-driven props distributed across elevations; the large northern island's north side climbs through three distinct terraces, with fully snow-covered upper terraces and a prop-free summit
- a large irregular lake along the central starter island's south coast with an east-flowing river and waterfall, plus small procedural lakes that feed animated rivers and waterfalls spilling below the islands; landing in water throws flat-colored droplets using the same day/night base-water palette without surface glints
- aggressive continuous moisture and sunlight variation that creates dark dense rainforest, normal woodland, lush meadows and wetlands, yellow dry plains, and rocky scrub through strongly differentiated grass color, obstruction density, tree silhouettes, and lightweight ground cover
- a round build button opens a pannable construction view for grain silos or, once unlocked, a Cattle Barn from the single-row tray along the bottom of the screen. Choosing a type immediately creates its draft at the nearest suitable clear site in view. Unconfirmed buildings carry a pulsing lime outline, can be selected and hold-dragged until explicitly committed, or removed with their contextual Cancel button. Confirm permanently removes the draft outline. Silos use Confirm; barns use Draw pen followed by a rough pasture lasso that automatically closes, trims unusable land, and connects to a brightly highlighted barn doorway and ground gate. Fixed fence connectors begin at the midpoint of both barn side walls, while generated and edited fence segments cannot pass through any building. The generated fence remains editable or can be repainted before final Confirm; leaving build mode discards every unconfirmed building
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse environment-driven clusters of flowers, ferns, reeds, bushes, mushrooms, lush grass, yellow dry grass, and scrub across both elevations, with multi-prop tiles, off-grid placement, and subtle rotation, mirroring, and scale variation; they remain non-blocking and disappear when their tile is ploughed
- rare seed-stable wildlife appears only beyond the starter island: every sufficiently large island with substantial forest habitat receives exactly two animated voxel reindeer, one red fox roams the world's forest clearings, and one white snow fox wanders the northern snowy terraces. Their pronounced toy-like gaits use tractor-style squash and stretch, and they jump when a route climbs one terrain level. All are excluded from camera auto-hide and avoid water, larger cliffs, fields, buildings, and cattle pastures
- blue hero tractor with a glazed cab, treaded wheels, paired front lamps that follow the other local lights from late afternoon through sunrise, a beacon, and squash-and-stretch jumps
- a persistent owned Farm Tractor and Combine Harvester: both remain parked as solid world objects, keep their positions, loadouts, and storage, and cycle with a short lift-and-glide camera handoff plus an exaggerated grow-and-settle wake-up flourish on the newly controlled machine
- walk-in workshop with live 3D previews for the controlled vehicle and its compatible rear/front equipment; select an equipped tool again to leave that slot empty, equip the Farm Tractor's 20,000 L Grain Trailer to carry one crop from silos to the cargo hub, while the combine's built-in header leaves its attachment bays unavailable
- progression gates start the farm with Wheat only; Getting started and Crop diversity unlock broader crop and hay systems, Livestock preparation requires four physical hay bales and unlocks the Cattle Barn plus livestock equipment, and First milk asks for 3,600 L Milk. Crop and milk transfers use rapid 10 L steps visualized by color-matched swarms of tiny tumbling cuboids flying between the physical inventories, while bale deliveries advance one physical bale at a time
- automatic browser-local saving of the generated Farmipelago, time of day, field and crop state, building construction phases, provisional or completed cattle pens, individual herds, feed and milk stores, delivery progress, vehicle positions, loadouts, storage, and active seed; schema-6/7/8 farms migrate in place and refreshing restores the same playable state
- visible four-share plough that changes grass tiles into ploughed soil with rolling voxel soil feedback
- the seeder plants selectable Corn, Wheat, Barley, Canola, Soybeans, or Grass seed; crops sprout and grow with squash-and-stretch transitions, then all harvest-ready crops pulse in synchronized world time
- completing Crop diversity also unlocks perennial Grass seed and the hay-equipment set: use the existing seeder to establish grass, mow it with the centered front mower or offset rear mower, then pick up loose cut grass directly with the baler; the forming bale visibly extends from the rear as it fills, and each completed 3,600 L bale drops into the world with physics so it can tumble and be pushed
- the hay set includes a two-spear front bale fork for one-bale-at-a-time handling: lower it and drive into a bale to spear it, raise it to carry, then lower it to place and release the bale; drive a carried bale to the cargo pad and use its contextual delivery button to stage it for Livestock preparation; the fork, carried bale, parked bale positions, and delivered count persist across refreshes
- finally confirmed cattle barns receive two adult cows. Every four valid pasture tiles provide one hard herd-capacity slot; cows independently choose farther points with a clear route and cross the permanent pen at varied angles, calves arrive automatically when hay and capacity are available, and calves mature into milk-producing adults
- carry an existing 3,600 L hay bale to the barn to feed the herd at full output. Cattle never starve or die: without hay they graze abstractly and continue producing milk at 20% of the fed rate
- the livestock-gated Water / Milk Tank holds 6,000 L, loads milk from a nearby Cattle Barn, and unloads it at the cargo hub for First milk; a non-empty storage attachment cannot be swapped away
- every ready grass tile produces 200 L, grass regrows without reseeding or weeds, and loose grass, partial baler fill, and dynamically instanced bales all persist across refreshes
- independent front and rear equipment controls with general slot icons; each attachment can be raised or lowered separately, the combine header uses the front control, and the secondary action cycles seed; illustrated crop icons use multiple crop colors throughout compact HUD controls and vehicle inventories, while a brief seed-cycle label appears above the control; each ready crop tile yields a fixed 200 L and fills the combine's 3,600 L tank with a 10 L-step ticker
- lowered sprayers emit nozzle droplets and collapse cleared weeds; combines extend their augers, trailers tip their beds, and color-matched crop or milk cuboid swarms weave between silos, barns, vehicles, tanks, and the cargo pad, whose crop crates or staged hay bales later lift into the visiting VTOL
- six toy-like tree silhouettes—including rainforest canopy, layered jungle, normal woodland, and dry woodland forms—that sway in the wind, plus environment-dependent voxel stones
- camera-relative fixed virtual stick in the lower-left: press and drag the visible control toward the vehicle's intended screen-space direction
- cycle-vehicle button above the fixed movement control on the left edge that briefly pauses driving while the camera lifts and glides to the next owned vehicle
- jump button; no ramps required
- falling and automatic vehicle rescue to separate tractor and combine spawn points
- pause menu with a clean-screenshot HUD toggle, controls reference, a live Debug time-of-day slider, a 28° low-FOV drive-camera default with session-only 38°/30°/28°/24° comparison presets, saved debug unlock overrides, an active-milestone override that switches milestones and clears the selected milestone's delivery progress, and a confirmed restart action that deletes the saved farm before generating a new one
- keyboard fallback: WASD/arrows to drive, Space to jump, Q/E for front/rear tools, V to cycle vehicles, F to cycle seed, `[` / `]` to rotate the drive camera, B for construction, H to hide the HUD for screenshots, and Escape to leave a special view or open the menu. In screenshot mode, H or Escape restores the HUD; on touch screens, tap anywhere. In build mode, drag a new building onto clear level land, then tap and hold-drag its draft to reposition it. Confirm permanently commits a silo. For a barn, choose Draw pen and circle the desired pasture while including the glowing doorway and its three ground tiles; edit the generated corners or segments, use Repaint border for a fresh lasso, use Undo to return to barn placement, and use final Confirm to permanently commit the barn and pen. Exiting build mode cancels and removes unconfirmed construction; completed buildings cannot be relocated. Nearby gameplay popups only operate completed silos and barns
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers

## Code layout

- `src/app/` — rendering setup and the game-session entry point
- `src/core/` — shared Three.js materials, dimensions, voxel helpers, and grid keys
- `src/world/` — generated terrain, environment, island-local coordinates, forage, and wildlife
- `src/gameplay/` — catalogs, vehicles, construction, livestock, logistics, and progression
- `src/physics/` — Rapier simulation, terrain colliders, vehicles, and bales
- `src/ui/` — touch and keyboard controls, HUD, workshop, construction controls, and menus
- `src/persistence/` — versioned browser-local save loading, validation, and writing
- `src/voxel-studio/` — the standalone voxel editor
- `src/styles/` — focused game and Voxel Studio stylesheets

## Run

Farmipelago uses Vite with locally installed, pinned Three.js and Rapier dependencies.

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Voxel Studio is available at `/voxel-studio.html` on the same server.

To test from a phone on the same network, expose the development server on the LAN:

```bash
npm run dev -- --host 0.0.0.0
```

Create an optimized static production build with:

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host. To inspect that build locally, run `npm run preview`.
