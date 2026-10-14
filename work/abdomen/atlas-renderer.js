/* Geometry: BodyParts3D 3.0, © DBCLS, CC BY-SA 2.1 Japan.
 * STL conversion: Kevin Mattheus Moerman. See ATLAS_REVIEW.md.
 * This is a static atlas with illustrative skeletal motion and fascicles,
 * not a measured tissue-strain or muscle-activation simulation. */
function AbdomenFlexion(host){
 const atlas=JSON.parse(document.getElementById('abdomen-atlas').textContent);
 const svg=host.querySelector('svg'),defs=svg.querySelector('defs'),volume=svg.querySelector('.diagram-volumes'),labels=svg.querySelector('.diagram-labels');
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);parent?.append(n);return n;};
 const sculptDrawing=make('g',{'class':'sculpt-volumes','data-display-layer':'sculpt'},volume.parentNode);svg.insertBefore(sculptDrawing,labels);
 const anatomyClip=make('clipPath',{id:'abdomen-anatomy-half',clipPathUnits:'userSpaceOnUse'},defs),sculptClip=make('clipPath',{id:'abdomen-sculpt-half',clipPathUnits:'userSpaceOnUse'},defs);make('rect',{x:0,y:0,width:320,height:515},anatomyClip);make('rect',{x:320,y:0,width:320,height:515},sculptClip);
 const modeHeader=make('g',{class:'abdomen-mode-header','aria-hidden':'true'},svg);make('path',{d:'M320 0V515',class:'sculpt-divider'},modeHeader);make('text',{x:16,y:19},modeHeader).textContent='해부학';make('text',{x:624,y:19,'text-anchor':'end'},modeHeader).textContent='도형화';
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const qm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
 const qr=(q,p)=>{const t=mul(cross(q.slice(0,3),p),2);return add(p,add(mul(t,q[3]),cross(q.slice(0,3),t)));};
 const dual=(q,t)=>({q,d:mul(qm([...t,0],q),.5)}),apply=(f,p)=>add(qr(f.q,p),mul(qm(f.d,[-f.q[0],-f.q[1],-f.q[2],f.q[3]]).slice(0,3),2));
 const identity=dual([0,0,0,1],[0,0,0]);
 const matrices=new WeakMap();
 function rigid(f,p){let m=matrices.get(f);if(!m){const [x,y,z,w]=f.q,t=apply(f,[0,0,0]);m=[1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),t[0],2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),t[1],2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y),t[2]];matrices.set(f,m);}return [m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]];}
 const blend=items=>{let q=[0,0,0,0],d=[0,0,0,0];const reference=items[0][0].q;for(const [f,w]of items){const sign=dot(reference,f.q)<0?-1:1;q=add(q,mul(f.q,w*sign));d=add(d,mul(f.d,w*sign));}const norm=Math.hypot(...q);q=mul(q,1/norm);d=mul(d,1/norm);d=sub(d,mul(q,dot(q,d)));return {q,d};};
 const spine=atlas.spine.slice().sort((a,b)=>a[1]-b[1]),top=spine[1][1],lumbar=spine.find((_,i)=>i===13)[1],bottom=spine.at(-1)[1];
 function center(y){if(y<=spine[0][1])return [0,y,spine[0][2]];if(y>=bottom)return [0,y,spine.at(-1)[2]];let i=1;while(spine[i][1]<y)i++;const a=spine[i-1],b=spine[i],t=(y-a[1])/(b[1]-a[1]);return [0,y,a[2]+(b[2]-a[2])*t];}
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
 let frames=[],pose={angle:0,view:'front'},bodyFrames=new Map(),posedCenters=new Map();
 function yawAt(y,a){return a*(y>lumbar?5/60*smooth((bottom-y)/(bottom-lumbar)):5/60+55/60*smooth((lumbar-y)/(lumbar-top)));}
 function bendAt(y,a){return a*Math.PI/180*(y>lumbar?.5*smooth((bottom-y)/(bottom-lumbar)):.5+.5*smooth((lumbar-y)/(lumbar-top)));}
 function body(y){const key=Math.round(y*2)/2;if(bodyFrames.has(key))return bodyFrames.get(key);const c=center(key);let q,t;
  if(pose.view==='twist'){const a=yawAt(key,pose.angle)*Math.PI/180;q=[0,Math.sin(a/2),0,Math.cos(a/2)];t=sub(c,qr(q,c));}
  else {const angle=pose.angle*.6,bend=bendAt(key,angle);q=[-Math.sin(bend/2),0,0,Math.cos(bend/2)];const pc=key>=bottom?c:posedCenters.get(key);t=sub(pc,qr(q,c));
  }const f=dual(q,t);bodyFrames.set(key,f);return f;
 }
 const boneParts=atlas.parts.filter(p=>p.bone!==undefined).sort((a,b)=>a.bone-b.bone);
 function skeleton(){frames=boneParts.map(p=>p.joint==='pelvis'?identity:body(p.level??top));
  // A scapula remains rigid. Its frame follows multiple actual rib contact
  // guides, rather than applying T1 yaw to every scapular point independently.
  for(const p of boneParts.filter(p=>p.joint==='scapula')){
   const guides=atlas.mounts.map(m=>({...m,point:[m.point[0]*p.side,m.point[1],m.point[2]]}));
   const q=blend(guides.map(m=>[frames[m.bone+(p.side<0?1:0)],1/guides.length])).q;
   let t=guides.reduce((s,m)=>add(s,mul(sub(apply(frames[m.bone+(p.side<0?1:0)],m.point),qr(q,m.point)),1/guides.length)),[0,0,0]);
   const contacts=guides.map(m=>{let closest=p.v[0],distance=Infinity;for(const v of p.v){const d=Math.hypot(...sub(v,m.point));if(d<distance){distance=d;closest=v;}}
    const radial=sub(m.point,center(m.point[1]));radial[1]=0;const normal=mul(radial,1/Math.hypot(...radial)),frame=frames[m.bone+(p.side<0?1:0)];
    return {scapular:qr(q,closest),costal:apply(frame,m.point),normal:qr(frame.q,normal),gap:dot(sub(closest,m.point),normal)};
   });
   // Maintain neutral scapulocostal separation at the measured contact
   // guides. This constrains a rigid scapula, not an invented muscle shell.
   for(let iteration=0;iteration<12;iteration++)for(const m of contacts){const deficit=m.gap-dot(sub(add(m.scapular,t),m.costal),m.normal);if(deficit>0)t=add(t,mul(m.normal,deficit));}
   frames[p.bone]=dual(q,t);
  }
 }
 function skin(p,b){
  if(b[1]===1&&b[3]===0&&b[5]===0)return rigid(frames[b[0]],p);
  if(b[1]+b[3]+b[5]===0)return rigid(body(p[1]),p);
  let x=0,y=0,z=0,w=0,dx=0,dy=0,dz=0,dw=0,total=0;const reference=frames[b[0]].q;
  const accumulate=(f,weight)=>{const q=f.q,d=f.d;if(q[0]*reference[0]+q[1]*reference[1]+q[2]*reference[2]+q[3]*reference[3]<0)weight=-weight;x+=q[0]*weight;y+=q[1]*weight;z+=q[2]*weight;w+=q[3]*weight;dx+=d[0]*weight;dy+=d[1]*weight;dz+=d[2]*weight;dw+=d[3]*weight;};
  for(let i=0;i<6;i+=2)if(b[i+1]>0){accumulate(frames[b[i]],b[i+1]);total+=b[i+1];}if(total<.99999)accumulate(body(p[1]),Math.max(0,1-total));
  const norm=Math.hypot(x,y,z,w);x/=norm;y/=norm;z/=norm;w/=norm;dx/=norm;dy/=norm;dz/=norm;dw/=norm;const correction=x*dx+y*dy+z*dz+w*dw;dx-=x*correction;dy-=y*correction;dz-=z*correction;dw-=w*correction;
  const tx=2*(y*p[2]-z*p[1]),ty=2*(z*p[0]-x*p[2]),tz=2*(x*p[1]-y*p[0]);
  return [p[0]+w*tx+y*tz-z*ty+2*(-dw*x+dx*w-dy*z+dz*y),p[1]+w*ty+z*tx-x*tz+2*(-dw*y+dx*z+dy*w-dz*x),p[2]+w*tz+x*ty-y*tx+2*(-dw*z-dx*y+dy*x+dz*w)];
 }
 const widthAt=y=>{const rectus=atlas.parts.find(p=>p.name==='rectus');let width=0;for(const v of rectus.v)if(Math.abs(v[1]-y)<6)width=Math.max(width,v[0]);return width||30;};
 const rawWidth=new Map();for(let y=235;y<=505;y++)rawWidth.set(y,widthAt(y));
 const raWidth=new Map();for(let y=250;y<=490;y++){let sum=0,weight=0;for(let d=-12;d<=12;d++){const w=Math.exp(-d*d/50);sum+=rawWidth.get(y+d)*w;weight+=w;}raWidth.set(y,sum/weight);}
 const raEdge=y=>raWidth.get(Math.round(clamp(y,250,490)))||30;
 // Bridge the mirrored atlas's tiny midline segmentation gap with fascia.
 // Its sagittal depth comes from the actual medial aponeurotic vertices.
 const eo=atlas.parts.find(p=>p.name==='external-oblique'),medial=eo.v.map((p,i)=>({p,i})).filter(({p})=>p[0]<4),fascia={name:'linea-alba',kind:'muscle',v:[],f:[],bind:[],fibers:[]};
 const medialMin=Math.min(...medial.map(({p})=>p[1])),medialMax=Math.max(...medial.map(({p})=>p[1]));
 for(let y=medialMin;y<=medialMax+1;y+=4){const near=medial.slice().sort((a,b)=>Math.abs(a.p[1]-y)-Math.abs(b.p[1]-y))[0];for(const x of [-2.3,2.3]){fascia.v.push([x,y,near.p[2]+.2]);fascia.bind.push(eo.bind[near.i].slice());}const n=fascia.v.length;if(n>2)fascia.f.push([n-4,n-3,n-1],[n-4,n-1,n-2]);}atlas.parts.push(fascia);
 const muscles=['serratus','external-oblique','internal-oblique','rectus','latissimus'];
 // Cut the atlas triangles at the illustration's exposed rectus and deep
 // layer windows. Interpolate on the original triangle; do not move its shell.
 function cut(part,polygon,field,positive=true){const out=[];if(!polygon.length)return out;
  const value=i=>field(part.v[i])*(positive?1:-1);
  for(let k=0;k<polygon.length;k++){const a=polygon[k],b=polygon[(k+1)%polygon.length],va=value(a),vb=value(b);if(va>=0)out.push(a);
   if((va>=0)!==(vb>=0)){const t=va/(va-vb),point=add(mul(part.v[a],1-t),mul(part.v[b],t)),weights=new Map();
    for(const [i,w]of [[a,1-t],[b,t]])for(let j=0;j<6;j+=2){const bind=part.bind[i];weights.set(bind[j],(weights.get(bind[j])||0)+bind[j+1]*w);}
    const pairs=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,3);while(pairs.length<3)pairs.push([0,0]);part.v.push(point);part.bind.push(pairs.flat());out.push(part.v.length-1);
   }
  }return out;
 }
 const windowField=p=>Math.abs(p[0])<48?1:((p[1]-374)/22)**2+((p[2]-66)/15)**2-1;
 function exposedFaces(part,group){const faces=[],triangle=poly=>{for(let i=1;i<poly.length-1;i++)faces.push([poly[0],poly[i],poly[i+1]]);};
  for(const f of part.f){let p=f;
   if(part.name.startsWith('external-oblique')){
    const outside=cut(part,p,windowField);
    if(group==='muscle')triangle(cut(part,outside,v=>Math.abs(v[0])-raEdge(v[1])-14));
    else {triangle(cut(part,cut(part,outside,v=>Math.abs(v[0])-raEdge(v[1])-14,false),v=>Math.abs(v[0])-raEdge(v[1])-1));triangle(cut(part,outside,v=>Math.abs(v[0])-2,false));}
   }else if(part.name.startsWith('internal-oblique'))triangle(cut(part,p,windowField,false));else triangle(p);
  }return faces;
 }
 let surfaces=[];
 for(const part of atlas.parts){
  const groups=part.name.startsWith('external-oblique')?['muscle','aponeurosis']:['surface'];
  for(const group of groups){const faces=exposedFaces(part,group);
   if(!faces.length)continue;const id=surfaces.length,g=make('g',{'data-atlas-part':part.name,'data-atlas-layer':group},volume);
   const muscle=muscles.find(name=>part.name.startsWith(name));if(muscle)g.setAttribute('data-muscle',muscle);
   const clip=make('clipPath',{id:'atlas-clip-'+id,clipPathUnits:'userSpaceOnUse'},defs),mask=make('path',{},clip);
   const type=part.kind==='muscle'?(group==='aponeurosis'||part.name==='linea-alba'?'aponeurosis':'muscle'):part.kind==='context'?'context-muscle':part.kind==='cartilage'?'cartilage':part.kind==='rib'?'rib':'bone';
   const fill=make('path',{class:type,style:'stroke:none',fill:part.color&&part.color!=='context'&&group!=='aponeurosis'?'color-mix(in srgb,var(--'+part.color+') 85%,white)':type==='aponeurosis'||type==='cartilage'?'var(--background)':type==='context-muscle'?'color-mix(in srgb,var(--foreground) 9%,var(--background))':'color-mix(in srgb,var(--foreground) 10%,var(--background))'},g);
   const outline=make('path',{fill:'none',stroke:'var(--muted-foreground)','stroke-width':part.kind==='bone'?1.05:.65,'stroke-opacity':.75},g);
   const fibers=make('path',{class:'fibers fiber',fill:'none',stroke:'var(--foreground)',style:'stroke-width:.55;stroke-opacity:.28'},g);
   const intersections=part.name.startsWith('rectus')?make('path',{fill:'none',stroke:'var(--background)','stroke-width':3.4},g):null;
   surfaces.push({part,faces,group,g,mask,fill,outline,fibers,intersections,id,muscle});
  }
 }
 const names={'serratus':['전거근',558,183],'external-oblique':['외복사근',82,262],'internal-oblique':['내복사근',558,367],'rectus':['복직근',82,430],'latissimus':['광배근',82,335]};
 const labelNodes=Object.entries(names).map(([name,[text,x,y]])=>{const g=make('g',{'data-label':name},labels),line=make('path',{fill:'none',stroke:'var(--muted-foreground)','stroke-width':1},g),t=make('text',{x,y,'text-anchor':x<320?'start':'end',fill:'var(--foreground)'},g);t.textContent=text;return {name,x,y,line,text:t};});
 const partIndices=new Map(atlas.parts.map(p=>[p,[...new Set(surfaces.filter(m=>m.part===p).flatMap(m=>m.faces.flat()))]]));
 const offsets=new Map();for(const degrees of [0,16,90]){const a=degrees*Math.PI/180;let min=Infinity,max=-Infinity;for(const p of boneParts)for(const v of p.v){const x=v[0]*Math.cos(a)+v[2]*Math.sin(a);min=Math.min(min,x);max=Math.max(max,x);}offsets.set(degrees,degrees===0?320:320-(min+max)*1.04/2);}
 const lightSurfaces=AnatomySurfaceLighting(make,surfaces.filter(m=>m.part.kind==='muscle'&&m.group!=='aponeurosis'&&m.part.name!=='linea-alba').map(m=>({owner:m.id,g:m.g,clip:'url(#atlas-clip-'+m.id+')',anchor:m.outline,fill:m.fill})),{depthScale:1.04});
 const composition=AnatomyComposition(host,atlas.parts,'abdomen'),landmarks=AnatomyLandmarks(host,atlas.parts,'abdomen');composition.mountFat(make,volume);
 composition.mountFat(make,sculptDrawing,'sculpt');
 const partIndex=new Map(atlas.parts.map((part,id)=>[part.name,id])),sculptGeometry=AbdomenSculptForms(atlas),families=[
   {id:'pectoral-major',parts:['pectoral-clavicular','pectoral-sternal','pectoral-abdominal'],color:'#e8e9eb',normal:()=>[0,0,1]},
   {id:'serratus',color:'#4fcfa5',thickness:9,normal:side=>[side,0,.42]},
   {id:'rectus',color:'#fa687c',thickness:14,normal:()=>[0,0,1]},
   {id:'latissimus',color:'#b68cf0',thickness:14,normal:()=>[0,0,-1]}
 ],muscleGroups=[];
 for(const family of families)for(const suffix of ['','-right']){const name=family.id+suffix,partIds=(family.parts||[family.id]).map(part=>partIndex.get(part+suffix)).filter(Number.isInteger);if(!partIds.length)continue;const part=atlas.parts[partIds[0]],group={id:name,family:family.id,kind:'muscle',partIds,color:family.color,thickness:family.thickness,normal:family.normal(part.side||1)};group.form=sculptGeometry.bind(group);muscleGroups.push(group);}
 const sculptColors={bone:'#ddd7ce',rib:'#e3ddd3',cartilage:'#c9ded7',context:'#d8d7d4'},sculptGroups=[{id:'torso-mass',family:'torso',kind:'muscle',color:'#efb965'},...muscleGroups,...atlas.parts.flatMap((part,id)=>['muscle','context'].includes(part.kind)?[]:[{id:part.name,family:'skeleton',kind:part.kind,partIds:[id],color:sculptColors[part.kind]||sculptColors.bone,native:true}])];
 const sculptNodes=sculptGroups.map((group,id)=>{const g=make('g',{'data-part':group.id,'data-kind':group.kind,'data-display-layer':'sculpt'},sculptDrawing),clip=make('clipPath',{id:'abdomen-sculpt-part-'+id},defs),mask=make('path',{},clip),fill=make('path',{class:'sculpt-fill',fill:group.color},g),facets=make('g',{'class':'sculpt-facets','clip-path':'url(#abdomen-sculpt-part-'+id+')'},g),outline=make('path',{class:'sculpt-outline',fill:'none'},g),fiber=make('path',{class:'sculpt-form-lines',fill:'none','clip-path':'url(#abdomen-sculpt-part-'+id+')'},g);return{g,mask,fill,facets,outline,fiber,facetPaths:[],group,id,color:group.color};});
 const shadeColor=(hex,factor)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor))).toString(16).padStart(2,'0')).join('');
  sculptNodes.forEach((node,id)=>{if(node.group.kind!=='muscle')return;const gradient=make('radialGradient',{id:'abdomen-sculpt-muscle-'+id,cx:'28%',cy:'22%',r:'92%'},defs);for(const [offset,color]of [['0%',shadeColor(node.color,1.08)],['48%',node.color],['100%',shadeColor(node.color,.98)]])make('stop',{offset,'stop-color':color},gradient);node.fill.setAttribute('fill','url(#abdomen-sculpt-muscle-'+id+')');});
 const cross3=(a,b)=>cross(a,b),unit3=a=>mul(a,1/(Math.hypot(...a)||1));
 function drawSculptFacets(node,mesh,project,depth){
  const faces=mesh.polygons,ordered=[],light=unit3([-.4,-.55,.73]);while(node.facetPaths.length<faces.length)node.facetPaths.push(make('path',{class:'sculpt-facet'},node.facets));
  faces.forEach((indices,id)=>{const points=indices.map(i=>mesh.v[i]),normal=unit3(points.reduce((sum,p,i)=>add(sum,cross3(p,points[(i+1)%points.length])),[0,0,0])),path=node.facetPaths[id],factor=node.group.family==='rectus'?.88+Math.max(0,dot(normal,light))*.28:.97+Math.max(0,dot(normal,light))*.1;path.setAttribute('d','M'+points.map(project).map(p=>p.join(',')).join('L')+'Z');path.setAttribute('fill',shadeColor(node.color,factor));ordered.push({path,z:points.reduce((sum,p)=>sum+depth(p),0)/points.length});});
  node.facetPaths.slice(faces.length).forEach(path=>path.setAttribute('d',''));ordered.sort((a,b)=>a.z-b.z).forEach(item=>node.facets.appendChild(item.path));
 }
 let lastKey='',lastDebug=null,sculptKey='',sculptMeshes=null;
 function render(angle,view='front',mode='anatomy',showMuscles=true){
  svg.setAttribute('viewBox','0 0 640 515');svg.setAttribute('height',host.clientWidth*515/640);
  const transparent=host.classList.contains('transparent'),fibersOn=!host.classList.contains('no-fibers'),key=[angle,view,mode,showMuscles,transparent,fibersOn,host.clientWidth,composition.key,landmarks.value].join();if(key===lastKey)return;lastKey=key;
  host.dataset.mode=mode;host.dataset.showMuscles=showMuscles;host.dataset.view=view;
  if(mode==='compare'){volume.setAttribute('clip-path','url(#abdomen-anatomy-half)');sculptDrawing.setAttribute('clip-path','url(#abdomen-sculpt-half)');}else{volume.removeAttribute('clip-path');sculptDrawing.removeAttribute('clip-path');}sculptDrawing.style.display=mode==='anatomy'?'none':'';modeHeader.style.display=mode==='compare'?'':'none';
  const started=performance.now();host.dataset.view=view;host.dataset.angle=angle;pose={angle,view};bodyFrames=new Map();posedCenters=new Map();
  // Integrate the original sagittal spine once at half-unit resolution.
  // Bones and all neighboring tissues consume the same centerline field.
  if(view!=='twist'){let pc=center(bottom),previous=bottom;for(let y=Math.floor(bottom*2)/2;y>=50;y-=.5){const theta=bendAt((previous+y)/2,angle*.6);pc=add(pc,qr([-Math.sin(theta/2),0,0,Math.cos(theta/2)],sub(center(y),center(previous))));posedCenters.set(y,pc);previous=y;}}
  skeleton();
  const degrees=view==='front'?0:view==='side'?90:16,a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),scale=1.04,paired=mode==='compare'&&view!=='front';
  const camera=p=>[p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];
  const offset=offsets.get(degrees),projectAt=shift=>p=>{const q=camera(p);return [offset+shift+q[0]*scale,10+(q[1]-110)*scale];},project=projectAt(paired?-160:0),sculptProject=projectAt(paired?160:0),depth=p=>camera(p)[2];
  const buffer=AbdominalVisibility({project,depth,step:1});
  const posed=new Map();for(const p of atlas.parts){posed.set(p,p.v.map((v,i)=>p.bind?skin(composition.point(p,v,i),p.bind[i]):rigid(frames[p.bone],v)));}
  let visible=null;
  if(mode!=='sculpt'){
  for(const m of surfaces){const vs=posed.get(m.part);for(const f of m.faces)buffer.triangle(...f.map(i=>vs[i]),m.id);}
  const fatCount=composition.paintFat(buffer,atlas.parts.map(p=>posed.get(p)),surfaces.length);
  visible=buffer.solve(surfaces.length+fatCount,{projections:id=>id>=surfaces.length||['muscle','context'].includes(surfaces[id].part.kind),scanlineClips:false,occludes:id=>id>=surfaces.length?!composition.fatTransparent:!transparent||!['muscle','context'].includes(surfaces[id].part.kind)});
  }
  let sculptVisible=null;
  if(mode!=='anatomy'){
   const nextSculptKey=[angle,view,composition.key].join();if(nextSculptKey!==sculptKey){sculptMeshes=sculptGroups.map(group=>group.family==='torso'?sculptGeometry.torso(point=>skin(point,[0,0,0,0,0,0])):group.kind==='muscle'?sculptGeometry.mesh(group,atlas.parts.map(part=>({v:posed.get(part)})),composition.state.muscle,point=>skin(point,[0,0,0,0,0,0])):{v:posed.get(atlas.parts[group.partIds[0]]),polygons:atlas.parts[group.partIds[0]].f});sculptKey=nextSculptKey;}
   const sculptBuffer=AbdominalVisibility({project:sculptProject,depth,step:1});
   sculptGroups.forEach((group,id)=>{if(group.kind==='muscle'&&!showMuscles)return;const mesh=sculptMeshes[id];for(const face of mesh.polygons)sculptBuffer.polygon(face.map(index=>mesh.v[index]),id);});
   const sculptFatCount=composition.paintFat(sculptBuffer,atlas.parts.map(p=>posed.get(p)),sculptGroups.length,sculptMeshes);
   sculptVisible=sculptBuffer.solve(sculptGroups.length+sculptFatCount,{projections:true,scanlineClips:false,occludes:id=>id>=sculptGroups.length?!composition.fatTransparent:!transparent||sculptGroups[id]?.kind!=='muscle'});
   sculptNodes.forEach((node,id)=>{const group=node.group,mesh=sculptMeshes[id],soft=group.kind==='muscle',show=!soft||showMuscles;if(!show){node.g.style.display='none';node.fill.setAttribute('d','');node.outline.setAttribute('d','');node.facetPaths.forEach(path=>path.setAttribute('d',''));node.fiber.setAttribute('d','');return;}node.g.style.display='';node.g.setAttribute('opacity',transparent&&soft?.44:1);
    const outline=AtlasContour(sculptVisible,k=>transparent&&soft?sculptVisible.depthAt(id,k)>-Infinity:sculptVisible.owners[k]===id,sculptVisible.bounds[id]);node.mask.setAttribute('d',outline);node.fill.setAttribute('d',outline);node.outline.setAttribute('d',outline);
    if(soft&&group.family!=='pectoral-major')drawSculptFacets(node,mesh,sculptProject,depth);else node.facetPaths.forEach(path=>path.setAttribute('d',''));
    if(soft&&fibersOn&&!['torso','pectoral-major'].includes(group.family)){const paths=[];if(group.family==='serratus'){for(let row=0;row<mesh.frontIds.length-1;row++){const points=mesh.frontIds[row].map((index,column)=>sculptProject(mesh.v[index].map((value,axis)=>(value+mesh.v[mesh.frontIds[row+1][column]][axis])*.5)));paths.push('M'+points.map(point=>point.join(',')).join('L'));}}else{for(const column of group.family==='rectus'?[1,2,3]:[2,4,6]){const points=mesh.frontIds.map(row=>sculptProject(mesh.v[row[column]]));paths.push('M'+points.map(point=>point.join(',')).join('L'));}}node.fiber.setAttribute('d',paths.join(''));}else node.fiber.setAttribute('d','');
   });
  }
  if(mode!=='sculpt'){
  for(const m of surfaces){const soft=['muscle','context'].includes(m.part.kind);
   if(m.part.name==='linea-alba')m.g.setAttribute('opacity',transparent?.32:1);
   const contour=AtlasContour(visible,k=>transparent&&soft?visible.depthAt(m.id,k)>-Infinity:visible.owners[k]===m.id,visible.bounds[m.id]);
   m.fill.setAttribute('d',contour);m.outline.setAttribute('d',contour);m.mask.setAttribute('d',contour);m.g.removeAttribute('clip-path');
   m.outline.setAttribute('stroke-opacity',soft&&m.group!=='aponeurosis'?.22:soft?.45:.75);
   const fiberSegments=[];
   if(fibersOn&&m.group!=='aponeurosis'&&m.part.kind!=='context')for(const f of m.part.fibers||[]){
    const points=f.p.map((v,i)=>skin(composition.point(m.part,v),f.bind[i]));let segment=[];
    for(const p of points){const q=project(p),x=Math.floor((q[0]-visible.x0)/visible.step),y=Math.floor((q[1]-visible.y0)/visible.step),k=y*visible.w+x;
     const shown=x>=0&&x<visible.w&&y>=0&&y<visible.h&&depth(p)>=visible.depthAt(m.id,k)-2.5&&(transparent||visible.owners[k]===m.id);
     if(shown)segment.push(q);else {if(segment.length>2)fiberSegments.push(segment);segment=[];}
    }if(segment.length>2)fiberSegments.push(segment);
   }
   const curvePath=points=>{let d='M'+points[0].map(n=>n.toFixed(1)).join(',');for(let i=1;i<points.length-1;i++){const next=points[i].map((n,j)=>(n+points[i+1][j])/2);d+='Q'+points[i].map(n=>n.toFixed(1)).join(',')+' '+next.map(n=>n.toFixed(1)).join(',');}return d+'L'+points.at(-1).map(n=>n.toFixed(1)).join(',');};
   m.fibers.setAttribute('d',fiberSegments.map(curvePath).join(''));m.fibers.setAttribute('clip-path','url(#atlas-clip-'+m.id+')');
   if(m.intersections){let d='';const vs=posed.get(m.part);for(const y of [319,355,390]){const ids=m.part.v.map((v,i)=>[v,i]).filter(([v])=>Math.abs(v[1]-y)<2.5&&v[2]>105).sort((a,b)=>a[0][0]-b[0][0]);const ps=ids.map(([_,i])=>project(vs[i]));if(ps.length>2)d+=curvePath(ps);}m.intersections.setAttribute('d',d);m.intersections.setAttribute('clip-path','url(#atlas-clip-'+m.id+')');}
  }
  lightSurfaces(visible);
  composition.drawFat(visible,surfaces.length,AtlasContour);
  for(const l of labelNodes){const candidates=surfaces.filter(m=>m.muscle===l.name&&m.group!=='aponeurosis').sort((a,b)=>visible.coverage[b.id]-visible.coverage[a.id]),points=visible.centers[candidates[0].id];let target;l.line.parentNode.style.display=points.length||transparent?'':'none';
   if(points.length){const ys=points.slice().sort((a,b)=>a[1]-b[1]),mid=ys[Math.floor(ys.length/2)][1],band=points.filter(p=>Math.abs(p[1]-mid)<10),average=band.reduce((s,p)=>add(s,mul(p,1/band.length)),[0,0]);target=band.reduce((best,p)=>Math.hypot(...sub(p,average))<Math.hypot(...sub(best,average))?p:best);}
   else {const m=candidates.find(m=>m.part.side===-1)||candidates[0],ids=[...new Set(m.faces.flat())],v=posed.get(m.part),avg=ids.reduce((s,i)=>add(s,mul(v[i],1/ids.length)),[0,0,0]);target=project(avg);}
   AnatomyLabelLeader(l.line,l.text,target);
  }
  }
  if(sculptVisible)composition.drawFat(sculptVisible,sculptGroups.length,AtlasContour,true,'sculpt');
  landmarks.render(new Map(atlas.parts.map(p=>[p.name,posed.get(p)])),paired?[{project,min:0,max:320},{project:sculptProject,min:320,max:640}]:[{project}]);
  lastDebug={pose:{...pose},atlas,frames,posed:atlas.parts.map(p=>({name:p.name,kind:p.kind,joint:p.joint,vertices:posed.get(p),renderedIndices:partIndices.get(p)})),visible:{coverage:(visible||sculptVisible).coverage,parts:surfaces.map(m=>({id:m.id,name:m.part.name,group:m.group,muscle:m.muscle}))},duration:performance.now()-started};
 }
 return {render,atlas,composition,landmarks,get debug(){return lastDebug;},yawFrame:yawAt,frame:body,skin};
}
