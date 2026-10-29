import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules','.wrangler','.npm-cache','public'].includes(entry.name))continue;const p=resolve(dir,entry.name);if(entry.isDirectory())out.push(...await walk(p));else if(p.endsWith('.js'))out.push(p);}return out;}
let failed=false;const files=await walk(root);
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){failed=true;console.error(r.stderr);}}
const html=await readFile(resolve(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length){failed=true;console.error('Duplicate HTML IDs');}
for(const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)){try{await readFile(resolve(root,match[1]));}catch{failed=true;console.error(`Missing asset: ${match[1]}`);}}
console.log(`Checked ${files.length} JavaScript files, HTML IDs and local entry assets.`);process.exitCode=failed?1:0;
