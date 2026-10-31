import type { Note } from './shared.ts';

// Shared by the vault index and page renderer so a link has one meaning.
export function resolveNoteLink(notes: Pick<Note, 'path' | 'title'>[], from: string, target: string): string | undefined {
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
  if (notes.some(n => n.path === local)) return local;
  if (notes.some(n => n.path === md)) return md;
  if (raw.includes('/')) return;
  const stem = raw.replace(/\.md$/, '');
  const candidates = notes.filter(n => n.path.split('/').pop()?.replace(/\.md$/, '') === stem || n.title === raw);
  return candidates.length === 1 ? candidates[0].path : undefined;
}

export function connectionMarkdown(source: string, target: string): string {
  const from = source.split('/').slice(0, -1), to = target.split('/');
  while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
  const link = [...from.map(() => '..'), ...to].join('/').replace(/\.md$/, '');
  return '\n\nRelated: [[' + link + ']]\n';
}
