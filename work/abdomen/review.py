"""Atlas and browser invariants; these do not certify physiological strain."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, numpy as np

repo=Path(__file__).resolve().parents[2]
out=Path('/workspace/artifacts/abdomen-atlas-review');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
atlas=json.loads((Path(__file__).parent/'atlas-data.json').read_text())
assert atlas['source']['uniformScale']==.58
assert atlas['source']['license']=='CC BY-SA 2.1 Japan'
original={p['name']:p for p in atlas['parts']}
for p in atlas['parts']:
    vertices=np.array(p['v']);faces=np.array(p['f'])
    assert np.isfinite(vertices).all() and faces.min()>=0 and faces.max()<len(vertices)
    assert p['audit']['boundsError']<1.5, (p['name'],p['audit']['boundsError'])
    if p.get('mirrored'):
        assert np.max(abs(vertices-np.array(original[p['name'][:-6]]['v'])*[-1,1,1]))<1e-8
    if 'bind' in p:
        assert np.all(np.array(p['bind'])[:,1::2].sum(1)<=1.00003)
        assert np.all(np.array(p['bind'])[:,1::2]>=0)
    if p['name'].startswith('rib-'):
        expected=np.diff(np.array(p['audit']['sourceBounds']),axis=0)[0]
        assert np.max(abs(np.ptp(vertices,axis=0)-expected))<1.8
for name in ['serratus','serratus-right']:
    landmarks=original[name]['landmarks']
    assert [l['rib'] for l in landmarks]==list(range(1,9))
    assert landmarks[7]['insertion'][1]<landmarks[7]['origin'][1]-30
    assert len(original[name]['fibers'])>=60

errors=[];metrics=[];neutral=None
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':900,'height':1100})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'abdomen.html');page.wait_for_timeout(100)
    assert page.locator('#abdomen-value').inner_text()=='0%'
    assert page.locator('canvas').count()==0
    assert page.evaluate('''()=>{
      function solve(reverse){const v=AbdominalVisibility({project:q=>q.slice(0,2),depth:q=>q[2],step:.5}),far=()=>v.quad([[0,0,1],[10,0,1],[10,10,1],[0,10,1]],0),bone=()=>v.quad([[3,0,4],[7,0,4],[7,10,4],[3,10,4]],1);if(reverse){bone();far();}else{far();bone();}return v.solve(2);}
      const a=solve(false),b=solve(true),at=(x,y)=>a.owners[Math.floor((y-a.y0)/a.step)*a.w+Math.floor((x-a.x0)/a.step)];return JSON.stringify([...a.owners])===JSON.stringify([...b.owners])&&at(2,5)===0&&at(5,5)===1;
    }''')
    poses=[('front',0),('side',0),('front',50),('front',100),('side',50),('side',100)]+[('twist',a) for a in [-60,-45,-30,-15,0,15,30,45,60]]
    for view,angle in poses:
        page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
        data=page.evaluate('''()=>{const m=abdomenDraft.model.flexion,d=m.debug;return {pose:d.pose,parts:d.posed,duration:d.duration,attachments:d.atlas.parts.filter(p=>p.name.startsWith('serratus')).map(p=>({name:p.name,landmarks:p.landmarks.map(l=>{
          function near(point){let index=0,min=Infinity;for(let i=0;i<p.v.length;i++){const distance=Math.hypot(...p.v[i].map((v,j)=>v-point[j]));if(distance<min){min=distance;index=i;}}return m.skin(p.v[index],p.bind[index]);}
          return {rib:l.rib,origin:near(l.origin),insertion:near(l.insertion)};
        })}))};}''')
        actual={p['name']:p for p in data['parts']}
        if neutral is None:neutral=actual
        for p in data['parts']:
            v=np.array(p['vertices']);assert np.isfinite(v).all(),(view,angle,p['name'])
            if p.get('joint')=='pelvis':assert np.max(abs(v-np.array(original[p['name']]['v'])))<1e-8
            if p['kind'] in ['bone','rib']:
                rest=np.array(original[p['name']]['v']);ids=np.linspace(0,len(rest)-1,30,dtype=int)
                assert np.max(abs(np.linalg.norm(v[ids]-v[0],axis=1)-np.linalg.norm(rest[ids]-rest[0],axis=1)))<1e-8
            if angle==0:assert np.max(abs(v-np.array(neutral[p['name']]['vertices'])))<1e-8,(view,p['name'])
        assert page.locator('.diagram-labels text').count()==5
        assert page.evaluate('''()=>[...document.querySelectorAll('[data-label]')].every(g=>{const line=g.querySelector('path'),point=line.getPointAtLength(line.getTotalLength());return [...document.querySelectorAll('[data-muscle="'+g.dataset.label+'"] .muscle')].some(p=>p.isPointInFill(point));})'''),(view,angle,'label must land on its muscle')
        assert not page.locator('[data-atlas-part="humerus"]').count()
        metrics.append({'pose':data['pose'],'duration':data['duration']})
        (out/f'geometry-{view}-{angle}.json').write_text(json.dumps(data))
        if (view,angle) in [('front',0),('side',0),('side',100),('twist',-60),('twist',60)]:page.screenshot(path=str(out/f'{view}-{angle}.png'))
    page.evaluate('abdomenDraft.setPose(90,"twist")');assert page.locator('#abdomen-value').inner_text()=='60°'
    page.evaluate('abdomenDraft.setPose(-90,"twist")');assert page.locator('#abdomen-value').inner_text()=='-60°'
    page.locator('#abdomen-transparent').check();page.screenshot(path=str(out/'transparent.png'))
    assert page.locator('#abdomen').evaluate('n=>n.classList.contains("transparent")')
    assert page.locator('[data-atlas-part="hip"]').evaluate('n=>getComputedStyle(n).opacity')=='1'
    assert page.locator('[data-atlas-part="serratus"]').evaluate('n=>getComputedStyle(n).opacity')=='0.32'
    page.locator('#abdomen-transparent').uncheck()
    page.locator('#abdomen-fibers').uncheck();assert page.locator('[data-atlas-part="serratus"] .fibers').evaluate('n=>getComputedStyle(n).display')=='none'
    page.locator('#abdomen-fibers').check()
    page.locator('#abdomen-side').click();page.locator('#abdomen-angle').fill('65');assert page.locator('#abdomen-value').inner_text()=='65%'
    page.locator('#abdomen-play').click();before=page.locator('#abdomen-angle').input_value();page.wait_for_timeout(1100);assert page.locator('#abdomen-angle').input_value()!=before
    page.locator('#abdomen-play').click();assert page.locator('#abdomen-play').inner_text()=='재생'
    for width,height in [(390,844),(320,568)]:
        page.set_viewport_size({'width':width,'height':height});page.evaluate('abdomenDraft.setPose(60,"twist")');page.wait_for_timeout(100)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert all(page.locator('#abdomen-'+v).is_visible() for v in ['front','side','twist'])
        page.screenshot(path=str(out/f'mobile-{width}.png'),full_page=True)
    text=(repo/'index.html').read_text();data=json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>',text,re.S)[1])
    assert 'abdomen-atlas-v4' in data['abdomen']['document'] and data['abdomen']['views']==['front','side','twist']
    page.goto(base);page.wait_for_timeout(100)
    page.locator('#tab-abdomen').click()
    page.wait_for_timeout(200)
    page.frame_locator('#anatomy-frame').locator('#abdomen-value').wait_for()
    frame=page.locator('#anatomy-frame').element_handle().content_frame()
    assert frame is not None,'Hub must instantiate its abdomen document'
    frame.evaluate('abdomenDraft.setPose(45,"twist")');assert frame.locator('#abdomen-value').inner_text()=='45°'
    page.wait_for_timeout(150);page.locator('#tab-arm').click();page.frame_locator('#anatomy-frame').locator('#arm').wait_for();page.locator('#tab-abdomen').click()
    page.frame_locator('#anatomy-frame').locator('#abdomen-value').wait_for()
    frame=page.locator('#anatomy-frame').element_handle().content_frame()
    assert frame.locator('#abdomen-value').inner_text()=='45°'
    page.screenshot(path=str(out/'hub-mobile.png'),full_page=True)
    assert not errors,errors
    browser.close()
(out/'browser-review.json').write_text(json.dumps({'poses':metrics,'errors':errors,'limitations':'Implementation invariants, not physiological deformation validation.'},indent=2))
print('Atlas invariants, 15 poses, depth order, opacity, controls, mobile and hub passed.')
