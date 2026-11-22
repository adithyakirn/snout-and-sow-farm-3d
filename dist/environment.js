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

/**
 * Low-poly Stylized Grass Spike Geometry (Ricardo Oliva Alonso style)
 * As seen in CodePen KwKwddJ: sharp, 3-sided pointed triangular cones with flat face normals.
 * Features a cluster of 2 tapered triangular spikes with vertex colors
 * (soft anime green base -> sunlit pastel lime tip).
 */
function createRicardoGrassGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const colors = [];

  // Colors sampled directly from Ricardo Oliva Alonso reference image:
  // Root: [0.40, 0.64, 0.28] (soft shadow anime green #66a347)
  // Tip:  [0.82, 0.93, 0.58] (bright sunlit lime tip #d2ee94)
  const rootCol = [0.40, 0.64, 0.28];
  const tipCol1 = [0.84, 0.94, 0.60];
  const tipCol2 = [0.78, 0.90, 0.54];

  // A clump has 2 stylized triangular spikes (1 primary upright, 1 smaller slightly leaning)
  const spikes = [
    { ox: 0, oz: 0, r: 0.10, h: 0.52, rot: 0.0, leanX: 0.0, leanZ: 0.0, tipC: tipCol1 },
    { ox: 0.10, oz: 0.05, r: 0.07, h: 0.38, rot: 1.2, leanX: 0.05, leanZ: 0.04, tipC: tipCol2 },
  ];

  for (const s of spikes) {
    const sides = 3;
    const basePts = [];
    for (let i = 0; i < sides; i++) {
      const a = s.rot + (i / sides) * Math.PI * 2;
      basePts.push([s.ox + Math.cos(a) * s.r, 0, s.oz + Math.sin(a) * s.r]);
    }
    const tip = [s.ox + s.leanX, s.h, s.oz + s.leanZ];

    // 3 triangular side faces
    for (let i = 0; i < sides; i++) {
      const p1 = basePts[i];
      const p2 = basePts[(i + 1) % sides];

      // Calculate flat face normal
      const e1x = p2[0] - p1[0];
      const e1y = p2[1] - p1[1];
      const e1z = p2[2] - p1[2];

      const e2x = tip[0] - p1[0];
      const e2y = tip[1] - p1[1];
      const e2z = tip[2] - p1[2];

      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      positions.push(...p1);
      normals.push(nx, ny, nz);
      colors.push(...rootCol);

      positions.push(...p2);
      normals.push(nx, ny, nz);
      colors.push(...rootCol);

      positions.push(...tip);
      normals.push(nx, ny, nz);
      colors.push(...s.tipC);
    }
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

/**
 * ShaderMaterial for Ricardo Oliva Alonso Stylized Grass
 * Uses flat face normals to produce distinct sunlit vs shaded facets,
 * exactly reproducing the crunchy 3D diorama lawn aesthetic from KwKwddJ.
 */
function createRicardoGrassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(-40, 85, 35).normalize() },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float time;
      varying vec3 vColor;
      varying vec3 vWorldNormal;

      void main() {
        vColor = color;
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

        // Subtle gentle breeze sway on the tips
        float anchor = pow(clamp(position.y / 0.4, 0.0, 1.0), 1.5);
        float sway = sin(time * 2.2 + worldPos.x * 0.45 + worldPos.z * 0.35) * 0.025 * anchor;

        vec3 p = position;
        p.x += sway;
        p.z += sway * 0.5;

        worldPos = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      #include <fog_pars_fragment>
      uniform vec3 sunDirection;
      varying vec3 vColor;
      varying vec3 vWorldNormal;

      void main() {
        vec3 lightDir = normalize(sunDirection);
        float sunDot = max(0.0, dot(vWorldNormal, lightDir));

        // Faceted diorama lighting exactly like Ricardo Oliva Alonso
        // Sunlit facet: bright golden lime (max rgb 200, 229, 154)
        // Shaded facet: soft pastel green (avg rgb 140, 185, 105)
        vec3 col = vColor;
        if (sunDot > 0.42) {
          col = col * vec3(1.15, 1.10, 0.95);
        } else if (sunDot > 0.15) {
          col = col * vec3(1.02, 1.02, 1.00);
        } else {
          col = col * vec3(0.85, 0.88, 0.92);
        }

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    side: THREE.FrontSide,
    fog: true,
  });
}

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

  // Farm Compound Yard (Warm Painterly Earth / Sandy Ochre with Ghibli texture)
  ctx.fillStyle = "#d8be94";
  ctx.beginPath();
  const compoundPts = [
    [-30.5, 52.0],
    [35.5, 52.0],
    [35.5, 22.0],
    [28.0, -51.5],
    [-18.0, -51.5],
    [-31.0, -26.0],
    [-31.0, 30.0],
    [-30.5, 52.0],
  ];
  const [fX, fZ] = toCanvas(compoundPts[0][0], compoundPts[0][1]);
  ctx.moveTo(fX, fZ);
  for (let i = 1; i < compoundPts.length; i++) {
    const [cx, cz] = toCanvas(compoundPts[i][0], compoundPts[i][1]);
    ctx.lineTo(cx, cz);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle warm dirt gradient variations (sunlit center, richer moist earth toward perimeter)
  const yardGrad = ctx.createRadialGradient(
    ...toCanvas(3, 4),
    15,
    ...toCanvas(3, 4),
    320,
  );
  yardGrad.addColorStop(0, "rgba(244, 228, 198, 0.55)");
  yardGrad.addColorStop(0.55, "rgba(222, 196, 156, 0.3)");
  yardGrad.addColorStop(1, "rgba(172, 140, 102, 0.55)");
  ctx.fillStyle = yardGrad;
  ctx.fill();

  // Main access road leading from outside (-50, 120) through the labeled Gate (-23.9, 48.07) into courtyard
  ctx.strokeStyle = "#cca97b";
  ctx.lineWidth = (7.5 / worldSize) * 2048;
  ctx.lineCap = "round";
  ctx.beginPath();
  const [gGateX, gGateZ] = toCanvas(-23.895, 48.07);
  const [gOutX, gOutZ] = toCanvas(-50.0, 120.0);
  ctx.moveTo(gGateX, gGateZ);
  ctx.lineTo(gOutX, gOutZ);
  ctx.stroke();

  // Gentle wheel tracks along the access road
  ctx.strokeStyle = "rgba(168, 134, 94, 0.4)";
  ctx.lineWidth = (1.1 / worldSize) * 2048;
  for (const trackOffset of [-1.8, 1.8]) {
    ctx.beginPath();
    const [tInX, tInZ] = toCanvas(-23.895 + trackOffset * 0.8, 48.07 + trackOffset * 0.6);
    const [tOutX, tOutZ] = toCanvas(-50.0 + trackOffset * 0.8, 120.0 + trackOffset * 0.6);
    ctx.moveTo(tInX, tInZ);
    ctx.lineTo(tOutX, tOutZ);
    ctx.stroke();
  }

  // Courtyard service pathways connecting Sheds, Kitchen, Network room and the labeled Gate
  ctx.strokeStyle = "#cbb085";
  ctx.lineWidth = (5.0 / worldSize) * 2048;
  ctx.beginPath();
  // Driveway from labeled Gate curving into courtyard and east towards Shed A and Kitchen
  const [pGateX, pGateZ] = toCanvas(-23.895, 48.07);
  const [pShedAFootX, pShedAFootZ] = toCanvas(-17.5, 34.0);
  const [pSouthYardX, pSouthYardZ] = toCanvas(0.0, 44.0);
  const [pKitchX, pKitchZ] = toCanvas(24.0, 42.8);
  ctx.moveTo(pGateX, pGateZ);
  ctx.lineTo(pShedAFootX, pShedAFootZ);
  ctx.lineTo(pSouthYardX, pSouthYardZ);
  ctx.lineTo(pKitchX, pKitchZ);
  // Northward lane along west side of sheds to Network room and Shed C
  const [pNetX, pNetZ] = toCanvas(-18.5, -11.4);
  const [pShedCX, pShedCZ] = toCanvas(-13.0, -38.7);
  ctx.moveTo(pShedAFootX, pShedAFootZ);
  ctx.lineTo(pNetX, pNetZ);
  ctx.lineTo(pShedCX, pShedCZ);
  ctx.stroke();

  // Helper: Draw concrete foundation apron precisely rotated to match 3D buildings
  function drawRotatedApron(x, z, w, d, rot = -0.13, options = {}) {
    const [cx, cz] = toCanvas(x, z);
    const wPx = (w / worldSize) * 2048;
    const dPx = (d / worldSize) * 2048;

    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(-rot); // In 2D canvas, Y is down so rotation -(-0.13) = +0.13 rad matches Three.js Y-rotation

    // 1. Mossy earthen edge border (soft green/brown fringe)
    ctx.fillStyle = options.edgeColor || "#507542";
    const border = 5;
    ctx.fillRect(-wPx / 2 - border, -dPx / 2 - border, wPx + border * 2, dPx + border * 2);

    // 2. Concrete slab apron
    ctx.fillStyle = options.slabColor || "#9ba29f";
    ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);

    // 3. Subtle slab edge expansion line
    ctx.strokeStyle = options.jointColor || "#7c8480";
    ctx.lineWidth = 2;
    ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx);

    // Center division line for long sheds
    if (wPx > 70) {
      ctx.beginPath();
      ctx.moveTo(0, -dPx / 2);
      ctx.lineTo(0, dPx / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Exact 3D Building Foundations (position, size, and -0.13 rad rotation)
  // Shed A: [0.0, 28.935], size 32x17 -> apron 34x19
  drawRotatedApron(0.0, 28.935, 34.0, 19.0, -0.13);

  // Shed B: [1.213, 4.667], size 28x8 -> apron 30x10
  drawRotatedApron(1.213, 4.667, 30.0, 10.0, -0.13);

  // Shed C: [5.414, -38.736], size 34x11 -> apron 36x13
  drawRotatedApron(5.414, -38.736, 36.0, 13.0, -0.13);

  // Shed D (chicken): [-1.773, -28.095], size 22x5 -> apron 24x7
  drawRotatedApron(-1.773, -28.095, 24.0, 7.0, -0.13);

  // Network / CCTV: [-22.508, -11.388], size 6x6 -> apron 8x8
  drawRotatedApron(-22.508, -11.388, 8.0, 8.0, -0.13);

  // Kitchen: [27.909, 42.843], size 9x6 -> apron 11.5x8.5
  drawRotatedApron(27.909, 42.843, 11.5, 8.5, -0.13);

  // US A & US B (Upcoming sheds): compacted gravel hardstand foundation pads
  drawRotatedApron(-1.68, -8.307, 26.5, 7.5, -0.13, {
    slabColor: "#b2ab9a",
    edgeColor: "#6c6659",
    jointColor: "#8e8677",
  });
  drawRotatedApron(-1.68, -17.548, 26.5, 7.5, -0.13, {
    slabColor: "#b2ab9a",
    edgeColor: "#6c6659",
    jointColor: "#8e8677",
  });

  // Inner lawn islands (fresh vibrant grass aligned with -0.13 rad shed angle)
  function drawRotatedLawn(x, z, w, d, rot = -0.13) {
    const [cx, cz] = toCanvas(x, z);
    const wPx = (w / worldSize) * 2048;
    const dPx = (d / worldSize) * 2048;
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(-rot);
    ctx.fillStyle = "#49962e";
    ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);
    // Subtle interior highlight
    ctx.fillStyle = "#5cb03c";
    ctx.fillRect(-wPx / 2 + 3, -dPx / 2 + 3, wPx - 6, dPx - 6);
    ctx.restore();
  }

  // Lawns between buildings (parallel to sheds)
  drawRotatedLawn(0.6, 16.8, 26.0, 6.5, -0.13);     // Between Shed A and Shed B
  drawRotatedLawn(-0.2, -1.8, 24.0, 4.5, -0.13);     // Between Shed B and US A
  drawRotatedLawn(-1.7, -22.8, 22.0, 3.5, -0.13);    // Between US B and Shed D
  drawRotatedLawn(20.0, 10.0, 10.0, 16.0, -0.13);    // East courtyard lawn patch

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
  // 2. Ghibli 3D Compound Fence & Single Main Entrance Gate
  // Encloses entire farm (including Shed A and Kitchen).
  // Only one single gate exists: the labeled Gate at pos(294, 1565) [-23.9, 48.07].
  // ==========================================================================
  const fenceGroup = new THREE.Group();
  groundGroup.add(fenceGroup);

  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.45, 7);
  postGeo.translate(0, 0.725, 0);

  const ghibliFenceMat = createGhibliMaterial({
    colors: ["#c7a378", "#916d4d", "#5a3f2b", "#342217"],
    thresholds: [0.64, 0.36, 0.02],
  });

  // Fence perimeter encloses Kitchen, Shed A, Network room, Shed C:
  // Labeled Gate opening is between [-21.4, 48.07] and [-26.4, 48.07] (centered at -23.895, 48.07).
  const gateX = -23.895;
  const gateZ = 48.07;
  const gateHalfW = 2.5;

  const fencePerimeter = [
    [gateX + gateHalfW, gateZ], // Gate East pillar (-21.395, 48.07)
    [34.5, gateZ],              // East along south boundary enclosing Kitchen
    [34.5, -53.0],              // North along east boundary past Kitchen and Shed C
    [-29.5, -53.0],             // West along north boundary past Shed C
    [-29.5, gateZ],             // South along west boundary past Network room and Shed A
    [gateX - gateHalfW, gateZ], // East along south boundary to Gate West pillar (-26.395, 48.07)
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

  // Stone Pillars & Rustic Iron Gate at the single labeled Gate position (-23.895, 48.07)
  const pillarGeo = new THREE.BoxGeometry(0.75, 2.5, 0.75);
  const ghibliPillarMat = createGhibliMaterial({
    colors: ["#c5beb5", "#989086", "#6c655d", "#433e38"],
    thresholds: [0.65, 0.38, 0.0],
  });
  for (const px of [gateX - gateHalfW, gateX + gateHalfW]) {
    const pillar = new THREE.Mesh(pillarGeo, ghibliPillarMat);
    pillar.position.set(px, 1.25, gateZ);
    fenceGroup.add(pillar);
  }

  const ghibliGateFrameMat = createGhibliMaterial({
    colors: ["#4d5d64", "#344249", "#202c32", "#121b20"],
    thresholds: [0.65, 0.35, -0.05],
  });
  for (const [side, px, angle] of [
    [-1, gateX - gateHalfW + 0.2, 0.4],
    [1, gateX + gateHalfW - 0.2, -0.4],
  ]) {
    const leaf = new THREE.Group();
    leaf.position.set(px, 0, gateZ);
    leaf.rotation.y = angle;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.6, 0.06),
      ghibliGateFrameMat,
    );
    frame.position.set(side * 1.15, 1.0, 0);
    leaf.add(frame);
    for (let x = 0.2; x <= 2.1; x += 0.3) {
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
  // 3. Ricardo Oliva Alonso Stylized 3D Grass & Bush Hedge (CodePen KwKwddJ)
  // Pointed 3-sided low-poly triangular spikes catching faceted sunlight
  // and puffy billowy spherical bushes along the wooden fence perimeter
  // ==========================================================================
  const bushGeo = new THREE.SphereGeometry(1.0, 9, 6);
  const bushMat = createGhibliMaterial({
    colors: ["#9dc882", "#6ea062", "#48783e", "#284e24"],
    thresholds: [0.65, 0.35, -0.05],
  });

  const dummy = new THREE.Object3D();
  let bSeed = 4091;
  const bRnd = () => {
    bSeed = (bSeed * 1664525 + 1013904223) % 4294967296;
    return bSeed / 4294967296;
  };

  const bushInstances = [];
  // Winding row of billowy bush spheres along the south wooden fence (z = 48.07)
  for (let x = -28.0; x <= 34.0; x += 1.35) {
    if (x > -26.5 && x < -21.3) continue; // Keep gate opening clear
    const clusterZ = 48.07 + (bRnd() - 0.5) * 0.7;
    const baseR = 0.55 + bRnd() * 0.35;
    bushInstances.push({
      x: x + (bRnd() - 0.5) * 0.4,
      y: baseR * 0.65,
      z: clusterZ,
      scale: baseR,
    });
    if (bRnd() < 0.75) {
      const flR = baseR * (0.65 + bRnd() * 0.3);
      bushInstances.push({
        x: x + (bRnd() < 0.5 ? -1 : 1) * (baseR * 0.6),
        y: flR * 0.65,
        z: clusterZ + (bRnd() - 0.5) * 0.5,
        scale: flR,
      });
    }
  }

  const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, bushInstances.length);
  bushMesh.receiveShadow = true;
  for (let i = 0; i < bushInstances.length; i++) {
    const b = bushInstances[i];
    dummy.position.set(b.x, b.y - 0.06, b.z);
    dummy.scale.set(b.scale, b.scale * 0.85, b.scale);
    dummy.rotation.set((bRnd() - 0.5) * 0.2, bRnd() * Math.PI, (bRnd() - 0.5) * 0.2);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(i, dummy.matrix);
  }
  bushMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(bushMesh);

  // 3B. Ricardo Oliva Alonso 3D Triangular Grass Spikes
  const grassGeo = createRicardoGrassGeometry();
  const grassMat = createRicardoGrassMaterial();
  const tuftPositions = [];

  let tSeed = 8274;
  const tRnd = () => {
    tSeed = (tSeed * 1664525 + 1013904223) % 4294967296;
    return tSeed / 4294967296;
  };

  function distToRoad(px, pz) {
    const x1 = -23.895, z1 = 48.07;
    const x2 = -50.0, z2 = 120.0;
    const dx = x2 - x1, dz = z2 - z1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
  }

  // 1. Surrounding 360-Degree Meadow Belts (South, West, East, North)
  // Ensures thick, tactile 3D diorama grass spikes appear in front of the camera from ANY viewing angle
  const outerMeadowZones = [
    // South Meadow Belt (in front of south fence)
    { minX: -60.0, maxX: 60.0, minZ: 48.6, maxZ: 85.0, stepsX: 55, stepsZ: 32 },
    // West Meadow Belt (in front of west fence - right before the camera when viewing Shed A/B from West)
    { minX: -62.0, maxX: -29.8, minZ: -54.0, maxZ: 49.0, stepsX: 30, stepsZ: 65 },
    // East Meadow Belt (in front of east fence past Kitchen)
    { minX: 34.8, maxX: 62.0, minZ: -54.0, maxZ: 49.0, stepsX: 25, stepsZ: 65 },
    // North Meadow Belt (in front of north fence past Shed C)
    { minX: -60.0, maxX: 60.0, minZ: -80.0, maxZ: -53.5, stepsX: 55, stepsZ: 25 },
  ];

  for (const zone of outerMeadowZones) {
    const xSpan = zone.maxX - zone.minX;
    const zSpan = zone.maxZ - zone.minZ;
    for (let ix = 0; ix < zone.stepsX; ix++) {
      for (let iz = 0; iz < zone.stepsZ; iz++) {
        const fracX = (ix + tRnd() * 0.85) / zone.stepsX;
        const fracZ = (iz + tRnd() * 0.85) / zone.stepsZ;
        const x = zone.minX + fracX * xSpan;
        const z = zone.minZ + fracZ * zSpan;
        if (distToRoad(x, z) < 4.2) continue; // Keep access road completely clear

        tuftPositions.push({
          x,
          z,
          scale: 0.9 + tRnd() * 0.35,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 2. Inner Lawn Patches between sheds (mud courtyard is kept 100% clean)
  const innerLawnPatches = [
    { x: 0.6, z: 16.8, w: 24.0, d: 5.5 },   // Between Shed A and Shed B
    { x: -0.2, z: -1.8, w: 22.0, d: 3.5 },  // Between Shed B and US A
    { x: -1.7, z: -22.8, w: 20.0, d: 2.8 }, // Between US B and Shed D
    { x: 20.0, z: 10.0, w: 10.0, d: 16.0 }, // East courtyard lawn patch
  ];
  for (const lp of innerLawnPatches) {
    const rot = -0.13;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const count = Math.floor(lp.w * lp.d * 2.8);
    for (let i = 0; i < count; i++) {
      const lx = (tRnd() - 0.5) * (lp.w - 0.4);
      const lz = (tRnd() - 0.5) * (lp.d - 0.4);
      const wx = lp.x + lx * cosR - lz * sinR;
      const wz = lp.z + lx * sinR + lz * cosR;
      tuftPositions.push({
        x: wx,
        z: wz,
        scale: 0.75 + tRnd() * 0.30,
        rot: tRnd() * Math.PI * 2,
      });
    }
  }

  // 3. Along outer margins of perimeter fence rails (outside compound only)
  const outerFencePerimeter = [
    [-21.4, 48.07],
    [34.5, 48.07],
    [34.5, -53.0],
    [-29.5, -53.0],
    [-29.5, 48.07],
    [-26.4, 48.07],
  ];
  for (let seg = 0; seg < outerFencePerimeter.length - 1; seg++) {
    const p1 = outerFencePerimeter[seg];
    const p2 = outerFencePerimeter[seg + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const dist = Math.hypot(dx, dz);
    const count = Math.floor(dist / 0.35);
    const nx = -dz / dist;
    const nz = dx / dist;

    for (let i = 0; i < count; i++) {
      const frac = (i + tRnd() * 0.7) / count;
      const x = p1[0] + dx * frac;
      const z = p1[1] + dz * frac;
      const offset = 0.3 + tRnd() * 0.8;
      const ox = x + nx * offset;
      const oz = z + nz * offset;
      if (distToRoad(ox, oz) < 3.8) continue;

      tuftPositions.push({
        x: ox,
        z: oz,
        scale: 0.8 + tRnd() * 0.35,
        rot: tRnd() * Math.PI * 2,
      });
    }
  }

  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, tuftPositions.length);
  grassMesh.receiveShadow = true;
  for (let i = 0; i < tuftPositions.length; i++) {
    const tp = tuftPositions[i];
    dummy.position.set(tp.x, -0.06, tp.z);
    dummy.rotation.set(0, tp.rot, 0);
    dummy.scale.set(tp.scale, tp.scale, tp.scale);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(grassMesh);


  // ==========================================================================
  // 3. Ghibli 3D Distant Cumulus Clouds
  // Towering anime cumulus clouds along the distant horizon with slow drift
  // ==========================================================================
  const cloudsGroup = new THREE.Group();
  envGroup.add(cloudsGroup);

  const ghibliCloudMat = createGhibliMaterial({
    colors: ["#ffffff", "#f2f7fd", "#adc3dd", "#839bb8"],
    thresholds: [0.6, 0.33, -0.06],
  });

  const cloudBankAngles = [
    0.2, 0.72, 1.3, 1.88, 2.45, 3.02, 3.6, 4.18, 4.75, 5.32, 5.9, 6.22,
  ];
  const sphereGeo = new THREE.SphereGeometry(1, 12, 8);

  for (let i = 0; i < cloudBankAngles.length; i++) {
    const angle = cloudBankAngles[i];
    const dist = 320 + (i % 3) * 35;
    const baseY = 55 + (i % 4) * 12;
    const bankScale = 24 + (i % 5) * 6;

    const bank = new THREE.Group();
    bank.position.set(Math.cos(angle) * dist, baseY, Math.sin(angle) * dist);

    const puffs = [
      { x: 0, y: 0, z: 0, r: 1.0 },
      { x: -0.65 * bankScale, y: -0.2 * bankScale, z: 0.1 * bankScale, r: 0.75 },
      { x: 0.65 * bankScale, y: -0.22 * bankScale, z: -0.1 * bankScale, r: 0.72 },
      { x: -1.15 * bankScale, y: -0.38 * bankScale, z: 0.2 * bankScale, r: 0.55 },
      { x: 1.15 * bankScale, y: -0.4 * bankScale, z: -0.2 * bankScale, r: 0.52 },
      { x: 0, y: 0.55 * bankScale, z: 0, r: 0.8 },
      { x: -0.4 * bankScale, y: 0.42 * bankScale, z: 0.1 * bankScale, r: 0.68 },
      { x: 0.42 * bankScale, y: 0.38 * bankScale, z: -0.1 * bankScale, r: 0.66 },
    ];

    for (const puff of puffs) {
      const mesh = new THREE.Mesh(sphereGeo, ghibliCloudMat);
      mesh.scale.set(puff.r * bankScale, puff.r * bankScale * 0.85, puff.r * bankScale);
      mesh.position.set(puff.x, puff.y, puff.z);
      bank.add(mesh);
    }
    cloudsGroup.add(bank);
  }

  return {
    envGroup,
    groundGroup,
    get forestGroup() {
      return forest ? forest.group : null;
    },
    get treeCount() {
      return forest ? forest.trees.length : 0;
    },
    get forest() {
      return forest;
    },
    plant(exclusions, settings) {
      forest = createForest(envGroup, exclusions, settings);
    },
    update(time, camera) {
      if (grassMat && grassMat.uniforms.time) grassMat.uniforms.time.value = time;
      if (cloudsGroup) cloudsGroup.rotation.y = time * 0.002;
      if (forest) forest.update(time, camera);
    },
  };
}
