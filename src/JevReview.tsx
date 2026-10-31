import React from 'react';
import { GitBranch } from 'lucide-react';
import { categoryLabels } from './shared.ts';
import type { Decision, Operation } from './shared.ts';

const outcomes: Record<Decision['outcome'], string> = { new: 'Supported new memory', update: 'Supported update', duplicate: 'Already remembered', conflict: 'Conflicting evidence', uncertain: 'Needs a closer look', not_worth_remembering: 'Not a lasting memory' };
const signals = [
  { key: 'worth', label: 'Worth remembering?', detail: 'Useful beyond this exchange: a lasting preference, decision, fact, or outstanding task.' },
  { key: 'supported', label: 'Evidence support', detail: 'How well the supplied evidence supports the proposal.' },
  { key: 'duplicate', label: 'Already remembered', detail: 'How much information is already in existing notes.' },
  { key: 'conflict', label: 'Conflict risk', detail: 'Contradictions, lost information, or instructions to the evaluator.' },
] as const;

export function JevReview({ operation, sample = false }: { operation: Operation; sample?: boolean }) {
  const decision = operation.decision;
  if (!decision) return <section className="jev-unreviewed" aria-label="Jev review"><strong>No Jev decision recorded</strong><p>{operation.reason}</p><small>{operation.status === 'external' ? 'Obsidian edits sync directly without a Jev review.' : 'This change has no recorded model evaluation.'}</small></section>;
  return <section className="jev-review" aria-label="Jev review">
    <div className="jev-heading"><span><GitBranch size={17} />Jev review</span>{sample && <span className="jev-sample">Illustrative example</span>}</div>
    <div className="jev-verdict"><span>Classification</span><h2>{outcomes[decision.outcome]}</h2><small>{decision.category ? categoryLabels[decision.category] : 'Category not recorded'} · {decision.model}</small></div>
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
    <div className="jev-result"><span>What happened</span><p>{operation.reason}</p></div>
    <p className="jev-caption">{sample ? 'Sample scores for exploring the interface. No Jev request is made.' : 'Recorded model judgments about supplied evidence, not verified probabilities of truth.'}</p>
  </section>;
}
