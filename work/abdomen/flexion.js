/* Original abdomen plate, in the coordinate system of the reviewed upper body.
   Costal and pelvic paths are reused verbatim. Fiber curves depict direction,
   not measured strain, activation, or a subject-specific muscle volume. */
function AbdomenFlexion(host) {
 const svg=host.querySelector('svg'),defs=svg.querySelector('defs'),drawing=host.querySelector('.diagram-volumes'),labels=host.querySelector('.diagram-labels'),NS='http://www.w3.org/2000/svg';
 const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.appendChild(n);return n;};
 const path=(d,cls,g)=>el('path',{d,class:cls},g),xy=p=>p.map(v=>+v.toFixed(3)).join(','),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const plates={},surfaceRegions=[];let serial=0;
 labels.setAttribute('pointer-events','none');
 function region(g,d,color,id) {
  const layer=el('g',{'data-muscle':id},g),shape=path(d,'muscle '+color,layer);shape.id='draft-'+id+'-'+serial++;
  const clip=el('clipPath',{id:shape.id+'-clip',clipPathUnits:'userSpaceOnUse'},defs);el('use',{href:'#'+shape.id},clip);
  const fg=el('g',{class:'fibers','clip-path':`url(#${shape.id}-clip)`},layer);
  return {layer,shape,fg};
 }
 function fibers(r,curves) {for(const d of curves){path(d,'fiber',r.fg);}}
 function chestContext(g,d,curves){
  const layer=el('g',{class:'context-muscle','data-part':'pectoral-context'},g),shape=path(d,'context-shape',layer);
  shape.id='draft-pectoral-'+serial++;
  const clip=el('clipPath',{id:shape.id+'-clip',clipPathUnits:'userSpaceOnUse'},defs);el('use',{href:'#'+shape.id},clip);
  const fg=el('g',{class:'fibers','clip-path':`url(#${shape.id}-clip)`},layer);
  curves.forEach(d=>path(d,'fiber',fg));return layer;
 }
 function patchRegion(g,id,color,view,sign=1){
  const count=id==='latissimus'?4:8;
  const d=`M 0,0 L 1,0 L 1,${count-1} L 0,${count-1} Z`;
  const r=region(g,d,color,id);r.layer.setAttribute('data-anatomic-patch',id);r.layer.setAttribute('data-hemisphere',sign);
  const clip=el('clipPath',{id:r.shape.id+'-visible',clipPathUnits:'userSpaceOnUse'},defs),visible=path('','',clip);
  r.layer.setAttribute('clip-path',`url(#${clip.id})`);
  surfaceRegions.push({view,id,sign,layer:r.layer,n:visible,shape:r.shape,count});
  const curves=[];
  if(id==='serratus'){
   // Fiber bundles follow each rib slip, rather than a uniform rectangular
   // hatch across the full sheet. The posterior connection remains continuous.
   const seen=new Set();
   for(let i=0;i<8;i++)for(let j=0;j<8;j++){
    // Keep texture inside the muscle outline and do not draw clamped edge
    // fascicles four times: that made the fan's narrow end a dark knot.
    const v=Math.max(.04,Math.min(6.96,i+(j-3.5)*.09)),key=v.toFixed(4);
    if(seen.has(key))continue;seen.add(key);
    curves.push(`M 0,${v} C .32,${v} .68,${v} 1,${v}`);
   }
   for(let i=0;i<8;i++){
    const lo=Math.max(0,i-.33),hi=Math.min(7,i+.33);
    path(`M 0,${lo} L .25,${lo} L .6,${lo} L 1,${lo} L 1,${hi} L .6,${hi} L .25,${hi} L 0,${hi} Z`,'slip-shade',r.fg);
   }
   for(let i=0;i<7;i++){
    const v=i+.5;
    path(`M 0,${v} C .3,${v} .7,${v} 1,${v}`,'slip-edge',r.fg);
    path(`M .06,${v-.07} C .32,${v-.07} .7,${v-.07} .98,${v-.07}`,'slip-highlight',r.fg);
   }
  }else for(let j=0;j<(id==='external-oblique'?80:56);j++){
   const total=id==='external-oblique'?80:56,v=(count-1)*(j+.5)/total;
   curves.push(`M 0,${v} C .32,${v} .68,${v} 1,${v}`);
  }
  fibers(r,curves);return r;
 }
 function bone(g,d,cls='bone'){return path(d,cls,g);}
 const C=ClassicCoronalAnatomy,S=ClassicSideAnatomy,B=C.body;
 function buildFront(){
  const g=el('g',{'data-view':'front'},drawing),axial=el('g',{},g);C.draw(axial,el,path,'front');
  const G=C.girdle(35);
  const scapula='M 147,159 Q 127,145 89,165 Q 85,212 109,291 Q 121,298 130,277 L 163,190 Q 177,180 166,161 L 160,154 Q 164,144 151,143 L 135,146 Q 128,151 139,155 Z';
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`,'data-part':'shoulder-skeleton'},g);
   const scap=bone(side,scapula);scap.setAttribute('transform',G.scapTransform);scap.setAttribute('data-depth','posterior');
   bone(side,`M ${xy(B([18,151]))} Q ${xy(B([61,139]))} ${xy(G.S([170,163]))} L ${xy(mix(G.S([170,163]),[G.S([170,163])[0],G.S([170,163])[1]+7],1))} Q ${xy(B([67,151]))} ${xy(B([18,160]))} Z`);
  }
  const muscles=el('g',{class:'muscle-layers'},g),latSides=[];
  // The posterior sheet wraps into the posterior axillary fold. A single
  // surface per side preserves group opacity; curved-surface visibility follows the camera.
  // Its humeral end is concealed by context; it does not attach to scapula.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`,'data-depth':'posterior'},muscles);
   const lat=patchRegion(side,'latissimus','purple','front',sign);
   lat.layer.setAttribute('data-surface','posterior-latissimus');latSides.push(side);
  }
  // An opaque anterior wall covers the posterior vertebral column.
  const wall=path('M -80,155 Q -101,175 -106,237 Q -103,276 -88,315 Q -77,355 -83,413 L -65,435 Q -25,462 0,491 Q 25,462 65,435 L 83,413 Q 77,355 88,315 Q 103,276 106,237 Q 101,175 80,155 Z','front-wall-occluder',g);
  g.insertBefore(wall,axial);
  // Broad white aponeuroses continue to the linea alba and pubic attachments.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`},muscles);
   const sheath=path('M 47,313 Q 48,325 49,337 Q 50,350 51,362 Q 52,375 53,388 Q 54,402 58,413 Q 62,422 69,426 Q 76,428 80,424 Q 83,422 84,418 Q 48,453 13,491 L 3,491 L 3,304 Z','aponeurosis',side);sheath.setAttribute('data-part','external-aponeurosis');
   const af=el('g',{class:'fibers'},side);
   for(let i=0;i<30;i++){const t=i/29;path(`M ${xy([55+18*t,320+104*t])} Q ${xy([35+12*t,362+91*t])} ${xy([3,395+92*t])}`,'aponeurosis-fiber',af);}
   // One oblique sheet, with costal digitations rather than rectangular panels.
   patchRegion(side,'external-oblique','blue','front',sign);
   patchRegion(side,'serratus','orange','front',sign);
   // Back-facing parts are clipped in the actual camera/pose below.
   muscles.appendChild(latSides[sign===-1?0:1]);
   // A compact pectoral fan covers the upper anterior serratus. Its fibers
   // converge toward the omitted proximal humerus/anterior axillary fold.
   // With the arm omitted, keep the subdued chest context inside the girdle
   // instead of leaving its humeral end floating outside the torso.
   const tendon=G.at(18,-7),top=G.S([172,176]);
   chestContext(side,`M ${xy(B([18,154]))} Q ${xy(B([58,146]))} ${xy(B([91,154]))} Q ${xy(mix(B([91,154]),top,.6))} ${xy(top)} L ${xy(tendon)} Q ${xy([tendon[0]-13,242])} ${xy(B([70,269]))} Q ${xy(B([30,286]))} ${xy(B([15,281]))} L ${xy(B([13,183]))} Z`,Array.from({length:36},(_,i)=>{const t=i/35,o=t<.3?mix(B([19,155]),B([90,155]),t/.3):mix(B([14,163]),B([15,281]),(t-.3)/.7),e=[tendon[0]+2*t,tendon[1]-5+5*t];return `M ${xy(o)} Q ${xy(mix(o,e,.5).map((v,k)=>k?v+8:v))} ${xy(e)}`;}));
  }
  // On the near side, an organic peeled section exposes the intermediate layer.
  const ioD='M 76,358 Q 88,367 85,383 L 86,407 Q 74,419 65,410 Q 57,394 60,382 Q 63,365 76,358 Z';
  const io=region(muscles,ioD,'green','internal-oblique');
  fibers(io,Array.from({length:30},(_,i)=>{const t=i/29,o=[62+22*t,412-4*t],e=[43+22*t,368+6*t];return `M ${xy(o)} C ${xy([o[0]-9,395-7*t])} ${xy([e[0]+12,381+3*t])} ${xy(e)}`;}));
  path('M 76,358 Q 88,367 85,383 L 86,407','section-edge',muscles);
  // Rectus is a paired continuous muscle. Three thin intersections subdivide
  // the upper belly; the long inferior portion tapers to the pubic crest.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`},muscles);
   const ra=region(side,'M 4,289 Q 16,281 33,269 Q 42,293 36,317 Q 33,338 35,360 Q 37,384 33,408 Q 31,443 20,470 L 13,489 L 5,488 Q 3,449 4,408 Q 5,365 4,332 Z','red','rectus');
   fibers(ra,Array.from({length:22},(_,i)=>{const t=(i+1)/23;return `M ${xy([5+28*t,288-16*t])} C ${xy([6+30*t,346])} ${xy([7+28*t,415])} ${xy([5+8*t,487])}`;}));
   const bands=el('g',{'clip-path':`url(#${ra.shape.id}-clip)`},ra.layer);
   for(const y of [314,350,386])path(`M 4,${y} Q 19,${y+4} 36,${y-1} L 36,${y+2} Q 18,${y+7} 4,${y+3} Z`,'intersection',bands);
  }
  path('M -3,290 Q 0,288 3,290 L 3,488 L -3,488 Z','aponeurosis',muscles);
  // Umbilicus is a location cue, not another tendinous intersection.
  path('M -2,405 Q 0,408 2,405','bone-detail',muscles);
  return {g,anchors:{serratus:[96,290],external:[-63,359],internal:[66,383],rectus:[19,366],latissimus:[-104,350]},ys:[244,350,410,475]};
 }
 function buildSide(){
  const g=el('g',{'data-view':'side'},drawing),skeleton=el('g',{},g);drawSideSkeleton(skeleton,el,path);
  const muscles=el('g',{class:'muscle-layers'},g);
  const lat=patchRegion(muscles,'latissimus','purple','side');
  lat.layer.setAttribute('data-surface','posterior-latissimus');
  // Iliac crest, costal margin, and anterior abdominal wall establish the fan.
  const sheath=path('M 65,302 Q 68,312 65,322 Q 64,338 61,345 Q 59,357 53,368 Q 48,383 36,389 Q 24,394 12,390 L 20,403 Q 32,387 18,367 Q 24,351 14,337 Q 19,317 29,293 Z','aponeurosis',muscles);sheath.setAttribute('data-part','external-aponeurosis');
  const sf=el('g',{class:'fibers'},muscles);
  for(let i=0;i<26;i++){const t=i/25;path(`M ${xy([17+10*t,326+63*t])} Q ${xy([34+5*t,345+57*t])} ${xy([54-22*t,357+67*t])}`,'aponeurosis-fiber',sf);}
  patchRegion(muscles,'external-oblique','blue','side');
  patchRegion(muscles,'serratus','orange','side');
  // Latissimus reaches the posterior axillary fold superficial to the
  // posterior serratus, while the anterior serratus slips remain exposed.
  muscles.appendChild(lat.layer);
  // The intermediate layer is shown through a curved opening in EO, while
  // the outer sheet keeps its costal and iliac continuity around the opening.
  const io=region(muscles,'M -5,351 Q 4,341 14,345 Q 19,351 15,359 L 18,371 Q 9,379 0,374 Q -9,368 -9,361 Z','green','internal-oblique');
  fibers(io,Array.from({length:32},(_,i)=>{const t=i/31,o=[-8+26*t,374+3*t],e=[3+19*t,343+10*t];return `M ${xy(o)} C ${xy([o[0]+3,363])} ${xy([e[0]-6,e[1]+12])} ${xy(e)}`;}));
  path('M -5,351 Q 4,341 14,345 Q 19,351 15,359 L 18,371','section-edge',muscles);
  // A narrow sagittal projection of the paired rectus, from costal cartilage
  // and xiphoid to the pubis. It follows the abdominal convexity.
  const ra=region(muscles,'M 69,268 Q 77,280 73,298 Q 68,321 62,342 Q 58,373 51,393 Q 43,414 32,424 L 27,420 Q 39,398 45,379 Q 49,353 52,331 Q 57,304 58,288 Q 60,278 69,268 Z','red','rectus');
  fibers(ra,Array.from({length:12},(_,i)=>{const t=(i+1)/13;return `M ${xy([59+12*t,288-10*t])} C ${xy([62+8*t,318])} ${xy([45+9*t,374])} ${xy([27+5*t,420])}`;}));
  const bands=el('g',{'clip-path':`url(#${ra.shape.id}-clip)`},ra.layer);
  for(const [x,y] of [[57,285],[53,314],[48,343]])path(`M ${x},${y} Q ${x+8},${y+2} ${x+18},${y+5} L ${x+18},${y+7} Q ${x+6},${y+4} ${x},${y+2} Z`,'intersection',bands);
  // Subdued shoulder context, reused scapular outline. It conceals the
  // serratus insertion rather than letting the fan float behind the back.
  const girdle=el('g',{'data-part':'shoulder-skeleton'},g);
  path('M -34,177 Q -58,208 -49,265 Q -34,251 -7,174 Q -15,164 -34,177 Z','bone',girdle);
  path('M -49,191 Q -26,178 -7,171 M -47,257 L -51,203','bone-detail',girdle);
  path('M 44,169 Q 21,156 -7,168 L -7,175 Q 20,164 46,176 Z','bone',girdle);
  // No humerus in the abdomen plate: keep the shoulder girdle as context.
  g.insertBefore(girdle,muscles);
  chestContext(g,'M 7,191 Q 24,166 44,176 Q 58,187 66,214 Q 78,251 69,283 Q 48,278 27,230 Q 12,214 7,201 Z',Array.from({length:32},(_,i)=>{const t=i/31,o=[44+25*t,177+105*t],e=[8+3*t,194+6*t];return `M ${xy(o)} Q ${xy([28+9*t,185+36*t])} ${xy(e)}`;}));
  return {g,anchors:{serratus:[36,270],external:[-41,327],internal:[7,353],rectus:[58,335],latissimus:[-51,310]},ys:[200,320,377,429]};
 }
 plates.front=buildFront();plates.side=buildSide();

 // Sample native Bezier paths, preserving subpaths and pelvic holes. This
 // deforms bones and muscles in a shared frame, never redraws the ribs as tubes.
 function samples(d){
  const ts=d.match(/[MLQCZ]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi)||[];let i=0,cmd,p=[0,0],first=p;const out=[];
  const pt=()=>[+ts[i++],+ts[i++]];
  while(i<ts.length){if(/[a-z]/i.test(ts[i]))cmd=ts[i++].toUpperCase();
   if(cmd==='Z'){out.push({cmd:'Z'});p=first;cmd=null;continue;}
   if(cmd==='M'){p=pt();first=p;out.push({cmd:'M',p});cmd='L';}
   else if(cmd==='L'){p=pt();out.push({cmd:'L',p});}
   else if(cmd==='Q'||cmd==='C'){
    const start=p,c1=pt(),c2=cmd==='C'?pt():null,end=pt();
    for(let j=1;j<=18;j++){const t=j/18,u=1-t,q=[0,1].map(k=>cmd==='Q'?u*u*start[k]+2*u*t*c1[k]+t*t*end[k]:u*u*u*start[k]+3*u*u*t*c1[k]+3*u*t*t*c2[k]+t*t*t*end[k]);out.push({cmd:'L',p:q});}p=end;
   }else throw new Error('Unsupported path command '+cmd);
  }return out;
 }
 const depthProfile=[[80,0,24],[155,4,46],[195,7,64],[245,7,73],[290,7,72],[340,6,62],[390,13,50],[420,15,47],[460,10,50],[520,5,39]];
 const interpolateProfile=(stations,y)=>{
  let i=0;while(i<stations.length-2&&y>stations[i+1][0])i++;
  const a=stations[i],b=stations[i+1],left=stations[Math.max(0,i-1)],right=stations[Math.min(stations.length-1,i+2)],h=b[0]-a[0],t=Math.max(0,Math.min(1,(y-a[0])/h));
  return a.slice(1).map((n,k)=>{k++;const m0=(b[k]-left[k])/(b[0]-left[0]),m1=(right[k]-a[k])/(right[0]-a[0]);return (2*t**3-3*t*t+1)*n+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*h*m1;});
 };
 const profile=y=>interpolateProfile(depthProfile,y);
 const widthProfile=[[80,70],[155,75],[195,96],[245,106],[300,106],[340,98],[380,93],[420,97],[460,97],[520,85]];
 const radius=y=>interpolateProfile(widthProfile,y)[0];
 const spineStations=S.vertebrae.map(v=>[1.24*v.center[1]-39,v.center[0]]).concat([[515,-5]]);
 const spineZ=y=>{let i=0;while(i<spineStations.length-2&&y>spineStations[i+1][0])i++;const a=spineStations[i],b=spineStations[i+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t;};
 const frontZ=(x,y)=>{const [c,r]=profile(y),rx=radius(y);return c+r*Math.sqrt(Math.max(0,1-(x/rx)**2));};
 const backZ=(x,y)=>{const [c]=profile(y);return 2*c-frontZ(x,y)-3;};
 const surfaces=AbdominalMuscleSurfaces({profile,radius,frontZ,backZ,spineZ});
 function surfaceVertex(view,id,u,v,sign){
  return {binding:surfaces.binding(view,id,u,v,sign)};
 }
 for(const r of surfaceRegions){
  r.nu=r.id==='serratus'?12:16;r.nv=r.id==='serratus'?56:r.id==='external-oblique'?40:12;r.grid=[];
  for(let j=0;j<=r.nv;j++)for(let i=0;i<=r.nu;i++){
   const v=r.id==='external-oblique'?(j<=24?j/8:3+(j-24)/4):(r.count-1)*j/r.nv,u=i/r.nu;
   r.grid.push(surfaceVertex(r.view,r.id,u,v,r.sign));
  }
 }
 function neutralMatrix(n,root){
  // Restored hub tabs may initialize while their iframe is still hidden.
  // getCTM() then omits ancestor transforms, collapsing both mirrored halves
  // onto one side. Bake the authored SVG transforms without layout dependency.
  let matrix=new DOMMatrix();
  for(let node=n;node&&node!==root;node=node.parentElement){
   const transform=node.transform?.baseVal.consolidate();
   if(transform){const {a,b,c,d,e,f}=transform.matrix;matrix=new DOMMatrix([a,b,c,d,e,f]).multiply(matrix);}
  }
  return matrix;
 }
 for(const [view,plate] of Object.entries(plates)){
  plate.paths=Array.from(plate.g.querySelectorAll('path')).map(n=>{
   const local=neutralMatrix(n,plate.g),patchLayer=n.closest('[data-anatomic-patch]'),patch=patchLayer?.dataset.anatomicPatch,sign=+(patchLayer?.dataset.hemisphere||1);
   const pelvis=!!n.closest('[data-part="coronal-hip-bone"],[data-part="coronal-sacrum"],[data-part="coronal-pubic-symphysis"],[data-part="pelvic-skeleton"]');
   const posterior=!!n.closest('[data-part="coronal-vertebrae"]'),rear=!!n.closest('[data-depth="posterior"]'),lat=!!n.closest('[data-muscle="latissimus"]'),pectoral=!!n.closest('[data-part="pectoral-context"]');
   const ribNumber=+(n.closest('[data-rib]')?.dataset.rib||0),ribLandmark=ribNumber&&C.ribs[ribNumber-1];
   const points=samples(n.getAttribute('d')).map((q,index)=>{if(!q.p)return q;if(patch){const [u,v]=q.p,xyz=surfaces.point(view,patch,u,v);xyz[0]*=sign;return {...q,uv:[u,v],xyz,...surfaceVertex(view,patch,u,v,sign)};}const p=new DOMPoint(...q.p).matrixTransform(local);let z=posterior?spineZ(p.y):rear?backZ(p.x,p.y):frontZ(p.x,p.y);
    if(view==='front'&&ribLandmark&&(n.classList.contains('rib')||n.classList.contains('rib-outline'))){
     const [c,depth]=profile(p.y),radius=ribLandmark.extent*C.proportions.axialWidth,t=Math.min(1,Math.abs(p.x)/radius),arc=depth*Math.sqrt(Math.max(0,1-t*t));
     z=index<=18?mix([spineZ(ribLandmark.y+4)],[c-arc],Math.min(1,t*3))[0]:c+arc;
    }
    if(view==='front'&&ribLandmark&&n.classList.contains('cartilage')&&ribLandmark.cartilageEnd){
     const sign=p.x<0?-1:1,start=C.body(ribLandmark.end),end=C.body(ribLandmark.cartilageEnd),dx=end[0]-start[0],dy=end[1]-start[1],t=Math.max(0,Math.min(1,((sign*p.x-start[0])*dx+(p.y-start[1])*dy)/(dx*dx+dy*dy)));
     const ribDepth=(r,pt)=>{const [c,radius]=profile(pt[1]),width=r.extent*C.proportions.axialWidth;return c+radius*Math.sqrt(Math.max(0,1-(pt[0]/width)**2));};
     const za=ribDepth(ribLandmark,start),zb=ribNumber<=7?frontZ(sign*end[0],end[1]):ribDepth(C.ribs[ribNumber-2],end);
     z=za+(zb-za)*t;
    }
    let sideX=0;
    if(view==='side'&&n.closest('[data-part="shoulder-skeleton"]')){const yy=1.24*p.y-39,[c,d]=profile(yy);sideX=radius(yy)*Math.sqrt(Math.max(.02,1-((p.x-c)/d)**2))+7;}
    return {...q,xyz:view==='side'?[sideX,1.24*p.y-39,p.x]:[p.x,p.y,z]};});
   const shoulder=!!n.closest('[data-part="shoulder-skeleton"]'),rib=+(n.closest('[data-rib]')?.dataset.rib||0);
   const rv=rib&&(view==='side'?S.vertebrae:C.vertebrae).filter(v=>v.region==='thoracic')[rib-1],ribY=rv&&(view==='side'?1.24*rv.center[1]-39:rv.y+4);
   const vertebra=n.closest('[data-vertebra]')?.dataset.vertebra;
   const v=vertebra&&(view==='side'?S.vertebrae:C.vertebrae).find(v=>v.id===vertebra),vy=v&&(view==='side'?1.24*v.center[1]-39:v.y+4);
   const sternum=!!n.closest('[data-part="coronal-sternum"],[data-part="side-sternum"]');
   let cartilage=null;
   if(ribLandmark&&n.classList.contains('cartilage')&&ribLandmark.cartilageEnd){
    let start,end,level;
    if(view==='front'){
     const sign=points.find(q=>q.xyz)?.xyz[0]<0?-1:1;
     start=C.body(ribLandmark.end);end=C.body(ribLandmark.cartilageEnd);start[0]*=sign;end[0]*=sign;
     level=ribNumber<=7?177:C.vertebrae.filter(v=>v.region==='thoracic')[ribNumber-2].y+4;
    }else{
     const r=S.ribs[ribNumber-1];start=[r.end[0],1.24*r.end[1]-39];end=[r.cartilageEnd[0],1.24*r.cartilageEnd[1]-39];
     level=ribNumber<=7?177:1.24*S.vertebrae.filter(v=>v.region==='thoracic')[ribNumber-2].center[1]-39;
    }
    cartilage={start,end,level,side:view==='side'};
   }
   const wall=!!n.closest('[data-muscle="rectus"],[data-muscle="internal-oblique"]')||n.matches('.aponeurosis,.aponeurosis-fiber,.section-edge');
   return {n,points,pelvis,shoulder,sternum,cartilage,lat,pectoral,wall,patch,sign,rib:ribY,vertebra:vy};
  });
  // Coordinates have been baked; remove the neutral transforms afterwards.
  plate.g.querySelectorAll('[transform]').forEach(n=>n.removeAttribute('transform'));
  // The anterior wall hides the posterior column only where it overlaps.
  // When curled, exposed upper rib roots must still meet the spinal column.
  if(view==='front')plate.g.insertBefore(plate.g.querySelector('[data-part="coronal-vertebrae"]'),plate.g.querySelector('.front-wall-occluder'));
  // During deep flexion the anterior chest passes in front of the upper
  // abdominal wall. Keep its existing context surface above that overlap.
  if(view==='front')plate.g.querySelectorAll('.context-muscle').forEach(n=>plate.g.appendChild(n));
  plate.contexts=Array.from(plate.g.querySelectorAll('.context-muscle'));
 }
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function withEnvelope(f,camera){
  const lines=plates[camera].paths.filter(p=>p.rib&&p.n.matches('.rib,.cartilage')||p.sternum&&p.n.matches('.bone')).map(p=>p.points.filter(q=>q.xyz).map(q=>{
   if(p.cartilage){const {start,end,level,side}=p.cartilage,d=end.map((v,i)=>v-start[i]),x=side?q.xyz[2]:q.xyz[0],t=Math.max(0,Math.min(1,((x-start[0])*d[0]+(q.xyz[1]-start[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));return mix(f.segment(q.xyz,p.rib),f.segment(q.xyz,level),t);}
   return f.segment(q.xyz,p.sternum?177:p.rib);
  }));
  const body=[];
  for(let i=0;i<48;i++){
   const a=i*Math.PI/24,ps=[];for(let y=155;y<=450;y+=5){const [c,d]=profile(y);ps.push(f.deform([radius(y)*Math.cos(a),y,c+d*Math.sin(a)]));}lines.push(ps);body.push(ps);
  }
  f.envelope=AbdominalEnvelope(lines,body);return f;
 }
 function frame(angle,camera='front'){
  // Only the spinal column curls: pelvis remains fixed, with no hip motion.
  // Distribute flexion through thoracic and lumbar levels rather than rotating
  // the complete rib cage about a single lower-back hinge.
  const p=Math.max(0,Math.min(1,angle/100)),alpha=y=>p*Math.PI/180*(30*smooth((455-y)/85)+30*smooth((370-y)/180)),centers=new Map();let cy=455,cz=spineZ(455);centers.set(455,[cy,cz]);
  for(let y=454;y>=60;y--){const a=alpha(y+.5),dy=-1,dz=spineZ(y)-spineZ(y+1);cy+=dy*Math.cos(a)+dz*Math.sin(a);cz+=-dy*Math.sin(a)+dz*Math.cos(a);centers.set(y,[cy,cz]);}
  function center(y){const lo=Math.floor(y),t=y-lo,a=centers.get(lo)||centers.get(60),b=centers.get(lo+1)||a;return mix(a,b,t);}
  function deform([x,y,z],pelvic=false){if(p===0||pelvic||y>=455)return [x,y,z];const c=center(y),a=alpha(y),dz=z-spineZ(y);return [x,c[0]+dz*Math.sin(a),c[1]+dz*Math.cos(a)];}
  function segment([x,y,z],level){if(p===0)return [x,y,z];const c=center(level),a=alpha(level),dy=y-level,dz=z-spineZ(level);return [x,c[0]+dy*Math.cos(a)+dz*Math.sin(a),c[1]-dy*Math.sin(a)+dz*Math.cos(a)];}
  return withEnvelope({deform,segment,alpha,progress:p},camera);
 }
 function yawFrame(degrees){
  const a=Math.max(-60,Math.min(60,degrees))*Math.PI/180;
  // Small lumbar contribution; most axial rotation accumulates in the thorax.
  // The pelvis is stationary. All rotation acts about the spinal column in 3D,
  // before the fixed 16-degree camera projection, not on the final SVG image.
  // 5 degrees across lumbar levels and 55 across thoracic levels at the
  // illustrative endpoint. These are drawing model choices, not a
  // patient measurement or a textbook claim about exact regional limits.
  // Retain the small lumbar contribution even when the user selects 60°.
  const lumbar=a*5/60,thoracic=a-lumbar;
  function theta(y){
   if(y>=455)return 0;
   // Keep the upper rib cage/shoulder base together instead of shearing its
   // first four ribs against the sternum and scapular attachments.
   if(y<=225)return a;
   if(y<=353){
    // Ease both junctions and keep the middle cage nearer the shoulder frame.
    // A linear ramp imposed a large relative yaw across short inferior SA
    // slips and an abrupt angular gradient at the upper cage. This remains
    // an illustrative distribution, not measured segmental range of motion.
    const t=(353-y)/128,turn=t*t*(4.5+t*(-5+1.5*t));
    return lumbar+thoracic*turn;
   }
   if(y<=377)return lumbar;
   return lumbar*(455-y)/78;
  }
  // The kyphotic column rotates about the pelvis' longitudinal axis too; do
  // not leave every vertebral center in its original sagittal plane.
  const axis=spineZ(455);
  function rotate([x,y,z],t){const dz=z-axis;return [x*Math.cos(t)+dz*Math.sin(t),y,axis-x*Math.sin(t)+dz*Math.cos(t)];}
  function segment(q,level){return rotate(q,theta(level));}
  // The anterior abdominal wall attaches to the costal/xiphoid boundary,
  // which follows the sternum, rather than to a vertebra at the same height.
  // Its upper attachment follows the chest; its iliac/pubis end stays fixed.
  const wall=q=>rotate(q,a*(1-smooth((q[1]-300)/120)));
  return withEnvelope({deform(q,pelvic=false){return pelvic||q[1]>=455?q:segment(q,q[1]);},wall,segment,rotate,axis,alpha:theta,theta,degrees,spineZ},'front');
 }
 const nodes=['serratus','external','internal','rectus','latissimus'].map((id,i)=>{const group=el('g',{'data-label':id},labels),line=path('','',group),text=el('text',{},group);text.textContent=['전거근','외복사근','내복사근','복직근','광배근'][i];return {line,text};});
 function paintedHit(x,y){
  return document.elementsFromPoint(x,y).find(n=>n.tagName.toLowerCase()==='path')||null;
 }
 function render(angle,view){
  const camera=view==='twist'?'front':view,plate=plates[camera],poseKey=view+':'+angle,reuse=plate.poseKey===poseKey,f=reuse?plate.poseFrame:view==='twist'?yawFrame(angle):frame(angle,camera),yaw=16*Math.PI/180,project=p=>camera==='side'?[p[2],p[1]]:[p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1]];
  plate.poseFrame=f;
  for(const [v,p] of Object.entries(plates))p.g.style.display=v===camera?'':'none';
  function transform(q,p){if(p.pelvis)return q;if(p.cartilage){const {start,end,level,side}=p.cartilage,d=end.map((v,i)=>v-start[i]),x=side?q[2]:q[0],t=Math.max(0,Math.min(1,((x-start[0])*d[0]+(q[1]-start[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));return mix(f.segment(q,p.rib),f.segment(q,level),t);}return p.sternum||p.pectoral?f.segment(q,177):p.rib?f.segment(q,p.rib):p.shoulder?f.segment(q,175):p.vertebra?f.segment(q,p.vertebra):p.wall&&f.wall?f.wall(q):f.deform(q);}
  if(!reuse){
  plate.visibilityOccluders=[];
  for(const p of plate.paths){
   p.worldPoints=p.points.map(q=>q.xyz?(p.patch?surfaces.move(q.binding,f):transform(q.xyz,p)):null);
   p.n.setAttribute('d',p.points.map((q,i)=>q.cmd==='Z'?'Z':q.cmd+' '+xy(project(p.worldPoints[i]))).join(' '));
  }
  const depth=p=>camera==='side'?p[0]:-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
  const visibility=AbdominalVisibility({project,depth}),activeRegions=surfaceRegions.filter(r=>r.view===camera);
  // A slightly inset torso envelope occludes the far side even where no
  // anterior muscle was drawn. It is not painted and does not change bones.
  for(let y=155;y<430;y+=8)for(let j=0;j<48;j++){
   const point=(yy,a)=>{const [c,d]=profile(yy);return f.deform([radius(yy)*.90*Math.cos(a),yy,c+d*.90*Math.sin(a)]);};
   visibility.quad([point(y,j*Math.PI/24),point(y,(j+1)*Math.PI/24),point(y+8,(j+1)*Math.PI/24),point(y+8,j*Math.PI/24)],-1);
  }
  for(const p of plate.paths){
   if(p.patch||p.n.classList.contains('fiber')||p.n.classList.contains('bone-detail')||p.n.classList.contains('torso-context')||p.n.classList.contains('thorax-mass')||p.n.classList.contains('front-wall-occluder')||p.pelvis)continue;
   // The white aponeurosis continues the EO belly; it is not a separate
   // foreground occluder cutting holes through that same abdominal sheet.
   if(!p.n.matches('.bone,.rib,.cartilage,.context-shape,.muscle'))continue;
   const qs=p.worldPoints.filter(Boolean);
   const owner=-3-plate.visibilityOccluders.length;plate.visibilityOccluders.push(p);
   if(p.n.classList.contains('rib')&&camera==='front')visibility.line(qs,4,owner);
   else visibility.polygon(qs,owner);
  }
  for(const [owner,r] of activeRegions.entries()){
   const {nu,nv}=r,grid=r.grid.map(q=>({world:surfaces.move(q.binding,f)}));
   let whole='';r.visibleCenters=[];
   for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    const k=j*(nu+1)+i,a=grid[k],b=grid[k+1],c=grid[k+nu+2],e=grid[k+nu+1];
    const ps=[a,b,c,e].map(q=>project(q.world)),area=ps.reduce((s,p,k)=>s+p[0]*ps[(k+1)%4][1]-p[1]*ps[(k+1)%4][0],0);
    if(area<0)ps.reverse();
    const quad='M '+ps.map(xy).join(' L ')+' Z ';
    whole+=quad;visibility.quad([a,b,c,e].map(q=>q.world),owner);
   }
   r.shape.setAttribute('d',whole);
  }
  const visible=visibility.solve(activeRegions.length);plate.visibility=visible;
  activeRegions.forEach((r,i)=>{r.n.setAttribute('d',visible.clips[i]);r.visibleCenters=visible.centers[i];r.coverage=visible.coverage[i];});
  // At either yaw endpoint, the far pectoral must stay behind the near fan.
  plate.contexts.map(g=>{const p=plate.paths.find(p=>p.n.parentElement===g&&p.n.classList.contains('context-shape')),points=p.worldPoints.filter(Boolean);return {g,z:points.reduce((s,q)=>s+depth(q),0)/points.length};}).sort((a,b)=>a.z-b.z).forEach(p=>plate.g.appendChild(p.g));
  plate.poseKey=poseKey;
  }
  // Lock the camera as well as the pelvis, so playback visibly curls only
  // the upper body instead of moving or zooming the lower base.
  const scale=1.04,center=camera==='side'?250:310,top=-42;
  drawing.setAttribute('transform',`translate(${center} ${top}) scale(${scale})`);
  // Labels use the same point deformation as the fibers and attachments.
  nodes.forEach((n,i)=>{const key=['serratus','external','internal','rectus','latissimus'][i],p=plate.anchors[key],xyz=camera==='side'?[0,1.24*p[1]-39,p[0]]:[p[0],p[1],i===4?backZ(...p):frontZ(...p)],q=project(f.deform(xyz)),left=i===1||i===3||i===4,x=left?14:626,y=[100,190,345,435,285][i];
   n.text.style.fontSize=(12*640/host.clientWidth)+'px';n.line.style.strokeWidth=640/host.clientWidth;
   n.text.setAttribute('x',x);n.text.setAttribute('y',y);n.text.setAttribute('text-anchor',left?'start':'end');n.line.setAttribute('d',`M ${x},${y+5} L ${xy([center+q[0]*scale,top+q[1]*scale])}`);
  });
  // Select a visible painted point on the intended layer, including cutaways.
  // Reuse the reviewed upperbody hit-test rather than aiming at hidden fibers.
  nodes.forEach((n,i)=>{const key=['serratus','external-oblique','internal-oblique','rectus','latissimus'][i],targets=Array.from(plate.g.querySelectorAll(`[data-muscle="${key}"] > .muscle`));
   let found=false;for(const target of (i===1||i===3?targets:targets.reverse())){
    const region=surfaceRegions.find(r=>r.shape===target);let a=region?null:C.anchor(target,paintedHit);
    if(region){const points=region.visibleCenters,center=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]),candidates=points.slice().sort((a,b)=>Math.hypot(a[0]-center[0],a[1]-center[1])-Math.hypot(b[0]-center[0],b[1]-center[1])),screenMatrix=target.getScreenCTM(),localMatrix=target.getCTM();for(const p of candidates){const q=new DOMPoint(...p),screen=q.matrixTransform(screenMatrix),hit=paintedHit(screen.x,screen.y);if(hit===target||hit?.closest('[clip-path]')?.getAttribute('clip-path')===`url(#${target.id}-clip)`){const local=q.matrixTransform(localMatrix);a={point:[local.x,local.y],visible:true};break;}}}
    if(a&&(a.visible||host.classList.contains('transparent'))){const q=new DOMPoint(...a.point).matrixTransform(svg.getCTM().inverse()),current=n.line.getAttribute('d').split(' L ')[0];n.line.setAttribute('d',current+' L '+xy([q.x,q.y]));found=true;break;}
   }n.line.parentElement.style.display=found?'':'none';
  });
  svg.setAttribute('viewBox','0 0 640 515');svg.setAttribute('height',host.clientWidth*515/640);
  host.dataset.angle=angle;host.dataset.view=view;host.dataset.cameraYaw=camera==='front'?'16':'90';host.dataset.motion=view==='twist'?'yaw':'flexion';
 }
 return {render,frame,yawFrame,plates,surfaces,surfaceRegions,frontZ,backZ,spineZ,profile,radius,pickAt:paintedHit,source:'abdomen-anatomy-reviewed-curves'};
}
