"""Verify depth rendering, coherent geometry and production controls/state."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, subprocess

root=Path(__file__).resolve().parents[2]
out=Path('/workspace/artifacts/abdomen-twist-implemented');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
errors=[];metrics=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1100,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'abdomen.html');page.wait_for_timeout(100)
    pelvis=[]
    for angle in range(-140,141,20):
        page.evaluate('a=>abdomenDraft.setPose(a,"twist")',angle)
        result=page.evaluate('''()=>{
          const m=abdomenDraft.model.twisting,f=m.rig(+abdomenDraft.root.dataset.angle),gl=m.depthRenderer.gl;
          let maxBoneError=0;
          for(const part of m.meshes.filter(m=>m.bone)){const a=part.points[0],b=part.points.at(-1),aa=f.at(a,part.level),bb=f.at(b,part.level),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));maxBoneError=Math.max(maxBoneError,Math.abs(distance(a,b)-distance(aa,bb)));}
          const targets=[...document.querySelectorAll('.twist-labels [data-label]')].filter(g=>g.style.display!=='none').map(g=>{const l=g.querySelector('path'),p=l.getPointAtLength(l.getTotalLength());return {label:g.dataset.label,hit:m.depthRenderer.pickAt(p.x,p.y)};});
          let colored=0,purple=0;for(let y=60;y<390;y+=2)for(let x=120;x<540;x+=2){const id=m.depthRenderer.pickAt(x,y);if(id)colored++;if(id===5)purple++;}
          return {angle:+abdomenDraft.root.dataset.angle,maxBoneError,targets,error:gl.getError(),colored,purple,base:f.at([45,475,15]),theta:[455,420,380,330,285].map(y=>f.theta(y)*180/Math.PI)};
        }''')
        assert result['error']==0,result
        assert result['colored']>500,result
        assert result['maxBoneError']<1e-8,result
        assert result['base']==[45,475,15]
        expected={'serratus':1,'external-oblique':2,'internal-oblique':3,'rectus':4,'latissimus':5}
        assert all(t['hit']==expected[t['label']] for t in result['targets']),result
        assert page.locator('#abdomen').get_attribute('data-camera-yaw')=='16'
        pelvis.append(page.locator('[data-part="twist-pelvis"]').evaluate('n=>({html:n.innerHTML,matrix:[n.getScreenCTM().a,n.getScreenCTM().d,n.getScreenCTM().e,n.getScreenCTM().f]})'))
        metrics.append(result)
    assert all(p==pelvis[0] for p in pelvis)
    assert max(m['purple'] for m in metrics if abs(m['angle'])>=120)>2*next(m['purple'] for m in metrics if m['angle']==0)
    # Latissimus fan patches must form exactly two connected surfaces; this
    # detects detached fragments or insertion triangles in the rejected draft.
    assert page.evaluate('''()=>{const faces=abdomenDraft.model.twisting.meshes.filter(m=>m.muscle==='latissimus'),parents=faces.map((_,i)=>i),owner=new Map(),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);for(let i=0;i<faces.length;i++)for(const p of faces[i].points){const key=p.map(v=>v.toFixed(6)).join(',');if(owner.has(key))parents[find(i)]=find(owner.get(key));else owner.set(key,i);}return new Set(parents.map((_,i)=>find(i))).size===2;}''')
    for view in ['front','side']:
        for angle in [0,50,100]:
            page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
            assert page.locator('.twist-canvas').evaluate('n=>n.style.display')=='none'
            assert page.evaluate('''()=>[...document.querySelectorAll('.diagram-volumes path')].every(p=>!/NaN|Infinity/.test(p.getAttribute('d')))''')
            if angle in [0,100]:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}.png'))
    for angle in [-135,0,135]:
        page.evaluate('a=>abdomenDraft.setPose(a,"twist")',angle)
        page.locator('#abdomen').screenshot(path=str(out/f'twist-{angle}.png'))
    page.locator('#abdomen-transparent').check();page.locator('#abdomen').screenshot(path=str(out/'twist-transparent.png'))
    page.locator('#abdomen-fibers').uncheck()
    assert page.locator('#abdomen').evaluate("r=>r.classList.contains('no-fibers')")
    page.locator('#abdomen-transparent').uncheck();page.locator('#abdomen-fibers').check()
    page.evaluate('abdomenDraft.setPose(70,"twist")');page.locator('#abdomen-play').click();page.wait_for_timeout(250)
    assert float(page.locator('#abdomen').get_attribute('data-angle'))!=70
    page.locator('#abdomen-play').click();stopped=page.locator('#abdomen').get_attribute('data-angle');page.wait_for_timeout(100)
    assert stopped==page.locator('#abdomen').get_attribute('data-angle')
    # Production sandbox, legacy migration and independent view values.
    page.goto(base)
    page.evaluate("localStorage.setItem('anatomy-hub-v1',JSON.stringify({active:'abdomen',states:{abdomen:{modelContent:{revision:'abdomen-spine-curl-v1',angle:63,camera:'front',fibers:false,transparent:true},privateContent:{playing:false}}}}))")
    page.reload();f=page.frame_locator('#anatomy-frame');f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text()=='63%'
    assert not f.locator('#abdomen-fibers').is_checked()
    assert f.locator('#abdomen-transparent').is_checked()
    f.locator('#abdomen-twist').click();assert f.locator('#abdomen-value').inner_text()=='135°'
    f.locator('#abdomen-angle').fill('-110');f.locator('#abdomen-fibers').check();f.locator('#abdomen-transparent').uncheck()
    page.wait_for_timeout(100);page.locator('#tab-arm').click();page.locator('#tab-abdomen').click();f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text()=='-110°'
    f.locator('#abdomen-side').click();assert f.locator('#abdomen-value').inner_text()=='63%'
    f.locator('#abdomen-twist').click();page.reload();f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text()=='-110°'
    f.locator('#abdomen-angle').fill('135');page.wait_for_timeout(100);page.screenshot(path=str(out/'hub-desktop.png'))
    for width in [320,390,680]:
        page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(150)
        assert f.locator('#abdomen').evaluate('n=>document.documentElement.scrollWidth<=innerWidth')
        for view in ['front','side','twist']:
            f.locator('#abdomen-'+view).click()
        f.locator('#abdomen-angle').fill('135')
        f.locator('.diagram-note').scroll_into_view_if_needed()
        assert f.locator('.diagram-note').evaluate('n=>n.getBoundingClientRect().bottom<=innerHeight+1')
        if width==390:page.screenshot(path=str(out/'hub-mobile.png'))
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base);m.locator('#tab-abdomen').tap();mf=m.frame_locator('#anatomy-frame');mf.locator('#abdomen').wait_for();mf.locator('#abdomen-twist').tap();mf.locator('#abdomen-play').tap();m.wait_for_timeout(200);mf.locator('#abdomen-play').tap()
    assert mf.locator('#abdomen').get_attribute('data-motion')=='yaw'
    assert mf.locator('#abdomen').evaluate('n=>document.documentElement.scrollWidth<=innerWidth')
    m.screenshot(path=str(out/'hub-touch-mobile.png'))
    assert not errors,errors
    browser.close()
def data(html):return json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>',html,re.S)[1])
old=data(subprocess.check_output(['git','show','HEAD:index.html'],cwd=root,text=True));new=data((root/'index.html').read_text())
assert all(old[k]==new[k] for k in old if k!='abdomen')
for name in ['upperbody.html','arm.html','forearm.html','thigh.html']:
    assert (root/name).read_bytes()==subprocess.check_output(['git','show','HEAD:'+name],cwd=root)
(out/'verification.json').write_text(json.dumps({'twist_poses':metrics,'flexion_poses':6,'latissimus_connected_sheets':2,'sandbox_and_state_migration':'passed','mobile_and_touch':'passed','other_topics_unchanged':True,'errors':errors},indent=2))
print('PASS: depth rendering, 15 twist / 6 flexion poses, fixed pelvis/camera, rigid bones, connected latissimus fans, visible label picking, sandbox/state/mobile/touch; other topics unchanged.')
