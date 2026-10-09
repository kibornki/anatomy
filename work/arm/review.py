"""Browser and skeletal invariants, not physiological validation."""
from pathlib import Path
import json,re,subprocess,os
import numpy as np
from playwright.sync_api import sync_playwright
w=Path(__file__).parent;repo=w.parents[1];out=Path('/workspace/artifacts/arm-implementation');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
atlas=json.loads((w/'atlas-data.json').read_text());parts={p['name']:p for p in atlas['parts']}
for p in atlas['parts']:
 v=np.array(p['v']);f=np.array(p['f']);assert np.isfinite(v).all() and f.min()>=0 and f.max()<len(v)
assert parts['biceps-long']['attachment']==parts['biceps-short']['attachment']
assert [parts[n]['color'] for n in ['biceps-long','biceps-short']]==['red','blue']
assert [parts[n]['color'] for n in ['triceps-long','triceps-lateral','triceps-medial']]==['red','blue','green']
assert len(parts['triceps-aponeurosis']['f'])>1000
# The build replaces the arm payload only.
current=(repo/'index.html').read_text();previous=subprocess.check_output(['git','show','HEAD:index.html'],cwd=repo,text=True)
parse=lambda t:json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>',t,re.S)[1])
a,b=parse(previous),parse(current)
for key in a:
 if key!='arm':assert a[key]==b[key],key
assert b['arm']['document'].replace('<body><script type="application/json" id="hub-config">__HUB_CONFIG__</script>','<body>',1)==(repo/'arm.html').read_text()
errors=[];metrics=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':900,'height':1100},device_scale_factor=1.5);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'arm.html');page.wait_for_function('!!window.armAtlas')
 assert page.locator('#arm-play').inner_text()=='재생'
 for transparent in [False,True]:
  page.locator('#arm-transparent').set_checked(transparent)
  for view in ['front','back','side']:
   for angle in [0,45,90,135]:
    page.evaluate('([a,v])=>armAtlas.setPose(a,v)',[angle,view]);data=page.evaluate('armAtlas.model.debug');assert data['angle']==angle and data['view']==view
    for p in data['posed']:
     v=np.array(p['v']);rest=np.array(parts[p['name']]['v']);assert np.isfinite(v).all()
     if p['kind']=='bone':
      ids=np.linspace(0,len(v)-1,25,dtype=int);assert np.max(abs(np.linalg.norm(v[ids]-v[0],axis=1)-np.linalg.norm(rest[ids]-rest[0],axis=1)))<1e-8
      if not p['forearm']:assert np.max(abs(v-rest))<1e-8
     if angle==0:assert np.max(abs(v-rest))<1e-8
    assert page.evaluate('''()=>[...document.querySelectorAll('[data-label]')].filter(g=>g.style.display!=='none').every(g=>{const line=g.querySelector('path'),pt=line.getPointAtLength(line.getTotalLength()),fill=document.querySelector('[data-atlas-part="'+g.dataset.label+'"] .atlas-fill');return fill.isPointInFill(pt);})'''),(transparent,view,angle,'label')
    assert page.locator('[data-atlas-part="humerus"]').evaluate('n=>getComputedStyle(n).opacity')=='1'
    assert page.locator('[data-atlas-part="triceps-long"]').evaluate('n=>getComputedStyle(n).opacity')==('0.32' if transparent else '1')
    assert page.locator('[data-atlas-part="triceps-long"] .atlas-fill').evaluate('n=>getComputedStyle(n).fillOpacity')=='1'
    assert page.evaluate('''()=>[...document.querySelectorAll('[data-kind="bone"] .atlas-fill')].every(p=>{const b=p.getBBox();return b.x>=0&&b.y>=0&&b.x+b.width<=640&&b.y+b.height<=640;})'''),(view,angle,'clip')
    metrics.append({'view':view,'angle':angle,'transparent':transparent,'duration':data['duration']})
    if not transparent and angle in [0,90,135]:page.screenshot(path=str(out/f'{view}-{angle}.png'))
 page.locator('#arm-transparent').uncheck();page.evaluate('armAtlas.setPose(0,"back")')
 for name in ['triceps-long','triceps-lateral']:
  count=page.locator(f'[data-atlas-part="{name}"] .fiber').get_attribute('d').count('M');assert count>=10,(name,count)
 page.locator('#arm-fibers').uncheck();assert page.locator('[data-atlas-part="triceps-long"] .fiber').evaluate('n=>getComputedStyle(n).display')=='none';page.locator('#arm-fibers').check()
 page.locator('#arm-side').click();page.locator('#arm-angle').fill('73');assert page.locator('#arm-value').inner_text()=='73°';page.reload();page.wait_for_function('!!window.armAtlas');assert page.locator('#arm-value').inner_text()=='73°' and page.locator('#arm-side').get_attribute('aria-pressed')=='true'
 page.locator('#arm-play').click();before=page.locator('#arm-angle').input_value();page.wait_for_timeout(700);assert page.locator('#arm-angle').input_value()!=before;page.locator('#arm-play').click()
 for width,height in [(390,844),(320,568)]:
  page.set_viewport_size({'width':width,'height':height});page.evaluate('armAtlas.setPose(0,"back")');page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for v in ['front','side','back']:assert page.locator('#arm-'+v).is_visible()
  page.screenshot(path=str(out/f'mobile-{width}.png'),full_page=True)
 page.goto(base);page.locator('#tab-arm').click();page.frame_locator('#anatomy-frame').locator('#arm-value').wait_for();frame=page.locator('#anatomy-frame').element_handle().content_frame();frame.evaluate('armAtlas.setPose(68,"back")');frame.locator('#arm-transparent').check();page.wait_for_timeout(150)
 page.locator('#tab-abdomen').click();page.frame_locator('#anatomy-frame').locator('#abdomen').wait_for();page.locator('#tab-arm').click();page.frame_locator('#anatomy-frame').locator('#arm-value').wait_for();frame=page.locator('#anatomy-frame').element_handle().content_frame()
 assert frame.locator('#arm-value').inner_text()=='68°';assert frame.locator('#arm-back').get_attribute('aria-pressed')=='true';assert frame.locator('#arm-transparent').is_checked()
 frame.locator('#arm-transparent').uncheck();frame.evaluate('armAtlas.setPose(0,"back")');page.screenshot(path=str(out/'hub-mobile.png'),full_page=True)
 assert not errors,errors;browser.close()
(w/'validation.json').write_text(json.dumps({'poses':metrics,'pageErrors':errors,'checks':['rigid bones','fixed shoulder','neutral atlas shape','visible label targets','head colors','opacity','view bounds','fascicle visibility','animation','state migration','mobile','hub arm only'],'limitations':'UI/geometry invariants, not anatomical or physiological certification.'},indent=2))
print('Passed: 24 poses, rigid bones, labels, fibers, opacity, controls, persistence, mobile, hub isolation and restoration.')
