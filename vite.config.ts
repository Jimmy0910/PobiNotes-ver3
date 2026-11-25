import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'process'

const isWindows = process.platform === 'win32';
const outDir = isWindows ? 'C:/Users/jimmy/AppData/Local/Temp/mistake-notebook-dist' : 'dist';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    cors: true
  },
  build: {
    outDir: outDir,
    emptyOutDir: true,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
})
