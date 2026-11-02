import assert from 'node:assert/strict';
import { closeSync,fsyncSync,mkdirSync,openSync,readFileSync,renameSync,rmSync,writeFileSync } from 'node:fs';
import { mkdtemp,mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { BrainStore } from '../server/store.ts';
import { createWriteAssessor } from '../server/jev.ts';
import type { AssessMemoryInput } from '../src/shared.ts';

// Separate allowance: never resets or consumes the older evaluation ledger.
export async function withAssessmentBudget<T>(directory:string,run:()=>Promise<T>){
 mkdirSync(directory,{recursive:true,mode:0o700});const lock=join(directory,'runner.lock');mkdirSync(lock,{mode:0o700});const original=globalThis.fetch,file=join(directory,'assess-commit-2026-11-02-budget.json');
 try{
  let budget:{limit:number;requests:number};try{budget=JSON.parse(readFileSync(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('Invalid assessment budget');budget={limit:20,requests:0};}
  if(!budget||budget.limit!==20||!Number.isInteger(budget.requests)||budget.requests<0||budget.requests>20)throw Error('Invalid assessment budget');
  const start=budget.requests;
  function persist(){const temp=file+'.tmp',fd=openSync(temp,'w',0o600);try{writeFileSync(fd,JSON.stringify(budget)+'\n');fsyncSync(fd);}finally{closeSync(fd);}renameSync(temp,file);const dir=openSync(directory,'r');try{fsyncSync(dir);}finally{closeSync(dir);}}
  persist();globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),'https://api.typesafe.ai/v1/systemone');if(budget.requests>=20)throw Error('Assessment request budget exhausted');
   budget.requests++;persist();return original(input,init);
  };
  const result=await run();return{result,requests:budget.requests-start,totalRequests:budget.requests,limit:20};
 }finally{globalThis.fetch=original;rmSync(lock,{recursive:true});}
}
async function validate(){
 const key=process.env.JEV_API_KEY,model=process.env.JEV_MODEL;if(!key||model!=='jev-1.14.0')throw Error('Requires configured Jev key and pinned jev-1.14.0');
 const root=await mkdtemp(join(tmpdir(),'brain-assess-live-'));
 try{return await withAssessmentBudget(resolve('data/evals'),async()=>{
  const cases=[
   {name:'supported-capture',text:'# Storage decision\nUse SQLite for the local project database.',evidence:'We chose SQLite for the local project database.'},
   {name:'singapore-consolidation',intent:'consolidate',text:'# Singapore trip\nConcert April 18, 2027. Outbound Scoot April 17; return April 19. Hotel checkout is April 19 at 11:00; return flight is at 20:00, leaving a nine-hour gap.',evidence:'The concert is April 18, 2027. Scoot departs April 17 and returns April 19 at 20:00. Hotel checkout is April 19 at 11:00.',context:{'00 Inbox/Concert.md':'# Singapore concert\nConcert April 18, 2027.','00 Inbox/Flights.md':'# Singapore transport\nOutbound Scoot April 17; return April 19 at 20:00. Hotel checkout April 19 at 11:00.'}},
   {name:'sourced-correction',current:'# Launch\nLaunch Monday. Owner: Sam.',text:'# Launch\nLaunch Tuesday. Owner: Sam.',evidence:'The organizer corrected launch from Monday to Tuesday. Sam remains the owner.'},
   {name:'lifecycle-advice',text:'# Migration complete\nThe owner confirmed the storage migration is complete; retain the decision history.',evidence:'Migration completed and verified. The temporary migration checklist is superseded. Retain the decision history.',context:{'01 Projects/Migration checklist.md':'# Migration checklist\nTemporary checklist: migrate storage to SQLite.','01 Projects/Decision history.md':'# Decision history\nWe chose SQLite for the local storage layer.'}},
  ];
  const results=[];
  for(const item of cases){const vault=join(root,item.name,'vault');await mkdir(join(vault,'01 Projects'),{recursive:true});await mkdir(join(vault,'00 Inbox'));
   for(const [path,markdown] of Object.entries(item.context||{})){await mkdir(dirname(join(vault,path)),{recursive:true});await writeFile(join(vault,path),markdown);}
   const path='01 Projects/Result.md';if(item.current)await writeFile(join(vault,path),item.current);
   const store:BrainStore=new BrainStore({vault,data:join(root,item.name,'state'),accept:['new','update'],judge:async()=>{throw Error('Commit cannot invoke Jev');},writeAssessor:createWriteAssessor(key,model)});
   try{const current=item.current?await store.inspect(path):undefined,input:AssessMemoryInput={path,markdown:item.text,sources:[{title:'Synthetic authorized source',uri:'urn:test:'+item.name,observedAt:'2026-11-02T00:00:00Z',excerpt:item.evidence}],expectedRevision:current?.revision||null,idempotencyKey:'live-assess-'+item.name,intent:item.intent==='consolidate'?'consolidate':'capture',contextPaths:Object.keys(item.context||{})};
    const start=performance.now(),staged=await store.assessMemory(input,'Synthetic A'),milliseconds=Math.round(performance.now()-start);assert.equal(staged.assessment.status,'assessed',staged.assessment.error||'Assessment failed');
    const used=JSON.parse(readFileSync(resolve('data/evals/assess-commit-2026-11-02-budget.json'),'utf8')).requests;
    assert.equal((await store.assessMemory(input,'Synthetic A')).assessment.id,staged.assessment.id);
    const job=store.work.get(staged.workId)!;job.leaseUntil=0;store.db.prepare('UPDATE work SET payload=? WHERE id=?').run(JSON.stringify(job),job.id);const claim=await store.claimWork(job.id,'Synthetic B');
    const {intent,contextPaths,...candidate}=input,commit={...candidate,idempotencyKey:'live-commit-'+item.name,assessment:{id:staged.assessment.id,claimToken:claim.claimToken,reason:'Verified synthetic source; preserve the full supported update despite advisory classification'}};
    const saved=await store.remember(commit,'Synthetic B');assert.equal(saved.status,'applied',saved.reason);assert.equal(await readFile(join(vault,path),'utf8'),item.text);assert.equal((await store.remember(commit,'Synthetic B')).id,saved.id);
    const undo=await store.undoMemory({operationId:saved.id,expectedRevision:saved.revision!,reason:'Authorized cleanup of isolated synthetic validation',idempotencyKey:'live-undo-'+item.name},'Synthetic B');assert.equal(undo.status,'applied',undo.reason);if(item.current)assert.equal(await readFile(join(vault,path),'utf8'),item.current);else await assert.rejects(readFile(join(vault,path)),{code:'ENOENT'});
    assert.equal(JSON.parse(readFileSync(resolve('data/evals/assess-commit-2026-11-02-budget.json'),'utf8')).requests,used);
    results.push({case:item.name,milliseconds,model:staged.assessment.decision?.model,questionVersion:staged.assessment.decision?.questionVersion,adviceModel:staged.assessment.advice?.model,adviceVersion:staged.assessment.advice?.questionVersion,classification:staged.assessment.decision?.outcome,probabilities:staged.assessment.decision?.probabilities,recommendations:staged.assessment.recommendations,storedReplayCommitUndoExtraRequests:0});
   }finally{store.close();}
  }return results;
 });}finally{await rm(root,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await validate(),null,2));
