# Farmipelago — Game Design Document

**Status:** Playable prototype / living design document  
**Updated from implementation:** 2026-09-02

## 1. Game Concept

Farmipelago is a small, playful farming game set on a persistent procedurally generated voxel archipelago.

The player directly operates tractors, harvesters, tools and transport equipment. The challenge comes from making effective use of irregular islands with different heights, shapes and growing conditions.

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

Island shape, elevation, usable flat areas, access routes, moisture and sunlight influence where different activities make sense.

The player should regularly have to think:

**How should I use this part of my farm?**

### Persistent Farm

The player keeps developing the same generated Farmipelago.

The game is not structured around completing disposable farming levels. The farm accumulates history through ploughed fields, planted crops, placed silos, stored produce, vehicle locations and completed progression milestones.

### Progression Adds Possibilities

Progression should primarily introduce new ways to farm rather than simply increasing numerical efficiency.

The current prototype unlocks new crops through deliveries. Future progression can add animals, machinery, infrastructure and additional agricultural systems.

### Compact and Playful

Farmipelago should feel approachable and toy-like rather than like a detailed agricultural simulation.

Systems can have meaningful consequences without requiring realistic complexity.

---

## 4. Current Core Loop

The implemented crop-farming loop is:

**Inspect land → plough → choose seed → plant → grow → harvest with combine → unload into silo → load trailer → transport to cargo hub → deliver milestone cargo → unlock new crops → repeat**

The first implemented livestock extension adds:

**Grow grass → mow → bale hay → carry a bale to a Cattle Barn → feed cattle → produce milk → load a Water / Milk Tank → deliver milk at the cargo hub**

The player can also ignore the current milestone and continue farming freely.

Moment-to-moment play revolves around driving and operating machinery.

Long-term play revolves around making the persistent Farmipelago capable of producing increasingly varied agricultural outputs.

---

## 5. Main Progression

Farmipelago uses milestone progression inspired by games such as Shapez rather than a conventional money-first farming economy.

The outside world requests specific agricultural deliveries. Completing them advances progression and unlocks new capabilities.

### Current Prototype Progression

The farm starts with **Wheat** unlocked.

**Getting started**

- Deliver 3,600 L Wheat.
- Unlock Barley, Canola and Soybeans.

**Crop diversity**

- Choose any two crops from Wheat, Barley, Canola and Soybeans.
- Deliver 3,600 L of each chosen crop.
- Unlock Corn.

Once two crops have been committed to the Crop diversity milestone, only those two remain relevant to its tracker and cargo-pad requirements.

**Livestock preparation**

- Deliver 4 physical hay bales.
- Unlock the Cattle Barn and livestock equipment.

**First milk**

- Deliver 3,600 L Milk.

Completing a non-final milestone triggers the cargo VTOL pickup and reveals newly unlocked capabilities. Completing First milk produces a Farmipelago-complete state and then returns the player to free farming.

There is no time limit on milestones and no macro-level failure state.

The current four milestones are prototype content, not the intended final progression length.

### Long-Term Direction

Later milestones should introduce increasingly broad production requirements and eventually combine different farming systems, for example crops plus livestock products.

Progression should continue to unlock possibilities rather than becoming a sequence of increasingly expensive vehicle upgrades.

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
- successfully grow crops across very different environmental conditions

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

Main progression should primarily be driven by increasingly complex production deliveries. Optional progression should primarily reward breadth, experimentation and development of the Farmipelago.

---

## 8. The Farmipelago

The world consists of multiple voxel islands generated from a persistent seed.

The current generator provides:

- a two-island starter area
- a level starter farmyard with a walk-in 3×3 barn
- a separate cargo-hub island connected by bridge
- additional larger lobed islands with stepped elevations
- broad clear farming plots on generated islands
- bridges across larger gaps
- lakes, animated rivers and waterfalls
- grass, dirt and stone terrain layers with deep pointed undersides
- generated trees, rocks and grass tufts

Vehicles can jump, so elevation and gaps are part of navigation without requiring ramps.

