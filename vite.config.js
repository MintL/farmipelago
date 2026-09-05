import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    allowedHosts: ['barge-decaf-swore.ngrok-free.dev'],
  },
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        voxelStudio: resolve(import.meta.dirname, 'voxel-studio.html'),
      },
    },
  },
});
