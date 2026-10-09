"""Capture material proposals at the exact existing poses, before integration."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
repo=Path(__file__).resolve().parents[2];w=Path(__file__).parent;out=repo/'drafts/abdomen-style-review-v2';out.mkdir(exist_ok=True)
htmlOut=Path('/workspace/artifacts/style-preview-v2');htmlOut.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:8767/';reports=[]
helpers=(repo/'work/abdomen/atlas-contours.js').read_text()+'\n'+(w/'material.js').read_text()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':1100,'height':1100},reduced_motion='reduce')
 for name,prefix,angle,title in [('upperbody','upperbody',60,'상체'),('forearm','forearm',0,'전완'),('thigh','thigh',0,'허벅지')]:
  columns=[];beforeColumns=[];css=''
  p.goto(base+name+'.html');p.locator('#'+prefix+'-angle').wait_for();p.add_script_tag(content=helpers)
  for view,label in [('front','정면'),('side','측면'),('back','후면')]:
   p.evaluate('()=>window.stylePreviewReset?.()')
   if p.locator('#'+prefix+'-play').get_attribute('aria-pressed')=='true':p.locator('#'+prefix+'-play').click()
   p.locator('#'+prefix+'-angle').fill(str(angle));p.locator('#'+prefix+'-angle').dispatch_event('input');p.locator('#'+prefix+'-fibers').check();p.locator('#'+prefix+'-transparent').uncheck();p.locator('#'+prefix+'-'+view).click();p.wait_for_timeout(80)
   root=p.locator('#upperbody' if name=='upperbody' else '#'+name+'-motion');root.wait_for()
   before=p.evaluate('''()=>{const root=document.querySelector('.diagram')||document.getElementById('forearm-motion')||document.getElementById('thigh-motion');return {svg:root.querySelector('svg').outerHTML,id:root.id,cls:root.className,css:[...document.querySelectorAll('style')].map(s=>s.textContent).join(String.fromCharCode(10))};}''')
   result=p.evaluate('''()=>{const root=document.querySelector('.diagram')||document.getElementById('forearm-motion')||document.getElementById('thigh-motion');return AbdomenStylePreview(root);}''');assert result['sourceGeometryUnchanged']
   after=p.evaluate('''()=>{const root=document.querySelector('.diagram')||document.getElementById('forearm-motion')||document.getElementById('thigh-motion');return {svg:root.querySelector('svg').outerHTML,css:[...document.querySelectorAll('style')].map(s=>s.textContent).join(String.fromCharCode(10)),angle:root.dataset.angle,camera:root.dataset.camera,cameraYaw:root.dataset.cameraYaw};}''')
   reports.append({'region':name,'view':view,'angle':after['angle'],'camera':after['camera'],'cameraYaw':after['cameraYaw'],**result});css=after['css']
   columns.append('<section id="'+before['id']+'" class="'+before['cls']+'"><h2>'+label+'</h2>'+after['svg']+'</section>')
   beforeColumns.append('<section id="'+before['id']+'" class="'+before['cls']+'"><h2>'+label+'</h2>'+before['svg']+'</section>')
  # Isolate SVG IDs across columns before assembling the static sheet.
  def unique(section,i):
   ids=re.findall(r'\bid="([^"]+)"',section)
   for original in sorted(ids,key=len,reverse=True):
    if original in ['upperbody','forearm-motion','thigh-motion']:continue
    replacement='sheet-'+str(i)+'-'+original
    section=section.replace('id="'+original+'"','id="'+replacement+'"').replace('href="#'+original+'"','href="#'+replacement+'"').replace('url(#'+original+')','url(#'+replacement+')')
   return section
  columns=[unique(s,i) for i,s in enumerate(columns)];beforeColumns=[unique(s,i+3) for i,s in enumerate(beforeColumns)]
  layout='''body{margin:0;background:white!important;color:#293545!important;font-family:system-ui,sans-serif}h1{font-size:24px;margin:20px 24px 8px}p.note{font-size:14px;margin:0 24px 12px;color:#556274}.previews{display:flex;align-items:flex-start;padding:8px 18px 20px;gap:4px}section{width:480px!important;max-width:none!important;margin:0!important;padding:0!important;flex:0 0 480px}section h2{font-size:17px;text-align:center;margin:0 0 8px}section svg{width:480px!important;height:auto!important;display:block;background:white}.sheet{width:1484px}.old-heading{font-size:19px;margin:18px 24px 0}.before .preview-fiber,.before .preview-bone-outline{display:none}'''
  document='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'\n'+layout+'</style><body><main class="sheet"><h1>'+title+' · 복부 스타일 시안</h1><p class="note">기존 자세·근육 구성·시점 유지</p><div class="previews">'+''.join(columns)+'</div></main></body></html>'
  (htmlOut/(name+'.html')).write_text(document);p.set_content(document);p.locator('.sheet').screenshot(path=str(out/(name+'.png')))
  # The comparison must use the original CSS, rather than re-style "before".
  beforeDoc='<!doctype html><html lang="ko"><meta charset="utf-8"><style>'+before['css']+'\n'+layout+'</style><body><main class="sheet"><h1>'+title+' · 현재 표현</h1><p class="note">동일 자세 비교</p><div class="previews">'+''.join(beforeColumns)+'</div></main></body></html>'
  p.set_content(beforeDoc);p.locator('.sheet').screenshot(path=str(out/(name+'-before.png')))
 b.close()
(w/'validation.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n');print('Generated three preview sheets; original geometry unchanged in all nine views.')
