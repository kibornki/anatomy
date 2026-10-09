from pathlib import Path
from playwright.sync_api import sync_playwright
import json
w=Path(__file__).parent;root=w.parents[1];out=root/'drafts/limb-atlas-review';art=Path('/workspace/artifacts/limb-atlas-preview');out.mkdir(exist_ok=True)
lib='\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>전완·허벅지 실제 아틀라스 시안</title><style>*{box-sizing:border-box}body{margin:0;background:white;color:#253144;font:16px system-ui,sans-serif}main{width:1880px;padding:24px 20px}.row{margin-bottom:28px}h1{font-size:26px;margin:0 10px 8px}p{font-size:16px;color:#64748a;margin:0 10px 12px}.panels{display:flex;gap:10px}section{width:600px}h2{text-align:center;font-size:23px;margin:8px 0 12px}svg{width:600px;display:block}svg text{font-size:15px;fill:#405064}.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;font-size:13px;margin:8px 14px}.legend i{width:9px;height:9px;display:inline-block;border-radius:50%;margin-right:5px}footer{font-size:14px;color:#64748a;margin:15px 10px}</style><main></main><footer>BodyParts3D © 2008 DBCLS · CC BY-SA 2.1 Japan · STL conversion: Kevin Mattheus Moerman</footer>'''
page+='<script type="application/json" id="atlas">'+(w/'atlas-data.json').read_text()+'</script><script>'+lib+'\n'+(w/'render.js').read_text()+'</script></html>'
(art/'preview.html').write_text(page)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':1880,'height':1800});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_content(page);p.wait_for_function('()=>window.ready===true');assert not errors,errors
 audit=p.evaluate('previewAudit');assert len(audit['views'])==6
 for region in ['forearm','thigh']:
  row=p.locator('[data-region="'+region+'"]')
  for view in ['front','side','back']:row.locator('[data-view="'+view+'"]').screenshot(path=str(out/(region+'-'+view+'.png')))
  row.screenshot(path=str(out/(region+'.png')))
 b.close()
(w/'validation.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print('Rendered six native atlas views.')
