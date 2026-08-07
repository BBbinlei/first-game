// Animated 3D title-screen backdrop: a moody rooftop overlooking a mansion,
// a vault glowing in the distance, sweeping guard lasers, drifting night mist.
(function () {
  "use strict";

  function create() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0714);
    scene.fog = new THREE.FogExp2(0x0a0714, 0.045);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.4, 8);
    camera.lookAt(0, 2.2, 0);

    scene.add(new THREE.AmbientLight(0x3a3060, 1.0));
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.7);
    moon.position.set(-6, 10, 4);
    scene.add(moon);
    const vaultGlow = new THREE.PointLight(0xffcc55, 3.2, 16, 2);
    vaultGlow.position.set(0, 2.2, -1.4);
    scene.add(vaultGlow);

    // Starfield
    const starCount = 300;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 15 + Math.random() * 20;
      starPos[i * 3] = Math.cos(ang) * rad;
      starPos[i * 3 + 1] = Math.random() * 18 + 3;
      starPos[i * 3 + 2] = Math.sin(ang) * rad - 10;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.7 }));
    scene.add(stars);

    // Big pale moon low in the sky — low-poly faceted disc + soft halo
    const moonGroup = new THREE.Group();
    const moonMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3, 1),
      new THREE.MeshStandardMaterial({ color: 0xe8ecff, emissive: 0xaeb8e6, emissiveIntensity: 0.9, roughness: 0.9, flatShading: true })
    );
    moonGroup.add(moonMesh);
    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xcdd6ff, transparent: true, opacity: 0.12 })
    );
    moonGroup.add(moonHalo);
    moonGroup.position.set(7, 11, -22);
    scene.add(moonGroup);

    // Rooftop ground
    const roofMat = new THREE.MeshStandardMaterial({
      map: RaccoonTextures.makeFloorTexture({ base: "#241d2e", plank: "#2c2438", seam: "#120e18", seed: 42 }),
      roughness: 0.95, flatShading: true,
    });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), roofMat);
    roof.rotation.x = -Math.PI / 2;
    scene.add(roof);

    // Distant vault silhouette centerpiece
    const vaultGroup = new THREE.Group();
    const metalTex = RaccoonTextures.makeMetalTexture();
    const doorMat = new THREE.MeshStandardMaterial({
      map: metalTex, metalness: 0.8, roughness: 0.28, color: 0xffe3a0,
      emissive: 0x6b4a10, emissiveIntensity: 0.5, flatShading: true,
    });
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.4, 32), doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 2.2, -2.2);
    vaultGroup.add(door);

    // Bright rim ring so the door reads as a glowing disc, not a black hole
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.06, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xffd873, emissive: 0xffaa33, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.3, flatShading: true })
    );
    rim.position.set(0, 2.2, -2.0);
    vaultGroup.add(rim);

    // Radial spokes for detail so the flat face isn't featureless
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 1.3, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x3a2a10, metalness: 0.5, roughness: 0.5, flatShading: true })
      );
      spoke.position.set(0, 2.2, -1.98);
      spoke.rotation.z = (i / 8) * Math.PI * 2;
      vaultGroup.add(spoke);
    }

    const dialMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4, emissive: 0x1a1a1a, flatShading: true });
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 24), dialMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 2.2, -1.95);
    vaultGroup.add(dial);
    const dialHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.05), new THREE.MeshStandardMaterial({ color: 0xffd873 }));
    dialHand.position.set(0, 0.18, 0.08);
    dial.add(dialHand);

    scene.add(vaultGroup);

    // Skyline pillars / chimneys silhouettes
    const silMat = new THREE.MeshStandardMaterial({ color: 0x120e1a, roughness: 1, flatShading: true });
    const towers = [];
    for (let i = 0; i < 8; i++) {
      const w = 0.8 + Math.random() * 1.6;
      const h = 3 + Math.random() * 6;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), silMat);
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const rad = 9 + Math.random() * 6;
      tower.position.set(Math.cos(ang) * rad, h / 2 - 0.5, Math.sin(ang) * rad - 4);
      scene.add(tower);
      towers.push(tower);
    }

    // Raccoon silhouette perched on the vault, idle sway
    const raccoon = buildSilhouetteRaccoon();
    raccoon.position.set(-1.6, 2.55, -1.6);
    raccoon.rotation.y = 0.6;
    raccoon.scale.setScalar(1.15);
    scene.add(raccoon);

    // Sweeping guard lasers
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.55 });
    const lasers = [0, 1, 2].map((i) => {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.04), laserMat);
      beam.position.set(0, 0.4 + i * 1.1, 2 - i * 1.5);
      scene.add(beam);
      return { mesh: beam, phase: i * 1.7, speed: 0.5 + i * 0.15 };
    });

    // Drifting dust / mist particles
    const dustCount = 160;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 30;
      dustPos[i * 3 + 1] = Math.random() * 8;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xbcbecf, size: 0.05, transparent: true, opacity: 0.35 });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    let t = 0;
    function update(dt) {
      t += dt;
      camera.position.x = Math.sin(t * 0.12) * 1.4;
      camera.position.y = 2.4 + Math.sin(t * 0.2) * 0.15;
      camera.lookAt(-0.5, 2.15, -1.8);

      raccoon.rotation.y = 0.6 + Math.sin(t * 0.8) * 0.08;
      raccoon.position.y = 2.55 + Math.sin(t * 1.6) * 0.03;
      dial.rotation.z += dt * 0.15;
      moonMesh.rotation.y += dt * 0.05;

      lasers.forEach((l) => {
        l.mesh.position.x = Math.sin(t * l.speed + l.phase) * 9;
      });

      const posAttr = dustGeo.getAttribute("position");
      for (let i = 0; i < dustCount; i++) {
        let y = posAttr.getY(i) + dt * 0.15;
        if (y > 8) y = 0;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      vaultGlow.intensity = 2.0 + Math.sin(t * 2) * 0.3;
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

  function buildSilhouetteRaccoon() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x0c0a12, roughness: 1, flatShading: true });

    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat);
    body.scale.set(1, 1.1, 1.3);
    body.position.y = 0.36;
    group.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat);
    head.position.set(0, 0.62, 0.32);
    group.add(head);

    [-0.13, 0.13].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 6), mat);
      ear.position.set(x, 0.8, 0.3);
      group.add(ear);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 0.4, -0.3);
    group.add(tail);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 - i * 0.015, 0), mat);
      seg.position.set(0, 0.1 + i * 0.05, -i * 0.22);
      tail.add(seg);
    }

    // A stolen gem cradled in its paws — small nod to the moodboard raccoon
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffaa22, emissiveIntensity: 1.2, flatShading: true })
    );
    gem.position.set(0, 0.42, 0.5);
    group.add(gem);
    const gemGlow = new THREE.PointLight(0xffcc55, 0.8, 2.5, 2);
    gemGlow.position.copy(gem.position);
    group.add(gemGlow);

    return group;
  }

  window.RaccoonTitle = { create };
})();
