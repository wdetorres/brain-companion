import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public docs cover every registered MCP tool and keep their navigation valid without scripts', async () => {
  const [docs, mcp, landing] = await Promise.all([
    readFile('public/docs.html', 'utf8'),
    readFile('server/mcp.ts', 'utf8'),
    readFile('public/landing.html', 'utf8'),
  ]);
  const registered = [...mcp.matchAll(/registerTool\('([^']+)'/g)].map(match => match[1]).sort();
  const documented = [...docs.matchAll(/<details id="tool-([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(documented, registered, 'Keep the public reference aligned with the registered tool set');
  const ids = [...docs.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Section and tool anchors must be unique');
  for (const [, target] of docs.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `Missing target: ${target}`);
  assert.doesNotMatch(docs.replace('<script src="/assets/theme.js"></script>', ''), /<script\b/i, 'Only the optional theme controller may run; docs navigation stays native');
  assert.match(landing, /href="\/docs"/);
});
