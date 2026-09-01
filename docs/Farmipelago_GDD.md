# Farmipelago — Game Design Document

**Status:** Early design / living document

## 1. Game Concept

Farmipelago is a small, playful farming game set on a persistent procedurally generated voxel archipelago.

The player operates tractors, tools and other farming machinery directly. The challenge comes from making effective use of irregular islands with different heights, shapes and growing conditions.

Rather than building a perfectly rectangular farm, the player gradually learns how to make the best use of the Farmipelago they were given.

The same Farmipelago remains throughout the game. Fields, cleared vegetation, infrastructure and other changes persist as the farm develops.

---

## 2. Player Fantasy

The player should feel like they are gradually turning a strange little collection of islands into a capable farming operation.

The satisfaction should come from:

- physically operating farming machinery
- transforming the landscape through farming
- discovering good uses for different parts of the islands
- deciding how limited land should be used
- unlocking new forms of agriculture
- reorganizing the farm as its capabilities expand

The game should retain some of the appeal of Farming Simulator while being dramatically smaller, faster and more playful.

---

## 3. Core Design Pillars

### Farming Through Machines

Most important farming actions are performed physically using vehicles and attachments.

The player drives the tractor, equips the correct tool and performs the work rather than managing fields primarily through menus.

### The Land Matters

The generated Farmipelago is not just scenery.

Island shape, elevation, available space and local growing conditions influence where different activities make sense.

The player should regularly have to think:

**How should I use this part of my farm?**

### Persistent Farm

The player keeps developing the same Farmipelago.

The game is not structured around completing disposable farming levels.

The farm should accumulate history and become increasingly personalized through the player's decisions.

### Progression Adds Possibilities

Progression should primarily introduce new ways to farm rather than simply increasing numerical efficiency.

New crops, animals, machinery and infrastructure should create new decisions and new demands on the existing farm.

### Compact and Playful

Farmipelago should feel approachable and toy-like rather than like a detailed agricultural simulation.

Systems can have meaningful consequences without requiring realistic complexity.

---

## 4. Core Loop

At the most basic level:

**Prepare land → plant → grow → harvest → deliver produce → unlock new possibilities → adapt the farm → repeat**

Moment-to-moment play revolves around operating machinery.

Long-term play revolves around making the Farmipelago capable of producing increasingly varied agricultural products.

---

## 5. Main Progression

Farmipelago uses a progression structure inspired by games such as Shapez.

There is no requirement to constantly sell produce for money in order to buy increasingly expensive equipment.

Instead, the outside world requests specific agricultural deliveries.

Completing these deliveries advances the main progression.

Early requirements may involve simple crops.

Later requirements can combine several crops and eventually products from entirely new farming systems such as livestock.

For example:

**Wheat**

then

**Wheat + potatoes**

then

**several different crops**

then eventually

**crops + milk**

For the current prototype, the farm starts with Wheat only. **Getting started** requires 3,600 L of Wheat and unlocks Barley, Canola, and Soybeans. It is followed by **Crop diversity**, where the player chooses two of Wheat, Barley, Canola, and Soybeans and delivers 3,600 L of each; completing it unlocks Corn, Grass seed, and the hay-equipment set. Corn currently uses the existing seeder, while its specialized equipment remains future work. These objectives exercise the complete harvest, transport, delivery and pickup loop while establishing the intended shift from a simple crop delivery to a varied requirement.

There is no time limit on these objectives and no macro-level failure state.

A player can ignore the next objective and continue farming freely for as long as they want.

---

## 6. Optional Progression

Optional progression should reward the player for developing the Farmipelago in broader and more interesting ways rather than simply asking for additional deliveries.

These milestones should encourage experimentation, expansion and diversification.

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
- develop enough grazing or feeding capacity for larger herds

### Machinery

- use several different vehicle types
- make use of specialized attachments
- operate machinery suited to different types of terrain or farming

### Logistics and Infrastructure

- connect or make productive use of distant islands
- transport produce between different parts of the Farmipelago
- build and use systems such as irrigation, storage or animal infrastructure

Optional milestones should unlock useful capabilities, conveniences or specialized equipment.

They should preferably introduce new options rather than only grant percentage-based stat increases.

Optional progression should feel like recognition that the player has broadened and improved the farm, while main progression measures whether the farm can produce the increasingly complex outputs required to advance.

---

## 7. Progression Philosophy

Progression should expand the player's **capabilities**.

The game may eventually contain several overlapping areas of farming:

**Crop farming**  
Ploughing, planting, harvesting and crop-specific machinery.

**Livestock**  
Animals, feeding, grazing, animal products and livestock-related vehicles.

**Logistics**  
Transporting crops, feed, equipment and other resources around the Farmipelago.

**Land improvement**  
Irrigation, fencing, access between islands and potentially other ways of adapting difficult terrain.

These do not need to form a large visible skill tree.

The important principle is that progression must support multiple forms of agriculture rather than becoming a linear chain of increasingly powerful tractors.

