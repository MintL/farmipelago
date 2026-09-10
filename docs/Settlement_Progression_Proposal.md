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

Every step should follow `AGENTS.md`: increment the displayed build version for player-visible changes, run `npm run build`, preserve existing saves where practical, update the GDD after every step to reflect current game behavior and design, and leave the relevant manual verification checks for the user. Do not automate gameplay verification unless the user explicitly requests it.

The implementation should build on the existing boundaries rather than create a second progression stack. In particular, evolve `src/gameplay/progression/index.js` for settlement progression, the catalogs under `src/gameplay/catalog/` for crops/equipment/goods, the current Settlement Storehouse delivery flow for progression submission, and the existing drifting-island runtime/scheduler for island opportunities.

Keep implementation status, build versions, approvals, migration assumptions and verification history in this proposal’s implementation record. Keep the GDD focused on game design and current behavior.

### Implementation record

Steps 0–7 are approved. Step 8 is prepared for review, not implemented.
Weed damage and sprayed-ground coloring remain on hold at the user’s request. Steps 1–2 were
committed as `17e9dcd` on `feature/drifting-islands`.

This record owns build versions, approval history, migration assumptions and
verification notes. The GDD owns current game behavior and intended design.

**Step 0 — Baseline approved by the user (2026-09-09).**
The baseline is `feature/drifting-islands` at commit `0795093`, displayed build
`0.353`. Both production builds in `npm run build` pass; Vite reports a large
bundle warning. This step changed documentation only, so the displayed version
and gameplay remained unchanged at the baseline gate.

Pre-Step-1 save assumptions recorded at the baseline:

- Browser storage uses `farmipelago.gameState.v2`, with `schemaVersion: 0`.
  The older `farmipelago.gameState` key is ignored and left untouched. The npm
  package version and displayed build number are separate from the save schema.
- At the baseline, progression saved `{ kind: 'village', tier: 1, stock, earnedGates,
  overrideGates }`. Wheat, Barley and Canola each target 3,600 L and consume
  60 L per active minute. Stocks can exceed the target; no permanent requirement
  completion or historical delivery total is recorded. Migration cannot infer
  previously delivered-and-consumed quantities from stock alone.
- Earned capability gates persist separately from Debug overrides. The loader
  also recovers legacy milestone unlocks from `index` / `collected` and reads
  legacy `delivered` amounts. Later migration must preserve earned capabilities
  without promoting Debug overrides into earned unlocks.
- Field saves retain tile keys, ploughed state and crop ID, stage,
  `stageElapsed` and weeds. Reload reconstructs the active stage clock; mature
  crops remain mature, with no offline growth catch-up.
- Attached islands, their land content, bridges and pending attachments belong
  to world state. Passing islands save scheduler clocks, identity, seed,
  generation settings, position, route/progress, encounter role and collision
  reservations under `environment.encounters`; travel state is saved separately.
  Older saves without passing-island locations can start new approaches.

The baseline gate was approved by the user. Its manual checklist covered: verify the Farm + Settlement opening;
plant, harvest and deliver Wheat, Barley and Canola; connect and release passing
islands; and exercise existing livestock and Debug capabilities. The contributor
checklist also remains pending for driving/jumping/rescue, terrain and bridge
collision, plough counting/reset and portrait touch controls. Build success does
not establish that these gameplay checks pass.

**Step 1 — Implemented in build 0.354, approved by the user.**
Both production builds pass, with the existing large-bundle warning. Gameplay
verification remains manual under the contributor guide.
Permanent capped requirement totals and completion replace draining stocks in
the existing progression module. Soybeans joins the starter unlocks. The existing
popup was adapted for four crops and a Tier 1 completion/optional-route label;
Step 2 below supersedes that initial presentation. No Tier 2
transition, growth-time change or encounter-cadence change is included.

Step 1 manual gate: plant all four crops, deliver exact totals, leave them through
active play without decay, complete any three, check the optional fourth route,
and refresh to confirm permanent progress and retained unlocks. Check that a
near-complete requirement takes only its remaining litres, leaves surplus cargo
in the vehicle and disables further delivery after completion. Repeat popup
interaction with keyboard and a portrait touch viewport.

