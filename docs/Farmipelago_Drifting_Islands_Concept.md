# Farmipelago — Drifting Islands Concept

**Status:** Early concept / exploration  
**Purpose:** Working document for the drifting-island direction. This does not replace the main GDD yet.  
**Important:** Nothing in this document should be treated as locked design. It records promising directions, tensions, and open questions to continue discussing.

**Latest discussion integrated:** 2026-09-05 — frequent passing islands, tractor boarding/inspection, permanent attachment, visiting ships, preparedness-focused play, and settlement tiers.

---

## 1. Core Idea

Farmipelago takes place on a **farm that is itself drifting through the sky**.

The player begins with a very small connected Farmipelago. The world around it should make it clear that the farm is continuously travelling rather than sitting in a static level.

Over time, other floating islands drift close enough to inspect and potentially connect.

The player decides:

- which islands are worth keeping
- where they should connect
- how they fit into the existing farm
- which opportunities to let drift away

The player gradually assembles a larger farming operation by **catching and connecting pieces of floating land**.

The floating islands should be a gameplay system, not only a visual explanation for disconnected fields.

---

## 2. Central Fantasy

The player does not simply buy fields on a fixed map.

**Land comes to the player.**

A new island appearing through the clouds should feel like an event.

The player can inspect what it offers and decide whether it deserves a permanent place in the Farmipelago.

Over time, the farm becomes a physical record of those decisions.

Different players should be able to end up with very different Farmipelagos because they accepted different islands, infrastructure, crops, livestock and geography.

A useful recurring question is:

**Do I want this island, and where should it become part of my farm?**

---

## 3. Candidate Starting Structure

A promising starting setup is **two already-connected islands**.

### Farm Island

The player's initial agricultural space.

Possible contents:

- starter tractor
- first field
- basic crop storage
- workshop or machinery access
- some open farmland

### Settlement Island

A small travelling community that gives agricultural production a purpose.

Possible contents:

- homes and communal buildings
- central food storage or receiving point
- a visible representation of settlement needs
- inhabitants and ambient activity
- space for the settlement to visibly develop over time

This separation could immediately establish the relationship:

**The farm produces.  
The settlement consumes.**

It also prevents settlement growth from consuming valuable farmland.

The exact starting layout, anchor count, and which facilities belong on each island are not decided.

---

## 4. Making the Farm Feel Like It Is Moving

The connected Farmipelago should visibly feel as though it is travelling through the sky even when the player is standing still.

Possible cues:

- distant clouds moving past at different depths
- a visible horizon or background establishing motion
- wind moving grass, crops, trees and particles
- occasional stronger gusts
- distant islands entering and leaving view
- moving cloud shadows
- ambient wind audio
- subtle vehicle reactions to stronger wind

Wind should primarily reinforce the fantasy.

It should not turn normal driving into an irritating struggle.

---

## 5. Passing Islands

Passing islands should be **common rather than special events**. A current target worth prototyping is roughly one relevant island every **1–3 minutes** of active play. The player should see many more islands than they ever decide to keep.

Most passing islands should be ordinary but still worth glancing at. Truly strong combinations should be uncommon. This creates a rhythm where saying **no** is normal and occasionally seeing a particularly useful island is exciting.

A passing island may differ in:

- size
- shape
- elevation
- growing conditions
- vegetation
- rocks and obstacles
- existing fields
- existing crops
- livestock
- processing buildings
- storage
- portable supplies or equipment
- infrastructure
- available connection points

Some islands may be mostly untouched. Others may contain fragments of existing farms or production infrastructure. A passing island is therefore not merely land. It can be a **bundle of geography, farming possibilities and existing assets**.

Examples:

- a large flat untouched island suitable for machinery
- a small island with established fields
- an island containing a barn and several cows
- an overgrown former farm
- an awkward but useful crop island
- a small bread-focused island containing a windmill, bakery and a few wheat tiles
- an island containing seeds, fertilizer or a portable attachment
- an island containing useful infrastructure but poor farmland

