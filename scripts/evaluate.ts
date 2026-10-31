import { readFile } from 'node:fs/promises';
import { createJevJudge } from '../server/jev.ts';
import type { Note, RememberInput, Decision } from '../src/shared.ts';

type Case = { name: string; input: RememberInput; current?: Note; related?: Note[]; expected: Decision['outcome'] };
const path = process.argv[2];
if (!path || !process.env.JEV_API_KEY) throw Error('Usage: JEV_API_KEY=... npm run evaluate -- path/to/labeled-cases.json');
const cases: Case[] = JSON.parse(await readFile(path, 'utf8'));
if (!Array.isArray(cases) || !cases.length || cases.length > 200) throw Error('Provide 1–200 labeled cases');
const judge = createJevJudge(process.env.JEV_API_KEY, process.env.JEV_MODEL || 'jev-latest');
let correct = 0, unsafeAccepts = 0, failures = 0, elapsed = 0;
const usage: Record<string, number> = {};
for (const item of cases) {
  const start = performance.now();
  try {
    const decision = await judge(item.input, item.current, item.related || []);
    const ms = Math.round(performance.now() - start); elapsed += ms;
    if (decision.outcome === item.expected) correct++;
    if (['new', 'update'].includes(decision.outcome) && decision.outcome !== item.expected) unsafeAccepts++;
    for (const [key, value] of Object.entries(decision.usage)) usage[key] = (usage[key] || 0) + value;
    console.log(JSON.stringify({ case: item.name, expected: item.expected, actual: decision.outcome, model: decision.model, ms, usage: decision.usage }));
  } catch { failures++; console.log(JSON.stringify({ case: item.name, error: 'Evaluation failed' })); }
}
console.log(JSON.stringify({ cases: cases.length, correct, unsafeAccepts, failures, meanSuccessfulMs: Math.round(elapsed / Math.max(1, cases.length - failures)), usage }));
if (unsafeAccepts || failures) process.exitCode = 1;