**Step 2 — Implemented in build 0.365, approved by the user.**
Both production builds pass, with the existing large-bundle warning; the diff
whitespace check also passes. No automated gameplay verification was performed.
The storehouse now presents a compact two-column requirement grid, with persistent
exact delivered/target quantities beside a separate completion status. Completed
cards use a checkmark, a muted green background and **Complete**, rather than a
stock-fill meter. The regular-weight “Complete any 3 of 4” rule stays visible throughout;
there is no redundant completed-count/optional-crop summary. A **Tier 1 complete**
message appears only on completion, and the remaining unfinished crop name and
quantity receive strikethrough instead of an Optional label, with the same green
background as completed cards. Its hidden status retains its space for equal
card height. Cards are read-only; the round silo-style Deliver action detects
carried cargo automatically. The popup is 240 pixels wide. Delivery to the
remaining requirement stays available.

The preview shows only **Unlocks: Hay farming & equipment**, a compact summary
of the proposal’s direct guaranteed grass/hay and equipment capabilities. The
copy comes from progression data. Per the user's UI direction,
it omits the next tier title, requirements, island archetypes and availability copy.
No Tier 2 transition or new capability is granted. Save data remains unchanged.

Step 2 manual gate: confirm that requirements and the optional route are clear
without explanation; completed cards look permanent and retain their quantities;
the next-development preview is understandable; and automatic cargo detection/Deliver remain
usable with keyboard and portrait touch controls. Check the popup near both
screen edges and above driving controls. Gameplay checks are left manual under
`AGENTS.md`; the broader contributor regression checklist remains applicable.


**Step 3 — Implemented in build 0.367, approved by the user.**

- Added `src/gameplay/catalog/settlement-tiers.js` for requirement identities,
  units, targets, completion counts, guaranteed gates, direct-unlock preview copy
  and eligible island categories. Only Tier 1 and Tier 2 are defined so far.
- Completing any three Tier 1 requirements advances immediately to Tier 2.
  Existing completed Tier 1 saves advance on load. The old tier's requirement
  history remains saved; surplus cargo stays in the vehicle.
- Tier 2 earns `crop:grass` and `equipment:hay`: unlimited Grass seed, both
  mowers, baler and bale fork. Workshop, seed controls and Debug presentation
  update at transition. Tedder, settlement hay delivery and crate handling
  remain later content work; existing hay machinery is used here.
- Tier 2 shows unavailable Hay, Eggs, Flour and Vegetable oil placeholders.
  Provisional targets are 3,600 L for Hay/Flour/Oil and 24 Eggs. These are UI
  descriptors, not plantable crops or new inventory goods. No Tier 3 is defined.
- Chicken-farm, windmill and oil-press eligibility is exposed by progression
  state and a category query for future generation. No specialist island or
  building is created, and the encounter pool/cadence is unchanged.
- Save schema stays 0 under the existing key. `progression.tiers[tier].requirements`
  retains per-tier histories alongside the active tier. Flat settlement
  requirements, village stock and legacy delivery/gate migration remain supported.
  Debug overrides cannot advance tiers; only gates specified by an opened tier
  become earned, with their redundant overrides removed. Unrelated overrides
  remain separate and clearable.
- Restored explicit vertical centering of card icons and names after the
  change from buttons to read-only elements removed inherited button alignment.
- Both production builds pass with the existing large-bundle warning. Gameplay
  checks remain manual; no scripted input or synthetic saves were used.

**Manual gate:** complete the third Tier 1 requirement and confirm one transition,
retained surplus cargo, immediate Grass/mower/baler/bale-fork access and four
unavailable Tier 2 cards. Reload both an already-completed old Tier 1 save and a
new Tier 2 save. Clear Debug overrides and confirm earned hay access remains
while unrelated overrides clear; enabling Debug alone must not advance Tier 1.
Confirm no specialist building appears. Check desktop and portrait interaction
and the contributor regression checklist. Stop for approval before Step 4.

**Step 4 — Growth timing implemented in build 0.368, approved by the user.**

