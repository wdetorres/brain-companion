import { build } from 'esbuild';
import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await cp('public', 'dist', { recursive: true });
await build({ entryPoints: ['src/main.tsx'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'dist/assets/app.js', sourcemap: false, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info' });
await build({ entryPoints: ['src/landing.ts'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'dist/assets/landing.js', sourcemap: false, logLevel: 'info' });
// A portable, explicit demo of the same compiled application.
const { readFile, writeFile } = await import('node:fs/promises');
const css = await readFile('dist/assets/app.css', 'utf8');
const js = (await readFile('dist/assets/app.js', 'utf8')).replaceAll('</script', '<\\/script');
await writeFile('dist/brain-explorer-demo.html', `<!doctype html><html lang="en" data-demo="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brain Explorer · sample demo</title><style>${css}</style></head><body><div id="root"></div><script type="module">${js}</script></body></html>`);
// Vercel serves index.html before rewrites; keep the standalone worker's shell unchanged.
if (process.env.VERCEL) {
  await cp('dist/index.html', 'dist/app.html');
  await cp('dist/landing.html', 'dist/index.html');
}
if (process.env.VERCEL_ENV === 'preview') await import('./build-graph-preview.mjs');
