import * as THREE from "three";

// Pen counts follow the user's plan. Dimensions are illustrative within each roof.
export function createInteriors(buildings, scene) {
  const enclosures = [];
  const animals = [];
  const counts = {};
  const interiorGroups = [];
  const animalRoot = new THREE.Group();
  scene.add(animalRoot);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x82796b,
    roughness: 1,
  });
  const pathMaterial = new THREE.MeshStandardMaterial({
    color: 0xc6bba1,
    roughness: 1,
  });
  const fenceMaterial = new THREE.LineBasicMaterial({ color: 0xced3c4 });

  function addFloor(parent, width, depth, x, z, material) {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.035, depth),
      material,
    );
    floor.position.set(x, 0.205, z);
    floor.receiveShadow = true;
    parent.add(floor);
  }

  function rail(vertices, x1, z1, x2, z2) {
    for (const y of [0.4, 0.75, 1.1]) vertices.push(x1, y, z1, x2, y, z2);
    const pieces = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.55));
    for (let i = 0; i <= pieces; i++) {
      const t = i / pieces;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      vertices.push(x, 0.22, z, x, 1.13, z);
    }
  }

  // PRNG helper for deterministic, diverse farm population
  let seed = 91823;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  // Authentic Pig Breeds palette (varied coats & soft matching bellies)
  const pigBreeds = [
    // 1. Classic Rosy Landrace / Large White
    { coat: 0xfab5ad, belly: 0xfde4df, name: "Landrace" },
    // 2. Yorkshire Cream (pale warm ivory pink)
    { coat: 0xfce4de, belly: 0xfff0ec, name: "Yorkshire" },
    // 3. Berkshire Belted Black (dark charcoal slate)
    { coat: 0x36302e, belly: 0x544e4b, name: "Berkshire" },
    // 4. Tamworth Russet / Red-Gold
    { coat: 0xcf783e, belly: 0xe8b890, name: "Tamworth" },
    // 5. Gloucester Sandy Spotted / Piebald
    { coat: 0xd6a276, belly: 0xf5dac0, name: "Gloucester" },
    // 6. Sunset Peach Rose
    { coat: 0xf0998d, belly: 0xfce2db, name: "Sunset" },
  ];

  function createPigAnimal(shed, x, z, cellWidth, depth, side) {
    const breedIdx = Math.floor(rnd() * pigBreeds.length);
    const breed = pigBreeds[breedIdx];

    // Age and size variety: piglets (15%), market pigs (60%), large sows/boars (25%)
    const sizeRoll = rnd();
    let size = 0.95 + (rnd() - 0.5) * 0.15;
    if (sizeRoll < 0.15) {
      size = 0.68 + rnd() * 0.12; // Cute piglet
    } else if (sizeRoll > 0.75) {
      size = 1.16 + rnd() * 0.14; // Large mature sow
    }
    size = Math.min(size, cellWidth / 1.15);

    const radX = Math.max(0.04, cellWidth / 2 - 0.45);
    const radZ = Math.max(0.04, Math.min(0.65, depth / 2 - 0.75));
    const initialFacing = side === -1 ? 0 : Math.PI;

    return {
      species: "pig",
      shed,
      penX: x,
      penZ: z,
      radiusX: radX,
      radiusZ: radZ,
      size,
      coatColor: new THREE.Color(breed.coat),
      bellyColor: new THREE.Color(breed.belly),
      droopEar: rnd() > 0.35, // Floppy vs perky ears

      // Autonomous Behavior State Machine:
      // 0: ROOTING, 1: WALKING, 2: SNIFFING, 3: NAPPING
      state: Math.floor(rnd() * 4),
      stateTimer: rnd() * 3.0,
      stateDuration: 3.0 + rnd() * 4.5,
      curX: x + (rnd() - 0.5) * radX * 1.2,
      curZ: z + (rnd() - 0.5) * radZ * 1.2,
      targetX: x,
      targetZ: z,
      facing: initialFacing + (rnd() - 0.5) * 0.6,
      targetFacing: initialFacing,
      walkPhase: rnd() * Math.PI * 2,
      sniffDir: rnd() > 0.5 ? 1 : -1,
      seed: rnd(),
    };
  }

  function pens(id, rowCounts, pathway) {
    const shed = buildings[id];
    const group = new THREE.Group();
    shed.group.add(group);
    interiorGroups.push(group);
    const width = shed.w - 0.8;
    const depth = (shed.d - pathway) / 2 - 0.35;
    const vertices = [];
    addFloor(group, width, pathway, 0, 0, pathMaterial);
    counts[id] = rowCounts.reduce((sum, count) => sum + count, 0);
    for (const [row, count] of rowCounts.entries()) {
      const side = row === 0 ? -1 : 1;
      const z = side * (pathway / 2 + depth / 2);
      const cellWidth = width / count;
      rail(vertices, -width / 2, z - depth / 2, width / 2, z - depth / 2);
      rail(vertices, -width / 2, z + depth / 2, width / 2, z + depth / 2);
      for (let i = 0; i <= count; i++) {
        const x = -width / 2 + i * cellWidth;
        rail(vertices, x, z - depth / 2, x, z + depth / 2);
      }
      for (let i = 0; i < count; i++) {
        const x = -width / 2 + (i + 0.5) * cellWidth;
        addFloor(group, cellWidth - 0.08, depth - 0.08, x, z, floorMaterial);
        const pen = {
          id: `${id}-${row + 1}-${i + 1}`,
          shed: id,
          x,
          z,
          width: cellWidth,
          depth,
        };
        enclosures.push(pen);
        animals.push(createPigAnimal(shed, x, z, cellWidth, depth, side));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    group.add(new THREE.LineSegments(geometry, fenceMaterial));
  }

  // Shed A has two distinct longitudinal footpaths (North and South) flanked by cages
  function pensDoubleFootpath(id) {
    const shed = buildings[id];
    const group = new THREE.Group();
    shed.group.add(group);
    interiorGroups.push(group);
    const width = shed.w - 0.8;
    const vertices = [];

    // Two longitudinal footpaths running the length of Shed A at z = -4.25 and z = +4.25
    const pathZ = 4.25;
    const pathWidth = 1.6;
    addFloor(group, width, pathWidth, 0, -pathZ, pathMaterial);
    addFloor(group, width, pathWidth, 0, pathZ, pathMaterial);

    // Cross-connecting walkways at west and east entrance ends
    addFloor(group, 1.8, 10.4, -width / 2 + 0.9, 0, pathMaterial);
    addFloor(group, 1.8, 10.4, width / 2 - 0.9, 0, pathMaterial);

    // 4 rows of 17 pens = 68 pens total
    const rows = [
      { z: -6.55, depth: 2.85, side: -1 },
      { z: -1.85, depth: 2.95, side: -1 },
      { z: 1.85, depth: 2.95, side: 1 },
      { z: 6.55, depth: 2.85, side: 1 },
    ];
    const countPerRow = 17;
    counts[id] = countPerRow * rows.length; // 68 pens

    const cellWidth = (width - 1.8) / countPerRow;
    const startX = -width / 2 + 0.9;
    const endX = width / 2 - 0.9;

    for (const [rIdx, r] of rows.entries()) {
      const z = r.z;
      const depth = r.depth;
      rail(vertices, startX, z - depth / 2, endX, z - depth / 2);
      rail(vertices, startX, z + depth / 2, endX, z + depth / 2);

      for (let i = 0; i <= countPerRow; i++) {
        const x = startX + i * cellWidth;
        rail(vertices, x, z - depth / 2, x, z + depth / 2);
      }

      for (let i = 0; i < countPerRow; i++) {
        const x = startX + (i + 0.5) * cellWidth;
        addFloor(group, cellWidth - 0.08, depth - 0.08, x, z, floorMaterial);
        const pen = {
          id: `${id}-${rIdx + 1}-${i + 1}`,
          shed: id,
          x,
          z,
          width: cellWidth,
          depth,
        };
        enclosures.push(pen);
        animals.push(createPigAnimal(shed, x, z, cellWidth, depth, r.side));
      }
    }

    // Center divider rail along z = 0
    rail(vertices, startX, 0, endX, 0);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    group.add(new THREE.LineSegments(geometry, fenceMaterial));
  }

  pensDoubleFootpath("shed-a");
  pens("shed-b", [10, 9], 1.6);
  pens("shed-c", [10, 10], 1.8);

  // Shed D: Open Straw-Bedded Poultry Barn
  const chickenShed = buildings["shed-d"];
  const chickenGroup = new THREE.Group();
  chickenShed.group.add(chickenGroup);
  interiorGroups.push(chickenGroup);
  const chickenWidth = chickenShed.w - 0.8;
  const chickenDepth = chickenShed.d - 0.8;
  addFloor(
    chickenGroup,
    chickenWidth,
    chickenDepth,
    0,
    0,
    new THREE.MeshStandardMaterial({ color: 0xb39455, roughness: 1 }),
  );
  const chickenFence = [];
  const corners = [
    [-chickenWidth / 2, -chickenDepth / 2],
    [chickenWidth / 2, -chickenDepth / 2],
    [chickenWidth / 2, chickenDepth / 2],
    [-chickenWidth / 2, chickenDepth / 2],
  ];
  for (let i = 0; i < 4; i++)
    rail(chickenFence, ...corners[i], ...corners[(i + 1) % 4]);
  const chickenGeometry = new THREE.BufferGeometry();
  chickenGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(chickenFence, 3),
  );
  chickenGroup.add(new THREE.LineSegments(chickenGeometry, fenceMaterial));

  // Authentic Chicken Breeds Palette
  const chickenBreeds = [
    // 1. White Leghorn (crisp anime white)
    { feather: 0xffffff, belly: 0xf7ecd2, tail: 0xf0f0eb, name: "White Leghorn" },
    // 2. Rhode Island Red (rich chestnut mahogany)
    { feather: 0x8a2b16, belly: 0xb54d33, tail: 0x52180a, name: "Rhode Island Red" },
    // 3. Buff Orpington (warm golden buff)
    { feather: 0xefa342, belly: 0xf9cb7c, tail: 0xd88827, name: "Buff Orpington" },
    // 4. Black Australorp (charcoal slate)
    { feather: 0x242429, belly: 0x38383e, tail: 0x18181c, name: "Black Australorp" },
    // 5. Barred Plymouth Rock (tweed speckled grey)
    { feather: 0x828487, belly: 0xaaaaad, tail: 0x67696c, name: "Barred Rock" },
    // 6. Golden Comet (cinnamon caramel)
    { feather: 0xce7532, belly: 0xe8a76d, tail: 0xa85317, name: "Golden Comet" },
  ];

  for (let i = 0; i < 16; i++) {
    const isRooster = i === 0 || i === 8;
    const breed = chickenBreeds[(i + (isRooster ? 2 : 0)) % chickenBreeds.length];

    const featherColor = isRooster
      ? new THREE.Color(0xe28a22) // Golden copper hackle mantle
      : new THREE.Color(breed.feather);
    const bellyColor = isRooster
      ? new THREE.Color(0x8a2b16) // Rich chestnut breast
      : new THREE.Color(breed.belly);
    const tailColor = isRooster
      ? new THREE.Color(0x192b1e) // Iridescent dark beetle-green sickle tail
      : new THREE.Color(breed.tail);

    const startX = -chickenWidth / 2 + 1.2 + ((i % 8) * (chickenWidth - 2.4)) / 7;
    const startZ = i < 8 ? -0.85 : 0.85;

    animals.push({
      species: "chicken",
      shed: chickenShed,
      penX: 0,
      penZ: 0,
      minX: -chickenWidth / 2 + 0.8,
      maxX: chickenWidth / 2 - 0.8,
      minZ: -chickenDepth / 2 + 0.7,
      maxZ: chickenDepth / 2 - 0.7,
      isRooster,
      size: isRooster ? 1.25 : 0.88 + rnd() * 0.22,
      featherColor,
      bellyColor,
      tailColor,

      // Autonomous Behavior State Machine:
      // 0: PECKING, 1: SCRATCHING, 2: WALKING, 3: FLAPPING, 4: ALERT
      state: Math.floor(rnd() * 5),
      stateTimer: rnd() * 2.5,
      stateDuration: 2.0 + rnd() * 3.5,
      curX: startX,
      curZ: startZ,
      targetX: startX,
      targetZ: startZ,
      facing: rnd() * Math.PI * 2,
      targetFacing: rnd() * Math.PI * 2,
      walkPhase: rnd() * Math.PI * 2,
      peckPhase: rnd() * Math.PI * 2,
      peckRate: 16.0 + rnd() * 8.0,
      alertDir: rnd() > 0.5 ? 1 : -1,
      seed: rnd(),
    });
  }
  counts["shed-d"] = 1;

  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 10);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
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

  const ghibliMat = (color, emissive = 0x000000, emissiveIntensity = 0.08) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonRamp(),
      emissive,
      emissiveIntensity,
    });

  // Base materials for tintable parts (0xffffff allows setColorAt to apply exact breed coat)
  const pigSkinTintable = ghibliMat(0xffffff, 0x221110, 0.08);
  const pigBellyTintable = ghibliMat(0xffffff, 0x221110, 0.08);

  // Constant kawaii features for all pigs
  const pigSnout = ghibliMat(0xf28b84, 0x401614, 0.14);
  const pigNostril = ghibliMat(0xb3534e, 0x220000, 0.06);
  const pigBlush = ghibliMat(0xf77970, 0x48100e, 0.22);
  const pigHoof = ghibliMat(0x5e4840, 0x1a1210, 0.05);
  const animeEye = ghibliMat(0x1a1311, 0x000000, 0);
  const animeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Chicken materials
  const chickenFeatherTintable = ghibliMat(0xffffff, 0x181810, 0.08);
  const chickenBellyTintable = ghibliMat(0xffffff, 0x181810, 0.08);
  const chickenTailTintable = ghibliMat(0xffffff, 0x181810, 0.08);
  const henComb = ghibliMat(0xe24334, 0x440808, 0.18);
  const henWattle = ghibliMat(0xd83a2d, 0x3d0606, 0.16);
  const henBeak = ghibliMat(0xf6b638, 0x3d2806, 0.1);

  const pigParts = [
    // Chubby, rounded bean body
    {
      geometry: sphere,
      material: pigSkinTintable,
      position: [0, 0.55, 0],
      scale: [0.35, 0.33, 0.61],
      tintable: true,
      body: true,
    },
    // Soft belly under-patch
    {
      geometry: sphere,
      material: pigBellyTintable,
      position: [0, 0.44, 0.03],
      scale: [0.31, 0.26, 0.52],
      tintableBelly: true,
      body: true,
    },
    // Round chubby head
    {
      geometry: sphere,
      material: pigSkinTintable,
      position: [0, 0.61, 0.52],
      scale: [0.28, 0.27, 0.3],
      head: true,
      tintable: true,
    },
    // Adorable rosy anime blush cheeks
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigBlush,
      position: [side * 0.24, 0.56, 0.6],
      scale: [0.075, 0.065, 0.05],
      head: true,
    })),
    // Soft rounded snout button
    {
      geometry: cylinder,
      material: pigSnout,
      position: [0, 0.56, 0.79],
      scale: [0.15, 0.09, 0.13],
      rotation: [Math.PI / 2, 0, 0],
      head: true,
      snout: true,
    },
    // Two cute nostril depressions
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigNostril,
      position: [side * 0.048, 0.56, 0.84],
      scale: [0.024, 0.032, 0.018],
      head: true,
      snout: true,
    })),
    // Floppy/Perky ears
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigSkinTintable,
      position: [side * 0.2, 0.82, 0.49],
      scale: [0.11, 0.18, 0.05],
      rotation: [0.42, side * 0.32, side * 0.48],
      head: true,
      earWiggle: side,
      tintable: true,
    })),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigSnout,
      position: [side * 0.19, 0.81, 0.5],
      scale: [0.075, 0.13, 0.03],
      rotation: [0.42, side * 0.32, side * 0.48],
      head: true,
      earInner: side,
    })),
    // Big expressive anime eyes with white catchlight glints
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: animeEye,
      position: [side * 0.19, 0.68, 0.69],
      scale: [0.036, 0.042, 0.034],
      head: true,
    })),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: animeGlint,
      position: [side * 0.2 + 0.007, 0.698, 0.71],
      scale: [0.014, 0.015, 0.014],
      head: true,
    })),
    // Stumpy chubby legs
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((end) => ({
        geometry: cylinder,
        material: pigSkinTintable,
        position: [side * 0.21, 0.28, end * 0.33],
        scale: [0.082, 0.22, 0.085],
        stride: side * end,
        legEnd: end,
        tintable: true,
      })),
    ),
    // Warm earthy brown cloven hooves
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((end) => ({
        geometry: cylinder,
        material: pigHoof,
        position: [side * 0.21, 0.13, end * 0.33 + 0.012],
        scale: [0.085, 0.1, 0.09],
        stride: side * end,
        legEnd: end,
      })),
    ),
    // Playful spiral curly tail with wag motion
    {
      geometry: new THREE.TorusGeometry(0.085, 0.024, 6, 14, Math.PI * 1.7),
      material: pigSkinTintable,
      position: [0, 0.64, -0.62],
      scale: [1, 1, 1],
      rotation: [0, Math.PI / 2, 0],
      tailWag: true,
      tintable: true,
    },
  ];

  const chickenParts = [
    // Rotund fluffy egg-body
    {
      geometry: sphere,
      material: chickenFeatherTintable,
      position: [0, 0.44, 0],
      scale: [0.24, 0.28, 0.33],
      tintable: true,
    },
    // Fluffy chest / bosom
    {
      geometry: sphere,
      material: chickenBellyTintable,
      position: [0, 0.48, 0.09],
      scale: [0.21, 0.22, 0.25],
      tintableBelly: true,
    },
    // Neck & round head with pecking motion
    {
      geometry: sphere,
      material: chickenFeatherTintable,
      position: [0, 0.67, 0.16],
      scale: [0.12, 0.22, 0.13],
      head: true,
      peck: true,
      tintable: true,
    },
    {
      geometry: sphere,
      material: chickenFeatherTintable,
      position: [0, 0.82, 0.22],
      scale: [0.14, 0.14, 0.15],
      head: true,
      peck: true,
      tintable: true,
    },
    // Scalloped rounded Ghibli comb
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.95, 0.26],
      scale: [0.038, 0.065, 0.055],
      head: true,
      peck: true,
      comb: true,
    },
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.98, 0.2],
      scale: [0.042, 0.085, 0.065],
      head: true,
      peck: true,
      comb: true,
    },
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.94, 0.13],
      scale: [0.038, 0.07, 0.055],
      head: true,
      peck: true,
      comb: true,
    },
    // Wattle droplets under chin
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: henWattle,
      position: [side * 0.024, 0.71, 0.28],
      scale: [0.024, 0.05, 0.028],
      head: true,
      peck: true,
      wattle: true,
    })),
    // Golden beak
    {
      geometry: cone,
      material: henBeak,
      position: [0, 0.8, 0.37],
      scale: [0.045, 0.13, 0.045],
      rotation: [Math.PI / 2, 0, 0],
      head: true,
      peck: true,
    },
    // Inquisitive anime eyes with white catchlight glints
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: animeEye,
      position: [side * 0.11, 0.84, 0.27],
      scale: [0.026, 0.028, 0.026],
      head: true,
      peck: true,
    })),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: animeGlint,
      position: [side * 0.115 + 0.005, 0.852, 0.282],
      scale: [0.011, 0.011, 0.011],
      head: true,
      peck: true,
    })),
    // Fluffy side wings with flapping motion
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: chickenFeatherTintable,
      position: [side * 0.22, 0.46, -0.01],
      scale: [0.065, 0.18, 0.24],
      rotation: [0.1, 0, side * 0.15],
      flap: side,
      tintable: true,
    })),
    // Fan tail feathers
    {
      geometry: cone,
      material: chickenTailTintable,
      position: [0, 0.62, -0.32],
      scale: [0.14, 0.34, 0.09],
      rotation: [-0.68, 0, 0],
      tailWag: true,
      tintableTail: true,
    },
    ...[-1, 1].map((side) => ({
      geometry: cone,
      material: chickenTailTintable,
      position: [side * 0.07, 0.58, -0.3],
      scale: [0.09, 0.28, 0.07],
      rotation: [-0.55, 0, side * 0.3],
      tailWag: true,
      tintableTail: true,
    })),
    // Golden shins & feet
    ...[-1, 1].map((side) => ({
      geometry: cylinder,
      material: henBeak,
      position: [side * 0.08, 0.18, -0.02],
      scale: [0.025, 0.24, 0.025],
      stride: side,
    })),
    ...[-1, 1].map((side) => ({
      geometry: cube,
      material: henBeak,
      position: [side * 0.08, 0.05, 0.03],
      scale: [0.08, 0.04, 0.12],
      stride: side,
    })),
  ];

  const speciesMeshes = [];
  for (const [species, parts] of [
    ["pig", pigParts],
    ["chicken", chickenParts],
  ]) {
    const agents = animals.filter((animal) => animal.species === species);
    const meshes = parts.map((part) => {
      const mesh = new THREE.InstancedMesh(
        part.geometry,
        part.material,
        agents.length,
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.frustumCulled = false;

      // Apply individual breed coat colors
      if (part.tintable || part.tintableBelly || part.tintableTail) {
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i];
          if (part.tintableBelly) {
            mesh.setColorAt(i, a.bellyColor);
          } else if (part.tintableTail) {
            mesh.setColorAt(i, a.tailColor || a.coatColor);
          } else {
            mesh.setColorAt(i, a.species === "pig" ? a.coatColor : a.featherColor);
          }
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }

      animalRoot.add(mesh);
      return { mesh, part };
    });
    speciesMeshes.push({ agents, meshes });
  }

  const upAxis = new THREE.Vector3(0, 1, 0);
  const rootMatrix = new THREE.Matrix4();
  const partMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const partRotation = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const partScale = new THREE.Vector3();
  const partPosition = new THREE.Vector3();
  const euler = new THREE.Euler();

  let lastUpdateTime = 0;

  function update(time) {
    const dt = Math.min(0.06, Math.max(0.001, time - lastUpdateTime));
    lastUpdateTime = time;

    for (const { agents, meshes } of speciesMeshes) {
      for (const [index, animal] of agents.entries()) {
        // ====================================================================
        // BEHAVIOR STATE MACHINES
        // ====================================================================
        animal.stateTimer += dt;

        if (animal.species === "pig") {
          // --- PIG STATE MACHINE ---
          // States: 0: ROOTING, 1: WALKING, 2: SNIFFING, 3: NAPPING
          if (animal.stateTimer >= animal.stateDuration) {
            animal.stateTimer = 0;
            const cur = animal.state;
            const r = rnd();
            if (cur === 0) {
              // From ROOTING -> WALKING (50%), SNIFFING (35%), NAPPING (15%)
              animal.state = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
            } else if (cur === 1) {
              // From WALKING -> ROOTING (45%), SNIFFING (35%), NAPPING (20%)
              animal.state = r < 0.45 ? 0 : r < 0.8 ? 2 : 3;
            } else if (cur === 2) {
              // From SNIFFING -> WALKING (50%), ROOTING (40%), NAPPING (10%)
              animal.state = r < 0.5 ? 1 : r < 0.9 ? 0 : 3;
            } else {
              // From NAPPING -> SNIFFING (40%), ROOTING (60%)
              animal.state = r < 0.4 ? 2 : 0;
            }

            if (animal.state === 1) {
              // Pick new destination inside pen
              animal.targetX = animal.penX + (rnd() - 0.5) * animal.radiusX * 1.6;
              animal.targetZ = animal.penZ + (rnd() - 0.5) * animal.radiusZ * 1.6;
              const dx = animal.targetX - animal.curX;
              const dz = animal.targetZ - animal.curZ;
              animal.targetFacing = Math.atan2(dx, dz);
              animal.stateDuration = 2.5 + rnd() * 3.5;
            } else if (animal.state === 3) {
              // Napping lasts longer
              animal.stateDuration = 6.0 + rnd() * 6.0;
            } else {
              animal.stateDuration = 3.0 + rnd() * 4.0;
            }
          }

          // Pig State Motion Execution
          let bodyPitch = 0;
          let bodyRoll = 0;
          let bodyY = 0.23;
          let headPitch = 0;
          let headYaw = 0;
          let headY = 0;
          let headZ = 0;
          let legSwing = 0;
          let earWag = 0;
          let tailWag = 0;
          let snoutMicroX = 0;
          let snoutMicroY = 0;
          let napBreathing = 1.0;

          if (animal.state === 1) {
            // WALKING (Heft, waddling trot)
            const dx = animal.targetX - animal.curX;
            const dz = animal.targetZ - animal.curZ;
            const dist = Math.hypot(dx, dz);

            let diff = animal.targetFacing - animal.facing;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            animal.facing += diff * Math.min(1.0, dt * 3.5);

            if (dist > 0.03) {
              const speed = 0.35 * (animal.size < 0.8 ? 1.25 : 0.95);
              const step = Math.min(dist, speed * dt);
              animal.curX += (dx / dist) * step;
              animal.curZ += (dz / dist) * step;
              animal.walkPhase += step * 13.0;
            } else {
              animal.state = 0; // Arrived, start rooting
              animal.stateTimer = 0;
              animal.stateDuration = 3.0 + rnd() * 3.5;
            }

            legSwing = Math.sin(animal.walkPhase) * 0.32;
            bodyRoll = Math.sin(animal.walkPhase) * 0.07;
            bodyY = 0.23 + Math.abs(Math.sin(animal.walkPhase)) * 0.022;
            tailWag = Math.sin(animal.walkPhase * 1.4) * 0.42;
            earWag = Math.sin(animal.walkPhase) * 0.12;
            headY = Math.sin(animal.walkPhase * 2) * 0.015;
          } else if (animal.state === 0) {
            // ROOTING (Snout down to the pen floor, digging in micro-circles)
            const rootPhase = time * 8.0 + animal.seed * 20.0;
            bodyPitch = 0.14;
            headPitch = 0.24;
            headY = -0.075;
            headZ = 0.045;
            snoutMicroX = Math.sin(rootPhase * 1.5) * 0.025;
            snoutMicroY = Math.cos(rootPhase * 1.5) * 0.015;
            legSwing = Math.sin(rootPhase * 0.8) * 0.08;
            earWag = Math.sin(rootPhase * 1.2) * 0.22;
            tailWag = Math.sin(rootPhase * 1.6) * 0.55;
          } else if (animal.state === 2) {
            // SNIFFING (Head lifted high, panning left-right inquiringly)
            const sniffPhase = time * 2.8 + animal.seed * 10.0;
            headPitch = -0.15;
            headY = 0.065;
            headYaw = Math.sin(sniffPhase) * 0.32 * animal.sniffDir;
            earWag = Math.sin(sniffPhase * 2.5) * 0.15;
            tailWag = Math.sin(sniffPhase * 1.5) * 0.22;
            snoutMicroY = Math.sin(time * 12.0) * 0.015;
          } else {
            // NAPPING (Squats low on belly, calm gentle breathing)
            bodyY = 0.13;
            napBreathing = 1.0 + Math.sin(time * 1.6 + animal.seed * 5.0) * 0.035;
            headY = -0.065;
            headPitch = 0.08;
            tailWag = Math.sin(time * 0.8) * 0.08;
          }

          position.set(animal.curX, bodyY, animal.curZ);
          animal.shed.group.localToWorld(position);

          rotation.setFromAxisAngle(
            upAxis,
            animal.shed.group.rotation.y + animal.facing,
          );
          // Apply body roll
          const qRoll = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            bodyRoll,
          );
          const qPitch = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            bodyPitch,
          );
          rotation.multiply(qRoll).multiply(qPitch);

          scale.setScalar(animal.size);
          rootMatrix.compose(position, rotation, scale);

          for (const { mesh, part } of meshes) {
            partPosition.fromArray(part.position);
            partScale.fromArray(part.scale);
            euler.set(...(part.rotation || [0, 0, 0]));

            if (part.head) {
              partPosition.y += headY;
              partPosition.z += headZ;
              euler.x += headPitch;
              euler.y += headYaw;
            }
            if (part.snout) {
              partPosition.x += snoutMicroX;
              partPosition.y += snoutMicroY;
            }
            if (part.body) {
              partScale.x *= napBreathing;
              partScale.y *= napBreathing;
            }
            if (part.stride) {
              if (animal.state === 3) {
                // Tucked legs during nap
                partScale.y *= 0.45;
                partPosition.y -= 0.06;
              } else {
                euler.x += legSwing * part.stride;
              }
            }
            if (part.earWiggle) {
              const earTilt = animal.droopEar ? 0.25 : -0.15;
              euler.z += (earWag + earTilt) * part.earWiggle;
            }
            if (part.earInner) {
              const earTilt = animal.droopEar ? 0.25 : -0.15;
              euler.z += (earWag + earTilt) * part.earInner;
            }
            if (part.tailWag) {
              euler.y += tailWag;
            }

            partRotation.setFromEuler(euler);
            partMatrix.compose(partPosition, partRotation, partScale);
            worldMatrix.multiplyMatrices(rootMatrix, partMatrix);
            mesh.setMatrixAt(index, worldMatrix);
          }
        } else {
          // --- CHICKEN STATE MACHINE ---
          // States: 0: PECKING, 1: SCRATCHING, 2: WALKING, 3: FLAPPING, 4: ALERT
          if (animal.stateTimer >= animal.stateDuration) {
            animal.stateTimer = 0;
            const cur = animal.state;
            const r = rnd();
            if (cur === 0) {
              // PECKING -> WALKING (45%), SCRATCHING (30%), ALERT (15%), FLAPPING (10%)
              animal.state = r < 0.45 ? 2 : r < 0.75 ? 1 : r < 0.9 ? 4 : 3;
            } else if (cur === 1) {
              // SCRATCHING -> PECKING (65%), WALKING (35%)
              animal.state = r < 0.65 ? 0 : 2;
            } else if (cur === 2) {
              // WALKING -> PECKING (45%), SCRATCHING (25%), ALERT (20%), FLAPPING (10%)
              animal.state = r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 4 : 3;
            } else if (cur === 3) {
              // FLAPPING -> ALERT (50%), PECKING (50%)
              animal.state = r < 0.5 ? 4 : 0;
            } else {
              // ALERT -> WALKING (50%), PECKING (50%)
              animal.state = r < 0.5 ? 2 : 0;
            }

            if (animal.state === 2) {
              // Pick target in chicken run
              animal.targetX = animal.minX + rnd() * (animal.maxX - animal.minX);
              animal.targetZ = animal.minZ + rnd() * (animal.maxZ - animal.minZ);
              const dx = animal.targetX - animal.curX;
              const dz = animal.targetZ - animal.curZ;
              animal.targetFacing = Math.atan2(dx, dz);
              animal.stateDuration = 2.0 + rnd() * 3.5;
            } else if (animal.state === 3) {
              animal.stateDuration = 1.4 + rnd() * 1.2;
            } else {
              animal.stateDuration = 1.8 + rnd() * 2.8;
            }
          }

          let chickY = 0.23;
          let headPitch = 0;
          let headYaw = 0;
          let headRoll = 0;
          let headY = 0;
          let headZ = 0;
          let legSwing = 0;
          let legScratchLeft = 0;
          let legScratchRight = 0;
          let flapAngle = 0;
          let tailWag = 0;

          if (animal.state === 2) {
            // WALKING (High-stepping gait + classic jerky head-bob)
            const dx = animal.targetX - animal.curX;
            const dz = animal.targetZ - animal.curZ;
            const dist = Math.hypot(dx, dz);

            let diff = animal.targetFacing - animal.facing;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            animal.facing += diff * Math.min(1.0, dt * 5.0);

            if (dist > 0.04) {
              const speed = 0.42;
              const step = Math.min(dist, speed * dt);
              animal.curX += (dx / dist) * step;
              animal.curZ += (dz / dist) * step;
              animal.walkPhase += step * 16.0;
            } else {
              animal.state = 0; // Arrived, start pecking
              animal.stateTimer = 0;
              animal.stateDuration = 2.0 + rnd() * 2.5;
            }

            legSwing = Math.sin(animal.walkPhase) * 0.48;
            // Jerky head bobbing (thrust forward then snap back)
            const bob = Math.max(0, Math.sin(animal.walkPhase));
            headZ = bob * 0.065;
            headY = bob * 0.02;
            tailWag = Math.sin(animal.walkPhase) * 0.25;
            chickY = 0.23 + Math.abs(Math.sin(animal.walkPhase)) * 0.018;
          } else if (animal.state === 0) {
            // PECKING (Sharp staccato pecks into the straw)
            const cycle = (time * 2.8 + animal.seed * 5.0) % 1.0;
            if (cycle < 0.6) {
              const peckSub = Math.sin(cycle * animal.peckRate);
              headPitch = 0.82 + peckSub * 0.16;
              headY = -0.12;
              headZ = 0.14;
            } else {
              headPitch = -0.1;
              headY = 0.02;
            }
            tailWag = Math.sin(time * 6.0) * 0.18;
          } else if (animal.state === 1) {
            // SCRATCHING (Backward kick in the straw, followed by peck)
            const scratchPhase = time * 7.0 + animal.seed * 10.0;
            const sub = Math.sin(scratchPhase);
            if (sub > 0) {
              legScratchLeft = -sub * 0.65;
            } else {
              legScratchRight = sub * 0.65;
            }
            headPitch = 0.55;
            headY = -0.08;
            headZ = 0.09;
            tailWag = Math.sin(scratchPhase) * 0.3;
          } else if (animal.state === 3) {
            // FLAPPING (Wings spread wide + flutter flap-hop)
            const flapPhase = time * 18.0;
            flapAngle = 0.45 + Math.sin(flapPhase) * 0.5;
            chickY = 0.23 + Math.max(0, Math.sin(time * 9.0)) * 0.14;
            headY = 0.04;
            tailWag = Math.sin(flapPhase) * 0.35;
          } else {
            // ALERT (Dead freeze, inquisitive 45-degree cock of the head)
            headYaw = animal.alertDir * 0.82;
            headRoll = animal.alertDir * 0.28;
            headY = 0.03;
          }

          position.set(animal.curX, chickY, animal.curZ);
          animal.shed.group.localToWorld(position);

          rotation.setFromAxisAngle(
            upAxis,
            animal.shed.group.rotation.y + animal.facing,
          );

          scale.setScalar(animal.size);
          rootMatrix.compose(position, rotation, scale);

          for (const { mesh, part } of meshes) {
            partPosition.fromArray(part.position);
            partScale.fromArray(part.scale);
            euler.set(...(part.rotation || [0, 0, 0]));

            if (part.head) {
              partPosition.y += headY;
              partPosition.z += headZ;
              euler.x += headPitch;
              euler.y += headYaw;
              euler.z += headRoll;
            }
            if (part.comb && animal.isRooster) {
              // Taller proud rooster comb
              partScale.y *= 1.45;
              partScale.z *= 1.25;
            }
            if (part.wattle && animal.isRooster) {
              // Longer rooster wattles
              partScale.y *= 1.55;
            }
            if (part.stride) {
              if (animal.state === 1) {
                euler.x += part.stride === 1 ? legScratchLeft : legScratchRight;
              } else {
                euler.x += legSwing * part.stride;
              }
            }
            if (part.flap) {
              euler.z += flapAngle * part.flap;
            }
            if (part.tailWag) {
              euler.y += tailWag;
              if (animal.isRooster) {
                // Majestic sweeping rooster tail
                partScale.y *= 1.35;
                euler.x -= 0.18;
              }
            }

            partRotation.setFromEuler(euler);
            partMatrix.compose(partPosition, partRotation, partScale);
            worldMatrix.multiplyMatrices(rootMatrix, partMatrix);
            mesh.setMatrixAt(index, worldMatrix);
          }
        }
      }
      for (const { mesh } of meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  update(0);

  return {
    counts,
    enclosures,
    interiorGroups,
    animalRoot,
    animalCount: animals.length,
    pigCount: animals.filter((animal) => animal.species === "pig").length,
    chickenCount: animals.filter((animal) => animal.species === "chicken")
      .length,
    update,
  };
}
