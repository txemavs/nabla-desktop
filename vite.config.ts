import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts'), core: resolve(__dirname, 'src/core.ts') },
      name: 'NablaDesktop',
      formats: ['es', 'cjs'],
      fileName: (format, entry) => `${entry}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'vuetify'],
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          vuetify: 'Vuetify',
        },
      },
    },
  },
})
