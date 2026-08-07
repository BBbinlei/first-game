// Core heist gameplay: sneak the raccoon through the mansion, dodge the
// sweeping guard lasers, grab every gem, then slip out through the vault.
(function () {
  "use strict";

  function create(renderer, controls) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c14);
    scene.fog = new THREE.Fog(0x0a0c14, 12, 40);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

    // ---------- Lighting ----------
    scene.add(new THREE.AmbientLight(0x404060, 1.1));
    const moonLight = new THREE.DirectionalLight(0x8fa8ff, 0.6);
    moonLight.position.set(-10, 18, -6);
    scene.add(moonLight);
    const vaultGlow = new THREE.PointLight(0xffcc55, 1.6, 18, 2);
    vaultGlow.position.set(0, 4, -16);
    scene.add(vaultGlow);

    // ---------- Floor & walls ----------
    const ROOM_W = 20, ROOM_D = 36;

    const floorMat = new THREE.MeshStandardMaterial({
      map: RaccoonTextures.makeFloorTexture(),
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -ROOM_D / 2 + 4);
    floor.receiveShadow = true;
    scene.add(floor);

    const wallTex = RaccoonTextures.makeWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
    function makeWall(w, h, d, x, y, z) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      return wall;
    }
    const wallH = 6;
    makeWall(ROOM_W, wallH, 0.5, 0, wallH / 2, -ROOM_D + 4 - 0.25); // north (vault) wall
    makeWall(0.5, wallH, ROOM_D, -ROOM_W / 2, wallH / 2, -ROOM_D / 2 + 4); // west
    makeWall(0.5, wallH, ROOM_D, ROOM_W / 2, wallH / 2, -ROOM_D / 2 + 4);  // east

    // Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7 });
    const pillarPositions = [
      [-6, -8], [6, -8], [-6, -20], [6, -20], [-6, -28], [6, -28],
    ];
    pillarPositions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, wallH, 12), pillarMat);
      pillar.position.set(x, wallH / 2, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
    });

    // ---------- Vault door (opens once all loot collected) ----------
    const metalTex = RaccoonTextures.makeMetalTexture();
    const vaultGroup = new THREE.Group();
    const doorMat = new THREE.MeshStandardMaterial({
      map: metalTex, color: 0xffe3a0, metalness: 0.75, roughness: 0.3,
      emissive: 0x6b4a10, emissiveIntensity: 0.4,
    });
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.4, 32), doorMat);
    vaultDoor.rotation.x = Math.PI / 2;
    vaultGroup.add(vaultDoor);
    const vaultRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.12, 0.08, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xffd873, emissive: 0xffaa33, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 })
    );
    vaultGroup.add(vaultRim);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3a2a10, metalness: 0.5, roughness: 0.5 })
      );
      spoke.rotation.z = (i / 8) * Math.PI * 2;
      spoke.position.z = 0.05;
      vaultGroup.add(spoke);
    }
    vaultGroup.position.set(0, 3, -ROOM_D + 4);
    vaultGroup.castShadow = true;
    scene.add(vaultGroup);

    const exitGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4.6),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 })
    );
    exitGlow.position.set(0, 2.4, -ROOM_D + 4.1);
    scene.add(exitGlow);

    // ---------- Raccoon player ----------
    const raccoon = buildRaccoon();
    raccoon.position.set(0, 0, 2);
    scene.add(raccoon);
    const tailGroup = raccoon.userData.tailGroup;

    // ---------- Loot (gems) ----------
    const lootGeo = new THREE.OctahedronGeometry(0.28, 0);
    const lootMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0x664400, metalness: 0.4, roughness: 0.3 });
    const lootSpots = [
      [-7, -6], [7, -6], [-3, -12], [4, -12], [0, -17],
      [-7, -22], [7, -22], [-3, -27], [4, -27], [0, -30.5],
    ];
    const loot = lootSpots.map(([x, z]) => {
      const gem = new THREE.Mesh(lootGeo, lootMat);
      gem.position.set(x, 0.9, z);
      gem.castShadow = true;
      gem.userData.baseY = 0.9;
      gem.userData.phase = Math.random() * Math.PI * 2;
      scene.add(gem);
      return gem;
    });
    const totalLoot = loot.length;
    document.getElementById("lootTotal").textContent = totalLoot;

    // ---------- Security lasers ----------
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.75 });
    const lasers = [
      { z: -9, min: -8.5, max: 8.5, speed: 0.9, dir: 1 },
      { z: -15, min: -8.5, max: 8.5, speed: 1.3, dir: -1 },
      { z: -19, min: -8.5, max: 8.5, speed: 1.0, dir: 1 },
      { z: -25, min: -8.5, max: 8.5, speed: 1.6, dir: -1 },
    ].map((cfg) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 0.12), laserMat);
      beam.position.set(0, 1.5, cfg.z);
      scene.add(beam);
      cfg.mesh = beam;
      cfg.x = 0;
      return cfg;
    });

    // ---------- Camera (yaw orbit behind player) ----------
    let camYaw = Math.PI;
    const camDistance = 6.5;
    const camHeight = 3.2;
    camera.position.set(
      raccoon.position.x - Math.sin(camYaw) * camDistance,
      raccoon.position.y + camHeight,
      raccoon.position.z - Math.cos(camYaw) * camDistance
    );
    camera.lookAt(raccoon.position.x, raccoon.position.y + 1.1, raccoon.position.z);

    // ---------- Game state ----------
    let lootCollected = 0;
    let alarmLevel = 0;
    let gameOver = false;
    let gameWon = false;
    let startTime = performance.now();
    let elapsed = 0;

    const lootCountEl = document.getElementById("lootCount");
    const timeCountEl = document.getElementById("timeCount");
    const alarmBarEl = document.getElementById("alarmBar");
    const overlayEl = document.getElementById("overlay");
    const overlayTitleEl = document.getElementById("overlayTitle");
    const overlayTextEl = document.getElementById("overlayText");

    function endGame(won) {
      gameOver = true;
      gameWon = won;
      overlayTitleEl.textContent = won ? "得手！Heist Complete!" : "被抓了！Busted!";
      overlayTextEl.textContent = won
        ? `你卷走了全部 ${totalLoot} 件战利品，用时 ${Math.floor(elapsed)} 秒，溜之大吉。`
        : "警报拉满，守卫扑了上来。下次悄悄点。";
      overlayEl.classList.remove("hidden");
    }

    const clockLocal = new THREE.Clock();

    function update(dt) {
      if (gameOver) return;
      elapsed = (performance.now() - startTime) / 1000;
      timeCountEl.textContent = Math.floor(elapsed);

      camYaw += controls.consumeLookDelta(dt);

      const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      const input = controls.getMove(); // {x: strafe, z: -1 forward .. 1 back}
      const move = new THREE.Vector3();
      move.addScaledVector(forward, -input.z);
      move.addScaledVector(right, input.x);

      const speed = 4.2;
      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(speed * dt);
        raccoon.position.add(move);
        const targetAngle = Math.atan2(move.x, move.z);
        let da = targetAngle - raccoon.rotation.y;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        raccoon.rotation.y += da * Math.min(1, dt * 10);
      }

      raccoon.position.x = THREE.MathUtils.clamp(raccoon.position.x, -ROOM_W / 2 + 0.8, ROOM_W / 2 - 0.8);
      raccoon.position.z = THREE.MathUtils.clamp(raccoon.position.z, -ROOM_D + 5, 4);

      const t = performance.now() * 0.001;
      const moving = move.lengthSq() > 0.0001;
      raccoon.position.y = Math.sin(t * 6) * (moving ? 0.04 : 0.01);
      tailGroup.rotation.y = Math.sin(t * 2.5) * 0.25;

      // Loot pickup (planar distance — gems float above head height)
      for (let i = loot.length - 1; i >= 0; i--) {
        const gem = loot[i];
        gem.rotation.y += dt * 2;
        gem.position.y = gem.userData.baseY + Math.sin(t * 3 + gem.userData.phase) * 0.08;
        const dx = gem.position.x - raccoon.position.x;
        const dz = gem.position.z - raccoon.position.z;
        if (Math.hypot(dx, dz) < 0.9) {
          scene.remove(gem);
          loot.splice(i, 1);
          lootCollected++;
          lootCountEl.textContent = lootCollected;
        }
      }

      // Laser sweep + collision
      let touchingLaser = false;
      lasers.forEach((l) => {
        l.x += l.speed * l.dir * dt * 2;
        if (l.x > l.max) { l.x = l.max; l.dir = -1; }
        if (l.x < l.min) { l.x = l.min; l.dir = 1; }
        l.mesh.position.x = l.x;
        const dx = raccoon.position.x - l.x;
        const dz = raccoon.position.z - l.z;
        if (Math.abs(dx) < 0.9 && Math.abs(dz) < 0.5) touchingLaser = true;
      });

      if (touchingLaser) {
        alarmLevel = Math.min(1, alarmLevel + dt * 0.55);
      } else {
        alarmLevel = Math.max(0, alarmLevel - dt * 0.25);
      }
      alarmBarEl.style.width = `${alarmLevel * 100}%`;
      if (alarmLevel >= 1) endGame(false);

      // Vault door / win condition
      if (lootCollected >= totalLoot) {
        exitGlow.material.opacity = Math.min(0.9, exitGlow.material.opacity + dt);
        vaultGroup.position.y = Math.min(6.5, vaultGroup.position.y + dt * 1.5);
        if (raccoon.position.z < -ROOM_D + 6.5) endGame(true);
      }

      // Camera follow
      const camTarget = new THREE.Vector3(
        raccoon.position.x - Math.sin(camYaw) * camDistance,
        raccoon.position.y + camHeight,
        raccoon.position.z - Math.cos(camYaw) * camDistance
      );
      camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
      camera.lookAt(raccoon.position.x, raccoon.position.y + 1.1, raccoon.position.z);

      vaultGlow.intensity = 1.6 + Math.sin(t * 2) * 0.2;
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    function dispose() {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
    }

    return { scene, camera, update, onResize, dispose };
  }

  function buildRaccoon() {
    const raccoon = new THREE.Group();

    const furTex = RaccoonTextures.makeFurTexture();
    const furMat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ map: RaccoonTextures.makeMaskTexture(), roughness: 0.7 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xd9d6c9, roughness: 0.7 });

    const bodyGroup = new THREE.Group();
    const bodyMid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.55, 12), furMat);
    bodyMid.rotation.x = Math.PI / 2;
    bodyGroup.add(bodyMid);
    const bodyFront = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), furMat);
    bodyFront.position.z = 0.275;
    bodyGroup.add(bodyFront);
    const bodyBack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), furMat);
    bodyBack.position.z = -0.275;
    bodyGroup.add(bodyBack);
    bodyGroup.position.y = 0.62;
    bodyGroup.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    raccoon.add(bodyGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), furMat);
    head.position.set(0, 0.9, 0.5);
    head.castShadow = true;
    raccoon.add(head);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.15), darkMat);
    mask.position.set(0, 0.92, 0.76);
    raccoon.add(mask);

    [-0.18, 0.18].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 8), darkMat);
      ear.position.set(x, 1.18, 0.48);
      raccoon.add(ear);
    });

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), lightMat);
    snout.position.set(0, 0.82, 0.78);
    raccoon.add(snout);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.6, -0.55);
    raccoon.add(tailGroup);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.02, 10, 10), i % 2 === 0 ? furMat : darkMat);
      seg.position.set(0, Math.sin(i * 0.5) * 0.05, -i * 0.28);
      tailGroup.add(seg);
    }

    [[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.28], [0.2, -0.28]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), darkMat);
      leg.position.set(x, 0.2, z);
      leg.castShadow = true;
      raccoon.add(leg);
    });

    raccoon.userData.tailGroup = tailGroup;
    return raccoon;
  }

  window.RaccoonGame = { create };
})();
