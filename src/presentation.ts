import type{Note, Operation}from'./shared.ts';
export function needsReview(operation: Operation) {
 return operation.status === 'needs_attention' && !operation.resolution && !operation.undo && operation.assessment?.role!=='primary' && operation.decision?.outcome !== 'not_worth_remembering';
}
export function operationStatus(op:Operation){
 if(op.status==='applied')return op.undo?'Undo applied':'Applied';
 if(op.resolution)return'Reviewed';
 return({duplicate:'Already present',needs_attention:'Needs attention',failed:'Failed',external:'From Obsidian',pending:'Pending'})[op.status];
}
export function firstReview(operations: Operation[]) {
 return (operations.find(needsReview) || operations[0])?.id || null;
}
export function safeUrl(value:string):string|undefined{try{const u=new URL(value);return ['https:','http:','obsidian:'].includes(u.protocol)?value:undefined;}catch{return;}}
export function visibleGraph(notes:Note[],folder:string,system:boolean,focus?:string){
 const neighbors=new Set(focus?[focus,...(notes.find(n=>n.path===focus)?.links||[]),...notes.filter(n=>n.links.includes(focus)).map(n=>n.path)]:[]);
 return notes.filter(n=>(system||!['system','inbox'].includes(n.folder))&&(folder==='all'||n.folder===folder)&&(!focus||neighbors.has(n.path))).slice(0,200);
}
export type DiffLine={kind:'same'|'add'|'remove';text:string};
export function diffLines(before:string,after:string):DiffLine[]{
 const a=before.split('\n'),b=after.split('\n');
 if(a.length*b.length>250000)return [...a.map(text=>({kind:'remove' as const,text})),...b.map(text=>({kind:'add' as const,text}))];
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const out:DiffLine[]=[];let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){out.push({kind:'same',text:a[i++]});j++;}else if(i<a.length&&(j===b.length||dp[i+1][j]>=dp[i][j+1]))out.push({kind:'remove',text:a[i++]});else out.push({kind:'add',text:b[j++]});}return out;
}
export const folderLabels:Record<string,string>={all:'All notes',brain:'Brain',projects:'Projects',areas:'Areas',resources:'Resources',archives:'Archives',inbox:'Inbox',system:'System'};

export function recentNotes(notes: Note[]) {
 return notes.filter(note => Number.isFinite(Date.parse(note.modifiedAt)))
  .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 4);
}
