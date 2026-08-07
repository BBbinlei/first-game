(function () {
  "use strict";

  const app = document.getElementById("app");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  app.appendChild(renderer.domElement);

  const controls = RaccoonControls.createControls();

  // ?night=3 lets testers/devs jump straight to a given night's content.
  const nightOverride = parseInt(new URLSearchParams(location.search).get("night"), 10);
  let night = Number.isFinite(nightOverride) && nightOverride > 0 ? nightOverride : 1;

  let active = RaccoonTitle.create();
  updateNightBadge();

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    active.update(dt);
    renderer.render(active.scene, active.camera);
  }
  animate();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    active.onResize();
  });

  function updateNightBadge() {
    const badge = document.getElementById("nightBadge");
    if (badge) badge.textContent = `第 ${night} 晚 · Night ${night}`;
  }

  function startGame() {
    RaccoonAudio.ensureCtx();
    document.getElementById("titleScreen").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("hud").classList.add("visible");
    document.getElementById("instructions").classList.add("visible");
    document.getElementById("hudNight").textContent = night;

    if (controls.isTouch) {
      controls.setupTouch({
        touchLayer: document.getElementById("touchLayer"),
        stickBase: document.getElementById("stickBase"),
        stickNub: document.getElementById("stickNub"),
        lookZone: document.getElementById("lookZone"),
      });
    }

    const old = active;
    active = RaccoonGame.create(renderer, controls, {
      night,
      onWin: () => { night += 1; },
    });
    old.dispose();
  }

  function goToTitle() {
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("hud").classList.remove("visible");
    document.getElementById("instructions").classList.remove("visible");
    document.getElementById("touchLayer").classList.remove("active");
    document.getElementById("titleScreen").classList.remove("hidden");
    updateNightBadge();

    const old = active;
    active = RaccoonTitle.create();
    old.dispose();
  }

  document.getElementById("startBtn").addEventListener("click", startGame, { passive: true });
  document.getElementById("restartBtn").addEventListener("click", goToTitle);
})();
