/* Static shells: BodyParts3D © DBCLS, CC BY-SA 2.1 Japan.
 * Tendon plate and fascicles: authored from the approved posterior reference.
 * Elbow skinning is illustrative; it does not simulate tissue mechanics. */
function AtlasArm(root){
 const atlas=JSON.parse(document.getElementById('arm-atlas').textContent),landmarks=JSON.parse(document.getElementById('arm-landmarks').textContent),svg=root.querySelector('svg'),defs=svg.querySelector('defs'),drawing=root.querySelector('.diagram-volumes'),labels=root.querySelector('.diagram-labels');
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 const composition=AnatomyComposition(root,atlas.parts,'arm');
 const motion=ArmMotion(atlas,JSON.parse(document.getElementById('arm-motion-reference').textContent)),forearm=motion.forearm,collision=ArmBoneCollision(atlas,forearm);
 function skin(p,part,angle){const q=motion.deform(composition.point(part,p),part,angle);return part.kind==='bone'?q:collision.constrain(q,part,angle);}
 const colors={'bone':'#e8e9eb','context':'#cbd1d9','tendon':'#f7f7f3'};
 const fiberGuides=JSON.parse(document.getElementById('arm-fiber-guides').textContent).parts;
 const nodes=atlas.parts.map((part,i)=>{
  const g=make('g',{'data-atlas-part':part.name,'data-muscle':part.kind==='muscle'?part.name:'','data-kind':part.kind,'data-display-layer':'anatomy'},drawing),clip=make('clipPath',{id:'arm-clip-'+i},defs),mask=make('path',{},clip);
  const fill=make('path',{class:'atlas-fill '+part.kind,fill:colors[part.color]||(/^(biceps-|triceps-)/.test(part.name)?'color-mix(in srgb,var(--'+part.color+') 85%,white)':'var(--'+part.color+')')},g),outline=make('path',{fill:'none',stroke:'var(--muted-foreground)','stroke-width':part.kind==='bone'?.9:.55,'stroke-opacity':part.kind==='bone'?.8:.4},g),fiber=make('path',{class:'fibers fiber',fill:'none',stroke:'var(--foreground)','clip-path':'url(#arm-clip-'+i+')'},g);
  return {part,g,mask,fill,outline,fiber,i,guides:fiberGuides[part.name]||part.fibers};
 });
 const lightSurfaces=ArmSurfaceLighting(make,nodes);
 composition.mountFat(make,drawing);
 const sculpt=ArmSculptLayer({atlas,landmarks,make,defs,drawing,svg});
 const specs={
  front:[['deltoid-anterior','삼각근 전면',55,105],['deltoid-middle','삼각근 측면',585,145],['biceps-long','이두근 장두',55,245],['biceps-short','이두근 단두',585,280],['triceps-lateral','삼두근 외측두',55,340]],
  back:[['deltoid-posterior','삼각근 후면',55,105],['triceps-long','삼두근 장두',55,245],['triceps-lateral','삼두근 외측두',585,280],['triceps-medial','삼두근 내측두',585,355],['triceps-aponeurosis','삼두 건막',55,400]],
  side:[['deltoid-middle','삼각근',585,105],['biceps-long','이두근 장두',585,245],['triceps-lateral','삼두근 외측두',55,280],['triceps-long','삼두근 장두',55,340],['triceps-aponeurosis','삼두 건막',55,400]]
 };
 const labelNodes=new Map();for(const list of Object.values(specs))for(const [name,text,x,y]of list){if(labelNodes.has(name))continue;const g=make('g',{'data-label':name},labels),line=make('path',{},g),t=make('text',{},g);t.textContent=text;labelNodes.set(name,{g,line,text:t});}
 const curve=ps=>{if(ps.length<3)return '';let d='M'+ps[0].join(',');for(let i=1;i<ps.length-1;i++)d+='Q'+ps[i].join(',')+' '+ps[i].map((v,j)=>(v+ps[i+1][j])/2).join(',');return d+'L'+ps.at(-1).join(',');};
 const offsets=new Map();for(const [view,degrees]of [['front',16],['side',90],['back',164]]){const a=degrees*Math.PI/180;let min=Infinity,max=-Infinity;for(const p of atlas.parts.filter(p=>p.kind==='bone'))for(const v of p.v){const x=v[0]*Math.cos(a)+v[2]*Math.sin(a);min=Math.min(min,x);max=Math.max(max,x);}offsets.set(view,320-(min+max)*1.05/2);}
 let debug=null,lastVisibility=null,lastKey='',posedAngle=NaN,posedCache=null,posedComposition=-1;
 function render(angle,view='front',mode='anatomy',landmark='acromioclavicular'){
  const transparent=root.classList.contains('transparent'),fibersOn=!root.classList.contains('no-fibers'),key=[angle,view,transparent,fibersOn,composition.key,mode,landmark].join();if(key===lastKey)return;lastKey=key;
  const start=performance.now(),degrees=view==='side'?90:view==='back'?164:16,a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const project=p=>[offsets.get(view)+(p[0]*c+p[2]*s)*1.05,15+(p[1]-29)*1.05],depth=p=>-p[0]*s+p[2]*c;
  if(posedAngle!==angle||posedComposition!==composition.key){posedAngle=angle;posedComposition=composition.key;posedCache=nodes.map(n=>n.part.v.map(p=>skin(p,n.part,angle)));}
  const posed=posedCache,buffer=ArmVisibility({project,depth,step:.9,accept:(ps,wa,wb,wc,id)=>id>=nodes.length||nodes[id].part.kind==='bone'||collision.minimumXYZ(ps[0][0]*wa+ps[1][0]*wb+ps[2][0]*wc,ps[0][1]*wa+ps[1][1]*wb+ps[2][1]*wc,ps[0][2]*wa+ps[1][2]*wb+ps[2][2]*wc,angle)>=.65});
  sculpt.render({posed,project,depth,angle,view,mode,landmark,transparent,forearm});
  nodes.forEach((n,i)=>n.part.f.forEach(f=>buffer.triangle(...f.map(j=>posed[i][j]),i)));
  const fatCount=composition.paintFat(buffer,posed,nodes.length);
  const visible=buffer.solve(nodes.length+fatCount,{projections:i=>i>=nodes.length||nodes[i].part.kind!=='bone',scanlineClips:false,occludes:i=>i>=nodes.length?!composition.fatTransparent:!transparent||nodes[i].part.kind==='bone'});
  lastVisibility={...visible,offset:offsets.get(view),degrees};
  nodes.forEach((n,i)=>{
   const soft=n.part.kind!=='bone',local=visible.ownerZ[i],inside=k=>transparent&&soft?local[k]>-Infinity:visible.owners[k]===i;
   const contour=AtlasContour(visible,inside,visible.bounds[i]);n.fill.setAttribute('d',contour);n.outline.setAttribute('d',contour);n.mask.setAttribute('d',contour);n.g.setAttribute('opacity',transparent&&soft?.32:1);
   let path='';if(fibersOn)for(const fiber of n.guides){let segment=[];const flush=()=>{let length=0;for(let j=1;j<segment.length;j++)length+=Math.hypot(...segment[j].map((v,k)=>v-segment[j-1][k]));if(length>=5)path+=curve(segment);segment=[];};for(const p of fiber){const point=skin(p,n.part,angle),q=project(point),x=Math.floor((q[0]-visible.x0)/visible.step),y=Math.floor((q[1]-visible.y0)/visible.step),k=y*visible.w+x;
     if(x>=0&&x<visible.w&&y>=0&&y<visible.h&&depth(point)>=local[k]-2.5&&(transparent||visible.owners[k]===i))segment.push(q);else flush();}flush();}
   n.fiber.setAttribute('d',path);n.fiber.setAttribute('stroke-opacity',n.part.kind==='tendon'?.18:.28);
  });
  lightSurfaces(visible);
  composition.drawFat(visible,nodes.length,AtlasContour);
  labelNodes.forEach(n=>n.g.style.display='none');
  for(const [name,text,x,y]of specs[view]){
   const id=nodes.findIndex(n=>n.part.name===name);let points=visible.centers[id];if(transparent){points=[];const b=visible.bounds[id],local=visible.ownerZ[id];for(let iy=b[1];iy<=b[3];iy+=6)for(let ix=b[0];ix<=b[2];ix+=6)if(local[iy*visible.w+ix]>-Infinity)points.push([visible.x0+(ix+.5)*visible.step,visible.y0+(iy+.5)*visible.step]);}
   const hit=svg.createSVGPoint();points=points.filter(p=>{hit.x=p[0];hit.y=p[1];return nodes[id].fill.isPointInFill(hit);});
   if(points.length<3||!transparent&&visible.coverage[id]<80)continue;const avg=points.reduce((sum,p)=>sum.map((v,j)=>v+p[j]/points.length),[0,0]),target=points.reduce((best,p)=>Math.hypot(...p.map((v,j)=>v-avg[j]))<Math.hypot(...best.map((v,j)=>v-avg[j]))?p:best);
   const n=labelNodes.get(name);n.g.style.display='';n.text.textContent=text;n.text.setAttribute('x',x);n.text.setAttribute('y',y);n.text.setAttribute('text-anchor',x<320?'start':'end');n.line.setAttribute('d',`M${x},${y+5}L${target.join(',')}`);
  }
  svg.setAttribute('viewBox','0 0 640 430');svg.setAttribute('height',root.clientWidth*430/640);root.dataset.cameraYaw=degrees;
  debug={angle,view,posed:posed.map((v,i)=>({name:nodes[i].part.name,kind:nodes[i].part.kind,forearm:!!nodes[i].part.forearm,v})),coverage:visible.coverage,duration:performance.now()-start};
 }
 return {render,atlas,landmarks,skin,forearm,collision,motion,composition,sculpt,get debug(){return debug;},get visibility(){return lastVisibility;}};
}
