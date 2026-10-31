import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph, graphLabels } from '../src/graph-layout.ts';

test('layout follows connections, remains deterministic, and preserves input', () => {
  const notes = Array.from({ length: 200 }, (_, i) => ({ path: String(i).padStart(3, '0'), links: [String(Math.floor(i / 10) * 10).padStart(3, '0')] }));
  const before = structuredClone(notes);
  const { nodes, edges } = layoutGraph(notes);
  assert.deepEqual(notes, before);
  assert.deepEqual(layoutGraph([...notes].reverse()), { nodes, edges });
  assert.ok(nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  let same = 0, different = 0, sameCount = 0, differentCount = 0;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    if (Math.floor(i / 10) === Math.floor(j / 10)) { same += distance; sameCount++; }
    else { different += distance; differentCount++; }
  }
  assert.ok(same / sameCount < different / differentCount * .75, 'connected communities should sit closer together');
  assert.deepEqual(layoutGraph([]), { nodes: [], edges: [] });
  assert.deepEqual(layoutGraph([{ path: 'A', links: ['A', 'missing'] }]).edges, []);
  assert.equal(layoutGraph([{ path: 'A', links: ['B', 'B'] }, { path: 'B', links: ['A'] }]).edges.length, 1);
});

test('dense graphs have nonoverlapping labels, with more detail on zoom and focus', () => {
  const nodes = Array.from({ length: 200 }, (_, i) => ({ path: String(i), title: 'Connected note ' + i, x: 90 + i % 10 * 160, y: 50 + Math.floor(i / 10) * 65, radius: 4, degree: i % 9 }));
  const labels = graphLabels(nodes, 1700, 1400, 1, null, new Set());
  assert.ok(labels.length > 0 && labels.length < nodes.length / 2);
  for (const a of labels) for (const b of labels) if (a !== b) {
    assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  }
  assert.ok(graphLabels(nodes, 1700, 1400, 2, null, new Set()).length > labels.length);
  const focused = graphLabels(nodes, 1700, 1400, 1, '0', new Set(['0', '1']));
  assert.equal(focused[0].path, '0');
  assert.ok(focused.every(n => ['0', '1'].includes(n.path)));
});
