import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import type { AssessMemoryInput, WriteAssessor } from '../src/shared.ts';

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
