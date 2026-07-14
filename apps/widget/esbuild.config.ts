import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const MAX_GZIP_BYTES = 35 * 1024;
const isWatch = process.argv.includes('--watch');

const buildOptions: esbuild.BuildOptions = {
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

function checkBundleSize(): void {
  const raw = readFileSync('dist/widget.min.js');
  const gzipped = gzipSync(raw);
  const kb = (gzipped.length / 1024).toFixed(1);
  console.log(`Bundle: ${(raw.length / 1024).toFixed(1)} KB raw, ${kb} KB gzipped`);

  if (gzipped.length > MAX_GZIP_BYTES) {
    console.error(`ERROR: Bundle exceeds ${MAX_GZIP_BYTES / 1024} KB gzipped limit (${kb} KB)`);
    process.exit(1);
  }
}

async function build(): Promise<void> {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
    return;
  }

  const result = await esbuild.build(buildOptions);
  if (result.metafile?.outputs['dist/widget.min.js']) {
    checkBundleSize();
  }
}

build().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
