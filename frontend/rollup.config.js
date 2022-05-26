import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'src/index.tsx',
  plugins: [
    commonjs(),
    nodeResolve(),
    typescript(),
    json(),
    replace({
      preventAssignment: false,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  external: ["react", "react-dom"],
  output: {
    file: '../backend/static/plugin-loader.iife.js',
    globals: {
      react: 'SP_REACT',
      'react-dom': 'SP_REACTDOM',
    },
    format: 'iife',
  },
});
