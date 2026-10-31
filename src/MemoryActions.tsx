import React, { useState } from 'react';
import type { Operation } from './shared.ts';

export function MemoryActions({operation:op,demo,onReview}:{operation:Operation;demo:boolean;onReview:(action:'accept'|'dismiss',reason:string)=>Promise<void>}){
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(op.resolution)return <section className="memory-actions"><strong>Review recorded</strong><p>{op.resolution.reason}</p></section>;
  if(op.status!=='needs_attention'||op.promotion)return null;
  async function review(action:'accept'|'dismiss'){setBusy(true);setError('');try{await onReview(action,reason);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="memory-actions"><h3>Review this proposal</h3><p className="muted small">{demo?'Sample controls; no real notes are changed.':'Check the supplied sources and proposed changes. Saving reruns Jev and preserves newer edits.'}</p><label htmlFor={'review-'+op.id}>Review note</label><textarea id={'review-'+op.id} rows={2} maxLength={1000} placeholder="What did you verify, or why should this be dismissed?" value={reason} onChange={e=>setReason(e.target.value)}/><div className="memory-action-buttons"><button className="quiet-button" disabled={busy||!reason.trim()} onClick={()=>void review('dismiss')}>Dismiss</button><button className="primary" disabled={busy||!reason.trim()} onClick={()=>void review('accept')}>{busy?'Reviewing…':'Recheck & save'}</button></div>{error&&<p role="alert" className="error-text">{error}</p>}</section>;
}