There can also be distant floating islands that are **purely environmental** and never enter boarding range. These make the sky feel populated without every visible island becoming an opportunity the player is expected to chase.

### Boarding and Inspection

The current direction is to keep island inspection physical and inside the vehicle fantasy. The player can **jump the tractor onto a passing island**, drive around briefly, inspect its shape and contents, and then decide whether to keep it.

If the player misses the jump and falls into the void, the tractor can be recovered back to the main / starter farm after a short delay. The passing island continues drifting during recovery and may be lost. The consequence is therefore a missed opportunity rather than a traditional failure state.

Because the Farmipelago can become irregular, boardable islands do not need physically perfect free-form trajectories. Under the hood, a candidate island can be given a drift path that passes close to a suitable exposed edge of the current Farmipelago and creates a fair boarding window. To the player it should simply look like the island naturally drifted close enough to jump onto.

The player should retain camera control. Missing an island because the player was working elsewhere is acceptable because similar opportunities can return later. The game should avoid forced camera transitions for every passing island.

---

## 6. Connecting Islands

The current preference is that **permanent attachment really is permanent**. Once an island is chained into the Farmipelago, it becomes part of that farm's history rather than something the player routinely swaps out later.

Possible attachment flow:

1. A passing island enters a fair boarding window.
2. The player jumps onto it with a vehicle and inspects it.
3. The player chooses whether to let it drift away or permanently keep it.
4. If kept, heavy chains / anchors lock the island into the Farmipelago.
5. A bridge or other vehicle connection becomes usable.

Permanent attachment should have an explicit confirmation and good preview information because the decision matters.

The exact **placement model** remains unresolved. Two directions are still worth prototyping:

- the passing trajectory determines where the island can attach, preserving the sense that the world gives the player geography to live with
- after choosing to keep an island, the game enters a more abstract placement step where the player chooses a valid position

The first direction preserves stronger emergent geography; the second may be easier to control on a small phone screen and may avoid awkward starfish-shaped Farmipelagos.

It is also still unresolved what prevents the player from simply keeping every island. A complex weight / tether-capacity economy currently feels too complicated. **Permanence, logistics, limited useful attachment space, and the sheer frequency of passing islands may already create enough selectivity**, but this needs prototyping.

---

## 7. Islands as Acquisition

Farmipelago currently leans toward having **no money system**.

The drifting-island system could replace much of the traditional farming-game pattern:

**harvest → sell → earn money → buy land / animals / equipment**

Instead, important capabilities can physically arrive as part of the world.

Examples:

- cattle arrive on a livestock island
- a crop arrives already growing in an existing field
- a windmill arrives on one island
- a bakery arrives on another
- a useful attachment or machine may be discovered
- additional farmland becomes available because the player catches it

This makes expansion depend on **opportunity and choice** rather than purchasing power.

Exactly what should come from islands, milestones, settlement development or other systems remains open.

---

## 8. What Harvests Are For

This is currently one of the central design questions.

A farming game needs a reason to repeat the farming loop after the player has already demonstrated that they can grow a crop.

The current exploration points toward three overlapping uses for agricultural output.

### Ongoing Settlement Supply

A settlement or other persistent consumer creates a low continuous demand for food and processed goods.

This gives repeated harvests a baseline purpose.

### Production Chains

Raw agricultural goods can be manually transported through processing infrastructure.

For example:

**Wheat → windmill → flour → bakery → bread → settlement**

The player may physically haul wheat to the windmill and flour to the bakery.

Processing buildings themselves may be discovered on passing islands, making the layout of a production chain depend on the Farmipelago the player assembled.

### Opportunities

Temporary outside requests can ask for specific goods or combinations of goods and offer useful rewards.

These give the player changing short-term reasons to redirect production.

The important question is whether these systems together create enough purpose without turning farming into repetitive maintenance.

