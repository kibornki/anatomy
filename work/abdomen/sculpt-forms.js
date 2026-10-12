/* Authored blockout cages for abdominal muscles. The regular quad grids
   transport with atlas control points; atlas triangles are not decimated. */
function AbdomenSculptForms(data){
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),quantile=(values,t)=>{const a=values.slice().sort((x,y)=>x-y);return a[clamp(Math.floor((a.length-1)*t),0,a.length-1)]||0;};
 // One continuous ribcage, waist and lower-abdomen block. Each station is
 // [height, half width, posterior depth, anterior depth] in atlas coordinates.
 const torsoStations=[[160,66,0,65],[185,76,-8,88],[220,84,-7,104],[260,87,-3,113],[295,84,5,119],[330,77,13,121],[365,68,19,111],[405,68,25,104],[440,61,36,97],[473,25,65,86]];
 function torsoSection(y){let r=1;while(r<torsoStations.length-1&&torsoStations[r][0]<y)r++;const a=torsoStations[r-1],b=torsoStations[r],t=clamp((y-a[0])/(b[0]-a[0]),0,1);return a.map((v,k)=>v+(b[k]-v)*t);}
 function aboveTorso(point){const [x,y,z]=point,[,width,back,front]=torsoSection(y),center=(back+front)/2,radius=(front-back)/2,distance=Math.hypot(x/width,(z-center)/radius);return distance<1.05?[x*1.05/distance,y,center+(z-center)*1.05/distance]:point;}
 function torso(deform){
  const v=[],polygons=[],columns=16;
  for(const [y,width,back,front]of torsoStations)for(let c=0;c<columns;c++){const a=c/columns*Math.PI*2;v.push(deform([width*Math.sin(a),y,(back+front)/2+(front-back)/2*Math.cos(a)]));}
  for(let r=0;r<torsoStations.length-1;r++)for(let c=0;c<columns;c++){const next=(c+1)%columns;polygons.push([r*columns+c,r*columns+next,(r+1)*columns+next,(r+1)*columns+c]);}
  polygons.push(Array.from({length:columns},(_,c)=>columns-1-c),Array.from({length:columns},(_,c)=>(torsoStations.length-1)*columns+c));
  return{v,polygons};
 }
 function bind(group){
  if(group.family==='pectoral-major'){
   // Chest is anatomical context in the abdomen lesson. Keep its atlas outline.
   const polygons=[];let offset=0;for(const id of group.partIds){const part=data.parts[id];polygons.push(...part.f.map(face=>face.map(i=>i+offset)));offset+=part.v.length;}return{chest:polygons};
  }
  const part=data.parts[group.partIds[0]],source=part.v,up=[0,1,0];let normal=unit(group.normal),width;
  if(group.family==='serratus'&&part.landmarks?.length){const flow=part.landmarks.reduce((sum,landmark)=>add(sum,sub(landmark.origin,landmark.insertion)),[0,0,0]);width=unit([flow[0],0,flow[2]]);normal=unit(cross(up,width));if(dot(normal,group.normal)<0){width=mul(width,-1);normal=mul(normal,-1);}}
  else width=unit(cross(normal,up));
  const rectus=group.family==='rectus',coords=source.map(p=>[dot(p,width),p[1],dot(p,normal)]),lo=Math.min(...coords.map(p=>p[1])),hi=Math.max(...coords.map(p=>p[1])),span=Math.max(1,hi-lo),stations=rectus?[lo,data.rectusSupport.costalHeight,319,337,355,373,390,423,hi]:null,rows=rectus?stations.length-1:group.family==='serratus'?7:6,cols=rectus?4:6,window=span/rows*1.7,sections=[];
  for(let r=0;r<=rows;r++){
   const t=r/rows,y=rectus?stations[r]:lo+span*t;let band=coords.filter(p=>Math.abs(p[1]-y)<=window/2);if(band.length<20)band=coords.slice().sort((a,b)=>Math.abs(a[1]-y)-Math.abs(b[1]-y)).slice(0,Math.min(96,coords.length));
   if(rectus){
    // A paired strap with a stable medial edge and three transverse recesses.
    // Uniform columns preserve broad planes instead of following atlas noise.
    const side=part.side||1,groove=[319,355,390].includes(y),lateral=Math.max(8,quantile(band.map(p=>Math.abs(p[0])),.96))*(groove?.94:1),front=quantile(band.map(p=>p[2]),.94),back=quantile(band.map(p=>p[2]),.06),recess=groove?5:0,columns=[];
    for(let c=0;c<=cols;c++){const u=c/cols,x=side*(2.6+(lateral-2.6)*u),crown=Math.sin(Math.PI*u);columns.push({front:[x,y,front+7*crown-recess],back:[x,y,back]});}sections.push(columns);continue;
   }
   const center=quantile(band.map(p=>p[0]),.5),low=quantile(band.map(p=>p[0]),.04),high=quantile(band.map(p=>p[0]),.96),taper=.6+.4*Math.sin(Math.PI*t),u0=center+(low-center)*taper,u1=center+(high-center)*taper,columns=[];
   for(let c=0;c<=cols;c++){
    const u=u0+(u1-u0)*c/cols,radius=Math.max(1,(u1-u0)/cols*.82);let local=band.filter(p=>Math.abs(p[0]-u)<=radius);if(local.length<5)local=band.slice().sort((a,b)=>Math.abs(a[0]-u)-Math.abs(b[0]-u)).slice(0,Math.min(36,band.length));
    const uc=quantile(local.map(p=>p[0]),.5),front=quantile(local.map(p=>p[2]),.94),back=quantile(local.map(p=>p[2]),.06),slipRelief=group.family==='serratus'?.94+.06*Math.sin(Math.PI*t)**2:1,bulge=Math.pow(Math.max(0,Math.sin(Math.PI*c/cols)*Math.sin(Math.PI*t)),.68)*group.thickness*slipRelief;
    columns.push({front:add(add(mul(width,uc),[0,y,0]),mul(normal,front+bulge)),back:add(add(mul(width,uc),[0,y,0]),mul(normal,back-bulge*.32))});
   }
   sections.push(columns);
  }
  // Quantile sampling of a triangulated atlas can wobble from one row to the
  // next. Smooth the interior grid while keeping its silhouette boundary fixed.
  if(!rectus)for(const side of ['front','back']){const original=sections.map(row=>row.map(q=>q[side]));for(let r=1;r<rows;r++)for(let c=1;c<cols;c++){let sum=[0,0,0],total=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const weight=(dr===0?2:1)*(dc===0?2:1);sum=add(sum,mul(original[r+dr][c+dc],weight));total+=weight;}sections[r][c][side]=add(mul(original[r][c],.45),mul(sum,.55/total));}}
  const sources=source.map((p,index)=>({p,index})),control=point=>{const near=sources.map(q=>({...q,d:dot(sub(q.p,point),sub(q.p,point))})).sort((a,b)=>a.d-b.d).slice(0,10),sum=near.reduce((n,q)=>n+1/(q.d+16),0);return{point,weights:near.map(q=>({index:q.index,point:q.p,weight:1/(q.d+16)/sum}))};};
  const front=sections.map(row=>row.map(q=>control(['serratus','rectus'].includes(group.family)?aboveTorso(q.front):q.front))),back=sections.map(row=>row.map(q=>control(q.back))),center=source.reduce((sum,p)=>add(sum,mul(p,1/source.length)),[0,0,0]);
  return{front,back,rows,cols,partId:group.partIds[0],center,reverse:rectus&&part.side<0};
 }
 function mesh(group,posed,muscle=100,deform=null){
  if(group.form.chest)return{v:group.partIds.flatMap(id=>posed[id].v),polygons:group.form.chest};
  const {front,back,rows,cols,partId,center}=group.form,transport=control=>deform?deform(control.point.map((x,k)=>center[k]+(x-center[k])*scale)):control.weights.reduce((p,w)=>add(p,mul(sub(posed[partId].v[w.index],w.point),w.weight)),control.point.slice()),scale=Math.sqrt(Math.max(0,Number.isFinite(muscle)?muscle:100)/100),v=[],frontIds=[],backIds=[];
  for(let r=0;r<=rows;r++){frontIds.push([]);backIds.push([]);for(let c=0;c<=cols;c++){frontIds[r].push(v.length);v.push(transport(front[r][c]));backIds[r].push(v.length);v.push(transport(back[r][c]));}}
  const polygons=[],face=(grid,r,c)=>[grid[r][c],grid[r][c+1],grid[r+1][c+1],grid[r+1][c]];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){polygons.push(face(frontIds,r,c),face(backIds,r,c).reverse());}
  const boundary=[];for(let c=0;c<cols;c++)boundary.push([0,c]);for(let r=0;r<rows;r++)boundary.push([r,cols]);for(let c=cols;c>0;c--)boundary.push([rows,c]);for(let r=rows;r>0;r--)boundary.push([r,0]);
  boundary.forEach(([r,c],i)=>{const [nr,nc]=boundary[(i+1)%boundary.length];polygons.push([frontIds[r][c],backIds[r][c],backIds[nr][nc],frontIds[nr][nc]]);});
  if(scale!==1&&!deform){for(let i=0;i<v.length;i++)v[i]=v[i].map((x,k)=>center[k]+(x-center[k])*scale);}
  if(group.form.reverse)polygons.forEach(face=>face.reverse());
  return{v,polygons,frontIds,backIds};
 }
 return{bind,mesh,torso};
}
