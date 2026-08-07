// Full heist gameplay — implemented in the next commit on top of this
// title-screen scaffold. Placeholder keeps main.js's Start button wired
// to *something* so the flow can be previewed immediately.
(function () {
  "use strict";

  function create(renderer, controls) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c14);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    function update() {}
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    function dispose() {}

    return { scene, camera, update, onResize, dispose };
  }

  window.RaccoonGame = { create };
})();