Main progression should primarily be driven by increasingly complex production deliveries.

Optional progression should primarily be driven by milestones that reward breadth, experimentation and development of the Farmipelago.

---

## 8. The Farmipelago

The world consists of multiple connected or closely positioned voxel islands.

The broad terrain and water layout are procedurally generated.

The large starting island sits roughly at the center of the generated archipelago and acts as the farm's initial operations hub. The barn, cargo pad, starting vehicles and first useful farming space are all located there. A direct bridge reaches a second nearby large island that provides substantial early farming room while retaining more varied elevation.

Additional islands surround this central area in deliberately mixed sizes and elevations. Their controlled connection graph lets the farm expand outward without making every island an identical spoke from the hub, while the islands' outlines, surfaces, water and decoration remain procedurally organic.

Islands can contain several elevations. Vehicles can jump between appropriate height differences, making vertical terrain part of navigation.

Terrain uses relatively large blocks.

Vehicles, trees, rocks and other objects use smaller voxels, allowing them to contain more visual detail than the landscape.

The Farmipelago persists for the entire game.

---

## 9. Growing Conditions

Different locations have environmental properties generated using overlapping noise fields.

Current planned axes are:

**Dry ↔ Wet**

**Sunny ↔ Shady**

Different crops can prefer different combinations, but crop suitability is not the only reason these environmental fields matter.

Crop suitability influences:

- growth rate
- harvest yield

An overlay allows the player to inspect crop suitability across the Farmipelago.

Moisture and sunlight also generate immediately visible environmental character through ground color, tree and rock density, tree silhouettes, and lightweight vegetation. Their continuous overlap can produce dense forest or rainforest, normal woodland, open green grassland, lush meadow or wetland, muted dry woodland, and yellow rocky plains without requiring hard named-biome boundaries.

A single island can cross several characters where the noise fields change. Coherent patches should remain recognizable from a distance, making islands feel visually distinct and changing how open, wooded, rocky or naturally obstructed their usable land is.

Choosing which island to develop next should therefore consider access, usable area, elevation and natural obstruction as well as agricultural conditions. The central hub and second large starter island retain the full visual variation but suppress extreme blocking-tree density so both remain practical early farming spaces.

The goal is strong, gradual environmental variation rather than sharply separated named biomes. This visual and land-use direction does not itself introduce new crop-yield or growth rules.

---

## 10. Crops

Different crops should have different environmental preferences.

This creates competition for suitable land and gives different parts of the Farmipelago different agricultural value.

As progression introduces additional crops, the player should sometimes need to reconsider how existing land is being used.

The crop system should remain readable enough that the player can understand why a crop performs well or poorly.

Each cultivated tile represents a compact farm plot and yields 50–200 L at harvest, depending on suitability. The prototype combine stores 3,600 L, and crop storage and deliveries are displayed in liters. Harvesting and all silo/cargo transfers update the real inventory in rapid 10 L steps, so a displayed amount never completes ahead of the physical transfer.

Exact crop lists and growth times are not yet defined.

### Grass and Hay

Grass is a perennial seeded crop planted on prepared soil with the existing seeder. It does not develop weeds. Once mature, it is cut with a front or rear mower and automatically regrows without reseeding.

The hay-production machinery forms a compact physical sequence:

**mow grass → bale the loose cut grass**

The front mower covers a centered strip, while the side-mounted rear mower expands the cutting width. The baler picks loose grass up directly across its intake. A front mower and rear baler can work together so grass is cut ahead of the tractor and collected behind it in one pass.

Grass suitability determines a tile's 50–200 L cutting yield, and the baler conserves that volume as it gathers loose grass. It emits one rectangular bale for every 3,600 L processed. Bales remain visible and persistent in the Farmipelago. Bale handling, storage, delivery, and use as livestock feed remain future work.

---

## 11. Livestock

Livestock is intended as a future major farming system.

Animals could produce resources such as:

- milk
- eggs
- wool
- other agricultural products

Livestock should create new uses for land rather than simply behaving as another passive production building.

Possible requirements include grazing areas, feed production, shelters and fenced spaces.

Livestock should also introduce new machinery and logistics requirements.

The exact animal and building systems remain unresolved.

---

## 12. Vehicles and Equipment

Vehicles are central to interaction and exist persistently as physical objects in the Farmipelago.

The player owns a fleet and cycles control directly between its vehicles. Parked vehicles remain where they were left, keep their individual loadouts and storage, and continue to occupy physical space in the world.

The current planned vehicle concept separates:

- owned vehicle instance
- rear attachment
- front attachment

Different vehicles and attachments should have meaningful tradeoffs.

A larger tractor should not automatically replace a smaller tractor in every situation.

Island size, maneuverability, terrain and the job being performed should influence equipment choice.

The barn is the primary location for configuring the currently controlled vehicle's compatible equipment. It does not select, spawn or relocate the vehicle being used.

