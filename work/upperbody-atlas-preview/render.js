/* Posed source triangles, native abdomen contour/depth rendering. */
const data=JSON.parse(document.querySelector('#atlas').textContent),colors={red:'#e02e2a',blue:'#339cff',green:'#00a240',orange:'#e25507',purple:'#924ff7',yellow:'#ffc300',teal:'#35b8b0'};
const specs={
 front:[['pectoral-clavicular','대흉근 쇄골부',24,175],['pectoral-sternal','대흉근 흉늑부',24,265],['pectoral-abdominal','대흉근 복부',24,340],['serratus','전거근',846,305]],
 back:[['trapezius-upper','승모근 상부',24,105],['trapezius-middle','승모근 중부',24,180],['trapezius-lower','승모근 하부',24,285],['latissimus','광배근',846,390],['infraspinatus','극하근',846,180],['teres-minor','소원근',846,120],['teres-major','대원근',846,255]],
 side:[['pectoral-sternal','대흉근',846,240],['serratus','전거근',846,335],['latissimus','광배근',24,395],['trapezius-upper','승모근',24,115],['infraspinatus','극하근',24,205],['teres-major','대원근',24,275]]
};
const ns='http://www.w3.org/2000/svg',curve=ps=>{if(ps.length<3)return '';let d='M'+ps[0].join(',');for(let i=1;i<ps.length-1;i++)d+='Q'+ps[i].join(',')+' '+ps[i].map((v,j)=>(v+ps[i+1][j])/2).join(',');return d+'L'+ps.at(-1).join(',');};
function clipNeck(ps){let result=[];for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],ina=a[1]>=data.neckTop,inb=b[1]>=data.neckTop;if(ina)result.push(a);if(ina!==inb){const t=(data.neckTop-a[1])/(b[1]-a[1]);result.push(a.map((v,j)=>v+(b[j]-v)*t));}}return result;}
const records=[];
for(const [view,title,yaw]of [['front','정면',0],['side','측면',90],['back','후면',180]]){
 const a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a),project=p=>[435+(p[0]*c+p[2]*s)*1.04,25+(p[1]-data.neckTop)*1.04],depth=p=>-p[0]*s+p[2]*c,buffer=AbdominalVisibility({project,depth,step:.7});
 const allowed=p=>p.kind!=='muscle'||view==='side'||(view==='front'?(p.name.startsWith('pectoral')||p.name.startsWith('serratus')):!(p.name.startsWith('pectoral')||p.name.startsWith('serratus')));
 data.parts.forEach((p,id)=>{if(allowed(p))p.f.forEach(f=>buffer.polygon(clipNeck(f.map(i=>p.v[i])),id));});
 const visible=buffer.solve(data.parts.length,{projections:id=>data.parts[id].kind==='muscle',scanlineClips:false});
 const section=document.createElement('section');section.dataset.view=view;section.innerHTML='<h2>'+title+'</h2><svg viewBox="0 0 870 540" xmlns="'+ns+'"><defs></defs><g class="surfaces"></g><g class="leaders"></g></svg>';document.querySelector('#panels').append(section);
 const svg=section.querySelector('svg'),defs=svg.querySelector('defs'),surfaces=svg.querySelector('.surfaces'),leaders=svg.querySelector('.leaders');
 const make=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 data.parts.forEach((part,id)=>{
  const outline=AtlasContour(visible,k=>visible.owners[k]===id,visible.bounds[id]);if(!outline)return;
  const muscle=part.kind==='muscle',clip=make('clipPath',{id:view+'-'+id},defs);make('path',{d:outline},clip);
  const g=make('g',{'data-part':part.name,'data-kind':part.kind},surfaces);make('path',{d:outline,fill:muscle?colors[part.color]:part.kind==='cartilage'?'#fafafa':'#e8e9eb',stroke:muscle?'#89919e':'#89919e','stroke-width':muscle?.6:.9,'stroke-opacity':muscle?.45:.85},g);
  if(!muscle)return;let fiberPath='',local=visible.ownerZ[id];
  for(const fiber of part.fibers){let segment=[];const flush=()=>{let len=0;for(let j=1;j<segment.length;j++)len+=Math.hypot(...segment[j].map((v,k)=>v-segment[j-1][k]));if(len>=5)fiberPath+=curve(segment);segment=[];};
   for(const p of fiber){const q=project(p),x=Math.floor((q[0]-visible.x0)/visible.step),y=Math.floor((q[1]-visible.y0)/visible.step),k=y*visible.w+x;
    if(p[1]>=data.neckTop&&x>=0&&x<visible.w&&y>=0&&y<visible.h&&visible.owners[k]===id&&depth(p)>=local[k]-2.5)segment.push(q);else flush();}flush();
  }make('path',{d:fiberPath,fill:'none',stroke:'#1a1c1f','stroke-width':.65,'stroke-opacity':.28,'clip-path':'url(#'+view+'-'+id+')'},g);
 });
 const labels=[];for(const [name,text,x,y]of specs[view]){
  const ids=data.parts.map((p,id)=>p.name===name||p.name===name+'-right'?id:-1).filter(i=>i>=0).sort((a,b)=>visible.coverage[b]-visible.coverage[a]);const id=ids[0];if(visible.coverage[id]<100)continue;
  const points=visible.centers[id],mean=points.reduce((sum,p)=>sum.map((v,j)=>v+p[j]/points.length),[0,0]),target=points.reduce((best,p)=>Math.hypot(...p.map((v,j)=>v-mean[j]))<Math.hypot(...best.map((v,j)=>v-mean[j]))?p:best);
  make('path',{d:`M${x},${y+5}L${target.join(',')}`,fill:'none',stroke:'#8593a6','stroke-width':.9},leaders);make('text',{x,y,'text-anchor':x<435?'start':'end'},leaders).textContent=text;labels.push(text);
 }
 records.push({view,yaw,coverage:visible.coverage,labels,boneSourceParts:data.parts.filter(p=>p.kind!=='muscle').map(p=>p.name)});
}
window.previewAudit={views:records,source:data.source,pose:data.pose,selectedMuscles:[...new Set(data.parts.filter(p=>p.kind==='muscle').map(p=>p.name.replace(/-right$/,'')))],head:false,abdomenMuscles:false};window.ready=true;
