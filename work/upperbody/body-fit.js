/* Small torso proportion changes with attachment-aware muscle corrections. */
function NativeUpperbodyBodyFit(data,fit,transforms){
 const defaults={width:1,depth:1,length:1};let shape={...defaults},revision=0,decoded,contactCorners,scapulaGrid,targetRevision=-1,targets;
 const axes=Object.keys(defaults);
 const baseBytes=Uint8Array.from(atob(data.frames[0].displacement),c=>c.charCodeAt(0)),baseFrame=new Int16Array(baseBytes.buffer);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const volume=(q,f)=>f.reduce((sum,[a,b,c])=>{const n=cross(q[b],q[c]);return sum+q[a].reduce((s,x,k)=>s+x*n[k],0)/6;},0);
 const free=new Map(data.parts.filter(p=>p.kind==="muscle"&&!p.mirrorOf).map(p=>[p.name,new Set(p.v.map((_,i)=>i).filter(i=>!p.attachments.origin.includes(i)&&!p.attachments.insertion.includes(i)))]));
 function preserve(q,part,target){for(let iteration=0;iteration<20;iteration++){const error=target-volume(q,part.f);if(Math.abs(error/target)<.003)break;const gradient=q.map(()=>[0,0,0]);for(const [a,b,c]of part.f){for(const [i,j,k]of [[a,b,c],[b,c,a],[c,a,b]]){const n=cross(q[j],q[k]);for(let axis=0;axis<3;axis++)gradient[i][axis]+=n[axis]/6;}}let den=0;for(const i of free.get(part.name))for(const x of gradient[i])den+=x*x;if(den<1e-12)break;for(const i of free.get(part.name)){const d=gradient[i].map(x=>x*error/den),factor=Math.min(1,.35/Math.max(1e-12,Math.hypot(...d)));for(let k=0;k<3;k++)q[i][k]+=d[k]*factor;}}return q;}
 const resize=p=>p.map((x,k)=>fit.center[k]+(x-fit.center[k])*shape[['width','length','depth'][k]]);

 function guardScapula(q,tr){
  const guard=fit.latissimusScapulaGuard;if(!guard)return q;const field=guard.field;
  scapulaGrid??=new Int16Array(Uint8Array.from(atob(field.data),c=>c.charCodeAt(0)).buffer);
  function sample(p){const c=p.map((x,k)=>(x-field.origin[k])/field.step),i=c.map(Math.floor),t=c.map((x,k)=>x-i[k]);if(i.some((x,k)=>x<0||x+1>=field.shape[k]))return 6;let d=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)d+=scapulaGrid[((i[0]+a)*field.shape[1]+i[1]+b)*field.shape[2]+i[2]+c]/16*(a?t[0]:1-t[0])*(b?t[1]:1-t[1])*(c?t[2]:1-t[2]);return d;}
  const origin=tr([0,0,0]),basis=[[1,0,0],[0,1,0],[0,0,1]].map(p=>tr(p).map((x,k)=>x-origin[k])),scales=[shape.width,shape.length,shape.depth];
  for(let pass=0;pass<4;pass++)for(const i of guard.vertices){const local=basis.map(axis=>axis.reduce((sum,x,k)=>sum+x*(q[i][k]-origin[k]),0)),p=local.map((x,k)=>fit.center[k]+(x-fit.center[k])/scales[k]),d=sample(p);if(d>=.65)continue;const gradient=[0,1,2].map(k=>{const a=p.slice(),b=p.slice();a[k]+=.6;b[k]-=.6;return(sample(a)-sample(b))/1.2/scales[k];}),world=[0,1,2].map(k=>gradient.reduce((sum,x,j)=>sum+x*basis[j][k],0)),norm=Math.hypot(...world);if(norm<.1)continue;const step=Math.min(1.2,(.7-d)*Math.min(...scales));for(let k=0;k<3;k++)q[i][k]+=world[k]/norm*step;}
  return q;
 }

 function contactOffset(q,angle){
  if(!fit.latissimusContactCorrections)return q;
  contactCorners??=fit.latissimusContactCorrections.reduce((out,f)=>{const key=[f.shape.width,f.shape.depth,f.shape.length].join(','),entry=out[key]??={shape:f.shape,frames:[]};entry.frames.push({angle:f.angle,values:new Int16Array(Uint8Array.from(atob(f.displacement),c=>c.charCodeAt(0)).buffer)});entry.frames.sort((a,b)=>a.angle-b.angle);return out;},{});
  const amplitude=Math.max(...axes.map(k=>Math.abs(shape[k]-1)))/.05;
  for(const corner of Object.values(contactCorners)){const weight=amplitude*axes.reduce((w,k)=>{const t=(shape[k]-.95)/.1;return w*(corner.shape[k]<1?1-t:t);},1);if(weight<1e-8)continue;const i=Math.min(corner.frames.length-2,Math.max(0,corner.frames.findIndex((f,j)=>j<corner.frames.length-1&&f.angle<=angle&&corner.frames[j+1].angle>=angle))),a=corner.frames[i],b=corner.frames[i+1],t=(angle-a.angle)/(b.angle-a.angle);for(let j=0;j<q.length;j++)for(let k=0;k<3;k++)q[j][k]+=weight*((1-t)*a.values[j*3+k]+t*b.values[j*3+k])/50;}
  return q;
 }
 function set(next){const updated={};for(const key of Object.keys(defaults)){const value=Number(next?.[key]??1);updated[key]=Number.isFinite(value)?Math.max(fit.range[0],Math.min(fit.range[1],value)):1;}if(Object.keys(defaults).some(k=>updated[k]!==shape[k])){shape=updated;revision++;}}
 function rigid(angle){const rig={...data.rig};for(const key of ['sc','ac','gh'])rig[key]=resize(data.rig[key]);return transforms(angle,rig);}
 function apply(angle,left){
  if(Object.values(shape).every(x=>x===1))return;
  decoded??=Object.fromEntries(Object.entries(fit.channels).map(([key,frames])=>[key,frames.map(f=>{const bytes=Uint8Array.from(atob(f.displacement),c=>c.charCodeAt(0));return new Int16Array(bytes.buffer);})]));
  if(targetRevision!==revision){targets=new Map();for(const p of data.parts){if(p.kind!=="muscle"||p.mirrorOf)continue;const offset=fit.offsets[p.name],q=p.v.map((v,i)=>v.map((x,k)=>x+baseFrame[p.frameOffset+i*3+k]/50+axes.reduce((sum,key)=>sum+(shape[key]-1)*decoded[key][0][offset+i*3+k]/50,0)));targets.set(p.name,volume(q,p.f));}targetRevision=revision;}
  const index=Math.max(0,Math.min(20,Math.floor((angle-15)/5))),t=(angle-(15+index*5))/5,newRigid=rigid(angle);
  for(const part of data.parts){
   if(part.mirrorOf)continue;const posed=left.get(part.name);
   if(part.kind!=='muscle'){
    const tr=newRigid[part.name]||newRigid.fixed;
    posed.v=part.v.map(p=>tr(resize(p)));continue;
   }
   const offset=fit.offsets[part.name],delta=part.v.map((p,i)=>[0,1,2].map(k=>axes.reduce((sum,key)=>sum+(shape[key]-1)*((1-t)*decoded[key][index][offset+i*3+k]+t*decoded[key][index+1][offset+i*3+k])/50,0)));
   const original=posed.v;posed.v=preserve(posed.v.map((p,i)=>p.map((x,k)=>x+delta[i][k])),part,targets.get(part.name));if(part.name==="latissimus")posed.v=contactOffset(guardScapula(posed.v,newRigid.scapula),angle);
   for(let i=0;i<delta.length;i++)for(let k=0;k<3;k++)delta[i][k]=posed.v[i][k]-original[i][k];
   if(part.surfaceGuides)posed.fibers=part.surfaceGuides.map(guide=>guide.points.map(([face,...weights])=>[0,1,2].map(k=>weights.reduce((sum,weight,j)=>sum+weight*posed.v[part.f[face][j]][k],0))));
   else{let i=0;posed.fibers=posed.fibers.map(fiber=>fiber.map(p=>{const binding=fit.fiberBindings[part.name][i++];return p.map((x,k)=>x+binding.reduce((sum,[vertex,weight])=>sum+delta[vertex][k]*weight,0));}));}
  }
 }
 return{set,apply,resize,rigid,get shape(){return {...shape};},get revision(){return revision;}};
}
