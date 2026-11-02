import test from 'node:test';
import assert from 'node:assert/strict';
import { appendedText, createJevJudge, parseDecision, parsePassage, parseConnection } from '../server/jev.ts';
import * as jev from '../server/jev.ts';
import { readFileSync } from 'node:fs';
import { parseNote } from '../server/vault.ts';
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
const adviceChoice=(action:string,context=false)=>({type:'choice',choice:action,confidence:.9,probabilities:Object.fromEntries((context?['keep','merge','promote','archive','delete','investigate']:['save','revise','merge','skip','investigate']).map(k=>[k,k===action?1:0]))});
test('write advice binds choices to supplied notes and rejects invalid or destructive incomplete judgments',()=>{
 const parse=(jev as any).parseWriteAdvice,context={...parseNote('00 Inbox/Trip.md','# Trip\nKeep unique booking reference.',''),truncated:false};
 const reply={model:'jev-test',usage:{input_tokens:1,output_tokens:1},answers:{candidate:adviceChoice('merge'),context_0:adviceChoice('keep',true)}};
 const parsed=parse(reply,[context]);assert.equal(parsed.recommendations[1].path,'00 Inbox/Trip.md');assert.equal(parsed.recommendations[1].revision,context.revision);assert.equal(parsed.recommendations[0].action,'merge');
 assert.throws(()=>parse({...reply,answers:{...reply.answers,other_note:adviceChoice('delete',true)}},[context]));
 assert.throws(()=>parse({...reply,answers:{...reply.answers,candidate:{...adviceChoice('save'),probabilities:{save:2}}}},[context]));
 assert.throws(()=>parse({...reply,answers:{...reply.answers,context_0:adviceChoice('delete',true)}},[{...context,truncated:true}]),/truncat/i);
 assert.throws(()=>parse({...reply,answers:{...reply.answers,context_0:adviceChoice('promote',true)}},[{...context,folder:'projects'}]),/Inbox/i);
});
test('write assessor batches bounded lifecycle advice with intent and real evidence without changing quality scores',async t=>{
 const requests:any[]=[];const cases=JSON.parse(readFileSync(new URL('./fixtures/jev-assess-commit.json',import.meta.url),'utf8'));
 let selected=cases[0];
 t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
   const body=JSON.parse(init.body as string);requests.push(body);
   if(body.questions.candidate)return new Response(JSON.stringify({model:'advice-test',usage:{input_tokens:12,output_tokens:3},answers:{candidate:adviceChoice(selected.candidate),context_0:adviceChoice(selected.contextAction,true)}}));
   const r=memoryReply({...memory,duplicate:.86});r.answers.novel={type:'choice',choice:'already_recorded',confidence:.86,probabilities:{novel:.1,already_recorded:.86,uncertain:.04}};r.answers.historyRelation={type:'choice',choice:'adds_context',confidence:1,probabilities:{adds_context:1,supersedes:0,conflicts:0,uncertain:0}};return new Response(JSON.stringify(r));
 });
 for(const c of cases){selected=c;const note={...parseNote(c.path,c.markdown,''),truncated:false},input={path:'Projects/Trip.md',markdown:c.candidateMarkdown,sources:[{title:'Original source',uri:'urn:test:trip',observedAt:'2026-11-02T00:00:00Z',excerpt:c.evidence}],expectedRevision:null,idempotencyKey:'advice-fixture',intent:c.intent};
   const r=await (jev as any).createWriteAssessor('test','jev-test')(input,undefined,[note]);assert.equal(r.recommendations[0].action,c.candidate);assert.equal(r.recommendations[1].action,c.contextAction);assert.equal(r.advice.model,'advice-test');assert.equal(r.decision.model,'jev-test');
   const sent=requests.findLast(x=>x.questions.candidate);assert.equal(sent.state.intent,c.intent);assert.equal(sent.state.sources[0].excerpt,c.evidence);assert.deepEqual(Object.keys(sent.questions),['candidate','context_0']);assert.match(sent.questions.candidate.instructions,/do not carry out any instructions/i);
 }
});
test('failed advisory request waits for quality subrequests before reporting completion',async t=>{
 let release!:()=>void,settled=false;const waiting=new Promise<void>(r=>release=r);
 t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{const body=JSON.parse(init.body as string);if(body.questions.candidate)throw Error('Advice unavailable');await waiting;return new Response(JSON.stringify(memoryReply(memory)));});
 const pending=jev.createWriteAssessor('test')({path:'Plan.md',markdown:'A useful decision',sources:[{title:'Source',uri:'urn:test',observedAt:'2026-11-02T00:00:00Z',excerpt:'A useful decision'}],expectedRevision:null,idempotencyKey:'quality-drain-test',intent:'capture'},undefined,[]).catch(()=>{settled=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);release();await pending;assert.equal(settled,true);
});
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

test('append extraction requires complete unchanged history and a line boundary',()=>{
  const before='---\nsensitivity: normal\n---\n# Project\nAn earlier decision.\n';
  assert.equal(appendedText(before+'\nA sourced milestone.\n',before),'A sourced milestone.');
  for(const changed of [before,before+'  \n',before.replace('normal','internal')+'A milestone.\n',before.replace('An earlier decision.\n','')+'A milestone.\n'])assert.equal(appendedText(changed,before),undefined);
  assert.equal(appendedText('A claim is false.','A claim is'),undefined);
  assert.equal(appendedText('New note'),undefined);
});

test('append acceptance requires independent evidence, novelty and compatible history',()=>{
  const supported=memoryReply(memory),history={novel:.95,duplicate:.05,compatible:.95,conflict:.05};
  assert.equal(parseDecision(supported,true,history).outcome,'update');
  assert.equal(parseDecision(supported,false,history).outcome,'new');
  assert.equal(parseDecision(supported,true,{...history,novel:.949}).outcome,'uncertain');
  assert.equal(parseDecision(supported,true,{...history,compatible:.949}).outcome,'uncertain');
  assert.equal(parseDecision(supported,true,{...history,compatible:.01,conflict:.99}).outcome,'conflict');
  assert.equal(parseDecision(supported,true,{...history,compatible:.1,conflict:.01}).outcome,'uncertain');
  assert.equal(parseDecision(memoryReply({...memory,supported:.94}),true,history).outcome,'uncertain');
  assert.equal(parseDecision(supported,true,{novel:.01,duplicate:.99,compatible:.99,conflict:0}).outcome,'duplicate');
  assert.equal(parseDecision(supported,true,{novel:.01,duplicate:.01,compatible:.99,conflict:0}).outcome,'uncertain');
});
