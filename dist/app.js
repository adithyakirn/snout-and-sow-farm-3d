import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "./vendor/lines/Line2.js";
import { LineGeometry } from "./vendor/lines/LineGeometry.js";
import { LineMaterial } from "./vendor/lines/LineMaterial.js";
import { createInteriors } from "./interiors.js";
import { createKitchenInterior } from "./kitchen.js";
import { createEnvironment, createGhibliSky } from "./environment.js";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = createGhibliSky();
scene.fog = new THREE.Fog("#cce6f8", 220, 950);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(pointer: coarse)").matches ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("viewport").append(renderer.domElement);
const view = new THREE.PerspectiveCamera(
  42,
  innerWidth / innerHeight,
  0.1,
  3000,
);
const controls = new OrbitControls(view, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 12;
controls.maxDistance = 450;
controls.maxPolarAngle = Math.PI * 0.47;
controls.autoRotateSpeed = 0.5;
const baseTarget = new THREE.Vector3(0, 0, 0);
function reset(top = false) {
  controls.target.copy(baseTarget);
  view.position
    .copy(baseTarget)
    .add(
      top
        ? new THREE.Vector3(0.03, 155, -0.095)
        : new THREE.Vector3(20, 110, 110),
    );
  controls.update();
  if (innerWidth <= 700) {
    view.updateMatrixWorld();
    let fit = 1;
    for (const x of [-33, 35])
      for (const z of [-52, 53]) {
        const projected = new THREE.Vector3(x, 0, z).project(view);
        fit = Math.max(
          fit,
          Math.abs(projected.x) / 0.83,
          Math.abs(projected.y) / 0.62,
        );
      }
    view.position.sub(controls.target).multiplyScalar(fit).add(controls.target);
    controls.update();
  }
}
reset();
scene.add(new THREE.HemisphereLight(0xd4e5ed, 0x4a513c, 1.65));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.5);
sun.position.set(-40, 85, 35);
sun.castShadow = true;
const shadowSize = innerWidth < 800 ? 1024 : 2048;
sun.shadow.mapSize.set(shadowSize, shadowSize);
Object.assign(sun.shadow.camera, {
  left: -80,
  right: 80,
  top: 90,
  bottom: -90,
  near: 1,
  far: 220,
});
sun.shadow.bias = -0.0005;
scene.add(sun);
const roofs = [],
  labels = [],
  routes = [],
  pickables = [],
  cameras = [],
  cameraObjects = [],
  directionObjects = [],
  futureObjects = [],
  lineMaterials = [];
const mapScale = 0.159940235270572 * 0.5835943116518173;
const environment = createEnvironment(scene);
const entries = new Map();
const mats = {
  wall: new THREE.MeshStandardMaterial({ color: 0x819a9d, roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({
    color: 0xb9cdd2,
    metalness: 0.25,
    roughness: 0.65,
  }),
  trim: new THREE.MeshStandardMaterial({ color: 0x425966 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x4e8d32, roughness: 1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x172c37 }),
  camera: new THREE.MeshStandardMaterial({ color: 0xf2f2e8 }),
  lens: new THREE.MeshStandardMaterial({
    color: 0x061921,
    metalness: 0.6,
    roughness: 0.2,
  }),
};
function box(w, h, d, x, y, z, mat, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
box(4000, 0.35, 4000, 0, -0.3, 0, mats.ground);
const grid = new THREE.GridHelper(400, 80, 0x3e5963, 0x253e48);
grid.position.y = 0.01;
grid.visible = false;
scene.add(grid);
function pos(x, y) {
  return new THREE.Vector3((x - 550) * mapScale, 0, (y - 1050) * mapScale);
}
function label(text, position, id, kind = "") {
  const el = document.createElement("button");
  el.className = "map-label " + kind;
  el.textContent = text;
  el.setAttribute("aria-label", "Inspect " + text);
  el.onclick = () => {
    select(id);
    if (cameras.some((c) => c.id === id)) {
      enterCameraView(id);
    }
  };
  $("labels").append(el);
  const leader = document.createElementNS("http://www.w3.org/2000/svg", "line");
  $("label-leaders").append(leader);
  labels.push({ el, position, id, kind, leader });
}
function addEntry(id, name, description, position) {
  entries.set(id, { name, description, position });
  const option = document.createElement("option");
  option.value = id;
  option.textContent = name;
  $("selection").append(option);
}
function line(points, color, width = 0.07, parent = scene, dashed = false) {
  if (dashed) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const l = new THREE.Line(
      geo,
      new THREE.LineDashedMaterial({ color, dashSize: 0.8, gapSize: 0.5 }),
    );
    l.computeLineDistances();
    parent.add(l);
    return l;
  }
  const group = new THREE.Group();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      delta = b.clone().sub(a);
    if (delta.length() < 0.001) continue;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(width, width, delta.length(), 6),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
      }),
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    group.add(mesh);
  }
  parent.add(group);
  return group;
}
const buildings = {};
function building(id, name, p, w, d, description, indicative = false) {
  const group = new THREE.Group();
  group.position.copy(pos(...p));
  group.rotation.y = -0.13;
  scene.add(group);
  const h = 3;
  // The building shell is illustrative and preserves the mapped footprint.
  const isShed = id.startsWith("shed-");
  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b8980,
    roughness: 1,
  });
  const slab = box(w, 0.18, d, 0, 0.09, 0, slabMaterial, group);
  slab.userData.id = id;
  pickables.push(slab);
  const wallHeight = id === "shed-d" ? 0.2 : isShed ? 1.15 : h;
  for (const side of [-1, 1]) {
    box(
      w,
      wallHeight,
      0.18,
      0,
      wallHeight / 2,
      side * (d / 2 - 0.09),
      mats.wall,
      group,
    );
    for (let x = -w / 2 + 0.15; x <= w / 2 - 0.15; x += 3.8) {
      box(0.19, h, 0.19, x, h / 2, side * (d / 2 - 0.12), mats.trim, group);
    }
  }
  box(0.18, wallHeight, d, w / 2 - 0.09, wallHeight / 2, 0, mats.wall, group);
  // Leave openings at the left end for entrance footpaths.
  if (id === "shed-a") {
    // Shed A has two footpaths at z = -4.25 and z = +4.25
    const pathDoor = 1.8;
    const z1 = -4.25, z2 = 4.25;
    const nW = Math.abs((z1 - pathDoor / 2) - (-d / 2));
    const nZ = -d / 2 + nW / 2;
    box(0.18, h, nW, -w / 2 + 0.09, h / 2, nZ, mats.wall, group);
    const cW = Math.abs((z2 - pathDoor / 2) - (z1 + pathDoor / 2));
    box(0.18, h, cW, -w / 2 + 0.09, h / 2, 0, mats.wall, group);
    const sW = Math.abs(d / 2 - (z2 + pathDoor / 2));
    const sZ = d / 2 - sW / 2;
    box(0.18, h, sW, -w / 2 + 0.09, h / 2, sZ, mats.wall, group);
  } else {
    const opening = Math.min(2.3, d * 0.4),
      sideWidth = (d - opening) / 2;
    for (const side of [-1, 1])
      box(
        0.18,
        h,
        sideWidth,
        -w / 2 + 0.09,
        h / 2,
        side * (opening / 2 + sideWidth / 2),
        mats.wall,
        group,
      );
  }
  box(0.2, 0.3, d, -w / 2 + 0.09, h - 0.15, 0, mats.trim, group);
  if (isShed) {
    for (let x = -w / 2 + 2; x < w / 2; x += 4)
      box(0.12, 0.14, d, x, h - 0.06, 0, mats.trim, group);
  }

  const roofGroup = new THREE.Group();
  group.add(roofGroup);
  roofs.push(roofGroup);
  const rw = w / 2 + 0.4,
    rd = d / 2 + 0.4,
    eave = h + 0.1,
    ridge = h + 1.3;
  const roofGeometry = new THREE.BufferGeometry();
  roofGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -rw,
        eave,
        -rd,
        rw,
        eave,
        -rd,
        rw,
        ridge,
        0,
        -rw,
        eave,
        -rd,
        rw,
        ridge,
        0,
        -rw,
        ridge,
        0,
        -rw,
        ridge,
        0,
        rw,
        ridge,
        0,
        rw,
        eave,
        rd,
        -rw,
        ridge,
        0,
        rw,
        eave,
        rd,
        -rw,
        eave,
        rd,
      ],
      3,
    ),
  );
  roofGeometry.computeVertexNormals();
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a9391,
    roughness: 0.8,
    metalness: 0.18,
    side: THREE.DoubleSide,
  });
  const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  roofMesh.userData.id = id;
  pickables.push(roofMesh);
  roofGroup.add(roofMesh);
  for (let x = -rw; x < rw; x += 0.8)
    line(
      [
        new THREE.Vector3(x, eave + 0.03, -rd),
        new THREE.Vector3(x, ridge + 0.03, 0),
        new THREE.Vector3(x, eave + 0.03, rd),
      ],
      0x596563,
      0.023,
      roofGroup,
    );
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    new THREE.LineBasicMaterial({
      color: 0xc8e3e7,
      transparent: true,
      opacity: 0.35,
    }),
  );
  edge.position.y = h / 2;
  group.add(edge);
  group.updateMatrixWorld(true);
  const point = (x, z, y = 2.9) =>
    group.localToWorld(new THREE.Vector3(x, y, z));
  const b = { group, w, d, point };
  buildings[id] = b;
  const anchor = point(0, 0, 5);
  label(name, anchor, id);
  addEntry(
    id,
    name,
    description +
      (indicative
        ? " Footprint and height are illustrative."
        : " Roof dimensions are approximate and height is illustrative."),
    anchor,
  );
  return b;
}
const a = building(
  "shed-a",
  "Shed A",
  [550, 1360],
  32,
  17,
  "4 cameras, two at each end in the two footpaths. Proposed PoE switch 2 serves this shed, the gate and kitchen.",
);
const b = building(
  "shed-b",
  "Shed B",
  [563, 1100],
  28,
  8,
  "2 cameras, one at each end, connected to switch 1.",
);
const c = building(
  "shed-c",
  "Shed C",
  [608, 635],
  34,
  11,
  "Both cameras at the assumed left-end entrance. C1 looks inside. C2 points toward the network room and gate.",
);
const d = building(
  "shed-d",
  "Shed D · chicken",
  [531, 749],
  22,
  5,
  "1 camera at the assumed left end, connected to switch 1.",
  true,
);
const kitchen = building(
  "kitchen",
  "Kitchen",
  [849, 1509],
  9,
  6,
  "Two rooms, medicine on the left and kitchen on the right. K1 is inside the kitchen. K2 faces the gate. Both connect to roof switch 2 at Shed A.",
  true,
);
const network = building(
  "network",
  "Network / CCTV",
  [341 - 3 / mapScale, 928],
  6,
  6,
  "NVR and 2 TB hard drive in the room, with PoE switch 1 shown on its roof. Kept at its original left-side location and moved only 3 m farther from the cage area. Five current cameras connect here. A fibre link connects switch 2 on Shed A’s roof.",
  true,
);
// Door is drawn on the short entrance face of Shed C.
box(0.12, 2.3, 2.2, -17.07, 1.15, 0, mats.dark, c.group);
const gate = pos(294, 1565);
label("Gate", gate.clone().add(new THREE.Vector3(0, 3.8, 0)), "gate");
addEntry(
  "gate",
  "Gate",
  "Main entrance gate to the farm compound. Monitored by both G1 (Shed A bullet camera) and K2 (Kitchen bullet camera).",
  gate,
);
const future = [];
for (const [id, name, p] of [
  ["us-a", "US A · upcoming", [532, 961]],
  ["us-b", "US B · upcoming", [532, 862]],
]) {
  const q = pos(...p),
    w = 25,
    depth = 6;
  const angle = -0.13;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const corners = [
    [-w / 2, -depth / 2],
    [w / 2, -depth / 2],
    [w / 2, depth / 2],
    [-w / 2, depth / 2],
    [-w / 2, -depth / 2],
  ].map(([lx, lz]) =>
    new THREE.Vector3(
      q.x + (lx * cos - lz * sin),
      0.12,
      q.z + (lx * sin + lz * cos),
    ),
  );
  futureObjects.push(line(corners, 0x98cf87, 0.08, scene, true));
  label(name, q.clone().add(new THREE.Vector3(0, 1, 0)), id, "future");
  addEntry(
    id,
    name,
    "Cable provision only. Future building size, camera locations and number of cable runs are to be confirmed.",
    q,
  );
  future.push({ id, q });
}
const interiors = createInteriors(buildings, scene);
const kitchenInterior = createKitchenInterior(kitchen);
label("Medicine", kitchen.point(-2.2, 0, 1.2), "medicine-room", "room");
label("Kitchen room", kitchen.point(2.2, 0, 1.2), "kitchen-room", "room");
addEntry(
  "medicine-room",
  "Medicine room",
  "Left half of the building, with illustrative medicine shelves. Room division is assumed equal.",
  kitchenInterior.medicineCentre,
);
addEntry(
  "kitchen-room",
  "Kitchen room",
  "Right half of the building, with an interior K1 camera and two illustrative walking people.",
  kitchenInterior.kitchenCentre,
);
entries.get("us-a").description +=
  " The network room remains on its original left side, slightly farther from the cage area.";

