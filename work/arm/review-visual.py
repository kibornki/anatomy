"""Matched Chromium renders; subjective review remains required."""
from pathlib import Path
import json, os
from itertools import product
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
out=Path('artifacts/arm-visual');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
errors=[];metrics=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':900,'height':1100},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 for stage,file in [('before','baseline-arm.html'),('after','arm.html')]:
  page.goto(base+file);page.wait_for_function('!!window.armAtlas')
  page.evaluate('localStorage.clear()');page.reload();page.wait_for_function('!!window.armAtlas')
  for fibers,transparent,view,angle in product([True,False],[False,True],['front','back','side'],[0,45,90,135]):
   page.locator('#arm-fibers').set_checked(fibers);page.locator('#arm-transparent').set_checked(transparent)
   page.evaluate('([a,v])=>armAtlas.setPose(a,v)',[angle,view])
   page.wait_for_timeout(60)
   name=f'{stage}-{view}-{angle}-f{int(fibers)}-t{int(transparent)}'
   page.locator('#arm svg.diagram-scene').screenshot(path=str(out/(name+'.png')))
   metrics.append(dict(stage=stage,view=view,angle=angle,fibers=fibers,transparent=transparent,
    duration=page.evaluate('armAtlas.model.debug.duration'),
    coverage=page.evaluate('armAtlas.model.debug.coverage')))
 browser.close()
assert not errors,errors
for stage,fibers,transparent in product(['before','after'],[True,False],[False,True]):
 sheet=Image.new('RGB',(1280,720),'white');draw=ImageDraw.Draw(sheet)
 for row,view in enumerate(['front','back','side']):
  for col,angle in enumerate([0,45,90,135]):
   img=Image.open(out/f'{stage}-{view}-{angle}-f{int(fibers)}-t{int(transparent)}.png').convert('RGB')
   img.thumbnail((320,215));sheet.paste(img,(320*col,240*row+25))
   draw.text((320*col+8,240*row+5),f'{stage} / {view} / {angle} / fibers {fibers} / transparent {transparent}',fill='#202b3b')
 sheet.save(out/f'{stage}-f{int(fibers)}-t{int(transparent)}.jpg',quality=90)
(out/'matrix.json').write_text(json.dumps(dict(cases=metrics,pageErrors=errors),indent=2))
print('Captured 48 before and 48 after matched SVG browser screenshots.')
