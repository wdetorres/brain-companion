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