---

## 9. Settlement as a Persistent Consumer

A settlement is currently the most promising answer to the question:

**Why does the player keep harvesting after the first successful harvest?**

The settlement would physically exist on the Farmipelago rather than being only an abstract demand screen.

It should remain a **small travelling community**, not become a full city builder.

The player should probably not:

- zone housing
- assign jobs
- manage individual citizens
- build road networks
- optimize happiness statistics
- micromanage population

The settlement exists primarily to:

- give agricultural production a persistent purpose
- consume food and processed goods
- create demand for more advanced production chains
- visibly reflect the development of the Farmipelago
- potentially provide useful farm-related services

Its exact identity and name remain open: settlement, hamlet, travelling village, community, or something else.

---

## 10. Slow Continuous Demand

Continuous demand is attractive because it keeps old crops relevant, but it is dangerous because Farmipelago depends heavily on **manual machinery operation**.

In a factory game, a bread chain can run forever without the player manually driving every harvest.

In Farmipelago, badly tuned demand could repeatedly force the player back into the same field and transport route.

A promising constraint is therefore:

**Demand should be low relative to a successful harvest and vehicle capacity.**

The desired feeling is:

**Stock up occasionally, then forget about it for a while.**

For example, a large trailer load of wheat or bread-related input might keep a settlement need supplied for several harvest cycles.

The player should think:

> Bread is getting low. Next time I work that side of the Farmipelago, I should restock it.

not:

> Bread dropped again. I have to stop what I am doing.

Better machinery can naturally reduce the maintenance burden:

- larger trailers move more per trip
- larger fields produce more per harvest
- combination tools reduce field passes
- improved storage permits larger reserves

This creates a useful progression effect:

**better equipment lets the player spend less time maintaining established systems and more time developing new ones.**

The correct consumption rate will need playtesting.

---

## 11. Settlement Needs and Development

The settlement could take inspiration from the Anno series without copying its city-management structure. The current direction is to give each settlement stage a **small menu of needs**, where only a subset must be supplied to reach the next stage.

### Tier 1 — Raw Starter Produce

Tier 1 should be completely solvable using the **starter farm island and starter equipment**. It should not depend on catching another island, discovering livestock, or obtaining specialized harvesting machinery.

A current example is:

- Wheat
- Barley
- Canola
- **Supply any 2 of 3** to develop beyond Tier 1

The exact crops can change, but all Tier 1 options should use the same basic field-working and harvesting equipment.

### Tier 2 — First New Farming Systems / One-Step Outputs

Tier 2 can begin asking for products that require **one new capability beyond starter crop farming**. Candidate examples discussed include:

- Milk
- Eggs
- Oil
- Flour

These might come from early livestock islands or simple processors. The settlement should again require only some of the available options, allowing the player's island choices to shape the easiest route forward.

### Tier 3 — Combined or More Processed Goods

Tier 3 can begin combining established capabilities into recognizable products, for example:

- Bread
- Cheese or butter
- Mayonnaise
- other simple foods using two previously established systems

The goal is **not** to turn the game into an automation ladder with endlessly deeper recipes. Higher tiers should test breadth and preparedness more than long production depth. Once the player has proven they can operate a chain, later requirements can stay relatively small instead of demanding huge volumes.

A useful principle is:

**Each tier may add another layer of agricultural sophistication, but progression should favor variety and capability over grind.**

The settlement may only need a subset of each tier's options. That lets a grain-focused Farmipelago, livestock-heavy Farmipelago, or more diversified farm develop through different combinations.

---

## 12. What Happens When Supply Stops?

This remains deliberately unresolved.

The system should probably avoid harsh punishment.

Possible approaches include:

### Soft Loss of Benefit

An unsupplied need stops contributing a bonus or development effect.

The settlement does not collapse.

### Development Pause

The settlement keeps its current state but cannot continue developing while too few needs are supplied.

### Reserve System

