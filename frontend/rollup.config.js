import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import del from 'rollup-plugin-delete';
import externalGlobals from 'rollup-plugin-external-globals';
import { visualizer } from 'rollup-plugin-visualizer';

const hiddenWarnings = ['THIS_IS_UNDEFINED', 'EVAL'];

export default defineConfig({
  input: 'src/index.ts',
  plugins: [
    del({ targets: '../backend/static/*', force: true }),
    commonjs(),
    nodeResolve({
      browser: true,
    }),
    externalGlobals({
      react: 'SP_REACT',
      'react-dom': 'SP_REACTDOM',
      // hack to shut up react-markdown
      process: '{cwd: () => {}}',
      path: '{dirname: () => {}, join: () => {}, basename: () => {}, extname: () => {}}',
      url: '{fileURLToPath: (f) => f}',
    }),
    typescript(),
    json(),
    replace({
      preventAssignment: false,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    image(),
    visualizer(),
  ],
  preserveEntrySignatures: false,
  output: {
    dir: '../backend/static',
    format: 'esm',
    chunkFileNames: (chunkInfo) => {
      return 'chunk-[hash].js';
    },
  },
  onwarn: function (message, handleWarning) {
    if (hiddenWarnings.some((warning) => message.code === warning)) return;
    handleWarning(message);
  },
});
