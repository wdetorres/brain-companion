import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BrainStore } from '../server/store.ts';
import { syncOnce } from '../server/runtime.ts';

test('sync and memory writes share the same queue and sync failures keep an honest status', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'brain-sync-'));
  const events: string[] = [];
  const store = new BrainStore({ vault: join(dir, 'vault'), data: join(dir, 'data'), accept: ['new'], judge: async () => { events.push('judge'); return { outcome: 'new', confidence: .99, model: 'test', usage: {} }; } });
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  let release!: () => void;
  const hold = new Promise<void>(r => { release = r; });
  const syncing = syncOnce(store, async () => { events.push('sync-start'); await hold; events.push('sync-end'); });
  const writing = store.remember({ path: 'Test.md', markdown: '# Test', expectedRevision: null, idempotencyKey: 'sync-queue-test', sources: [{ title: 'Evidence', uri: 'urn:test:sync', observedAt: new Date().toISOString() }] }, 'test');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(events, ['sync-start']); release();
  await Promise.all([syncing, writing]);
  assert.deepEqual(events, ['sync-start', 'sync-end', 'judge']);
  assert.ok(store.lastSync);
  const lastSync = store.lastSync;
  await syncOnce(store, async () => { throw Error('credentials missing'); });
  assert.match(store.syncStatus, /failed/i); assert.equal(store.lastSync, lastSync);
});
