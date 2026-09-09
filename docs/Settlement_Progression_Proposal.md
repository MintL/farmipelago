# Farmipelago — Settlement Progression Proposal

**Status:** Design proposal / not yet locked  
**Date:** 2026-09-09  
**Related:** `Farmipelago_Drifting_Islands_Concept.md`, `Farmipelago_GDD.md`

## 1. Goal

Settlement progression should give the player a clear long-term reason to develop the Farmipelago without turning the game into a city builder or a money-driven upgrade ladder.

The progression should combine two kinds of increasing complexity:

- **farming-operation complexity** — new ways to prepare, harvest, handle and transport agricultural products
- **production-chain complexity** — short processing chains using specialist buildings found on drifting islands

The progression should not become a simple ladder of adding one more processor each tier.

A useful guiding principle is:

> Each tier should ask the player to demonstrate a broader or more involved kind of agriculture than the previous tier.

---

## 2. Progression Responsibilities

Three systems should have distinct jobs.

### Settlement tiers — guaranteed progression

Settlement development determines which agricultural capabilities are available.

Opening a new tier can unlock:

- new crops or seeds
- essential machinery needed for the new farming operations
- new categories of specialist islands that may begin appearing
- visible development of the settlement itself

Settlement progression should primarily unlock **new things to do**.

### Drifting islands — physical opportunities and infrastructure

Specialist production buildings should generally not be purchased or freely placed by the player.

Instead, useful infrastructure arrives physically on passing islands, for example:

- windmill
- oil press
- bakery
- cattle farm
- chicken farm
- dairy
- food kitchen
- textile workshop

The player decides whether that island is worth permanently attaching to the Farmipelago.

This makes the player's production capabilities partly a consequence of the particular Farmipelago they assembled.

### Mastery milestones — improvements and convenience

Optional mastery milestones can reward the player for becoming proficient with systems they already have.

Examples:

- farm on several islands → larger trailer
- grow many crop varieties → wider or combined seeding equipment
- transport large volumes → improved logistics equipment
- develop a substantial livestock operation → improved livestock handling equipment

The milestone should not unlock the activity required to complete it. It should reward mastery of an already available activity.

---

## 3. Settlement Tier Rules

Each settlement tier presents **four possible requirements**.

The player must permanently complete **any three of the four** to advance.

Example:

```text
SETTLEMENT TIER 2

Complete any 3 of 4

Hay       COMPLETE
Flour     2,400 / 3,600
Oil       COMPLETE
Eggs      0 / 24

Progress: 2 / 3
```

Completed requirements stay completed permanently. They are progression achievements, not continuously draining needs.

There should be no hidden household satisfaction, population threshold or decaying progression meter.

This keeps the rule transparent:

> Produce three of these four things and the settlement develops.

The optional fourth requirement allows the player's island discoveries to influence the route through progression.

---

## 4. Example Five-Tier Progression

The exact products and quantities are placeholders. The important part is the shape of progression.

### Tier 1 — Basic Crop Farming

**Complete any 3:**

- Wheat
- Barley
- Canola
- Soybeans

**Farming challenge:**

Standard arable farming using the starter workflow:

**plough → seed → grow → combine → transport**

**Available equipment:**

- starter tractor
- plough
- seeder
- combine
- basic grain transport

Tier 1 should be solvable entirely from the starting Farmipelago without depending on a random specialist island.

### Tier 2 — Bales, Animals and First Processing

**Complete any 3:**

- Hay
- Eggs
- Flour
- Vegetable oil

**New farming challenge:**

Hay introduces a multi-step field operation rather than another combine crop:

**grass → mow → ted/dry → bale → physically handle → transport**

Eggs introduce the first simple animal/feed relationship.

Flour and oil introduce short processing chains using crops the player already understands.

**New guaranteed capabilities:**

- grass/hay farming
- mower
- tedder
- baler
- bale/crate handling equipment

**New drifting-island opportunities:**

- chicken farms
- windmills
- oil presses

### Tier 3 — Dairy, Root Crops and Finished Foods

**Complete any 3:**

- Milk
- Potatoes
- Bread
- Mayonnaise

**New farming challenge:**

Milk extends hay into livestock:

