/* Authored primary volumes. Atlas vertices transport the controls during motion;
   they do not supply the surface, cross sections, or topology of these forms. */
function UpperbodySculptForms(data){
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
 const families=[
  {id:'pectoral-major',parts:['pectoral-clavicular','pectoral-sternal','pectoral-abdominal'],color:'#b68bb3',normal:[.45,-.32,.83],thickness:15,center:[48,215,102],
   outline:[[6,165,86],[47,158,78],[82,160,59],[108,186,49],[99,216,65],[77,253,106],[30,276,126],[5,255,123]]},
  {id:'trapezius',parts:['trapezius-upper','trapezius-middle','trapezius-lower'],color:'#72a497',normal:[.1,-.12,-1],thickness:10,center:[23,176,8],
   outline:[[3,103,32],[25,119,34],[74,146,24],[88,165,7],[52,185,-8],[28,255,-13],[2,317,-8],[2,181,3]]},
  {id:'serratus',parts:['serratus'],color:'#a8a171',normal:[.91,0,.4],thickness:10,center:[68,232,43],
   outline:[[56,166,10],[74,183,18],[83,214,42],[79,260,76],[51,300,93],[37,282,88],[61,240,44],[55,194,8]]},
  {id:'latissimus',parts:['latissimus'],color:'#9985b3',normal:[.35,.05,-1],thickness:13,center:[36,299,0],
   outline:[[26,204,8],[60,205,2],[99,197,34],[95,234,27],[74,286,-2],[56,354,7],[27,406,28],[3,422,31],[3,300,0],[8,241,0]]},
  {id:'infraspinatus',parts:['infraspinatus'],color:'#83afa1',normal:[.35,-.12,-1],thickness:11,center:[68,189,9],
   outline:[[39,173,1],[68,163,11],[100,170,37],[108,185,35],[85,210,9],[54,224,-5],[39,204,-8]]},
  {id:'teres-major',parts:['teres-major'],color:'#b9878d',normal:[.45,.1,-1],thickness:8,center:[74,220,16],
   outline:[[48,222,-2],[65,215,1],[87,200,21],[101,195,35],[101,206,40],[80,225,22],[58,239,2],[48,234,-3]]},
  {id:'teres-minor',parts:['teres-minor'],color:'#8aa59b',normal:[.45,.1,-1],thickness:5,center:[84,195,20],
   outline:[[59,201,4],[81,183,18],[105,174,39],[110,181,40],[91,196,26],[66,214,6]]}
 ];
 function bind(group){
  const mirror=p=>[p[0]*(group.side?-1:1),p[1],p[2]],outline=group.outline.map(mirror),center=mirror(group.center),normal=unit(mirror(group.normal));
  const sources=group.partIds.flatMap(id=>data.parts[id].v.map((p,index)=>({p,id,index})));
  const controls=[...outline,center].map(point=>{
   const near=sources.map(source=>({...source,d:dot(sub(source.p,point),sub(source.p,point))})).sort((a,b)=>a.d-b.d).slice(0,12),sum=near.reduce((s,q)=>s+1/(q.d+16),0);
   return{point,weights:near.map(q=>({id:q.id,index:q.index,point:q.p,weight:1/(q.d+16)/sum}))};
  });
  return{controls,normal,thickness:group.thickness};
 }
 function mesh(group,posed,muscle=100){
  const {controls,normal,thickness}=group.form,points=controls.map(control=>control.weights.reduce((point,q)=>add(point,mul(sub(posed[q.id].v[q.index],q.point),q.weight)),control.point.slice())),center=points.pop();
  // Transport the surface normal with the broad face as the shoulder moves.
  const neutral=controls.slice(0,-1).map(c=>sub(c.point,controls.at(-1).point)),current=points.map(p=>sub(p,center));
  const area=ps=>ps.reduce((sum,p,i)=>add(sum,cross(p,ps[(i+1)%ps.length])),[0,0,0]),originalNormal=unit(area(neutral)),posedNormal=unit(area(current));
  const n=unit(add(normal,sub(mul(posedNormal,Math.sign(dot(originalNormal,normal))),mul(originalNormal,Math.sign(dot(originalNormal,normal))))));
  if(dot(area(current),n)<0)points.reverse();
  const v=[],rings=[],polygons=[],f=[],depth=thickness*Math.sqrt(muscle/100);
  // Rear plane, broad edge, bevel, then a deliberately planar central face.
  for(const [scale,lift,flatten] of [[.66,-.36,0],[1,-.12,0],[.86,.52,.4],[.38,.94,1]]){
   const ring=[];for(const p of points){const delta=mul(sub(p,center),scale);ring.push(v.length);v.push(add(add(center,sub(delta,mul(n,dot(delta,n)*flatten))),mul(n,depth*lift)));}rings.push(ring);
  }
  const count=points.length;polygons.push(rings[0].slice().reverse());
  for(let r=0;r<rings.length-1;r++)for(let j=0;j<count;j++)polygons.push([rings[r][j],rings[r][(j+1)%count],rings[r+1][(j+1)%count],rings[r+1][j]]);
  polygons.push(rings.at(-1).slice());
  for(const polygon of polygons){const index=v.length;v.push(polygon.reduce((p,id)=>add(p,mul(v[id],1/polygon.length)),[0,0,0]));for(let j=0;j<polygon.length;j++)f.push([index,polygon[j],polygon[(j+1)%polygon.length]]);}
  return{v,f,polygons};
 }
 return{families,bind,mesh};
}