A need remains satisfied until a large stored reserve is depleted.

The player receives plenty of warning and can choose when to restock.

### No Population Regression

An emerging preference is that already-earned settlement development should not disappear simply because one product temporarily runs out.

However, the exact consequence of shortages should be tested against how much maintenance the game can tolerate.

---

## 13. Manual Production Chains

Manual movement through **short physical production chains** may fit Farmipelago well.

A current bread-island example is:

**Wheat → windmill → flour → bakery → bread**

The current preference is that the **windmill and bakery can exist together on the same passing island**, along with a few existing wheat tiles. This makes the island read immediately as a coherent agricultural opportunity rather than as one arbitrary missing puzzle piece.

The small local wheat patch can demonstrate the chain, but should probably be too small to support the settlement indefinitely. The player is then encouraged to grow larger quantities of wheat elsewhere and physically haul them to the processing island.

The player could:

1. harvest wheat
2. load wheat into a trailer
3. drive it to the windmill island
4. unload a large batch
5. collect flour
6. move flour a short distance to the bakery
7. collect or deliver bread to the settlement

The interesting geography is therefore not created by arbitrarily splitting every processing step across separate islands. It comes from deciding **where useful specialist islands sit relative to fields, settlement, livestock and other routes**.

The likely design constraint remains:

**short chains, large batches, slow demand.**

The game should avoid constant tiny deliveries.

---

## 14. Processing Buildings as Island Rewards

Processing buildings may be one of the most valuable things a passing island can contain.

Examples:

- windmill
- bakery
- dairy
- preserve kitchen
- textile workshop
- other agricultural processors

This creates interesting island choices.

An otherwise mediocre island may still be highly desirable because it completes a production chain.

Example:

> The island is small and awkward, but it has the bakery needed to turn an existing flour supply into bread.

Another player may find the same capabilities in a different order.

This can make each Farmipelago structurally different without relying only on crop yield modifiers.

It also creates an important generation problem:

**How random should access to missing production-chain pieces be?**

---

## 15. Settlement Growth

If the settlement grows, its development should mostly be **visible and functional rather than manually constructed**.

Possible visual changes:

- more homes
- denser buildings
- improved paths and streets
- expanded communal storage
- workshops and services
- gardens, laundry, lights and activity
- taller or more elaborate buildings
- structures expanding around or beneath the floating island

Because the settlement may occupy its own island, growth does not have to consume farmland.

Possible mechanical effects of growth:

- somewhat higher food demand
- access to higher-tier needs
- new services for the farm
- new equipment-support capabilities
- new opportunity types

Population numbers do not need to become a core simulation.

The settlement should support the farming game rather than become the main game.

---

## 16. Milestones

A milestone system still appears promising, but it may work better as a set of **predictable mastery rewards** rather than a linear main progression.

Examples already discussed:

**Grow crops on four different islands**  
→ unlock a new or larger trailer

**Successfully grow ten different crops**  
→ unlock a combined cultivator + seeder

The useful pattern is:

**The milestone does not unlock the activity required to complete it. It rewards mastery of an activity the player already has access to.**

Possible milestone themes:

- farm on many islands
- grow many crop types
- use different terrain conditions
- maintain livestock
- complete several production chains
- move produce across a large Farmipelago
- use several types of machinery
- develop different styles of farm

Possible rewards:

- combination tools
- larger trailers
- specialized vehicles
- improved attachments
- new transport capabilities
- new island-handling capabilities
- conveniences that reduce repeated work

Milestones give the player something predictable to work toward even when island acquisition is unpredictable.

Whether milestones are fully optional, partially structural, or tied to settlement development remains unresolved.

---

## 17. Visiting Ships and Rolling Opportunities

The game has explored an idea inspired partly by the **choice and preparedness structure** of Against the Storm's Orders, but without turning Farmipelago into a run-based structure.

A cleaner fiction may be to separate transient requests from permanent land:

