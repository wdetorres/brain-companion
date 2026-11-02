import React from 'react';
import { ArrowUpRight, Link2, Sparkles } from 'lucide-react';
import type { Assessment, Operation, Source } from './shared.ts';
import { diffLines, operationStatus, safeUrl } from './presentation.ts';
import { JevReview } from './JevReview.tsx';
import { MemoryActions, UndoActions } from './MemoryActions.tsx';

const when=(s:string)=>new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const title=(path:string)=>path.split('/').pop()?.replace(/\.md$/,'')||path;
export function Sources({sources}:{sources:Source[]}){
  return <section className="detail-section"><h3>Sources <span>{sources.length}</span></h3>{sources.length?sources.map((s,i)=><div className="source" key={s.uri+i}><Link2 size={13}/><div>{safeUrl(s.uri)?<a href={safeUrl(s.uri)} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={12}/></a>:<span>{s.title}</span>}{s.excerpt&&<details className="source-evidence"><summary>Supplied evidence</summary><blockquote>{s.excerpt}</blockquote></details>}<small title={s.uri}>{s.uri.startsWith('urn:')?s.uri:s.uri.replace(/^https?:\/\//,'').split('/')[0]} · {when(s.observedAt)}</small></div></div>):<p className="muted small">No source metadata on this page.</p>}</section>;
}
export function ChangeReader({operation:op,assessment,demo,onOpen,onReview,onUndo}:{operation:Operation;assessment?:Assessment;demo:boolean;onOpen:(path:string)=>void;onReview:(action:'accept'|'dismiss',reason:string)=>Promise<void>;onUndo:(reason:string)=>Promise<void>}){
  const changes=op.undo?.files||[{path:op.path,before:op.before,after:op.proposed}];
  return <article className="change-reader"><h1>{title(op.path)}</h1><div className="change-info"><span className={'status '+op.status}>{operationStatus(op)}</span><span>{when(op.at)}</span></div><div className="change-actor"><Sparkles size={14}/>{op.actor}</div>
    <p className="change-summary">{op.reason}</p><JevReview operation={op} assessment={assessment} sample={demo}/>
    {changes.map(file=><section key={file.path}><div className="diff-label"><span>{file.after===null?'Deleted file':op.undo?'Restored file':op.status==='needs_attention'?'Current → proposed':'Before → final update'}{op.undo?' · '+file.path:''}</span>{file.after!==null&&(file.before!==null||op.status==='applied')&&<button onClick={()=>onOpen(file.path)}>Open current page <ArrowUpRight size={12}/></button>}</div><div className="diff" aria-label="Markdown change">{diffLines(file.before??'',file.after??'').map((line,i)=><div key={i} className={'diff-line '+line.kind}><span aria-hidden="true">{line.kind==='add'?'+':line.kind==='remove'?'−':' '}</span><code>{line.text||' '}</code></div>)}</div></section>)}
    <Sources sources={op.sources}/><MemoryActions key={'review-'+op.id} operation={op} demo={demo} onReview={onReview}/><UndoActions key={'undo-'+op.id} operation={op} demo={demo} onUndo={onUndo}/><div className="revision">Operation {op.id}{op.undo?' · Reverses '+op.undo.operationId:''}</div>
  </article>;
}
export function AssessmentReader({assessment:a,demo}:{assessment:Assessment;demo:boolean}){
  return <article className="change-reader"><h1>{title(a.input.path)}</h1><div className="change-info"><span className="status">{a.progress?.resolution?'Decision recorded':'Awaiting agent'}</span><span>{when(a.at)}</span></div><div className="change-actor"><Sparkles size={14}/>{a.actor}</div><p className="change-summary">{a.progress?.resolution?'Inspect the recorded outcome for this candidate.':'This candidate has not been saved as a note. An authorized agent can resume it from shared work.'}</p><JevReview assessment={a} sample={demo}/><Sources sources={a.input.sources}/>{a.status!=='assessed'&&<details className="assessed-draft"><summary>Submitted candidate</summary><pre>{a.input.markdown}</pre></details>}<div className="revision">Assessment {a.id}</div></article>;
}
