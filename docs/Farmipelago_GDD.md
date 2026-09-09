# Farmipelago — Game Design Document

**Status:** Playable prototype / living design document  
**Updated from implementation:** 2026-09-09\
**Design direction updated:** 2026-09-09

## 1. Game Concept

Farmipelago is a small, playful farming game set on a persistent procedurally generated voxel archipelago.

The player directly operates tractors, harvesters, tools and transport equipment. The challenge comes from making effective use of irregular islands with different heights, shapes and environmental character.

Rather than building a perfectly rectangular farm, the player gradually learns how to make the best use of the Farmipelago they were given.

The same Farmipelago persists throughout the game. Fields, crops, cleared vegetation, buildings, vehicle positions, stored produce and progression state are saved and restored.

---

## 2. Player Fantasy

The player should feel like they are gradually turning a strange little collection of islands into a capable farming operation.

The satisfaction should come from:

- physically operating farming machinery
- transforming the landscape through farming
- discovering good uses for different parts of the islands
- deciding how limited land should be used
- moving crops through a physical farm logistics chain
- unlocking new crops and eventually new forms of agriculture
- reorganizing the farm as its capabilities expand

The game should retain some of the appeal of Farming Simulator while being dramatically smaller, faster and more playful.

---

## 3. Core Design Pillars

### Farming Through Machines

Important farming actions are performed physically using vehicles and equipment.

The player drives the tractor or combine, equips compatible equipment and performs the work rather than managing fields primarily through menus.

### The Land Matters

The generated Farmipelago is not just scenery.

Island shape, elevation, usable flat areas and access routes influence where different activities make sense. Moisture and sunlight give each area a distinct visual character.

The player should regularly have to think:

**How should I use this part of my farm?**

### Persistent Farm

The player keeps developing the same generated Farmipelago.

The game is not structured around completing disposable farming levels. The farm accumulates history through ploughed fields, planted crops, placed silos, stored produce, vehicle locations, attached islands and settlement progression.

### Progression Adds Possibilities

Progression should primarily introduce new ways to farm rather than simply increasing numerical efficiency.

The current prototype starts with four crop types. The intended progression opens new crops, essential machinery and categories of drifting-island infrastructure while optional mastery milestones improve already-established systems.

### Compact and Playful

Farmipelago should feel approachable and toy-like rather than like a detailed agricultural simulation.

Systems can have meaningful consequences without requiring realistic complexity.

---

## 4. Current Core Loop

The implemented crop-farming loop is:

**Inspect land → plough → choose seed → plant → grow → harvest with combine → unload into silo → load trailer → transport to Settlement Storehouse → deliver agricultural goods → repeat**

The first implemented livestock extension adds:

**Grow grass → mow → bale hay → carry a bale to a Cattle Barn → feed cattle → produce milk → load a Water / Milk Tank → store milk in a Water / Milk Tank**

The player can also ignore progression and continue farming freely. Livestock is available through retained unlocks or Debug; the current implemented tier 1 does not accept hay or milk.

Moment-to-moment play revolves around driving and operating machinery.

Long-term play revolves around making the persistent Farmipelago capable of producing increasingly varied agricultural outputs.

---

## 5. Settlement Progression

The game implements permanent Tier 1 requirements for **Wheat, Barley, Canola and Soybeans**, all available from the start with unlimited seeds. Each requires **3,600 L**. Completing any three immediately opens **Tier 2**. Tier 1 records remain saved; the storehouse moves to the new requirements and stops taking Tier 1 crops. Completed requirements never drain, and deliveries stop at the target, leaving surplus cargo in the vehicle.

Tier 2 opening permanently grants unlimited Grass seed and the existing hay equipment: front/rear mowers, baler and bale fork. The workshop and seed controls update immediately. Hay, Eggs, Flour and Vegetable oil appear as **Unavailable** requirements until their production/delivery routes are implemented; the current build cannot complete Tier 2. Targets are provisional: 3,600 L each for Hay, Flour and Vegetable oil, and 24 Eggs. The existing mow/bale loop is usable, but settlement hay delivery, a tedder and crate handling are not implemented.

Opening Tier 2 also records eligibility for chicken-farm, windmill and oil-press islands. These categories are reserved for later content; ordinary island encounters remain unchanged and no specialist building is granted. Corn and livestock still require retained earned gates or Debug overrides. Tier opening earns only its defined capabilities, regardless of any other Debug settings.

### Permanent 3-of-4 tiers

The settlement should progress as one entity rather than through individually simulated houses or hidden satisfaction thresholds.

Each settlement tier presents **four explicit agricultural requirements**. The player permanently completes **any three of the four** to advance. Completed requirements never drain, regress or become unsatisfied later.

The settlement UI should always make the rule and exact quantities visible:

```text
SETTLEMENT TIER 2

Complete any 3 of 4

Hay       COMPLETE
Flour     2,400 / 3,600
Oil       COMPLETE
Eggs      0 / 24

Progress: 2 / 3
```

There should be no continuously draining food meters tied to settlement progression. Old goods should remain useful through later recipes, animal feed, temporary opportunities and future requirements rather than through maintenance pressure.

### What progression unlocks

The intended split is:

- **Settlement tiers provide guaranteed progression.** Opening a tier makes its core crops/seeds and essential farming equipment available and adds relevant specialist-island categories to the encounter pool.
- **Drifting islands provide physical infrastructure and opportunities.** Specialist buildings such as windmills, oil presses, bakeries, cattle farms, chicken farms, dairies and food kitchens should generally arrive on islands rather than being bought from a construction menu.
- **Optional mastery milestones provide improvements and convenience.** Examples include larger trailers, wider equipment or combination tools that improve systems the player has already demonstrated.

Required equipment should not depend entirely on random island generation. Randomness should primarily shape which permanent infrastructure, geography and production routes the player obtains.

### Example five-tier shape

The exact products and quantities remain balancing targets, but the current proposal is:

| Tier | Complete any 3 of 4 | Main new farming complexity |
| --- | --- | --- |
| **1 — Basic crops** | Wheat, Barley, Canola, Soybeans | Standard plough → seed → combine loop |
| **2 — Bales and first processing** | Hay, Eggs, Flour, Vegetable Oil | Multi-step hay work, simple animals, first processors |
| **3 — Dairy and specialized harvests** | Milk, Potatoes, Bread, Mayonnaise | Livestock support, root crops, longer production chains |
| **4 — Permanent/different harvest handling** | Apples, Cotton, Cheese, Potato Crisps | Orchards, physical cotton handling, reused processors |
| **5 — Specialist land use and integration** | Rice, Grapes, Fabric, Apple Pies | Paddy/vineyard work and integrated earlier systems |

Progression should not become **processor → processor → processor**. Later tiers should mix production-chain depth with genuinely different field work, harvesting, livestock, handling and land-use patterns.

### Opportunities as a bad-RNG fallback

