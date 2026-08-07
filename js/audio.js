// All sound is synthesized with WebAudio oscillators — no audio files,
// so nothing to fetch over a network that mostly isn't reachable anyway.
(function () {
  "use strict";

  let ctx = null;
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ freq, type = "sine", start = 0, duration = 0.15, gain = 0.18, glideTo = null }) {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + duration);
    amp.gain.setValueAtTime(0.0001, c.currentTime + start);
    amp.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.05);
  }

  function playPickup() {
    tone({ freq: 740, type: "triangle", duration: 0.09, gain: 0.14 });
    tone({ freq: 1180, type: "sine", start: 0.05, duration: 0.14, gain: 0.12 });
  }

  function playFootstep() {
    tone({ freq: 90, type: "sine", duration: 0.06, gain: 0.05 });
  }

  function playBust() {
    tone({ freq: 220, type: "sawtooth", duration: 0.5, gain: 0.16, glideTo: 60 });
    tone({ freq: 180, type: "square", start: 0.12, duration: 0.4, gain: 0.12, glideTo: 50 });
  }

  function playWin() {
    [523, 659, 784, 1047].forEach((f, i) => {
      tone({ freq: f, type: "triangle", start: i * 0.12, duration: 0.3, gain: 0.14 });
    });
  }

  function playAlarmBlip() {
    tone({ freq: 900, type: "square", duration: 0.07, gain: 0.06 });
  }

  function playBark() {
    tone({ freq: 260, type: "sawtooth", duration: 0.09, gain: 0.15, glideTo: 140 });
    tone({ freq: 200, type: "square", start: 0.11, duration: 0.07, gain: 0.1, glideTo: 110 });
  }

  window.RaccoonAudio = { ensureCtx, playPickup, playFootstep, playBust, playWin, playAlarmBlip, playBark };
})();
