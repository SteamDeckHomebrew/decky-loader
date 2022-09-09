import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import externalGlobals from "rollup-plugin-external-globals";
import del from 'rollup-plugin-delete'
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'src/index.tsx',
  plugins: [
    del({ targets: "../backend/static/*", force: true }),
    commonjs(),
    nodeResolve(),
    externalGlobals({
      react: 'SP_REACT',
      'react-dom': 'SP_REACTDOM',
      // hack to shut up react-markdown
      'process': '{cwd: () => {}}',
      'path': '{dirname: () => {}, join: () => {}, basename: () => {}, extname: () => {}}',
      'url': '{fileURLToPath: (f) => f}'
    }),
    typescript(),
    json(),
    replace({
      preventAssignment: false,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  preserveEntrySignatures: false,
  output: {
    dir: '../backend/static',
    format: 'esm',
    chunkFileNames: (chunkInfo) => {
      return 'chunk-[hash].js'
    }
  }
});
