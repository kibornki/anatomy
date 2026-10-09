"""Browser checks for the reviewed native abdominal illustration, not clinical certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, subprocess

root=Path(__file__).resolve().parents[2]
out=Path('/workspace/artifacts/serratus-fan-review');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ANATOMY_REVIEW_BASE','http://127.0.0.1:8767/')
errors=[];metrics=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1100,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'abdomen.html');page.wait_for_timeout(100)
    assert page.locator('#abdomen-value').inner_text()=='0%'
    assert page.locator('#abdomen-front').get_attribute('aria-pressed')=='true'
    assert page.locator('canvas').count()==0
    # Foreground bones must hide a farther muscle irrespective of SVG paint
    # order. Also check interpolated triangle depth, rather than group averages.
    assert page.evaluate('''()=>{
      const solve=reverse=>{const v=AbdominalVisibility({project:q=>q.slice(0,2),depth:q=>q[2],step:.5}),far=()=>v.quad([[0,0,1],[10,0,1],[10,10,1],[0,10,1]],0),bone=()=>v.quad([[3,0,4],[7,0,4],[7,10,4],[3,10,4]],-3);if(reverse){bone();far();}else{far();bone();}return v.solve(1);};
      const a=solve(false),b=solve(true),at=(x,y)=>a.owners[Math.floor((y-a.y0)/a.step)*a.w+Math.floor((x-a.x0)/a.step)];
      return JSON.stringify([...a.owners])===JSON.stringify([...b.owners])&&at(2,5)===0&&at(5,5)===-3&&at(8,5)===0;
    }''')
    # Restored hub iframes can initialize while hidden. Their neutral geometry
    # must retain every authored bone/muscle transform, including both mirrors.
    neutral_geometry="()=>Object.fromEntries(Object.entries(abdomenDraft.model.flexion.plates).map(([v,p])=>[v,p.paths.map(p=>p.points.filter(q=>q.xyz).map(q=>q.xyz.map(n=>+n.toFixed(8))))]))"
    standalone_geometry=page.evaluate(neutral_geometry)
    assert page.locator('.diagram-volumes [data-view="front"] .fiber').count()>=330
    # Opposing superficial/intermediate fiber directions, continuous muscles,
    # costal slips and rectus intersections must survive the native curve build.
    assert page.evaluate('''()=>{const m=abdomenDraft.model.flexion,p=m.plates.front.paths,dirs=id=>p.filter(q=>q.n.classList.contains('fiber')&&q.n.closest('[data-muscle]')?.dataset.muscle===id).map(q=>{let a=q.points.find(q=>q.xyz).xyz,b=q.points.filter(q=>q.xyz).at(-1).xyz;return [b[0]-a[0],b[1]-a[1]]});return dirs('external-oblique').some(q=>q[0]<0&&q[1]>0)&&dirs('internal-oblique').every(q=>q[0]<0&&q[1]<0)&&m.plates.front.g.querySelectorAll('[data-muscle="latissimus"] > .muscle').length===2&&m.plates.front.g.querySelectorAll('.intersection').length===6;}''')
    # Front and twist use the identical latissimus surface at neutral yaw,
    # not an unrelated simplified mesh. Side shows the superficial posterior
    # sheet over the posterior EO edge and posterior serratus slips.
    page.evaluate('abdomenDraft.setPose(0,"front")')
    shared_lat=page.locator('.diagram-volumes [data-view="front"] [data-surface="posterior-latissimus"]').evaluate_all('ns=>ns.map(n=>n.innerHTML)')
    page.evaluate('abdomenDraft.setPose(0,"twist")')
    assert shared_lat==page.locator('.diagram-volumes [data-view="front"] [data-surface="posterior-latissimus"]').evaluate_all('ns=>ns.map(n=>n.innerHTML)')
    for view in ['front','side','twist']:
        page.evaluate('v=>abdomenDraft.setPose(0,v)',view)
        assert page.locator('.diagram-labels [data-label="latissimus"]').is_visible()
        assert page.locator('.diagram-volumes [data-view="'+('front' if view=='twist' else view)+'"] [data-muscle=latissimus] .fiber').count()>=35
    for angle in [-90,90]:
        page.evaluate('a=>abdomenDraft.setPose(a,"twist")',angle)
        assert float(page.locator('#abdomen').get_attribute('data-angle'))==(-60 if angle<0 else 60)
        assert page.locator('#abdomen-angle').get_attribute('min')=='-60' and page.locator('#abdomen-angle').get_attribute('max')=='60'
    # The lateral belly must connect to its anterior aponeurotic boundary;
    # all eight costal origins belong to ribs 5–12, rather than a hand-drawn strip.
    assert page.evaluate("()=>{const s=abdomenDraft.model.flexion.surfaces.sources;return ['front','side'].every(v=>s[v]['external-oblique'].origin.length===8&&s[v].serratus.origin.length===8)&&s.front['external-oblique'].insertion[3][0]<60&&s.front['external-oblique'].insertion[3][0]>40;}")
    # Lateral upper EO fibers travel anteriorly toward the sheath and downward.
    # The former narrow strip sent some of these fibers posteriorly.
    assert page.evaluate('''()=>{
      const fibers=abdomenDraft.model.flexion.plates.side.paths.filter(p=>p.patch==='external-oblique'&&p.n.classList.contains('fiber')&&p.points[0].uv[1]<3.5);
      return fibers.length>20&&fibers.every(p=>{const qs=p.points.filter(q=>q.xyz),a=qs[0].xyz,b=qs.at(-1).xyz;return b[2]>a[2]&&b[1]>a[1];});
    }''')
    # Inferior SA has a broad costal origin range and a narrower scapular
    # inferior-angle insertion. Equal height ranges made parallel stripes.
    assert page.evaluate('''()=>{
      const s=abdomenDraft.model.flexion.surfaces.sources,span=ps=>Math.max(...ps.map(p=>p[1]))-Math.min(...ps.map(p=>p[1]));
      return ['front','side'].every(view=>{const p=s[view].serratus,o=p.origin.slice(4),e=p.insertion.slice(4);return o.every((p,i)=>!i||p[1]>o[i-1][1])&&span(o)>35&&span(e)/span(o)<.3;});
    }''')
    # The displayed near flank must show distinct directions at BOTH yaw
    # endpoints, rather than only tracing an unseen posterior convergence.
    # This is a drawing-readability criterion, not a clinical fiber angle.
    fan_metrics=[]
    for angle in [-60,60]:
        page.evaluate('a=>abdomenDraft.setPose(a,"twist")',angle)
        fan=page.evaluate('''()=>{
          const m=abdomenDraft.model.flexion,f=m.plates.front.poseFrame,yaw=16*Math.PI/180,sign=f.degrees>0?-1:1,proj=p=>[p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1]];
          const angles=[4,5,6,7].map(v=>{const a=proj(m.surfaces.transform('front','serratus',.1,v,sign,f)),b=proj(m.surfaces.transform('front','serratus',.35,v,sign,f));return Math.atan2(b[1]-a[1],Math.abs(b[0]-a[0]))*180/Math.PI;});
          return {degrees:f.degrees,angles,spread:Math.max(...angles)-Math.min(...angles)};
        }''')
        assert fan['spread']>25,fan
        assert page.evaluate('''()=>[...abdomenDraft.model.flexion.plates.front.g.querySelectorAll('[data-muscle="serratus"]')].every(g=>{
          const ds=[...g.querySelectorAll('.fiber')].map(p=>p.getAttribute('d'));return new Set(ds).size===ds.length;
        })'''), 'Coincident serratus fibers darken the narrow fan edge'
        fan_metrics.append(fan)
    # The compact chest fans retain fibers and sort back-to-front at both yaw
    # endpoints; the old floating breastplate had no fan or depth ordering.
    for angle in [-60,60]:
        page.evaluate('a=>abdomenDraft.setPose(a,"twist")',angle)
        assert page.evaluate("()=>{const m=abdomenDraft.model.flexion,p=m.plates.front,groups=[...p.g.children].filter(n=>n.classList.contains('context-muscle')),z=groups.map(g=>{const q=p.paths.find(p=>p.n.parentElement===g&&p.n.classList.contains('context-shape')).worldPoints.filter(Boolean);return q.reduce((s,q)=>s-q[0]*Math.sin(16*Math.PI/180)+q[2]*Math.cos(16*Math.PI/180),0)/q.length;});return groups.length===2&&z[0]<=z[1]&&groups.every(g=>g.querySelectorAll('.fiber').length>=30);}")
    pelvis={}
    for view,angles in [('front',[0,25,50,75,100]),('side',[0,25,50,75,100]),('twist',list(range(-60,61,10)))]:
        for angle in angles:
            page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view])
            result=page.evaluate('''()=>{
              const m=abdomenDraft.model.flexion,r=abdomenDraft.root,view=r.dataset.view,plate=m.plates[view==='twist'?'front':view],a=+r.dataset.angle,f=plate.poseFrame,camera=view==='side',yaw=16*Math.PI/180,proj=q=>camera?[q[2],q[1]]:[q[0]*Math.cos(yaw)+q[2]*Math.sin(yaw),q[1]],dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
              let boneError=0,renderError=0,bones=0,seamError=0,minFiber=9,maxFiber=0,maxLatFiber=0,attachmentError=0;
              const rendered=p=>[...p.n.getAttribute('d').matchAll(/[ML]\\s+([-\\d.]+),([-\\d.]+)/g)].map(q=>[+q[1],+q[2]]);
              for(const path of plate.paths){const qs=path.points.filter(q=>q.xyz).map(q=>q.xyz),actual=rendered(path);
                if(path.cartilage){const rib=plate.paths.find(p=>p.rib===path.rib&&p.n.classList.contains('rib')&&p.n.closest('[data-side]')===path.n.closest('[data-side]'));seamError=Math.max(seamError,dist(actual[0],rendered(rib)[36]));const end=proj(f.segment(qs[18],path.cartilage.level));renderError=Math.max(renderError,dist(actual[18],end));}
                if(!path.cartilage&&(path.sternum||path.rib||path.shoulder||path.vertebra)){
                  const level=path.sternum?177:path.rib|| (path.shoulder?175:path.vertebra),newQ=qs.map(q=>f.segment(q,level));bones++;
                  for(let i=0;i<qs.length;i++){renderError=Math.max(renderError,dist(actual[i],proj(newQ[i])));if(i)boneError=Math.max(boneError,Math.abs(dist(qs[i],qs[i-1])-dist(newQ[i],newQ[i-1])));}
                }
                if(view==='twist'&&path.n.classList.contains('fiber')){const world=path.worldPoints.filter(Boolean),length=ps=>ps.slice(1).reduce((s,q,i)=>s+dist(q,ps[i]),0),ratio=length(world)/length(qs);minFiber=Math.min(minFiber,ratio);if(path.lat)maxLatFiber=Math.max(maxLatFiber,ratio);else maxFiber=Math.max(maxFiber,ratio);}
              }
              for(const path of plate.paths.filter(p=>p.lat&&p.n.classList.contains('fiber'))){const qs=path.points.filter(q=>q.xyz).map(q=>q.xyz),actual=path.worldPoints.filter(Boolean),last=qs.length-1;attachmentError=Math.max(attachmentError,dist(actual[last],f.segment(qs[last],175)));}
              let wallAttachmentError=0,sheathContactError=0;
              if(view==='twist'){
               // Rendered rectus/fascia above the costal boundary must follow
               // the actual sternal frame; lower pubic/iliac wall stays fixed.
               for(const p of plate.paths.filter(p=>p.wall))p.points.forEach((q,i)=>{
                if(!q.xyz)return;
                if(q.xyz[1]<=300)wallAttachmentError=Math.max(wallAttachmentError,dist(p.worldPoints[i],f.segment(q.xyz,177)));
                if(q.xyz[1]>=420)wallAttachmentError=Math.max(wallAttachmentError,dist(p.worldPoints[i],q.xyz));
               });
               // Compare EO insertion to the independently rendered white
               // sheath, not just a second call to the muscle deformation.
               for(const sign of [-1,1])for(let v=0;v<=3;v++){
                const e=m.surfaces.point('front','external-oblique',1,v);e[0]*=sign;
                const p=plate.paths.find(p=>p.n.dataset.part==='external-aponeurosis'&&p.points.some(q=>q.xyz&&dist(q.xyz,e)<1e-8));
                if(!p)throw new Error('Missing EO/sheath contact landmark');
                const i=p.points.findIndex(q=>q.xyz&&dist(q.xyz,e)<1e-8);
                sheathContactError=Math.max(sheathContactError,dist(p.worldPoints[i],m.surfaces.transform('front','external-oblique',1,v,sign,f)));
               }
              }
              for(const path of plate.paths.filter(p=>p.pectoral)){const qs=path.points.filter(q=>q.xyz).map(q=>q.xyz),actual=rendered(path);for(let i=0;i<qs.length;i++)renderError=Math.max(renderError,dist(actual[i],proj(f.segment(qs[i],177))));}
              let costalError=0,pelvicAttachmentError=0,scapularError=0;
              const nearest=(q,ps)=>Math.min(...ps.slice(1).map((b,i)=>{const a=ps[i],d=b.map((n,k)=>n-a[k]),t=Math.max(0,Math.min(1,q.reduce((s,n,k)=>s+(n-a[k])*d[k],0)/d.reduce((s,n)=>s+n*n,0)));return dist(q,a.map((n,k)=>n+t*d[k]));}));
              for(const id of ['serratus','external-oblique'])for(const sign of camera?[1]:[-1,1])for(let v=0;v<8;v++){
               const r=v+(id==='serratus'?1:5),rib=plate.paths.find(p=>p.n.classList.contains('rib')&&+p.n.closest('[data-rib]').dataset.rib===r&&(camera||+p.n.closest('[data-side]').dataset.side===sign)),q=m.surfaces.transform(camera?'side':'front',id,0,v,sign,f),ps=rib.worldPoints.filter(Boolean);
               costalError=Math.max(costalError,nearest(camera?q.slice(1):q,camera?ps.map(p=>p.slice(1)):ps));
              }
              for(const sign of camera?[1]:[-1,1])for(let v=0;v<8;v++){
               const q=m.surfaces.transform(camera?'side':'front','serratus',1,v,sign,f),scap=plate.paths.find(p=>p.shoulder&&p.n.classList.contains('bone')&&(camera||p.n.dataset.depth==='posterior'&&Math.sign(p.points[0].xyz[0])===sign)),ps=scap.worldPoints.filter(Boolean);
               scapularError=Math.max(scapularError,nearest(camera?q.slice(1):q,camera?ps.map(p=>p.slice(1)):ps));
              }
              for(const sign of camera?[1]:[-1,1])for(const id of ['external-oblique','latissimus']){
               const u=id==='latissimus'?0:1,v=id==='latissimus'?3:7,q=m.surfaces.point(camera?'side':'front',id,u,v);q[0]*=sign;
               pelvicAttachmentError=Math.max(pelvicAttachmentError,dist(q,m.surfaces.transform(camera?'side':'front',id,u,v,sign,f)));
              }
              let contactGap=0,minShellClearance=Infinity;
              for(const sign of camera?[1]:[-1,1])for(let i=0;i<=60;i++){
               const v=i/20,sa=m.surfaces.transform(camera?'side':'front','serratus',0,4+v,sign,f),eo=m.surfaces.transform(camera?'side':'front','external-oblique',0,v,sign,f);
               contactGap=Math.max(contactGap,dist(sa,eo));
              }
              // Test the deformed mesh interiors against the posed cage shell,
              // not only the rest pose or the origin/insertion endpoints.
              for(const region of m.surfaceRegions.filter(r=>r.view===(camera?'side':'front')))for(const q of region.grid){
               if(q.binding.u<.125||q.binding.u>.875)continue;
               const p=m.surfaces.move(q.binding,f),edge=f.envelope.boundary(p);
               if(edge)minShellClearance=Math.min(minShellClearance,edge.length-edge.distance);
              }
              const s=m.yawFrame(60),theta=y=>s.theta(y)*180/Math.PI;
              const labels=[...document.querySelectorAll('.diagram-labels [data-label]')].filter(g=>g.style.display!=='none').map(g=>{const line=g.querySelector('path'),point=line.getPointAtLength(line.getTotalLength()),screen=point.matrixTransform(line.getScreenCTM()),hit=m.pickAt(screen.x,screen.y);return {id:g.dataset.label,hit:hit?.closest('[data-muscle]')?.dataset.muscle};});
              return {view,angle:a,bones,boneError,renderError,seamError,contactGap,minShellClearance,minFiber,maxFiber,maxLatFiber,attachmentError,wallAttachmentError,sheathContactError,costalError,pelvicAttachmentError,scapularError,lumbar:theta(377),upper:theta(177),thoracicStep:theta(225)-theta(241),pelvisFixed:JSON.stringify(s.deform([40,475,15]))==='[40,475,15]',labels};
            }''')
            assert result['boneError']<1e-8,result
            assert result['renderError']<.001,result
            assert result['seamError']<.002,result
            assert result['bones']>60,result
            assert abs(result['lumbar']-5)<1e-8 and abs(result['upper']-60)<1e-8,result
            assert 0<result['thoracicStep']<7.1 and result['pelvisFixed'],result
            assert result['attachmentError']<1e-8 and result['pelvicAttachmentError']<1e-8,result
            assert result['wallAttachmentError']<1e-8 and result['sheathContactError']<1e-8,result
            assert result['costalError']<1.5 and result['scapularError']<4.5,result
            assert result['contactGap']<1e-8 and result['minShellClearance']>=3.49,result
            if view=='twist':
                assert .35<result['minFiber']<=result['maxFiber']<1.8,result
                assert result['maxLatFiber']<1.8,result
            expected={'serratus':'serratus','external':'external-oblique','internal':'internal-oblique','rectus':'rectus','latissimus':'latissimus'}
            assert len(result['labels'])==5 and all(l['hit']==expected[l['id']] for l in result['labels']),result
            selector='[data-part="pelvic-skeleton"]' if view=='side' else '[data-part="coronal-hip-bone"],[data-part="coronal-sacrum"],[data-part="coronal-pubic-symphysis"]'
            current=page.locator('.diagram-volumes [data-view="'+('side' if view=='side' else 'front')+'"] '+selector).evaluate_all('nodes=>nodes.map(n=>n.outerHTML)')
            key='side' if view=='side' else 'front'
            if key in pelvis:assert current==pelvis[key]
            else:pelvis[key]=current
            assert page.locator('#abdomen').get_attribute('data-camera-yaw')==('90' if view=='side' else '16')
            assert page.evaluate("()=>[...document.querySelectorAll('.diagram-volumes path')].every(p=>!/NaN|Infinity/.test(p.getAttribute('d')))")
            metrics.append(result)
            if angle in [0,100,-60,60]:page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}.png'))
    page.evaluate('abdomenDraft.setPose(0,"front")')
    bone_styles=page.locator('.bone,.rib,.cartilage').evaluate_all('nodes=>nodes.map(n=>{const s=getComputedStyle(n);return [s.opacity,s.fillOpacity,s.strokeOpacity,s.fill,s.stroke]})')
    assert page.locator('.diagram-volumes [data-view=front] [data-muscle=latissimus]').evaluate_all("ns=>ns.every(n=>getComputedStyle(n).clipPath!=='none')")
    page.locator('#abdomen-transparent').check()
    assert page.locator('.diagram-volumes [data-view=front] [data-muscle=latissimus]').evaluate_all("ns=>ns.every(n=>getComputedStyle(n).clipPath==='none')")
    assert bone_styles==page.locator('.bone,.rib,.cartilage').evaluate_all('nodes=>nodes.map(n=>{const s=getComputedStyle(n);return [s.opacity,s.fillOpacity,s.strokeOpacity,s.fill,s.stroke]})')
    assert page.locator('[data-muscle]').evaluate_all("nodes=>nodes.every(n=>getComputedStyle(n).opacity==='0.32'&&getComputedStyle(n.parentElement).opacity==='1')")
    assert page.locator('[data-muscle] > .muscle').evaluate_all("nodes=>nodes.every(n=>getComputedStyle(n).fillOpacity==='1')")
    for view,angle in [('front',0),('side',100),('twist',-60),('twist',60)]:
        page.evaluate('([a,v])=>abdomenDraft.setPose(a,v)',[angle,view]);page.locator('#abdomen').screenshot(path=str(out/f'{view}-{angle}-transparent.png'))
        assert page.locator('.diagram-labels [data-label]:visible').count()==5
    page.locator('#abdomen-fibers').uncheck();assert page.locator('.diagram-volumes [data-view="front"] .fibers').evaluate_all("ns=>ns.every(n=>getComputedStyle(n).display==='none')")
    page.locator('#abdomen-transparent').uncheck();page.locator('#abdomen-fibers').check()
    assert page.locator('[data-muscle]').evaluate_all("nodes=>nodes.every(n=>getComputedStyle(n).opacity==='1')")
    page.evaluate('abdomenDraft.setPose(30,"twist")');page.locator('#abdomen-play').click();page.wait_for_timeout(250)
    assert float(page.locator('#abdomen').get_attribute('data-angle'))!=30
    page.locator('#abdomen-play').click();stopped=page.locator('#abdomen').get_attribute('data-angle');page.wait_for_timeout(100)
    assert stopped==page.locator('#abdomen').get_attribute('data-angle')
    # Migrate both old schemas and clamp the anatomically excessive old twist.
    page.goto(base)
    for old,expected_twist in [({'revision':'abdomen-spine-curl-v1','angle':63,'camera':'front','fibers':False,'transparent':True},'30°'),({'revision':'abdomen-twist-v2','curl':63,'twist':135,'camera':'front','fibers':False,'transparent':True},'60°')]:
        page.evaluate("s=>localStorage.setItem('anatomy-hub-v1',JSON.stringify({active:'abdomen',states:{abdomen:{modelContent:s,privateContent:{playing:false}}}}))",old)
        page.reload();f=page.frame_locator('#anatomy-frame');f.locator('#abdomen').wait_for()
        assert f.locator('#abdomen').evaluate('n=>('+neutral_geometry+')()')==standalone_geometry,'Hidden restored iframe lost neutral transforms'
        assert f.locator('#abdomen-value').inner_text()=='63%'
        assert not f.locator('#abdomen-fibers').is_checked() and f.locator('#abdomen-transparent').is_checked()
        f.locator('#abdomen-twist').click();assert f.locator('#abdomen-value').inner_text()==expected_twist
    f.locator('#abdomen-angle').fill('-35');f.locator('#abdomen-fibers').check();f.locator('#abdomen-transparent').uncheck()
    page.locator('#tab-arm').click();page.locator('#tab-abdomen').click();f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text()=='-35°'
    f.locator('#abdomen-side').click();assert f.locator('#abdomen-value').inner_text()=='63%'
    f.locator('#abdomen-twist').click();page.reload();f.locator('#abdomen').wait_for();assert f.locator('#abdomen-value').inner_text()=='-35°'
    assert f.locator('#abdomen').evaluate('n=>('+neutral_geometry+')()')==standalone_geometry
    projected_geometry=f.locator('#abdomen').evaluate("()=>abdomenDraft.model.flexion.plates.front.paths.map(p=>p.n.getAttribute('d'))")
    page.screenshot(path=str(out/'hub-desktop.png'))
    for width in [320,390,680]:
        page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(100)
        for view in ['front','side','twist']:
            f.locator('#abdomen-'+view).click()
            assert f.locator('#abdomen').evaluate('n=>document.documentElement.scrollWidth<=innerWidth')
        assert f.locator('#abdomen').evaluate("()=>abdomenDraft.model.flexion.plates.front.paths.map(p=>p.n.getAttribute('d'))")==projected_geometry,'Viewport resizing changed projected anatomy'
        f.locator('.diagram-note').scroll_into_view_if_needed();assert f.locator('.diagram-note').evaluate('n=>n.getBoundingClientRect().bottom<=innerHeight+1')
        if width==390:page.screenshot(path=str(out/'hub-mobile.png'))
    # This Chromium/CDP combination offsets synthetic touch-clicks twice in
    # opaque-origin OOPIFs. Keep production sandboxing; disable process isolation
    # only in the separate touch-test browser. Desktop checks use default isolation.
    touch_browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-site-isolation-trials'])
    mobile=touch_browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base);m.locator('#tab-abdomen').tap();mf=m.frame_locator('#anatomy-frame');mf.locator('#abdomen').wait_for();mf.locator('#abdomen-twist').tap();mf.locator('#abdomen-play').tap();m.wait_for_timeout(200);mf.locator('#abdomen-play').tap();mf.locator('#abdomen-transparent').check()
    assert mf.locator('#abdomen').get_attribute('data-motion')=='yaw'
    assert mf.locator('#abdomen').evaluate('n=>document.documentElement.scrollWidth<=innerWidth')
    m.screenshot(path=str(out/'hub-touch-mobile.png'));touch_browser.close()
    assert not errors,errors
    browser.close()
def data(html):return json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>',html,re.S)[1])
old=data(subprocess.check_output(['git','show','HEAD:index.html'],cwd=root,text=True));new=data((root/'index.html').read_text())
assert all(old[k]==new[k] for k in old if k!='abdomen')
for name in ['upperbody.html','arm.html','forearm.html','thigh.html']:
    assert (root/name).read_bytes()==subprocess.check_output(['git','show','HEAD:'+name],cwd=root)
(out/'verification.json').write_text(json.dumps({'poses':metrics,'inferior_serratus_fan':fan_metrics,'materials':'passed','sandbox_and_state_migration':'passed','mobile_and_touch':'passed','other_topics_unchanged':True,'errors':errors},indent=2)+'\n')
print('PASS: 23 poses; shared SA/EO contact, posed-shell clearance, camera-depth occlusion, distributed rotation, rigid bones, cartilage continuity, attachment, fiber stability, visible labels, group transparency, migration/state/playback, mobile/touch; other topics unchanged.')
