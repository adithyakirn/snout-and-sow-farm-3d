import * as THREE from "three";

/**
 * Creates the Studio Ghibli Styled Network & CCTV Operations Interior
 * Features:
 *  1. Network & Server Bay (19" server cabinet, 4K NVR, PoE core switch, UPS, fibre splice tray, blinking LEDs)
 *  2. CCTV Monitoring Console (Triple surveillance screens with live 4-camera feeds, PC tower, ergonomic chair, desk lamp)
 *  3. Computer & Spares Storage Section (Industrial shelving, WD Purple 2TB HDD boxes, Cat6 cable spools, toolcases)
 *  4. Electrical & Safety Infrastructure (Circuit breaker board, CO2 fire extinguisher, conduit risers)
 *  5. Farm IT Specialist Character (Studio Ghibli style with glasses, work vest, tablet diagnostics)
 */
export function createNetworkInterior(network) {
  const interior = new THREE.Group();
  const peopleRoot = new THREE.Group();
  network.group.add(interior, peopleRoot);

  // Reusable materials
  const mat = (color, roughness = 0.8, metalness = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const steelDark = mat(0x1e2428, 0.5, 0.4);
  const steelMid = mat(0x424c52, 0.6, 0.3);
  const steelLight = mat(0x8a969e, 0.4, 0.6);
  const rackFrame = mat(0x15191c, 0.4, 0.5);
  const woodDesk = mat(0xb89569, 0.75, 0.02);
  const wallPanel = mat(0x3a464c, 0.85);

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

  function block(parent, dimensions, position, surface, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), surface);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ==========================================================================
  // FLOOR: Anti-Static Raised Technical Server Room Flooring
  // ==========================================================================
  const floorW = network.w - 0.5;
  const floorD = network.d - 0.5;
  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(floorW, 0.035, floorD),
    mat(0x333b40, 0.9, 0.05),
  );
  floorMesh.position.set(0, 0.205, 0);
  floorMesh.receiveShadow = true;
  interior.add(floorMesh);

  // Technical floor grid lines (60cm anti-static tile seams)
  const tileLineGeo = new THREE.BufferGeometry();
  const tileVertices = [];
  for (let x = -floorW / 2 + 0.6; x < floorW / 2; x += 0.6) {
    tileVertices.push(x, 0.225, -floorD / 2, x, 0.225, floorD / 2);
  }
  for (let z = -floorD / 2 + 0.6; z < floorD / 2; z += 0.6) {
    tileVertices.push(-floorW / 2, 0.225, z, floorW / 2, 0.225, z);
  }
  tileLineGeo.setAttribute("position", new THREE.Float32BufferAttribute(tileVertices, 3));
  const tileLineMat = new THREE.LineBasicMaterial({ color: 0x22282c, transparent: true, opacity: 0.6 });
  interior.add(new THREE.LineSegments(tileLineGeo, tileLineMat));

  // ==========================================================================
  // SECTION 1: NETWORK & SERVER BAY (North Wall, z = -2.1 to -2.7)
  // ==========================================================================
  const serverBayGroup = new THREE.Group();
  interior.add(serverBayGroup);

  // 1A. Full-Height 19-Inch Server Rack Cabinet
  const rackX = -0.7;
  const rackZ = -2.25;
  const rackW = 0.9;
  const rackD = 0.95;
  const rackH = 2.15;

  // Frame uprights & top/bottom cap
  block(serverBayGroup, [rackW, 0.08, rackD], [rackX, 0.26, rackZ], rackFrame);
  block(serverBayGroup, [rackW, 0.08, rackD], [rackX, 0.26 + rackH, rackZ], rackFrame);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      block(
        serverBayGroup,
        [0.06, rackH, 0.06],
        [rackX + (sx * (rackW - 0.06)) / 2, 0.26 + rackH / 2, rackZ + (sz * (rackD - 0.06)) / 2],
        rackFrame,
      );
    }
  }

  // Tinted perforated glass front door (facing South into room)
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x162c38,
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.62,
  });
  block(serverBayGroup, [rackW - 0.08, rackH - 0.12, 0.02], [rackX, 0.26 + rackH / 2, rackZ + rackD / 2 - 0.02], doorMat);

  // Side panels with ventilation slots
  const sideMat = mat(0x1f262b, 0.6, 0.2);
  for (const sx of [-1, 1]) {
    block(serverBayGroup, [0.02, rackH - 0.12, rackD - 0.1], [rackX + (sx * (rackW - 0.02)) / 2, 0.26 + rackH / 2, rackZ], sideMat);
  }

  // Internal 19" Rack Mounting Rails
  const railMat = steelLight;
  for (const sx of [-1, 1]) {
    block(serverBayGroup, [0.03, rackH - 0.2, 0.03], [rackX + sx * 0.24, 0.26 + rackH / 2, rackZ + 0.35], railMat);
    block(serverBayGroup, [0.03, rackH - 0.2, 0.03], [rackX + sx * 0.24, 0.26 + rackH / 2, rackZ - 0.35], railMat);
  }

  // 1B. 48-Port Cat6 Patch Panel (at y = 1.95)
  block(serverBayGroup, [0.49, 0.06, 0.3], [rackX, 1.95, rackZ + 0.18], steelDark);
  for (let p = 0; p < 24; p++) {
    const px = rackX - 0.2 + (p % 12) * 0.036;
    const py = 1.965 - Math.floor(p / 12) * 0.025;
    block(serverBayGroup, [0.016, 0.016, 0.02], [px, py, rackZ + 0.33], mat(0x0e1418));
  }

  // 1C. PoE Core Switch 1 (Gigabit PoE+ Managed Hub, at y = 1.78)
  block(serverBayGroup, [0.49, 0.065, 0.42], [rackX, 1.78, rackZ + 0.12], mat(0x1a2830));
  // Front faceplate with LED status array
  block(serverBayGroup, [0.48, 0.05, 0.02], [rackX, 1.78, rackZ + 0.335], mat(0x101c22));

  // Dynamic LED lights on switch
  const switchLeds = [];
  const ledActiveMat = new THREE.MeshBasicMaterial({ color: 0x38ef7d });
  const ledAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
  const ledCyanMat = new THREE.MeshBasicMaterial({ color: 0x4ce6f2 });
  for (let i = 0; i < 16; i++) {
    const ledMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      i % 3 === 0 ? ledAmberMat : i % 2 === 0 ? ledCyanMat : ledActiveMat,
    );
    ledMesh.position.set(rackX - 0.19 + i * 0.025, 1.785, rackZ + 0.347);
    serverBayGroup.add(ledMesh);
    switchLeds.push(ledMesh);
  }

  // 1D. 4K Surveillance NVR Unit (Network Video Recorder, at y = 1.55)
  block(serverBayGroup, [0.49, 0.11, 0.48], [rackX, 1.55, rackZ + 0.1], mat(0x222a30));
  // Front NVR bezel with 4 SATA drive bays and status panel
  block(serverBayGroup, [0.48, 0.09, 0.02], [rackX, 1.55, rackZ + 0.342], mat(0x181e22));
  for (let d = 0; d < 4; d++) {
    // 4 hard drive caddies
    block(serverBayGroup, [0.08, 0.07, 0.015], [rackX - 0.16 + d * 0.105, 1.55, rackZ + 0.35], steelDark);
    // Green HDD activity LED
    const hddLed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), ledActiveMat);
    hddLed.position.set(rackX - 0.16 + d * 0.105, 1.58, rackZ + 0.358);
    serverBayGroup.add(hddLed);
    switchLeds.push(hddLed);
  }

  // NVR OLED status display (glowing cyan: "REC · 12 CH")
  const nvrDisplayMat = new THREE.MeshBasicMaterial({ color: 0x5ce1e6 });
  block(serverBayGroup, [0.07, 0.025, 0.01], [rackX + 0.18, 1.56, rackZ + 0.35], nvrDisplayMat);

  // 1E. Heavy 3U UPS Battery Backup (at y = 0.52)
  block(serverBayGroup, [0.49, 0.16, 0.52], [rackX, 0.52, rackZ + 0.08], mat(0x15191c));
  // Front UPS panel with green charge status bar
  block(serverBayGroup, [0.48, 0.14, 0.02], [rackX, 0.52, rackZ + 0.342], mat(0x22262a));
  for (let b = 0; b < 5; b++) {
    const batLed = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.008), ledActiveMat);
    batLed.position.set(rackX - 0.15 + b * 0.025, 0.53, rackZ + 0.354);
    serverBayGroup.add(batLed);
  }

  // 1F. Fibre Optic Splice Tray & Optical Distribution Box (at y = 1.34)
  block(serverBayGroup, [0.49, 0.055, 0.35], [rackX, 1.34, rackZ + 0.12], mat(0x2b3338));
  // Yellow optical patch cord connecting into vertical trunk
  const fibreCordMat = new THREE.MeshBasicMaterial({ color: 0xf6c344 });
  const yellowSplice = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), fibreCordMat);
  yellowSplice.rotation.z = Math.PI / 2;
  yellowSplice.position.set(rackX + 0.14, 1.34, rackZ + 0.32);
  serverBayGroup.add(yellowSplice);

  // 1G. Vertical Cable Ladder & Wall Conduit Riser
  const ladderX = -1.75;
  const ladderZ = -2.7;
  block(serverBayGroup, [0.35, 2.6, 0.08], [ladderX, 1.45, ladderZ], mat(0x4a555c, 0.6, 0.4));
  for (let r = 0; r < 9; r++) {
    block(serverBayGroup, [0.33, 0.025, 0.04], [ladderX, 0.45 + r * 0.28, ladderZ + 0.03], steelMid);
  }
  // Cable bundle in ladder (cyan, dark grey, yellow)
  block(serverBayGroup, [0.08, 2.4, 0.04], [ladderX - 0.08, 1.45, ladderZ + 0.05], mat(0x38b2ac));
  block(serverBayGroup, [0.06, 2.4, 0.04], [ladderX + 0.02, 1.45, ladderZ + 0.05], mat(0x263238));
  block(serverBayGroup, [0.04, 2.4, 0.04], [ladderX + 0.10, 1.45, ladderZ + 0.05], fibreCordMat);

  // Horizontal cable basket from ladder to server rack top
  block(serverBayGroup, [0.85, 0.06, 0.22], [rackX - 0.45, 0.26 + rackH + 0.08, rackZ], mat(0x424e56));

  // ==========================================================================
  // SECTION 2: CCTV MONITORING & COMMAND CONSOLE (East Wall, x = 1.6 to 2.4)
  // ==========================================================================
  const cctvDeskGroup = new THREE.Group();
  interior.add(cctvDeskGroup);

  const deskX = 1.85;
  const deskZ = 0.0;
  const deskW = 1.0;
  const deskL = 2.4;
  const deskH = 0.76;

  // Solid wood console desk surface
  block(cctvDeskGroup, [deskW, 0.055, deskL], [deskX, deskH, deskZ], woodDesk);
  // Steel desk legs and modesty panel
  for (const lz of [-1, 1]) {
    block(cctvDeskGroup, [0.06, deskH - 0.055, 0.85], [deskX, (deskH - 0.055) / 2, deskZ + (lz * (deskL - 0.2)) / 2], steelDark);
  }
  block(cctvDeskGroup, [0.03, 0.42, deskL - 0.25], [deskX + 0.38, deskH - 0.25, deskZ], steelDark);

  // Large stitched desk mat
  block(cctvDeskGroup, [0.65, 0.008, 1.5], [deskX - 0.1, deskH + 0.032, deskZ], mat(0x1a2126, 0.9));

  // Slim mechanical keyboard
  block(cctvDeskGroup, [0.16, 0.016, 0.46], [deskX - 0.16, deskH + 0.045, deskZ - 0.08], mat(0x2e383e, 0.6));
  // Optical mouse
  block(cctvDeskGroup, [0.11, 0.022, 0.065], [deskX - 0.16, deskH + 0.048, deskZ + 0.28], mat(0x181e22, 0.5));

  // High-Performance Workstation Tower PC (under-desk)
  const pcTower = block(cctvDeskGroup, [0.48, 0.44, 0.22], [deskX + 0.15, 0.26 + 0.22, deskZ + 0.85], mat(0x182025, 0.4, 0.5));
  // Glowing blue intake LED fan
  const pcFanMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.01, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  pcFanMesh.rotation.z = Math.PI / 2;
  pcFanMesh.position.set(deskX - 0.095, 0.26 + 0.26, deskZ + 0.85);
  cctvDeskGroup.add(pcFanMesh);

  // 2B. Triple Surveillance Multi-View Monitors
  // Monitor stand and articulated arm
  block(cctvDeskGroup, [0.24, 0.02, 0.38], [deskX + 0.28, deskH + 0.038, deskZ], steelDark);
  block(cctvDeskGroup, [0.06, 0.48, 0.06], [deskX + 0.28, deskH + 0.28, deskZ], steelDark);

  // Procedural Canvas Texture for Center CCTV Monitor (Live 2x2 Grid)
  const cctvCanvas = document.createElement("canvas");
  cctvCanvas.width = 512;
  cctvCanvas.height = 288;
  const cctvCtx = cctvCanvas.getContext("2d");

  function drawCCTVMonitorTexture(time = 0) {
    // 4 CCTV Quadrants
    const w = 512;
    const h = 288;
    cctvCtx.fillStyle = "#0c181e";
    cctvCtx.fillRect(0, 0, w, h);

    // Grid divider lines
    cctvCtx.strokeStyle = "#1b333c";
    cctvCtx.lineWidth = 3;
    cctvCtx.beginPath();
    cctvCtx.moveTo(w / 2, 0); cctvCtx.lineTo(w / 2, h);
    cctvCtx.moveTo(0, h / 2); cctvCtx.lineTo(w, h / 2);
    cctvCtx.stroke();

    // Quad 1 (Top-Left): Shed A South Pens (CAM A2)
    cctvCtx.fillStyle = "#1e342c";
    cctvCtx.fillRect(2, 2, w / 2 - 4, h / 2 - 4);
    cctvCtx.fillStyle = "#ef4444";
    cctvCtx.beginPath(); cctvCtx.arc(16, 16, 4, 0, Math.PI * 2); cctvCtx.fill();
    cctvCtx.fillStyle = "#e2ede8";
    cctvCtx.font = "bold 12px ui-monospace, monospace";
    cctvCtx.fillText("LIVE  CAM A2 · SHED A", 26, 20);

    // Quad 2 (Top-Right): Shed B Pens (CAM B1)
    cctvCtx.fillStyle = "#1c2d38";
    cctvCtx.fillRect(w / 2 + 2, 2, w / 2 - 4, h / 2 - 4);
    cctvCtx.fillStyle = "#ef4444";
    cctvCtx.beginPath(); cctvCtx.arc(w / 2 + 16, 16, 4, 0, Math.PI * 2); cctvCtx.fill();
    cctvCtx.fillStyle = "#e2ede8";
    cctvCtx.fillText("LIVE  CAM B1 · SHED B", w / 2 + 26, 20);

    // Quad 3 (Bottom-Left): Shed C Swine (CAM C1)
    cctvCtx.fillStyle = "#263024";
    cctvCtx.fillRect(2, h / 2 + 2, w / 2 - 4, h / 2 - 4);
    cctvCtx.fillStyle = "#ef4444";
    cctvCtx.beginPath(); cctvCtx.arc(16, h / 2 + 16, 4, 0, Math.PI * 2); cctvCtx.fill();
    cctvCtx.fillStyle = "#e2ede8";
    cctvCtx.fillText("LIVE  CAM C1 · SHED C", 26, h / 2 + 20);

    // Quad 4 (Bottom-Right): Shed D Chickens (CAM D1)
    cctvCtx.fillStyle = "#2b291e";
    cctvCtx.fillRect(w / 2 + 2, h / 2 + 2, w / 2 - 4, h / 2 - 4);
    cctvCtx.fillStyle = "#ef4444";
    cctvCtx.beginPath(); cctvCtx.arc(w / 2 + 16, h / 2 + 16, 4, 0, Math.PI * 2); cctvCtx.fill();
    cctvCtx.fillStyle = "#e2ede8";
    cctvCtx.fillText("LIVE  CAM D1 · CHICKEN", w / 2 + 26, h / 2 + 20);

    // Center timestamp banner
    cctvCtx.fillStyle = "rgba(4, 12, 16, 0.75)";
    cctvCtx.fillRect(w / 2 - 80, h / 2 - 12, 160, 24);
    cctvCtx.fillStyle = "#5ce1e5";
    cctvCtx.font = "bold 11px ui-monospace, monospace";
    cctvCtx.textAlign = "center";
    cctvCtx.fillText("NVR-1  4K UHD  25 FPS", w / 2, h / 2 + 4);
    cctvCtx.textAlign = "left";
  }
  drawCCTVMonitorTexture(0);
  const cctvScreenTex = new THREE.CanvasTexture(cctvCanvas);
  cctvScreenTex.colorSpace = THREE.SRGBColorSpace;

  const centerMonitorMat = new THREE.MeshStandardMaterial({
    map: cctvScreenTex,
    emissive: 0x489aa4,
    emissiveIntensity: 0.38,
    roughness: 0.4,
  });

  // Center Monitor (Screen width 0.95m, height 0.54m)
  const centerMon = block(cctvDeskGroup, [0.035, 0.54, 0.95], [deskX + 0.18, deskH + 0.46, deskZ], centerMonitorMat);
  // Monitor bezel
  block(cctvDeskGroup, [0.04, 0.56, 0.97], [deskX + 0.19, deskH + 0.46, deskZ], mat(0x101518, 0.4, 0.6));

  // Left Monitor (Telemetry & Site Plan) - angled 22 degrees
  const leftMonCanvas = document.createElement("canvas");
  leftMonCanvas.width = 256; leftMonCanvas.height = 256;
  const lmCtx = leftMonCanvas.getContext("2d");
  lmCtx.fillStyle = "#0c1b22"; lmCtx.fillRect(0, 0, 256, 256);
  lmCtx.strokeStyle = "#38bdf8"; lmCtx.lineWidth = 3; lmCtx.strokeRect(8, 8, 240, 240);
  lmCtx.fillStyle = "#38bdf8"; lmCtx.font = "bold 14px ui-monospace, monospace";
  lmCtx.fillText("FARM ATLAS · 3D MAP", 20, 36);
  lmCtx.fillStyle = "#4ade80"; lmCtx.font = "12px ui-monospace, monospace";
  lmCtx.fillText("FIBRE TRUNK: ONLINE", 20, 68);
  lmCtx.fillText("SWITCH 1: ROOF NET", 20, 92);
  lmCtx.fillText("SWITCH 2: SHED A", 20, 116);
  lmCtx.fillText("CAMERAS: 12 CONNECTED", 20, 140);
  lmCtx.fillStyle = "rgba(92, 225, 230, 0.25)";
  lmCtx.fillRect(20, 160, 216, 75);
  lmCtx.strokeStyle = "#5ce1e5"; lmCtx.strokeRect(20, 160, 216, 75);
  lmCtx.fillStyle = "#5ce1e5"; lmCtx.font = "bold 11px ui-monospace, monospace";
  lmCtx.fillText("UNDERGROUND CONDUIT: ACTIVE", 28, 185);
  lmCtx.fillText("HUB DP-1: JUNCTION NORMAL", 28, 205);

  const leftMonTex = new THREE.CanvasTexture(leftMonCanvas);
  leftMonTex.colorSpace = THREE.SRGBColorSpace;
  const leftMonitorMat = new THREE.MeshStandardMaterial({
    map: leftMonTex,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.32,
    roughness: 0.4,
  });

  const leftMonZ = deskZ - 0.72;
  const leftMonAngle = 0.38;
  const leftMon = block(cctvDeskGroup, [0.03, 0.44, 0.58], [deskX + 0.22, deskH + 0.44, leftMonZ], leftMonitorMat, [0, -leftMonAngle, 0]);
  block(cctvDeskGroup, [0.035, 0.46, 0.60], [deskX + 0.23, deskH + 0.44, leftMonZ], mat(0x101518), [0, -leftMonAngle, 0]);

  // Right Monitor (NVR Storage Health & Bandwidth) - angled -22 degrees
  const rightMonCanvas = document.createElement("canvas");
  rightMonCanvas.width = 256; rightMonCanvas.height = 256;
  const rmCtx = rightMonCanvas.getContext("2d");
  rmCtx.fillStyle = "#0c1b20"; rmCtx.fillRect(0, 0, 256, 256);
  rmCtx.strokeStyle = "#5ce1e5"; rmCtx.lineWidth = 3; rmCtx.strokeRect(8, 8, 240, 240);
  rmCtx.fillStyle = "#5ce1e5"; rmCtx.font = "bold 14px ui-monospace, monospace";
  rmCtx.fillText("NVR STORAGE HEALTH", 20, 36);

  // Storage bar
  rmCtx.fillStyle = "#22353e"; rmCtx.fillRect(20, 55, 216, 28);
  rmCtx.fillStyle = "#eab308"; rmCtx.fillRect(20, 55, 198, 28); // 92% full
  rmCtx.fillStyle = "#081418"; rmCtx.font = "bold 12px ui-monospace, monospace";
  rmCtx.fillText("1.84 TB / 2.0 TB (92%)", 30, 74);

  rmCtx.fillStyle = "#94a3b8"; rmCtx.font = "12px ui-monospace, monospace";
  rmCtx.fillText("RETENTION: 30 DAYS 4K", 20, 115);
  rmCtx.fillText("BITRATE: 48.5 Mbps", 20, 138);
  rmCtx.fillText("CORE TEMP: 38 C", 20, 161);
  rmCtx.fillStyle = "#22c55e";
  rmCtx.fillText("HDD SMART: HEALTHY", 20, 184);
  rmCtx.fillText("FAN SPEED: 2400 RPM", 20, 207);

  const rightMonTex = new THREE.CanvasTexture(rightMonCanvas);
  rightMonTex.colorSpace = THREE.SRGBColorSpace;
  const rightMonitorMat = new THREE.MeshStandardMaterial({
    map: rightMonTex,
    emissive: 0x34d399,
    emissiveIntensity: 0.32,
    roughness: 0.4,
  });

  const rightMonZ = deskZ + 0.72;
  const rightMonAngle = -0.38;
  const rightMon = block(cctvDeskGroup, [0.03, 0.44, 0.58], [deskX + 0.22, deskH + 0.44, rightMonZ], rightMonitorMat, [0, -rightMonAngle, 0]);
  block(cctvDeskGroup, [0.035, 0.46, 0.60], [deskX + 0.23, deskH + 0.44, rightMonZ], mat(0x101518), [0, -rightMonAngle, 0]);

  // Ergonomic Swivel Mesh Office Chair (facing East towards desk)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(deskX - 0.7, 0.22, deskZ);
  chairGroup.rotation.y = Math.PI / 2;
  cctvDeskGroup.add(chairGroup);

  // 5-point star caster base
  block(chairGroup, [0.55, 0.04, 0.08], [0, 0.06, 0], steelDark, [0, 0, 0]);
  block(chairGroup, [0.55, 0.04, 0.08], [0, 0.06, 0], steelDark, [0, Math.PI / 3, 0]);
  block(chairGroup, [0.55, 0.04, 0.08], [0, 0.06, 0], steelDark, [0, -Math.PI / 3, 0]);
  // Chrome piston
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10), steelLight);
  piston.position.set(0, 0.24, 0);
  chairGroup.add(piston);
  // Cushioned seat
  block(chairGroup, [0.48, 0.08, 0.48], [0, 0.44, 0], mat(0x222a30, 0.85));
  // Mesh backrest
  block(chairGroup, [0.46, 0.52, 0.05], [0, 0.74, -0.22], mat(0x1a2126, 0.9));
  // Armrests
  for (const ax of [-1, 1]) {
    block(chairGroup, [0.06, 0.03, 0.32], [ax * 0.26, 0.64, 0.02], mat(0x15191c));
    block(chairGroup, [0.03, 0.18, 0.04], [ax * 0.26, 0.54, 0.08], steelDark);
  }

  // Modern Architect Task Lamp on desk
  const lampMat = mat(0xe2a83b, 0.4);
  block(cctvDeskGroup, [0.14, 0.02, 0.14], [deskX - 0.25, deskH + 0.04, deskZ - 0.95], steelDark);
  block(cctvDeskGroup, [0.02, 0.35, 0.02], [deskX - 0.22, deskH + 0.20, deskZ - 0.95], lampMat, [0.2, 0, -0.25]);
  block(cctvDeskGroup, [0.02, 0.28, 0.02], [deskX - 0.12, deskH + 0.44, deskZ - 0.95], lampMat, [-0.2, 0, 0.35]);
  // Conical lamp shade casting warm glow
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 12, 1, true), lampMat);
  shade.rotation.z = -Math.PI * 0.65;
  shade.position.set(deskX - 0.05, deskH + 0.48, deskZ - 0.95);
  cctvDeskGroup.add(shade);

  // Warm task lamp light
  const taskLight = new THREE.PointLight(0xffecd2, 1.2, 3.5);
  taskLight.position.set(deskX - 0.05, deskH + 0.45, deskZ - 0.95);
  cctvDeskGroup.add(taskLight);

  // Coffee mug on desk
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), mat(0xf5eedb));
  mug.position.set(deskX - 0.15, deskH + 0.075, deskZ + 0.48);
  cctvDeskGroup.add(mug);

  // ==========================================================================
  // SECTION 3: COMPUTER STORAGE & SPARES VAULT (South Wall, z = +2.0 to +2.7)
  // ==========================================================================
  const storageGroup = new THREE.Group();
  interior.add(storageGroup);

  const rackSZ = 2.35;
  const rackSW = 2.6;
  const rackSH = 2.15;
  const rackSX = 0.0;

  // 3A. Heavy-Duty 4-Tier Industrial Steel Shelving Unit
  // Upright steel corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      block(
        storageGroup,
        [0.05, rackSH, 0.05],
        [rackSX + (sx * (rackSW - 0.05)) / 2, 0.26 + rackSH / 2, rackSZ + (sz * 0.6) / 2],
        mat(0x384a56, 0.5, 0.3),
      );
    }
  }

  // 4 Wire grid shelf decks
  const shelfYPositions = [0.38, 0.88, 1.38, 1.88];
  for (const sy of shelfYPositions) {
    block(storageGroup, [rackSW - 0.02, 0.035, 0.62], [rackSX, sy, rackSZ], steelMid);
  }

  // 3B. Shelf Tier 1 (Lowest Heavy Items): Heavy Storage Crates & Battery Blocks
  block(storageGroup, [0.55, 0.32, 0.45], [rackSX - 0.85, 0.56, rackSZ], mat(0x786045, 0.85)); // Wood crate
  block(storageGroup, [0.48, 0.28, 0.42], [rackSX - 0.25, 0.54, rackSZ], mat(0x5a4836, 0.85)); // Dark wood crate
  block(storageGroup, [0.52, 0.25, 0.38], [rackSX + 0.45, 0.52, rackSZ], mat(0x283238, 0.6));  // Spare UPS cell pack

  // 3C. Shelf Tier 2 (Eye-Level): Stacked Component Boxes (WD Purple 2TB HDD, Cat6, PoE)
  // 3x WD Purple 2TB Surveillance Hard Drive boxes (signature purple & white packaging)
  const purpleBoxMat = mat(0x7e22ce, 0.7);
  block(storageGroup, [0.18, 0.14, 0.24], [rackSX - 0.95, 1.02, rackSZ - 0.05], purpleBoxMat);
  block(storageGroup, [0.18, 0.14, 0.24], [rackSX - 0.95, 1.16, rackSZ - 0.05], purpleBoxMat);
  block(storageGroup, [0.18, 0.14, 0.24], [rackSX - 0.75, 1.02, rackSZ - 0.05], purpleBoxMat);
  // White HDD label strip
  block(storageGroup, [0.182, 0.04, 0.16], [rackSX - 0.95, 1.02, rackSZ - 0.05], mat(0xffffff));

  // Cat 6 UTP Pull Boxes (Large blue and white cardboard spool dispenser boxes)
  const cat6BoxMat = mat(0x0284c7, 0.75);
  block(storageGroup, [0.38, 0.36, 0.36], [rackSX - 0.25, 1.10, rackSZ], cat6BoxMat);
  block(storageGroup, [0.38, 0.36, 0.36], [rackSX + 0.22, 1.10, rackSZ], mat(0xe2e8f0, 0.8));

  // Translucent Component Organizer Bins (with colorful RJ45 plugs & boots)
  const binMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.75,
    roughness: 0.3,
  });
  for (let b = 0; b < 3; b++) {
    block(storageGroup, [0.22, 0.15, 0.32], [rackSX + 0.65 + b * 0.25, 1.00, rackSZ], binMat);
  }

  // 3D. Shelf Tier 3 (Spare Cameras & Transceivers)
  // Boxed replacement CCTV Cameras
  block(storageGroup, [0.22, 0.16, 0.22], [rackSX - 0.8, 1.50, rackSZ], mat(0x3b82f6)); // Dome box
  block(storageGroup, [0.28, 0.14, 0.18], [rackSX - 0.45, 1.49, rackSZ], mat(0xf97316)); // Bullet box
  // Unboxed spare 2.8mm Dome Camera sitting on display
  const spareDomeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 14), mat(0x222a30));
  spareDomeBase.position.set(rackSX - 0.08, 1.42, rackSZ);
  storageGroup.add(spareDomeBase);
  const spareDomeGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 }),
  );
  spareDomeGlass.position.set(rackSX - 0.08, 1.44, rackSZ);
  storageGroup.add(spareDomeGlass);

  // SFP Optical Transceiver boxes (small orange boxes)
  for (let s = 0; s < 4; s++) {
    block(storageGroup, [0.08, 0.04, 0.12], [rackSX + 0.25 + s * 0.10, 1.42, rackSZ], mat(0xf59e0b));
  }

  // 3E. Shelf Tier 4 (Top Archival Binders & Schematics)
  const binderColors = [0x2563eb, 0xdc2626, 0x16a34a, 0x9333ea, 0x475569];
  for (let i = 0; i < 9; i++) {
    block(
      storageGroup,
      [0.065, 0.28, 0.24],
      [rackSX - 1.0 + i * 0.08, 2.04, rackSZ],
      mat(binderColors[i % binderColors.length], 0.75),
    );
  }

  // 3F. Floor-Standing Cable Reel Dispenser Stand (beside shelves at x = -1.9, z = 2.2)
  const spoolStand = new THREE.Group();
  spoolStand.position.set(-1.85, 0.22, 1.85);
  storageGroup.add(spoolStand);

  // Metal A-frame
  block(spoolStand, [0.04, 0.65, 0.55], [0, 0.32, 0], steelDark);
  // Spool 1: Blue Cat6 Outdoor cable
  const spool1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 14), mat(0x0284c7));
  spool1.rotation.x = Math.PI / 2;
  spool1.position.set(0, 0.42, 0);
  spoolStand.add(spool1);
  // Flanges
  for (const fz of [-0.14, 0.14]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 14), mat(0x713f12));
    flange.rotation.x = Math.PI / 2;
    flange.position.set(0, 0.42, fz);
    spoolStand.add(flange);
  }

  // 3G. Mobile Network Technician Toolcase (Rugged Field Pelican Case)
  const toolcase = new THREE.Group();
  toolcase.position.set(-1.85, 0.22, 0.85);
  storageGroup.add(toolcase);

  // Open yellow/black hard case
  block(toolcase, [0.44, 0.12, 0.34], [0, 0.06, 0], mat(0xeab308, 0.6));
  // Foam cutout interior
  block(toolcase, [0.41, 0.03, 0.31], [0, 0.11, 0], mat(0x18181b));
  // Network cable tester with blinking LED sequence (pins 1..8)
  const tester = block(toolcase, [0.14, 0.04, 0.08], [-0.08, 0.13, -0.05], mat(0x10b981));
  const testerLeds = [];
  for (let pin = 0; pin < 8; pin++) {
    const tLed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), ledActiveMat);
    tLed.position.set(-0.12 + pin * 0.012, 0.155, -0.05);
    toolcase.add(tLed);
    testerLeds.push(tLed);
  }
  // Ratchet crimper tool with rubber handles
  block(toolcase, [0.04, 0.03, 0.18], [0.10, 0.13, 0.02], mat(0xef4444));

  // ==========================================================================
  // SECTION 4: ELECTRICAL & ENVIRONMENTAL SAFETY (West Wall, x = -2.8)
  // ==========================================================================
  const safetyGroup = new THREE.Group();
  interior.add(safetyGroup);

  const panelX = -2.85;
  const panelZ = 1.35;

  // 4A. Wall-Mounted Main Electrical Breaker Board
  block(safetyGroup, [0.08, 0.75, 0.55], [panelX, 1.55, panelZ], mat(0xd1d5db, 0.5, 0.3));
  // Beveled door with hazard triangle
  block(safetyGroup, [0.02, 0.71, 0.51], [panelX + 0.05, 1.55, panelZ], mat(0x9ca3af, 0.4, 0.4));
  block(safetyGroup, [0.025, 0.08, 0.08], [panelX + 0.06, 1.72, panelZ], mat(0xfacc15)); // Warning yellow

  // Rows of miniature circuit breakers
  for (let r = 0; r < 2; r++) {
    for (let b = 0; b < 6; b++) {
      block(
        safetyGroup,
        [0.025, 0.055, 0.022],
        [panelX + 0.055, 1.58 - r * 0.12, panelZ - 0.14 + b * 0.055],
        mat(0x111827),
      );
    }
  }

  // 4B. Wall-Mounted CO2 Fire Extinguisher (Essential for IT / Electrical Rooms)
  const extX = -2.82;
  const extZ = 0.75;
  const cylinderMat = mat(0xdc2626, 0.4); // Fire red
  const extBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.46, 12), cylinderMat);
  extBody.position.set(extX, 1.25, extZ);
  safetyGroup.add(extBody);
  const extDome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cylinderMat);
  extDome.position.set(extX, 1.48, extZ);
  safetyGroup.add(extDome);
  // Black horn nozzle and discharge lever
  block(safetyGroup, [0.04, 0.08, 0.04], [extX, 1.55, extZ], steelLight);
  const extHorn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 10), mat(0x111827));
  extHorn.rotation.z = Math.PI * 0.65;
  extHorn.position.set(extX + 0.06, 1.38, extZ);
  safetyGroup.add(extHorn);

  // 4C. Wall Conduit Duct Penetration (Connecting to exterior underground trunk)
  block(safetyGroup, [0.12, 2.2, 0.12], [-2.85, 1.15, -1.8], mat(0x2c353b));

  // ==========================================================================
  // SECTION 5: STUDIO GHIBLI FARM IT SPECIALIST CHARACTER
  // ==========================================================================
  const techGroup = new THREE.Group();
  techGroup.position.set(deskX - 0.48, 0.22, deskZ + 0.42);
  techGroup.rotation.y = -Math.PI * 0.35;
  peopleRoot.add(techGroup);

  const animeSkin = ghibliMat(0xfae2cf, 0x3d2015, 0.12);
  const animeBlush = ghibliMat(0xf28e80, 0x48100e, 0.22);
  const animeEye = ghibliMat(0x1a1210);
  const hairDark = ghibliMat(0x241a16);
  const techShirt = ghibliMat(0x38bdf8);    // Cyan work shirt
  const techVest = ghibliMat(0x1e293b);     // Dark IT vest
  const techPants = ghibliMat(0x334155);    // Slate work trousers
  const techShoes = ghibliMat(0x451a03);    // Brown leather shoes

  // Legs
  block(techGroup, [0.12, 0.58, 0.14], [-0.08, 0.29, 0], techPants);
  block(techGroup, [0.12, 0.58, 0.14], [0.08, 0.29, 0], techPants);
  // Shoes
  block(techGroup, [0.13, 0.09, 0.22], [-0.08, 0.045, 0.04], techShoes);
  block(techGroup, [0.13, 0.09, 0.22], [0.08, 0.045, 0.04], techShoes);

  // Torso & Work Vest
  const torso = block(techGroup, [0.36, 0.54, 0.22], [0, 0.82, 0], techVest);
  // Collared shirt under vest
  block(techGroup, [0.18, 0.12, 0.225], [0, 1.02, 0], techShirt);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0);
  techGroup.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), animeSkin);
  headGroup.add(headMesh);

  // Rosy anime cheeks
  for (const sx of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), animeBlush);
    blush.position.set(sx * 0.11, -0.02, 0.12);
    blush.scale.set(1, 0.7, 0.5);
    headGroup.add(blush);
  }

  // Anime eyes with catchlight
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), animeEye);
    eye.position.set(sx * 0.07, 0.03, 0.145);
    headGroup.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(sx * 0.07 + 0.005, 0.04, 0.158);
    headGroup.add(glint);
  }

  // Stylish wire-frame glasses
  const frameMat = mat(0xd4af37, 0.3, 0.8);
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.006, 6, 14), frameMat);
    rim.position.set(sx * 0.07, 0.03, 0.155);
    headGroup.add(rim);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.006), frameMat);
  bridge.position.set(0, 0.035, 0.16);
  headGroup.add(bridge);

  // Hair
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), hairDark);
  hairMesh.position.set(0, 0.04, -0.02);
  headGroup.add(hairMesh);

  // Arms holding digital tablet
  const leftArm = block(techGroup, [0.09, 0.42, 0.09], [-0.22, 0.85, 0.12], techShirt, [0.7, 0.25, -0.2]);
  const rightArm = block(techGroup, [0.09, 0.42, 0.09], [0.22, 0.85, 0.12], techShirt, [0.7, -0.25, 0.2]);

  // Digital tablet with glowing diagnostic screen
  const tabletMesh = block(techGroup, [0.26, 0.18, 0.015], [0, 0.88, 0.28], mat(0x18181b), [-0.55, 0, 0]);
  const tabletScreen = block(
    techGroup,
    [0.23, 0.15, 0.008],
    [0, 0.88, 0.29],
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    [-0.55, 0, 0],
  );

  // Ambient overhead lighting in network room
  const ceilingLight1 = new THREE.PointLight(0xdcf8ff, 1.4, 6.0);
  ceilingLight1.position.set(0, 2.75, 0);
  interior.add(ceilingLight1);

  // Soft cyan rack glow
  const rackGlow = new THREE.PointLight(0x38bdf8, 0.8, 3.2);
  rackGlow.position.set(rackX, 1.65, rackZ + 0.6);
  interior.add(rackGlow);

  // Animation update loop
  let lastBlink = 0;
  function update(time) {
    // Ticking LEDs on switch and NVR
    if (Math.floor(time * 3) !== lastBlink) {
      lastBlink = Math.floor(time * 3);
      for (let i = 0; i < switchLeds.length; i++) {
        switchLeds[i].visible = (Math.sin(time * 8 + i * 1.7) > -0.2);
      }
      // Running pin test LEDs on cable tester (sequential sweep)
      const activePin = Math.floor(time * 4) % 8;
      for (let p = 0; p < testerLeds.length; p++) {
        testerLeds[p].visible = (p === activePin);
      }
    }

    // Technician breathing and subtle tablet check animation
    const breath = Math.sin(time * 2.2) * 0.012;
    torso.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
    headGroup.position.y = 1.25 + breath * 0.5;
    headGroup.rotation.y = Math.sin(time * 0.8) * 0.12;
    headGroup.rotation.x = 0.15 + Math.sin(time * 1.5) * 0.05;
  }

  return {
    interior,
    peopleRoot,
    update,
    serverBayCentre: network.point(-0.7, 0, -2.1),
    cctvDeskCentre: network.point(1.7, 0, 0.1),
    storageBayCentre: network.point(0.0, 0, 2.1),
  };
}
