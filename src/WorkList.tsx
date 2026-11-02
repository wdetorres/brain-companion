import React, { useEffect, useState } from 'react';
import type { Operation, WorkItem } from './shared.ts';
import { needsReview } from './presentation.ts';

export function WorkList({demo,operations,refreshKey,selectedOperationId,onNote,onOperation}:{demo:boolean;operations:Operation[];refreshKey:string;selectedOperationId:string|null;onNote:(path:string)=>void;onOperation:(id:string)=>void}){
  const [items,setItems]=useState<WorkItem[]>([]),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null),[error,setError]=useState('');
  const [loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setError('');setLoading(true);
    if(demo){setItems(operations.filter(needsReview).map(o=>({id:o.id,subject:'operation:'+o.id,revision:'sample',path:o.path,kind:'proposal',status:'open',reason:o.reason,operationId:o.id,createdAt:0,updatedAt:0})));setNext(null);setLoading(false);return;}
    fetch('/api/work?offset='+offset,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Could not load shared work');setItems(data.items);setNext(data.nextOffset);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[demo,refreshKey,offset,operations,attempt]);
  return <details className="work-list" open><summary>Needs review {!loading&&!error&&<span>{items.length}{next!==null?' +':''}</span>}</summary>{loading&&<p className="muted small" role="status">Loading review queue…</p>}{error&&<><p role="alert" className="error-text">{error}</p><button className="text-button" onClick={()=>setAttempt(n=>n+1)}>Try again</button></>}{!loading&&!error&&items.map(item=><button className="work-row" key={item.id} aria-current={item.operationId===selectedOperationId?true:undefined} onClick={()=>item.operationId?onOperation(item.operationId):onNote(item.path)}><strong>{item.path.split('/').pop()?.replace(/\.md$/,'')}</strong><small>{item.kind==='inbox'?'Verify & file':item.kind==='proposal'?'Review proposal':'Review changes'} · {item.status}</small><span>{item.reason}</span></button>)}{!loading&&!items.length&&!error&&<p className="muted small">No pending work.</p>}{!demo&&!loading&&!error&&(offset>0||next!==null)&&<div className="work-pages"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-10))}>Previous</button><button disabled={next===null} onClick={()=>{if(next!==null)setOffset(next);}}>Next</button></div>}</details>;
}