Small farms and other passing-island opportunities can offer one-shot or batch-limited exchanges with a **one-of-two input choice**. These opportunities can bridge a missing progression step without replacing the permanent infrastructure.

Example:

```text
OLD MILLER

Supply one:
1,800 L Wheat
or
1,800 L Barley

Receive:
Enough Flour for the current settlement requirement
```

This allows a player who has not found a Windmill island to complete a Flour requirement and keep moving. Later, Bread still benefits from owning a dependable Windmill feeding a Bakery. Similar opportunities can temporarily provide Oil, Milk, Eggs or another missing product.

This creates three responses to unlucky island generation:

1. find and keep the proper infrastructure
2. use a temporary opportunity to bridge the missing step
3. complete the other three requirements and ignore that route for the tier

The goal is for RNG to **change the player's route through progression, not make the player wait for progression**.

### Game-length target

The current first-completion target is approximately **five hours** for a new player who explores passing islands, reorganizes the Farmipelago and experiments rather than optimizing only for progression.

A first pacing target is:

| Tier | Approximate first-play time |
| --- | ---: |
| Tier 1 | 15–25 min |
| Tier 2 | 30–45 min |
| Tier 3 | 45–60 min |
| Tier 4 | 60–90 min |
| Tier 5 | 60–90 min |

The explicit tier objectives account for roughly 3.5–5 hours depending on play style. Exploration, island decisions and reorganization should naturally put a typical first completion near five hours. An experienced player with good system knowledge and favorable island opportunities may finish in roughly **2.5–3.5 hours**.

Later tiers should take longer because the operations and logistics are more involved, not because every quantity simply grows dramatically. Early progression proves the player can produce something; later progression increasingly proves that the Farmipelago can sustain a small chain.

The final settlement tier should not require seeing every crop, building, island type or optional mastery reward. Free farming and further Farmipelago development should remain available after completion.

See `Settlement_Progression_Proposal.md` for the detailed proposal, implementation
steps, approval history and verification records.


---

## 6. Optional Progression

Optional progression is a planned system and is not yet represented by a full milestone structure in the current prototype.

It should reward the player for developing the Farmipelago in broader and more interesting ways rather than simply asking for additional delivery quotas.

Possible milestone categories include:

### Land Use

- actively farm on several different islands
- cultivate land at different elevations
- make productive use of difficult or unusual terrain
- expand the amount of land under active use

### Crop Diversity

- grow several different crop types
- maintain a diverse set of crops at the same time
- maintain productive fields across several islands and elevations

### Livestock

- keep different animal species
- support livestock with crops grown on the Farmipelago
- develop enough feeding capacity for larger herds

### Machinery

- use several different vehicle types
- make use of specialized attachments
- operate machinery suited to different types of terrain or farming

### Logistics and Infrastructure

- make productive use of distant islands
- transport produce between different parts of the Farmipelago
- build and use storage or future agricultural infrastructure

Optional milestones should preferably unlock useful capabilities, conveniences or specialized equipment rather than only percentage-based stat increases.

---

## 7. Progression Philosophy

Progression should expand the player's **capabilities**.

The game can eventually contain several overlapping areas of farming:

**Crop farming**  
Ploughing, planting, harvesting and crop-specific machinery.

**Livestock**  
Animals, feeding, animal products and livestock-related vehicles.

**Logistics**  
Transporting crops, feed, equipment and other resources around the Farmipelago.

**Land improvement**  
Storage, access between islands and potentially other ways of adapting difficult terrain.

These do not need to form a large visible skill tree.

Main progression should combine guaranteed settlement-tier capability unlocks with random physical infrastructure arriving on drifting islands. Optional progression should primarily reward breadth, experimentation and mastery of systems the player already has.

---

## 8. The Farmipelago

The world consists of multiple voxel islands generated from a persistent seed.

The current generator provides a permanent two-island opening:

- a dominant, level Farm Island with the farmyard, starter field space and a walk-in 3×3 workshop at the northern end of its west edge
- a broad, irregular lake along the Farm Island's south coast, feeding an east-flowing river and waterfall
- a much smaller, mostly level Settlement Island held stationary directly north, with the tractor and combine spawns, reserved turnaround space, and the Settlement Storehouse
- a compact settlement with voxel-built homes, an interactive storehouse, worn paths and warm lighting
- a fresh opening cinematic that first establishes both parked vehicles on Settlement, pans to reveal the visible, non-colliding Farm approaching from the south along negative Z, travels with its final docking, then eases back over the vehicles into the normal drive camera; HUD and gameplay input remain suppressed until that camera release, and the final center-aligned separation is measured from the generated shores before either footprint is placed
- two metal chains extend between the facing undersides of Settlement and the approaching Farm, tightening as the islands dock; their anchors follow the perimeter at one-quarter and three-quarters of each island’s full width; the camera then holds on the connection while bridge planks assemble from Settlement toward Farm, followed by railings and lanterns; the chains remain as visible underside connections, and reduced motion preserves the ordered reveal without the pieces dropping into place
- one broad, gently crowned wooden bridge with railings and warm day/night lanterns providing the pair's only physical connection from the Farm Island's north shore to the Settlement Island's south shore; its modeled deck targets `2.0 ± 0.25` terrain tiles while the terrain itself retains an air gap greater than one tile
- grass, dirt and stone terrain layers with deep pointed undersides
- generated trees, rocks and ground cover around the retained terrain

Passing islands use the same seeded terrain, soil strata, stone undersides,
environmental coloring, trees, ground cover, lakes, rivers and waterfalls as the
starter islands. About 80% of ordinary generated islands have 4–5.5-tile radii;
the others vary from 7–10 tiles. Generation settings explicitly control size,
elevation, terraces, underside depth/taper, vegetation, moisture, sunlight and
water style. The starter islands retain their fixed presets.

The shared sky flow starts southwest and turns clockwise through a full circle
every ten active minutes. Relative passing motion runs opposite that heading at
one shared cruise of 180% of the travel speed for encounters and decorations
(2.07 tiles/second normally, scaled together for reduced motion), so the original back of the Farmipelago becomes an
upstream side after roughly five minutes. The farm and its camera do not rotate.
All environmental travel cues follow this same changing direction.

The current implemented encounter scheduler targets one suitable shore arrival every **60 seconds**,
accounting for off-screen approach time. The current design target is to prototype a much more frequent cadence of roughly **one relevant island every 30 seconds**, with random variation, so RNG produces regular choices rather than long waiting periods. The rare event should be seeing an island worth permanently keeping, not seeing an island at all.

The scheduler prefers valid connection sites near
the active vehicle, within the normal 12-tile interaction range, or the nearest
valid shore when none is in reach. Among nearby sites, compact layouts and
multiple neighboring connections retain strong preference. Generated candidates
must have compatible bridge landings and a clear direct connection route. A
small, flat island with clear landings is used as a generation fallback.

