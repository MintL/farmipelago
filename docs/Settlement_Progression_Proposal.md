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
