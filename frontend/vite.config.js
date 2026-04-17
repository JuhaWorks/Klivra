import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    tailwindcss(), 
    react(),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024
    }),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024
    })
  ],

  build: {
    minify: 'oxc', // Vite 8 preference
    minifyOptions: {
      drop: ['console', 'debugger'],
    },
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'three';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('react') || id.includes('framer-motion') || id.includes('zustand') || id.includes('axios')) {
              return 'core';
            }
            return 'vendor';
          }
        }
      }
    }
  },


  // Speed up local dev by pre-bundling heavy deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'zustand', '@tanstack/react-query', 'framer-motion', 'react-is'],
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
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

