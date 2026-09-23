import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SUN, PLANETS } from './data.js';
import { createSun } from './sun.js';
import { Planet } from './planet.js';
import { createStarfield } from './starfield.js';
import './style.css';

const OVERVIEW_POSITION = new THREE.Vector3(0, 48, 98);

// Back the camera off on narrow (portrait) screens so Neptune's orbit still fits.
function overviewPosition(target = new THREE.Vector3()) {
  return target.copy(OVERVIEW_POSITION).multiplyScalar(Math.max(1, 1.2 / camera.aspect));
}

// --- Renderers -------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#scene'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.className = 'labels';
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
overviewPosition(camera.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = SUN.radius * 1.6;
controls.maxDistance = 350;

// --- Lights ----------------------------------------------------------------

// The Sun is the only real light source. No distance falloff (decay 0) so
// the outer planets stay as well lit as the inner ones; the compressed
// distances would otherwise leave Neptune almost black.
const sunLight = new THREE.PointLight(0xfff6ea, 3.4, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = SUN.radius;
sunLight.shadow.camera.far = 120;
sunLight.shadow.bias = -0.0005;
sunLight.shadow.radius = 3;
scene.add(sunLight);

// Just enough fill to make out the night sides.
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// --- Bodies ----------------------------------------------------------------

const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => document.querySelector('#loading').classList.add('done');
loadingManager.onError = (url) => console.error(`Failed to load ${url}`);
const textureLoader = new THREE.TextureLoader(loadingManager);
const anisotropy = renderer.capabilities.getMaxAnisotropy();

const starTexture = textureLoader.load('textures/star.png');
scene.add(createStarfield(starTexture));

const sun = createSun(SUN.radius);
scene.add(sun.group);
const sunBody = {
  name: SUN.name,
  radius: SUN.radius,
  facts: SUN.facts,
  anchor: sun.group,
  pickables: [sun.mesh],
};

const planets = PLANETS.map((data) => new Planet(data, textureLoader, anisotropy));
for (const planet of planets) {
  planet.facts = planetFacts(planet.data);
  scene.add(planet.anchor, planet.orbitLine);
}

const bodies = [sunBody, ...planets];
const pickables = [];
for (const body of bodies) {
  for (const object of body.pickables) {
    object.userData.body = body;
    pickables.push(object);
  }
  addLabel(body);
}

function addLabel(body) {
  const element = document.createElement('button');
  element.className = 'label';
  element.textContent = body.name;
  element.addEventListener('click', () => focusOn(body));
  const label = new CSS2DObject(element);
  label.center.set(0.5, 1);
  label.position.y = body.radius * 1.25 + 0.3;
  body.anchor.add(label);
}

function planetFacts(data) {
  return [
    ['Distance from Sun', `${data.distanceAU} AU`],
    ['Year', formatDays(data.orbitDays)],
    ['Day', data.dayHours > 48 ? formatDays(data.dayHours / 24) : `${data.dayHours} hours`],
    ['Axial tilt', `${data.tiltDeg}°`],
    ['Diameter', `${data.diameterKm.toLocaleString('en-US')} km`],
  ];
}

function formatDays(days) {
  return days > 730 ? `${(days / 365.26).toFixed(1)} Earth years` : `${Math.round(days)} Earth days`;
}

// --- Camera focus ----------------------------------------------------------

// The camera follows the focused body: each frame it's shifted by however
// far the body moved, so the user can still orbit/zoom around it freely.
// Right after a new focus it also eases in to a good viewing distance.
let focus = sunBody;
let flying = false;
const lastFocusPosition = new THREE.Vector3();
const focusPosition = new THREE.Vector3();
const offset = new THREE.Vector3();
const viewDirection = new THREE.Vector3();

function focusOn(body) {
  if (focus !== sunBody) focus.setHighlighted(false);
  focus = body;
  flying = true;
  body.anchor.getWorldPosition(lastFocusPosition);
  controls.minDistance = body.radius * 1.6;
  if (body !== sunBody) body.setHighlighted(true);
  updateFocusUi();
}

function updateCamera(dt) {
  focus.anchor.getWorldPosition(focusPosition);
  offset.subVectors(focusPosition, lastFocusPosition);
  camera.position.add(offset);
  controls.target.add(offset);
  lastFocusPosition.copy(focusPosition);

  if (!flying) return;
  const k = 1 - Math.exp(-dt * 3);

  let targetDistance;
  if (focus === sunBody) {
    targetDistance = overviewPosition(viewDirection).length();
    viewDirection.normalize();
  } else {
    // Look at the planet from slightly above and off to the Sun's side, so
    // it's seen mostly lit rather than as a dark silhouette.
    viewDirection
      .copy(focusPosition)
      .negate()
      .normalize()
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.9)
      .setY(0.35)
      .normalize();
    targetDistance = focus.radius * 5;
  }

  // Ease direction and distance separately (rather than lerping positions)
  // so the camera swings around the target instead of cutting through it.
  offset.subVectors(camera.position, controls.target);
  const distance = offset.length();
  offset
    .normalize()
    .lerp(viewDirection, k)
    .normalize()
    .multiplyScalar(THREE.MathUtils.lerp(distance, targetDistance, k));
  controls.target.lerp(focusPosition, k);
  camera.position.addVectors(controls.target, offset);

  if (controls.target.distanceTo(focusPosition) < 0.01 && Math.abs(distance - targetDistance) < 0.01) {
    flying = false;
  }
}

// Let the user take over mid-flight without fighting them.
controls.addEventListener('start', () => {
  flying = false;
});

// --- UI --------------------------------------------------------------------

const ui = {
  pause: document.querySelector('#pause'),
  speed: document.querySelector('#speed'),
  speedValue: document.querySelector('#speed-value'),
  orbits: document.querySelector('#orbits'),
  labels: document.querySelector('#labels'),
  bodies: document.querySelector('#bodies'),
  infoName: document.querySelector('#info-name'),
  infoFacts: document.querySelector('#info-facts'),
};

let paused = false;
let speed = Number(ui.speed.value);

function setPaused(value) {
  paused = value;
  ui.pause.textContent = paused ? 'Play' : 'Pause';
  ui.pause.setAttribute('aria-pressed', String(paused));
}

ui.pause.addEventListener('click', () => setPaused(!paused));
ui.speed.addEventListener('input', () => {
  speed = Number(ui.speed.value);
  ui.speedValue.textContent = `${speed.toFixed(1)}×`;
});
ui.orbits.addEventListener('change', () => {
  for (const planet of planets) planet.orbitLine.visible = ui.orbits.checked;
});
ui.labels.addEventListener('change', () => {
  labelRenderer.domElement.hidden = !ui.labels.checked;
});

const bodyButtons = new Map();
for (const body of bodies) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = body.name;
  button.addEventListener('click', () => focusOn(body));
  ui.bodies.appendChild(button);
  bodyButtons.set(body, button);
}