**hay → feed cattle → milk → tank transport**

Potatoes introduce a specialized multi-pass field workflow rather than standard combine harvesting.

Bread extends the flour chain through a bakery.

Mayonnaise combines previously established eggs and oil.

**New guaranteed capabilities:**

- potatoes
- potato planter
- topper
- potato harvesting equipment
- milk tank / livestock transport equipment

**New drifting-island opportunities:**

- cattle farms
- bakeries
- food kitchens

### Tier 4 — Permanent Crops and Different Harvest Handling

**Complete any 3:**

- Apples
- Cotton
- Cheese
- Potato crisps

**New farming challenge:**

Apples introduce a permanent crop and a harvest based around trees rather than open fields.

Cotton introduces a harvest that leaves large physical bales/modules that must be handled and transported differently from loose grain.

Cheese extends milk through a dairy.

Potato crisps reuse potatoes and oil through an existing food-processing capability rather than requiring another entirely separate production ladder.

**New guaranteed capabilities:**

- cotton
- cotton harvesting and transport equipment
- orchard/fruit handling equipment as required by the final orchard design

**New drifting-island opportunities:**

- established orchard islands
- cotton-focused farmland islands
- dairies
- more capable food kitchens

### Tier 5 — Specialist Land Use and Integrated Production

**Complete any 3:**

- Rice
- Grapes
- Fabric
- Apple pies

**New farming challenge:**

Rice introduces specialized land preparation and water management.

Grapes introduce permanent rows, narrow machinery and a different field layout.

Fabric extends cotton through a textile workshop.

Apple pies combine several earlier systems through an existing bakery:

**flour + apples + eggs → apple pies**

**New guaranteed capabilities:**

- rice and paddy-working equipment
- grapes and vineyard machinery

**New drifting-island opportunities:**

- paddy-oriented islands
- vineyards
- textile workshops
- more developed agricultural infrastructure

---

## 5. Game Length and Tier Pacing

The current first-completion target is approximately **five hours** for a new player who explores passing islands, reorganizes the farm and experiments rather than optimizing only for progression.

The goal is to make one Farmipelago substantial enough to develop a personal history, while keeping the campaign compact enough that starting another seed and getting a different sequence of islands remains attractive.

A first pacing target is:

| Tier | Approximate first-play time | Progression role |
| --- | ---: | --- |
| Tier 1 | 15–25 min | Learn basic field work, storage and settlement delivery |
| Tier 2 | 30–45 min | First multi-step harvests, animals and processors |
| Tier 3 | 45–60 min | Establish livestock, specialized crops and longer chains |
| Tier 4 | 60–90 min | Build a more complex Farmipelago with permanent/specialized agriculture |
| Tier 5 | 60–90 min | Integrate several established systems and complete the settlement |

The explicit tier objectives account for roughly 3.5–5 hours depending on play style. Exploration, island decisions and reorganization should naturally put a typical first completion near **five hours**. An experienced player who knows the systems and receives favorable island opportunities may finish in roughly **2.5–3.5 hours**.

The final tier should not require the player to have seen or collected every system. Completing the settlement should leave optional islands, mastery rewards, unusual production routes and free farming available afterward.

Later tiers should take longer primarily because their farming operations and logistics are more involved, not because every requirement simply asks for much larger quantities. Early tiers can prove that the player can produce something; later tiers should increasingly prove that the Farmipelago can sustain a small production chain.

---

## 6. Progression Rhythm

The tiers should not follow the pattern:

**processor → processor → processor → processor**

Instead, the progression should move between different kinds of complexity:

**basic field work → multi-step harvesting → livestock → specialized harvesting → permanent/specialist agriculture → integration**

Processing chains remain important, but they sit alongside changes to the physical farming gameplay.

A late-tier product does not need to have a deep recipe to be advanced. Rice can be a late requirement because producing it changes how the player uses land and machinery.

---

## 7. Unlock Timing

A tier must make its required activities possible **when the tier opens**, not after the tier is completed.

Therefore:

- required seeds become available when the tier opens
- essential equipment for that tier becomes available when the tier opens
- relevant specialist-island categories enter the drifting-island pool when the tier opens

Completing the tier then opens the next layer of agriculture.

