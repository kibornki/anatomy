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
 function loft(points,ringCount=9,segments=10,endScale=.22,bulge=0){
  if(!points||points.length<8)return{v:[],f:[],rings:[]};
  const basis=axes(points),projected=points.map(p=>[dot(p,basis.axis),dot(p,basis.u),dot(p,basis.w)]),lo=Math.min(...projected.map(p=>p[0])),hi=Math.max(...projected.map(p=>p[0])),span=Math.max(1e-6,hi-lo),window=span/(ringCount-1)*1.55,v=[],rings=[];
  for(let r=0;r<ringCount;r++){
   const t=r/(ringCount-1),at=lo+span*t;let slice=projected.filter(p=>Math.abs(p[0]-at)<=window/2);
   if(slice.length<8)slice=projected.slice().sort((a,b)=>Math.abs(a[0]-at)-Math.abs(b[0]-at)).slice(0,Math.min(20,projected.length));
   const c2=median(slice.map(p=>p[1])),c3=median(slice.map(p=>p[2])),tau=2*Math.PI,polar=slice.map(p=>({angle:(Math.atan2(p[2]-c3,p[1]-c2)+tau)%tau,radius:Math.hypot(p[1]-c2,p[2]-c3)})),radii=Array.from({length:segments},(_,j)=>{const target=j*tau/segments,near=polar.filter(p=>{const d=Math.abs(p.angle-target);return Math.min(d,tau-d)<=tau/segments*.75;}),samples=near.length?near:polar.slice().sort((a,b)=>{const da=Math.abs(a.angle-target),db=Math.abs(b.angle-target);return Math.min(da,tau-da)-Math.min(db,tau-db);}).slice(0,Math.min(6,polar.length));return quantile(samples.map(p=>p.radius),.86);}),cap=t<.001||t>.999?endScale:1;
   const scale=cap*(1+bulge*Math.sin(Math.PI*t)),ring=[],radialCenter=[radii.reduce((sum,r,j)=>sum+Math.cos(j*tau/segments)*r/segments,0),radii.reduce((sum,r,j)=>sum+Math.sin(j*tau/segments)*r/segments,0)];
   for(let j=0;j<segments;j++){const theta=j*tau/segments,radius=radii[j]*scale,p=add(add(add(mul(basis.axis,at),mul(basis.u,c2)),mul(basis.w,c3)),add(mul(basis.u,Math.cos(theta)*radius-radialCenter[0]*scale),mul(basis.w,Math.sin(theta)*radius-radialCenter[1]*scale)));ring.push(v.length);v.push(p);}
   rings.push(ring);
  }
  const f=[];for(let r=0;r<ringCount-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;f.push([a,b,c],[a,c,d]);}
  const ringCenter=r=>{const at=lo+span*r/(ringCount-1),near=projected.filter(p=>Math.abs(p[0]-at)<=window/2);let sample=near.length>=8?near:projected.slice().sort((a,b)=>Math.abs(a[0]-at)-Math.abs(b[0]-at)).slice(0,Math.min(20,projected.length));return add(add(mul(basis.axis,at),mul(basis.u,median(sample.map(p=>p[1])))),mul(basis.w,median(sample.map(p=>p[2]))));};
  const cap0=v.length;v.push(ringCenter(0));
  const cap1=v.length;v.push(ringCenter(ringCount-1));
  for(let j=0;j<segments;j++){f.push([cap0,rings[0][(j+1)%segments],rings[0][j]]);f.push([cap1,rings.at(-1)[j],rings.at(-1)[(j+1)%segments]]);}
  return{v,f,rings,basis};
 }

 function blockout(points,profile='biceps',ringCount=5){
  if(!points||points.length<8)return{v:[],f:[],rings:[],profile};
  const basis=axes(points),projected=points.map(p=>[dot(p,basis.axis),dot(p,basis.u),dot(p,basis.w)]),lo=Math.min(...projected.map(p=>p[0])),hi=Math.max(...projected.map(p=>p[0])),span=Math.max(1e-6,hi-lo),window=span/(ringCount-1)*1.8,section=[[1,0],[.5,1],[-.5,1],[-1,0],[-.5,-1],[.5,-1]],taper={deltoid:[.38,.86,1,.78,.2],biceps:[.18,.78,1,.78,.18],triceps:[.28,.82,1,.74,.24],brachialis:[.22,.8,.92,.68,.2]}[profile]||[.22,.8,1,.8,.22],v=[],rings=[],centers=[];
  for(let r=0;r<ringCount;r++){
   const t=r/(ringCount-1),at=lo+span*t;let slice=projected.filter(p=>Math.abs(p[0]-at)<=window/2);
   if(slice.length<8)slice=projected.slice().sort((a,b)=>Math.abs(a[0]-at)-Math.abs(b[0]-at)).slice(0,Math.min(24,projected.length));
   const c2=median(slice.map(p=>p[1])),c3=median(slice.map(p=>p[2])),halfWidth=Math.max(.8,(quantile(slice.map(p=>p[1]),.94)-quantile(slice.map(p=>p[1]),.06))/2),halfDepth=Math.max(.8,(quantile(slice.map(p=>p[2]),.94)-quantile(slice.map(p=>p[2]),.06))/2),factor=taper[Math.min(r,taper.length-1)],ring=[];
   centers.push(add(add(mul(basis.axis,at),mul(basis.u,c2)),mul(basis.w,c3)));
   for(const [u,w]of section){ring.push(v.length);v.push(add(add(add(mul(basis.axis,at),mul(basis.u,c2)),mul(basis.w,c3)),add(mul(basis.u,u*halfWidth*factor),mul(basis.w,w*halfDepth*factor))));}
   rings.push(ring);
  }
  const f=[],segments=section.length;
  for(let r=0;r<ringCount-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;f.push([a,b,c],[a,c,d]);}
  const cap0=v.length;v.push(centers[0]);const cap1=v.length;v.push(centers.at(-1));
  for(let j=0;j<segments;j++){f.push([cap0,rings[0][(j+1)%segments],rings[0][j]]);f.push([cap1,rings.at(-1)[j],rings.at(-1)[(j+1)%segments]]);}
  return{v,f,rings,basis,profile,faceted:true};
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
  const fallback=axes(surface),center=acromion?.length===3?acromion:fallback.center,axis=inferior?.length===3?unit(sub(inferior,center)):fallback.axis;
  let lateral=glenoid?.length===3?sub(glenoid,center):fallback.u;lateral=unit(sub(lateral,mul(axis,dot(lateral,axis))));
  if(Math.hypot(...lateral)<1e-6)lateral=fallback.u;
  const basis={center,axis,u:lateral,w:unit(cross(axis,lateral))},projected=surface.map(p=>{const q=sub(p,basis.center);return[dot(q,basis.axis),dot(q,basis.u),dot(q,basis.w)];}),outline=convexHull(projected);
  const centerDepth=median(projected.map(p=>p[2])),depths=projected.map(p=>p[2]).sort((a,b)=>a-b),thickness=Math.max(2.4,Math.min(5.5,(quantile(depths,.9)-quantile(depths,.1))*.12));
  const position=(point,depth)=>add(add(add(basis.center,mul(basis.axis,point[0])),mul(basis.u,point[1])),mul(basis.w,depth)),v=[],f=[];
  for(const point of outline){v.push(position(point,point[2]-thickness),position(point,point[2]+thickness));}
  const center2=outline.reduce((c,p)=>[c[0]+p[0]/outline.length,c[1]+p[1]/outline.length],[0,0]),frontCenter=v.length;v.push(position(center2,centerDepth-thickness));
  const backCenter=v.length;v.push(position(center2,centerDepth+thickness));
  for(let i=0;i<outline.length;i++){
   const next=(i+1)%outline.length,a=i*2,b=next*2;
   f.push([frontCenter,b,a],[backCenter,a+1,b+1],[a,a+1,b+1],[a,b+1,b]);
  }
  const outlinePoints=outline.map(p=>position(p,p[2]-thickness));
  return{v,f,rings:[],outlinePoints,basis,thickness,spans:[Math.max(...outline.map(p=>p[0]))-Math.min(...outline.map(p=>p[0])),Math.max(...outline.map(p=>p[1]))-Math.min(...outline.map(p=>p[1]))]};
 }
 function nearest(points,target){let best=points[0],d=Infinity;for(const p of points){const n=norm(sub(p,target));if(n<d){d=n;best=p;}}return best.slice();}
 return{loft,blockout,plate,nearest,axes};
}
function ArmSculptLayer({atlas,landmarks,make,defs,drawing,svg,composition}){
 const geo=ArmSculptGeometry(),partIndex=new Map(atlas.parts.map((p,i)=>[p.name,i])),ns='http://www.w3.org/2000/svg';
 const groups=[
  {id:'clavicle',label:'쇄골 S곡선',kind:'bone',parts:['clavicle']},
  {id:'scapula',label:'견갑골 삼각판',kind:'bone',parts:['scapula'],shape:'scapula-plate'},
  {id:'humerus',label:'상완골 관절 블록',kind:'bone',parts:['humerus']},
  {id:'radius',label:'요골 테이퍼',kind:'bone',parts:['radius']},
  {id:'ulna',label:'척골 테이퍼',kind:'bone',parts:['ulna']},
  {id:'deltoid',label:ARM_MUSCLE_LABELS.forms.deltoid,kind:'muscle',parts:['deltoid-anterior','deltoid-middle','deltoid-posterior']},
  {id:'biceps',label:ARM_MUSCLE_LABELS.forms.biceps,kind:'muscle',parts:['biceps-long','biceps-short']},
  {id:'triceps',label:ARM_MUSCLE_LABELS.forms.triceps,kind:'muscle',parts:['triceps-long','triceps-lateral','triceps-medial']},
  {id:'brachialis',label:ARM_MUSCLE_LABELS.forms.brachialis,kind:'muscle',parts:['brachialis']}
 ];
 const muscleColors={deltoid:'#69a79a',biceps:'#a68bc1',triceps:'#8e79aa',brachialis:'#a59c68'};
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
 const shadeColor=(hex,factor)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor))).toString(16).padStart(2,'0')).join('');
 function facetPolygons(mesh){
  if(!mesh.rings.length)return mesh.f.map(face=>face.slice());
  const faces=[];
  for(let r=0;r<mesh.rings.length-1;r++)for(let j=0;j<mesh.rings[r].length;j++){const a=mesh.rings[r],b=mesh.rings[r+1],next=(j+1)%a.length;faces.push([a[j],a[next],b[next],b[j]]);}
  faces.unshift(mesh.rings[0].slice().reverse());faces.push(mesh.rings.at(-1).slice());return faces;
 }
 function facetColor(color,points){
  const normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0]))),light=unit([-.42,.58,.70]);
  return shadeColor(color,.82+Math.max(0,dot(normal,light))*.28);
 }
 const stop=(gradient,offset,color)=>make('stop',{offset,'stop-color':color},gradient);
 const boneGradient=make('linearGradient',{id:'arm-sculpt-bone-gradient',x1:'0%',y1:'0%',x2:'100%',y2:'100%'},defs);stop(boneGradient,'0%','#e9e3d8');stop(boneGradient,'52%','#cfc7bb');stop(boneGradient,'100%','#a69b8d');
 groups.filter(group=>group.kind==='muscle').forEach(group=>{const gradient=make('radialGradient',{id:'arm-sculpt-'+group.id+'-gradient',cx:'28%',cy:'22%',r:'92%'},defs);stop(gradient,'0%',shadeColor(muscleColors[group.id],1.2));stop(gradient,'48%',muscleColors[group.id]);stop(gradient,'100%',shadeColor(muscleColors[group.id],.72));});
 const root=make('g',{'class':'sculpt-layer','data-display-layer':'sculpt','aria-hidden':'true'},drawing);
 composition.mountFat(make,root,'sculpt');
 const nodes=groups.map((group,i)=>{const g=make('g',{'data-sculpt-form':group.id,'data-kind':group.kind},root),clip=make('clipPath',{id:'arm-sculpt-clip-'+i},defs),mask=make('path',{},clip),fill=make('path',{class:'sculpt-fill '+(group.kind==='bone'?'sculpt-bone':'sculpt-muscle'),fill:group.kind==='bone'?'url(#arm-sculpt-bone-gradient)':'url(#arm-sculpt-'+group.id+'-gradient)'},g),facets=make('g',{'class':'sculpt-facets','clip-path':'url(#arm-sculpt-clip-'+i+')'},g),outline=make('path',{class:'sculpt-outline',fill:'none',stroke:group.kind==='bone'?'#68645e':'#403a43','stroke-width':group.kind==='bone'?.9:1.05,'stroke-opacity':group.kind==='bone'?.72:.72},g),fiber=make('path',{class:'sculpt-form-lines',fill:'none',stroke:'var(--foreground)','stroke-opacity':'.20','stroke-width':'.65','clip-path':'url(#arm-sculpt-clip-'+i+')'},g);return{g,part:{name:group.id+'-mass'},mask,fill,facets,facetPaths:[],outline,fiber,artistSculpt:true,group,i};});
 function drawFacets(node,mesh,project,depth){
  const faces=facetPolygons(mesh),ordered=[];
  while(node.facetPaths.length<faces.length)node.facetPaths.push(make('path',{class:'sculpt-facet'},node.facets));
  faces.forEach((indices,id)=>{const points=indices.map(i=>mesh.v[i]),path=node.facetPaths[id];path.setAttribute('d','M'+points.map(project).map(p=>p.join(',')).join('L')+'Z');path.setAttribute('fill',facetColor(node.group.kind==='muscle'?muscleColors[node.group.id]:'#c9c0ad',points));ordered.push({path,z:points.reduce((sum,p)=>sum+depth(p),0)/points.length});});
  ordered.sort((a,b)=>a.z-b.z);ordered.forEach(item=>node.facets.appendChild(item.path));
 }
 const modeHeader=make('g',{'class':'diagram-mode-labels'},svg),leftHeader=make('text',{x:'18',y:'22','font-size':'11','font-weight':'700'},modeHeader),rightHeader=make('text',{x:'622',y:'22','font-size':'11','font-weight':'700','text-anchor':'end'},modeHeader);make('path',{d:'M320 0V430',fill:'none',stroke:'var(--muted-foreground)','stroke-width':'.7','stroke-dasharray':'4 4'},modeHeader);leftHeader.textContent='해부학';rightHeader.textContent='도형화';
 const markerRoot=make('g',{'class':'diagram-landmark','aria-hidden':'true'},svg);
 const landmarkMap=new Map(landmarks.landmarks.map(p=>[p.id,p]));
 function formMesh(group,posed){
  if(group.shape==='scapula-plate'){const scapula=posed[partIndex.get('scapula')],acromion=landmarkMap.get('acromioclavicular').point,glenoid=geo.nearest(scapula,landmarkMap.get('glenohumeral').point),inferior=landmarks.inferiorAngle.point;return geo.plate(scapula,acromion,glenoid,inferior);}
  const points=group.parts.flatMap(name=>posed[partIndex.get(name)]),profile={deltoid:[8,9,.42,.26],biceps:[9,9,.34,.24],triceps:[9,9,.34,.2],brachialis:[8,8,.3,.16]}[group.id];return profile?geo.loft(points,...profile):geo.loft(points,9,10,.72,.04);
 }
 const sculptLabelRoot=make('g',{'class':'sculpt-labels','aria-hidden':'true'},svg),sculptNames=ARM_MUSCLE_LABELS.forms,sculptLabelPositions={front:{deltoid:[55,125],biceps:[55,250],brachialis:[585,270],triceps:[585,360]},back:{deltoid:[55,115],triceps:[55,280],biceps:[585,250],brachialis:[585,360]},side:{deltoid:[585,110],biceps:[585,245],triceps:[55,285],brachialis:[55,360]}},sculptLabelNodes=new Map(groups.filter(g=>g.kind==='muscle').map(group=>{const g=make('g',{'data-sculpt-label':group.id},sculptLabelRoot),line=make('path',{},g),text=make('text',{'font-size':'11','font-weight':'600'},g);text.textContent=sculptNames[group.id];return[group.id,{g,line,text}];}));
 function drawLandmark(id,angle,project,sculptProject,forearm,mode){
  markerRoot.replaceChildren();const landmark=landmarkMap.get(id);if(!landmark)return;
  const point=landmark.motion==='forearm'?forearm(landmark.point,angle):landmark.point,unit=640/Math.max(1,svg.getBoundingClientRect().width),panels=mode==='compare'?[{project,min:0,max:320},{project:sculptProject,min:320,max:640}]:[{project,min:0,max:640}];
  for(const panel of panels){const [x,y]=panel.project(point);if(x<panel.min||x>panel.max||y<0||y>430)continue;const anchor=x<(panel.min+panel.max)/2?'start':'end',tx=Math.max(panel.min+8*unit,Math.min(panel.max-8*unit,x+(anchor==='start'?12:-12)*unit)),ty=Math.max(12*unit,y-10*unit),g=make('g',{'data-landmark':id,'data-point':point.map(v=>v.toFixed(3)).join(',')},markerRoot);
   const leader=make('path',{fill:'none',stroke:'#ed8c42','stroke-width':unit,'stroke-dasharray':`${3*unit} ${2*unit}`},g);make('circle',{cx:x,cy:y,r:3*unit,fill:'var(--background)',stroke:'#ed8c42','stroke-width':1.4*unit},g);const text=make('text',{x:tx,y:ty,'text-anchor':anchor,'font-size':10*unit,fill:'var(--foreground)'},g);text.textContent=landmark.short;AnatomyLabelLeader(leader,text,[x,y]);
  }svg.appendChild(markerRoot);
 }
 function render({posed,project,sculptProject=project,depth,angle,view,mode,landmark,transparent,forearm,showBones=true,showMuscles=true}){
  let visible=null,meshes=[];
  if(mode!=='anatomy'){
   const visibleGroup=group=>group.kind==='bone'?showBones:showMuscles,buffer=ArmVisibility({project:sculptProject,depth,step:.9});meshes=groups.map(g=>visibleGroup(g)?formMesh(g,posed):null);
   meshes.forEach((mesh,id)=>mesh?.f.forEach(f=>buffer.triangle(mesh.v[f[0]],mesh.v[f[1]],mesh.v[f[2]],id)));
   const fatCount=composition.paintFat(buffer,posed,nodes.length,meshes);
   visible=buffer.solve(nodes.length+fatCount,{projections:true,scanlineClips:false,occludes:id=>id>=nodes.length?!composition.fatTransparent:!transparent||nodes[id].group.kind==='bone'});
   nodes.forEach((n,id)=>{const mesh=meshes[id];if(!mesh){n.mask.setAttribute('d','');n.fill.setAttribute('d','');n.outline.setAttribute('d','');n.fiber.setAttribute('d','');return;}const inside=k=>transparent&&n.group.kind==='muscle'?visible.depthAt(id,k)>-Infinity:visible.owners[k]===id,contour=AtlasContour(visible,inside,visible.bounds[id]),plateOutline=mesh.outlinePoints?'M'+mesh.outlinePoints.map(sculptProject).map(p=>p.join(',')).join('L')+'Z':contour;n.mask.setAttribute('d',contour);n.fill.setAttribute('d',contour);n.outline.setAttribute('d',plateOutline);drawFacets(n,mesh,sculptProject,depth);n.fiber.setAttribute('d','');});
  }
  if(visible)composition.drawFat(visible,nodes.length,AtlasContour,true,'sculpt');
  sculptLabelRoot.setAttribute('aria-hidden',String(mode!=='sculpt'||!showMuscles));
  sculptLabelNodes.forEach((label,id)=>{label.g.style.display='none';if(mode!=='sculpt'||!showMuscles||!visible)return;const index=groups.findIndex(group=>group.id===id),mesh=meshes[index];if(!mesh)return;const points=visible.centers[index]||[],targets=points.length?points:mesh.v.map(sculptProject),stride=Math.max(1,Math.ceil(targets.length/64));let sx=0,sy=0,count=0;for(let i=0;i<targets.length;i+=stride){sx+=targets[i][0];sy+=targets[i][1];count++;}if(!count)return;const target=[sx/count,sy/count],[x,y]=sculptLabelPositions[view][id],anchor=x<320?'start':'end';label.text.setAttribute('x',x);label.text.setAttribute('y',y);label.text.setAttribute('text-anchor',anchor);label.g.style.display='';AnatomyLabelLeader(label.line,label.text,target);});
  drawLandmark(landmark,angle,project,sculptProject,forearm,mode);
 }
 return{render,groups,landmarks};
}
