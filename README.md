# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with persistent fields, vehicles, buildings, and crop logistics.

## Included

- modern phone-first HUD with safe-area support, a fixed touch joystick, input-aware desktop hints, a shared machine-inventory meter, a discreet build/FPS readout below the pause button, and a screenshot mode that hides every HUD layer until a tap, H, or Escape restores it
- camera zoom for close-up detail or a broad overview: pinch over the world on phones, use the + / − buttons, scroll the mouse wheel, or press + / −; available in driving and construction, with independent zoom levels
- smooth high-angle follow camera that keeps the controlled vehicle framed, with four camera-relative 90° orientations selected by a two-finger horizontal swipe over the world or the `[` / `]` desktop fallback and joined by a fast eased quarter-turn
- persistent uniform-speed 10-minute day/night cycle with extended clear-blue daytime, shorter bright dawn/dusk, a time-varying flat-color backdrop, sun/moon-driven global lighting, a darker readable blue night, animated celestial shadows, precomputed local surface lighting from static lanterns, dynamic vehicle headlights, and a Debug time-of-day scrubber
- cinematic two-island opening: an establishing view frames both parked vehicles on the stationary Settlement Island, reveals and follows the non-colliding Farm Island approaching from the south, two metal chains extend from Settlement’s rock underside and tighten as the Farm docks, then the roughly two-tile bridge assembles plank by plank followed by its railings and lanterns; the camera returns to driving after construction and collision activate across the clear air gap; the HUD and gameplay input stay suppressed until that release
- continuous southwest travel presentation through a clear, saturated, square-tile-rendered green/blue/brown planetary map with palette-preserving distance sampling and broad quantized plateau levels far below the Farmipelago, a dense field of smaller northeast-moving distant voxel clouds, a much smaller population of faster near clouds at island-edge and underside height, and terrain-aware dust and loose leaves that skim northeast from dry open ground and vegetation; the distant surface uses a broad two-triangle plane beneath a fixed 3×3 horizon-biased footprint of stepped plateau tops, exposed dirt walls, and dense one-draw tiny trees, allowing only the extreme band to become texture-only while the base-plane edge remains beyond the extended camera frustum; all cues use fixed deterministic presentation resources, and reduced motion keeps calmer steady directional travel
- the Farm Island contains the starter field, south-coast lake, and the teal Fieldworks workshop with stepped sawtooth skylights, lifting gantry and detailed service equipment built on the five-small-voxels-per-terrain-tile grid; the Settlement Island contains distinct tractor/combine spawns with reserved turnaround space, a compact non-interactive cluster of voxel-built homes, a communal receiving structure, worn paths, warm lighting, and no player farming or construction
- permanent Settlement Storehouse on solid settlement ground, with a stepped voxel roof, open receiving bay and warm lantern; a contextual Village · Tier 1 grid of square crop cards requests wheat, barley and canola, all unlocked at the start. Select a crop card and use Deliver; each card fills green from the bottom and shows stock against a 3,600 L desired reserve. Surplus is accepted, and each crop consumes 60 L per active minute, stopping at zero without penalties. Consumption freezes while paused, hidden, closed or during the opening; construction continues consumption
- generated props, bridges, the Settlement Storehouse, and completed player-placed buildings fade when they block the camera's view of the active vehicle; bridges do not fade merely because the vehicle is driving across them
- a large irregular lake along the Farm Island's south coast with an east-flowing river and waterfall; the fall stays fixed to its terrain outlet while ten connected voxel-water segments, three foam streams, and a fixed pool of 24 solid spray voxels curve and trail northeast through the air, with calmer steady motion under reduced motion; landing in water throws flat-colored droplets using the same day/night base-water palette without surface glints
- aggressive continuous moisture and sunlight variation that creates dark dense rainforest, normal woodland, lush meadows and wetlands, yellow dry plains, and rocky scrub through strongly differentiated grass color, obstruction density, tree silhouettes, and lightweight ground cover
- a round build button opens a pannable construction view for grain silos or, once unlocked, a Cattle Barn from the single-row tray along the bottom of the screen. Choosing a type immediately creates its draft at the nearest suitable clear site in view. Unconfirmed buildings carry a pulsing lime outline, can be selected and hold-dragged until explicitly committed, or removed with their contextual Cancel button. Confirm permanently removes the draft outline. Silos use Confirm; barns use Draw pen followed by a rough pasture lasso that automatically closes, trims unusable land, and connects to a brightly highlighted barn doorway and ground gate. Fixed fence connectors begin at the midpoint of both barn side walls, while generated and edited fence segments cannot pass through any building. The generated fence remains editable or can be repainted before final Confirm; leaving build mode discards every unconfirmed building
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse environment-driven clusters of flowers, ferns, reeds, bushes, mushrooms, lush grass, yellow dry grass, and scrub across both elevations, with multi-prop tiles, off-grid placement, and subtle rotation, mirroring, and scale variation; they remain non-blocking and disappear when their tile is ploughed
- ambient reindeer and foxes are temporarily absent from this two-island slice; cattle remain available through retained or Debug unlocks
- blue hero tractor with a glazed cab, treaded wheels, paired front lamps that follow the other local lights from late afternoon through sunrise, a beacon, and squash-and-stretch jumps
- a persistent owned Farm Tractor and Combine Harvester: both remain parked as solid world objects, keep their positions, loadouts, and storage, and cycle with a short lift-and-glide camera handoff plus an exaggerated grow-and-settle wake-up flourish on the newly controlled machine
- detailed blue tractor, green-and-cream combine, and all seven rear/five front attachments using smaller blocks and rotated assemblies, with stepped wheels, open equipment shells, shared coupling positions, moving lift links, and drawbars that pivot at the tractor hitch
- walk-in workshop with live 3D previews for the controlled vehicle and its compatible rear/front equipment; select an equipped tool again to leave that slot empty, equip the Farm Tractor's 20,000 L Grain Trailer to carry one crop from silos to the Settlement Storehouse, while the combine's built-in header leaves its attachment bays unavailable; the trailer, baler, and liquid tank each follow their hitch with an independently persisted tow angle while mounted tools remain rigid
- village needs start with Wheat, Barley and Canola; other crops, hay and livestock capabilities remain available through retained or Debug unlocks until future islands introduce them. Transfers retain rapid 10 L steps and physical cargo effects
- mostly small seeded voxel islands (80% with 4–5.5-tile radii, occasional 7–10-tile islands) arrive near a suitable shore approximately once per active minute, with decorative islands temporarily disabled because their distant lanes are not visible on small screens. Saved decorative islands are also skipped on load. Encounters pass the shore on a straight route with matching incoming and outgoing headings, within 30 degrees of the same current used for decorative routes. All passing islands cruise at the same speed (2.07 tiles/second normally); encounter timing waits off-scene for the appropriate launch time instead of changing speed or stretching spawn distance. Every passing island reserves its full entry-to-exit corridor before spawning, with a one-tile buffer. Generation and route searches run in small preparation slices (a 2 ms target per update), and the game precompiles island and outline shaders off-scene before publication. Spawns and completed departures use the current camera/zoom with a two-tile visual buffer, and decorative lanes must cross that view; published routes remain fixed, with no age-based disappearance. The shared world flow turns through all directions every ten minutes. Near routes maintain 5.5 tiles of shore clearance; swept motion checks and reserved connection/release corridors prevent solid intersections, with traffic yielding when necessary. Within 12 tiles of the active vehicle, tap an outlined island and use the Connect control anchored beside it; selection keeps the driving view without a destination ghost. Compact Connect and Release pills sit outside the selected island with a pointer to the tapped surface, keeping clear of phone controls. Blocked actions keep the same single-row size and show a lock with a short status. Paired chains shoot from exposed shore faces while the island keeps drifting, tighten on attachment, and draw it into a smooth curved approach; placement checks the catch position and pulling angle, and the camera follows the pull that clears existing land and bridges, and bridge construction finishes the arrival at a four-tile shore gap. The chain camera looks across the gap and fits all anchors on narrow screens. Bridge planks build outward from the existing Farmipelago. Empty space between phone action buttons passes taps to the world; drag the joystick to drive, or tap it to select visible land beneath it. Connected land supports normal driving, farming, resources and buildings and persists in saves. Tap connected land to Release when doing so leaves the remaining Farmipelago connected; it drifts away with its content.
- automatic browser-local saving of the opening lifecycle and generated Farmipelago, time of day, drifting island locations and route progress, fields, crops, construction, livestock, progression, vehicles and inventories under the fresh schema-0 `farmipelago.gameState.v2` lineage; refresh during the intro replays the cinematic from the start, while refresh afterward restores the attached pair without replaying it, and the legacy `farmipelago.gameState` value is ignored and preserved for rollback or manual recovery
- visible four-share plough that changes grass tiles into ploughed soil with rolling voxel soil feedback
- the seeder plants selectable Corn, Wheat, Barley, Canola, Soybeans, or Grass seed; crops sprout and grow with squash-and-stretch transitions, then all harvest-ready crops gently pulse 18% taller and 7% wider together every 3.2 seconds to signal readiness; reduced motion disables the pulse
- retained or Debug unlocks expose perennial Grass seed and the hay-equipment set: use the existing seeder to establish grass, mow it with the centered front mower or offset rear mower, then pick up loose cut grass directly with the baler; the forming bale visibly extends from the rear as it fills, and each completed 3,600 L bale drops into the world with physics so it can tumble and be pushed
- the hay set includes a two-spear front bale fork for one-bale-at-a-time handling: lower it and drive into a bale to spear it, raise it to carry, then lower it to place and release the bale; deliver carried bales to a Cattle Barn for feed; the fork, carried bale and parked bale positions persist across refreshes
- finally confirmed cattle barns receive two adult cows. New cows and calves fall one tile under gravity into the pasture, squash on landing, and quickly recover before walking (skipped with reduced motion; saved cows restore normally). Every four valid pasture tiles provide one hard herd-capacity slot; cows independently choose farther points with a clear route and cross the permanent pen at varied angles, calves arrive automatically when hay and capacity are available, and calves mature into milk-producing adults
- carry an existing 3,600 L hay bale to the barn to feed the herd at full output. Cattle never starve or die: without hay they graze abstractly and continue producing milk at 20% of the fed rate
- the livestock-gated Water / Milk Tank holds 6,000 L, loads milk from a nearby Cattle Barn for transport; tier 1 does not accept milk; a non-empty storage attachment cannot be swapped away
- every ready grass tile produces 200 L, grass regrows without reseeding or weeds, and loose grass, partial baler fill, and dynamically instanced bales all persist across refreshes
- independent front and rear equipment controls with general slot icons; each attachment can be raised or lowered separately, the combine header uses the front control, and the secondary action cycles seed; illustrated crop icons use multiple crop colors throughout compact HUD controls and vehicle inventories, while a brief seed-cycle label appears above the control; each ready crop tile yields a random 70–110 L (90 L average), filling the combine's 3,600 L tank in about 40 tiles with a 10 L-step ticker
- mowing mature grass throws green voxel clippings upward, then drops them onto the cut tile to settle into its loose-grass pile; both mowers use the effect, which respects reduced motion
- successful combine cuts pop crop-colored voxel stalks and grains into a short tumbling arc that curls into the moving header; particles use bounded reusable pools and are disabled with reduced motion
- lowered sprayers emit nozzle droplets and collapse cleared weeds; combines extend their augers, trailers tip their beds, and color-matched crop or milk cuboid swarms weave between silos, barns, vehicles, tanks, and the Settlement Storehouse, whose bounded staged crates reflect current village stocks
- six toy-like tree silhouettes—including rainforest canopy, layered jungle, normal woodland, and dry woodland forms—that sway in the wind, plus environment-dependent voxel stones
- a waving gold-and-cream flag above the village storehouse shows the current wind direction, following the same flow as clouds and loose leaves; reduced motion softens its flutter
- camera-relative fixed virtual stick in the lower-left: press and drag the visible control toward the vehicle's intended screen-space direction
- cycle-vehicle button above the fixed movement control on the left edge that briefly pauses driving while the camera lifts and glides to the next owned vehicle
- jump button; no ramps required
- falling and automatic vehicle rescue to separate tractor and combine spawn points
- pause menu with a clean-screenshot HUD toggle, controls reference, a live Debug time-of-day slider, a 28° low-FOV drive-camera default with session-only 38°/30°/28°/24° comparison presets, saved debug unlock overrides, and a confirmed restart action that deletes the saved farm before generating a new one
- keyboard fallback: WASD/arrows to drive, Space to jump, Q/E for front/rear tools, V to cycle vehicles, F to cycle seed, `[` / `]` to rotate the drive camera, B for construction, H to hide the HUD for screenshots, and Escape to leave a special view or open the menu. In screenshot mode, H or Escape restores the HUD; on touch screens, tap anywhere. In build mode, drag a new building onto clear level land, then tap and hold-drag its draft to reposition it. Confirm permanently commits a silo. For a barn, choose Draw pen and circle the desired pasture while including the glowing doorway and its three ground tiles; edit the generated corners or segments, use Repaint border for a fresh lasso, use Undo to return to barn placement, and use final Confirm to permanently commit the barn and pen. Exiting build mode cancels and removes unconfirmed construction; completed buildings cannot be relocated. Nearby gameplay popups only operate completed silos and barns
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers
- in build mode, select a completed silo or Cattle Barn and choose Demolish, then tap the same button again when it reads Confirm demolish. Tapping elsewhere cancels confirmation. Demolition removes its stored contents and, for a barn, its pen and cattle, freeing the site for reuse. Starter structures remain permanent; demolition is saved automatically
- confirming a silo or finishing a barn and pen automatically returns to play mode; Draw pen keeps construction mode open for pasture editing. Any other unconfirmed drafts are discarded when construction mode closes
- the first Demolish tap shows an inline warning listing what will be lost before the second tap confirms removal

