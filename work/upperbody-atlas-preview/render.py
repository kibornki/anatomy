from pathlib import Path
from playwright.sync_api import sync_playwright
import json
w=Path(__file__).parent;root=w.parents[1];out=root/'drafts/upperbody-atlas-review';out.mkdir(exist_ok=True);art=Path('/workspace/artifacts/upperbody-atlas-preview');art.mkdir(exist_ok=True)
lib='\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>상체 실제 아틀라스 시안</title><style>*{box-sizing:border-box}body{margin:0;background:white;color:#253144;font:16px system-ui,sans-serif}.sheet{width:2640px;padding:24px 20px}h1{font-size:28px;margin:0 10px 10px}.note{font-size:16px;color:#64748a;margin:0 10px 20px}#panels{display:flex;gap:10px}section{width:860px}h2{text-align:center;font-size:23px;margin:8px 0 12px}svg{width:860px;display:block}svg text{font-size:14px;fill:#405064}footer{font-size:14px;color:#64748a;margin:15px 10px}</style><main class="sheet"><h1>상체 · 실제 뼈와 근육 표면 시안</h1><p class="note">팔 외전 60° · 대흉근·전거근·등 근육</p><div id="panels"></div><footer>BodyParts3D © 2008 DBCLS · CC BY-SA 2.1 Japan · STL conversion: Kevin Mattheus Moerman</footer></main>'''
page+='<script type="application/json" id="atlas">'+(w/'atlas-data.json').read_text()+'</script><script>'+lib+'\n'+(w/'render.js').read_text()+'</script></html>'
(art/'preview.html').write_text(page)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':2640,'height':900});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_content(page);p.wait_for_function('()=>window.ready===true');assert not errors,errors
 audit=p.evaluate('previewAudit');assert audit['pose']['cameraYaw']==[0,90,180];assert len(audit['selectedMuscles'])==11 and not audit['head'] and not audit['abdomenMuscles']
 for view in ['front','side','back']:p.locator('[data-view="'+view+'"]').screenshot(path=str(out/(view+'.png')))
 p.locator('.sheet').screenshot(path=str(out/'upperbody.png'));b.close()
(w/'validation.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print('Rendered actual atlas upper body in three unchanged camera directions.')
