import test from 'node:test'; import assert from 'node:assert/strict'; import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto'; import { AuthService, hashPassword } from '../server/auth.ts';
const origin='https://brain.example.com'; const password='a-long-owner-password-for-tests';
const verifier='a'.repeat(64);const challenge=createHash('sha256').update(verifier).digest('base64url');
function setup(t:any){const db=new DatabaseSync(':memory:');const auth=new AuthService(db,{origin,passwordHash:hashPassword(password)});t.after(()=>db.close());return auth;}
function req(path:string,body?:any,cookie?:string){return new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function authorize(auth:AuthService){
  const reg=await auth.handle(req('/oauth/register',{client_name:'Test client',redirect_uris:['https://client.example/callback'],token_endpoint_auth_method:'none'}));
  const client:any=await reg!.json(); const url='/oauth/authorize?'+new URLSearchParams({client_id:client.client_id,redirect_uri:client.redirect_uris[0],response_type:'code',scope:'brain',resource:origin+'/mcp',code_challenge:challenge,code_challenge_method:'S256',state:'state123'});
  const page=(await auth.handle(req(url)))!; assert.equal(page.headers.get('referrer-policy'),'strict-origin'); assert.match(page.headers.get('content-security-policy')!, /form-action 'self' https:\/\/client\.example;/); const html=await page.text();const ticket=html.match(/name="ticket" value="([^"]+)"/)![1]; const csrf=html.match(/name="csrf" value="([^"]+)"/)![1];
  const cookie=page.headers.get('set-cookie')!.split(';')[0];
  const hostile=new Request(origin+'/oauth/consent',{method:'POST',headers:{Origin:'https://evil.example',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({ticket,csrf,password})});assert.equal((await auth.handle(hostile))!.status,403);
  const consent=(await auth.handle(req('/oauth/consent',{ticket,csrf,password},cookie)))!; assert.equal(consent.status,303);
  const redirected=new URL(consent.headers.get('location')!);assert.equal(redirected.searchParams.get('state'),'state123');assert.equal(redirected.searchParams.get('iss'),origin);
  return {client,code:redirected.searchParams.get('code')!};
}
test('OAuth binds PKCE, redirect and resource, then consumes the code once',async t=>{
  const auth=setup(t);const {client,code}=await authorize(auth);
  const base={grant_type:'authorization_code',client_id:client.client_id,code,code_verifier:verifier,redirect_uri:client.redirect_uris[0],resource:origin+'/mcp'};
  for(const patch of [{resource:'https://wrong.example/mcp'},{code_verifier:'b'.repeat(64)},{redirect_uri:'https://evil.example/'}]) assert.equal((await auth.handle(req('/oauth/token',{...base,...patch})))!.status,400);
  const response=(await auth.handle(req('/oauth/token',base)))!;assert.equal(response.status,200);const tokens:any=await response.json();assert.equal(auth.bearer('Bearer '+tokens.access_token)?.clientId,client.client_id);
  assert.equal((await auth.handle(req('/oauth/token',base)))!.status,400);
  const refreshed=(await auth.handle(req('/oauth/token',{grant_type:'refresh_token',client_id:client.client_id,refresh_token:tokens.refresh_token,resource:origin+'/mcp'})))!;assert.equal(refreshed.status,200);
  assert.equal((await auth.handle(req('/oauth/token',{grant_type:'refresh_token',client_id:client.client_id,refresh_token:tokens.refresh_token,resource:origin+'/mcp'})))!.status,400);
});
test('rejects insecure registration and unregistered redirects',async t=>{
  const auth=setup(t);assert.equal((await auth.handle(req('/oauth/register',{redirect_uris:['javascript:alert(1)']})))!.status,400);
  const r=(await auth.handle(req('/oauth/register',{redirect_uris:['https://client.example/callback']})))!; const c:any=await r.json();
  const p=new URLSearchParams({client_id:c.client_id,redirect_uri:'https://evil.example',response_type:'code',code_challenge:challenge,code_challenge_method:'S256',resource:origin+'/mcp'});
  assert.equal((await auth.handle(req('/oauth/authorize?'+p)))!.status,400);
});
test('browser login requires same-origin CSRF and does not accept a bearer token as a session',async t=>{
  const auth=setup(t);const initial=(await auth.handle(req('/api/auth/session')))!;const {csrf}:any=await initial.json();const cookie=initial.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await auth.handle(req('/api/auth/login',{password,csrf:'wrong'},cookie)))!.status,403);
  const hostile=new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({password,csrf})});
  assert.equal((await auth.handle(hostile))!.status,403);
  const login=(await auth.handle(req('/api/auth/login',{password,csrf},cookie)))!;assert.equal(login.status,200);assert.ok(login.headers.get('set-cookie')!.includes('HttpOnly'));
  assert.equal(auth.session(req('/api/brain',undefined,login.headers.get('set-cookie')!.split(';')[0])),true);
  assert.equal(auth.session(new Request(origin+'/api/brain',{headers:{Authorization:'Bearer nope'}})),false);
});
