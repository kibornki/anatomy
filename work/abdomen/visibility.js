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
 function solve(count,{projections=false,occludes=()=>true,scanlineClips=true}={}){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const t of triangles)for(const p of t.p){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}
  const x0=Math.floor(minX/step)*step,y0=Math.floor(minY/step)*step;
  const w=Math.ceil((maxX-x0)/step)+1,h=Math.ceil((maxY-y0)/step)+1;
  const zbuf=new Float32Array(w*h).fill(-Infinity),owners=new Int16Array(w*h).fill(-2);
  const ownerZ=projections?Array.from({length:count},(_,id)=>projections===true||projections(id)?new Float32Array(w*h).fill(-Infinity):null):null;
  const bounds=Array.from({length:count},()=>[w,h,0,0]);
  for(const t of triangles){
   const p=t.p.map(q=>[(q[0]-x0)/step,(q[1]-y0)/step]),[a,b,c]=p;
   const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-7)continue;
   const minX=Math.max(0,Math.floor(Math.min(...p.map(q=>q[0])))),maxX=Math.min(w-1,Math.ceil(Math.max(...p.map(q=>q[0])))),minY=Math.max(0,Math.floor(Math.min(...p.map(q=>q[1])))),maxY=Math.min(h-1,Math.ceil(Math.max(...p.map(q=>q[1]))));
   if(t.owner>=0){const b=bounds[t.owner];b[0]=Math.min(b[0],minX);b[1]=Math.min(b[1],minY);b[2]=Math.max(b[2],maxX);b[3]=Math.max(b[3],maxY);}
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const px=x+.5,py=y+.5,wa=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,wb=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,wc=1-wa-wb;
    if(wa< -1e-6||wb< -1e-6||wc< -1e-6)continue;
    const z=wa*t.z[0]+wb*t.z[1]+wc*t.z[2],k=y*w+x;
    if(ownerZ&&t.owner>=0&&ownerZ[t.owner]&&z>ownerZ[t.owner][k])ownerZ[t.owner][k]=z;
    if(!occludes(t.owner))continue;
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
   if(scanlineClips)clips[id]+=`M ${(px-.1).toFixed(2)},${(py-.1).toFixed(2)} h ${(length+.2).toFixed(2)} v ${step+.2} h ${(-length-.2).toFixed(2)} Z `;
   coverage[id]+=x-start;
   if(y%6===0)centers[id].push([px+length/2,py+step/2]);
  }
  return {clips,centers,coverage,owners,zbuf,w,h,x0,y0,step,ownerZ,bounds};
 }
 return {triangle,quad,polygon,line,solve};
}