Required equipment should not depend entirely on random island generation. Randomness should primarily determine which infrastructure and opportunities the player finds.

Once a crop is unlocked, seed quantity is not tracked. The seeder has unlimited access to that crop. Unlocking a crop is therefore about gaining a new farming capability rather than maintaining a consumable seed inventory.

---

## 8. RNG as Part of Progression

Randomness is desirable if it changes the player's route through progression.

A useful distinction is:

> **Good RNG changes your route. Bad RNG makes you wait.**

The player should not be told:

> Produce Bread, and the only bakery in the game may randomly appear at some unknown point.

Instead, a tier can offer several valid routes:

```text
Hay
Flour
Oil
Eggs

Complete any 3
```

One player may quickly find a windmill and chicken island and build around flour and eggs. Another may find an oil press first. Their Farmipelagos develop differently while both retain several paths forward.

The 3-of-4 structure is therefore not only a choice system. It is what allows random island acquisition to participate directly in progression without every individual building becoming mandatory.

No hard pity system should be assumed initially. The system should first be tested with genuinely random opportunities and broad enough progression requirements. Weighting or safeguards can be added later if playtesting shows that unlucky sequences routinely create waiting rather than adaptation.

### Small opportunities as visible RNG fallback

Small farms and other passing-island opportunities can provide a limited alternative route around one unlucky missing island.

An opportunity offers a simple **one-of-two input choice** and an immediate physical reward. For progression-critical goods, the reward can bridge a missing production step without replacing the permanent infrastructure.

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

If the player has not found a Windmill island, this can allow them to complete the Flour requirement and continue. Later, when Bread requires a dependable flow of flour into a Bakery, owning a Windmill is still valuable.

The same structure can apply to other branches:

- Canola or Soybeans → limited Oil
- Hay or Grain → limited Milk
- Grain or another farm good → limited Eggs
- Milk or another useful input → limited Cheese

Opportunities should normally be one-shot or batch-limited. They are a **temporary bridge over bad RNG**, not an alternate permanent production system.

This produces three responses to unlucky island generation:

1. find and permanently attach the correct infrastructure
2. use a temporary opportunity to bridge the missing step
3. complete the other three requirements and ignore that route for the tier

This visible player-controlled fallback is preferred over immediately hiding bad luck behind deterministic pity generation.

---

## 9. Passing-Island Cadence

If useful infrastructure is acquired through passing islands, islands need to be frequent enough that randomness creates choices rather than long periods of waiting.

A current design target is approximately:

**one boardable/relevant island every 30 seconds**, with random variation around that value.

The rare event should not be **seeing an island**.

The rare event should be **seeing an island worth permanently keeping**.

Most passing islands can therefore be ordinary or easy to reject. Frequent opportunities make saying no normal and support permanent attachment decisions.

The intended rhythm is:

**farm → notice island → inspect/glance → reject or keep → continue farming**

rather than treating every island arrival as a major interruption.

---

## 10. Settlement UI Direction

The settlement should be treated as one progressing entity rather than a collection of individually simulated houses.

A central settlement building, storehouse or similar interaction point can expose the current tier.

The UI should show:

- current settlement tier
- the four possible products
- exact delivered amount / required amount for each
- completed state that never regresses
- **3 / 4 required** rule clearly
- what the next tier will unlock

Example:

```text
SETTLEMENT — TIER 3

Complete any 3

Milk         COMPLETE
Potatoes     2,000 / 3,600
Bread        COMPLETE
Mayonnaise   8 / 20

Progress: 2 / 3

NEXT DEVELOPMENT
Rice farming · Vineyard machinery · New island types
```

There should be **no continuously draining food meters tied to settlement progression**.

The separate question of why old goods remain useful over the long term should be solved through later requirements, recipes, animal feed, temporary opportunities and other systems rather than making settlement development decay.

---

## 11. Crop Growth Timing

Growth time should support the rhythm of leaving a planted field to work elsewhere rather than waiting beside it.

A first balancing target is:

| Crop type | Target growth time |
| --- | ---: |
| Early grains and oilseeds | ~3 min |
| Corn, grass and root crops | ~4–5 min |
| Cotton, rice and other later annual crops | ~5–6 min |
| Persistent orchards and vineyards | ~6–8 min between harvests |

