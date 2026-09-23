// Each body has two kinds of numbers:
//  - display values (`radius`, `distance`) in scene units, hand-tuned so the
//    whole system fits on screen. At true scale the planets would be
//    sub-pixel specks with Neptune ~30x farther out than Earth.
//  - real-world values, used for the info card and to derive the relative
//    orbit/spin speeds (see planet.js).

export const SUN = {
  name: 'Sun',
  radius: 5,
  facts: [
    ['Diameter', '1,392,700 km'],
    ['Surface temperature', '5,500 °C'],
    ['Day (at equator)', '~25 Earth days'],
    ['Share of total mass', '99.86%'],
  ],
};

// orbitDays: sidereal orbital period, dayHours: sidereal rotation period,
// tiltDeg: axial tilt (Venus and Uranus spin "backwards", which a tilt past
// 90° already expresses), distanceAU: mean distance from the Sun.
export const PLANETS = [
  {
    name: 'Mercury',
    texture: 'mercury.jpg',
    radius: 0.5,
    distance: 10,
    orbitDays: 87.97,
    dayHours: 1407.6,
    tiltDeg: 0.03,
    distanceAU: 0.39,
    diameterKm: 4879,
  },
  {
    name: 'Venus',
    texture: 'venus.jpg',
    radius: 0.95,
    distance: 14,
    orbitDays: 224.7,
    dayHours: 5832.5,
    tiltDeg: 177.4,
    distanceAU: 0.72,
    diameterKm: 12104,
  },
  {
    name: 'Earth',
    texture: 'earth.jpg',
    radius: 1,
    distance: 19,
    orbitDays: 365.26,
    dayHours: 23.93,
    tiltDeg: 23.44,
    distanceAU: 1,
    diameterKm: 12742,
  },
  {
    name: 'Mars',
    texture: 'mars.jpg',
    radius: 0.7,
    distance: 24,
    orbitDays: 686.98,
    dayHours: 24.62,
    tiltDeg: 25.19,
    distanceAU: 1.52,
    diameterKm: 6779,
  },
  {
    name: 'Jupiter',
    texture: 'jupiter.jpg',
    radius: 2.8,
    distance: 34,
    orbitDays: 4332.6,
    dayHours: 9.93,
    tiltDeg: 3.13,
    distanceAU: 5.2,
    diameterKm: 139820,
  },
  {
    name: 'Saturn',
    texture: 'saturn.jpg',
    radius: 2.4,
    distance: 47,
    orbitDays: 10759,
    dayHours: 10.66,
    tiltDeg: 26.73,
    distanceAU: 9.54,
    diameterKm: 116460,
    rings: true,
  },
  {
    name: 'Uranus',
    texture: 'uranus.jpg',
    radius: 1.6,
    distance: 59,
    orbitDays: 30687,
    dayHours: 17.24,
    tiltDeg: 97.77,
    distanceAU: 19.19,
    diameterKm: 50724,
  },
  {
    name: 'Neptune',
    texture: 'neptune.jpg',
    radius: 1.55,
    distance: 69,
    orbitDays: 60190,
    dayHours: 16.11,
    tiltDeg: 28.32,
    distanceAU: 30.07,
    diameterKm: 49244,
  },
];