Generated props can fade when they block the camera's view of the active vehicle.

The Farmipelago persists across browser sessions, including its generated tiles and seed.

---

## 9. Growing Conditions

Each farmable location has environmental values for:

**Dry ↔ Wet / moisture**

**Shady ↔ Sunny / sunlight**

These values are procedurally generated and visibly affect the world. Damp/cool areas tend to gather trees, while bright/dry areas are rockier and more open. Grass color also varies with the environmental fields.

The player can enter a **crop suitability mode** for any unlocked or inspectable crop. This switches to an elevated map-style camera that can be panned across the Farmipelago.

Suitability is calculated from how close local moisture and sunlight are to that crop's preferred values.

Suitability currently affects both:

- growth speed
- harvest yield

Growth ranges from roughly **70% to 100%** of normal speed according to suitability.

Yield ranges from roughly **50% to 100%** of the crop's maximum tile yield according to suitability.

The current implementation intentionally keeps poor land usable rather than making unsuitable locations completely invalid.

---

## 10. Crops

The current prototype contains five crops:

- Wheat
- Barley
- Canola
- Soybeans
- Corn

They occupy different points in the moisture/sunlight space:

- Wheat prefers relatively dry, very sunny land.
- Barley prefers dry, moderately sunny land.
- Canola prefers wetter, moderately sunny land.
- Soybeans prefer wet and sunny land.
- Corn prefers moderate moisture and high sunlight.

The player selects seed while using the seeder. Only crops unlocked by progression should be available for normal progression play.

Planted crops visibly sprout and grow. Harvest-ready crops pulse in synchronized world time.

Each ready crop tile currently yields approximately **50–200 L**, scaled by suitability.

This system is intended to create competition for the best land and encourage the player to reconsider how existing fields are allocated as new crops unlock.

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

---

## 12. Livestock

Cattle are the first implemented livestock system and connect directly to the existing physical hay and vehicle-logistics loops.

After Livestock preparation, the player can place a Cattle Barn on clear level terrain. Before committing it, the player may reposition the barn and choose **Draw pen**. The barn doorway lights brightly and a broad three-tile ground gate extends in front of it; the player roughly circles those tiles and the pasture they want with one continuous gesture. The lasso closes automatically, trims unusable edge land, keeps the continuous area connected to the gate, and resolves to an editable, grid-snapped orthogonal fence. Fixed connector sections begin at the midpoint of the barn's left and right walls, so the barn itself closes the pasture entrance. Fence generation and editing reject segments that pass through the barn or another building. Every four valid pasture tiles provide one hard capacity slot. An Undo action abandons the provisional pen and returns to movable barn placement; final Confirm permanently commits both barn and pen.

Final barn confirmation grants two adult cows. A provisional pen never starts livestock simulation. Once confirmed, cows are individual persistent animals that wander between neighboring valid pen tiles and cannot leave or transfer to another barn. With at least two adults, available capacity and stored hay, a herd-level birth timer creates a calf. Calves are visibly smaller, count against capacity and mature automatically. All adults produce milk; the prototype deliberately omits pregnancy state, sex, disease, health, old age, natural death, slaughter, selling, manure, purchasing and animal transport.

Existing physical 3,600 L hay bales are deposited at the barn and converted to shared herd feed. Hay supports full milk production and automatic herd growth. Without hay, cattle continue grazing without depleting terrain and produce at 20% of the fed rate; herd growth pauses and cattle never starve or die.

Milk accumulates in the barn up to 10,000 L. The tractor's livestock-gated 6,000 L Water / Milk Tank loads milk from a nearby barn in rapid 10 L steps and carries it to the cargo hub for the First milk milestone.

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

The player can cycle between owned vehicles. Vehicle switching briefly pauses driving and uses a lift-and-glide camera handoff to the next vehicle.

### Barn Workshop

The barn functions as the loadout workshop.

The player drives into it and receives a live 3D preview of the active vehicle and compatible equipment. The UI distinguishes unavailable slots for vehicles such as the combine.

