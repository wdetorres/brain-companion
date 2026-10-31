import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Circle, FileText, Folder, GitBranch, History, Link2, LockKeyhole, LogOut, Network, PanelRightClose, RefreshCw, Search, SlidersHorizontal, Sparkles, X, ArrowRight, Layers } from 'lucide-react';
import { Graph } from './Graph.tsx';
import { connectionMarkdown } from './links.ts';
import { Recall } from './Recall.tsx';
import { ConnectionPanel } from './ConnectionPanel.tsx';
import { WorkList } from './WorkList.tsx';
import { MemoryActions } from './MemoryActions.tsx';
import { categories, categoryLabels } from './shared.ts';
import { JevReview } from './JevReview.tsx';
import { Markdown } from './Markdown.tsx';
import { demoSnapshot } from './demo.ts';
import { diffLines, folderLabels, safeUrl, visibleGraph } from './presentation.ts';
import type { BrainSnapshot, Note, Operation, Source, MemoryCategory, Connection } from './shared.ts';

type View = 'graph' | 'pages' | 'changes' | 'recall';
const isStandalone = document.documentElement.dataset.demo === 'true';
const isDemo = isStandalone || location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
const requestedView = new URLSearchParams(location.search).get('view');
const initialView: View = requestedView === 'changes' || requestedView === 'recall' || requestedView === 'pages' ? requestedView : 'graph';
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
  return <section className="detail-section"><h3>Sources <span>{sources.length}</span></h3>{sources.length ? sources.map((s, i) => <div className="source" key={s.uri + i}><Link2 size={13} /><div>{safeUrl(s.uri) ? <a href={safeUrl(s.uri)} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={12} /></a> : <span>{s.title}</span>}{s.excerpt && <details className="source-evidence"><summary>Supplied evidence</summary><blockquote>{s.excerpt}</blockquote></details>}<small title={s.uri}>{s.uri.startsWith('urn:') ? s.uri : s.uri.replace(/^https?:\/\//, '').split('/')[0]} · {when(s.observedAt)}</small></div></div>) : <p className="muted small">No source metadata on this page.</p>}</section>;
}
function NoteReader({ note, notes, onOpen, compact = false }: { note: Note; notes: Note[]; onOpen: (path: string) => void; compact?: boolean }) {
  const backlinks = notes.filter(n => n.links.includes(note.path));
  return <>
    <div className="note-heading"><h1>{note.title}</h1><div className="note-location" data-folder={note.folder}><span className="folder-dot" />{folderLabels[note.folder] || note.folder}<span className="meta-separator">/</span><span>{note.category ? categoryLabels[note.category] : 'Markdown note'}</span></div><div className="note-meta"><FileText size={13} />{note.path}</div></div>
    <Markdown path={note.path} text={note.body.replace(/^# [^\n]+\n+/, '')} notes={notes} onOpen={onOpen} />
    <Sources sources={note.sources} />
    <section className="detail-section"><h3>Linked mentions <span>{backlinks.length}</span></h3>{backlinks.length ? backlinks.map(n => <button className="backlink" key={n.path} onClick={() => onOpen(n.path)}><FileText size={13} /><span>{n.title}</span><ChevronRight size={13} /></button>) : <p className="muted small">No other pages link here yet.</p>}</section>
    {!!note.unresolved.length && <section className="detail-section"><h3>Unresolved links</h3><p className="muted small">{note.unresolved.join(' · ')}</p></section>}
    {!compact && <div className="revision">Updated {when(note.modifiedAt)} · Revision {note.revision.slice(0, 12)}</div>}
  </>;
}
function ChangeReader({ operation: op, onOpen, onReview }: { operation: Operation; onOpen: (path: string) => void; onReview:(action:'accept'|'dismiss',reason:string)=>Promise<void> }) {
  const lines = useMemo(() => diffLines(op.before ?? '', op.proposed), [op.before, op.proposed]);
  return <article className="change-reader"><h1>{titleFor(op.path)}</h1><div className="change-info"><span className={'status ' + op.status}>{statuses[op.status]}</span><span>{when(op.at)}</span></div><div className="change-actor"><Sparkles size={14} />{op.actor}</div>
    <JevReview operation={op} sample={isDemo} />
    <div className="diff-label"><span>{op.status === 'needs_attention' ? 'Current → proposed' : 'Before → submitted'}</span>{(op.before !== null || op.status === 'applied') && <button onClick={() => onOpen(op.path)}>Open current page <ArrowUpRight size={12} /></button>}</div>
    <div className="diff" aria-label="Markdown change">{lines.map((line, i) => <div key={i} className={'diff-line ' + line.kind}><span aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}</span><code>{line.text || ' '}</code></div>)}</div>
    <Sources sources={op.sources} /><MemoryActions key={op.id} operation={op} demo={isDemo} onReview={onReview}/><div className="revision">Operation {op.id}</div>
  </article>;
}
function Entry({ error, csrf, onEnter }: { error: string; csrf: string; onEnter: () => void }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="entry"><div className="entry-card"><div className="brand-mark"><Network size={23} /></div><h1>Welcome to your Brain.</h1><p>A quiet place to explore what you know, and see what your agents remember.</p>
    {error ? <div className="setup-message"><LockKeyhole size={18} /><p>{error}</p></div> : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrf }) }); const data = await r.json(); if (!r.ok) throw Error(data.error || 'Sign-in failed'); setPassword(''); onEnter(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}><label htmlFor="owner-password">Owner password</label><input autoFocus id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><button className="primary" disabled={busy || !csrf}>{busy ? 'Signing in…' : 'Open my Brain'}<ArrowUpRight size={16} /></button>{message && <p role="alert" className="error-text">{message}</p>}</form>}
    <a className="demo-link" href="/demo">Explore the sample brain <ArrowUpRight size={14} /></a><small>Private by default. Suggested links are saved only after review.</small></div></main>;
}
export function App() {
  const [snapshot, setSnapshot] = useState<BrainSnapshot | null>(isDemo ? demoSnapshot : null);
  const [ready, setReady] = useState(isDemo);
  const [csrf, setCsrf] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>(initialView);
  const [folder, setFolder] = useState('all');
  const [category, setCategory] = useState<MemoryCategory | ''>('');
  const [system, setSystem] = useState(false);
  const [focus, setFocus] = useState<string | undefined>();
  const [selected, setSelected] = useState<string | null>(isDemo ? 'Projects/Weekend build.md' : null);
  const [note, setNote] = useState<Note | null>(null);
  const [operationId, setOperationId] = useState<string | null>(isDemo && initialView === 'changes' ? demoSnapshot.operations[0]?.id || null : null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.current?.focus(); } };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  const notes = snapshot?.notes ?? [];
  const operations = (snapshot?.operations ?? []).filter(o => !category || o.decision?.category === category || o.category === category);
  const connections = snapshot?.connections ?? [];
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
    if (isDemo) { setNote(snapshot?.notes.find(n => n.path === selected) || null); return; }
    api<Note>('/api/note?path=' + encodeURIComponent(selected), controller.signal).then(setNote).catch(e => { if (!controller.signal.aborted) setDetailError(e.message); });
    return () => controller.abort();
  }, [selected, snapshot]);
  useEffect(() => {
    const controller = new AbortController(); setOperation(null); setDetailError('');
    if (!operationId) return;
    if (isDemo) { setOperation(snapshot?.operations.find(o => o.id === operationId) || null); return; }
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
  const shown = useMemo(() => visibleGraph(notes.filter(n => !category || n.category === category), folder, system, focus), [notes, folder, system, focus, category]);
  const pages = notes.filter(n => (!category || n.category === category) && (folder === 'all' || n.folder === folder) && (system || !['inbox', 'system'].includes(n.folder))).sort((a, b) => a.title.localeCompare(b.title));
  const connectionCount = new Set(shown.flatMap(n => n.links.filter(p => shown.some(s => s.path === p)).map(p => [n.path, p].sort().join('|')))).size;
  function openNote(path: string) { setSelected(path); setQuery(''); setDetailError(''); if (view === 'changes' || view === 'recall') setView('pages'); }
  function changeView(next: View) { setView(next); setQuery(''); if (next === 'changes' && !operationId) setOperationId(operations[0]?.id || null); }
  async function post<T>(path: string, body: object): Promise<T> {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, csrf }) });
    const data = await r.json(); if (!r.ok) throw Error(data.error || 'Request failed'); return data;
  }
  async function suggest() {
    if (!selected) return;
    if (isDemo) return;
    await post('/api/connections/suggest', { path: selected });
    setSnapshot(await api<BrainSnapshot>('/api/brain'));
  }
  async function reviewConnection(id: string, action: 'accept'|'dismiss') {
    if (isDemo) {
      setSnapshot(current => {
        if (!current) return current;
        const c = current.connections?.find(c => c.id === id); if (!c || c.status !== 'proposed') return current;
        return { ...current, connections: current.connections?.map(item => item.id === id ? { ...item, status: action === 'accept' ? 'accepted' : 'dismissed' } : item), notes: action === 'accept' ? current.notes.map(n => n.path === c.source ? { ...n, links: [...n.links, c.target], body: n.body + connectionMarkdown(c.source, c.target), markdown: n.markdown + connectionMarkdown(c.source, c.target), revision: n.revision + '-linked' } : n) : current.notes };
      }); return;
    }
    const result = await post<Connection>('/api/connections/review', { id, action });
    setSnapshot(await api<BrainSnapshot>('/api/brain'));
    if (result.status === 'stale') throw Error('A note changed; the link was not saved. Find connections again.');
  }
  async function reviewMemory(action:'accept'|'dismiss',reason:string){
    if(!operation)return;
    if(isDemo){setSnapshot(current=>current?{...current,operations:current.operations.map(o=>o.id===operation.id?{...o,resolution:{actor:'Demo owner',at:new Date().toISOString(),reason:action==='dismiss'?reason:'Sample review recorded. A live save requires fresh evidence checks. '+reason}}:o)}:current);return;}
    const reviewed=await post<Operation>('/api/memories/review',{id:operation.id,action,reason,idempotencyKey:crypto.randomUUID()});
    setSnapshot(await api<BrainSnapshot>('/api/brain'));setOperationId(reviewed.id);
  }
  const connectionPanel = note && <ConnectionPanel key={note.path} note={note} notes={notes} connections={connections} demo={isDemo} onSuggest={suggest} onReview={reviewConnection} onOpen={openNote} />;
  if (!ready) return <main className="entry"><p className="muted">Opening your Brain…</p></main>;
  if (!snapshot) return <Entry error={error} csrf={csrf} onEnter={() => void refresh()} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <a href={isStandalone ? '#' : isDemo ? '/demo' : '/'} className="brand" aria-label="Brain home">
        <span className="brand-mark"><Network size={23} strokeWidth={1.5} /></span><span>brain<span className="brand-period">.</span></span>
      </a>
      <div className="workspace-label"><span className="workspace-avatar">W</span><div><strong>Wilson’s brain</strong><span>Personal workspace</span></div></div>
      <nav aria-label="Main navigation">
        {([['graph', Network, 'Graph'], ['pages', BookOpen, 'Pages'], ['changes', History, 'Changes'], ['recall', Sparkles, 'Recall']] as const).map(([id, Icon, label]) => <button key={id} className={'nav-item ' + (view === id ? 'active' : '')} aria-current={view === id ? 'page' : undefined} aria-label={label} title={label} onClick={() => changeView(id)}><Icon size={18} strokeWidth={1.6} /><span>{label}</span>{id === 'changes' && operations.some(o => o.status === 'needs_attention' && !o.resolution) ? <span className="nav-count attention-count">{operations.filter(o => o.status === 'needs_attention' && !o.resolution).length}</span> : <span className="nav-count">{id === 'pages' ? notes.length : ''}</span>}</button>)}
      </nav>
      <div className="sidebar-section">
        <div className="sidebar-label">Collections</div>
        <button className={'folder-item ' + (folder === 'all' ? 'chosen' : '')} onClick={() => { setFolder('all'); setFocus(undefined); if (view === 'changes' || view === 'recall') setView('pages'); }}><Layers size={15} /><span>All notes</span><small>{notes.filter(n => !['inbox', 'system'].includes(n.folder)).length}</small></button>
        {Object.entries(folderLabels).filter(([k]) => !['all', 'inbox', 'system'].includes(k)).map(([key, label]) => <button className={'folder-item ' + (folder === key ? 'chosen' : '')} data-folder={key} key={key} onClick={() => { setFolder(key); setFocus(undefined); if (view === 'changes' || view === 'recall') setView('pages'); }}><span className="folder-dot" /><span>{label}</span><small>{notes.filter(n => n.folder === key).length}</small></button>)}
      </div>
      <div className="sidebar-section quick-notes"><div className="sidebar-label">Start here</div>{notes.filter(n => n.path === 'Brain.md' || n.title === 'Weekend build').map(n => <button key={n.path} className="folder-item" onClick={() => openNote(n.path)}><FileText size={15} /><span>{n.title}</span></button>)}</div>
      <div className="sidebar-footnote"><Link2 size={16} /><p>Good ideas don’t<br />have to live alone.</p></div>
      <div className="sidebar-bottom"><LockKeyhole size={14} /><span>{isDemo ? 'Sample workspace' : 'Private workspace'}</span>{!isDemo && <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={async () => { const r = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf }) }); if (r.ok) { setSelected(null); setOperationId(null); setSnapshot(null); } else setError('Could not sign out. Refresh and try again.'); }}><LogOut size={15} /></button>}</div>
    </aside>
    <main className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{view === 'graph' ? 'Graph' : view === 'pages' ? 'Pages' : view === 'recall' ? 'Recall' : 'Changes'}</strong></div>
        <div className="search-wrap"><Search size={17} /><input ref={searchInput} aria-label="Search your notes" placeholder="Search your brain" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }} />{query ? <button className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchInput.current?.focus(); }}><X size={15} /></button> : <kbd>⌘ K</kbd>}
          {query.trim() && <div className="search-results" role="region" aria-label="Search results"><div className="search-result-count" aria-live="polite">{searching ? 'Searching…' : searchError || `${results.length} matches`}</div>{!searching && !searchError && results.map(n => <button key={n.path} onClick={() => openNote(n.path)} data-folder={n.folder}><span className="folder-dot" /><span>{n.title}<small>{n.path}</small></span><ArrowUpRight size={15} /></button>)}{!searching && !searchError && !results.length && <p className="muted small">No matches. Try a different word or page title.</p>}</div>}
        </div>
        <div className={'connection ' + (isDemo ? 'sample' : '')}>{isDemo ? <><span />Demo</> : <><LockKeyhole size={13} />Private</>}</div>
      </header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="view-header">
        <div><h1>{view === 'graph' ? (focus ? titleFor(focus) : 'Your graph') : view === 'pages' ? 'Your pages' : view === 'recall' ? 'Recall with Jev' : 'What changed'}</h1><p>{view === 'graph' ? (focus ? 'This note and its direct connections.' : 'Follow a connection. Find a new perspective.') : view === 'pages' ? 'A home for everything worth remembering.' : view === 'recall' ? 'Useful context, with disagreements in view.' : 'Every update, with its evidence attached.'}</p></div>
        <div className="view-actions">{view !== 'recall' && <label className="collection-select memory-select"><span className="sr-only">Filter memory category</span><select aria-label="Filter memory category" value={category} onChange={e => { setCategory(e.target.value as MemoryCategory | ''); setSelected(null); setOperationId(null); }}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label>}{view !== 'changes' && <button className="quiet-button jev-shortcut" aria-label="View Jev reviews" title="View Jev reviews" onClick={() => changeView('changes')}><GitBranch size={15} /><span>Jev review</span></button>}{view !== 'changes' && view !== 'recall' && <label className="collection-select"><span className="sr-only">Filter notes by collection</span><select value={folder} onChange={e => { setFolder(e.target.value); setFocus(undefined); }}>{Object.entries(folderLabels).filter(([key]) => !['system', 'inbox'].includes(key)).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>}<button className={'quiet-button refresh-button ' + (refreshing ? 'busy' : '')} disabled={refreshing || isDemo} onClick={() => void refresh()} title={isDemo ? 'Sample data does not refresh' : 'Read the latest server vault'}><RefreshCw size={15} /><span>{refreshing ? 'Refreshing' : 'Refresh'}</span></button></div>
      </div>
      <div className="graph-layout" style={{ display: view === 'graph' ? undefined : 'none' }}>
        <section className="graph-panel" aria-label="Note graph">
          <div className="graph-toolbar"><div className="graph-counts"><span>{shown.length} notes</span><span>{connectionCount} connections</span><span className="suggestion-legend">⋯ Suggested links</span></div><div className="graph-options">{focus && <button className="text-button" onClick={() => setFocus(undefined)}><ArrowLeft size={14} />Whole graph</button>}<label className="checkbox-label"><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} />Inbox & system</label></div></div>
          <Graph notes={shown} selected={selected} onSelect={openNote} connections={connections} />
          <footer className="graph-footer"><div className="legend" aria-label="Filter graph by collection">{['brain', 'projects', 'areas', 'resources', 'archives'].map(k => <button key={k} data-folder={k} aria-pressed={folder === k} onClick={() => { setFolder(folder === k ? 'all' : k); setFocus(undefined); }}><span className="folder-dot" />{folderLabels[k]}</button>)}</div></footer>
          {notes.length > 200 && <div className="graph-limit">Up to 200 notes shown. Choose a collection or focus a note to explore more.</div>}
        </section>
        {selected ? <aside className="inspector" aria-label="Selected note">
          <div className="inspector-bar"><span><FileText size={15} />Note preview</span><button className="icon-button" aria-label="Close inspector" title="Close inspector" onClick={() => setSelected(null)}><PanelRightClose size={17} /></button></div>
          <div className="inspector-scroll">{detailError ? <p role="alert" className="error-text">{detailError}</p> : note ? <><NoteReader note={note} notes={notes} onOpen={openNote} compact />{connectionPanel}</> : <div className="reader-skeleton" role="status" aria-label="Loading page"><span /><span /><span /><span /></div>}</div>
          <div className="inspector-actions"><button className="quiet-button" onClick={() => { setFocus(selected); setFolder('all'); }}><Network size={15} />Focus</button><button className="primary" onClick={() => setView('pages')}>Read full page<ArrowRight size={15} /></button></div>
        </aside> : null}
      </div>
      {view === 'pages' && <div className="reading-layout"><section className="page-list" aria-label="Pages"><div className="list-heading"><span>{folderLabels[folder]}</span><span>{pages.length}</span></div>{pages.map(n => <button data-folder={n.folder} key={n.path} className={'page-row ' + (selected === n.path ? 'selected' : '')} aria-pressed={selected === n.path} onClick={() => openNote(n.path)}><FileText size={17} /><div><strong>{n.title}</strong><small>{folderLabels[n.folder] || n.folder} · {n.links.length} links</small></div><ChevronRight size={15} /></button>)}{!pages.length && <p className="empty-text">No pages here yet. Choose another collection.</p>}<label className="system-toggle"><input type="checkbox" checked={system} onChange={e => setSystem(e.target.checked)} />Show inbox & system</label></section><div className="reader">{detailError ? <p role="alert" className="error-text">{detailError}</p> : note ? <><NoteReader note={note} notes={notes} onOpen={openNote} />{connectionPanel}</> : <div className="reading-empty"><BookOpen size={30} /><h2>{selected ? 'Loading page…' : 'Pick a page. Get curious.'}</h2><p>Read and follow connections here. Keep writing in Obsidian or with an agent.</p></div>}</div></div>}
      {view === 'changes' && <div className="reading-layout"><section className="page-list change-list" aria-label="Recent changes"><WorkList demo={isDemo} operations={operations} refreshKey={snapshot.status.indexedAt} onNote={openNote} onOperation={setOperationId}/><div className="list-heading"><span>Recent activity</span><span>{operations.length}</span></div>{operations.map(o => <button key={o.id} className={'change-row ' + (operationId === o.id ? 'selected' : '')} aria-pressed={operationId === o.id} onClick={() => setOperationId(o.id)}><span className={'activity-icon ' + o.status}>{o.status === 'applied' ? <Check size={15} /> : o.status === 'needs_attention' ? <Circle size={15} /> : <History size={15} />}</span><div><strong>{titleFor(o.path)}</strong><span className={'status ' + o.status}>{o.resolution ? 'Reviewed' : statuses[o.status]}</span><small>{o.actor}<span>{when(o.at)}</span></small></div></button>)}{!operations.length && <p className="empty-text">Agent proposals and Obsidian edits will appear here. Select a proposal to see its Jev review.</p>}</section><div className="reader">{detailError ? <p role="alert" className="error-text">{detailError}</p> : operation ? <ChangeReader operation={operation} onOpen={openNote} onReview={reviewMemory} /> : <div className="reading-empty"><History size={30} /><h2>{operationId ? 'Loading change…' : 'See how memories are reviewed.'}</h2><p>Jev checks evidence support, duplication, and conflicts. Select a change to see its recorded scores and outcome.</p></div>}</div></div>}
      {view === 'recall' && <Recall csrf={csrf} demo={isDemo} notes={notes} onOpen={openNote} />}
      <footer className="statusbar"><span>{isDemo ? <><span className="demo-dot" />Sample notes & activity</> : <><LockKeyhole size={12} />Private explorer</>}</span><span>{isDemo ? (isStandalone ? 'Local demo' : 'Demo workspace') : snapshot.status.sync}{snapshot.status.lastSync ? ' · ' + when(snapshot.status.lastSync) : ''}<span className="status-separator">/</span>{snapshot.status.search}</span></footer>
    </main>
  </div>;
}