const switchObjects = [];
function createRoofSwitch(id, shed, number, description) {
  const group = new THREE.Group();
  group.position.copy(shed.point(0, 0, 4.65));
  group.rotation.y = shed.group.rotation.y;
  scene.add(group);
  switchObjects.push(group);
  const support = new THREE.MeshStandardMaterial({
    color: 0xb7c2bf,
    roughness: 0.6,
  });
  box(2.7, 0.12, 1.5, 0, -0.14, 0, support, group);
  const body = box(2.5, 0.5, 1.25, 0, 0.15, 0, mats.dark, group);
  body.userData.id = id;
  pickables.push(body);
  const portMaterial = new THREE.MeshBasicMaterial({ color: 0x4cdef0 });
  for (let i = 0; i < 8; i++)
    box(0.15, 0.14, 0.08, -0.84 + i * 0.24, 0.18, 0.66, portMaterial, group);
  box(
    0.16,
    0.14,
    0.08,
    1.25,
    0.18,
    0.4,
    new THREE.MeshBasicMaterial({ color: 0xf1bd62 }),
    group,
  );
  group.updateMatrixWorld(true);
  const ports = Array.from({ length: 8 }, (_, i) =>
    group.localToWorld(new THREE.Vector3(-0.84 + i * 0.24, 0.18, 0.71)),
  );
  const fibre = group.localToWorld(new THREE.Vector3(1.29, 0.18, 0.4));
  const position = group.position.clone();
  label(
    "PoE " + number,
    position.clone().add(new THREE.Vector3(0, 1.6, 0)),
    id,
    "switch",
  );
  addEntry(
    id,
    "PoE switch " + number,
    description +
      " Shown in a rooftop enclosure. Select to highlight its connections.",
    position,
  );
  return { id, number, group, shed, ports, fibre };
}
const roofSwitches = {
  1: createRoofSwitch(
    "switch-1",
    network,
    1,
    "Network room roof. Serves B1, B2, C1, C2, D1 and future shed provisions.",
  ),
  2: createRoofSwitch(
    "switch-2",
    a,
    2,
    "Shed A roof. Serves A1–A4, G1, K1 and K2.",
  ),
};
function switchLead(switchNumber, portIndex, fibre = false) {
  const item = roofSwitches[switchNumber];
  const start = fibre ? item.fibre : item.ports[portIndex];
  if (switchNumber === 1) {
    // East wall down-pipe directly into underground conduit trunk riser
    const laneZ = (portIndex - 3.5) * 0.22;
    return [
      start.clone(),
      item.shed.point(item.shed.w / 2 - 0.15, laneZ, 4.55),
      item.shed.point(item.shed.w / 2 + 0.35, laneZ, 3.25),
      item.shed.point(item.shed.w / 2 + 0.35, laneZ, 0.18),
    ];
  }
  const laneX = (portIndex - 3.5) * 0.4;
  return [
    start.clone(),
    item.shed.point(laneX, 1.1, 4.55),
    item.shed.point(laneX, item.shed.d / 2 + 0.65, 3.25),
    item.shed.point(laneX, item.shed.d / 2 + 0.65, 0.25),
  ];
}
const camGroup = new THREE.Group();
scene.add(camGroup);

const cameraShortTitles = {
  A1: { shortTitle: "Shed A · North Footpath (West)", group: "Shed A" },
  A2: { shortTitle: "Shed A · South Footpath (West)", group: "Shed A" },
  A3: { shortTitle: "Shed A · North Footpath (East)", group: "Shed A" },
  A4: { shortTitle: "Shed A · South Footpath (East)", group: "Shed A" },
  B1: { shortTitle: "Shed B · West Entrance", group: "Shed B" },
  B2: { shortTitle: "Shed B · East End", group: "Shed B" },
  C1: { shortTitle: "Shed C · Central Footpath", group: "Shed C" },
  C2: { shortTitle: "Shed C · Yard & Network Facing", group: "Shed C" },
  D1: { shortTitle: "Shed D · Chicken Enclosure", group: "Shed D" },
  G1: { shortTitle: "Main Entrance Gate", group: "Gate & Perimeter" },
  K1: { shortTitle: "Kitchen Workspace Interior", group: "Kitchen" },
  K2: { shortTitle: "Kitchen Yard · Gate Facing", group: "Kitchen" },
};

