/* One dashboard control surface drives the selected self-contained model frame. */
(()=>{
 const configNode=document.getElementById('hub-config');if(!configNode)return;
 const config=JSON.parse(configNode.textContent),key=config.key,root=document.getElementById(key)||document.getElementById(key+'-motion');
 if(!root)return;
 root.dataset.hubVisible='false';
 const sceneStyle=document.createElement('style');sceneStyle.id='anatomy-hub-scene-only';sceneStyle.textContent=`
html,body{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
body{display:block!important}
#${root.id}{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;grid-template-areas:none!important;align-content:stretch!important;align-items:stretch!important;width:100%!important;max-width:none!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
#${root.id} h2,#${root.id} .diagram-caption,#${root.id} .composition-controls,#${root.id} .artist-learning,#${root.id} .diagram-controls,#${root.id} .forearm-controls,#${root.id} .thigh-controls,#${root.id} .diagram-note,#${root.id} .forearm-note,#${root.id} .thigh-note,#${root.id} .atlas-credit,#${root.id} .native-credit,#${root.id} .native-legend,#${root.id} .diagram-legend,#${root.id} .anatomy-landmark-picker,#${root.id} .artist-landmark-picker,body>.atlas-credit,body>.native-credit{display:none!important}
#arm>.diagram-stage{display:contents!important}
#upperbody>.diagram-scene,#arm>.diagram-stage>.diagram-scene,#abdomen>.diagram-scene,#forearm-motion>.forearm-scene,#thigh-motion>.thigh-scene{display:block!important;grid-area:auto!important;align-self:stretch!important;place-self:stretch!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important}
`;document.head.append(sceneStyle);
 const by=id=>document.getElementById(key+'-'+id),labelFor=input=>{
  if(!input)return'';const label=input.labels?.[0]||document.querySelector('label[for="'+input.id+'"]');if(!label)return input.getAttribute('aria-label')||'';
  const copy=label.cloneNode(true);copy.querySelectorAll('input,output').forEach(node=>node.remove());return copy.textContent.trim();
 };
 function rangeInfo(input){if(!input)return null;const output=document.getElementById(input.id+'-value');return{id:input.id,label:labelFor(input),min:Number(input.min)||0,max:Number(input.max)||100,step:Number(input.step)||1,value:Number(input.value),output:output?.textContent.trim()||''};}
 function snapshot(){
  const views=['front','side','medial','back','twist'].map(value=>by(value)).filter(Boolean).map(button=>({value:button.id.slice(key.length+1),label:button.textContent.trim(),selected:button.getAttribute('aria-pressed')==='true'}));
  const modeButtons=[...root.querySelectorAll('button[data-'+key+'-mode],button[data-limb-mode]')].map(button=>({value:button.getAttribute('data-'+key+'-mode')||button.getAttribute('data-limb-mode'),label:button.textContent.trim(),selected:button.getAttribute('aria-pressed')==='true'}));
  const landmark=by('landmark'),muscleToggle=root.querySelector('[data-'+key+'-toggle-muscles],[data-limb-toggle-muscles]'),play=by('play'),angle=by('angle');
  const credit=document.querySelector('.atlas-credit,.native-credit');
  const creditParts=credit?[...credit.childNodes].map(node=>node.nodeType===1&&node.tagName==='A'?{href:node.href,text:node.textContent}:{text:node.textContent}).filter(part=>part.text):[];
  const output=angle?document.getElementById(angle.id.replace(/-angle$/,'-value')):null;
  const note=root.querySelector('.diagram-note,.forearm-note,.thigh-note');
  return{key,title:root.querySelector('h2')?.textContent.trim()||document.title,caption:root.querySelector('.diagram-caption')?.textContent.trim()||'',modes:modeButtons,muscleToggle:muscleToggle?{label:muscleToggle.textContent.trim(),showing:root.dataset.showMuscles!=='false'}:null,transparent:by('transparent')?{id:by('transparent').id,label:labelFor(by('transparent')),checked:by('transparent').checked}:null,fibers:by('fibers')?{id:by('fibers').id,label:labelFor(by('fibers')),checked:by('fibers').checked}:null,landmark:landmark?{id:landmark.id,label:labelmarkLabel(),value:landmark.value,options:[...landmark.options].map(option=>({value:option.value,label:option.textContent.trim()}))}:null,views,play:play?{label:play.textContent.trim(),playing:play.getAttribute('aria-pressed')==='true'}:null,angle:angle?{...rangeInfo(angle),output:output?.textContent.trim()||'',ariaLabel:angle.getAttribute('aria-label')||''}:null,note:note?.textContent.trim()||'',credit:creditParts};
 }
 function labelmarkLabel(){const label=document.querySelector('label[for="'+key+'-landmark"]');return label?.textContent.trim()||'랜드마크';}
 function sendInfo(){parent.postMessage({type:'anatomy-hub-ui',key,info:snapshot()},'*');}
 function clickSelector(selector){const button=root.querySelector(selector);if(button)button.click();}
 function apply(command){
  if(!command||typeof command!=='object')return;
  if(command.action==='mode')clickSelector('button[data-'+key+'-mode="'+command.value+'"],button[data-limb-mode="'+command.value+'"]');
  else if(command.action==='view'){const button=by(command.value);button?.click();}
  else if(command.action==='toggle-muscles')clickSelector('[data-'+key+'-toggle-muscles],[data-limb-toggle-muscles]');
  else if(command.action==='play'){const button=by('play');if(button&&(button.getAttribute('aria-pressed')==='true')!==Boolean(command.value))button.click();}
  else if(command.action==='range'&&typeof command.id==='string'){const input=document.getElementById(command.id);if(input?.type==='range'){input.value=String(command.value);input.dispatchEvent(new Event('input',{bubbles:true}));}}
  else if(command.action==='check'&&typeof command.id==='string'){const input=document.getElementById(command.id);if(input?.type==='checkbox'&&input.checked!==Boolean(command.value)){input.checked=Boolean(command.value);input.dispatchEvent(new Event('change',{bubbles:true}));}}
  else if(command.action==='select'&&typeof command.id==='string'){const select=document.getElementById(command.id);if(select?.tagName==='SELECT'&&[...select.options].some(option=>option.value===command.value)){select.value=command.value;select.dispatchEvent(new Event('change',{bubbles:true}));}}
  else if(command.action==='click'&&typeof command.id==='string'){document.getElementById(command.id)?.click();}
 }
 window.addEventListener('message',event=>{if(event.source!==parent)return;const data=event.data;if(data?.type==='anatomy-hub-visibility'){root.dataset.hubVisible=String(!!data.visible);return;}if(data?.key!==key)return;if(data.type==='anatomy-hub-ui-request')sendInfo();else if(data.type==='anatomy-hub-ui-command'){try{apply(data.command);}finally{parent.postMessage({type:'anatomy-hub-ui-command-done',key,requestId:data.command?.requestId},'*');}}});
 for(const type of ['input','change','click'])document.addEventListener(type,event=>{if(root.contains(event.target))queueMicrotask(sendInfo);});
 sendInfo();
})();
