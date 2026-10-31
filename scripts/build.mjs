import { build } from 'esbuild';
import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await cp('public', 'dist', { recursive: true });
await build({ entryPoints: ['src/main.tsx'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'dist/assets/app.js', sourcemap: false, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info' });
