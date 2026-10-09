(()=>{
 const root=document.getElementById('arm'),model=AtlasArm(root),by=id=>document.getElementById('arm-'+id),cfg=document.getElementById('hub-config'),config=cfg?JSON.parse(cfg.textContent):null,store='artist-arm-v1',topic='팔 팔꿈치 굽힘';
 let angle=0,view='front',playing=false,phase=0,last=0,lastDraw=0;
 let saved=config?.state;try{saved??=JSON.parse(localStorage.getItem(store)||'null');}catch{}
 const content=saved?.modelContent;if(content?.topic===topic){if(Number.isFinite(content.angle))angle=Math.max(0,Math.min(135,content.angle));if(['front','side','back'].includes(content.camera))view=content.camera;if(typeof content.fibers==='boolean')by('fibers').checked=content.fibers;if(typeof content.transparent==='boolean')by('transparent').checked=content.transparent;playing=saved.privateContent?.playing===true&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
 if(['front','side','back'].includes(location.hash.slice(1)))view=location.hash.slice(1);
 const legendItems={front:[['red','이두 장두'],['blue','이두 단두'],['orange','삼각근']],back:[['red','삼두 장두'],['blue','외측두'],['green','내측두'],['orange','삼각근']],side:[['red','이두·삼두 장두'],['blue','이두 단두·삼두 외측두'],['green','삼두 내측두'],['orange','삼각근']]};
 let lastView='';function render(){root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);root.dataset.angle=angle;root.dataset.camera=view;root.dataset.revision='arm-atlas-aponeurosis-v1';model.render(angle,view);by('angle').value=angle;by('value').textContent=Math.round(angle)+'°';by('angle').setAttribute('aria-valuetext',Math.round(angle)+'도 굽힘');for(const v of ['front','side','back'])by(v).setAttribute('aria-pressed',v===view);root.querySelector('.diagram-caption').textContent=(view==='side'?'측면':view==='front'?'정면 사선':'후면 사선')+' · 오른팔 · 이두·삼두·삼각근';
  if(lastView!==view){lastView=view;const legend=root.querySelector('.diagram-legend');legend.replaceChildren();for(const [color,name]of legendItems[view]){const span=document.createElement('span'),key=document.createElement('i');key.className=color+'-key';span.append(key,document.createTextNode(name));legend.append(span);}}
 }
 function capture(){const state={modelContent:{revision:'arm-atlas-aponeurosis-v1',topic,angle:Math.round(angle),camera:view,fibers:by('fibers').checked,transparent:by('transparent').checked},privateContent:{playing}};try{localStorage.setItem(store,JSON.stringify(state));}catch{}if(config)parent.postMessage({type:'anatomy-hub-state',key:config.key,state},'*');}
 function play(on){playing=on;by('play').textContent=on?'일시정지':'재생';by('play').setAttribute('aria-pressed',on);last=0;}
 function syncPhase(){phase=Math.acos(Math.max(-1,Math.min(1,1-2*angle/135)));}
 by('angle').addEventListener('input',()=>{play(false);angle=+by('angle').value;render();capture();});
 by('play').addEventListener('click',()=>{if(!playing)syncPhase();play(!playing);capture();});
 for(const v of ['front','side','back'])by(v).addEventListener('click',()=>{view=v;render();capture();queueFit();});
 for(const id of ['fibers','transparent'])by(id).addEventListener('change',()=>{render();capture();});
 let pending=false;function fit(){pending=false;const svg=root.querySelector('svg'),available=Math.max(0,document.documentElement.clientWidth-32),overhead=root.scrollHeight-svg.getBoundingClientRect().height,width=Math.floor(available<=680?available:Math.min(available,700,Math.max(220,innerHeight-overhead-48)))+'px';if(root.style.width!==width)root.style.width=width;}
 function queueFit(){if(!pending){pending=true;requestAnimationFrame(fit);}}window.addEventListener('resize',queueFit);new ResizeObserver(queueFit).observe(root);new ResizeObserver(render).observe(root);
 let lastCapture=0;function tick(t){if(playing&&t-lastDraw>=50){if(last)phase+=Math.min(t-last,120)*Math.PI/5500;angle=135*(1-Math.cos(phase))/2;render();last=t;lastDraw=t;if(t-lastCapture>=500){capture();lastCapture=t;}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.armAtlas={model,root,setPose(a,v=view){play(false);angle=Math.max(0,Math.min(135,a));if(['front','side','back'].includes(v))view=v;render();capture();}};
 syncPhase();play(playing);render();queueFit();capture();
})();