Grass seed and the front mower, rear mower, and baler unlock together after the current Crop diversity objective. Grass seed and the hay-equipment set remain separate capability gates so development overrides can test planting and machinery independently.

---

## 13. Buildings

Buildings should have clear gameplay functions.

The game should avoid filling the Farmipelago with buildings simply for decoration or because farming games conventionally contain them.

The barn currently has a clear role as the workshop where a vehicle's individual attachment loadout is changed.

Future buildings may support:

- livestock
- storage
- crop handling
- equipment
- progression deliveries
- other agricultural systems

How buildings are placed and how much physical space they require remains an open design question.

---

## 14. Deliveries

The Farmipelago's cargo pad connects the physical farm to the main progression system. It is a permanent facility on the edge of the second island, with a receiving area for vehicle drop-offs and a landing deck for visiting cargo craft.

Vehicles with internal storage can transfer only produce requested by the current objective. Produce counts toward progression in 10 L transfer steps at the pad; surplus and unrelated produce remain in the vehicle.

A chunky VTOL cargo craft periodically approaches from outside the Farmipelago, lands for a short collection window, then departs in the direction from which it arrived. When a delivery milestone is completed, the craft is summoned directly to collect the staged cargo; its departure is framed as a brief celebration that clearly shows the newly unlocked farming possibilities. This makes deliveries, shipment and progression visible in the world without introducing a detailed market economy.

The important mechanical function remains:

**The player sends agricultural products away from the Farmipelago in order to fulfill main progression objectives.**

Optional progression should generally come from milestones and farm development rather than additional delivery quotas.

---

## 15. Controls and Camera

Primary platform target is mobile.

The game is designed primarily for portrait orientation.

The camera uses a relatively high fixed angle and should remain mostly stable rather than closely following every movement of the vehicle.

Current basic controls include:

- fixed movement stick on the lower left
- jump button
- a cycle-vehicle action above the movement stick on the left edge
- separate general front-tool and rear-tool actions, allowing compatible attachments to be raised and lowered independently
- context-specific secondary farming controls as required

The controlled machine's active inventory uses one compact HUD treatment regardless of source. The combine tank, grain trailer, and baler chamber share the same litre meter, label, and fill bar rather than introducing equipment-specific inventory panels.

Controls should remain simple despite the increasing number of farming systems.

---

## 16. UI Direction

The UI should be modern, minimal and visually integrated with the game.

Large framed panels should be avoided where possible.

Important actions should generally use:

**icon + short text**

rather than relying entirely on unlabeled icons.

The game should avoid the visual language commonly associated with free-to-play mobile games, including excessive currencies, reward badges and decorative progression screens.

The world should remain visually dominant.

---

## 17. Art Direction

Farmipelago uses a playful voxel style.

The terrain is chunky and simplified.

Vehicles and environmental objects use smaller voxels and therefore have more detail.

The overall feeling should be:

- colorful
- tactile
- readable
- playful
- slightly toy-like

It should not look like a realistic simulator, but it should still communicate recognizable farming machinery and agricultural processes.

---

## 18. Free Play

Progression objectives should never prevent players from simply enjoying their farm.

There should be no deadline for completing the next delivery.

There should be no penalty for taking a long time.

The player can continue farming, reorganizing fields, experimenting with machinery and developing the Farmipelago without advancing the main progression.

Optional milestones should also be rewards for natural play rather than mandatory checklists.

Progression provides direction rather than pressure.

---

## 19. Non-Goals

Farmipelago is not intended to become:

- a realistic Farming Simulator replacement
- a Stardew Valley-style social RPG
- a city-building game
- a heavily financial business-management simulator
- a sequence of independent puzzle levels
- a decoration-focused mobile farming game
- an automation game where machinery eventually removes the player from farming

Automation may support the player, but personally operating agricultural machinery should remain important.

---

## 20. Major Open Questions

### How should the cargo connection expand?

The cargo pad and VTOL establish the physical delivery point. The identity of the outside organization, later cargo handling upgrades and whether other islands gain specialized logistics links remain open.

### What does the main progression sequence look like?

The progression needs to introduce crops, equipment, livestock and other systems at a good pace.

### What do optional milestones unlock?

The relationship between milestone categories and specific rewards still needs to be designed.

### How do buildings work?

Placement, size, construction and interaction are still largely undefined.

### How does livestock work?

Animal movement, grazing, feeding, shelters and machinery all need further design.

### How large is the Farmipelago?

The amount of persistent land strongly affects how much pressure exists around allocating space.

### How much can the player modify the terrain?

This will determine whether generated geography remains an important constraint throughout the game.

---

## 21. Design Test

When considering a new feature, ask:

**Does it make the Farmipelago more interesting to use?**

**Does it create a meaningful farming decision?**

**Does it give machinery a useful role?**

**Does it introduce a new possibility rather than only a bigger number?**

**Does the result remain visible and understandable in the physical world?**

Features that consistently fail these tests probably do not belong in the core game.