- Crop catalog now owns normal/fast durations. Wheat, Barley, Canola and Soybeans
  use 180/9 seconds from planting to maturity. Corn retains 9 seconds and grass
  30 seconds in both modes pending later balance work.
- Debug Fast growth defaults on, persists in `ui.fastGrowth`, and remaps current
  stage progress when switched. Mature crops remain mature.
- Saves use fractional `stageProgress`; older `stageElapsed` seconds migrate
  against the original fast durations. Save schema remains 0.
- Released islands freeze crop progress, carry field snapshots while drifting
  or reconnecting, and resume at the selected speed on attachment. These snapshots
  also restore crop and ploughed-field visuals after reload.
- The user paused weed design during implementation. Partial yield/spray-color
  changes were removed; existing weed generation, removal and yields remain intact.
- Both production builds and the diff whitespace check pass. The existing bundle
  size warning remains. Gameplay verification is manual, with no automated input
  or synthetic save tests. Use the Step 4 manual gate below before Step 5.

**Step 5 — Island cadence implemented in build 0.369; approved with refinements through 0.372.**

- Changed the suitable-shore arrival target from 60 seconds to 30 active seconds,
  with a seeded 24–36-second interval per candidate, independent of terrain
  generation randomness. Existing approach-time subtraction and spacing after
  already approaching islands remain in use; this is not a spawn interval.
- Kept full-route reservation, shore/traffic clearance, off-screen launch checks,
  common cruise speed, two approaching encounters and the 48-island active cap.
  Blocked routes retain the existing delayed retry; generation and visual
  preparation keep their existing sliced work budget. No forced arrivals.
- Save schema stays 0 with no new fields. Published islands restore their saved
  positions/routes/reservations; new candidates use the shorter target. Existing
  active-time clocks, pause/hidden-tab behavior and no offline catch-up remain.
- Implemented directly on `feature/drifting-islands` after approved commit
  `3b5f0d3`. Preserved the pre-existing uncommitted storehouse roof correction.
  Fast growth stays on by default and the compact read-only storehouse UI is
  unchanged. No Step 6 goods, specialists, processors or held weed work included.
- Verification: `npm run build` passed both game and standalone island-debug
  production targets; the existing large-chunk warning remains. `git diff --check`
  passed. The development server started for manual playtesting. No automated
  gameplay verification, browser automation, scripted input, synthetic saves or
  test-only hooks were used.

**Step 5 playtest correction — build 0.370; approved.**

- Fixed departures stopping at an old camera boundary after the camera moved.
  Visible exit endpoints now extend along the same heading beyond the current
  buffered view, with extra look-ahead clearance. Extensions preserve full route
  reservations and check land, shore and moving traffic before admission.
- Existing saved routes can extend too; released islands keep their descent.
  Actual collision obstructions still cause a safety stop.
- Verification: both production builds and `git diff --check` passed; the existing
  bundle-size warning remains. Gameplay verification remains manual. Manual checks:
  follow departures while driving, rotating, zooming and panning in build mode;
  include released islands and reloads on desktop and phone-sized viewports.

**Step 5 pacing refinement — build 0.371; approved.**

- User requested faster encounters after noticing islands on the far side.
  Arrival target is now 20 active seconds, varying 16–24 seconds.
- Search encounter placements nearest to the active vehicle first; compactness
  breaks distance ties. Current-view checks, straight routes, departure extension,
  shared speed, population limits and collision reservations remain in place.
  Movement after launch can still leave an island behind; blocked routes delay arrivals.
- Verification: both production builds and `git diff --check` pass (existing
  bundle-size warning). Manual playtest: assess
  visible nearby encounter frequency from both sides of the Farmipelago, moving
  between fields, route clearance and performance on desktop and mobile.

**Step 5 Debug control — build 0.372; approved.**

User approved Step 5 and requested commit and advancement on 2026-09-09.
Build and whitespace checks passed; no automated gameplay verification was run.

- Added saved, default-off Island speed ×10 toggle for passing/released island
  cruise. Encounter clocks, growth and environmental travel remain unchanged.
- Both production builds and `git diff --check` pass (existing bundle-size
  warning). Manually check toggling, reload persistence,
  departures and collision clearance at boosted speed on desktop/mobile.

