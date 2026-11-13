import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';
import { BrainStore } from '../server/store.ts';import{createHandler}from'../server/http.ts';import { fixture } from './auth-fixture.ts';
import { owner, clientFlow, origin, request } from './auth-fixture.ts';
import { writeFile, mkdir } from 'node:fs/promises';
test('private APIs reject anonymous access and MCP advertises OAuth',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'brain-http-'));const store=new BrainStore({vault:join(dir,'vault'),data:join(dir,'state'),judge:async()=>{throw Error('unused')}});t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true})});
 const {service:auth}=await fixture(t);const handler=createHandler(store,{auth,bridgeKey:'bridge-test-key'});
 assert.equal((await handler(new Request('https://brain.example.com/api/brain'))).status,403);
 const request=(path:string)=>new Request('https://brain.example.com'+path,{headers:{'X-Brain-Bridge':'bridge-test-key'}});
 assert.equal((await handler(request('/api/brain'))).status,401);
 const mcp=await handler(request('/mcp'));assert.equal(mcp.status,401);assert.match(mcp.headers.get('www-authenticate')!,/oauth-protected-resource/);
 const metadata=await handler(request('/.well-known/oauth-protected-resource/mcp'));assert.equal((await metadata.json()).resource,'https://brain.example.com/mcp');
});

test('MCP challenge grants renew expired access without another login; revoke requires CSRF', async t => {
 const dir=await mkdtemp(join(tmpdir(),'brain-auth-mcp-'));
 const vault=join(dir,'vault');await mkdir(vault);await writeFile(join(vault,'Example.md'),'# Synthetic note\n\nOrchid is the test keyword.');
 const store=new BrainStore({vault,data:join(dir,'state'),judge:async()=>{throw Error('unused')}});
 t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});
 const {service:auth,db}=await fixture(t),{cookie}=await owner(auth,db);
 const handler=createHandler(store,{auth,bridgeKey:'synthetic-bridge'});
 const challenge=await handler(new Request(origin+'/mcp',{headers:{'X-Brain-Bridge':'synthetic-bridge'}}));
 assert.equal(challenge.status,401);
 const scope=challenge.headers.get('www-authenticate')?.match(/\bscope="([^"]+)"/)?.[1];assert.ok(scope);
 const flow=await clientFlow(auth,cookie,scope);let tokens=await flow.tokens();
 assert.ok(tokens.refresh_token,'Following the advertised scopes must issue a refresh token');
 const call=async(method:string,params:object={})=>handler(new Request(origin+'/mcp',{method:'POST',headers:{'X-Brain-Bridge':'synthetic-bridge',Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));
 assert.equal((await call('tools/list')).status,200);
 const ctx=await auth.auth.$context;
 await ctx.adapter.update({model:'oauthAccessToken',where:[{field:'clientId',value:flow.client.client_id}],update:{expiresAt:new Date(0)}});
 assert.equal((await call('tools/list')).status,401);
 const refresh=request('/api/auth/oauth2/token',{grant_type:'refresh_token',client_id:flow.client.client_id,refresh_token:tokens.refresh_token,resource:origin+'/mcp'});refresh.headers.set('x-brain-bridge','synthetic-bridge');
 const refreshed=await handler(refresh);assert.equal(refreshed.status,200);
 tokens=await refreshed.json();assert.ok(tokens.refresh_token);
 assert.equal((await call('tools/list')).status,200);
 const inspected=await call('tools/call',{name:'inspect',arguments:{path:'Example.md'}});assert.equal(inspected.status,200);assert.match(await inspected.text(),/Orchid/);
 const apps=await auth.clients(request('/api/apps',undefined,cookie));assert.equal(apps.length,1);assert.ok(apps[0]!.lastUsed);
 const denied=request('/api/apps/revoke',{clientId:flow.client.client_id},cookie);denied.headers.set('x-brain-bridge','synthetic-bridge');assert.equal((await handler(denied)).status,403);
 const session=await auth.handle(request('/api/auth/session',undefined,cookie));const {csrf}=await session!.json();
 const revoke=request('/api/apps/revoke',{clientId:flow.client.client_id,csrf},cookie+'; '+session!.headers.getSetCookie()[0]!.split(';')[0]);revoke.headers.set('x-brain-bridge','synthetic-bridge');
 const foreign=new Request(revoke.clone(),{headers:new Headers(revoke.headers)});foreign.headers.set('origin','https://evil.example');assert.equal((await handler(foreign)).status,403);
 assert.equal((await handler(revoke)).status,200);assert.equal((await call('tools/list')).status,401);
});
test('MCP SDK publishes the actual memory tools and serves a tool call',async t=>{
 const { createMemoryMcp }=await import('../server/mcp.ts');const dir=await mkdtemp(join(tmpdir(),'brain-mcp-'));const store=new BrainStore({vault:join(dir,'vault'),data:join(dir,'state'),judge:async()=>{throw Error('unused')}});t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true})});
 const handler=createMemoryMcp(store,'Test client');const call=async(method:string,params:any={})=>{const r=await handler.fetch(new Request('https://brain.example.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));const text=await r.text();return JSON.parse(text.startsWith('event:')||text.startsWith('data:')?text.split('\n').find(l=>l.startsWith('data:'))!.slice(5):text);};
 const result=await call('tools/list');assert.deepEqual(result.result.tools.map((x:any)=>x.name).sort(),['assess_memory','brain_status','claim_work','finish_work','inspect','list_work','promote','recall','remember','review_connection','review_memory','search','suggest_connections','undo_memory']);
 const recall=await call('tools/call',{name:'recall',arguments:{query:'coffee'}});assert.equal(recall.result.isError,undefined);assert.ok(recall.result.content[0].text.includes('Keyword'));
});
