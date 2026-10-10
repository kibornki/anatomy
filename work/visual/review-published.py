"""Verify the published Pages documents and exercise the real integrated hub."""
from pathlib import Path
import base64,hashlib,json,os,time,urllib.request
from playwright.sync_api import sync_playwright
base='https://kibornki.github.io/anatomy/'
revision=os.environ.get('ANATOMY_EXPECTED_REVISION','live')
out=Path('artifacts/published-visual');out.mkdir(parents=True,exist_ok=True)
hashes={}
for filename in ['index.html','upperbody.html','arm.html','abdomen.html','forearm.html','thigh.html']:
    expected=hashlib.sha256(Path(filename).read_bytes()).hexdigest()
    actual=None
    for attempt in range(18):
        try:
            req=urllib.request.Request(base+filename+'?visual-review='+revision,headers={'Cache-Control':'no-cache','User-Agent':'Anatomy visual regression review'})
            with urllib.request.urlopen(req,timeout=45) as res:actual=hashlib.sha256(res.read()).hexdigest()
        except Exception as error:print('Waiting for published document',filename,str(error),flush=True)
        if actual==expected:break
        time.sleep(10)
    assert actual==expected,(filename,expected,actual)
    hashes[filename]=actual
    print('Published document matches reviewed build:',filename,flush=True)
apis={'upperbody':'nativeUpperbody','arm':'armAtlas','abdomen':'abdomenDraft','forearm':'nativeLimb','thigh':'nativeLimb'}
roots={'upperbody':'#upperbody','arm':'#arm','abdomen':'#abdomen','forearm':'#forearm-motion','thigh':'#thigh-motion'}
errors=[];report=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    page=browser.new_page(viewport={'width':1100,'height':1100})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'?visual-review='+revision,timeout=120000)
    for region,api in apis.items():
        page.locator('#tab-'+region).click()
        frame=page.locator('#anatomy-frame').element_handle().content_frame()
        frame.wait_for_function('!!window.'+api,timeout=120000)
        assert frame.locator('#'+region+'-composition-muscle').is_visible()
        assert frame.locator('.anatomy-surface-lighting' if region!='arm' else '.arm-surface-lighting').count()>0
        assert 'CC BY-SA 2.1 Japan' in frame.locator('body').inner_text()
        frame.locator('#'+region+'-transparent').check()
        frame.locator('#'+region+'-fibers').uncheck()
        frame.locator('#'+region+'-fibers').check()
        frame.locator('#'+region+'-transparent').uncheck()
        svg=frame.locator(roots[region]+' svg').first
        svg.screenshot(path=str(out/(region+'.png')))
        report.append({'region':region,'realHubLoaded':True,'lightingPresent':True,'controlsVisible':True,'licensePresent':True})
        page.screenshot(path=str(out/(region+'-hub.png')),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    for region in apis:
        page.locator('#tab-'+region).click()
        frame=page.locator('#anatomy-frame').element_handle().content_frame()
        frame.wait_for_function('!!window.'+apis[region],timeout=120000)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),region
        assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth'),region
    assert not errors,errors
    browser.close()
result={'revision':revision,'liveDocumentsMatchReviewedBuild':hashes,'realBrowserHub':report,'mobileWidths':[390],'pageErrors':errors}
(out/'report.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
