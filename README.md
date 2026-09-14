# Floating Farm Prototype

A phone-first Three.js prototype for driving and farming across generated floating islands, with persistent fields, vehicles, buildings, and crop logistics.

Opening a full building inventory reuses the vehicle’s front/rear action buttons for Load and Unload (or Feed, Deliver, Trade and Cancel). Their icons, labels and Q/E shortcuts follow the building actions. Closing the popup or leaving range restores the current vehicle’s tools and seed control; Jump remains available.

## Included

- compact phone-first gameplay HUD with cream SVG voxel frames, continuous beveled popup arrows, warm shaded edges, teal tabs and small leaf clusters; bold action icons and a cream joystick with a teal thumb pad retain the existing controls, safe-area support and input-aware desktop hints. Machine inventory and the discreet build/FPS readout share the artwork. Workshop, pause menu and construction panels keep their existing styling; screenshot mode hides every HUD layer until a tap, H, or Escape restores it
- camera zoom for close-up detail or a broad overview: pinch over the world on phones, where the zoom buttons are hidden; on larger screens, use the + / − buttons, scroll the mouse wheel, or press + / −. Zoom is available in driving and construction, with independent zoom levels. The version/FPS frame sits at the top left within the safe area.
- smooth high-angle follow camera that keeps the controlled vehicle framed, with four camera-relative 90° orientations selected by a two-finger horizontal swipe over the world or the `[` / `]` desktop fallback and joined by a fast eased quarter-turn
- persistent uniform-speed 10-minute day/night cycle with extended clear-blue daytime, shorter bright dawn/dusk, a time-varying flat-color backdrop, sun/moon-driven global lighting, a darker readable blue night, animated celestial shadows, precomputed local surface lighting from static lanterns, dynamic vehicle headlights, and a Debug time-of-day scrubber
- the new starter bridge joins the village’s central street with three tiles clear between its rails; its length fits the generated Farm shore, with matching deck collision and more than one tile of terrain separation
- continuous southwest travel presentation through a clear, saturated, square-tile-rendered green/blue/brown planetary map with palette-preserving distance sampling and broad quantized plateau levels far below the Farmipelago, a dense field of smaller northeast-moving distant voxel clouds, a much smaller population of faster near clouds at island-edge and underside height, and terrain-aware dust and loose leaves that skim northeast from dry open ground and vegetation; the distant surface uses a broad two-triangle plane beneath a fixed 3×3 horizon-biased footprint of stepped plateau tops, exposed dirt walls, and dense one-draw tiny trees, allowing only the extreme band to become texture-only while the base-plane edge remains beyond the extended camera frustum; all cues use fixed deterministic presentation resources, and reduced motion keeps calmer steady directional travel
- the Farm Island contains the starter field, south-coast lake, and the teal Fieldworks workshop with stepped sawtooth skylights, lifting gantry and detailed service equipment built on the five-small-voxels-per-terrain-tile grid; new games start both vehicles on reserved Farm ground while Settlement approaches from the north; the village has tiered homes, an interactive Storehouse, open streets and warm lighting, with no player farming or construction
- permanent Settlement Storehouse on solid settlement ground, with a stepped voxel roof, open receiving bay and warm lantern. Tier 1 requests Wheat, Barley, Canola and Soybeans, all unlocked from the start with unlimited seeds. The compact popup uses a two-column card grid up to 340 pixels wide: unchanged small icons sit on gray backgrounds beside names above quantities, with a progress bar underneath; status remains available in each card’s accessible label. The heading uses a larger transparent render matching the Storehouse’s current visual tier, including its canopy, without a divider. Its round Deliver icon sits below the right edge, matching the silo transfer button. Cards are read-only; Deliver automatically recognizes the carried crop. Each requirement permanently completes at 3,600 L. A prominent Complete any 3 of 4 rule explains the optional route; a short Unlocks: Hay farming & equipment line previews direct capabilities. Completing any three immediately opens Tier 2 and retains Tier 1 progress in the save. Deliveries stop at the target and leave surplus cargo in the vehicle. Tier 2 grants grass seed and existing hay equipment; Hay requires four 3,600 L bales (14,400 L), carried one at a time on the bale fork and delivered with the normal Deliver icon; Flour takes 4,000 L, delivered as four 1,000 L pallets. All settlement delivery requirements are enabled without Unavailable labels; Vegetable oil takes four 1,000 L pallets through the Oil Press route; Eggs still await production
- generated props, bridges, the Settlement Storehouse, and completed player-placed buildings fade when they block the camera's view of the active vehicle; bridges do not fade merely because the vehicle is driving across them
- a large irregular lake along the Farm Island's south coast with an east-flowing river and waterfall; the fall stays fixed to its terrain outlet while ten connected voxel-water segments, three foam streams, and a fixed pool of 24 solid spray voxels curve and trail northeast through the air, with calmer steady motion under reduced motion; landing in water throws shaded 3D voxel droplets with a day/night water palette
- three small mallard-style ducks swim in the starting lake for 3–5 active minutes, fly away as a staggered flock, spend one active minute off-screen, then fly back along a sweeping curve, slow into the water and splash-land with a visible burst of the shared jump-water particles; takeoff curves gradually upward as they accelerate; pause and hidden tabs freeze their clocks, and reload starts them swimming again
- aggressive continuous moisture and sunlight variation that creates dark dense rainforest, normal woodland, lush meadows and wetlands, yellow dry plains, and rocky scrub through strongly differentiated grass color, obstruction density, tree silhouettes, and lightweight ground cover
- a round build button opens a pannable construction view for grain silos or, once unlocked, a Cattle Barn from the single-row tray along the bottom of the screen. Choosing a type immediately creates its draft at the nearest suitable clear site in view. Unconfirmed buildings carry a pulsing lime outline, can be selected and hold-dragged until explicitly committed, or removed with their contextual Cancel button. Confirm permanently removes the draft outline. Silos use Confirm; barns use Draw pen followed by a rough pasture lasso that automatically closes, trims unusable land, and connects to a brightly highlighted barn doorway and ground gate. Fixed fence connectors begin at the midpoint of both barn side walls, while generated and edited fence segments cannot pass through any building. The generated fence remains editable or can be repainted before final Confirm; leaving build mode discards every unconfirmed building
- softly lit, gently fogged miniature terrain with muted grass / dirt / stone layers and deep, pointed undersides
- sparse environment-driven clusters of flowers, ferns, reeds, bushes, mushrooms, lush grass, yellow dry grass, and scrub across both elevations, with multi-prop tiles, off-grid placement, and subtle rotation, mirroring, and scale variation; they remain non-blocking and disappear when their tile is ploughed
- ambient reindeer and foxes are temporarily absent from this two-island slice; cattle remain available through retained or Debug unlocks
- blue hero tractor with a glazed cab, treaded wheels, paired front lamps that follow the other local lights from late afternoon through sunrise, a beacon, and squash-and-stretch jumps
- a persistent owned Farm Tractor and Combine Harvester: both remain parked as solid world objects, keep their positions, loadouts, and storage, and cycle with a short lift-and-glide camera handoff plus an exaggerated grow-and-settle wake-up flourish on the newly controlled machine
- detailed blue tractor, green-and-cream combine, and all seven rear/five front attachments using smaller blocks and rotated assemblies, with stepped wheels, open equipment shells, shared coupling positions, moving lift links, and drawbars that pivot at the tractor hitch
- walk-in workshop with live 3D previews for the controlled vehicle and its compatible rear/front equipment; select an equipped tool again to leave that slot empty, equip the Farm Tractor's 20,000 L Grain Trailer to carry one crop from silos to the Settlement Storehouse, while the combine's built-in header leaves its attachment bays unavailable; the trailer, baler, and liquid tank each follow their hitch with an independently persisted tow angle while mounted tools remain rigid
- Corn and livestock capabilities remain available through retained earned gates or separate Debug overrides. Settlement transfers retain rapid 10 L steps and physical cargo effects
- the new starter bridge joins the village’s central street with three tiles clear between its rails; its length fits the generated Farm shore, with matching deck collision and more than one tile of terrain separation
- automatic browser-local saving of the opening lifecycle and generated Farmipelago, time of day, drifting island locations and route progress, fields, crops, construction, livestock, progression, vehicles and inventories under the fresh schema-0 `farmipelago.gameState.v2` lineage; refresh during the intro replays the cinematic from the start, while refresh afterward restores the attached pair without replaying it, and the legacy `farmipelago.gameState` value is ignored and preserved for rollback or manual recovery
- visible four-share plough that changes grass tiles into ploughed soil with rolling voxel soil feedback
- the seeder plants selectable Corn, Wheat, Barley, Canola, Soybeans, or Grass seed; crops sprout and grow with squash-and-stretch transitions, then all harvest-ready crops gently pulse 18% taller and 7% wider together every 3.2 seconds to signal readiness; reduced motion disables the pulse
- opening Tier 2 (or retained/Debug unlocks) exposes perennial Grass seed and the hay-equipment set: use the existing seeder to establish grass, mow it with the centered front mower or offset rear mower, then pick up loose cut grass directly with the baler; the forming bale visibly extends from the rear as it fills, and each completed 3,600 L bale drops into the world with physics so it can tumble and be pushed
- the hay set includes a two-spear front bale fork for one-bale-at-a-time handling: lower it and drive into a bale to spear it, raise it to carry the bale rotated 90° across the fork, then lower it to place and release the bale; deliver carried bales to a Cattle Barn for feed; the fork, carried bale and parked bale positions persist across refreshes
- finally confirmed cattle barns receive two adult cows. New cows and calves fall one tile under gravity into the pasture, squash on landing, and quickly recover before walking (skipped with reduced motion; saved cows restore normally). Every four valid pasture tiles provide one hard herd-capacity slot; cows independently choose farther points with a clear route and cross the permanent pen at varied angles, calves arrive automatically when hay and capacity are available, and calves mature into milk-producing adults
- carry an existing 3,600 L hay bale to the barn to feed the herd at full output. Cattle never starve or die: without hay they graze abstractly and continue producing milk at 20% of the fed rate
- the livestock-gated Water / Milk Tank holds 6,000 L, loads milk from a nearby Cattle Barn for transport; tier 1 does not accept milk; a non-empty storage attachment cannot be swapped away
- every ready grass tile produces 200 L, grass regrows without reseeding or weeds, and loose grass, partial baler fill, and dynamically instanced bales all persist across refreshes
- independent front and rear equipment controls with general slot icons; each attachment can be raised or lowered separately, the combine header uses the front control, and the secondary action cycles seed; illustrated crop icons use multiple crop colors throughout compact HUD controls and vehicle inventories, while a brief seed-cycle label appears above the control; each ready crop tile yields a random 70–110 L (90 L average), filling the combine's 3,600 L tank in about 40 tiles with a 10 L-step ticker
- mowing mature grass throws green voxel clippings upward, then drops them onto the cut tile to settle into its loose-grass pile; both mowers use the effect, which respects reduced motion
- successful combine cuts pop crop-colored voxel stalks and grains into a short tumbling arc that curls into the moving header; particles use bounded reusable pools and are disabled with reduced motion
- lowered sprayers emit nozzle droplets and collapse cleared weeds; combines extend their augers, trailers tip their beds, and color-matched crop or milk cuboid swarms weave between silos, barns, vehicles, tanks, and the Settlement Storehouse, whose bounded staged crates reflect permanent settlement delivery progress
- six toy-like tree silhouettes—including rainforest canopy, layered jungle, normal woodland, and dry woodland forms—that sway in the wind, plus environment-dependent voxel stones
- a waving gold-and-cream flag above the village storehouse shows the current wind direction, following the same flow as clouds and loose leaves; reduced motion softens its flutter
- camera-relative fixed virtual stick in the lower-left: press and drag the visible control toward the vehicle's intended screen-space direction
- cycle-vehicle button above the fixed movement control on the left edge that briefly pauses driving while the camera lifts and glides to the next owned vehicle
- jump button; no ramps required
- falling and automatic vehicle rescue to separate tractor and combine spawn points
- pause menu with a clean-screenshot HUD toggle, controls reference, a live Debug time-of-day slider, a fixed 28° drive-camera FOV, Debug tier controls to permanently open later implemented settlement tiers while preserving delivery history, saved debug unlock overrides, and a confirmed restart action that deletes the saved farm before generating a new one
- keyboard fallback: WASD/arrows to drive, Space to jump, Q/E for front/rear tools, V to cycle vehicles, F to cycle seed, `[` / `]` to rotate the drive camera, B for construction, H to hide the HUD for screenshots, and Escape to leave a special view or open the menu. In screenshot mode, H or Escape restores the HUD; on touch screens, tap anywhere. In build mode, drag a new building onto clear level land, then tap and hold-drag its draft to reposition it. Confirm permanently commits a silo. For a barn, choose Draw pen and circle the desired pasture while including the glowing doorway and its three ground tiles; edit the generated corners or segments, use Repaint border for a fresh lasso, use Undo to return to barn placement, and use final Confirm to permanently commit the barn and pen. Exiting build mode cancels and removes unconfirmed construction; completed buildings cannot be relocated. Nearby gameplay popups only operate completed silos and barns
- Rapier kinematic capsule controller with ground snapping, wall-contact jumping, and fixed 60 Hz simulation
- seamless terrain collision meshes with solid plateau walls and lower island layers
- in build mode, select a completed silo or Cattle Barn and choose Demolish, then tap the same button again when it reads Confirm demolish. Tapping elsewhere cancels confirmation. Demolition removes its stored contents and, for a barn, its pen and cattle, freeing the site for reuse. Starter structures remain permanent; demolition is saved automatically
- confirming a silo or finishing a barn and pen automatically returns to play mode; Draw pen keeps construction mode open for pasture editing. Any other unconfirmed drafts are discarded when construction mode closes
- the first Demolish tap shows an inline warning listing what will be lost before the second tap confirms removal

