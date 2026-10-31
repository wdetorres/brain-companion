import { timingSafeEqual } from 'node:crypto';
import { AuthService, json } from './auth.ts';import{createMemoryMcp}from'./mcp.ts';import type{BrainStore}from'./store.ts';
export function createHandler(store:BrainStore,config:{origin:string;passwordHash:string;bridgeKey?:string}){
 const auth=new AuthService(store.db,config);return async(req:Request):Promise<Response>=>{
  try{
   const url=new URL(req.url);if(url.pathname==='/healthz')return json({ok:true});
   if(config.bridgeKey){const key=req.headers.get('x-brain-bridge')||'';if(key.length!==config.bridgeKey.length||!timingSafeEqual(Buffer.from(key),Buffer.from(config.bridgeKey)))return json({error:'Forbidden'},403);}
   const origin=req.headers.get('origin');if(origin&&origin!==auth.origin)return json({error:'Origin not allowed'},403);
   const authResponse=await auth.handle(req);if(authResponse)return authResponse;
   if(url.pathname==='/mcp'){
    const grant=auth.bearer(req.headers.get('authorization'));if(!grant)return json({error:'Authentication required'},401,{'WWW-Authenticate':`Bearer resource_metadata="${auth.origin}/.well-known/oauth-protected-resource/mcp", scope="brain"`});
    if(grant.scope!=='brain')return json({error:'Insufficient scope'},403);
    return await createMemoryMcp(store,grant.name+' ('+grant.clientId.slice(0,8)+')').fetch(req);
   }
   if(!auth.session(req))return json({error:'Sign in to your Brain'},401);
   if(req.method!=='GET')return json({error:'Web access is read-only'},405);
   if(url.pathname==='/api/brain'){const snapshot=await store.snapshot();return json({...snapshot,notes:snapshot.notes.map(n=>({...n,markdown:'',body:''})),operations:snapshot.operations.map(o=>({...o,before:null,proposed:''}))});}
   if(url.pathname==='/api/note'){const path=url.searchParams.get('path');if(!path)return json({error:'Missing path'},400);return json(await store.inspect(path));}
   if(url.pathname==='/api/operation'){const operation=await store.operation(url.searchParams.get('id')||'');return operation?json(operation):json({error:'Not found'},404);}
   if(url.pathname==='/api/search')return json({notes:await store.recall(url.searchParams.get('q')||'')});
   return json({error:'Not found'},404);
  }catch{return json({error:'Request could not be completed'},400);}
 };
}
