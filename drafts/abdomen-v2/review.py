"""Native browser checks and screenshots for the separate draft."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

out=Path('/workspace/artifacts/abdomen-c-curl')
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1000,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8766/abdomen-v2-draft.html')
    for view in ['front','side']:
        for angle in [0,25,50,75,100]:
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
            bounds=page.evaluate('''()=>{const g=document.querySelector('g[data-view="'+abdomenDraft.root.dataset.view+'"]'),b=g.getBBox(),m=g.getCTM(),s=document.querySelector('svg').getCTM().inverse(),p=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m).matrixTransform(s));return p.map(p=>[p.x,p.y]);}''')
            assert bounds[0][0]>=0 and bounds[1][0]<=640 and bounds[0][1]>=0 and bounds[1][1]<=610,bounds
            if angle in [0,50,100]:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}.png'))
    # Rib cage, pelvis, each vertebra and thighs remain rigid. Both ends curl.
    metrics=page.evaluate('''()=>{
      const m=abdomenDraft.model,points=[[0,200,-20],[60,260,30],[-50,310,10]],distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),results=[];
      for(const a of [0,25,50,75,100]){const f=m.frame(a),rigid=Math.abs(distance(points[0],points[1])-distance(f.deform(points[0]),f.deform(points[1]))),pelvis=f.pelvis([45,460,15]);
        let boneError=0,count=0;
        for(const [view,plate] of Object.entries(m.plates))for(const path of plate.paths.filter(p=>p.rigid||p.pelvis||p.vertebra||p.leg)){
          const q=path.points.filter(p=>p.xyz);if(q.length<2)continue;count++;const start=q[0].xyz,end=q[Math.floor(q.length/2)].xyz;
          const transform=q=>path.leg?f.thigh(q,view,path.leg):path.pelvis?f.pelvis(q):path.rigid?f.rigid(q):f.segment(q,path.vertebra);
          boneError=Math.max(boneError,Math.abs(distance(start,end)-distance(transform(start),transform(end))));
        }
        const hip=[0,475,20],hipError=distance(f.thigh(hip,'side','side'),f.pelvis(hip)),knee=f.thigh([0,655,20],'side','side');
        results.push({a,rigid,pelvis,boneError,count,hipError,knee});}
      return results;
    }''')
    assert max(m['rigid'] for m in metrics)<0.01,metrics
    assert min(m['count'] for m in metrics)>50,metrics
    assert max(m['boneError'] for m in metrics)<0.01,metrics
    assert metrics[0]['pelvis']==[45,460,15],metrics
    assert metrics[-1]['pelvis']!=metrics[0]['pelvis'],metrics
    assert max(m['hipError'] for m in metrics)<0.01,metrics
    assert metrics[-1]['knee'][1]<metrics[0]['knee'][1]-150,metrics
    assert metrics[-1]['knee'][2]>metrics[0]['knee'][2]+150,metrics
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
            for angle in [0,100]:
                page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                if width==390:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}-mobile.png'))
    page.set_viewport_size({'width':1000,'height':1000})
    page.evaluate("abdomenDraft.setPose(100,'side')")
    page.locator('#abdomen-transparent').check()
    page.locator('#abdomen').screenshot(path=str(out/'side-bones.png'))
    assert not errors,errors
    browser.close()
    (out/'verification.json').write_text(json.dumps({'errors':errors,'rigid_bones_and_coupled_curl':metrics,'poses':10,'mobile_widths':[320,390,680],'labels':'all four end on visible target layers','playback':'passed'},indent=2))
print('PASS: 10 poses, four visible labels, rigid bones, pelvis tilt, hip contact, knee lift, playback and mobile layout.')