function addCamera(id, point, dir, switchId, description) {
  const isBullet = id === "G1" || id === "C2" || id === "D2" || id === "K2";
  const lens = isBullet ? "4.0mm" : "2.8mm";
  const hfov = isBullet ? 79 : 103;
  const type = isBullet ? "bullet" : "dome";
  const meta = cameraShortTitles[id] || { shortTitle: description, group: "General" };
  const shortTitle = meta.shortTitle;
  const group = meta.group;

  const body = new THREE.Group();
  body.position.copy(point);
  camGroup.add(body);
  cameraObjects.push(body);

  let orientedDir = dir.clone().normalize();
  if (
    Math.abs(orientedDir.y) < 0.05 &&
    (id.startsWith("A") || id.startsWith("B") || id === "C1" || id === "D1")
  ) {
    orientedDir.y = -0.18;
    orientedDir.normalize();
  }
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), orientedDir);

  const cameraMeshes = [];

  if (isBullet) {
    // 4.0mm Bullet Camera (G1, D2): Cylindrical housing with top sunshield visor and swivel bracket
    const bulletBodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.9, 16);
    bulletBodyGeo.rotateX(Math.PI / 2);
    const bulletBody = new THREE.Mesh(bulletBodyGeo, mats.camera);
    bulletBody.castShadow = true;
    body.add(bulletBody);
    cameraMeshes.push(bulletBody);

    // Sunshield / weather hood visor on top
    const visor = box(0.54, 0.05, 1.05, 0, 0.27, 0.08, mats.camera, body);
    visor.castShadow = true;
    cameraMeshes.push(visor);

    // Front black faceplate
    const faceGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16);
    faceGeo.rotateX(Math.PI / 2);
    const face = new THREE.Mesh(faceGeo, mats.dark);
    face.position.set(0, 0, 0.45);
    body.add(face);
    cameraMeshes.push(face);

    // 4mm Optical lens in center
    const lensGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14);
    lensGeo.rotateX(Math.PI / 2);
    const lensMesh = new THREE.Mesh(lensGeo, mats.lens);
    lensMesh.position.set(0, 0, 0.47);
    body.add(lensMesh);

    // Rear swivel bracket / mounting arm
    const bracketArm = box(0.12, 0.38, 0.12, 0, -0.25, -0.32, mats.trim, body);
    const wallPlate = box(0.38, 0.38, 0.06, 0, -0.42, -0.32, mats.trim, body);
    cameraMeshes.push(bracketArm, wallPlate);
  } else {
    // 2.8mm Dome Camera: Circular ceiling/eave base plate, tapered collar, smoked dome bubble, inner eyeball turret
    const baseGeo = new THREE.CylinderGeometry(0.46, 0.5, 0.1, 16);
    baseGeo.rotateX(Math.PI / 2);
    const basePlate = new THREE.Mesh(baseGeo, mats.camera);
    basePlate.position.set(0, 0, -0.15);
    basePlate.castShadow = true;
    body.add(basePlate);
    cameraMeshes.push(basePlate);

    const collarGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.18, 16);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, mats.camera);
    collar.position.set(0, 0, -0.04);
    collar.castShadow = true;
    body.add(collar);
    cameraMeshes.push(collar);

    const domeGeo = new THREE.SphereGeometry(
      0.34,
      16,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.6,
    );
    domeGeo.rotateX(Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x0c1820,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 0, 0.04);
    body.add(dome);
    cameraMeshes.push(dome);

    const eyeball = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      mats.dark,
    );
    eyeball.position.set(0, 0, 0.06);
    body.add(eyeball);

    const lensGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14);
    lensGeo.rotateX(Math.PI / 2);
    const lensMesh = new THREE.Mesh(lensGeo, mats.lens);
    lensMesh.position.set(0, 0, 0.22);
    body.add(lensMesh);

    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
    );
    led.position.set(0.18, 0.16, 0.05);
    body.add(led);
  }

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x5ce1e5,
      emissive: 0x209baf,
      emissiveIntensity: 0.6,
    }),
  );
  marker.position.copy(point).add(new THREE.Vector3(0, -0.8, 0));
  scene.add(marker);
  cameraObjects.push(marker);

  marker.userData.id = id;
  for (const m of cameraMeshes) {
    m.userData.id = id;
    pickables.push(m);
  }
  pickables.push(marker);

  const arrow = new THREE.ArrowHelper(
    orientedDir,
    point.clone().addScaledVector(orientedDir, 0.8),
    3,
    0x79e8e8,
    0.65,
    0.4,
  );
  scene.add(arrow);
  directionObjects.push(arrow);

  const camera = {
    id,
    point,
    direction: orientedDir.clone(),
    switchId,
    body,
    marker,
    arrow,
    type,
    lens,
    hfov,
    description,
    shortTitle,
    group,
  };
  cameras.push(camera);

  label(id, point.clone().add(new THREE.Vector3(0, 1.5, 0)), id, "camera");
  addEntry(
    id,
    id,
    description +
      (isBullet
        ? " · 4.0mm Bullet Camera (79° view)"
        : " · 2.8mm Dome Camera (103° wide view)") +
      " · Independent Cat 6 connection to PoE switch " +
      switchId +
      ".",
    point,
  );
}
// Shed A (32m x 17m): 4 dome cameras mounted directly in the two footpaths (North & South) tilted down to show cages under it
addCamera(
  "A1",
  a.point(-14.8, -4.25, 2.65),
  a.point(-7.5, -4.25, 0.2).sub(a.point(-14.8, -4.25, 2.65)),
  2,
  "Shed A west entrance, North Footpath (103° wide view tilted down over pens and walkway)",
);
addCamera(
  "A2",
  a.point(-14.8, 4.25, 2.65),
  a.point(-7.5, 4.25, 0.2).sub(a.point(-14.8, 4.25, 2.65)),
  2,
  "Shed A west entrance, South Footpath (103° wide view tilted down over pens and walkway)",
);
addCamera(
  "A3",
  a.point(14.8, -4.25, 2.65),
  a.point(7.5, -4.25, 0.2).sub(a.point(14.8, -4.25, 2.65)),
  2,
  "Shed A east end, North Footpath (103° wide view tilted down over pens and walkway)",
);
addCamera(
  "A4",
  a.point(14.8, 4.25, 2.65),
  a.point(7.5, 4.25, 0.2).sub(a.point(14.8, 4.25, 2.65)),
  2,
  "Shed A east end, South Footpath (103° wide view tilted down over pens and walkway)",
);

// Shed B (28m x 8m): 2 dome cameras along central footpath tilted down over pens and walkway
addCamera(
  "B1",
  b.point(-12.8, 0, 2.6),
  b.point(-5.5, 0, 0.2).sub(b.point(-12.8, 0, 2.6)),
  1,
  "Shed B west entrance, central footpath (103° wide view tilted down over 19 pig pens)",
);
addCamera(
  "B2",
  b.point(12.8, 0, 2.6),
  b.point(5.5, 0, 0.2).sub(b.point(12.8, 0, 2.6)),
  1,
  "Shed B east end, central footpath (103° wide view tilted down over 19 pig pens)",
);

// Shed C (34m x 11m, 20 pig pens): C1 in central footpath tilted down over pens and walkway, C2 is 4mm bullet facing outside
addCamera(
  "C1",
  c.point(-15.6, 0, 2.65),
  c.point(-7.5, 0, 0.2).sub(c.point(-15.6, 0, 2.65)),
  1,
  "Shed C west entrance, central footpath (103° wide view tilted down over 20 pig pens)",
);
const c2Pos = c.point(-17.2, 1.2, 2.8);
const c2Target = network.group.position
  .clone()
  .add(gate)
  .multiplyScalar(0.5)
  .setY(1.2);
addCamera(
  "C2",
  c2Pos,
  c2Target.clone().sub(c2Pos),
  1,
  "Shed C entrance exterior, 4.0mm bullet facing southwest toward network room and gate",
);

// Shed D (22m x 5m, chicken enclosure): D1 in enclosure passage tilted down to show chickens and straw
addCamera(
  "D1",
  d.point(-9.8, 0, 2.45),
  d.point(-2.5, 0, 0.2).sub(d.point(-9.8, 0, 2.45)),
  1,
  "Shed D chicken enclosure (103° wide view tilted down over chicken area)",
);

// Gate G1 (4.0mm bullet camera): Beside Shed A corner aimed at main gate
const gateCameraPosition = a.point(-a.w / 2 - 0.35, a.d / 2 + 0.35, 2.85);
const gateTarget = gate.clone().add(new THREE.Vector3(0, 1.2, 0));
addCamera(
  "G1",
  gateCameraPosition,
  gateTarget.clone().sub(gateCameraPosition),
  2,
  "Mounted beside Shed A corner, 4.0mm bullet aimed directly at main farm gate",
);

// Kitchen (9m x 6m): K1 interior dome, K2 exterior bullet
const kitchenInsidePosition = kitchen.point(0.45, -2.45, 2.6);
const kitchenGatePosition = kitchen.point(
  -kitchen.w / 2 - 0.3,
  kitchen.d / 2 + 0.25,
  2.85,
);
addCamera(
  "K1",
  kitchenInsidePosition,
  kitchen.point(2.8, 1.2, 0.35).sub(kitchenInsidePosition),
  2,
  "Inside kitchen workspace (103° wide view tilted down over preparation area and staff)",
);
addCamera(
  "K2",
  kitchenGatePosition,
  gateTarget.clone().sub(kitchenGatePosition),
  2,
  "Outside kitchen building, 4.0mm bullet facing west toward main gate",
);
// Each physical run has its own corridor lane and a continuous path to its camera.
function route(id, points, color, dashed = false) {
  const group = new THREE.Group();
  scene.add(group);
  const geometry = new LineGeometry();
  geometry.setPositions(points.flatMap((p) => p.toArray()));
  const type =
    id === "fibre" ? "fibre" : id.startsWith("us-") ? "future" : "cat6";
  const materials = [];
  for (const [colorValue, width, order] of [
    [0x081b24, 8, 20],
    [color, 4, 21],
  ]) {
    const material = new LineMaterial({
      color: colorValue,
      linewidth: width,
      worldUnits: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      dashed,
      dashSize: 1.2,
      gapSize: 0.7,
    });
    material.resolution.set(innerWidth, innerHeight);
    lineMaterials.push(material);
    materials.push(material);
    const mesh = new Line2(geometry, material);
    mesh.computeLineDistances();
    mesh.renderOrder = order;
    group.add(mesh);
  }
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += points[i].distanceTo(points[i - 1]);
  routes.push({ id, obj: group, type, materials, points, length });
  return group;
}
// Underground heavy-duty conduit trunk and central distribution chamber DP-1
const dp1 = new THREE.Vector3(-14.6, 0.12, -12.2);

const conduitPipes = [];
function addConduitPipe(start, end, radius = 0.08, color = 0x243238) {
  const diff = end.clone().sub(start);
  const length = diff.length();
  const geo = new THREE.CylinderGeometry(radius, radius, length, 16);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.72,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start.clone().addScaledVector(diff, 0.5));
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    diff.clone().normalize(),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  conduitPipes.push(mesh);
  return mesh;
}

// 3D Distribution Chamber DP-1 (Western service corridor between Upcoming Sheds US A and US B)
const dp1Chamber = box(1.1, 0.22, 1.1, dp1.x, 0.11, dp1.z, mats.trim, scene);
const dp1LidMat = new THREE.MeshStandardMaterial({
  color: 0x364347,
  roughness: 0.35,
  metalness: 0.75,
});
const dp1Lid = box(0.92, 0.05, 0.92, dp1.x, 0.23, dp1.z, dp1LidMat, scene);
dp1Lid.userData.id = "dp-1";
pickables.push(dp1Lid);
box(0.18, 0.02, 0.04, dp1.x - 0.25, 0.26, dp1.z, mats.metal, scene);
box(0.18, 0.02, 0.04, dp1.x + 0.25, 0.26, dp1.z, mats.metal, scene);

