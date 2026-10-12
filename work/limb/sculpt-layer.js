/* Artist blockouts use a regular longitudinal quad cage. Source surfaces
   supply posed control points only; no atlas triangles are decimated. */
function NativeLimbSculptLayer(root,model,region,composition){
 const svg=root.querySelector('svg'),defs=svg.querySelector('defs'),NS='http://www.w3.org/2000/svg';
 const make=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.appendChild(n);return n;};
 const header=make('g',{class:'sculpt-mode-header','aria-hidden':'true'},svg),divider=make('path',{d:'M300 0V630',class:'sculpt-divider'},header),leftTitle=make('text',{x:'16',y:'20',class:'sculpt-mode-title'},header),rightTitle=make('text',{x:'584',y:'20','text-anchor':'end',class:'sculpt-mode-title'},header),rootLayer=make('g',{class:'sculpt-volumes','aria-hidden':'true'},svg);svg.appendChild(header);
 leftTitle.textContent='해부학';rightTitle.textContent='도형화';
 composition.mountFat(make,rootLayer,'sculpt');
 const palette={blue:'#4faef0',orange:'#ffad50',green:'#43c987',pink:'#ef789d',purple:'#a98de8',red:'#f07c72',bone:'#e8ddcb'};
 const shade=(hex,f)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*f))).toString(16).padStart(2,'0')).join('');
 const parts=(()=>{
  const all=model.parts.filter(p=>p.kind==='muscle'||p.kind==='bone');
  if(region==='thigh'){
   // Keep the major surface forms; deep quadriceps and small hamstring heads
   // add clutter without helping the blockout silhouette.
   const groups=[
    ['rectus-femoris','#ff6852',['rectus-femoris']],
    ['vastus-mass','#ffb536',['vastus-lateralis','vastus-medialis']],
    ['lateral-hamstrings','#32a9ed',['biceps-femoris-long','biceps-femoris-short']],
    ['medial-hamstrings','#2cc5aa',['semitendinosus','semimembranosus']],
    ['sartorius','#be79eb',['sartorius']],
    ['adductor-longus','#986de5',['adductor-longus']]
   ].map(([name,sculptColor,names])=>{const members=all.filter(p=>names.includes(p.name));return{name,kind:'muscle',sculptColor,members,v:members.flatMap(p=>p.v)};});
   return[...groups,...all.filter(p=>p.kind==='bone').map(part=>({...part,members:[part]}))];
  }
  if(region!=='forearm')return all.map(part=>({...part,members:[part]}));
  const muscles=model.parts.filter(p=>p.kind==='muscle'),groups=[
   ['blue','radial-mass',['blue']],['orange','flexor-mass',['orange']],['green','extensor-mass',['green']],['pink','pronator-teres-mass',['pink']]
  ].flatMap(([color,name,keys])=>{const prefixes=keys.flatMap(key=>model.groups?.[key]||[]),members=muscles.filter(p=>p.name!=='flexor-digitorum-profundus'&&prefixes.some(prefix=>p.name.startsWith(prefix)));return members.length?[{name,kind:'muscle',color,members,v:members.flatMap(p=>p.v)}]:[];});
  const majorBones=['humerus','radius','ulna'],bones=all.filter(p=>p.kind==='bone'&&majorBones.includes(p.name)).map(part=>({...part,members:[part]})),hand=model.parts.filter(p=>p.kind==='bone'&&!majorBones.includes(p.name));
  if(hand.length)bones.push({name:'hand-block',kind:'bone',color:'bone',members:hand,v:hand.flatMap(p=>p.v)});
  return[...groups,...bones];
 })();
 const nodes=parts.map((part,id)=>{const g=make('g',{'data-kind':part.kind,'data-sculpt-part':part.name},rootLayer),clip=make('clipPath',{id:'limb-sculpt-clip-'+id},defs),mask=make('path',{},clip),base=part.sculptColor||palette[part.color]||palette.bone,fill=make('path',{class:'sculpt-fill','fill':base},g),facets=make('g',{'class':'sculpt-facets','clip-path':'url(#limb-sculpt-clip-'+id+')'},g),outline=make('path',{class:'sculpt-outline',fill:'none'},g),fiber=make('path',{class:'sculpt-form-lines',fill:'none','clip-path':'url(#limb-sculpt-clip-'+id+')'},g),form=part.name==='vastus-mass'?bindVastusForm(part):(part.name==='rectus-femoris'||region==='forearm'&&part.kind==='muscle')?bindForearmForm(part):null,nativeFaces=part.kind==='bone'?boneFaces(part):null;return{part,g,mask,fill,facets,outline,fiber,paths:[],base,form,nativeFaces};});
 function quantile(values,t){const a=values.slice().sort((x,y)=>x-y);return a[Math.max(0,Math.min(a.length-1,Math.floor((a.length-1)*t)))]||0;}
 function boneFaces(part){let offset=0;return part.members.flatMap(member=>{const faces=member.f.map(face=>face.map(index=>index+offset));offset+=member.v.length;return faces;});}
 function bindVastusForm(part){
  // Enclose both muscle bellies with broad supporting planes. A median-centered
  // ellipse loses their lateral volume; a second taper also erases the low bulge.
  const source=part.members.flatMap(member=>member.v.flatMap((p,index)=>p[1]<=member.materialGuide.thresholdY?[{p,index,name:member.name}]:[])),lo=Math.min(...source.map(q=>q.p[1])),hi=Math.max(...source.map(q=>q.p[1])),span=hi-lo,stations=[0,.16,.36,.57,.78,.94,1],segments=8;
  const sections=stations.map(t=>{const y=lo+span*t;let local=source.filter(q=>Math.abs(q.p[1]-y)<span*.045);if(local.length<16)local=source.slice().sort((a,b)=>Math.abs(a.p[1]-y)-Math.abs(b.p[1]-y)).slice(0,24);const xs=local.map(q=>q.p[0]),zs=local.map(q=>q.p[2]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
   const supports=Array.from({length:segments},(_,j)=>{const a=2*Math.PI*(j+.5)/segments;return Math.max(...local.map(q=>(q.p[0]-cx)*Math.cos(a)+(q.p[2]-cz)*Math.sin(a)));});return{y,cx,cz,supports};
  });
  const v=[],rings=[];sections.forEach((q,r)=>{const ring=[];for(let j=0;j<segments;j++){const prev=(j+segments-1)%segments,a=2*Math.PI*(prev+.5)/segments,b=2*Math.PI*(j+.5)/segments,u=[Math.cos(a),Math.sin(a)],w=[Math.cos(b),Math.sin(b)],d=u[0]*w[1]-u[1]*w[0],h=q.supports[prev],k=q.supports[j];ring.push(v.length);v.push([q.cx+(h*w[1]-k*u[1])/d,q.y,q.cz+(u[0]*k-w[0]*h)/d]);}rings.push(ring);});
  const faces=[];for(let r=0;r<rings.length-1;r++)for(let j=0;j<segments;j++)faces.push([rings[r][j],rings[r][(j+1)%segments],rings[r+1][(j+1)%segments],rings[r+1][j]]);faces.push(rings[0].slice().reverse(),rings.at(-1).slice());
  const controls=v.map(point=>{const near=source.map(q=>({...q,d:q.p.reduce((n,x,k)=>n+(x-point[k])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,6),sum=near.reduce((n,q)=>n+1/(q.d+4),0);return near.map(q=>({...q,weight:1/(q.d+4)/sum}));});
  return{v,faces,rings,controls};
 }
 function bindForearmForm(part){
  const add=(a,b)=>a.map((x,k)=>x+b[k]),sub=(a,b)=>a.map((x,k)=>x-b[k]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((n,x,k)=>n+x*b[k],0),unit=a=>mul(a,1/(Math.hypot(...a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  // Tendon vertices may reach the fingertips. Only the authored muscle belly
  // belongs to the colored mass; its direction is fitted once in the rest pose.
  const source=part.members.flatMap(member=>member.v.flatMap((p,index)=>p[1]<=(member.materialGuide?.thresholdY??Infinity)?[{p,index,name:member.name}]:[])),center=source.reduce((sum,q)=>add(sum,mul(q.p,1/source.length)),[0,0,0]),cov=Array.from({length:3},()=>[0,0,0]);
  source.forEach(q=>{const p=sub(q.p,center);for(let i=0;i<3;i++)for(let j=0;j<3;j++)cov[i][j]+=p[i]*p[j]/source.length;});
  const transform=v=>cov.map(row=>dot(row,v));let axis=[0,1,0];for(let i=0;i<24;i++)axis=unit(transform(axis));if(axis[1]<0)axis=mul(axis,-1);
  let width=unit(cross(axis,[0,0,1]));for(let i=0;i<24;i++){const q=transform(width);width=unit(sub(q,mul(axis,dot(q,axis))));}const normal=unit(cross(axis,width)),coords=source.map(q=>({...q,s:dot(q.p,axis),u:dot(q.p,width),w:dot(q.p,normal)})),lo=quantile(coords.map(q=>q.s),.005),hi=quantile(coords.map(q=>q.s),.995),span=hi-lo,stations=[0,.10,.24,.42,.60,.76,.90,1],window=span*.12;
  const samples=stations.map(t=>{const at=lo+span*t;let local=coords.filter(q=>Math.abs(q.s-at)<=window/2);if(local.length<12)local=coords.slice().sort((a,b)=>Math.abs(a.s-at)-Math.abs(b.s-at)).slice(0,24);const us=local.map(q=>q.u),ws=local.map(q=>q.w),u0=quantile(us,.04),u1=quantile(us,.96),w0=quantile(ws,.04),w1=quantile(ws,.96);return{at,u:(u0+u1)/2,w:(w0+w1)/2,rx:Math.max(.6,(u1-u0)/2),rz:Math.max(.6,(w1-w0)/2)};});
  const smooth=samples.map((q,i)=>i===0||i===samples.length-1?q:Object.fromEntries(Object.entries(q).map(([key,value])=>[key,key==='at'?value:.25*samples[i-1][key]+.5*value+.25*samples[i+1][key]]))),v=[],rings=[];
  smooth.forEach((q,r)=>{const ring=[],cap=r===0||r===smooth.length-1?.24:1;for(let j=0;j<8;j++){const angle=2*Math.PI*j/8,flat=x=>Math.sign(x)*Math.abs(x)**.85;ring.push(v.length);v.push(add(add(mul(axis,q.at),mul(width,q.u+flat(Math.cos(angle))*q.rx*cap)),mul(normal,q.w+flat(Math.sin(angle))*q.rz*cap)));}rings.push(ring);});
  const faces=[];for(let r=0;r<rings.length-1;r++)for(let j=0;j<8;j++)faces.push([rings[r][j],rings[r][(j+1)%8],rings[r+1][(j+1)%8],rings[r+1][j]]);faces.push(rings[0].slice().reverse(),rings.at(-1).slice());
  // Transport the authored cage with nearby atlas vertices, rather than
  // rebuilding upright cylinders after each change in forearm rotation.
  const controls=v.map(point=>{const near=source.map(q=>({...q,d:q.p.reduce((n,x,k)=>n+(x-point[k])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,6),sum=near.reduce((n,q)=>n+1/(q.d+4),0);return near.map(q=>({...q,weight:1/(q.d+4)/sum}));});
  return{v,faces,rings,controls};
 }
 function poseForearmForm(form,posed){return{...form,v:form.v.map((point,i)=>point.map((x,k)=>x+form.controls[i].reduce((sum,q)=>sum+(((posed.get(q.name)||[])[q.index]?.[k]??q.p[k])-q.p[k])*q.weight,0)))};}
 function blockout(points,isBone){
  if(!points||points.length<8)return null;
  let lo=Infinity,hi=-Infinity;for(const p of points){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);}const span=hi-lo;if(span<1e-5)return null;
  const rows=6,segments=8,window=span/(rows-1)*1.8,samples=[];
  for(let r=0;r<rows;r++){
   const t=r/(rows-1),y=lo+span*t;let slice=points.filter(p=>Math.abs(p[1]-y)<=window/2);
   if(slice.length<8)slice=points.slice().sort((a,b)=>Math.abs(a[1]-y)-Math.abs(b[1]-y)).slice(0,Math.min(32,points.length));
   samples.push({y,cx:quantile(slice.map(p=>p[0]),.5),cz:quantile(slice.map(p=>p[2]),.5),rx:Math.max(.8,(quantile(slice.map(p=>p[0]),.92)-quantile(slice.map(p=>p[0]),.08))*.56),rz:Math.max(.8,(quantile(slice.map(p=>p[2]),.92)-quantile(slice.map(p=>p[2]),.08))*.56),t});
  }
  const smooth=samples.map((s,i)=>{const near=samples.slice(Math.max(0,i-1),Math.min(rows,i+2));return Object.fromEntries(['cx','cz','rx','rz'].map(k=>[k,near.reduce((n,q)=>n+q[k],0)/near.length]));});
  const v=[],rings=[];for(let r=0;r<rows;r++){
    const s=samples[r],q=smooth[r],end=isBone?.82:.34+Math.sin(Math.PI*s.t)**.72*.72,ring=[];
   for(let j=0;j<segments;j++){
    const a=2*Math.PI*j/segments,co=Math.cos(a),si=Math.sin(a),flat=(x)=>Math.sign(x)*Math.abs(x)**.82;
    ring.push(v.length);v.push([q.cx+flat(co)*q.rx*end,s.y,q.cz+flat(si)*q.rz*end]);
   }rings.push(ring);
  }
  const faces=[];for(let r=0;r<rows-1;r++)for(let j=0;j<segments;j++)faces.push([rings[r][j],rings[r][(j+1)%segments],rings[r+1][(j+1)%segments],rings[r+1][j]]);
  faces.push(rings[0].slice().reverse(),rings.at(-1).slice());return{v,faces,rings};
 }
 function colorFor(node,face,mesh){
  const a=mesh.v[face[0]],b=mesh.v[face[1]],c=mesh.v[face[2]],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1,light=[-.35,.58,.74],dot=Math.max(0,n.reduce((s,x,i)=>s+x*light[i],0)/len);return shade(node.base,.96+dot*.12);
 }
 const panel=document.createElementNS(NS,'clipPath');panel.id='limb-sculpt-panel';panel.setAttribute('clipPathUnits','userSpaceOnUse');make('rect',{x:'300',y:'0',width:'300',height:'630'},panel);defs.appendChild(panel);
 const anatomyPanel=document.createElementNS(NS,'clipPath');anatomyPanel.id='limb-anatomy-panel';anatomyPanel.setAttribute('clipPathUnits','userSpaceOnUse');make('rect',{x:'0',y:'0',width:'300',height:'630'},anatomyPanel);defs.appendChild(anatomyPanel);
 function render(debug,view,mode,showMuscles,transparent,fibersOn){
  rootLayer.style.display=mode==='anatomy'?'none':'';if(mode==='compare')rootLayer.setAttribute('clip-path','url(#limb-sculpt-panel)');else rootLayer.removeAttribute('clip-path');
  header.style.display=mode==='compare'?'':'none';
  leftTitle.setAttribute('x','16');rightTitle.setAttribute('x','584');
  if(mode==='compare'){leftTitle.textContent='해부학';rightTitle.textContent='도형화';}
  const yaw=model.pose.cameraYawByView?.[view]??model.pose.cameraYaw[['front','side','back'].indexOf(view)],a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a),all=model.parts.flatMap(p=>p.v),lo=Math.min(...all.map(p=>p[1])),hi=Math.max(...all.map(p=>p[1])),scale=565/(hi-lo),cx=all.reduce((n,p)=>n+p[0]/all.length,0),cz=all.reduce((n,p)=>n+p[2]/all.length,0),center=mode==='compare'?450:300,project=p=>[center+((p[0]-cx)*c+(p[2]-cz)*s)*scale,20+(p[1]-lo)*scale],depth=p=>-p[0]*s+p[2]*c;
  const posedByName=new Map((debug?.posed||[]).map(p=>[p.name,p.v])),pointsFor=part=>part.members?part.members.flatMap(member=>posedByName.get(member.name)||member.v):posedByName.get(part.name)||part.v,meshes=nodes.map(n=>n.part.kind==='muscle'&&!showMuscles?null:n.form?poseForearmForm(n.form,posedByName):n.nativeFaces?{v:pointsFor(n.part),faces:n.nativeFaces,rings:[]}:blockout(pointsFor(n.part),n.part.kind==='bone'));
  const buffer=AbdominalVisibility({project,depth,step:1});meshes.forEach((mesh,id)=>mesh?.faces.forEach(face=>{if(face.length===4)buffer.quad(face.map(i=>mesh.v[i]),id);else for(let j=1;j<face.length-1;j++)buffer.triangle(mesh.v[face[0]],mesh.v[face[j]],mesh.v[face[j+1]],id);}));
  const fatCount=composition.paintFat(buffer,model.parts.map(p=>posedByName.get(p.name)||p.v),nodes.length,meshes);
  const visible=buffer.solve(nodes.length+fatCount,{projections:true,scanlineClips:false,occludes:id=>id>=nodes.length?!composition.fatTransparent:id<0||nodes[id].part.kind==='bone'||!transparent});
  nodes.forEach((node,id)=>{
   const mesh=meshes[id];if(!mesh){node.g.style.display='none';return;}node.g.style.display='';node.g.setAttribute('opacity',transparent&&node.part.kind==='muscle'?.48:1);
   const local=visible.ownerZ[id],inside=k=>transparent&&node.part.kind==='muscle'?local[k]>-Infinity:visible.owners[k]===id,contour=AtlasContour(visible,inside,visible.bounds[id]);node.mask.setAttribute('d',contour);node.fill.setAttribute('d',contour);node.outline.setAttribute('d',contour);
   const faces=node.nativeFaces?[]:mesh.faces,ordered=[];while(node.paths.length<faces.length)node.paths.push(make('path',{class:'sculpt-facet'},node.facets));
   faces.forEach((face,i)=>{const path=node.paths[i],points=face.map(k=>mesh.v[k]);path.setAttribute('d','M'+points.map(project).map(p=>p.join(',')).join('L')+'Z');path.setAttribute('fill',colorFor(node,face,mesh));ordered.push({path,z:points.reduce((sum,p)=>sum+depth(p),0)/points.length});});
   node.paths.slice(faces.length).forEach(path=>path.setAttribute('d',''));ordered.sort((x,y)=>x.z-y.z).forEach(item=>node.facets.appendChild(item.path));
   if(fibersOn&&node.part.kind==='muscle'){
    const front=mesh.rings.map(ring=>ring.reduce((best,index)=>depth(mesh.v[index])>depth(mesh.v[best])?index:best,ring[0])),paths=[];
    for(const offset of region==='thigh'?[0]:[-1,0,1]){const points=front.map((index,row)=>{const ring=mesh.rings[row],at=ring.indexOf(index),next=ring[(at+offset+ring.length)%ring.length];return project(mesh.v[next]);});paths.push('M'+points.map(p=>p.join(',')).join('L'));}
    node.fiber.setAttribute('d',paths.join(''));node.fiber.style.display='';
   }else node.fiber.setAttribute('d','');
  });
  composition.drawFat(visible,nodes.length,AtlasContour,true,'sculpt');
 }
 return{render,root:rootLayer,header,anatomyPanel};
}
