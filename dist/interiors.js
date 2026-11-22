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

  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const material = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const pink = material(0xd99893),
    snout = material(0xc58280),
    hoof = material(0x53494a);
  const ivory = material(0xeee6d4),
    gold = material(0xd4a43c),
    red = material(0xb54736),
    black = material(0x152326);
  const pigParts = [
    {
      geometry: sphere,
      material: pink,
      position: [0, 0.57, 0],
      scale: [0.31, 0.3, 0.59],
    },
    {
      geometry: sphere,
      material: pink,
      position: [0, 0.6, 0.52],
      scale: [0.25, 0.24, 0.27],
      head: true,
    },
    {
      geometry: cylinder,
      material: snout,
      position: [0, 0.57, 0.76],
      scale: [0.15, 0.1, 0.15],
      rotation: [Math.PI / 2, 0, 0],
      head: true,
    },
    ...[-1, 1].map((side) => ({
      geometry: cone,
      material: pink,
      position: [side * 0.16, 0.87, 0.49],
      scale: [0.12, 0.24, 0.08],
      rotation: [0, 0, side * 0.45],
      head: true,
    })),
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((end) => ({
        geometry: cube,
        material: hoof,
        position: [side * 0.2, 0.22, end * 0.36],
        scale: [0.11, 0.33, 0.13],
        stride: side * end,
      })),
    ),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: black,
      position: [side * 0.18, 0.68, 0.69],
      scale: [0.028, 0.028, 0.028],
      head: true,
    })),
    {
      geometry: new THREE.TorusGeometry(0.08, 0.022, 5, 12, Math.PI * 1.6),
      material: pink,
      position: [0, 0.65, -0.61],
      scale: [1, 1, 1],
      rotation: [0, Math.PI / 2, 0],
    },
  ];
  const chickenParts = [
    {
      geometry: sphere,
      material: ivory,
      position: [0, 0.42, 0],
      scale: [0.19, 0.25, 0.28],
    },
    {
      geometry: sphere,
      material: ivory,
      position: [0, 0.66, 0.16],
      scale: [0.09, 0.2, 0.1],
      head: true,
    },
    {
      geometry: sphere,
      material: ivory,
      position: [0, 0.81, 0.21],
      scale: [0.12, 0.12, 0.12],
      head: true,
    },
    {
      geometry: cone,
      material: gold,
      position: [0, 0.79, 0.35],
      scale: [0.05, 0.15, 0.05],
      rotation: [Math.PI / 2, 0, 0],
      head: true,
    },
    {
      geometry: cone,
      material: red,
      position: [0, 0.96, 0.2],
      scale: [0.05, 0.16, 0.09],
      head: true,
    },
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: black,
      position: [side * 0.1, 0.83, 0.26],
      scale: [0.016, 0.016, 0.016],
      head: true,
    })),
    ...[-1, 1].map((side) => ({
      geometry: cylinder,
      material: gold,
      position: [side * 0.075, 0.15, 0],
      scale: [0.025, 0.28, 0.025],
      stride: side,
    })),
    ...[-1, 1].map((side) => ({
      geometry: sphere,
      material: ivory,
      position: [side * 0.18, 0.44, -0.02],
      scale: [0.06, 0.17, 0.22],
      flap: side,
    })),
    {
      geometry: cone,
      material: ivory,
      position: [0, 0.58, -0.29],
      scale: [0.14, 0.32, 0.1],
      rotation: [-0.6, 0, 0],
    },
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
          euler.set(...(part.rotation || [0, 0, 0]));
          if (part.stride) euler.x += Math.sin(phase * 5) * 0.17 * part.stride;
          if (part.flap) euler.z += Math.sin(phase * 4) * 0.12 * part.flap;
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
