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
        animals.push({
          species: "pig",
          shed,
          x,
          z,
          radiusX: Math.max(0.025, cellWidth / 2 - 0.55),
          radiusZ: Math.min(0.6, depth / 2 - 0.95),
          size: Math.min(1, cellWidth / 1.35),
          phase: animals.length * 2.399,
          facing: side === -1 ? 0 : Math.PI,
        });
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
    // Row 1: North wall bank (z = -6.55)
    // Row 2: Center-north bank (z = -1.85)
    // Row 3: Center-south bank (z = +1.85)
    // Row 4: South wall bank (z = +6.55)
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
      // Front and back rails
      rail(vertices, startX, z - depth / 2, endX, z - depth / 2);
      rail(vertices, startX, z + depth / 2, endX, z + depth / 2);

      // Dividers
      for (let i = 0; i <= countPerRow; i++) {
        const x = startX + i * cellWidth;
        rail(vertices, x, z - depth / 2, x, z + depth / 2);
      }

      // Pen floors and pigs
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
        animals.push({
          species: "pig",
          shed,
          x,
          z,
          radiusX: Math.max(0.025, cellWidth / 2 - 0.5),
          radiusZ: Math.min(0.6, depth / 2 - 0.7),
          size: Math.min(1, cellWidth / 1.35),
          phase: animals.length * 2.399,
          facing: r.side === -1 ? 0 : Math.PI,
        });
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
  for (let i = 0; i < 16; i++) {
    animals.push({
      species: "chicken",
      shed: chickenShed,
      x: -chickenWidth / 2 + 1.3 + ((i % 8) * (chickenWidth - 2.6)) / 7,
      z: i < 8 ? -0.85 : 0.85,
      radiusX: 0.45,
      radiusZ: 0.3,
      size: 1,
      phase: i * 2.399,
      facing: i * 0.7,
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

  // Soft, warm Ghibli pig palette
  const pigSkin = ghibliMat(0xfab5ad, 0x3d1b18, 0.12);
  const pigBelly = ghibliMat(0xfde4df, 0x3d201c, 0.1);
  const pigSnout = ghibliMat(0xf28b84, 0x401614, 0.14);
  const pigNostril = ghibliMat(0xb3534e, 0x220000, 0.06);
  const pigBlush = ghibliMat(0xf77970, 0x48100e, 0.22);
  const pigHoof = ghibliMat(0x5e4840, 0x1a1210, 0.05);
  const animeEye = ghibliMat(0x1a1311, 0x000000, 0);
  const animeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Soft, warm Ghibli chicken palette
  const henFeather = ghibliMat(0xfdf7eb, 0x3d3018, 0.1);
  const henBelly = ghibliMat(0xf7ecd2, 0x382810, 0.08);
  const henComb = ghibliMat(0xe24334, 0x440808, 0.18);
  const henWattle = ghibliMat(0xd83a2d, 0x3d0606, 0.16);
  const henBeak = ghibliMat(0xf6b638, 0x3d2806, 0.1);

  const pigParts = [
    // Chubby, rounded bean body
    {
      geometry: sphere,
      material: pigSkin,
      position: [0, 0.55, 0],
      scale: [0.35, 0.33, 0.61],
    },
    // Creamy soft belly under-patch
    {
      geometry: sphere,
      material: pigBelly,
      position: [0, 0.44, 0.03],
      scale: [0.31, 0.26, 0.52],
    },
    // Round chubby head
    {
      geometry: sphere,
      material: pigSkin,
      position: [0, 0.61, 0.52],
      scale: [0.28, 0.27, 0.3],
      head: true,
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
    },
    // Two cute nostril depressions
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigNostril,
      position: [side * 0.048, 0.56, 0.84],
      scale: [0.024, 0.032, 0.018],
      head: true,
    })),
    // Charming floppy leaf ears with inner rose shading
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigSkin,
      position: [side * 0.2, 0.82, 0.49],
      scale: [0.11, 0.18, 0.05],
      rotation: [0.42, side * 0.32, side * 0.48],
      head: true,
      earWiggle: side,
    })),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: pigSnout,
      position: [side * 0.19, 0.81, 0.5],
      scale: [0.075, 0.13, 0.03],
      rotation: [0.42, side * 0.32, side * 0.48],
      head: true,
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
        material: pigSkin,
        position: [side * 0.21, 0.28, end * 0.33],
        scale: [0.082, 0.22, 0.085],
        stride: side * end,
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
      })),
    ),
    // Playful spiral curly tail with wag motion
    {
      geometry: new THREE.TorusGeometry(0.085, 0.024, 6, 14, Math.PI * 1.7),
      material: pigSkin,
      position: [0, 0.64, -0.62],
      scale: [1, 1, 1],
      rotation: [0, Math.PI / 2, 0],
      tailWag: true,
    },
  ];
  const chickenParts = [
    // Rotund fluffy egg-body
    {
      geometry: sphere,
      material: henFeather,
      position: [0, 0.44, 0],
      scale: [0.24, 0.28, 0.33],
    },
    // Fluffy chest / bosom
    {
      geometry: sphere,
      material: henBelly,
      position: [0, 0.48, 0.09],
      scale: [0.21, 0.22, 0.25],
    },
    // Neck & round head with pecking motion
    {
      geometry: sphere,
      material: henFeather,
      position: [0, 0.67, 0.16],
      scale: [0.12, 0.22, 0.13],
      head: true,
      peck: true,
    },
    {
      geometry: sphere,
      material: henFeather,
      position: [0, 0.82, 0.22],
      scale: [0.14, 0.14, 0.15],
      head: true,
      peck: true,
    },
    // Scalloped 3-lobe rounded Ghibli comb
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.95, 0.26],
      scale: [0.038, 0.065, 0.055],
      head: true,
      peck: true,
    },
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.98, 0.2],
      scale: [0.042, 0.085, 0.065],
      head: true,
      peck: true,
    },
    {
      geometry: sphere,
      material: henComb,
      position: [0, 0.94, 0.13],
      scale: [0.038, 0.07, 0.055],
      head: true,
      peck: true,
    },
    // Wattle droplets under chin
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: henWattle,
      position: [side * 0.024, 0.71, 0.28],
      scale: [0.024, 0.05, 0.028],
      head: true,
      peck: true,
    })),
    // Cute golden beak
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
      material: henFeather,
      position: [side * 0.22, 0.46, -0.01],
      scale: [0.065, 0.18, 0.24],
      rotation: [0.1, 0, side * 0.15],
      flap: side,
    })),
    // Fan tail feathers
    {
      geometry: cone,
      material: henFeather,
      position: [0, 0.62, -0.32],
      scale: [0.14, 0.34, 0.09],
      rotation: [-0.68, 0, 0],
      tailWag: true,
    },
    ...[-1, 1].map((side) => ({
      geometry: cone,
      material: henFeather,
      position: [side * 0.07, 0.58, -0.3],
      scale: [0.09, 0.28, 0.07],
      rotation: [-0.55, 0, side * 0.3],
      tailWag: true,
    })),
    // Little golden shins & feet
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

  function update(time) {
    for (const { agents, meshes } of speciesMeshes) {
      for (const [index, animal] of agents.entries()) {
        const phase =
          time * (animal.species === "pig" ? 0.45 : 0.9) + animal.phase;
        position.set(
          animal.x + Math.sin(phase) * animal.radiusX,
          0.23,
          animal.z + Math.cos(phase * 0.7) * animal.radiusZ,
        );
        animal.shed.group.localToWorld(position);
        rotation.setFromAxisAngle(
          upAxis,
          animal.shed.group.rotation.y + animal.facing + Math.sin(phase) * 0.25,
        );
        scale.setScalar(animal.size);
        rootMatrix.compose(position, rotation, scale);
        for (const { mesh, part } of meshes) {
          partPosition.fromArray(part.position);
          if (part.head) partPosition.y += Math.sin(phase * 3) * 0.025;
          if (part.peck) partPosition.z += Math.sin(phase * 3) * 0.035;
          euler.set(...(part.rotation || [0, 0, 0]));
          if (part.stride) euler.x += Math.sin(phase * 5) * 0.18 * part.stride;
          if (part.flap) euler.z += Math.sin(phase * 4) * 0.15 * part.flap;
          if (part.tailWag) euler.y += Math.sin(phase * 7) * 0.32;
          if (part.earWiggle)
            euler.z += Math.sin(phase * 4 + part.earWiggle) * 0.12;
          partRotation.setFromEuler(euler);
          partScale.fromArray(part.scale);
          partMatrix.compose(partPosition, partRotation, partScale);
          worldMatrix.multiplyMatrices(rootMatrix, partMatrix);
          mesh.setMatrixAt(index, worldMatrix);
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