**Processor islands (Step 10 review):** for testing, new Tier 2 encounters use a seeded **50% Windmill / 50% Oil Press** mix; existing islands are unchanged. Connect normally, bring Wheat or Barley in a combine/Grain Trailer, and open the building popup and use **Unload** in the vehicle action area. The Windmill stores 8,000 L of grain total and continuously converts it 1:1 into Flour at **1,000 L per minute**, using Wheat first and then Barley. It holds up to 8,000 L Flour. Return with a flatbed and use **Load**: only full 1,000 L pallets transfer; partial Flour remains stored. The HUD shows grain, Flour and Processing / Needs grain / Storage full. Grain transfers commit on arrival; use Cancel to stop the unfinished transfer. Processing continues while driving away or building, freezes during pause/hidden tabs and release, and resumes after reconnection or reload without offline production. Fractional stocks and surplus grain are preserved.

**Oil Press:** bring Canola in the combine or Grain Trailer and Unload. It consumes **1,000 L Canola/minute → 500 L Vegetable oil/minute**, continuously, with separate **8,000 L** input/output capacities. Load complete **1,000 L pallets** onto the Flatbed and use the shared Storehouse **Deliver** action. Oil displays in litres. Its Tier 2 target is now **4,000 L**, aligned to four pallets; surplus stays aboard. Completed legacy requirements stay complete, and partial old Oil progress rounds upward to pallet credit. Fractional processor stocks survive reload/release/reconnection without offline production.

