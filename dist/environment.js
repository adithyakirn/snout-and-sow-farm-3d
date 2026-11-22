import * as THREE from "three";
import { createForest } from "./forest.js";

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
 * for the existing compound props. Foliage lives in forest.js.
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

      #ifdef USE_INSTANCING_COLOR
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
        vec3 lightVector = normalize(lightPosition);
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

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
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

  let forest;

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

  return {
    envGroup, groundGroup,
    get forestGroup() { return forest.group; },
    get treeCount() { return forest.trees.length; },
    get forest() { return forest; },
    plant(exclusions, settings) { forest = createForest(envGroup, exclusions, settings); },
    update(time, camera) { forest.update(time, camera); },
  };
}
