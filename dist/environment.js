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
 * using a 4-tier discrete color palette (Highlight -> Midtone -> Mid-Shadow -> Deep Shadow).
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
 * Custom Ghibli Ground Shader Material (Craftzdog & Kazuo Oga Aesthetic)
 * Modulates diffuse sunlight with multi-frequency procedural watercolor wash noise,
 * imparting warm golden sunlight tint, cool ambient sky fill, and fine paper tooth.
 */
export function createGhibliGroundMaterial({
  map,
  sunDirection = new THREE.Vector3(-40, 85, 35).normalize(),
}) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      map: { value: map },
      sunDirection: { value: sunDirection },
      time: { value: 0 },
    },
  ]);

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      #include <fog_pars_fragment>

      uniform sampler2D map;
      uniform vec3 sunDirection;
      uniform float time;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      // Fast procedural noise for Craftzdog watercolor wash
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec4 texColor = texture2D(map, vUv);

        // Multi-frequency watercolor wash (Craftzdog style)
        vec2 p = vWorldPosition.xz;
        float n1 = noise(p * 0.035);
        float n2 = noise(p * 0.105 + 2.1);
        float n3 = noise(p * 0.28 + 5.7);
        float wash = n1 * 0.54 + n2 * 0.32 + n3 * 0.14;

        // Modulate diffuse lighting with watercolor wash
        float sunDot = max(0.0, dot(vWorldNormal, sunDirection));
        float lightVal = sunDot + (wash - 0.5) * 0.44;

        vec3 col = texColor.rgb;

        // Ghibli warm sunlight & cool sky ambient color grading
        vec3 sunTint = vec3(1.08, 1.04, 0.94);
        vec3 shadowTint = vec3(0.88, 0.94, 1.02);

        // Stepped 3-tier Ghibli cel light transition
        if (lightVal > 0.85) {
          col = col * sunTint * 1.06;
        } else if (lightVal > 0.64) {
          float t = (lightVal - 0.64) / 0.21;
          col = col * mix(shadowTint, sunTint, t);
        } else {
          col = col * shadowTint * 0.94;
        }

        // Micro-grain for watercolor paper tooth
        float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.026;
        col += vec3(grain);

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    fog: true,
  });
}

/**
 * 4-blade tapered stylized anime grass tuft geometry with vertex color gradient
 * (deep moss viridian root -> lush anime green mid -> sunlit golden chartreuse tip).
 */
/**
 * Studio Ghibli 3D Terrain Elevation Function
 * Level and flat across the active farm compound (y = -0.06),
 * smoothly transitioning to gentle rolling anime hills and knolls outside.
 */
export function getTerrainElevation(x, z) {
  // Working compound box: x: [-32, 36], z: [-54, 50]
  // Inside compound + 4m margin, terrain is level at y = -0.06
  const dx = Math.max(0, -32 - x, x - 36);
  const dz = Math.max(0, -54 - z, z - 50);
  const dist = Math.hypot(dx, dz);

  if (dist <= 4.0) {
    return -0.06;
  }

  // Smooth cubic ease from flat compound to rolling hills outside
  const blend = Math.min(1.0, (dist - 4.0) / 22.0);
  const t = blend * blend * (3.0 - 2.0 * blend);

  const hill1 = Math.sin(x * 0.032) * Math.cos(z * 0.026) * 3.2;
  const hill2 = Math.sin(x * 0.07 + 1.5) * Math.sin(z * 0.05 + 0.8) * 1.4;
  const hill3 = Math.cos(x * 0.018 - z * 0.022) * 1.8;

  return -0.06 + t * (hill1 + hill2 + hill3);
}

/**
 * 6-blade tapered stylized anime grass tuft geometry with vertex color gradient
 * (deep moss viridian root -> lush anime green mid -> sunlit golden chartreuse tip).
 * Features curved outward arching fan blades forming a lush, volumetric bouquet.
 */
function createGhibliGrassGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const normals = [];
  const indices = [];

  // Studio Ghibli Grass Color Gradient (Kazuo Oga Totoro palette)
  const rootCol = [0.08, 0.20, 0.08]; // deep rich viridian moss shadow #143314
  const midCol = [0.24, 0.54, 0.16];  // lush vibrant anime green #3d8a29
  const tipCol = [0.65, 0.92, 0.24];  // golden sunlit chartreuse #a6eb3d
  const tipGold = [0.82, 0.95, 0.32]; // warm sunny highlight tip #d1f252

  // 6 stylized tapered curved blades radiating in a lush star bouquet
  const blades = [
    { angle: 0.15, h: 0.95, curve: 0.18, w: 0.085, tipC: tipCol },
    { angle: 1.18, h: 0.82, curve: 0.14, w: 0.075, tipC: tipGold },
    { angle: 2.25, h: 1.05, curve: 0.22, w: 0.095, tipC: tipCol },
    { angle: 3.32, h: 0.78, curve: 0.13, w: 0.070, tipC: tipGold },
    { angle: 4.40, h: 1.02, curve: 0.20, w: 0.090, tipC: tipCol },
    { angle: 5.45, h: 0.88, curve: 0.16, w: 0.080, tipC: tipGold },
  ];

  let vOffset = 0;
  for (let b = 0; b < blades.length; b++) {
    const blade = blades[b];
    const cosA = Math.cos(blade.angle);
    const sinA = Math.sin(blade.angle);
    const perpX = -sinA;
    const perpZ = cosA;

    const baseW = blade.w * 0.5;
    const midW = blade.w * 0.36;

    // V0, V1: Root base (y = 0)
    positions.push(-perpX * baseW, 0, -perpZ * baseW);
    colors.push(...rootCol);
    normals.push(0, 1, 0);

    positions.push(perpX * baseW, 0, perpZ * baseW);
    colors.push(...rootCol);
    normals.push(0, 1, 0);

    // V2, V3: Mid-height with curved outward lean
    const midX = cosA * blade.curve * 0.48;
    const midZ = sinA * blade.curve * 0.48;
    const midH = blade.h * 0.52;

    positions.push(midX - perpX * midW, midH, midZ - perpZ * midW);
    colors.push(...midCol);
    normals.push(cosA * 0.4, 0.8, sinA * 0.4);

    positions.push(midX + perpX * midW, midH, midZ + perpZ * midW);
    colors.push(...midCol);
    normals.push(cosA * 0.4, 0.8, sinA * 0.4);

    // V4: Tapered sharp blade tip
    const tipX = cosA * blade.curve;
    const tipZ = sinA * blade.curve;
    positions.push(tipX, blade.h, tipZ);
    colors.push(...blade.tipC);
    normals.push(cosA * 0.7, 0.6, sinA * 0.7);

    // Triangles for this blade (3 triangles):
    indices.push(vOffset + 0, vOffset + 1, vOffset + 3);
    indices.push(vOffset + 0, vOffset + 3, vOffset + 2);
    indices.push(vOffset + 2, vOffset + 3, vOffset + 4);

    vOffset += 5;
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/**
 * Grass Tuft ShaderMaterial with multi-frequency anime wind sway
 */
function createGhibliGrassMaterial() {
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
      varying vec3 vWorldPosition;

      void main() {
        vColor = color;
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

        // Ghibli wave wind sway (roots anchored at y=0, tips sway with wind gusts)
        float anchor = pow(clamp(position.y / 0.85, 0.0, 1.0), 1.6);
        
        // Multi-frequency wind wave
        float wave1 = sin(time * 2.4 + worldPos.x * 0.35 + worldPos.z * 0.25);
        float wave2 = cos(time * 1.5 + worldPos.x * 0.15 - worldPos.z * 0.40);
        float gust = 0.8 + 0.35 * sin(time * 0.55 + worldPos.x * 0.06 + worldPos.z * 0.04);
        
        vec3 sway = vec3(
          wave1 * 0.16 + wave2 * 0.08,
          -abs(wave1) * 0.03,
          (wave1 * 0.3 + wave2 * 0.7) * 0.12
        ) * anchor * gust;

        vec3 localP = position + sway;
        worldPos = modelMatrix * instanceMatrix * vec4(localP, 1.0);
        vWorldPosition = worldPos.xyz;
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
      varying vec3 vWorldPosition;

      void main() {
        vec3 lightDir = normalize(sunDirection);
        float sunDot = dot(vWorldNormal, lightDir);
        
        vec3 col = vColor;
        if (sunDot > 0.45) {
          col = col * vec3(1.15, 1.12, 0.95);
        } else if (sunDot > 0.05) {
          col = col * vec3(1.02, 1.02, 1.00);
        } else {
          col = col * vec3(0.86, 0.91, 0.97);
        }
        
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    side: THREE.DoubleSide,
    fog: true,
  });
}

/**
 * Low-poly stylized Ghibli wildflower geometry with colorful petals and delicate stems
 */
function createGhibliWildflowerGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const indices = [];

  const stemCol = [0.22, 0.50, 0.18];
  const yellowCol = [1.0, 0.86, 0.22];
  const creamCol = [0.98, 0.98, 0.94];
  const blueCol = [0.45, 0.72, 0.98];
  const pinkCol = [0.95, 0.55, 0.72];
  const centerCol = [0.96, 0.62, 0.12];

  const flowerPalette = [yellowCol, creamCol, blueCol, pinkCol];

  let vOff = 0;
  for (let f = 0; f < 4; f++) {
    const pCol = flowerPalette[f];
    const h = 0.42 + (f % 2) * 0.12;
    const ang = f * 1.57;
    const leanX = Math.cos(ang) * 0.05;
    const leanZ = Math.sin(ang) * 0.05;

    // Stem quad (2 triangles)
    positions.push(-0.015, 0, 0, 0.015, 0, 0, leanX + 0.012, h, leanZ, leanX - 0.012, h, leanZ);
    colors.push(...stemCol, ...stemCol, ...stemCol, ...stemCol);
    indices.push(vOff + 0, vOff + 1, vOff + 2, vOff + 0, vOff + 2, vOff + 3);

    // Center disk vertex
    const cIdx = vOff + 4;
    positions.push(leanX, h + 0.015, leanZ);
    colors.push(...centerCol);

    // 5 petals around center
    const petalCount = 5;
    const rOuter = 0.055;
    const rInner = 0.028;
    for (let p = 0; p < petalCount; p++) {
      const a1 = (p / petalCount) * Math.PI * 2;
      const a2 = ((p + 0.5) / petalCount) * Math.PI * 2;
      const pIdx = vOff + 5 + p * 2;
      positions.push(leanX + Math.cos(a1) * rOuter, h + 0.018, leanZ + Math.sin(a1) * rOuter);
      colors.push(...pCol);
      positions.push(leanX + Math.cos(a2) * rInner, h + 0.018, leanZ + Math.sin(a2) * rInner);
      colors.push(...creamCol);

      indices.push(cIdx, pIdx, pIdx + 1);
      indices.push(cIdx, pIdx + 1, vOff + 5 + ((p + 1) % petalCount) * 2);
    }

    vOff += 5 + petalCount * 2;
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Studio Ghibli / Kazuo Oga Aesthetic 3D Environment
 * Replaces flat 2D satellite aerial imagery with painterly 3D rolling terrain,
 * warm sunlit earth courtyard, dense 3D stylized swaying grass, and volumetric grassy mounds.
 */
export function createEnvironment(scene) {
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  const groundGroup = new THREE.Group();
  envGroup.add(groundGroup);

  let forest;

  // ==========================================================================
  // 1. Ghibli Landscape Ground (Kazuo Oga Watercolor Washes & Terraced Paddies)
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

  // 1A. Deep lush viridian undercoat (Kazuo Oga base wash)
  ctx.fillStyle = "#2c5427";
  ctx.fillRect(0, 0, 2048, 2048);

  // 1B. Multi-tier organic gouache washes (broad overlapping radial gradients)
  const grassWashes = [
    { x: 300, y: 400, r: 500, col: "#3f7734" },
    { x: 1200, y: 350, r: 650, col: "#4a8a3a" },
    { x: 1700, y: 900, r: 600, col: "#386e2f" },
    { x: 700, y: 1100, r: 550, col: "#4e933e" },
    { x: 1400, y: 1500, r: 650, col: "#448135" },
    { x: 400, y: 1700, r: 600, col: "#3d7532" },
    { x: 1024, y: 1024, r: 450, col: "#569d42" },
  ];
  for (const w of grassWashes) {
    const g = ctx.createRadialGradient(w.x, w.y, 40, w.x, w.y, w.r);
    g.addColorStop(0, w.col);
    g.addColorStop(1, "rgba(44, 84, 39, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2048, 2048);
  }

  // 1C. Warm sunny meadow dapples (sunlit chartreuse sweeps in open clearings)
  const sunSweeps = [
    { x: 950, y: 750, r: 350, col: "rgba(128, 198, 68, 0.45)" },
    { x: 1350, y: 1100, r: 300, col: "rgba(142, 212, 74, 0.40)" },
    { x: 650, y: 1400, r: 320, col: "rgba(120, 190, 62, 0.42)" },
    { x: 1150, y: 1700, r: 400, col: "rgba(135, 205, 70, 0.38)" },
    { x: 800, y: 550, r: 280, col: "rgba(148, 218, 78, 0.40)" },
  ];
  for (const s of sunSweeps) {
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, s.r);
    g.addColorStop(0, s.col);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2048, 2048);
  }

  // 1D. Directional gouache dry-brush strokes (rippling meadow texture)
  ctx.save();
  ctx.rotate(-0.38);
  for (let y = -500; y < 2500; y += 16) {
    for (let x = -500; x < 2500; x += 26) {
      const n = (Math.sin(x * 0.035 + y * 0.045) + Math.cos(x * 0.07 - y * 0.02)) * 0.5;
      if (n > 0.15) {
        ctx.fillStyle = n > 0.5 ? "rgba(152, 218, 82, 0.22)" : "rgba(52, 98, 42, 0.20)";
        ctx.fillRect(x + n * 4, y, 16 + n * 12, 2.8);
      }
    }
  }
  ctx.restore();

  // 1E. Surrounding Terraced Fields (flooded rice paddies like Kazuo Oga's background art)
  const paddies = [
    { x1: -280, z1: -280, x2: -60, z2: -160, water: true },
    { x1: -280, z1: -160, x2: -75, z2: -70, water: true },
    { x1: -60, z1: -280, x2: 130, z2: -170, water: false, color: "#4f8d32" },
    { x1: 130, z1: -280, x2: 280, z2: -150, water: true },
    { x1: 65, z1: -170, x2: 280, z2: -50, water: true },
    { x1: 55, z1: -50, x2: 280, z2: 65, water: true },
    { x1: 65, z1: 65, x2: 280, z2: 180, water: false, color: "#59933a" },
    { x1: 65, z1: 180, x2: 280, z2: 280, water: true },
    { x1: -90, z1: 85, x2: 65, z2: 200, water: true },
    { x1: -100, z1: 200, x2: 65, z2: 280, water: false, color: "#65a342" },
    { x1: -280, z1: 75, x2: -90, z2: 280, water: true },
    { x1: -280, z1: -70, x2: -50, z2: 75, water: true },
  ];

  for (const p of paddies) {
    const [c1x, c1z] = toCanvas(p.x1, p.z1);
    const [c2x, c2z] = toCanvas(p.x2, p.z2);
    const pw = c2x - c1x;
    const ph = c2z - c1z;

    if (p.water) {
      ctx.fillStyle = "#80b2a5";
      ctx.fillRect(c1x, c1z, pw, ph);

      const grad = ctx.createLinearGradient(c1x, c1z, c1x + pw, c1z + ph);
      grad.addColorStop(0, "rgba(182, 226, 218, 0.58)");
      grad.addColorStop(0.5, "rgba(142, 192, 182, 0.28)");
      grad.addColorStop(1, "rgba(118, 168, 158, 0.48)");
      ctx.fillStyle = grad;
      ctx.fillRect(c1x, c1z, pw, ph);

      // Rice seedling tufts in neat agricultural rows
      ctx.fillStyle = "#335e24";
      const rowStep = 24;
      for (let rx = c1x + 12; rx < c1x + pw - 12; rx += rowStep) {
        for (let rz = c1z + 12; rz < c1z + ph - 12; rz += rowStep) {
          ctx.fillRect(rx, rz, 3, 4);
          ctx.fillStyle = "rgba(40, 75, 65, 0.35)";
          ctx.fillRect(rx - 1, rz + 4, 5, 2);
          ctx.fillStyle = "#335e24";
        }
      }

      ctx.strokeStyle = "#385b28";
      ctx.lineWidth = 6;
      ctx.strokeRect(c1x + 3, c1z + 3, pw - 6, ph - 6);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(c1x, c1z, pw, ph);
      ctx.strokeStyle = "#345525";
      ctx.lineWidth = 5;
      ctx.strokeRect(c1x + 2, c1z + 2, pw - 4, ph - 4);
    }
  }

  // 1F. Farm Compound Yard (Studio Ghibli Warm Sunlit Loam & Sand)
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

  function drawOrganicMudPolygon(pts) {
    ctx.beginPath();
    const first = toCanvas(pts[0][0], pts[0][1]);
    ctx.moveTo(first[0], first[1]);

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const [c1x, c1z] = toCanvas(p1[0], p1[1]);
      const [c2x, c2z] = toCanvas(p2[0], p2[1]);
      const subSteps = 8;
      for (let s = 1; s <= subSteps; s++) {
        const t = s / subSteps;
        const bx = c1x + (c2x - c1x) * t;
        const bz = c1z + (c2z - c1z) * t;
        const wave = Math.sin(t * Math.PI * 4 + i * 1.7) * 4.5;
        const normalX = -(c2z - c1z);
        const normalZ = (c2x - c1x);
        const len = Math.hypot(normalX, normalZ) || 1;
        ctx.lineTo(bx + (normalX / len) * wave, bz + (normalZ / len) * wave);
      }
    }
    ctx.closePath();
  }

  // 1. Warm sun-warmed golden ochre loam base undercoat
  ctx.fillStyle = "#dcae72";
  drawOrganicMudPolygon(compoundPts);
  ctx.fill();

  // 2. Multi-tier organic gouache washes (Totoro farm courtyard)
  // 2A. Broad sun-warmed creamy sand clearing in center
  const yardGrad = ctx.createRadialGradient(
    ...toCanvas(3, 14),
    25,
    ...toCanvas(3, 14),
    420,
  );
  yardGrad.addColorStop(0, "#f6e8ca");
  yardGrad.addColorStop(0.35, "#ebd09d");
  yardGrad.addColorStop(0.70, "#d2a76d");
  yardGrad.addColorStop(1, "rgba(178, 128, 76, 0.88)");
  ctx.fillStyle = yardGrad;
  drawOrganicMudPolygon(compoundPts);
  ctx.fill();

  // 2B. Forecourt sunny sand wash around Shed A
  const shedAGrad = ctx.createRadialGradient(
    ...toCanvas(-14, 32),
    15,
    ...toCanvas(-14, 32),
    180,
  );
  shedAGrad.addColorStop(0, "rgba(246, 232, 202, 0.85)");
  shedAGrad.addColorStop(0.6, "rgba(216, 175, 117, 0.50)");
  shedAGrad.addColorStop(1, "rgba(180, 130, 80, 0)");
  ctx.fillStyle = shedAGrad;
  drawOrganicMudPolygon(compoundPts);
  ctx.fill();

  // 2C. Forecourt sunny sand wash around Kitchen
  const kitchGrad = ctx.createRadialGradient(
    ...toCanvas(24, 38),
    15,
    ...toCanvas(24, 38),
    150,
  );
  kitchGrad.addColorStop(0, "rgba(245, 228, 194, 0.80)");
  kitchGrad.addColorStop(1, "rgba(180, 130, 80, 0)");
  ctx.fillStyle = kitchGrad;
  drawOrganicMudPolygon(compoundPts);
  ctx.fill();

  // 2D. Moist, rich fertile earth under building eaves and drainage channels
  const moistZones = [
    { x: 0, z: 29, r: 125, alpha: 0.55 },     // Shed A pig pens
    { x: 1, z: 5, r: 95, alpha: 0.50 },       // Shed B
    { x: 5, z: -39, r: 115, alpha: 0.52 },    // Shed C
    { x: -22, z: -11, r: 75, alpha: 0.40 },   // Network room
  ];
  for (const mz of moistZones) {
    const mg = ctx.createRadialGradient(
      ...toCanvas(mz.x, mz.z),
      15,
      ...toCanvas(mz.x, mz.z),
      mz.r,
    );
    mg.addColorStop(0, `rgba(118, 72, 34, ${mz.alpha})`);
    mg.addColorStop(0.55, `rgba(148, 96, 50, ${mz.alpha * 0.6})`);
    mg.addColorStop(1, "rgba(180, 130, 80, 0)");
    ctx.fillStyle = mg;
    drawOrganicMudPolygon(compoundPts);
    ctx.fill();
  }

  // 2E. Organic scalloped grass border encroaching into the dirt
  // (Dissolves sharp polygon lines into fluffy painted grass lobes)
  let scSeed = 9182;
  const scRnd = () => {
    scSeed = (scSeed * 1664525 + 1013904223) % 4294967296;
    return scSeed / 4294967296;
  };
  for (let i = 0; i < compoundPts.length - 1; i++) {
    const p1 = compoundPts[i];
    const p2 = compoundPts[i + 1];
    const [c1x, c1z] = toCanvas(p1[0], p1[1]);
    const [c2x, c2z] = toCanvas(p2[0], p2[1]);
    const segDist = Math.hypot(c2x - c1x, c2z - c1z);
    const steps = Math.floor(segDist / 14);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const bx = c1x + (c2x - c1x) * t;
      const bz = c1z + (c2z - c1z) * t;
      const jx = (scRnd() - 0.5) * 10;
      const jz = (scRnd() - 0.5) * 10;

      // Dark moss base lobe
      ctx.fillStyle = "rgba(42, 78, 32, 0.75)";
      ctx.beginPath();
      ctx.arc(bx + jx, bz + jz, 14 + scRnd() * 10, 0, Math.PI * 2);
      ctx.fill();

      // Lush green mid lobe
      ctx.fillStyle = "rgba(72, 138, 44, 0.82)";
      ctx.beginPath();
      ctx.arc(bx + jx * 0.8, bz + jz * 0.8, 10 + scRnd() * 8, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit tip highlight lobe
      ctx.fillStyle = "rgba(114, 192, 60, 0.70)";
      ctx.beginPath();
      ctx.arc(bx + jx * 0.5, bz + jz * 0.5, 6 + scRnd() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Fine gouache pebble & sand stippling (smooth rounded dabs, NO square pixels!)
  let soilSeed = 512;
  const sRnd = () => {
    soilSeed = (soilSeed * 1664525 + 1013904223) % 4294967296;
    return soilSeed / 4294967296;
  };
  const [minCX, minCZ] = toCanvas(-32, -54);
  const [maxCX, maxCZ] = toCanvas(36, 53);
  const soilTones = [
    "rgba(250, 237, 214, 0.70)", // light sunlit sand dab
    "rgba(226, 194, 147, 0.65)", // golden loam dab
    "rgba(200, 156, 104, 0.60)", // ochre soil dab
    "rgba(156, 119, 74, 0.55)",  // warm sienna dab
    "rgba(122, 88, 51, 0.50)",   // damp earth dab
    "rgba(166, 156, 144, 0.60)", // smooth river pebble dab
    "rgba(123, 115, 100, 0.50)", // slate pebble dab
  ];
  for (let d = 0; d < 2800; d++) {
    const sx = minCX + sRnd() * (maxCX - minCX);
    const sz = minCZ + sRnd() * (maxCZ - minCZ);
    ctx.fillStyle = soilTones[Math.floor(sRnd() * soilTones.length)];
    ctx.beginPath();
    ctx.arc(sx, sz, 1.2 + sRnd() * 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Subtle rain puddle sky reflections near pig pen drainage
  const puddles = [
    { x: -10, z: 22, rx: 12, rz: 6, rot: 0.2 },
    { x: 12, z: 38, rx: 14, rz: 7, rot: -0.3 },
    { x: -16, z: -4, rx: 10, rz: 5, rot: 0.1 },
  ];
  for (const p of puddles) {
    const [pcx, pcz] = toCanvas(p.x, p.z);
    ctx.save();
    ctx.translate(pcx, pcz);
    ctx.rotate(p.rot);
    ctx.fillStyle = "rgba(78, 46, 22, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx + 4, p.rz + 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(165, 208, 226, 0.42)";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx, p.rz, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 1G. Access Road from outside (-50, 120) through Labeled Gate (-23.9, 48.07) into courtyard
  // Broad soft sandy road body
  ctx.strokeStyle = "#e5caa0";
  ctx.lineWidth = (9.5 / worldSize) * 2048;
  ctx.lineCap = "round";
  ctx.beginPath();
  const [gGateX, gGateZ] = toCanvas(-23.895, 48.07);
  const [gOutX, gOutZ] = toCanvas(-50.0, 120.0);
  ctx.moveTo(gGateX, gGateZ);
  ctx.lineTo(gOutX, gOutZ);
  ctx.stroke();

  // Worn cart wheel tracks leading through gate into compound
  ctx.strokeStyle = "rgba(128, 84, 42, 0.60)";
  ctx.lineWidth = (1.5 / worldSize) * 2048;
  for (const trackOffset of [-1.8, 1.8]) {
    ctx.beginPath();
    const [tInX, tInZ] = toCanvas(-23.895 + trackOffset * 0.8, 48.07 + trackOffset * 0.6);
    const [tOutX, tOutZ] = toCanvas(-50.0 + trackOffset * 0.8, 120.0 + trackOffset * 0.6);
    ctx.moveTo(tInX, tInZ);
    ctx.lineTo(tOutX, tOutZ);
    ctx.stroke();
  }

  // Raised green weed strip between cart ruts
  ctx.strokeStyle = "rgba(85, 148, 52, 0.45)";
  ctx.lineWidth = (2.2 / worldSize) * 2048;
  ctx.beginPath();
  ctx.moveTo(gGateX, gGateZ);
  ctx.lineTo(gOutX, gOutZ);
  ctx.stroke();

  // 1H. Courtyard Service Pathways connecting Sheds, Kitchen, Network room and Gate
  ctx.strokeStyle = "rgba(240, 222, 188, 0.75)";
  ctx.lineWidth = (6.0 / worldSize) * 2048;
  ctx.beginPath();
  const [pGateX, pGateZ] = toCanvas(-23.895, 48.07);
  const [pShedAFootX, pShedAFootZ] = toCanvas(-17.5, 34.0);
  const [pSouthYardX, pSouthYardZ] = toCanvas(0.0, 44.0);
  const [pKitchX, pKitchZ] = toCanvas(24.0, 42.8);
  ctx.moveTo(pGateX, pGateZ);
  ctx.lineTo(pShedAFootX, pShedAFootZ);
  ctx.lineTo(pSouthYardX, pSouthYardZ);
  ctx.lineTo(pKitchX, pKitchZ);

  const [pNetX, pNetZ] = toCanvas(-18.5, -11.4);
  const [pShedCX, pShedCZ] = toCanvas(-13.0, -38.7);
  ctx.moveTo(pShedAFootX, pShedAFootZ);
  ctx.lineTo(pNetX, pNetZ);
  ctx.lineTo(pShedCX, pShedCZ);
  ctx.stroke();

  // Gentle curved cart wheel depressions through courtyard
  ctx.strokeStyle = "rgba(125, 82, 40, 0.40)";
  ctx.lineWidth = (1.4 / worldSize) * 2048;
  ctx.beginPath();
  ctx.moveTo(pGateX + 4, pGateZ);
  ctx.quadraticCurveTo(pShedAFootX + 8, pShedAFootZ, pSouthYardX + 6, pSouthYardZ);
  ctx.lineTo(pKitchX, pKitchZ + 4);
  ctx.stroke();

  // 1I. Helper: Draw concrete foundation apron precisely rotated to match 3D buildings
  function drawRotatedApron(x, z, w, d, rot = -0.13, options = {}) {
    const [cx, cz] = toCanvas(x, z);
    const wPx = (w / worldSize) * 2048;
    const dPx = (d / worldSize) * 2048;

    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(-rot);

    // 1. Mossy earthen edge border (soft green/brown fringe)
    ctx.fillStyle = options.edgeColor || "#3f6332";
    const border = 5;
    ctx.fillRect(-wPx / 2 - border, -dPx / 2 - border, wPx + border * 2, dPx + border * 2);

    // 2. Concrete slab apron
    ctx.fillStyle = options.slabColor || "#9ba39c";
    ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);

    // 3. Subtle slab edge expansion line
    ctx.strokeStyle = options.jointColor || "#79827a";
    ctx.lineWidth = 2;
    ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx);

    if (wPx > 70) {
      ctx.beginPath();
      ctx.moveTo(0, -dPx / 2);
      ctx.lineTo(0, dPx / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Exact 3D Building Foundations (position, size, and -0.13 rad rotation)
  drawRotatedApron(0.0, 28.935, 34.0, 19.0, -0.13);       // Shed A
  drawRotatedApron(1.213, 4.667, 30.0, 10.0, -0.13);      // Shed B
  drawRotatedApron(5.414, -38.736, 36.0, 13.0, -0.13);    // Shed C
  drawRotatedApron(-1.773, -28.095, 24.0, 7.0, -0.13);    // Shed D (chicken)
  drawRotatedApron(-22.508, -11.388, 8.0, 8.0, -0.13);    // Network / CCTV
  drawRotatedApron(27.909, 42.843, 11.5, 8.5, -0.13);     // Kitchen

  // US A & US B: compacted gravel hardstand foundation pads
  drawRotatedApron(-1.68, -8.307, 26.5, 7.5, -0.13, {
    slabColor: "#a39b8c",
    edgeColor: "#615949",
    jointColor: "#7e7667",
  });
  drawRotatedApron(-1.68, -17.548, 26.5, 7.5, -0.13, {
    slabColor: "#a39b8c",
    edgeColor: "#615949",
    jointColor: "#7e7667",
  });

  // 1J. Inner lawn islands (fresh vibrant grass aligned with -0.13 rad shed angle)
  function drawRotatedLawn(x, z, w, d, rot = -0.13) {
    const [cx, cz] = toCanvas(x, z);
    const wPx = (w / worldSize) * 2048;
    const dPx = (d / worldSize) * 2048;
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(-rot);
    // Deep moss edge
    ctx.fillStyle = "#2d5425";
    ctx.fillRect(-wPx / 2 - 3, -dPx / 2 - 3, wPx + 6, dPx + 6);
    // Vibrant grass body
    ctx.fillStyle = "#468c2d";
    ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);
    // Sunlit center highlight
    ctx.fillStyle = "#6cb73e";
    ctx.fillRect(-wPx / 2 + 4, -dPx / 2 + 4, wPx - 8, dPx - 8);
    ctx.restore();
  }

  // Lawns between buildings
  drawRotatedLawn(0.6, 16.8, 26.0, 6.5, -0.13);     // Between Shed A and Shed B
  drawRotatedLawn(-0.2, -1.8, 24.0, 4.5, -0.13);     // Between Shed B and US A
  drawRotatedLawn(-1.7, -22.8, 22.0, 3.5, -0.13);    // Between US B and Shed D
  drawRotatedLawn(20.0, 10.0, 10.0, 16.0, -0.13);    // East courtyard lawn patch

  // 1K. Scattered Wildflower and Grass Tufts across open canvas
  let wfSeed = 2026;
  const wfRnd = () => {
    wfSeed = (wfSeed * 1664525 + 1013904223) % 4294967296;
    return wfSeed / 4294967296;
  };
  const wfColors = ["#ffe869", "#fffbf0", "#8cbbf5", "#ffd24a"];
  for (let f = 0; f < 420; f++) {
    const [fx, fz] = toCanvas(
      -120 + wfRnd() * 240,
      -120 + wfRnd() * 240,
    );
    const pData = ctx.getImageData(Math.floor(fx), Math.floor(fz), 1, 1).data;
    if (pData[1] > pData[0] * 1.05 && pData[1] > 60) {
      ctx.fillStyle = wfColors[Math.floor(wfRnd() * wfColors.length)];
      ctx.beginPath();
      ctx.arc(fx, fz, 2.2 + wfRnd() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const noise = (rnd() - 0.5) * 6;
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

  // 96x96 subdivided 3D terrain geometry with rolling Ghibli hills
  const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 96, 96);
  groundGeo.rotateX(-Math.PI / 2);
  const gPos = groundGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    const wx = gPos.getX(i);
    const wz = gPos.getZ(i);
    gPos.setY(i, getTerrainElevation(wx, wz));
  }
  gPos.needsUpdate = true;
  groundGeo.computeVertexNormals();

  const groundMat = createGhibliGroundMaterial({
    map: groundTexture,
    sunDirection: new THREE.Vector3(-40, 85, 35).normalize(),
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
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
      const elev = getTerrainElevation(px, pz);
      const post = new THREE.Mesh(postGeo, ghibliFenceMat);
      post.position.set(px, elev, pz);
      post.rotation.y = (s * 0.7) % Math.PI;
      fenceGroup.add(post);
    }
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 6);
    railGeo.rotateZ(Math.PI / 2);
    const angle = Math.atan2(dz, dx);
    const midX = p1[0] + dx * 0.5;
    const midZ = p1[1] + dz * 0.5;
    const midElev = getTerrainElevation(midX, midZ);
    for (const h of [0.45, 0.92, 1.3]) {
      const rail = new THREE.Mesh(railGeo, ghibliFenceMat);
      rail.position.set(midX, midElev + h, midZ);
      rail.rotation.y = -angle;
      fenceGroup.add(rail);
    }
  }

  // Stone Pillars & Rustic Iron Gate at Gate position (-23.895, 48.07)
  const pillarGeo = new THREE.BoxGeometry(0.75, 2.5, 0.75);
  const ghibliPillarMat = createGhibliMaterial({
    colors: ["#c5beb5", "#989086", "#6c655d", "#433e38"],
    thresholds: [0.65, 0.38, 0.0],
  });
  for (const px of [gateX - gateHalfW, gateX + gateHalfW]) {
    const elev = getTerrainElevation(px, gateZ);
    const pillar = new THREE.Mesh(pillarGeo, ghibliPillarMat);
    pillar.position.set(px, elev + 1.25, gateZ);
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
    const elev = getTerrainElevation(px, gateZ);
    const leaf = new THREE.Group();
    leaf.position.set(px, elev, gateZ);
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

  const dummy = new THREE.Object3D();

  // ==========================================================================
  // 2B. 3D Volumetric Grassy Mounds (Totoro-style billowy turf tussocks)
  // ==========================================================================
  const moundPositions = [];
  let mSeed = 3819;
  const mRnd = () => {
    mSeed = (mSeed * 1664525 + 1013904223) % 4294967296;
    return mSeed / 4294967296;
  };

  // South fence line mounds (near foreground camera)
  for (let x = -28; x <= 34; x += 2.2) {
    if (Math.abs(x - (-23.895)) < 3.2) continue; // Keep gate clear
    moundPositions.push({
      x: x + (mRnd() - 0.5) * 1.0,
      z: 48.07 + (mRnd() - 0.5) * 1.4,
      scaleX: 1.1 + mRnd() * 1.2,
      scaleY: 0.35 + mRnd() * 0.40,
      scaleZ: 1.1 + mRnd() * 1.2,
      rot: mRnd() * Math.PI,
    });
  }

  // East & West fence lines
  for (let z = -50; z <= 46; z += 4.5) {
    // West fence (x = -29.5)
    moundPositions.push({
      x: -29.5 + (mRnd() - 0.5) * 1.2,
      z: z + (mRnd() - 0.5) * 1.2,
      scaleX: 1.2 + mRnd() * 1.1,
      scaleY: 0.35 + mRnd() * 0.45,
      scaleZ: 1.2 + mRnd() * 1.1,
      rot: mRnd() * Math.PI,
    });
    // East fence (x = 34.5)
    moundPositions.push({
      x: 34.5 + (mRnd() - 0.5) * 1.2,
      z: z + (mRnd() - 0.5) * 1.2,
      scaleX: 1.2 + mRnd() * 1.1,
      scaleY: 0.35 + mRnd() * 0.45,
      scaleZ: 1.2 + mRnd() * 1.1,
      rot: mRnd() * Math.PI,
    });
  }

  // North fence line (z = -53.0)
  for (let x = -28; x <= 33; x += 4.0) {
    moundPositions.push({
      x: x + (mRnd() - 0.5) * 1.2,
      z: -53.0 + (mRnd() - 0.5) * 1.2,
      scaleX: 1.3 + mRnd() * 1.2,
      scaleY: 0.35 + mRnd() * 0.45,
      scaleZ: 1.3 + mRnd() * 1.2,
      rot: mRnd() * Math.PI,
    });
  }

  // Around building corners & foundations
  const bCorners = [
    [-17, 38], [17, 38], [-17, 19], [17, 19], // Shed A
    [-14, 10], [16, 10], [-14, -1], [16, -1], // Shed B
    [-13, -32], [23, -32], [-13, -45], [23, -45], // Shed C
    [-14, -24], [10, -24], [-14, -31], [10, -31], // Shed D
    [-26, -7], [-18, -7], [-26, -15], [-18, -15], // Network room
    [22, 47], [33, 47], [22, 38], [33, 38], // Kitchen
  ];
  for (const c of bCorners) {
    moundPositions.push({
      x: c[0] + (mRnd() - 0.5) * 0.8,
      z: c[1] + (mRnd() - 0.5) * 0.8,
      scaleX: 0.9 + mRnd() * 0.9,
      scaleY: 0.28 + mRnd() * 0.35,
      scaleZ: 0.9 + mRnd() * 0.9,
      rot: mRnd() * Math.PI,
    });
  }

  // Foreground meadow knolls
  for (let i = 0; i < 22; i++) {
    const mx = -45 + mRnd() * 90;
    const mz = 52 + mRnd() * 38;
    moundPositions.push({
      x: mx,
      z: mz,
      scaleX: 1.8 + mRnd() * 2.2,
      scaleY: 0.5 + mRnd() * 0.6,
      scaleZ: 1.8 + mRnd() * 2.2,
      rot: mRnd() * Math.PI,
    });
  }

  const moundGeo = new THREE.SphereGeometry(1.0, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const moundMat = createGhibliMaterial({
    colors: ["#82cb3e", "#4d962b", "#306c1f", "#194212"],
    thresholds: [0.65, 0.35, -0.05],
  });
  const moundInstMesh = new THREE.InstancedMesh(moundGeo, moundMat, moundPositions.length);
  moundInstMesh.receiveShadow = true;
  for (let i = 0; i < moundPositions.length; i++) {
    const mp = moundPositions[i];
    const elev = getTerrainElevation(mp.x, mp.z);
    dummy.position.set(mp.x, elev - 0.04, mp.z);
    dummy.rotation.set(0, mp.rot, 0);
    dummy.scale.set(mp.scaleX, mp.scaleY, mp.scaleZ);
    dummy.updateMatrix();
    moundInstMesh.setMatrixAt(i, dummy.matrix);
  }
  moundInstMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(moundInstMesh);

  // ==========================================================================
  // 2C. 3D Stepping Stones & River Pebbles in Courtyard (Authentic Farm Path)
  // ==========================================================================
  const stonePositions = [];
  let stSeed = 4492;
  const stRnd = () => {
    stSeed = (stSeed * 1664525 + 1013904223) % 4294967296;
    return stSeed / 4294967296;
  };

  // Route 1: Gate (-23.895, 48.07) to Shed A entrance (-17.5, 34.0)
  for (let s = 0; s <= 24; s++) {
    const t = s / 24;
    const sx = -23.895 + (-17.5 - (-23.895)) * t + (stRnd() - 0.5) * 0.5;
    const sz = 48.07 + (34.0 - 48.07) * t + (stRnd() - 0.5) * 0.4;
    stonePositions.push({
      x: sx,
      z: sz,
      scaleX: 0.45 + stRnd() * 0.35,
      scaleY: 0.08,
      scaleZ: 0.40 + stRnd() * 0.35,
      rot: stRnd() * Math.PI,
    });
  }

  // Route 2: Shed A to South Yard (0, 44) and Kitchen (24, 42.8)
  for (let s = 0; s <= 32; s++) {
    const t = s / 32;
    const sx = -17.5 + (24.0 - (-17.5)) * t + (stRnd() - 0.5) * 0.5;
    const sz = 34.0 + (42.8 - 34.0) * t + Math.sin(t * Math.PI) * 4.0 + (stRnd() - 0.5) * 0.4;
    stonePositions.push({
      x: sx,
      z: sz,
      scaleX: 0.45 + stRnd() * 0.35,
      scaleY: 0.08,
      scaleZ: 0.40 + stRnd() * 0.35,
      rot: stRnd() * Math.PI,
    });
  }

  // Route 3: Shed A to Network Room (-18.5, -11.4)
  for (let s = 0; s <= 36; s++) {
    const t = s / 36;
    const sx = -17.5 + (-18.5 - (-17.5)) * t + (stRnd() - 0.5) * 0.5;
    const sz = 34.0 + (-11.4 - 34.0) * t + (stRnd() - 0.5) * 0.4;
    stonePositions.push({
      x: sx,
      z: sz,
      scaleX: 0.42 + stRnd() * 0.32,
      scaleY: 0.08,
      scaleZ: 0.42 + stRnd() * 0.32,
      rot: stRnd() * Math.PI,
    });
  }

  // Scattered river pebble clusters near entrances and fence posts
  const pebbleSpots = [
    [-23.9, 47.0], [-17.5, 33.0], [24.0, 41.5], [-18.5, -10.0],
    [0.0, 18.0], [-1.0, 3.0], [4.0, -37.0],
  ];
  for (const sp of pebbleSpots) {
    for (let p = 0; p < 8; p++) {
      stonePositions.push({
        x: sp[0] + (stRnd() - 0.5) * 2.2,
        z: sp[1] + (stRnd() - 0.5) * 2.2,
        scaleX: 0.22 + stRnd() * 0.22,
        scaleY: 0.06,
        scaleZ: 0.22 + stRnd() * 0.22,
        rot: stRnd() * Math.PI,
      });
    }
  }

  const stoneGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.08, 7);
  const stoneMat = createGhibliMaterial({
    colors: ["#ddd6cc", "#aba195", "#776c62", "#484139"],
    thresholds: [0.65, 0.35, -0.05],
  });
  const stoneInstMesh = new THREE.InstancedMesh(stoneGeo, stoneMat, stonePositions.length);
  stoneInstMesh.receiveShadow = true;
  for (let i = 0; i < stonePositions.length; i++) {
    const sp = stonePositions[i];
    const elev = getTerrainElevation(sp.x, sp.z);
    dummy.position.set(sp.x, elev + 0.02, sp.z);
    dummy.rotation.set(0, sp.rot, 0);
    dummy.scale.set(sp.scaleX, sp.scaleY, sp.scaleZ);
    dummy.updateMatrix();
    stoneInstMesh.setMatrixAt(i, dummy.matrix);
  }
  stoneInstMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(stoneInstMesh);

  // ==========================================================================
  // 3. 3D Stylized Ghibli Grass Tufts & Wildflowers (James Smyth & Ricardo Oliva Alonso style)
  // Dense physical instanced 3D grass blade clusters with multi-wave wind sway
  // ==========================================================================
  const tuftPositions = [];
  const flowerPositions = [];

  let tSeed = 7331;
  const tRnd = () => {
    tSeed = (tSeed * 1664525 + 1013904223) % 4294967296;
    return tSeed / 4294967296;
  };

  // 3A. Foreground Meadow Belt (CRITICAL: RIGHT IN FRONT OF CAMERA!)
  // Fills the entire expanse from the south fence (z = 48) out to z = 95
  const fgXSteps = 74;
  const fgZSteps = 70;
  for (let ix = 0; ix < fgXSteps; ix++) {
    for (let iz = 0; iz < fgZSteps; iz++) {
      const fracX = (ix + tRnd() * 0.85) / fgXSteps;
      const fracZ = (iz + tRnd() * 0.85) / fgZSteps;
      const x = -58 + fracX * 116;
      const z = 48.5 + fracZ * 46;
      tuftPositions.push({
        x,
        z,
        scale: 0.90 + tRnd() * 0.55,
        rot: tRnd() * Math.PI * 2,
      });

      if (tRnd() < 0.22) {
        flowerPositions.push({
          x: x + (tRnd() - 0.5) * 0.5,
          z: z + (tRnd() - 0.5) * 0.5,
          scale: 0.85 + tRnd() * 0.45,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 3B. Along the entire wooden perimeter fence (both sides of rails)
  for (let seg = 0; seg < fencePerimeter.length - 1; seg++) {
    const p1 = fencePerimeter[seg];
    const p2 = fencePerimeter[seg + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const dist = Math.hypot(dx, dz);
    const count = Math.floor(dist / 0.12);
    const nx = -dz / dist;
    const nz = dx / dist;

    for (let i = 0; i < count; i++) {
      const frac = (i + tRnd() * 0.7) / count;
      const x = p1[0] + dx * frac;
      const z = p1[1] + dz * frac;
      const offset = (tRnd() - 0.5) * 1.5;
      tuftPositions.push({
        x: x + nx * offset,
        z: z + nz * offset,
        scale: 0.85 + tRnd() * 0.55,
        rot: tRnd() * Math.PI * 2,
      });

      if (tRnd() < 0.18) {
        flowerPositions.push({
          x: x + nx * (offset + (tRnd() - 0.5) * 0.4),
          z: z + nz * (offset + (tRnd() - 0.5) * 0.4),
          scale: 0.8 + tRnd() * 0.45,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 3C. Along the compound mud/grass boundary
  for (let i = 0; i < compoundPts.length - 1; i++) {
    const p1 = compoundPts[i];
    const p2 = compoundPts[i + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const dist = Math.hypot(dx, dz);
    const count = Math.floor(dist / 0.18);
    const nx = -dz / dist;
    const nz = dx / dist;

    for (let s = 0; s < count; s++) {
      const frac = (s + tRnd() * 0.7) / count;
      const x = p1[0] + dx * frac;
      const z = p1[1] + dz * frac;
      const offset = (tRnd() - 0.5) * 1.8;
      tuftPositions.push({
        x: x + nx * offset,
        z: z + nz * offset,
        scale: 0.85 + tRnd() * 0.45,
        rot: tRnd() * Math.PI * 2,
      });
      if (tRnd() < 0.15) {
        flowerPositions.push({
          x: x + nx * (offset + (tRnd() - 0.5) * 0.3),
          z: z + nz * (offset + (tRnd() - 0.5) * 0.3),
          scale: 0.8 + tRnd() * 0.4,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 3D. Along building foundation aprons
  const bAprons = [
    { x: 0.0, z: 28.935, w: 34.0, d: 19.0 },
    { x: 1.213, z: 4.667, w: 30.0, d: 10.0 },
    { x: 5.414, z: -38.736, w: 36.0, d: 13.0 },
    { x: -1.773, z: -28.095, w: 24.0, d: 7.0 },
    { x: -22.508, z: -11.388, w: 8.0, d: 8.0 },
    { x: 27.909, z: 42.843, w: 11.5, d: 8.5 },
  ];
  for (const b of bAprons) {
    const rot = -0.13;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const halfW = b.w / 2 + 0.4;
    const halfD = b.d / 2 + 0.4;
    const perimeterSteps = Math.floor((b.w + b.d) * 5.5);
    for (let s = 0; s < perimeterSteps; s++) {
      let lx, lz;
      const side = tRnd();
      if (side < 0.5) {
        lx = (tRnd() - 0.5) * b.w;
        lz = (tRnd() < 0.5 ? -1 : 1) * halfD + (tRnd() - 0.5) * 0.6;
      } else {
        lx = (tRnd() < 0.5 ? -1 : 1) * halfW + (tRnd() - 0.5) * 0.6;
        lz = (tRnd() - 0.5) * b.d;
      }
      const wx = b.x + lx * cosR - lz * sinR;
      const wz = b.z + lx * sinR + lz * cosR;
      tuftPositions.push({
        x: wx,
        z: wz,
        scale: 0.80 + tRnd() * 0.50,
        rot: tRnd() * Math.PI * 2,
      });
      if (tRnd() < 0.14) {
        flowerPositions.push({
          x: wx + (tRnd() - 0.5) * 0.3,
          z: wz + (tRnd() - 0.5) * 0.3,
          scale: 0.75 + tRnd() * 0.4,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 3E. In the inner lawn patches
  const lawnPatches = [
    { x: 0.6, z: 16.8, w: 24.0, d: 5.5 },
    { x: -0.2, z: -1.8, w: 22.0, d: 3.5 },
    { x: -1.7, z: -22.8, w: 20.0, d: 2.8 },
    { x: 20.0, z: 10.0, w: 10.0, d: 16.0 },
  ];
  for (const lp of lawnPatches) {
    const rot = -0.13;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const patchCount = Math.floor(lp.w * lp.d * 4.2);
    for (let i = 0; i < patchCount; i++) {
      const lx = (tRnd() - 0.5) * lp.w;
      const lz = (tRnd() - 0.5) * lp.d;
      const wx = lp.x + lx * cosR - lz * sinR;
      const wz = lp.z + lx * sinR + lz * cosR;
      tuftPositions.push({
        x: wx,
        z: wz,
        scale: 0.85 + tRnd() * 0.50,
        rot: tRnd() * Math.PI * 2,
      });
      if (tRnd() < 0.20) {
        flowerPositions.push({
          x: wx + (tRnd() - 0.5) * 0.4,
          z: wz + (tRnd() - 0.5) * 0.4,
          scale: 0.8 + tRnd() * 0.45,
          rot: tRnd() * Math.PI * 2,
        });
      }
    }
  }

  // 3F. Surrounding outer fields & rolling 3D hills
  for (let i = 0; i < 1600; i++) {
    const ox = -140 + tRnd() * 280;
    const oz = -140 + tRnd() * 280;
    if (ox > -34 && ox < 38 && oz > -56 && oz < 54) continue;
    tuftPositions.push({
      x: ox,
      z: oz,
      scale: 0.90 + tRnd() * 0.65,
      rot: tRnd() * Math.PI * 2,
    });
    if (tRnd() < 0.22) {
      flowerPositions.push({
        x: ox + (tRnd() - 0.5) * 0.5,
        z: oz + (tRnd() - 0.5) * 0.5,
        scale: 0.85 + tRnd() * 0.5,
        rot: tRnd() * Math.PI * 2,
      });
    }
  }

  const grassGeo = createGhibliGrassGeometry();
  const grassTuftMat = createGhibliGrassMaterial();
  const grassInstMesh = new THREE.InstancedMesh(grassGeo, grassTuftMat, tuftPositions.length);
  grassInstMesh.receiveShadow = true;

  for (let i = 0; i < tuftPositions.length; i++) {
    const tp = tuftPositions[i];
    const elev = getTerrainElevation(tp.x, tp.z);
    dummy.position.set(tp.x, elev, tp.z);
    dummy.rotation.set(0, tp.rot, 0);
    dummy.scale.set(tp.scale, tp.scale, tp.scale);
    dummy.updateMatrix();
    grassInstMesh.setMatrixAt(i, dummy.matrix);
  }
  grassInstMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(grassInstMesh);

  // Wildflower InstancedMesh
  const flowerGeo = createGhibliWildflowerGeometry();
  const flowerInstMesh = new THREE.InstancedMesh(flowerGeo, grassTuftMat, flowerPositions.length);
  for (let i = 0; i < flowerPositions.length; i++) {
    const fp = flowerPositions[i];
    const elev = getTerrainElevation(fp.x, fp.z);
    dummy.position.set(fp.x, elev, fp.z);
    dummy.rotation.set(0, fp.rot, 0);
    dummy.scale.set(fp.scale, fp.scale, fp.scale);
    dummy.updateMatrix();
    flowerInstMesh.setMatrixAt(i, dummy.matrix);
  }
  flowerInstMesh.instanceMatrix.needsUpdate = true;
  groundGroup.add(flowerInstMesh);

  // ==========================================================================
  // 4. Ghibli 3D Distant Cumulus Clouds
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
      if (groundMat && groundMat.uniforms && groundMat.uniforms.time) {
        groundMat.uniforms.time.value = time;
      }
      if (grassTuftMat && grassTuftMat.uniforms && grassTuftMat.uniforms.time) {
        grassTuftMat.uniforms.time.value = time;
      }
      if (cloudsGroup) cloudsGroup.rotation.y = time * 0.002;
      if (forest) forest.update(time, camera);
    },
  };
}
