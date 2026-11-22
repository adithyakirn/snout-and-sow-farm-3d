import * as THREE from "three";
import { treeData } from "./tree-data.js";

/**
 * Creates the Studio Ghibli Anime Sky Texture
 * Features an azure zenith fading to sunlit cyan horizon with soft painted cumulus clouds.
 */
export function createGhibliSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Vertical sky gradient (vibrant anime summer sky)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, "#2c7ad8");    // Deep anime zenith azure
  skyGrad.addColorStop(0.35, "#5b9fe8"); // Mid azure
  skyGrad.addColorStop(0.7, "#9ad0f5");  // Soft cerulean
  skyGrad.addColorStop(0.9, "#d2eaf9");  // Pale horizon cyan
  skyGrad.addColorStop(1.0, "#e8f4fc");  // Horizon mist
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Soft painterly anime cumulus clouds along the horizon
  function drawCloud(cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale * 0.7);

    // Soft cloud shadow underside (lavender-slate anime shadow)
    ctx.fillStyle = "rgba(185, 205, 228, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 95, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(-52, 19, 58, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(55, 19, 58, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // White fluffy cloud puffs
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.arc(-44, 5, 40, 0, Math.PI * 2);
    ctx.arc(44, 4, 38, 0, Math.PI * 2);
    ctx.arc(-78, 14, 28, 0, Math.PI * 2);
    ctx.arc(78, 14, 27, 0, Math.PI * 2);
    ctx.arc(0, -24, 36, 0, Math.PI * 2);
    ctx.arc(-22, -18, 30, 0, Math.PI * 2);
    ctx.arc(22, -16, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw several soft cumulus clouds in distance
  drawCloud(140, 365, 1.25);
  drawCloud(370, 380, 0.95);
  drawCloud(600, 360, 1.35);
  drawCloud(840, 375, 1.05);
  drawCloud(1030, 365, 1.15);

  // Soft atmospheric horizon haze band
  const hazeGrad = ctx.createLinearGradient(0, 430, 0, 512);
  hazeGrad.addColorStop(0, "rgba(215, 236, 250, 0)");
  hazeGrad.addColorStop(1, "rgba(225, 240, 252, 0.92)");
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, 430, 1024, 82);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Custom Ghibli Cel-Shader Material
 * Directly computes stepped cel lighting from surface normals and light vector
 * using a 4-tier discrete color palette (Highlight -> Midtone -> Mid-Shadow -> Deep Shadow),
 * replicating the technique from craftzdog/ghibli-style-shader and Kazuo Oga's painted trees.
 */
