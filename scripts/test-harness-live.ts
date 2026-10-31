import assert from 'node:assert/strict';
import { mkdtemp,mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { readFileSync,writeFileSync,mkdirSync,rmSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { BrainStore } from '../server/store.ts';
import { createJevJudge,createRecallJudge } from '../server/jev.ts';

if(!process.env.JEV_API_KEY||process.env.JEV_MODEL!=='jev-1.14.0')throw Error('Requires configured Jev key and pinned jev-1.14.0');
const budgetPath=resolve('data/evals/budget.json'),lock=resolve('data/evals/runner.lock');
mkdirSync(lock);const fetchOriginal=globalThis.fetch;let store:BrainStore|undefined,root:string|undefined;
try{
  const budget=JSON.parse(readFileSync(budgetPath,'utf8')) as {requests:number;limit:number};
  assert.ok(Number.isInteger(budget.requests)&&budget.requests>=0&&budget.limit<=2000&&budget.requests<budget.limit);
  const start=budget.requests;
  globalThis.fetch=async(input,init)=>{
    assert.equal(String(input),'https://api.typesafe.ai/v1/systemone');
    if(budget.requests>=budget.limit||budget.requests-start>=12)throw Error('Live check request budget exhausted');
    budget.requests++;writeFileSync(budgetPath,JSON.stringify(budget,null,2)+'\n',{mode:0o600});return fetchOriginal(input,init);
  };
  root=await mkdtemp(join(tmpdir(),'brain-harness-live-'));const vault=join(root,'vault');await mkdir(join(vault,'00 Inbox'),{recursive:true});await mkdir(join(vault,'01 Projects'));
  const judge=createJevJudge(process.env.JEV_API_KEY,process.env.JEV_MODEL);
  store=new BrainStore({vault,data:join(root,'state'),judge,recallJudge:createRecallJudge(process.env.JEV_API_KEY,process.env.JEV_MODEL)});
  const input={path:'00 Inbox/Storage decision.md',markdown:'# Storage decision\n\nWe chose SQLite for the local storage layer.\n',sources:[{title:'Synthetic planning decision',uri:'urn:test:harness-storage',observedAt:'2026-10-31T00:00:00Z',excerpt:'We chose SQLite for the local storage layer.'}],expectedRevision:null,idempotencyKey:'live-harness-capture'};
  const held=await store.remember(input,'Synthetic client A');assert.equal(held.status,'needs_attention');assert.equal(held.decision?.outcome,'new');
  const job=(await store.listWork({kind:'proposal'}))[0],claim=await store.claimWork(job.id,'Synthetic client B');store.accept.add('new');store.accept.add('promote');
  const saved=await store.reviewMemory({id:held.id,action:'accept',reason:'Checked synthetic source',claimToken:claim.claimToken,idempotencyKey:'live-harness-reviewed'},'Synthetic client B');assert.equal(saved.status,'applied');
  const inbox=(await store.listWork({kind:'inbox'}))[0],filing=await store.claimWork(inbox.id,'Synthetic client A');
  const promoted=await store.promote({...input,sourcePath:input.path,path:'01 Projects/Storage decision.md',expectedRevision:saved.revision!,claimToken:filing.claimToken,idempotencyKey:'live-harness-promoted'},'Synthetic client A');
  assert.equal(promoted.status,'applied',promoted.reason);assert.equal(await readFile(join(vault,promoted.path),'utf8'),input.markdown);await assert.rejects(readFile(join(vault,input.path)));
  const recall=await store.recall('Which database did we choose for the local storage layer?');assert.equal(recall.status,'assessed');assert.ok(recall.notes.some(n=>n.path===promoted.path));
  const calls=budget.requests;assert.equal((await store.promote({...input,sourcePath:input.path,path:promoted.path,expectedRevision:saved.revision!,claimToken:filing.claimToken,idempotencyKey:'live-harness-promoted'},'Synthetic client A')).id,promoted.id);assert.equal(budget.requests,calls);
  console.log(JSON.stringify({passed:true,heldThenReviewed:true,crossClientPromotion:true,recallEvidence:recall.notes.length,idempotent:true,requests:budget.requests-start,totalRequests:budget.requests,limit:budget.limit}));
}finally{globalThis.fetch=fetchOriginal;store?.close();if(root)await rm(root,{recursive:true,force:true});rmSync(lock,{recursive:true});}
