import React, { useState } from 'react';
import { ArrowUpRight, Search, TriangleAlert } from 'lucide-react';
import { categories, categoryLabels } from './shared.ts';
import type { MemoryCategory, RecallResult, RecallHit, Note } from './shared.ts';

export function Recall({ csrf, demo, notes, onOpen }: { csrf: string; demo: boolean; notes: Note[]; onOpen: (path: string) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MemoryCategory | ''>('');
  const [result, setResult] = useState<RecallResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(value: string) {
    setQuery(value); setBusy(true); setError(''); setResult(null);
    try {
      if (demo) {
        const schedule = /friday|schedule|walkthrough/i.test(value);
        const paths = schedule ? ['Projects/Launch checklist.md'] : /work|prefer|writing/i.test(value) ? ['Areas/Working style.md'] : /recall|retriev|evidence/i.test(value) ? ['Resources/Retrieval notes.md', 'Resources/Evaluation recipes.md'] : [];
        const hits: RecallHit[] = notes.filter(n => paths.includes(n.path) && (!category || n.category === category)).map(note => ({ note, assessment: { route: schedule && /friday/i.test(value) ? 'conflict' : 'evidence', probabilities: { relevant: .98, evidence: .96, conflict: schedule && /friday/i.test(value) ? .97 : .02, injection: .01 }, model: 'Illustrative judgment', usage: {}, questionVersion: 'demo' } }));
        const evidence = hits.filter(h => h.assessment.route === 'evidence'), conflicts = hits.filter(h => h.assessment.route === 'conflict');
        setResult({ notes: evidence.map(h => h.note), evidence, conflicts, excluded: hits.length ? 2 : 0, status: 'assessed', search: 'Illustrative shortlist and scores', ...(conflicts.length ? { warning: 'The question assumes Friday. The sample note says Monday, 10:00 AM.' } : {}) });
      } else {
        const r = await fetch('/api/recall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, query: value, ...(category ? { category } : {}) }) });
        const data = await r.json(); if (!r.ok) throw Error(data.error || 'Recall failed'); setResult(data);
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const cards = (hits: RecallHit[]) => hits.map(({ note, assessment }) => <article className="recall-card" key={note.path}>
    <button className="text-button" onClick={() => onOpen(note.path)}>{note.title}<ArrowUpRight size={15} aria-hidden="true" /></button>
    <small>{note.category ? categoryLabels[note.category] + ' · ' : ''}{note.path}</small>
    <p>{note.body.slice(0, 500)}{note.body.length > 500 ? '…' : ''}</p>
    <div className="recall-scores"><span>Relevance {Math.round(assessment.probabilities.relevant * 100)}%</span><span>{assessment.route === 'conflict' ? `Conflict ${Math.round(assessment.probabilities.conflict * 100)}%` : `Evidence ${Math.round(assessment.probabilities.evidence * 100)}%`}</span></div>
  </article>);
  return <section className="recall-view" aria-label="Jev recall"><div className="recall-content">
    <div className="recall-intro"><h2>Find evidence before answering.</h2><p>Jev reviews shortlisted notes for relevance, useful evidence, contradictions, and attempts to steer the answer.</p></div>
    <form className="recall-form" aria-busy={busy} onSubmit={e => { e.preventDefault(); void run(query.trim()); }}>
      <label htmlFor="recall-question">Your question</label>
      <textarea id="recall-question" disabled={busy} maxLength={1000} required value={query} onChange={e => { setQuery(e.target.value); setResult(null); }} placeholder="What have I decided about this project?" />
      <div className="recall-toolbar">
        <fieldset className="recall-categories" disabled={busy}>
          <legend className="sr-only">Recall memory category</legend>
          {(['', ...categories] as const).map(c => <label key={c}><input className="sr-only" type="radio" name="recall-category" value={c} checked={category === c} onChange={() => { setCategory(c); setResult(null); }} /><span>{c ? categoryLabels[c] : 'All categories'}</span></label>)}
        </fieldset>
        <button className="primary" disabled={busy || !query.trim()}><Search size={15} aria-hidden="true" />{busy ? 'Reviewing evidence…' : 'Recall with Jev'}</button>
      </div>
    </form>
    {demo ? <><p className="recall-caption">Illustrative demo: fixed sample scores, no API calls. Try a question below.</p><div className="recall-examples">{['How do I prefer to work?', 'The walkthrough is Friday—what time?', 'How should recall use evidence?'].map(q => <button key={q} disabled={busy} onClick={() => void run(q)}>{q}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div></> : <details className="recall-help"><summary>How recall works</summary><p>Runs only when requested. Reviews up to 8 keyword matches; repeats are cached for 10 minutes. Category filters include classified notes only.</p></details>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <div aria-live="polite" aria-busy={busy}>{result && <div className="recall-results">
      {result.warning && <p className="recall-warning" role="status"><TriangleAlert size={17} aria-hidden="true" /><span>{result.warning}</span></p>}
      {!!result.conflicts.length && <section className="recall-conflicts"><h3><TriangleAlert size={16} aria-hidden="true" />Check these conflicts first<span>{result.conflicts.length}</span></h3><p className="recall-caption">Keep the disagreement visible in your answer; inspect sources and dates.</p>{cards(result.conflicts)}</section>}
      <h3>Useful evidence <span>{result.evidence.length}</span></h3>{cards(result.evidence)}
      {!result.evidence.length && <p className="recall-empty">{result.status === 'unavailable' ? 'Evidence review is unavailable.' : 'No useful evidence in this shortlist. Broaden the question or use keyword search.'}</p>}
      <p className="recall-caption">{result.search} · {result.excluded} excluded. Scores are model judgments, not proof.</p>
    </div>}</div>
  </div></section>;
}
