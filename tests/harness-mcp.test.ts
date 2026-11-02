import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,rm,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import { createMemoryMcp } from '../server/mcp.ts';

test('different MCP clients capture, discover work, claim, promote and consume the same memory',async t=>{
  const root=await mkdtemp(join(tmpdir(),'brain-harness-mcp-'));const vault=join(root,'vault');await mkdir(join(vault,'00 Inbox'),{recursive:true});await mkdir(join(vault,'01 Projects'));
  const store=new BrainStore({vault,data:join(root,'state'),accept:['new','update','promote'],judge:async(_input,current)=>({outcome:current?'update':'new',confidence:.99,model:'test',usage:{},category:'decision',worthRemembering:true,probabilities:{supported:.99,conflict:0,worth:.99,duplicate:0}})});
  t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});
  const clients={A:createMemoryMcp(store,'A'),B:createMemoryMcp(store,'B')};
  async function rpc(client:'A'|'B',method:string,params:object){const r=await clients[client].fetch(new Request('https://brain.test/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));const body=await r.text();return JSON.parse(body.startsWith('event:')||body.startsWith('data:')?body.split('\n').find(l=>l.startsWith('data:'))!.slice(5):body);}
  async function call(client:'A'|'B',name:string,args:object={}){const r=await rpc(client,'tools/call',{name,arguments:args});assert.equal(r.error,undefined);let data;try{data=JSON.parse(r.result.content[0].text);}catch{data={error:r.result.content[0].text};}return {error:r.result.isError,data};}
  assert.equal((await rpc('A','resources/list',{})).result.resources.length,2);
  assert.ok((await rpc('B','resources/read',{uri:'brain://guide'})).result.contents[0].text.includes('remember'));
  assert.deepEqual((await call('A','brain_status')).data.autoAccept,['new','update','promote']);
  const input={path:'00 Inbox/Storage.md',markdown:'# Storage\nUse SQLite for this project.',sources:[{title:'Project decision',uri:'urn:test:storage-decision',observedAt:'2026-10-31T00:00:00Z',excerpt:'Use SQLite for this project.'}],expectedRevision:null,idempotencyKey:'mcp-capture-storage'};
  assert.equal((await call('A','remember',input)).data.status,'applied');
  const work=(await call('B','list_work')).data.items[0];assert.equal(work.kind,'inbox');
  const claim=(await call('B','claim_work',{id:work.id})).data;
  assert.equal((await call('A','claim_work',{id:work.id})).error,true);
  assert.equal((await call('A','list_work')).data.items[0].claimToken,undefined);
  const note=(await call('B','inspect',{path:input.path})).data;
  const promotion=await call('B','promote',{...input,sourcePath:input.path,path:'01 Projects/Storage.md',expectedRevision:note.revision,idempotencyKey:'mcp-promote-storage',claimToken:claim.claimToken});
  assert.equal(promotion.error,undefined);assert.equal(promotion.data.status,'applied');
  assert.equal((await call('A','search',{query:'SQLite'})).data[0].path,'01 Projects/Storage.md');
  assert.equal(await readFile(join(vault,'01 Projects/Storage.md'),'utf8'),input.markdown);
  assert.equal((await call('B','list_work')).data.items.length,0);
  assert.equal((await call('A','search',{query:'SQLite',limit:10000})).error,true);
});
test('any MCP client can resume an expired assessment, commit once and explicitly undo it',async t=>{
 const root=await mkdtemp(join(tmpdir(),'brain-assess-mcp-')),vault=join(root,'vault');let calls=0;
 const store=new BrainStore({vault,data:join(root,'state'),accept:['new','update'],judge:async()=>{throw Error('No commit judge');},writeAssessor:async()=>{calls++;return{decision:{outcome:'uncertain',confidence:.86,model:'test',usage:{}},recommendations:[]};}});
 t.after(async()=>{store.close();await rm(root,{recursive:true,force:true});});
 const clients={A:createMemoryMcp(store,'A'),B:createMemoryMcp(store,'B')};
 async function call(client:'A'|'B',name:string,args:object={}){const response=await clients[client].fetch(new Request('https://brain.test/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));const text=await response.text(),r=JSON.parse(text.startsWith('event:')||text.startsWith('data:')?text.split('\n').find(l=>l.startsWith('data:'))!.slice(5):text);return{error:r.error||r.result?.isError,data:r.result?.content?.[0]?.text?JSON.parse(r.result.content[0].text):undefined};}
 const input={path:'01 Projects/Plan.md',markdown:'# Plan\nUse SQLite.',sources:[{title:'Source',uri:'urn:test:plan',observedAt:'2026-11-02T00:00:00Z',excerpt:'Use SQLite.'}],expectedRevision:null,idempotencyKey:'mcp-assess-plan',intent:'capture'};
 const staged=await call('A','assess_memory',input);assert.equal(staged.error,undefined);const a=staged.data;
 assert.equal((await call('B','inspect',{assessmentId:a.assessment.id})).data.input.markdown,input.markdown);assert.equal((await call('B','list_work',{kind:'assessment'})).data.items[0].claimToken,undefined);
 const job=store.work.get(a.workId)!;job.leaseUntil=0;store.db.prepare('UPDATE work SET payload=? WHERE id=?').run(JSON.stringify(job),job.id);const b=(await call('B','claim_work',{id:job.id})).data;
 const {intent,...candidate}=input,write={...candidate,idempotencyKey:'mcp-commit-plan',assessment:{id:a.assessment.id,claimToken:b.claimToken,reason:'Verified by the resuming client'}};
 assert.equal((await call('A','remember',{...write,assessment:{...write.assessment,claimToken:a.claimToken}})).error,true);
 const saved=(await call('B','remember',write)).data;assert.equal(saved.status,'applied');assert.equal((await call('B','remember',write)).data.id,saved.id);assert.equal(calls,1);
 const undone=(await call('B','undo_memory',{operationId:saved.id,expectedRevision:saved.revision,reason:'Owner requested reversal',idempotencyKey:'mcp-undo-plan'})).data;assert.equal(undone.status,'applied');await assert.rejects(readFile(join(vault,input.path)),{code:'ENOENT'});
});