export function createGhibliMaterial({
  colors,
  thresholds = [0.62, 0.35, -0.05],
  lightPosition = new THREE.Vector3(-40, 85, 35),
  side = THREE.FrontSide,
}) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      colorMap: { value: colors.map((c) => new THREE.Color(c)) },
      brightnessThresholds: { value: thresholds },
      lightPosition: { value: lightPosition },
    },
  ]);

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>

      #ifdef USE_INSTANCING
        attribute mat4 instanceMatrix;
      #endif
      #ifdef USE_INSTANCING_COLOR
        attribute vec3 instanceColor;
        varying vec3 vInstanceColor;
      #endif

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        #ifdef USE_INSTANCING
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          mat3 normMat = mat3(modelMatrix * instanceMatrix);
          vWorldNormal = normalize(normMat * normal);
        #else
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
        #endif

        #ifdef USE_INSTANCING_COLOR
          vInstanceColor = instanceColor;
        #endif

        vWorldPosition = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;

        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      #include <fog_pars_fragment>

      uniform vec3 colorMap[4];
      uniform float brightnessThresholds[3];
      uniform vec3 lightPosition;

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      #ifdef USE_INSTANCING_COLOR
        varying vec3 vInstanceColor;
      #endif

      void main() {
        vec3 lightVector = normalize(lightPosition - vWorldPosition);
        float brightness = dot(vWorldNormal, lightVector);

        vec3 col;
        if (brightness > brightnessThresholds[0]) {
          col = colorMap[0];
        } else if (brightness > brightnessThresholds[1]) {
          col = colorMap[1];
        } else if (brightness > brightnessThresholds[2]) {
          col = colorMap[2];
        } else {
          col = colorMap[3];
        }

        #ifdef USE_INSTANCING_COLOR
          // Subtle natural variation per tree instance
          col = mix(col, col * vInstanceColor * 1.35, 0.28);
        #endif

        gl_FragColor = vec4(col, 1.0);

        #include <fog_fragment>
      }
    `,
    fog: true,
    side,
  });
}

/**
 * Studio Ghibli / Kazuo Oga Aesthetic 3D Environment
 * Replaces flat 2D satellite aerial imagery with painterly 3D terrain,
 * terraced water paddies, and multi-lobed cloud-foliage trees.
 */
export function createEnvironment(scene) {
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  const groundGroup = new THREE.Group();
  envGroup.add(groundGroup);

  const forestGroup = new THREE.Group();
  envGroup.add(forestGroup);

  // ==========================================================================
  // 1. Ghibli Landscape Ground (Terraced Water Paddies & Warm Dirt Paths)
  // ==========================================================================
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");

  const worldSize = 560;
  const toCanvas = (wx, wz) => [
    ((wx + 280) / worldSize) * 2048,
    ((wz + 280) / worldSize) * 2048,
  ];

  // Base lush painterly meadow grass
  ctx.fillStyle = "#5ea538";
  ctx.fillRect(0, 0, 2048, 2048);

  // Surrounding Terraced Fields (like Kazuo Oga's flooded rice paddies)
  const paddies = [
    // Top-left terraces (water reflection + grass bunds)
    { x1: -280, z1: -280, x2: -60, z2: -160, water: true },
    { x1: -280, z1: -160, x2: -75, z2: -70, water: true },
    // Top-right fields
    { x1: -60, z1: -280, x2: 130, z2: -170, water: false, color: "#4f8d32" },
    { x1: 130, z1: -280, x2: 280, z2: -150, water: true },
    { x1: 65, z1: -170, x2: 280, z2: -50, water: true },
    // Right terraces
    { x1: 55, z1: -50, x2: 280, z2: 65, water: true },
    { x1: 65, z1: 65, x2: 280, z2: 180, water: false, color: "#59933a" },
    { x1: 65, z1: 180, x2: 280, z2: 280, water: true },
    // Bottom terraces
    { x1: -90, z1: 85, x2: 65, z2: 200, water: true },
    { x1: -100, z1: 200, x2: 65, z2: 280, water: false, color: "#65a342" },
    // Left terraces
    { x1: -280, z1: 75, x2: -90, z2: 280, water: true },
    { x1: -280, z1: -70, x2: -50, z2: 75, water: true },
  ];

  for (const p of paddies) {
    const [c1x, c1z] = toCanvas(p.x1, p.z1);
    const [c2x, c2z] = toCanvas(p.x2, p.z2);
    const pw = c2x - c1x;
    const ph = c2z - c1z;

    if (p.water) {
      // Flooded paddy water reflecting Ghibli blue sky & soft clouds
      ctx.fillStyle = "#88b7ab";
      ctx.fillRect(c1x, c1z, pw, ph);

      // Water sheen gradient
      const grad = ctx.createLinearGradient(c1x, c1z, c1x + pw, c1z + ph);
      grad.addColorStop(0, "rgba(182, 226, 218, 0.55)");
      grad.addColorStop(0.5, "rgba(142, 192, 182, 0.25)");
      grad.addColorStop(1, "rgba(118, 168, 158, 0.45)");
      ctx.fillStyle = grad;
      ctx.fillRect(c1x, c1z, pw, ph);

      // Tiny green rice seedling tufts in neat agricultural rows
      ctx.fillStyle = "#3f6a2b";
      const rowStep = 24;
      for (let rx = c1x + 12; rx < c1x + pw - 12; rx += rowStep) {
        for (let rz = c1z + 12; rz < c1z + ph - 12; rz += rowStep) {
          ctx.fillRect(rx, rz, 3, 4);
        }
      }

      // Earthen dyke / grassy bund border
      ctx.strokeStyle = "#3e602e";
      ctx.lineWidth = 6;
      ctx.strokeRect(c1x + 3, c1z + 3, pw - 6, ph - 6);

      // Sub-paddy partitions
      ctx.strokeStyle = "#496f37";
      ctx.lineWidth = 4;
      if (pw > 150) {
        ctx.beginPath();
        ctx.moveTo(c1x + pw * 0.5, c1z);
        ctx.lineTo(c1x + pw * 0.5, c1z + ph);
        ctx.stroke();
      }
      if (ph > 150) {
        ctx.beginPath();
        ctx.moveTo(c1x, c1z + ph * 0.5);
        ctx.lineTo(c1x + pw, c1z + ph * 0.5);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(c1x, c1z, pw, ph);
      // Grass bunds
      ctx.strokeStyle = "#385b2b";
      ctx.lineWidth = 5;
      ctx.strokeRect(c1x + 2, c1z + 2, pw - 4, ph - 4);
    }
  }

  // Farm Compound Yard (Warm Painterly Earth / Sandy Ochre)
  ctx.fillStyle = "#dac199";
  ctx.beginPath();
  const compoundPts = [
    [-32, 48],
    [26, 48],
    [28, -58],
    [-15, -58],
    [-33, -32],
    [-33, 26],
    [-32, 48],
  ];
  const [fX, fZ] = toCanvas(compoundPts[0][0], compoundPts[0][1]);
  ctx.moveTo(fX, fZ);
  for (let i = 1; i < compoundPts.length; i++) {
    const [cx, cz] = toCanvas(compoundPts[i][0], compoundPts[i][1]);
    ctx.lineTo(cx, cz);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle warm dirt gradient variations
  const yardGrad = ctx.createRadialGradient(
    ...toCanvas(0, -5),
    10,
    ...toCanvas(0, -5),
    280,
  );
  yardGrad.addColorStop(0, "rgba(240, 222, 192, 0.45)");
  yardGrad.addColorStop(0.7, "rgba(215, 188, 150, 0.25)");
  yardGrad.addColorStop(1, "rgba(180, 150, 114, 0.45)");
  ctx.fillStyle = yardGrad;
  ctx.fill();

  // Access road leading from outside to Gate [-20, 36]
  ctx.strokeStyle = "#d4b387";
  ctx.lineWidth = (8 / worldSize) * 2048;
  ctx.lineCap = "round";
  ctx.beginPath();
  const [gInX, gInZ] = toCanvas(-20, 36);
  const [gOutX, gOutZ] = toCanvas(-50, 120);
  ctx.moveTo(gInX, gInZ);
  ctx.lineTo(gOutX, gOutZ);
  ctx.stroke();

  // Internal pathways between sheds and working areas
  ctx.strokeStyle = "#cbb085";
  ctx.lineWidth = (5.5 / worldSize) * 2048;
  ctx.beginPath();
  const [sAX, sAZ] = toCanvas(0, 36);
  const [sDX, sDZ] = toCanvas(0, -46);
  ctx.moveTo(sAX, sAZ);
  ctx.lineTo(sDX, sDZ);
  const [kX, kZ] = toCanvas(-23, 13.5);
  const [mX, mZ] = toCanvas(14, 13.5);
  ctx.moveTo(kX, kZ);
  ctx.lineTo(mX, mZ);
  const [nX, nZ] = toCanvas(-23, -10.5);
  const [nmX, nmZ] = toCanvas(14, -10.5);
  ctx.moveTo(nX, nZ);
  ctx.lineTo(nmX, nmZ);
  ctx.stroke();

  // Building foundation slabs (Smooth warm concrete with mossy edges)
  const shedFootings = [
    { x: 0, z: 28.9, w: 34, d: 19 },
    { x: 1.2, z: 4.6, w: 30, d: 10 },
    { x: 3.0, z: -18.1, w: 24, d: 8 },
    { x: 3.1, z: -41.2, w: 34, d: 11 },
    { x: -17.2, z: 13.5, w: 14, d: 8 },
    { x: -18.6, z: -10.7, w: 14, d: 8 },
  ];
  for (const s of shedFootings) {
    const [cx, cz] = toCanvas(s.x - s.w / 2 - 0.7, s.z - s.d / 2 - 0.7);
    const [wPx, dPx] = [
      ((s.w + 1.4) / worldSize) * 2048,
      ((s.d + 1.4) / worldSize) * 2048,
    ];
    // Mossy border
    ctx.fillStyle = "#557748";
    ctx.fillRect(cx - 3, cz - 3, wPx + 6, dPx + 6);
    // Concrete apron
    ctx.fillStyle = "#9ba29f";
    ctx.fillRect(cx, cz, wPx, dPx);
    ctx.strokeStyle = "#808884";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cz, wPx, dPx);
  }

  // Inner lawn islands (fresh vibrant grass)
  const lawns = [
    { x: 8, z: 18, w: 12, d: 6 },
    { x: -10, z: 18, w: 8, d: 6 },
    { x: 8, z: -6, w: 12, d: 6 },
    { x: -10, z: -6, w: 8, d: 6 },
    { x: 8, z: -29, w: 12, d: 6 },
    { x: -10, z: -29, w: 8, d: 6 },
  ];
  for (const l of lawns) {
    const [cx, cz] = toCanvas(l.x - l.w / 2, l.z - l.d / 2);
    ctx.fillStyle = "#4ea030";
    ctx.fillRect(cx, cz, (l.w / worldSize) * 2048, (l.d / worldSize) * 2048);
  }

  // Subtle organic canvas texture noise
  const imgData = ctx.getImageData(0, 0, 2048, 2048);
  const data = imgData.data;
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rnd() - 0.5) * 10;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const groundTexture = new THREE.CanvasTexture(canvas);
  groundTexture.wrapS = THREE.ClampToEdgeWrapping;
  groundTexture.wrapT = THREE.ClampToEdgeWrapping;
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.anisotropy = 8;

  const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 32, 32);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({
    map: groundTexture,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.06;
  groundMesh.receiveShadow = true;
  groundGroup.add(groundMesh);

  // ==========================================================================
  // 2. Ghibli 3D Compound Fence & Entrance Gate
  // ==========================================================================
  const fenceGroup = new THREE.Group();
  groundGroup.add(fenceGroup);

  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.45, 7);
  postGeo.translate(0, 0.725, 0);

  const ghibliFenceMat = createGhibliMaterial({
    colors: ["#c7a378", "#916d4d", "#5a3f2b", "#342217"],
    thresholds: [0.64, 0.36, 0.02],
  });

  const fencePerimeter = [
    [-17.5, 36.5],
    [24, 36.5],
    [24, -56],
    [-29, -56],
    [-29, 36.5],
    [-22, 36.5],
  ];

  for (let seg = 0; seg < fencePerimeter.length - 1; seg++) {
    const p1 = fencePerimeter[seg];
    const p2 = fencePerimeter[seg + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.floor(dist / 3.4));
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const px = p1[0] + dx * frac;
      const pz = p1[1] + dz * frac;
      const post = new THREE.Mesh(postGeo, ghibliFenceMat);
      post.position.set(px, 0, pz);
      post.rotation.y = (s * 0.7) % Math.PI;
      fenceGroup.add(post);
    }
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 6);
    railGeo.rotateZ(Math.PI / 2);
    const angle = Math.atan2(dz, dx);
    for (const h of [0.45, 0.92, 1.3]) {
      const rail = new THREE.Mesh(railGeo, ghibliFenceMat);
      rail.position.set(p1[0] + dx * 0.5, h, p1[1] + dz * 0.5);
      rail.rotation.y = -angle;
      fenceGroup.add(rail);
    }
  }

  // Stone Pillars & Rustic Iron Entrance Gate
  const pillarGeo = new THREE.BoxGeometry(0.75, 2.5, 0.75);
  const ghibliPillarMat = createGhibliMaterial({
    colors: ["#c5beb5", "#989086", "#6c655d", "#433e38"],
    thresholds: [0.65, 0.38, 0.0],
  });
  for (const px of [-22, -17.5]) {
    const pillar = new THREE.Mesh(pillarGeo, ghibliPillarMat);
    pillar.position.set(px, 1.25, 36.5);
    fenceGroup.add(pillar);
  }

  const ghibliGateFrameMat = createGhibliMaterial({
    colors: ["#4d5d64", "#344249", "#202c32", "#121b20"],
    thresholds: [0.65, 0.35, -0.05],
  });
  for (const [side, px, angle] of [
    [-1, -21.8, 0.35],
    [1, -17.7, -0.35],
  ]) {
    const leaf = new THREE.Group();
    leaf.position.set(px, 0, 36.5);
    leaf.rotation.y = angle;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.6, 0.06),
      ghibliGateFrameMat,
    );
    frame.position.set(side * 1.05, 1.0, 0);
    leaf.add(frame);
    for (let x = 0.15; x <= 1.95; x += 0.28) {
      const picket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6),
        ghibliGateFrameMat,
      );
      picket.position.set(side * x, 1.0, 0);
      leaf.add(picket);
    }
    fenceGroup.add(leaf);
  }

  // ==========================================================================
  // 3. Ghibli 3D Trees with Multi-Tier Cloud Canopies & Radial Normals
  // ==========================================================================
  // Group trees by type:
  // 0: Broadleaf Cloud Tree (billowing multi-lobed canopy)
  // 1: Coconut Palm (arching fan fronds)
  // 2: Japanese Cedar / Sugi (stacked conifer tiers)
  // 3: Puffy Low Bush
  const typeLists = { 0: [], 1: [], 2: [], 3: [] };
  for (const t of treeData) {
    typeLists[t[2]].push(t);
  }

  // Materials with Custom Ghibli Cel-Shaders
  const ghibliFoliageMat = createGhibliMaterial({
    colors: ["#9ddb67", "#4d9d48", "#2b6940", "#173f34"],
    thresholds: [0.62, 0.35, -0.05],
  });

  const ghibliCedarMat = createGhibliMaterial({
    colors: ["#4d8e6c", "#2c664a", "#1a4332", "#0f291f"],
    thresholds: [0.65, 0.38, -0.02],
  });

  const ghibliPalmFrondMat = createGhibliMaterial({
    colors: ["#b2e258", "#5fb63a", "#327725", "#1c4a1a"],
    thresholds: [0.60, 0.32, -0.06],
    side: THREE.DoubleSide,
  });

  const ghibliTrunkMat = createGhibliMaterial({
    colors: ["#d4b285", "#9f7652", "#64442e", "#3a2418"],
    thresholds: [0.65, 0.35, 0.0],
  });

  const ghibliBushMat = createGhibliMaterial({
    colors: ["#b2ea6b", "#68ba40", "#3b7f2a", "#1e4b1a"],
    thresholds: [0.62, 0.34, -0.05],
  });

  // Helper: Build multi-lobe cloud canopy with individual radial outward normals
  function createCloudCanopy(lobes, crownCenterY) {
    const positions = [];
    const normals = [];
    const indices = [];

    for (const [lx, ly, lz, lr] of lobes) {
      const geo = new THREE.SphereGeometry(lr, 9, 7);
      const pos = geo.attributes.position;
      const idx = geo.index;
      const baseIdx = positions.length / 3;

      for (let i = 0; i < pos.count; i++) {
        let vx = pos.getX(i);
        let vy = pos.getY(i);
        let vz = pos.getZ(i);

        // Subtle organic cloud/leaf puff perturbation (like cauliflower foliage clumps)
        const pLen = Math.hypot(vx, vy, vz) || 1;
        const noise = 1.0 + 0.08 * Math.sin(vx * 2.5 + vy * 3.2) * Math.cos(vz * 2.7);
        vx = (vx / pLen) * lr * noise;
        vy = (vy / pLen) * lr * noise;
        vz = (vz / pLen) * lr * noise;

        const wx = vx + lx;
        const wy = vy + ly;
        const wz = vz + lz;
        positions.push(wx, wy, wz);

        // Outward radial normal: 75% from individual clump center + 25% from overall crown
        const lnx = vx;
        const lny = vy;
        const lnz = vz;
        const lLen = Math.hypot(lnx, lny, lnz) || 1;

        const cnx = wx;
        const cny = wy - crownCenterY;
        const cnz = wz;
        const cLen = Math.hypot(cnx, cny, cnz) || 1;

        const nx = (lnx / lLen) * 0.75 + (cnx / cLen) * 0.25;
        const ny = (lny / lLen) * 0.75 + (cny / cLen) * 0.25;
        const nz = (lnz / lLen) * 0.75 + (cnz / cLen) * 0.25;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);
      }

      for (let i = 0; i < idx.count; i++) {
        indices.push(baseIdx + idx.getX(i));
      }
    }

    const combined = new THREE.BufferGeometry();
    combined.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    combined.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    combined.setIndex(indices);
    return combined;
  }

  // --- Geometry 0: Broadleaf Cloud Canopy (10 multi-tiered sculpted lobes) ---
  const broadleafLobes = [
    [0, 9.6, 0, 2.3],          // Top crown
    [-1.7, 8.8, -0.6, 1.9],     // Upper left billow
    [1.8, 9.0, 0.4, 1.8],       // Upper right billow
    [-1.4, 7.6, 1.3, 2.0],      // Mid front-left billow
    [1.4, 7.4, 1.1, 1.9],       // Mid front-right billow
    [-0.3, 8.0, -1.6, 1.9],     // Mid back billow
    [-2.2, 6.0, 0.2, 1.7],      // Lower left canopy shelf
    [2.1, 6.2, -0.4, 1.6],      // Lower right canopy shelf
    [0.3, 5.8, 1.6, 1.5],       // Lower front canopy shelf
    [-1.1, 5.6, -1.3, 1.4],     // Lower rear shelf
  ];
  const broadleafCanopyGeo = createCloudCanopy(broadleafLobes, 7.5);

  // Broadleaf Trunk with 3 Branch Arms reaching into the foliage
  function createBroadleafTrunk() {
    const positions = [];
    const normals = [];
    const indices = [];

    // Main tapered trunk
    const mainGeo = new THREE.CylinderGeometry(0.38, 0.62, 5.6, 8);
    mainGeo.translate(0, 2.8, 0);
    const p1 = mainGeo.attributes.position;
    const n1 = mainGeo.attributes.normal;
    const i1 = mainGeo.index;
    for (let i = 0; i < p1.count; i++) {
      positions.push(p1.getX(i), p1.getY(i), p1.getZ(i));
      normals.push(n1.getX(i), n1.getY(i), n1.getZ(i));
    }
    for (let i = 0; i < i1.count; i++) {
      indices.push(i1.getX(i));
    }

    // Branch 1 (left)
    const b1Geo = new THREE.CylinderGeometry(0.18, 0.32, 2.8, 6);
    b1Geo.rotateZ(0.5);
    b1Geo.translate(-1.1, 5.4, 0.2);
    const p2 = b1Geo.attributes.position;
    const n2 = b1Geo.attributes.normal;
    const i2 = b1Geo.index;
    const base2 = positions.length / 3;
    for (let i = 0; i < p2.count; i++) {
      positions.push(p2.getX(i), p2.getY(i), p2.getZ(i));
      normals.push(n2.getX(i), n2.getY(i), n2.getZ(i));
    }
    for (let i = 0; i < i2.count; i++) {
      indices.push(base2 + i2.getX(i));
    }

    // Branch 2 (right)
    const b2Geo = new THREE.CylinderGeometry(0.18, 0.3, 2.7, 6);
    b2Geo.rotateZ(-0.52);
    b2Geo.translate(1.1, 5.6, -0.2);
    const p3 = b2Geo.attributes.position;
    const n3 = b2Geo.attributes.normal;
    const i3 = b2Geo.index;
    const base3 = positions.length / 3;
    for (let i = 0; i < p3.count; i++) {
      positions.push(p3.getX(i), p3.getY(i), p3.getZ(i));
      normals.push(n3.getX(i), n3.getY(i), n3.getZ(i));
    }
    for (let i = 0; i < i3.count; i++) {
      indices.push(base3 + i3.getX(i));
    }

    // Branch 3 (forward)
    const b3Geo = new THREE.CylinderGeometry(0.16, 0.26, 2.4, 6);
    b3Geo.rotateX(0.48);
    b3Geo.translate(0.2, 5.2, 1.0);
    const p4 = b3Geo.attributes.position;
    const n4 = b3Geo.attributes.normal;
    const i4 = b3Geo.index;
    const base4 = positions.length / 3;
    for (let i = 0; i < p4.count; i++) {
      positions.push(p4.getX(i), p4.getY(i), p4.getZ(i));
      normals.push(n4.getX(i), n4.getY(i), n4.getZ(i));
    }
    for (let i = 0; i < i4.count; i++) {
      indices.push(base4 + i4.getX(i));
    }

    const combined = new THREE.BufferGeometry();
    combined.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    combined.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    combined.setIndex(indices);
    return combined;
  }
  const broadleafTrunkGeo = createBroadleafTrunk();

  // --- Geometry 2: Japanese Cedar / Sugi (5 stacked conical tiers) ---
  function createCedarCanopy() {
    const positions = [];
    const normals = [];
    const indices = [];
    const tiers = [
      { r: 2.6, h: 3.4, y: 4.8 },
      { r: 2.2, h: 3.2, y: 7.0 },
      { r: 1.7, h: 2.9, y: 9.1 },
      { r: 1.2, h: 2.6, y: 11.0 },
      { r: 0.65, h: 2.3, y: 12.8 },
    ];
    for (const t of tiers) {
      const geo = new THREE.ConeGeometry(t.r, t.h, 8);
      const pos = geo.attributes.position;
      const idx = geo.index;
      const baseIdx = positions.length / 3;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i) + t.y;
        const vz = pos.getZ(i);
        positions.push(vx, vy, vz);

        // Flared conifer normal
        const nx = vx;
        const ny = (vy - t.y) * 0.4;
        const nz = vz;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
      }
      for (let i = 0; i < idx.count; i++) {
        indices.push(baseIdx + idx.getX(i));
      }
    }
    const combined = new THREE.BufferGeometry();
    combined.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    combined.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    combined.setIndex(indices);
    return combined;
  }
  const cedarCanopyGeo = createCedarCanopy();
  const cedarTrunkGeo = new THREE.CylinderGeometry(0.24, 0.45, 6.5, 7);
  cedarTrunkGeo.translate(0, 3.25, 0);

  // --- Geometry 1: Coconut Palm (curved trunk + arching fan fronds) ---
  const palmTrunkGeo = new THREE.CylinderGeometry(0.2, 0.36, 11, 7);
  const pPos = palmTrunkGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const y = pPos.getY(i);
    const curve = Math.sin(((y + 5.5) / 11) * Math.PI * 0.75) * 0.85;
    pPos.setX(i, pPos.getX(i) + curve);
  }
  palmTrunkGeo.computeVertexNormals();
  palmTrunkGeo.translate(0, 5.5, 0);

  // 8 sculpted palm fronds arching outwards
  const palmCrownGeo = new THREE.BufferGeometry();
  const crownPositions = [];
  const crownNormals = [];
  const crownIndices = [];
  for (let f = 0; f < 8; f++) {
    const frondAngle = (f / 8) * Math.PI * 2;
    const cosA = Math.cos(frondAngle);
    const sinA = Math.sin(frondAngle);
    const baseIdx = crownPositions.length / 3;
    for (let seg = 0; seg <= 4; seg++) {
      const frac = seg / 4;
      const reach = frac * 3.6;
      const drop = Math.pow(frac, 1.8) * 1.6;
      const w = Math.sin(frac * Math.PI) * 0.52;
      const cx = reach * cosA;
      const cz = reach * sinA;
      const cy = 11.0 - drop;
      const rx = -sinA * w;
      const rz = cosA * w;
      crownPositions.push(cx - rx, cy, cz - rz);
      crownPositions.push(cx + rx, cy, cz + rz);
      crownNormals.push(0, 1, 0, 0, 1, 0);
    }
    for (let seg = 0; seg < 4; seg++) {
      const a = baseIdx + seg * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      crownIndices.push(a, b, c, b, d, c);
    }
  }
  palmCrownGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(crownPositions, 3),
  );
  palmCrownGeo.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(crownNormals, 3),
  );
  palmCrownGeo.setIndex(crownIndices);

  // --- Geometry 3: Puffy Low Bush (4 cloud lobes) ---
  const bushLobes = [
    [0, 1.2, 0, 1.4],
    [-1.0, 1.0, -0.4, 1.15],
    [1.0, 1.1, 0.3, 1.2],
    [0.2, 1.8, 0.1, 1.05],
  ];
  const bushGeo = createCloudCanopy(bushLobes, 1.1);

  // ==========================================================================
  // 4. InstancedMeshes with Subtle Hue/Saturation Variety
  // ==========================================================================
  const dummy = new THREE.Object3D();
  const dummyColor = new THREE.Color();

  // 1. Broadleaf Trees (Type 0)
  const broadleafTrunkMesh = new THREE.InstancedMesh(
    broadleafTrunkGeo,
    ghibliTrunkMat,
    typeLists[0].length,
  );
  const broadleafCanopyMesh = new THREE.InstancedMesh(
    broadleafCanopyGeo,
    ghibliFoliageMat,
    typeLists[0].length,
  );

  for (let i = 0; i < typeLists[0].length; i++) {
    const [x, z, , s] = typeLists[0][i];
    dummy.position.set(x, 0, z);
    dummy.rotation.y = (i * 2.11) % (Math.PI * 2);
    dummy.scale.set(s, s * (0.95 + (i % 5) * 0.03), s);
    dummy.updateMatrix();
    broadleafTrunkMesh.setMatrixAt(i, dummy.matrix);
    broadleafCanopyMesh.setMatrixAt(i, dummy.matrix);

    // Natural artist variation: mix of warm lime-emerald and cool Ghibli jade
    if (i % 3 === 0) {
      // Cool anime jade tint (matching craftzdog circled tree!)
      dummyColor.setRGB(0.76, 1.05, 1.12);
    } else if (i % 3 === 1) {
      // Warm sunlit golden-lime tint
      dummyColor.setRGB(1.08, 1.06, 0.88);
    } else {
      // Rich emerald grass green
      dummyColor.setRGB(0.95, 1.02, 0.96);
    }
    broadleafCanopyMesh.setColorAt(i, dummyColor);
  }
  broadleafTrunkMesh.instanceMatrix.needsUpdate = true;
  broadleafCanopyMesh.instanceMatrix.needsUpdate = true;
  if (broadleafCanopyMesh.instanceColor)
    broadleafCanopyMesh.instanceColor.needsUpdate = true;
  forestGroup.add(broadleafTrunkMesh, broadleafCanopyMesh);

  // 2. Coconut Palms (Type 1)
  const palmTrunkMesh = new THREE.InstancedMesh(
    palmTrunkGeo,
    ghibliTrunkMat,
    typeLists[1].length,
  );
  const palmCrownMesh = new THREE.InstancedMesh(
    palmCrownGeo,
    ghibliPalmFrondMat,
    typeLists[1].length,
  );

  for (let i = 0; i < typeLists[1].length; i++) {
    const [x, z, , s] = typeLists[1][i];
    dummy.position.set(x, 0, z);
    dummy.rotation.y = (i * 1.37) % (Math.PI * 2);
    dummy.scale.set(s, s * (0.92 + (i % 5) * 0.04), s);
    dummy.updateMatrix();
    palmTrunkMesh.setMatrixAt(i, dummy.matrix);
    palmCrownMesh.setMatrixAt(i, dummy.matrix);

    dummyColor.setRGB(
      0.95 + ((i % 4) - 2) * 0.03,
      1.0 + ((i % 5) - 2) * 0.02,
      0.92 + ((i % 3) - 1) * 0.04,
    );
    palmCrownMesh.setColorAt(i, dummyColor);
  }
  palmTrunkMesh.instanceMatrix.needsUpdate = true;
  palmCrownMesh.instanceMatrix.needsUpdate = true;
  if (palmCrownMesh.instanceColor)
    palmCrownMesh.instanceColor.needsUpdate = true;
  forestGroup.add(palmTrunkMesh, palmCrownMesh);

  // 3. Japanese Cedars / Sugi (Type 2)
  const cedarTrunkMesh = new THREE.InstancedMesh(
    cedarTrunkGeo,
    ghibliTrunkMat,
    typeLists[2].length,
  );
  const cedarCanopyMesh = new THREE.InstancedMesh(
    cedarCanopyGeo,
    ghibliCedarMat,
    typeLists[2].length,
  );

  for (let i = 0; i < typeLists[2].length; i++) {
    const [x, z, , s] = typeLists[2][i];
    dummy.position.set(x, 0, z);
    dummy.rotation.y = (i * 1.73) % (Math.PI * 2);
    dummy.scale.set(s, s * 1.1, s);
    dummy.updateMatrix();
    cedarTrunkMesh.setMatrixAt(i, dummy.matrix);
    cedarCanopyMesh.setMatrixAt(i, dummy.matrix);

    dummyColor.setRGB(
      0.92 + ((i % 5) - 2) * 0.02,
      1.0 + ((i % 4) - 2) * 0.02,
      1.04 + ((i % 3) - 1) * 0.03,
    );
    cedarCanopyMesh.setColorAt(i, dummyColor);
  }
  cedarTrunkMesh.instanceMatrix.needsUpdate = true;
  cedarCanopyMesh.instanceMatrix.needsUpdate = true;
  if (cedarCanopyMesh.instanceColor)
    cedarCanopyMesh.instanceColor.needsUpdate = true;
  forestGroup.add(cedarTrunkMesh, cedarCanopyMesh);

  // 4. Shrubs (Type 3)
  const shrubMesh = new THREE.InstancedMesh(
    bushGeo,
    ghibliBushMat,
    typeLists[3].length,
  );
  for (let i = 0; i < typeLists[3].length; i++) {
    const [x, z, , s] = typeLists[3][i];
    dummy.position.set(x, 0, z);
    dummy.rotation.y = (i * 0.91) % (Math.PI * 2);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    shrubMesh.setMatrixAt(i, dummy.matrix);
    dummyColor.setRGB(1.0, 1.0, 0.95);
    shrubMesh.setColorAt(i, dummyColor);
  }
  shrubMesh.instanceMatrix.needsUpdate = true;
  if (shrubMesh.instanceColor) shrubMesh.instanceColor.needsUpdate = true;
  forestGroup.add(shrubMesh);

  // Gentle wind breeze sway
  function update(time) {
    if (!forestGroup.visible) return;
    palmCrownMesh.rotation.y = Math.sin(time * 0.8) * 0.035;
    broadleafCanopyMesh.rotation.y = Math.cos(time * 0.65) * 0.025;
    cedarCanopyMesh.rotation.y = Math.sin(time * 0.5) * 0.015;
  }

  return {
    envGroup,
    groundGroup,
    forestGroup,
    treeCount: treeData.length,
    update,
  };
}
