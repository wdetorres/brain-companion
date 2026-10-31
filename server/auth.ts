import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const token=()=>randomBytes(32).toString('base64url');
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const equal=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function hashPassword(password:string):string {if(password.length<16)throw Error('Use at least 16 characters');const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password:string,hash:string){if(password.length>1024)return false;const [salt,want]=hash.split(':');if(!salt||!want||!/^[a-f0-9]{128}$/.test(want))return false;return equal(scryptSync(password,salt,64).toString('hex'),want);}
export function json(data:unknown,status=200,extra:Record<string,string>={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
function cookie(req:Request,name:string){return (req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';}
type Grant={clientId:string;name:string;resource:string;scope:string;family:string};
export class AuthService {
  readonly db:DatabaseSync; readonly origin:string;readonly resource:string;private passwordHash:string;
  constructor(db:DatabaseSync,config:{origin:string;passwordHash:string}){
    this.db=db;this.origin=new URL(config.origin).origin;this.resource=this.origin+'/mcp';this.passwordHash=config.passwordHash;
    if(!/^https:\/\//.test(this.origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(this.origin))throw Error('HTTPS public origin required');
    db.exec('CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires INTEGER NOT NULL)');
  }
  private put(key:string,value:unknown,seconds:number){this.db.prepare('INSERT OR REPLACE INTO auth VALUES(?,?,?)').run(key,JSON.stringify(value),Date.now()+seconds*1000);}
  private get(key:string):any{const r=this.db.prepare('SELECT payload FROM auth WHERE key=? AND expires>?').get(key,Date.now());return r?JSON.parse(r.payload as string):undefined;}
  private remove(key:string){this.db.prepare('DELETE FROM auth WHERE key=?').run(key);}
  private setCookie(name:string,value:string,maxAge=3600){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${this.origin.startsWith('https:')?'; Secure':''}`;}
  private limited(bucket:string,max:number,seconds:number){const key='rate:'+bucket;const prev=this.get(key)||{count:0,until:Date.now()+seconds*1000};prev.count++;this.put(key,prev,Math.max(1,(prev.until-Date.now())/1000));return prev.count>max;}
  csrf(req:Request,value:unknown){return req.headers.get('origin')===this.origin&&typeof value==='string'&&value.length>=32&&equal(cookie(req,'brain_csrf'),value);}
  session(req:Request):boolean{return !!this.get('session:'+digest(cookie(req,'brain_session')));}
  bearer(header:string|null):Grant|undefined {if(!header?.startsWith('Bearer '))return;const grant=this.get('access:'+digest(header.slice(7)));if(grant&&grant.resource===this.resource&&!this.get('revoked:'+grant.family))return grant;}
  private issue(grant:Grant){const access=token(),refresh=token();this.put('access:'+digest(access),grant,3600);this.put('refresh:'+digest(refresh),grant,30*86400);return {access_token:access,token_type:'Bearer',expires_in:3600,refresh_token:refresh,scope:grant.scope};}
  async handle(req:Request):Promise<Response|undefined>{
    const url=new URL(req.url),path=url.pathname;
    if(path==='/.well-known/oauth-protected-resource'||path==='/.well-known/oauth-protected-resource/mcp')return json({resource:this.resource,authorization_servers:[this.origin],scopes_supported:['brain'],bearer_methods_supported:['header'],resource_name:'Brain companion'});
    if(path==='/.well-known/oauth-authorization-server')return json({issuer:this.origin,authorization_endpoint:this.origin+'/oauth/authorize',token_endpoint:this.origin+'/oauth/token',registration_endpoint:this.origin+'/oauth/register',revocation_endpoint:this.origin+'/oauth/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none','client_secret_post'],scopes_supported:['brain'],authorization_response_iss_parameter_supported:true});
    if(!path.startsWith('/oauth/')&&!path.startsWith('/api/auth/'))return;
    if(req.method==='OPTIONS')return new Response(null,{status:204});
    let body:any={};
    if(req.method==='POST'){
      const text=await req.text();if(text.length>16384)return json({error:'invalid_request'},413);
      try{body=req.headers.get('content-type')?.includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));}catch{return json({error:'invalid_request'},400)}
      if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'invalid_request'},400);
    }
    if(path==='/api/auth/session'&&req.method==='GET'){const csrf=token();return json({authenticated:this.session(req),csrf},200,{'Set-Cookie':this.setCookie('brain_csrf',csrf)});}
    if(path==='/api/auth/login'&&req.method==='POST'){
      if(!this.csrf(req,body.csrf))return json({error:'Invalid login origin or CSRF token'},403);
      if(this.limited('login',10,60))return json({error:'Try again in a minute'},429);
      if(typeof body.password!=='string'||!verifyPassword(body.password,this.passwordHash))return json({error:'Incorrect password'},401);
      const session=token();this.put('session:'+digest(session),{owner:true},86400);return json({authenticated:true},200,{'Set-Cookie':this.setCookie('brain_session',session,86400)});
    }
    if(path==='/api/auth/logout'&&req.method==='POST'){if(!this.csrf(req,body.csrf))return json({error:'Forbidden'},403);this.remove('session:'+digest(cookie(req,'brain_session')));return json({ok:true},200,{'Set-Cookie':this.setCookie('brain_session','',0)});}
    if(path==='/oauth/register'&&req.method==='POST'){
      if(this.limited('register',30,3600))return json({error:'temporarily_unavailable'},429);
      const redirects=body.redirect_uris;
      if(!Array.isArray(redirects)||!redirects.length||redirects.length>5||redirects.some((s:unknown)=>{try{if(typeof s!=='string'||s.length>2000)return true;const u=new URL(s);return u.protocol!=='https:'||!!u.username||!!u.password||!!u.hash;}catch{return true;}}))return json({error:'invalid_redirect_uri'},400);
      const method=body.token_endpoint_auth_method||'none';if(!['none','client_secret_post'].includes(method))return json({error:'invalid_client_metadata'},400);
      const id=token(),secret=method==='none'?undefined:token();const client={client_id:id,client_name:typeof body.client_name==='string'?body.client_name.slice(0,120):'MCP client',redirect_uris:redirects,token_endpoint_auth_method:method,grant_types:['authorization_code','refresh_token'],response_types:['code']};
      this.put('client:'+id,{...client,secret:secret?digest(secret):undefined},365*86400);return json({...client,...(secret?{client_secret:secret,client_secret_expires_at:0}:{})},201);
    }
    if(path==='/oauth/authorize'&&req.method==='GET'){
      const q=Object.fromEntries(url.searchParams);const client=this.get('client:'+q.client_id);
      if(!client||!client.redirect_uris.includes(q.redirect_uri)||q.response_type!=='code'||q.resource!==this.resource||q.code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge||'')||(q.scope&&q.scope!=='brain')||(q.state||'').length>2000)return json({error:'invalid_request'},400);
      if(this.limited('authorize',60,60))return json({error:'temporarily_unavailable'},429);
      const ticket=token(),csrf=token();this.put('pending:'+digest(ticket),{...q,csrf},600);
      return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect to Brain</title><style>body{font:16px system-ui;background:#17191e;color:#eee;max-width:440px;margin:12vh auto;padding:24px}h1{font-size:28px}p{line-height:1.6;color:#b6bac4}label{display:block;margin:24px 0 8px}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:8px;border:1px solid #444;font:inherit}button{margin-top:16px;background:#e7b758;color:#17191e}small{overflow-wrap:anywhere}</style></head><body><h1>Connect to your Brain</h1><p><strong>${escape(client.client_name)}</strong> requests access to read your shared brain and propose new or updated notes.</p><p>Only continue if you started this connection.</p><small>Return to ${escape(q.redirect_uri)}</small><form method="post" action="/oauth/consent"><input type="hidden" name="ticket" value="${ticket}"><input type="hidden" name="csrf" value="${csrf}"><label for="password">Brain owner password</label><input id="password" type="password" name="password" autocomplete="current-password" required><button type="submit">Allow connection</button></form><p><a href="/" style="color:inherit">Cancel</a></p></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':this.setCookie('brain_csrf',csrf),'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",'Referrer-Policy':'no-referrer'}});
    }
    if(path==='/oauth/consent'&&req.method==='POST'){
      if(!this.csrf(req,body.csrf))return json({error:'Invalid consent origin'},403);
      if(this.limited('consent',10,60))return json({error:'Try again in a minute'},429);
      const pending=typeof body.ticket==='string'?this.get('pending:'+digest(body.ticket)):undefined;
      if(!pending||pending.csrf!==body.csrf||typeof body.password!=='string'||!verifyPassword(body.password,this.passwordHash))return json({error:'Invalid or expired consent'},400);
      this.remove('pending:'+digest(body.ticket));const code=token();this.put('code:'+digest(code),pending,300);
      const redirect=new URL(pending.redirect_uri);redirect.searchParams.set('code',code);redirect.searchParams.set('iss',this.origin);if(pending.state)redirect.searchParams.set('state',pending.state);
      return new Response(null,{status:303,headers:{Location:redirect.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    if((path==='/oauth/token'||path==='/oauth/revoke')&&req.method==='POST'){
      if(this.limited('token',120,60))return json({error:'temporarily_unavailable'},429);
      const client=typeof body.client_id==='string'?this.get('client:'+body.client_id):undefined;
      if(!client||(client.secret&&(typeof body.client_secret!=='string'||!equal(digest(body.client_secret),client.secret))))return json({error:'invalid_client'},401);
      if(path==='/oauth/revoke'){if(typeof body.token==='string'){for(const prefix of ['access:','refresh:']){const g=this.get(prefix+digest(body.token));if(g?.clientId===client.client_id)this.put('revoked:'+g.family,true,30*86400);}}return json({});}
      if(body.resource!==this.resource)return json({error:'invalid_target'},400);
      if(body.grant_type==='authorization_code'){
        const code=typeof body.code==='string'?this.get('code:'+digest(body.code)):undefined;
        if(!code||code.client_id!==client.client_id||code.redirect_uri!==body.redirect_uri||code.resource!==body.resource||typeof body.code_verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)||!equal(createHash('sha256').update(body.code_verifier).digest('base64url'),code.code_challenge))return json({error:'invalid_grant'},400);
        this.remove('code:'+digest(body.code));return json(this.issue({clientId:client.client_id,name:client.client_name,resource:this.resource,scope:'brain',family:token()}));
      }
      if(body.grant_type==='refresh_token'&&typeof body.refresh_token==='string'){
        const key=digest(body.refresh_token),grant=this.get('refresh:'+key),used=this.get('used:'+key);
        if(used){if(used.clientId===client.client_id)this.put('revoked:'+used.family,true,30*86400);return json({error:'invalid_grant'},400);}
        if(!grant||grant.clientId!==client.client_id||grant.resource!==body.resource||this.get('revoked:'+grant.family))return json({error:'invalid_grant'},400);
        this.remove('refresh:'+key);this.put('used:'+key,grant,30*86400);return json(this.issue(grant));
      }
      return json({error:'unsupported_grant_type'},400);
    }
    return json({error:'Not found'},404);
  }
}
