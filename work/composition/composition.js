/* Appearance controls; size and fat are authored illustration parameters. */
function AnatomyComposition(root, parts, region) {
 const clamp=(n,lo,hi,fallback)=>Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;
 const smooth=t=>{t=clamp(t,0,1,0);return t*t*(3-2*t);};
 const bounds=p=>[0,1,2].map(k=>[Math.min(...p.v.map(v=>v[k])),Math.max(...p.v.map(v=>v[k]))]);
 const profiles=new Map(),boneVertices=parts.filter(q=>['bone','rib','cartilage'].includes(q.kind)).flatMap(q=>q.v);
 const boneGrid=new Map(),cell=5;for(const v of boneVertices){const key=v.map(n=>Math.floor(n/cell)).join(',');if(!boneGrid.has(key))boneGrid.set(key,[]);boneGrid.get(key).push(v);}
 const nearBone=(v,tol2)=>{const center=v.map(n=>Math.floor(n/cell)),range=Math.ceil(Math.sqrt(tol2)/cell);for(let x=-range;x<=range;x++)for(let y=-range;y<=range;y++)for(let z=-range;z<=range;z++)for(const q of boneGrid.get([center[0]+x,center[1]+y,center[2]+z].join(','))||[])if((q[0]-v[0])**2+(q[1]-v[1])**2+(q[2]-v[2])**2<tol2)return true;return false;};
 for(const p of parts) {
  if(p.kind!=='muscle'||p.name==='linea-alba')continue;
  const b=bounds(p),axis=b.map(([a,z])=>z-a).reduce((best,v,k,all)=>v>all[best]?k:best,0),lo=b[axis][0],span=b[axis][1]-lo;
  const count=24,sums=Array.from({length:count},()=>[0,0,0,0]);
  const bin=v=>Math.min(count-1,Math.max(0,Math.floor((v[axis]-lo)/(span||1)*count)));
  for(const v of p.v){const s=sums[bin(v)];for(let k=0;k<3;k++)s[k]+=v[k];s[3]++;}
  const centers=sums.map((s,i)=>s[3]?s.slice(0,3).map(v=>v/s[3]):null);
  for(let i=0;i<count;i++)if(!centers[i]){let j=0;while(j<count&&!centers[j])j++;for(let k=0;k<count;k++)if(centers[k]&&Math.abs(k-i)<Math.abs(j-i))j=k;centers[i]=centers[j].slice();}
  const original=centers.map(c=>c.slice());
  for(let i=0;i<count;i++)for(let k=0;k<3;k++){let sum=0,n=0;for(let j=Math.max(0,i-2);j<=Math.min(count-1,i+2);j++){sum+=original[j][k];n++;}centers[i][k]=sum/n;}
  const fixed=new Set([...(p.attachments?.origin||[]),...(p.attachments?.insertion||[]),...(p.attachments?.clavicularInsertion||[])]);
  // Preserve the original neutral bone-contact surface as well as explicit anchors.
  const protectedPoints=[];
  const tolerance=Math.max(1,Math.min(...b.map(([a,z])=>z-a))*.06),tol2=tolerance*tolerance;
  for(let i=0;i<p.v.length;i++){const v=p.v[i];if(fixed.has(i)||nearBone(v,tol2)){fixed.add(i);protectedPoints.push(v);}}
  const center=v=>{const x=clamp((v[axis]-lo)/(span||1)*count-.5,0,count-1,0),i=Math.floor(x),j=Math.min(count-1,i+1);return centers[i].map((n,k)=>n+(centers[j][k]-n)*(x-i));};
  const weight=v=>{
   const t=(v[axis]-lo)/(span||1);let w=smooth(t/.12)*smooth((1-t)/.12);
   if(p.materialGuide?.thresholdY&&v[1]>p.materialGuide.thresholdY)w=0;
   if(protectedPoints.length){let d=Infinity;for(const q of protectedPoints)d=Math.min(d,(q[0]-v[0])**2+(q[1]-v[1])**2+(q[2]-v[2])**2);w*=smooth(Math.sqrt(d)/Math.max(4,span*.035));}
   return w;
  };
  const weights=new WeakMap(),cachedWeight=v=>{if(!weights.has(v))weights.set(v,weight(v));return weights.get(v);};
  const neighbors=Array.from({length:p.v.length},()=>new Set());for(const face of p.f)for(const i of face)for(const j of face)if(i!==j)neighbors[i].add(j);
  profiles.set(p.name,{axis,center,weight:cachedWeight,fixed,neighbors});
 }
 let settings={muscle:100,fat:0,fatTransparent:false},revision=0;
 function restore(value){settings={muscle:clamp(value?.muscle,60,160,100),fat:region==='forearm'?0:clamp(value?.fat,0,100,0),fatTransparent:value?.fatTransparent===true};revision++;}
 function point(part,v,index) {
  if(settings.muscle===100||part.kind!=='muscle'||part.material==='tendon')return v;
  const p=profiles.get(part.name.replace(/-tendon-material$/,''));if(!p||p.fixed.has(index))return v;
  const c=p.center(v),amount=(Math.sqrt(settings.muscle/100)-1)*p.weight(v);
  return v.map((n,k)=>k===p.axis?n:n+(n-c[k])*amount);
 }
 function posed(part,vertices) {
  const p=profiles.get(part.name);if(!p||settings.muscle===100)return vertices;
  // Transport the neutral cross-section offset with the posed triangle's local frame.
  const neighbors=p.neighbors;
  return vertices.map((q,i)=>{
   const adjusted=point(part,part.v[i],i),offset=adjusted.map((n,k)=>n-part.v[i][k]);if(offset.every(n=>n===0))return q;
   const ids=[...neighbors[i]],j=ids[0],k=ids.find(k=>k!==j);
   if(j===undefined||k===undefined)return q.map((n,k)=>n+offset[k]);
   const frame=(vs)=>{const sub=(a,b)=>a.map((n,k)=>n-b[k]),norm=v=>{const n=Math.hypot(...v);return n>1e-8?v.map(x=>x/n):null;},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],e=norm(sub(vs[j],vs[i]));if(!e)return null;const n=norm(cross(e,sub(vs[k],vs[i])));return n?[e,cross(n,e),n]:null;};
   const a=frame(part.v),b=frame(vertices);if(!a||!b)return q;
   const weights=a.map(u=>u.reduce((sum,n,k)=>sum+n*offset[k],0));
   return q.map((n,k)=>n+weights.reduce((sum,w,j)=>sum+w*b[j][k],0));
  });
 }
 // Surface-attached pads. Chest pads share one authored breast profile in both
 // torso views: a gradual upper slope, lower fullness and a rounded lower fold.
 const breast={names:['pectoral-sternal','pectoral-clavicular','pectoral-abdominal'],normal:2,sign:1,center:[52,232],radius:[43,62],height:62,breast:true};
 const specifications={
  upperbody:[breast,{names:['latissimus'],normal:2,sign:-1,center:[65,280],radius:[28,43],height:12}],
  abdomen:[breast,{names:['rectus','external-oblique'],normal:2,sign:1,center:[0,376],radius:[83,90],height:26,joined:true},{names:['external-oblique'],normal:0,sign:1,center:[70,381],radius:[38,65],height:15}],
  arm:[{names:['triceps-long','triceps-lateral'],normal:2,sign:-1,center:[-7,184],radius:[27,82],height:17}],
  thigh:[{names:['vastus-lateralis'],normal:0,sign:-1,center:[9,206],radius:[37,149],height:27},{names:['vastus-medialis'],normal:0,sign:1,center:[18,247],radius:[32,126],height:20}],
  forearm:[]
 };
 const depots=[];
 for(const spec of specifications[region]||[])for(const suffix of spec.joined?['']:['','-right']){
  const sources=parts.flatMap((part,index)=>(spec.joined?spec.names.includes(part.name.replace(/-right$/,'')):spec.names.some(name=>part.name===name+suffix))?part.v.map((p,i)=>({p,index,i})):[]);if(!sources.length)continue;
  const tangent=spec.normal===2?0:2,mirror=suffix?-1:1,sign=spec.normal===0?spec.sign*mirror:spec.sign,center=spec.center.map((n,k)=>k===0&&tangent===0?n*mirror:n),radii=spec.radius;
  const sample=(u,y)=>{const near=sources.map(q=>({...q,d:((q.p[tangent]-u)/radii[0])**2+((q.p[1]-y)/radii[1])**2})).sort((a,b)=>a.d-b.d).slice(0,24),heights=near.map(q=>q.p[spec.normal]*sign).sort((a,b)=>a-b);return heights[Math.floor(heights.length*.85)]*sign;};
  const baseCenter=sample(...center),controls=[],faces=[],rows=16,columns=24;
  for(let row=0;row<=rows;row++)for(let col=0;col<columns;col++){
   const theta=Math.PI*row/rows,phi=2*Math.PI*col/columns,r=Math.sin(theta),dx=r*Math.cos(phi),dy=r*Math.sin(phi),front=Math.cos(theta),width=spec.breast?1+.16*dy:1,u=center[0]+dx*radii[0]*width,y=center[1]+dy*radii[1]+(spec.breast?14*(1-r*r):0),base=sample(u,y),p=[0,y,0];p[tangent]=u;p[spec.normal]=base;
   const links=sources.map(q=>({...q,d:q.p.reduce((n,v,k)=>n+(v-p[k])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,6),sum=links.reduce((n,q)=>n+1/(q.d+4),0);
   controls.push({p,lift:front>0?Math.pow(front,spec.breast?1.2:1.4)*spec.height*(spec.breast?1+.18*dy:1):-2*Math.abs(front),links:links.map(q=>({...q,w:1/(q.d+4)/sum}))});
  }
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*columns+col,b=row*columns+(col+1)%columns,c=b+columns,d=a+columns;faces.push([a,b,c],[a,c,d]);}
  depots.push({spec,normal:spec.normal,tangent,sign,center,baseCenter,controls,faces});
 }
 // Project onto the actual displayed tissue, including authored sculpt cages.
 // A local grid keeps the outward surface queries bounded during animation.
 function surfaceField(meshes,normal){
  const tangent=normal===2?0:2,cell=12,grid=new Map();
  for(const mesh of meshes)if(mesh)for(const face of mesh.f||mesh.faces||mesh.polygons)for(let i=1;i<face.length-1;i++){
   const tri=[face[0],face[i],face[i+1]].map(j=>mesh.v[j]),xs=tri.map(p=>p[tangent]),ys=tri.map(p=>p[1]),loX=Math.floor(Math.min(...xs)/cell),hiX=Math.floor(Math.max(...xs)/cell),loY=Math.floor(Math.min(...ys)/cell),hiY=Math.floor(Math.max(...ys)/cell),den=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2]);if(Math.abs(den)<1e-8)continue;
   const entry={tri,xs,ys,den};for(let x=loX;x<=hiX;x++)for(let y=loY;y<=hiY;y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(entry);}
  }
  return(point,sign)=>{let outer=-Infinity;const x=point[tangent],y=point[1];for(const {tri,xs,ys,den}of grid.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[]){const a=((ys[1]-ys[2])*(x-xs[2])+(xs[2]-xs[1])*(y-ys[2]))/den,b=((ys[2]-ys[0])*(x-xs[2])+(xs[0]-xs[2])*(y-ys[2]))/den,c=1-a-b;if(a>=-1e-6&&b>=-1e-6&&c>=-1e-6)outer=Math.max(outer,sign*(a*tri[0][normal]+b*tri[1][normal]+c*tri[2][normal]));}return outer;};
 }
 function fatMeshes(vertices,surfaces=null) {
  if(!settings.fat)return [];
  const amount=settings.fat/100,spread=.55+.45*Math.sqrt(amount);
  const meshes=surfaces||parts.map((p,i)=>({v:vertices[i],f:p.f})),fields=new Map([...new Set(depots.map(d=>d.normal))].map(normal=>[normal,surfaceField(meshes,normal)]));
  return depots.map(d=>{const field=fields.get(d.normal),v=d.controls.map(control=>{
   const neutral=control.p.slice();neutral[d.tangent]=d.center[0]+(neutral[d.tangent]-d.center[0])*spread;neutral[1]=d.center[1]+(neutral[1]-d.center[1])*spread;neutral[d.normal]=d.baseCenter+(neutral[d.normal]-d.baseCenter)*spread+d.sign*(control.lift*amount+.6);
   const point=neutral.map((n,k)=>n+control.links.reduce((sum,q)=>sum+q.w*(vertices[q.index][q.i][k]-q.p[k]),0)),outer=field(point,d.sign);
   if(Number.isFinite(outer))point[d.normal]=d.sign*(control.lift>=0?Math.max(point[d.normal]*d.sign,outer+1.5+control.lift*amount):outer-1);
   return point;
  });
  // Check the front triangles between controls too: a cage ridge can protrude
  // through a pad even when all of the pad's control vertices are outside it.
  for(let pass=0;pass<2;pass++)for(const face of d.faces){if(face.some(i=>d.controls[i].lift<0))continue;const points=face.map(i=>v[i]);let deficit=0;for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){const point=[0,1,2].map(k=>points.reduce((n,p,i)=>n+p[k]*weights[i],0)),outer=field(point,d.sign);if(Number.isFinite(outer))deficit=Math.max(deficit,outer+1.5-point[d.normal]*d.sign);}if(deficit>0)for(const i of face)v[i][d.normal]+=d.sign*deficit;}
  return{f:d.faces,v};});
 }
 const fiberBindings=new Map();
 function posedFibers(part,raw,scaled,fibers){if(settings.muscle===100)return fibers;let links=fiberBindings.get(part.name);if(!links){links=part.fibers.map(line=>line.map(v=>{let id=0,distance=Infinity;part.v.forEach((q,i)=>{const d=q.reduce((sum,n,k)=>sum+(n-v[k])**2,0);if(d<distance){distance=d;id=i;}});return id;}));fiberBindings.set(part.name,links);}return fibers.map((line,i)=>line.map((v,j)=>v.map((n,k)=>n+scaled[links[i][j]][k]-raw[links[i][j]][k])));}
 const fatLayers=new Map();
 function mountFat(make,parent,layer='anatomy'){const nodes=[],defs=root.querySelector('svg defs');for(let i=0;i<depots.length;i++){const id=region+'-fat-'+layer+'-'+i,gradient=make('radialGradient',{id,cx:'34%',cy:'28%',r:'75%'},defs);for(const [offset,color]of [['0%','#fff1b5'],['38%','#f7d66d'],['78%','#dfaa3e'],['100%','#b97c25']])make('stop',{offset,'stop-color':color},gradient);const g=make('g',{'data-tissue':'fat','aria-label':depots[i].spec.breast?'유방 형태 지방':'지방','data-fat-depot':i},parent),fill=make('path',{fill:'url(#'+id+')',stroke:'#ad7c2b','stroke-width':.65,'stroke-opacity':.45},g);nodes.push({g,fill});}fatLayers.set(layer,nodes);}
 function paintFat(buffer,vertices,offset,surfaces=null){const meshes=fatMeshes(vertices,surfaces);meshes.forEach((m,i)=>m.f.forEach(f=>buffer.triangle(...f.map(j=>m.v[j]),offset+i)));return meshes.length;}
 function drawFat(visible,offset,contour,enabled=true,layer='anatomy'){(fatLayers.get(layer)||[]).forEach((n,i)=>{const owner=offset+i;n.g.style.display=settings.fat&&enabled?'':'none';if(!settings.fat||!enabled)return;n.fill.setAttribute('d',contour(visible,k=>settings.fatTransparent?visible.depthAt(owner,k)>-Infinity&&visible.depthAt(owner,k)>=visible.zbuf[k]-.8:visible.owners[k]===owner,visible.bounds[owner]));n.g.setAttribute('opacity',settings.fatTransparent?.32:1);n.g.parentNode.appendChild(n.g);});}
 function mountControls(onChange) {
  const doc=root.ownerDocument,box=doc.createElement('fieldset');box.className='composition-controls';
  const style=doc.createElement('style');style.textContent='.composition-controls{border:1px solid var(--border,#d3dae3);border-radius:10px;padding:10px 12px;margin:12px 0;min-width:0;font-size:12px}.composition-controls legend{padding:0 5px;font-weight:600}.composition-row{display:grid;grid-template-columns:minmax(80px,1fr) auto;gap:5px 10px;margin:7px 0}.composition-row input[type=range]{grid-column:1/-1;width:100%;min-width:0;accent-color:var(--foreground,#596579)}.composition-check{display:flex;align-items:center;gap:7px;margin-top:8px}.composition-note{margin:8px 0 0;color:var(--muted-foreground,#718096);font-size:11px;line-height:1.5}.composition-controls button{font:inherit;border:1px solid var(--border,#d3dae3);border-radius:6px;background:var(--background,#fff);color:var(--foreground,#233047);padding:4px 10px;margin-top:8px}.composition-fat-key{display:inline-block;width:9px;height:9px;background:#f4cc45;border-radius:50%;margin-right:4px}';
  doc.head.append(style);const legend=doc.createElement('legend');legend.textContent='부위 체형';box.append(legend);
  const controls={};
  for(const [key,text,min,max]of [['muscle','근육 크기',60,160],['fat','지방량',0,100]]) {
   if(key==='fat'&&region==='forearm')continue;
   const row=doc.createElement('div');row.className='composition-row';const label=doc.createElement('label'),output=doc.createElement('output'),input=doc.createElement('input');input.type='range';input.id=region+'-composition-'+key;input.min=min;input.max=max;input.step=1;label.htmlFor=input.id;label.textContent=text;output.htmlFor=input.id;output.id=input.id+'-value';input.setAttribute('aria-describedby',output.id);row.append(label,output,input);box.append(row);controls[key]={input,output};
   input.addEventListener('input',()=>{restore({...settings,[key]:Number(input.value)});sync();onChange();});
  }
  if(region!=='forearm'){const label=doc.createElement('label');label.className='composition-check';const input=doc.createElement('input');input.type='checkbox';input.id=region+'-composition-fat-transparent';label.append(input,doc.createTextNode('지방 반투명'));box.append(label);controls.fatTransparent={input};input.addEventListener('change',()=>{restore({...settings,fatTransparent:input.checked});onChange();});}
  const reset=doc.createElement('button');reset.type='button';reset.id=region+'-composition-reset';reset.textContent='체형 초기화';reset.addEventListener('click',()=>{restore(null);sync();onChange();});box.append(reset);
  const note=doc.createElement('p');note.className='composition-note';note.textContent=region==='forearm'?'전완은 근육 크기만 조절합니다.':'근육 100%는 기본 크기입니다. 노란색은 지방이며 지방량은 외형 조절값입니다.';box.append(note);
  const anchor=root.querySelector('.diagram-caption')||root.querySelector('svg');anchor.insertAdjacentElement('beforebegin',box);
  function sync(){for(const key of ['muscle','fat'])if(controls[key]){const {input,output}=controls[key];input.value=settings[key];output.textContent=settings[key]+(key==='muscle'?'%':'');input.setAttribute('aria-valuetext',key==='muscle'?settings[key]+'퍼센트':settings[key]+' / 100');}if(controls.fatTransparent)controls.fatTransparent.input.checked=settings.fatTransparent;}
  sync();return{sync,box};
 }
 return{point,posed,posedFibers,restore,mountControls,mountFat,paintFat,drawFat,fatMeshes,get state(){return{...settings};},get key(){return revision;},get fatCount(){return settings.fat?depots.length:0;},get fatTransparent(){return settings.fatTransparent;}};
}
