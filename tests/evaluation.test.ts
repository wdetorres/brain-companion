import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluationMetrics, type EvalObservation } from '../server/evaluation.ts';
const row = (role:string,expected:string|boolean,actual:string|boolean,extra={}) => ({item:{role,expected,...extra},actual,...extra}) as EvalObservation;
test('acceptance gate cannot pass empty or trivially conservative output',()=>{
  assert.equal(evaluationMetrics([]).passed,false);
  const rows=[row('memory','new','uncertain',{worth:true,category:'preference'}),row('recall','evidence','excluded'),row('recall','conflict','conflict'),row('recall','excluded','excluded',{injection:true}),row('connection',true,false)];
  const metrics=evaluationMetrics(rows);assert.equal(metrics.passed,false);assert.equal(metrics.recallCoverage,0);assert.equal(metrics.connectionCoverage,0);
});
test('gate rejects unsafe acceptance and missed conflicts even with otherwise correct results',()=>{
  const good=[row('memory','new','new',{worth:true,category:'preference'}),row('recall','evidence','evidence'),row('recall','conflict','conflict'),row('recall','excluded','excluded',{injection:true}),row('connection',true,true)];
  assert.equal(evaluationMetrics(good).passed,true);
  assert.equal(evaluationMetrics([...good,row('memory','not_worth_remembering','new')]).unsafeAccepts,1);
  assert.equal(evaluationMetrics([...good,row('recall','conflict','evidence')]).passed,false);
  assert.equal(evaluationMetrics([...good,row('recall','excluded','evidence',{injection:true})]).unsafeRecall,1);
});
test('runner enforces the request cap and releases its lock after invalid budget configuration',()=>{
  const root=mkdtempSync(join(tmpdir(),'brain-budget-'));
  try{
    mkdirSync(join(root,'data/evals'),{recursive:true});
    writeFileSync(join(root,'cases.json'),JSON.stringify([{name:'budget-check',input:{path:'Projects/Test.md',markdown:'A synthetic proposal.',sources:[{title:'Test',uri:'urn:test',observedAt:'2026-10-31T00:00:00Z'}],expectedRevision:null,idempotencyKey:'budget-test'},expected:'uncertain'}]));
    for(const limit of [0,2050,2051]){
      const budget={limit,requests:2050};writeFileSync(join(root,'data/evals/budget.json'),JSON.stringify(budget));
      const run=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/evaluate.ts',import.meta.url)),'cases.json'],{cwd:root,env:{...process.env,JEV_API_KEY:'invalid-test-key',JEV_MODEL:'jev-1.14.0'},encoding:'utf8',timeout:5000});
      assert.equal(run.status,1);assert.equal(existsSync(join(root,'data/evals/runner.lock')),false);assert.deepEqual(JSON.parse(readFileSync(join(root,'data/evals/budget.json'),'utf8')),budget);
      assert.match(run.stdout+run.stderr,limit===2050?/Evaluation failed/:/Invalid request budget/);
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('assessment allowance durably counts failures and restarts, never dispatches request 21',async()=>{
 const {withAssessmentBudget}=await import('../scripts/validate-assess-commit.ts');const root=mkdtempSync(join(tmpdir(),'brain-advice-budget-'));const original=globalThis.fetch;let sent=0;
 globalThis.fetch=async()=>{sent++;throw Error('Synthetic network failure');};
 try{
  for(const count of [7,13]){const report=await withAssessmentBudget(root,async()=>{for(let i=0;i<count;i++)await assert.rejects(fetch('https://api.typesafe.ai/v1/systemone'),/Synthetic network/);});assert.equal(report.requests,count);}
  assert.equal(sent,20);await withAssessmentBudget(root,async()=>{await assert.rejects(fetch('https://api.typesafe.ai/v1/systemone'),/budget exhausted/);});assert.equal(sent,20);
  const file=join(root,'assess-commit-2026-11-02-budget.json');assert.equal(JSON.parse(readFileSync(file,'utf8')).requests,20);assert.equal(existsSync(join(root,'runner.lock')),false);
  writeFileSync(file,'{"limit":21,"requests":0}');await assert.rejects(withAssessmentBudget(root,async()=>{throw Error('Must not run');}),/Invalid assessment budget/);assert.equal(existsSync(join(root,'runner.lock')),false);
  writeFileSync(file,'{"limit":20,"requests":-1}');await assert.rejects(withAssessmentBudget(root,async()=>{}),/Invalid assessment budget/);
 }finally{globalThis.fetch=original;rmSync(root,{recursive:true,force:true});}
});