Long-term equipment design should preserve meaningful tradeoffs. Larger or more capable vehicles should not automatically invalidate smaller machinery if terrain, maneuverability or specialization can keep both useful.

---

## 14. Storage and Logistics

Crop volume is represented physically in litres and moves between actual inventories.

The crop logistics chain is:

**Combine → silo → Grain Trailer → cargo hub**

The cattle logistics chain is:

**Hay bale → Cattle Barn → stored milk → Water / Milk Tank → cargo hub**

Transfers occur in rapid 10 L steps and are reflected in vehicle/building inventories rather than functioning as abstract menu submissions.

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

The player-placeable buildings are the **grain silo** and progression-gated **Cattle Barn**.

Buildings are designed freely before commitment, but become permanent once confirmed. A pulsing lime edge outline visually distinguishes every unconfirmed building from the normal treatment used by completed structures; confirmation removes that outline permanently. Placed drafts use a deliberate hold-and-drag gesture for repositioning so a quick tap remains available for selection. A Grain Silo remains movable until its contextual Confirm action is used, and it cannot store or transfer crops before that confirmation.

Cattle Barn construction has two stages. The player first positions the movable barn draft and chooses **Draw pen**. The barn then stays fixed while the player lassos the desired pasture, edits the generated fence through snapped corner and segment dragging, or uses **Repaint border** to create a new candidate. Repainting does not destroy the existing provisional pen unless the new lasso is valid. An Undo action removes the entire provisional pen and returns to movable barn placement. Final Confirm commits both barn and pen permanently, removes all editing controls, grants the two starter cows and enables normal livestock interactions and simulation.

Permanent commitment makes scarce clear, level land and future farm layout part of the Farmipelago puzzle, while the draft phases let the player experiment before making an irreversible choice. Leaving construction mode is an explicit cancellation boundary: every unconfirmed silo or barn, including provisional pen geometry, is removed. A refresh while construction mode is still active preserves the current draft phase without confirming it.

The permanent starter structures are:

- barn / vehicle workshop
- cargo hub and landing pad

Future buildings may support:

- livestock
- specialized crop handling
- additional storage
- equipment
- new progression systems

The design should continue to require buildings to have clear gameplay functions rather than adding structures purely because farming games conventionally contain them.

---

## 16. Cargo Hub and Deliveries

The current progression receiver is a **cargo hub** permanently attached to the second starter island.

It contains:

- a marked VTOL landing deck
- staged delivery crates
- a nearby cargo interaction popup
- visible milestone requirements and Deliver controls

The player transports crops or milk to the hub and transfers eligible cargo into the current milestone. Physical hay bales remain a separate one-object delivery path. Staged cargo visually changes between crop crates, hay bales and milk cans according to the active milestone.

When a milestone is completed, a chunky four-fan cargo VTOL rapidly approaches the landing deck. Staged cargo is collected and the aircraft departs, creating a physical payoff for progression rather than resolving it only through menus.

The cargo hub provides the current in-world connection to the outside world. The wider fiction behind who is requesting or receiving the products remains intentionally open.

---

## 17. Controls and Camera

Primary platform target is mobile, with portrait-oriented phone play as the main control constraint.

### Mobile

Current controls include:

- dynamic camera-relative virtual joystick in the lower-left drive zone
- jump button
- contextual primary tool action
- secondary action such as cycling seed
- cycle-vehicle button
- suitability button
- build button
- nearby building/cargo interaction popups
- cattle-barn Feed bale and Load milk actions

The virtual stick can begin anywhere inside its drive zone and points the vehicle in the corresponding screen-relative direction.

### Desktop Fallback

Current keyboard controls include:

- WASD / arrow keys — drive
- Space — jump
- E — raise/lower or activate the relevant tool
- V — cycle vehicles
- F — cycle seed with the seeder
- B — build mode
- Escape — leave special camera modes or open the menu
- 1–8 — rear-equipment selection in the barn workshop

### Camera

The normal gameplay camera is a smooth high-angle follow camera that keeps the active vehicle framed.

