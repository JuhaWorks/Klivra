import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],

  build: {
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // Increase warning limit since we are letting Vite bundle naturally
  },

  // Speed up local dev by pre-bundling heavy deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'zustand', '@tanstack/react-query', 'framer-motion'],
  },

  // proxy /api requests to the backend during local development so that
  // the browser treats them as same‑site.  this avoids the dreaded
  // SameSite=lax cookie restriction which blocks POST/PUT when frontend
  // and backend are on different ports.
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