**Quick building:** the saved Debug toggle defaults **off**. Enable it to place Windmills and Oil Presses through the ordinary build menu and Confirm flow. Placement validation stays active; drafts cannot accept goods or produce. Turning it off removes processor drafts and hides the choices, while confirmed buildings keep functioning. Placed processors use the same services, 180px stock HUDs and transfers as island processors. Placement and exact stock survive reload and island release/reconnection; demolition loses their contents.

**Oil opportunity fallback:** the reusable Oil Trader offers **4,000 L Oil once for 3,600 L Canola**. Random fallback generation is deliberately suppressed by the processor testing mix until encounter balancing resumes. No Debug inventory stock is provided.

**Old Miller opportunities:** existing Old Miller islands retain their one-time trade. New Tier 2 encounters currently use the 50/50 processor testing mix; Old Miller’s normal seeded 50% setting is retained for later balancing. Connect the island normally. Bring at least **1,800 L Wheat or Barley** in a combine or Grain Trailer to within five tiles of the stall and press **Trade**. The full grain payment commits after its animation and produces **4,000 L Flour** on four pallets, once per island. The compact stall panel uses read-only crop cards and actions beneath it, matching the settlement and silo HUDs. Load and Unload use shared round icon-only buttons with tooltips and accessible labels. Surplus grain stays aboard. Return with the four-slot **Flatbed**, use **Load**, then drive near the Storehouse, tap the outlined building, then **Deliver** in the normal settlement requirements panel to complete the Tier 2 Flour requirement. The same control becomes Cancel during pallet delivery. Connected islands retain trade completion and remaining stock through release/reconnection and reloads.

