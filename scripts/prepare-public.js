import { mkdir,copyFile,cp } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'public');
await mkdir(out,{recursive:true});await copyFile(resolve(root,'index.html'),resolve(out,'index.html'));await cp(resolve(root,'assets'),resolve(out,'assets'),{recursive:true});
console.log('Prepared public/index.html and public/assets (source, tests and docs excluded).');