**Passing islands = geography and capabilities.**  
**Visiting sky ships / barges = temporary orders, trades and outside-world requests.**

A current idea is to give the Farmipelago **one guest mooring point**. A visiting ship can dock there and offer a request. While that guest slot is occupied, another visiting ship cannot dock. This limits simultaneous errands without requiring a large quest board or making every island temporarily attachable.

Ship requests can ask for:

- raw crops
- processed food
- animal products
- mixed deliveries
- small preparedness challenges

The best version should reward the player for having diversified and stockpiled modest reserves. A request should sometimes produce the satisfying reaction:

> I already have that. I prepared well.

Requests should generally use **small, meaningful quantities rather than huge grind quotas**. If the player has already proven that they can produce milk, asking for a modest amount plus another product can be more interesting than asking for tens of thousands of litres.

Possible portable rewards include:

- seeds
- fertilizer
- useful supplies
- attachments
- trailers or other non-self-propelled equipment
- unusual but nonessential farming tools

A current preference is to be more cautious about giving away complete self-propelled vehicles such as tractors through random encounters, because that can blur predictable equipment progression.

Ships should be optional. Ignoring one should not block the persistent farm.

---

## 18. Preparedness as a Strategic Goal

A stronger strategic theme has emerged from the Against the Storm comparison:

**Farm to be prepared.**

The player should normally produce what is currently needed, but often make a little extra and keep useful reserves. When a ship request appears, a settlement need changes, or a newly caught island enables a processor, that preparation can immediately pay off.

For example, the player may grow and store Canola before owning an oil press. If an oil-processing island later appears, the player can use it immediately rather than starting from zero.

This gives diversification a purpose without turning it into a checklist. A specialized farm remains viable, but a broader farm has more ways to respond to whatever arrives next.

Passing-island choices then become similar to choosing buildings or blueprints in Against the Storm: the player is selecting **future flexibility**. A new island is valuable when it expands the range of needs, requests or opportunities the farm can answer.

The system should remain learnable rather than purely random. Common request patterns and common production opportunities should recur often enough that experienced players can make informed bets about what may be useful later.

Opportunities still should not be the only reason harvests matter. Settlement consumption and internal farm uses provide the baseline demand; ships and other requests create intermittent spikes where preparedness feels rewarding.

---

## 19. Short-Term and Long-Term Goals

A possible goal structure is emerging, but none of it is locked.

### Moment-to-Moment

- operate farm machinery
- work fields
- harvest crops
- transport bulk goods
- move goods through physical processors
- physically inspect a passing island when it looks promising

### Short-Term

- satisfy one of the settlement's active needs
- finish a production batch
- restock a modest reserve before it becomes urgent
- fulfill a visiting ship request that matches current stock
- prepare a newly attached island

### Medium-Term

- deliberately overproduce useful goods so the farm is ready for future requests
- add a new production capability by catching the right island
- complete or improve a production chain
- support the required subset of settlement needs for the current tier
- work toward a visible equipment milestone
- decide which passing islands are worth permanent attachment

### Long-Term

Possible motivations include:

- building an increasingly capable Farmipelago
- developing the settlement through increasingly sophisticated needs
- becoming broad enough to respond to many different requests
- specializing in some chains while keeping enough diversity to stay flexible
- completing broad farming milestones
- physically growing the Farmipelago through permanent island choices
- travelling through changing sky regions

A useful strategic north star is:

**Grow what you need, produce a little extra, and build enough diversity that future opportunities feel like rewards for preparation rather than random demands.**

Whether the journey itself has a final destination or formal ending remains deliberately unresolved.

---

## 20. No-Money Progression Roles

A possible division of progression roles is:

### Passing Islands

Introduce:

- land
- crops
- livestock
- processing buildings
- infrastructure
- occasional equipment

### Settlement Development

Creates reasons to support increasingly sophisticated agricultural production.

### Milestones

