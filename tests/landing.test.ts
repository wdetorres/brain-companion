import assert from 'node:assert/strict';
import { test } from 'node:test';
import { frameAt, beats, duration, answers } from '../src/landing-timeline.ts';

test('note commits only after the MCP save and persists across agents', () => {
  assert.equal(frameAt(beats[3]! - 1).saved, false);
  assert.equal(frameAt(beats[3]!).saved, true);
  for (const time of beats.slice(3)) assert.equal(frameAt(time).saved, true);
  assert.equal(frameAt(beats[5]!).recall, true);
  assert.equal(frameAt(beats[7]!).busy, true);
  assert.equal(frameAt(beats[8]!).busy, false);
});
test('messages and typing follow tool completion, with complete static end states', () => {
  assert.equal(frameAt(-100).draft, '');
  assert.equal(frameAt(0).messageVisible, false);
  assert.equal(frameAt(beats[1]!).messageVisible, true);
  assert.equal(frameAt(beats[2]!).answerVisible, false);
  assert.equal(frameAt(9000).answer, answers[0]);
  assert.equal(frameAt(beats[7]!).answerVisible, false);
  assert.equal(frameAt(duration).answer, answers[1]);
  assert.deepEqual(frameAt(duration + 10000), frameAt(duration));
});


test('public landing and application routes preserve the MCP and auth entry points', async () => {
  const { readFile } = await import('node:fs/promises');
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const destination = (path: string) => config.rewrites.find((route: { source: string }) => route.source === path)?.destination;
  assert.equal(destination('/'), undefined, 'Vercel uses its index.html before rewrites');
  for (const path of ['/app', '/demo', '/sign-in', '/consent', '/settings']) assert.equal(destination(path), '/app.html');
  for (const path of ['/docs', '/docs/']) assert.equal(destination(path), '/docs.html');
  assert.equal(destination('/mcp'), '/api/bridge?route=mcp');
  assert.equal(destination('/api/auth/:path*'), '/api/bridge?route=api/auth/:path*');
  const landing = await readFile(new URL('../public/landing.html', import.meta.url), 'utf8');
  assert.match(landing, /href="\/app"/);
  assert.match(landing, /href="\/demo"/);
  assert.match(landing, /src="\/assets\/landing.js"/);
  assert.match(landing, /href="#waitlist"/);
  assert.match(landing, /id="waitlist-form"/);
  assert.match(landing, /for="waitlist-email"/);
  assert.match(landing, /type="email"[^>]*required/);
  assert.match(landing, /id="waitlist-success" role="status" hidden/);
  assert.doesNotMatch(landing, /<script[^>]*>[^<]+<\/script>/);
});


test('Vercel gets the public index while standalone builds retain the private app shell and public docs', async t => {
  const { execFileSync } = await import('node:child_process');
  const { readFile } = await import('node:fs/promises');
  const env = { ...process.env };
  delete env.VERCEL; delete env.VERCEL_ENV;
  execFileSync(process.execPath, ['scripts/build.mjs'], { env, stdio: 'pipe' });
  assert.match(await readFile('dist/index.html', 'utf8'), /id="root"/);
  const docs = await readFile('dist/docs.html', 'utf8');
  assert.match(docs, /<title>Docs · Brain Companion<\/title>/);
  assert.match(await readFile('dist/assets/docs.css', 'utf8'), /docs-layout/);
  const portable=await readFile('dist/brain-explorer-demo.html','utf8');
  assert.ok(portable.includes('brain-theme') && portable.indexOf('brain-theme') < portable.indexOf('<style>'));
  assert.ok(portable.includes(await readFile('public/THIRD_PARTY_NOTICES.txt','utf8')));
  assert.ok(portable.includes(await readFile('LICENSE','utf8')));
  assert.equal(await readFile('dist/LICENSE','utf8'),await readFile('LICENSE','utf8'));
  execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...env, VERCEL: '1', VERCEL_ENV: 'production' }, stdio: 'pipe' });
  const landing = await readFile('dist/index.html', 'utf8');
  assert.match(landing, /One brain for your agents\./);
  assert.doesNotMatch(landing, /id="root"/);
  assert.match(await readFile('dist/app.html', 'utf8'), /id="root"/);
  const landingScript = await readFile('dist/assets/landing.js', 'utf8');
  assert.match(landingScript, /Keyword search/);
  assert.match(landingScript, /\/api\/interest/);
  assert.doesNotMatch(landing + landingScript, /semantic search/i);
  assert.equal(await readFile('dist/docs.html', 'utf8'), docs, 'Docs must ship in both build modes');

  const { createServer } = await import('node:net');
  const { once } = await import('node:events');
  const { spawn } = await import('node:child_process');
  const socket = createServer().listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const address = socket.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  const server = spawn(process.execPath, ['server/main.ts'], { env: { PATH: process.env.PATH, PORT: String(address.port), PUBLIC_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { server.kill(); });
  await once(server.stdout, 'data', { signal: AbortSignal.timeout(10000) });
  for (const path of ['/docs', '/docs/']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.equal(await response.text(), docs, 'Docs are public even with no auth configuration');
  }
  const head = await fetch(origin + '/docs', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.match(await (await fetch(origin + '/assets/docs.css')).text(), /docs-layout/);
  assert.equal((await fetch(origin + '/api/brain')).status, 503, 'Public docs do not enable private APIs');
});
