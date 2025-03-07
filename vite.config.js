/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname (fileURLToPath (import.meta.url ))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve (__dirname, 'src/HighTable.js'),
      formats: ['es'],
      name: 'HighTable',
      // the proper extensions will be added
      fileName: 'HighTable',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsx',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
  },
  test: { environment: 'jsdom', globals: true },
})
