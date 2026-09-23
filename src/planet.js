import * as THREE from 'three';

const DEG = Math.PI / 180;

// Real periods range from 88 days to 165 years (orbit) and from 10 hours to
// 243 days (spin). Taking the square root of each period relative to Earth's
// squeezes that range so Neptune visibly moves while Mercury doesn't blur,
// yet the ordering stays true.
const EARTH_YEAR_SECONDS = 20;
const EARTH_DAY_SECONDS = 4;

// Saturn's main rings (C ring to the outer edge of the A ring), in Saturn radii.
const RING_INNER = 1.24;
const RING_OUTER = 2.27;

export class Planet {
  constructor(data, textureLoader, anisotropy) {
    this.name = data.name;
    this.radius = data.radius;
    this.data = data;

    this.orbitSpeed = (2 * Math.PI) / (EARTH_YEAR_SECONDS * Math.sqrt(data.orbitDays / 365.26));
    this.spinSpeed = (2 * Math.PI) / (EARTH_DAY_SECONDS * Math.sqrt(data.dayHours / 23.93));
    this.startAngle = Math.random() * 2 * Math.PI;

    const texture = textureLoader.load(`textures/${data.texture}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;

    // Carried around the Sun by position only, never rotated, so the spin
    // axis keeps pointing the same way in space all year round (seasons).
    this.anchor = new THREE.Object3D();

    const tilt = new THREE.Object3D();
    tilt.rotation.z = data.tiltDeg * DEG;
    this.anchor.add(tilt);

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(data.radius, 64, 32),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    tilt.add(this.mesh);

    this.pickables = [this.mesh];
    if (data.rings) {
      const rings = createRings(data.radius, anisotropy);
      tilt.add(rings);
      this.pickables.push(rings);
    }

    this.orbitLine = createOrbitLine(data.distance);
  }

  update(time) {
    const angle = this.startAngle + time * this.orbitSpeed;
    const d = this.data.distance;
    // Counter-clockwise when seen from above (+y), like the real planets.
    this.anchor.position.set(Math.cos(angle) * d, 0, -Math.sin(angle) * d);
    this.mesh.rotation.y = time * this.spinSpeed;
  }

  setHighlighted(on) {
    this.orbitLine.material.opacity = on ? 0.6 : 0.22;
  }
}

function createOrbitLine(radius) {
  const points = [];
  const segments = 256;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x8fa8d0, transparent: true, opacity: 0.22, depthWrite: false })
  );
}

function createRings(planetRadius, anisotropy) {
  const inner = planetRadius * RING_INNER;
  const outer = planetRadius * RING_OUTER;
  const geometry = new THREE.RingGeometry(inner, outer, 180, 4);

  // RingGeometry's UVs are a flat projection; remap u to run from the inner
  // to the outer edge so the 1D band texture wraps round as circles.
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }

  const texture = createRingTexture();
  texture.anisotropy = anisotropy;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    // Real rings scatter a lot of light even when the Sun grazes them;
    // a little self-illumination stands in for that so they never vanish.
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.3,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });

  const rings = new THREE.Mesh(geometry, material);
  rings.rotation.x = -Math.PI / 2;
  rings.castShadow = true;
  rings.receiveShadow = true;
  return rings;
}

// Radial brightness/opacity profile of the C, B and A rings with the Cassini
// division and Encke gap, plus seeded noise for fine ringlet structure.
function createRingTexture() {
  const width = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, 1);

  let seed = 12345;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let ringlet = 0.5;

  for (let x = 0; x < width; x++) {
    const r = RING_INNER + ((x + 0.5) / width) * (RING_OUTER - RING_INNER);
    let alpha;
    let brightness;
    if (r < 1.53) {
      alpha = 0.18 + 0.25 * ((r - RING_INNER) / (1.53 - RING_INNER)); // C ring
      brightness = 0.55;
    } else if (r < 1.95) {
      alpha = 0.92; // B ring
      brightness = 1;
    } else if (r < 2.03) {
      alpha = 0.06; // Cassini division
      brightness = 0.5;
    } else if (r > 2.205 && r < 2.22) {
      alpha = 0.08; // Encke gap
      brightness = 0.6;
    } else {
      alpha = 0.72; // A ring
      brightness = 0.85;
    }

    ringlet = ringlet * 0.8 + random() * 0.2;
    alpha *= 0.75 + 0.35 * ringlet;
    brightness *= 0.85 + 0.2 * ringlet;

    // Soften the inner and outer edges.
    const t = x / (width - 1);
    alpha *= Math.min(1, t / 0.02, (1 - t) / 0.01);

    const i = x * 4;
    image.data[i] = Math.min(255, 228 * brightness);
    image.data[i + 1] = Math.min(255, 210 * brightness);
    image.data[i + 2] = Math.min(255, 176 * brightness);
    image.data[i + 3] = Math.max(0, Math.min(255, alpha * 255));
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
