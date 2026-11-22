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
  for (let i = 0; i < 2; i++) {
    const person = new THREE.Group();
    peopleRoot.add(person);
    const clothing = material(i ? 0xc49650 : 0x3c8e91);
    const trousers = material(0x38475a);
    const skin = material(i ? 0x9d7456 : 0xb78b68);
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.19, 0.58, 10),
      clothing,
    );
    torso.position.y = 1.08;
    torso.castShadow = true;
    person.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), skin);
    head.position.y = 1.55;
    person.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      dark,
    );
    hair.position.y = 1.58;
    person.add(hair);
    const joints = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.81, 0);
      person.add(leg);
      block(leg, [0.14, 0.64, 0.16], [0, -0.32, 0], trousers);
      block(leg, [0.16, 0.12, 0.27], [0, -0.68, 0.045], dark);
      const arm = new THREE.Group();
      arm.position.set(side * 0.28, 1.32, 0);
      person.add(arm);
      block(arm, [0.11, 0.48, 0.12], [0, -0.24, 0], clothing);
      block(arm, [0.1, 0.14, 0.1], [0, -0.53, 0], skin);
      joints.push({ leg, arm, side });
    }
    walkers.push({ person, joints, phase: i * Math.PI });
  }
  function update(time) {
    for (const walker of walkers) {
      const phase = time * 0.48 + walker.phase;
      const x = 2.15 + 0.72 * Math.cos(phase);
      const z = 1.4 * Math.sin(phase);
      walker.person.position.set(x, 0.23, z);
      walker.person.rotation.y = Math.atan2(
        -0.72 * Math.sin(phase),
        1.4 * Math.cos(phase),
      );
      for (const joint of walker.joints) {
        const stride = Math.sin(time * 4 + walker.phase) * 0.4 * joint.side;
        joint.leg.rotation.x = stride;
        joint.arm.rotation.x = -stride * 0.8;
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
