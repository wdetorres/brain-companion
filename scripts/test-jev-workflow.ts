import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createMemoryMcp } from '../server/mcp.ts';
import { BrainStore } from '../server/store.ts';
import type { Judge } from '../src/shared.ts';

const cases = JSON.parse(await readFile(new URL('../tests/fixtures/jev-smoke.json', import.meta.url), 'utf8'));
const example = cases.find((item: { name: string }) => item.name === 'supported-update');
assert.ok(example?.current, 'Missing supported-update fixture');
const dir = await mkdtemp(join(tmpdir(), 'brain-jev-workflow-'));
const vault = join(dir, 'vault'), data = join(dir, 'state');
let judgeCalls = 0;
const judge: Judge = async () => { judgeCalls++; throw Error('Direct writes must not call Jev'); };
let store: BrainStore | undefined;
try {
  const target = join(vault, example.input.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, example.current.markdown);
  // Writes target only this temporary vault, regardless of the service's .env.
  store = new BrainStore({ vault, data, judge, accept: ['update'] });
  let handler = createMemoryMcp(store, 'Synthetic direct-write workflow test'), requestId = 0;
  async function call(name: string, args: unknown) {
    const response = await handler.fetch(new Request('https://brain.example.com/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method: 'tools/call', params: { name, arguments: args } }),
    }));
    assert.equal(response.status, 200, 'MCP request failed');
    const text = await response.text();
    const message = JSON.parse(text.split('\n').find(line => line.startsWith('data:'))?.slice(5) || text);
    assert.ok(!message.error && !message.result?.isError, 'MCP tool returned an error');
    return JSON.parse(message.result.content.find((item: { type: string }) => item.type === 'text').text);
  }
  const current = await call('inspect', { path: example.input.path });
  const input = { ...example.input, expectedRevision: current.revision };
  const operation = await call('remember', input);
  assert.equal(operation.decision, undefined);
  assert.equal(operation.status, 'applied', operation.reason);
  assert.equal(operation.proposed, input.markdown);
  assert.equal(await readFile(target, 'utf8'), input.markdown, 'The update was not saved');
  assert.deepEqual(await call('remember', input), operation, 'Retry created a different operation');
  store.close();
  store = new BrainStore({ vault, data, judge, accept: ['update'] });
  handler = createMemoryMcp(store, 'Synthetic direct-write workflow test');
  assert.deepEqual(await call('inspect', { operationId: operation.id }), operation, 'Proposal or decision did not persist');
  assert.deepEqual(await call('remember', input), operation, 'Retry after reopening changed the operation');
  assert.equal((await store.snapshot()).operations.length, 1, 'Unexpected extra change records');
  assert.equal(await readFile(target, 'utf8'), input.markdown, 'The update changed after reopening');
  assert.equal(judgeCalls, 0, 'Direct writes unexpectedly called Jev');
  console.log(JSON.stringify({ status: 'passed', operationStatus: operation.status, exactUpdateSaved: true, operationPersistedAfterReopen: true, idempotentRetries: true, judgeCalls }));
} finally {
  store?.close();
  await rm(dir, { recursive: true, force: true });
}
