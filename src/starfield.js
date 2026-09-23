import * as THREE from 'three';

// Faint blue-white to warm orange, roughly the spread of real star colours.
const STAR_TINTS = [0xffffff, 0xdbe6ff, 0xb5caff, 0xfff1d6, 0xffd6a6];

// A few layers of fixed-pixel-size points on a distant shell: many dim,
// small stars and a handful of bright ones.
export function createStarfield(texture) {
  const group = new THREE.Group();
  const layers = [
    { count: 5000, size: 1.6, brightness: 0.55 },
    { count: 1400, size: 2.6, brightness: 0.8 },
    { count: 220, size: 4, brightness: 1 },
  ];
  const color = new THREE.Color();
  const direction = new THREE.Vector3();

  for (const { count, size, brightness } of layers) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      direction.randomDirection().multiplyScalar(700 + Math.random() * 300);
      direction.toArray(positions, i * 3);
      color
        .set(STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)])
        .multiplyScalar(brightness * (0.4 + 0.6 * Math.random()));
      color.toArray(colors, i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size,
      sizeAttenuation: false,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Points(geometry, material));
  }
  return group;
}
