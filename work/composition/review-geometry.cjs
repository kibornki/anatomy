const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={console,Map,Set,WeakMap,Math,Number};vm.createContext(context);
vm.runInContext(fs.readFileSync('work/composition/composition.js','utf8'),context);
const all=[['upperbody',JSON.parse(fs.readFileSync('work/upperbody/atlas-data.json')).parts],['abdomen',JSON.parse(fs.readFileSync('work/abdomen/atlas-data.json')).parts],['arm',JSON.parse(fs.readFileSync('work/arm/atlas-data.json')).parts]];
const limbs=JSON.parse(fs.readFileSync('work/limb-atlas-preview/atlas-data.json')).models;
all.push(['forearm',limbs.forearm.parts],['thigh',limbs.thigh.parts]);
for(const [region,parts]of all){
 const c=context.AnatomyComposition({},parts,region);
 for(const p of parts)for(let i=0;i<p.v.length;i++)assert.equal(c.point(p,p.v[i],i),p.v[i],region+' default');
 c.restore({muscle:160,fat:100,fatTransparent:true});let changed=0;
 for(const p of parts)for(let i=0;i<p.v.length;i++){const q=c.point(p,p.v[i],i),d=Math.hypot(...q.map((n,k)=>n-p.v[i][k]));assert(q.every(Number.isFinite));
 if(p.kind!=='muscle')assert.equal(d,0,region+' rigid bone');
 else if(d>.001)changed++;
 if(p.attachments&&(p.attachments.origin.includes(i)||p.attachments.insertion.includes(i)))assert.equal(d,0,region+' attachment');}
 assert(changed>0,region+' muscle growth');
 const fat=c.fatMeshes(parts.map(p=>p.v));assert.equal(fat.length,region==='forearm'?0:region==='arm'?1:region==='thigh'?2:4);
 for(const m of fat)for(const q of m.v)assert(q.every(Number.isFinite));
 c.restore({muscle:60,fat:0});assert.equal(c.fatMeshes(parts.map(p=>p.v)).length,0);
 c.restore({muscle:NaN,fat:Infinity,fatTransparent:'true'});assert.equal(c.state.muscle,100);assert.equal(c.state.fat,0);assert.equal(c.state.fatTransparent,false);
 console.log(region+': default, growth, bones, attachments, fat and sanitization passed');
}
