import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';
import { BrainStore } from '../server/store.ts';import{createHandler}from'../server/http.ts';import{hashPassword}from'../server/auth.ts';
test('private APIs reject anonymous access and MCP advertises OAuth',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'brain-http-'));const store=new BrainStore({vault:join(dir,'vault'),data:join(dir,'state'),judge:async()=>{throw Error('unused')}});t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true})});
 const handler=createHandler(store,{origin:'https://brain.example.com',passwordHash:hashPassword('owner-test-password-long'),bridgeKey:'bridge-test-key'});
 assert.equal((await handler(new Request('https://brain.example.com/api/brain'))).status,403);
 const request=(path:string)=>new Request('https://brain.example.com'+path,{headers:{'X-Brain-Bridge':'bridge-test-key'}});
 assert.equal((await handler(request('/api/brain'))).status,401);
 const mcp=await handler(request('/mcp'));assert.equal(mcp.status,401);assert.match(mcp.headers.get('www-authenticate')!,/oauth-protected-resource/);
 const metadata=await handler(request('/.well-known/oauth-protected-resource/mcp'));assert.equal((await metadata.json()).resource,'https://brain.example.com/mcp');
});
test('MCP SDK publishes the actual memory tools and serves a tool call',async t=>{
 const { createMemoryMcp }=await import('../server/mcp.ts');const dir=await mkdtemp(join(tmpdir(),'brain-mcp-'));const store=new BrainStore({vault:join(dir,'vault'),data:join(dir,'state'),judge:async()=>{throw Error('unused')}});t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true})});
 const handler=createMemoryMcp(store,'Test client');const call=async(method:string,params:any={})=>{const r=await handler.fetch(new Request('https://brain.example.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));const text=await r.text();return JSON.parse(text.startsWith('event:')||text.startsWith('data:')?text.split('\n').find(l=>l.startsWith('data:'))!.slice(5):text);};
 const result=await call('tools/list');assert.deepEqual(result.result.tools.map((x:any)=>x.name).sort(),['brain_status','claim_work','finish_work','inspect','list_work','promote','recall','remember','review_connection','review_memory','search','suggest_connections']);
 const recall=await call('tools/call',{name:'recall',arguments:{query:'coffee'}});assert.equal(recall.result.isError,undefined);assert.ok(recall.result.content[0].text.includes('Keyword'));
});
