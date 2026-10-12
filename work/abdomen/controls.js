(()=>{
 const root=document.getElementById('abdomen'),flexion=AbdomenFlexion(root),twisting=AbdomenTwist(root,flexion),by=id=>document.getElementById('abdomen-'+id);
 const revision='abdomen-atlas-v5',node=document.getElementById('hub-config'),config=node?JSON.parse(node.textContent):null,store='artist-abdomen-atlas-v5';
 let saved=config?.state;try{saved??=JSON.parse(localStorage.getItem(store)||'null');}catch{}const content=saved?.modelContent;
 let curl=0,twist=30,view='front',mode='anatomy',showMuscles=true,playing=false,phase=0,last=0;
 if([revision,'abdomen-atlas-v4','abdomen-anatomy-review-v3','abdomen-twist-v2'].includes(content?.revision)){
  if(Number.isFinite(content.curl))curl=Math.max(0,Math.min(100,content.curl));
  if(Number.isFinite(content.twist))twist=Math.max(-60,Math.min(60,content.twist));
  if(['front','side','twist'].includes(content.camera))view=content.camera;
  if(['anatomy','sculpt','compare'].includes(content.mode))mode=content.mode;
  if(typeof content.showMuscles==='boolean')showMuscles=content.showMuscles;
  playing=saved.privateContent?.playing===true;
 }else if(content?.revision==='abdomen-spine-curl-v1'){
  if(Number.isFinite(content.angle))curl=Math.max(0,Math.min(100,content.angle));
  if(['front','side'].includes(content.camera))view=content.camera;
  playing=saved.privateContent?.playing===true;
 }
 if(typeof content?.fibers==='boolean')by('fibers').checked=content.fibers;
 if(typeof content?.transparent==='boolean')by('transparent').checked=content.transparent;
 const landmarks=flexion.landmarks;landmarks.restore(content?.landmark);landmarks.onChange(()=>{render();capture();});
 const composition=flexion.composition;composition.restore(content?.composition);composition.mountControls(()=>{render();capture();queueFit();});
 function capture(){const state={modelContent:{revision,topic:'복부 말기와 비틀기',curl,twist,angle:view==='twist'?twist:curl,camera:view,mode,showMuscles,fibers:by('fibers').checked,transparent:by('transparent').checked,landmark:landmarks.value,composition:composition.state},privateContent:{playing}};try{localStorage.setItem(store,JSON.stringify(state));}catch{}if(config)parent.postMessage({type:'anatomy-hub-state',key:config.key,state},'*');}
 function render(){
  const yaw=view==='twist',angle=yaw?twist:curl,slider=by('angle');root.dataset.mode=mode;root.dataset.showMuscles=showMuscles;slider.min=yaw?-60:0;slider.max=yaw?60:100;slider.value=angle;by('value').textContent=Math.round(angle)+(yaw?'°':'%');by('motion-label').textContent=yaw?'척추 비틀기':'몸통 말기';slider.setAttribute('aria-label',yaw?'척추 비틀기':'몸통 말기');slider.setAttribute('aria-valuetext',Math.round(angle)+(yaw?'도 비틀기':'퍼센트 말기'));
  root.querySelector('.diagram-caption').textContent=mode==='sculpt'?'몸통·대흉근·전거근·복직근·광배근':'전거근·외복사근·내복사근·복직근·광배근';
  by('note').textContent=(yaw?'골반 고정 · 상체 좌우 비틀기':'0%: 폄 · 100%: 상체 척추를 C자로 말기')+(mode==='sculpt'?'':' · 절개창: 내복사근');
  for(const v of ['front','side','twist'])by(v).setAttribute('aria-pressed',view===v);for(const button of root.querySelectorAll('[data-abdomen-mode]'))button.setAttribute('aria-pressed',button.dataset.abdomenMode===mode);const muscleButton=root.querySelector('[data-abdomen-toggle-muscles]');if(muscleButton)muscleButton.textContent=showMuscles?'근육 숨기기':'근육 보이기';
  if(yaw)twisting.render(angle,mode,showMuscles);else flexion.render(angle,view,mode,showMuscles);
 }
 function play(on){playing=on;by('play').textContent=on?'일시정지':'재생';by('play').setAttribute('aria-pressed',on);last=0;}
 function syncPhase(){phase=view==='twist'?Math.asin(Math.max(-1,Math.min(1,twist/60))):Math.acos(Math.max(-1,Math.min(1,1-2*curl/100)));}
 by('angle').addEventListener('input',()=>{play(false);if(view==='twist')twist=+by('angle').value;else curl=+by('angle').value;render();capture();});
 by('play').addEventListener('click',()=>{if(!playing)syncPhase();play(!playing);capture();});
 for(const v of ['front','side','twist'])by(v).addEventListener('click',()=>{view=v;syncPhase();render();capture();queueFit();});
 for(const id of ['fibers','transparent'])by(id).addEventListener('change',()=>{root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);render();capture();queueFit();});
 root.querySelectorAll('[data-abdomen-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.abdomenMode;render();capture();queueFit();}));
 root.querySelector('[data-abdomen-toggle-muscles]').addEventListener('click',()=>{showMuscles=!showMuscles;render();capture();queueFit();});
 let fitPending=false;function fit(){fitPending=false;const svg=root.querySelector('svg'),available=Math.max(0,document.documentElement.clientWidth-32),overhead=root.scrollHeight-svg.getBoundingClientRect().height,heightWidth=(innerHeight-overhead-48)*640/515,next=Math.floor(available<=680?available:Math.min(available,760,Math.max(220,heightWidth)))+'px';if(root.style.width!==next)root.style.width=next;}
 const queueFit=()=>{if(!fitPending){fitPending=true;requestAnimationFrame(fit);}};window.addEventListener('resize',queueFit);new ResizeObserver(queueFit).observe(root);new ResizeObserver(render).observe(root);
 for(const event of ['input','change','click'])document.addEventListener(event,()=>queueMicrotask(capture));
 let lastCapture=0,lastDraw=0;function tick(t){if(playing&&t-lastDraw>40){if(last)phase+=(Math.min(t-last,100))*.00065;if(view==='twist')twist=60*Math.sin(phase);else curl=100*(1-Math.cos(phase))/2;render();last=t;lastDraw=t;if(t-lastCapture>500){capture();lastCapture=t;}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.abdomenDraft={model:{flexion,twisting},root,setPose(a,v=view){play(false);if(['front','side','twist'].includes(v))view=v;if(view==='twist')twist=Math.max(-60,Math.min(60,a));else curl=Math.max(0,Math.min(100,a));render();capture();},setMode(value){if(['anatomy','sculpt','compare'].includes(value)){mode=value;render();capture();}},setShowMuscles(value){showMuscles=!!value;render();capture();}};
 root.classList.toggle('no-fibers',!by('fibers').checked);root.classList.toggle('transparent',by('transparent').checked);syncPhase();play(playing);render();queueFit();capture();
})();
