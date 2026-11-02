import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('folder browser exposes selected ancestors, safe disclosure IDs and root notes', async t => {
  const dir = await mkdtemp(resolve('.render-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const compiled = await build({ stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {FolderBrowser} from './src/FolderBrowser.tsx'; export const render=(notes,selected)=>renderToStaticMarkup(React.createElement(FolderBrowser,{notes,selected,onOpen:()=>{}}));`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  const path = resolve(dir, 'folders.mjs');
  await writeFile(path, compiled.outputFiles[0].contents);
  const { render } = await import(pathToFileURL(path).href);
  const selected = '01 Projects/Research & design/Plan.md';
  const html = render([{ path: selected, title: 'Plan' }, { path: 'BRAIN.md', title: 'Brain' }, { path: 'Archives/Plan.md', title: 'Plan' }], selected);
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 2);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /Research &amp; design/);
  assert.match(html, /title="BRAIN.md"/);
  for (const [, id] of html.matchAll(/aria-controls="([^"]+)"/g)) {
    assert.doesNotMatch(id, /\s/);
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.match(render([], null), /No notes match these filters/);
});

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
  assert.match(render({ status: 'external', reason: 'Synced from Obsidian' }), /Not assessed/);
});
test('write details show advisory feedback prominently, distinguish earlier drafts and render removals as deleted files',async t=>{
 const dir=await mkdtemp(resolve('.render-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const compiled=await build({stdin:{contents:`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {ChangeReader,AssessmentReader} from './src/ChangeReader.tsx'; export const render=(operation,assessment)=>renderToStaticMarkup(React.createElement(ChangeReader,{operation,assessment,demo:false,onOpen:()=>{},onReview:async()=>{},onUndo:async()=>{}})); export const draft=(assessment)=>renderToStaticMarkup(React.createElement(AssessmentReader,{assessment,demo:false}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',write:false});
 const path=resolve(dir,'details.mjs');await writeFile(path,compiled.outputFiles[0].contents);const{render,draft}=await import(pathToFileURL(path).href);
 const a={id:'a',actor:'Agent',at:'2026-11-02T00:00:00Z',status:'assessed',input:{path:'Trip.md',markdown:'# Assessed draft',sources:[]},context:{related:[]},decision:{outcome:'uncertain',model:'jev-test',probabilities:{worth:.98,supported:.85,duplicate:.86,conflict:.02}},recommendations:[{target:'context',path:'Inbox/Flight.md',revision:'123',action:'keep',confidence:.9,probabilities:{keep:.9}}]};
 const op={id:'op',path:'Trip.md',actor:'Agent',at:a.at,status:'applied',reason:'Saved',before:null,proposed:'# Revised final',sources:[],revision:'result',assessment:{id:'a',role:'primary',reason:'Consolidation preserves original bookings',candidateMatches:false,contextChanged:true}};
 const html=render(op,a);assert.match(html,/Assessment of earlier draft/);assert.match(html,/earlier context/i);assert.match(html,/Consolidation preserves/);assert.match(html,/Inbox\/Flight.md/);assert.match(html,/Applied/);assert.doesNotMatch(html,/<details[^>]*class="evaluation-details"/);assert.ok(html.indexOf('jev-review')<html.indexOf('Markdown change'));assert.match(html,/Undo this change/);
 const staged=draft(a);assert.match(staged,/Awaiting agent/);assert.match(staged,/has not been saved/i);assert.doesNotMatch(staged,/Save note/);
 const unavailable=draft({...a,status:'unavailable',decision:undefined,recommendations:undefined});assert.match(unavailable,/Assessment unavailable/);assert.doesNotMatch(unavailable,/role="meter"/);
 const removal=render({...op,assessment:undefined,undo:{operationId:'prior',reason:'Requested',files:[{path:'Trip.md',before:'# Created note',after:null}]}},undefined);assert.match(removal,/Deleted file/);assert.doesNotMatch(removal,/Open current page|Undo this change/);assert.match(removal,/Created note/);
 const parent=render({...op,assessment:{...op.assessment,role:'related',candidateMatches:null}},a);assert.match(parent,/Follow-up/);assert.doesNotMatch(parent,/role="meter"/);
});

test('a proposed graph connection keeps its target visible without becoming a saved edge', async t => {
  const dir=await mkdtemp(resolve('.render-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const compiled=await build({stdin:{contents:`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Graph} from './src/Graph.tsx'; export const render=(notes,connections)=>renderToStaticMarkup(React.createElement(Graph,{notes,connections,selected:'A.md',onSelect:()=>{}}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',write:false});
  const path=resolve(dir,'graph.mjs');await writeFile(path,compiled.outputFiles[0].contents);const{render}=await import(pathToFileURL(path).href);
  const notes=[{path:'A.md',title:'Source',links:[]},{path:'B.md',title:'Target',links:[]}],edge={id:'suggestion',source:'A.md',target:'B.md',status:'proposed'};
  const html=render(notes,[edge]);assert.match(html,/class="suggested-edge"/);assert.doesNotMatch(html,/class="graph-node [^"]*dim/);assert.deepEqual(notes.map(n=>n.links),[[],[]]);
  const dismissed=render(notes,[{...edge,status:'dismissed'}]);assert.doesNotMatch(dismissed,/class="suggested-edge"/);assert.match(dismissed,/class="graph-node [^"]*dim/);
});
