/* Trace the depth-tested projected boundary, never the interior mesh edges.
 * Subpixel smoothing affects only the vector illustration, not 3D geometry. */
function AtlasContour(buffer,inside,bounds=[0,0,buffer.w-1,buffer.h-1]){
 const {w,h,x0,y0,step}=buffer,edges=new Map(),put=(x,y,a,b)=>{const k=y*(w+1)+x;if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b*(w+1)+a);};
 for(let y=bounds[1];y<=bounds[3];y++)for(let x=bounds[0];x<=bounds[2];x++)if(inside(y*w+x)){
  if(y===0||!inside((y-1)*w+x))put(x,y,x+1,y);
  if(x===w-1||!inside(y*w+x+1))put(x+1,y,x+1,y+1);
  if(y===h-1||!inside((y+1)*w+x))put(x+1,y+1,x,y+1);
  if(x===0||!inside(y*w+x-1))put(x,y+1,x,y);
 }
 const loops=[];
 while(edges.size){const start=edges.keys().next().value;let key=start,loop=[];
  for(let guard=0;guard<w*h*4;guard++){loop.push([key%(w+1),Math.floor(key/(w+1))]);const next=edges.get(key)?.pop();if(!edges.get(key)?.length)edges.delete(key);if(next===undefined||next===start)break;key=next;}
  if(loop.length>3)loops.push(loop);
 }
 const simplify=(points,tolerance)=>{
  if(points.length<=2)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let max=tolerance*tolerance,index=-1;
  for(let i=1;i<points.length-1;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i;}}
  return index<0?[a,b]:simplify(points.slice(0,index+1),tolerance).slice(0,-1).concat(simplify(points.slice(index),tolerance));
 };
 let path='';for(const loop of loops){let far=1;for(let i=2;i<loop.length;i++)if((loop[i][0]-loop[0][0])**2+(loop[i][1]-loop[0][1])**2>(loop[far][0]-loop[0][0])**2+(loop[far][1]-loop[0][1])**2)far=i;
  const ps=simplify(loop.slice(0,far+1),.65).slice(0,-1).concat(simplify(loop.slice(far).concat([loop[0]]),.65).slice(0,-1)).map(p=>[x0+p[0]*step,y0+p[1]*step]);if(ps.length<3)continue;
  const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2),first=mid(ps.at(-1),ps[0]);path+='M'+first.map(n=>n.toFixed(1)).join(',');for(let i=0;i<ps.length;i++)path+='Q'+ps[i].map(n=>n.toFixed(1)).join(',')+' '+mid(ps[i],ps[(i+1)%ps.length]).map(n=>n.toFixed(1)).join(',');path+='Z';
 }return path;
}
