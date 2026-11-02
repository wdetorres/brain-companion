import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import type { Operation } from '../src/shared.ts';
const sources=[{title:'Verified source',uri:'urn:test:undo',observedAt:'2026-11-02T00:00:00Z',excerpt:'A sourced decision.'}];
async function fixture(t:any){const root=await mkdtemp(join(tmpdir(),'brain-undo-')),vault=join(root,'vault');await mkdir(vault);const options={vault,data:join(root,'data'),accept:['new','update','promote'],judge:async()=>{throw Error('Undo never evaluates');}};let store=new BrainStore(options);t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});return{root,vault,store,reopen:()=>{store.close();store=new BrainStore(options);return store;}};}
const request=(op:Operation,key='undo-'+op.id)=>({operationId:op.id,expectedRevision:op.revision!,reason:'Owner requested this bounded reversal',idempotencyKey:key});
async function create(store:BrainStore,path='Projects/Plan.md',markdown='# Plan\nA sourced decision.') {return store.remember({path,markdown,sources,expectedRevision:null,idempotencyKey:'create-'+path},'A');}
test('undo restores an unchanged update and retains both original and inverse history',async t=>{
 const f=await fixture(t),original=await create(f.store),update=await f.store.remember({path:original.path,markdown:'# Plan\nRevised sourced decision.',sources,expectedRevision:original.revision!,idempotencyKey:'update-plan-undo'},'A');
 const undo=await f.store.undoMemory(request(update),'A');assert.equal(undo.status,'applied');assert.equal(undo.undo?.operationId,update.id);assert.equal(await readFile(join(f.vault,original.path),'utf8'),original.proposed);
 assert.equal((await f.store.operation(update.id))?.proposed,update.proposed);assert.equal((await f.store.undoMemory(request(update),'A')).id,undo.id);assert.equal((await f.store.undoMemory(request(update,'another-undo-key'),'A')).id,undo.id);
 assert.equal((await f.store.undoMemory(request(undo),'A')).status,'needs_attention');
});
test('undo of a created note waits for its dependent hub link to be removed',async t=>{
 const f=await fixture(t),original=await create(f.store),hub=await create(f.store,'Projects/Hub.md','# Hub\n[[Plan]]');
 const held=await f.store.undoMemory(request(original),'A');assert.equal(held.status,'needs_attention');assert.match(held.reason,/link|Hub/);assert.equal(await readFile(join(f.vault,original.path),'utf8'),original.proposed);
 assert.equal((await f.store.undoMemory(request(hub),'A')).status,'applied');const undone=await f.store.undoMemory(request(original),'A');assert.equal(undone.status,'applied');assert.equal(undone.undo?.files[0].after,null);await assert.rejects(readFile(join(f.vault,original.path)),{code:'ENOENT'});
});
test('undo refuses later edits, disabled scopes and symlink substitution without changing files',async t=>{
 const f=await fixture(t),original=await create(f.store);await writeFile(join(f.vault,original.path),'# Later human change');const held=await f.store.undoMemory(request(original),'A');assert.equal(held.status,'needs_attention');assert.equal(await readFile(join(f.vault,original.path),'utf8'),'# Later human change');
 await writeFile(join(f.vault,original.path),original.proposed);f.store.accept.delete('new');assert.equal((await f.store.undoMemory(request(original),'A')).status,'needs_attention');f.store.accept.add('new');
 await rm(join(f.vault,original.path));await writeFile(join(f.root,'outside.md'),original.proposed);await symlink(join(f.root,'outside.md'),join(f.vault,original.path));await assert.rejects(f.store.undoMemory(request(original),'A'),/symbolic|symlink/i);assert.equal(await readFile(join(f.root,'outside.md'),'utf8'),original.proposed);
});
test('promotion undo restores the original source and refuses a reused source path',async t=>{
 const f=await fixture(t);await mkdir(join(f.vault,'01 Projects'));const original=await create(f.store,'00 Inbox/Plan.md');const job=(await f.store.listWork({kind:'inbox'}))[0],claim=await f.store.claimWork(job.id,'A');
 const promoted=await f.store.promote({sourcePath:original.path,path:'01 Projects/Plan.md',markdown:original.proposed,sources,expectedRevision:original.revision!,idempotencyKey:'promote-for-undo',claimToken:claim.claimToken},'A');
 await writeFile(join(f.vault,original.path),'# New content at old path');assert.equal((await f.store.undoMemory(request(promoted),'A')).status,'needs_attention');await rm(join(f.vault,original.path));
 const undo=await f.store.undoMemory(request(promoted),'A');assert.equal(undo.status,'applied');assert.equal(await readFile(join(f.vault,original.path),'utf8'),original.proposed);await assert.rejects(readFile(join(f.vault,promoted.path)),{code:'ENOENT'});
});
test('restart reconciles each partial inverse state and never overwrites a conflicting later edit',async t=>{
 for(const stage of ['before','first-file','all-files','conflict']){
   const f=await fixture(t);await mkdir(join(f.vault,'01 Projects'));const original=await create(f.store,'00 Inbox/Plan.md'),job=(await f.store.listWork({kind:'inbox'}))[0],claim=await f.store.claimWork(job.id,'A');
   const promoted=await f.store.promote({sourcePath:original.path,path:'01 Projects/Plan.md',markdown:original.proposed,sources,expectedRevision:original.revision!,idempotencyKey:'promote-recovery',claimToken:claim.claimToken},'A'),undo=await f.store.undoMemory(request(promoted),'A');
   if(stage==='before')await rm(join(f.vault,original.path));if(stage!=='all-files')await writeFile(join(f.vault,promoted.path),stage==='conflict'?'# Later edit':promoted.proposed);
   f.store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify({...undo,status:'pending'}),undo.id);
   const recovered=await f.reopen().operation(undo.id);assert.equal(recovered?.status,stage==='conflict'?'needs_attention':'applied');
   assert.equal(await readFile(join(f.vault,original.path),'utf8'),original.proposed);if(stage==='conflict')assert.equal(await readFile(join(f.vault,promoted.path),'utf8'),'# Later edit');else await assert.rejects(readFile(join(f.vault,promoted.path)),{code:'ENOENT'});
 }
});