**Manual checks / approval gate:** during normal farming, assess encounter
frequency, whether rejecting an island feels comfortable, and whether arrivals
leave field work uninterrupted. Check collision clearance, route validity and
performance through a full flow cycle, connections and releases; also check
reloads, pause/hidden tabs and reduced motion. Run desktop and phone-sized
regressions for initial spawn/regeneration, driving/jump/rescue, bridges/plateaus,
plough counting/reset and reachable HUD/touch controls. Stop for Step 5 playtest
approval; do not commit or begin Step 6.

**Step 6 — Initial bulk prototype in build 0.373; superseded by pallets below.**

- Shared goods catalog separates product identity/category from compatible storage.
  Existing crops support combine and bulk storage; milk remains liquid; Flour
  supports bulk storage only. Grain Trailer is bulk storage, with capacity unchanged.
- Silos normalize/save separate crop and Flour quantities; trailer restore uses
  catalog compatibility. Existing quantity maps and save schema remain unchanged.
- Added Debug-only Add 1,000 L Flour action, capped to free trailer space, refusing
  other cargo, incompatible equipment and active transfers. Feedback is shown in
  Debug. Flour has a sack icon and pale transfer effects in existing logistics UI.
- Crop-only seeding/harvesting stays separate. No Windmill, processors, Step 7
  opportunities or normal Flour delivery; Tier 2 placeholders remain unavailable.
- Both production builds pass with the existing bundle-size warning. Gameplay
  verification is manual; no browser automation, scripted input or synthetic saves.

**Step 6 revision — Physical Flour pallets in build 0.374; superseded design.**

- User requested pallet transport and explicitly replaced Flour's silo/trailer
  handling. Packaged products use pallet units. Flour is the first implementation:
  wooden pallet and stacked sacks, one pallet per load, with a 1-pallet HUD.
- Enabled Pallet Forks with Tier 2 / Debug hay equipment. Lowered forks pick up
  one Flour pallet while driving; raising carries it, lowering places it. Reuses
  the physical cargo body and pickup/drop lifecycle, with separate product identity
  and visuals. Bale forks and barn feed reject Flour pallets.
- Debug creates one pallet directly on empty forks. Saves preserve placed/carried
  pallets and cargo on released/pending-attachment islands. Release reservations
  include pallet bounds. Existing bulk Flour converts at 1,000 L per pallet,
  rounding partial pallets upward. Flour is removed from silo/trailer compatibility.
- Flour requirement now uses a provisional 4-pallet target and remains unavailable.
  No processor, pallet delivery or flatbed yet; flatbed transport is the agreed
  follow-up after basic pallet handling is approved. Weed work remains on hold.
- Verification: both production builds and `git diff --check` pass. No
  automated gameplay checks; the existing bundle-size warning remains.

**Revised pallet direction — automatic flatbed transfers; implemented in 0.375, approved as a Debug prototype.**

- Packaged products are counted as pallets in a building's stock HUD, e.g.
  Windmill → Flour: 4 pallets. They are not loose objects the player must handle.
- Drive a compatible flatbed within range and use **Load**. Pallets animate from
  the building onto available trailer positions, then remain visible as cargo.
- At a compatible destination, use **Unload** (or Deliver at the storehouse).
  Pallets animate from trailer to building and the corresponding counts update.
- Transfers respect whole-pallet quantities, available stock, trailer capacity
  and destination acceptance. Cancellation, moving away or reload must preserve
  quantities without duplication or loss.
- Remove the manual Flour pallet/fork loop from the active implementation.
  Hay-bale handling is separate and remains unchanged. Flour still cannot enter
  silos or Grain Trailers. A flatbed is part of this revision, not a later
  addition to a manual-handling system.
- Windmill production still belongs to Step 8. Step 6 should establish the
  flatbed inventory and animated transfer behavior using Debug stock, without
  claiming a working Windmill exists already.

**Revised Step 6 approval gate:** load/unload whole pallets through nearby HUD
controls, check the visible trailer load and animations, capacity and stock
limits, interruption/reload conservation, and desktop/mobile controls. Review
this revised implementation before proceeding to the island opportunity system.

