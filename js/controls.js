// Unified input: keyboard (desktop) + on-screen joystick & drag-look (touch).
(function () {
  "use strict";

  function createControls() {
    const keys = {};
    let joyVec = { x: 0, y: 0 }; // x: strafe, y: -1 forward .. 1 back
    let joyActive = false;
    let joyTouchId = null;

    let lookAccum = 0; // yaw delta accumulated from touch drag, consumed each frame
    let lookTouchId = null;
    let lastLookX = 0;

    const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    window.addEventListener("keydown", (e) => { keys[e.code] = true; });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; });

    function setupTouch({ touchLayer, stickBase, stickNub, lookZone }) {
      if (!isTouch) return;
      touchLayer.classList.add("active");

      const baseRect = () => stickBase.getBoundingClientRect();
      const maxRadius = 42;

      function stickStart(e) {
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        joyActive = true;
        updateStick(t.clientX, t.clientY);
      }
      function updateStick(cx, cy) {
        const r = baseRect();
        const ox = r.left + r.width / 2;
        const oy = r.top + r.height / 2;
        let dx = cx - ox;
        let dy = cy - oy;
        const dist = Math.min(Math.hypot(dx, dy), maxRadius);
        const ang = Math.atan2(dy, dx);
        dx = Math.cos(ang) * dist;
        dy = Math.sin(ang) * dist;
        stickNub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joyVec.x = dx / maxRadius;
        joyVec.y = dy / maxRadius;
      }
      function stickMove(e) {
        for (const t of e.changedTouches) {
          if (t.identifier === joyTouchId) updateStick(t.clientX, t.clientY);
        }
      }
      function stickEnd(e) {
        for (const t of e.changedTouches) {
          if (t.identifier === joyTouchId) {
            joyActive = false;
            joyTouchId = null;
            joyVec.x = 0;
            joyVec.y = 0;
            stickNub.style.transform = `translate(-50%, -50%)`;
          }
        }
      }
      stickBase.addEventListener("touchstart", stickStart, { passive: true });
      stickBase.addEventListener("touchmove", stickMove, { passive: true });
      stickBase.addEventListener("touchend", stickEnd, { passive: true });
      stickBase.addEventListener("touchcancel", stickEnd, { passive: true });

      function lookStart(e) {
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lastLookX = t.clientX;
      }
      function lookMove(e) {
        for (const t of e.changedTouches) {
          if (t.identifier === lookTouchId) {
            const dx = t.clientX - lastLookX;
            lastLookX = t.clientX;
            lookAccum += dx * -0.006;
          }
        }
      }
      function lookEnd(e) {
        for (const t of e.changedTouches) {
          if (t.identifier === lookTouchId) lookTouchId = null;
        }
      }
      lookZone.addEventListener("touchstart", lookStart, { passive: true });
      lookZone.addEventListener("touchmove", lookMove, { passive: true });
      lookZone.addEventListener("touchend", lookEnd, { passive: true });
      lookZone.addEventListener("touchcancel", lookEnd, { passive: true });
    }

    function getMove() {
      let x = 0, z = 0;
      if (keys["KeyW"] || keys["ArrowUp"]) z -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) z += 1;
      if (keys["KeyD"] || keys["ArrowRight"]) x += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
      if (joyActive) {
        x += joyVec.x;
        z += joyVec.y;
      }
      const len = Math.hypot(x, z);
      if (len > 1) { x /= len; z /= len; }
      return { x, z };
    }

    function consumeLookDelta() {
      let d = lookAccum;
      lookAccum = 0;
      if (keys["KeyQ"]) d += 0.03;
      if (keys["KeyE"]) d -= 0.03;
      return d;
    }

    return { isTouch, setupTouch, getMove, consumeLookDelta };
  }

  window.RaccoonControls = { createControls };
})();
