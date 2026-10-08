import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
/**
 * Build multipágina: index.html (shell) + modules/<id>.html (cada módulo en su iframe, como en la app original).
 * `base: './'` mantiene los recursos relativos y permite desplegar bajo la subcarpeta de GitHub Pages.
 * Sin backend ni APIs externas.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022', outDir: 'dist', emptyOutDir: true, sourcemap: false,
    rollupOptions: { input: { main: r('./index.html'), recursos: r('./modules/recursos.html'), cuadro: r('./modules/cuadro.html'), documentos: r('./modules/documentos.html') } }
  },
  worker: { format: 'es' },
  /** preview: cabeceras que impiden que el navegador sirva versiones en caché del dist anterior. */
  preview: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'], setupFiles: ['./vitest.setup.ts'] }
});
