import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

// Run after the regular build when a dense, synthetic browser check is needed.
await build({ entryPoints: ['tests/graph-preview.tsx'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'dist/assets/graph-review.js', define: { 'process.env.NODE_ENV': '"production"' } });
await writeFile('dist/graph-review.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brain graph · synthetic review</title><link rel="stylesheet" href="/assets/graph-review.css"></head><body><div id="root"></div><script type="module" src="/assets/graph-review.js"></script></body></html>');
