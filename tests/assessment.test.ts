import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import type { AssessMemoryInput, WriteAssessor, RememberInput, Decision } from '../src/shared.ts';

const sources=[{title:'Verified decision',uri:'urn:test:decision',observedAt:'2026-11-02T00:00:00Z',excerpt:'Use SQLite for the personal project.'}];
const input:AssessMemoryInput={path:'Projects/Plan.md',markdown:'# Plan\nUse SQLite for the personal project.',sources,expectedRevision:null,idempotencyKey:'assess-plan-0001',intent:'capture'};
const result={decision:{outcome:'uncertain' as const,confidence:.85,model:'test',usage:{},probabilities:{supported:.85,duplicate:.86}},recommendations:[]};
async function fixture(t:any,writeAssessor:WriteAssessor=async()=>result){
 const root=await mkdtemp(join(tmpdir(),'brain-assess-')),vault=join(root,'vault');await mkdir(vault);const options={vault,data:join(root,'data'),judge:async()=>result.decision,writeAssessor,accept:['new','update','promote']};
 let store=new BrainStore(options);t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});return{vault,store,reopen:()=>{store.close();store=new BrainStore(options);return store;}};
}
test('assessment saves genuine feedback and candidate without writing a note; exact retry survives restart',async t=>{
 let calls=0;const f=await fixture(t,async()=>{calls++;return result;});const a=await f.store.assessMemory(input,'A');
 assert.equal(a.assessment.status,'assessed');assert.equal(a.assessment.decision?.probabilities?.duplicate,.86);assert.ok(a.claimToken);
 await assert.rejects(readFile(join(f.vault,input.path)),{code:'ENOENT'});
 const store=f.reopen(),retry=await store.assessMemory(input,'A');assert.equal(retry.assessment.id,a.assessment.id);assert.equal(calls,1);
 assert.equal((await store.listWork({kind:'assessment'}))[0].assessmentId,a.assessment.id);assert.equal((await store.assessment(a.assessment.id))?.input.markdown,input.markdown);
 await assert.rejects(store.assessMemory({...input,markdown:'Changed'},'A'),/Idempotency/);
});
test('concurrent assessment retry does not call Jev again or block vault synchronization',async t=>{
 let release!:()=>void,started!:()=>void,calls=0;const ready=new Promise<void>(r=>started=r),waiting=new Promise<void>(r=>release=r);
 const f=await fixture(t,async()=>{calls++;started();await waiting;return result;});const pending=f.store.assessMemory(input,'A');await ready;
 const retry=await f.store.assessMemory(input,'A');assert.equal(retry.assessment.status,'assessing');let synced=false;await f.store.synchronize(async()=>{synced=true;});assert.equal(synced,true);
 release();assert.equal((await pending).assessment.id,retry.assessment.id);assert.equal(calls,1);
});
test('stale revisions, private candidates and explicit private/missing context are rejected before assessment',async t=>{
 let calls=0;const f=await fixture(t,async()=>{calls++;return result;});await writeFile(join(f.vault,'Private.md'),'---\nsensitivity: confidential\n---\nPrivate');
 await assert.rejects(f.store.assessMemory({...input,markdown:'---\nsensitivity: confidential\n---\nSecret'},'A'),/privacy|scope/i);
 await assert.rejects(f.store.assessMemory({...input,contextPaths:['Private.md']},'A'),/privacy|scope/i);
 await assert.rejects(f.store.assessMemory({...input,contextPaths:['Missing.md']},'A'),/context|found/i);
 await assert.rejects(f.store.assessMemory({...input,expectedRevision:'outdated'},'A'),/revision/i);
 await assert.rejects(f.store.assessMemory({...input,sources:sources.map(({excerpt,...s})=>s)},'A'),/excerpt/i);assert.equal(calls,0);
});
test('assessment records bounded context revisions and never leaks another client claim',async t=>{
 let context:any;const f=await fixture(t,async(_input,current,related)=>{context={current,related};return result;});await writeFile(join(f.vault,'Related.md'),'# Related\n'+'x'.repeat(15000));
 const a=await f.store.assessMemory({...input,contextPaths:['Related.md']},'A');assert.equal(context.related[0].markdown.length,12000);assert.equal(a.assessment.context.related[0].truncated,true);
 assert.equal(a.assessment.context.related[0].revision,(await f.store.inspect('Related.md')).revision);
 assert.equal((await f.store.assessMemory({...input,contextPaths:['Related.md']},'B')).claimToken,undefined);
 assert.ok(!JSON.stringify(await f.store.assessment(a.assessment.id)).includes(a.claimToken!));assert.ok(!JSON.stringify(await f.store.listWork({})).includes(a.claimToken!));
});
test('failed and interrupted assessments remain inspectable without exposing upstream errors or fabricating scores',async t=>{
 const f=await fixture(t,async()=>{throw Error('secret upstream response');});const a=await f.store.assessMemory(input,'A');assert.equal(a.assessment.status,'unavailable');assert.equal(a.assessment.decision,undefined);assert.ok(!JSON.stringify(a).includes('secret'));
 f.store.db.prepare('UPDATE assessments SET payload=? WHERE id=?').run(JSON.stringify({...a.assessment,status:'assessing',error:undefined}),a.assessment.id);
 const recovered=await f.reopen().assessment(a.assessment.id);assert.equal(recovered?.status,'unavailable');assert.match(recovered?.error||'',/interrupt/i);
});
function commit(a:Awaited<ReturnType<BrainStore['assessMemory']>>,changes:Partial<RememberInput>={}):RememberInput{
 const {path,markdown,sources,expectedRevision}=a.assessment.input;return{path,markdown,sources,expectedRevision,idempotencyKey:'commit-'+a.assessment.id,assessment:{id:a.assessment.id,claimToken:a.claimToken!,reason:'Original sources verified; consolidation is useful'},...changes};
}
test('every quality outcome is advisory and an assessment has only one primary commit',async t=>{
 for(const outcome of ['uncertain','conflict','duplicate','not_worth_remembering'] as Decision['outcome'][]){
   let calls=0;const f=await fixture(t,async()=>{calls++;return{...result,decision:{...result.decision,outcome}};});const a=await f.store.assessMemory(input,'A'),write=commit(a),op=await f.store.remember(write,'A');
   assert.equal(op.status,'applied');assert.equal(op.assessment?.candidateMatches,true);assert.equal((await f.store.remember(write,'A')).id,op.id);assert.equal(calls,1);
   assert.equal((await f.store.assessment(a.assessment.id))?.progress?.resolution?.operationId,op.id);assert.deepEqual(await f.store.listWork({}),[]);
   await assert.rejects(f.store.remember({...write,path:'Projects/Another.md',idempotencyKey:'competing-'+outcome},'A'),/complete|resolved/i);
 }
});
test('revised candidates and changed context keep the original assessment with truthful associations',async t=>{
 const f=await fixture(t);await writeFile(join(f.vault,'Reference.md'),'# Earlier evidence');const a=await f.store.assessMemory({...input,contextPaths:['Reference.md']},'A');await writeFile(join(f.vault,'Reference.md'),'# Later evidence');
 const op=await f.store.remember(commit(a,{markdown:'# Revised\nA sourced revision.'}),'A');assert.equal(op.status,'applied');assert.equal(op.assessment?.candidateMatches,false);assert.equal(op.assessment?.contextChanged,true);
 assert.equal((await f.store.assessment(a.assessment.id))?.input.markdown,input.markdown);
 const hub=await f.store.remember({path:'Projects/Index.md',markdown:'[[Plan]]',sources,expectedRevision:null,idempotencyKey:'parent-associated',relatedAssessmentId:a.assessment.id},'A');assert.equal(hub.status,'applied');assert.equal(hub.assessment?.role,'related');assert.equal(hub.assessment?.candidateMatches,null);
});
test('an unavailable assessment can commit; stale writes stay recoverable without a second proposal job',async t=>{
 const f=await fixture(t,async()=>{throw Error('Unavailable');}),a=await f.store.assessMemory(input,'A');await mkdir(join(f.vault,'Projects'));await writeFile(join(f.vault,input.path),'# Human addition');
 const held=await f.store.remember(commit(a),'A');assert.equal(held.status,'needs_attention');assert.equal(await readFile(join(f.vault,input.path),'utf8'),'# Human addition');assert.deepEqual(await f.store.listWork({kind:'proposal'}),[]);
 const note=await f.store.inspect(input.path),op=await f.store.remember(commit(a,{markdown:note.markdown+'\nPreserved context and new evidence.',expectedRevision:note.revision,idempotencyKey:'corrected-after-stale'}),'A');assert.equal(op.status,'applied');assert.equal((await f.store.operation(held.id))?.status,'needs_attention');
});
test('reassigned assessment claims fence old agents and support explicit no-change completion',async t=>{
 const f=await fixture(t),a=await f.store.assessMemory(input,'A'),raw=f.store.work.get(a.workId)!;raw.leaseUntil=0;f.store.db.prepare('UPDATE work SET payload=? WHERE id=?').run(JSON.stringify(raw),raw.id);
 const b=await f.store.claimWork(a.workId,'B');await assert.rejects(f.store.remember(commit(a),'A'),/claim/i);
 await f.store.finishWork({id:b.id,claimToken:b.claimToken,outcome:'done',reason:'Existing note already covers this; no change'},'B');
 assert.match((await f.store.assessment(a.assessment.id))?.progress?.resolution?.reason||'',/no change/);
 await assert.rejects(f.store.remember(commit({...a,claimToken:b.claimToken}),'B'),/complete|resolved/i);await assert.rejects(readFile(join(f.vault,input.path)),{code:'ENOENT'});
});
test('an intentional unresolved Inbox save leaves one Inbox job and no unfinished assessment',async t=>{
 const f=await fixture(t),a=await f.store.assessMemory(input,'A');const op=await f.store.remember(commit(a,{path:'00 Inbox/Plan.md',markdown:'---\nstatus: inbox\nreview_reason: Destination requires source clarification\n---\n# Pending\nAvailable source context.'}),'A');assert.equal(op.status,'applied');
 const jobs=await f.store.listWork({});assert.equal(jobs.length,1);assert.equal(jobs[0].kind,'inbox');assert.match(jobs[0].reason,/Destination requires source clarification/);assert.equal((await f.store.assessment(a.assessment.id))?.progress?.resolution?.operationId,op.id);
});
test('pending committed-write recovery closes its assessment before another primary commit',async t=>{
 const f=await fixture(t),a=await f.store.assessMemory(input,'A'),op=await f.store.remember(commit(a),'A');
 f.store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify({...op,status:'pending'}),op.id);f.store.db.prepare('UPDATE assessments SET progress=? WHERE id=?').run(JSON.stringify({operationId:op.id}),a.assessment.id);
 const job=f.store.work.get(a.workId)!;f.store.db.prepare('UPDATE work SET status=?,payload=? WHERE id=?').run('open',JSON.stringify({...job,status:'open'}),job.id);
 const store=f.reopen();assert.equal((await store.operation(op.id))?.status,'applied');assert.equal((await store.assessment(a.assessment.id))?.progress?.resolution?.operationId,op.id);assert.equal((await store.listWork({kind:'assessment'})).length,0);
 await assert.rejects(store.remember(commit(a,{idempotencyKey:'after-crash-second'}),'A'),/complete|resolved/i);
});
test('existing cached Inbox captures acquire their real review reason without erasing deferred blockers',async t=>{
 const f=await fixture(t);await mkdir(join(f.vault,'00 Inbox'));await writeFile(join(f.vault,'00 Inbox/Pending.md'),'---\nreview_reason: Original source is missing\n---\n# Pending');
 const job=(await f.store.listWork({kind:'inbox'}))[0],row=f.store.db.prepare('SELECT payload FROM note_index WHERE path=?').get(job.path)!,legacy=JSON.parse(String(row.payload));delete legacy.reviewReason;
 f.store.db.prepare('UPDATE note_index SET payload=? WHERE path=?').run(JSON.stringify(legacy),job.path);f.store.db.prepare('DELETE FROM metadata WHERE key=?').run('noteParserVersion');
 f.store.db.prepare('UPDATE work SET payload=? WHERE id=?').run(JSON.stringify({...job,reason:'Verify sources and filing destination'}),job.id);
 const store=f.reopen();assert.equal((await store.listWork({kind:'inbox'}))[0].reason,'Original source is missing');const claim=await store.claimWork(job.id,'B');
 await store.finishWork({id:job.id,claimToken:claim.claimToken,outcome:'deferred',reason:'Source account is inaccessible'},'B');assert.equal((await store.listWork({kind:'inbox'}))[0].reason,'Source account is inaccessible');
});
