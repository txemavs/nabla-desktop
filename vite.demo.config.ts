import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [vue()],
  build: { outDir: '../demo-dist', emptyOutDir: true },
})
