/* Same native surface/depth contour drawing as the abdomen and upper body. */
const data=JSON.parse(document.querySelector('#atlas').textContent),ns='http://www.w3.org/2000/svg';
const colors={red:'#e02e2a',blue:'#339cff',green:'#00a240',orange:'#e25507',purple:'#924ff7',pink:'#eb77b1',context:'#edb0a7'};
const names={forearm:{blue:'상완요골근',orange:'굽힘근군',green:'폄근군',pink:'원회내근'},thigh:{'rectus-femoris':'대퇴직근','vastus-lateralis':'외측광근','vastus-medialis':'내측광근','biceps-femoris-long':'대퇴이두근 장두','semitendinosus':'반힘줄근','sartorius':'봉공근','adductor-longus':'내전근'}};
const records=[];
const curve=ps=>{if(ps.length<3)return '';let d='M'+ps[0].join(',');for(let i=1;i<ps.length-1;i++)d+='Q'+ps[i].join(',')+' '+ps[i].map((v,j)=>(v+ps[i+1][j])/2).join(',');return d+'L'+ps.at(-1).join(',');};
for(const [region,model]of Object.entries(data.models)){
 model.parts=model.parts.flatMap(p=>{if(!p.tendonFaces?.length)return[p];const ts=new Set(p.tendonFaces);return[{...p,f:p.f.filter((_,i)=>!ts.has(i))},{...p,f:p.f.filter((_,i)=>ts.has(i)),name:p.name+'-tendon-material',material:'tendon'}];});
 const row=document.createElement('div');row.className='row';row.dataset.region=region;row.innerHTML='<h1>'+(region==='forearm'?'전완':'허벅지')+' · 실제 뼈와 근육 표면 시안</h1><p>'+model.pose.description+'</p><div class="panels"></div>';document.querySelector('main').append(row);
 const vs=model.parts.flatMap(p=>p.v),lo=Math.min(...vs.map(v=>v[1])),hi=Math.max(...vs.map(v=>v[1])),scale=565/(hi-lo),cx=vs.reduce((s,v)=>s+v[0]/vs.length,0),cz=vs.reduce((s,v)=>s+v[2]/vs.length,0);
 for(const [i,view]of ['front','side','back'].entries()){
  const yaw=model.pose.cameraYaw[i],a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a),project=p=>[300+((p[0]-cx)*c+(p[2]-cz)*s)*scale,20+(p[1]-lo)*scale],depth=p=>-p[0]*s+p[2]*c;
  const buffer=AbdominalVisibility({project,depth,step:.6});model.parts.forEach((p,id)=>p.f.forEach(f=>buffer.polygon(f.map(j=>p.v[j]),id)));
  const visible=buffer.solve(model.parts.length,{projections:id=>model.parts[id].kind!=='bone',scanlineClips:false});
  const section=document.createElement('section');section.dataset.view=view;section.innerHTML='<h2>'+['정면','측면','후면'][i]+'</h2><svg viewBox="0 0 600 630" xmlns="'+ns+'"><defs></defs><g class="surfaces"></g><g class="leaders"></g></svg>';row.querySelector('.panels').append(section);
  const svg=section.querySelector('svg'),defs=svg.querySelector('defs'),surfaces=svg.querySelector('.surfaces'),leaders=svg.querySelector('.leaders');
  const make=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
  model.parts.forEach((part,id)=>{
   const outline=AtlasContour(visible,k=>visible.owners[k]===id,visible.bounds[id]);if(!outline)return;
   const bone=part.kind==='bone',clip=make('clipPath',{id:region+view+id},defs);make('path',{d:outline},clip);
   const g=make('g',{'data-part':part.name,'data-kind':part.kind},surfaces);make('path',{d:outline,fill:bone?'#e8e9eb':part.material==='tendon'?'#fafafa':part.displayColor||colors[part.color],stroke:'#89919e','stroke-width':bone?.9:.6,'stroke-opacity':bone?.85:.45},g);
   if(bone)return;let path='',local=visible.ownerZ[id];
   for(const fiber of part.fibers){let segment=[];const flush=()=>{let len=0;for(let j=1;j<segment.length;j++)len+=Math.hypot(...segment[j].map((v,k)=>v-segment[j-1][k]));if(len>=5)path+=curve(segment);segment=[];};
    for(const p of fiber){const q=project(p),x=Math.floor((q[0]-visible.x0)/visible.step),y=Math.floor((q[1]-visible.y0)/visible.step),k=y*visible.w+x;
     if(x>=0&&x<visible.w&&y>=0&&y<visible.h&&visible.owners[k]===id&&depth(p)>=local[k]-2)segment.push(q);else flush();}flush();
   }make('path',{d:path,fill:'none',stroke:'#1a1c1f','stroke-width':.65,'stroke-opacity':.28,'clip-path':'url(#'+region+view+id+')'},g);
  });
  const labels=[];let left=0,right=0;
  const viewNames=region==='forearm'?names.forearm:view==='front'?Object.fromEntries(Object.entries(names.thigh).filter(([k])=>!['biceps-femoris-long','semitendinosus'].includes(k))):view==='back'?{'biceps-femoris-long':'대퇴이두근 장두','biceps-femoris-short':'대퇴이두근 단두','semitendinosus':'반힘줄근','semimembranosus':'반막근'}:{'vastus-lateralis':'외측광근','biceps-femoris-long':'대퇴이두근 장두','sartorius':'봉공근'};
  for(const [key,text]of Object.entries(viewNames)){
   const ids=model.parts.map((p,id)=>(region==='forearm'?p.color===key:p.name===key)?id:-1).filter(id=>id>=0),points=ids.flatMap(id=>visible.centers[id]);
   if(ids.reduce((n,id)=>n+visible.coverage[id],0)<150||!points.length)continue;
   const mean=points.reduce((sum,p)=>sum.map((v,j)=>v+p[j]/points.length),[0,0]),target=points.reduce((best,p)=>Math.hypot(...p.map((v,j)=>v-mean[j]))<Math.hypot(...best.map((v,j)=>v-mean[j]))?p:best);
   const l=labels.length%2===0,x=l?16:584,y=110+(l?left++:right++)*100;
   make('path',{d:`M${x},${y+5}L${target.join(',')}`,fill:'none',stroke:'#8593a6','stroke-width':.9},leaders);make('text',{x,y,'text-anchor':l?'start':'end'},leaders).textContent=text;labels.push(text);
  }
  const labelByName={'brachioradialis':'상완요골근','flexor-carpi-radialis':'요측수근굴근','flexor-carpi-ulnaris-humeral':'척측수근굴근 상완두','flexor-carpi-ulnaris-ulnar':'척측수근굴근 척골두','flexor-digitorum-superficialis-humeroulnar':'천지굴근 상완척골두','flexor-digitorum-superficialis-radial':'천지굴근 요골두','flexor-digitorum-profundus':'심지굴근','palmaris-longus':'장장근','extensor-carpi-radialis-longus':'장요측수근신근','extensor-carpi-radialis-brevis':'단요측수근신근','extensor-digitorum':'총지신근','extensor-carpi-ulnaris-humeral':'척측수근신근 상완두','extensor-carpi-ulnaris-ulnar':'척측수근신근 척골두','pronator-teres-humeral':'원회내근 상완두','pronator-teres-ulnar':'원회내근 척골두','supinator':'회외근','pronator-quadratus':'방형회내근',...names.thigh,'vastus-intermedius':'중간광근','biceps-femoris-short':'대퇴이두근 단두','semimembranosus':'반막근'};
  const groupLabels=model.parts.map((p,id)=>({p,id})).filter(({p,id})=>p.kind==='muscle'&&!p.material&&visible.coverage[id]>100);
  const legend=document.createElement('div');legend.className='legend';legend.innerHTML=groupLabels.map(({p})=>'<span><i style="background:'+(p.displayColor||colors[p.color])+'"></i>'+(labelByName[p.name]||p.name)+'</span>').join('');section.append(legend);
  records.push({region,view,yaw,labels,coverage:visible.coverage,parts:model.parts.map(p=>({name:p.name,source:p.source,displayCut:p.displayCut}))});
 }
}
window.previewAudit={views:records,source:data.source,poses:Object.fromEntries(Object.entries(data.models).map(([k,v])=>[k,v.pose]))};window.ready=true;
