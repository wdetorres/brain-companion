import type { Note } from './shared.ts';

// Shared by the vault index and page renderer so a link has one meaning.
export function resolveNoteLink(notes: Pick<Note, 'path' | 'title'>[], from: string, target: string): string | undefined {
  return createNoteResolver(notes)(from, target);
}

export function createNoteResolver(notes: Pick<Note, 'path' | 'title'>[]) {
  const paths = new Set(notes.map(n => n.path));
  const stems = new Map<string, Set<string>>(), titles = new Map<string, Set<string>>();
  for (const n of notes) for (const [map,name] of [[stems,n.path.split('/').pop()!.replace(/\.md$/, '')],[titles,n.title]] as const) {
    if (!map.has(name)) map.set(name, new Set());
    map.get(name)!.add(n.path);
  }
  return (from: string, target: string): string | undefined => {
  let raw = target.split('#')[0];
  try { raw = decodeURIComponent(raw); } catch { return; }
  if (!raw || /^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith('/') || raw.includes('\\')) return;
  const md = raw.endsWith('.md') ? raw : raw + '.md';
  const directory = from.split('/').slice(0, -1);
  const parts = [...directory];
  for (const part of md.split('/')) {
    if (part === '..') { if (!parts.length) return; parts.pop(); }
    else if (part !== '.' && part) parts.push(part);
  }
  const local = parts.join('/');
  if (paths.has(local)) return local;
  if (paths.has(md)) return md;
  if (raw.includes('/')) return;
  const stem = raw.replace(/\.md$/, '');
  const candidates = new Set([...(stems.get(stem)||[]), ...(titles.get(raw)||[])]);
  return candidates.size === 1 ? [...candidates][0] : undefined;
  };
}

export function connectionMarkdown(source: string, target: string): string {
  const from = source.split('/').slice(0, -1), to = target.split('/');
  while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
  const link = [...from.map(() => '..'), ...to].join('/').replace(/\.md$/, '');
  return '\n\nRelated: [[' + link + ']]\n';
}
