/* Anatomical attachment topology from OpenStax figures 11.12, 11.18, 11.19.
   u follows a fiber from origin to insertion; v follows the origin boundary.
   This is a drawing surface, not a measured muscle or physiological solver. */
function AbdominalMuscleSurfaces({profile,radius,frontZ,backZ,spineZ}){
 const C=ClassicCoronalAnatomy,S=ClassicSideAnatomy;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
 const interpolate=(points,v)=>{v=clamp(v,0,points.length-1);const i=Math.min(points.length-2,Math.floor(v));return mix(points[i],points[i+1],v-i);};
 const frontCostal=(r,t)=>{const p=C.body(C.ribPoint(r,t)),[c,d]=profile(p[1]),radius=r.extent*C.proportions.axialWidth;return [p[0],p[1],c+d*Math.sqrt(Math.max(0,1-(p[0]/radius)**2))];};
 const posteriorCostal=(r,t)=>{
  const u=1-t,p=C.body([u*u*u*13+3*u*u*t*51+3*u*t*t*(r.extent-10)+t*t*t*r.extent,u*u*u*r.y+3*u*u*t*(r.y-13)+3*u*t*t*(r.y-17)+t*t*t*(r.y+10)]),[c,d]=profile(p[1]),arc=d*Math.sqrt(Math.max(0,1-(p[0]/(r.extent*C.proportions.axialWidth))**2)),w=Math.min(1,p[0]/(r.extent*C.proportions.axialWidth)*3);
  return [p[0],p[1],spineZ(r.y+4)+(c-arc-spineZ(r.y+4))*w];
 };
 const sideCostal=(r,t)=>{const p=S.cubic(r,t);return [90,1.24*p[1]-39,p[0]];};
 const eoEdgeFront=[[47,313],[49,337],[51,362],[53,388],[58,413],[69,426],[80,424],[84,418]];
 const eoEdgeSide=[[33,302],[30,322],[26,345],[19,368],[8,389],[-9,390],[-25,384],[-41,386]].map(p=>[88,1.24*p[1]-39,p[0]]);
 const sources={};
 for(const view of ['front','side']){
  const ribs=view==='front'?C.ribs:S.ribs,costal=view==='front'?frontCostal:sideCostal;
  const ribLevel=i=>view==='front'?C.vertebrae[7+i].y+4:1.24*S.vertebrae[7+i].center[1]-39;
  const saOrigin=ribs.slice(0,8).map(r=>costal(r,view==='front'?.20:.82));
  const eoOrigin=ribs.slice(4,12).map((r,i)=>view==='front'&&i>=4?posteriorCostal(r,.94-.03*(i-4)):costal(r,view==='front'?.32:.68-.58*clamp((i-3)/4)));
  // Lower slips converge near the inferior angle, rather than being spread
  // evenly along the border. Sample the actual authored medial scapular edge.
  const scapularLevels=[.1,.3,.47,.62,.82,.94,.98,1];
  const saInsert=scapularLevels.map(t=>{
   const u=1-t;
   if(view==='front'){const p=C.girdle(35).S([89*u*u+170*u*t+109*t*t,165*u*u+424*u*t+291*t*t]);return [p[0],p[1],backZ(p[0],p[1])+4];}
   return [65,1.24*(177*u*u+416*u*t+265*t*t)-39,-34*u*u-116*u*t-49*t*t];
  });
  const eoInsert=view==='front'?eoEdgeFront.map((p,i)=>[p[0],p[1],i<5?frontZ(...p):mix([frontZ(...p)],[backZ(...p)],(i-4)/3)[0]]):eoEdgeSide;
  const latOrigin=view==='front'?[[9,273],[9,353],[12,419],[76,419]].map(p=>[p[0],p[1],backZ(...p)]):[[8,1.24*243-39,-60],[8,1.24*303-39,-43],[12,1.24*383-39,-51],[76,1.24*380-39,-26]];
  const end=C.girdle(35).at(18,-5);
  const latInsert=view==='front'?Array.from({length:4},(_,i)=>[end[0]+i*1.3,end[1]+i*2,12+i*2]):Array.from({length:4},(_,i)=>[106,1.24*(192+i*2)-39,3+i*2]);
  sources[view]={
   serratus:{origin:saOrigin,insertion:saInsert,levels:saOrigin.map((_,i)=>ribLevel(i)),target:'scapula',count:8},
   'external-oblique':{origin:eoOrigin,insertion:eoInsert,levels:eoOrigin.map((_,i)=>ribLevel(i+4)),target:'aponeurosis-ilium',count:8},
   latissimus:{origin:latOrigin,insertion:latInsert,target:'humeral-context',count:4}
  };
 }
 function point(view,id,u,v){
  u=clamp(u);const patch=sources[view][id],o=interpolate(patch.origin,v),e=interpolate(patch.insertion,v),y=o[1]+(e[1]-o[1])*u,[c,depth]=profile(y);
  if(view==='side'){
   const z=o[2]+(e[2]-o[2])*u,x=85+18*Math.sin(Math.PI*u);
   return [x,y,z];
  }
  // Follow the curved rib/abdominal wall instead of cutting through its volume.
  const angle=p=>Math.atan2(p[2]-profile(p[1])[0],p[0]*profile(p[1])[1]/radius(p[1]));
  const a=angle(o)+(angle(e)-angle(o))*u,rx=radius(y);
  let p=[rx*Math.cos(a),y,c+depth*Math.sin(a)];
  // The drawing's bone landmarks remain exact at attachment boundaries.
  const boundary=4*u*(1-u);p=mix(mix(o,e,u),p,boundary);
  return p;
 }
 function binding(view,id,u,v,sign){
  const rest=point(view,id,u,v);rest[0]*=sign;const patch=sources[view][id];
  return {rest,u,v,level:patch.levels&&interpolate(patch.levels.map(n=>[n]),v)[0],target:patch.target,originIliac:clamp(v-2),targetIliac:clamp((v-3)/2)};
 }
 function move(b,f){
  const q=b.rest,start=b.level?f.segment(q,b.level):mix(f.deform(q),q,b.originIliac);
  let end;
  if(b.target==='scapula'||b.target==='humeral-context')end=f.segment(q,175);
  else end=mix(f.deform(q),q,b.targetIliac);
  // Each surface and its fibers use the same anchored deformation field.
  return mix(start,end,b.u);
 }
 function transform(view,id,u,v,sign,f,offset=[0,0,0]){const b=binding(view,id,u,v,sign);b.rest=b.rest.map((n,i)=>n+offset[i]);return move(b,f);}
 return {sources,point,transform,binding,move};
}
