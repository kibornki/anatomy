/* Per-sample camera depth for the existing vector artwork. This buffer only
   supplies SVG clip paths; colors, fibers, bones and opacity stay native SVG.
   Facing the camera alone cannot establish that a muscle is in front of ribs. */
function AbdominalVisibility({project,depth,step=1}){
 const triangles=[];
 function triangle(a,b,c,owner){triangles.push({p:[a,b,c].map(project),z:[a,b,c].map(depth),owner});}
 function quad(ps,owner){triangle(ps[0],ps[1],ps[2],owner);triangle(ps[0],ps[2],ps[3],owner);}
 function polygon(ps,owner){
  // Ear clipping retains concave outlines instead of filling their convex hull.
  if(ps.length<3)return;
  const q=ps.map(project),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  let indices=ps.map((_,i)=>i),area=q.reduce((s,p,i)=>s+p[0]*q[(i+1)%q.length][1]-p[1]*q[(i+1)%q.length][0],0);
  if(area<0)indices.reverse();
  let guard=indices.length**2;
  while(indices.length>3&&guard--){let ear=false;
   for(let i=0;i<indices.length;i++){
    const a=indices[(i+indices.length-1)%indices.length],b=indices[i],c=indices[(i+1)%indices.length];
    if(cross(q[a],q[b],q[c])<1e-5)continue;
    if(indices.some(k=>k!==a&&k!==b&&k!==c&&cross(q[a],q[b],q[k])>1e-5&&cross(q[b],q[c],q[k])>1e-5&&cross(q[c],q[a],q[k])>1e-5))continue;
    triangle(ps[a],ps[b],ps[c],owner);indices.splice(i,1);ear=true;break;
   }if(!ear)break;
  }
  if(indices.length===3)triangle(...indices.map(i=>ps[i]),owner);
 }
 function line(ps,width,owner){
  for(let i=1;i<ps.length;i++){
   const a=project(ps[i-1]),b=project(ps[i]),h=Math.hypot(b[0]-a[0],b[1]-a[1]);if(h<1e-5)continue;
   const x=(b[1]-a[1])*width/2/h,y=-(b[0]-a[0])*width/2/h,z=[depth(ps[i-1]),depth(ps[i])];
   triangles.push({p:[[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y]],z:[z[0],z[1],z[1]],owner},
    {p:[[a[0]+x,a[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y]],z:[z[0],z[1],z[0]],owner});
  }
 }
 function solve(count){
  const points=triangles.flatMap(t=>t.p),x0=Math.floor(Math.min(...points.map(p=>p[0]))/step)*step,y0=Math.floor(Math.min(...points.map(p=>p[1]))/step)*step;
  const w=Math.ceil((Math.max(...points.map(p=>p[0]))-x0)/step)+1,h=Math.ceil((Math.max(...points.map(p=>p[1]))-y0)/step)+1;
  const zbuf=new Float32Array(w*h).fill(-Infinity),owners=new Int16Array(w*h).fill(-2);
  for(const t of triangles){
   const p=t.p.map(q=>[(q[0]-x0)/step,(q[1]-y0)/step]),[a,b,c]=p;
   const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-7)continue;
   const minX=Math.max(0,Math.floor(Math.min(...p.map(q=>q[0])))),maxX=Math.min(w-1,Math.ceil(Math.max(...p.map(q=>q[0])))),minY=Math.max(0,Math.floor(Math.min(...p.map(q=>q[1])))),maxY=Math.min(h-1,Math.ceil(Math.max(...p.map(q=>q[1]))));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const px=x+.5,py=y+.5,wa=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,wb=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,wc=1-wa-wb;
    if(wa< -1e-6||wb< -1e-6||wc< -1e-6)continue;
    const z=wa*t.z[0]+wb*t.z[1]+wc*t.z[2],k=y*w+x;
    if(z>zbuf[k]+.02||(Math.abs(z-zbuf[k])<=.02&&t.owner>=0)){zbuf[k]=z;owners[k]=t.owner;}
   }
  }
  const clips=Array(count).fill(''),centers=Array.from({length:count},()=>[]),coverage=Array(count).fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;){
   const id=owners[y*w+x],start=x;while(x<w&&owners[y*w+x]===id)x++;
   if(id<0)continue;
   const px=x0+start*step,py=y0+y*step,length=(x-start)*step;
   // The vector muscle outline still supplies the outer silhouette. A small
   // overlap removes antialias seams between contiguous mask scanlines.
   clips[id]+=`M ${(px-.1).toFixed(2)},${(py-.1).toFixed(2)} h ${(length+.2).toFixed(2)} v ${step+.2} h ${(-length-.2).toFixed(2)} Z `;
   coverage[id]+=x-start;
   if(y%6===0)centers[id].push([px+length/2,py+step/2]);
  }
  return {clips,centers,coverage,owners,zbuf,w,h,x0,y0,step};
 }
 return {quad,polygon,line,solve};
}

/* A convex cross-section of the posed cage and body field, sampled in drawing
   units. Muscle interiors are projected outside this envelope AFTER movement.
   It prevents endpoint-correct interpolation from cutting through rigid ribs.
   This is a conservative drawing shell, not a contact/soft-tissue simulation. */
function AbdominalEnvelope(lines){
 const sections=new Map();
 for(const ps of lines)for(let i=1;i<ps.length;i++){
  const a=ps[i-1],b=ps[i],lo=Math.floor(Math.min(a[1],b[1])),hi=Math.ceil(Math.max(a[1],b[1]));
  for(let y=lo;y<=hi;y++){
   const t=Math.abs(b[1]-a[1])<1e-7?.5:Math.max(0,Math.min(1,(y-a[1])/(b[1]-a[1]))),q=[a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];
   if(!sections.has(y))sections.set(y,[]);sections.get(y).push(q);
  }
 }
 const hull=ps=>{
  const q=ps.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lo=[],hi=[];
  for(const p of q){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
  for(const p of q.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
  return lo.slice(0,-1).concat(hi.slice(0,-1));
 };
 const rings=new Map([...sections].map(([y,ps])=>{const h=hull(ps),c=h.reduce((s,p)=>[s[0]+p[0]/h.length,s[1]+p[1]/h.length],[0,0]);return [y,{h,c}];}));
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
 function boundary(q){
  const low=Math.floor(q[1]),t=q[1]-low,a=rings.get(low),b=rings.get(low+1)||a;if(!a||a.h.length<3||b.h.length<3)return null;
  const c=a.c.map((n,i)=>n+(b.c[i]-n)*t),dx=q[0]-c[0],dz=q[2]-c[1],length=Math.hypot(dx,dz);if(length<1e-5)return null;
  const nx=dx/length,nz=dz/length,angle=(Math.atan2(dz,dx)+2*Math.PI)%(2*Math.PI)*resolution/(2*Math.PI),i=Math.floor(angle),v=angle-i,at=r=>r.radial[i]+(r.radial[(i+1)%resolution]-r.radial[i])*v,distance=at(a)+(at(b)-at(a))*t;
  return Number.isFinite(distance)?{c,nx,nz,length,distance}:null;
 }
 function outside(q,clearance){const b=boundary(q);if(!b)return q;const target=b.distance+clearance,r=.5*(b.length+target+Math.sqrt((b.length-target)**2+4));return [b.c[0]+b.nx*r,q[1],b.c[1]+b.nz*r];}
 return {outside,boundary,rings};
}
