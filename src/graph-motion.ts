import type { GraphEdge, GraphPoint } from './graph-layout.ts';

export function createGraphMotion(layout: { nodes: GraphPoint[]; edges: GraphEdge[] }) {
  const nodes = layout.nodes.map(node => ({ ...node, homeX: node.x, homeY: node.y, vx: 0, vy: 0 }));
  const byPath = new Map(nodes.map(node => [node.path, node]));
  const springs = layout.edges.flatMap(edge => {
    const a = byPath.get(edge.a), b = byPath.get(edge.b);
    return a && b ? [{ a, b, length: Math.hypot(b.x - a.x, b.y - a.y) }] : [];
  });
  return { nodes, byPath, springs };
}

export type GraphMotion = ReturnType<typeof createGraphMotion>;

export function stepGraphMotion(motion: GraphMotion, pinned?: string) {
  for (const node of motion.nodes) {
    node.vx += (node.homeX - node.x) * .012;
    node.vy += (node.homeY - node.y) * .012;
  }
  for (const { a, b, length } of motion.springs) {
    const x = b.x - a.x, y = b.y - a.y;
    const distance = Math.max(1, Math.hypot(x, y));
    const force = (distance - length) * .09 / distance / Math.sqrt(Math.max(1, a.degree, b.degree));
    a.vx += x * force; a.vy += y * force;
    b.vx -= x * force; b.vy -= y * force;
  }
  let moving = false;
  for (const node of motion.nodes) {
    if (node.path === pinned) { node.vx = 0; node.vy = 0; continue; }
    node.vx *= .78; node.vy *= .78;
    const speed = Math.hypot(node.vx, node.vy);
    const limit = Math.min(1, 16 / Math.max(1, speed));
    node.x += node.vx * limit; node.y += node.vy * limit;
    if (speed > .025) moving = true;
  }
  return moving;
}
