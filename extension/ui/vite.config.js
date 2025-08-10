import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    outDir: '../dist', // relative to ui/, so output goes to extension/dist
    sourcemap: true, 
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.jsx', // your entry file
      output: {
        entryFileNames: 'panel.bundle.js', // single bundle
      },
    },
  },
  plugins: [react()],
});