**Step 6 automatic transfer revision — build 0.375; approved as a Debug prototype.**

- Retains the shared goods catalog and sack-pallet visual. Removes the superseded
  manual Flour physics, fork pickup/drop, Debug spawn and island-cargo loop;
  Pallet Forks are unavailable. Hay's original handling is restored unchanged.
- Adds a four-slot Flatbed in the workshop, using the existing tow articulation,
  animated wheels and saved hitch angle. Its HUD shows whole pallets out of four;
  loaded equipment cannot be removed. Pallets remain visible on deck.
- Minimal Debug fixtures reuse Workshop and Storehouse stock points. **Add 4
  Flour pallets** adds to Workshop stock. Its nearby labeled Load/Unload HUD and
  the eight-slot Debug Storehouse receiver exercise both directions without a
  Windmill, new building, opportunity or settlement completion route. The receiver
  appears for flatbeds, preserving normal crop delivery UI for other vehicles.
- One pallet animates at a time, with atomic inventory updates on arrival.
  Grounded state, deck range (five tiles), destination acceptance, source count
  and receiving capacity are checked for each unit. Cancel, range loss, jump,
  vehicle/loadout switching and build/cinematic modes interrupt safely. Pause
  freezes active transfers. Refresh cancels only the uncommitted unit, still
  owned by its source; completed units remain saved at their destination.
- Saves retain both building stocks and trailer cargo. Migration consumes former
  bulk Flour at one pallet per 1,000 L rounded up per inventory, and manual Flour
  records from world/attached/released/pending islands into Workshop stock.
  World/island duplicate records count once, carry references clear, and removed
  legacy representations cannot migrate again. Capacity overflow recovers to
  Workshop stock. No synthetic save fixtures were created or run.
- Flour remains excluded from seeds, combines, silos, Grain Trailers and normal
  settlement delivery. Tier 2 target stays provisional at four unavailable pallets.
  Steps 7–8, weed changes and further progression remain out of scope. Approved
  Step 5 cadence, departure behavior and Debug defaults remain intact. The separate
  uncommitted storehouse roof/gable correction is preserved without modification.
- Verification: game and standalone island-debug production builds pass;
  `git diff --check` passes. Existing large-bundle warning remains. No browser
  automation, scripted gameplay, synthetic saves or gameplay hooks were used.

**Manual playtest checklist:**

User reported that the Debug prototype works and approved commit on 2026-09-10.
This is approval of the logistics prototype, not a claim that normal Windmill
production or settlement pallet delivery is implemented. Individual checks below
were not separately reported; automated gameplay checks were not run.

1. Refresh to 0.375. Pause → Debug → Add 4 Flour pallets, then resume. Enter the
   Workshop with the tractor, equip Flatbed, leave the bay and stop its deck
   within five tiles of the workshop door. Load: verify four visible arrivals,
   source decrement, four-slot HUD, empty-stock and full-trailer limits.
2. Drive to the Storehouse front yard. In Debug Storehouse stock, Unload and
   verify four departures and receiver increment. Repeat with four more Debug
   pallets to reach receiver capacity eight, then check unloading is blocked.
   Load from that receiver and return cargo to Workshop to repeat freely.
3. Cancel, jump or leave range during either animation; switch vehicles, pause,
   enter build mode, and refresh during a transfer and while parked. Check total
   Workshop + Flatbed + Storehouse stock is conserved except for explicit Debug
   additions. Reload any existing 0.373/0.374 save to review migration, then reload
   again to verify no repeated recovery. Check old hay still feeds cattle.
4. Drive forward/reverse through turns, cross the bridge, jump/rescue, switch
   vehicles and refresh: check deck cargo and attachment alignment. Try changing
   equipment while loaded; it must be refused. Silos/Grain Trailers cannot accept
   Flour, normal crop transfers still work, and Tier 2 Flour remains unavailable.
5. Repeat on desktop with WASD/arrows, Space and Tab + Enter/Space for buttons,
   and on a phone viewport with the virtual stick and touch buttons. Verify HUD
   bounds, safe areas, reachable controls and no scrolling/zoom regressions.
   The wider AGENTS.md manual checklist (spawn, regeneration, terrain collisions,
   plough count and rescue) also remains for a person to perform.

