import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import { readVault } from '../server/vault.ts';

const source = { title: 'Planning conversation', uri: 'https://example.com/conversation', observedAt: '2026-10-31T00:00:00Z' };
async function fixture(t: any, judge: any = async () => ({ outcome: 'new', confidence: .99, model: 'test', usage: {} })) {
  const dir = await mkdtemp(join(tmpdir(), 'brain-test-')); const vault = join(dir, 'vault'); await mkdir(vault);
  const store = new BrainStore({ vault, data: join(dir, 'state'), judge, accept: ['new', 'update'] });
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, vault, store };
}
test('indexes wikilinks, heading links and unique titles without inventing unresolved pages', async t => {
  const { vault } = await fixture(t); await mkdir(join(vault, '01 Projects'));
  await writeFile(join(vault,'Home.md'),'# Home\n[[Plan#Next|next]] [[Missing]]\n`[[not-a-link]]`');
  await writeFile(join(vault,'01 Projects/Plan.md'),'---\ntitle: Plan\ntags: [demo]\n---\n# Plan\n[home](../Home.md)');
  const notes = await readVault(vault); const home = notes.find(n=>n.path==='Home.md')!;
  assert.deepEqual(home.links,['01 Projects/Plan.md']); assert.deepEqual(home.unresolved,['Missing']);
  assert.deepEqual(notes.find(n=>n.path.endsWith('Plan.md'))!.links,['Home.md']);
});
test('retains ambiguous same-name links as unresolved', async t => {
  const {vault}=await fixture(t); for(const dir of ['A','B']) {await mkdir(join(vault,dir));await writeFile(join(vault,dir,'Plan.md'),'# Plan');}
  await writeFile(join(vault,'Home.md'),'[[Plan]]'); const notes=await readVault(vault);
  assert.deepEqual(notes.find(n=>n.path==='Home.md')!.links,[]);
  assert.deepEqual(notes.find(n=>n.path==='Home.md')!.unresolved,['Plan']);
});
test('rejects traversal, policy files and symlink writes', async t => {
  const {store,vault,dir}=await fixture(t); await mkdir(join(dir,'outside')); await symlink(join(dir,'outside'),join(vault,'escape'));
  for(const path of ['../secret.md','/tmp/a.md','AGENTS.md','_System/rules.md','.obsidian/config.md','escape/a.md']) {
    await assert.rejects(store.remember({path,markdown:'# Bad',sources:[source],expectedRevision:null,idempotencyKey:'key-'+path},'test'));
  }
});
test('applies exact submitted markdown, persists history and returns the same operation for a retry', async t => {
  const {store,vault,dir}=await fixture(t); const input={path:'Projects/Plan.md',markdown:'# Plan\n\nMonday.\n',sources:[source],expectedRevision:null,idempotencyKey:'remember-plan-001'};
  const first=await store.remember(input,'ChatGPT'); assert.equal(first.status,'applied');
  assert.equal(await readFile(join(vault,input.path),'utf8'),input.markdown);
  const retry=await store.remember(input,'ChatGPT'); assert.equal(retry.id,first.id);
  await assert.rejects(store.remember({...input,markdown:'# Changed'},'ChatGPT'),/idempotency/i);
  store.close(); const reopened=new BrainStore({vault,data:join(dir,'state'),judge:async()=>{throw Error('should not run')}}); t.after(()=>reopened.close());
  assert.equal((await reopened.remember(input,'ChatGPT')).id,first.id); assert.equal((await reopened.snapshot()).operations.length,1);
});
test('does not replace a page when the expected revision is stale', async t => {
  const {store,vault}=await fixture(t); await writeFile(join(vault,'Plan.md'),'# Human edit');
  const op=await store.remember({path:'Plan.md',markdown:'# Agent edit',sources:[source],expectedRevision:'old-revision',idempotencyKey:'stale-write-01'},'agent');
  assert.equal(op.status,'needs_attention'); assert.equal(await readFile(join(vault,'Plan.md'),'utf8'),'# Human edit');
});
test('serializes competing creates so one wins and one retains a proposal', async t => {
  const {store}=await fixture(t); const base={path:'Plan.md',sources:[source],expectedRevision:null};
  const ops=await Promise.all([store.remember({...base,markdown:'# A',idempotencyKey:'competing-write-a'},'agent'),store.remember({...base,markdown:'# B',idempotencyKey:'competing-write-b'},'agent')]);
  assert.deepEqual(ops.map(o=>o.status),['applied','needs_attention']);
});
test('disabled writes retain a proposal without consulting Jev', async t => {
  let calls=0;const {store,vault}=await fixture(t,async()=>{calls++;throw Error('Unavailable')});store.accept.clear();
  const op=await store.remember({path:'Plan.md',markdown:'# Proposal',sources:[source],expectedRevision:null,idempotencyKey:'failed-model-001'},'agent');
  assert.equal(op.status,'needs_attention'); assert.match(op.reason,/not enabled/);assert.equal(op.proposed,'# Proposal'); assert.equal((await readVault(vault)).length,0);assert.equal(calls,0);
});
test('records an externally edited page without sending it through Jev', async t=>{
  const {store,vault}=await fixture(t,async()=>{throw Error('Must not evaluate sync')});
  await writeFile(join(vault,'Plan.md'),'# Before'); await store.snapshot();
  await writeFile(join(vault,'Plan.md'),'# After'); const snapshot=await store.snapshot();
  assert.equal(snapshot.operations[0].status,'external'); assert.equal(snapshot.operations[0].before,'# Before');
});
test('rejects missing evidence and oversized notes before a write',async t=>{
  const {store}=await fixture(t);
  await assert.rejects(store.remember({path:'Plan.md',markdown:'# Plan',sources:[],expectedRevision:null,idempotencyKey:'no-evidence-001'},'agent'));
  await assert.rejects(store.remember({path:'Plan.md',markdown:'x'.repeat(131073),sources:[source],expectedRevision:null,idempotencyKey:'too-large-001'},'agent'));
});
test('recovers a journaled commit on direct idempotent retry and operation inspection after restart', async t => {
  const {store,vault,dir}=await fixture(t);
  const input={path:'Plan.md',markdown:'# Plan',sources:[source],expectedRevision:null,idempotencyKey:'recover-direct-001'};
  const applied=await store.remember(input,'agent');
  const pending={...applied,status:'pending',revision:undefined};
  store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify(pending),applied.id);
  store.close();
  const restarted=new BrainStore({vault,data:join(dir,'state'),judge:async()=>{throw Error('must not evaluate twice')}});t.after(()=>restarted.close());
  const recovered=await restarted.remember(input,'agent');
  assert.equal(recovered.status,'applied');assert.equal(recovered.revision,applied.revision);
  restarted.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify(pending),applied.id);
  const inspected=await restarted.operation(applied.id);
  assert.equal(inspected?.status,'applied');assert.equal(inspected?.revision,applied.revision);
});
test('agents can consolidate overlapping notes and update them without an evaluator or review hold',async t=>{
  let calls=0;const {store,vault}=await fixture(t,async()=>{calls++;throw Error('Evaluator unavailable');});
  await writeFile(join(vault,'Flight.md'),'# Trip flight\nThe flight is Monday.');
  await writeFile(join(vault,'Hotel.md'),'# Trip hotel\nThe hotel is booked for Sunday.');
  const input={path:'Trip.md',markdown:'---\nmemory_category: project_fact\n---\n# Trip\nThe flight is Monday. The hotel is booked for Sunday.\n\nSources: [[Flight]] [[Hotel]]\n',sources:[source],expectedRevision:null,idempotencyKey:'direct-consolidation'};
  const created=await store.remember(input,'agent');assert.equal(created.status,'applied');assert.equal(created.decision,undefined);
  assert.equal(await readFile(join(vault,input.path),'utf8'),input.markdown);
  const update={...input,markdown:input.markdown+'\nKeep the original booking notes.\n',expectedRevision:created.revision!,idempotencyKey:'direct-update'};
  const updated=await store.remember(update,'agent');assert.equal(updated.status,'applied');assert.equal(updated.before,input.markdown);
  assert.equal(await readFile(join(vault,input.path),'utf8'),update.markdown);
  assert.equal((await store.inspect(input.path)).category,'project_fact');
  assert.equal((await store.remember(update,'agent')).id,updated.id);
  const unchanged=await store.remember({...update,expectedRevision:updated.revision!,idempotencyKey:'direct-exact-copy'},'agent');assert.equal(unchanged.status,'duplicate');
  assert.deepEqual(await store.listWork({kind:'proposal'}),[]);assert.equal(calls,0);
});
