import test from 'node:test';import assert from 'node:assert/strict';
import { safeUrl, diffLines, visibleGraph } from '../src/presentation.ts';
test('blocks executable URLs while allowing evidence links',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,evil','//evil.example','vbscript:bad'])assert.equal(safeUrl(url),undefined);
 assert.equal(safeUrl('https://example.com/source'),'https://example.com/source');
});
test('diff keeps unchanged context and shows additions and removals',()=>{
 assert.deepEqual(diffLines('# Plan\nFriday\nDone','# Plan\nMonday\nDone'),[{kind:'same',text:'# Plan'},{kind:'remove',text:'Friday'},{kind:'add',text:'Monday'},{kind:'same',text:'Done'}]);
});
test('local graph includes inbound and outbound neighbors and bounds large views',()=>{
 const notes:any[]=[{path:'A',folder:'projects',links:['B']},{path:'B',folder:'areas',links:[]},{path:'C',folder:'resources',links:['A']},{path:'D',folder:'system',links:[]}];
 assert.deepEqual(visibleGraph(notes,'all',false,'A').map(n=>n.path),['A','B','C']);
 assert.equal(visibleGraph(Array.from({length:400},(_,i)=>({path:String(i),folder:'projects',links:[]})) as any,'all',false).length,200);
});

test('page-relative links win over matching titles and ambiguous basenames stay unresolved', async () => {
  const {resolveNoteLink}=await import('../src/links.ts');
  const notes=[{path:'Home.md',title:'Home'},{path:'A/Plan.md',title:'Renamed title'},{path:'B/Plan.md',title:'Plan'}];
  assert.equal(resolveNoteLink(notes,'A/Index.md','Plan'),'A/Plan.md');
  assert.equal(resolveNoteLink(notes,'Home.md','Plan.md'),undefined);
  assert.equal(resolveNoteLink(notes,'A/Index.md','../Home.md#Heading'),'Home.md');
});


test('reviewed links resolve to the chosen target even with an overlapping folder name', async () => {
  const {connectionMarkdown,resolveNoteLink}=await import('../src/links.ts');
  const nodes=[{path:'Projects/Source.md',title:'Source'},{path:'Resources/Guide.md',title:'Guide'},{path:'Projects/Resources/Guide.md',title:'Other guide'}];
  const text=connectionMarkdown(nodes[0].path,nodes[1].path);
  assert.equal(text,'\n\nRelated: [[../Resources/Guide]]\n');
  assert.equal(resolveNoteLink(nodes,nodes[0].path,text.match(/\[\[(.*?)\]\]/)![1]),nodes[1].path);
});
