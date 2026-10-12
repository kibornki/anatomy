/* Authored primary volumes. Atlas vertices transport the controls during motion;
   they do not supply the surface, cross sections, or topology of these forms. */
function UpperbodySculptForms(data){
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
 const families=[
  {id:'pectoral-major',corners:[0,3,5,7],grid:[7,5],parts:['pectoral-clavicular','pectoral-sternal','pectoral-abdominal'],color:'#b68bb3',normal:[.45,-.32,.83],thickness:15,center:[48,215,102],
   outline:[[6,165,86],[47,158,78],[82,160,59],[108,186,49],[99,216,65],[77,253,106],[30,276,126],[5,255,123]]},
  {id:'trapezius',corners:[0,2,4,6],grid:[7,7],parts:['trapezius-upper','trapezius-middle','trapezius-lower'],color:'#72a497',normal:[.1,-.12,-1],thickness:10,center:[23,176,8],
   outline:[[3,103,32],[25,119,34],[74,146,24],[88,165,7],[52,185,-8],[28,255,-13],[2,317,-8],[2,181,3]]},
  {id:'serratus',corners:[0,2,4,6],grid:[4,7],parts:['serratus'],color:'#a8a171',normal:[.91,0,.4],thickness:10,center:[68,232,43],
   outline:[[56,166,10],[74,183,18],[83,214,42],[79,260,76],[51,300,93],[37,282,88],[61,240,44],[55,194,8]]},
  {id:'latissimus',corners:[0,2,3,7],grid:[7,7],parts:['latissimus'],color:'#9985b3',normal:[.35,.05,-1],thickness:13,center:[36,299,0],
   outline:[[26,204,8],[60,205,2],[99,197,34],[95,234,27],[74,286,-2],[56,354,7],[27,406,28],[3,422,31],[3,300,0],[8,241,0]]},
  {id:'infraspinatus',corners:[0,2,4,6],grid:[5,4],parts:['infraspinatus'],color:'#83afa1',normal:[.35,-.12,-1],thickness:11,center:[68,189,9],
   outline:[[39,173,1],[68,163,11],[100,170,37],[108,185,35],[85,210,9],[54,224,-5],[39,204,-8]]},
  {id:'teres-major',corners:[0,3,4,6],grid:[7,3],parts:['teres-major'],color:'#b9878d',normal:[.45,.1,-1],thickness:8,center:[74,220,16],
   outline:[[48,222,-2],[65,215,1],[87,200,21],[101,195,35],[101,206,40],[80,225,22],[58,239,2],[48,234,-3]]},
  {id:'teres-minor',corners:[0,2,3,5],grid:[6,3],parts:['teres-minor'],color:'#8aa59b',normal:[.45,.1,-1],thickness:5,center:[84,195,20],
   outline:[[59,201,4],[81,183,18],[105,174,39],[110,181,40],[91,196,26],[66,214,6]]}
 ];
 function bind(group){
  const mirror=p=>[p[0]*(group.side?-1:1),p[1],p[2]],outline=group.outline.map(mirror),center=mirror(group.center),normal=unit(mirror(group.normal));
  const sources=group.partIds.flatMap(id=>data.parts[id].v.map((p,index)=>({p,id,index})));
  const controls=[...outline,center].map(point=>{
   const near=sources.map(source=>({...source,d:dot(sub(source.p,point),sub(source.p,point))})).sort((a,b)=>a.d-b.d).slice(0,12),sum=near.reduce((s,q)=>s+1/(q.d+16),0);
   return{point,weights:near.map(q=>({id:q.id,index:q.index,point:q.p,weight:1/(q.d+16)/sum}))};
  });
  // Sample the four outline edges once in the rest pose so the grid follows
  // the same controls throughout the motion, without sliding along the rim.
  const sample=(start,end,count)=>{
   const ids=[start];while(ids.at(-1)!==end)ids.push((ids.at(-1)+1)%outline.length);
   const distances=[0];for(let i=1;i<ids.length;i++)distances.push(distances.at(-1)+Math.hypot(...sub(outline[ids[i]],outline[ids[i-1]])));
   return Array.from({length:count+1},(_,i)=>{const at=distances.at(-1)*i/count;let j=1;while(j<distances.length-1&&distances[j]<at)j++;return{a:ids[j-1],b:ids[j],t:(at-distances[j-1])/(distances[j]-distances[j-1])};});
  };
  const [a,b,c,d]=group.corners,[columns,rows]=group.grid,edges=[sample(a,b,columns),sample(b,c,rows),sample(c,d,columns).reverse(),sample(d,a,rows).reverse()];
  return{controls,normal,thickness:group.thickness,edges};
 }
 function mesh(group,posed,muscle=100){
  const {controls,normal,thickness}=group.form,points=controls.map(control=>control.weights.reduce((point,q)=>add(point,mul(sub(posed[q.id].v[q.index],q.point),q.weight)),control.point.slice())),center=points.pop();
  // Transport the surface normal with the broad face as the shoulder moves.
  const neutral=controls.slice(0,-1).map(c=>sub(c.point,controls.at(-1).point)),current=points.map(p=>sub(p,center));
  const area=ps=>ps.reduce((sum,p,i)=>add(sum,cross(p,ps[(i+1)%ps.length])),[0,0,0]),originalNormal=unit(area(neutral)),posedNormal=unit(area(current));
  const n=unit(add(normal,sub(mul(posedNormal,Math.sign(dot(originalNormal,normal))),mul(originalNormal,Math.sign(dot(originalNormal,normal))))));
  const [columns,rows]=group.grid,[top,right,bottom,left]=group.form.edges.map(edge=>edge.map(({a,b,t})=>add(mul(points[a],1-t),mul(points[b],t)))),v=[],polygons=[],f=[],front=[],back=[],depth=thickness*Math.sqrt(muscle/100);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  // A four-sided patch carries the rows from origin to insertion. Both broad
  // surfaces and the rim are quads; there is no center cap or radial pole.
  for(let row=0;row<=rows;row++){
   front.push([]);back.push([]);const t=row/rows;
   for(let col=0;col<=columns;col++){
    const u=col/columns,bilinear=add(mul(add(mul(top[0],1-u),mul(top.at(-1),u)),1-t),mul(add(mul(bottom[0],1-u),mul(bottom.at(-1),u)),t)),base=sub(add(add(mul(top[col],1-t),mul(bottom[col],t)),add(mul(left[row],1-u),mul(right[row],u))),bilinear),bulge=Math.pow(Math.max(0,Math.sin(Math.PI*u)*Math.sin(Math.PI*t)),.65),edge=smooth(Math.min(u,1-u,t,1-t)/.18),height=depth*(-.12+1.06*bulge)-dot(sub(base,center),n)*edge*.22;
    front[row].push(v.length);v.push(add(base,mul(n,height)));
    back[row].push(v.length);v.push(add(add(center,mul(sub(base,center),.94)),mul(n,-depth*.36)));
   }
  }
  const reverse=dot(area(current),n)<0;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const face=grid=>[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]],a=face(front),b=face(back);polygons.push(reverse?a.reverse():a,reverse?b:b.reverse());
  }
  const boundary=[];for(let col=0;col<columns;col++)boundary.push([0,col]);for(let row=0;row<rows;row++)boundary.push([row,columns]);for(let col=columns;col>0;col--)boundary.push([rows,col]);for(let row=rows;row>0;row--)boundary.push([row,0]);if(reverse)boundary.reverse();
  boundary.forEach(([row,col],i)=>{const [nextRow,nextCol]=boundary[(i+1)%boundary.length];polygons.push([front[row][col],back[row][col],back[nextRow][nextCol],front[nextRow][nextCol]]);});
  for(const [a,b,c,d]of polygons)f.push([a,b,c],[a,c,d]);
  return{v,f,polygons};
 }
 return{families,bind,mesh};
}
