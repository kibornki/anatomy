/* Drawing topology from OpenStax 11.12, 11.18 and 11.19. The costal seam
   belongs to both SA and EO. Alternating slips form a contact boundary,
   not fused muscle fibers. Views adapt the topology to the existing
   coronal/lateral skeletal drawings; units are illustrative. */
function AbdominalMuscleSurfaces({profile,radius,frontZ,backZ,spineZ}){
 const C=ClassicCoronalAnatomy,S=ClassicSideAnatomy;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
 const interpolate=(ps,v)=>{v=clamp(v,0,ps.length-1);const i=Math.min(ps.length-2,Math.floor(v));return mix(ps[i],ps[i+1],v-i);};
 const frontCostal=(r,t)=>{const p=C.body(C.ribPoint(r,t)),[c,d]=profile(p[1]),rx=r.extent*C.proportions.axialWidth;return [p[0],p[1],c+d*Math.sqrt(Math.max(0,1-(p[0]/rx)**2))];};
 const posteriorCostal=(r,t)=>{const u=1-t,p=C.body([u*u*u*13+3*u*u*t*51+3*u*t*t*(r.extent-10)+t*t*t*r.extent,u*u*u*r.y+3*u*u*t*(r.y-13)+3*u*t*t*(r.y-17)+t*t*t*(r.y+10)]),[c,d]=profile(p[1]),rx=r.extent*C.proportions.axialWidth,w=Math.min(1,p[0]/rx*3);return [p[0],p[1],spineZ(r.y+4)+(c-d*Math.sqrt(Math.max(0,1-(p[0]/rx)**2))-spineZ(r.y+4))*w];};
 const sideCostal=(r,t)=>{const p=S.cubic(r,t),y=1.24*p[1]-39,[c,d]=profile(y);return [radius(y)*Math.sqrt(Math.max(.02,1-((p[0]-c)/d)**2)),y,p[0]];};
 const sources={};
 for(const view of ['front','side']){
  const ribs=view==='front'?C.ribs:S.ribs,costal=view==='front'?frontCostal:sideCostal;
  const ribLevel=i=>view==='front'?C.vertebrae[7+i].y+4:1.24*S.vertebrae[7+i].center[1]-39;
  // The contact runs obliquely from the anterior fifth rib toward the
  // posterior eighth rib, not as a vertical stack along the anterior chest.
  const seam=ribs.slice(4,8).map((r,i)=>view==='front'?(i===3?posteriorCostal(r,.98):frontCostal(r,[.62,.42,.19][i])):sideCostal(r,[.90,.78,.69,.60][i]));
  const saOrigin=ribs.slice(0,4).map(r=>costal(r,view==='front'?.28:.83)).concat(seam);
  const eoOrigin=seam.concat(ribs.slice(8,12).map((r,i)=>view==='front'?posteriorCostal(r,.96-.04*i):costal(r,.22-.025*i)));
  const saInsert=[.1,.3,.47,.62,.82,.94,.98,1].map(t=>{const u=1-t;if(view==='front'){const p=C.girdle(35).S([89*u*u+170*u*t+109*t*t,165*u*u+424*u*t+291*t*t]);return [p[0],p[1],backZ(...p)+4];}return [65,1.24*(177*u*u+416*u*t+265*t*t)-39,-34*u*u-116*u*t-49*t*t];});
  const eoEdge=[[47,313],[49,337],[51,362],[53,388],[58,413],[69,426],[80,424],[84,418]];
  const eoInsert=view==='front'?eoEdge.map((p,i)=>[p[0],p[1],i<5?frontZ(...p):mix([frontZ(...p)],[backZ(...p)],(i-4)/3)[0]]):[[41,302],[43,322],[42,345],[35,368],[23,389],[1,390],[-22,384],[-41,386]].map(p=>{const y=1.24*p[1]-39,[c,d]=profile(y);return [radius(y)*Math.sqrt(Math.max(.02,1-((p[0]-c)/d)**2)),y,p[0]];});
  const latOrigin=view==='front'?[[10,289],[12,356],[20,419],[86,419]].map(p=>[p[0],p[1],backZ(...p)]):[[16,1.24*255-39,-60],[18,1.24*312-39,-48],[22,1.24*383-39,-51],[86,1.24*380-39,-12]];
  const end=C.girdle(35).at(18,-5),latInsert=view==='front'?Array.from({length:4},(_,i)=>[end[0]-17+i*1.8,end[1]+15+i*2,-20+i*2]):Array.from({length:4},(_,i)=>[91+i*2,1.24*(201+i*2)-39,-15+i*2]);
  sources[view]={serratus:{origin:saOrigin,insertion:saInsert,levels:saOrigin.map((_,i)=>ribLevel(i)),target:'scapula',count:8},'external-oblique':{origin:eoOrigin,insertion:eoInsert,levels:eoOrigin.map((_,i)=>ribLevel(i+4)),target:'aponeurosis-ilium',count:8},latissimus:{origin:latOrigin,insertion:latInsert,target:'humeral-context',count:4}};
 }
 function costalBoundary(view,id,v){
  const patch=sources[view][id],k=id==='serratus'?v-4:v;
  if((id==='serratus'||id==='external-oblique')&&k>=0&&k<=3){
   const ps=sources[view].serratus.origin.slice(4),i=Math.min(2,Math.floor(k)),t=k-i,p=mix(ps[i],ps[i+1],t);
   // Shared chevron between rib slips. Independent notches cannot open gaps.
   const tooth=Math.sin(Math.PI*t)**2,dy=ps[i+1][1]-ps[i][1],shift=(view==='front'?9:10)*tooth;
   p[1]-=dy*.22*tooth;
   if(view==='front'&&tooth>1e-8){
    const angle=q=>Math.atan2(q[2]-profile(q[1])[0],q[0]*profile(q[1])[1]/radius(q[1])),a=angle(ps[i])+(angle(ps[i+1])-angle(ps[i]))*t+.20*tooth,[c,d]=profile(p[1]);
    const radial=q=>{const [qc,qd]=profile(q[1]);return Math.hypot(q[0]/radius(q[1]),(q[2]-qc)/qd);},r=radial(ps[i])+(radial(ps[i+1])-radial(ps[i]))*t;
    p[0]=radius(p[1])*r*Math.cos(a);p[2]=c+d*r*Math.sin(a);
   }else if(view==='side'&&tooth>1e-8){p[2]+=shift;const [c,d]=profile(p[1]);p[0]=radius(p[1])*Math.sqrt(Math.max(.02,1-((p[2]-c)/d)**2));}
   return p;
  }
  return interpolate(patch.origin,v);
 }
 function point(view,id,u,v){
  u=clamp(u);const patch=sources[view][id],o=costalBoundary(view,id,v),e=interpolate(patch.insertion,v);
  if(u===0)return o.slice();if(u===1)return e.slice();
  const y=o[1]+(e[1]-o[1])*u,[c,d]=profile(y),rx=radius(y);
  const angle=p=>Math.atan2(p[2]-profile(p[1])[0],p[0]*profile(p[1])[1]/radius(p[1]));
  let ao=angle(o),ae=angle(e);while(ae-ao>Math.PI)ae-=2*Math.PI;while(ae-ao< -Math.PI)ae+=2*Math.PI;
  const a=ao+(ae-ao)*u+(id==='latissimus'?.12*Math.sin(Math.PI*u)*(v/3)**2:0),clearance=id==='latissimus'?4:2.5;
  const radial=p=>{const [pc,pd]=profile(p[1]);return Math.hypot(p[0]/radius(p[1]),(p[2]-pc)/pd);};
  // Interpolate radius, never a chord through the thorax. Only attachment
  // boundaries approach the authored bone landmarks; interiors wrap outside.
  const wo=Math.exp(-u*22),we=Math.exp(-(1-u)*22),r=wo*radial(o)+we*radial(e)+(1-wo-we)*(1+clearance/Math.min(rx,d));
  return [rx*r*Math.cos(a),y,c+d*r*Math.sin(a)];
 }
 function binding(view,id,u,v,sign){const rest=point(view,id,u,v);rest[0]*=sign;const patch=sources[view][id];return {rest,u,v,id,view,sign,level:patch.levels&&interpolate(patch.levels.map(n=>[n]),v)[0],target:patch.target,originIliac:clamp(v-2),targetIliac:clamp((v-3)/2)};}
 function move(b,f){
  const q=b.rest,start=b.level?f.segment(q,b.level):mix(f.deform(q),q,b.originIliac),end=b.target==='scapula'||b.target==='humeral-context'?f.segment(q,175):mix(f.deform(q),q,b.targetIliac);
  // Boundary corrections decay into the body field. Linear blending of two
  // rigid frames through the rib cage is avoided; both slips share the field.
  const base=f.deform(q),wo=(1-b.u)**3,we=b.u**3;
  const moved=base.map((n,i)=>n+(start[i]-n)*wo+(end[i]-n)*we);
  if(!f.envelope||b.u===1||b.u===0)return moved;
  const outside=f.envelope.outside(moved,b.id==='latissimus'?4:3.5),weight=Math.min(1,b.u/.10,(1-b.u)/.10);
  return mix(moved,outside,weight);
 }
 function transform(view,id,u,v,sign,f,offset=[0,0,0]){const b=binding(view,id,u,v,sign);b.rest=b.rest.map((n,i)=>n+offset[i]);return move(b,f);}
 return {sources,point,transform,binding,move,costalBoundary};
}
