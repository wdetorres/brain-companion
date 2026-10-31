import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('actual Markdown component renders hostile HTML inert and links safely', async t => {
  const dir = await mkdtemp(resolve('.render-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const compiled = await build({ stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Markdown} from './src/Markdown.tsx'; export const render=(text,notes=[],path='Home.md')=>renderToStaticMarkup(React.createElement(Markdown,{text,notes,path,onOpen:()=>{}}));`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  const path = resolve(dir, 'renderer.mjs'); await writeFile(path, compiled.outputFiles[0].contents);
  const { render } = await import(pathToFileURL(path).href);
  const html = render('<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n<img src=x onerror=alert(1)>\n\n[good](https://example.com)\n\n[[Unresolved]]');
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /href="https:\/\/example.com"/); assert.match(html, /noopener noreferrer/);
  assert.match(html, /class="unresolved"/);
  const notes=[{path:'Home.md',title:'Home'},{path:'A/Index.md',title:'Index'},{path:'A/Plan.md',title:'Renamed title'},{path:'B/Plan.md',title:'Plan'}];
  const relative=render('[Home](../Home.md)',notes,'A/Index.md');
  assert.match(relative,/class="wiki-link"/);
  const ambiguous=render('[Plan](Plan.md)',notes,'Home.md');
  assert.doesNotMatch(ambiguous,/class="wiki-link"/);
});

test('Jev review separates classification from disposition and does not invent missing scores', async t => {
  const dir = await mkdtemp(resolve('.render-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const compiled = await build({ stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {JevReview} from './src/JevReview.tsx'; export const render=(operation,sample=false)=>renderToStaticMarkup(React.createElement(JevReview,{operation,sample}));`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  const path = resolve(dir, 'review.mjs'); await writeFile(path, compiled.outputFiles[0].contents);
  const { render } = await import(pathToFileURL(path).href);
  const operation = { status: 'needs_attention', reason: 'Automatic writes are disabled. Proposal retained.', decision: { outcome: 'update', confidence: .98, model: 'jev-test', probabilities: { supported: .98, duplicate: .03, conflict: .04 } } };
  const html = render(operation);
  assert.match(html, /Supported update/); assert.match(html, /Proposal retained/);
  assert.equal((html.match(/role="meter"/g) || []).length, 3);
  assert.match(html, /aria-label="Evidence support"[^>]*aria-valuenow="98"/);
  assert.doesNotMatch(html, /Illustrative example/);
  const missing = render({ ...operation, decision: { ...operation.decision, probabilities: undefined } });
  assert.equal((missing.match(/Not recorded/g) || []).length, 4); assert.doesNotMatch(missing, /role="meter"/);
  assert.match(render(operation, true), /Illustrative example/);
  assert.match(render({ status: 'external', reason: 'Synced from Obsidian' }), /No Jev decision recorded/);
});

test('a proposed graph connection keeps its target visible without becoming a saved edge', async t => {
  const dir=await mkdtemp(resolve('.render-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const compiled=await build({stdin:{contents:`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Graph} from './src/Graph.tsx'; export const render=(notes,connections)=>renderToStaticMarkup(React.createElement(Graph,{notes,connections,selected:'A.md',onSelect:()=>{}}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',write:false});
  const path=resolve(dir,'graph.mjs');await writeFile(path,compiled.outputFiles[0].contents);const{render}=await import(pathToFileURL(path).href);
  const notes=[{path:'A.md',title:'Source',links:[]},{path:'B.md',title:'Target',links:[]}],edge={id:'suggestion',source:'A.md',target:'B.md',status:'proposed'};
  const html=render(notes,[edge]);assert.match(html,/class="suggested-edge"/);assert.doesNotMatch(html,/class="graph-node [^"]*dim/);assert.deepEqual(notes.map(n=>n.links),[[],[]]);
  const dismissed=render(notes,[{...edge,status:'dismissed'}]);assert.doesNotMatch(dismissed,/class="suggested-edge"/);assert.match(dismissed,/class="graph-node [^"]*dim/);
});