Encounter routes validate a straight passage through a nearby shore waypoint,
with the same incoming and outgoing heading. Both types use the current heading
when planning; encounters allow up to 30 degrees of bias to find a clear passage.
Encounter timing holds a prepared candidate off-scene until its launch time,
using up to two reserved approaches in flight. Entry stays near the current camera edge instead of being pushed
farther upstream to fill the schedule. Individual islands never
speed up or slow down to meet the schedule. A longer or occupied approach may
delay an arrival; collision clearance takes priority. The waypoint marks the encounter; the island
continues along the same heading through departure. Encounter islands
pass normally, with no scheduled hovering or special waiting window. Moving the
vehicle away can miss an encounter. Candidates stay unpublished until their
complete passage is clear and reserved. Published islands never teleport, pursue
the vehicle, change direction, or discard their route when blocked. Unexpected
obstructions still trigger the fixed-step safety stop, preserving the route. Normal passage maintains at
least 5.5 tiles of terrain clearance. Passing islands have no vehicle colliders
and cannot be boarded.

Decorative passing islands are temporarily disabled in the game and route
debugger because their distant lanes are not visible on small screens. Saved
decorative islands are skipped on load; encounter and released islands remain
active. The following decorative behavior is retained for later re-enabling.

When enabled, three decorative islands are attempted at initialization, with another attempted
every twenty active seconds up to a maximum of four decorative islands. Their
straight lanes follow the projected outer shore with a 14-tile terrain gap,
remaining outside interaction range for the whole passage. A lane must cross the
current gameplay view for at least eight tiles of travel to be admitted. They
never receive selection outlines or Connect actions. New routes follow the
changing world heading; a published island keeps its own planned heading.

Every passing island reserves its complete entry-to-exit route before becoming
visible, including its swept solid bounds and a one-tile buffer. Complete
reservation volumes must be mutually disjoint: a new corridor cannot block an
older island's future path. The first encounter has priority over initial
decoration. Entry and exit use the current game camera and zoom, with a two-tile
buffer around the complete visual bounds. There is no fixed distance margin
around the whole farm. Full-route shore and collision checks still apply. Islands
are removed only after reaching the planned exit outside the buffered view. There is no age-based
removal, minute-by-minute route renewal, or unplanned drift after the route ends.
The total passing population remains capped at 48, with encounters taking precedence.

All island motion uses swept solid-envelope checks against land, bridges, other
moving islands and reserved connection/release routes. Solid envelopes include
undersides, props and carried structures; spray and particles are not solid.
Unrelated moving islands retain a one-tile envelope gap. Decorative traffic uses
its complete solid bounds so irregular edges and overhangs cannot interleave.
Traffic yields or stops
before contact. Connection reservations cover the whole pull and bridge-building
space. Releases preflight a clear lift/exit/descent, and preserve vertical physics
motion. A blocked release remains attached with “No clear departure.” Collision
avoidance overrides encounter timing: a blocked or geometrically impossible
opportunity remains pending rather than causing an overlap or a burst of arrivals.

Pause and hidden tabs freeze these clocks. Reduced motion slows translation and
subdues effects while keeping the direction cycle and encounter cadence. Travel
phase, displacement and encounter-clock progress persist across sessions.
Passing islands also save their seeds, generation settings, exact positions,
passage routes, route progress and encounter/decorative roles. Reload restores
their locations and route reservations before new arrivals are scheduled, with
no offline catch-up. Older saves without island locations start new approaches.

Within 12 tiles of the active vehicle, measured to the nearest shore edge, a
thin white silhouette marks the whole passing island as selectable. Distant
islands have no outline and ignore selection taps. Leaving range clears the
selection and action; switching vehicles uses the new vehicle’s position. Tap any visible part for a brighter selection outline,
then use the small contextual Connect action. There is no destination ghost or preview camera zoom. Connect and Release are
anchored beside the selected island with a fine pointer, fitted within the screen
and placed clear of visible HUD controls. Both actions use the same compact cream single-row control with muted amber
text and a vertical divider before the separate dismiss target. Blocked actions retain that size, using a
lock and “Required link” or “No clear site”; the full reason remains available
as an accessible description and tooltip. Placement uses projected terrain
footprints rather than bounds inflated by waterfalls and spray. The pointer
ends at the actual tapped surface, following it as the island and camera move. The player chooses which
island to keep; the game chooses where it joins, preserving its shape and orientation.
Placement strongly favors bays, concavities and multiple neighboring islands over
long arms. Only reachable destinations are offered: the complete incoming
footprint must have a clear, direct approach past existing terrain and bridges.
Favor the nearest approach; do not send an island around the Farmipelago to reach
a remote socket. Compactness and multiple neighbors remain strong preferences
among directly reachable destinations. New connections stop with four tiles of
clear sky between facing shores, also checking the rest of the irregular footprint.

Connecting reveals the connection gap, shoots chains from each neighboring island,
and lets them attach before the incoming island starts its pull toward the destination.
The island keeps its current drift speed and heading throughout the launch.
Two chains straddle each bridge, fixed to exposed shore faces. Placement checks
the predicted catch position and pulling angle, then reserves both the drifting
launch and curved pull. Once the chains catch, they tighten and the island bends
smoothly toward docking, preserving its velocity through the catch and easing to
a stop at the destination. The chains relax after docking. The camera follows
the pull, then holds while the bridges assemble.
For expansion attachments, the camera looks across the connection gap and frames
all chain anchors, with distance fitted to portrait or landscape aspect. It moves
slightly higher to show bridge construction, then returns to the vehicle. Expansion
bridges assemble from each retained island toward the incoming island.
The island follows its planned route continuously. Only after bridge construction
does it become normal playable land, including farming, exploration, resources and
buildings. Connected topology and land state persist; an interrupted connection
replays its arrival on reload. There is no temporary attachment category.

Tap connected expansion land to Release. This is disabled if removing the island
would disconnect any remaining island from Farm. The starter pair is retained.
Released land keeps its content and resumes drifting; vehicles return to their
Settlement spawn with cargo retained. Departed, unconnected islands are transient.
Pause freezes the simulation; build mode continues it.

Island identity, role and land-use capabilities are explicit. The Farm Island
allows farming and player construction. The Settlement Island remains
traversable and supports cargo interaction, but rejects field work and player
construction so it reads as a community destination rather than a second farm.

Vehicles can jump, so elevation and gaps are part of navigation without requiring ramps.

Generated lakes and rivers must be enclosed by solid banks, with exactly one exposed tile edge at their waterfall outlet. Notched shores never relax this rule: coastal lakes move to a banked site, and passing islands may use a smaller enclosed watercourse when the broad lake cannot fit.

Generated props, bridges, the Settlement Storehouse and completed player-placed buildings can fade when they block the camera's view of the active vehicle. Bridges do not fade merely because the vehicle is driving across them, so driving surfaces remain readable beneath the vehicle.

