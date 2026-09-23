import { defineConfig } from 'vite';

// Relative base so the built `dist/` works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  // three.js alone is ~580 kB minified; that's expected, not a problem to split.
  build: { chunkSizeWarningLimit: 800 },
});
