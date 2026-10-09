/* Original abdomen plate, in the coordinate system of the reviewed upper body.
   Costal and pelvic paths are reused verbatim. Fiber curves depict direction,
   not measured strain, activation, or a subject-specific muscle volume. */
function AbdomenDraft(host) {
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
 function bone(g,d,cls='bone'){return path(d,cls,g);}
 const C=ClassicCoronalAnatomy,S=ClassicSideAnatomy,B=C.body;
 function buildFront(){
  const g=el('g',{'data-view':'front'},drawing),axial=el('g',{},g);C.draw(axial,el,path,'front');
  const G=C.girdle(35),at=G.at;
  const humerus='M -13,-12 C -30,-9 -31,10 -20,23 C -14,34 -12,54 -10,83 L -8,139 C -8,150 -19,158 -17,167 Q -14,175 -6,171 Q 0,176 8,170 Q 21,172 21,163 C 20,154 10,149 10,139 L 12,72 Q 12,41 22,20 C 32,1 13,-23 -2,-20 Q -9,-20 -13,-12 Z';
  const scapula='M 147,159 Q 127,145 89,165 Q 85,212 109,291 Q 121,298 130,277 L 163,190 Q 177,180 166,161 L 160,154 Q 164,144 151,143 L 135,146 Q 128,151 139,155 Z';
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`,'data-part':'shoulder-skeleton'},g);
   bone(side,scapula).setAttribute('transform',G.scapTransform);
   bone(side,`M ${xy(B([18,151]))} Q ${xy(B([61,139]))} ${xy(G.S([170,163]))} L ${xy(mix(G.S([170,163]),[G.S([170,163])[0],G.S([170,163])[1]+7],1))} Q ${xy(B([67,151]))} ${xy(B([18,160]))} Z`);
   const arm=el('g',{transform:`translate(${xy(G.H)}) rotate(-35) scale(1 1.18)`},side);bone(arm,humerus);
   bone(arm,'M -20,19 Q -1,29 18,13 M 1,35 Q 5,83 2,138 M -7,160 Q 1,151 11,161','bone-detail');
  }
  const muscles=el('g',{class:'muscle-layers'},g);
  // Broad white aponeuroses continue to the linea alba and pubic attachments.
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`},muscles);
   path('M 32,302 Q 58,303 65,346 Q 65,396 80,423 Q 58,450 12,491 L 3,491 L 3,304 Z','aponeurosis',side);
   const af=el('g',{class:'fibers'},side);
   for(let i=0;i<20;i++){const t=i/19;path(`M ${xy([45+29*t,338+84*t])} Q ${xy([29+17*t,374+76*t])} ${xy([3,400+87*t])}`,'aponeurosis-fiber',af);}
   // One oblique sheet, with costal digitations rather than rectangular panels.
   const eoD='M 82,254 Q 90,259 94,264 L 84,271 Q 96,273 97,281 L 81,290 Q 92,293 93,302 L 78,312 Q 89,317 90,325 L 79,329 Q 91,338 86,346 L 68,363 Q 80,371 76,380 Q 83,397 91,417 Q 82,427 72,431 Q 54,438 39,427 C 36,398 32,371 35,342 Q 37,312 57,286 Q 66,269 82,254 Z';
   const eo=region(side,eoD,'blue','external-oblique');
   const eoFibers=[];
   for(let i=0;i<44;i++){const t=i/43,o=[98-24*Math.pow(t,1.9),253+126*t],e=[35+36*t,323+108*t];eoFibers.push(`M ${xy(o)} C ${xy([o[0]-6,o[1]+27])} ${xy([e[0]+14,e[1]-18])} ${xy(e)}`);}
   fibers(eo,eoFibers);
   // Connected serratus fan: posterior insertion and eight costal slips.
   const origins=[[82,195],[76,213],[78,235],[82,254],[84,271],[81,290],[78,312],[79,329]],insert=t=>[104-5*t,210+76*t];
   const d='M 82,192 Q 103,220 106,249 Q 108,276 100,300 Q 96,324 85,339 L 79,329 Q 88,319 84,314 L 78,312 Q 90,300 87,292 L 81,290 Q 95,280 91,274 L 84,271 Q 96,262 90,257 L 82,254 Q 91,245 85,238 L 78,235 Q 84,222 77,215 L 73,212 Q 76,200 82,192 Z';
   const sa=region(side,d,'orange','serratus');
   const wall=el('clipPath',{id:'front-wall-'+sign},defs),wallShape=path('M 45,154 Q 102,163 107,237 Q 112,290 91,334 L 72,345 L 45,305 Z','',wall);
   sa.layer.setAttribute('clip-path',`url(#front-wall-${sign})`);masks.push({view:'front',n:wallShape,sign});
   fibers(sa,Array.from({length:40},(_,j)=>{const i=Math.floor(j/5),t=(j%5+1)/6,o=[origins[i][0]+5*t,origins[i][1]+t*6],e=insert((i+t)/8),c=mix(o,e,.55);c[1]+=3;return `M ${xy(o)} Q ${xy(c)} ${xy(e)}`;}));
   // Pectoral context follows the existing upperbody outline and covers the
   // upper serratus, as in the supplied superficial-anatomy reference.
   const p=at(34,-8),q=at(72,-8);
   path(`M ${xy(B([22,153]))} Q ${xy(B([53,151]))} ${xy(B([88,153]))} Q ${xy(mix(B([88,153]),q,.55))} ${xy(q)} L ${xy(p)} Q ${xy([p[0]-35,(p[1]+277)/2+9])} ${xy(B([55,276]))} Q ${xy(B([27,286]))} ${xy(B([19,263]))} L ${xy(B([17,185]))} Z`,'context-muscle',side);
  }
  // On the near side, an organic peeled section exposes the intermediate layer.
  const ioD='M 78,350 Q 88,359 86,378 Q 83,397 87,414 Q 66,425 53,416 Q 43,401 45,382 Q 50,364 62,359 Q 73,358 78,350 Z';
  const io=region(muscles,ioD,'green','internal-oblique');
  fibers(io,Array.from({length:30},(_,i)=>{const t=i/29,o=[48+39*t,420-7*t],e=[40+44*t,374-37*t];return `M ${xy(o)} C ${xy([o[0]-12,397-22*t])} ${xy([e[0]+7,e[1]+12])} ${xy(e)}`;}));
  path('M 78,350 Q 88,359 86,378 Q 83,397 87,414','section-edge',muscles);
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
  return {g,anchors:{serratus:[96,290],external:[-63,359],internal:[66,383],rectus:[19,366]},ys:[244,350,410,475]};
 }
 function buildSide(){
  const g=el('g',{'data-view':'side'},drawing),skeleton=el('g',{},g);drawSideSkeleton(skeleton,el,path);
  const muscles=el('g',{class:'muscle-layers'},g),ribs=S.ribs;
  // Iliac crest, costal margin, and anterior abdominal wall establish the fan.
  path('M 44,293 Q 69,319 56,347 Q 58,369 53,389 L 32,424 Q 49,403 56,373 Q 65,335 44,293 Z','aponeurosis',muscles);
  const eo=region(muscles,'M 12,235 Q 22,246 31,250 L 22,260 Q 39,261 46,271 L 32,281 Q 51,284 54,294 L 38,304 Q 48,311 43,322 L 25,328 Q 36,338 32,348 L 14,350 Q 14,368 28,385 Q 40,394 48,395 Q 28,407 7,392 Q -6,381 -32,381 Q -49,384 -51,392 Q -47,366 -50,337 Q -51,309 -53,278 Q -32,252 12,235 Z','blue','external-oblique');
  const ef=[];
  for(let i=0;i<58;i++){
   const t=i/57,y=188+210*t,o=[-63,y],e=[68,y+121];
   // Upper-anterior fibers descend medially into the white aponeurosis;
   // posterior fibers descend almost vertically into the iliac crest.
   ef.push(`M ${xy(o)} C ${xy([-43,y+38])} ${xy([24,y+95])} ${xy(e)}`);
  }
  fibers(eo,ef);
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
  // The intermediate layer is shown through a curved opening in EO, while
  // the outer sheet keeps its costal and iliac continuity around the opening.
  const io=region(muscles,'M -10,347 Q 3,330 21,337 Q 29,342 24,353 Q 24,364 30,371 Q 21,384 9,382 Q -4,375 -16,376 Q -19,358 -10,347 Z','green','internal-oblique');
  fibers(io,Array.from({length:32},(_,i)=>{const t=i/31,o=[-24+49*t,377+5*t],e=[8+24*t,334+30*t];return `M ${xy(o)} C ${xy([o[0]-2,361])} ${xy([e[0]-7,e[1]+13])} ${xy(e)}`;}));
  path('M -10,347 Q 3,330 21,337 Q 29,342 24,353 Q 24,364 30,371','section-edge',muscles);
  // A narrow sagittal projection of the paired rectus, from costal cartilage
  // and xiphoid to the pubis. It follows the abdominal convexity.
  const ra=region(muscles,'M 69,268 Q 77,280 73,298 Q 68,321 62,342 Q 58,373 51,393 Q 43,414 32,424 L 27,420 Q 39,398 45,379 Q 49,353 52,331 Q 57,304 58,288 Q 60,278 69,268 Z','red','rectus');
  fibers(ra,Array.from({length:12},(_,i)=>{const t=(i+1)/13;return `M ${xy([59+12*t,288-10*t])} C ${xy([62+8*t,318])} ${xy([45+9*t,374])} ${xy([27+5*t,420])}`;}));
  const bands=el('g',{'clip-path':`url(#${ra.shape.id}-clip)`},ra.layer);
  for(const [x,y] of [[57,285],[53,314],[48,343]])path(`M ${x},${y} Q ${x+8},${y+2} ${x+18},${y+5} L ${x+18},${y+7} Q ${x+6},${y+4} ${x},${y+2} Z`,'intersection',bands);
  // Subdued shoulder context, reused scapular outline. It conceals the
  // serratus insertion rather than letting the fan float behind the back.
  path('M -34,177 Q -58,208 -49,265 Q -34,251 -7,174 Q -15,164 -34,177 Z','bone',g);
  path('M -49,191 Q -26,178 -7,171 M -47,257 L -51,203','bone-detail',g);
  path('M 44,169 Q 21,156 -7,168 L -7,175 Q 20,164 46,176 Z','bone',g);
  path('M -2,170 Q 15,170 16,188 L 12,252 Q 10,265 0,266 L -10,263 Q -18,258 -13,247 L -14,190 Q -18,179 -2,170 Z','bone',g);
  path('M -10,186 Q 1,195 12,183 M -5,210 L -3,246','bone-detail',g);
  path('M 44,174 Q 61,189 69,221 Q 78,249 67,278 Q 43,257 13,215 L 14,192 Q 27,176 44,174 Z','context-muscle',g);
  return {g,anchors:{serratus:[36,270],external:[-41,327],internal:[7,353],rectus:[58,335]},ys:[200,320,377,429]};
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
 for(const [view,plate] of Object.entries(plates)){
  plate.paths=Array.from(plate.g.querySelectorAll('path')).map(n=>{
   const matrix=n.getCTM(),gMatrix=plate.g.getCTM(),local=gMatrix.inverse().multiply(matrix);
   const pelvis=!!n.closest('[data-part="coronal-hip-bone"],[data-part="coronal-sacrum"],[data-part="coronal-pubic-symphysis"]')||(view==='side'&&(/pelvis/.test(n.classList.value)||n.getAttribute('d')?.includes('475')));
   const posterior=!!n.closest('[data-part="coronal-vertebrae"]');
   const points=samples(n.getAttribute('d')).map(q=>{if(!q.p)return q;const p=new DOMPoint(...q.p).matrixTransform(local);return {...q,xyz:view==='side'?[0,1.24*p.y-39,p.x]:[p.x,p.y,posterior?spineZ(p.y):frontZ(p.x,p.y)]};});
   const rigid=!!n.closest('[data-rib],[data-part="coronal-sternum"],[data-part="shoulder-skeleton"]');
   return {n,points,pelvis,rigid};
  });
  for(const m of masks.filter(m=>m.view===view))plate.paths.push({n:m.n,pelvis:false,points:samples(m.n.getAttribute('d')).map(q=>q.p?{...q,xyz:[m.sign*q.p[0],q.p[1],frontZ(m.sign*q.p[0],q.p[1])]}:q)});
  // Coordinates have been baked; remove the neutral transforms afterwards.
  plate.g.querySelectorAll('[transform]').forEach(n=>n.removeAttribute('transform'));
 }
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function frame(angle){
  const rad=angle*Math.PI/180,alpha=y=>rad*smooth((430-y)/65),centers=new Map();let cy=430,cz=spineZ(430);centers.set(430,[cy,cz]);
  for(let y=429;y>=60;y--){const a=alpha(y+.5),dy=-1,dz=spineZ(y)-spineZ(y+1);cy+=dy*Math.cos(a)+dz*Math.sin(a);cz+=-dy*Math.sin(a)+dz*Math.cos(a);centers.set(y,[cy,cz]);}
  function deform([x,y,z],fixed=false){if(fixed||y>=430)return [x,y,z];const lo=Math.floor(y),t=y-lo,a=alpha(y),ca=centers.get(lo)||centers.get(60),cb=centers.get(lo+1)||ca,c=mix(ca,cb,t),dz=z-spineZ(y);return [x,c[0]+dz*Math.sin(a),c[1]+dz*Math.cos(a)];}
  function rigid([x,y,z]){const c=centers.get(365),dy=y-365,dz=z-spineZ(365);return [x,c[0]+dy*Math.cos(rad)+dz*Math.sin(rad),c[1]-dy*Math.sin(rad)+dz*Math.cos(rad)];}
  return {deform,rigid,alpha};
 }
 const nodes=['serratus','external','internal','rectus'].map((id,i)=>{const group=el('g',{'data-label':id},labels),line=path('','',group),text=el('text',{},group);text.textContent=['전거근','외복사근','내복사근','복직근'][i];return {line,text};});
 function render(angle,view){
  const f=frame(angle),plate=plates[view],yaw=16*Math.PI/180,project=p=>view==='side'?[p[2],p[1]]:[p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1]];
  for(const [v,p] of Object.entries(plates))p.g.style.display=v===view?'':'none';
  for(const p of plate.paths)p.n.setAttribute('d',p.points.map(q=>q.cmd==='Z'?'Z':q.cmd+' '+xy(project(p.rigid?f.rigid(q.xyz):f.deform(q.xyz,p.pelvis)))).join(' '));
  const center=view==='side'?325:310,scale=1.04,top=-42;
  drawing.setAttribute('transform',`translate(${center} ${top}) scale(${scale})`);
  // Labels use the same point deformation as the fibers and attachments.
  nodes.forEach((n,i)=>{const key=['serratus','external','internal','rectus'][i],p=plate.anchors[key],xyz=view==='side'?[0,1.24*p[1]-39,p[0]]:[p[0],p[1],frontZ(...p)],q=project(f.deform(xyz)),left=i===1||i===3,x=left?14:626,y=100+i*105;
   n.text.style.fontSize=(12*640/host.clientWidth)+'px';n.line.style.strokeWidth=640/host.clientWidth;
   n.text.setAttribute('x',x);n.text.setAttribute('y',y);n.text.setAttribute('text-anchor',left?'start':'end');n.line.setAttribute('d',`M ${x},${y+5} L ${xy([center+q[0]*scale,top+q[1]*scale])}`);
  });
  // Select a visible painted point on the intended layer, including cutaways.
  // Reuse the reviewed upperbody hit-test rather than aiming at hidden fibers.
  nodes.forEach((n,i)=>{const key=['serratus','external-oblique','internal-oblique','rectus'][i],targets=Array.from(plate.g.querySelectorAll(`[data-muscle="${key}"] > .muscle`));
   for(const target of (i===1||i===3?targets:targets.reverse())){const a=C.anchor(target);if(a?.visible){const q=new DOMPoint(...a.point).matrixTransform(svg.getCTM().inverse()),current=n.line.getAttribute('d').split(' L ')[0];n.line.setAttribute('d',current+' L '+xy([q.x,q.y]));break;}}
  });
  svg.setAttribute('viewBox','0 0 640 515');svg.setAttribute('height',host.clientWidth*515/640);
  host.dataset.angle=angle;host.dataset.view=view;host.dataset.cameraYaw=view==='front'?'16':'90';
 }
 return {render,frame,plates,frontZ,profile,source:'shared-classic-skeleton-abdominal-flow-draft'};
}
