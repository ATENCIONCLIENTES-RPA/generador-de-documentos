import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  base: './',
  build: {
    target: 'es2022', outDir: 'dist', emptyOutDir: true, sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: { main: r('./index.html'), recursos: r('./modules/recursos.html'), cuadro: r('./modules/cuadro.html'), documentos: r('./modules/documentos.html'), extractor: r('./modules/extractor.html') },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/zustand')) return 'vendor-zustand';
          if (id.includes('/src/services/xlsx/')) return 'xlsx-service';
        }
      }
    }
  },
  worker: { format: 'es' },
  preview: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  }
});