function updateFocusUi() {
  for (const [body, button] of bodyButtons) {
    button.classList.toggle('active', body === focus);
  }
  ui.infoName.textContent = focus.name;
  ui.infoFacts.replaceChildren(
    ...focus.facts.flatMap(([term, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      return [dt, dd];
    })
  );
}
updateFocusUi();

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    focusOn(sunBody);
  } else if (event.code === 'Space' && !(event.target instanceof HTMLInputElement)) {
    event.preventDefault();
    setPaused(!paused);
  }
});

// Click (not drag) on a body to focus it; show a pointer cursor on hover.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerDown = new THREE.Vector2();

function bodyAt(event) {
  pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.body : null;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown.set(event.clientX, event.clientY);
});
renderer.domElement.addEventListener('pointerup', (event) => {
  if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
  const body = bodyAt(event);
  if (body) focusOn(body);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.buttons !== 0) return;
  renderer.domElement.style.cursor = bodyAt(event) ? 'pointer' : '';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop ------------------------------------------------------------------

let simTime = 0;
let lastFrame = 0;

renderer.setAnimationLoop((now) => {
  // Clamp so a backgrounded tab doesn't make everything jump on return.
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  if (!paused) simTime += dt * speed;

  sun.update(simTime);
  for (const planet of planets) planet.update(simTime);
  updateCamera(dt);
  controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
