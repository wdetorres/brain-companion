import test from 'node:test';
import assert from 'node:assert/strict';
import bridge from '../api/bridge.ts';

test('Vercel bridge binds its destination and preserves OAuth query and response cookies', async t => {
  const oldFetch = globalThis.fetch, oldBackend = process.env.BRAIN_SERVICE_URL, oldKey = process.env.BRAIN_BRIDGE_KEY;
  t.after(() => { globalThis.fetch = oldFetch; if (oldBackend === undefined) delete process.env.BRAIN_SERVICE_URL; else process.env.BRAIN_SERVICE_URL = oldBackend; if (oldKey === undefined) delete process.env.BRAIN_BRIDGE_KEY; else process.env.BRAIN_BRIDGE_KEY = oldKey; });
  process.env.BRAIN_SERVICE_URL = 'https://private.example.test'; process.env.BRAIN_BRIDGE_KEY = 'test-bridge-secret';
  let url = '', headers = new Headers();
  globalThis.fetch = async (input, options) => { url = String(input); headers = new Headers(options?.headers); return new Response('ok', { headers: [['Set-Cookie', 'a=1; HttpOnly'], ['Set-Cookie', 'b=2; HttpOnly']] }); };
  const response = () => ({ statusCode: 200, headers: {} as Record<string, unknown>, output: '', setHeader(key: string, value: unknown) { this.headers[key.toLowerCase()] = value; }, write(chunk: Buffer) { this.output += chunk.toString(); }, end(chunk?: string) { if (chunk) this.output += chunk; } });
  const res = response();
  await bridge({ url: '/oauth/authorize?client_id=abc&state=x%2By&resource=https%3A%2F%2Fbrain.test%2Fmcp', query: { route: 'oauth/authorize' }, method: 'GET', headers: { origin: 'https://brain.test', cookie: 'owner=1', 'x-brain-bridge': 'attacker', host: 'evil.test' } } as any, res as any);
  assert.equal(new URL(url).origin, 'https://private.example.test');
  assert.equal(new URL(url).pathname, '/oauth/authorize'); assert.equal(new URL(url).searchParams.get('state'), 'x+y');
  assert.equal(headers.get('x-brain-bridge'), 'test-bridge-secret'); assert.equal(headers.get('host'), null);
  assert.deepEqual(res.headers['set-cookie'], ['a=1; HttpOnly', 'b=2; HttpOnly']);
  const blocked = response();
  await bridge({ url: '/api/bridge?route=https://evil.test', method: 'GET', headers: {} } as any, blocked as any);
  assert.equal(blocked.statusCode, 404);
});

test('Vercel forwards authenticated recall and connection review without widening route access', async t => {
  const previous = { fetch: globalThis.fetch, backend: process.env.BRAIN_SERVICE_URL, key: process.env.BRAIN_BRIDGE_KEY };
  t.after(() => { globalThis.fetch = previous.fetch; if (previous.backend === undefined) delete process.env.BRAIN_SERVICE_URL; else process.env.BRAIN_SERVICE_URL=previous.backend; if(previous.key===undefined)delete process.env.BRAIN_BRIDGE_KEY;else process.env.BRAIN_BRIDGE_KEY=previous.key; });
  process.env.BRAIN_SERVICE_URL='https://private.example.test';process.env.BRAIN_BRIDGE_KEY='test';
  const seen:string[]=[];
  globalThis.fetch=async(input,init)=>{seen.push(new URL(String(input)).pathname);assert.equal(init?.method,'POST');assert.match(String(init?.body),/csrf/);return new Response('{}');};
  for(const route of ['api/recall','api/connections/suggest','api/connections/review','api/memories/review']){
    const res={statusCode:200,setHeader(){},write(){},end(){}};
    await bridge({url:'/api/bridge?route='+route,method:'POST',headers:{'content-type':'application/json'},body:{csrf:'test'}} as any,res as any);assert.equal(res.statusCode,200);
  }
  assert.deepEqual(seen,['/api/recall','/api/connections/suggest','/api/connections/review','/api/memories/review']);
  const res={statusCode:200,setHeader(){},write(){},end(){}};
  await bridge({url:'/api/bridge?route=api/connections/delete',method:'POST',headers:{},body:{}} as any,res as any);assert.equal(res.statusCode,404);
});

test('hosted harness review and work URLs reach the authenticated bridge', async () => {
  const { readFile } = await import('node:fs/promises');
  const { rewrites } = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  for (const path of ['/api/work','/api/memories/review']) {
    const rule = rewrites.find((r: {source:string}) => new RegExp('^'+r.source.replace(':path*','.*')+'$').test(path));
    assert.ok(rule, path+' must reach the bridge instead of a static 404');
    assert.match(rule.destination, /^\/api\/bridge\?route=/);
  }
});

test('SSO bridge permits only the login/provider surface and preserves MCP protocol headers and JSON bytes', async t => {
  const previous = { fetch: globalThis.fetch, backend: process.env.BRAIN_SERVICE_URL, key: process.env.BRAIN_BRIDGE_KEY };
  t.after(() => { globalThis.fetch=previous.fetch; for(const [key,value] of [['BRAIN_SERVICE_URL',previous.backend],['BRAIN_BRIDGE_KEY',previous.key]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;} });
  process.env.BRAIN_SERVICE_URL='https://worker.example';process.env.BRAIN_BRIDGE_KEY='test';
  const response=()=>({statusCode:200,setHeader(){},write(){},end(){}});
  let target='';globalThis.fetch=async(input,init)=>{target=String(input);return new Response('{}');};
  for (const route of ['api/auth/sign-in/social','api/auth/callback/google','api/auth/sign-out','api/auth/oauth2/authorize','api/auth/oauth2/consent','api/auth/oauth2/register','api/auth/oauth2/token','.well-known/oauth-authorization-server/api/auth','api/apps','api/apps/revoke','api/consent']) {
    const res=response();await bridge({url:'/api/bridge?route='+route,method:'GET',headers:{}} as any,res as any);assert.equal(res.statusCode,200,route);assert.equal(new URL(target).pathname,'/'+route);
  }
  for (const route of ['api/auth/sign-up/email','api/auth/admin/create-user','api/auth/oauth2/create-client','api/auth/validate-brain-token']) {
    const res=response();await bridge({url:'/api/bridge?route='+route,method:'GET',headers:{}} as any,res as any);assert.equal(res.statusCode,404,route);
  }
  const payload={jsonrpc:'2.0',id:1,method:'tools/list',params:{}};
  globalThis.fetch=async(_input,init)=>{assert.deepEqual(JSON.parse(String(init?.body)),payload);const h=new Headers(init?.headers);assert.equal(h.get('mcp-method'),'tools/list');assert.equal(h.get('mcp-name'),'search');assert.equal(h.get('mcp-protocol-version'),'2026-07-28');assert.equal(h.get('mcp-param-query'),'test');assert.equal(h.get('x-forwarded-host'),null);return new Response('{}');};
  for (const body of [payload,JSON.stringify(payload),Buffer.from(JSON.stringify(payload)),new TextEncoder().encode(JSON.stringify(payload))]) {
    const res=response();await bridge({url:'/api/bridge?route=mcp',method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream','mcp-method':'tools/list','mcp-name':'search','mcp-protocol-version':'2026-07-28','mcp-param-query':'test','x-forwarded-host':'evil.test'},body} as any,res as any);assert.equal(res.statusCode,200);
  }
});
