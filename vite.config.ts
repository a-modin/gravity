import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    sourcemap: mode !== 'production',
  },
}));
