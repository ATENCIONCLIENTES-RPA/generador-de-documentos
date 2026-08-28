/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/generador-de-documentos/' : '/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { chunkSizeWarningLimit: 1200 },
  test: { globals: true, environment: 'jsdom', exclude: ['node_modules', 'tests/e2e/**', 'e2e/**'] },
});
