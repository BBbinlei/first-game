// Core heist gameplay: sneak the raccoon through the mansion, dodge the
// sweeping guard lasers, grab every gem, then slip out through the vault.
(function () {
  "use strict";

  function create(renderer, controls, opts) {
    const { night = 1, onWin = null } = opts || {};
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
      roughness: 0.9, flatShading: true,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -ROOM_D / 2 + 4);
    floor.receiveShadow = true;
    scene.add(floor);

    const wallTex = RaccoonTextures.makeWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, flatShading: true });
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
    const pillarMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7, flatShading: true });
    const pillarPositions = [
      [-6, -8], [6, -8], [-6, -20], [6, -20], [-6, -28], [6, -28],
    ];
    pillarPositions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, wallH, 7), pillarMat);
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
      emissive: 0x6b4a10, emissiveIntensity: 0.4, flatShading: true,
    });
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.4, 14), doorMat);
    vaultDoor.rotation.x = Math.PI / 2;
    vaultGroup.add(vaultDoor);
    const vaultRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.12, 0.08, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd873, emissive: 0xffaa33, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3, flatShading: true })
    );
    vaultGroup.add(vaultRim);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3a2a10, metalness: 0.5, roughness: 0.5, flatShading: true })
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
    const lootMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0x664400, metalness: 0.4, roughness: 0.3, flatShading: true });
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

    // ---------- Patrolling guard with sweeping flashlight ----------
    const guard = buildGuard();
    guard.position.set(-5, 0, -12);
    scene.add(guard);
    const flashlight = new THREE.SpotLight(0xfff2c0, 2.2, 13, Math.PI / 8, 0.5, 1.5);
    flashlight.position.set(0, 0.95, 0.1);
    guard.add(flashlight);
    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, -0.3, 3);
    guard.add(flashlightTarget);
    flashlight.target = flashlightTarget;
    const guardState = { minX: -7, maxX: 7, speed: 1.6, dir: 1, sweep: 0 };

    // ---------- Guard dog (from night 3 onward) — tracks by smell, not sight ----------
    let dog = null;
    let dogState = null;
    let noseSprite = null;
    if (night >= 3) {
      dog = buildDog();
      dog.position.set(4, 0, -20);
      scene.add(dog);
      noseSprite = makeNoseSprite();
      noseSprite.position.set(0, 1.05, 0.2);
      noseSprite.scale.set(0.55, 0.55, 0.55);
      noseSprite.visible = false;
      dog.add(noseSprite);
      dogState = { mode: "wander", target: new THREE.Vector3(), idleTimer: 0, barkTimer: 0 };
      pickWanderTarget(dogState, ROOM_W, ROOM_D);
    }

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

    const BUST_MESSAGES = {
      guard: { title: "被守卫发现了！Spotted by the Guard!", text: "巡逻守卫的手电筒扫到了你。趁他转身再行动。" },
      headlights: { title: "被灯光照到了！Caught in the Headlights!", text: "警戒光束扫过了你的位置，触发了警报。" },
      hound: { title: "被猎犬扑倒了！Caught by the Hound!", text: "猎犬循着你的气味追了上来。拉开 17 米它就会放弃，下次跑远点。" },
    };

    function endGame(won, source) {
      gameOver = true;
      gameWon = won;
      if (won) {
        overlayTitleEl.textContent = "得手！Heist Complete!";
        overlayTextEl.textContent = `你卷走了全部 ${totalLoot} 件战利品，用时 ${Math.floor(elapsed)} 秒，溜之大吉。`;
        if (typeof onWin === "function") onWin();
      } else {
        const m = BUST_MESSAGES[source] || { title: "被抓了！Busted!", text: "警报拉满，守卫扑了上来。下次悄悄点。" };
        overlayTitleEl.textContent = m.title;
        overlayTextEl.textContent = m.text;
      }
      document.getElementById("restartBtn").textContent = won ? "下一晚 · Next Night" : "再试一次 · Retry";
      overlayEl.classList.remove("hidden");
    }

    // ---------- Pickup particle bursts ----------
    const bursts = [];
    function spawnBurst(position) {
      const count = 14;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const vel = [];
      for (let i = 0; i < count; i++) {
        pos[i * 3] = position.x;
        pos[i * 3 + 1] = position.y;
        pos[i * 3 + 2] = position.z;
        const ang = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        vel.push(new THREE.Vector3(Math.cos(ang) * speed, 2 + Math.random() * 2, Math.sin(ang) * speed));
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffd873, size: 0.09, transparent: true, opacity: 1 });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      bursts.push({ points, vel, life: 0 });
    }
    function updateBursts(dt) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life += dt;
        const posAttr = b.points.geometry.getAttribute("position");
        for (let j = 0; j < b.vel.length; j++) {
          b.vel[j].y -= 4 * dt;
          posAttr.setX(j, posAttr.getX(j) + b.vel[j].x * dt);
          posAttr.setY(j, posAttr.getY(j) + b.vel[j].y * dt);
          posAttr.setZ(j, posAttr.getZ(j) + b.vel[j].z * dt);
        }
        posAttr.needsUpdate = true;
        b.points.material.opacity = Math.max(0, 1 - b.life / 0.6);
        if (b.life > 0.6) {
          scene.remove(b.points);
          b.points.geometry.dispose();
          b.points.material.dispose();
          bursts.splice(i, 1);
        }
      }
    }

    const alarmVignetteEl = document.getElementById("alarmVignette");
    let footstepTimer = 0;
    let alarmBlipTimer = 0;

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

      if (moving) {
        footstepTimer -= dt;
        if (footstepTimer <= 0) {
          RaccoonAudio.playFootstep();
          footstepTimer = 0.32;
        }
      } else {
        footstepTimer = 0;
      }

      // Loot pickup (planar distance — gems float above head height)
      for (let i = loot.length - 1; i >= 0; i--) {
        const gem = loot[i];
        gem.rotation.y += dt * 2;
        gem.position.y = gem.userData.baseY + Math.sin(t * 3 + gem.userData.phase) * 0.08;
        const dx = gem.position.x - raccoon.position.x;
        const dz = gem.position.z - raccoon.position.z;
        if (Math.hypot(dx, dz) < 0.9) {
          spawnBurst(gem.position);
          RaccoonAudio.playPickup();
          scene.remove(gem);
          loot.splice(i, 1);
          lootCollected++;
          lootCountEl.textContent = lootCollected;
        }
      }
      updateBursts(dt);

      // Laser sweep + collision
      let danger = 0;
      let dangerSource = null;
      function noteDanger(value, source) {
        if (value > danger) { danger = value; dangerSource = source; }
      }
      lasers.forEach((l) => {
        l.x += l.speed * l.dir * dt * 2;
        if (l.x > l.max) { l.x = l.max; l.dir = -1; }
        if (l.x < l.min) { l.x = l.min; l.dir = 1; }
        l.mesh.position.x = l.x;
        const dx = raccoon.position.x - l.x;
        const dz = raccoon.position.z - l.z;
        if (Math.abs(dx) < 0.9 && Math.abs(dz) < 0.5) noteDanger(0.55, "headlights");
      });

      // Guard patrol + flashlight sweep + cone detection
      guard.position.x += guardState.speed * guardState.dir * dt;
      if (guard.position.x > guardState.maxX) { guard.position.x = guardState.maxX; guardState.dir = -1; }
      if (guard.position.x < guardState.minX) { guard.position.x = guardState.minX; guardState.dir = 1; }
      guard.rotation.y = guardState.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      guardState.sweep += dt;
      flashlightTarget.position.x = Math.sin(guardState.sweep * 0.9) * 2.2;

      {
        const toRaccoon = new THREE.Vector3().subVectors(raccoon.position, guard.position);
        toRaccoon.y = 0;
        const dist = toRaccoon.length();
        if (dist < 9 && dist > 0.001) {
          const facing = new THREE.Vector3(Math.sin(guard.rotation.y + Math.atan2(flashlightTarget.position.x, 3)), 0, Math.cos(guard.rotation.y + Math.atan2(flashlightTarget.position.x, 3)));
          toRaccoon.normalize();
          const angle = facing.angleTo(toRaccoon);
          if (angle < Math.PI / 7) noteDanger(0.9, "guard");
        }
      }

      // Guard dog: smell-based tracking (distance only, sight doesn't matter)
      if (dog) {
        const toRaccoon = new THREE.Vector3().subVectors(raccoon.position, dog.position);
        toRaccoon.y = 0;
        const distToRaccoon = toRaccoon.length();

        if (dogState.mode === "wander" && distToRaccoon < 12) {
          dogState.mode = "track";
          noseSprite.visible = true;
        } else if (dogState.mode === "track" && distToRaccoon > 17) {
          dogState.mode = "wander";
          noseSprite.visible = false;
          pickWanderTarget(dogState, ROOM_W, ROOM_D);
        }

        let moveTarget, dogSpeed;
        if (dogState.mode === "track") {
          moveTarget = raccoon.position;
          dogSpeed = 3.6;
          dogState.barkTimer -= dt;
          if (dogState.barkTimer <= 0) {
            RaccoonAudio.playBark();
            dogState.barkTimer = 0.6 + Math.random() * 0.3;
          }
          if (distToRaccoon < 1.1) noteDanger(1.3, "hound");
        } else {
          moveTarget = dogState.target;
          dogSpeed = 1.8;
          const distToTarget = Math.hypot(dog.position.x - dogState.target.x, dog.position.z - dogState.target.z);
          if (distToTarget < 0.6) {
            dogState.idleTimer -= dt;
            if (dogState.idleTimer <= 0) pickWanderTarget(dogState, ROOM_W, ROOM_D);
          }
        }

        const dogMove = new THREE.Vector3(moveTarget.x - dog.position.x, 0, moveTarget.z - dog.position.z);
        if (dogMove.lengthSq() > 0.0004) {
          dogMove.normalize().multiplyScalar(dogSpeed * dt);
          dog.position.add(dogMove);
          const targetAngle = Math.atan2(dogMove.x, dogMove.z);
          let da = targetAngle - dog.rotation.y;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          dog.rotation.y += da * Math.min(1, dt * 8);
        }
        dog.position.x = THREE.MathUtils.clamp(dog.position.x, -ROOM_W / 2 + 0.8, ROOM_W / 2 - 0.8);
        dog.position.z = THREE.MathUtils.clamp(dog.position.z, -ROOM_D + 5, 4);
        dog.userData.tail.rotation.y = Math.sin(t * (dogState.mode === "track" ? 14 : 6)) * 0.5;
      }

      if (danger > 0) {
        alarmLevel = Math.min(1, alarmLevel + dt * danger);
        alarmBlipTimer -= dt;
        if (alarmBlipTimer <= 0) {
          RaccoonAudio.playAlarmBlip();
          alarmBlipTimer = 0.35;
        }
      } else {
        alarmLevel = Math.max(0, alarmLevel - dt * 0.25);
        alarmBlipTimer = 0;
      }
      alarmBarEl.style.width = `${alarmLevel * 100}%`;
      alarmVignetteEl.style.opacity = String(Math.pow(alarmLevel, 1.4));
      if (alarmLevel >= 1) { endGame(false, dangerSource); RaccoonAudio.playBust(); }

      // Vault door / win condition
      if (lootCollected >= totalLoot) {
        exitGlow.material.opacity = Math.min(0.9, exitGlow.material.opacity + dt);
        vaultGroup.position.y = Math.min(6.5, vaultGroup.position.y + dt * 1.5);
        if (raccoon.position.z < -ROOM_D + 6.5) { endGame(true); RaccoonAudio.playWin(); }
      }

      // Camera follow + alarm shake
      const camTarget = new THREE.Vector3(
        raccoon.position.x - Math.sin(camYaw) * camDistance,
        raccoon.position.y + camHeight,
        raccoon.position.z - Math.cos(camYaw) * camDistance
      );
      camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
      const shake = alarmLevel * alarmLevel * 0.12;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
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
    const furMat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.85, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ map: RaccoonTextures.makeMaskTexture(), roughness: 0.7, flatShading: true });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xd9d6c9, roughness: 0.7, flatShading: true });

    const bodyGroup = new THREE.Group();
    const bodyMid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.55, 7), furMat);
    bodyMid.rotation.x = Math.PI / 2;
    bodyGroup.add(bodyMid);
    const bodyFront = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), furMat);
    bodyFront.position.z = 0.275;
    bodyGroup.add(bodyFront);
    const bodyBack = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), furMat);
    bodyBack.position.z = -0.275;
    bodyGroup.add(bodyBack);
    bodyGroup.position.y = 0.62;
    bodyGroup.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    raccoon.add(bodyGroup);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), furMat);
    head.position.set(0, 0.9, 0.5);
    head.castShadow = true;
    raccoon.add(head);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.15), darkMat);
    mask.position.set(0, 0.92, 0.76);
    raccoon.add(mask);

    [-0.18, 0.18].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6), darkMat);
      ear.position.set(x, 1.18, 0.48);
      raccoon.add(ear);
    });

    const snout = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), lightMat);
    snout.position.set(0, 0.82, 0.78);
    raccoon.add(snout);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.6, -0.55);
    raccoon.add(tailGroup);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 - i * 0.02, 0), i % 2 === 0 ? furMat : darkMat);
      seg.position.set(0, Math.sin(i * 0.5) * 0.05, -i * 0.28);
      tailGroup.add(seg);
    }

    [[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.28], [0.2, -0.28]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), darkMat);
      leg.position.set(x, 0.2, z);
      leg.castShadow = true;
      raccoon.add(leg);
    });

    raccoon.userData.tailGroup = tailGroup;
    return raccoon;
  }

  function buildGuard() {
    const group = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.8, flatShading: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a6a55, roughness: 0.7, flatShading: true });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6, flatShading: true });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.1, 7), coatMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), skinMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 8), capMat);
    cap.position.y = 1.66;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8), capMat);
    brim.position.set(0, 1.6, 0.08);
    group.add(brim);

    [-0.22, 0.22].forEach((x) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), coatMat);
      arm.position.set(x, 0.75, 0);
      group.add(arm);
    });

    return group;
  }

  function pickWanderTarget(state, ROOM_W, ROOM_D) {
    state.target.set(
      (Math.random() - 0.5) * (ROOM_W - 3),
      0,
      -ROOM_D + 6 + Math.random() * (ROOM_D - 9)
    );
    state.idleTimer = 1 + Math.random() * 2;
  }

  function makeNoseSprite() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.font = "44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👃", 32, 34);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    return sprite;
  }

  function buildDog() {
    const group = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.85, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.8, flatShading: true });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, flatShading: true });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.6, roughness: 0.3, flatShading: true });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.75, 7), furMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.42;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), furMat);
    head.position.set(0, 0.5, 0.5);
    head.castShadow = true;
    group.add(head);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 6), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.44, 0.72);
    group.add(snout);

    const noseTip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), darkMat);
    noseTip.position.set(0, 0.44, 0.86);
    group.add(noseTip);

    [-0.12, 0.12].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), darkMat);
      ear.position.set(x, 0.64, 0.42);
      ear.rotation.x = 0.4;
      ear.rotation.z = x > 0 ? -0.3 : 0.3;
      group.add(ear);
    });

    // Spiked red collar around the neck
    const collarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), collarMat);
    collarBase.rotation.x = Math.PI / 2;
    collarBase.position.set(0, 0.5, 0.34);
    group.add(collarBase);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5), spikeMat);
      spike.position.set(Math.cos(ang) * 0.2, 0.5 + Math.sin(ang) * 0.15, 0.34);
      group.add(spike);
    }

    [[-0.14, 0.25], [0.14, 0.25], [-0.14, -0.2], [0.14, -0.2]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 6), darkMat);
      leg.position.set(x, 0.16, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.5, -0.35);
    group.add(tailGroup);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), furMat);
    tail.rotation.x = Math.PI / 2.2;
    tail.position.set(0, 0.05, -0.15);
    tailGroup.add(tail);
    group.userData.tail = tailGroup;

    return group;
  }

  window.RaccoonGame = { create };
})();
