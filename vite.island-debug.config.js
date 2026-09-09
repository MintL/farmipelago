import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// A second build of the SAME entry and shared game modules. The portable output
// has no runtime asset requests, so a downloaded HTML file can run on its own.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: resolve(import.meta.dirname, 'src/island-debug/main.js'), formats: ['es'] },
    minify: true,
    rolldownOptions: { output: { codeSplitting: false } },
  },
  plugins: [{
    name: 'portable-island-debugger',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(file => file.type === 'chunk');
      if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length
        || chunks[0].referencedFiles?.length) throw new Error('Portable debugger must contain all runtime dependencies.');
      const script = chunks[0].code.replace(/<\/script/gi, '<\\/script');
      const styles = readFileSync(resolve(import.meta.dirname, 'src/island-debug/styles.css'), 'utf8');
      const html = readFileSync(resolve(import.meta.dirname, 'island-debug.html'), 'utf8')
        .replace('<html lang="en">', '<html lang="en" data-standalone="true">')
        .replace('  <link rel="stylesheet" href="/src/island-debug/styles.css">', () => `  <style>${styles}</style>`)
        .replace('  <script type="module" src="/src/island-debug/main.js"></script>', () => `  <script type="module">${script}</script>`)
        .replace('Use this page on the same server as the game. To open a downloaded file, use <a href="./island-debug-standalone.html" download>the self-contained debugger</a>.',
          'This self-contained file needs a browser that supports JavaScript modules, WebGL and WebAssembly. Open it in your browser rather than a file-preview app.');
      for (const key of Object.keys(bundle)) delete bundle[key];
      this.emitFile({ type: 'asset', fileName: 'island-debug-standalone.html', source: html });
    },
  }],
});
