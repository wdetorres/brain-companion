import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NoteIndex } from '../server/note-index.ts';

test('persistent index reuses unchanged parsing and reconciles edits, links and removals', async t => {
  const root=await mkdtemp(join(tmpdir(),'brain-index-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const vault=join(root,'vault');await mkdir(vault);
  const db=new DatabaseSync(join(root,'index.sqlite'));t.after(()=>db.close());
  await writeFile(join(vault,'Home.md'),'# Home\n[[Plan]]');
  let index=new NoteIndex(db,vault);await index.refresh();assert.equal(index.lastReadCount,1);
  await index.refresh();assert.equal(index.lastReadCount,0);
  index=new NoteIndex(db,vault);await index.refresh();assert.equal(index.lastReadCount,0);
  await writeFile(join(vault,'Plan.md'),'# Launch plan\nApollo launch is Friday.');
  let notes=await index.refresh();assert.equal(index.lastReadCount,1);
  assert.deepEqual(notes.find(n=>n.path==='Home.md')!.links,['Plan.md']);
  assert.equal(index.search('apollo',5)[0].path,'Plan.md');
  await writeFile(join(vault,'Plan.md'),'# Launch plan\nGemini launch is Monday.');await index.refresh();
  assert.equal(index.search('apollo',5).length,0);assert.equal(index.search('gemini',5).length,1);
  await unlink(join(vault,'Plan.md'));notes=await index.refresh();
  assert.equal(index.search('gemini',5).length,0);assert.deepEqual(notes[0].unresolved,['Plan']);
});

test('FTS input is literal, bounded and category-aware, including recorded categories', async t => {
  const root=await mkdtemp(join(tmpdir(),'brain-index-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(let i=0;i<5;i++)await writeFile(join(root,`Note${i}.md`),`---\nmemory_category: ${i===4?'decision':'task'}\n---\n# Apollo ${i}\nLaunch work.`);
  const index=new NoteIndex(db,root);await index.refresh();
  assert.equal(index.search('Apollo',2).length,2);
  assert.equal(index.search('Apollo',2,'decision')[0].path,'Note4.md');
  assert.doesNotThrow(()=>index.search('" OR ) NEAR( * : -',5));
  assert.equal(index.search('',5).length,0);
});
