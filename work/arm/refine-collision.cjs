const fs=require('fs'),vm=require('vm'),w=__dirname+'/';
const atlas=JSON.parse(fs.readFileSync(w+'atlas-data.json')),fields=fs.readFileSync(w+'bone-fields.json','utf8');
const context={atob,console,document:{getElementById(){return{textContent:fields}}}};vm.createContext(context);vm.runInContext(fs.readFileSync(w+'collision.js','utf8'),context);
const joint=atlas.joint;const F=(p,a)=>{let t=a*Math.PI/180,c=Math.cos(t),s=Math.sin(t),y=p[1]-joint[1],z=p[2]-joint[2];return[p[0],joint[1]+y*c-z*s,joint[2]+y*s+z*c];};
const collision=context.ArmBoneCollision(atlas,F),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const skin=(p,m,a)=>{let q=p;if(m.name.startsWith("triceps"))q=F(p,a*smooth((p[1]-205)/77));else if(m.attachment){const anchor=m.attachment,moving=F(anchor,a),top=m.name.startsWith('triceps')?115:100,weight=smooth((p[1]-top)/(anchor[1]-top));q=p.map((v,i)=>v+(moving[i]-anchor[i])*weight)}return collision.constrain(q,m,a)};
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2),centroid=ps=>[0,1,2].map(j=>ps.reduce((sum,p)=>sum+p[j]/ps.length,0));
for(let iteration=0;iteration<3;iteration++){
 const flags=new Map(atlas.parts.filter(p=>p.kind!=='bone').map(p=>[p,new Set()]));let worstVertex=30,worstFace=30;
 for(let angle=0;angle<=135;angle+=5)for(const p of flags.keys()){
  const vs=p.v.map(v=>skin(v,p,angle)),edges=flags.get(p);for(const v of vs)worstVertex=Math.min(worstVertex,collision.minimum(v,angle));
  for(const f of p.f){const ps=f.map(i=>vs[i]);let bad=false;
   for(let i=0;i<3;i++){const d=collision.minimum(mid(ps[i],ps[(i+1)%3]),angle);worstFace=Math.min(worstFace,d);if(d<.8){edges.add([f[i],f[(i+1)%3]].sort((a,b)=>a-b).join(','));bad=true;}}
   const d=collision.minimum(centroid(ps),angle);worstFace=Math.min(worstFace,d);if(d<.8&&!bad)for(let i=0;i<3;i++)edges.add([f[i],f[(i+1)%3]].sort((a,b)=>a-b).join(','));
  }
 }
 console.log('Iteration',iteration,'vertices',worstVertex.toFixed(3),'triangles',worstFace.toFixed(3),'edges',[...flags.values()].reduce((s,v)=>s+v.size,0));
 if(worstVertex<0)throw new Error('Vertex constraints unresolved');
 if([...flags.values()].every(s=>s.size===0))break;
 for(const [p,edges]of flags){if(!edges.size)continue;const mids=new Map();for(const key of edges){const [a,b]=key.split(',').map(Number);mids.set(key,p.v.length);p.v.push(mid(p.v[a],p.v[b]));}
  const faces=[];for(const f of p.f){const polygon=[];let changed=false;for(let i=0;i<3;i++){polygon.push(f[i]);const k=[f[i],f[(i+1)%3]].sort((a,b)=>a-b).join(',');if(mids.has(k)){polygon.push(mids.get(k));changed=true;}}
   if(!changed){faces.push(f);continue;}const center=p.v.length;p.v.push(centroid(f.map(i=>p.v[i])));for(let i=0;i<polygon.length;i++)faces.push([center,polygon[i],polygon[(i+1)%polygon.length]]);
  }p.f=faces;
 }
}
fs.writeFileSync(w+'atlas-data.json',JSON.stringify(atlas));
console.log('Refined faces',atlas.parts.filter(p=>p.kind!=='bone').reduce((sum,p)=>sum+p.f.length,0));