These are design targets, not final balance values. Later crops should not automatically grow more slowly merely because they belong to a higher tier. A crop that already has a complex multi-step harvest may need less additional waiting.

With a passing-island target near 30 seconds, a three-minute starter crop creates room for roughly six island encounters during one growth cycle. The player should naturally have transport, island inspection and other field work to do while crops mature.

---

## 12. Open Questions to Prototype

- Is 3-of-4 enough freedom, or does a later tier need more possible products?
- How much product should be required before a requirement counts as mastered?
- Should every tier contain roughly two farming/animal products and two processed products, or should that ratio vary strongly by tier?
- How should newly unlocked crops be presented physically even though seed quantity remains unlimited?
- How should guaranteed essential equipment be presented: workshop access, settlement delivery, supply ship, or another physical event?
- How specialized can a passing island be before rejecting it becomes an obviously bad decision?
- Is roughly one relevant island every 30 seconds frequent enough once the Farmipelago becomes large?
- How much randomness is enjoyable before players feel they are waiting for progression?
- How often should progression-bridging opportunities appear without making permanent processors unnecessary?
- Which processing buildings should support several recipes so useful islands remain relevant across multiple tiers?
- Which late-game farming operations are distinctive enough to justify their own equipment without creating machinery bloat?

---

## 13. Step-by-Step Implementation Plan

This plan is intentionally **gated**. Implement only one numbered step at a time. After each step, stop and let the user play the current build and explicitly approve it before continuing. Do not combine later steps into the same change set merely because they are technically related.

Every step should follow `AGENTS.md`: increment the displayed build version for player-visible changes, run `npm run build`, preserve existing saves where practical, update the GDD when an implemented decision materially differs from the documented direction, and leave the relevant manual verification checks for the user. Do not automate gameplay verification unless the user explicitly requests it.

The implementation should build on the existing boundaries rather than create a second progression stack. In particular, evolve `src/gameplay/progression/index.js` for settlement progression, the catalogs under `src/gameplay/catalog/` for crops/equipment/goods, the current Settlement Storehouse delivery flow for progression submission, and the existing drifting-island runtime/scheduler for island opportunities.

### Step 0 — Establish a clean baseline

**Goal:** make sure later progression changes can be judged against a known-good drifting-islands build.

**Implementation:**

- Work only on `feature/drifting-islands`.
- Run the existing build before changing gameplay.
- Record the current save schema/version assumptions relevant to village stock, earned gates, crop state and passing islands.
- Do not change gameplay in this step.

**User verification gate:**

- Existing Farm + Settlement opening works.
- Wheat, Barley and Canola can still be planted, harvested and delivered.
- Passing islands can still connect/release correctly.
- Existing livestock/debug capability remains functional.

**Stop here until the user approves the baseline.**

### Step 1 — Replace draining Tier 1 needs with permanent 3-of-4 progression

**Goal:** prove the new settlement progression rule using only existing crop farming before adding new production systems.

**Implementation:**

- Refactor `src/gameplay/progression/index.js` from continuously consumed village stock into permanent requirement progress.
- Tier 1 requirements become Wheat, Barley, Canola and Soybeans.
- Unlock Soybeans at the start so Tier 1 is fully solvable without RNG.
- Require any three requirements to reach their target.
- Once a requirement reaches its target, mark it permanently complete and stop accepting additional delivery toward that requirement unless free storage semantics require otherwise.
- Remove active-time consumption from progression state.
- Persist current tier, per-requirement delivered amount/completion and earned gates.
- Migrate existing village-stock saves conservatively: existing stock becomes initial delivered progress capped at the new requirement target; no completed progression should be lost because the player did not happen to have stock at the moment of migration.
- Do **not** advance to Tier 2 yet. Reaching 3-of-4 should show a temporary `Tier 1 complete` state only.

**User verification gate:**

- All four Tier 1 crops are plantable with unlimited seed access.
- Delivering crops advances exact permanent totals.
- Totals do not fall over time.
- Any three completed requirements produce `Tier 1 complete`.
- The fourth requirement is visibly optional.
- Refreshing preserves progress and completion.

