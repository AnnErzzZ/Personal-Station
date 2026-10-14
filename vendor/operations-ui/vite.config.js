import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: '../../public/work/operations-platform/controls',
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL('./controls.js', import.meta.url)), name: 'OperationsOriginalUI', formats: ['iife'], fileName: () => 'controls.js' },
  },
})
