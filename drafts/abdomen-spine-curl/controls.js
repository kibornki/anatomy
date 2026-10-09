(()=>{
 const root=document.getElementById('abdomen'),model=AbdomenDraft(root),by=id=>document.getElementById('abdomen-'+id);let angle=100,view='side',playing=false,phase=Math.PI,last=0;
 const revision='abdomen-spine-curl-v1',configNode=document.getElementById('hub-config'),config=configNode?JSON.parse(configNode.textContent):null;
 const saved=config?.state,content=saved?.modelContent;
 if(content?.revision===revision){
  if(Number.isFinite(content.angle))angle=Math.max(0,Math.min(100,content.angle));
  if(['front','side'].includes(content.camera))view=content.camera;
  playing=saved.privateContent?.playing===true;
 }
 // Earlier saved angles described a different hip-driven model. Keep its display
 // preferences but use the approved pose instead of interpreting degrees as %.
 if(typeof content?.fibers==='boolean')by('fibers').checked=content.fibers;
 if(typeof content?.transparent==='boolean')by('transparent').checked=content.transparent;
 function layers(){root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);}
 function capture(){if(config)parent.postMessage({type:'anatomy-hub-state',key:config.key,state:{modelContent:{revision,topic:'복부 몸통 말기',angle,camera:view,fibers:by('fibers').checked,transparent:by('transparent').checked},privateContent:{playing}}},'*');}
 const legend=root.querySelector('.diagram-legend');
 for(const [name,color] of [['전거근','orange'],['외복사근','blue'],['내복사근','green'],['복직근','red']]){const span=document.createElement('span'),dot=document.createElement('i');dot.className=color+'-key';span.append(dot,document.createTextNode(name));legend.append(span);}
 function render(){model.render(angle,view);by('angle').value=angle;by('value').textContent=Math.round(angle)+'%';by('angle').setAttribute('aria-valuetext',Math.round(angle)+'퍼센트 말기');for(const v of ['front','side'])by(v).setAttribute('aria-pressed',view===v);}
 function play(on){playing=on;by('play').textContent=on?'일시정지':'재생';by('play').setAttribute('aria-pressed',on);last=0;}
 by('angle').addEventListener('input',()=>{play(false);angle=+by('angle').value;render();});
 by('play').addEventListener('click',()=>{if(!playing)phase=Math.acos(Math.max(-1,Math.min(1,1-2*angle/100)));play(!playing);});
 for(const v of ['front','side'])by(v).addEventListener('click',()=>{view=v;render();});
 by('fibers').addEventListener('change',layers);
 by('transparent').addEventListener('change',layers);
 let fitPending=false;
 function fit(){fitPending=false;const svg=root.querySelector('svg'),available=Math.max(0,document.documentElement.clientWidth-32),overhead=root.scrollHeight-svg.getBoundingClientRect().height,heightWidth=(innerHeight-overhead-48)*640/515,next=Math.floor(Math.min(available,760,Math.max(220,heightWidth)))+'px';if(root.style.width!==next)root.style.width=next;}
 const queueFit=()=>{if(!fitPending){fitPending=true;requestAnimationFrame(fit);}};
 window.addEventListener('resize',queueFit);
 new ResizeObserver(queueFit).observe(root);
 for(const event of ['input','change','click'])document.addEventListener(event,()=>queueMicrotask(capture));
 new ResizeObserver(render).observe(root);
 let lastCapture=0;
 function tick(t){if(playing){if(last)phase+=(t-last)*.00085;angle=100*(1-Math.cos(phase))/2;render();if(t-lastCapture>500){capture();lastCapture=t;}}last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.abdomenDraft={model,root,setPose(a,v=view){play(false);angle=Math.max(0,Math.min(100,a));if(['front','side'].includes(v))view=v;render();capture();}};
 layers();phase=Math.acos(Math.max(-1,Math.min(1,1-2*angle/100)));play(playing);render();queueFit();capture();
})();
