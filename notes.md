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

## 2026-08-07 — Guard patrol, WebAudio SFX, particles, alarm feedback

- Added a second threat beyond the static lasers: a patrolling guard
  (`buildGuard()` in `js/game.js`) that paces back and forth across one
  row of the mansion, swinging a `THREE.SpotLight` flashlight that
  sweeps side to side as he walks. Standing in the beam raises the alarm
  roughly 1.6x faster than a laser touch does, so the guard reads as the
  bigger threat — the "something unexpected" beyond just laser-dodging.
  Detection is a simple cone test (distance + angle to the guard's
  swept facing direction), verified with Playwright by snapping the
  raccoon to the flashlight target's exact world position every frame:
  sustained direct exposure reaches full alarm and busts, brief crossings
  decay back down, matching the intended "time your dash" feel.
- `js/audio.js`: every sound effect is a synthesized WebAudio oscillator
  (footstep tick, gem pickup chime, rising alarm blip while spotted,
  a descending buzzer on bust, an ascending arpeggio on heist-complete)
  — no audio files, so nothing else to fetch over a network that's
  mostly unreachable from here anyway. The AudioContext is created/resumed
  inside the Start button's click handler so it's unlocked by a genuine
  user gesture (autoplay policies block anything earlier).
- Gems now leave a brief gold particle burst on pickup (`spawnBurst`/
  `updateBursts` in `js/game.js`), and the alarm bar's rise now also
  drives a red screen-edge vignette (`#alarmVignette` in style.css) plus
  a small camera shake that scales with alarm level, so getting spotted
  actually *feels* like something's wrong instead of just moving a bar.

### Next up
- Mobile QA pass with touch emulation at phone viewport sizes.

## 2026-08-07 — Mobile QA pass + polish

- Playwright pass across iPhone SE (smallest current phone, 320px CSS
  width), iPhone 13, Pixel 7, iPad Mini, and iPhone 13 in landscape:
  title screen and gameplay both render with zero console errors, zero
  horizontal overflow (`document.documentElement.scrollWidth ===
  clientWidth` on every size), and the joystick/HUD never overlap each
  other or clip off-screen at any of those sizes.
- Re-ran the full win path (collect all 10 gems → vault opens → escape)
  on mobile end-to-end after the guard/audio/particle changes, to make
  sure nothing in that pass regressed the core loop. Still clean.
- Swept all of `js/` for leftover debug hooks / stray `console.*` calls
  used while testing during development — none left in what's committed.
- Rewrote `README.md` (was a one-line placeholder) with what the game
  is, how to serve it locally, and controls for both input methods.

At this point the game has: an animated 3D title screen, a full
stealth level (lasers + patrolling guard + loot + vault escape),
procedurally textured art (no external assets, since the OpenAI image
API isn't reachable from this sandbox — see the first entry above),
synthesized WebAudio sound effects, particle/vignette/camera-shake
feedback, and unified keyboard+touch controls confirmed working on
phone, tablet, and landscape layouts.

## 2026-08-07 — Low-poly art direction pass (moodboard reference)

- User shared two reference images: a low-poly/faceted stylized raccoon
  holding a glowing gem under a big moon, and a screenshot of Simon
  Willison's 2022 "Raccoon Heist" GPT-3+DALL-E demo (unrelated tooling,
  same theme by coincidence — amusing, given what this project already
  is). Read both as art direction, not literal assets to embed.
- Applied `flatShading: true` across every `MeshStandardMaterial` in
  `js/game.js` and `js/title.js`, and swapped most `SphereGeometry`
  instances for low-subdivision `IcosahedronGeometry` (plus trimmed
  cylinder/cone radial segment counts) so the raccoon, guard, gems,
  vault, and pillars all read as faceted low-poly forms instead of
  smooth-shaded blobs — much closer to the moodboard.
- Added a big low-poly moon (icosahedron + soft additive-ish halo
  sphere) to the title-screen sky, and gave the title screen's
  silhouette raccoon a small glowing held gem with its own point light,
  as a direct nod to the reference raccoon cradling loot.
- Hit one regression while doing this: giving the moon its own
  `PointLight` (in addition to the emissive material making it glow)
  blew out the scene's lighting balance and made the vault centerpiece
  render as a dim sliver instead of the bright glowing disc it's meant
  to be. Fix was simply to drop the extra light — the moon only needs
  to be self-illuminated via emissive material, not to actually light
  the rest of the scene. Re-verified the full win path on mobile after
  the fix; still clean.

## 2026-08-07 — Night progression + guard dog (smell-based tracking)

- Added a "night" counter (`js/main.js`, in-memory for the session —
  winning a heist increments it and returns to the title screen instead
  of a full page reload, so it persists across attempts without needing
  localStorage). The title screen and in-game HUD both show the current
  night. A `?night=N` URL param lets you jump straight to a given
  night — handy for testing, and for previewing later content directly.
- From Night 3 onward, `js/game.js` spawns a guard dog (`buildDog()`):
  low-poly brown hound, red spiked collar, wagging tail, patrolling
  between random points in the mansion when it hasn't picked up your
  scent. Detection is deliberately **smell-based, not sight-based** — a
  flat distance check with no angle/line-of-sight test at all: within
  12 units it switches to tracking and beelines for the raccoon's
  current position (barking periodically, via a new `playBark()` in
  `js/audio.js`), showing a 👃 sprite over its head (a tiny canvas-
  rendered emoji texture on a `THREE.Sprite`); past 17 units it gives up
  and goes back to wandering. Contact within ~1 unit while tracking
  raises the alarm faster than either the lasers or the guard's
  flashlight, on the theory that a dog that's caught up to you is the
  most immediate threat of the three.
- Bust messages are now attributed by source instead of one generic
  "Busted!": the danger-checks (`noteDanger`) now record which hazard
  produced the frame's alarm increase — `headlights` (the sweeping red
  laser beams), `guard` (the patrol guard's flashlight cone), or
  `hound` (the dog) — and `endGame(false, source)` shows a distinct
  title/body for each.
- Verified the wander → track → give-up → caught flow with Playwright,
  and hit two test-methodology traps worth recording (not game bugs):
  (1) teleporting the test raccoon a fixed "+20 in X" offset from the
  dog routinely landed *outside* the room's actual X bounds, so the
  game's own edge-clamp pulled it back near the dog — every "the dog
  won't give up" result was really the test breaching the room, not a
  broken give-up radius; fixed by teleporting to a fixed in-bounds
  corner instead of an unchecked offset. (2) Sitting the raccoon on a
  laser's *starting* x-position and checking sometime later found the
  beam long since swept away — same non-bug, different sweep-timing
  trap as the guard flashlight test earlier. Both fixed by continuously
  reading the hazard's *current* position each tick instead of assuming
  it stays put. With those fixed, the full flow — wander at range,
  track inside 12 units, give up past 17, catch on contact with the
  correct "Caught by the Hound!" message — verified clean, alongside
  regression checks that the laser/guard bust messages ("Headlights"/
  "Guard") and the full win path still work after all these changes.