label(
  "DP-1 · Conduit Hub",
  dp1.clone().add(new THREE.Vector3(0, 1.4, 0)),
  "dp-1",
  "switch",
);
addEntry(
  "dp-1",
  "Underground Conduit Hub (DP-1)",
  "Central underground distribution chamber (600x600mm precast concrete pit with Class C250 ductile iron inspection cover) located at the western service corridor between Upcoming Sheds US A and US B. Receives a single heavy-duty 63mm OD Class 1 HDPE trunk conduit buried 600mm under mud from the Network Room. Internally houses an IP68 gel-filled distribution junction with 5x Cat 6 F/UTP camera feeds and 4-core outdoor steel-armoured singlemode fibre link to PoE Switch 2 on Shed A. Sub-distributes North to Shed C & D, South to Shed B and Shed A, and East lateral provisions into US A and US B.",
  dp1,
);

// 1. Single underground trunk pipe from Network Room to DP-1
const networkTrunkRiser = network.point(network.w / 2 + 0.35, 0, 0.18);
addConduitPipe(networkTrunkRiser, dp1, 0.1, 0x1f292e);

// 2. North branch conduit towards Shed C and D
const northBranchConduitEnd = c.point(-c.w / 2 - 1.2, c.d / 2 + 1.2, 0.18);
addConduitPipe(dp1, northBranchConduitEnd, 0.07, 0x27353b);

// 3. South branch conduit towards Shed B
const southBranchConduitEnd = b.point(-b.w / 2 - 1.2, b.d / 2 + 1.2, 0.18);
addConduitPipe(dp1, southBranchConduitEnd, 0.07, 0x27353b);

// 4. South backbone conduit towards Shed A (housing steel-armoured fibre to Switch 2)
const shedAConduitEntry = a.point(-a.w / 2 - 1.2, a.d / 2 + 1.2, 0.18);
addConduitPipe(dp1, shedAConduitEntry, 0.07, 0x27353b);

// 5. East lateral stubs into Upcoming Sheds US A and US B
if (future.length >= 2) {
  const usAStub = new THREE.Vector3(future[0].q.x - 12.0, 0.18, future[0].q.z);
  addConduitPipe(dp1, usAStub, 0.05, 0x27353b);
  const usBStub = new THREE.Vector3(future[1].q.x - 12.0, 0.18, future[1].q.z);
  addConduitPipe(dp1, usBStub, 0.05, 0x27353b);
}

const assignedPorts = { 1: 0, 2: 0 };
for (const [i, cam] of cameras.entries()) {
  const portIndex = assignedPorts[cam.switchId]++;
  cam.port = portIndex + 1;
  const lead = switchLead(cam.switchId, portIndex);
  const source = lead[lead.length - 1];
  const q = cam.point;
  const shed = { A: a, B: b, C: c, D: d, K: kitchen, G: a }[cam.id[0]];
  let tail;
  if (cam.switchId === 1) {
    // Cables from Switch 1 pass through the single underground trunk pipe to DP-1
    const trunkStep = dp1
      .clone()
      .add(new THREE.Vector3(0, 0.05, (portIndex - 2) * 0.08));
    if (cam.id[0] === "C") {
      const entry = c.point(
        -c.w / 2 - 1.2,
        c.d / 2 + 1.2 + (portIndex % 2) * 0.35,
        0.25,
      );
      const local = c.group.worldToLocal(q.clone());
      const frontage = c.d / 2 + 1.3;
      const endpointSide = Math.sign(local.x) * (c.w / 2 + 0.9);
      const turn = c.point(endpointSide, frontage, 0.25);
      const side = c.point(endpointSide, local.z, 0.25);
      tail = [
        trunkStep,
        new THREE.Vector3(trunkStep.x, 0.25, entry.z),
        entry,
        turn,
        side,
      ];
    } else if (cam.id[0] === "D") {
      const entry = d.point(-d.w / 2 - 1.2, d.d / 2 + 1.2, 0.25);
      const local = d.group.worldToLocal(q.clone());
      const frontage = d.d / 2 + 1.3;
      const endpointSide = Math.sign(local.x) * (d.w / 2 + 0.9);
      const turn = d.point(endpointSide, frontage, 0.25);
      const side = d.point(endpointSide, local.z, 0.25);
      tail = [
        trunkStep,
        new THREE.Vector3(trunkStep.x, 0.25, entry.z),
        entry,
        turn,
        side,
      ];
    } else if (cam.id[0] === "B") {
      const entry = b.point(
        -b.w / 2 - 1.2,
        b.d / 2 + 1.2 + (portIndex % 2) * 0.35,
        0.25,
      );
      const local = b.group.worldToLocal(q.clone());
      const frontage = b.d / 2 + 1.3;
      const endpointSide = Math.sign(local.x) * (b.w / 2 + 0.9);
      const turn = b.point(endpointSide, frontage, 0.25);
      const side = b.point(endpointSide, local.z, 0.25);
      tail = [
        trunkStep,
        new THREE.Vector3(trunkStep.x, 0.25, entry.z),
        entry,
        turn,
        side,
      ];
    } else {
      tail = [trunkStep, new THREE.Vector3(trunkStep.x, 0.25, q.z)];
    }
  } else if (shed) {
    const local = shed.group.worldToLocal(q.clone());
    const frontage = shed.d / 2 + 1.3 + (portIndex % 4) * 0.35;
    const endpointSide = Math.sign(local.x) * (shed.w / 2 + 0.9);
    const entry = shed.point(-shed.w / 2 - 1.2, frontage, 0.25);
    const turn = shed.point(endpointSide, frontage, 0.25);
    const side = shed.point(endpointSide, local.z, 0.25);
    if (cam.switchId === 2 && (cam.id[0] === "A" || cam.id[0] === "G")) {
      const localSource = shed.group.worldToLocal(source.clone());
      tail = [shed.point(localSource.x, frontage, 0.25), turn, side];
    } else if (cam.switchId === 2 && cam.id[0] === "K") {
      tail = [new THREE.Vector3(source.x, 0.25, entry.z), entry, turn, side];
    } else {
      tail = [entry, turn, side];
    }
  } else {
    tail = [new THREE.Vector3(source.x, 0.25, q.z)];
  }
  let cameraTail = [new THREE.Vector3(q.x, 0.25, q.z), q.clone()];
  if (cam.id === "K1") {
    const wallEntry = kitchen.point(-kitchen.w / 2 - 0.25, -2.45, 0.25);
    const ceilingEntry = kitchen.point(-kitchen.w / 2 - 0.25, -2.45, 2.7);
    const roomEntry = kitchen.point(0.45, -2.45, 2.7);
    tail = [new THREE.Vector3(source.x, 0.25, wallEntry.z), wallEntry];
    cameraTail = [ceilingEntry, roomEntry, q.clone()];
  }
  route(cam.id, [...lead, ...tail, ...cameraTail], 0x50d6e2);
  routes[routes.length - 1].switchIds = [cam.switchId];
}
const fibreStart = switchLead(1, 8, true);
const fibreEnd = switchLead(2, 8, true);
const fibreTrunkStep = dp1.clone().add(new THREE.Vector3(0, 0.08, 0.15));
const fibreEndGround = fibreEnd[fibreEnd.length - 1];
route(
  "fibre",
  [
    ...fibreStart,
    fibreTrunkStep,
    new THREE.Vector3(fibreTrunkStep.x, 0.25, fibreEndGround.z),
    new THREE.Vector3(fibreEndGround.x, 0.25, fibreEndGround.z),
    ...fibreEnd.reverse(),
  ],
  0xf1bd62,
);
routes[routes.length - 1].switchIds = [1, 2];
for (const [i, { id, q }] of future.entries()) {
  const lead = switchLead(1, 5 + i);
  const futureTrunkStep = dp1
    .clone()
    .add(new THREE.Vector3(0, 0.05, 0.25 + i * 0.1));
  const provisionX = q.x - 12.5;
  route(
    id,
    [
      ...lead,
      futureTrunkStep,
      new THREE.Vector3(futureTrunkStep.x, 0.25, q.z),
      new THREE.Vector3(provisionX, 0.25, q.z),
    ],
    0x98cf87,
    true,
  );
  routes[routes.length - 1].switchIds = [1];
}
for (const [id, description] of Object.entries({
  "shed-a":
    "68 cages arranged in 4 rows flanking two longitudinal footpaths (North and South footpaths).",
  "shed-b":
    "19 cages total, arranged 10 on one side and 9 on the other, with a central pathway.",
  "shed-c": "20 cages total, arranged 10 on each side of a central pathway.",
  "shed-d": "Open chicken enclosure with illustrative animated chickens.",
}))
  entries.get(id).description += " " + description;
environment.plant({
  buildings: Object.values(buildings).map(b => ({
    x:b.group.position.x, z:b.group.position.z, w:b.w, d:b.d, angle:b.group.rotation.y,
  })),
  corridors: [
    ...routes.map(r => r.points),
    [gate, new THREE.Vector3(-50, 0, 120)],
    [gate, cameras.find(c => c.id === "G1").point],
    [gate, cameras.find(c => c.id === "K2").point],
  ],
});
// Similarity registration from three visible roofs in the supplied map.
const registration = {
  a: -0.15228071380903005,
  b: 0.048902587459338065,
  tx: 625.1428722172055,
  ty: 408.7158187405548,
};
function mapToModel(u, v) {
  const { a, b, tx, ty } = registration,
    det = a * a + b * b;
  return pos(
    (a * (u - tx) + b * (v - ty)) / det,
    (-b * (u - tx) + a * (v - ty)) / det,
  );
}
function modelToMap(p) {
  const x = p.x / mapScale + 550,
    y = p.z / mapScale + 1050,
    { a, b, tx, ty } = registration;
  return { u: a * x - b * y + tx, v: b * x + a * y + ty };
}
function coordinates(p) {
  const { u, v } = modelToMap(p),
    n = 2 ** 18;
  const x = 186512 + u / 256,
    y = 122091 + v / 256;
  return {
    lon: (x / n) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
  };
}
const northDirection = mapToModel(0, -1).sub(mapToModel(0, 0)).normalize();
const groundShadows = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  new THREE.ShadowMaterial({ opacity: 0.25, depthWrite: false }),
);
groundShadows.rotation.x = -Math.PI / 2;
groundShadows.position.y = -0.04;
groundShadows.receiveShadow = true;
scene.add(groundShadows);
groundShadows.position.y = 0.02;