Village needs replace the old delivery milestones. Existing farms retain earned capabilities and Debug overrides, and recorded wheat/barley/canola deliveries become village stock. Other capabilities remain behind Debug unlocks on new farms until future islands introduce them. Tier 1 has no population, happiness, tier advancement or completion cinematic; it does not accept hay or milk. Stocks persist without offline consumption. Use Tab and Space/Enter to select needs and activate Deliver on desktop.

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

### Workshop design preview

Open `/workshop-preview.html` on the Vite server to compare three experimental
workshop models: Timberwright, Fieldworks and Copperhearth. Drag to orbit and
scroll to zoom; Reset views restores the comparison angles. This isolated preview
uses the shared game models and voxel grid, and never loads or writes a game save.
Fieldworks is the active starter workshop; Timberwright and Copperhearth remain preview-only.

### Island route debugger

Open `/island-debug.html` on the Vite server (also included in production builds).
For a downloaded/offline copy, run `npm run build` and open
`dist/island-debug-standalone.html` in a browser. This additional build bundles
all JavaScript, styles and embedded physics data into one file; the source
`island-debug.html` alone still requires Vite. Phone file-preview apps may block
scripts: open the file in a browser instead. The regular page reports missing
assets or startup errors rather than leaving an unstyled, empty shell.