**Stop here until the user approves the progression rule.**

### Step 2 — Rebuild the Settlement Storehouse UI around tiers

**Goal:** make progression fully understandable without hidden thresholds or Anno-style need meters.

**Implementation:**

- Replace the current draining-stock visual language with four requirement cards.
- Show exact amount / target and a permanent `Complete` state.
- Show `Complete any 3 of 4` prominently.
- Add a compact `Next development` area, initially populated with placeholder Tier 2 unlock text from the progression data rather than hard-coded UI copy.
- Keep the popup compact, phone-safe and visually subordinate to the world.
- Do not add population, happiness, decaying bars or currencies.

**User verification gate:**

- The player can understand what is required without prior explanation.
- Completed cards read as final rather than temporarily supplied.
- The optional fourth route is obvious.
- The UI remains usable in portrait/mobile layout and does not become a large management screen.

**Stop here until the user approves the settlement UI.**

### Step 3 — Add tier definitions and guaranteed unlock transitions

**Goal:** establish a data-driven progression spine before adding Tier 2 content.

**Implementation:**

- Replace Tier-1-specific constants with a tier definition/catalog structure containing requirement IDs, targets, completion count and unlock lists.
- Implement transition from completed Tier 1 to open Tier 2.
- Tier opening, not tier completion, grants the seeds and essential equipment needed to attempt that tier.
- Keep specialist buildings out of guaranteed unlocks; tier opening only enables their island categories to appear later.
- Preserve Debug overrides as an explicit developer tool layered on top of earned capabilities.
- For now, Tier 2 may display unavailable placeholder requirements; do not implement its products yet.

**User verification gate:**

- Completing Tier 1 advances exactly once.
- Tier 2 remains active after refresh.
- Unlocks happen at the moment Tier 2 opens.
- Debug overrides do not accidentally become permanent earned unlocks.
- No specialist building is magically granted to the player.

**Stop here until the user approves tier transition behavior.**

### Step 4 — Introduce crop-specific real growth times

**Goal:** replace debug-speed crops with the intended farm/island rhythm independently of later production complexity.

**Implementation:**

- Put growth duration in crop catalog data rather than one global magic number.
- Set Wheat, Barley, Canola and Soybeans to approximately **3 minutes** initially.
- Keep later target bands documented but do not add crops merely to test them.
- Persist enough crop timing state that refresh does not restart mature crops or accidentally grant offline growth unless explicitly designed.
- Keep unlimited seeds once a crop gate is earned.

**User verification gate:**

- Early crops take roughly three active gameplay minutes to mature.
- The player naturally has time to transport, inspect islands or work another field while waiting.
- Growth survives save/reload correctly.
- Three minutes feels playable rather than like waiting.

**Stop here until the user approves the growth rhythm.**

### Step 5 — Increase relevant island cadence to ~30 seconds

**Goal:** make RNG create frequent choices instead of long waits before production infrastructure exists.

**Implementation:**

- Change the encounter target from the current roughly 60-second spacing toward approximately **30 seconds**, with enough random variation that arrivals do not feel metronomic.
- Preserve collision/path reservation rules; never force an arrival by overlapping islands or teleporting them.
- Do not increase the number of simultaneously active islands beyond safe performance/collision limits merely to hit the target.
- If geometry delays an encounter, prefer a delayed valid encounter over breaking the scheduler.

**User verification gate:**

- During normal farming, relevant islands feel frequent.
- Saying `no` to an island feels safe because another opportunity will come soon.
- Arrivals do not overwhelm field work or constantly steal attention.
- No new island collisions, impossible routes or obvious performance regressions appear.

**Stop here until the user approves the cadence.**

### Step 6 — Generalize cargo from crops to agricultural goods

**Goal:** prepare the logistics system for Flour, Oil, Eggs and later processed goods without implementing processors yet.

**Implementation:**

- Introduce a shared goods/catalog identity that can represent crops, animal products and processed products while preserving existing crop-specific behavior where needed.
- Ensure vehicle/building inventories and transfer UI can represent a non-crop good without pretending it can be planted.
- Add **Flour** as the first non-crop test good behind Debug only.
- Do not create a Windmill yet.

**User verification gate:**

