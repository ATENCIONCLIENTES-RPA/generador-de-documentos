/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/generador-de-documentos/' : '/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules', 'tests/e2e/**', 'e2e/**'],
  },
  server: {
    proxy: {
      '/api/mercurio/radicacion': {
        target: 'https://epm-vapp47.epm.com.co:443',
        changeOrigin: true,
        secure: false,
        rewrite: (p) =>
          p.replace(/^\/api\/mercurio\/radicacion/, '/mercurio/RadicExternoV1Service'),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[vite-proxy] radicacion error', err));
          proxy.on('proxyReq', (r) => {
            // Eliminar cabeceras que pueden interferir con el servicio SOAP interno
            r.removeHeader('origin');
            r.removeHeader('referer');
          });
        },
      },
      '/api/mercurio/respuesta': {
        target: 'https://epm-vws04.epm.com.co:443',
        changeOrigin: true,
        secure: false,
        rewrite: (p) =>
          p.replace(/^\/api\/mercurio\/respuesta/, '/mercurio/IndexarImagenDocumentoServiceV1'),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[vite-proxy] respuesta error', err));
          proxy.on('proxyReq', (r) => {
            r.removeHeader('origin');
            r.removeHeader('referer');
          });
        },
      },
      '/api/mercurio/anexos': {
        target: 'https://epm-vws04.epm.com.co:443',
        changeOrigin: true,
        secure: false,
        rewrite: (p) =>
          p.replace(/^\/api\/mercurio\/anexos/, '/mercurio/ImagenDocAnexoIndexServiceV1'),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[vite-proxy] anexos error', err));
          proxy.on('proxyReq', (r) => {
            r.removeHeader('origin');
            r.removeHeader('referer');
          });
        },
      },
    },
  },
});