Flour and Vegetable oil cannot enter silos, Grain Trailers, combines or seed selection. Pallets load and deliver one at a time, with counts committed on arrival. Cancel, leaving range, jumping, changing vehicles/equipment or entering build/cinematic mode stops unfinished transfers without consuming their stock. Pause freezes animation. Connected Windmills provide continuous Flour production.

Debug and Workshop recovery inventories are removed completely. Old recovery/Debug stock and obsolete manual Flour props are discarded on load; valid flatbed cargo and island service stock are retained. The Workshop has no stock or Load popup.

**Manual review:** try both grain alternatives, insufficient/wrong cargo, surplus preservation, full flatbeds and capped settlement delivery. Cancel or reload during grain/pallet animations, release and reconnect before/after trading, and check total stock and one-time completion. Verify independent opportunities, absence of Workshop recovery stock, stall collision/access, trailer alignment, crop/hay/milk behavior, keyboard and phone controls. Gameplay verification is manual.

In Pause → Debug, **Island speed ×10** accelerates passing and released islands while preserving collision checks. It defaults off and is saved; encounter timing and environmental travel are unchanged.

In Pause → Debug, **Fast growth** defaults on and uses a 9-second crop cycle, including grass. Turn it off for 3-minute Wheat, Barley, Canola, Soybeans and Grass; Corn retains its current timing. Grass uses the existing mow/bale loop without a ted/dry step. The preference and fractional growth progress persist across reloads and mode changes. Released fields pause until reattached, without travel-time or offline catch-up. Weed damage and sprayed-ground coloring are on hold; existing weed behavior is unchanged.

Permanent Tier 1 requirements replace draining village stocks. Existing saves retain earned capabilities and separate Debug overrides; recorded stock/deliveries become permanent progress capped at 3,600 L per crop. Previously consumed stock has no saved history to recover. Progress never decays during play or while closed, and tier history survives refresh. Completed Tier 1 saves open Tier 2 when loaded. Tier 2 island-category eligibility is recorded for later specialist content; no buildings are granted. Hay and other Tier 2 deliveries are still unavailable. Use Tab and Space/Enter to activate Deliver on desktop; it automatically uses the carried crop.

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

