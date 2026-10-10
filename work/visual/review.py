"""Actual browser matrix for all five regions, with unchanged geometry."""
from pathlib import Path
from itertools import product
import json, os, sys
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
out=Path('artifacts/visual');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
regions={
 'upperbody':dict(api='nativeUpperbody',root='#upperbody',views=['front','back','side'],angles=[15,45,90,120]),
 'arm':dict(api='armAtlas',root='#arm',views=['front','back','side'],angles=[0,45,90,135]),
 'abdomen':dict(api='abdomenDraft',root='#abdomen',views=['front','side','twist'],angles=[0,33,66,100]),
 'forearm':dict(api='nativeLimb',root='#forearm-motion',views=['front','back','side'],angles=[-80,-40,0,80]),
 'thigh':dict(api='nativeLimb',root='#thigh-motion',views=['front','back','side','medial'],angles=[0,45,90,120])}
quick='--quick' in sys.argv;errors=[];metrics=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':900,'height':1100},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 for stage in (['before'] if quick else ['before','after']):
  for region,cfg in regions.items():
   path=f'artifacts/visual/baseline/{region}.html' if stage=='before' else region+'.html'
   page.goto(base+path);page.wait_for_function('!!window.'+cfg['api'])
   page.evaluate('localStorage.clear()');page.reload();page.wait_for_function('!!window.'+cfg['api'])
   for fibers,transparent,view in product(([True] if quick else [True,False]),([False] if quick else [False,True]),cfg['views']):
    angles=([-60,0,30,60] if view=='twist' else cfg['angles'])
    if quick:angles=angles[:1]
    for angle in angles:
     page.locator('#'+region+'-fibers').set_checked(fibers);page.locator('#'+region+'-transparent').set_checked(transparent)
     page.evaluate('([api,a,v])=>window[api].setPose(a,v)',[cfg['api'],angle,view]);page.wait_for_timeout(80)
     name=f'{stage}-{region}-{view}-{angle}-f{int(fibers)}-t{int(transparent)}'
     page.locator(cfg['root']+' svg').first.screenshot(path=str(out/(name+'.png')))
     data=page.evaluate('''([api,region])=>{const m=window[api].model,d=region==='abdomen'?m.flexion.debug:m.debug;return {duration:d.duration,coverage:region==='abdomen'?d.visible.coverage:d.coverage};}''',[cfg['api'],region])
     metrics.append(dict(stage=stage,region=region,view=view,angle=angle,fibers=fibers,transparent=transparent,**data))
   print('Captured',stage,region,flush=True)
 browser.close()
assert not errors,errors
if not quick:
 for region,cfg in regions.items():
  for stage,fibers,transparent in product(['before','after'],[True,False],[False,True]):
   sheet=Image.new('RGB',(1280,len(cfg['views'])*285),'white');draw=ImageDraw.Draw(sheet)
   for row,view in enumerate(cfg['views']):
    angles=[-60,0,30,60] if view=='twist' else cfg['angles']
    for col,angle in enumerate(angles):
     img=Image.open(out/f'{stage}-{region}-{view}-{angle}-f{int(fibers)}-t{int(transparent)}.png').convert('RGB')
     img.thumbnail((320,255));sheet.paste(img,(320*col+(320-img.width)//2,285*row+25))
     draw.text((320*col+8,285*row+5),f'{stage} / {view} / {angle} / f{int(fibers)} t{int(transparent)}',fill='#202b3b')
   sheet.save(out/f'{stage}-{region}-f{int(fibers)}-t{int(transparent)}.jpg',quality=90)
 old=[m for m in metrics if m['stage']=='before'];new=[m for m in metrics if m['stage']=='after']
 assert len(old)==len(new)==256
 for a,b in zip(old,new):assert a['coverage']==b['coverage'],('Visibility changed',a,b)
(out/'matrix.json').write_text(json.dumps(dict(cases=metrics,pageErrors=errors),indent=2))
print('Passed: actual browser renders, no page errors and identical region visibility footprints.')
