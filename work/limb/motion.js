/* Native atlas pose adapters. Tissue transport is illustrative, not physiology. */
function NativeLimbMotion(model,region,reference){
 const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const part=name=>model.parts.find(p=>p.name===name),mean=ps=>ps.reduce((a,p)=>a.map((v,i)=>v+p[i]/ps.length),[0,0,0]);
 const band=(p,end)=>{const ys=p.v.map(v=>v[1]).sort((a,b)=>a-b),limit=ys[Math.floor(ys.length*(end?.97:.03))];return mean(p.v.filter(v=>end?v[1]>=limit:v[1]<=limit));};
 const rotation=(p,pivot,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),y=p[1]-pivot[1],z=p[2]-pivot[2];return[p[0],pivot[1]+y*c+z*s,pivot[2]-y*s+z*c];};
 if(region==='forearm'){
  const A=band(part('radius'),false),B=band(part('ulna'),true),distalRadius=band(part('radius'),true),axis=sub(B,A),length=Math.hypot(...axis),u=axis.map(v=>v/length),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
  function turn(p,degrees){const q=sub(p,A),a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),v=cross(u,q),d=dot(u,q);return q.map((x,i)=>A[i]+x*c+v[i]*s+u[i]*d*(1-c));}
  const spans=new Map(model.parts.map(p=>{const ts=p.v.map(v=>dot(sub(v,A),u));return[p.name,[Math.min(...ts),Math.max(...ts)]];}));
  function bone(p,name,angle,inverse=false){if(['ulna','humerus'].includes(name))return p.slice();return turn(p,(angle+80)*(inverse?-1:1));}
  function deform(p,part,angle){
   if(part.kind==='bone')return bone(p,part.name,angle);
   if(angle===-80)return p.slice();const name=part.name.replace(/-tendon-material$/,''),t=dot(sub(p,A),u),[lo,hi]=spans.get(name),wrist=dot(sub(B,A),u);
   if(part.kind==='context')return name.startsWith('biceps')?turn(p,(angle+80)*smooth((t+10)/35)):p.slice();
   let w=smooth((t-Math.max(lo,0))/(Math.min(hi,wrist)-Math.max(lo,0)||1));
   if(name==='brachioradialis')w=smooth((t-lo)/(hi-lo));
   if(name.startsWith('pronator-teres')||name==='supinator')w=smooth((t-lo)/(hi-lo));
   if(name==='pronator-quadratus'){
    // The transverse sheet bridges the fixed ulna and moving radius. A
    // longitudinal twist would throw its middle out beside the wrist.
    const dx=B[0]-distalRadius[0],r=clamp((B[0]-p[0])/(dx||1));return mix(p,turn(p,angle+80),smooth(r));
   }
   if(name.startsWith('flexor-carpi-ulnaris')||name.startsWith('extensor-carpi-ulnaris'))w*=.28;
   if(t>wrist-12)w+= (1-w)*smooth((t-wrist+12)/18);
   return turn(p,(angle+80)*w);
  }
  return{deform,bone,axis:[A,B],metrics:()=>({crossSectionRatio:1,scope:'Longitudinal torsion, not measured contractile strain.'})};
 }
 const fem=part('femur'),distal=fem.v.filter(v=>v[1]>model.pose.kneeY-25),bounds=[0,2].map(i=>[Math.min(...distal.map(v=>v[i])),Math.max(...distal.map(v=>v[i]))]),J=[(bounds[0][0]+bounds[0][1])/2,model.pose.kneeY,(bounds[1][0]+bounds[1][1])/2],pc=mean(part('patella').v);
 function bone(p,name,angle,inverse=false){const a=inverse?-angle:angle;if(['tibia','fibula'].includes(name))return rotation(p,J,a);if(name==='patella')return rotation(p,J,a*.7);return p.slice();}
 const names={'rectus-femoris':'rect_fem_r','vastus-lateralis':'vas_lat_r','vastus-medialis':'vas_med_r','vastus-intermedius':'vas_int_r','biceps-femoris-long':'bifemlh_r','biceps-femoris-short':'bifemsh_r','semitendinosus':'semiten_r','semimembranosus':'semimem_r','sartorius':'sar_r'},families={};
 for(const p of model.parts.filter(p=>p.kind==='muscle')){
  const ys=p.v.map(v=>v[1]),lo=Math.min(...ys),hi=Math.max(...ys),centers=[];
  for(let i=0;i<=60;i++){const y=lo+(hi-lo)*i/60,ps=p.v.filter(v=>Math.abs(v[1]-y)<12);centers.push(ps.length?mean(ps):i?centers.at(-1).slice():mean(p.v));centers.at(-1)[1]=y;}
  const copy=centers.map(p=>p.slice());for(let i=0;i<centers.length;i++)for(const k of [0,2]){let n=0,v=0;for(let j=Math.max(0,i-3);j<=Math.min(60,i+3);j++){v+=copy[j][k];n++;}centers[i][k]=v/n;}
  const center=y=>{const t=clamp((y-lo)/(hi-lo))*60,i=Math.floor(t),j=Math.min(60,i+1);return mix(centers[i],centers[j],t-i);};families[p.name]={lo,hi,center,bodyEnd:p.materialGuide?.thresholdY||hi-20,quad:p.name.startsWith('vastus')||p.name==='rectus-femoris',fixed:p.name==='adductor-longus'};
 }
 function ratio(name,angle){const ls=reference?.lengths[names[name]];if(!ls)return 1;const a=Math.max(0,Math.min(120,angle)),i=Math.floor(a),j=Math.min(120,i+1);return(ls[i]+(ls[j]-ls[i])*(a-i))/ls[0];}
 function bellyStretch(name,angle){const f=families[name],ref=ratio(name,angle);if(!f.quad)return ref;const patella=bone(pc,'patella',angle);return Math.min(ref,1+(patella[1]-pc[1])/(f.bodyEnd-f.lo));}
 function deform(p,part,angle){
  if(part.kind==='bone')return bone(p,part.name,angle);if(angle===0)return p.slice();const name=part.name.replace(/-tendon-material$/,''),f=families[name];if(!f||f.fixed)return p.slice();
  const patella=bone(pc,'patella',angle),stretch=bellyStretch(name,angle);
  const body=q=>{const center=f.center(q[1]),w=smooth((q[1]-f.lo)/20),radial=1+w*(1/Math.sqrt(stretch)-1);return[center[0]+(q[0]-center[0])*radial,f.lo+(q[1]-f.lo)*(1+w*(stretch-1)),center[2]+(q[2]-center[2])*radial];};
  if(p[1]<=f.bodyEnd)return body(p);
  // Keep the colored belly proximal to the native tendon transition; route
  // only the distal source surface to its moving insertion.
  const t=clamp((p[1]-f.bodyEnd)/(f.hi-f.bodyEnd)),center=f.center(p[1]),dx=p[0]-center[0],dz=p[2]-center[2];
  function tendonAt(a,start){const pat=bone(pc,'patella',a),end=bone(f.center(f.hi),'tibia',a);let q;
   if(f.quad){const guide=pat.map((v,i)=>v+(f.center(J[1])[i]-pc[i])),mid=.48;q=t<mid?mix(start,guide,smooth(t/mid)):mix(guide,end,smooth((t-mid)/(1-mid)));}
   else{const c1=start.map((v,i)=>v+(i===1?Math.min(40,Math.hypot(...sub(end,start))*.25):0)),c2=mix(start,end,.75),u=1-t;q=start.map((v,i)=>u**3*v+3*u*u*t*c1[i]+3*u*t*t*c2[i]+t**3*end[i]);}
   const tangent=f.quad?sub(t<.48?pat:end,t<.48?start:pat):sub(end,start),theta=Math.atan2(tangent[2],tangent[1]);return[q[0]+dx,q[1]-dz*Math.sin(theta),q[2]+dz*Math.cos(theta)];
  }
  // Apply only the change from the neutral guide to the original source
  // surface. Replacing that source by the guide causes a jump at 0 -> 1°.
  const current=tendonAt(angle,body(f.center(f.bodyEnd))),neutral=tendonAt(0,f.center(f.bodyEnd)),q=p.map((v,i)=>v+current[i]-neutral[i]);return mix(q,bone(p,'tibia',angle),smooth((p[1]-f.hi+15)/15));
 }
 return{deform,bone,joint:J,metrics(angle){return Object.fromEntries(Object.keys(families).map(n=>{const s=bellyStretch(n,angle);return[n,{referencePathRatio:ratio(n,angle),bellyLengthRatio:s,radialRatio:1/Math.sqrt(s),crossSectionRatio:1/s}];}));}};
}