### Voxel material palette

Open `/materials.html` to review sixteen shared building materials before they
are applied to the buildings. Select a sample block or material name to inspect
it on a block, joined wall and beam. Drag to orbit and pinch or scroll to zoom.
With the canvas focused, arrows orbit, + / − zoom, 0 resets the camera, and Escape
returns to the full palette. Compare textures on/off, adjust surface detail,
and switch studio/daylight/evening lighting. Texture size stays consistent across
merged voxel runs; wood grain follows elongated members. The palette page and
building gallery link to each other and do not read or write game saves.

The candidate library lives in `src/world/buildings/material-palette.js`; its
small shared procedural surface maps live in `material-surfaces.js`. Existing
building materials remain unchanged while this palette is under review.

### In-game hybrid buildings

All ten building types now use the approved hybrid designs: Windmill, Oil Press,
Fieldworks Workshop, Settlement Storehouse, Cattle Barn, Grain Silo, Bluebell
Cottage, Clover Cottage, Old Miller and Oil Trader. Existing saves pick up the
new visuals on reload. Every building uses the same world-space voxel size
(`MODEL_VOXEL = TILE / 5`), with larger site reservations and matching collision
shapes and transfer ports. Farm has an 11.7-tile radius plus seeded jitter.
New worlds use the approved fixed settlement footprint described below, with
vehicle spawns on Farm and a bridge centered on the village entrance. Older
worlds retain their organic settlement footprint, 10.5-tile radius plus jitter,
and original bridge. Confirmed saved buildings retain their stock and sites,
and the barn keeps its pasture gate.
The cottages and trader stalls use fewer full-size voxels to sit more naturally
beside the tractor: compact homes with their dormer/veranda details, and narrow
stalls with visible working counters. These proportions are shared with the
Hybrid gallery. The larger farm buildings retain their dimensions.
The barn has no built-in cow, and the Oil Press has no exterior tank or looping
pipework.

Windmill and Oil Press machinery runs only while goods are being produced.
Barn milk flow follows actual milk production and stops when storage is full.
Silo intake and discharge animations follow their respective transfers;
storehouse/trader machinery follows deliveries or trades. The workshop hoist
runs while a vehicle is in its service area. Ambient flags, vanes, cottage
activity and the silo ventilator continue independently. Pause and hidden tabs
freeze animation and production together.

Keyboard/touch driving, workshop access, placement/pen clearance, deliveries,
production start/stop, island release/reconnection and phone layout still need
manual playtesting. No automated gameplay or save-state tests were run.

### Building collection preview

Open **`/buildings.html#grain-mill/hybrid`** to compare all three grain mill
styles in one gallery. The **Voxel / Low poly / Hybrid** switch retains the
camera, lighting, actual model scale, tractor reference and animation clocks.
Voxel is the original tower and lattice sails. Low poly is the approved faceted
mill. Hybrid combines a stepped voxel tower, timber balcony, recessed windows
and block-built bagging wing with the detailed sails, pipes, gears and grain
handling from the low-poly version. Both newer mills animate the stones,
hopper, grain/flour streams and filling sacks.

The Building picker keeps all ten original building types available. The
Settlement Storehouse also has all three styles: open
**`/buildings.html#storehouse/hybrid`** for thick voxel walls, recessed windows,
a stepped teal roof and a timber loading dock. Its detailed crate hoist, stocked
racks, wheat crest, lanterns and waving flag are shared with the Low poly option.
The dock and machinery stay aligned throughout the lifting and travel cycle.
It represents settlement deliveries; the Pallet Shed remains separate planned
infrastructure. Unmade styles of other buildings are disabled.

All ten buildings now have a **Hybrid** option. The eight additional hybrids are
Oil Press, Fieldworks Workshop, Cattle Barn, Grain Silo, Bluebell Cottage, Clover
Cottage, Old Miller and Oil Trader. Each keeps its own silhouette and purpose:
an exposed oil press, wheel hoist, hay manger and milking stand, grain elevator, lived-in
gardens and porches, flour balance or oil pump. Architecture uses the shared
voxel grid; machinery, cargo, animals and domestic details use finer primitives.
Select **Hybrid** once and it stays selected while browsing the entire collection.
Low poly remains available for the grain mill and storehouse only.

Drag to orbit, scroll or pinch to zoom, or use Overview / Front / Back. With the
canvas focused, arrow keys orbit, + / − zoom, 0 resets and Space pauses.
Working / Idle controls machinery; ambient details such as the storehouse flag
can continue in Idle. Animation pauses the whole scene. Hidden tabs freeze the
clocks and reduced motion starts paused with subdued effects. Turntable,
daylight/evening/studio lighting and a tractor at its real game scale remain
available. The tractor uses a clear front apron. Model notes expand for details.