This isolated session uses the game's island generation, encounter scheduling,
routes, attachment logic and collision avoidance. It never reads or writes the
normal game save.

- Flat, north-up orthographic footprints; drag to pan and wheel/pinch to zoom.
- Solid intended routes, dashed 60-second forecasts, direction arrows, safety
  envelopes, reserved corridors, and overlap/yield diagnostics.
- Toggle Camera boundary to show the purple ground-level footprint of the actual
  simulated 16:9 spawn camera. It follows the observer and is included in Fit view;
  visibility checks also account for island height and a two-tile buffer.
- Orange corridors show complete routes reserved before an island spawns.
  Decorative islands are temporarily disabled in both the game and debugger;
  encounter candidates stay off-scene until a clear passage can be reserved.
- Pause, single-step, and 0.25×–60× simulation speed. Fast-forward retains the
  normal 1/60-second physics step; the effective rate is shown when CPU-limited.
- Seed/Reset and Fit view. Drag the white observer marker on retained land to
  change where nearby encounters are planned.
- Select islands to inspect speed and blocking reasons. Nearby eligible islands
  use the same Connect/Release actions as the game.

The debugger camera is independent of a fixed gameplay-sized spawn camera, so
zooming out to inspect routes does not push arriving islands farther away.
The first encounter needs an off-screen lead-in; impossible or obstructed
arrivals wait for a valid route. Passing islands do not hover on a timer.

Manual verification for this change: observe a complete direction cycle and
minute-spaced encounters, converging traffic, multi-bridge attachment, releases
with buildings, reloads during connections, pause/hidden tabs, reduced motion,
and desktop/phone controls. These scenarios have not been automated.
