import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import { parseNote } from '../server/vault.ts';
const sources=[{title:'Decision',uri:'urn:test:decision',observedAt:'2026-10-31T00:00:00Z',excerpt:'Use SQLite.'}];
async function fixture(t:any){const root=await mkdtemp(join(tmpdir(),'harness-memory-'));const vault=join(root,'vault');await mkdir(vault);let calls=0;
 const store=new BrainStore({vault,data:join(root,'data'),judge:async()=>{calls++;return{outcome:'new',confidence:.99,model:'test',usage:{}};}});t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});return{root,vault,store,calls:()=>calls};}
test('sensitive new proposals remain local before evaluation',async t=>{const f=await fixture(t);const op=await f.store.remember({path:'Secret.md',markdown:'---\nsensitivity: confidential\n---\nPrivate context',sources,expectedRevision:null,idempotencyKey:'private-candidate'},'A');assert.equal(op.status,'needs_attention');assert.equal(f.calls(),0);});
test('non-mapping or invalid privacy frontmatter never reaches Jev',async t=>{const f=await fixture(t);for(const [i,frontmatter] of ['- sensitivity: confidential','private','contains_client_data: "true"','sensitivity: [confidential]'].entries()){
 const op=await f.store.remember({path:`Private${i}.md`,markdown:`---\n${frontmatter}\n---\nPrivate detail`,sources,expectedRevision:null,idempotencyKey:'malformed-private-'+i},'A');assert.equal(op.status,'needs_attention');
 }assert.equal(f.calls(),0);});