- Existing crop inventories and transfers behave exactly as before.
- Debug Flour can be stored, transported and displayed with the correct identity.
- Flour never appears in seed selection or combine harvesting.
- Persistence handles mixed goods correctly.

**Stop here until the user approves the generalized goods model.**

### Step 7 — Add a reusable one-of-two island opportunity system

**Goal:** prove the visible bad-RNG fallback before building many specialist islands.

**Implementation:**

- Give eligible passing islands an optional opportunity descriptor with two accepted inputs, required quantities, one output/reward, completion state and one-shot/batch limit.
- Add a compact contextual opportunity UI near the selected island/building; do not create a global quest log.
- First prototype: **Old Miller** accepts Wheat **or** Barley and gives a limited batch of Flour.
- The output should be physical cargo or enter an appropriate nearby inventory; avoid abstract reward currency.
- Completed opportunities persist while the island remains relevant and cannot be farmed repeatedly by reconnect/reload exploits.
- Let the player complete the opportunity and still release/ignore the island.

**User verification gate:**

- The one-of-two choice is immediately understandable.
- Giving either valid input produces the same limited Flour reward.
- The opportunity cannot be repeated beyond its intended limit.
- The island can drift away after the trade.
- It feels like a small farm/service interaction rather than a quest menu.

**Stop here until the user approves opportunities as a mechanic.**

### Step 8 — Add specialist-island content descriptors and the first Windmill island

**Goal:** prove that permanent infrastructure is something the player acquires by keeping land.

**Implementation:**

- Extend passing-island generation with tier-gated content descriptors separate from terrain generation.
- Add the first specialist content type: a small Windmill/farm island.
- The Windmill converts Wheat or Barley into Flour in batches.
- It only functions while the island is connected as playable Farmipelago land.
- Keep the Windmill and its interaction physically readable and compact; follow the building voxel construction standard.
- Tier 2 enables Windmill islands in the encounter pool; Tier 1 does not need them.

**User verification gate:**

- A Windmill island can appear through normal Tier 2 RNG.
- The player can reject it with no immediate soft lock.
- Keeping it creates permanent repeatable Flour production.
- The Old Miller opportunity still works as a temporary fallback, but owning the Windmill is clearly more useful for future production.

**Stop here until the user approves permanent processor islands.**

### Step 9 — Complete the Hay route for Tier 2

**Goal:** make the first non-processor Tier 2 requirement about multi-step field work.

**Implementation:**

- Bring the existing grass/mower/baler prototype into the normal Tier 2 unlock path.
- Add the intended **ted/dry** step only if it remains valuable after testing the current mow/bale loop; do not add a realism step automatically if it does not improve play.
- Ensure Tier 2 opening grants the essential hay equipment rather than requiring RNG.
- Settlement accepts physical hay/bales as the Hay requirement.
- Set grass growth in the current ~4–5 minute target band only after the user has accepted the 3-minute crop rhythm.

**User verification gate:**

- Hay feels mechanically different from combine crops.
- Required equipment is guaranteed and understandable.
- The number of field passes feels playful rather than tedious.
- Delivering the required hay completes one permanent Tier 2 card.

**Stop here until the user approves the Hay route.**

### Step 10 — Add Oil Press islands and the Oil route

**Goal:** add the second short processing branch using an existing crop.

**Implementation:**

- Add an Oil Press specialist-island type, gated to Tier 2+.
- Convert Canola into Vegetable Oil in readable batches.
- Add a limited opportunity fallback that can provide enough Oil to bridge the Tier 2 requirement without giving permanent production.
- Make Oil a normal transferable good and Tier 2 settlement requirement.

**User verification gate:**

- Oil Press islands appear and can be permanently kept or rejected.
- Canola → Oil works through physical transport.
- The opportunity fallback can bridge bad RNG.
- Permanent Oil production is still clearly preferable for later recipes.

**Stop here until the user approves the Oil route.**

### Step 11 — Add Chicken Farm islands and the Eggs route

**Goal:** add the first simple animal/feed branch without importing the full cattle simulation unnecessarily.

**Implementation:**

