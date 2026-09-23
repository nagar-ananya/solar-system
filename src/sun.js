import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Animated granulation: two layers of 3D value noise sampled on the sphere
// surface (so there's no texture seam or pole pinching), mapped onto a
// deep-orange → orange → white-hot ramp, with limb darkening at the edges.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uHot;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 p = normalize(vPosition) * 4.0;
    float large = fbm(p + vec3(0.0, uTime * 0.04, uTime * 0.02));
    float small = fbm(p * 3.0 - vec3(uTime * 0.09));
    float heat = clamp(large * 0.75 + small * 0.45, 0.0, 1.0);

    vec3 color = mix(uDeep, uMid, smoothstep(0.25, 0.6, heat));
    color = mix(color, uHot, smoothstep(0.6, 0.9, heat));

    float mu = clamp(dot(vNormal, vViewDir), 0.0, 1.0);
    color *= 0.6 + 0.4 * sqrt(mu);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 230, 170, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 190, 90, 0.7)');
  gradient.addColorStop(0.4, 'rgba(255, 130, 30, 0.22)');
  gradient.addColorStop(0.7, 'rgba(255, 90, 10, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSun(radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0xc03d00) },
      uMid: { value: new THREE.Color(0xff9a1f) },
      uHot: { value: new THREE.Color(0xfff4c2) },
    },
    vertexShader,
    fragmentShader,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), material);

  // A billboard behind the disc; the opaque sphere hides its centre, so only
  // the halo around the edge shows.
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.setScalar(radius * 7);

  const group = new THREE.Group();
  group.add(mesh, glow);

  return {
    group,
    mesh,
    update(time) {
      material.uniforms.uTime.value = time;
      mesh.rotation.y = time * 0.05;
    },
  };
}
