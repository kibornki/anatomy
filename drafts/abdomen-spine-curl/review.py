"""Native browser checks and screenshots for the separate draft."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import os

out=Path('/workspace/artifacts/abdomen-spine-curl')
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1000,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('ANATOMY_REVIEW_URL','http://127.0.0.1:8766/abdomen.html'))
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
            bounds=page.evaluate('''()=>{const g=document.querySelector('g[data-view="'+abdomenDraft.root.dataset.view+'"]'),boxes=Array.from(g.querySelectorAll('path')).filter(p=>!p.closest('.fibers')).map(p=>p.getBBox()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height)),b={x,y,width:right-x,height:bottom-y},m=g.getCTM(),s=document.querySelector('svg').getCTM().inverse(),p=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m).matrixTransform(s));return p.map(p=>[p.x,p.y]);}''')
            assert bounds[0][0]>=0 and bounds[1][0]<=640 and bounds[0][1]>=0 and bounds[1][1]<=515,bounds
            if angle in [0,50,100]:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}.png'))
    # Verify stationary pelvis and camera, distributed spinal angles, and rigid
    # individual bones rather than the previous hip-driven folding pose.
    metrics=page.evaluate('''()=>{
      const m=abdomenDraft.model,distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),results=[];
      if(document.querySelector('[data-leg],[data-part="lower-body-context"]'))throw Error('Unexpected legs');
      for(const a of [0,25,50,75,100]){
        const f=m.frame(a);let boneError=0,count=0;
        for(const plate of Object.values(m.plates))for(const path of plate.paths.filter(p=>p.rib||p.pelvis||p.vertebra||p.shoulder)){
          const q=path.points.filter(p=>p.xyz);if(q.length<2)continue;count++;
          const start=q[0].xyz,end=q[Math.floor(q.length/2)].xyz,transform=q=>path.pelvis?q:f.segment(q,path.rib||path.vertebra||175);
          boneError=Math.max(boneError,Math.abs(distance(start,end)-distance(transform(start),transform(end))));
        }
        results.push({a,boneError,count,pelvis:f.deform([45,475,15],true),angles:[455,400,340,280,220,180].map(y=>f.alpha(y)*180/Math.PI)});
      }
      // Rib i rotates at vertebra Ti, never at one of the cervical vertebrae.
      for(const path of m.plates.side.paths.filter(p=>p.rib)){
        const n=+path.n.closest('[data-rib]').dataset.rib,v=ClassicSideAnatomy.vertebrae.find(v=>v.id==='T'+n);
        if(Math.abs(path.rib-(1.24*v.center[1]-39))>.01)throw Error('Incorrect rib attachment');
      }
      return results;
    }''')
    assert max(m['boneError'] for m in metrics)<0.01,metrics
    assert min(m['count'] for m in metrics)>100,metrics
    assert all(m['pelvis']==[45,475,15] for m in metrics),metrics
    assert metrics[-1]['angles'][0]==0
    assert all(a<b for a,b in zip(metrics[-1]['angles'],metrics[-1]['angles'][1:])),metrics
    assert metrics[-1]['angles'][-1]>70,metrics
    for view in ['front','side']:
        pelvis_states=[]
        for angle in [0,50,100]:
            page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
            pelvis_states.append(page.evaluate('''()=>abdomenDraft.model.plates[abdomenDraft.root.dataset.view].paths.filter(p=>p.pelvis).map(p=>({d:p.n.getAttribute('d'),matrix:[p.n.getScreenCTM().a,p.n.getScreenCTM().d,p.n.getScreenCTM().e,p.n.getScreenCTM().f]}))'''))
        assert pelvis_states[0]==pelvis_states[1]==pelvis_states[2],view
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
    page.locator('#abdomen').screenshot(path=str(out/'side-spine.png'))
    # Native crop of the actual drawing, for a posture-first image review.
    page.evaluate("abdomenDraft.setPose(100,'side')")
    page.locator('.diagram-labels').evaluate("g=>g.style.visibility='hidden'")
    for transparent,name in [(True,'pose-spine'),(False,'pose-muscles')]:
        page.locator('#abdomen-transparent').set_checked(transparent)
        box=page.evaluate('''()=>{const boxes=Array.from(document.querySelectorAll('svg g[data-view="side"] path')).filter(p=>!p.closest('.fibers')).map(p=>p.getBoundingClientRect()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),r=Math.max(...boxes.map(b=>b.right)),b=Math.max(...boxes.map(b=>b.bottom));return {x,y,width:r-x,height:b-y};}''')
        clip={'x':max(0,box['x']-24),'y':max(0,box['y']-24),'width':box['width']+48,'height':box['height']+48}
        page.screenshot(path=str(out/(name+'.png')),clip=clip)
    assert not errors,errors
    browser.close()
    (out/'verification.json').write_text(json.dumps({'errors':errors,'individual_rigid_bones_and_distributed_spine_curl':metrics,'poses':10,'mobile_widths':[320,390,680],'labels':'all four end on visible target layers','playback':'passed'},indent=2))
print('PASS: 10 poses, four visible labels, rigid individual bones, distributed spinal curl, fixed pelvis and camera, playback and mobile layout.')
