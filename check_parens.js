const fs = require('fs');
const path = 'c:/Users/Usuário/Desktop/SESMT/web-platform/src/app/afastamentos/page.tsx';
const s = fs.readFileSync(path,'utf8');
let par=0, cur=0;
const lines = s.split(/\r?\n/);
let inSingle=false, inDouble=false, inBack=false, prev='';
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++){
    const ch = line[j];
    if(prev==='\\' && (inSingle||inDouble||inBack)) { prev=''; continue; }
    if(!inSingle && !inDouble && !inBack && ch==='/' ){ const next=line[j+1]||''; if(next==='/' ){ break; } if(next==='*'){ let k=i; let l=j+2; let found=false; for(;k<lines.length;k++){ for(;l<lines[k].length;l++){ if(lines[k][l]=='*' && lines[k][l+1]=='/'){ i=k; j=l+1; found=true; break; } } l=0; if(found) break; } continue; } }
    if(!inSingle && !inDouble && !inBack && ch==="'") { inSingle=true; prev=''; continue; }
    if(inSingle && ch==="'" && prev!=="\\") { inSingle=false; prev=''; continue; }
    if(!inSingle && !inDouble && !inBack && ch==='"') { inDouble=true; prev=''; continue; }
    if(inDouble && ch==='"' && prev!=="\\") { inDouble=false; prev=''; continue; }
    if(!inSingle && !inDouble && !inBack && ch==='`') { inBack=true; prev=''; continue; }
    if(inBack && ch==='`' && prev!=="\\") { inBack=false; prev=''; continue; }
    if(inSingle||inDouble||inBack) { prev=ch; continue; }
    if(ch==='(') par++;
    if(ch===')') par--;
    if(ch==='{') cur++;
    if(ch==='}') cur--;
    if(par<0||cur<0) {
      console.log('Mismatch at',i+1,j+1,'par',par,'cur',cur,'context',line.slice(Math.max(0,j-20),j+20));
      process.exit(0);
    }
  }
}
console.log('Final counts par',par,'cur',cur);
if(par>0){
  console.log('Unmatched ( positions (last 5):');
  const stack=[];
  inSingle=false; inDouble=false; inBack=false; prev='';
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    for(let j=0;j<line.length;j++){
      const ch=line[j];
      if(prev==='\\' && (inSingle||inDouble||inBack)){prev=''; continue;}
      if(!inSingle && !inDouble && !inBack && ch==='/'){const next=line[j+1]||''; if(next==='/' ){break;} if(next==='*'){ let k=i; let l=j+2; let found=false; for(;k<lines.length;k++){ for(;l<lines[k].length;l++){ if(lines[k][l]=='*' && lines[k][l+1]=='/'){ i=k; j=l+1; found=true; break;} } l=0; if(found) break;} continue; }}
      if(!inSingle && !inDouble && !inBack && ch==="'"){ inSingle=true; prev=''; continue;} if(inSingle && ch==="'" && prev!=="\\"){ inSingle=false; prev=''; continue;} if(!inSingle && !inDouble && !inBack && ch==='"'){ inDouble=true; prev=''; continue;} if(inDouble && ch==='"' && prev!=="\\"){ inDouble=false; prev=''; continue;} if(!inSingle && !inDouble && !inBack && ch==='`'){ inBack=true; prev=''; continue;} if(inBack && ch==='`' && prev!=="\\"){ inBack=false; prev=''; continue;} if(inSingle||inDouble||inBack){ prev=ch; continue;} if(ch==='(') stack.push({line:i+1,char:j+1,context:line.trim().slice(0,120)}); if(ch===')') stack.pop(); }
  }
  console.log(stack.slice(-5).map(s=>`line ${s.line} char ${s.char} -> ${s.context}`).join('\n'));
}
console.log('\n--- Parens per line summary (last 40 lines) ---');
let running=0; inSingle=false; inDouble=false; inBack=false; prev='';
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  for(let j=0;j<line.length;j++){
    const ch=line[j];
    if(prev==='\\' && (inSingle||inDouble||inBack)){prev=''; continue;}
    if(!inSingle && !inDouble && !inBack && ch==='/'){const next=line[j+1]||''; if(next==='/' ){break;} if(next==='*'){ let k=i; let l=j+2; let found=false; for(;k<lines.length;k++){ for(;l<lines[k].length;l++){ if(lines[k][l]=='*' && lines[k][l+1]=='/'){ i=k; j=l+1; found=true; break;} } l=0; if(found) break;} continue; }}
    if(!inSingle && !inDouble && !inBack && ch==="'"){ inSingle=true; prev=''; continue;} if(inSingle && ch==="'" && prev!=="\\"){ inSingle=false; prev=''; continue;} if(!inSingle && !inDouble && !inBack && ch==='"'){ inDouble=true; prev=''; continue;} if(inDouble && ch==='"' && prev!=="\\"){ inDouble=false; prev=''; continue;} if(!inSingle && !inDouble && !inBack && ch==='`'){ inBack=true; prev=''; continue;} if(inBack && ch==='`' && prev!=="\\"){ inBack=false; prev=''; continue;} if(inSingle||inDouble||inBack){ prev=ch; continue;} if(ch==='(') running++; if(ch===')') running--; }
  if(i+1>lines.length-40) console.log((i+1).toString().padStart(4,' '), running, lines[i].trim());
}
