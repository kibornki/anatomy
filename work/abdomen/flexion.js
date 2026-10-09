/* Original abdomen plate, in the coordinate system of the reviewed upper body.
   Costal and pelvic paths are reused verbatim. Fiber curves depict direction,
   not measured strain, activation, or a subject-specific muscle volume. */
function AbdomenFlexion(host) {
 const svg=host.querySelector('svg'),defs=svg.querySelector('defs'),drawing=host.querySelector('.diagram-volumes'),labels=host.querySelector('.diagram-labels'),NS='http://www.w3.org/2000/svg';
 const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.appendChild(n);return n;};
 const path=(d,cls,g)=>el('path',{d,class:cls},g),xy=p=>p.map(v=>+v.toFixed(3)).join(','),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const plates={},masks=[];let serial=0;
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
  // surface per side preserves group opacity while the mask controls overlap.
  // Its humeral end is concealed by context; it does not attach to scapula.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`,'data-depth':'posterior'},muscles);
   const lat=region(side,'M 9,282 Q 45,285 76,262 Q 94,241 99,216 Q 103,196 111,183 L 119,185 Q 113,205 112,229 Q 113,248 108,276 Q 114,312 110,350 Q 108,387 94,418 Q 64,437 29,451 L 9,453 Q 18,403 10,350 Z','purple','latissimus');
   lat.layer.setAttribute('data-surface','posterior-latissimus');
   fibers(lat,Array.from({length:48},(_,i)=>{const t=i/47,o=t<.45?[10,285+157*t/.45]:[10+83*(t-.45)/.55,453-34*(t-.45)/.55],e=[112+4*t,185+5*t];return `M ${xy(o)} C ${xy([o[0]+35,o[1]-9])} ${xy([104,250+28*t])} ${xy(e)}`;}));
   latSides.push(side);
   const mask=el('mask',{id:'lat-wall-'+sign,maskUnits:'userSpaceOnUse',x:-250,y:60,width:500,height:500},defs);
   el('rect',{x:-250,y:60,width:500,height:500,fill:'white'},mask);
   const cover=el('path',{d:'M -80,155 Q -101,175 -106,237 Q -103,276 -88,315 Q -77,355 -83,413 L -65,435 Q -25,462 0,491 Q 25,462 65,435 L 83,413 Q 77,355 88,315 Q 103,276 106,237 Q 101,175 80,155 Z',fill:'black'},mask);
   const fold=el('path',{d:'M 99,279 Q 96,244 98,218 Q 101,196 110,181 L 122,182 L 121,201 Q 114,224 114,254 Q 111,273 105,284 Z',fill:'white'},mask);
   masks.push({view:'front',n:cover,sign:1},{view:'front',n:fold,sign,lat:true});
   lat.layer.setAttribute('mask',`url(#lat-wall-${sign})`);
  }
  // A solid front wall prevents the broad posterior sheet from showing through
  // empty spaces between the superficial abdominal layers in opaque mode.
  const rear=el('g',{class:'muscle-layers posterior-layers'},g);
  [...muscles.children].forEach(n=>rear.appendChild(n));
  g.insertBefore(rear,axial);
  const wall=path('M -80,155 Q -101,175 -106,237 Q -103,276 -88,315 Q -77,355 -83,413 L -65,435 Q -25,462 0,491 Q 25,462 65,435 L 83,413 Q 77,355 88,315 Q 103,276 106,237 Q 101,175 80,155 Z','front-wall-occluder',g);
  g.insertBefore(wall,axial);
  // Broad white aponeuroses continue to the linea alba and pubic attachments.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`},muscles);
   const sheath=path('M 35,290 Q 53,279 69,309 Q 58,337 57,362 Q 65,398 73,425 Q 48,453 13,491 L 3,491 L 3,304 Z','aponeurosis',side);sheath.setAttribute('data-part','external-aponeurosis');
   const af=el('g',{class:'fibers'},side);
   for(let i=0;i<30;i++){const t=i/29;path(`M ${xy([55+18*t,320+104*t])} Q ${xy([35+12*t,362+91*t])} ${xy([3,395+92*t])}`,'aponeurosis-fiber',af);}
   // One oblique sheet, with costal digitations rather than rectangular panels.
   const eoD='M 88,250 Q 95,257 97,267 L 85,276 Q 96,280 96,286 L 83,298 Q 94,304 92,314 L 79,324 Q 90,329 89,337 L 76,346 Q 85,356 82,368 Q 81,385 91,414 Q 84,421 73,425 L 61,421 Q 62,386 57,362 Q 54,348 60,329 Q 62,310 73,288 Q 80,270 88,250 Z';
   const eo=region(side,eoD,'blue','external-oblique');
   const eoFibers=[];
   for(let i=0;i<52;i++){const t=i/51,o=[95-14*t,258+115*t],e=[55+26*t,330+92*t];eoFibers.push(`M ${xy(o)} C ${xy([o[0]-5,o[1]+30])} ${xy([e[0]+4,e[1]-23])} ${xy(e)}`);}
   fibers(eo,eoFibers);
   // Connected serratus fan: posterior insertion and eight costal slips.
   const origins=[[82,195],[76,213],[78,235],[82,254],[84,271],[81,290],[78,312],[79,329]],insert=t=>[104-5*t,210+76*t];
   const d='M 82,192 Q 103,220 106,249 Q 108,276 100,300 Q 96,324 85,339 L 79,329 Q 88,319 84,314 L 78,312 Q 90,300 87,292 L 81,290 Q 95,280 91,274 L 84,271 Q 96,262 90,257 L 82,254 Q 91,245 85,238 L 78,235 Q 84,222 77,215 L 73,212 Q 76,200 82,192 Z';
   const sa=region(side,d,'orange','serratus');
   const wall=el('clipPath',{id:'front-wall-'+sign},defs),wallShape=path('M 45,154 Q 102,163 107,237 Q 112,290 91,334 L 72,345 L 45,305 Z','',wall);
   sa.layer.setAttribute('clip-path',`url(#front-wall-${sign})`);masks.push({view:'front',n:wallShape,sign});
   fibers(sa,Array.from({length:40},(_,j)=>{const i=Math.floor(j/5),t=(j%5+1)/6,o=[origins[i][0]+5*t,origins[i][1]+t*6],e=insert((i+t)/8),c=mix(o,e,.55);c[1]+=3;return `M ${xy(o)} Q ${xy(c)} ${xy(e)}`;}));
   // A single masked latissimus sheet keeps whole-muscle transparency uniform
   // while its posterior axillary fold overlaps the back of serratus.
   muscles.appendChild(latSides[sign===-1?0:1]);
   // A compact pectoral fan covers the upper anterior serratus. Its fibers
   // converge toward the omitted proximal humerus/anterior axillary fold.
   // With the arm omitted, keep the subdued chest context inside the girdle
   // instead of leaving its humeral end floating outside the torso.
   const tendon=G.S([164,191]),top=G.S([172,176]);
   chestContext(side,`M ${xy(B([18,154]))} Q ${xy(B([58,146]))} ${xy(B([91,154]))} Q ${xy(mix(B([91,154]),top,.6))} ${xy(top)} L ${xy(tendon)} Q ${xy([tendon[0]-17,212])} ${xy(B([60,237]))} Q ${xy(B([29,254]))} ${xy(B([15,243]))} L ${xy(B([13,183]))} Z`,Array.from({length:36},(_,i)=>{const t=i/35,o=t<.3?mix(B([19,155]),B([90,155]),t/.3):mix(B([14,163]),B([15,243]),(t-.3)/.7),e=[tendon[0]+2*t,tendon[1]-5+5*t];return `M ${xy(o)} Q ${xy(mix(o,e,.5).map((v,k)=>k?v+8:v))} ${xy(e)}`;}));
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
  const muscles=el('g',{class:'muscle-layers'},g),ribs=S.ribs;
  const lat=region(muscles,'M -54,238 Q -35,216 -8,188 L 5,179 L 10,187 Q -8,207 -19,235 Q -23,253 -30,273 Q -37,297 -34,315 Q -29,348 -24,368 Q -38,368 -51,392 Q -57,361 -57,321 Q -62,275 -54,238 Z','purple','latissimus');
  lat.layer.setAttribute('data-surface','posterior-latissimus');
  fibers(lat,Array.from({length:40},(_,i)=>{const t=i/39,o=[-55+29*t,387-17*t],e=[5+4*t,182+4*t];return `M ${xy(o)} C ${xy([-62+25*t,338])} ${xy([-35+22*t,243])} ${xy(e)}`;}));
  // Iliac crest, costal margin, and anterior abdominal wall establish the fan.
  const sheath=path('M 29,293 Q 40,300 51,295 L 59,306 Q 58,339 53,368 Q 50,397 32,424 L 20,403 Q 32,387 18,367 Q 24,351 14,337 Q 19,317 29,293 Z','aponeurosis',muscles);sheath.setAttribute('data-part','external-aponeurosis');
  const sf=el('g',{class:'fibers'},muscles);
  for(let i=0;i<26;i++){const t=i/25;path(`M ${xy([17+10*t,326+63*t])} Q ${xy([34+5*t,345+57*t])} ${xy([54-22*t,357+67*t])}`,'aponeurosis-fiber',sf);}
  const originsEO=ribs.slice(4,12).map(r=>S.cubic(r,.77));
  let ed=`M ${xy(originsEO[0])}`;
  originsEO.slice(1).forEach(o=>{ed+=` Q ${xy([o[0]+8,o[1]-5])} ${xy([o[0]+4,o[1]+1])} L ${xy(o)}`;});
  ed+=' Q 15,340 17,355 Q 20,379 26,386 Q 29,391 31,397 Q 12,398 -6,391 Q -26,380 -42,388 L -51,392 Q -49,371 -49,341 Q -52,309 -52,282 Q -26,264 '+xy(originsEO[0])+' Z';
  const eo=region(muscles,ed,'blue','external-oblique');
  const ef=[];
  for(let i=0;i<58;i++){
   const t=i/57,o=[22-75*t,260+30*t],e=[42-82*t,340+48*t];
   // The posterior fibers reach the iliac crest nearly vertically; anterior
   // fibers sweep toward the white sheet, rather than radiating upward.
   ef.push(`M ${xy(o)} C ${xy([o[0]-4,o[1]+32])} ${xy([e[0]-7,e[1]-30])} ${xy(e)}`);
  }
  fibers(eo,ef);
  // Posterior EO is covered by the superficial latissimus sheet below.
  // Upper ribs fan toward the medial border on the costal scapular surface.
  const origins=ribs.slice(0,9).map(r=>S.cubic(r,.82));
  const insert=t=>t<.48?mix([-45,188],[-50,236],t/.48):mix([-50,244],[-47,263],(t-.48)/.52);
  let sd=`M ${xy(origins[0])}`;
  origins.forEach((o,i)=>{const next=i<8?origins[i+1]:[o[0]-8,o[1]+11];sd+=` Q ${xy([o[0]+7,o[1]+2])} ${xy([o[0]+4,o[1]+7])} Q ${xy([o[0]-8,o[1]+10])} ${xy(next)}`;});
  sd+=` Q 13,320 ${xy(insert(1))} Q -56,224 ${xy(insert(0))} Q -12,170 ${xy(origins[0])} Z`;
  const sa=region(muscles,sd,'orange','serratus');
  fibers(sa,Array.from({length:54},(_,j)=>{const i=Math.floor(j/6),t=(j%6+1)/7,o=[origins[i][0]+1,origins[i][1]+t*8],e=insert((i+t)/9),c=mix(o,e,.55);c[1]+=4+7*i/8;return `M ${xy(o)} Q ${xy(c)} ${xy(e)}`;}));
  // Each slip retains a curved seam from its costal origin to the shared fan.
  for(let i=2;i<9;i++){const o=origins[i],e=insert((i+.1)/9),c=mix(o,e,.55);c[1]+=6;path(`M ${xy([o[0]+3,o[1]+7])} Q ${xy(c)} ${xy(e)}`,'fiber',sa.layer);}
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
  chestContext(g,'M 6,181 Q 24,166 44,176 Q 58,187 66,214 Q 74,237 69,256 Q 48,253 27,220 Q 12,204 6,191 Z',Array.from({length:32},(_,i)=>{const t=i/31,o=[44+25*t,177+77*t],e=[7+3*t,184+6*t];return `M ${xy(o)} Q ${xy([28+9*t,185+36*t])} ${xy(e)}`;}));
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
 const profile=y=>{let i=0;while(i<depthProfile.length-2&&y>depthProfile[i+1][0])i++;const a=depthProfile[i],b=depthProfile[i+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};
 const spineStations=S.vertebrae.map(v=>[1.24*v.center[1]-39,v.center[0]]).concat([[515,-5]]);
 const spineZ=y=>{let i=0;while(i<spineStations.length-2&&y>spineStations[i+1][0])i++;const a=spineStations[i],b=spineStations[i+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t;};
 const frontZ=(x,y)=>{const [c,r]=profile(y),rx=y<170?75:y<345?106:y<410?93:97;return c+r*Math.sqrt(Math.max(0,1-(x/rx)**2));};
 const backZ=(x,y)=>{const [c]=profile(y);return 2*c-frontZ(x,y)-3;};
 const latZ=(x,y)=>{const z=backZ(x,y),wx=Math.max(0,Math.min(1,(Math.abs(x)-78)/34)),wy=Math.max(0,Math.min(1,(280-y)/95));return z+(profile(y)[0]+7-z)*wx*wy;};
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
   const local=neutralMatrix(n,plate.g);
   const pelvis=!!n.closest('[data-part="coronal-hip-bone"],[data-part="coronal-sacrum"],[data-part="coronal-pubic-symphysis"],[data-part="pelvic-skeleton"]');
   const posterior=!!n.closest('[data-part="coronal-vertebrae"]'),rear=!!n.closest('[data-depth="posterior"]'),lat=!!n.closest('[data-muscle="latissimus"]'),pectoral=!!n.closest('[data-part="pectoral-context"]');
   const ribNumber=+(n.closest('[data-rib]')?.dataset.rib||0),ribLandmark=ribNumber&&C.ribs[ribNumber-1];
   const points=samples(n.getAttribute('d')).map((q,index)=>{if(!q.p)return q;const p=new DOMPoint(...q.p).matrixTransform(local);let z=posterior?spineZ(p.y):lat?latZ(p.x,p.y):rear?backZ(p.x,p.y):frontZ(p.x,p.y);
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
    return {...q,xyz:view==='side'?[0,1.24*p.y-39,p.x]:[p.x,p.y,z]};});
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
   return {n,points,pelvis,shoulder,sternum,cartilage,lat,pectoral,rib:ribY,vertebra:vy};
  });
  for(const m of masks.filter(m=>m.view===view))plate.paths.push({n:m.n,pelvis:false,lat:!!m.lat,points:samples(m.n.getAttribute('d')).map(q=>q.p?{...q,xyz:[m.sign*q.p[0],q.p[1],(m.lat?latZ:frontZ)(m.sign*q.p[0],q.p[1])]}:q)});
  if(view==='front'){
   const pelvic=plate.paths.filter(p=>p.pelvis&&p.n.classList.contains('bone'));
   for(const mask of defs.querySelectorAll('mask[id^="lat-wall-"]'))for(const p of pelvic){
    const n=el('path',{fill:'black'},mask);plate.paths.push({n,points:p.points,pelvis:true});
   }
  }
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
 function frame(angle){
  // Only the spinal column curls: pelvis remains fixed, with no hip motion.
  // Distribute flexion through thoracic and lumbar levels rather than rotating
  // the complete rib cage about a single lower-back hinge.
  const p=Math.max(0,Math.min(1,angle/100)),alpha=y=>p*Math.PI/180*(30*smooth((455-y)/85)+30*smooth((370-y)/180)),centers=new Map();let cy=455,cz=spineZ(455);centers.set(455,[cy,cz]);
  for(let y=454;y>=60;y--){const a=alpha(y+.5),dy=-1,dz=spineZ(y)-spineZ(y+1);cy+=dy*Math.cos(a)+dz*Math.sin(a);cz+=-dy*Math.sin(a)+dz*Math.cos(a);centers.set(y,[cy,cz]);}
  function center(y){const lo=Math.floor(y),t=y-lo,a=centers.get(lo)||centers.get(60),b=centers.get(lo+1)||a;return mix(a,b,t);}
  function deform([x,y,z],pelvic=false){if(p===0||pelvic||y>=455)return [x,y,z];const c=center(y),a=alpha(y),dz=z-spineZ(y);return [x,c[0]+dz*Math.sin(a),c[1]+dz*Math.cos(a)];}
  function segment([x,y,z],level){if(p===0)return [x,y,z];const c=center(level),a=alpha(level),dy=y-level,dz=z-spineZ(level);return [x,c[0]+dy*Math.cos(a)+dz*Math.sin(a),c[1]-dy*Math.sin(a)+dz*Math.cos(a)];}
  return {deform,segment,alpha,progress:p};
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
   if(y<=177)return a;
   if(y<=353)return lumbar+thoracic*(353-y)/176;
   if(y<=377)return lumbar;
   return lumbar*(455-y)/78;
  }
  function segment([x,y,z],level){if(level>=455)return [x,y,z];const t=theta(level),axis=spineZ(level),dz=z-axis;return [x*Math.cos(t)+dz*Math.sin(t),y,axis-x*Math.sin(t)+dz*Math.cos(t)];}
  return {deform(q,pelvic=false){return pelvic||q[1]>=455?q:segment(q,q[1]);},segment,alpha:theta,theta,degrees,spineZ};
 }
 const nodes=['serratus','external','internal','rectus','latissimus'].map((id,i)=>{const group=el('g',{'data-label':id},labels),line=path('','',group),text=el('text',{},group);text.textContent=['전거근','외복사근','내복사근','복직근','광배근'][i];return {line,text};});
 const latMasks=new Map(Array.from(defs.querySelectorAll('mask[id^="lat-wall-"]'),m=>[m.id,Array.from(m.querySelectorAll('path'))]));
 function paintedHit(x,y){
  // SVG mask holes still receive pointer hits in browsers. Ignore only those
  // unpainted pieces so names do not jump to a hidden surface or disappear.
  for(const hit of document.elementsFromPoint(x,y)){
   if(hit.tagName.toLowerCase()!=='path')continue;
   const layer=hit.closest('[data-muscle="latissimus"][mask]');
   if(layer&&!host.classList.contains('transparent')){
    const id=layer.getAttribute('mask').slice(5,-1),p=new DOMPoint(x,y).matrixTransform(hit.getScreenCTM().inverse());let painted=true;
    for(const maskPath of latMasks.get(id)||[])if(maskPath.isPointInFill(p))painted=maskPath.getAttribute('fill')==='white';
    if(!painted)continue;
   }
   return hit;
  }
  return null;
 }
 function render(angle,view){
  const camera=view==='twist'?'front':view,f=view==='twist'?yawFrame(angle):frame(angle),plate=plates[camera],yaw=16*Math.PI/180,project=p=>camera==='side'?[p[2],p[1]]:[p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1]];
  for(const [v,p] of Object.entries(plates))p.g.style.display=v===camera?'':'none';
  function transform(q,p){if(p.pelvis)return q;if(p.lat){const attachment=Math.max(0,Math.min(1,(280-q[1])/80));return mix(f.deform(q),f.segment(q,175),attachment);}if(p.cartilage){const {start,end,level,side}=p.cartilage,d=end.map((v,i)=>v-start[i]),x=side?q[2]:q[0],t=Math.max(0,Math.min(1,((x-start[0])*d[0]+(q[1]-start[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));return mix(f.segment(q,p.rib),f.segment(q,level),t);}return p.sternum||p.pectoral?f.segment(q,177):p.rib?f.segment(q,p.rib):p.shoulder?f.segment(q,175):p.vertebra?f.segment(q,p.vertebra):f.deform(q);}
  for(const p of plate.paths){
   p.worldPoints=p.points.map(q=>q.xyz?transform(q.xyz,p):null);
   p.n.setAttribute('d',p.points.map((q,i)=>q.cmd==='Z'?'Z':q.cmd+' '+xy(project(p.worldPoints[i]))).join(' '));
  }
  // At either yaw endpoint, the far pectoral must stay behind the near fan.
  const depth=p=>-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
  plate.contexts.map(g=>{const p=plate.paths.find(p=>p.n.parentElement===g&&p.n.classList.contains('context-shape')),points=p.worldPoints.filter(Boolean);return {g,z:points.reduce((s,q)=>s+depth(q),0)/points.length};}).sort((a,b)=>a.z-b.z).forEach(p=>plate.g.appendChild(p.g));
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
   let found=false;for(const target of (i===1||i===3?targets:targets.reverse())){const a=C.anchor(target,paintedHit);if(a&&(a.visible||host.classList.contains('transparent'))){const q=new DOMPoint(...a.point).matrixTransform(svg.getCTM().inverse()),current=n.line.getAttribute('d').split(' L ')[0];n.line.setAttribute('d',current+' L '+xy([q.x,q.y]));found=true;break;}}n.line.parentElement.style.display=found?'':'none';
  });
  svg.setAttribute('viewBox','0 0 640 515');svg.setAttribute('height',host.clientWidth*515/640);
  host.dataset.angle=angle;host.dataset.view=view;host.dataset.cameraYaw=camera==='front'?'16':'90';host.dataset.motion=view==='twist'?'yaw':'flexion';
 }
 return {render,frame,yawFrame,plates,frontZ,backZ,spineZ,profile,pickAt:paintedHit,source:'abdomen-anatomy-reviewed-curves'};
}
