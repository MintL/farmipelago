# Attachment prototype verification

Run from the repository root:

```sh
node artifacts/island-attachment/logic-check.mjs
node artifacts/island-attachment/jump-envelope.mjs
node artifacts/island-attachment/make-playable.mjs
npm run dev
```

Open `/artifacts/island-attachment/interaction.html` for the isolated selection,
attachment and release loop. `/artifacts/island-attachment/playable.html?route`
uses the real game and camera with a deterministic encounter that must use the near shore rather than
traveling around the starter islands. `/artifacts/island-attachment/phone.html` embeds the real controls at
390 × 844. Fixtures intentionally hold one encounter still for repeatable clicking;
production drift is unchanged by them. Generated fixture files are not build entries.

Verified in Safari: full-island selection, stronger selected outline, placement
ghost, Connect, continuous movement, intro camera, bridge completion, Release and
visible departure. Verified phone-sized preview and reachable contextual and driving
controls. Numerical Rapier checks cover bridge driving, non-colliding passing land,
jump clearance, ploughing once, crop restoration and reconnecting farmed land.
Placement checks cover three-neighbor bay filling, graph articulation/alternate
paths, unreachable destinations, bridge avoidance and every animation frame of a
near-side pull without crossing existing terrain. Expanded and pending attachment saves restore.

Physical-device touch feel and long-session performance with a large Farmipelago
remain playtesting tasks. Placement weights and range live in
`src/world/islands/attachment-placement.js`; footprint routing is isolated in
`src/world/islands/attachment-route.js`.