The Farmipelago persists across browser sessions, including its generated tiles and seed.

---

## 9. Environmental Variation

Each farmable location has environmental values for:

**Dry ↔ Wet / moisture**

**Shady ↔ Sunny / sunlight**

These values are procedurally generated and visibly affect the world. Damp/cool areas tend to gather trees, while bright/dry areas are rockier and more open. Grass color also varies with the environmental fields.

Moisture and sunlight do not score farmland or modify crop growth, crop yield or grass yield. Crops therefore perform consistently wherever there is usable prepared land. There is no crop-planning overlay or separate crop-inspection camera mode.

The world also runs a persistent ten-minute visual day/night cycle in which every clock hour passes at the same speed. Day runs from 04:00 to 20:00, dawn and dusk each last two hours, and night runs from 22:00 to 02:00. The backdrop uses a clear medium blue during full day and follows the rest of the time-of-day palette without a full-screen sky shader or visible celestial discs. Sun and moon directions continue to drive the global key lighting and animated shadows. Dawn and dusk shift through bright, readable peach and lavender, while the brief night is distinctly darker than dusk but remains playable through cool blue key, ambient and water lighting plus local fixtures. Fog, water and local fixture lighting follow the same cycle. This illumination is separate from each tile's generated sunlight value and does not affect crops, livestock, yield or progression.

The Farm Tractor's paired front lamps follow the same late-afternoon-through-sunrise timing as other local fixtures and cast warm, focused beams ahead across the terrain.

The attached starter pair reads as travelling through the sky with a slowly
turning shared heading, even though its gameplay coordinates remain fixed. Many small, compact
voxel clouds stream opposite the current travel heading slowly below and around the distant silhouette,
while a much smaller population of substantially larger opaque clouds passes at
island-edge and underside height at about two and a half times the speed. Even the
highest crown of a near cloud remains at or below the playable terrain plane.
Both bands use deterministic irregular two-dimensional spacing, heights, scales, and
stepped voxel silhouettes, wrap around a stable frame derived once from the two
islands, stay aligned to the world grid, and do not follow the camera or either
vehicle. A shared world-owned gust subtly biases tree sway. Reduced motion keeps
the directional translation at a slower steady pace and removes cloud bob and
gust pulse.

Small opaque voxel dust motes and loose leaf chips also skim with the relative flow through
a shallow band above the playable land. Their deterministic sources are cached
from dry open terrain and generated trees or vegetation respectively, including
the Farm's presentation offset during its opening arrival. The shared gust adds
subtle speed, lift, and lateral variation without affecting physics, crops, or
input. Night lowers their palette brightness, while reduced motion halves the
visible populations and removes gust lift and leaf tumble.

A gold-and-cream flag above the Settlement Storehouse makes wind direction visible
from the village. Its free end points with the clouds and loose leaves, opposite
the shared travel heading, and cloth waves run outward from its fixed mast with
gust-driven flutter. It follows the same active clock, pauses with gameplay, and
keeps a gentle wave and correct heading with reduced motion.

The Farm Island waterfall reinforces the same travel direction while remaining
firmly attached to its generated river outlet. Its lower water and three foam
streams follow a shallow segmented curve opposite the current heading, and one fixed pool of small
solid spray voxels recycles from the lower fall without physics or gameplay
state. Normal motion uses only restrained shared-gust variation; reduced motion
retains the backward lean and slower steady spray without turbulence. The
complete lake, river, fall, foam, and spray assembly remains owned by the Farm
during its opening arrival and after attachment.

A vast saturated surface also follows the relative flow far below the cloud layers. One
periodic top-down tile map supplies dense square cells of green grass, plain
blue water, brown soil, and darker forest ground with stepped shore and biome
edges but no drawn grid lines. A palette-preserving mip chain keeps those
saturated terrain classes distinct at distance instead of averaging them toward
gray. A coarser periodic height grid gives the surface
broad distant relief through a few discrete one-unit plateau levels:
raised cells have flat green tops and expose brown vertical walls only toward
lower neighbors. These merged plateau meshes and a dense field of tiny
single-draw instanced voxel trees share a fixed, horizon-biased detail footprint
inside a broader diffuse plane. The extreme horizon may become texture-only,
while the base-plane edge remains beyond the camera frustum. Together they
preserve the voxel-world silhouette from every camera
orientation. It derives motion from accumulated shared X/Z displacement, remains
fixed to the stable Farmipelago travel frame rather than any camera or vehicle,
and has no gameplay terrain, collision, interaction, persistence, independent
clock, or shadow work. Its materials deliberately opt out of scene fog because
fog erased the accepted terrain colors; physical separation, coverage, exposure,
and global lighting keep it remote and subordinate to the playable islands.
Reduced motion automatically slows it with the rest of the travel presentation.

Ambient reindeer and foxes are temporarily absent from the two-island opening.
Their implementation remains available for a later island slice, but the
current Farmipelago owns no ambient wildlife scene or simulation. Cattle and
their farming gameplay remain unchanged.

---

## 10. Crops

The current prototype contains five crops:

- Wheat
- Barley
- Canola
- Soybeans
- Corn

The player selects seed while using the seeder. Only crops unlocked by progression should be available for normal progression play.

**Seed quantity is not intended to be an inventory constraint.** Once a crop is unlocked, the seeder has unlimited access to that seed. Crop unlocks are about gaining a new farming capability rather than maintaining bags or litres of seed.

Planted crops visibly sprout and grow. Harvest-ready crops pulse in synchronized world time every 3.2 seconds, gently expanding up to 18% in height and 7% in width from their rooted base before settling back with a short rest. Reduced motion disables the pulse.

Crop durations are catalog-driven. Wheat, Barley, Canola and Soybeans take **3 active minutes** from planting through three timed stage transitions to maturity when Fast growth is off. Corn and grass retain their prototype durations pending later balancing. Longer-term targets are:

| Crop type | Target growth time |
| --- | ---: |
| Early grains and oilseeds | **~3 min** |
| Corn, grass and root crops | **~4–5 min** |
| Cotton, rice and other later annual crops | **~5–6 min** |
| Persistent orchards and vineyards | **~6–8 min between harvests** |

These are design targets rather than final balance values. Later crops should not automatically grow more slowly only because they belong to a higher tier. A crop that already has a complex multi-step harvest may need less additional waiting. Growth time should encourage the player to leave a planted field and inspect islands, transport goods or work elsewhere rather than wait beside it.

With a relevant passing-island target near 30 seconds, a three-minute starter crop creates room for roughly six island encounters during one growth cycle.

The **Fast growth** Debug toggle is **on by default**, retaining the prototype
speed: 3 seconds per ordinary crop stage (9 seconds to maturity) and 10 seconds
per grass stage (30 seconds per cycle). Turning it off selects normal catalog
durations. Its saved setting defaults on when absent. Switching modes preserves
the current stage and its fractional progress; mature crops stay mature. Growth
pauses while the game is paused or hidden, and there is no offline catch-up.
Released islands freeze field growth until they are reattached, preserving
fractional progress across mode changes and reloads.

