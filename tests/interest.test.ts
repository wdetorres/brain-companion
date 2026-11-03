import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterestStore } from '../server/interest.ts';
import { BrainStore } from '../server/store.ts';
import { createHandler } from '../server/http.ts';
import { fixture, owner, request, origin } from './auth-fixture.ts';

test('interest stores aggregate daily clicks and deduplicated emails, survives reopening and caps bursts', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const interest = createInterestStore(db);
  assert.equal(interest.record(), true);
  assert.equal(interest.record('hello@example.com'), true);
  assert.equal(interest.record('hello@example.com'), true);
  db.prepare('INSERT INTO interestClicks VALUES(?,?)').run('2000-01-01', 4);
  const reopened = createInterestStore(db), summary = reopened.summary();
  assert.equal(summary.clicks, 5); assert.equal(summary.clicks30Days, 1); assert.equal(summary.waitlistCount, 1);
  assert.deepEqual(Object.keys(summary.subscribers[0]!).sort(), ['createdAt', 'email']);
  reopened.record('+formula@example.com');
  assert.match(reopened.exportCsv(), /"'\+formula@example.com"/);
  reopened.remove('hello@example.com'); assert.equal(reopened.summary().waitlistCount, 1);
  for (let i = 0; i < 120; i++) assert.equal(reopened.record(), true);
  assert.equal(reopened.record(), false);
  for (let i = 0; i < 9; i++) assert.equal(reopened.record('same@example.com'), true);
  assert.equal(reopened.record('same@example.com'), false);
});

test('public interest validates origin and input, protects emails, and requires owner CSRF for removal', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'brain-interest-'));
  const store = new BrainStore({ vault: join(dir, 'vault'), data: join(dir, 'state'), judge: async () => { throw Error('unused'); } });
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  const { service: auth, db } = await fixture(t), handler = createHandler(store, { auth });
  const click = { event: 'code_click' };
  for (const originHeader of ['', 'https://other.example.com']) {
    const req = request('/api/interest', click); if (originHeader) req.headers.set('origin', originHeader); else req.headers.delete('origin');
    assert.equal((await handler(req)).status, 403);
  }
  const plain = request('/api/interest', click); plain.headers.set('content-type', 'text/plain');
  assert.equal((await handler(plain)).status, 415);
  assert.equal((await handler(request('/api/interest', { event: 'waitlist', email: 'bad' }))).status, 400);
  assert.equal((await handler(request('/api/interest', { ...click, email: 'unwanted@example.com' }))).status, 400);
  assert.equal((await handler(request('/api/interest', { event: 'waitlist', email: 'x'.repeat(1100) }))).status, 413);
  assert.equal((await handler(request('/api/interest', click))).status, 200);
  const signup = await handler(request('/api/interest', { event: 'waitlist', email: '  Hello@Example.com  ' }));
  const duplicate = await handler(request('/api/interest', { event: 'waitlist', email: 'hello@example.com' }));
  assert.deepEqual(await signup.json(), await duplicate.json());
  for (const path of ['/api/interest', '/api/interest/export']) assert.equal((await handler(request(path))).status, 401);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM user').get()!.n, 0);
  for (let i = 0; i < 8; i++) assert.equal((await handler(request('/api/interest', { event: 'waitlist', email: 'hello@example.com' }))).status, 200);
  assert.equal((await handler(request('/api/interest', { event: 'waitlist', email: 'hello@example.com' }))).status, 429);
  const { cookie } = await owner(auth, db);
  const summary = await handler(request('/api/interest', undefined, cookie));
  assert.equal(summary.headers.get('cache-control'), 'no-store');
  const data = await summary.json(); assert.equal(data.clicks, 1); assert.equal(data.waitlistCount, 1); assert.equal(data.subscribers[0].email, 'hello@example.com');
  const csv = await handler(request('/api/interest/export', undefined, cookie));
  assert.match(csv.headers.get('content-disposition')!, /attachment/); assert.match(await csv.text(), /hello@example.com/);
  assert.equal((await handler(request('/api/interest/remove', { email: 'hello@example.com' }, cookie))).status, 403);
  const session = (await auth.handle(request('/api/auth/session', undefined, cookie)))!, { csrf } = await session.json();
  const remove = request('/api/interest/remove', { email: 'hello@example.com', csrf }, cookie + '; ' + session.headers.getSetCookie()[0]!.split(';')[0]);
  assert.equal((await handler(remove)).status, 200);
  assert.equal((await (await handler(request('/api/interest', undefined, cookie))).json()).waitlistCount, 0);
});
