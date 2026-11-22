# Snout & Sow Farm Atlas

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black.svg)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](dist/vendor/THREE-LICENSE.txt)
[![Build: Zero--Config](https://img.shields.io/badge/build-zero--config-orange.svg)](#run-locally)
[![Mobile: First](https://img.shields.io/badge/mobile-first-purple.svg)](#touch-and-desktop-controls)

A mobile-first 3D farm infrastructure and CCTV planning viewer built with **Three.js**. Features calibrated satellite imagery, interactive building shells, 12 camera positions with visual lines of sight, full network cable run telemetry, interior shed layouts with instanced animated livestock, and an interactive ground measurement tool.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Run Locally](#run-locally)
  - [Mobile & iPhone Access](#mobile--iphone-access)
  - [Code Verification](#code-verification)
- [Controls & Navigation](#controls--navigation)
- [Site Plan & Camera Allocation](#site-plan--camera-allocation)
- [Cabling & Network Topology](#cabling--network-topology)
- [Interior Layouts & Livestock](#interior-layouts--livestock)
- [Project Architecture](#project-architecture)
- [Deployment](#deployment)
- [Geographic Basis & Survey Notes](#geographic-basis--survey-notes)
- [Attribution & Licenses](#attribution--licenses)

---

## Features

- **3D Forest, Trees & Ground Terrain**: Replaces flat 2D satellite photo tiles with native Three.js 3D procedural terrain and over 1,500 individual 3D trees and coconut palms positioned exactly from high-resolution satellite imagery. Features a warm dirt farm yard, driveway avenues, concrete shed aprons, surrounding agricultural plots, a 3D perimeter fence with an iron entrance gate, and gentle wind breeze animations rendered via high-performance InstancedMesh (5 draw calls).
- **12-Camera CCTV Network**: Interactive camera models with direction arrows, coordinates, connection highlights, and calculated cable route lengths.
- **First-Person Camera Viewport**: Tap any camera to inspect its live viewport. Accurately simulates fixed-mount CCTV units: 2.8 mm wide-angle dome cameras (~103° HFOV) and 4.0 mm bullet cameras (~79° HFOV for G1, C2, and K2). Interior shed cameras are pitched downward along central aisles and pens with dedicated illumination and automatic roof clearance, featuring a live CCTV HUD, digital zoom, and rapid feed switching.
- **Detailed Cable Routing**: Distinct visible roof switches, individual camera drops, inter-switch fibre links, and future expansion provisions.
- **Interactive Building Shells**: Toggle between exterior overhead roofs and interior inspection mode ("Inside" view) for sheds and facilities.
- **Instanced Animated Livestock**: 3D animated pigs and chickens rendered using Three.js instanced meshes for fast 60 FPS mobile rendering.
- **Real-Time Ground Measurement**: Two-point surface distance measurement tool in metres for on-site cable and clearance estimation.
- **Granular Layer Controls**: Toggle 3D terrain, roofs, shells, cameras, viewing arrows, wiring types, labels, grid, and animals with auto-saved browser preferences.
- **Zero-Build & Zero-Dependency**: Pure vanilla ES modules—no bundlers (Webpack/Vite) or npm dependencies required to run.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18.0.0 or higher.

### Run Locally

1. Clone or download this repository:
   ```sh
   git clone https://github.com/adithyakirn/snout-and-sow-farm-3d.git
   cd snout-and-sow-farm-3d
   ```

2. Start the built-in HTTP server:
   ```sh
   npm start
   ```

3. Open **[http://localhost:8080](http://localhost:8080)** in your web browser.

> [!NOTE]
> Opening `dist/index.html` directly via `file://` will be blocked by browser CORS security policies for ES modules. Always run a local server or host statically.

### Mobile & iPhone Access

1. Ensure your phone and development computer are connected to the same Wi-Fi network.
2. Find your computer's local IP address (e.g. `192.168.1.20`).
3. Open Safari or Chrome on your mobile device and navigate to:
   ```text
   http://<YOUR-LOCAL-IP>:8080
   ```
   *(e.g., `http://192.168.1.20:8080`)*

### Code Verification

Run syntax checks across all modules without running a test runner:
```sh
npm run check
```

---

## Controls & Navigation

The viewer seamlessly switches between a full 3D orbital perspective and a 2D north-up satellite view.

| Action | Touch Gestures (Mobile/Tablet) | Mouse & Keyboard (Desktop) |
| :--- | :--- | :--- |
| **Orbit / Rotate** | One-finger drag | Left-click + drag |
| **Pan** | Two-finger drag | Right-click + drag *(or Shift + Left-click)* |
| **Zoom** | Pinch in / out | Mouse wheel scroll |
| **Overhead 2D View** | One-finger drag *(locked North-up)* | Left-click + drag *(locked North-up)* |
| **Select Object** | Tap camera, switch, or shed | Left-click |
| **Measure Distance** | Tap **Measure**, zoom in, tap 2 points | Click **Measure**, click 2 points |

### Layer Controls

The expandable **Layers** panel allows toggling specific scene elements on and off:
- **Forest**: Decorative Ghibli-styled planting and palms.
- **3D Ground & compound**: Toggles dirt yard, pathways, fences, aprons and compound floor.
- **Roofs / Shells**: Show/hide building structures or see through to the ground.
- **Cameras & Arrows**: Toggles camera bodies and direction cone vectors.
- **Cat 6 / Fibre / Future Cables**: Isolates specific network segments.
- **Animals & People**: Toggles animated livestock and personnel.
- **Animation / Movement**: Pauses or resumes all scene animations to conserve battery.

*(All layer states are saved to your browser's `localStorage` across reloads).*

---

## Site Plan & Camera Allocation

| Location | Camera Count | Hardware & Lens Spec | Identifiers & Coverage |
| :--- | :---: | :--- | :--- |
| **Shed A** | 4 | 2.8 mm Dome (103° Wide View) | A1–A4: 2 cameras at each end in the two footpaths (tilted down over pens and walkways). |
| **Shed B** | 2 | 2.8 mm Dome (103° Wide View) | B1–B2: Primary entrance and lengthwise corridor view. |
| **Shed C** | 2 | C1: 2.8 mm Dome · C2: 4.0 mm Bullet | **C1** faces inward along pen row; **C2** monitors network room and gate path. |
| **Shed D** | 1 | 2.8 mm Dome (103° Wide View) | D1: Open chicken enclosure coverage. |
| **Main Gate** | 1 | 4.0 mm Bullet (79° Focused View) | **G1** mounted at the corner of Shed A, oriented directly toward the entry gate. |
| **Kitchen & Storage** | 2 | K1: 2.8 mm Dome · K2: 4.0 mm Bullet | **K1** interior workspace overview; **K2** exterior corner facing the gate. |
| **Upcoming Sheds A & B** | 0 | Spare Conduit Provision | Cable provisioning only (pre-drawn conduit and pull points). |

### Camera Models and Viewport Optics

- **Dome Cameras (2.8 mm Focal Length)**: Deployed across Sheds A, B, C (C1), D (D1), and Kitchen interior (K1). Feature circular ceiling/eave base collars, dark smoked dome bubbles, and an inner turret eye providing a wide ~103° horizontal field of view.
- **Bullet Cameras (4.0 mm Focal Length)**: Deployed at Gate (G1), Shed C yard approach (C2), and Kitchen exterior (K2). Feature cylindrical housings, protective sunshields, front glass faceplates, and articulated mounting brackets providing a narrower ~79° horizontal field of view for outdoor perimeter distance.

---

## Cabling & Network Topology

The farm installation is split across two central distribution switches:
- **Switch 1**: Located on the Network / CCTV Room roof.
- **Switch 2**: Located on the Shed A roof.

Each camera connects to an assigned visible switch port, follows a roof lead to the eave, and descends to ground trenching/conduit routes. Selecting any camera or switch highlights its full circuit path and calculates physical path length.

```
+---------------------------+             Fibre Trunk (Gold)             +---------------------------+
|    Network Room Roof      |============================================|       Shed A Roof         |
|        (Switch 1)         |                                            |        (Switch 2)         |
+---------------------------+                                            +---------------------------+
       |             |                                                          |             |
   Cat 6 (Cyan)  Cat 6 (Cyan)                                               Cat 6 (Cyan)  Cat 6 (Cyan)
       v             v                                                          v             v
  [Gate / K1-K2]  [Shed D]                                                   [Shed A 1-4]  [Sheds B & C]
       |
  (Future Provision: Dashed Green) ---> [Upcoming Sheds A & B]
```

### Cable Color Legend

- <span style="color:#00ffff; font-weight:bold;">Cyan</span>: **Cat 6 UTP/STP** — Individual runs from switches to IP cameras with live length telemetry.
- <span style="color:#ffd700; font-weight:bold;">Gold</span>: **Fibre Optic Backbone** — High-throughput inter-switch link connecting Switch 1 and Switch 2.
- <span style="color:#00ff00; font-weight:bold;">Dashed Green</span>: **Future Provisions** — Pre-planned cable routes for upcoming shed expansions.

---

## Interior Layouts & Livestock

Click **Inside** in the view bar to toggle roofs and inspect building interiors:

- **Shed A**: 68 individual pens arranged in 4 rows flanking two longitudinal footpaths (North and South footpaths).
- **Shed B**: 19 pens total (rows of 10 and 9 flanking a central walkway).
- **Shed C**: 20 pens total (two parallel rows of 10).
- **Shed D**: Large open-air free-range chicken enclosure.
- **Kitchen & Medicine Storage**: Partitioned building with medical storage on the left, kitchen counters on the right, and walking personnel.
- **Performance**: Livestock (illustrative pigs and 16 chickens) are rendered via instanced geometry and simple vertex keyframes to maintain smooth frame rates on mobile hardware.

---

## Project Architecture

```
snout-sow-farm/
├── dist/
│   ├── index.html          # Application entry point, responsive UI & import map
│   ├── style.css           # Mobile-first CSS, HUD overlays, panel styling
│   ├── app.js              # Three.js scene, map registration, cameras, cables, measurements
│   ├── interiors.js        # Internal shed partitions, cage geometry, animated livestock
│   ├── kitchen.js          # Kitchen room partitions, fixtures, animated personnel
│   ├── environment.js      # 3D procedural ground terrain, compound fence/gate, InstancedMesh forest
│   ├── tree-data.js        # Exact satellite-derived coordinates and classifications for 1,500+ trees
│   ├── tiles/              # Satellite imagery tiles (optional overlay)
│   │   ├── *.jpg           # 9 zoom-18 tiles covering the farm core
│   │   └── context/        # 25 zoom-16 tiles covering surrounding ~3 km area
│   └── vendor/             # Bundled zero-dependency vendor files
│       ├── three.module.js # Three.js r170 core library
│       ├── OrbitControls.js# Touch/mouse camera controls
│       └── Line2.js        # Thick-line rendering for cables and measure tool
├── server.mjs              # Lightweight zero-dependency Node.js HTTP static server
├── package.json            # Scripts and engine requirements (Node >= 18)
├── THIRD_PARTY_NOTICES.md  # Satellite imagery and Three.js licensing attributions
└── README.md               # Project documentation
```

---

## Deployment

Because all dependencies, tiles, and modules are bundled inside `dist/`, the project can be hosted on any static file server or hosting provider:

### GitHub Pages
1. Go to repository **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
3. Select your branch and set the folder to `/dist` (or deploy via a GitHub Action).

### Other Static Hosts (Vercel, Netlify, Cloudflare Pages)
- Set the publish directory / root directory to `dist`.
- No build command required (`npm run build` is not needed).

---

## Geographic Basis & Survey Notes

- **Reference Coordinates**: `12.237876, 76.137735`
- **Imagery Source**: Esri World Imagery (Web Mercator projection).
- **Scale Calibration**: Ground scale is calibrated using latitude and tile resolution.
- **On-Site Installation Notice**:
  - Terrain is treated as planar for baseline planning.
  - Building shells, support columns, roof pitches, and camera mounts are illustrative planning models.
  - Route measurements represent drawn 3D paths including vertical riser runs. Add standard on-site installation slack (10–15%) when ordering physical cabling.

---

## Attribution & Licenses

- **Code**: Licensed under the [MIT License](dist/vendor/THREE-LICENSE.txt).
- **Three.js**: Copyright © 2010-2026 Three.js Authors. Released under the MIT License.
- **Satellite Imagery**: Esri World Imagery. Attribution: *“Esri, Vantor, Earthstar Geographics, and the GIS User Community”*. Imagery terms apply. Please retain attribution overlays when hosting.
