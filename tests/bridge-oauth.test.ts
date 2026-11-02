import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bridge from '../api/bridge.ts';
import { createHandler } from '../server/http.ts';
import { BrainStore } from '../server/store.ts';
import { fixture, owner, clientFlow, origin } from './auth-fixture.ts';

test('OAuth browser redirects survive a real Node fetch hop without changing fetch-client responses', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'brain-bridge-oauth-'));
  const store = new BrainStore({ vault: join(dir, 'vault'), data: join(dir, 'state'), judge: async () => { throw Error('unused'); } });
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  const { service: auth, db } = await fixture(t), { cookie } = await owner(auth, db), flow = await clientFlow(auth, cookie);
  const handler = createHandler(store, { auth, bridgeKey: 'synthetic-bridge' });
  const server = createServer(async (req, res) => {
    const response = await handler(new Request(origin + req.url, { headers: req.headers as Record<string, string> }));
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const previous = { fetch: globalThis.fetch, backend: process.env.BRAIN_SERVICE_URL, key: process.env.BRAIN_BRIDGE_KEY };
  t.after(() => { globalThis.fetch = previous.fetch; for (const [key, value] of [['BRAIN_SERVICE_URL', previous.backend], ['BRAIN_BRIDGE_KEY', previous.key]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; } });
  process.env.BRAIN_SERVICE_URL = 'https://worker.example'; process.env.BRAIN_BRIDGE_KEY = 'synthetic-bridge';
  // Keep Node's real transport behavior; only route the synthetic worker to loopback.
  globalThis.fetch = (input, init) => { const url = new URL(String(input)); return previous.fetch(`http://127.0.0.1:${address.port}${url.pathname}${url.search}`, init); };
  const route = 'api/auth/oauth2/authorize', path = '/' + route + '?' + flow.query;
  for (const sessionCookie of ['', cookie]) for (const mode of ['navigate', 'cors', undefined]) {
    const res = { statusCode: 200, headers: {} as Record<string, unknown>, output: '', setHeader(key: string, value: unknown) { this.headers[key.toLowerCase()] = value; }, write(chunk: Buffer) { this.output += chunk; }, end() {} };
    await bridge({ url: path, query: { route }, method: 'GET', headers: { cookie: sessionCookie, accept: mode === 'cors' ? 'application/json' : 'text/html', ...(mode ? { 'sec-fetch-mode': mode } : {}), 'x-brain-fetch-mode': 'cors' } } as any, res as any);
    assert.equal(res.statusCode, mode === 'cors' ? 200 : 302, `cookie=${!!sessionCookie}, mode=${mode}`);
    const location = mode === 'cors' ? JSON.parse(res.output).url : res.headers.location;
    assert.equal(new URL(String(location), origin).pathname, sessionCookie ? '/consent' : '/sign-in');
  }
  const spoof = new Request(origin + path, { headers: { cookie, accept: 'text/html', 'sec-fetch-mode': 'cors', 'x-brain-fetch-mode': 'navigate', 'x-brain-bridge': 'wrong' } });
  assert.equal((await handler(spoof)).status, 403);
  assert.equal((await createHandler(store, { auth })(spoof)).status, 200, 'direct clients cannot override fetch metadata with a bridge header');
});