**Weed design on hold:** a proposed stage-3 deadline would leave affected crops
at 75% of normal yield, and sprayed tiles would darken to show treatment coverage.
These mechanics are not implemented and await further design review. Existing
weeds can still be removed with the sprayer and do not affect yield or ground color.

Each ready crop tile yields a random whole-litre amount from **70–110 L**, rolled when harvested. The **90 L** average fills the combine's **3,600 L** tank in approximately **40 tiles**. Each ready grass tile produces a fixed **200 L** of loose grass when mown.

Crop choice matters through progression requirements, visual identity, farming method and the need to keep harvested types separate in machine storage, rather than through environmental yield differences.

---

## 11. Field Work

Crop farming is physically represented in the world.

### Ploughing

The tractor's visible four-share plough converts grass tiles into ploughed soil and produces rolling voxel soil feedback.

Grass tufts on worked tiles are cleared as part of cultivation.

### Seeding

The seeder plants the currently selected crop on prepared soil. The player can cycle seed directly from the vehicle controls.

### Harvesting

The Combine Harvester uses its built-in header. The header can be raised/lowered and started/stopped through the same contextual tool-control philosophy used by tractor attachments.

Harvested crop enters the combine's internal storage.

Each successful cut sends a short burst of crop-colored voxel stalks and grains upward, then curls them into the moving header over 0.62 seconds. The effect uses bounded reusable instance pools, follows the harvesting combine even after vehicle switching, and is disabled with reduced motion. Yield and storage update immediately.

Mowing mature grass creates a matching green voxel-clipping burst. Clippings tumble upward, fall onto the cut tile, and settle flat into its persistent loose-grass pile over 0.8 seconds. Both front and rear mowers use this bounded visual effect; reduced motion disables it while keeping the loose grass and regrowth.

---

## 12. Livestock

Cattle are the first implemented livestock system and connect directly to the existing physical hay and vehicle-logistics loops.

With a retained or Debug livestock unlock, the player can place a Cattle Barn on clear level terrain. Before committing it, the player may reposition the barn and choose **Draw pen**. The barn doorway lights brightly and a broad three-tile ground gate extends in front of it; the player roughly circles those tiles and the pasture they want with one continuous gesture. The lasso closes automatically, trims unusable edge land, keeps the continuous area connected to the gate, and resolves to an editable, grid-snapped orthogonal fence. Fixed connector sections begin at the midpoint of the barn's left and right walls, so the barn itself closes the pasture entrance. Fence generation and editing reject segments that pass through the barn or another building. Every four valid pasture tiles provide one hard capacity slot. An Undo action abandons the provisional pen and returns to movable barn placement; final Confirm permanently commits both barn and pen.

Final barn confirmation grants two adult cows. Newly granted cows and newborn calves fall from one tile above the pasture under world-strength gravity, squash briefly on landing with their feet anchored, and recover to their normal size before walking. Restored animals do not replay the arrival; reduced motion skips it. A provisional pen never starts livestock simulation. Once confirmed, cows are individual persistent animals that choose farther visible points across clear pasture, walk directly toward them at free angles and cannot leave or transfer to another barn. With at least two adults, available capacity and stored hay, a herd-level birth timer creates a calf. Calves are visibly smaller, count against capacity and mature automatically. All adults produce milk; the prototype deliberately omits pregnancy state, sex, disease, health, old age, natural death, slaughter, selling, manure, purchasing and animal transport.

Existing physical 3,600 L hay bales are deposited at the barn and converted to shared herd feed. Hay supports full milk production and automatic herd growth. Without hay, cattle continue grazing without depleting terrain and produce at 20% of the fed rate; herd growth pauses and cattle never starve or die.

Milk accumulates in the barn up to 10,000 L. The tractor's livestock-gated 6,000 L Water / Milk Tank loads milk from a nearby barn in rapid 10 L steps for transport. Milk is not accepted by the current implemented tier 1 village prototype.

---

## 13. Vehicles and Equipment

Vehicles are persistent world objects. The owned fleet currently contains:

### Farm Tractor

- rear tool slot
- front tool slot
- default loadout: plough + front loader
- can equip compatible rear/front equipment
- can equip a **20,000 L Grain Trailer** for crop transport
- can equip a **6,000 L Water / Milk Tank** for milk transport after the livestock unlock

### Combine Harvester

- built-in harvesting header
- no swappable rear/front attachment slots in the current prototype
- **3,600 L** internal crop tank

Both vehicles remain parked in the world when not controlled. Their positions, loadouts and compatible stored cargo are saved.
The tractor and combine each have their own generated Settlement Island spawn point with reserved turnaround space. Rescue and world regeneration return a vehicle to its own point rather than a shared fleet location.

The Grain Trailer, Baler and Water / Milk Tank are articulated tow-behind
equipment. Each follows its own hitch-to-axle geometry, keeps its joint angle
while parked and across refreshes, and uses that pose for visible wheels,
working areas, cargo flow and bale ejection. Reversing permits a readable swing
but softly resists extreme jackknifing. Mounted rear and front tools remain
rigidly aligned with the tractor. Tow articulation is intentionally kinematic
and does not add separate equipment collision bodies.

Vehicles and tools may use smaller blocks and rotated block assemblies to keep machinery detailed and readable; the strict five-model-voxels-per-tile building standard still applies to buildings. The tractor, combine and all seven rear/five front tool models use 0.05-tile detail blocks, with finer cab framing, wheels, angled plough shares and loader booms, tapered hoppers, slim mower decks, a ribbed trailer and detailed baler and liquid tank. Each rigid assembly assigns one material per occupied cell; windows, open buckets, trailer beds and the baler chamber are constructed spaces, and wheel and tank silhouettes are stepped. The blue tractor retains its glazed cab, paired timed headlights and beacon. The green-and-cream combine has fine cab framing, inset engine vents, detailed wheels, an open-spoke header reel, a moving feeder throat and a block-built unloading auger. Its header lift, reel spin, rear-wheel steering and auger deployment retain their existing animation interfaces. Front and rear mounted tools use visible lift links that follow their socket positions; trailers, the baler and the liquid tank use a common drawbar pivot and an open clevis. The clevis is hidden when the rear three-point linkage is in use. Articulated parts retain their wheel, rotor, lift, towing and transfer animation, with lift bars extending between their endpoints. This visual update does not alter equipment unlocks, inventory capacities, field-working areas or the kinematic driving model.

The player can cycle between owned vehicles. Vehicle switching briefly pauses driving and uses a lift-and-glide camera handoff to the next vehicle.

### Workshop

