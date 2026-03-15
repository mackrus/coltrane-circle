import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  optimizeDeps: {
    // Exclude the WASM package from pre-bundling so it loads as a standard module
    exclude: ['theory-crate']
  }
});
