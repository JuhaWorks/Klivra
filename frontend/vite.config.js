import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // esbuild is the fastest minifier (default in Vite, but explicit is clear)
    minify: 'esbuild',
    // No sourcemaps in production — saves ~40% bundle size
    sourcemap: false,
    // Warn when any individual chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate long-cached chunks.
        // App code changes don't bust the vendor cache.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router')) {
              return 'react-vendor';
            }
            if (id.includes('/node_modules/framer-motion/')) {
              return 'framer-motion';
            }
            if (id.includes('/node_modules/@tanstack/') || id.includes('/node_modules/react-query/')) {
              return 'react-query';
            }
            if (id.includes('/node_modules/socket.io-client/') || id.includes('/node_modules/engine.io-client/')) {
              return 'socket-vendor';
            }
            if (id.includes('/node_modules/zustand/')) {
              return 'zustand-vendor';
            }
            if (id.includes('/node_modules/@sentry/')) {
              return 'sentry-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
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

