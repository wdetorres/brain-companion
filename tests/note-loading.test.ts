import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, symlink, rm } from 'node:fs/promises';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { BrainStore } from '../server/store.ts';
import { syncOnce } from '../server/runtime.ts';
import { revision } from '../server/vault.ts';

function gate(){
  let resolve!:()=>void;
  const promise=new Promise<void>(r=>{resolve=r;});
  return {promise,resolve};
}

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

test('an unchanged indexed note loads while sync holds the mutation queue',async t=>{
  const {store}=await fixture(t);
  const expected=await store.inspect('Target.md');
  const started=gate(), finish=gate();
  const syncing=syncOnce(store,async()=>{started.resolve();await finish.promise;});
  await started.promise;
  const refresh=t.mock.method(store.index,'refresh');
  try {
    const result=await Promise.race([store.inspect('Target.md'),delay(1000,null,{ref:false})]);
    assert.deepEqual(result,expected,'An unchanged note must not wait for sync to finish');
    assert.equal(store.syncStatus,'Syncing with Obsidian');
    assert.equal(refresh.mock.callCount(),0);
  } finally {finish.resolve();await syncing;}
});

test('cold, reopened and consecutive syncs serve initial reads and validated summaries before sync ends',async t=>{
  const {root,store:first}=await fixture(t);
  let store=first;
  for(const cycle of ['cold','reopened','repeat']){
    if(cycle==='reopened'){
      store.close();
      await writeFile(join(store.vault,'Target.md'),'# Rocket\nChanged while stopped.');
      store=new BrainStore({vault:store.vault,data:join(root,'state'),judge:store.judge});
      t.after(()=>store.close());
    }
    const finish=gate();
    const lastSync=store.lastSync;
    const syncing=syncOnce(store,async()=>{await writeFile(join(store.vault,'Target.md'),'# Partial');await finish.promise;await writeFile(join(store.vault,'Target.md'),'# Rocket\nCompleted '+cycle);});
    // Start requests immediately, including before the cold index is ready.
    const reads=Promise.all([store.inspect('Home.md'),store.snapshot(),store.status()]);
    try {
      const result=await Promise.race([reads,delay(1000,null)]);
      assert.ok(result,cycle+' initial requests must not wait for network sync');
      const [note,snapshot,status]=result;
      assert.equal(note.title,'Home');assert.equal(snapshot.notes.length,2);assert.equal(status.notes,2);
      assert.equal(snapshot.status.sync,'Syncing with Obsidian');assert.equal(status.sync,'Syncing with Obsidian');
      assert.equal(snapshot.status.lastSync,lastSync);assert.equal(status.lastSync,lastSync);
      assert.notEqual(snapshot.notes.find(n=>n.path==='Target.md')?.title,'Partial');
      if(cycle==='reopened')assert.equal(snapshot.notes.find(n=>n.path==='Target.md')?.markdown,'# Rocket\nChanged while stopped.');
      assert.equal((await store.snapshot()).status.indexedAt,snapshot.status.indexedAt);
    }finally{finish.resolve();await syncing;await reads;}
    assert.equal((await store.inspect('Target.md')).markdown,'# Rocket\nCompleted '+cycle);
    assert.equal(store.syncStatus,'Last sync succeeded');
  }
});

test('a failed partial sync revalidates notes without claiming success or leaving a syncing snapshot',async t=>{
  const {store}=await fixture(t);
  await syncOnce(store,async()=>{});
  const lastSync=store.lastSync;
  await syncOnce(store,async()=>{await writeFile(join(store.vault,'Target.md'),'# Changed by partial sync');throw Error('Synthetic failure');});
  assert.match(store.syncStatus,/failed/i);assert.equal(store.lastSync,lastSync);
  assert.equal((await store.index.current('Target.md'))?.title,'Changed by partial sync');
  const snapshot=await store.snapshot();
  assert.match(snapshot.status.sync,/failed/i);assert.equal(snapshot.notes.find(n=>n.path==='Target.md')?.title,'Changed by partial sync');
});

test('failed warming and reconciliation clear the read view, release readers and keep failure status',async t=>{
  const {store}=await fixture(t);
  for(const failAt of [1,2]){
    let calls=0,ran=false;
    const refresh=store.index.refresh.bind(store.index);
    const mock=t.mock.method(store.index,'refresh',async()=>{if(++calls===failAt)throw Error('Synthetic index failure');return refresh();});
    try{
      await syncOnce(store,async()=>{ran=true;});
      assert.equal(ran,failAt===2);assert.match(store.syncStatus,/failed/i);assert.equal(store.lastSync,null);
      assert.equal(await store.index.current('Home.md'),undefined);
    }finally{mock.mock.restore();}
    const snapshot=await store.snapshot();assert.match(snapshot.status.sync,/failed/i);
    assert.equal((await store.inspect('Home.md')).title,'Home');
  }
});

test('a note changed during sync waits for its completed contents while other notes remain readable',async t=>{
  const {store}=await fixture(t);
  await store.inspect('Target.md');
  const started=gate(), finish=gate();
  const markdown='# Rocket\nCompleted sync content.';
  const syncing=syncOnce(store,async()=>{
    await writeFile(join(store.vault,'Target.md'),'# Partial sync content');
    started.resolve();await finish.promise;
    await writeFile(join(store.vault,'Target.md'),markdown);
  });
  await started.promise;
  let resolved=false;
  const changed=store.inspect('Target.md').then(note=>{resolved=true;return note;});
  try {
    const other=await Promise.race([store.inspect('Home.md'),delay(1000,null,{ref:false})]);
    assert.equal(other?.title,'Home');
    assert.equal(resolved,false,'Do not expose partially synchronized contents');
  } finally {finish.resolve();await syncing;}
  const note=await changed;
  assert.equal(note.markdown,markdown);assert.equal(note.revision,revision(markdown));
});

test('an async cache check cannot return an entry invalidated or replaced during its stat',async t=>{
  const {store}=await fixture(t);
  for(const refresh of [false,true]){
    await store.snapshot();
    const target=await fs.realpath(join(store.vault,'Target.md'));
    const checkingStat=gate(), finishStat=gate();
    const original=fs.lstat;let calls=0;
    const mocked=t.mock.method(fs,'lstat',async(...args:Parameters<typeof fs.lstat>)=>{
      const result=await original(...args);
      if(args[0]===target&&++calls===2){checkingStat.resolve();await finishStat.promise;}
      return result;
    });
    syncBuiltinESMExports();
    const checking=store.index.current('Target.md');
    try {
      await checkingStat.promise;
      if(refresh)await store.index.refresh();else store.index.invalidate();
      finishStat.resolve();
      assert.equal(await checking,undefined);
    } finally {finishStat.resolve();mocked.mock.restore();syncBuiltinESMExports();}
  }
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
