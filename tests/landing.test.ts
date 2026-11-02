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
  assert.equal(destination('/mcp'), '/api/bridge?route=mcp');
  assert.equal(destination('/api/auth/:path*'), '/api/bridge?route=api/auth/:path*');
  const landing = await readFile(new URL('../public/landing.html', import.meta.url), 'utf8');
  assert.match(landing, /href="\/app"/);
  assert.match(landing, /href="\/demo"/);
  assert.match(landing, /src="\/assets\/landing.js"/);
  assert.doesNotMatch(landing, /<script[^>]*>[^<]+<\/script>/);
});


test('Vercel gets the public index while standalone builds retain the private app shell', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFile } = await import('node:fs/promises');
  const env = { ...process.env };
  delete env.VERCEL; delete env.VERCEL_ENV;
  execFileSync(process.execPath, ['scripts/build.mjs'], { env, stdio: 'pipe' });
  assert.match(await readFile('dist/index.html', 'utf8'), /id="root"/);
  execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...env, VERCEL: '1', VERCEL_ENV: 'production' }, stdio: 'pipe' });
  const landing = await readFile('dist/index.html', 'utf8');
  assert.match(landing, /One brain\. Any agent\./);
  assert.doesNotMatch(landing, /id="root"/);
  assert.match(await readFile('dist/app.html', 'utf8'), /id="root"/);
  assert.match(await readFile('dist/assets/landing.js', 'utf8'), /Semantic search/);
});
