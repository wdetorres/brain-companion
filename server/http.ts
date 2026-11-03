import { z } from 'zod';
import { createInterestStore } from './interest.ts';
import { categories } from '../src/shared.ts';
import { timingSafeEqual } from 'node:crypto';
import { undoMemorySchema } from './store.ts';
import { type AuthService, json } from './auth.ts';import{createMemoryMcp}from'./mcp.ts';import type{BrainStore}from'./store.ts';
export function createHandler(store:BrainStore,config:{auth:AuthService;bridgeKey?:string}){
 const auth=config.auth,interest=createInterestStore(store.db);return async(req:Request):Promise<Response>=>{
  try{
   const url=new URL(req.url);if(url.pathname==='/healthz')return json({ok:true});
   if(config.bridgeKey){const key=req.headers.get('x-brain-bridge')||'';if(key.length!==config.bridgeKey.length||!timingSafeEqual(Buffer.from(key),Buffer.from(config.bridgeKey)))return json({error:'Forbidden'},403);}
   if(config.bridgeKey&&req.headers.has('x-brain-fetch-mode')){const mode=req.headers.get('x-brain-fetch-mode')!;if(mode)req.headers.set('sec-fetch-mode',mode);else req.headers.delete('sec-fetch-mode');req.headers.delete('x-brain-fetch-mode');}
   const origin=req.headers.get('origin');if(origin&&origin!==auth.origin)return json({error:'Origin not allowed'},403);
   const authResponse=await auth.handle(req);if(authResponse)return authResponse;
   if(url.pathname==='/api/interest'&&req.method==='POST'){
    if(origin!==auth.origin)return json({error:'Origin not allowed'},403);
    if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return json({error:'JSON required'},415);
    const text=await req.text();if(text.length>1024)return json({error:'Request too large'},413);
    const input=z.discriminatedUnion('event',[z.object({event:z.literal('code_click')}).strict(),z.object({event:z.literal('waitlist'),email:z.string().trim().toLowerCase().pipe(z.email().max(254))}).strict()]).parse(JSON.parse(text));
    if(!interest.record(input.event==='waitlist'?input.email:undefined))return json({error:'Too many requests. Try again in a minute.'},429,{'Retry-After':'60'});
    return json({ok:true});
   }
   if(url.pathname==='/mcp'){
    const grant=await auth.bearer(req.headers.get('authorization'));if(!grant)return json({error:'Authentication required'},401,{'WWW-Authenticate':`Bearer resource_metadata="${auth.origin}/.well-known/oauth-protected-resource/mcp", scope="brain"`});
    if(grant.scope!=='brain')return json({error:'Insufficient scope'},403);
    const response=await createMemoryMcp(store,grant.name+' ('+grant.clientId+')').fetch(req);if(response.ok)auth.recordUse(grant.clientId);return response;
   }
   if(!await auth.session(req))return json({error:'Sign in to your Brain'},401);
   if(url.pathname==='/api/interest'&&req.method==='GET')return json(interest.summary());
   if(url.pathname==='/api/interest/export'&&req.method==='GET')return new Response(interest.exportCsv(),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="brain-waitlist.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   if(url.pathname==='/api/interest/remove'&&req.method==='POST'){
    const text=await req.text();if(text.length>1024)return json({error:'Request too large'},413);
    const body=JSON.parse(text);if(!auth.csrf(req,body?.csrf))return json({error:'Invalid origin or CSRF token'},403);
    const input=z.object({csrf:z.string(),email:z.email().max(254)}).strict().parse(body);interest.remove(input.email);return json({ok:true});
   }
   if(url.pathname==='/api/apps'&&req.method==='GET')return json({apps:await auth.clients(req)});
   if(req.method==='POST'&&['/api/apps/revoke','/api/consent'].includes(url.pathname)){
    const text=await req.text();if(text.length>16384)return json({error:'Request too large'},413);
    const body=JSON.parse(text);if(!auth.csrf(req,body?.csrf)){console.warn('Brain app request rejected',{path:url.pathname,hasOrigin:!!origin,sameOrigin:origin===auth.origin,hasCsrfCookie:(req.headers.get('cookie')||'').includes('brain_csrf='),hasCsrfToken:typeof body?.csrf==='string'});return json({error:'Invalid origin or CSRF token'},403);}
    if(url.pathname==='/api/apps/revoke'){const input=z.object({csrf:z.string(),clientId:z.string().min(1).max(256)}).strict().parse(body);await auth.revokeClient(req,input.clientId);return json({ok:true});}
    const input=z.object({csrf:z.string(),query:z.string().min(1).max(12000)}).strict().parse(body);return json(await auth.consentDetails(req,input.query));
   }
   if(req.method==='POST'&&['/api/recall','/api/connections/suggest','/api/connections/review','/api/memories/review','/api/memories/undo'].includes(url.pathname)){
    const text=await req.text();if(text.length>4096)return json({error:'Request too large'},413);
    const body=JSON.parse(text);if(!auth.csrf(req,body?.csrf))return json({error:'Invalid origin or CSRF token'},403);
    if(url.pathname==='/api/memories/undo'){const {csrf,...input}=undoMemorySchema.extend({csrf:z.string()}).parse(body);return json(await store.undoMemory(input,'Owner · undo'));}
    if(url.pathname==='/api/memories/review'){const input=z.object({csrf:z.string(),id:z.string().min(1).max(128),action:z.enum(['accept','dismiss']),reason:z.string().trim().min(1).max(1000),idempotencyKey:z.string().min(8).max(128).optional()}).strict().parse(body);return json(await store.reviewMemory(input,'Owner · memory review',true));}
    if(url.pathname==='/api/recall'){const input=z.object({csrf:z.string(),query:z.string().trim().min(1).max(1000),category:z.enum(categories).optional()}).strict().parse(body);return json(await store.recall(input.query,input.category));}
    if(url.pathname==='/api/connections/suggest'){const input=z.object({csrf:z.string(),path:z.string().min(1).max(512)}).strict().parse(body);return json({connections:await store.suggestConnections(input.path)});}
    const input=z.object({csrf:z.string(),id:z.string().min(1).max(128),action:z.enum(['accept','dismiss'])}).strict().parse(body);return json(await store.reviewConnection(input.id,input.action));
   }
   if(req.method!=='GET')return json({error:'Method not allowed'},405);
   if(url.pathname==='/api/brain'){const snapshot=await store.snapshot();return json({...snapshot,notes:snapshot.notes.map(n=>({...n,markdown:'',body:''})),operations:snapshot.operations.map(o=>({...o,before:null,proposed:''}))});}
   if(url.pathname==='/api/note'){const path=url.searchParams.get('path');if(!path)return json({error:'Missing path'},400);return json(await store.inspect(path));}
   if(url.pathname==='/api/operation'){const operation=await store.operation(url.searchParams.get('id')||'');return operation?json(operation):json({error:'Not found'},404);}
   if(url.pathname==='/api/assessment'){const id=z.string().min(1).max(128).parse(url.searchParams.get('id'));const assessment=await store.assessment(id);return assessment?json(assessment):json({error:'Not found'},404);}
   if(url.pathname==='/api/work'){const offset=z.coerce.number().int().min(0).max(1000000).parse(url.searchParams.get('offset')||0);const items=await store.listWork({limit:10,offset});return json({items,nextOffset:items.length===10?offset+10:null});}
   if(url.pathname==='/api/search')return json({notes:await store.search(url.searchParams.get('q')||'')});
   return json({error:'Not found'},404);
  }catch(error){if(new URL(req.url).pathname==='/api/consent')console.warn('Brain consent validation failed',{error:error instanceof Error?error.name:'unknown'});return json({error:'Request could not be completed'},400);}
 };
}
