/* A convex cross-section of the posed cage and body field, sampled in drawing
   units. Muscle interiors are projected outside this envelope AFTER movement.
   It prevents endpoint-correct interpolation from cutting through rigid ribs.
   This is a conservative drawing shell, not a contact/soft-tissue simulation. */
function AbdominalEnvelope(lines,bodyLines=[]){
 function sectionsOf(lines){const sections=new Map();
 for(const ps of lines)for(let i=1;i<ps.length;i++){
  const a=ps[i-1],b=ps[i],lo=Math.floor(Math.min(a[1],b[1])),hi=Math.ceil(Math.max(a[1],b[1]));
  for(let y=lo;y<=hi;y++){
   const t=Math.abs(b[1]-a[1])<1e-7?.5:Math.max(0,Math.min(1,(y-a[1])/(b[1]-a[1]))),q=[a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];
   if(!sections.has(y))sections.set(y,[]);sections.get(y).push(q);
  }
 }return sections;}
 const sections=sectionsOf(lines),bodySections=sectionsOf(bodyLines);
 const hull=ps=>{
  const q=ps.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lo=[],hi=[];
  for(const p of q){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
  for(const p of q.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
  return lo.slice(0,-1).concat(hi.slice(0,-1));
 };
 const rings=new Map([...sections].map(([y,ps])=>{const h=hull(ps),body=bodySections.get(y)||h,c=body.reduce((s,p)=>[s[0]+p[0]/body.length,s[1]+p[1]/body.length],[0,0]);return [y,{h,c,body}];}));
 // Hull vertex counts change as individual ribs enter each horizontal slice.
 // Their raw vertex centroid is not a stable torso centerline: projecting
 // fibers from it produced rib-shaped ripples in otherwise continuous muscle.
 const centers=new Map([...rings].map(([y,r])=>[y,r.c]));
 for(const [y,r] of rings){
  const c=[0,0];let weight=0;
  for(let dy=-5;dy<=5;dy++){const p=centers.get(y+dy);if(!p)continue;const w=6-Math.abs(dy);weight+=w;c[0]+=p[0]*w;c[1]+=p[1]*w;}
  r.c=c.map(n=>n/weight);
 }
 function ray(h,c,nx,nz){let distance=Infinity;
  for(let i=0;i<h.length;i++){
   const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],den=nx*ez-nz*ex;if(Math.abs(den)<1e-8)continue;
   const t=((a[0]-c[0])*ez-(a[1]-c[1])*ex)/den,u=((a[0]-c[0])*nz-(a[1]-c[1])*nx)/den;
   if(t>=0&&u>= -1e-6&&u<=1+1e-6)distance=Math.min(distance,t);
  }
  return distance;
 }
 const resolution=64;
 for(const ring of rings.values())ring.radial=Array.from({length:resolution},(_,i)=>ray(ring.h,ring.c,Math.cos(i*2*Math.PI/resolution),Math.sin(i*2*Math.PI/resolution)));
 // Smooth an OUTER envelope, not an average which can move through a rib.
 // Dilation followed by an equal-width positive filter stays outside every
 // original slice while removing the corrugated cage imprint on the fibers.
 const raw=new Map([...rings].map(([y,r])=>[y,r.radial]));
 const outer=new Map([...rings].map(([y,r])=>[y,r.radial.map((n,i)=>{
  for(let dy=-4;dy<=4;dy++){const p=raw.get(y+dy);if(p)n=Math.max(n,p[i]);}return n;
 })]));
 for(const [y,r] of rings)r.radial=r.radial.map((n,i)=>{
  let sum=0,weight=0;
  for(let dy=-4;dy<=4;dy++){const p=outer.get(y+dy);if(!p)continue;const w=5-Math.abs(dy);sum+=w*p[i];weight+=w;}
  return sum/weight;
 });
 function boundary(q){
  const low=Math.floor(q[1]),t=q[1]-low,a=rings.get(low),b=rings.get(low+1)||a;if(!a||a.h.length<3||b.h.length<3)return null;
  const c=a.c.map((n,i)=>n+(b.c[i]-n)*t),dx=q[0]-c[0],dz=q[2]-c[1],length=Math.hypot(dx,dz);if(length<1e-5)return null;
  const nx=dx/length,nz=dz/length,angle=(Math.atan2(dz,dx)+2*Math.PI)%(2*Math.PI)*resolution/(2*Math.PI),i=Math.floor(angle),v=angle-i,at=r=>r.radial[i]+(r.radial[(i+1)%resolution]-r.radial[i])*v,distance=at(a)+(at(b)-at(a))*t;
  return Number.isFinite(distance)?{c,nx,nz,length,distance}:null;
 }
 function outside(q,clearance){const b=boundary(q);if(!b)return q;const target=b.distance+clearance,r=.5*(b.length+target+Math.sqrt((b.length-target)**2+4));return [b.c[0]+b.nx*r,q[1],b.c[1]+b.nz*r];}
 return {outside,boundary,rings};
}
