import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    allowedHosts: ['barge-decaf-swore.ngrok-free.dev'],
  },
  plugins: [{
    name: 'serve-portable-island-debugger',
    configureServer(server) {
      server.middlewares.use('/island-debug-standalone.html', async (_request, response) => {
        try {
          const html = await readFile(resolve(import.meta.dirname, 'dist/island-debug-standalone.html'));
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(html);
        } catch (error) {
          response.statusCode = error.code === 'ENOENT' ? 404 : 500;
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end('Run npm run build to generate the self-contained island debugger, then reload this page.');
        }
      });
    },
  }],
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        buildings: resolve(import.meta.dirname, 'buildings.html'),
        buildingStudies: resolve(import.meta.dirname, 'buildings-next.html'),
        materials: resolve(import.meta.dirname, 'materials.html'),
        voxelStudio: resolve(import.meta.dirname, 'voxel-studio.html'),
        workshopPreview: resolve(import.meta.dirname, 'workshop-preview.html'),
        islandDebug: resolve(import.meta.dirname, 'island-debug.html'),
      },
    },
  },
});
