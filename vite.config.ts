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
    /** esbuild es el minificador por defecto de Vite, pero se declara explícitamente para garantizar
     *  que no se desactive accidentalmente. cssMinify reduce aún más el CSS (ya minificado por PostCSS). */
    minify: 'esbuild',
    cssMinify: true,
    /** No calcular tamaño comprimido en build: ahorra tiempo (~15 %) sin afectar el resultado. */
    reportCompressedSize: false,
    /** Assets < 4 KB se incrustan como data-URL: elimina round-trips de red para iconos pequeños. */
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: { main: r('./index.html'), recursos: r('./modules/recursos.html'), cuadro: r('./modules/cuadro.html'), documentos: r('./modules/documentos.html') },
      output: {
        /** Separar zustand del código de la app: el vendor queda en caché aunque la app cambie. */
        manualChunks(id) {
          if (id.includes('node_modules/zustand')) return 'vendor-zustand';
          if (id.includes('/src/services/xlsx/')) return 'xlsx-service';
        }
      }
    }
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
