import * as esbuild from 'esbuild';
import { checkBundleSize, CORE_BUDGET } from './scripts/check-size';

const isWatch = process.argv.includes('--watch');

const coreOptions: esbuild.BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: !isWatch,
  sourcemap: true,
  target: 'es2018',
  format: 'iife',
  globalName: 'AccessShieldWidget',
  outfile: 'dist/widget.min.js',
  loader: {
    '.css': 'text',
    '.json': 'json',
  },
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
  metafile: !isWatch,
};

const analyticsOptions: esbuild.BuildOptions = {
  entryPoints: ['src/analytics.ts'],
  bundle: true,
  minify: !isWatch,
  sourcemap: true,
  target: 'es2018',
  format: 'iife',
  globalName: 'AccessShieldAnalytics',
  outfile: 'dist/analytics.min.js',
};

const langOptions: esbuild.BuildOptions = {
  entryPoints: ['src/lang/hi.ts'],
  bundle: true,
  minify: !isWatch,
  target: 'es2018',
  format: 'esm',
  outdir: 'dist/lang',
  entryNames: '[name]',
};

async function build(): Promise<void> {
  if (isWatch) {
    const [core, analytics, lang] = await Promise.all([
      esbuild.context(coreOptions),
      esbuild.context(analyticsOptions),
      esbuild.context(langOptions),
    ]);
    await Promise.all([core.watch(), analytics.watch(), lang.watch()]);
    console.log('Watching for changes...');
    return;
  }

  await Promise.all([
    esbuild.build(coreOptions),
    esbuild.build(analyticsOptions),
    esbuild.build(langOptions),
  ]);

  if (!checkBundleSize()) {
    console.error(`ERROR: Core bundle exceeds ${CORE_BUDGET} bytes gzipped`);
    process.exit(1);
  }
}

build().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
