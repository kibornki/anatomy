"""Check visible output, input coalescing, and playback suspension after profiling."""
from pathlib import Path
from io import BytesIO
import json
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
regions = {'upperbody': 'nativeUpperbody', 'arm': 'armAtlas',
           'abdomen': 'abdomenDraft', 'forearm': 'nativeLimb', 'thigh': 'nativeLimb'}
errors, comparisons = [], []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    pages = []
    for path in ['artifacts/motion-performance/before/index.html', 'index.html']:
        page = browser.new_page(viewport={'width':1280,'height':900}, bypass_csp=True)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8766/'+path)
        page.locator('#dashboard-tab-anatomy').click()
        pages.append(page)
    for region, api in regions.items():
        frames = []
        for page in pages:
            page.locator('#tab-'+region).click()
            frame = page.locator('#anatomy-frame').element_handle().content_frame()
            frame.wait_for_function('!!window.'+api)
            frames.append(frame)
        views = ['front','side','twist' if region=='abdomen' else 'back']
        if region=='thigh': views.append('medial')
        for mode in ['anatomy','sculpt','compare']:
            for view in views:
                shots = []
                for frame in frames:
                    frame.evaluate('''([api,region,mode,view])=>{
                      const app=window[api],model=region==='abdomen'?app.model.flexion:app.model;
                      model.composition.restore({muscle:115,fat:region==='forearm'?0:25,fatTransparent:true});
                      for(const [id,checked]of [['transparent',true],['fibers',view!=='side']]){
                        const input=document.getElementById(region+'-'+id);input.checked=checked;
                        input.dispatchEvent(new Event('change',{bubbles:true}));
                      }
                      app.setMode(mode);app.setPose(view==='twist'?-35:73,view);
                    }''', [api,region,mode,view])
                    shots.append(Image.open(BytesIO(frame.locator('svg').first.screenshot())).convert('RGB'))
                assert shots[0].size==shots[1].size, (region,mode,view,'size')
                diff=ImageChops.difference(*shots)
                changed=sum(1 for pixel in diff.getdata() if max(pixel)>0)
                max_delta=max(max(pixel) for pixel in diff.getdata())
                comparisons.append(dict(region=region,mode=mode,view=view,changedPixels=changed,maxChannelDelta=max_delta))
                if changed: diff.save(root/f'artifacts/motion-performance/{region}-{mode}-{view}-diff.png')
                # Chromium may round a handful of antialiased edge pixels differently.
                assert changed<=16 and max_delta<=8, comparisons[-1]
        print(region, 'visual comparison passed', flush=True)
    page=pages[1]
    page.locator('#tab-upperbody').click()
    frame=page.locator('#anatomy-frame').element_handle().content_frame()
    frame.wait_for_function('!!window.nativeUpperbody')
    page.wait_for_selector('#hub-range-upperbody-angle')
    page.evaluate('''()=>{const input=document.getElementById('hub-range-upperbody-angle');
      for(let value=10;value<=90;value++){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}}''')
    frame.wait_for_function('Number(nativeUpperbody.root.dataset.angle)===90')
    page.locator('[data-hub-action=play]').click()
    page.wait_for_timeout(400)
    page.locator('#dashboard-tab-photo').click()
    page.wait_for_timeout(400)
    before=frame.evaluate('nativeUpperbody.root.dataset.angle')
    page.wait_for_timeout(600)
    assert before==frame.evaluate('nativeUpperbody.root.dataset.angle'), 'hidden model kept animating'
    page.locator('#dashboard-tab-anatomy').click()
    frame.wait_for_function('nativeUpperbody.root.dataset.angle!=="'+before+'"')
    page.locator('[data-hub-action=play]').click()
    assert not errors, errors
    browser.close()
report=dict(comparisons=comparisons,pageErrors=errors,inputBurstFinalAngle=90,hiddenPlaybackPaused=True)
(root/'artifacts/motion-performance/regression.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('All',len(comparisons),'drawings match; input and hidden playback checks passed.',flush=True)
