import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/hightable.tsx',
  output: {
    file: 'dist/hightable.min.js',
    name: 'HighTable',
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
    sourcemap: true,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'), // or 'development' based on your build environment
      preventAssignment: true,
    }),
    resolve(),
    commonjs(),
    typescript({
      exclude: ['test/**'],
    }),
    terser(),
  ],
  external: ['react', 'react-dom'],
}
