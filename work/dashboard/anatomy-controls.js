(()=>{
 const topics=JSON.parse(document.getElementById('anatomy-data').textContent);
 const cards=[...document.querySelectorAll('.card')],frame=document.getElementById('anatomy-frame'),panel=document.getElementById('anatomy-panel');
 const name=document.getElementById('selected-name'),caption=document.getElementById('selected-caption'),status=document.getElementById('selection-status');
 const controls=document.getElementById('anatomy-controls'),credit=document.getElementById('anatomy-credit'),list=document.querySelector('.cards');
 const keys=cards.map(card=>card.dataset.topic),storeKey='anatomy-hub-v1';
 let active=null,states={},saved,uiKey=null,rangeFrame=0;
 const pendingRanges=new Map();
 try{saved=JSON.parse(localStorage.getItem(storeKey)||'null');if(saved?.states&&typeof saved.states==='object')states=saved.states;}catch{}
 const aliases={chest:['upperbody','front','상체 팔 올리기'],back:['upperbody','back','상체 팔 올리기'],biceps:['arm','front','팔 팔꿈치 굽힘'],triceps:['arm','back','팔 팔꿈치 굽힘']};
 for(const old of [saved?.active,...Object.keys(aliases)]){
  if(!Object.hasOwn(aliases,old)||!states[old])continue;
  const [key,camera,topic]=aliases[old];if(states[key])continue;
  const oldState=states[old];states[key]={...oldState,modelContent:{...oldState.modelContent,topic,camera,drive:oldState.modelContent?.drive||1}};
 }
 const restoredActive=aliases[saved?.active]?.[0]||saved?.active;
 const persist=()=>{try{localStorage.setItem(storeKey,JSON.stringify({active,states}));}catch{}};
 function frameCommand(command){if(active)frame.contentWindow?.postMessage({type:'anatomy-hub-ui-command',key:active,command},'*');}
 function group(title){const node=document.createElement('fieldset');node.className='anatomy-control-group';const legend=document.createElement('legend');legend.textContent=title;node.append(legend);controls.append(node);return node;}
 function addButton(parent,label,action,value,pressed=false){const button=document.createElement('button');button.type='button';button.className='anatomy-control-button';button.textContent=label;button.dataset.hubAction=action;if(value!==undefined)button.dataset.hubValue=value;button.setAttribute('aria-pressed',String(pressed));parent.append(button);return button;}
 function addCheckToggle(parent,item){if(!item)return;const button=addButton(parent,item.label,'check-toggle',undefined,item.checked);button.dataset.hubTarget=item.id;}
 function addRange(parent,item){if(!item)return;const row=document.createElement('div');row.className='anatomy-control-row';const label=document.createElement('label'),output=document.createElement('output'),input=document.createElement('input');input.type='range';input.id='hub-range-'+item.id;input.min=item.min;input.max=item.max;input.step=item.step||1;input.value=item.value;input.dataset.hubAction='range';input.dataset.hubTarget=item.id;label.htmlFor=input.id;label.textContent=item.label;output.htmlFor=input.id;output.dataset.hubOutput=item.id;output.textContent=item.output??String(item.value);row.append(label,output,input);parent.append(row);}
 function renderControls(info){
  controls.replaceChildren();uiKey=active;
  if(info.composition){const box=group('부위 체형');addRange(box,info.composition.muscle);addRange(box,info.composition.fat);if(info.composition.reset)addButton(box,info.composition.reset.label,'click',info.composition.reset.id);if(info.composition.note){const note=document.createElement('p');note.className='anatomy-control-note';note.textContent=info.composition.note;box.append(note);}}
  if(info.landmark?.options?.length){const box=group(info.landmark.label||'랜드마크'),select=document.createElement('select');select.className='anatomy-landmark-select';select.dataset.hubAction='select';select.dataset.hubTarget=info.landmark.id;select.setAttribute('aria-label',info.landmark.label||'랜드마크 선택');select.id='hub-landmark';for(const option of info.landmark.options){const node=document.createElement('option');node.value=option.value;node.textContent=option.label;select.append(node);}box.append(select);}
  if(info.modes?.length||info.muscleToggle||info.transparent||info.fibers||info.composition?.fatTransparent){const box=group('표시 방식'),buttons=document.createElement('div');buttons.className='anatomy-control-buttons';for(const mode of info.modes||[])addButton(buttons,mode.label,'mode',mode.value,mode.selected);box.append(buttons);const toggles=document.createElement('div');toggles.className='anatomy-control-buttons anatomy-toggle-buttons';if(info.muscleToggle)addButton(toggles,info.muscleToggle.label,'toggle-muscles',undefined,info.muscleToggle.showing);addCheckToggle(toggles,info.transparent);addCheckToggle(toggles,info.fibers);addCheckToggle(toggles,info.composition?.fatTransparent);if(toggles.childElementCount)box.append(toggles);}
  const motion=group('보기와 움직임'),row=document.createElement('div');row.className='anatomy-play-view-row';if(info.play)addButton(row,info.play.label,'play',undefined,info.play.playing);const views=document.createElement('div');views.className='anatomy-view-row';for(const view of info.views||[])addButton(views,view.label,'view',view.value,view.selected);row.append(views);motion.append(row);addRange(motion,info.angle);
  if(info.note){const note=document.createElement('p');note.className='anatomy-control-note';note.textContent=info.note;motion.append(note);}
  credit.replaceChildren();for(const part of info.credit||[]){if(part.href){const link=document.createElement('a');link.href=part.href;link.target='_blank';link.rel='noopener';link.textContent=part.text;credit.append(link);}else credit.append(document.createTextNode(part.text));}credit.hidden=!(info.credit||[]).length;
  syncControls(info);
 }
 function syncControls(info){
  if(!info)return;
  caption.textContent=info.caption||'근육 표시 조절';
  for(const item of [info.composition?.muscle,info.composition?.fat,info.angle])if(item){const input=controls.querySelector('[data-hub-target="'+item.id+'"][type=range]');if(input){input.min=item.min;input.max=item.max;input.step=item.step||1;if(input.value!==String(item.value))input.value=item.value;}const output=controls.querySelector('[data-hub-output="'+item.id+'"]');if(output)output.textContent=item.output??String(item.value);}
  const landmark=controls.querySelector('[data-hub-action=select]');if(landmark&&info.landmark)landmark.value=info.landmark.value;
  const checkValues=[info.transparent,info.fibers,info.composition?.fatTransparent].filter(Boolean);for(const item of checkValues){const button=controls.querySelector('button[data-hub-action=check-toggle][data-hub-target="'+item.id+'"]');if(button)button.setAttribute('aria-pressed',String(!!item.checked));}
  for(const button of controls.querySelectorAll('[data-hub-action=mode]')){const item=(info.modes||[]).find(mode=>mode.value===button.dataset.hubValue);if(item)button.setAttribute('aria-pressed',String(item.selected));}
  for(const button of controls.querySelectorAll('[data-hub-action=view]')){const item=(info.views||[]).find(view=>view.value===button.dataset.hubValue);if(item)button.setAttribute('aria-pressed',String(item.selected));}
  const muscleButton=controls.querySelector('[data-hub-action=toggle-muscles]');if(muscleButton&&info.muscleToggle){muscleButton.textContent=info.muscleToggle.label;muscleButton.setAttribute('aria-pressed',String(info.muscleToggle.showing));}
  const playButton=controls.querySelector('[data-hub-action=play]');if(playButton&&info.play){playButton.textContent=info.play.label;playButton.setAttribute('aria-pressed',String(info.play.playing));}
  const motionNote=controls.querySelector('.anatomy-control-group:last-child .anatomy-control-note');if(motionNote)motionNote.textContent=info.note||'';
 }
 function requestUi(){if(active)frame.contentWindow?.postMessage({type:'anatomy-hub-ui-request',key:active},'*');}
 frame.addEventListener('load',requestUi);
 function select(key){
  if(!Object.hasOwn(topics,key)||active===key)return;
  cancelAnimationFrame(rangeFrame);rangeFrame=0;pendingRanges.clear();
  active=key;uiKey=null;
  for(const card of cards){const selected=card.dataset.topic===key;card.setAttribute('aria-selected',String(selected));card.tabIndex=selected?0:-1;}
  const topic=topics[key];panel.setAttribute('aria-labelledby','tab-'+key);name.textContent=topic.label+' · '+topic.movement;caption.textContent='모델을 불러오는 중입니다.';
  frame.title=topic.label+' 애니메이션';status.textContent=topic.label+' 선택됨';controls.replaceChildren(Object.assign(document.createElement('p'),{className:'anatomy-controls-loading',textContent:'모델을 불러오는 중입니다.'}));credit.replaceChildren();credit.hidden=true;
  const config=JSON.stringify({key,state:states[key]||null}).replaceAll('<','\\u003c');
  const child=topic.document.replace('__HUB_CONFIG__',config);
  frame.srcdoc=child;persist();
 }
 controls.addEventListener('click',event=>{const button=event.target.closest('[data-hub-action]');if(!button)return;const action=button.dataset.hubAction;if(action==='mode'||action==='view')frameCommand({action,value:button.dataset.hubValue});else if(action==='play')frameCommand({action,value:button.getAttribute('aria-pressed')!=='true'});else if(action==='toggle-muscles')frameCommand({action});else if(action==='check-toggle'){const value=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(value));frameCommand({action:'check',id:button.dataset.hubTarget,value});}else if(action==='click')frameCommand({action,id:button.dataset.hubValue});});
 controls.addEventListener('input',event=>{const input=event.target.closest('[data-hub-action=range]');if(!input)return;pendingRanges.set(input.dataset.hubTarget,Number(input.value));if(!rangeFrame)rangeFrame=requestAnimationFrame(()=>{rangeFrame=0;for(const [id,value]of pendingRanges)frameCommand({action:'range',id,value});pendingRanges.clear();});});
 controls.addEventListener('change',event=>{const input=event.target.closest('[data-hub-action=check],[data-hub-action=select]');if(!input)return;frameCommand({action:input.dataset.hubAction,id:input.dataset.hubTarget,value:input.type==='checkbox'?input.checked:input.value});});
 cards.forEach((card,index)=>{
  card.addEventListener('click',()=>select(card.dataset.topic));
  card.addEventListener('keydown',event=>{
   if(event.altKey||event.ctrlKey||event.metaKey)return;let next;
   if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%cards.length;
   else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+cards.length-1)%cards.length;
   else if(event.key==='Home')next=0;else if(event.key==='End')next=cards.length-1;else return;
   event.preventDefault();cards[next].focus();select(cards[next].dataset.topic);
  });
 });
 window.addEventListener('message',event=>{
  const data=event.data;if(event.source!==frame.contentWindow||!data||!Object.hasOwn(topics,data.key))return;
  if(data.type==='anatomy-hub-state'&&data.state&&typeof data.state==='object'){states[data.key]=data.state;persist();if(active===data.key)requestUi();}
  else if(data.type==='anatomy-hub-ui'&&data.key===active&&data.info){if(uiKey!==active)renderControls(data.info);else syncControls(data.info);}
 });
 const narrow=matchMedia('(max-width:680px)'),orientation=()=>list.setAttribute('aria-orientation',narrow.matches?'horizontal':'vertical');
 narrow.addEventListener('change',orientation);orientation();select(keys.includes(restoredActive)?restoredActive:'upperbody');
})();
