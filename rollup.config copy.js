import { dirname } from 'path';
import ts from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;
const sourceMapFlag = false;

let name = pkg.name;

if (name.slice(0, 1) === '@') {
  name = name.split('/')[1];
  if (!name) {
    throw new TypeError('pkg.name invalid');
  }
}
name = parseName(name);

const targetDir = dirname(pkg.main);
const deps = pkg.dependencies;
const peerDeps = pkg.peerDependencies;

const banner = `
/**
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @link ${pkg.homepage}
 */
`.trimLeft();
const uglifyOpts = {
  mangle: true,
  compress: {
    unused: false,
    sequences: true,
    dead_code: true,
    conditionals: true,
    booleans: true,
    if_return: true,
    join_vars: true,
    drop_console: false,
    drop_debugger: false,
    typeofs: false,
  },
  output: {
    // preamble: banner,
  },
};

const globals = {
  'rxjs/operators': 'rxjs.operators',
  'rxjs/websocket': 'rxjs.websocket',
};
let external = ['rxjs', 'rxjs/operators', 'rxjs/websocket', 'rxjs/ajax'];
const nodeModule = ['fs', 'path', 'util', 'os'];

if (deps && Object.keys(deps).length) {
  for (const depName of Object.keys(deps)) {
    external.push(depName);
  }
}
if (peerDeps && Object.keys(peerDeps).length) {
  for (const depName of Object.keys(peerDeps)) {
    external.push(depName);
  }
}
external = [...new Set(external)];

const config = [];

if (pkg.main) {
  config.push(
    // CommonJS (for Node) and ES module (for bundlers) build.
    {
      external: external.concat(nodeModule),
      input: pkg.module,
      plugins: [
        replace({ __DEV__: !production, preventAssignment: true }),
        babel({ babelHelpers: 'bundled' }),
      ],
      output: [
        {
          file: pkg.main,
          banner,
          format: 'cjs',
          globals,
          sourcemap: sourceMapFlag,
        },
      ],
    }
  );
}

if (pkg.es2015) {
  config[0].output.push({
    banner,
    format: 'es',
    file: pkg.es2015,
    sourcemap: sourceMapFlag,
  });
}

if (production && pkg.es2015) {
  config.push(
    // esm minify
    {
      external: external.concat(nodeModule),
      input: pkg.module,
      plugins: [
        replace({ __DEV__: !production, preventAssignment: true }),
        babel({ babelHelpers: 'bundled' }),
        terser(uglifyOpts),
      ],
      output: {
        banner,
        file: parseName(pkg.es2015) + '.min.js',
        format: 'es',
        sourcemap: sourceMapFlag,
      },
    }
  );
}

if (pkg.browser) {
  config.push(
    // umd bundle min
    {
      external: nodeModule,
      input: pkg.module,
      plugins: [
        replace({ __DEV__: !production, preventAssignment: true }),
        resolve({
          mainFields: ['browser', 'module', 'main'],
        }),
        commonjs(),
        production && terser(uglifyOpts),
      ],
      output: {
        amd: { id: name },
        banner,
        file: `${targetDir}/${name}.umd.min.js`,
        format: 'umd',
        globals,
        name,
        sourcemap: sourceMapFlag,
      },
    }
  );
}

if (pkg.bin) {
  const shebang = `#!/usr/bin/env node\n\n${banner}`;

  for (const binPath of Object.values(pkg.bin)) {
    if (!binPath) {
      continue;
    }
    const binSrcPath =
      binPath.includes('bin/') && !binPath.includes('dist/bin/')
        ? binPath.replace('bin/', 'dist/bin/')
        : binPath;

    config.push({
      external: external.concat(nodeModule),
      input: binSrcPath,
      plugins: [replace({ __DEV__: !production, preventAssignment: true })],
      output: [
        {
          file: binPath,
          banner: shebang,
          format: 'cjs',
          globals,
        },
      ],
    });
  }
}

// remove pkg.name extension if exists
function parseName(name) {
  if (typeof name === 'string' && name) {
    const arr = name.split('.');
    const len = arr.length;

    if (len > 2) {
      return arr.slice(0, -1).join('.');
    } else if (len === 2 || len === 1) {
      return arr[0];
    }
  } else {
    throw new TypeError('name invalid');
  }
  return name;
}

export default config;
