function ArmSculptGeometry(){
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a)||1,unit=a=>mul(a,1/norm(a)),median=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor((b.length-1)/2)]||0},quantile=(a,t)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*t)))]||0};
 function axes(points){
  const center=[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/points.length),cov=[[0,0,0],[0,0,0],[0,0,0]];
  for(const p of points){const q=sub(p,center);for(let r=0;r<3;r++)for(let c=0;c<3;c++)cov[r][c]+=q[r]*q[c]/points.length;}
  const a=cov.map(row=>row.slice()),v=[[1,0,0],[0,1,0],[0,0,1]];
  for(let iter=0;iter<32;iter++){
   let p=0,q=1,largest=Math.abs(a[0][1]);if(Math.abs(a[0][2])>largest){p=0;q=2;largest=Math.abs(a[0][2]);}if(Math.abs(a[1][2])>largest){p=1;q=2;largest=Math.abs(a[1][2]);}if(largest<1e-10)break;
   const apq=a[p][q],tau=(a[q][q]-a[p][p])/(2*apq),t=(tau>=0?1:-1)/(Math.abs(tau)+Math.sqrt(1+tau*tau)),c=1/Math.sqrt(1+t*t),s=t*c,app=a[p][p],aqq=a[q][q];
   a[p][p]=app-t*apq;a[q][q]=aqq+t*apq;a[p][q]=a[q][p]=0;
   for(let k=0;k<3;k++)if(k!==p&&k!==q){const kp=a[k][p],kq=a[k][q];a[k][p]=a[p][k]=c*kp-s*kq;a[k][q]=a[q][k]=s*kp+c*kq;}
   for(let k=0;k<3;k++){const vp=v[k][p],vq=v[k][q];v[k][p]=c*vp-s*vq;v[k][q]=s*vp+c*vq;}
  }
  const order=[0,1,2].sort((i,j)=>a[j][j]-a[i][i]),vec=i=>unit([v[0][i],v[1][i],v[2][i]]),axis=vec(order[0]);
  if(axis[1]<0||(Math.abs(axis[1])<.2&&axis[0]<0))for(let k=0;k<3;k++)axis[k]*=-1;
  let u=vec(order[1]);u=unit(sub(u,mul(axis,dot(u,axis))));if(!isFinite(norm(u)))u=unit(cross(axis,[1,0,0]));
  const w=unit(cross(axis,u));return{center,axis,u,w};
 }
 function loft(points,ringCount=9,segments=10){
  if(!points||points.length<8)return{v:[],f:[],rings:[]};
  const basis=axes(points),projected=points.map(p=>[dot(p,basis.axis),dot(p,basis.u),dot(p,basis.w)]),lo=Math.min(...projected.map(p=>p[0])),hi=Math.max(...projected.map(p=>p[0])),span=Math.max(1e-6,hi-lo),window=span/(ringCount-1)*1.55,v=[],rings=[];
  for(let r=0;r<ringCount;r++){
   const t=r/(ringCount-1),at=lo+span*t;let slice=projected.filter(p=>Math.abs(p[0]-at)<=window/2);
   if(slice.length<8)slice=projected.slice().sort((a,b)=>Math.abs(a[0]-at)-Math.abs(b[0]-at)).slice(0,Math.min(20,projected.length));
   const c2=median(slice.map(p=>p[1])),c3=median(slice.map(p=>p[2])),r2=quantile(slice.map(p=>Math.abs(p[1]-c2)),.86),r3=quantile(slice.map(p=>Math.abs(p[2]-c3)),.86),cap=t<.001||t>.999?.22:1;
   const ring=[];
   for(let j=0;j<segments;j++){const theta=j*2*Math.PI/segments,p=add(add(add(mul(basis.axis,at),mul(basis.u,c2)),mul(basis.w,c3)),add(mul(basis.u,Math.cos(theta)*r2*cap),mul(basis.w,Math.sin(theta)*r3*cap)));ring.push(v.length);v.push(p);}
   rings.push(ring);
  }
  const f=[];for(let r=0;r<ringCount-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;f.push([a,b,c],[a,c,d]);}
  const ringCenter=r=>{const at=lo+span*r/(ringCount-1),near=projected.filter(p=>Math.abs(p[0]-at)<=window/2);let sample=near.length>=8?near:projected.slice().sort((a,b)=>Math.abs(a[0]-at)-Math.abs(b[0]-at)).slice(0,Math.min(20,projected.length));return add(add(mul(basis.axis,at),mul(basis.u,median(sample.map(p=>p[1])))),mul(basis.w,median(sample.map(p=>p[2]))));};
  const cap0=v.length;v.push(ringCenter(0));
  const cap1=v.length;v.push(ringCenter(ringCount-1));
  for(let j=0;j<segments;j++){f.push([cap0,rings[0][(j+1)%segments],rings[0][j]]);f.push([cap1,rings.at(-1)[j],rings.at(-1)[(j+1)%segments]]);}
  return{v,f,rings,basis};
 }
 function convexHull(points){
  const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),turn=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>=2&&turn(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.slice().reverse()){while(upper.length>=2&&turn(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
 }
 function plate(surface,acromion,glenoid,inferior){
  if(!surface||surface.length<8)return{v:[],f:[],rings:[],outlinePoints:[]};
  const basis=axes(surface),projected=surface.map(p=>{const q=sub(p,basis.center);return[dot(q,basis.axis),dot(q,basis.u),dot(q,basis.w)];}),outline=convexHull(projected.map(p=>[p[0],p[1]]));
  const centerDepth=median(projected.map(p=>p[2])),depths=projected.map(p=>p[2]).sort((a,b)=>a-b),thickness=Math.max(2.4,Math.min(5.5,(quantile(depths,.9)-quantile(depths,.1))*.12));
  const position=(point,depth)=>add(add(add(basis.center,mul(basis.axis,point[0])),mul(basis.u,point[1])),mul(basis.w,depth)),v=[],f=[];
  for(const point of outline){v.push(position(point,centerDepth-thickness),position(point,centerDepth+thickness));}
  const center2=outline.reduce((c,p)=>[c[0]+p[0]/outline.length,c[1]+p[1]/outline.length],[0,0]),frontCenter=v.length;v.push(position(center2,centerDepth-thickness));
  const backCenter=v.length;v.push(position(center2,centerDepth+thickness));
  for(let i=0;i<outline.length;i++){
   const next=(i+1)%outline.length,a=i*2,b=next*2;
   f.push([frontCenter,b,a],[backCenter,a+1,b+1],[a,a+1,b+1],[a,b+1,b]);
  }
  const outlinePoints=outline.map(p=>position(p,centerDepth-thickness));
  return{v,f,rings:[],outlinePoints,basis,thickness,spans:[Math.max(...outline.map(p=>p[0]))-Math.min(...outline.map(p=>p[0])),Math.max(...outline.map(p=>p[1]))-Math.min(...outline.map(p=>p[1]))]};
 }
 function nearest(points,target){let best=points[0],d=Infinity;for(const p of points){const n=norm(sub(p,target));if(n<d){d=n;best=p;}}return best.slice();}
 return{loft,plate,nearest,axes};
}
function ArmSculptLayer({atlas,landmarks,make,defs,drawing,svg}){
 const geo=ArmSculptGeometry(),partIndex=new Map(atlas.parts.map((p,i)=>[p.name,i])),ns='http://www.w3.org/2000/svg';
 const groups=[
  {id:'clavicle',label:'쇄골 S곡선',kind:'bone',parts:['clavicle']},
  {id:'scapula',label:'견갑골 삼각판',kind:'bone',parts:['scapula'],shape:'scapula-plate'},
  {id:'humerus',label:'상완골 관절 블록',kind:'bone',parts:['humerus']},
  {id:'radius',label:'요골 테이퍼',kind:'bone',parts:['radius']},
  {id:'ulna',label:'척골 테이퍼',kind:'bone',parts:['ulna']},
  {id:'deltoid',label:'삼각근 어깨 캡',kind:'muscle',parts:['deltoid-anterior','deltoid-middle','deltoid-posterior']},
  {id:'biceps',label:'이두근 primary mass',kind:'muscle',parts:['biceps-long','biceps-short']},
  {id:'triceps',label:'삼두근 primary mass',kind:'muscle',parts:['triceps-long','triceps-lateral','triceps-medial']},
  {id:'brachialis',label:'상완근 secondary mass',kind:'muscle',parts:['brachialis']}
 ];
 const stop=(gradient,offset,color)=>make('stop',{offset,'stop-color':color},gradient);
 const boneGradient=make('linearGradient',{id:'arm-sculpt-bone-gradient',x1:'0%',y1:'0%',x2:'100%',y2:'100%'},defs);stop(boneGradient,'0%','#f0f1f3');stop(boneGradient,'52%','#d8dce1');stop(boneGradient,'100%','#b7bdc7');
 const muscleGradient=make('linearGradient',{id:'arm-sculpt-muscle-gradient',x1:'0%',y1:'0%',x2:'100%',y2:'100%'},defs);stop(muscleGradient,'0%','#e5e7eb');stop(muscleGradient,'55%','#c9ced5');stop(muscleGradient,'100%','#aeb5bf');
 const root=make('g',{'class':'sculpt-layer','data-display-layer':'sculpt','aria-hidden':'true'},drawing);
 const nodes=groups.map((group,i)=>{const g=make('g',{'data-sculpt-form':group.id,'data-kind':group.kind},root),clip=make('clipPath',{id:'arm-sculpt-clip-'+i},defs),mask=make('path',{},clip),fill=make('path',{class:'sculpt-fill '+(group.kind==='bone'?'sculpt-bone':'sculpt-muscle'),fill:'url(#arm-sculpt-'+group.kind+'-gradient)'},g),outline=make('path',{class:'sculpt-outline',fill:'none',stroke:'var(--muted-foreground)','stroke-width':group.kind==='bone'?.9:.65},g),fiber=make('path',{class:'sculpt-form-lines',fill:'none',stroke:'var(--foreground)','stroke-opacity':'.20','stroke-width':'.65','clip-path':'url(#arm-sculpt-clip-'+i+')'},g);return{g,part:{name:group.id+'-mass'},mask,fill,outline,fiber,artistSculpt:true,group,i};});
 const light=ArmSurfaceLighting(make,nodes);
 const modeHeader=make('g',{'class':'diagram-mode-labels'},svg),leftHeader=make('text',{x:'18',y:'22','font-size':'11','font-weight':'700'},modeHeader),rightHeader=make('text',{x:'622',y:'22','font-size':'11','font-weight':'700','text-anchor':'end'},modeHeader);make('path',{d:'M320 0V430',fill:'none',stroke:'var(--muted-foreground)','stroke-width':'.7','stroke-dasharray':'4 4'},modeHeader);leftHeader.textContent='해부학';rightHeader.textContent='조형 덩어리';
 const markerRoot=make('g',{'class':'diagram-landmark','aria-live':'polite'},svg),leader=make('path',{fill:'none',stroke:'var(--orange)','stroke-width':'1.4','stroke-dasharray':'3 2'},markerRoot),dotNode=make('circle',{r:'4.5',fill:'var(--background)',stroke:'var(--orange)','stroke-width':'2'},markerRoot),markerText=make('text',{fill:'var(--foreground)','font-size':'11','font-weight':'600'},markerRoot);
 const landmarkMap=new Map(landmarks.landmarks.map(p=>[p.id,p]));
 function formMesh(group,posed){
  if(group.shape==='scapula-plate'){const scapula=posed[partIndex.get('scapula')],acromion=landmarkMap.get('acromioclavicular').point,glenoid=geo.nearest(scapula,landmarkMap.get('glenohumeral').point),inferior=landmarks.inferiorAngle.point;return geo.plate(scapula,acromion,glenoid,inferior);}
  return geo.loft(group.parts.flatMap(name=>posed[partIndex.get(name)]));
 }
 function drawLandmark(id,angle,project,forearm){
  const landmark=landmarkMap.get(id);if(!landmark){markerRoot.style.display='none';return;}
  const point=landmark.motion==='forearm'?forearm(landmark.point,angle):landmark.point,q=project(point),lx=Math.max(10,Math.min(625,q[0]+(q[0]<320?12:-12))),ly=Math.max(18,Math.min(420,q[1]-10)),anchor=lx<320?'start':'end';
  markerRoot.style.display='';dotNode.setAttribute('cx',q[0]);dotNode.setAttribute('cy',q[1]);markerText.setAttribute('x',lx);markerText.setAttribute('y',ly);markerText.setAttribute('text-anchor',anchor);markerText.textContent=landmark.short;markerText.setAttribute('aria-label',landmark.label);leader.setAttribute('d','M'+q.join(',')+' L'+(lx+(anchor==='start'?-3:3))+','+(ly+3));dotNode.setAttribute('data-landmark',id);dotNode.setAttribute('data-point',point.map(v=>v.toFixed(3)).join(','));
 }
 function render({posed,project,sculptProject=project,depth,angle,view,mode,landmark,transparent,forearm}){
  if(mode!=='anatomy'){
   const buffer=ArmVisibility({project:sculptProject,depth,step:.9}),meshes=groups.map(g=>formMesh(g,posed));
   meshes.forEach((mesh,id)=>mesh.f.forEach(f=>buffer.triangle(mesh.v[f[0]],mesh.v[f[1]],mesh.v[f[2]],id)));
   const visible=buffer.solve(nodes.length,{projections:true,scanlineClips:false});
   nodes.forEach((n,id)=>{const local=visible.ownerZ[id],inside=k=>transparent&&n.group.kind==='muscle'?local[k]>-Infinity:visible.owners[k]===id,contour=AtlasContour(visible,inside,visible.bounds[id]),mesh=meshes[id],plateOutline=mesh.outlinePoints?'M'+mesh.outlinePoints.map(project).map(p=>p.join(',')).join('L')+'Z':contour;n.mask.setAttribute('d',contour);n.fill.setAttribute('d',contour);n.outline.setAttribute('d',plateOutline);n.fiber.setAttribute('d',(mesh.rings||[]).filter((_,i)=>i%2===0&&i>0&&i<mesh.rings.length-1).map(r=>'M'+r.map(k=>project(mesh.v[k]).join(',')).join('L')+'Z').join(' '));});
   light(visible);
  }
  drawLandmark(landmark,angle,mode==='compare'?sculptProject:project,forearm);
 }
 return{render,groups,landmarks};
}