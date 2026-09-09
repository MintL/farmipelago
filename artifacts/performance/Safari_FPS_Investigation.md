# Safari FPS investigation — 2026-09-09

The normal game has confirmed synchronous island-preparation hitches, plus an intermittent rendering stall. The measurements below were taken before the fixes.

Follow-up implementation (build 0.351): island generation, candidate searches, and route searches now use resumable preparation with a 2 ms target per update. Shoreline sweeps allocate fewer temporary boxes. Accepted islands and their selection outlines are precompiled with Three.js `compileAsync` before publication. Complete route reservation and launch validation remain in place. Tests and Safari profiling were not rerun, as requested; these captures do not establish post-change performance.

## Method

Ran the normal game in Safari 26.4 at 1324 × 850 CSS pixels, device pixel ratio 2 (the game caps rendering at 1.5). Used an isolated copy of the current working tree, showing build 0.350, served at 127.0.0.1:5199. This origin has its own save storage. The regular game server and save were not used.

Four captures measured animation-frame intervals and wall time spent in update/render stages using `performance.now()`. These are instrumented main-thread timings, not GPU timer measurements or a Safari sampling-profiler recording. Timers were approximately millisecond-resolution. Nested stage durations overlap and must not be added together. The game remained stationary in normal gameplay; driving, large progressed farms, and phones were not tested.

## Findings

| Capture | Sampled frames | Mean frame work | Worst frame work | Finding |
| --- | ---: | ---: | ---: | --- |
| Baseline, 100 seconds after warmup | 5,984 | 2.65 ms | 42 ms | Two 42 ms frames; encounter preparation took 38–40 ms, including 35 ms route planning. |
| Detailed planner, 65 seconds | 3,882 | 2.96 ms | 240 ms | Separate 239 ms render stall; a 36 ms frame included 32 ms encounter preparation. |
| Detailed renderer, 65 seconds | 3,893 | 2.82 ms | 96 ms | 95 ms scene-render stall coincided with shader-program initialization; island generation separately reached 20 ms. |
| Shader queries, 40 seconds | 2,399 | 2.65 ms | 18 ms | Large rendering stall did not recur; scene rendering peaked at 6 ms. |

At 60 FPS, one frame has about 16.7 ms. Low average work therefore conceals visibly slow individual frames.

### Confirmed: synchronous encounter search and island generation

`src/world/islands/drifting.js:193` prepares an encounter inside the normal update. It builds a complete island before checking its suitability. When planning or reservation fails, it disposes the island and retries two seconds later. The baseline recorded 29 encounter planning calls and 34 island-generation calls in 100 sampled seconds.

`planEncounter` at line 147 explores up to 48 placements, their bridge gaps, four offsets, and five headings. Each attempted route can repeat collision, shoreline, traffic, and reservation checks. `outsideStart` at line 135 can walk up to 400 steps to locate a valid offscreen endpoint. All of that runs in the same frame.

The detailed planner capture attributed 29 ms of one frame to planning. Its repeated route-clearance calls accumulated 11 ms, shoreline-clearance calls 8 ms, and exit-endpoint searches 13 ms. These timings overlap: endpoint searches themselves perform safety checks. The evidence points to accumulated search work, rather than one consistently slow individual collision call.

The attachment pull planner also rebuilds fixed occupancy data for each construction (`src/world/islands/attachment-route.js`). Reusing that data is a possible optimization, but this capture measured only 2 ms there in the cited frame; it is not the entire cause.

### Separate: intermittent rendering stall

Scene rendering stalled for 239 ms and 95 ms in two captures. The 95 ms frame included shader compilation/linking activity, while its shadow pass took only 1 ms. Instrumented compile/link calls themselves returned below timer resolution. First-use shader finalization or a graphics-driver wait is plausible, but the exact blocking call is not established. A subsequent capture with extra shader-query timing did not reproduce the large stall.

Rendering usually took approximately 2 ms of main-thread time. Final sampled scenes reported roughly 1,300–1,400 draw calls and 544,000–564,000 triangles. These are scene snapshots, not GPU duration measurements.

### Not responsible for the measured spikes

Physics steps, save snapshot creation, and save writes each peaked at approximately 1 ms in these captures. This does not rule out higher costs for larger saves or different hardware.

## Recommended changes

1. Turn encounter preparation into resumable work with a small per-frame budget. Preserve the full safety checks and reserve the completed route before publication. Revalidate if the farm or relevant planning state changes while work is pending.
2. Separate lightweight terrain/suitability generation from expensive visual construction, or budget visual construction too. Rejected candidates should not repeatedly construct and dispose full meshes. A 20 ms generation call would still hitch even after budgeting the route search.
3. Reuse fixed shoreline/occupancy data until the Farmipelago changes, and avoid repeating identical route-endpoint searches within an attempt.
4. Investigate first-use rendering independently. Capture Safari/WebGL shader finalization and consider prewarming required material variants while an accepted island is pending. The installed Three.js exposes `renderer.compileAsync`; any change should be validated in Safari before claiming it fixes the stalls.

Do not remove route reservations, collision checks, or change island speed to address these costs. Profile the same scenario after changes and compare worst-frame timings, not just the displayed average FPS.

## Raw captures

- [Baseline](safari-fps-baseline.json)
- [Detailed planner](safari-fps-detailed.json)
- [Detailed renderer](safari-fps-render.json)
- [Shader queries](safari-fps-shaders.json)
