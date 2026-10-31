import type { Note, RememberInput } from '../src/shared.ts';
import { resolveNoteLink } from '../src/links.ts';
import { folderFor, rawLinks } from './vault.ts';
const stop = new Set('the and for with from that this are was have has not into your they their will should would could sources title observedat https markdown what which when where does how can who about'.split(' '));
const terms = (text: string) => [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].filter(t => !stop.has(t));

export function relatedNotes(input: RememberInput, notes: Note[]): Note[] {
  const query = terms(input.path + ' ' + input.markdown).slice(0, 80);
  const linked = new Set(rawLinks(input.markdown).map(target => resolveNoteLink(notes, input.path, target)).filter(Boolean));
  const corpus = notes.filter(n => n.path !== input.path && n.assessmentAllowed !== false).map(n => ({ n, title: new Set(terms(n.title + ' ' + n.path)), body: new Set(terms(n.body)) }));
  const frequency = new Map(query.map(t => [t, corpus.filter(x => x.body.has(t) || x.title.has(t)).length]));
  return corpus.map(({ n, title, body }) => {
    const overlap = query.reduce((score, t) => score + (title.has(t) ? 4 : body.has(t) ? 1 : 0) * (1 + Math.log((corpus.length + 1) / (1 + (frequency.get(t) || 0)))), 0);
    const connection = linked.has(n.path) || n.links.includes(input.path) ? 20 : 0;
    return { n, score: overlap + connection + (overlap > 0 && n.folder === folderFor(input.path) ? 1 : 0) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.n.path.localeCompare(b.n.path)).slice(0, 5).map(x => x.n);
}

export function shortlist(query: string, notes: Note[], limit = 8): Note[] {
  const words = terms(query).slice(0, 40);
  return notes.map(n => {
    const title = new Set(terms(n.title)), body = new Set(terms(n.body));
    return { n, score: words.reduce((score, word) => score + (title.has(word) ? 5 : 0) + (body.has(word) ? 1 : 0), 0) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.n.path.localeCompare(b.n.path)).slice(0, limit).map(x => x.n);
}
