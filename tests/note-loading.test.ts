import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import { syncOnce } from '../server/runtime.ts';
import { revision } from '../server/vault.ts';

async function fixture(t:TestContext){
  const root=await mkdtemp(join(tmpdir(),'brain-note-loading-'));
  const store=new BrainStore({vault:join(root,'vault'),data:join(root,'state'),accept:['new'],judge:async()=>({outcome:'new',confidence:1,model:'synthetic',usage:{}})});
  t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});
  await writeFile(join(store.vault,'Home.md'),'# Home\n[[Rocket]]');
  await writeFile(join(store.vault,'Target.md'),'# Rocket\nSynthetic content.');
  return {root,store};
}

test('warm inspection avoids a vault refresh and activity loading, but an edited note is current and observed',async t=>{
  const {store}=await fixture(t);
  t.mock.method(store,'snapshot',()=>{throw Error('Inspection must not load activity');});
  const first=await store.inspect('Home.md');assert.deepEqual(first.links,['Target.md']);
  const refresh=t.mock.method(store.index,'refresh');
  assert.deepEqual(await store.inspect('Home.md'),first);
  assert.equal((await store.inspect('Target.md')).title,'Rocket');
  assert.equal(refresh.mock.callCount(),0);
  const markdown='# Home updated\n[[Target]]\nNew content.';
  await writeFile(join(store.vault,'Home.md'),markdown);
  const changed=await store.inspect('Home.md');
  assert.equal(changed.markdown,markdown);assert.equal(changed.revision,revision(markdown));
  assert.deepEqual(changed.links,['Target.md']);assert.equal(refresh.mock.callCount(),1);
  const row=store.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='external'").get();
  assert.equal(JSON.parse(String(row?.payload)).before,first.markdown);
  await store.inspect('Home.md');assert.equal(refresh.mock.callCount(),1);
});

test('sync, partially failed sync and applied writes invalidate links even when the inspected page is unchanged',async t=>{
  const {store}=await fixture(t);
  await store.inspect('Home.md');
  await syncOnce(store,()=>writeFile(join(store.vault,'Target.md'),'# Renamed target'));
  assert.deepEqual((await store.inspect('Home.md')).unresolved,['Rocket']);
  await syncOnce(store,async()=>{await writeFile(join(store.vault,'Target.md'),'# Rocket');throw Error('Synthetic partial sync');});
  assert.deepEqual((await store.inspect('Home.md')).links,['Target.md']);
  const result=await store.remember({path:'Other.md',markdown:'# Rocket\nSecond title match.',expectedRevision:null,idempotencyKey:'synthetic-note-loading',sources:[{title:'Synthetic source',uri:'urn:test:note-loading',observedAt:new Date().toISOString()}]},'Test');
  assert.equal(result.status,'applied');
  assert.deepEqual((await store.inspect('Home.md')).unresolved,['Rocket']);
  await unlink(join(store.vault,'Other.md'));
  await store.snapshot();
  assert.deepEqual((await store.inspect('Home.md')).links,['Target.md']);
});

test('warm reads retain categories and reject removed, oversized, symlink and traversal paths',async t=>{
  const {root,store}=await fixture(t);
  const first=await store.inspect('Target.md');
  store.db.prepare('INSERT INTO note_categories VALUES(?,?,?)').run(first.path,first.revision,'decision');
  await store.snapshot();
  assert.equal((await store.inspect(first.path)).category,'decision');
  await unlink(join(store.vault,first.path));
  await assert.rejects(()=>store.inspect(first.path),/Page not found/);
  await writeFile(join(store.vault,first.path),'x'.repeat(2*1024*1024+1));
  await assert.rejects(()=>store.inspect(first.path),/Page not found/);
  await unlink(join(store.vault,first.path));
  await writeFile(join(root,'outside.md'),'# Outside');
  await symlink(join(root,'outside.md'),join(store.vault,first.path));
  await assert.rejects(()=>store.inspect(first.path),/Symlinks/);
  await assert.rejects(()=>store.inspect('../outside.md'),/Invalid note path/);
});
