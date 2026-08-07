// Procedural canvas textures — no network/image-generation API is reachable from
// this sandbox (api.openai.com is blocked by egress policy, no key configured),
// so every surface in the game is painted at runtime with Canvas2D instead of
// fetched image assets. Keeps the game a pure static bundle too.
(function () {
  "use strict";

  function makeCanvas(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function toTexture(canvas, repeatX, repeatY) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (repeatX || repeatY) tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  // Polished parquet / marble-veined floor
  function makeFloorTexture({ base = "#3a2f22", plank = "#4a3c29", seam = "#241c14", seed = 7 } = {}) {
    const size = 512;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rnd = mulberry32(seed);

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    const plankW = size / 8;
    for (let i = 0; i < 8; i++) {
      const shade = rnd() * 18 - 9;
      ctx.fillStyle = shadeColor(plank, shade);
      ctx.fillRect(i * plankW, 0, plankW - 2, size);
      // subtle grain streaks
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      for (let g = 0; g < 6; g++) {
        ctx.beginPath();
        const gx = i * plankW + rnd() * plankW;
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + rnd() * 10 - 5, size * 0.33, gx + rnd() * 10 - 5, size * 0.66, gx, size);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = seam;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * plankW, 0);
      ctx.lineTo(i * plankW, size);
      ctx.stroke();
    }
    // horizontal plank breaks
    for (let row = 0; row < 4; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * (size / 4) + (rnd() * 6 - 3));
      ctx.lineTo(size, row * (size / 4) + (rnd() * 6 - 3));
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.stroke();
    }

    // soft vignette dirt
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return toTexture(canvas, 6, 10);
  }

  // Wallpapered / plaster wall with faint damask diamonds
  function makeWallTexture({ base = "#241f2c", accent = "#2f2838", seed = 3 } = {}) {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rnd = mulberry32(seed);

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    const step = 32;
    for (let y = -step; y < size + step; y += step) {
      ctx.beginPath();
      for (let x = -step; x <= size + step; x += step) {
        ctx.moveTo(x, y + step / 2);
        ctx.lineTo(x + step / 2, y);
        ctx.lineTo(x + step, y + step / 2);
        ctx.lineTo(x + step / 2, y + step);
        ctx.lineTo(x, y + step / 2);
      }
      ctx.stroke();
    }

    // grime speckle
    for (let i = 0; i < 500; i++) {
      const a = rnd() * 0.06;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(rnd() * size, rnd() * size, 1.5, 1.5);
    }

    return toTexture(canvas, 3, 1.5);
  }

  // Brushed gold/metal for the vault door and trims
  function makeMetalTexture({ base = "#b08830", seed = 11 } = {}) {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rnd = mulberry32(seed);

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 260; i++) {
      const y = rnd() * size;
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rnd() * 4 - 2));
      ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "rgba(255,255,255,0.12)");
    grad.addColorStop(0.5, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return toTexture(canvas, 2, 2);
  }

  // Raccoon fur — soft mottled grey with short directional strokes
  function makeFurTexture({ base = "#6b6b70", dark = "#54545a", light = "#84848c", seed = 21 } = {}) {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rnd = mulberry32(seed);

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 2200; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const len = 3 + rnd() * 5;
      const ang = Math.PI / 2 + (rnd() * 0.6 - 0.3);
      ctx.strokeStyle = rnd() > 0.5 ? `rgba(30,28,26,${0.08 + rnd() * 0.12})` : `rgba(255,255,255,${0.05 + rnd() * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    return toTexture(canvas, 2, 2);
  }

  // Dark bandit-mask fabric with faint weave
  function makeMaskTexture({ base = "#232025", seed = 5 } = {}) {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rnd = mulberry32(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`;
      ctx.fillRect(rnd() * size, rnd() * size, 2, 1);
    }
    return toTexture(canvas, 1, 1);
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  window.RaccoonTextures = {
    makeFloorTexture,
    makeWallTexture,
    makeMetalTexture,
    makeFurTexture,
    makeMaskTexture,
  };
})();