test('privacy labels fail closed across capture, assessment and cached recall after upgrade',async t=>{
 const f=await fixture(t);f.store.accept.add('new');
 const labels=['sensitivity: Internal','sensitivity: " confidential "','sensitivity: private','sensitivity: unknown','Sensitivity: confidential','"sensitivity ": confidential','portability: INTERNAL','portability: unknown','scope: Work-client','scope: Client','contains_client_data: "TRUE"'];
 for(const [i,label] of labels.entries()){
  const markdown=`---\n${label}\n---\n# Launch\nPrivate launch details.`,candidate={path:`Private${i}.md`,markdown,sources,expectedRevision:null,idempotencyKey:'privacy-label-'+i};
  assert.equal(parseNote(candidate.path,markdown,'').assessmentAllowed,false,label);
  assert.match((await f.store.remember(candidate,'A')).reason,/privacy scope/);
  await assert.rejects(f.store.assessMemory({...candidate,intent:'capture'},'A'),/privacy scope/);
 }
 assert.equal(parseNote('Portable.md','---\nsensitivity: normal\nscope: work-example\nportability: portable\n---\n# Sanitized','').assessmentAllowed,true);
 await writeFile(join(f.vault,'Legacy.md'),'---\nsensitivity: Internal\n---\n# Launch\nPrivate launch details.');await f.store.snapshot();
 const legacy=await f.store.inspect('Legacy.md');
 f.store.db.prepare('UPDATE note_index SET payload=? WHERE path=?').run(JSON.stringify({...legacy,assessmentAllowed:true}),legacy.path);
 f.store.db.prepare('UPDATE metadata SET value=? WHERE key=?').run('2','noteParserVersion');f.store.close();
 let calls=0;const reopened=new BrainStore({vault:f.vault,data:join(f.root,'data'),judge:async()=>{throw Error('No writes');},recallJudge:async()=>{calls++;throw Error('Must not disclose');}});t.after(()=>reopened.close());
 await reopened.recall('launch');assert.equal(calls,0);assert.equal((await reopened.inspect('Legacy.md')).assessmentAllowed,false);
 assert.equal((await reopened.search('launch')).length,1,'Owner search remains local and available');
});
test('held proposal requires a current claim; old claimant cannot dismiss after reassignment',async t=>{const {store}=await fixture(t);const op=await store.remember({path:'Plan.md',markdown:'# Plan\nUse SQLite.',sources,expectedRevision:null,idempotencyKey:'held-candidate'},'A');const job=(await store.listWork({}))[0];const a=await store.claimWork(job.id,'A');
 const raw=store.work.get(job.id)!;raw.leaseUntil=0;store.db.prepare('UPDATE work SET payload=? WHERE id=?').run(JSON.stringify(raw),job.id);const b=await store.claimWork(job.id,'B');
 await assert.rejects(store.reviewMemory({id:op.id,action:'dismiss',reason:'Old worker',claimToken:a.claimToken},'A'),/claim/);
 const reviewed=await store.reviewMemory({id:op.id,action:'dismiss',reason:'Reviewed by B',claimToken:b.claimToken},'B');assert.equal(reviewed.resolution?.actor,'B');assert.equal((await store.listWork({})).length,0);
});
test('owner acceptance applies a held proposal once, but never overwrites a newer page',async t=>{const {store,vault}=await fixture(t);const op=await store.remember({path:'Plan.md',markdown:'# Plan\nUse SQLite.',sources,expectedRevision:null,idempotencyKey:'owner-candidate'},'A');store.accept.add('new');
 const input={id:op.id,action:'accept' as const,reason:'Sources checked',idempotencyKey:'owner-accept-key'};
 const accepted=await store.reviewMemory(input,'Owner',true);assert.equal(accepted.status,'applied');assert.equal((await store.reviewMemory(input,'Owner',true)).id,accepted.id);
 store.accept.delete('new');const held=await store.remember({path:'Other.md',markdown:'# Other\nUse SQLite.',sources,expectedRevision:null,idempotencyKey:'other-candidate'},'A');await writeFile(join(vault,'Other.md'),'# Human revision');store.accept.add('new');
 const stale=await store.reviewMemory({...input,id:held.id,idempotencyKey:'owner-stale-key'},'Owner',true);assert.equal(stale.status,'needs_attention');assert.equal(await readFile(join(vault,'Other.md'),'utf8'),'# Human revision');
});
test('a claimed legacy uncertain proposal saves without rerunning the blocking evaluation',async t=>{
 const {store,vault,calls}=await fixture(t);
 const original=await store.remember({path:'Trip.md',markdown:'# Trip\nA combined summary of the existing source notes.',sources,expectedRevision:null,idempotencyKey:'legacy-uncertain-trip'},'A');
 store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify({...original,decision:{outcome:'uncertain',confidence:.85,model:'legacy',usage:{},probabilities:{duplicate:.86}}}),original.id);
 const job=(await store.listWork({kind:'proposal'}))[0],claim=await store.claimWork(job.id,'B');store.accept.add('new');
 const input={id:original.id,action:'accept' as const,reason:'Verified the original notes and consolidation',claimToken:claim.claimToken,idempotencyKey:'direct-legacy-accept'};
 const saved=await store.reviewMemory(input,'B');assert.equal(saved.status,'applied');assert.equal(saved.decision,undefined);
 assert.equal(await readFile(join(vault,original.path),'utf8'),original.proposed);assert.equal(calls(),0);
 assert.equal((await store.reviewMemory(input,'B')).id,saved.id);assert.deepEqual(await store.listWork({kind:'proposal'}),[]);
 assert.equal((await store.operation(original.id))?.resolution?.operationId,saved.id);
});
test('review preserves explicit create-only revision even when a page already existed at proposal time',async t=>{
 const {store,vault}=await fixture(t);await writeFile(join(vault,'Exists.md'),'# Existing owner text');
 const held=await store.remember({path:'Exists.md',markdown:'# Replacement',sources,expectedRevision:null,idempotencyKey:'create-collision'},'A');
 store.accept.add('new');store.accept.add('update');const result=await store.reviewMemory({id:held.id,action:'accept',reason:'Review',idempotencyKey:'review-collision'},'Owner',true);
 assert.equal(result.status,'needs_attention');assert.equal(await readFile(join(vault,'Exists.md'),'utf8'),'# Existing owner text');
});
test('privacy changes invalidate previous review claims even when no new review is eligible',async t=>{
 const {store,vault}=await fixture(t);await writeFile(join(vault,'Plan.md'),'# Before');await store.snapshot();await writeFile(join(vault,'Plan.md'),'# After');
 const job=(await store.listWork({kind:'review'}))[0],claim=await store.claimWork(job.id,'A');await writeFile(join(vault,'Plan.md'),'---\nsensitivity: confidential\n---\n# New private revision');
 await assert.rejects(store.finishWork({id:job.id,claimToken:claim.claimToken,outcome:'done',reason:'Reviewed old text'},'A'),/claim/);
});
test('interrupted journal recovery makes uncommitted writes available for proposal review',async t=>{
 const {store}=await fixture(t);const op=await store.remember({path:'Missing.md',markdown:'# Missing',sources,expectedRevision:null,idempotencyKey:'recover-held-job'},'A');
 store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify({...op,status:'pending'}),op.id);store.db.prepare('DELETE FROM work WHERE subject=?').run('operation:'+op.id);
 const recovered=await store.operation(op.id);assert.equal(recovered?.status,'needs_attention');assert.equal((await store.listWork({kind:'proposal'}))[0].operationId,op.id);
});
