"""Native browser checks and screenshots for the separate draft."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

out=Path('/workspace/artifacts/abdomen-v2')
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1000,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8766/abdomen-v2-draft.html')
    for view in ['front','side']:
        for angle in [-10,0,15,35,45]:
            page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
            assert page.locator('#abdomen').get_attribute('data-view')==view
            assert page.locator('#abdomen').get_attribute('data-camera-yaw')==('16' if view=='front' else '90')
            assert page.evaluate('''()=>Array.from(document.querySelectorAll('[data-view="'+abdomenDraft.root.dataset.view+'"] path')).every(p=>!/NaN|Infinity/.test(p.getAttribute('d')))''')
            hits=page.evaluate('''()=>Array.from(document.querySelectorAll('.diagram-labels g')).map(g=>{
              const line=g.querySelector('path'),p=line.getPointAtLength(line.getTotalLength()),q=p.matrixTransform(line.getScreenCTM()),hit=document.elementFromPoint(q.x,q.y);
              return {label:g.dataset.label,hit:hit?.closest('[data-muscle]')?.dataset.muscle};
            })''')
            expected=['serratus','external-oblique','internal-oblique','rectus']
            assert [h.get('hit') for h in hits]==expected,(view,angle,hits)
            if angle in [0,35]:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}.png'))
    # Check actual 3D deformation: thoracic points move rigidly, pelvis fixed.
    metrics=page.evaluate('''()=>{
      const m=abdomenDraft.model,points=[[0,200,-20],[60,260,30],[-50,310,10]],distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),results=[];
      for(const a of [-10,0,15,35,45]){const f=m.frame(a),rigid=Math.abs(distance(points[0],points[1])-distance(f.deform(points[0]),f.deform(points[1]))),pelvis=f.deform([45,460,15]);
        let boneError=0,count=0;
        for(const plate of Object.values(m.plates))for(const path of plate.paths.filter(p=>p.rigid)){
          const q=path.points.filter(p=>p.xyz);if(q.length<2)continue;count++;const start=q[0].xyz,end=q[Math.floor(q.length/2)].xyz;
          boneError=Math.max(boneError,Math.abs(distance(start,end)-distance(f.rigid(start),f.rigid(end))));
        }results.push({a,rigid,pelvis,boneError,count});}
      return results;
    }''')
    assert max(m['rigid'] for m in metrics)<0.01,metrics
    assert min(m['count'] for m in metrics)>50,metrics
    assert max(m['boneError'] for m in metrics)<0.01,metrics
    assert all(m['pelvis']==[45,460,15] for m in metrics),metrics
    page.evaluate("abdomenDraft.setPose(0,'side')")
    page.locator('#abdomen-play').click()
    page.wait_for_timeout(400)
    assert float(page.locator('#abdomen').get_attribute('data-angle'))!=0
    page.locator('#abdomen-play').click()
    stopped=page.locator('#abdomen').get_attribute('data-angle')
    page.wait_for_timeout(120)
    assert stopped==page.locator('#abdomen').get_attribute('data-angle')
    page.locator('#abdomen-fibers').uncheck()
    assert page.locator('#abdomen').evaluate("r=>r.classList.contains('no-fibers')")
    page.locator('#abdomen-fibers').check()
    for width in [320,390,680]:
        page.set_viewport_size({'width':width,'height':844})
        for view in ['front','side']:
            page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[0,view])
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if width==390:page.locator('#abdomen').screenshot(path=str(out/f'{view}-mobile.png'))
    page.set_viewport_size({'width':1000,'height':1000})
    page.evaluate("abdomenDraft.setPose(0,'side')")
    page.locator('#abdomen-transparent').check()
    page.locator('#abdomen').screenshot(path=str(out/'side-bones.png'))
    assert not errors,errors
    browser.close()
    (out/'verification.json').write_text(json.dumps({'errors':errors,'rigid_thorax_and_fixed_pelvis':metrics,'poses':10,'mobile_widths':[320,390,680],'labels':'all four end on visible target layers','playback':'passed'},indent=2))
print('PASS: 10 poses, four visible label targets, rigid thorax, fixed pelvis, playback and mobile layout.')