The workshop is a permanent starter structure at the northern end of the Farm Island's west edge. Its open bay faces east toward the farmyard and functions as the vehicle loadout area. The Settlement Storehouse is across the north bridge on the Settlement Island's outer east side.

The accepted Fieldworks design uses teal walls, twin stepped sawtooth skylights, a yellow lifting gantry, a raised hoist, and detailed service equipment on the shared five-voxels-per-tile grid. It retains the 3×3 enclosure, site, orientation and loadout trigger; its wider open bay and detailed structure have matching merged voxel collision. The entrance lantern follows the day/night cycle.

The player drives into it and receives a live 3D preview of the active vehicle and compatible equipment. Selecting an equipped rear or front attachment again leaves that slot empty. The UI distinguishes unavailable slots for vehicles such as the combine.

Long-term equipment design should preserve meaningful tradeoffs. Larger or more capable vehicles should not automatically invalidate smaller machinery if terrain, maneuverability or specialization can keep both useful.

Essential equipment needed to perform a newly opened settlement tier should be made available predictably when that tier opens. Optional mastery rewards can then improve established equipment or reduce repeated work without gating the activity itself.

---

## 14. Storage and Logistics

Crop volume is represented physically in litres and moves between actual inventories.

The crop logistics chain is:

**Combine → silo → Grain Trailer → Settlement Storehouse**

The cattle logistics chain is:

**Hay bale → Cattle Barn → stored milk → Water / Milk Tank**

Transfers occur in rapid 10 L steps and are reflected in vehicle/building inventories rather than functioning as abstract menu submissions. Crop and milk transfers are made physically legible by color-matched swarms of tiny tumbling cuboids that weave along a guided arc from the source inventory to the receiver. Machinery and storage objects anticipate and react to the flow with compact toy-like movement.

### Grain Silos

The player can enter build mode and place grain silos on valid clear, level terrain.

Current silo behavior:

- silos are free in the prototype
- they have physical collision
- a placed silo remains a movable construction draft until its contextual Confirm action is used
- confirmation permanently fixes the silo in place and enables crop storage gameplay
- each silo stores crop volumes by crop type
- contents persist in the save
- a nearby popup shows stored crop amounts
- round Load / Unload controls transfer produce between the selected silo and an eligible vehicle

This is the first implemented building-placement and farm-storage system.

---

## 15. Buildings and Construction

The game now has an implemented construction mode rather than buildings being entirely unresolved.

A round build button opens a dedicated elevated, pannable construction view. Available buildings appear as a single-row tray centered along the bottom of the screen. Selecting a type immediately creates a draft at the nearest suitable clear site around the current view, after which the player can reposition it before confirmation or remove it with a contextual Cancel action. The tray stays visually compact and does not carry barn-placement instructional copy.

The player-placeable buildings are the **grain silo** and progression-gated **Cattle Barn** in the current prototype.

The long-term drifting-island direction should avoid turning specialist agricultural production buildings into a conventional purchase/build menu. Processors and distinctive farm infrastructure should generally arrive as part of passing islands, making attachment decisions part of progression. Basic support infrastructure may remain player-placeable where needed.

The pending demolition confirmation includes a compact inline warning: a silo loses all stored crops; a barn loses its pen, cattle, stored hay and milk. It explicitly states that demolition cannot be undone.

Successfully confirming a silo or the final barn-and-pen layout automatically closes construction mode and returns to the normal driving camera and controls. Draw pen keeps construction mode open for pasture editing. As with any exit from construction mode, other unconfirmed drafts are discarded.

Buildings are designed freely before commitment, but become fixed in place once confirmed. A pulsing lime edge outline visually distinguishes every unconfirmed building from the normal treatment used by completed structures; confirmation removes that outline permanently. Placed drafts use a deliberate hold-and-drag gesture for repositioning so a quick tap remains available for selection. A Grain Silo remains movable until its contextual Confirm action is used, and it cannot store or transfer crops before that confirmation.

In construction mode, selecting a completed silo or Cattle Barn exposes **Demolish**. The first tap changes that same button to **Confirm demolish**; a second tap permanently removes the building and its stored contents, plus the pen and cattle for a barn. Tapping elsewhere, changing selection or leaving construction mode cancels the pending confirmation. No native confirmation popup is used. Demolition clears the associated collision and land occupancy and is saved automatically. Completed buildings cannot be relocated, and the workshop, settlement structures and bridge cannot be demolished.

Cattle Barn construction has two stages. The player first positions the movable barn draft and chooses **Draw pen**. The barn then stays fixed while the player lassos the desired pasture, edits the generated fence through snapped corner and segment dragging, or uses **Repaint border** to create a new candidate. Repainting does not destroy the existing provisional pen unless the new lasso is valid. An Undo action removes the entire provisional pen and returns to movable barn placement. Final Confirm commits both barn and pen permanently, removes all editing controls, grants the two starter cows and enables normal livestock interactions and simulation.

Fixed placement makes scarce clear, level land and future farm layout part of the Farmipelago puzzle, while the draft phases let the player experiment before commitment. Later reorganization requires demolition and loses the removed building's contents. Leaving construction mode is an explicit cancellation boundary: every unconfirmed silo or barn, including provisional pen geometry, is removed. A refresh while construction mode is still active preserves the current draft phase without confirming it.

The permanent starter structures are:

- vehicle workshop
- Settlement Island homes
- Settlement Storehouse with an open receiving bay on solid settlement ground

Future buildings may support:

- livestock
- specialized crop handling
- additional storage
- equipment
- new progression systems

Every new building must follow the small-voxel building construction standard in the Art Direction section. This applies equally to permanent world structures and player-placeable buildings.

The design should continue to require buildings to have clear gameplay functions rather than adding structures purely because farming games conventionally contain them.

---

## 16. Settlement Storehouse and Deliveries

The progression receiver is a permanent **Settlement Storehouse** on the smaller northern Settlement Island, replacing its decorative receiving house. It is built on solid ground with cream walls, recessed side windows, a stepped red roof, a broad open receiving bay and a warm hanging lantern. A clear approach connects it to the settlement paths.

### Current prototype

The player brings Wheat, Barley, Canola or Soybeans to the front yard during Tier 1. The contextual **Settlement** popup shows the active tier and its four requirement cards in a two-column grid. Each keeps its icon, name and delivered/target quantity visible, with a separate **Not started**, **In progress**, **✓ Complete** or **Unavailable** status. Eggs are counted individually; the other current targets use litres. Completed cards have a muted green background rather than a filling reserve meter. The regular-weight “Complete any 3 of 4” rule remains visible after completion. There is no separate completed-count or optional-crop summary. Completing Tier 1 immediately replaces its cards with Tier 2’s unavailable requirements. The UI retains its completed-tier treatment for a tier without a defined successor: a completion message, and a green struck-through remaining requirement with its hidden status space preserved. Cards are read-only and cannot be selected. Each icon and crop name are vertically centered together in the card’s first row.

