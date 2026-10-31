import React, { useEffect, useState } from 'react';
import { connectionMarkdown } from './links.ts';
import type { Connection, Note } from './shared.ts';

export function ConnectionPanel({ note, notes, connections, demo, onSuggest, onReview, onOpen }: { note: Note; notes: Note[]; connections: Connection[]; demo: boolean; onSuggest: () => Promise<void>; onReview: (id: string, action: 'accept'|'dismiss') => Promise<void>; onOpen: (path: string) => void }) {
  const [active, setActive] = useState<Connection | null>(null);
  const [target, setTarget] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = connections.filter(c => c.source === note.path && c.status === 'proposed');
  useEffect(() => {
    setTarget(null); if (!active) return;
    if (demo) { setTarget(notes.find(n => n.path === active.target) || null); return; }
    const controller = new AbortController();
    fetch('/api/note?path=' + encodeURIComponent(active.target), { signal: controller.signal }).then(async r => { if (!r.ok) throw Error('Could not load the other note'); return r.json(); }).then(setTarget).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [active, demo, notes]);
  async function act(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); setActive(null); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <section className="detail-section connection-panel"><h3>Suggested connections <span>{pending.length}</span></h3><p className="muted small">Dotted edges are proposals. Review both notes before adding a link.</p>
    {pending.map(c => <div className="connection-proposal" key={c.id}><button className="backlink" onClick={() => { setActive(c); setError(''); }}><span className="dotted-symbol" /><span>{notes.find(n => n.path === c.target)?.title || c.target}</span><small>Review</small></button><small>Jev usefulness {Math.round(c.assessment.score * 100)}%{demo ? ' · sample' : ''}</small></div>)}
    <button className="quiet-button" disabled={busy || demo} title={demo ? 'Reload the sample workspace to reset its suggestions' : undefined} onClick={() => void act(onSuggest)}>{busy ? 'Working…' : 'Find connections'}</button>
    {active && <div className="connection-review" aria-label="Review suggested connection"><h4>{note.title} → {target?.title || 'Loading…'}</h4><p className="muted small">Compare these excerpts; a link connects context without asserting agreement.</p><blockquote>{note.body.slice(0, 700)}</blockquote>{target && <><blockquote>{target.body.slice(0, 700)}</blockquote><button className="text-button" onClick={() => onOpen(target.path)}>Read target page ↗</button></>}<p>This exact text will be appended to <strong>{note.title}</strong>:</p><pre>{connectionMarkdown(note.path, active.target).trim()}</pre><div className="review-actions"><button className="primary" disabled={busy || !target || target.revision !== active.targetRevision || note.revision !== active.sourceRevision} onClick={() => void act(() => onReview(active.id, 'accept'))}>{demo ? 'Add link in demo' : 'Save link'}</button><button className="quiet-button" disabled={busy} onClick={() => void act(() => onReview(active.id, 'dismiss'))}>Dismiss</button><button className="text-button" onClick={() => setActive(null)}>Cancel</button></div>{target && (target.revision !== active.targetRevision || note.revision !== active.sourceRevision) && <p className="error-text">A note changed. Refresh and find connections again.</p>}</div>}
    {error && <p role="alert" className="error-text">{error}</p>}
  </section>;
}