**Step 6 approved for commit. Prepare the Step 7 summary before implementation.**

**Step 7 — Reusable island opportunities, build 0.380; approved for commit.**

- Added data-defined island services with alternative inputs, output stock, tier
  eligibility and trade limits. Old Miller is the first definition: Tier 2,
  seeded 50% chance, 1,800 L Wheat OR Barley for four Flour pallets, once per island.
- Service generation uses a clear, level small-island preset; the voxel stall,
  sign, collider runs and reserved access area exist before route planning.
  Existing islands retain their saved service state or absence; no rerolls.
- Normal selection and connection controls are unchanged. A connected service's
  local stock port becomes available within five tiles. Trade recognizes a full
  grain load, animates it and commits payment/output atomically. Surplus remains.
- Flatbed Load uses the general service ports. Flour settlement delivery is now
  available and commits single pallets up to the four-pallet target. Empty/full,
  range, grounded, equipment and interruption checks guard each transaction.
- Service completion/stock serialize in attached, drifting and pending-attachment
  records. Releasing/reconnecting cannot reset a completed trade. No Windmill
  production, Step 8 work or weed changes are included.
- Removed Debug inventories, receiver and Add Flour control. Old stock merges
  into a load-only Workshop recovery inventory, hidden after depletion. Existing
  flatbed cargo stays aboard; migration deduplicates old manual pallet records.
- Verification: both production builds and `git diff --check` pass; the existing
  large-bundle warning remains. Gameplay remains manual; no browser automation,
  scripted input or synthetic saves were used.

**Trading UI refinement — build 0.386; approved for commit.** The stall now uses
the settlement panel’s compact sizing, crop cards and typography, with an explicit
Receive row and silo-style action controls beneath. Completed trades show green
status and remaining stock. Mobile positioning includes the external controls.

**Settlement UI correction — build 0.387; approved for commit.** Flour now uses
the existing four-requirement settlement panel and round Deliver control.
Flatbed cargo is recognized automatically; the control becomes Cancel during
pallet delivery. The separate Flour delivery popup is removed.

**Transfer button consistency — build 0.388; approved for commit.** Pallet Load,
Unload and Cancel share the silo’s round icon-only button styles, retaining
tooltips and accessible labels. Trade retains its text label.

**Hay delivery — build 0.389; approved for commit.** Enabled the existing Tier 2
Hay requirement through the normal settlement Deliver button. One carried bale
on a bale fork supplies 3,600 L; delivery consumes it immediately and records
completion. Grounded state, receiving range, whole-bale capacity and already
completed requirements are checked. Manual checks: deliver a bale, retry after
completion, reload, and verify grain/Flour delivery still use the same panel.

**Enable all settlement requirements — build 0.390; approved for commit.** All
current delivery requirements are enabled, with normal progress states and
product icons instead of Unavailable labels and locks. Eggs and Vegetable oil
production remain future work. Both production builds and `git diff --check`
pass; gameplay verification remains manual.

**Flour display units — build 0.391; approved for commit.** Show Flour in litres
throughout the settlement, offer, stock and loaded flatbed HUDs: 1,000 L per
pallet, 4,000 L for Old Miller and the requirement. Physical transfers and saved
counts stay in whole pallets, preserving existing cargo and progress.

**Hay target — build 0.392; approved for commit.** Increase Hay to four bales
(14,400 L), delivered one at a time. Existing completed requirements remain
earned under the normal save rules; incomplete progress retains its litres.
Both production builds and `git diff --check` pass; the four-bale delivery check
remains manual.

**Bale fork orientation — build 0.393; approved for commit.** Rotate carried bales
90° around the vertical axis. Release preserves that orientation while keeping
the vehicle-relative drop motion. Builds and diff checks pass; pickup, turning
and release alignment remain manual checks.

**Step 7 approved for commit**, including the subsequent UI, delivery, quantity
and bale-orientation refinements. Build and diff checks pass; only user-performed
gameplay checks apply, and no automated gameplay verification was run.