- Add a Chicken Farm specialist island gated to Tier 2+.
- Keep chickens deliberately simpler than cattle if individual simulation adds no useful decision: feed an accepted grain input and produce Eggs in batches.
- Make Eggs physical/transferable in whatever compact representation best fits the existing logistics system.
- Add a limited opportunity fallback for Eggs.
- Add Eggs as the fourth Tier 2 requirement.

**User verification gate:**

- Feeding chickens and collecting Eggs is understandable and distinct from a processor.
- It does not create excessive animal micromanagement.
- Eggs can complete their settlement requirement.
- Players can still finish Tier 2 without ever keeping a Chicken Farm because only 3 of 4 are required.

**Stop here until the user approves the Eggs route.**

### Step 12 — Balance and approve Tier 2 as the first complete vertical slice

**Goal:** validate the entire progression philosophy before producing Tier 3–5 content.

**Implementation:**

- Tune requirement quantities so Tier 2 takes roughly **30–45 minutes** on a first playthrough, primarily because of varied operations rather than inflated quotas.
- Verify all three intended responses to RNG: keep infrastructure, bridge with an opportunity, or complete the other three requirements.
- Check that Flour opportunities cannot make a future Windmill irrelevant.
- Add the real Tier 3 transition only after Tier 2 pacing is approved.

**User verification gate:**

The user should complete Tier 2 from a fresh or controlled normal save and answer:

- Did RNG change the route rather than stop progress?
- Were islands frequent enough?
- Did at least one rejection feel meaningful?
- Did opportunities feel useful without becoming the main way to produce goods?
- Did Hay, Eggs and processors feel like genuinely different work?
- Was the tier in the intended 30–45 minute range without obvious grind?

**Do not implement Tier 3 until the user explicitly approves the Tier 2 vertical slice.**

### Step 13 — Tier 3A: integrate existing cattle and Milk into normal progression

**Goal:** reuse the proven cattle prototype as the first Tier 3 route.

**Implementation:**

- Move Cattle Barn/livestock equipment from Debug/legacy gating into Tier 3 opening.
- Prefer cattle arriving as specialist island content if that remains the chosen building-acquisition rule; if the current player-built Cattle Barn is retained, explicitly resolve that design conflict before implementation.
- Connect Hay → cattle → Milk → tank transport to the Tier 3 Milk requirement.
- Add a limited Milk opportunity fallback.

**User verification gate:** complete and approve the normal Milk route before continuing.

### Step 14 — Tier 3B: add Potatoes as specialized field work

**Goal:** introduce a crop whose complexity comes from farming operations rather than processing depth.

**Implementation:**

- Add Potato crop catalog data and approximately 4–5 minute target growth time.
- Unlock required potato planting/harvesting equipment at Tier 3 opening.
- Prototype the smallest recognizable multi-step potato workflow; do not add redundant realism passes.
- Add Potatoes to the settlement requirement set.

**User verification gate:** approve the potato workflow and equipment burden before continuing.

### Step 15 — Tier 3C: add Bakery islands and Bread

**Goal:** make the earlier Flour shortcut intentionally insufficient for the deeper chain.

**Implementation:**

- Add Bakery specialist islands gated to Tier 3+.
- Bread requires a repeatable Flour supply in meaningful batches.
- Preserve the possibility of using leftover opportunity Flour, but do not make one-shot Old Miller trades an efficient long-term Bread source.
- Add Bread as a Tier 3 requirement.

**User verification gate:** confirm that finding/keeping a Windmill now has delayed value and Bread feels like a natural extension rather than just another arbitrary converter.

### Step 16 — Tier 3D: add Food Kitchen and Mayonnaise

**Goal:** test a processor that combines two previously established branches.

**Implementation:**

- Add a reusable Food Kitchen specialist island/building.
- First recipe: Eggs + Oil → Mayonnaise.
- The Kitchen should be designed to support later recipes such as potato crisps rather than creating one building per product.
- Add Mayonnaise as the fourth Tier 3 requirement.

**User verification gate:** approve the combined-input production interaction and the reuse-oriented Kitchen design.

### Step 17 — Balance and approve Tier 3

**Goal:** verify that the campaign is becoming broader rather than merely longer.

**Implementation:**

