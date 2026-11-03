import test from 'node:test';
import assert from 'node:assert/strict';
import { joinWaitlist } from '../src/waitlist.ts';

test('both public signup forms use the same anonymous API request and actionable failures', async t => {
  let status = 200;
  const fetch = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof globalThis.fetch>[0], options?: RequestInit) => {
    assert.equal(url, '/api/interest');
    assert.ok(options);
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'omit');
    assert.deepEqual(JSON.parse(String(options.body)), { event: 'waitlist', email: 'visitor@example.com' });
    return new Response('{}', { status });
  });
  await joinWaitlist('visitor@example.com');
  status = 429; await assert.rejects(joinWaitlist('visitor@example.com'), /Try again in a minute/);
  status = 503; await assert.rejects(joinWaitlist('visitor@example.com'), /Could not join the waitlist. Please try again/);
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(joinWaitlist('visitor@example.com'), /Could not join the waitlist. Please try again/);
});
