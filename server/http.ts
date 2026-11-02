import { z } from 'zod';
import { categories } from '../src/shared.ts';
import { timingSafeEqual } from 'node:crypto';
import { AuthService, json } from './auth.ts';import{createMemoryMcp}from'./mcp.ts';import type{BrainStore}from'./store.ts';
export function createHandler(store:BrainStore,config:{origin:string;passwordHash:string;bridgeKey?:string}){
 const auth=new AuthService(store.db,config);return async(req:Request):Promise<Response>=>{
  try{
   const url=new URL(req.url);if(url.pathname==='/healthz')return json({ok:true});
   if(config.bridgeKey){const key=req.headers.get('x-brain-bridge')||'';if(key.length!==config.bridgeKey.length||!timingSafeEqual(Buffer.from(key),Buffer.from(config.bridgeKey)))return json({error:'Forbidden'},403);}
   const origin=req.headers.get('origin');if(url.pathname==='/mcp'){const body=req.method==='POST'?await req.clone().json().catch(()=>null):null;const operation=['initialize','notifications/initialized','tools/list','tools/call'].includes(body?.method)?body.method:'other';console.info('MCP diagnostic',JSON.stringify({method:req.method,operation,origin:origin?(origin===auth.origin?'same':origin==='https://chatgpt.com'?'chatgpt':'other'):'none',authorization:!!req.headers.get('authorization')}));}if(origin&&origin!==auth.origin)return json({error:'Origin not allowed'},403);
   const authResponse=await auth.handle(req);if(authResponse)return authResponse;
   if(url.pathname==='/mcp'){
    const grant=auth.bearer(req.headers.get('authorization'));if(!grant)return json({error:'Authentication required'},401,{'WWW-Authenticate':`Bearer resource_metadata="${auth.origin}/.well-known/oauth-protected-resource/mcp", scope="brain"`});
    if(grant.scope!=='brain')return json({error:'Insufficient scope'},403);
    const response=await createMemoryMcp(store,grant.name+' ('+grant.clientId+')').fetch(req);console.info('MCP diagnostic result',response.status);return response;
   }
   if(!auth.session(req))return json({error:'Sign in to your Brain'},401);
   if(req.method==='POST'&&['/api/recall','/api/connections/suggest','/api/connections/review','/api/memories/review'].includes(url.pathname)){
    const text=await req.text();if(text.length>4096)return json({error:'Request too large'},413);
    const body=JSON.parse(text);if(!auth.csrf(req,body?.csrf))return json({error:'Invalid origin or CSRF token'},403);
    if(url.pathname==='/api/memories/review'){const input=z.object({csrf:z.string(),id:z.string().min(1).max(128),action:z.enum(['accept','dismiss']),reason:z.string().trim().min(1).max(1000),idempotencyKey:z.string().min(8).max(128).optional()}).strict().parse(body);return json(await store.reviewMemory(input,'Owner · memory review',true));}
    if(url.pathname==='/api/recall'){const input=z.object({csrf:z.string(),query:z.string().trim().min(1).max(1000),category:z.enum(categories).optional()}).strict().parse(body);return json(await store.recall(input.query,input.category));}
    if(url.pathname==='/api/connections/suggest'){const input=z.object({csrf:z.string(),path:z.string().min(1).max(512)}).strict().parse(body);return json({connections:await store.suggestConnections(input.path)});}
    const input=z.object({csrf:z.string(),id:z.string().min(1).max(128),action:z.enum(['accept','dismiss'])}).strict().parse(body);return json(await store.reviewConnection(input.id,input.action));
   }
   if(req.method!=='GET')return json({error:'Method not allowed'},405);
   if(url.pathname==='/api/brain'){const snapshot=await store.snapshot();return json({...snapshot,notes:snapshot.notes.map(n=>({...n,markdown:'',body:''})),operations:snapshot.operations.map(o=>({...o,before:null,proposed:''}))});}
   if(url.pathname==='/api/note'){const path=url.searchParams.get('path');if(!path)return json({error:'Missing path'},400);return json(await store.inspect(path));}
   if(url.pathname==='/api/operation'){const operation=await store.operation(url.searchParams.get('id')||'');return operation?json(operation):json({error:'Not found'},404);}
   if(url.pathname==='/api/work'){const offset=z.coerce.number().int().min(0).max(1000000).parse(url.searchParams.get('offset')||0);const items=await store.listWork({limit:10,offset});return json({items,nextOffset:items.length===10?offset+10:null});}
   if(url.pathname==='/api/search')return json({notes:await store.search(url.searchParams.get('q')||'')});
   return json({error:'Not found'},404);
  }catch{return json({error:'Request could not be completed'},400);}
 };
}
