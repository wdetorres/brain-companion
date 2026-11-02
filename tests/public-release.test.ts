import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('vendored assets match their recorded sources and browser dependencies retain full notices',async()=>{
 const icons=JSON.parse(await readFile('public/agents/sources.json','utf8'));
 const font=JSON.parse(await readFile('public/fonts/sources.json','utf8'));
 for(const {path,sha256} of [...icons.icons.map((icon:{name:string;sha256:string})=>({path:`public/agents/${icon.name}.svg`,sha256:icon.sha256})),{path:'public/fonts/atkinson-hyperlegible-next-700.ttf',sha256:font.sha256}])
  assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),sha256,path);
 const notices=await readFile('public/THIRD_PARTY_NOTICES.txt','utf8');
 for(const name of ['react','react-dom','scheduler','marked','lucide-react']){
  const root=`node_modules/${name}`,pkg=JSON.parse(await readFile(root+'/package.json','utf8'));
  const license=(await readdir(root)).find(file=>/^license(?:\.md|\.txt)?$/i.test(file))!;
  assert.ok(notices.includes(`${name} ${pkg.version}`),'Update notices when changing '+name);
  assert.ok(notices.includes(await readFile(root+'/'+license,'utf8')),'Retain the complete license for '+name);
 }
});
