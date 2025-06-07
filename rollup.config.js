import { terser } from 'rollup-plugin-terser';

export default {
  input: 'briansldoa.js',
  output: {
    file: 'briansldoa.min.js',
    format: 'esm',
    plugins: [terser()]
  }
};