**Next: Step 8 — Windmill specialist island.** Reuse island service definitions
and persistent local ports for a Tier 2 island with repeatable Wheat-or-Barley
to Flour production. Operate only while connected; collect 1,000 L pallets with
the flatbed and deliver through the normal settlement panel. Preserve Old Miller
as the one-time fallback. Batch quantities, production duration and encounter
weight need to be settled during Step 8 planning. Do not implement until approved.

**Step 7 manual checklist:** in Tier 2 connect an Old Miller island normally, Trade
one full grain input, return with Flatbed, Load four pallets and Deliver them.
Repeat on another island with the alternative crop. Verify wrong/insufficient
cargo, surplus, capacity, canceled/reloaded animations, release/reconnect at all
stages, independent service stocks, old-save recovery and disappearance when
empty. Check stall/bridge collision and access, trailer alignment, existing crop,
hay and milk interactions, desktop/phone UI and the contributor regression list.
Stop for approval before commit or Step 8.

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

**Goal:** introduce intended crop growth timing while keeping fast iteration available.

**Implementation:**

- Put growth duration in crop catalog data rather than one global magic number.
- Set Wheat, Barley, Canola and Soybeans to approximately **3 minutes** initially.
- Keep later target bands documented but do not add crops merely to test them.
- Persist crop timing so refresh preserves growth and mature crops without offline growth.
- Keep unlimited seeds once a crop gate is earned.
- Add a **Fast growth** toggle in Debug, **on by default**. On retains today's
  timing: 3 seconds per ordinary crop stage and 10 seconds per grass stage.
  Off uses normal catalog durations. Corn and grass retain their existing timing
  until their later balancing steps.
- Persist the setting; missing settings default to on. Switching modes preserves
  the current stage and its fractional progress.

**User verification gate:**

- Fast growth off: early crops take roughly three active minutes to mature.
- Fast growth on: early crops retain today's nine-second full cycle; default is on.
- Toggle preference survives reload; switching mid-growth preserves stage progress.
- Refresh and island release/reconnection preserve crop stage and progress;
  mature crops stay mature, with no offline growth or travel-time catch-up.
- The player has time to work elsewhere while crops grow, and three minutes feels playable.

**Stop here until the user approves the growth rhythm.**

**On hold — weed design, excluded from this implementation at the user's request:**

- Weeds remaining when a non-grass crop enters stage 3 would permanently reduce
  that planting's harvest to **75% of normal rolled yield** (a 25% loss), rounded
  to the nearest whole litre. Earlier removal would avoid damage; later removal
  would not undo it. Damage would persist through reload and island movement,
  reset for a new planting, and apply in both growth modes.
- Every sprayed tile would get darker ground, including weed-free tiles, to show
  coverage. Treatment would persist through reload and reset when preparing a
  new planting. Treatment appearance would be separate from weed damage.
- These ideas require further design review. Do not implement them as part of
  Step 4 unless the user explicitly resumes them.

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
- Add **Flour** as the first non-crop test good behind Debug only. User refinement:
  Flour uses pallet units in building inventories and automatic animated
  loading/unloading on a flatbed; it must not use manual forks, silo storage
  or Grain Trailer bulk storage.
- Do not create a Windmill yet.

**User verification gate:**

- Existing crop inventories and transfers behave exactly as before.
- Debug Flour stock loads/unloads onto a flatbed with animated pallets and correct counts.
- Flour never appears in seed selection or combine harvesting.
- Persistence handles mixed goods correctly.

**Stop here until the user approves the generalized goods model.**

### Step 7 — Add a reusable one-of-two island opportunity system

**Goal:** prove the visible bad-RNG fallback before building many specialist islands.

**Implementation:**

- Give eligible passing islands an optional opportunity descriptor with two accepted inputs, required quantities, one output/reward, completion state and one-shot/batch limit.
- Add a compact contextual opportunity UI near the selected island/building; do not create a global quest log.
- First prototype: **Old Miller**, on 50% of new Tier 2 encounters, accepts a full
  1,800 L Wheat **or** Barley load once and provides four Flour pallets. Connect
  normally before trading; do not add a separate connection/trade interaction.
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