function updateMapStatus() {
  $("map-status").textContent =
    "3D Forest & Terrain · " +
    (environment.forestGroup.visible ? "Ghibli style trees · " : "") +
    "Calibrated metres";
}
let selected = "overview",
  activePane = null,
  mapView = false;
const layerIds = [
  "trees",
  "ground-3d",
  "buildings",
  "roofs",
  "camera-layer",
  "directions",
  "cables",
  "fibre",
  "future-cables",
  "future-sheds",
  "names",
  "grid",
  "xray",
  "interiors",
  "animals",
  "animation",
  "switches",
  "people",
];
function openPane(name) {
  activePane = name;
  $("panel").classList.remove("collapsed");
  $("panel-body").classList.remove("hidden");
  $("collapse").setAttribute("aria-expanded", "true");
  $("sheet-title").textContent = {
    layers: "Map layers",
    inspect: "Inspect the plan",
    plan: "Installation plan",
    measure: "Measure distance",
  }[name];
  document
    .querySelectorAll(".pane")
    .forEach((p) => p.classList.toggle("hidden", p.id !== name + "-pane"));
  document
    .querySelectorAll("[data-pane]")
    .forEach((b) => b.classList.toggle("active", b.dataset.pane === name));
}
function closePane() {
  activePane = null;
  $("panel").classList.add("collapsed");
  $("panel-body").classList.add("hidden");
  $("collapse").setAttribute("aria-expanded", "false");
  document
    .querySelectorAll("[data-pane]")
    .forEach((b) => b.classList.remove("active"));
}
function applyLayers() {
  environment.forestGroup.visible = $("trees").checked;
  environment.groundGroup.visible = $("ground-3d").checked;
  grid.visible = $("grid").checked;
  for (const b of Object.values(buildings))
    b.group.visible = $("buildings").checked;
  roofs.forEach((r) => (r.visible = $("roofs").checked));
  cameraObjects.forEach((o) => (o.visible = $("camera-layer").checked));
  directionObjects.forEach(
    (o) => (o.visible = $("directions").checked && $("camera-layer").checked),
  );
  futureObjects.forEach((o) => (o.visible = $("future-sheds").checked));
  $("roofs").disabled = !$("buildings").checked;
  $("interior-view").classList.toggle("active", !$("roofs").checked);
  $("interior-view").setAttribute("aria-pressed", String(!$("roofs").checked));
  interiors.interiorGroups.forEach(
    (group) => (group.visible = $("interiors").checked),
  );
  interiors.animalRoot.visible = $("animals").checked && $("buildings").checked;
  kitchenInterior.interior.visible = $("interiors").checked;
  kitchenInterior.peopleRoot.visible =
    $("people").checked && $("buildings").checked;
  switchObjects.forEach((group) => (group.visible = $("switches").checked));
  for (const r of routes) {
    r.obj.visible = $(
      r.type === "cat6"
        ? "cables"
        : r.type === "fibre"
          ? "fibre"
          : "future-cables",
    ).checked;
    r.materials.forEach((m) => (m.depthTest = !$("xray").checked));
  }
  updateMapStatus();
  try {
    localStorage.setItem(
      "farm-atlas-layers",
      JSON.stringify(
        Object.fromEntries(layerIds.map((id) => [id, $(id).checked])),
      ),
    );
  } catch {}
}
for (const id of layerIds) $(id).onchange = applyLayers;
try {
  const saved = JSON.parse(localStorage.getItem("farm-atlas-layers") || "{}");
  for (const id of layerIds)
    if (typeof saved[id] === "boolean") $(id).checked = saved[id];
} catch {}
// Restore 3D terrain and trees context once; preserve subsequent explicit choices.
try {
  if (localStorage.getItem("farm-atlas-forest-version") !== "2") {
    $("trees").checked = true;
    $("ground-3d").checked = true;
    localStorage.setItem("farm-atlas-forest-version", "2");
  }
  $("forest-quality").value = localStorage.getItem("farm-atlas-forest-quality") || "auto";
} catch {}
function applyForestQuality() {
  environment.forest.setQuality($("forest-quality").value);
  renderer.setPixelRatio(Math.min(devicePixelRatio, environment.forest.quality === "low" ? 1.15 : 1.5));
  try { localStorage.setItem("farm-atlas-forest-quality", $("forest-quality").value); } catch {}
}
$("forest-quality").onchange = applyForestQuality;
applyForestQuality();

// ==========================================================================
// CCTV Camera Viewport & HUD State
// ==========================================================================
let inCameraView = false;
let activeCamId = null;
const savedViewPos = new THREE.Vector3();
const savedControlsTarget = new THREE.Vector3();
let savedFov = 42;
let camLookYaw = 0;
let camLookPitch = 0;
let camZoom = 1.0;
let isCamDragging = false;
let camDragStart = [0, 0];
let touchStartDistance = 0;
let cctvClockTimer = null;

// Dedicated camera interior fill light to illuminate shed pens and livestock
const cameraFillLight = new THREE.PointLight(0xfff6e8, 0, 48, 1.1);
cameraFillLight.castShadow = false;
scene.add(cameraFillLight);

function applyCameraFov(cam) {
  const aspect = innerWidth / innerHeight;
  const hfovRad = THREE.MathUtils.degToRad(cam.hfov / camZoom);
  const vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / aspect);
  view.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vfovRad), 15, 120);
  view.aspect = aspect;
  view.updateProjectionMatrix();
}

function updateCameraLook() {
  const cam = cameras.find((c) => c.id === activeCamId);
  if (!cam) return;
  // Fixed mount CCTV: lens positioned slightly in front of mount plate
  const lensPos = cam.point.clone().addScaledVector(cam.direction, 0.42);
  view.position.copy(lensPos);

  // Non-movable camera: look target is locked along the camera's fixed optical axis
  const lookTarget = lensPos.clone().addScaledVector(cam.direction, 25);
  view.lookAt(lookTarget);
}

function updateCameraHUD(cam) {
  const isBullet = cam.type === "bullet";
  $("cctv-cam-badge").textContent = "CAM " + cam.id;
  $("cctv-cam-title").textContent = cam.shortTitle || cam.description;
  const typeBadge = $("cctv-type-badge");
  typeBadge.className = isBullet ? "cctv-badge-bullet" : "cctv-badge-dome";
  typeBadge.textContent = isBullet ? "BULLET 4.0mm" : "DOME 2.8mm";
  $("cctv-lens-spec").textContent =
    (isBullet ? "79° Fixed Lens" : "103° Wide View") +
    " · Switch " +
    cam.switchId +
    " Port " +
    cam.port;
  $("cctv-zoom-badge").textContent = camZoom.toFixed(1) + "x";

  // Update custom dropdown trigger
  const ddBadge = $("cctv-dd-badge");
  if (ddBadge) ddBadge.textContent = "CAM " + cam.id;
  const ddTitle = $("cctv-dd-title");
  if (ddTitle) ddTitle.textContent = cam.shortTitle || cam.id;

  // Update active state in custom dropdown list
  const items = document.querySelectorAll(".cctv-dd-item");
  items.forEach((item) => {
    if (item.dataset.camId === cam.id) {
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");
    } else {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    }
  });
}

function startCCTVClock() {
  if (cctvClockTimer) return;
  const tick = () => {
    const el = $("cctv-timestamp");
    if (!el) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    el.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };
  tick();
  cctvClockTimer = setInterval(tick, 1000);
}

function enterCameraView(camId) {
  const cam = cameras.find((c) => c.id === camId);
  if (!cam) return;

  if (!inCameraView) {
    savedViewPos.copy(view.position);
    savedControlsTarget.copy(controls.target);
    savedFov = view.fov;
  }

  // Restore previous camera body visibility
  if (activeCamId && activeCamId !== camId) {
    const prev = cameras.find((c) => c.id === activeCamId);
    if (prev) {
      prev.body.visible = $("camera-layer").checked;
      prev.marker.visible = $("camera-layer").checked;
      prev.arrow.visible = $("directions").checked && $("camera-layer").checked;
    }
  }

  inCameraView = true;
  activeCamId = camId;
  controls.enabled = false;
  controls.autoRotate = false;
  $("rotate").setAttribute("aria-pressed", "false");
  $("rotate").classList.remove("active");
  document.body.classList.add("camera-mode");

  camLookYaw = 0;
  camLookPitch = 0;
  camZoom = 1.0;

  // Hide active camera's own body, marker and arrow so they don't occlude lens view
  cam.body.visible = false;
  cam.marker.visible = false;
  cam.arrow.visible = false;

  const isInteriorCam = [
    "A1",
    "A2",
    "A3",
    "A4",
    "B1",
    "B2",
    "C1",
    "D1",
    "K1",
  ].includes(cam.id);

  if (isInteriorCam) {
    // Hide roofs so daylight illuminates the shed interior, and activate camera fill light
    roofs.forEach((r) => (r.visible = false));
    cameraFillLight.position.copy(cam.point);
    cameraFillLight.intensity = 2.8;
  } else {
    roofs.forEach((r) => (r.visible = $("roofs").checked));
    cameraFillLight.intensity = 0;
  }

  applyCameraFov(cam);
  updateCameraLook();
  updateCameraHUD(cam);
  startCCTVClock();

  $("camera-viewport-hud").classList.remove("hidden");
  $("perspective").classList.remove("active");
  $("top").classList.remove("active");
  $("interior-view").classList.remove("active");
  $("gesture-hint").textContent =
    cam.type === "bullet"
      ? "Fixed CCTV bullet mount (79° FOV) · Non-movable · Scroll or pinch to zoom"
      : "Fixed CCTV dome mount (103° wide FOV) · Non-movable · Scroll or pinch to zoom";

  closePane();
}

