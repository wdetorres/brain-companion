import test from 'node:test'; import assert from 'node:assert/strict';
import { parseDecision } from '../server/jev.ts';
test('rejects malformed judgments and out-of-range probabilities',()=>{
  for(const value of [{}, {answers:{conflict:{noul:2}}}]) assert.throws(()=>parseDecision(value));
});
test('prioritizes conflicting evidence over apparent support',()=>{
  const result=parseDecision({model:'jev-test',answers:{supported:{type:'noul',noul:.99},duplicate:{type:'noul',noul:.01},conflict:{type:'noul',noul:.95}},usage:{input_tokens:100,output_tokens:10}});
  assert.equal(result.outcome,'conflict');
});
test('treats uncertain support conservatively',()=>{
  const result=parseDecision({model:'jev-test',answers:{supported:{type:'noul',noul:.7},duplicate:{type:'noul',noul:.1},conflict:{type:'noul',noul:.1}},usage:{input_tokens:100,output_tokens:10}});
  assert.equal(result.outcome,'uncertain');
});
