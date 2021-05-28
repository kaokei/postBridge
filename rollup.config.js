/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path';
import json from '@rollup/plugin-json';

let hasTSChecked = false;
const pkg = require('./package.json');
const name = 'post-bridge';
const iifeName = 'PostBridge';
const formats = [
  'cjs',
  'cjs.min',
  'cjs.runtime',
  'cjs.runtime.min',
  'es',
  'es.min',
  'es.runtime',
  'es.runtime.min',
  'iife',
  'iife.min',
];
// const formats = ['cjs', 'es'];

const packageConfigs = formats.map(format => {
  if (format.includes('min')) {
    // 压缩代码，并开启production模式
    return createProductionConfig(format.split('.')[0]);
  } else {
    return createDevelopmentConfig(format);
  }
});

export default packageConfigs;

function createConfig(format, output, plugins = []) {
  output.exports = 'auto';
  output.sourcemap = true;
  output.externalLiveBindings = false;

  const isProductionBuild = /\.min\.js$/.test(output.file);
  const isGlobalBuild = /iife/.test(format);
  const isESBuild = /es/.test(format);
  if (isGlobalBuild) {
    output.name = iifeName;
  }

  let entryFile = `src/index.ts`;

  // 这样写意味着不会打包任何npm包了
  let external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...['path', 'url', 'stream'],
  ];

  // 暂时没有用上globals
  output.globals = {
    postcss: 'postcss',
    jquery: '$',
  };

  const nodePlugins =
    format === 'cjs'
      ? [
          require('@rollup/plugin-commonjs')({
            sourceMap: false,
          }),
          require('@rollup/plugin-node-resolve').nodeResolve(),
        ]
      : [
          require('@rollup/plugin-commonjs')({
            sourceMap: false,
          }),
          require('rollup-plugin-polyfill-node')(),
          require('@rollup/plugin-node-resolve').nodeResolve(),
        ];

  return {
    input: path.resolve(__dirname, entryFile),
    external,
    output,
    plugins: [
      json({
        namedExports: false,
      }),
      createTypescriptPlugin(),
      createReplacePlugin(isProductionBuild),
      ...nodePlugins,
      createBabelPlugin(isESBuild),
      ...plugins,
    ],
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };
}

function createProductionConfig(format) {
  const { terser } = require('rollup-plugin-terser');
  return createConfig(
    format,
    {
      file: path.resolve(__dirname, `dist/${name}.${format}.min.js`),
      format: format,
    },
    [
      terser({
        module: /^esm/.test(format),
        compress: {
          ecma: 2015,
          pure_getters: true,
        },
        safari10: true,
      }),
    ]
  );
}

function createDevelopmentConfig(format) {
  return createConfig(format, {
    file: path.resolve(__dirname, `dist/${name}.${format}.js`),
    format: format,
  });
}

function createReplacePlugin(isProd = true) {
  const replace = require('@rollup/plugin-replace');
  const replacements = {
    __VERSION__: pkg.version,
    __DEV__: !isProd,
  };
  return replace({
    values: replacements,
    preventAssignment: true,
  });
}

function createBabelPlugin(esm = true) {
  const { getBabelOutputPlugin } = require('@rollup/plugin-babel');
  return getBabelOutputPlugin({
    presets: [['@babel/preset-env', { modules: false }]],
    plugins: [['@babel/plugin-transform-runtime', { useESModules: esm }]],
  });
}

function createTypescriptPlugin() {
  const hasTSChecked2 = hasTSChecked;
  hasTSChecked = true;
  const ts = require('rollup-plugin-typescript2');
  const shouldEmitDeclarations = pkg.types && !hasTSChecked2;
  const tsPlugin = ts({
    check: !hasTSChecked2,
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: true,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations,
      },
      exclude: ['**/__tests__', 'typings'],
    },
  });
  return tsPlugin;
}
