/* Original coronal drawing landmarks. OpenStax A&P 2e 7.3/7.4/8.3/11.5
   informs connections, not measured body proportions or clinical kinematics. */
const ClassicCoronalAnatomy=(()=>{
 // Width corrections are relative to textbook drawings, not clinical norms.
 // Rib width/height was 1.239; 0.77 gives ~0.95. Keep arm rotation rigid.
 const proportions={axialWidth:.77,girdleWidth:.70,pelvisWidth:.86,humerusLength:1.18};
 const body=p=>[p[0]*proportions.axialWidth,p[1]];
 const vertebrae=[...Array.from({length:7},(_,i)=>({id:'C'+(i+1),region:'cervical',y:83+i*12,w:9})),...Array.from({length:12},(_,i)=>({id:'T'+(i+1),region:'thoracic',y:173+i*16,w:11+i*.15})),...Array.from({length:5},(_,i)=>({id:'L'+(i+1),region:'lumbar',y:373+i*18,w:15+i*.4}))];
 const extents=[88,103,117,128,134,137,138,135,127,115,93,70];
 const anterior=[[49,191],[55,216],[61,235],[67,253],[73,272],[79,288],[85,302],[96,321],[100,342],[98,363],[67,377],[49,386]];
 const sternumY=[178,202,220,237,253,269,283];
 const ribs=vertebrae.filter(v=>v.region==='thoracic').map((v,i)=>({number:i+1,type:i<7?'true':i<10?'false':'floating',y:v.y,extent:extents[i],end:anterior[i],cartilageEnd:i<7?[i===0?17:12,sternumY[i]]:i<10?anterior[i-1]:null}));
 const ribPoint=(r,t)=>{const u=1-t,a=[r.extent,r.y+10],b=[r.extent+3,r.y+27],c=[r.end[0]+18,r.end[1]-4],d=r.end;return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]);};
 const serratusOrigins=ribs.slice(0,8).map(r=>body(ribPoint(r,.2)));
 function girdle(angle){
  const lift=(angle-15)/105,up=30*lift,r=-up*Math.PI/180;
  const S=p=>{const x=p[0]-112,y=(p[1]-190)*.9;return [(112+x*Math.cos(r)-y*Math.sin(r)+5*lift)*proportions.girdleWidth,190+x*Math.sin(r)+y*Math.cos(r)-12*lift];};
  const a=angle*Math.PI/180,d=[Math.sin(a),Math.cos(a)],n=[Math.cos(a),-Math.sin(a)],g=S([165,176]);
  const H=[g[0]+13*n[0],g[1]+13*n[1]],at=(s,o=0)=>[H[0]+s*proportions.humerusLength*d[0]+o*n[0],H[1]+s*proportions.humerusLength*d[1]+o*n[1]];
  return {lift,up,S,H,at,scapTransform:`scale(${proportions.girdleWidth} 1) translate(${5*lift} ${-12*lift}) rotate(${-up} 112 190) translate(0 19) scale(1 .9)`};
 }
 function draw(axial,el,path,view){
  axial.setAttribute('transform',`scale(${proportions.axialWidth} 1)`);
  const context=el('g',{'data-part':'coronal-torso-context'},axial);
  path('M -78,157 Q -127,166 -138,235 Q -148,297 -113,357 Q -108,389 -105,413 Q -128,432 -127,460 L -90,485 Q -46,469 0,474 Q 46,469 90,485 L 127,460 Q 128,432 105,413 Q 108,389 113,357 Q 148,297 138,235 Q 127,166 78,157 Z','torso-context',context);
  const column=el('g',{'data-part':'coronal-vertebrae'},axial);
  for(const v of vertebrae){
   const g=el('g',{'data-vertebra':v.id,'data-region':v.region},column),{w,y}=v;
   path(`M ${-w},${y} Q 0,${y-3} ${w},${y} L ${w+2},${y+8} Q 0,${y+13} ${-w-2},${y+8} Z`,'bone',g);
   if(view==='back')path(`M -3,${y+3} L 3,${y+3} L 4,${y+12} L 0,${y+15} L -4,${y+12} Z`,'bone',g);
  }
  for(const sign of [-1,1]){
   const side=el('g',{transform:`scale(${sign} 1)`,'data-side':sign},axial);
   for(const r of ribs){
    const g=el('g',{'data-rib':r.number,'data-rib-type':r.type},side),{y,extent:x,end:e}=r;
    // Open rib arc, with a separate anterior end. The small floating ribs
    // finish laterally, without adding them to the anterior costal arch.
    const curve=`M 13,${y} C 51,${y-13} ${x-10},${y-17} ${x},${y+10} C ${x+3},${y+27} ${e[0]+18},${e[1]-4} ${e[0]},${e[1]}`;
    if(view==='front')path(curve,'rib-outline',g);
    const bone=path(curve,'rib',g);
    if(view==='front')bone.setAttribute('style','fill:none;stroke:color-mix(in srgb,var(--foreground) 10%,var(--background));stroke-width:4;stroke-linecap:round');
    if(view==='front'&&r.cartilageEnd){const c=r.cartilageEnd;
     const p=path(`M ${e[0]},${e[1]} Q ${(e[0]+c[0])/2},${e[1]-4} ${c[0]},${c[1]} L ${c[0]},${c[1]+6} Q ${(e[0]+c[0])/2},${e[1]+3} ${e[0]-2},${e[1]+6} Z`,'cartilage',g);
     p.setAttribute('data-connects-to',r.number<=7?'sternum':'rib-'+(r.number-1));
    }
   }
   const pelvis=el('g',{'data-part':'coronal-hip-bone',transform:`scale(${proportions.pelvisWidth/proportions.axialWidth} 1)`},side);
   const hip=view==='front'?'M 25,442 Q 20,425 39,420 Q 75,400 106,420 Q 124,433 113,446 L 99,457 Q 104,464 91,471 Q 86,476 88,487 Q 90,508 66,515 Q 49,511 4,495 L 4,479 Q 35,480 58,468 Q 65,454 45,447 Q 30,456 25,442 Z M 47,482 Q 62,469 73,483 Q 76,499 63,503 Q 48,500 37,491 Q 36,484 47,482 Z':'M 20,440 Q 28,422 49,416 Q 80,401 103,416 Q 115,425 108,441 L 91,452 Q 83,459 86,471 L 92,490 Q 87,506 66,510 Q 47,505 32,491 L 26,478 Q 39,467 44,456 L 29,449 Z M 47,479 Q 62,470 72,482 Q 74,495 61,498 Q 47,496 44,486 Z';
   path(hip,'bone',pelvis).setAttribute('fill-rule','evenodd');
   path('M 33,430 Q 74,409 103,430','bone-detail',pelvis);
   if(view==='front')path('M 94,459 Q 82,461 85,475','bone-detail',pelvis);
  }
  const sacrum=path(view==='front'?'M -20,449 Q 0,441 20,449 L 22,457 Q 18,474 0,486 Q -18,474 -22,457 Z':'M -18,445 Q 0,439 18,445 L 22,459 Q 17,485 0,497 Q -17,485 -22,459 Z','bone',axial);sacrum.setAttribute('data-part','coronal-sacrum');sacrum.setAttribute('transform',`scale(${view==='front'?1.4:1.2} 1)`);
  path(view==='front'?'M -3,485 Q 3,490 0,495':'M -3,496 Q 3,501 0,508','bone-detail',axial);
  if(view==='front'){
   path('M -4,479 L 4,479 L 4,495 L -4,495 Z','cartilage',axial).setAttribute('data-part','coronal-pubic-symphysis');
   const g=el('g',{'data-part':'coronal-sternum'},axial);
   path('M -17,148 Q -10,144 -7,153 L 7,153 Q 10,144 17,148 L 20,177 L 12,196 L 11,277 Q 12,286 5,290 L 0,300 L -5,290 Q -12,286 -11,277 L -12,196 L -20,177 Z','bone',g);
   path('M -12,196 L 12,196 M -10,219 L 10,219 M -10,240 L 10,240 M -9,261 L 9,261','bone-detail',g);
  }else{
   const fascia=path('M -9,347 L 9,347 Q 27,377 23,427 L 15,456 L 0,474 L -15,456 L -23,427 Q -27,377 -9,347 Z','fascia',axial);
   axial.insertBefore(fascia,column);
  }
 }
 // Keep leaders inside their muscle as the humeral attachment moves.
 function anchor(shape,hitAt=(x,y)=>document.elementFromPoint(x,y)){
  const b=shape.getBBox(),screen=shape.getScreenCTM(),local=shape.getCTM(),points=[];
  for(let row=0;row<13;row++)for(let col=0;col<13;col++)points.push(new DOMPoint(b.x+b.width*(col+.5)/13,b.y+b.height*(row+.5)/13));
  points.sort((a,c)=>Math.hypot(a.x-b.x-b.width/2,a.y-b.y-b.height/2)-Math.hypot(c.x-b.x-b.width/2,c.y-b.y-b.height/2));
  let fallback=null;
  for(const p of points){if(!shape.isPointInFill(p))continue;fallback??=p;
   const q=p.matrixTransform(screen),hit=hitAt(q.x,q.y);
   if(hit===shape||hit?.closest('[clip-path]')?.getAttribute('clip-path')===`url(#${shape.id}-clip)`){const s=p.matrixTransform(local);return {point:[s.x,s.y],visible:true};}
  }
  if(fallback){const s=fallback.matrixTransform(local);return {point:[s.x,s.y],visible:false};}
  return null;
 }
 return {vertebrae,ribs,ribPoint,serratusOrigins,girdle,draw,anchor,body,proportions};
})();
