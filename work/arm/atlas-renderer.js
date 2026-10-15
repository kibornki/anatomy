/* Static shells: BodyParts3D © DBCLS, CC BY-SA 2.1 Japan.
 * Tendon plate and fascicles: authored from the approved posterior reference.
 * Elbow skinning is illustrative; it does not simulate tissue mechanics. */
function AtlasArm(root){
 const atlas=JSON.parse(document.getElementById('arm-atlas').textContent),landmarks=JSON.parse(document.getElementById('arm-landmarks').textContent),svg=root.querySelector('svg'),defs=svg.querySelector('defs'),drawing=root.querySelector('.diagram-volumes'),labels=root.querySelector('.diagram-labels');
 labels.replaceChildren();
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
 const sculpt=ArmSculptLayer({atlas,landmarks,make,defs,drawing,svg,composition});
 const curve=ps=>{if(ps.length<3)return '';let d='M'+ps[0].join(',');for(let i=1;i<ps.length-1;i++)d+='Q'+ps[i].join(',')+' '+ps[i].map((v,j)=>(v+ps[i+1][j])/2).join(',');return d+'L'+ps.at(-1).join(',');};
 const offsets=new Map();for(const [view,degrees]of [['front',16],['side',90],['back',164]]){const a=degrees*Math.PI/180;let min=Infinity,max=-Infinity;for(const p of atlas.parts.filter(p=>p.kind==='bone'))for(const v of p.v){const x=v[0]*Math.cos(a)+v[2]*Math.sin(a);min=Math.min(min,x);max=Math.max(max,x);}offsets.set(view,320-(min+max)*1.05/2);}
 let debug=null,lastVisibility=null,lastKey='',posedAngle=NaN,posedCache=null,posedComposition=-1;
 function render(angle,view='front',mode='anatomy',landmark='sternoclavicular'){
  const transparent=root.classList.contains('transparent'),fibersOn=!root.classList.contains('no-fibers'),showMuscles=root.dataset.showMuscles!=='false',key=[angle,view,transparent,fibersOn,composition.key,mode,landmark,showMuscles,root.clientWidth].join();if(key===lastKey)return;lastKey=key;
  const start=performance.now(),degrees=view==='side'?90:view==='back'?164:16,a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const baseProject=p=>[offsets.get(view)+(p[0]*c+p[2]*s)*1.05,15+(p[1]-29)*1.05],depth=p=>-p[0]*s+p[2]*c;
  const compareProject=centerX=>p=>{const q=baseProject(p);return[centerX+(q[0]-320),q[1]];},project=mode==='compare'?compareProject(160):baseProject,sculptProject=mode==='compare'?compareProject(480):project;
  if(posedAngle!==angle||posedComposition!==composition.key){posedAngle=angle;posedComposition=composition.key;posedCache=nodes.map(n=>n.part.v.map(p=>skin(p,n.part,angle)));}
  const posed=posedCache,buffer=ArmVisibility({project,depth,step:.9,accept:(ps,wa,wb,wc,id)=>id>=nodes.length||nodes[id].part.kind==='bone'||collision.minimumXYZ(ps[0][0]*wa+ps[1][0]*wb+ps[2][0]*wc,ps[0][1]*wa+ps[1][1]*wb+ps[2][1]*wc,ps[0][2]*wa+ps[1][2]*wb+ps[2][2]*wc,angle)>=.65});
  sculpt.render({posed,project,sculptProject,depth,angle,view,mode,landmark,transparent,forearm,showBones:true,showMuscles});
  const anatomyVisible=n=>n.part.kind==='muscle'||n.part.kind==='tendon'?showMuscles:true;
  nodes.forEach((n,i)=>n.part.f.forEach(f=>buffer.triangle(...f.map(j=>posed[i][j]),i)));
  const fatCount=composition.paintFat(buffer,posed,nodes.length);
  const visible=buffer.solve(nodes.length+fatCount,{projections:i=>i>=nodes.length||nodes[i].part.kind!=='bone',scanlineClips:false,occludes:i=>i>=nodes.length?!composition.fatTransparent:anatomyVisible(nodes[i])&&(!transparent||nodes[i].part.kind==='bone')});
  lastVisibility={...visible,offset:offsets.get(view),degrees};
  nodes.forEach((n,i)=>{
   const soft=n.part.kind!=='bone',inside=k=>transparent&&soft?visible.depthAt(i,k)>-Infinity:visible.owners[k]===i;
   const contour=AtlasContour(visible,inside,visible.bounds[i]);n.fill.setAttribute('d',contour);n.outline.setAttribute('d',contour);n.mask.setAttribute('d',contour);n.g.setAttribute('opacity',transparent&&soft?.32:1);
   let path='';if(fibersOn)for(const fiber of n.guides){let segment=[];const flush=()=>{let length=0;for(let j=1;j<segment.length;j++)length+=Math.hypot(...segment[j].map((v,k)=>v-segment[j-1][k]));if(length>=5)path+=curve(segment);segment=[];};for(const p of fiber){const point=skin(p,n.part,angle),q=project(point),x=Math.floor((q[0]-visible.x0)/visible.step),y=Math.floor((q[1]-visible.y0)/visible.step),k=y*visible.w+x;
     if(x>=0&&x<visible.w&&y>=0&&y<visible.h&&depth(point)>=visible.depthAt(i,k)-2.5&&(transparent||visible.owners[k]===i))segment.push(q);else flush();}flush();}
   n.fiber.setAttribute('d',path);n.fiber.setAttribute('stroke-opacity',n.part.kind==='tendon'?.18:.28);
  });
  lightSurfaces(visible);
  composition.drawFat(visible,nodes.length,AtlasContour,mode!=='sculpt');
  svg.setAttribute('viewBox','0 0 640 430');svg.setAttribute('height',root.clientWidth*430/640);root.dataset.cameraYaw=degrees;
  debug={angle,view,posed:posed.map((v,i)=>({name:nodes[i].part.name,kind:nodes[i].part.kind,forearm:!!nodes[i].part.forearm,v})),coverage:visible.coverage,duration:performance.now()-start};
 }
 return {render,atlas,landmarks,skin,forearm,collision,motion,composition,sculpt,get debug(){return debug;},get visibility(){return lastVisibility;}};
}
