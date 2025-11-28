/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
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
  css: {
    modules: {
      // in the tsx file, the class name will be camelCase, eg: .table-scroll => classes.tableScroll
      localsConvention: 'camelCase',
    },
  },
  test: {
    environment: 'jsdom',
    // @testing-library/react relies on globals being present to perform auto cleanup.
    globals: true,
    testTimeout: 15_000, // TODO(SL): remove once https://github.com/hyparam/hightable/issues/292 is fixed
  },
})