function exitCameraView() {
  if (!inCameraView) return;

  if (activeCamId) {
    const cam = cameras.find((c) => c.id === activeCamId);
    if (cam) {
      cam.body.visible = $("camera-layer").checked;
      cam.marker.visible = $("camera-layer").checked;
      cam.arrow.visible = $("directions").checked && $("camera-layer").checked;
    }
  }

  inCameraView = false;
  activeCamId = null;
  cameraFillLight.intensity = 0;
  roofs.forEach((r) => (r.visible = $("roofs").checked));

  document.body.classList.remove("camera-mode");

  // Close custom dropdown panel if open
  const ddPanel = $("cctv-dropdown-panel");
  if (ddPanel) ddPanel.classList.add("hidden");
  const ddBackdrop = $("cctv-dropdown-backdrop");
  if (ddBackdrop) ddBackdrop.classList.add("hidden");
  const ddBtn = $("cctv-dropdown-btn");
  if (ddBtn) ddBtn.setAttribute("aria-expanded", "false");

  controls.enabled = true;
  view.fov = savedFov || 42;
  view.aspect = innerWidth / innerHeight;
  view.updateProjectionMatrix();

  view.position.copy(savedViewPos);
  controls.target.copy(savedControlsTarget);
  controls.update();

  $("camera-viewport-hud").classList.add("hidden");
  $("perspective").classList.add("active");
  $("gesture-hint").textContent = mapView
    ? "Drag to pan · Pinch to zoom"
    : "Drag to orbit · Pinch to zoom";
}

function stepCamera(direction) {
  if (!activeCamId) return;
  const idx = cameras.findIndex((c) => c.id === activeCamId);
  if (idx === -1) return;
  const nextIdx = (idx + direction + cameras.length) % cameras.length;
  const nextCam = cameras[nextIdx];
  select(nextCam.id);
  enterCameraView(nextCam.id);
}

function resetCameraAngle() {
  camLookYaw = 0;
  camLookPitch = 0;
  camZoom = 1.0;
  if (activeCamId) {
    const cam = cameras.find((c) => c.id === activeCamId);
    if (cam) applyCameraFov(cam);
  }
  const badge = $("cctv-zoom-badge");
  if (badge) badge.textContent = "1.0x";
}

function setupCCTVDropdown() {
  const container = $("cctv-dropdown-container");
  const btn = $("cctv-dropdown-btn");
  const panel = $("cctv-dropdown-panel");
  const list = $("cctv-dropdown-list");
  const backdrop = $("cctv-dropdown-backdrop");
  const closeBtn = $("cctv-dropdown-close");
  if (!container || !btn || !panel || !list) return;

  function openDropdown() {
    panel.classList.remove("hidden");
    if (backdrop) backdrop.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
    const activeItem = list.querySelector(".cctv-dd-item.active");
    if (activeItem) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
    }
  }

  function closeDropdown() {
    panel.classList.add("hidden");
    if (backdrop) backdrop.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    if (panel.classList.contains("hidden")) {
      openDropdown();
    } else {
      closeDropdown();
    }
  };

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
    };
  }

  if (backdrop) {
    backdrop.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
    };
  }

  // Populate grouped list
  list.replaceChildren();

  const groups = {};
  for (const cam of cameras) {
    const grp = cam.group || "Other";
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(cam);
  }

  for (const [groupName, groupCams] of Object.entries(groups)) {
    const grpHeader = document.createElement("div");
    grpHeader.className = "cctv-dd-group-header";
    grpHeader.textContent = groupName;
    list.appendChild(grpHeader);

    for (const cam of groupCams) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cctv-dd-item";
      item.dataset.camId = cam.id;
      item.setAttribute("role", "option");
      item.setAttribute(
        "aria-selected",
        cam.id === activeCamId ? "true" : "false",
      );
      if (cam.id === activeCamId) item.classList.add("active");

      const badge = document.createElement("span");
      badge.className = `cctv-dd-item-badge ${cam.type === "bullet" ? "bullet" : "dome"}`;
      badge.textContent = cam.id;

      const info = document.createElement("div");
      info.className = "cctv-dd-item-info";

      const title = document.createElement("div");
      title.className = "cctv-dd-item-title";
      title.textContent = cam.shortTitle || cam.id;

      const sub = document.createElement("div");
      sub.className = "cctv-dd-item-sub";
      sub.textContent = `${cam.type === "bullet" ? "4.0mm Bullet" : "2.8mm Dome"} · Switch ${cam.switchId} Port ${cam.port}`;

      info.appendChild(title);
      info.appendChild(sub);

      const check = document.createElement("span");
      check.className = "cctv-dd-item-check";
      check.setAttribute("aria-hidden", "true");

      item.appendChild(badge);
      item.appendChild(info);
      item.appendChild(check);

      item.onclick = (e) => {
        e.stopPropagation();
        closeDropdown();
        select(cam.id);
        enterCameraView(cam.id);
      };

      list.appendChild(item);
    }
  }

  window.addEventListener("click", (e) => {
    if (!panel.classList.contains("hidden") && !container.contains(e.target)) {
      closeDropdown();
    }
  });
}

