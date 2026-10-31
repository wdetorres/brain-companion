import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../server/store.ts';
import { createHandler } from '../server/http.ts';
import { hashPassword } from '../server/auth.ts';
import type { RecallJudge } from '../src/shared.ts';
const assessment = { useful: true, score: .98, model: 'test', usage: {}, questionVersion: 'test' };
async function setup(t: any, recallJudge?: RecallJudge) {
  const dir = await mkdtemp(join(tmpdir(), 'brain-features-')), vault = join(dir, 'vault'), data = join(dir, 'data');
  await mkdir(vault);
  await writeFile(join(vault, 'Plan.md'), '# Launch plan\nUse the launch checklist before releasing.\n');
  await writeFile(join(vault, 'Checklist.md'), '---\nmemory_category: task\n---\n# Launch checklist\nRun the launch checks.\n');
  const store = new BrainStore({ vault, data, judge: async () => { throw Error('unused'); }, recallJudge, connectionJudge: async () => assessment });
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  return { store, vault, data };
}
test('recall ranks evidence, separates conflicts, filters categories and caches only matching revisions', async t => {
  let calls = 0;
  const { store, vault } = await setup(t, async (_q, n, peers) => { calls++; assert.ok(peers.some(p => p.markdown.includes('launch'))); return { route: n.path === 'Plan.md' ? 'conflict' : 'evidence', probabilities: { relevant: .98, evidence: .98, conflict: n.path === 'Plan.md' ? .98 : .01, injection: .01 }, model: 'test', usage: {}, questionVersion: 'test' }; });
  const result = await store.recall('launch');
  assert.equal(result.conflicts[0].note.path, 'Plan.md'); assert.equal(result.notes[0].path, 'Checklist.md');
  assert.equal((await store.recall('launch')).evidence.length, 1); assert.equal(calls, 2);
  assert.equal((await store.recall('launch', 'task')).conflicts.length, 0); assert.equal(calls, 3);
  await writeFile(join(vault, 'Plan.md'), '# Launch plan\nA new launch decision.');
  await store.recall('launch'); assert.equal(calls, 5);
});
test('unavailable recall never disguises unassessed matches as evidence', async t => {
  const { store } = await setup(t, async () => { throw Error('unavailable'); });
  const result = await store.recall('launch'); assert.equal(result.status, 'unavailable'); assert.deepEqual(result.notes, []);
  assert.equal((await store.search('launch')).length, 2);
});
test('connections require review, preserve exact content, survive reopen and save only once', async t => {
  const { store, vault, data } = await setup(t);
  const before = await readFile(join(vault, 'Plan.md'), 'utf8');
  const [c] = await store.suggestConnections('Plan.md');
  assert.equal(await readFile(join(vault, 'Plan.md'), 'utf8'), before);
  assert.equal((await store.snapshot()).connections?.length, 1);
  store.close();
  const reopened = new BrainStore({ vault, data, judge: async () => { throw Error('no judge needed for owner-approved link'); } });
  t.after(() => reopened.close());
  const accepted = await reopened.reviewConnection(c.id, 'accept'); assert.equal(accepted.status, 'accepted');
  assert.equal(await readFile(join(vault, 'Plan.md'), 'utf8'), before + '\n\nRelated: [[Checklist]]\n');
  assert.equal((await reopened.reviewConnection(c.id, 'accept')).operationId, accepted.operationId);
  const op = await reopened.operation(accepted.operationId!); assert.equal(op?.before, before); assert.equal(op?.status, 'applied');
  assert.equal((await reopened.snapshot()).connections?.length, 0);
});
test('changed source or target invalidates a suggestion and dismissal never writes', async t => {
  const { store, vault } = await setup(t);
  let [c] = await store.suggestConnections('Plan.md');
  await writeFile(join(vault, 'Checklist.md'), '# Launch checklist\nChanged checks.');
  assert.equal((await store.reviewConnection(c.id, 'accept')).status, 'stale');
  [c] = await store.suggestConnections('Plan.md');
  await writeFile(join(vault, 'Plan.md'), '# Launch plan\nHuman edit.');
  assert.equal((await store.reviewConnection(c.id, 'accept')).status, 'stale');
  [c] = await store.suggestConnections('Plan.md');
  assert.equal((await store.reviewConnection(c.id, 'dismiss')).status, 'dismissed');
  assert.equal((await store.suggestConnections('Plan.md')).length, 0);
  assert.equal(await readFile(join(vault, 'Plan.md'), 'utf8'), '# Launch plan\nHuman edit.');
  await writeFile(join(vault, 'AGENTS.md'), '# Launch plan\nPolicy');
  await assert.rejects(store.suggestConnections('AGENTS.md'), /read-only/);
});
test('connection journal recovery recognizes a committed link after interruption', async t => {
  const { store } = await setup(t);
  const [c] = await store.suggestConnections('Plan.md'), accepted = await store.reviewConnection(c.id, 'accept');
  const op = await store.operation(accepted.operationId!);
  store.db.prepare('UPDATE operations SET payload=? WHERE id=?').run(JSON.stringify({ ...op, status: 'pending' }), op!.id);
  store.db.prepare('UPDATE connections SET payload=? WHERE id=?').run(JSON.stringify({ ...accepted, status: 'proposed' }), c.id);
  assert.equal((await store.reviewConnection(c.id, 'accept')).status, 'accepted');
  assert.equal((await store.snapshot()).operations.filter(o => o.actor.includes('Owner')).length, 1);
});
test('browser review requires owner session, same origin and CSRF; ignores client-provided note text', async t => {
  const { store } = await setup(t);
  const origin = 'https://brain.example.com', password = 'test-owner-password-long';
  const handle = createHandler(store, { origin, passwordHash: hashPassword(password) });
  const session = await handle(new Request(origin + '/api/auth/session')); const { csrf } = await session.json();
  const csrfCookie = session.headers.get('set-cookie')!.split(';')[0];
  const req = (path: string, body: object, cookie = csrfCookie, site = origin) => new Request(origin + path, { method: 'POST', headers: { Origin: site, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const login = await handle(req('/api/auth/login', { password, csrf }));
  const cookie = csrfCookie + '; ' + login.headers.get('set-cookie')!.split(';')[0];
  const [c] = await store.suggestConnections('Plan.md');
  assert.equal((await handle(req('/api/connections/review', { id: c.id, action: 'accept', csrf }))).status, 401);
  assert.equal((await handle(req('/api/connections/review', { id: c.id, action: 'accept', csrf: 'bad' }, cookie))).status, 403);
  assert.equal((await handle(req('/api/connections/review', { id: c.id, action: 'accept', csrf }, cookie, 'https://evil.test'))).status, 403);
  assert.equal((await handle(req('/api/connections/review', { id: c.id, action: 'accept', csrf, markdown: 'injected' }, cookie))).status, 400);
  const saved = await handle(req('/api/connections/review', { id: c.id, action: 'accept', csrf }, cookie));
  assert.equal(saved.status, 200); assert.equal((await saved.json()).status, 'accepted');
});

test('external assessment excludes internal/client/policy notes before the shortlist limit', async t => {
  const seen:string[]=[];
  const {store,vault}=await setup(t,async(_q,n)=>{seen.push(n.path);return {route:'evidence',probabilities:{relevant:.99,evidence:.99,conflict:.01,injection:.01},model:'test',usage:{},questionVersion:'test'};});
  await writeFile(join(vault,'Private.md'),'---\nscope: work-client\nportability: internal\ncontains_client_data: true\n---\n# Launch launch launch\nSensitive launch details.');
  await writeFile(join(vault,'AGENTS.md'),'# Launch policy\nPrivate launch instructions.');
  await store.recall('launch');assert.ok(!seen.includes('Private.md'));assert.ok(!seen.includes('AGENTS.md'));
  assert.equal((await store.search('launch')).length,4);
  await assert.rejects(store.suggestConnections('Private.md'),/excluded/);
});
