import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
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
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'), // or 'development' based on your build environment
      preventAssignment: true,
    }),
    resolve(),
    commonjs(),
    typescript(),
    babel({
      presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
      babelHelpers: 'bundled',
    }),
    terser(),
  ],
  external: ['react', 'react-dom'],
}