- Tune Tier 3 toward roughly **45–60 minutes** for a first playthrough.
- Check that Milk, Potatoes, Bread and Mayonnaise produce meaningfully different decisions.
- Keep 3-of-4 intact.
- Measure whether required logistics are becoming repetitive before adding more complexity.

**User verification gate:** complete Tier 3 and explicitly approve pacing and variety before any Tier 4 work.

### Step 18 — Tier 4, one route at a time

Do not implement Tier 4 as one large feature branch. Repeat the same gated pattern for each route:

**18A — Apples / orchards**

- Prototype permanent orchard land use and fruit collection.
- Decide whether orchards arrive already established on islands or whether the player establishes them after unlock.
- User verifies before 18B.

**18B — Cotton**

- Prototype cotton growth, specialized harvest and physical bale/module handling.
- Target roughly 5–6 minute growth initially.
- User verifies before 18C.

**18C — Cheese**

- Add Dairy specialist island using repeatable Milk → Cheese processing.
- User verifies before 18D.

**18D — Potato crisps**

- Reuse the existing Food Kitchen with Potatoes + Oil rather than adding another dedicated factory.
- User verifies before Tier 4 balancing.

**Tier 4 balance gate:** tune the whole tier toward roughly **60–90 minutes**, then require explicit user approval before Tier 5.

### Step 19 — Tier 5, one route at a time

Again, each route is its own user-approved change set:

**19A — Rice**

- Prototype specialized paddy/land/water interaction first.
- Only then add rice machinery and 5–6 minute initial growth timing.

**19B — Grapes**

- Prototype permanent vineyard rows and narrow-machine navigation.
- Treat ~6–8 minutes as a starting interval only if vines persist between harvests.

**19C — Fabric**

- Add Textile Workshop specialist island using Cotton → Fabric.

**19D — Apple pies**

- Reuse Bakery with Flour + Apples + Eggs → Apple pies.

**Tier 5 balance gate:** target roughly **60–90 minutes** and verify the final tier requires integration without requiring every possible island or route.

### Step 20 — Add the settlement completion state and free play

**Goal:** make finishing the five tiers feel like establishing the settlement, not exhausting the game.

**Implementation:**

- Completing any 3 of 4 Tier 5 requirements triggers a clear settlement-complete state.
- Visibly develop the Settlement Island enough that completion has a physical payoff.
- Keep the same Farmipelago playable afterward.
- Do not lock remaining requirements, specialist islands, opportunities or farming systems.
- No macro failure state is introduced.

**User verification gate:** the ending feels conclusive enough to count as a win while still making free play attractive.

### Step 21 — Implement mastery milestones separately from settlement progression

**Goal:** preserve the earlier division between capability progression and efficiency rewards.

**Implementation:**

- Add only a small first set of mastery milestones after the core campaign works.
- Rewards should improve established work: trailer capacity, wider/combined tools, handling convenience, information, etc.
- Never make a milestone unlock the activity required to earn that milestone.
- Keep milestone presentation secondary to the settlement tier UI.

**User verification gate:** rewards feel useful but do not compete with settlement tiers as the main progression system.

### Step 22 — Full campaign pacing pass toward the ~5-hour target

**Goal:** tune the complete game only after all major loops exist.

**Implementation:**

- Play from a fresh seed without Debug shortcuts.
- Measure actual time spent farming, waiting for growth, inspecting islands, transporting, processing and waiting on RNG.
- Tune quantities before adding extra waiting time.
- Tune growth times only where field rhythm needs adjustment.
- Tune island cadence/opportunity frequency only where RNG is causing waiting or removing meaningful choice.
- Do not force every tier to hit its estimate exactly; the **whole first completion** is the main target.
- Preserve an experienced-player path around **2.5–3.5 hours** if skill, planning and favorable island choices allow it.

**Final user verification gate:** a normal first-completion playthrough should land near **five hours**, with the time coming from varied farming and Farmipelago decisions rather than repeated quotas or idle waits.

### Implementation rule for all future Codex sessions

When using this plan, Codex should always identify the **single current step**, implement only that step, build it, describe exactly what changed, and provide the manual checks listed for that step. It must then stop. The next step begins only after the user reports that the current step is accepted or explicitly asks for revisions/progression to the next gate.