Provide predictable rewards for farming mastery.

### Visiting Ships / Opportunities

Provide changing short-term goals and optional rewards, especially for farms that prepared useful reserves.

This separation is attractive because each system has a different purpose.

However, the boundaries between them are not fixed.

---

## 21. Main Progression Is Unresolved

The current prototype GDD uses a Shapez-like sequence of increasingly complex delivery milestones.

The drifting-island concept raises the question of whether Farmipelago needs a central progression chain at all.

A fixed sequence such as:

**wheat → several crops → livestock → milk**

can conflict with a world where the player does not know which islands and capabilities will arrive.

Possible directions still include:

### No Main Progression

The Farmipelago itself is the progression.

### Settlement-Led Development

The settlement gradually asks for more sophisticated goods, but the player can choose between several possible needs.

### Broad Farm-Development Stages

The game measures broad capability rather than specific products.

### Dynamic Progression

Goals adapt to the capabilities actually present in the player's Farmipelago.

### Hybrid

Settlement needs, milestones and opportunities overlap without one dominant linear track.

No direction has been chosen.

---

## 22. Journey and Ending

The drifting world naturally raises the question of whether the Farmipelago is travelling toward somewhere.

Ideas discussed include:

- different sky regions
- changing currents and environmental character
- new island pools in later regions
- a distant destination
- an eventual arrival that could act as a soft ending

There is concern that a clearly finite sequence of regions or Orders could make Farmipelago feel like another roguelite run.

Current exploration therefore separates two questions:

**Should the world visibly change as the Farmipelago travels?**

and

**Should that journey ever formally end?**

The first is promising.

The second remains completely open.

---

## 23. Procedural Generation and Fairness

Pure randomness could create progression problems.

If the player has wheat but never encounters a windmill, a bread-focused path may be unavailable for too long.

If the player finds a bakery before any source of flour, that can be interesting, but the world should eventually offer plausible ways to complete that chain.

The game may need to distinguish between:

**what feels random to the player**

and

**what the generator guarantees behind the scenes**

Possible hidden generation rules:

- bias future islands toward completing partially available production chains
- regularly offer several different expansion paths
- avoid requiring one specific missing asset
- ensure the player is never permanently blocked by an earlier island choice

The player should still feel that opportunities emerge naturally rather than being obviously handed out by a progression script.

---

## 24. Design Risks

### Repetitive Maintenance

Continuous settlement demand can give harvests purpose, but can also turn the game into repeated chores.

The system must be tuned so established production chains need occasional restocking rather than constant service.

### Too Much Logistics

Manual hauling can make island geography meaningful, but too many processing steps could transform Farmipelago from a farming game into a delivery game.

Production chains should stay short enough that driving remains purposeful.

### Settlement Taking Over the Game

If population, housing, services and happiness become too detailed, the settlement could turn Farmipelago into a city builder.

The settlement should primarily exist to create agricultural demand.

### Randomness Blocking Progress

Finding infrastructure on passing islands is exciting only while the player has meaningful choices.

Waiting indefinitely for one mandatory missing building would be frustrating.

### One Optimal Farm

If settlement needs or milestones strongly favor one production mix, procedural island choice becomes less meaningful.

The game should reward several viable farm identities.

### Infinite Growth Losing Meaning

If the player can attach unlimited islands forever, each new island may eventually stop feeling important.

A current preference is to avoid a complicated tether-weight economy, but the game still needs a simple reason not to keep every island. Permanence, awkward geography, limited useful attachment locations, logistics and the frequency of incoming islands may be enough, but this must be tested.

### Early Permanent-Regret

Permanent attachment creates identity, but new players may keep weak early islands before they understand what later opportunities can contain. Early islands should therefore be broadly useful stepping stones rather than traps, and later equipment / faster travel should reduce the cost of having a few small or inefficient old islands in the network.

### Too Many Interruptions

