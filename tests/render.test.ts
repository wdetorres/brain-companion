import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('actual Markdown component renders hostile HTML inert and links safely', async t => {
  const dir = await mkdtemp(resolve('.render-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const compiled = await build({ stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Markdown} from './src/Markdown.tsx'; export const render=text=>renderToStaticMarkup(React.createElement(Markdown,{text,notes:[],onOpen:()=>{}}));`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  const path = resolve(dir, 'renderer.mjs'); await writeFile(path, compiled.outputFiles[0].contents);
  const { render } = await import(pathToFileURL(path).href);
  const html = render('<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n<img src=x onerror=alert(1)>\n\n[good](https://example.com)\n\n[[Unresolved]]');
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /href="https:\/\/example.com"/); assert.match(html, /noopener noreferrer/);
  assert.match(html, /class="unresolved"/);
});
