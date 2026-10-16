(()=>{
  const photos=JSON.parse(document.getElementById('photo-data').textContent);
  const tabs=[...document.querySelectorAll('[data-dashboard-mode]')];
  const list=document.getElementById('photo-list'),stage=document.getElementById('photo-compare');
  const layout=document.querySelector('.photo-layout'),library=layout.querySelector('.photo-library');
  const category=item=>item.id.startsWith('figure-')?'cartoon':'photo';
  const photoItems=photos.filter(item=>category(item)==='photo'),cartoonItems=photos.filter(item=>category(item)==='cartoon');
  const viewport=stage.parentElement,slider=document.getElementById('photo-wipe');
  const original=document.getElementById('photo-original'),sketch=document.getElementById('photo-sketch');
  const sketchLayer=document.getElementById('photo-sketch-layer');
  const title=document.getElementById('photo-title'),status=document.getElementById('selection-status');
  const storeKey='anatomy-dashboard-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(storeKey)||'null')}catch{}
  const legacyCartoon=cartoonItems.some(p=>p.id===saved?.photo);
  const state={mode:saved?.mode==='anatomy'?'anatomy':saved?.mode==='cartoon'||legacyCartoon?'cartoon':'photo',photo:photoItems.some(p=>p.id===saved?.photo)?saved.photo:photoItems[0].id,cartoon:cartoonItems.some(p=>p.id===saved?.cartoon)?saved.cartoon:legacyCartoon?saved.photo:cartoonItems[0].id,split:Number.isFinite(saved?.split)?Math.max(0,Math.min(100,saved.split)):50};
  const currentPhoto=()=>photos.find(p=>p.id===state[state.mode==='cartoon'?'cartoon':'photo']);
  const anatomyFrame=document.getElementById('anatomy-frame');
  function syncAnatomyVisibility(){anatomyFrame.contentWindow?.postMessage({type:'anatomy-hub-visibility',visible:state.mode==='anatomy'},'*');}
  anatomyFrame.addEventListener('load',syncAnatomyVisibility);
  function persist(){try{localStorage.setItem(storeKey,JSON.stringify(state))}catch{}}
  function renderSplit(){stage.style.setProperty('--photo-split',state.split+'%');slider.value=state.split;slider.setAttribute('aria-valuetext',`원본 ${Math.round(state.split)}%, 근육 스케치 ${Math.round(100-state.split)}%`)}
  function fit(){
    if(stage.closest('.dashboard-panel').hidden)return;
    const item=currentPhoto(),height=item.height*(1-(item.cropTop||0));
    const css=getComputedStyle(viewport),labels=viewport.querySelector('.photo-labels');
    const availableWidth=viewport.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
    const availableHeight=viewport.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-labels.getBoundingClientRect().height-parseFloat(css.gap);
    stage.style.width=Math.max(1,Math.min(availableWidth,availableHeight*item.width/height,900))+'px';
  }
  function frameImage(image,rect,size){
    image.style.left=rect?-100*rect[0]/rect[2]+'%':'';
    image.style.top=rect?-100*rect[1]/rect[3]+'%':'';
    image.style.width=rect?100*size[0]/rect[2]+'%':'';
    image.style.height=rect?100*size[1]/rect[3]+'%':'';
  }
  function selectPhoto(id,save=true){
    const item=photos.find(p=>p.id===id);if(!item||category(item)!==state.mode)return;
    const hasSketch=!!item.sketch;
    state[state.mode]=id;original.src=item.original;
    if(hasSketch)sketch.src=item.sketch;else sketch.removeAttribute('src');
    frameImage(original,item.originalRect,item.sourceSize);frameImage(sketch,item.sketchRect,item.sourceSize);
    sketchLayer.hidden=!hasSketch;
    sketch.hidden=!hasSketch;slider.hidden=!hasSketch;slider.disabled=!hasSketch;
    stage.querySelector('.photo-divider').hidden=!hasSketch;
    viewport.querySelector('.photo-labels span:last-child').textContent=hasSketch?'근육 스케치':'원본만';
    title.nextElementSibling.textContent=hasSketch?'원본 ↔ 근육 스케치':'원본 사진';
    original.alt=item.label+(state.mode==='cartoon'?' 원본 이미지':' 원본 사진');sketch.alt=item.label+' 근육 스케치';title.textContent=item.label;
    const crop=item.cropTop||0;stage.style.aspectRatio=item.width+'/'+item.height*(1-crop);
    stage.style.setProperty('--photo-top',-100*crop/(1-crop)+'%');stage.style.setProperty('--photo-image-height',100/(1-crop)+'%');
    for(const button of list.children)button.setAttribute('aria-pressed',String(button.dataset.photo===id));
    fit();if(save){status.textContent=item.label+' 선택됨';persist()}
  }
  for(const item of photos){
    const button=document.createElement('button');button.type='button';button.className='photo-choice';button.dataset.photo=item.id;button.dataset.category=category(item);button.setAttribute('aria-pressed','false');
    const thumb=document.createElement(item.originalRect?'span':'img');
    if(item.originalRect){const image=document.createElement('img');image.src=item.thumbnail;image.alt='';image.loading='lazy';frameImage(image,item.originalRect,item.sourceSize);thumb.className='photo-choice-sheet';thumb.setAttribute('aria-hidden','true');thumb.append(image);}
    else{thumb.src=item.thumbnail;thumb.alt='';thumb.loading='lazy';}
    const text=document.createElement('span'),label=document.createElement('strong'),detail=document.createElement('small');label.textContent=item.label;detail.textContent=item.detail+(item.sketch?'':' · 원본만');button.setAttribute('aria-label',item.label+' '+detail.textContent);text.append(label,detail);button.append(thumb,text);button.addEventListener('click',()=>selectPhoto(item.id));list.append(button);
  }
  function selectMode(mode,save=true){
    state.mode=mode;
    syncAnatomyVisibility();
    for(const tab of tabs){const active=tab.dataset.dashboardMode===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active}
    if(mode!=='anatomy'){
      document.getElementById('dashboard-'+mode).append(layout);
      library.querySelector('h2').textContent=mode==='cartoon'?'비교 일러스트·피규어':'비교 사진';
      library.setAttribute('aria-label',mode==='cartoon'?'카툰 비교 선택':'비교 사진 선택');
      for(const button of list.children)button.hidden=button.dataset.category!==mode;
      selectPhoto(state[mode],false);requestAnimationFrame(fit);
    }
    if(save)persist();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>selectMode(tab.dataset.dashboardMode));
    tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus();selectMode(tabs[next].dataset.dashboardMode)});
  });
  slider.addEventListener('input',()=>{state.split=Number(slider.value);renderSplit()});slider.addEventListener('change',persist);
  let dragging=false;
  function move(event){const bounds=stage.getBoundingClientRect();state.split=Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100));renderSplit()}
  stage.addEventListener('pointerdown',event=>{if(event.button!==0||slider.disabled)return;event.preventDefault();dragging=true;stage.setPointerCapture(event.pointerId);slider.focus({preventScroll:true});move(event)});
  stage.addEventListener('pointermove',event=>{if(dragging)move(event)});stage.addEventListener('pointerup',()=>{dragging=false;persist()});stage.addEventListener('pointercancel',()=>{dragging=false});
  new ResizeObserver(fit).observe(viewport);window.addEventListener('resize',fit);
  renderSplit();selectMode(state.mode,false);
})();