If a relevant island passes every couple of minutes, explicit popups or forced camera reveals would quickly become annoying. Important islands should remain readable through world presentation, but the player should generally retain control and be allowed to miss an encounter.

---

## 25. Why the Floating Islands Matter

The islands should not merely recreate ordinary farming fields separated by gaps.

The drifting system makes geography itself part of progression.

A windmill is not simply an unlocked building.

It may arrive attached to a piece of land.

A herd of cows may arrive on another.

A bakery may drift past later.

The player physically assembles these pieces into a functioning agricultural network.

This creates recurring questions that could define Farmipelago:

**Do I want this island?**

**Where should I connect it?**

**What does it let my farm do?**

**How will I move goods through the Farmipelago if I keep it?**

The resulting farm becomes both an agricultural system and a history of the player's encounters with the drifting world.

---

## 26. Current Design Principles Under Exploration

- The Farmipelago itself should be the main persistent object the player develops.
- The player should physically operate farming machinery.
- Floating islands should create gameplay that cannot simply be transplanted to an ordinary farm map.
- New land should feel discovered or caught rather than purchased.
- Money is currently not desired.
- Randomness should create decisions rather than progression dead ends.
- Island acquisition should feel visually and mechanically significant.
- Passing islands should be frequent enough that saying no is normal, while especially desirable islands remain uncommon.
- Candidate islands should be physically inspectable from the tractor when practical.
- Permanent attachment is currently preferred because it gives the Farmipelago history and makes each kept island matter.
- Existing farms, livestock, processing buildings and machinery can make passing islands desirable.
- Production chains may be physical and geographically meaningful.
- Repeated supply should be slow enough to avoid becoming a chore.
- Milestones should provide predictable mastery rewards without forcing one farm layout.
- Visiting ships / rolling opportunities should offer choices rather than form a finite quest ladder.
- The player should be rewarded for modest overproduction, diversification and preparedness rather than pure throughput.
- The settlement should create agricultural purpose without turning the game into a city builder.
- A player's Farmipelago should not be expected to develop in one fixed order.
- Free-form farming should remain valid even when the player is not pursuing a milestone or opportunity.
- None of these points should be treated as final until the systems are tested together.

---

## 27. Open Questions

### Starting Structure and Tier 1

- Should the game start with exactly one farm island and one settlement island?
- Which island contains the workshop, storage and starter vehicles?
- Are Wheat, Barley and Canola the right three Tier 1 options?
- Is **2 of 3 raw starter crops** the right requirement for the first settlement development step?
- How much of each crop counts as adequately supplied without becoming a grind?

### Settlement Tiers

- What exactly belongs in Tier 2: Milk, Eggs, Oil, Flour, or another set?
- Should every tier require only a subset of available needs?
- Does a higher tier require currently maintained supply, cumulative deliveries, or both?
- How much additional processing complexity should each tier introduce?
- At what point should higher tiers stop adding deeper recipes and instead test combinations of already-mastered systems?
- How slowly should ongoing settlement demand drain?
- What happens when one need reaches zero?
- Does settlement growth ever increase consumption enough to feel like maintenance?

### Preparedness

- How much surplus should the player normally be encouraged to keep?
- Is storage effectively unlimited, or does some limit need to preserve interesting preparation decisions?
- Should produce spoil, or would that create the wrong kind of pressure?
- How predictable should common ship requests be so experienced players can prepare intelligently?
- How often should speculative production such as storing Canola before finding an oil press pay off?

### Passing-Island Frequency

- Is roughly one relevant passing island every 1–3 minutes the right frequency?
- How long is the useful boarding window?
- How common should genuinely excellent islands be?
- How many distant non-interactive islands should exist purely as scenery?
- How do we visually distinguish a reachable opportunity from ambient background islands without intrusive UI?

### Boarding and Falling

