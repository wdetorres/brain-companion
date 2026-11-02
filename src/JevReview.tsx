import React from 'react';
import { GitBranch } from 'lucide-react';
import { categoryLabels } from './shared.ts';
import type { Decision, Operation, Assessment } from './shared.ts';

const outcomes: Record<Decision['outcome'], string> = { new: 'Supported new memory', update: 'Supported update', duplicate: 'Already remembered', conflict: 'Conflicting evidence', uncertain: 'Needs a closer look', not_worth_remembering: 'Not a lasting memory' };
const signals = [
  { key: 'worth', label: 'Worth remembering?', detail: 'Useful beyond this exchange: a lasting preference, decision, fact, or outstanding task.' },
  { key: 'supported', label: 'Evidence support', detail: 'How well the supplied evidence supports the proposal.' },
  { key: 'duplicate', label: 'Already remembered', detail: 'How much information is already in existing notes.' },
  { key: 'conflict', label: 'Conflict risk', detail: 'Contradictions, lost information, or instructions to the evaluator.' },
] as const;

export function JevReview({ operation, assessment, sample = false }: { operation?: Operation; assessment?:Assessment; sample?: boolean }) {
  if(operation?.assessment?.role==='related')return <section className="jev-unreviewed" aria-label="Jev review"><strong>Follow-up to assessed update</strong><p>This note has no separate Jev assessment. Its source update is recorded in the linked history.</p></section>;
  const decision = assessment?.decision || (!operation?.assessment?operation?.decision:undefined);
  const earlier=operation?.assessment?.candidateMatches===false,contextChanged=operation?.assessment?.contextChanged;
  if (!decision) return <section className="jev-unreviewed" aria-label="Jev review"><strong>{assessment?.status==='unavailable'?'Assessment unavailable':assessment?.status==='assessing'?'Assessment in progress':operation?.assessment?'Assessment not loaded':'Not assessed'}</strong><p>{assessment?.error||operation?.reason||'No model evaluation is recorded for this candidate.'}</p><small>{operation?.status === 'external' ? 'Obsidian edits sync directly without a Jev review.' : 'The agent verifies sources and decides what to save.'}</small></section>;
  return <section className="jev-review" aria-label="Jev review">
    <div className="jev-heading"><span><GitBranch size={17} />Jev write assessment</span>{sample && <span className="jev-sample">Illustrative example</span>}</div>
    <div className="jev-verdict"><span>Advisory classification</span><h2>{outcomes[decision.outcome]}</h2><small>{decision.category ? categoryLabels[decision.category] : 'Category not recorded'} · {decision.model}</small>{earlier&&<p className="assessment-scope">Assessment of earlier draft. The agent revised the final update.</p>}{contextChanged&&<p className="assessment-scope">These scores reflect earlier context. Related notes have changed.</p>}</div>
    <div className="jev-signals">{signals.map(signal => {
      const value = decision.probabilities?.[signal.key];
      const recorded = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
      const percentage = recorded ? Math.round(value * 100) : null;
      return <div className="jev-signal" key={signal.key}>
        <div className="jev-signal-label"><span>{signal.label}</span><strong>{percentage === null ? 'Not recorded' : `${percentage}%`}</strong></div>
        {percentage !== null && <div className="jev-meter" role="meter" aria-label={signal.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>}
        <p>{signal.detail}</p>
      </div>;
    })}</div>
    {!!assessment?.recommendations?.length&&<div className="jev-advice"><h3>Recommendations</h3><ul>{assessment.recommendations.map((r,i)=><li key={i}><strong>{r.action.charAt(0).toUpperCase()+r.action.slice(1)}</strong><span>{r.target==='candidate'?'Submitted update':r.path}</span></li>)}</ul><small>Advice for the agent. Archive and delete suggestions do not authorize changes.</small></div>}
    {operation?.assessment&&<div className="jev-result"><span>Agent decision</span><p>{operation.assessment.reason}</p></div>}
    <div className="jev-result"><span>What happened</span><p>{operation?.reason||assessment?.progress?.resolution?.reason||'Candidate saved for the agent to decide. No note has been written.'}</p></div>
    {assessment&&<details className="assessed-draft"><summary>Assessed draft</summary><pre>{assessment.input.markdown}</pre></details>}
    <p className="jev-caption">{sample ? 'Sample scores for exploring the interface. No Jev request is made.' : 'Recorded model judgments about supplied evidence, not verified probabilities of truth.'}</p>
  </section>;
}