Suitability and construction modes switch to elevated pannable overview cameras.

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
- an integrated milestone tracker
- live 3D vehicle/equipment previews in the barn
- temporary labels for actions such as seed cycling
- input-aware desktop control hints

Large decorative panels should be avoided where possible.

Important actions should generally use recognizable iconography with text where the action would otherwise be ambiguous.

The game should avoid the visual language of free-to-play mobile farming games: excessive currencies, reward badges, storefront-like screens and decorative progression clutter.

The world should remain visually dominant.

---

## 19. Art Direction

Farmipelago uses a playful miniature voxel style.

The terrain is chunky and simplified, while vehicles and props use smaller voxels and greater detail.

Current visual language includes:

- muted grass, dirt and stone layers
- softly lit terrain and gentle fog
- deep pointed floating-island undersides
- colorful toy-like farm vehicles
- a blue hero tractor with glazed cab, lamps and beacon
- squash-and-stretch on vehicle jumps and crop growth
- animated trees and vegetation
- waterfalls and environmental motion
- physical crop unloading streams and delivery crates

The overall feeling should be:

- colorful
- tactile
- readable
- playful
- slightly toy-like

It should not look like a realistic simulator, but farming machinery and agricultural processes should remain recognizable.

---

## 20. Persistence and Free Play

The game automatically saves to browser-local storage.

The current save includes:

- world seed
- generated world tiles
- field and crop state
- placed buildings and silo contents
- cattle pens, individual cow movement/growth state, shared hay, milk and birth progress
- progression state and delivered amounts
- vehicle positions
- vehicle loadouts
- vehicle storage
- active vehicle
- relevant UI state

Refreshing the page restores the same farm rather than generating a new level.

The pause menu includes a confirmed restart option that deletes the save and generates a new Farmipelago.

Progression objectives should never prevent players from simply enjoying their farm.

There is no deadline for deliveries and no penalty for taking a long time. After completing all currently available milestones, the player returns to unrestricted free farming.

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

- persistent procedurally generated archipelago
- vehicle driving and jumping
- tractor attachments
- ploughing and seeding
- crop growth, suitability and yield
- combine harvesting
- crop storage in litres
- persistent placeable silos
- trailer-based transport
- cattle barns, draft-editable permanently confirmed custom pens and persistent herds
- hay-fed milk production with grazing fallback
- Water / Milk Tank transport and milk delivery
- cargo-hub deliveries
- crop-unlock milestone progression
- multiple persistent vehicles
- barn loadout workshop
- suitability and construction overview modes
- automatic local saving and restoration

This prototype should be treated as the foundation for expansion rather than as a disposable technical test.

---

## 24. Major Open Questions

### What comes after First milk?

The current four milestones prove crop, hay and cattle progression, but the longer sequence introducing additional products and agricultural systems still needs to be designed.

### What should optional milestones unlock?

The relationship between breadth-of-farm achievements and concrete capability rewards remains unresolved.

### Which livestock system should follow cattle?

Cattle establish the compact barn, custom-pen, shared-feed, growth and product-logistics model. Future species should add distinct land or machinery decisions without duplicating management complexity.

### How large should the final Farmipelago be?

The amount of persistent usable land strongly affects the pressure around crop allocation and future livestock space.

### How much terrain modification should be allowed?

Current farming changes surface state but does not fundamentally reshape the generated islands. Future terrain modification must not erase the importance of generated geography.

### What is the fiction behind the cargo network?

The cargo hub and VTOL establish the mechanic, but the organization requesting deliveries and the broader setting remain open.

### How should vehicles and tools unlock?

Crop gates are implemented. The game still needs a coherent way to introduce future tractors, livestock machinery and specialized equipment without falling back into a simple money ladder.

---

## 25. Design Test

When considering a new feature, ask:

**Does it make the Farmipelago more interesting to use?**

**Does it create a meaningful farming decision?**

**Does it give machinery a useful role?**

**Does it introduce a new possibility rather than only a bigger number?**

**Does the result remain visible and understandable in the physical world?**

Features that consistently fail these tests probably do not belong in the core game.
