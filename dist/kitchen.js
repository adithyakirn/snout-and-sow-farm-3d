import * as THREE from "three";

export function createKitchenInterior(kitchen) {
  const interior = new THREE.Group();
  const peopleRoot = new THREE.Group();
  kitchen.group.add(interior, peopleRoot);
  const material = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const wall = material(0xc3c9bd);
  const steel = material(0x9ca9a5);
  const wood = material(0xb29b71);
  const dark = material(0x293837);
  function block(parent, dimensions, position, surface) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), surface);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // Equal halves are an illustrative interpretation of the two-room layout.
  block(interior, [4.3, 0.035, 5.6], [-2.2, 0.22, 0], material(0x91a9ad));
  block(interior, [4.3, 0.035, 5.6], [2.2, 0.22, 0], material(0xc0ab7f));
  for (const side of [-1, 1])
    block(interior, [0.12, 2.45, 2.3], [0, 1.43, side * 1.75], wall);
  block(interior, [0.15, 0.35, 1.2], [0, 2.48, 0], wall);
  // Medicine shelves in the left room.
  block(interior, [0.6, 2.1, 4.6], [-3.95, 1.3, 0], steel);
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 0.68 + shelf * 0.57;
    block(interior, [0.7, 0.07, 4.6], [-3.9, y, 0], wood);
    for (let bottle = 0; bottle < 7; bottle++) {
      block(
        interior,
        [0.22, 0.28, 0.25],
        [-3.5, y + 0.18, -1.8 + bottle * 0.6],
        material(bottle % 2 ? 0xe4eee4 : 0x90b6af),
      );
    }
  }
  // Counter and two stove rings in the right-hand kitchen room.
  block(interior, [0.7, 0.82, 4.7], [3.9, 0.65, 0], wood);
  block(interior, [0.85, 0.07, 4.8], [3.85, 1.1, 0], steel);
  for (const z of [-1.25, -0.45]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.04, 6, 16),
      dark,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(3.85, 1.15, z);
    interior.add(ring);
  }
  block(interior, [0.55, 0.08, 0.85], [3.85, 1.13, 1.4], dark);

  const walkers = [];
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

  const ghibliMat = (
    color,
    roughness = 0.85,
    emissive = 0x000000,
    emissiveIntensity = 0.08,
  ) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonRamp(),
      emissive,
      emissiveIntensity,
    });

  const animeSkin = ghibliMat(0xfae2cf, 0.88, 0x3d2015, 0.12);
  const animeBlush = ghibliMat(0xf28e80, 0.9, 0x48100e, 0.22);
  const animeEye = ghibliMat(0x1a1210, 0.2);
  const animeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const strawHat = ghibliMat(0xdfbc6a, 0.85);
  const hatRibbon = ghibliMat(0xb84232, 0.8);
  const newsboyCap = ghibliMat(0xc55c43, 0.85);
  const cookShirt = ghibliMat(0x4d8a7c, 0.85);
  const cookApron = ghibliMat(0xf4eedb, 0.9);
  const specialistShirt = ghibliMat(0xd89e44, 0.85);
  const dungarees = ghibliMat(0x34485e, 0.85);
  const trousers = ghibliMat(0x3a4a5c, 0.85);
  const leatherBoot = ghibliMat(0x4d382b, 0.8);
  const darkBoot = ghibliMat(0x3d2d24, 0.8);
  const hairDark = ghibliMat(0x281c17, 0.85);
  const hairChestnut = ghibliMat(0x3a281f, 0.85);

  for (let i = 0; i < 2; i++) {
    const person = new THREE.Group();
    peopleRoot.add(person);

    const isCook = i === 0;
    const shirt = isCook ? cookShirt : specialistShirt;
    const pants = isCook ? trousers : dungarees;
    const boots = isCook ? leatherBoot : darkBoot;
    const hair = isCook ? hairChestnut : hairDark;

    // Rounded torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.19, 0.58, 12),
      shirt,
    );
    torso.position.y = 1.08;
    torso.castShadow = true;
    person.add(torso);

    if (isCook) {
      // Natural linen bib apron
      block(torso, [0.28, 0.46, 0.05], [0, 0.02, 0.18], cookApron);
      block(torso, [0.38, 0.06, 0.04], [0, -0.12, 0], cookApron);
    } else {
      // Dungarees bib and straps
      block(torso, [0.26, 0.38, 0.05], [0, -0.04, 0.18], dungarees);
      block(torso, [0.06, 0.48, 0.04], [-0.1, 0.05, 0.16], dungarees);
      block(torso, [0.06, 0.48, 0.04], [0.1, 0.05, 0.16], dungarees);
    }

    // Anime head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), animeSkin);
    head.position.y = 1.55;
    person.add(head);

    // Rosy anime blush cheeks
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        animeBlush,
      );
      blush.position.set(side * 0.11, 1.51, 0.12);
      blush.scale.set(1, 0.7, 0.4);
      person.add(blush);
    }

    // Expressive anime eyes with catchlights
    for (const side of [-1, 1]) {
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        animeEye,
      );
      pupil.position.set(side * 0.075, 1.56, 0.14);
      person.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        animeGlint,
      );
      glint.position.set(side * 0.078 + 0.003, 1.568, 0.155);
      person.add(glint);
    }

    // Anime hair tufts
    const bangs = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hair,
    );
    bangs.position.set(0, 1.57, 0.02);
    person.add(bangs);

    if (isCook) {
      // Classic Ghibli straw sun hat
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.025, 16),
        strawHat,
      );
      brim.position.set(0, 1.69, 0);
      person.add(brim);

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.18, 0.12, 16),
        strawHat,
      );
      crown.position.set(0, 1.76, 0);
      person.add(crown);

      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175, 0.182, 0.035, 16),
        hatRibbon,
      );
      ribbon.position.set(0, 1.72, 0);
      person.add(ribbon);
    } else {
      // Ghibli newsboy / work cap in warm rust
      const capCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 12, 8),
        newsboyCap,
      );
      capCrown.scale.set(1.05, 0.75, 1.05);
      capCrown.position.set(0, 1.68, -0.01);
      person.add(capCrown);

      const visor = block(person, [0.22, 0.025, 0.14], [0, 1.66, 0.16], newsboyCap);
      visor.rotation.x = 0.18;
    }

    const joints = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.81, 0);
      person.add(leg);

      block(leg, [0.14, 0.58, 0.16], [0, -0.29, 0], pants);
      if (isCook) block(leg, [0.15, 0.07, 0.17], [0, -0.58, 0], cookApron);
      block(leg, [0.16, 0.14, 0.26], [0, -0.66, 0.04], boots);

      const arm = new THREE.Group();
      arm.position.set(side * 0.27, 1.32, 0);
      person.add(arm);

      block(arm, [0.12, 0.42, 0.12], [0, -0.21, 0], shirt);
      if (isCook) block(arm, [0.13, 0.05, 0.13], [0, -0.42, 0], cookApron);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        animeSkin,
      );
      hand.position.set(0, -0.48, 0);
      arm.add(hand);

      joints.push({ leg, arm, side });
    }
    walkers.push({ person, joints, phase: i * Math.PI });
  }
  function update(time) {
    for (const walker of walkers) {
      const phase = time * 0.48 + walker.phase;
      const x = 2.15 + 0.72 * Math.cos(phase);
      const z = 1.4 * Math.sin(phase);

      // Miyazaki springy walking bounce
      const bounce = Math.abs(Math.sin(time * 4.5 + walker.phase)) * 0.035;
      walker.person.position.set(x, 0.23 + bounce, z);

      walker.person.rotation.y = Math.atan2(
        -0.72 * Math.sin(phase),
        1.4 * Math.cos(phase),
      );
      walker.person.rotation.z =
        Math.sin(time * 4.5 + walker.phase) * 0.025;

      for (const joint of walker.joints) {
        const stride = Math.sin(time * 4.5 + walker.phase) * 0.42 * joint.side;
        joint.leg.rotation.x = stride;
        joint.arm.rotation.x = -stride * 0.85;
      }
    }
  }
  update(0);
  return {
    interior,
    peopleRoot,
    walkers,
    update,
    peopleCount: walkers.length,
    medicineCentre: kitchen.point(-2.2, 0, 0.3),
    kitchenCentre: kitchen.point(2.2, 0, 0.3),
  };
}
