import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Circle, FileText, Folder, GitBranch, History, Link2, LockKeyhole, LogOut, Network, PanelRightClose, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Graph } from './Graph.tsx';
import { Markdown } from './Markdown.tsx';
import { demoSnapshot } from './demo.ts';
import { diffLines, folderLabels, safeUrl, visibleGraph } from './presentation.ts';
import type { BrainSnapshot, Note, Operation, Source } from './shared.ts';

type View = 'graph' | 'pages' | 'changes';
const isDemo = document.documentElement.dataset.demo === 'true' || location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
const statuses: Record<Operation['status'], string> = { applied: 'Applied', duplicate: 'Already remembered', needs_attention: 'Needs attention', failed: 'Failed', external: 'From Obsidian', pending: 'Pending' };
const when = (s: string) => new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const titleFor = (p: string) => p.split('/').pop()?.replace(/\.md$/, '') || p;
async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not reach your Brain');
  return data;
}
function Sources({ sources }: { sources: Source[] }) {
  return <section className="detail-section"><h3>Sources <span>{sources.length}</span></h3>{sources.length ? sources.map((s, i) => <div className="source" key={s.uri + i}><Link2 size={13} /><div>{safeUrl(s.uri) ? <a href={safeUrl(s.uri)} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={12} /></a> : <span>{s.title}</span>}<small title={s.uri}>{s.uri.startsWith('urn:') ? s.uri : s.uri.replace(/^https?:\/\//, '').split('/')[0]} · {when(s.observedAt)}</small></div></div>) : <p className="muted small">No source metadata on this page.</p>}</section>;
}
function NoteReader({ note, notes, onOpen, compact = false }: { note: Note; notes: Note[]; onOpen: (path: string) => void; compact?: boolean }) {
  const backlinks = notes.filter(n => n.links.includes(note.path));
  return <>
    <div className="note-heading"><div className="eyebrow" data-folder={note.folder}><span className="folder-dot" />{folderLabels[note.folder] || note.folder}</div><h1>{note.title}</h1><div className="note-meta"><FileText size={12} />{note.path}</div></div>
    <Markdown path={note.path} text={note.body.replace(/^# [^\n]+\n+/, '')} notes={notes} onOpen={onOpen} />
    <Sources sources={note.sources} />
    <section className="detail-section"><h3>Linked mentions <span>{backlinks.length}</span></h3>{backlinks.length ? backlinks.map(n => <button className="backlink" key={n.path} onClick={() => onOpen(n.path)}><FileText size={13} /><span>{n.title}</span><ChevronRight size={13} /></button>) : <p className="muted small">No other pages link here yet.</p>}</section>
    {!!note.unresolved.length && <section className="detail-section"><h3>Unresolved links</h3><p className="muted small">{note.unresolved.join(' · ')}</p></section>}
    {!compact && <div className="revision">Updated {when(note.modifiedAt)} · Revision {note.revision.slice(0, 12)}</div>}
  </>;
}
function ChangeReader({ operation: op, onOpen }: { operation: Operation; onOpen: (path: string) => void }) {
  const lines = useMemo(() => diffLines(op.before ?? '', op.proposed), [op.before, op.proposed]);
  return <article className="change-reader"><div className="eyebrow">Change detail</div><h1>{titleFor(op.path)}</h1><div className="change-info"><span className={'status ' + op.status}>{statuses[op.status]}</span><span>{when(op.at)}</span></div><p className="change-reason">{op.reason}</p><div className="change-actor"><Sparkles size={14} />{op.actor}</div>
    {op.decision && <div className="decision"><span>Evaluation</span><strong>{op.decision.outcome}</strong><small>{op.decision.model} · {(op.decision.confidence * 100).toFixed(0)}% score</small></div>}
    <div className="diff-label"><span>{op.status === 'needs_attention' ? 'Current → proposed' : 'Before → submitted'}</span><button onClick={() => onOpen(op.path)}>Open current page <ArrowUpRight size={12} /></button></div>
    <div className="diff" aria-label="Markdown change">{lines.map((line, i) => <div key={i} className={'diff-line ' + line.kind}><span aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}</span><code>{line.text || ' '}</code></div>)}</div>
    <Sources sources={op.sources} /><div className="revision">Operation {op.id}</div>
  </article>;
}
function Entry({ error, csrf, onEnter }: { error: string; csrf: string; onEnter: () => void }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="entry"><div className="entry-card"><div className="brand-mark"><Network size={23} /></div><div className="eyebrow">Your notes, connected</div><h1>Welcome to your Brain.</h1><p>A quiet place to explore what you know, and see what your agents remember.</p>
    {error ? <div className="setup-message"><LockKeyhole size={18} /><p>{error}</p></div> : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrf }) }); const data = await r.json(); if (!r.ok) throw Error(data.error || 'Sign-in failed'); setPassword(''); onEnter(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}><label htmlFor="owner-password">Owner password</label><input autoFocus id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><button className="primary" disabled={busy || !csrf}>{busy ? 'Signing in…' : 'Open my Brain'}<ArrowUpRight size={16} /></button>{message && <p role="alert" className="error-text">{message}</p>}</form>}
    <a className="demo-link" href="/demo">Explore the sample brain <ArrowUpRight size={14} /></a><small>Private by default. Read-only in the browser.</small></div></main>;
}
export function App() {
  const [snapshot, setSnapshot] = useState<BrainSnapshot | null>(isDemo ? demoSnapshot : null);
  const [ready, setReady] = useState(isDemo);
  const [csrf, setCsrf] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>('graph');
  const [folder, setFolder] = useState('all');
  const [system, setSystem] = useState(false);
  const [focus, setFocus] = useState<string | undefined>();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const notes = snapshot?.notes ?? [];
  const operations = snapshot?.operations ?? [];
  async function refresh() {
    if (isDemo) return;
    setRefreshing(true); setError('');
    try { const session = await api<{ authenticated: boolean; csrf: string }>('/api/auth/session'); setCsrf(session.csrf); if (session.authenticated) setSnapshot(await api<BrainSnapshot>('/api/brain')); else setSnapshot(null); }
    catch (e) { setSnapshot(null); setError((e as Error).message); }
    finally { setRefreshing(false); setReady(true); }
  }
  useEffect(() => { if (!isDemo) void refresh(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setNote(null); setDetailError('');
    if (!selected) return;
    if (isDemo) { setNote(demoSnapshot.notes.find(n => n.path === selected) || null); return; }
    api<Note>('/api/note?path=' + encodeURIComponent(selected), controller.signal).then(setNote).catch(e => { if (!controller.signal.aborted) setDetailError(e.message); });
    return () => controller.abort();
  }, [selected, snapshot]);
  useEffect(() => {
    const controller = new AbortController(); setOperation(null); setDetailError('');
    if (!operationId) return;
    if (isDemo) { setOperation(demoSnapshot.operations.find(o => o.id === operationId) || null); return; }
    api<Operation>('/api/operation?id=' + encodeURIComponent(operationId), controller.signal).then(setOperation).catch(e => { if (!controller.signal.aborted) setDetailError(e.message); });
    return () => controller.abort();
  }, [operationId, snapshot]);
  useEffect(() => {
    const controller = new AbortController(); setSearchError('');
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      if (isDemo) { const q = query.toLowerCase(); setResults(notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q)).slice(0, 12)); setSearching(false); return; }
      api<{ notes: Note[] }>('/api/search?q=' + encodeURIComponent(query), controller.signal).then(r => setResults(r.notes)).catch(e => { if (!controller.signal.aborted) setSearchError(e.message); }).finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, snapshot]);
  const shown = useMemo(() => visibleGraph(notes, folder, system, focus), [notes, folder, system, focus]);
  const pages = notes.filter(n => (folder === 'all' || n.folder === folder) && (system || !['inbox', 'system'].includes(n.folder))).sort((a, b) => a.title.localeCompare(b.title));
  const connectionCount = new Set(shown.flatMap(n => n.links.filter(p => shown.some(s => s.path === p)).map(p => [n.path, p].sort().join('|')))).size;
  function openNote(path: string) { setSelected(path); setQuery(''); setDetailError(''); if (view === 'changes') setView('pages'); }
  function changeView(next: View) { setView(next); setQuery(''); if (next === 'changes' && !operationId) setOperationId(operations[0]?.id || null); }
  if (!ready) return <main className="entry"><p className="muted">Opening your Brain…</p></main>;
  if (!snapshot) return <Entry error={error} csrf={csrf} onEnter={() => void refresh()} />;
  return <div className="app-shell">
    <aside className="sidebar"><a href={isDemo ? '/demo' : '/'} className="brand"><span className="brand-mark"><Network size={18} /></span><span>Brain<span className="brand-sub">A little more connected.</span></span></a>
      <nav aria-label="Main navigation">{([['graph', Network, 'Graph'], ['pages', BookOpen, 'Pages'], ['changes', History, 'Changes']] as const).map(([id, Icon, label]) => <button key={id} className={'nav-item ' + (view === id ? 'active' : '')} onClick={() => changeView(id)}><Icon size={16} /><span>{label}</span>{id === 'changes' && operations.some(o => o.status === 'needs_attention') ? <i className="attention-dot" /> : <small>{id === 'pages' ? notes.length : id === 'changes' ? operations.length : ''}</small>}</button>)}</nav>
      <div className="sidebar-section"><div className="sidebar-label">Your vault</div><button className={'folder-item ' + (folder === 'all' ? 'chosen' : '')} onClick={() => { setFolder('all'); setFocus(undefined); }}><Folder size={14} /><span>All notes</span><small>{notes.filter(n => !['inbox', 'system'].includes(n.folder)).length}</small></button>{Object.entries(folderLabels).filter(([k]) => !['all', 'inbox', 'system'].includes(k)).map(([key, label]) => <button className={'folder-item ' + (folder === key ? 'chosen' : '')} data-folder={key} key={key} onClick={() => { setFolder(key); setFocus(undefined); if (view === 'changes') setView('pages'); }}><span className="folder-dot" /><span>{label}</span><small>{notes.filter(n => n.folder === key).length}</small></button>)}</div>
      <div className="sidebar-section quick-notes"><div className="sidebar-label">Start here</div>{notes.filter(n => n.path === 'Brain.md' || n.title === 'Weekend build').map(n => <button key={n.path} className="folder-item" onClick={() => openNote(n.path)}><FileText size={13} /><span>{n.title}</span></button>)}</div>
      <div className="sidebar-bottom"><div className="owner-avatar">W</div><div><strong>My shared brain</strong><span>{isDemo ? 'Sample notes' : 'Private vault'}</span></div>{!isDemo && <button className="icon-button" aria-label="Sign out" onClick={async () => { const r = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf }) }); if (r.ok) { setSelected(null); setOperationId(null); setSnapshot(null); } else setError('Could not sign out. Refresh and try again.'); }}><LogOut size={14} /></button>}</div>
    </aside>
    <main className="main-shell"><header className="topbar"><div className="breadcrumb">My brain<ChevronRight size={13} /><strong>{view === 'graph' ? 'Graph' : view === 'pages' ? 'Pages' : 'Changes'}</strong></div><div className="search-wrap"><Search size={14} /><input aria-label="Search your notes" placeholder="Find a thought…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }} />{query ? <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button> : <span className="search-shortcut">Search</span>}{query.trim() && <div className="search-results" role="region" aria-label="Search results"><div className="sidebar-label">{searching ? 'Searching…' : searchError || `${results.length} matches`}</div>{!searching && !searchError && results.map(n => <button key={n.path} onClick={() => openNote(n.path)} data-folder={n.folder}><span className="folder-dot" /><span>{n.title}<small>{n.path}</small></span><ArrowUpRight size={13} /></button>)}{!searching && !searchError && !results.length && <p className="muted small">Try a different word or page title.</p>}</div>}</div><div className={'connection ' + (isDemo ? 'sample' : '')}><span />{isDemo ? 'Demo' : 'Private'}</div></header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {isDemo && <div className="demo-banner"><span><Sparkles size={12} />A sample brain to explore. Notes and activity are illustrative.</span><a href="/">Connect your vault<ArrowUpRight size={12} /></a></div>}
      <div className="view-header"><div><div className="eyebrow">{view === 'graph' ? 'Follow the connections' : view === 'pages' ? 'A place for every thought' : 'A memory with a paper trail'}</div><h1>{view === 'graph' ? (focus ? titleFor(focus) + ' · nearby' : 'Your connected thinking') : view === 'pages' ? 'The pages in your brain' : 'What changed'}</h1><p>{view === 'graph' ? 'A familiar thought is often one link away.' : view === 'pages' ? 'Read, follow a link, and find your way somewhere new.' : 'See what was remembered, what stayed the same, and what needs a closer look.'}</p></div><button className={'quiet-button ' + (refreshing ? 'busy' : '')} disabled={refreshing || isDemo} onClick={() => void refresh()} title={isDemo ? 'Sample data does not refresh' : 'Read the latest server vault'}><RefreshCw size={13} />{refreshing ? 'Refreshing' : 'Refresh'}</button></div>
      <div className="graph-layout" style={{ display: view === 'graph' ? undefined : 'none' }}><section className="graph-panel"><div className="graph-toolbar"><div><span className="tiny-dot" />{shown.length} notes<span className="toolbar-divider" />{connectionCount} connections</div><div>{focus && <button onClick={() => setFocus(undefined)}><ArrowLeft size={12} />Whole brain</button>}<label><SlidersHorizontal size={13} /><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} />Inbox & system</label></div></div><Graph notes={shown} allNotes={notes} selected={selected} onSelect={openNote} /><footer className="graph-footer"><div className="legend">{['brain', 'projects', 'areas', 'resources', 'archives'].map(k => <span key={k} data-folder={k}><i className="folder-dot" />{folderLabels[k]}</span>)}</div><span>Whole pages. Real links.</span></footer>{notes.length > 200 && <div className="graph-limit">Showing up to 200 notes. Choose a folder or focus a page to explore more.</div>}</section>
        {selected ? <aside className="inspector"><div className="inspector-bar"><span><FileText size={13} />Page inspector</span><button className="icon-button" aria-label="Close inspector" onClick={() => setSelected(null)}><PanelRightClose size={15} /></button></div><div className="inspector-scroll">{detailError ? <p className="error-text">{detailError}</p> : note ? <NoteReader note={note} notes={notes} onOpen={openNote} compact /> : <p className="muted">Loading page…</p>}</div><div className="inspector-actions"><button className="quiet-button" onClick={() => { setFocus(selected); setFolder('all'); }}>Focus neighbors</button><button className="primary" onClick={() => setView('pages')}>Read page<ArrowUpRight size={14} /></button></div></aside> : <aside className="welcome-inspector"><span className="welcome-icon"><GitBranch size={26} /></span><h2>One thought leads<br />to another.</h2><p>Choose a note to read it, see where it came from, and follow its connections.</p><div className="welcome-stat"><strong>{notes.filter(n => !['inbox', 'system'].includes(n.folder)).length}</strong><span>pages, quietly connected</span></div><button className="text-button" onClick={() => openNote(notes.find(n => n.path === 'Brain.md')?.path || notes[0]?.path || '')}>Start with the home note<ArrowUpRight size={13} /></button></aside>}
      </div>
      {view === 'pages' && <div className="reading-layout"><section className="page-list"><div className="list-heading">{folderLabels[folder]}<span>{pages.length}</span></div>{pages.map(n => <button data-folder={n.folder} key={n.path} className={'page-row ' + (selected === n.path ? 'selected' : '')} onClick={() => openNote(n.path)}><FileText size={15} /><div><strong>{n.title}</strong><small>{folderLabels[n.folder] || n.folder} · {n.links.length} links</small></div><ChevronRight size={13} /></button>)}{!pages.length && <p className="empty-text">No pages in this folder.</p>}<label className="system-toggle"><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} />Show inbox & system</label></section><div className="reader">{detailError ? <p className="error-text">{detailError}</p> : note ? <NoteReader note={note} notes={notes} onOpen={openNote} /> : <div className="reading-empty"><BookOpen size={30} /><h2>{selected ? 'Loading page…' : 'Pick a page. Get curious.'}</h2><p>Your notes are read-only here. Keep writing in Obsidian or with an agent.</p></div>}</div></div>}
      {view === 'changes' && <div className="reading-layout"><section className="page-list change-list"><div className="list-heading">Recent activity<span>{operations.length}</span></div>{operations.map(o => <button key={o.id} className={'change-row ' + (operationId === o.id ? 'selected' : '')} onClick={() => setOperationId(o.id)}><span className={'activity-icon ' + o.status}>{o.status === 'applied' ? <Check size={13} /> : o.status === 'needs_attention' ? <Circle size={12} /> : <History size={13} />}</span><div><strong>{titleFor(o.path)}</strong><span className={'status ' + o.status}>{statuses[o.status]}</span><small>{o.actor} · {when(o.at)}</small></div></button>)}{!operations.length && <p className="empty-text">Changes will appear after a note is written through MCP or an existing page changes in Obsidian.</p>}</section><div className="reader">{detailError ? <p className="error-text">{detailError}</p> : operation ? <ChangeReader operation={operation} onOpen={openNote} /> : <div className="reading-empty"><History size={30} /><h2>{operationId ? 'Loading change…' : 'Every memory has a story.'}</h2><p>Select a change to inspect the submitted text and its outcome.</p></div>}</div></div>}
      <footer className="statusbar"><span><LockKeyhole size={11} />{isDemo ? 'Illustrative demo' : 'Read-only explorer'}</span><span>{snapshot.status.sync}{snapshot.status.lastSync ? ' · ' + when(snapshot.status.lastSync) : ''}<i />{snapshot.status.search}</span></footer>
    </main>
  </div>;
}
