from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,json,re
repo=Path(__file__).resolve().parents[2];s=(repo/'thigh.html').read_text();previous=subprocess.check_output(['git','show','HEAD:thigh.html'],cwd=repo,text=True)
model=lambda t:t[t.index('const ThighModel ='):t.index('const ThighRenderer =')]
assert model(s)==model(previous),'Thigh anatomy and mechanics changed'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':900,'height':1000},reduced_motion='reduce');errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('http://127.0.0.1:8767/thigh.html');p.wait_for_function('document.querySelector("#thigh-motion").dataset.geometryVerification')
 v=p.evaluate('ThighModel.verify()');assert all(v[k] for k in ['finite','femurFixed','kneeFixed','lowerLegRigid'])
 for transparent in [False,True]:
  p.locator('#thigh-transparent').set_checked(transparent)
  for view in ['front','side','back']:
   p.locator('#thigh-'+view).click()
   for angle in [0,60,120]:
    p.locator('#thigh-angle').fill(str(angle));p.locator('#thigh-angle').dispatch_event('input')
    assert p.locator('#thigh-motion').get_attribute('data-camera-yaw')==('90' if view=='side' else '32')
    data=p.evaluate('''([a,v,t])=>{const m=ThighModel.frame(a,0),items=ThighRenderer.render(m,v,t);return {ids:items.map(i=>i.id),bones:items.filter(i=>['tibia','fibula'].includes(i.id)).map(i=>({id:i.id,rows:i.rows.length}))};}''',[angle,view,transparent])
    assert not any(n=='foot' or n.startswith('toe') or n in ['achilles-tendon','tibialis-anterior'] for n in data['ids'])
    assert all(n['rows']<=4 for n in data['bones']),data
    if angle in [0,120] and not transparent:p.locator('#thigh-motion').screenshot(path='/workspace/artifacts/style-only-preview/thigh-'+view+'-'+str(angle)+'.png')
 p.locator('#thigh-transparent').uncheck()
 for width,height in [(390,844),(320,568)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for view in ['front','side','back']:assert p.locator('#thigh-'+view).is_visible()
  p.locator('#thigh-motion').screenshot(path='/workspace/artifacts/style-only-preview/thigh-mobile-'+str(width)+'.png')
 p.goto('http://127.0.0.1:8767/');p.locator('#tab-thigh').click();p.frame_locator('#anatomy-frame').locator('#thigh-motion').wait_for();frame=p.locator('#anatomy-frame').element_handle().content_frame();assert frame.locator('#thigh-motion').get_attribute('data-revision')=='knee-context-thigh-v6';frame.locator('#thigh-side').click();frame.locator('#thigh-angle').fill('57');frame.locator('#thigh-angle').dispatch_event('input');frame.locator('#thigh-angle').dispatch_event('change');p.wait_for_timeout(150)
 p.locator('#tab-arm').click();p.frame_locator('#anatomy-frame').locator('#arm').wait_for();p.locator('#tab-thigh').click();p.frame_locator('#anatomy-frame').locator('#thigh-motion').wait_for();frame=p.locator('#anatomy-frame').element_handle().content_frame();assert frame.locator('#thigh-angle').input_value()=='57';assert frame.locator('#thigh-side').get_attribute('aria-pressed')=='true'
 assert not errors,errors;b.close()
print('Thigh source anatomy/mechanics unchanged; 18 cropped views, cameras, mobile widths and hub restoration passed.')
