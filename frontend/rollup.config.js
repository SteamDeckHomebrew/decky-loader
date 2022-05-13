import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';


/** @type {import('rollup').RollupOptions} */
const options = {
  input: 'src/index.ts',
  output: {
    file: '../backend/static/plugin-loader.iife.js',
    format: 'iife',
  },
  plugins: [commonjs(), resolve(), typescript()]
}

export default options
