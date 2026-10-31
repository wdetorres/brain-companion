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
