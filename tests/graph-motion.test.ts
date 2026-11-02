import test from 'node:test';
import assert from 'node:assert/strict';
import { createGraphMotion, stepGraphMotion } from '../src/graph-motion.ts';
import { layoutGraph } from '../src/graph-layout.ts';

test('pulling a pinned node moves its real neighbors without moving an unrelated note', () => {
  const layout = { nodes: [{ path: 'A', x: 0, y: 0, degree: 1 }, { path: 'B', x: 80, y: 0, degree: 1 }, { path: 'C', x: -80, y: 0, degree: 0 }], edges: [{ a: 'A', b: 'B' }] };
  const before = structuredClone(layout);
  const motion = createGraphMotion(layout);
  motion.nodes[0].y = 100;
  for (let i = 0; i < 30; i++) stepGraphMotion(motion, 'A');
  assert.equal(motion.nodes[0].y, 100);
  assert.ok(motion.nodes[1].y > 10);
  assert.equal(motion.nodes[2].y, 0);
  assert.deepEqual(layout, before);
  motion.nodes[0].homeY = 100;
  let moving = true;
  for (let i = 0; i < 500 && moving; i++) moving = stepGraphMotion(motion);
  assert.equal(moving, false, 'motion must settle instead of running forever');
  assert.ok(motion.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  assert.deepEqual(createGraphMotion(layout).nodes.map(n => [n.x, n.y]), before.nodes.map(n => [n.x, n.y]));
});

test('dense and disconnected graphs stay finite during a large drag and settle on release', () => {
  const motion = createGraphMotion(layoutGraph(Array.from({ length: 200 }, (_, i) => ({ path: String(i), links: [String(Math.floor(i / 10) * 10)] }))));
  const dragged = motion.nodes[0];
  dragged.x += 1000; dragged.homeX = dragged.x;
  for (let i = 0; i < 90; i++) stepGraphMotion(motion, dragged.path);
  let moving = true;
  for (let i = 0; i < 1000 && moving; i++) moving = stepGraphMotion(motion);
  assert.equal(moving, false);
  assert.ok(motion.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  assert.equal(stepGraphMotion(createGraphMotion({ nodes: [], edges: [] })), false);
});
