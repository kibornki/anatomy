/* A new axial-twist plate. Meshes wrap around the torso; surface visibility and
   camera depth determine the overlap. Drawing units / maximum pose are artistic
   approximations, not measured joint ranges or muscle strain. */
function AbdomenTwist(host,flexion){
 const svg=host.querySelector('svg'),drawing=host.querySelector('.diagram-volumes'),labels=host.querySelector('.diagram-labels'),NS='http://www.w3.org/2000/svg';
 const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.appendChild(n);return n;};
 const plate=el('g',{'data-view':'twist','class':'twist-plate'},drawing),scene=el('g',{'class':'twist-scene'},plate),pelvis=el('g',{'data-part':'twist-pelvis'},plate),leader=el('g',{'class':'twist-labels'},labels);
 const palette={bone:'#e9ebee',cartilage:'#f9fafb',context:'#eef0f2',serratus:'#f39c6d','external-oblique':'#8bbfec','internal-oblique':'#70bd8a',rectus:'#e47d7b',latissimus:'#b38bdf',fascia:'#fafbfc'},meshes=[],lines=[];
 const rad=d=>d*Math.PI/180,mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const profile=[[90,17,18,-4],[150,65,42,0],[180,91,57,4],[230,104,70,7],[280,106,70,7],[335,95,59,6],[380,80,45,10],[420,85,44,11],[455,82,38,8],[490,38,29,6]];
 function section(y){let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);}
 function surface(phi,y,offset=0){const [rx,rz,cz]=section(y);return [(rx+offset)*Math.sin(phi),y,cz+(rz+offset)*Math.cos(phi)];}
 function spineZ(y){const [_,rz,cz]=section(y);return cz-rz+6;}
 function rig(degrees){const a=rad(Math.max(-140,Math.min(140,degrees)));
  // The base stays facing forward, the waist interpolates smoothly, and the
  // rib cage / girdle rotate together as one coherent volume.
  const theta=y=>a*(.82*smooth((455-y)/75)+.18*smooth((380-y)/85)),axis=spineZ(285);
  function at(q,level=q[1]){if(level>=455)return q.slice();const t=theta(level),z=q[2]-axis;return [q[0]*Math.cos(t)+z*Math.sin(t),q[1],axis-q[0]*Math.sin(t)+z*Math.cos(t)];}
  return {at,theta,angle:degrees,axis};
 }
 const yaw=rad(16),project=q=>[q[0]*Math.cos(yaw)+q[2]*Math.sin(yaw),q[1],-q[0]*Math.sin(yaw)+q[2]*Math.cos(yaw)],xy=q=>q.slice(0,2).map(v=>+v.toFixed(3)).join(',');
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=q=>Math.hypot(...q);
 function face(points,kind,options={}){const item={points,kind,...options};meshes.push(item);return item;}
 function line(points,cls,options={}){const item={points,className:cls,line:true,...options};lines.push(item);return item;}
 function patch(kind,fn,nu,nv,options={}){
  for(let v=0;v<nv;v++)for(let u=0;u<nu;u++)face([fn(u/nu,v/nv),fn((u+1)/nu,v/nv),fn((u+1)/nu,(v+1)/nv),fn(u/nu,(v+1)/nv)],kind,{...options,cull:true});
  return fn;
 }
 // Torso envelope: opaque white establishes correct front/back occlusion;
 // transparency reveals the skeleton without replacing it with a flat image.
 patch('fascia',(u,v)=>surface(2*Math.PI*u,155+300*v),64,64,{body:true});
 // Open ribs run from the posterior vertebral attachment around the flank to
 // their anterior costal ends. Each ribbon keeps its neutral length in yaw.
 for(let i=0;i<12;i++)for(const sign of [-1,1]){
  const base=173+i*15,width=[70,80,91,99,104,106,106,102,96,86,68,52][i],depth=section(base+15)[1],level=285;
  const rib=(t,dy=0)=>{const p=Math.PI-.12-(Math.PI-.12-.32)*t;return [sign*width*Math.sin(p),base+17*Math.sin(p)+dy,7+depth*Math.cos(p)];};
  for(let j=0;j<34;j++)face([rib(j/34),rib((j+1)/34),rib((j+1)/34,3.2),rib(j/34,3.2)],'bone',{level,outline:false,bone:'rib-'+(i+1)});
  for(const dy of [0,3.2])line(Array.from({length:35},(_,j)=>rib(j/34,dy)),'twist-bone-line',{level,bone:'rib-'+(i+1)});
  if(i<10){const a=rib(1),y=i<7?179+i*15:287+(i-7)*15,end=[sign*(i<7?9:30-(i-7)*6),y,section(y)[1]+8];
   const points=Array.from({length:9},(_,j)=>mix(a,end,j/8));for(let j=0;j<8;j++)face([points[j],points[j+1],points[j+1].map((v,k)=>k===1?v+4:v),points[j].map((v,k)=>k===1?v+4:v)],'cartilage',{level,outline:true,bone:'cartilage-'+(i+1)});
  }
 }
 // Vertebral bodies, posterior processes, and intervertebral spaces remain
 // separate pieces. The neck terminates at C1; there is no head or arm bone.
 for(const v of ClassicCoronalAnatomy.vertebrae){const y=v.y,w=v.w*.77,z=spineZ(y)-2,level=y<350?285:y;
  const corners=[[-w,y,z-7],[w,y,z-7],[w,y+8,z-7],[-w,y+8,z-7],[-w,y,z+9],[w,y,z+9],[w,y+8,z+9],[-w,y+8,z+9]];
  for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]])face(ids.map(i=>corners[i]),'bone',{level,outline:true,bone:v.id});
  face([[-3,y+2,z-7],[3,y+2,z-7],[4,y+10,z-18],[0,y+14,z-23],[-4,y+10,z-18]],'bone',{level,outline:true,bone:v.id+'-process'});
 }
 // Sternum and subdued pectoral context wrap the front; scapulae occupy the
 // posterior costal surface instead of reusing front-facing shoulder triangles.
 patch('bone',(u,v)=>{const y=151+144*v,[_,rz,cz]=section(y),w=v<.2?13:8;return [(u-.5)*w*2,y,cz+rz+2];},2,20,{level:285,outline:false});
 for(const sign of [-1,1]){
  const fn=(u,v)=>surface(sign*rad(7+66*u*(1-.17*v)),157+115*v,1);
  patch('context',fn,12,12,{level:285});
  // Flat scapular surface adapted to the same body landmarks on both sides.
  const scap=[ [sign*36,178,-54],[sign*64,173,-58],[sign*103,181,-30],[sign*112,198,-17],[sign*92,214,-34],[sign*61,283,-54],[sign*44,251,-65] ];
  face(scap.map(p=>[p[0],p[1],p[2]-12]),'bone',{level:285,outline:true,bone:'scapula-'+sign,always:true});
  line([[sign*39,198,-78],[sign*68,193,-77],[sign*100,180,-51],[sign*115,177,-29]],'twist-bone-line',{level:285,bone:'scapular-spine-'+sign});
  face([[sign*42,194,-78],[sign*72,187,-74],[sign*110,176,-35],[sign*118,181,-27],[sign*78,197,-73],[sign*43,202,-79]],'bone',{level:285,outline:true,bone:'scapular-spine-'+sign});
  const clav=(u,v)=>{const a=[sign*10,158,42],b=[sign*114,173,-6],q=mix(a,b,u);q[1]-=7*Math.sin(Math.PI*u);q[1]+=v*5;return q;};
  patch('bone',clav,20,1,{level:285,outline:true});
 }
 function muscle(kind,fn,nu=12,nv=22){patch(kind,fn,nu,nv,{muscle:kind});for(const side of [0,1]){line(Array.from({length:nv+1},(_,i)=>fn(side,i/nv)),'twist-muscle-outline',{muscle:kind});line(Array.from({length:nu+1},(_,i)=>fn(i/nu,side)),'twist-muscle-outline',{muscle:kind});}}
 function fiber(kind,fn,count,steps=28){for(let i=0;i<count;i++){const u=(i+.5)/count;line(Array.from({length:steps+1},(_,j)=>fn(u,j/steps)),'twist-fiber fibers',{muscle:kind,surface:true});}}
 // Rectus remains paired, with a central linea alba and three tendinous bands.
 for(const sign of [-1,1]){
  const fn=(u,v)=>{const y=276+210*v,w=25*(1-.55*v),x=sign*(4+u*w),[rx,rz,cz]=section(y);return [x,y,cz+(rz+2)*Math.sqrt(Math.max(0,1-(x/rx)**2))];};
  muscle('rectus',fn,5,28);fiber('rectus',fn,19);
  for(const y of [314,350,386]){const v=(y-276)/210;patch('cartilage',(u,t)=>fn(u,v+.009*t),8,1,{muscle:'rectus'});}
 }
 // External oblique surface and its descending inferomedial fibers. The small
 // peeled window belongs to the near flank, rather than a floating green tile.
 for(const sign of [-1,1]){
  const fn=(u,v)=>surface(sign*rad(28+83*u-8*v),278+156*v,2);
  muscle('external-oblique',fn,17,23);
  fiber('external-oblique',(u,v)=>surface(sign*rad(38+69*u-23*v),273+162*v,2.6),34);
 }
 const io=(u,v)=>surface(rad(43+31*u+5*Math.sin(v*Math.PI)),365+64*v,3.2);
 muscle('internal-oblique',io,9,13);fiber('internal-oblique',(u,v)=>surface(rad(46+25*u+15*v),428-61*v,3.8),22);
 // Serratus digitations converge posteriorly toward the costal scapular face.
 for(const sign of [-1,1])for(let i=0;i<8;i++){
  const fn=(u,v)=>{const phi=sign*rad(57+85*u),y=191+17*i-22*u+v*(9+5*Math.sin(Math.PI*u));return surface(phi,y,3);};
  muscle('serratus',fn,17,3);fiber('serratus',(u,v)=>fn(v,u),6);
 }
 // Each latissimus is one fan on the back. Wide lower origins narrow toward
 // the posterior axillary fold; the fan stays on the body throughout rotation.
 const rows=[[221,118,124],[254,119,148],[284,118,175],[325,124,176],[370,131,177],[420,145,174],[446,156,171]];
 const latCoords=(u,v)=>{const t=v*(rows.length-1),i=Math.min(rows.length-2,Math.floor(t)),r=mix(rows[i],rows[i+1],t-i);return [rad(r[1]+(r[2]-r[1])*u),r[0]];};
 for(const sign of [-1,1]){
  const fn=(u,v)=>{const [p,y]=latCoords(u,v);return surface(sign*p,y,4);};
  muscle('latissimus',fn,18,35);fiber('latissimus',fn,40);
 }
 // Thin thoracolumbar fascia follows the lumbar column between the fans.
 patch('fascia',(u,v)=>surface(rad(175+10*u),289+164*v,3.5),4,22);
 // A fixed copy of the accepted pelvis, projected with the same 16° camera.
 flexion.render(0,'front');
 for(const p of flexion.plates.front.paths.filter(p=>p.pelvis)){const n=p.n.cloneNode(false);n.removeAttribute('id');pelvis.appendChild(n);}
 const labelData=[['serratus','전거근',626,110],['external-oblique','외복사근',14,205],['internal-oblique','내복사근',626,350],['rectus','복직근',626,450],['latissimus','광배근',14,305]].map(([id,text,x,y])=>{const g=el('g',{'data-label':id},leader),p=el('path',{},g),n=el('text',{'x':x,'y':y,'text-anchor':x<100?'start':'end'},g);n.textContent=text;return {id,g,p,n,x,y};});
 const depthRenderer=AnatomyDepthRenderer(svg,{meshes,lines,rig,project,palette});scene.style.display='none';
 function render(angle){
  flexion.plates.front.g.style.display='none';flexion.plates.side.g.style.display='none';plate.style.display='';leader.style.display='';
  labels.querySelectorAll(':scope > g:not(.twist-labels)').forEach(n=>n.style.display='none');
  depthRenderer.show();const anchors=depthRenderer.render(angle,host.classList.contains('transparent'),!host.classList.contains('no-fibers'));
  drawing.setAttribute('transform','translate(310 -42) scale(1.04)');svg.setAttribute('viewBox','0 0 640 515');svg.setAttribute('height',host.clientWidth*515/640);
  for(const l of labelData){const found=anchors[l.id];l.g.style.display=found?'':'none';if(!found)continue;l.n.style.fontSize=(12*640/host.clientWidth)+'px';l.p.style.strokeWidth=640/host.clientWidth;l.p.setAttribute('d',`M ${l.x},${l.y+5} L ${xy([found.x,found.y])}`);l.g.dataset.target=l.id;}
  host.dataset.angle=angle;host.dataset.view='twist';host.dataset.cameraYaw='16';host.dataset.motion='yaw';return;

 }
 function hide(){depthRenderer.hide();plate.style.display='none';leader.style.display='none';labels.querySelectorAll(':scope > g:not(.twist-labels)').forEach(n=>n.style.display='');}
 return {render,hide,rig,section,surface,meshes,lines,plate,pelvis,project,depthRenderer};
}