function select(id) {
  selected = id;
  $("selection").value = id;
  const entry = entries.get(id),
    cam = cameras.find((c) => c.id === id),
    run = routes.find((r) => r.id === id);
  $("detail-title").textContent = entry?.name || "12 cameras. Two switches.";
  $("detail-text").textContent =
    entry?.description ||
    "Choose a camera to highlight its individual wire back to the switch.";
  $("detail-extra").replaceChildren();
  if (entry) {
    const geo = coordinates(entry.position),
      distance = Math.hypot(
        entry.position.x - network.group.position.x,
        entry.position.z - network.group.position.z,
      );
    const distanceInfo = document.createElement("p");
    distanceInfo.className = "metric";
    distanceInfo.textContent =
      "Approx. " +
      Math.round(distance) +
      " m straight-line from network room centre.";
    $("detail-extra").append(distanceInfo);
    if (run) {
      const cable = document.createElement("p");
      cable.className = "metric";
      cable.textContent =
        "Drawn cable route ≈ " +
        Math.round(run.length) +
        " m" +
        (cam ? " · Switch " + cam.switchId + " · Port " + cam.port : "") +
        ". Includes model height changes. Installation route is proposed.";
      $("detail-extra").append(cable);
    }
    const coords = document.createElement("p");
    coords.textContent =
      "Approx. map point " + geo.lat.toFixed(6) + ", " + geo.lon.toFixed(6);
    $("detail-extra").append(coords);
    if (cam) {
      const isBullet = cam.type === "bullet";
      const specPill = document.createElement("div");
      specPill.className = "camera-spec-pill " + (isBullet ? "bullet" : "dome");
      specPill.innerHTML = `<strong>${isBullet ? "4.0mm Bullet Camera" : "2.8mm Dome Camera"}</strong><br>${isBullet ? "Fixed Focused View (79° HFOV)" : "Fixed Wide-Angle View (103° HFOV)"} · PoE Switch ${cam.switchId} (Port ${cam.port})`;
      $("detail-extra").append(specPill);

      const viewBtn = document.createElement("button");
      viewBtn.className = "primary camera-view-action-btn";
      viewBtn.textContent = `View ${cam.id} Viewport (${cam.lens} ${isBullet ? "Bullet" : "Dome"})`;
      viewBtn.onclick = () => enterCameraView(cam.id);
      $("detail-extra").append(viewBtn);
    }
  }
  if (id.startsWith("switch-")) {
    const switchNumber = Number(id.slice(-1));
    const list = document.createElement("p");
    list.textContent = cameras
      .filter((camera) => camera.switchId === switchNumber)
      .map((camera) => "Port " + camera.port + " → " + camera.id)
      .join(" · ");
    $("detail-extra").append(list);
  }

  const shedRouteMap = {
    "shed-d": ["D1"],
    "shed-c": ["C1", "C2"],
    "shed-b": ["B1", "B2"],
    "shed-a": ["A1", "A2", "A3", "A4", "G1", "fibre"],
    kitchen: ["K1", "K2"],
    "kitchen-room": ["K1"],
    "medicine-room": ["K1"],
    gate: ["G1", "K2"],
    "us-a": ["us-a"],
    "us-b": ["us-b"],
    "dp-1": ["C1", "C2", "D1", "B1", "B2", "fibre", "us-a", "us-b"],
    network: ["C1", "C2", "D1", "B1", "B2", "fibre", "us-a", "us-b"],
  };

  const isSwitch = id.startsWith("switch-");
  const switchNumber = isSwitch ? Number(id.slice(-1)) : null;
  const isShed = Boolean(shedRouteMap[id]);
  const isTargeted = Boolean(cam || isSwitch || isShed);
  const targetRoutes = cam
    ? [id]
    : isSwitch
      ? routes
          .filter((r) => r.switchIds.includes(switchNumber))
          .map((r) => r.id)
      : isShed
        ? shedRouteMap[id]
        : [];

  if (isShed) {
    const matchingRuns = routes.filter((r) => targetRoutes.includes(r.id));
    if (matchingRuns.length > 0) {
      const cableInfo = document.createElement("div");
      cableInfo.className = "camera-spec-pill dome";
      let html = `<strong>Connected Cables (${matchingRuns.length} run${matchingRuns.length > 1 ? "s" : ""})</strong><br>`;
      html += matchingRuns
        .map((r) => {
          const c = cameras.find((cam) => cam.id === r.id);
          const name = c
            ? `CAM ${c.id} (${c.shortTitle || c.lens})`
            : r.id === "fibre"
              ? "Armoured Singlemode Fibre Backbone"
              : `Provision Stub ${r.id}`;
          return `• ${name} ≈ ${Math.round(r.length)}m`;
        })
        .join("<br>");
      cableInfo.innerHTML = html;
      $("detail-extra").append(cableInfo);
    }

    const shedCams = cameras.filter((c) => targetRoutes.includes(c.id));
    for (const c of shedCams) {
      const isBullet = c.type === "bullet";
      const viewBtn = document.createElement("button");
      viewBtn.className = "primary camera-view-action-btn";
      viewBtn.textContent = `View CAM ${c.id} (${c.shortTitle || c.id})`;
      viewBtn.onclick = () => enterCameraView(c.id);
      $("detail-extra").append(viewBtn);
    }
  }

  $("focus").disabled = !entry;
  for (const r of routes) {
    const highlight = isTargeted ? targetRoutes.includes(r.id) : true;
    if (isTargeted) {
      r.materials[0].opacity = highlight ? 1.0 : 0.08;
      r.materials[1].opacity = highlight ? 1.0 : 0.12;
      r.materials[0].linewidth = highlight ? 11 : 4.5;
      r.materials[1].linewidth = highlight ? 6 : 2;
      if (r.obj.children[0])
        r.obj.children[0].renderOrder = highlight ? 32 : 20;
      if (r.obj.children[1])
        r.obj.children[1].renderOrder = highlight ? 33 : 21;
    } else {
      r.materials[0].opacity = 0.85;
      r.materials[1].opacity = 1.0;
      r.materials[0].linewidth = 8;
      r.materials[1].linewidth = 4;
      if (r.obj.children[0]) r.obj.children[0].renderOrder = 20;
      if (r.obj.children[1]) r.obj.children[1].renderOrder = 21;
    }
  }
  for (const l of labels) {
    const isSelected =
      l.id === id || (isShed && shedRouteMap[id].includes(l.id));
    l.el.classList.toggle("selected", isSelected);
  }
  openPane("inspect");
}
$("selection").onchange = (e) => select(e.target.value);
$("clear-selection").onclick = () => select("overview");
$("focus").onclick = () => {
  const entry = entries.get(selected);
  if (!entry) return;
  const targetShed =
    buildings[selected] || (selected.endsWith("-room") ? kitchen : null);
  const focusDistance = targetShed
    ? Math.max(
        38,
        (0.52 * Math.hypot(targetShed.w, targetShed.d)) /
          Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) /
          Math.min(1, view.aspect),
      )
    : innerWidth < 800
      ? 52
      : 38;
  const offset = view.position
    .clone()
    .sub(controls.target)
    .normalize()
    .multiplyScalar(focusDistance);
  controls.target.copy(entry.position);
  view.position.copy(entry.position).add(offset);
  controls.update();
  closePane();
};
function setView(top) {
  if (inCameraView) exitCameraView();
  mapView = top;
  controls.autoRotate = false;
  controls.enableRotate = !top;
  $("rotate").classList.remove("active");
  $("rotate").setAttribute("aria-pressed", "false");
  reset(top);
  $("perspective").classList.toggle("active", !top);
  $("top").classList.toggle("active", top);
  $("perspective").setAttribute("aria-pressed", String(!top));
  $("top").setAttribute("aria-pressed", String(top));
  $("gesture-hint").textContent = top
    ? "Drag to pan · Pinch to zoom"
    : "Drag to orbit · Pinch to zoom";
  controls.mouseButtons.LEFT = top ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  controls.touches.ONE = top ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
}
$("interior-view").onclick = () => {
  if (inCameraView) exitCameraView();
  setView(false);
  $("roofs").checked = false;
  $("buildings").checked = true;
  $("interiors").checked = true;
  $("animals").checked = true;
  $("people").checked = true;
  applyLayers();
  const selectedCamera = cameras.find((camera) => camera.id === selected);
  const cameraShed = selectedCamera
    ? {
        A: "shed-a",
        B: "shed-b",
        C: "shed-c",
        D: "shed-d",
        K: "kitchen",
        G: "shed-a",
      }[selectedCamera.id[0]]
    : null;
  const shedId =
    selected === "kitchen" || selected.endsWith("-room")
      ? "kitchen"
      : selected.startsWith("shed-")
        ? selected
        : cameraShed || "shed-a";
  select(shedId);
  $("focus").onclick();
};
$("perspective").onclick = () => setView(false);
$("top").onclick = () => setView(true);
$("north").onclick = () => setView(true);
$("reset").onclick = () => {
  if (inCameraView) exitCameraView();
  setView(mapView);
  select("overview");
  closePane();
};
$("rotate").onclick = () => {
  if (mapView) setView(false);
  controls.autoRotate = $("rotate").getAttribute("aria-pressed") !== "true";
  $("rotate").setAttribute("aria-pressed", String(controls.autoRotate));
  $("rotate").classList.toggle("active", controls.autoRotate);
};
function zoom(factor) {
  const offset = view.position.clone().sub(controls.target);
  offset.setLength(
    THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    ),
  );
  view.position.copy(controls.target).add(offset);
  controls.update();
}
$("zoom-in").onclick = () => zoom(0.8);
$("zoom-out").onclick = () => zoom(1.25);
$("collapse").onclick = closePane;
document
  .querySelectorAll("[data-pane]")
  .forEach(
    (button) =>
      (button.onclick = () =>
        activePane === button.dataset.pane
          ? closePane()
          : openPane(button.dataset.pane)),
  );
// Two-point measurement is calculated in calibrated ground metres.
let measuring = false,
  measurePoints = [];
const measurementGroup = new THREE.Group();
scene.add(measurementGroup);
function clearMeasurement() {
  for (const o of [...measurementGroup.children]) {
    o.geometry?.dispose();
    o.material?.dispose();
    measurementGroup.remove(o);
  }
  measurePoints = [];
  $("measure-result").textContent = "Choose two points on the map.";
}
function stopMeasurement() {
  measuring = false;
  $("labels").style.pointerEvents = "";
  document
    .querySelectorAll(".map-label")
    .forEach((e) => (e.style.pointerEvents = ""));
  controls.enabled = true;
  $("measure-start").textContent = "Choose two map points";
  $("measure-start").setAttribute("aria-pressed", "false");
}
$("measure-start").onclick = () => {
  if (measuring) {
    stopMeasurement();
    return;
  }
  clearMeasurement();
  setView(true);
  measuring = true;
  document
    .querySelectorAll(".map-label")
    .forEach((e) => (e.style.pointerEvents = "none"));
  controls.enabled = false;
  $("measure-start").textContent = "Cancel measurement";
  $("measure-start").setAttribute("aria-pressed", "true");
  closePane();
  $("map-status").textContent = "Tap the first point. Tap Measure to cancel.";
};
$("measure-clear").onclick = () => {
  stopMeasurement();
  clearMeasurement();
  updateMapStatus();
};
const raycaster = new THREE.Raycaster(),
  groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down;

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (inCameraView) {
    // Fixed CCTV camera mount: non-movable viewport
    return;
  }
  down = [e.clientX, e.clientY];
});

window.addEventListener("pointermove", (e) => {
  if (inCameraView) {
    // Fixed CCTV camera mount: non-movable viewport
    return;
  }
});

window.addEventListener("pointerup", () => {
  if (inCameraView) isCamDragging = false;
});

renderer.domElement.addEventListener("pointerup", (e) => {
  if (inCameraView) {
    return;
  }
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7) return;
  raycaster.setFromCamera(
    new THREE.Vector2(
      (e.clientX / innerWidth) * 2 - 1,
      1 - (e.clientY / innerHeight) * 2,
    ),
    view,
  );
  if (measuring) {
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, point)) return;
    measurePoints.push(point.clone());
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xffde8f, depthTest: false }),
    );
    marker.position.copy(point).add(new THREE.Vector3(0, 0.7, 0));
    marker.renderOrder = 35;
    measurementGroup.add(marker);
    if (measurePoints.length === 1) {
      $("map-status").textContent = "Tap the second point.";
      return;
    }
    const geometry = new LineGeometry().setPositions(
      measurePoints.flatMap((p) => [p.x, 0.8, p.z]),
    );
    const material = new LineMaterial({
      color: 0xffde8f,
      linewidth: 4,
      depthTest: false,
    });
    material.resolution.set(innerWidth, innerHeight);
    const wire = new Line2(geometry, material);
    wire.renderOrder = 35;
    measurementGroup.add(wire);
    $("measure-result").textContent =
      measurePoints[0].distanceTo(measurePoints[1]).toFixed(1) +
      " m straight-line";
    stopMeasurement();
    updateMapStatus();
    openPane("measure");
    return;
  }
  const hit = raycaster.intersectObjects(
    pickables.filter((o) => {
      if (!o.visible) return false;
      const targetId = o.userData?.id;
      if (!targetId) return false;
      if (targetId.startsWith("switch-")) return $("switches").checked;
      if (
        targetId.startsWith("shed-") ||
        targetId === "kitchen" ||
        targetId === "network"
      ) {
        return $("buildings").checked;
      }
      if (targetId === "dp-1") return true;
      return $("camera-layer").checked;
    }),
  )[0];
  if (hit) {
    const id = hit.object.userData.id;
    select(id);
    if (cameras.some((c) => c.id === id)) {
      enterCameraView(id);
    }
  }
});

