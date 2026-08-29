# Floating Farm Prototype

A phone-first Three.js prototype for a playful farming/driving game on generated floating islands.

## Included

- portrait-first UI
- fixed high-angle camera
- generated archipelago with several islands at different heights
- chunky grass / dirt / stone terrain, tapered underneath
- finer-scale animated tractor
- visible three-blade plough that changes grass tiles into ploughed soil
- small trees, large trees and voxel stones
- left virtual stick for throttle + steering
- jump button; no ramps required
- falling and automatic tractor rescue
- regenerate button for a new procedural farm
- keyboard fallback: WASD/arrows + Space

## Run

The prototype imports Three.js from jsDelivr, so it needs an internet connection.

Serve this folder with any static HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` on desktop, or expose the server on your LAN and open it from a phone.

For a phone-only test, deploying the folder to any static host also works.
