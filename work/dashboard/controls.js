(()=>{
  const photos=JSON.parse(document.getElementById('photo-data').textContent);
  const tabs=[...document.querySelectorAll('[data-dashboard-mode]')];
  const list=document.getElementById('photo-list'),stage=document.getElementById('photo-compare');
  const viewport=stage.parentElement,slider=document.getElementById('photo-wipe');
  const original=document.getElementById('photo-original'),sketch=document.getElementById('photo-sketch');
  const muscleLabels=document.getElementById('photo-muscle-labels');
  const title=document.getElementById('photo-title'),status=document.getElementById('selection-status');
  const storeKey='anatomy-dashboard-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(storeKey)||'null')}catch{}
  const state={mode:saved?.mode==='anatomy'?'anatomy':'photo',photo:photos.some(p=>p.id===saved?.photo)?saved.photo:photos[0].id,split:Number.isFinite(saved?.split)?Math.max(0,Math.min(100,saved.split)):50};
  function persist(){try{localStorage.setItem(storeKey,JSON.stringify(state))}catch{}}
  function renderSplit(){stage.style.setProperty('--photo-split',state.split+'%');slider.value=state.split;slider.setAttribute('aria-valuetext',`원본 ${Math.round(state.split)}%, 근육 스케치 ${Math.round(100-state.split)}%`);for(const group of muscleLabels.children)group.style.visibility=state.split<=Number(group.dataset.reveal)?'visible':'hidden'}
  function renderMuscleLabels(item){
    muscleLabels.replaceChildren();muscleLabels.toggleAttribute('hidden',!item.muscleLabels?.length);
    if(!item.muscleLabels?.length)return;
    const crop=item.cropTop||0,scale=item.width/stage.clientWidth;
    muscleLabels.setAttribute('viewBox',`0 ${item.height*crop} ${item.width} ${item.height*(1-crop)}`);
    function svg(name,attrs,text){const node=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text)node.textContent=text;return node}
    for(const label of item.muscleLabels){
      const ax=label.at[0]*item.width/100,ay=label.at[1]*item.height/100;
      let x=label.text[0]*item.width/100,y=label.text[1]*item.height/100;
      const group=svg('g',{}),text=svg('text',{x,y,'font-size':11.5*scale},label.name);
      group.append(text);muscleLabels.append(group);
      const padX=5*scale,padY=3*scale,initial=text.getBBox();
      x=Math.max(initial.width/2+padX+scale,Math.min(item.width-initial.width/2-padX-scale,x));
      text.setAttribute('x',x);
      const box=text.getBBox();
      const rect={x:box.x-padX,y:box.y-padY,width:box.width+2*padX,height:box.height+2*padY,rx:4*scale};
      // End the leader at the nearest label edge; never draw through the lettering.
      const dx=ax-x,dy=ay-y,ratio=Math.max(Math.abs(dx)/(rect.width/2),Math.abs(dy)/(rect.height/2));
      if(ratio>1){const endX=x+dx/ratio,endY=y+dy/ratio;group.prepend(svg('path',{d:`M ${ax} ${ay} L ${endX} ${endY}`}));group.append(svg('circle',{cx:ax,cy:ay,r:2*scale}))}
      group.insertBefore(svg('rect',rect),text);
      // Reveal a complete name only when its label and muscle anchor are on the sketch side.
      group.dataset.reveal=100*Math.min(ax,rect.x)/item.width;
    }
    renderSplit();
  }
  function fit(){
    if(document.getElementById('dashboard-photo').hidden)return;
    const item=photos.find(p=>p.id===state.photo),height=item.height*(1-(item.cropTop||0));
    const css=getComputedStyle(viewport),labels=viewport.querySelector('.photo-labels');
    const availableWidth=viewport.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
    const availableHeight=viewport.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-labels.getBoundingClientRect().height-parseFloat(css.gap);
    stage.style.width=Math.max(1,Math.min(availableWidth,availableHeight*item.width/height,900))+'px';
    renderMuscleLabels(item);
  }
  function selectPhoto(id,save=true){
    const item=photos.find(p=>p.id===id);if(!item)return;
    const hasSketch=!!item.sketch;
    state.photo=id;original.src=item.original;
    if(hasSketch)sketch.src=item.sketch;else sketch.removeAttribute('src');
    sketch.hidden=!hasSketch;slider.hidden=!hasSketch;slider.disabled=!hasSketch;
    stage.querySelector('.photo-divider').hidden=!hasSketch;
    viewport.querySelector('.photo-labels span:last-child').textContent=hasSketch?'근육 스케치':'원본만';
    title.nextElementSibling.textContent=hasSketch?'원본 ↔ 근육 스케치':'원본 사진';
    original.alt=item.label+' 원본 사진';sketch.alt=item.label+' 근육 스케치';title.textContent=item.label;
    const crop=item.cropTop||0;stage.style.aspectRatio=item.width+'/'+item.height*(1-crop);
    stage.style.setProperty('--photo-top',-100*crop/(1-crop)+'%');stage.style.setProperty('--photo-image-height',100/(1-crop)+'%');
    for(const button of list.children)button.setAttribute('aria-pressed',String(button.dataset.photo===id));
    fit();if(save){status.textContent=item.label+' 선택됨';persist()}
  }
  for(const item of photos){
    const button=document.createElement('button');button.type='button';button.className='photo-choice';button.dataset.photo=item.id;button.setAttribute('aria-pressed','false');
    const thumb=document.createElement('img');thumb.src=item.thumbnail;thumb.alt='';thumb.loading='lazy';
    const text=document.createElement('span'),label=document.createElement('strong'),detail=document.createElement('small');label.textContent=item.label;detail.textContent=item.detail+(item.sketch?'':' · 원본만');button.setAttribute('aria-label',item.label+' '+detail.textContent);text.append(label,detail);button.append(thumb,text);button.addEventListener('click',()=>selectPhoto(item.id));list.append(button);
  }
  function selectMode(mode,save=true){
    state.mode=mode;
    for(const tab of tabs){const active=tab.dataset.dashboardMode===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active}
    if(mode==='photo')requestAnimationFrame(fit);
    if(save)persist();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>selectMode(tab.dataset.dashboardMode));
    tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft'||event.key==='ArrowRight')next=1-i;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();tabs[next].focus();selectMode(tabs[next].dataset.dashboardMode)});
  });
  slider.addEventListener('input',()=>{state.split=Number(slider.value);renderSplit()});slider.addEventListener('change',persist);
  let dragging=false;
  function move(event){const bounds=stage.getBoundingClientRect();state.split=Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100));renderSplit()}
  stage.addEventListener('pointerdown',event=>{if(event.button!==0||slider.disabled)return;event.preventDefault();dragging=true;stage.setPointerCapture(event.pointerId);slider.focus({preventScroll:true});move(event)});
  stage.addEventListener('pointermove',event=>{if(dragging)move(event)});stage.addEventListener('pointerup',()=>{dragging=false;persist()});stage.addEventListener('pointercancel',()=>{dragging=false});
  new ResizeObserver(fit).observe(viewport);window.addEventListener('resize',fit);
  selectPhoto(state.photo,false);renderSplit();selectMode(state.mode,false);
})();
