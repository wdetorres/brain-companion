import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { z } from 'zod';

const root=fileURLToPath(new URL('../',import.meta.url));
const {buildFilter}=z.object({buildFilter:z.object({paths:z.array(z.string()).min(1),ignoredPaths:z.array(z.string())})})
  .parse(JSON.parse(await readFile(new URL('../deploy/render-build-filter.json',import.meta.url),'utf8')));
const triggers=(path:string)=>buildFilter.paths.some(pattern=>matchesGlob(path,pattern))&&!buildFilter.ignoredPaths.some(pattern=>matchesGlob(path,pattern));

test('Render filters cover every bundled backend import and explicit runtime/build input',async()=>{
  const result=await build({absWorkingDir:root,entryPoints:['server/main.ts'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',metafile:true,logLevel:'silent'});
  const dependencies=[...Object.keys(result.metafile.inputs),'docs/agent-guide.md','Dockerfile','.dockerignore','package.json','package-lock.json','tsconfig.json','scripts/build.mjs','scripts/build-graph-preview.mjs'];
  assert.deepEqual(dependencies.filter(path=>!triggers(path)),[],'New backend imports or runtime files must be added to the Render filter before deployment');
});

test('UI, test and ordinary documentation edits do not restart the backend',()=>{
  for(const path of ['src/App.tsx','src/Auth.tsx','src/styles.css','public/index.html','api/bridge.ts','vercel.json','tests/note-loading.test.ts','tests/render.test.ts','docs/hosting-runbook.md','README.md'])
    assert.equal(triggers(path),false,path);
  for(const path of ['server/new-runtime.ts','src/shared.ts','src/links.ts','docs/agent-guide.md','Dockerfile','package-lock.json'])
    assert.equal(triggers(path),true,path);
});
