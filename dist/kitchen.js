import * as THREE from "three";

export function createKitchenInterior(kitchen) {
  const interior = new THREE.Group();
  const peopleRoot = new THREE.Group();
  kitchen.group.add(interior, peopleRoot);

  const material = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const wall = material(0xc3c9bd);
  const steel = material(0x9ca9a5);
  const wood = material(0xb29b71);
  const dark = material(0x293837);

  function block(parent, dimensions, position, surface) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), surface);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Equal halves: two-room layout
  // Left room: storage, medicine shelves, pantry
  block(interior, [4.3, 0.035, 5.6], [-2.2, 0.22, 0], material(0x91a9ad));
  // Right room: warm kitchen workshop
  block(interior, [4.3, 0.035, 5.6], [2.2, 0.22, 0], material(0xc0ab7f));

  for (const side of [-1, 1])
    block(interior, [0.12, 2.45, 2.3], [0, 1.43, side * 1.75], wall);
  block(interior, [0.15, 0.35, 1.2], [0, 2.48, 0], wall);

  // Storage / pantry shelves in the left room
  block(interior, [0.6, 2.1, 4.6], [-3.95, 1.3, 0], steel);
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 0.68 + shelf * 0.57;
    block(interior, [0.7, 0.07, 4.6], [-3.9, y, 0], wood);
    for (let bottle = 0; bottle < 7; bottle++) {
      block(
        interior,
        [0.22, 0.28, 0.25],
        [-3.5, y + 0.18, -1.8 + bottle * 0.6],
        material(bottle % 2 ? 0xe4eee4 : 0x90b6af),
      );
    }
  }

  // Produce harvest crates in pantry
  const crateMat = material(0xc29964);
  const cabbageMat = material(0x5da848);
  const potatoMat = material(0xbf9b63);
  for (const cz of [-1.1, 0.9]) {
    const crate = block(interior, [0.55, 0.28, 0.55], [-2.8, 0.36, cz], crateMat);
    // Produce mounds
    for (let pi = 0; pi < 4; pi++) {
      const px = (pi % 2 - 0.5) * 0.18;
      const pz = (Math.floor(pi / 2) - 0.5) * 0.18;
      const prod = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        cz < 0 ? cabbageMat : potatoMat,
      );
      prod.position.set(px, 0.14, pz);
      crate.add(prod);
    }
  }

  // Long preparation counter along east wall
  block(interior, [0.7, 0.82, 4.7], [3.9, 0.65, 0], wood);
  block(interior, [0.85, 0.07, 4.8], [3.85, 1.1, 0], steel);

  // ==========================================================================
  // 3D CULINARY STATIONS & FOOD EQUIPMENT
  // ==========================================================================

  // --- STATION 1: SIMMERING STOCKPOT ON BURNER 1 (z = -1.25) ---
  const potMat = material(0x2d3436);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.22, 0.3, 16),
    potMat,
  );
  pot.position.set(3.85, 1.28, -1.25);
  interior.add(pot);

  // Pot rim
  const potRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.02, 6, 16),
    potMat,
  );
  potRim.rotation.x = Math.PI / 2;
  potRim.position.set(3.85, 1.43, -1.25);
  interior.add(potRim);

  // Two loop handles
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.015, 6, 12),
      potMat,
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(3.85, 1.38, -1.25 + side * 0.27);
    interior.add(handle);
  }

  // Golden simmering broth
  const brothMat = new THREE.MeshStandardMaterial({
    color: 0xdf9b32,
    roughness: 0.2,
    emissive: 0x552200,
    emissiveIntensity: 0.35,
  });
  const broth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.02, 16),
    brothMat,
  );
  broth.position.set(3.85, 1.39, -1.25);
  interior.add(broth);

  // Diced carrot & herb garnishes floating on soup
  const carrotGarnishMat = material(0xf26c1b);
  const herbGarnishMat = material(0x4ca832);
  for (let g = 0; g < 6; g++) {
    const ga = (g / 6) * Math.PI * 2;
    const gr = 0.06 + (g % 3) * 0.05;
    const isCarrot = g % 2 === 0;
    const chunk = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.015, 0.035),
      isCarrot ? carrotGarnishMat : herbGarnishMat,
    );
    chunk.position.set(
      3.85 + Math.cos(ga) * gr,
      1.405,
      -1.25 + Math.sin(ga) * gr,
    );
    chunk.rotation.y = ga;
    interior.add(chunk);
  }

  // Glowing gas burner ring
  const flameRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.025, 6, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6b1a }),
  );
  flameRing.rotation.x = Math.PI / 2;
  flameRing.position.set(3.85, 1.15, -1.25);
  interior.add(flameRing);

  // Rising animated steam puffs above stockpot
  const steamPuffs = [];
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  for (let s = 0; s < 6; s++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 8),
      steamMat.clone(),
    );
    interior.add(puff);
    steamPuffs.push({
      mesh: puff,
      phase: s * 1.1,
      speed: 0.28 + (s % 3) * 0.04,
      driftX: (Math.sin(s * 1.7) - 0.5) * 0.08,
      driftZ: (Math.cos(s * 1.7) - 0.5) * 0.08,
    });
  }

  // --- STATION 2: SAUTE SKILLET ON BURNER 2 (z = -0.45) ---
  const skillet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.06, 16),
    potMat,
  );
  skillet.position.set(3.85, 1.16, -0.45);
  interior.add(skillet);

  // Long skillet handle extending west towards the chef
  const skilletHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.035, 0.045),
    dark,
  );
  skilletHandle.position.set(3.55, 1.18, -0.45);
  interior.add(skilletHandle);

  // Burner ring under skillet
  const burnerRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.025, 6, 16),
    dark,
  );
  burnerRing2.rotation.x = Math.PI / 2;
  burnerRing2.position.set(3.85, 1.14, -0.45);
  interior.add(burnerRing2);

  // Breakfast sizzling in skillet: 2 sunny-side-up eggs + crispy bacon strips
  const eggWhiteMat = material(0xfcfcf7);
  const eggYolkMat = material(0xf9a825);
  const baconMat = material(0x8a2f20);

  for (const ez of [-0.51, -0.39]) {
    const eggWhite = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.015, 12),
      eggWhiteMat,
    );
    eggWhite.position.set(3.85, 1.185, ez);
    interior.add(eggWhite);

    const eggYolk = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 6),
      eggYolkMat,
    );
    eggYolk.position.set(3.85, 1.198, ez);
    eggYolk.scale.set(1, 0.7, 1);
    interior.add(eggYolk);
  }

  for (const bx of [3.76, 3.94]) {
    const bacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.012, 0.16),
      baconMat,
    );
    bacon.position.set(bx, 1.185, -0.45);
    bacon.rotation.y = 0.15;
    interior.add(bacon);
  }

  // --- STATION 3: BUTCHER'S CUTTING BOARD & PREP VEGGIES (z = 1.15) ---
  const boardMat = material(0xcca066);
  const cuttingBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.05, 0.7),
    boardMat,
  );
  cuttingBoard.position.set(3.82, 1.16, 1.15);
  interior.add(cuttingBoard);

  // Whole carrot with leafy green stem
  const carrotBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.036, 0.24, 8),
    carrotGarnishMat,
  );
  carrotBody.position.set(3.82, 1.195, 1.35);
  carrotBody.rotation.x = Math.PI / 2;
  interior.add(carrotBody);

  const carrotGreens = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 6, 6),
    herbGarnishMat,
  );
  carrotGreens.position.set(3.82, 1.205, 1.48);
  carrotGreens.scale.set(0.6, 0.5, 1.3);
  interior.add(carrotGreens);

  // Sliced neat carrot discs beside the whole carrot
  for (let sc = 0; sc < 4; sc++) {
    const slice = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.015, 8),
      carrotGarnishMat,
    );
    slice.position.set(3.72, 1.195, 1.22 - sc * 0.04);
    slice.rotation.x = Math.PI / 2;
    interior.add(slice);
  }

  // Diced ripe red tomatoes
  const tomatoMat = material(0xd63025);
  for (let ti = 0; ti < 4; ti++) {
    const tom = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.032, 0.032),
      tomatoMat,
    );
    tom.position.set(3.92, 1.2, 1.05 + (ti % 2) * 0.04);
    tom.rotation.y = ti * 0.4;
    interior.add(tom);
  }

  // Chopped green spring scallions
  for (let si = 0; si < 5; si++) {
    const scal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6),
      herbGarnishMat,
    );
    scal.position.set(3.84, 1.195, 0.98 + (si % 3) * 0.04);
    scal.rotation.z = Math.PI / 2;
    interior.add(scal);
  }

  // ==========================================================================
  // COOKING CHARACTERS (HEAD COOK & KITCHEN ASSISTANT)
  // ==========================================================================

  let toonRamp = null;
  function getToonRamp() {
    if (!toonRamp) {
      const c = document.createElement("canvas");
      c.width = 4;
      c.height = 1;
      const x = c.getContext("2d");
      const steps = [70, 135, 205, 255];
      for (let i = 0; i < 4; i++) {
        const v = steps[i];
        x.fillStyle = `rgb(${v},${v},${v})`;
        x.fillRect(i, 0, 1, 1);
      }
      toonRamp = new THREE.CanvasTexture(c);
      toonRamp.minFilter = THREE.NearestFilter;
      toonRamp.magFilter = THREE.NearestFilter;
      toonRamp.generateMipmaps = false;
    }
    return toonRamp;
  }

  const ghibliMat = (
    color,
    roughness = 0.85,
    emissive = 0x000000,
    emissiveIntensity = 0.08,
  ) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonRamp(),
      emissive,
      emissiveIntensity,
    });

  const animeSkin = ghibliMat(0xfae2cf, 0.88, 0x3d2015, 0.12);
  const animeBlush = ghibliMat(0xf28e80, 0.9, 0x48100e, 0.22);
  const animeEye = ghibliMat(0x1a1210, 0.2);
  const animeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const strawHat = ghibliMat(0xdfbc6a, 0.85);
  const hatRibbon = ghibliMat(0xb84232, 0.8);
  const newsboyCap = ghibliMat(0xc55c43, 0.85);
  const cookShirt = ghibliMat(0x4d8a7c, 0.85);
  const cookApron = ghibliMat(0xf4eedb, 0.9);
  const specialistShirt = ghibliMat(0xd89e44, 0.85);
  const dungarees = ghibliMat(0x34485e, 0.85);
  const trousers = ghibliMat(0x3a4a5c, 0.85);
  const leatherBoot = ghibliMat(0x4d382b, 0.8);
  const darkBoot = ghibliMat(0x3d2d24, 0.8);
  const hairDark = ghibliMat(0x281c17, 0.85);
  const hairChestnut = ghibliMat(0x3a281f, 0.85);

  const cooks = [];

  for (let i = 0; i < 2; i++) {
    const person = new THREE.Group();
    peopleRoot.add(person);

    const isCook = i === 0;
    const shirt = isCook ? cookShirt : specialistShirt;
    const pants = isCook ? trousers : dungarees;
    const boots = isCook ? leatherBoot : darkBoot;
    const hair = isCook ? hairChestnut : hairDark;

    // Rounded torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.19, 0.58, 12),
      shirt,
    );
    torso.position.y = 1.08;
    torso.castShadow = true;
    person.add(torso);

    if (isCook) {
      // Natural linen bib apron
      block(torso, [0.28, 0.46, 0.05], [0, 0.02, 0.18], cookApron);
      block(torso, [0.38, 0.06, 0.04], [0, -0.12, 0], cookApron);
    } else {
      // Dungarees bib and straps
      block(torso, [0.26, 0.38, 0.05], [0, -0.04, 0.18], dungarees);
      block(torso, [0.06, 0.48, 0.04], [-0.1, 0.05, 0.16], dungarees);
      block(torso, [0.06, 0.48, 0.04], [0.1, 0.05, 0.16], dungarees);
    }

    // Anime head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), animeSkin);
    head.position.y = 1.55;
    person.add(head);

    // Rosy anime blush cheeks
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        animeBlush,
      );
      blush.position.set(side * 0.11, 1.51, 0.12);
      blush.scale.set(1, 0.7, 0.4);
      head.add(blush);
    }

    // Expressive anime eyes with catchlights
    for (const side of [-1, 1]) {
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        animeEye,
      );
      pupil.position.set(side * 0.075, 1.56, 0.14);
      head.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        animeGlint,
      );
      glint.position.set(side * 0.078 + 0.003, 1.568, 0.155);
      head.add(glint);
    }

    // Anime hair tufts
    const bangs = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hair,
    );
    bangs.position.set(0, 1.57, 0.02);
    head.add(bangs);

    if (isCook) {
      // Classic Ghibli straw sun hat
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.025, 16),
        strawHat,
      );
      brim.position.set(0, 1.69, 0);
      head.add(brim);

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.18, 0.12, 16),
        strawHat,
      );
      crown.position.set(0, 1.76, 0);
      head.add(crown);

      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175, 0.182, 0.035, 16),
        hatRibbon,
      );
      ribbon.position.set(0, 1.72, 0);
      head.add(ribbon);
    } else {
      // Ghibli newsboy work cap in warm rust
      const capCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 12, 8),
        newsboyCap,
      );
      capCrown.scale.set(1.05, 0.75, 1.05);
      capCrown.position.set(0, 1.68, -0.01);
      head.add(capCrown);

      const visor = block(head, [0.22, 0.025, 0.14], [0, 1.66, 0.16], newsboyCap);
      visor.rotation.x = 0.18;
    }

    // Articulated limbs
    let leftArm, rightArm, leftLeg, rightLeg;

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.81, 0);
      person.add(leg);

      block(leg, [0.14, 0.58, 0.16], [0, -0.29, 0], pants);
      if (isCook) block(leg, [0.15, 0.07, 0.17], [0, -0.58, 0], cookApron);
      block(leg, [0.16, 0.14, 0.26], [0, -0.66, 0.04], boots);

      const arm = new THREE.Group();
      arm.position.set(side * 0.27, 1.32, 0);
      person.add(arm);

      block(arm, [0.12, 0.42, 0.12], [0, -0.21, 0], shirt);
      if (isCook) block(arm, [0.13, 0.05, 0.13], [0, -0.42, 0], cookApron);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        animeSkin,
      );
      hand.position.set(0, -0.48, 0);
      arm.add(hand);

      if (side === -1) {
        leftArm = arm;
        leftLeg = leg;
      } else {
        rightArm = arm;
        rightLeg = leg;
      }
    }

    // Attach Culinary Utensils to Hands
    let chefKnife, woodenLadle, seasonShaker, prepCrate, cleanTowel;

    if (isCook) {
      // 1. Chef's Knife (in right hand)
      chefKnife = new THREE.Group();
      // Wooden handle
      block(chefKnife, [0.03, 0.12, 0.03], [0, 0, 0], material(0x4a2e1b));
      // Shiny stainless steel blade
      const knifeBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.22, 0.06),
        steel,
      );
      knifeBlade.position.set(0, 0.15, 0.015);
      chefKnife.add(knifeBlade);
      chefKnife.position.set(0, -0.48, 0.05);
      chefKnife.rotation.set(Math.PI / 2, 0, 0);
      rightArm.add(chefKnife);

      // 2. Wooden Soup Ladle / Tasting Spoon (in right hand)
      woodenLadle = new THREE.Group();
      const ladleHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8),
        material(0xcfa76e),
      );
      ladleHandle.position.set(0, 0.14, 0);
      woodenLadle.add(ladleHandle);
      const ladleBowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        material(0xcfa76e),
      );
      ladleBowl.position.set(0, 0.33, 0.02);
      ladleBowl.rotation.x = Math.PI;
      woodenLadle.add(ladleBowl);
      woodenLadle.position.set(0, -0.48, 0.05);
      woodenLadle.rotation.set(Math.PI / 2, 0, 0);
      woodenLadle.visible = false;
      rightArm.add(woodenLadle);
    } else {
      // Assistant tools:
      // 1. Seasoning / Salt Shaker (in right hand)
      seasonShaker = new THREE.Group();
      const shakerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.045, 0.14, 10),
        material(0xede9e1),
      );
      seasonShaker.add(shakerBody);
      const shakerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.03, 10),
        steel,
      );
      shakerCap.position.y = 0.08;
      seasonShaker.add(shakerCap);
      seasonShaker.position.set(0, -0.48, 0.05);
      rightArm.add(seasonShaker);

      // 2. Cleaning Towel (in right hand)
      cleanTowel = block(
        rightArm,
        [0.1, 0.06, 0.15],
        [0, -0.48, 0.05],
        material(0xffffff),
      );
      cleanTowel.visible = false;

      // 3. Harvest Produce Crate carried across kitchen
      prepCrate = new THREE.Group();
      block(prepCrate, [0.42, 0.18, 0.35], [0, 0, 0], crateMat);
      for (let cp = 0; cp < 3; cp++) {
        const prod = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 8, 8),
          cp % 2 === 0 ? cabbageMat : carrotGarnishMat,
        );
        prod.position.set((cp - 1) * 0.12, 0.09, 0);
        prepCrate.add(prod);
      }
      prepCrate.position.set(0, 0.95, 0.36);
      prepCrate.visible = false;
      person.add(prepCrate);
    }

    cooks.push({
      person,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      isCook,
      chefKnife,
      woodenLadle,
      seasonShaker,
      prepCrate,
      cleanTowel,
    });
  }

  // ==========================================================================
  // COOKING WORKFLOW EXECUTION
  // ==========================================================================

  function update(time) {
    // 1. Animate rising translucent steam puffs from the simmering stockpot
    for (const puff of steamPuffs) {
      const t = (time * puff.speed + puff.phase) % 1.0;
      puff.mesh.position.set(
        3.85 + Math.sin(t * Math.PI * 2) * 0.04 + puff.driftX * t,
        1.45 + t * 0.75,
        -1.25 + Math.cos(t * Math.PI * 2) * 0.04 + puff.driftZ * t,
      );
      const s = 0.5 + t * 1.8;
      puff.mesh.scale.set(s, s * 0.8, s);
      puff.mesh.material.opacity = Math.sin(t * Math.PI) * 0.32;
    }

    // 2. Head Cook Cooking Routine (36s loop)
    // - 0s to 12s: Chopping at Cutting Board (z = 1.15)
    // - 12s to 15s: Walk to Simmering Stockpot (z: 1.15 -> -1.25)
    // - 15s to 23s: Stirring Stockpot with wooden ladle
    // - 23s to 27s: Taste-testing broth & nodding approvingly!
    // - 27s to 29s: Walk to Saute Skillet (z: -1.25 -> -0.45)
    // - 29s to 33s: Chef Pan Tosses at Burner 2
    // - 33s to 36s: Walk back to Cutting Board (z: -0.45 -> 1.15)
    const cook = cooks[0];
    const cookCycle = time % 36.0;

    let cookX = 3.25;
    let cookZ = 1.15;
    let cookRotY = -Math.PI / 2; // Facing East towards prep counter
    let cookWalk = false;
    let cookStride = 0;

    if (cookCycle < 12.0) {
      // --- PHASE A: CHOPPING VEGGIES AT CUTTING BOARD ---
      cook.chefKnife.visible = true;
      cook.woodenLadle.visible = false;
      cookX = 3.25;
      cookZ = 1.15;
      cookRotY = -Math.PI / 2;

      // Left hand holds carrot steady on board
      cook.leftArm.rotation.set(0.68, 0.22, -0.32);
      // Right hand rocks chef's knife in rhythmic staccato chops (chop-chop-chop)
      const chop = Math.pow(Math.max(0, Math.sin(time * 10.0)), 3.0) * 0.38;
      cook.rightArm.rotation.set(0.72 - chop, -0.15, 0.28);
      // Head nods down in deep culinary focus
      cook.head.rotation.set(0.24 + chop * 0.08, 0, 0);

      cook.leftLeg.rotation.set(0, 0, 0);
      cook.rightLeg.rotation.set(0, 0, 0);
      cook.person.position.set(cookX, 0.23, cookZ);
    } else if (cookCycle < 15.0) {
      // --- WALK TO STOCKPOT ---
      cook.chefKnife.visible = false;
      cook.woodenLadle.visible = true;
      const t = (cookCycle - 12.0) / 3.0;
      cookX = 3.25;
      cookZ = 1.15 + ( -1.25 - 1.15 ) * t;
      cookRotY = Math.PI; // Heading South
      cookWalk = true;
    } else if (cookCycle < 23.0) {
      // --- PHASE B: STIRRING STOCKPOT WITH LADLE ---
      cook.chefKnife.visible = false;
      cook.woodenLadle.visible = true;
      cookX = 3.25;
      cookZ = -1.25;
      cookRotY = -Math.PI / 2;

      // Left hand rests on hip
      cook.leftArm.rotation.set(0.35, 0, -0.45);
      // Right hand with ladle swirls in smooth circular stirring orbits
      const swirlT = time * 3.5;
      cook.rightArm.rotation.set(
        0.75 + Math.sin(swirlT) * 0.16,
        Math.cos(swirlT) * 0.12,
        0.25 + Math.cos(swirlT) * 0.14,
      );
      cook.head.rotation.set(0.18, 0, 0);

      cook.leftLeg.rotation.set(0, 0, 0);
      cook.rightLeg.rotation.set(0, 0, 0);
      cook.person.position.set(cookX, 0.23, cookZ);
    } else if (cookCycle < 27.0) {
      // --- PHASE C: TASTE-TESTING BROTH & NODDING ---
      cook.chefKnife.visible = false;
      cook.woodenLadle.visible = true;
      cookX = 3.25;
      cookZ = -1.25;
      cookRotY = -Math.PI / 2;

      // Left hand rests on chest
      cook.leftArm.rotation.set(0.65, 0.1, -0.3);
      // Right hand lifts ladle up to chin/mouth
      cook.rightArm.rotation.set(1.48, -0.28, 0.48);
      // Sips broth then nods approvingly
      const tasteT = cookCycle - 23.0;
      if (tasteT < 2.0) {
        // Tasting sip: head tilted slightly back
        cook.head.rotation.set(-0.14, 0, 0);
      } else {
        // Enthusiastic satisfied nod ("Delicious!")
        cook.head.rotation.set(Math.sin(time * 7.0) * 0.18, 0, 0);
      }

      cook.leftLeg.rotation.set(0, 0, 0);
      cook.rightLeg.rotation.set(0, 0, 0);
      cook.person.position.set(cookX, 0.23, cookZ);
    } else if (cookCycle < 29.0) {
      // --- WALK TO SKILLET ---
      cook.chefKnife.visible = true;
      cook.woodenLadle.visible = false;
      const t = (cookCycle - 27.0) / 2.0;
      cookX = 3.25;
      cookZ = -1.25 + ( -0.45 - -1.25 ) * t;
      cookRotY = 0; // Heading North
      cookWalk = true;
    } else if (cookCycle < 33.0) {
      // --- PHASE D: SAUTE SKILLET PAN TOSS ---
      cook.chefKnife.visible = true;
      cook.woodenLadle.visible = false;
      cookX = 3.25;
      cookZ = -0.45;
      cookRotY = -Math.PI / 2;

      // Right hand grips pan handle and executes 3 snappy chef wrist tosses
      const toss = Math.pow(Math.max(0, Math.sin(time * 6.0)), 4.0) * 0.32;
      cook.rightArm.rotation.set(0.85 - toss, 0, 0.2);
      cook.leftArm.rotation.set(0.35, 0, -0.35);
      cook.head.rotation.set(0.18 - toss * 0.15, 0, 0);

      cook.leftLeg.rotation.set(0, 0, 0);
      cook.rightLeg.rotation.set(0, 0, 0);
      cook.person.position.set(cookX, 0.23, cookZ);
    } else {
      // --- WALK BACK TO CUTTING BOARD ---
      cook.chefKnife.visible = true;
      cook.woodenLadle.visible = false;
      const t = (cookCycle - 33.0) / 3.0;
      cookX = 3.25;
      cookZ = -0.45 + ( 1.15 - -0.45 ) * t;
      cookRotY = 0; // Heading North
      cookWalk = true;
    }

    if (cookWalk) {
      const walkBounce = Math.abs(Math.sin(time * 6.0)) * 0.035;
      cookStride = Math.sin(time * 6.0) * 0.42;
      cook.person.position.set(cookX, 0.23 + walkBounce, cookZ);
      cook.leftLeg.rotation.set(cookStride, 0, 0);
      cook.rightLeg.rotation.set(-cookStride, 0, 0);
      cook.leftArm.rotation.set(-cookStride * 0.7, 0, 0);
      cook.rightArm.rotation.set(cookStride * 0.7, 0, 0);
      cook.head.rotation.set(0, 0, 0);
    }
    cook.person.rotation.y = cookRotY;

    // 3. Kitchen Assistant Cooking Routine (36s loop)
    // - 0s to 10s: Seasoning the stockpot with pepper shaker (tap-tap-tap)
    // - 10s to 15s: Walk to pantry shelf in storage room
    // - 15s to 19s: Retrieve fresh harvest produce crate
    // - 19s to 25s: Walk back carrying crate in both hands to prep counter
    // - 25s to 33s: Wipe the counter clean with towel in smooth buffing circles
    // - 33s to 36s: Walk back to stockpot station
    const asst = cooks[1];
    const asstCycle = time % 36.0;

    let asstX = 3.25;
    let asstZ = -1.65;
    let asstRotY = -Math.PI / 2;
    let asstWalk = false;
    let asstStride = 0;

    if (asstCycle < 10.0) {
      // --- PHASE A: SEASONING THE SIMMERING POT ---
      asst.seasonShaker.visible = true;
      asst.prepCrate.visible = false;
      asst.cleanTowel.visible = false;
      asstX = 3.25;
      asstZ = -1.65;
      asstRotY = -Math.PI / 2.5;

      // Right arm reaches over pot and shakes seasoning (tap-tap-tap)
      const shake = Math.sin(time * 16.0) * 0.18;
      asst.rightArm.rotation.set(0.95 + shake, -0.25, 0.25);
      asst.leftArm.rotation.set(0.35, 0, -0.35);
      asst.head.rotation.set(0.25, -0.15, 0);

      asst.leftLeg.rotation.set(0, 0, 0);
      asst.rightLeg.rotation.set(0, 0, 0);
      asst.person.position.set(asstX, 0.23, asstZ);
    } else if (asstCycle < 15.0) {
      // --- WALK TO PANTRY IN STORAGE ROOM ---
      asst.seasonShaker.visible = false;
      asst.prepCrate.visible = false;
      asst.cleanTowel.visible = false;
      const t = (asstCycle - 10.0) / 5.0;
      // Curves through central door (x: 0, z: 0) into pantry (x: -2.2, z: 0.5)
      asstX = 3.25 + ( -2.2 - 3.25 ) * t;
      asstZ = -1.65 + ( 0.5 - -1.65 ) * t;
      asstRotY = Math.atan2(-2.2 - 3.25, 0.5 - -1.65);
      asstWalk = true;
    } else if (asstCycle < 19.0) {
      // --- RETRIEVE PRODUCE CRATE IN PANTRY ---
      asst.seasonShaker.visible = false;
      asst.cleanTowel.visible = false;
      asstX = -2.2;
      asstZ = 0.5;
      asstRotY = -Math.PI / 2;

      // Bends down to shelf, then picks up crate
      const tBend = asstCycle - 15.0;
      if (tBend < 2.0) {
        asst.prepCrate.visible = false;
        asst.torso.rotation.x = 0.25;
        asst.leftArm.rotation.set(0.7, 0, 0);
        asst.rightArm.rotation.set(0.7, 0, 0);
      } else {
        asst.prepCrate.visible = true;
        asst.torso.rotation.x = 0;
        asst.leftArm.rotation.set(1.2, 0.35, -0.2);
        asst.rightArm.rotation.set(1.2, -0.35, 0.2);
      }
      asst.head.rotation.set(0.2, 0, 0);
      asst.leftLeg.rotation.set(0, 0, 0);
      asst.rightLeg.rotation.set(0, 0, 0);
      asst.person.position.set(asstX, 0.23, asstZ);
    } else if (asstCycle < 25.0) {
      // --- WALK BACK CARRYING PRODUCE CRATE IN TWO HANDS ---
      asst.prepCrate.visible = true;
      asst.cleanTowel.visible = false;
      asst.seasonShaker.visible = false;
      const t = (asstCycle - 19.0) / 6.0;
      asstX = -2.2 + ( 3.25 - -2.2 ) * t;
      asstZ = 0.5 + ( 0.35 - 0.5 ) * t;
      asstRotY = Math.atan2(3.25 - -2.2, 0.35 - 0.5);

      const walkBounce = Math.abs(Math.sin(time * 5.0)) * 0.03;
      asstStride = Math.sin(time * 5.0) * 0.38;
      asst.person.position.set(asstX, 0.23 + walkBounce, asstZ);
      asst.leftLeg.rotation.set(asstStride, 0, 0);
      asst.rightLeg.rotation.set(-asstStride, 0, 0);
      // Both arms bent holding crate firmly
      asst.leftArm.rotation.set(1.2, 0.35, -0.2);
      asst.rightArm.rotation.set(1.2, -0.35, 0.2);
      asst.head.rotation.set(0, 0, 0);
    } else if (asstCycle < 33.0) {
      // --- PHASE C: WIPING THE COUNTER WITH TOWEL ---
      asst.prepCrate.visible = false;
      asst.cleanTowel.visible = true;
      asst.seasonShaker.visible = false;
      asstX = 3.25;
      asstZ = 0.35;
      asstRotY = -Math.PI / 2;

      // Left hand rests on counter
      asst.leftArm.rotation.set(0.55, 0.2, -0.25);
      // Right hand buffs counter in wide circular strokes (wax on, wax off)
      const wipeT = time * 4.5;
      asst.rightArm.rotation.set(
        0.65 + Math.sin(wipeT) * 0.22,
        Math.cos(wipeT) * 0.28,
        0.25,
      );
      asst.torso.rotation.y = Math.sin(wipeT) * 0.08;
      asst.head.rotation.set(0.25, Math.cos(wipeT) * 0.1, 0);

      asst.leftLeg.rotation.set(0, 0, 0);
      asst.rightLeg.rotation.set(0, 0, 0);
      asst.person.position.set(asstX, 0.23, asstZ);
    } else {
      // --- WALK BACK TO STOCKPOT STATION ---
      asst.prepCrate.visible = false;
      asst.cleanTowel.visible = false;
      asst.seasonShaker.visible = true;
      const t = (asstCycle - 33.0) / 3.0;
      asstX = 3.25;
      asstZ = 0.35 + ( -1.65 - 0.35 ) * t;
      asstRotY = Math.PI; // Heading South
      asstWalk = true;
    }

    if (asstWalk) {
      const walkBounce = Math.abs(Math.sin(time * 6.0)) * 0.035;
      asstStride = Math.sin(time * 6.0) * 0.42;
      asst.person.position.set(asstX, 0.23 + walkBounce, asstZ);
      asst.leftLeg.rotation.set(asstStride, 0, 0);
      asst.rightLeg.rotation.set(-asstStride, 0, 0);
      asst.leftArm.rotation.set(-asstStride * 0.7, 0, 0);
      asst.rightArm.rotation.set(asstStride * 0.7, 0, 0);
      asst.torso.rotation.set(0, 0, 0);
      asst.head.rotation.set(0, 0, 0);
    }
    asst.person.rotation.y = asstRotY;
  }

  update(0);

  return {
    interior,
    peopleRoot,
    update,
    peopleCount: cooks.length,
    medicineCentre: kitchen.point(-2.2, 0, 0.3),
    kitchenCentre: kitchen.point(2.2, 0, 0.3),
  };
}
