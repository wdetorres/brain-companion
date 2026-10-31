import type { Note } from './shared.ts';

type GraphNote = Pick<Note, 'path' | 'links'>;
export type GraphPoint = { path: string; x: number; y: number; degree: number };
export type GraphEdge = { a: string; b: string };

export function layoutGraph(notes: GraphNote[]) {
  const nodes: GraphPoint[] = [...notes].sort((a, b) => a.path.localeCompare(b.path)).map((note, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 24 * Math.sqrt(i);
    return { path: note.path, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, degree: 0 };
  });
  const indices = new Map(nodes.map((n, i) => [n.path, i]));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const note of notes) for (const target of note.links) {
    if (target === note.path || !indices.has(target)) continue;
    const [a, b] = [note.path, target].sort();
    const key = JSON.stringify([a, b]);
    if (!seen.has(key)) { seen.add(key); edges.push({ a, b }); }
  }
  edges.sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
  const springs = edges.map(e => [indices.get(e.a)!, indices.get(e.b)!]);
  for (const [a, b] of springs) { nodes[a].degree++; nodes[b].degree++; }
  // The view is capped at 200 notes; settle once instead of running an idle animation.
  const dx = new Float64Array(nodes.length), dy = new Float64Array(nodes.length);
  for (let step = 0; step < 650; step++) {
    dx.fill(0); dy.fill(0);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const x = nodes[i].x - nodes[j].x, y = nodes[i].y - nodes[j].y;
      const force = 850 / Math.max(x * x + y * y, 1);
      dx[i] += x * force; dy[i] += y * force;
      dx[j] -= x * force; dy[j] -= y * force;
    }
    for (const [a, b] of springs) {
      const x = nodes[b].x - nodes[a].x, y = nodes[b].y - nodes[a].y;
      const distance = Math.max(1, Math.hypot(x, y));
      const force = (distance - 80) * .12 / distance / Math.sqrt(Math.min(nodes[a].degree, nodes[b].degree));
      dx[a] += x * force; dy[a] += y * force;
      dx[b] -= x * force; dy[b] -= y * force;
    }
    const temperature = 10 * (1 - step / 650) + .15;
    nodes.forEach((node, i) => {
      dx[i] -= node.x * .04; dy[i] -= node.y * .04;
      const limit = Math.min(1, temperature / Math.max(1, Math.hypot(dx[i], dy[i])));
      node.x += dx[i] * limit; node.y += dy[i] * limit;
    });
  }
  return { nodes, edges };
}

export type LabelNode = GraphPoint & { title: string; radius: number };
export type GraphLabel = { path: string; x: number; y: number; width: number; height: number };
export function graphLabels(nodes: LabelNode[], width: number, height: number, zoom: number, active: string | null, related: Set<string>) {
  const labels: GraphLabel[] = [];
  const limit = nodes.length <= 30 ? nodes.length : Math.min(nodes.length, Math.round(18 * zoom * zoom));
  const priority = (n: LabelNode) => (n.path === active ? 100000 : related.has(n.path) ? 10000 : 0) + n.degree;
  const candidates = [...nodes].sort((a, b) => priority(b) - priority(a) || a.path.localeCompare(b.path));
  for (const node of candidates) {
    if (labels.length >= limit) break;
    if (active && !related.has(node.path)) continue;
    const labelWidth = Math.min(node.path === active ? 220 : 156, Math.max(40, node.title.length * 6.5));
    const labelHeight = Math.min(node.path === active ? Infinity : 2, Math.ceil(node.title.length * 6.5 / labelWidth)) * 14;
    const label = { path: node.path, x: node.x - labelWidth / 2, y: node.y + node.radius + 6, width: labelWidth, height: labelHeight };
    if (label.x < 8 || label.x + label.width > width - 8 || label.y < 8 || label.y + label.height > height - 48) continue;
    if (labels.some(b => label.x < b.x + b.width + 8 && label.x + label.width + 8 > b.x && label.y < b.y + b.height + 5 && label.y + label.height + 5 > b.y)) continue;
    if (node.path !== active && nodes.some(n => n.path !== node.path && n.x + n.radius > label.x - 4 && n.x - n.radius < label.x + label.width + 4 && n.y + n.radius > label.y - 3 && n.y - n.radius < label.y + label.height + 3)) continue;
    labels.push(label);
  }
  return labels;
}
