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
 const specifications={
  upperbody:[['pectoral-sternal',.5,.55,1,2,1,.38,.25,.14],['latissimus',1,.78,.65,0,1,.18,.22,.10]],
  abdomen:[['rectus',.35,.76,1,2,1,.65,.25,.25],['external-oblique',1,.72,.62,0,1,.22,.22,.20]],
  arm:[['triceps-long',.45,.52,0,2,-1,.38,.30,.30]],
  thigh:[['vastus-lateralis',0,.28,.52,0,-1,.35,.24,.35],['vastus-medialis',1,.34,.58,0,1,.38,.24,.38]],
  forearm:[]
 };
 const depots=[];
 for(const spec of specifications[region]||[]) {
  const [name,fx,fy,fz,normal,sign,rx,ry,rz]=spec;
  for(const part of parts.filter(p=>p.name===name||p.name===name+'-right')) {
   const b=bounds(part),fractions=[fx,fy,fz];if(part.name.endsWith('-right'))fractions[0]=1-fx;
   const target=b.map(([a,z],k)=>a+(z-a)*fractions[k]),axisSign=normal===0&&part.name.endsWith('-right')?-sign:sign;
   let anchor=0,distance=Infinity;part.v.forEach((v,i)=>{const d=v.reduce((sum,n,k)=>sum+(n-target[k])**2,0);if(d<distance){distance=d;anchor=i;}});
   const radii=b.map(([a,z],k)=>Math.max(3,(z-a)*[rx,ry,rz][k]));
   const directions=[],faces=[],bindings=[];
   const rows=8,columns=16;
   for(let row=0;row<=rows;row++)for(let col=0;col<columns;col++){const theta=Math.PI*row/rows,phi=2*Math.PI*col/columns;directions.push([Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)]);}
   for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*columns+col,b=row*columns+(col+1)%columns,c=b+columns,d=a+columns;faces.push([a,b,c],[a,c,d]);}
   for(const direction of directions){const target=part.v[anchor].map((n,k)=>n+direction[k]*radii[k]);target[normal]+=axisSign*radii[normal]*.25;const ids=part.v.map((v,i)=>({i,d:v.reduce((sum,n,k)=>sum+(n-target[k])**2,0)})).sort((a,b)=>a.d-b.d).slice(0,3),weights=ids.map(x=>1/(x.d+1)),sum=weights.reduce((s,n)=>s+n,0);bindings.push(ids.map((x,i)=>[x.i,weights[i]/sum]));}
   depots.push({part,index:parts.indexOf(part),anchor,normal,sign:axisSign,radii,directions,faces,bindings});
  }
 }
 function fatMeshes(vertices) {
  if(!settings.fat)return [];
  const amount=settings.fat/100;
  return depots.map(d=>({f:d.faces,v:d.directions.map((direction,index)=>{
   const neutral=d.part.v[d.anchor].map((n,k)=>n+direction[k]*d.radii[k]*(k===d.normal?amount:Math.sqrt(amount)));
   neutral[d.normal]+=d.sign*d.radii[d.normal]*amount*.25;
   const weights=d.bindings[index];
   return neutral.map((n,k)=>n+weights.reduce((sum,[id,w])=>sum+w*(vertices[d.index][id][k]-d.part.v[id][k]),0));
  })}));
 }
 const fiberBindings=new Map();
 function posedFibers(part,raw,scaled,fibers){if(settings.muscle===100)return fibers;let links=fiberBindings.get(part.name);if(!links){links=part.fibers.map(line=>line.map(v=>{let id=0,distance=Infinity;part.v.forEach((q,i)=>{const d=q.reduce((sum,n,k)=>sum+(n-v[k])**2,0);if(d<distance){distance=d;id=i;}});return id;}));fiberBindings.set(part.name,links);}return fibers.map((line,i)=>line.map((v,j)=>v.map((n,k)=>n+scaled[links[i][j]][k]-raw[links[i][j]][k])));}
 const fatNodes=[];
 function mountFat(make,parent){for(let i=0;i<depots.length;i++){const g=make('g',{'data-tissue':'fat','aria-label':'지방','data-fat-depot':i},parent),fill=make('path',{fill:'#f4cc45',stroke:'#b28a20','stroke-width':.7,'stroke-opacity':.55},g);fatNodes.push({g,fill});}}
 function paintFat(buffer,vertices,offset){const meshes=fatMeshes(vertices);meshes.forEach((m,i)=>m.f.forEach(f=>buffer.triangle(...f.map(j=>m.v[j]),offset+i)));return meshes.length;}
 function drawFat(visible,offset,contour){fatNodes.forEach((n,i)=>{const owner=offset+i;n.g.style.display=settings.fat?'':'none';if(!settings.fat)return;const local=visible.ownerZ[owner];n.fill.setAttribute('d',contour(visible,k=>settings.fatTransparent?local[k]>-Infinity:visible.owners[k]===owner,visible.bounds[owner]));n.g.setAttribute('opacity',settings.fatTransparent?.3:1);});}
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
