# Dev Notes — Raccoon Heist 3D

Running log of what's built and the calls made along the way. Appended to on every commit.

## 2026-08-07 — Project restructure + title screen

- Split the previous single-file prototype into a proper static bundle:
  `index.html` (entry point), `style.css`, `js/main.js` (boot + render loop),
  `js/title.js` (title-screen scene), `js/game.js` (gameplay — stubbed for now),
  `js/controls.js` (keyboard + touch input), `js/textures.js` (procedural
  canvas textures), `vendor/three.min.js` (vendored, see below).
- **OpenAI image generation is not usable from this environment.** This
  session's egress policy blocks `api.openai.com` (proxy returns 403 on
  CONNECT), and there is no `OPENAI_API_KEY` or OpenAI connector configured
  here either. Decision: generate every texture procedurally at runtime with
  Canvas2D (`js/textures.js` — wood floor, plaster wall, brushed metal,
  raccoon fur, mask fabric) instead of fetched/generated images. This also
  keeps the game a pure static bundle with zero runtime network dependency,
  which fits "static file server, single index.html loads everything" better
  than a live image-gen call would have anyway.
- `vendor/three.min.js` is a vendored copy of Three.js r128 (fetched from
  `raw.githubusercontent.com/mrdoob/three.js`, since CDN hosts like
  cdnjs/unpkg/jsdelivr are also blocked by this sandbox's egress policy).
  Keeping it vendored rather than CDN-linked also means the game works
  offline and isn't at the mercy of a CDN being reachable for players.
- Title screen: animated 3D rooftop backdrop (glowing vault dial, raccoon
  silhouette perched on it, sweeping guard lasers, drifting dust, parallax
  camera sway) behind an HTML title/tagline/Start button overlay. Built as
  its own disposable scene (`RaccoonTitle.create()`) so `main.js` can tear
  it down cleanly once Start is pressed and hand off to the game scene.
- Mobile groundwork: viewport meta locks pinch-zoom, `touch-action: none` +
  `overscroll-behavior: none` stop scroll/bounce hijacking gestures, HUD/
  buttons sized with `clamp()` and `env(safe-area-inset-*)` for notches, a
  virtual joystick + drag-look layer exists in `js/controls.js` and is
  wired up but not yet exercised by real gameplay (next commit).
- `js/game.js` is intentionally a placeholder — empty lit scene — just so
  the Start button has something real to hand off to for this first
  preview. Full gameplay (the mansion, lasers, loot, vault, win/lose loop
  from the previous prototype) gets ported and re-textured next.

### Next up
- Add a patrolling guard, sound effects (WebAudio, no audio files needed),
  pickup particles, alarm screen-shake for extra heist tension.
- Mobile QA pass with touch emulation at phone viewport sizes.

## 2026-08-07 — Full gameplay ported, textured, and touch-controlled

- `js/game.js` now has the real heist level (ported from the earlier
  single-file prototype): mansion room, 4 sweeping guard lasers, 10 gems,
  a vault door that rises open once every gem is collected, alarm meter
  that busts you if you linger in a laser, win/lose overlay.
- Every surface uses the procedural textures from `js/textures.js`
  instead of flat colors: wood-plank floor, wallpapered walls (also used
  on the pillars), brushed-metal vault door with a glowing rim + radial
  spokes (mirrors the title screen's vault for visual continuity), fur
  texture on the raccoon's body/head, mask-fabric texture on the bandit
  mask/ears/legs.
- `js/controls.js` unifies keyboard and touch input: desktop keeps
  WASD/arrows + Q/E, mobile gets a bottom-left virtual joystick
  (drag-to-move, relative to camera facing, same mapping as WASD) and a
  drag-anywhere look zone on the right half of the screen (replaces Q/E).
  Both feed the same `getMove()` / `consumeLookDelta(dt)` API so
  `game.js` doesn't need to know which input device is active.
- Verified with Playwright (desktop + iPhone 13 emulation, touch events
  dispatched via the `Touch`/`TouchEvent` constructors since there's no
  real touchscreen in this sandbox): title → start transition, WASD
  movement, joystick drag movement, look-zone drag rotating the camera,
  full loot-collection win path, and the alarm-maxes-out loss path all
  work with zero console errors.

### Next up
- Add a patrolling guard, sound effects (WebAudio, no audio files needed),
  pickup particles, alarm screen-shake for extra heist tension.
- Mobile QA pass with touch emulation at phone viewport sizes.
