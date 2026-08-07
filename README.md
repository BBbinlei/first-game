# Raccoon Heist 3D — 浣熊夜行

A browser-playable 3D stealth game built with Three.js. Sneak a raccoon
through a mansion at night, dodge sweeping guard lasers and a patrolling
flashlight, grab every gem, then slip out through the vault before the
alarm maxes out.

Pure static site — no build step, no server-side code, no external
runtime dependencies (Three.js is vendored in `vendor/`). Just serve the
folder and open `index.html`:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

- **Desktop:** WASD/arrow keys to move, Q/E to turn the camera.
- **Mobile:** on-screen joystick (bottom-left) to move, drag anywhere on
  the right half of the screen to look around.

See `notes.md` for a running dev log of what's been built and why.
