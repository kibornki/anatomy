/* One motion kernel for drawing, fibers and regression checks.
 * Atlas origins stay on the upper arm. Only the distal extensor route wraps
 * around the olecranon; normalized arclength transports the original shell.
 * Radial scale = 1/sqrt(longitudinal stretch): a volume-preserving guide,
 * not a force/activation or measured fascicle simulation. */
function ArmMotion(atlas,reference=null){
 const J=atlas.joint,clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
 const forearm=(p,angle)=>{const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),y=p[1]-J[1],z=p[2]-J[2];return[p[0],J[1]+y*c-z*s,J[2]+y*s+z*c];};
 const families={triceps:{top:145,end:282,turn:225,anchor:[J[0],282,-22]},biceps:{top:100,end:301.3555,turn:195,anchor:[-45.4946,301.3555,7.1049]},brachialis:{top:160,end:308.0773,turn:210,anchor:[-38.9179,308.0773,.1046]}};
 for(const [name,f]of Object.entries(families)){
  const vs=atlas.parts.filter(p=>name==='brachialis'?p.name===name:p.name.startsWith(name)&&p.kind==='muscle').flatMap(p=>p.v);f.centers=[];
  for(let y=Math.floor(f.top)-5;y<=Math.ceil(f.end)+5;y++){
   const band=vs.filter(p=>Math.abs(p[1]-y)<8),z=band.length?band.reduce((s,p)=>s+p[2]/band.length,0):f.anchor[2];f.centers.push([J[0],y,z]);
  }
  const original=f.centers.map(p=>p[2]);for(let i=0;i<f.centers.length;i++){let z=0,w=0;for(let j=Math.max(0,i-14);j<=Math.min(original.length-1,i+14);j++){const k=Math.exp(-(((j-i)/7)**2)/2);z+=original[j]*k;w+=k;}f.centers[i][2]=z/w;}
  f.center=y=>{const t0=Math.max(0,Math.min(f.centers.length-1,y-Math.floor(f.top)+5)),i=Math.floor(t0),j=Math.min(i+1,f.centers.length-1),p=[J[0],y,f.centers[i][2]+(f.centers[j][2]-f.centers[i][2])*(t0-i)];const t=smooth((y-(f.end-25))/25);p[2]=p[2]*(1-t)+f.anchor[2]*t;return p;};
 }
 function route(f,angle,name){
  const pts=[];for(let y=f.top;y<f.turn;y+=3)pts.push(f.center(y));const A=f.center(f.turn),B=forearm(f.anchor,angle);pts.push(A);
  if(name==='triceps'){
   const r=17,dy=A[1]-J[1],dz=A[2]-J[2],phi=Math.atan2(dy,dz)+(dy<0?2*Math.PI:0),contact=phi-Math.acos(Math.min(1,r/Math.hypot(dy,dz))),end=Math.PI-angle*Math.PI/180;
   if(end<contact){const T=[J[0],J[1]+r*Math.sin(contact),J[2]+r*Math.cos(contact)];for(let i=1;i<=12;i++)pts.push(A.map((v,j)=>v+(T[j]-v)*i/12));for(let i=1;i<=20;i++){const a=contact+(end-contact)*i/20;pts.push([J[0],J[1]+r*Math.sin(a),J[2]+r*Math.cos(a)]);}}
   else for(let i=1;i<=20;i++)pts.push(A.map((v,j)=>v+(B[j]-v)*i/20));
  }else for(let i=1;i<=25;i++)pts.push(A.map((v,j)=>v+(B[j]-v)*i/25));
  const lengths=[0];for(let i=1;i<pts.length;i++)lengths.push(lengths.at(-1)+Math.hypot(...pts[i].map((v,j)=>v-pts[i-1][j])));
  const total=lengths.at(-1),position=d=>{d=Math.max(0,Math.min(total,d));let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const a=pts[i-1],b=pts[i],u=(d-lengths[i-1])/(lengths[i]-lengths[i-1]||1);return a.map((v,j)=>v+(b[j]-v)*u);};
  const sample=t=>{const d=clamp(t)*total,p=position(d),a=position(d-7),b=position(d+7);return {p,theta:Math.atan2(b[2]-a[2],b[1]-a[1])};};return {total,sample};
 }
 function referenceRatio(name,angle){if(!reference)return null;const keys=name==='triceps'?['triceps-long','triceps-lateral','triceps-medial']:name==='biceps'?['biceps-long','biceps-short']:['brachialis'];const a=Math.max(0,Math.min(135,angle)),lo=Math.floor(a),hi=Math.min(135,lo+1);return keys.reduce((sum,k)=>{const ls=reference.lengths[k];return sum+(ls[lo]+(ls[hi]-ls[lo])*(a-lo))/ls[0];},0)/keys.length;}
 function transport(name,t,angle){const geo=frames[name].total/neutral[name].total,ref=referenceRatio(name,angle)||geo,split=.64,base=split*ref/geo;if(t<=split)return {u:t*ref/geo,stretch:ref};const v=(t-split)/(1-split),span=1-split,m0=ref/geo*span,m1=span/geo,u=(2*v**3-3*v*v+1)*base+(v**3-2*v*v+v)*m0+(-2*v**3+3*v*v)+(v**3-v*v)*m1,derivative=((6*v*v-6*v)*base+(3*v*v-4*v+1)*m0+(-6*v*v+6*v)+(3*v*v-2*v)*m1)/span;return{u,stretch:geo*derivative};}
 let angleCache=NaN,frames={};const neutral={};for(const [name,f]of Object.entries(families))neutral[name]=route(f,0,name);
 function prepare(angle){if(angleCache===angle)return;angleCache=angle;frames={};for(const [name,f]of Object.entries(families))frames[name]=route(f,angle,name);}
 function deform(p,part,angle){
  if(part.forearm)return forearm(p,angle);const name=part.name.startsWith('triceps')?'triceps':part.name.startsWith('biceps')?'biceps':part.name==='brachialis'?'brachialis':null;
  if(!name||angle===0)return p.slice();const f=families[name];if(p[1]<=f.top)return p.slice();if(p[1]>=f.end)return forearm(p,angle);
  prepare(angle);const t=(p[1]-f.top)/(f.end-f.top),tr=transport(name,t,angle),old=neutral[name].sample(t),now=frames[name].sample(tr.u),center=f.center(p[1]),theta=now.theta-old.theta,w=smooth((p[1]-f.top)/18),belly=smooth((f.end-p[1])/24)*w,stretch=tr.stretch,radial=1+belly*(1/Math.sqrt(stretch)-1),dx=(p[0]-center[0])*radial,dz=(p[2]-center[2])*radial;
  let q=[center[0]+dx,center[1]+(now.p[1]-old.p[1])*w-dz*Math.sin(theta)*w,center[2]+(now.p[2]-old.p[2])*w+dz*Math.cos(theta)];
  const distal=smooth((p[1]-(f.end-15))/15),rigid=forearm(p,angle);q=q.map((v,j)=>v+(rigid[j]-v)*distal);return q;
 }
 function metrics(angle){prepare(angle);return Object.fromEntries(Object.keys(families).map(name=>{const stretch=referenceRatio(name,angle)||frames[name].total/neutral[name].total;return[name,{lengthRatio:stretch,crossSectionRatio:1/stretch,radialRatio:1/Math.sqrt(stretch)}];}));}
 return {forearm,deform,metrics};
}
