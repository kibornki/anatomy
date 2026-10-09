(()=>{
 const root=document.getElementById('abdomen'),flexion=AbdomenFlexion(root),twisting=AbdomenTwist(root,flexion),by=id=>document.getElementById('abdomen-'+id);
 const revision='abdomen-anatomy-review-v3',node=document.getElementById('hub-config'),config=node?JSON.parse(node.textContent):null,content=config?.state?.modelContent;
 let curl=0,twist=30,view='front',playing=false,phase=0,last=0;
 if([revision,'abdomen-twist-v2'].includes(content?.revision)){
  if(Number.isFinite(content.curl))curl=Math.max(0,Math.min(100,content.curl));
  if(Number.isFinite(content.twist))twist=Math.max(-60,Math.min(60,content.twist));
  if(['front','side','twist'].includes(content.camera))view=content.camera;
  playing=config.state.privateContent?.playing===true;
 }else if(content?.revision==='abdomen-spine-curl-v1'){
  if(Number.isFinite(content.angle))curl=Math.max(0,Math.min(100,content.angle));
  if(['front','side'].includes(content.camera))view=content.camera;
  playing=config.state.privateContent?.playing===true;
 }
 if(typeof content?.fibers==='boolean')by('fibers').checked=content.fibers;
 if(typeof content?.transparent==='boolean')by('transparent').checked=content.transparent;
 function layers(){root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);render();}
 function capture(){if(config)parent.postMessage({type:'anatomy-hub-state',key:config.key,state:{modelContent:{revision,topic:'복부 말기와 비틀기',curl,twist,angle:view==='twist'?twist:curl,camera:view,fibers:by('fibers').checked,transparent:by('transparent').checked},privateContent:{playing}}},'*');}
 const legend=root.querySelector('.diagram-legend');
 for(const [name,color]of [['전거근','orange'],['외복사근','blue'],['내복사근','green'],['복직근','red'],['광배근','purple']]){const span=document.createElement('span'),dot=document.createElement('i');dot.className=color+'-key';span.append(dot,document.createTextNode(name));legend.append(span);}
 function render(){const yaw=view==='twist',angle=yaw?twist:curl,slider=by('angle');slider.min=yaw?-60:0;slider.max=yaw?60:100;slider.value=angle;by('value').textContent=Math.round(angle)+(yaw?'°':'%');by('motion-label').textContent=yaw?'척추 비틀기':'몸통 말기';slider.setAttribute('aria-label',yaw?'척추 비틀기':'몸통 말기');slider.setAttribute('aria-valuetext',Math.round(angle)+(yaw?'도 비틀기':'퍼센트 말기'));
  by('note').textContent=yaw?'골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근':'0%: 폄 · 100%: 상체 척추를 C자로 말기 · 절개창: 내복사근';
  for(const v of ['front','side','twist'])by(v).setAttribute('aria-pressed',view===v);
  if(yaw)twisting.render(angle);else{twisting.hide();flexion.render(angle,view);}
 }
 function play(on){playing=on;by('play').textContent=on?'일시정지':'재생';by('play').setAttribute('aria-pressed',on);last=0;}
 function syncPhase(){phase=view==='twist'?Math.asin(Math.max(-1,Math.min(1,twist/60))):Math.acos(Math.max(-1,Math.min(1,1-2*curl/100)));}
 by('angle').addEventListener('input',()=>{play(false);if(view==='twist')twist=+by('angle').value;else curl=+by('angle').value;render();});
 by('play').addEventListener('click',()=>{if(!playing)syncPhase();play(!playing);});
 for(const v of ['front','side','twist'])by(v).addEventListener('click',()=>{view=v;syncPhase();render();queueFit();});
 by('fibers').addEventListener('change',layers);by('transparent').addEventListener('change',layers);
 let fitPending=false;function fit(){fitPending=false;const svg=root.querySelector('svg'),available=Math.max(0,document.documentElement.clientWidth-32),overhead=root.scrollHeight-svg.getBoundingClientRect().height,heightWidth=(innerHeight-overhead-48)*640/515,next=Math.floor(available<=680?available:Math.min(available,760,Math.max(220,heightWidth)))+'px';if(root.style.width!==next)root.style.width=next;}
 const queueFit=()=>{if(!fitPending){fitPending=true;requestAnimationFrame(fit);}};window.addEventListener('resize',queueFit);new ResizeObserver(queueFit).observe(root);new ResizeObserver(render).observe(root);
 for(const event of ['input','change','click'])document.addEventListener(event,()=>queueMicrotask(capture));
 let lastCapture=0,lastDraw=0;function tick(t){if(playing&&t-lastDraw>40){if(last)phase+=(Math.min(t-last,100))*.00065;if(view==='twist')twist=60*Math.sin(phase);else curl=100*(1-Math.cos(phase))/2;render();last=t;lastDraw=t;if(t-lastCapture>500){capture();lastCapture=t;}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.abdomenDraft={model:{flexion,twisting},root,setPose(a,v=view){play(false);if(['front','side','twist'].includes(v))view=v;if(view==='twist')twist=Math.max(-60,Math.min(60,a));else curl=Math.max(0,Math.min(100,a));render();capture();}};
 root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);syncPhase();play(playing);render();queueFit();capture();
})();
