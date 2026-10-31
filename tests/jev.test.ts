import test from 'node:test';
import assert from 'node:assert/strict';
import { createJevJudge, parseDecision, parsePassage, parseConnection } from '../server/jev.ts';
import type { Note, RememberInput } from '../src/shared.ts';
const reply = (scores: Record<string, number>) => ({ model: 'jev-test', answers: Object.fromEntries(Object.entries(scores).map(([key, noul]) => [key, { type: 'noul', noul }])), usage: { input_tokens: 100, output_tokens: 10 } });
const memoryReply = (p: Record<string,number>) => {
  const result:any = reply({duplicate:p.duplicate,lost_context:.01});
  const support=Math.min(p.supported,1-p.conflict);
  const relation={supports:support,contradicts:p.conflict,says_nothing:1-support-p.conflict};
  result.answers.relation={type:'choice',choice:Object.keys(relation).sort((a,b)=>(relation as any)[b]-(relation as any)[a])[0],confidence:.99,probabilities:relation};
  const total=p.preference+p.decision+p.task+p.project_fact;
  const kind={preference:p.preference/total*p.worth,decision:p.decision/total*p.worth,task:p.task/total*p.worth,project_fact:p.project_fact/total*p.worth,ephemeral:1-p.worth};
  result.answers.kind={type:'choice',choice:Object.keys(kind).sort((a,b)=>(kind as any)[b]-(kind as any)[a])[0],confidence:.99,probabilities:kind};
  return result;
};
const memory = { supported: .99, duplicate: .01, conflict: .01, worth: .99, preference: .99, decision: .01, task: .01, project_fact: .01 };
test('rejects missing judgments and out-of-range probabilities', () => {
  for (const value of [{}, memoryReply({ ...memory, worth: 2 }), reply({ supported: .99 })]) assert.throws(() => parseDecision(value));
  assert.throws(() => parsePassage(reply({ relevant: .99 })));
  assert.throws(() => parseConnection(reply({ unrelated: -1 })));
});
test('conflicts outrank apparent support and low memory value', () => {
  assert.equal(parseDecision(memoryReply({ ...memory, conflict: .95, worth: .01 })).outcome, 'conflict');
});
test('memory gate separates lasting preferences, unfinished tasks, chatter and uncertainty', () => {
  assert.equal(parseDecision(memoryReply(memory)).outcome, 'new');
  assert.equal(parseDecision(memoryReply(memory), true).outcome, 'update');
  assert.equal(parseDecision(memoryReply({ ...memory, worth: .01 })).outcome, 'not_worth_remembering');
  assert.equal(parseDecision(memoryReply({ ...memory, worth: .5 })).outcome, 'uncertain');
  assert.equal(parseDecision(memoryReply({ ...memory, supported: .7 })).outcome, 'uncertain');
  const task = parseDecision(memoryReply({ ...memory, preference: .01, task: .99 }));
  assert.equal(task.category, 'task'); assert.equal(task.worthRemembering, true);
  assert.equal(parseDecision(memoryReply({ ...memory, decision: .95 })).outcome, 'uncertain');
  assert.equal(parseDecision(memoryReply({ ...memory, duplicate: .99 })).outcome, 'duplicate');
});
test('recall excludes injection before promoting evidence or contradictions', () => {
  const p = { relevant: .99, evidence: .99, conflict: .01, injection: .01 };
  assert.equal(parsePassage(reply(p)).route, 'evidence');
  assert.equal(parsePassage(reply({ ...p, conflict: .99 })).route, 'conflict');
  assert.equal(parsePassage(reply({ ...p, conflict: .99, injection: .99 })).route, 'excluded');
  assert.equal(parsePassage(reply({ ...p, relevant: .1 })).route, 'excluded');
  assert.equal(parsePassage(reply({ ...p, evidence: .5 })).route, 'excluded');

});

test('empty comparisons and exact content use deterministic facts while categories still use Jev',async t=>{
  const requests:any[]=[];
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    requests.push(JSON.parse(init.body as string));
    const result=memoryReply(memory);result.answers.duplicate={type:'noul',noul:1};result.answers.lost_context={type:'noul',noul:1};
    return new Response(JSON.stringify(result));
  });
  const input:RememberInput={path:'Preferences.md',markdown:'I prefer short explanations.',sources:[{title:'User',uri:'urn:test',observedAt:'2026-10-31T00:00:00Z',excerpt:'I prefer short explanations.'}],expectedRevision:null,idempotencyKey:'exact-comparison'};
  const judge=createJevJudge('test','jev-test'),fresh=await judge(input,undefined,[]);
  assert.equal(fresh.outcome,'new');assert.equal(fresh.probabilities?.duplicate,0);assert.equal(fresh.probabilities?.lost_context,0);
  assert.deepEqual(Object.keys(requests[0].questions),['relation']);assert.deepEqual(Object.keys(requests[1].questions),['kind']);
  const current={path:input.path,markdown:input.markdown} as Note;
  const duplicate=await judge(input,current,[]);assert.equal(requests.length,3);assert.deepEqual(Object.keys(requests[2].questions),['kind']);assert.equal(duplicate.outcome,'duplicate');assert.equal(duplicate.comparison,'exact_content');assert.equal(duplicate.category,'preference');
  const changed=await judge({...input,markdown:'I prefer detailed explanations.'},current,[]);
  assert.deepEqual(Object.keys(requests[3].questions),['relation','duplicate','lost_context']);assert.equal(changed.outcome,'conflict');
});

test('connection classification validates probabilities and preserves the usefulness threshold',()=>{
  const result=(connected:number,unrelated=1-connected,instruction_attack=0,choice='connected')=>({...reply({}),answers:{relationship:{type:'choice',choice,confidence:.99,probabilities:{connected,unrelated,instruction_attack}}}});
  assert.equal(parseConnection(result(.89)).useful,false);
  assert.equal(parseConnection(result(.9)).useful,true);
  assert.equal(parseConnection(result(.01,.01,.98,'instruction_attack')).useful,false);
  assert.equal(parseConnection(result(.01,.99,0,'unrelated')).score,.01);
  assert.throws(()=>parseConnection(result(.9,.9)));
  assert.throws(()=>parseConnection(result(.1,.9,0,'connected')));
  assert.throws(()=>parseConnection(result(1.1,-.1)));
});
