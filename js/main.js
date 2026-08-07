(function () {
  "use strict";

  const app = document.getElementById("app");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  app.appendChild(renderer.domElement);

  const controls = RaccoonControls.createControls();

  let active = RaccoonTitle.create();

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

  function startGame() {
    document.getElementById("titleScreen").classList.add("hidden");
    document.getElementById("hud").classList.add("visible");
    document.getElementById("instructions").classList.add("visible");

    if (controls.isTouch) {
      controls.setupTouch({
        touchLayer: document.getElementById("touchLayer"),
        stickBase: document.getElementById("stickBase"),
        stickNub: document.getElementById("stickNub"),
        lookZone: document.getElementById("lookZone"),
      });
    }

    const old = active;
    active = RaccoonGame.create(renderer, controls);
    old.dispose();
  }

  document.getElementById("startBtn").addEventListener("click", startGame, { passive: true });

  document.getElementById("restartBtn").addEventListener("click", () => {
    window.location.reload();
  });
})();