Use the round **Deliver** icon button below the popup’s right edge, matching the silo’s transfer action. Its tooltip and accessible label identify delivery. Deliver identifies the current vehicle’s carried crop directly on every activation, independent of silo selection. It is disabled for empty or unsupported cargo and completed requirements. Rapid 10 L transfers, inventory conservation, cargo effects and range checks remain in place, and deliveries stop at the requirement target without removing surplus cargo. Visible crates reflect the active tier’s delivered progress with bounded visual density. The popup is clamped to phone safe areas above driving controls, and its Deliver button supports keyboard activation. Requirement cards are informational and do not receive keyboard focus.

### Next-development preview

A compact **Unlocks: Hay farming & equipment** line below the cards summarizes the direct guaranteed capabilities from Section 4 of `Settlement_Progression_Proposal.md`. The content is maintained in progression data. It excludes island archetypes, future delivery requirements, tier headings and availability copy. The line is shown during Tier 1; opening Tier 2 grants these capabilities and hides the preview until another tier is defined. The popup is capped at 240 pixels wide. Safe-area fitting and avoidance of driving controls include the delivery button beneath it.

There should be no hidden population threshold or decaying settlement-progress meter.

---

## 17. Controls and Camera

Primary platform target is mobile, with portrait-oriented phone play as the main control constraint.

### Mobile

Current controls include:

- dynamic camera-relative virtual joystick in the lower-left drive zone
- two-finger horizontal swipe over the world to rotate the drive camera in 90° steps
- pinch over the world or use the + / − buttons to zoom in driving and construction views
- jump button
- contextual primary tool action
- secondary action such as cycling seed
- cycle-vehicle button
- build button
- clean-screenshot action in the pause menu; tap anywhere to restore the HUD
- nearby building/cargo interaction popups
- cattle-barn Feed bale and Load milk actions

Dragging the virtual stick inside its drive zone points the vehicle in the corresponding screen-relative direction. A quick tap does not start driving and can select visible island land beneath the stick. Empty space between action buttons passes taps to the world.

### Desktop Fallback

Current keyboard controls include:

- WASD / arrow keys — drive
- Space — jump
- E — raise/lower or activate the relevant tool
- V — cycle vehicles
- F — cycle seed with the seeder
- + / − or mouse wheel over the world — zoom
- [ / ] — rotate the drive camera in 90° steps
- B — build mode
- H — hide the HUD for screenshots; H or Escape restores it
- Escape — leave special camera modes or open the menu
- 1–8 — rear-equipment selection in the workshop

### Camera

The normal gameplay camera is a smooth high-angle follow camera that keeps the active vehicle framed. It has four 90° orientations relative to the default angle, joined by a short eased rotation, and driving remains camera-relative throughout the turn.

Both driving and construction support smooth, bounded distance zoom, from close-up detail to a broad overview, with independent zoom levels for each view. Pinching takes precedence over swipe rotation once the fingers move apart or together.

Construction mode switches to an elevated pannable overview camera.

The pause menu's Debug section includes a time-of-day slider. It previews the complete environment while paused, saves the selected phase and resumes the normal cycle when play continues.

The camera should preserve the miniature-diorama feeling while keeping vehicle control readable on a phone screen.

---

## 18. UI Direction

The UI should remain modern, compact and visually integrated with the world.

Current implementation follows these principles through:

- phone safe-area support
- a dynamic touch joystick rather than a large permanent control frame
- round action buttons
- compact crop icons and inventory readouts
- contextual silo, cattle-barn and cargo popups
- a contextual village crop grid
- live 3D vehicle/equipment previews in the workshop
- temporary labels for actions such as seed cycling
- input-aware desktop control hints

Large decorative panels should be avoided where possible.

Important actions should generally use recognizable iconography with text where the action would otherwise be ambiguous.

Settlement progression should remain unusually transparent for a farming/city-adjacent system: show exact product requirements, permanent completion and the 3-of-4 rule rather than expecting the player to infer advancement from house states or hidden satisfaction.

The game should avoid the visual language of free-to-play mobile farming games: excessive currencies, reward badges, storefront-like screens and decorative progression clutter.

The world should remain visually dominant.

---

## 19. Art Direction

Farmipelago uses a playful miniature voxel style.

The terrain is chunky and simplified, while vehicles and props use smaller voxels and greater detail.

Current visual language includes:

- a consistent small-model construction grid of five voxels across one terrain tile, beginning with the starter workshop
- stepped rooflines, structural thickness, openings and details that read as assembled voxel forms rather than smooth low-poly slabs
- muted grass, dirt and stone layers
- softly lit terrain and gentle fog
- a time-varying flat-color backdrop with sun/moon-driven global lighting, animated celestial shadows, warm bright twilight and darker readable blue moonlight
- a hanging warm lantern above the permanent starter workshop entrance, lit from late afternoon until after sunrise
- a warm hanging voxel lantern above the Settlement Storehouse receiving bay matching the workshop
- matching warm voxel lanterns on the ends of broad, railed wooden bridges, using the same late-afternoon-through-sunrise emissive treatment and precomputed local surface lighting; only the global celestial rig and vehicle headlights use dynamic lighting
- deep pointed floating-island undersides
- colorful toy-like farm vehicles
- a blue hero tractor with glazed cab, lamps and beacon
- squash-and-stretch on vehicle jumps and crop growth
- animated trees and vegetation
- compact voxel-built settlement homes and a storehouse with stepped roofs, constructed openings and warm doorway lighting
- sparse environment-driven prop clusters across both elevations, with off-grid placement and subtle rotation, mirroring and scale variation
- outlet-anchored segmented waterfalls with backward-trailing foam and solid voxel spray, flat landing splashes matched to the day/night base-water palette, and environmental motion
- guided crop and milk transfer swarms made from small color-matched cuboids, coordinated with animated machinery, responsive storage objects and delivery crates

The overall feeling should be:

- colorful
- tactile
- readable
- playful
- slightly toy-like

It should not look like a realistic simulator, but farming machinery and agricultural processes should remain recognizable.

### Building Voxel Construction Standard

The starter workshop establishes the mandatory visual construction language for every new or rebuilt building.

