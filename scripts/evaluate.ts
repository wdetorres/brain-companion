import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createJevJudge, createRecallJudge, createConnectionJudge, questionVersion } from '../server/jev.ts';
import { evaluationMetrics, type EvalCase, type EvalObservation } from '../server/evaluation.ts';
import { rememberSchema } from '../server/store.ts';
import { categories } from '../src/shared.ts';

const path=process.argv[2],split=process.argv[3]||'dev';
if(!path||!process.env.JEV_API_KEY||!['dev','holdout'].includes(split))throw Error('Usage: npm run evaluate -- private-cases.json [dev|holdout]; requires JEV_API_KEY');
const model=process.env.JEV_MODEL;
if(!model||!/^jev-\d+\.\d+\.\d+$/.test(model))throw Error('Set a pinned JEV_MODEL for reproducible evaluation');
const raw=readFileSync(path,'utf8'),parsed=JSON.parse(raw);
const cases:EvalCase[]=(Array.isArray(parsed)?parsed.map(c=>({...c,role:c.role||'memory'})):parsed.cases).filter((c:EvalCase)=>!c.split||c.split===split);
if(!cases.length||cases.length>400)throw Error('Provide 1–400 cases per split');
const note=z.object({path:z.string(),title:z.string(),markdown:z.string(),body:z.string(),revision:z.string(),folder:z.string(),links:z.array(z.string()),unresolved:z.array(z.string()),sources:z.array(z.any()),tags:z.array(z.string()),modifiedAt:z.string()});
const base={name:z.string().min(1),split:z.enum(['dev','holdout']).optional(),sourceRefs:z.array(z.string()).optional(),rationale:z.string().optional(),authoredVariant:z.boolean().optional()};
const schema=z.discriminatedUnion('role',[
  z.object({...base,role:z.literal('memory'),input:rememberSchema,current:note.optional(),related:z.array(note).optional(),expected:z.enum(['new','update','duplicate','conflict','uncertain','not_worth_remembering']),worth:z.boolean().optional(),category:z.enum(categories).optional()}),
  z.object({...base,role:z.literal('recall'),query:z.string().min(1).max(1000),note,peers:z.array(note).optional(),expected:z.enum(['evidence','conflict','excluded']),injection:z.boolean().optional()}),
  z.object({...base,role:z.literal('connection'),source:note,target:note,expected:z.boolean()}),
]);
cases.forEach(c=>schema.parse(c));
if(new Set(cases.map(c=>c.name)).size!==cases.length)throw Error('Case names must be unique');
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const root=resolve('data/evals');mkdirSync(root,{recursive:true,mode:0o700});
const originalFetch=globalThis.fetch;
const lock=resolve(root,'runner.lock');mkdirSync(lock); // One runner owns the persistent budget at a time.
try{
const budgetPath=resolve(root,'budget.json');
let budget:{limit:number;requests:number};
try{budget=JSON.parse(readFileSync(budgetPath,'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;budget={limit:2000,requests:0};}
if(!Number.isInteger(budget.requests)||budget.requests<0||!Number.isInteger(budget.limit)||budget.limit<1||budget.limit>2000)throw Error('Invalid request budget');
const cacheDir=resolve(root,'responses');mkdirSync(cacheDir,{recursive:true,mode:0o700});let cachedRequests=0;
const requestUsage:Record<string,number>={};let requestMs=0,successfulRequests=0;
globalThis.fetch=async(input,init)=>{
  if(String(input)!=='https://api.typesafe.ai/v1/systemone')throw Error('Unexpected evaluator endpoint');
  const cachePath=resolve(cacheDir,hash(String(init?.body))+'.json');
  try{const body=readFileSync(cachePath,'utf8');cachedRequests++;return new Response(body,{headers:{'Content-Type':'application/json'}});}catch(e:any){if(e.code!=='ENOENT')throw e;}
  if(budget.requests>=budget.limit)throw Error('Evaluation request budget exhausted');
  budget.requests++;writeFileSync(budgetPath,JSON.stringify(budget,null,2)+'\n',{mode:0o600});
  const started=performance.now(),result=await originalFetch(input,init);
  if(result.ok){const body=await result.clone().text();writeFileSync(cachePath,body,{mode:0o600});successfulRequests++;requestMs+=performance.now()-started;for(const[k,v]of Object.entries(JSON.parse(body).usage||{}))if(typeof v==='number')requestUsage[k]=(requestUsage[k]||0)+v;}
  return result;
};
const judges={memory:createJevJudge(process.env.JEV_API_KEY,model),recall:createRecallJudge(process.env.JEV_API_KEY,model),connection:createConnectionJudge(process.env.JEV_API_KEY,model)};
const rows:EvalObservation[]=[],details:unknown[]=[];const usage:Record<string,number>={};let elapsed=0;
const startRequests=budget.requests;
  for(const item of cases){
    const start=performance.now();
    try{
      const decision=item.role==='memory'?await judges.memory(item.input,item.current,item.related||[]):item.role==='recall'?await judges.recall(item.query,item.note,item.peers||[]):await judges.connection(item.source,item.target);
      const actual='outcome'in decision?decision.outcome:'route'in decision?decision.route:decision.useful;
      const ms=Math.round(performance.now()-start);elapsed+=ms;
      rows.push({item,actual,...('worthRemembering'in decision?{worth:decision.worthRemembering,category:decision.category}:{})});
      for(const[k,v]of Object.entries(decision.usage))usage[k]=(usage[k]||0)+v;
      const detail={case:item.name,role:item.role,expected:item.expected,actual,ms,decision};details.push(detail);
      console.log(JSON.stringify({case:item.name,role:item.role,expected:item.expected,actual,...('category'in decision?{category:decision.category}:{}),...('probabilities'in decision?{probabilities:decision.probabilities}:{}),ms}));
    }catch(e){rows.push({item,error:true});details.push({case:item.name,error:e instanceof Error?e.message:'Evaluation failed'});console.log(JSON.stringify({case:item.name,error:'Evaluation failed'}));}
    if(budget.requests>=budget.limit)break;
  }
  const metrics=evaluationMetrics(rows);
  const legacy=Array.isArray(parsed);
  const passed=legacy?rows.length===cases.length&&rows.every(r=>!r.error&&r.actual===r.item.expected):rows.length===cases.length&&metrics.passed;
  const report={at:new Date().toISOString(),split,model,questionVersion,adapterHash:hash(readFileSync('server/jev.ts','utf8')),datasetHash:hash(raw),metrics:{...metrics,passed},requests:budget.requests-startRequests,cachedRequests,totalRequests:budget.requests,budget:budget.limit,requestUsage,meanLiveRequestMs:successfulRequests?Math.round(requestMs/successfulRequests):null,usage,meanSuccessfulMs:Math.round(elapsed/Math.max(1,rows.filter(r=>!r.error).length)),details};
  const output=resolve(root,`${split}-${Date.now()}.json`);writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({...report,details:undefined,output}));if(!passed)process.exitCode=1;
}finally{globalThis.fetch=originalFetch;rmSync(lock,{recursive:true});}