- How close must a candidate island pass for a tractor jump to feel fair?
- How much route assistance should happen invisibly under the hood?
- Should every candidate guarantee at least one easy boarding point?
- How long is tractor recovery after falling?
- Does the island always drift away during recovery, or can some slow islands still be caught?
- Can the player take produce or portable items off an uncommitted island before it leaves?

### Permanent Attachment

- Is attachment always permanent once confirmed?
- Does the passing path determine the attachment location, or does keeping an island enter a separate placement mode?
- How do we prevent an irregular Farmipelago from becoming an unmanageable starfish shape?
- What simple constraint prevents the player from permanently keeping every passing island?
- Is permanence plus logistics enough, or is some explicit limit still required?
- How do early permanent choices remain charming rather than feeling like mistakes later?
- Can later vehicles / travel options make old peripheral islands easier to live with without making them irrelevant?

### Island Contents

- Which things can lie around as portable finds: seeds, fertilizer, attachments, trailers, feed, other supplies?
- Should complete tractors / combines ever appear as random rewards, or remain predictable milestone / settlement unlocks?
- Can the player harvest an existing field on a passing island without keeping the island?
- Can livestock be taken off a passing island, or are animals part of the permanent-island decision?
- How much should an island reveal visually before the player jumps onto it?

### Processing Islands

- Is the bread island best represented as windmill + bakery + a few Wheat tiles on one island?
- Which other processors should arrive as coherent specialist islands rather than isolated buildings?
- Can processors ever be constructed later, or must they be found?
- What happens when the player sees duplicate processor islands?
- Are specialist islands still valuable after the player has already mastered that chain?

### Visiting Ships

- Is one dedicated guest mooring slot enough?
- Does a docked ship wait indefinitely, for a generous timer, or until explicitly dismissed?
- How often should ships arrive compared with islands?
- Can the player decline a ship immediately to free the slot?
- Should ship requests be generated from current capabilities, or sometimes deliberately ask for plausible things the player does not currently stock?
- Which rewards are appropriate for ships without making them the mandatory progression path?
- Do ships explain how seeds, fertilizer and portable equipment enter the Farmipelago economy?

### Milestones

- Are milestones all visible from the start?
- Are some discovered when relevant systems appear?
- Are milestones purely optional mastery goals, or do some support settlement development?
- Can milestones unlock completely new capabilities, or mainly better equipment?
- Should milestones remain lifetime-based?
- How do we prevent milestone grinding?
- Which predictable rewards should be protected from random ship / island rewards?

### Journey and Long-Term Motivation

- Does the Farmipelago pass through distinct sky regions?
- Do different regions alter island and ship encounter pools?
- Is there any destination, or does that pull the game too far toward a run structure?
- What remains interesting after the settlement is highly developed?
- What remains interesting after most production chains have been found?
- Does the player eventually stop wanting new islands?
- Is the long-term identity primarily versatility, specialization, preparedness, spatial growth, or some mixture?

---

## 28. Next Questions to Resolve

The latest discussion makes the **settlement-tier structure and preparedness loop** the highest-value areas to define next. The island concept now has a clearer role: it supplies future capabilities, while settlement needs and ship requests create reasons to prepare and use those capabilities.

The next design questions should probably be resolved in this order:

1. **What are the exact three Tier 1 raw goods, and what does “supply 2 of 3” mechanically mean?**
2. **What are the first Tier 2 options, and which new island / farming capability introduces each one?**
3. **How does slow settlement consumption work numerically so stocking up feels useful rather than repetitive?**
4. **How much surplus should a well-prepared player normally keep, and how do ship requests reward that preparation?**
5. **What is the simplest full bread-island loop: board → inspect → permanently attach → haul Wheat → make Flour → make Bread → supply settlement?**
6. **What is the simplest rule that makes permanent island attachment selective without introducing a complicated tether economy?**
7. **How should the one guest ship mooring work, and what kinds of portable rewards should it offer?**

Once those are coherent on paper, the implementation can prototype one complete early-game sequence rather than building many crops, processors and island types at once.