Direct links use `#building/style`, including `#grain-mill/voxel`,
`#grain-mill/low-poly`, `#grain-mill/hybrid`, `#storehouse/low-poly` and
`#storehouse/hybrid`.
The rest also support direct links such as `#oil-press/hybrid`,
`#workshop/hybrid`, `#cattle-barn/hybrid`, `#silo/hybrid`, `#home-blue/hybrid`,
`#home-red/hybrid`, `#old-miller/hybrid` and `#oil-trader/hybrid`.
Earlier voxel links such as `#windmill` still resolve. `/buildings-next.html`
redirects into the same gallery, preserving previous low-poly study links.
The gallery itself has no game-session, inventory, physics or save access; the
game uses the same hybrid model factories at their authored voxel scale.
Desktop keyboard/touch controls, style switching and phone layout remain for
manual review; no automated gameplay tests were run.

### Settlement tier study

Open **`/buildings.html#settlement/hybrid/1`**, or choose **Settlement** in the
existing gallery's Building picker. Five tier buttons show the completed
appearances on the same island, with one shared framing envelope. Tier 1 starts
with a modest Storehouse and two cottages. Tier 2 adds the timber well, wheelbarrow
and pergola. Tier 3 adds the amber cottage and covered market, and improves the
blue cottage, well and canopy. Tier 4 brings adjoining red-roof homes, richer
amber cottage details and paving. Tier 5 has three finishing upgrades: the civic
Storehouse replacement, a bell tower beside the well, and richer market details.

The fixed island keeps three-tile streets and a market approach, a four-by-five
tile arrival area for turning, and an eight-by-three tile clear delivery court.
Buildings occupy the outside parcels; the market faces inward. Two small trees sit beyond the outer homes, with fewer lamps, fences and garden beds. Richer cottage
details fit their existing parcels instead of adding larger projecting porches.
The bridge entrance has three tiles of clearance between its rails.

The Tier 2 wheelbarrow has an open timber tray with teal edging, a single
rubber front wheel with spokes, metal braces, rear support feet and wooden grips.
A small vegetable load, swinging sign and fluttering cloth complete it. Normal
ambient swings are stronger for readability at gameplay distance; reduced-motion
amplitudes remain gentle.

Every settlement building has ambient detail motion: cottages have shutters,
large, dense chimney plumes and a more readable rocking chair on the red cottage; townhouses add
balcony shutters; the receiving hall and wheelbarrow have swinging signs; the
canopy and market have fluttering pennants; the pergola has wind chimes.
The civic Storehouse flag, well cycle and bell tower continue their existing
motions. Neighboring details use different phases, pause with the scene and
move gently under reduced motion. Decorations stay within the existing parcels,
with the streets and delivery area kept clear.

Both well versions lower their hollow bucket out of sight into the shaft, pause to fill
with visible blue water, then raise it and briefly hold it full before emptying
for the next cycle. The crank turns and reverses in sync, with the rope remaining attached. This ambient motion runs
in the gallery and game independently of deliveries; reduced motion uses a
slower, shorter lift. Gallery animation pause and game pause freeze the motion.

The western pergola and bench face east toward the road. Road branches remain
grass until their destinations arrive: the well and market approaches open at
Tier 2, and the western amber-cottage branch at Tier 3. The final street space
stays reserved for tractor access at every tier.

Settlement trees use the same shared branched trunks, voxel foliage and woodland
palette as the generated islands, with gentle sway and matching trunk collision.

Shared island ground cover now grows around settlement foundations: bright,
dark and dry grass tufts, ferns, wildflowers and mushrooms near the trees.
Clusters arrive with their buildings, gently sway and remain non-blocking,
with streets, entrances and the interaction rectangle kept clear.

Ground dressing ties the buildings into the island: warm worn earth around the
Storehouse and market, sandy cottage foundations, darker damp soil near the
well and garden beds, and mulch beneath the trees. Irregular edges blend into
the existing terrain cells. Dirt appears with its building and upgrades with
the shared ground reveal. Small log stacks, pots and pebbles sit beside the
buildings, outside the streets and delivery area, in both gallery and game.

Roads develop in both the gallery and game: **worn dirt tracks → broader packed
earth → gravel → stone paving → dressed limestone**. They update in sections
along the streets during each upgrade. Their small surface cells stay flush
with the ground, with grass blending into the edges and no new driving obstacles.
The approved island now includes at least one full tile of grassy breathing room
beyond buildings, overhangs and furnishings at every tier. Existing approved
worlds receive the margin and roads on refresh. Placement uses the finished
settlement footprint, aligning its entrance with the Farm shore and leaving
exactly four tiles of open space between the bridge endpoints’ terrain edges.
The landing and its collision move to the outer shore. Island-relative vehicle
poses follow the Settlement; Farm content keeps its coordinates.

