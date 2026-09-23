import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works under a sub-path such as
  // https://<user>.github.io/solar-system/.
  base: './',
  build: {
    // Built into docs/ so GitHub Pages can serve it straight from main.
    outDir: 'docs',
    // three.js alone is ~580 kB minified; that's expected, not a problem to split.
    chunkSizeWarningLimit: 800,
  },
});
