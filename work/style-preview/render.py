from playwright.sync_api import sync_playwright
from pathlib import Path
import json,html
out=Path(__file__).resolve().parents[2]/'drafts/style-only-review';out.mkdir(parents=True,exist_ok=True);panels={};report=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':1100,'height':1100},reduced_motion='reduce')
 for name,prefix,angle in [('upperbody','upperbody',60),('thigh','thigh',0),('forearm','forearm',0)]:
  p.goto('http://127.0.0.1:8767/'+name+'.html');p.wait_for_timeout(250)
  if p.locator('#'+prefix+'-play').get_attribute('aria-pressed')=='true':p.locator('#'+prefix+'-play').click()
  p.locator('#'+prefix+'-angle').fill(str(angle));p.locator('#'+prefix+'-angle').dispatch_event('input');p.locator('#'+prefix+'-fibers').check();p.locator('#'+prefix+'-transparent').uncheck()
  panels[name]=[]
  for view,label in [('front','정면'),('side','측면'),('back','후면')]:
   p.locator('#'+prefix+'-'+view).click();p.wait_for_timeout(100)
   data=p.evaluate('''() => {
    const root=document.querySelector('.diagram')||document.getElementById('thigh-motion')||document.getElementById('forearm-motion'),svg=root.querySelector('svg'),ns='http://www.w3.org/2000/svg';
    const geometry=()=>[...svg.querySelectorAll('path')].map(n=>[n.getAttribute('d'),n.getAttribute('transform')]);const before=JSON.stringify(geometry());
    let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.prepend(defs);}
    let count=0;
    for(const n of svg.querySelectorAll('path')){
     const cs=getComputedStyle(n),fill=cs.fill,cls=n.getAttribute('class')||'';
     if(fill==='none'||fill==='rgba(0, 0, 0, 0)'||n.closest('defs')||n.closest('[class*=label]'))continue;
     const match=fill.match(/rgb\\((\\d+), (\\d+), (\\d+)\\)/),modern=fill.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)/);if(!match&&!modern)continue;
     const rgb=match?match.slice(1).map(Number):modern.slice(1).map(v=>+v*255),spread=Math.max(...rgb)-Math.min(...rgb),bone=spread<28&&Math.min(...rgb)>140;
     if(!bone&&spread<30)continue;
     const id='style-only-shade-'+count++,gradient=document.createElementNS(ns,'linearGradient');gradient.id=id;gradient.setAttribute('x1','0%');gradient.setAttribute('y1','0%');gradient.setAttribute('x2','95%');gradient.setAttribute('y2','70%');
     const shade=(t)=>'rgb('+rgb.map(v=>Math.round(t>=0?v+(255-v)*t:v*(1+t))).join(',')+')';
     for(const [offset,color]of [['0%',shade(bone?.12:.12)],['35%','rgb('+rgb.map(v=>Math.round(v)).join(',')+')'],['78%',shade(bone?-.06:-.16)],['100%',shade(bone?-.10:-.23)]]){const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.append(stop);}
     defs.append(gradient);n.style.fill='url(#'+id+')';n.style.strokeWidth=bone?'.8':'.6';n.style.strokeOpacity=bone?'.7':'.48';
    }
    for(const n of svg.querySelectorAll('.fiber, .fibers path')){n.style.strokeWidth='.6';n.style.strokeOpacity='.3';}
    const clone=svg.cloneNode(true),ids=new Map();for(const n of clone.querySelectorAll('[id]')){ids.set(n.id,'preview-'+root.dataset.camera+'-'+n.id);n.id=ids.get(n.id);}
    for(const n of clone.querySelectorAll('*'))for(const a of [...n.attributes]){let v=a.value;for(const [old,id]of ids){v=v.replaceAll('url(#'+old+')','url(#'+id+')').replaceAll('url("#'+old+'")','url("#'+id+'")');if((a.name==='href'||a.name==='xlink:href')&&v==='#'+old)v='#'+id;}if(v!==a.value)n.setAttribute(a.name,v);}
    return {rootId:root.id,rootClass:root.className,svg:clone.outerHTML,css:[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n'),same:before===JSON.stringify(geometry()),shaded:count,angle:root.dataset.angle,camera:root.dataset.camera,cameraYaw:root.dataset.cameraYaw};
   }''')
   assert data['same'];report.append({'region':name,'view':view,**{k:data.get(k) for k in ['same','shaded','angle','camera','cameraYaw']}})
   panels[name].append('<section id="'+data['rootId']+'" class="'+data['rootClass']+'"><h2>'+label+'</h2>'+data['svg']+'</section>')
   # Refresh to prevent reusing previous preview-only gradients or styles.
   if view!='back':
    p.reload();p.wait_for_timeout(150);p.locator('#'+prefix+'-angle').fill(str(angle));p.locator('#'+prefix+'-angle').dispatch_event('input');p.locator('#'+prefix+'-fibers').check();p.locator('#'+prefix+'-transparent').uncheck()
  css=data['css']
  title={'upperbody':'상체','thigh':'허벅지','forearm':'전완'}[name]
  document='<!doctype html><html lang="ko"><meta charset="utf-8"><style>'+css+'''\nbody{margin:0;background:white!important;color:#293545!important;font-family:Arial,sans-serif}h1{font-size:24px;padding:24px 24px 4px;margin:0}p.note{font-size:14px;margin:10px 24px 20px;color:#556274}.previews{display:flex;align-items:flex-start;padding:0 18px 20px;gap:4px}section{width:480px!important;max-width:none!important;border:none!important;box-shadow:none!important;padding:0!important;flex:0 0 480px}section h2{font-size:17px;text-align:center;margin:0 0 12px}section svg{width:480px!important;height:auto!important;display:block;background:white}section .diagram-labels text,section .thigh-labels text{font-size:12px}.comparison{width:1484px}</style><body><main class="comparison"><h1>'''+title+' · 표현 스타일 시안</h1><p class="note">기존 근육 구성·윤곽·시점 유지 — 명암·선·근섬유 표현만 변경</p><div class="previews">'+''.join(panels[name])+'</div></main></body></html>'
  (out/(name+'.html')).write_text(document)
  p.set_content(document);p.locator('.comparison').screenshot(path=str(out/(name+'.png')))
 b.close()
(Path(__file__).parent/'geometry-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