Within five tiles of any side of the Storehouse or canopy, a white silhouette
outline marks the building as interactive, matching island selection. Tap/click
the building (or press **R**) to turn its outline gold and open the full
Settlement requirements and Deliver popup above the roof. While nearby and
unselected, a small name-only “Settlement” callout appears above the building.
Tap the name to open the full popup. Both use cream voxel frames with two-step
corners and a tiny blunt speech-bubble arrow pointing toward the building. The
face, arrow, bevel and underside share one SVG contour. Callouts
follow camera movement and avoid screen edges and controls. No ground rectangle
is shown. Close the panel, tap elsewhere or select an island
to deselect the building. Leaving range or jumping closes the panel and cancels
unfinished deliveries. The controlled vehicle must be grounded on Settlement
and within .35 tile of ground height; grain, hay and pallets share the same
five-tile range, regardless of trailer position. Outlines and interaction hide
during construction, cinematics and blocked gameplay. Older layouts use the
same interaction.


**Next upgrade** plays the following tier; **Replay upgrade** shows the selected
tier's changes from its predecessor. Unchanged parts stay in place: cottage
walls and roofs remain during trim upgrades, the market keeps its frame, canopy
and stock while its finishes change, and the well keeps its posts and winch.
Only removed or replaced parts lift away; new pieces and details assemble around
what remains. Complete building replacements, such as the Storehouse and red
cottage redevelopment, still rebuild from the ground up. A normal replay takes
ten seconds including camera framing and return. Reduced motion uses a
four-second ordered reveal without lifting or dropping pieces. Explicitly
starting a replay enables Animation; the Animation switch or Space pauses it.
Hidden tabs freeze playback. Selecting any tier or another building cancels
the replay cleanly. Orbit is available when paused; the original view returns
after construction. Lighting and the optional tractor for scale remain available.
Links ending in `/2` through `/5` open those completed stages directly.

The approved models are now shared with gameplay. **New games** start both
vehicles on Farm, with Settlement arriving from the north. Opening Tier 2 builds
the next appearance in pieces, frames the changing parcels, updates collision
when construction finishes, and returns to the tractor. Existing delivery
requirements and unlocks remain authoritative: only Tiers 1 and 2 are currently
implemented in progression; all five visual stages can be reviewed here.

Saves record the layout and completed visual tier. Reloading partway through an
upgrade replays the pending build without repeating deliveries. **Older saved
worlds keep their previous layout and opening**, preserving their terrain,
connected islands and content. The new layout appears in a new game; this change
does not restart or delete an existing farm.

Manual review for build 0.423: inspect all five gallery stages and four replays,
partial upgrades retaining unchanged structure, portrait framing, pause and
cancellation, reduced motion and evening lighting. In a new game, check Farm
spawns, Settlement arrival, the centered bridge, Tier 1 delivery access, the Tier
2 build and camera return, driving through the village, and reload before,
during and after an upgrade. Also check an older saved world and the standard
driving, terrain, plough and phone-control checklist. No gameplay checks were
automated.

Manual review for build 0.425: compare all five road finishes and replays,
including pause, cancellation and reload during a live upgrade. Check the grass
margin around the largest buildings and drive the bridge landing and outer shore.
Cross all four glowing-area edges with each vehicle and a flatbed, check jumping
and transfer cancellation, and inspect the marker in daylight/night on desktop
and a phone-sized view. Reload a connected world to check preserved content and
bridge access. The standard driving, terrain, plough and mobile checks also
remain manual; no gameplay verification was automated.

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
- Orange corridors show remaining reserved passages, shrinking behind moving islands. Safely spaced passage corridors may overlap; connection and release corridors remain exclusive.
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
arrivals wait for a valid route. Approach time is included in the arrival target; long approaches, occupied routes and the unchanged population limits can delay it. Passing islands do not hover on a timer.

Manual verification for this change: observe a complete direction cycle and
roughly 30-second encounters (26–34-second targets, longer when routes are blocked), converging traffic, multi-bridge attachment, releases
with buildings, reloads during connections, pause/hidden tabs, reduced motion,
and desktop/phone controls. These scenarios have not been automated.

Release searches eight outward directions before reporting “No clear departure”, preferring level exits and then checking lifted routes. Restored expansion bridges use their removable collision data, so they do not leave permanent obstacles after release.

Manual verification for build 0.381: release newly connected and reloaded islands, including multi-bridge connections and departures with passing traffic; confirm blocked routes remain attached and released bridges leave no ghost collisions. Also check consecutive shore arrivals on desktop and a phone-sized view, following and crossing islands, camera-driven departure extensions, refresh with several islands in flight, pause/resume, reduced motion and Island speed ×10. The standard driving, terrain, plough and mobile-control checklist also remains manual.