// Wheel zoom in camera view
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (inCameraView) {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.0015;
      camZoom = THREE.MathUtils.clamp(camZoom + zoomDelta, 1.0, 2.5);
      const cam = cameras.find((c) => c.id === activeCamId);
      if (cam) applyCameraFov(cam);
      const badge = $("cctv-zoom-badge");
      if (badge) badge.textContent = camZoom.toFixed(1) + "x";
    }
  },
  { passive: false },
);

// Mobile touch pinch zoom in camera view
renderer.domElement.addEventListener(
  "touchstart",
  (e) => {
    if (inCameraView && e.touches.length === 2) {
      touchStartDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  },
  { passive: true },
);
renderer.domElement.addEventListener(
  "touchmove",
  (e) => {
    if (inCameraView && e.touches.length === 2 && touchStartDistance > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const factor = dist / touchStartDistance;
      touchStartDistance = dist;
      camZoom = THREE.MathUtils.clamp(camZoom * factor, 1.0, 2.5);
      const cam = cameras.find((c) => c.id === activeCamId);
      if (cam) applyCameraFov(cam);
      const badge = $("cctv-zoom-badge");
      if (badge) badge.textContent = camZoom.toFixed(1) + "x";
    }
  },
  { passive: true },
);

const projected = new THREE.Vector3();
function updateLabels() {
  if (inCameraView) return;
  const occupied = [];
  const order = [...labels].sort(
    (a, b) =>
      Number(b.id === selected) - Number(a.id === selected) ||
      Number(a.kind === "camera") - Number(b.kind === "camera"),
  );
  for (const l of order) {
    projected.copy(l.position).project(view);
    let visible = $("names").checked && projected.z > -1 && projected.z < 1;
    if (l.kind === "camera" && !$("camera-layer").checked) visible = false;
    if (
      l.kind === "room" &&
      ($("roofs").checked || !$("interiors").checked || !$("buildings").checked)
    )
      visible = false;
    if (l.kind === "switch" && !$("switches").checked) visible = false;
    if (l.kind === "future" && !$("future-sheds").checked) visible = false;
    const anchorX = (projected.x * 0.5 + 0.5) * innerWidth,
      anchorY = (-projected.y * 0.5 + 0.5) * innerHeight;
    const width =
        l.kind === "camera"
          ? 40
          : Math.max(74, l.el.textContent.length * 7 + 18),
      height = 29;
    let placement = null;
    const offsets =
      l.kind === "camera"
        ? [
            [0, 0],
            [0, -33],
            [0, 33],
            [48, 0],
            [-48, 0],
            [48, -33],
          ]
        : [
            [0, 0],
            [0, -33],
          ];
    for (const [dx, dy] of offsets) {
      const x = anchorX + dx,
        y = anchorY + dy,
        rect = { x: x - width / 2, y: y - height / 2, w: width, h: height };
      const onScreen =
        x > width / 2 + 8 &&
        x < innerWidth - width / 2 - 8 &&
        y > 140 &&
        y < innerHeight - 100;
      const overlap = occupied.some(
        (r) =>
          rect.x < r.x + r.w + 4 &&
          rect.x + rect.w > r.x - 4 &&
          rect.y < r.y + r.h + 3 &&
          rect.y + rect.h > r.y - 3,
      );
      if (onScreen && !overlap) {
        placement = { x, y, rect, shifted: dx !== 0 || dy !== 0 };
        break;
      }
    }
    visible = visible && !!placement;
    l.el.style.display = visible ? "block" : "none";
    l.leader.style.display = visible && placement.shifted ? "block" : "none";
    if (visible) {
      l.el.style.left = placement.x + "px";
      l.el.style.top = placement.y + "px";
      occupied.push(placement.rect);
      for (const [key, value] of Object.entries({
        x1: anchorX,
        y1: anchorY,
        x2: placement.x,
        y2: placement.y,
      }))
        l.leader.setAttribute(key, value);
    }
  }
}
let animalTime = 0;
let lastFrameTime = 0;
let lastAnimalUpdate = 0;
function draw(frameTime = 0) {
  requestAnimationFrame(draw);
  const delta = Math.min(0.05, Math.max(0, (frameTime - lastFrameTime) / 1000));
  lastFrameTime = frameTime;
  if (
    $("animation").checked && !reducedMotion.matches &&
    (interiors.animalRoot.visible ||
      kitchenInterior.peopleRoot.visible ||
      environment.forestGroup.visible) &&
    document.visibilityState !== "hidden"
  )
    animalTime += delta;
  if (frameTime - lastAnimalUpdate >= 33) {
    if (interiors.animalRoot.visible) interiors.update(animalTime);
    if (kitchenInterior.peopleRoot.visible) kitchenInterior.update(animalTime);
    if (environment.update) environment.update(animalTime, view);
    lastAnimalUpdate = frameTime;
  }
  if (inCameraView) {
    updateCameraLook();
  } else {
    controls.autoRotate = $("rotate").getAttribute("aria-pressed") === "true" && $("animation").checked && !reducedMotion.matches;
    controls.update();
    // Keep navigation inside the supplied satellite coverage.
    const boundedTarget = controls.target.clone();
    boundedTarget.x = THREE.MathUtils.clamp(boundedTarget.x, -450, 450);
    boundedTarget.z = THREE.MathUtils.clamp(boundedTarget.z, -450, 450);
    boundedTarget.y = THREE.MathUtils.clamp(boundedTarget.y, 0, 20);
    const correction = boundedTarget.sub(controls.target);
    controls.target.add(correction);
    view.position.add(correction);

    // Ghibli atmospheric zoom-out fog: veils the distant perimeter and trees when zoomed out
    const camDist = view.position.distanceTo(controls.target);
    const zoomOutFactor = THREE.MathUtils.clamp((camDist - 65) / 220, 0, 1);
    scene.fog.near = THREE.MathUtils.lerp(240, 75, zoomOutFactor);
    scene.fog.far = THREE.MathUtils.lerp(950, 440, zoomOutFactor);

    updateLabels();
  }
  renderer.render(scene, view);
  if (!inCameraView) {
    const center = controls.target.clone().project(view),
      northPoint = controls.target
        .clone()
        .add(northDirection.clone().multiplyScalar(10))
        .project(view);
    const angle =
      (Math.atan2(
        (northPoint.x - center.x) * innerWidth,
        -(northPoint.y - center.y) * innerHeight,
      ) *
        180) /
      Math.PI;
    $("north-arrow").style.transform = "rotate(" + angle + "deg)";
  }
}
window.addEventListener("resize", () => {
  view.aspect = innerWidth / innerHeight;
  if (inCameraView && activeCamId) {
    const cam = cameras.find((c) => c.id === activeCamId);
    if (cam) applyCameraFov(cam);
  } else {
    view.updateProjectionMatrix();
  }
  renderer.setSize(innerWidth, innerHeight);
  lineMaterials.forEach((m) => m.resolution.set(innerWidth, innerHeight));
  measurementGroup.children.forEach((o) =>
    o.material?.resolution?.set(innerWidth, innerHeight),
  );
});
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  $("loading").textContent = "3D view paused. Reload this page to resume.";
  $("loading").classList.remove("hidden");
});
const cat6Total = routes
  .filter((r) => r.type === "cat6")
  .reduce((sum, r) => sum + r.length, 0);
const fibreLength = routes.find((r) => r.type === "fibre").length;
$("cable-totals").textContent =
  "Drawn routes total approximately " +
  Math.round(cat6Total) +
  " m of camera Cat 6 and " +
  Math.round(fibreLength) +
  " m of fibre. Future cable provisions are additional. These are model route lengths before installation slack.";
applyLayers();
$("cctv-prev-cam").onclick = () => stepCamera(-1);
$("cctv-next-cam").onclick = () => stepCamera(1);
$("cctv-reset-angle").onclick = resetCameraAngle;
$("cctv-exit-btn").onclick = exitCameraView;
setupCCTVDropdown();

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const ddPanel = $("cctv-dropdown-panel");
    if (ddPanel && !ddPanel.classList.contains("hidden")) {
      ddPanel.classList.add("hidden");
      const ddBackdrop = $("cctv-dropdown-backdrop");
      if (ddBackdrop) ddBackdrop.classList.add("hidden");
      const ddBtn = $("cctv-dropdown-btn");
      if (ddBtn) ddBtn.setAttribute("aria-expanded", "false");
      return;
    }
    if (inCameraView) exitCameraView();
  } else if (inCameraView) {
    if (e.key === "ArrowLeft") stepCamera(-1);
    if (e.key === "ArrowRight") stepCamera(1);
  }
});

$("loading").classList.add("hidden");
draw();
window.farmModel = {
  get rendering() {
    return {calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      pixelRatio: renderer.getPixelRatio(), forest: environment.forest.stats(),
      camera: view.position.toArray(), target: controls.target.toArray(),
      reducedMotion: reducedMotion.matches,
      shaderErrors: renderer.info.programs.filter(p => p.diagnostics && !p.diagnostics.runnable).length};
  },
  cameraCount: cameras.length,
  cameraPositions: cameras.map((camera) => ({
    id: camera.id,
    position: camera.point.toArray(),
    direction: camera.direction.toArray(),
  })),
  gatePosition: gate.toArray(),
  networkPosition: network.group.position.toArray(),
  originalNetworkPosition: pos(341, 928).toArray(),
  peopleCount: kitchenInterior.peopleCount,
  routeCount: routes.length,
  buildings: Object.keys(buildings),
  mapScale,
  cageCounts: interiors.counts,
  cageCount: interiors.enclosures.length,
  pigCount: interiors.pigCount,
  chickenCount: interiors.chickenCount,
  switchPositions: Object.values(roofSwitches).map((item) =>
    item.group.position.toArray(),
  ),
  routes: routes.map((r) => ({
    id: r.id,
    length: r.length,
    type: r.type,
    start: r.points[0].toArray(),
    end: r.points[r.points.length - 1].toArray(),
    switchIds: r.switchIds,
  })),
  registration,
  coordinates,
};
