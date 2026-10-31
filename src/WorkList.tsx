import React, { useEffect, useState } from 'react';
import type { Operation, WorkItem } from './shared.ts';

export function WorkList({demo,operations,refreshKey,onNote,onOperation}:{demo:boolean;operations:Operation[];refreshKey:string;onNote:(path:string)=>void;onOperation:(id:string)=>void}){
  const [items,setItems]=useState<WorkItem[]>([]),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setError('');
    if(demo){setItems(operations.filter(o=>o.status==='needs_attention'&&!o.resolution&&o.decision?.outcome!=='not_worth_remembering').map(o=>({id:o.id,subject:'operation:'+o.id,revision:'sample',path:o.path,kind:'proposal',status:'open',reason:o.reason,operationId:o.id,createdAt:0,updatedAt:0})));return;}
    fetch('/api/work?offset='+offset,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Could not load shared work');setItems(data.items);setNext(data.nextOffset);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return()=>controller.abort();
  },[demo,refreshKey,offset,operations]);
  return <details className="work-list" open><summary>Shared work <span>{items.length}{next!==null?' +':''}</span></summary><p className="muted small">{demo?'Sample review queue.':'Agents pick up a small batch and record the outcome.'}</p>{error&&<p role="alert" className="error-text">{error}</p>}{items.map(item=><button className="work-row" key={item.id} onClick={()=>item.operationId?onOperation(item.operationId):onNote(item.path)}><strong>{item.path.split('/').pop()?.replace(/\.md$/,'')}</strong><small>{item.kind==='inbox'?'Verify & file':item.kind==='proposal'?'Review proposal':'Review changes'} · {item.status}</small><span>{item.reason}</span></button>)}{!items.length&&!error&&<p className="muted small">No pending work.</p>}{!demo&&(offset>0||next!==null)&&<div className="work-pages"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-10))}>Previous</button><button disabled={next===null} onClick={()=>setOffset(next!)}>Next</button></div>}</details>;
}