Build 0.381: Connect takes priority over future passage reservations when the pull and bridge corridor is physically clear. Other islands yield before entering it; unpublished approaches are replanned. Manual checks: connect with a follower approaching, confirm genuinely occupied pulls still wait, and reload during the connection with traffic waiting.

Build 0.382: Release also takes priority over approaching islands' planned routes. Incoming islands yield at the reserved departure corridor, and unpublished approaches are replanned. Occupied space and other connection/release corridors still block departure. Priority survives reloads and camera-driven departure extensions. Manual checks: release with incoming traffic, confirm it waits and resumes after departure, reload during release, extend the departure by moving/zooming the camera, and verify occupied routes remain blocked on desktop and phone-sized views.

Build 0.383: restored anchor chains are excluded from permanent motion obstacles. Their actual scene name was missing from the exclusion, causing the island's own chains to block every release route after reload. Refresh to rebuild the obstacle snapshot; no save reset is needed. Manual checks: reload with an attached expansion, release it, and confirm incoming traffic yields and departure clears the remaining land on desktop and phone-sized views.

Build 0.384: new ordinary islands have a 25% water chance (previously 100%), split between coastal lakes and watercourses. Existing saved islands, starter islands and dry service islands keep their settings. Manual review: observe newly arriving dry/wet islands and check terrain traversal and collision on desktop and phone-sized views.

Build 0.385: new encounters gently curve along the shore, with their complete sampled route checked and reserved before publication. Existing saved passages retain their routes. Manual review: watch the arc and its shore clearance on desktop and phone-sized views; check Connect during a bend, incoming traffic yielding to Release, reload mid-curve, camera-driven departure extensions and Island speed ×10.

Build 0.396: island selection range increased from 12 to 15 tiles. Outlines start hidden and appear only in range; selected islands have a golden outline. Manual checks: enter/leave range with a new island, select/deselect, switch vehicles and check the boundary and colors on desktop and phone-sized views.

Step 10 manual review remains required: desktop and phone controls/HUD, initial spawn and regeneration, bridges/plateaus/plough regression checks; Oil/Windmill timing and capacity, animated supply/collection/cancellation, settlement target/surplus, Quick building placement/draft/confirmation/demolition, and exact stocks across pause, reload, release and reconnection (including reload while drifting or reconnecting). No automated gameplay tests were run.

### Storehouse header icon

`public/icons/storehouse-tier-1.png` through `storehouse-tier-5.png` are
transparent 512 × 512 renders selected by the completed village appearance.
Tiers 1–2 share the timber canopy; Tiers 3–4 share the upgraded canopy; Tier 5
uses the civic Storehouse. Older layouts use `storehouse-legacy.png`.
With Vite running, open `/tools/render-storehouse-icon.html?tier=1` (1–5 or
`legacy`) to reproduce the fixed camera and lighting. Capture its 512 × 512
canvas on a transparent background. The renderer uses the live settlement’s
model selection; gameplay loads only the saved PNGs.

Building inventories now share Settlement's compact cream frame, 68-pixel
render of their actual model, two-line header, inset close button and gray-backed
product icons with names above quantities. Cattle counts and finite storage
capacities have progress bars; unlimited silo storage and trade offers show
quantities without an invented capacity. Existing product/action icons remain.
Expanded panels stay below the top HUD controls with no arrows or connecting
lines. Close cancels an active transfer and collapses non-settlement inventories
to a building-anchored name button; tap it to reopen, or leave range to reset.
Nearby inventory buildings start with this name button and a white highlight.
Tap the model or its name, or press **R**, to open the full panel and turn the
highlight gold. This applies to Settlement, Grain Silo, Cattle Barn, Windmill,
Oil Press, Old Miller and Oil Trader. Tapping away collapses the panel.
The shared renderer accepts `?building=silo`, `cattle-barn`, `windmill`,
`oil-press`, `old-miller`, or `oil-trader` to rebuild their header PNGs.
Construction actions keep their compact individual controls and model anchors.

Build 0.469 manual review: rotate and zoom near each building on desktop and
phone-sized views; check roof clearance, arrows, screen edges, transfer buttons,
construction actions and close/reopen behavior. Check icons after upgrades and
reloads, including older saved layouts. The standard driving, touch, collision,
regeneration and plough checks remain manual; no gameplay automation was run.

Build 0.476: expanded Settlement requirements stay centered below the top HUD controls, without an arrow or connector. Building overlap is allowed to keep the driving area visible. The name callout and other building popups retain their anchors. Manual check: phone/desktop framing, camera movement, close/reopen and delivery controls.

Build 0.481 manual review: inspect each building panel in portrait and desktop views, cycle silo crops, check input/output and trade quantities, close/reopen with touch and keyboard, and confirm transfers cancel without losing uncommitted cargo. Standard driving, collision, regeneration and plough checks remain manual.
