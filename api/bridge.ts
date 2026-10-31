import type { IncomingMessage, ServerResponse } from 'node:http';
export default async function bridge(req:IncomingMessage & {query?:Record<string,string|string[]>;body?:unknown},res:ServerResponse){
 const backend=process.env.BRAIN_SERVICE_URL,key=process.env.BRAIN_BRIDGE_KEY;
 if(!backend||!key){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'The private brain service is not connected yet.'}));return;}
 const parsed=new URL(req.url||'/','https://placeholder.invalid');const route=req.query?.route||parsed.searchParams.get('route');
 if(typeof route!=='string'||!/^((api\/(brain|note|operation|search|recall|work|memories\/review|connections\/(suggest|review)|auth\/(session|login|logout)))|mcp|oauth\/(register|authorize|consent|token|revoke)|\.well-known\/oauth-(authorization-server|protected-resource(?:\/mcp)?))$/.test(route)){res.statusCode=404;res.end();return;}
 const base=new URL(backend);if(base.protocol!=='https:'){res.statusCode=503;res.end('HTTPS service URL required');return;}
 const target=new URL('/'+route,base);for(const [k,v]of parsed.searchParams)if(k!=='route')target.searchParams.append(k,v);
 const headers=new Headers({'X-Brain-Bridge':key});for(const name of ['authorization','cookie','content-type','accept','origin','mcp-protocol-version','mcp-session-id']){const value=req.headers[name];if(typeof value==='string')headers.set(name,value);}
 try{
  let body:string|Buffer|undefined;
  if(!['GET','HEAD'].includes(req.method||'GET')){if(req.body!==undefined){body=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body:headers.get('content-type')?.includes('application/x-www-form-urlencoded')?new URLSearchParams(req.body as Record<string,string>).toString():JSON.stringify(req.body);}else{const chunks:Buffer[]=[];let length=0;for await(const chunk of req){const b=Buffer.from(chunk);length+=b.length;if(length>300000)throw Error('Request too large');chunks.push(b);}body=Buffer.concat(chunks);}}
  if(body&&Buffer.byteLength(body)>300000){res.statusCode=413;res.end();return;}
  const upstream=await fetch(target,{method:req.method,headers,body:Buffer.isBuffer(body)?body.toString('utf8'):body,redirect:'manual',signal:AbortSignal.timeout(55000)});
  res.statusCode=upstream.status;for(const [name,value]of upstream.headers)if(!['connection','transfer-encoding','content-encoding','content-length','set-cookie'].includes(name))res.setHeader(name,value);
  const cookies=upstream.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);res.setHeader('Cache-Control','no-store');
  if(upstream.body){for await(const chunk of upstream.body as any)res.write(Buffer.from(chunk));}res.end();
 }catch{res.statusCode=502;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Brain service unavailable. Please try again.'}));}
}