- Use the shared small-model grid of **five construction voxels across one terrain tile**. Building dimensions, offsets, thicknesses and details must resolve to integer spans on that local grid.
- Author the building as occupied voxel cells or rectangular runs of repeated cells. Runs may be merged or instanced by material for performance, but the resulting form must retain a voxel-built silhouette.
- Walls must have visible voxel-scale thickness. Corners, wall ends, foundations and structural transitions should be resolved with posts, courses, offsets or stepped layers instead of reading as intersecting wall-sized slabs.
- Openings must be constructed into the wall layout. Doors and windows need voxel-sized jambs, lintels and sills, with panes, shutters or door leaves visibly recessed from the wall face.
- Roof pitch must be expressed with stepped courses, stepped gables and a voxel-scale ridge or edge treatment. Do not use a single rotated box or smooth sloped prism as a roof plane.
- Beams, posts, trim, vents, lamps, gutters, ladders and similar details must use the same construction grid. Avoid arbitrary thin strips, smooth curves and decorative polygons that do not belong to the voxel assembly.
- Large clean surfaces are allowed when they represent contiguous repeated cells, but their boundaries, openings, depth changes and attached details must make the smaller construction scale legible in silhouette.
- Communicate the grid through geometry rather than visible grid lines, checkerboards or cube textures. Continue using flat, simple materials from the existing Farmipelago palette.
- Keep visual and gameplay geometry separate. A richer stepped model must not change its footprint, collider, entrance position, interaction point or camera framing unless the gameplay design explicitly calls for that change.

A building passes the visual test when, beside the terrain, the terrain reads as large world blocks while the building clearly reads as a model assembled from many smaller voxels rather than as a few generic low-poly primitives.

---

## 20. Persistence and Free Play

The game automatically saves to browser-local storage. The two-island direction
starts a fresh schema-0 lineage under `farmipelago.gameState.v2`. Older saves
under `farmipelago.gameState` are ignored and left untouched for rollback or
manual recovery rather than migrated into the new topology.

Schema 0 records the Farm and bridge coherently as either `approaching` or
`attached`, while Settlement is always attached. Reloading during the opening
replays the deterministic cinematic from its establishing shot, with input and
HUD suppression restored but without discarding the rest of the valid save.
Once attachment completes, the status is saved and later reloads begin with the
fixed connected pair and normal drive camera rather than replaying the intro.

The current save includes:

- world seed
- current time-of-day phase
- generated world tiles
- field and crop state, including fractional stage progress
- placed buildings and silo contents
- cattle pens, individual cow movement/growth state, shared hay, milk and birth progress
- active settlement tier, permanent requirement histories for each tier, retained earned capabilities and separate Debug unlock overrides
- vehicle positions
- vehicle loadouts
- vehicle storage
- active vehicle
- relevant UI state, including the default-on Fast growth Debug preference

Progression saves `kind: settlement`, the active `tier`, a `tiers` map containing each tier’s `requirements` (`delivered` and `complete`), and separate `earnedGates` / `overrideGates`. The outer schema remains 0. Previous flat Tier 1 requirement saves migrate into tier history, and already-completed Tier 1 saves immediately open Tier 2 on load. Older village stock or recorded deliveries become Tier 1 progress capped at its targets; legacy milestone capability unlocks are retained. Earned gates survive regardless of remaining stock. Debug overrides alone never advance tiers or become earned gates; opening a tier independently earns its specified gates and clears only their now-redundant overrides. Tier eligibility for specialist islands is derived from opened tier definitions. Old consumed deliveries cannot be reconstructed because the reserve prototype did not save their history. Saved completed requirements restore at their target even if their amount is lower. No offline growth or production occurs.

Refreshing the page restores the same farm rather than generating a new level.

The pause menu includes a confirmed restart option that deletes the save and generates a new Farmipelago.

Progression objectives should never prevent players from simply enjoying their farm.

There is no deadline for deliveries and no penalty for taking a long time. Free farming remains available at all times, including after the final settlement tier is completed.

Progression provides direction rather than pressure.

---

## 21. Failure and Recovery

Farmipelago is not currently built around punishing failure.

Vehicles can fall from islands, but the game automatically rescues them so navigation mistakes do not destroy the persistent farm or create a large recovery burden.

There is currently no macro-level failure state.

---

## 22. Non-Goals

Farmipelago is not intended to become:

- a realistic Farming Simulator replacement
- a Stardew Valley-style social RPG
- a city-building game
- a heavily financial business-management simulator
- a sequence of independent puzzle levels
- a decoration-focused mobile farming game
- an automation game where machinery eventually removes the player from farming

Automation may eventually support the player, but personally operating agricultural machinery should remain important.

---

## 23. Current Prototype Scope

The playable prototype currently proves the following major systems together:

- persistent procedurally generated Farm Island + Settlement Island pair
- persistent visual day/night cycle with a Debug time scrubber
- persistent, slowly turning world travel with wrapped cloud/surface parallax, terrain-aware airflow, scheduled island encounters and shared collision avoidance
- a deterministic periodic green/blue/brown planetary surface far below the clouds, with cliffs and tiny trees scrolling from shared accumulated displacement
- vehicle driving and jumping
- tractor attachments
- ploughing and seeding
- crop growth and randomized per-tile crop yield
- combine harvesting
- crop storage in litres
- persistent placeable silos
- trailer-based transport
- cattle barns, draft-editable permanently confirmed custom pens and persistent herds
- compact settlement with storehouse receiving on the smaller northern island
- explicit per-island farming and construction capabilities
- hay-fed milk production with grazing fallback
- Water / Milk Tank transport
- storehouse deliveries
- permanent settlement tiers: any three of four starter crops opens Tier 2 with guaranteed grass/hay access and unavailable delivery placeholders
- multiple persistent vehicles
- loadout workshop
- construction overview mode
- automatic local saving and restoration

This prototype should be treated as the foundation for expansion rather than as a disposable technical test.

---

## 24. Major Open Questions

### How should the five-tier proposal be tuned?

The current direction is permanent 3-of-4 settlement requirements, predictable essential equipment/crop access, random specialist islands and one-shot opportunities as fallback routes. Exact products, quantities, tier timing and unlock presentation still require playtesting.

### What should optional milestones unlock?

The relationship between breadth-of-farm achievements and concrete convenience/mastery rewards needs concrete content even though their role is now distinct from core progression.

### Which livestock system should follow cattle?

Cattle establish the compact barn, custom-pen, shared-feed, growth and product-logistics model. Future species should add distinct land or machinery decisions without duplicating management complexity.

### How large should the final Farmipelago be?

The amount of persistent usable land strongly affects the pressure around crop allocation and future livestock space.

### How much terrain modification should be allowed?

Current farming changes surface state but does not fundamentally reshape the generated islands. Future terrain modification must not erase the importance of generated geography.

### What is the fiction behind the wider drifting community?

The settlement receives farm deliveries through its storehouse, while small passing farms and opportunities can exchange goods. The identity of these other travellers and the broader world remain open.

### How should guaranteed equipment arrive physically?

Essential equipment should be predictable when a tier opens, but the presentation still needs to be decided: workshop access, settlement delivery, visiting supply ship or another physical event.

---

## 25. Design Test

When considering a new feature, ask:

**Does it make the Farmipelago more interesting to use?**

**Does it create a meaningful farming decision?**

**Does it give machinery a useful role?**

**Does it introduce a new possibility rather than only a bigger number?**

**Does the result remain visible and understandable in the physical world?**

Features that consistently fail these tests probably do not belong in the core game.
