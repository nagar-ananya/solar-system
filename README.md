# Solar System

An interactive 3D model of the Solar System built with [three.js](https://threejs.org/).
The Sun sits at the centre and is the only real light source. The eight planets
orbit it with their real surface textures, and a little ambient light keeps
their night sides visible.

## Running it

```bash
npm install
npm run dev      # start the dev server, then open the printed URL
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Controls

- **Drag** to rotate, **scroll / pinch** to zoom, **right-drag** to pan.
- **Click a planet**, its label, or a name in the bottom bar to fly to it and follow it.
- **Esc** (or **Sun** in the bottom bar) returns to the overview.
- **Space** pauses and resumes. The speed slider runs time from 0× to 10×.
- Toggle orbit lines and labels from the panel.

## What's modelled

- **Sun**: an animated shader (value-noise granulation with limb darkening), a
  glow halo, and a point light at its centre that casts shadows.
- **Planets**: textured spheres lit by the Sun. Each has its real axial tilt,
  so Uranus rolls on its side and Venus spins backwards. The spin axis stays
  fixed in space throughout the orbit, which is what causes seasons.
- **Saturn's rings**: a procedural texture with the C, B and A rings, the
  Cassini division and the Encke gap. The rings and the planet shadow each other.
- **Background**: a starfield of a few thousand tinted points.

### Not to scale

Real proportions would leave the planets as invisible specks. The model uses
these approximations:

- Sizes and orbit radii are hand-tuned (see `src/data.js`), but the ordering is correct.
- Orbital and rotation periods use the square root of the real ratio to Earth's.
  At 1× speed, one Earth year takes 20 s and one Earth day takes 4 s. Faster
  planets still move faster than slower ones.
- Orbits are circular and all lie in one plane.

The info card shows the real values for each body.

## Project layout

```
index.html          page shell and UI markup
src/main.js         renderer, camera/follow logic, UI wiring, animation loop
src/data.js         display values and real-world facts for every body
src/planet.js       planet meshes, orbit lines, Saturn's rings
src/sun.js          Sun shader and glow
src/starfield.js    background stars
src/style.css       UI styles
public/textures/    planet surface maps and the star sprite
```

## Credits

Planet surface textures and the star sprite come from
[nagarsuresh/angular-threejs](https://github.com/nagarsuresh/angular-threejs/tree/master/src/assets).
The Sun's surface and Saturn's rings are generated in code.
