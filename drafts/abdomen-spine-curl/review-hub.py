"""Check the approved model inside the production sandbox and state store."""
from pathlib import Path
import json, os, re, subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
out = Path('/workspace/artifacts/abdomen-integrated')
out.mkdir(parents=True, exist_ok=True)
url = os.environ.get('ANATOMY_HUB_URL', 'http://127.0.0.1:8767/')
def topics(html):
    return json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>', html, re.S)[1])
old = topics(subprocess.check_output(['git','show','HEAD:index.html'], cwd=root, text=True))
new = topics((root/'index.html').read_text())
assert all(old[key] == new[key] for key in old if key != 'abdomen')
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1200,'height':1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    def abdomen():
        page.locator('#tab-abdomen').click()
        frame = page.frame_locator('#anatomy-frame')
        frame.locator('#abdomen').wait_for()
        page.wait_for_timeout(150)
        return frame
    def state():
        return page.evaluate("JSON.parse(localStorage.getItem('anatomy-hub-v1')).states.abdomen")
    page.goto(url)
    f = abdomen()
    assert f.locator('#abdomen').get_attribute('data-view') == 'side'
    assert f.locator('#abdomen-value').inner_text() == '100%'
    f.locator('#abdomen-front').click()
    f.locator('#abdomen-angle').fill('63')
    f.locator('#abdomen-fibers').uncheck()
    f.locator('#abdomen-transparent').check()
    page.wait_for_timeout(100)
    expected = state()
    assert expected['modelContent']['angle'] == 63
    assert expected['modelContent']['camera'] == 'front'
    page.locator('#tab-arm').click()
    f = abdomen()
    assert state() == expected
    page.reload()
    f = page.frame_locator('#anatomy-frame')
    f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text() == '63%'
    assert f.locator('#abdomen').get_attribute('data-view') == 'front'
    assert not f.locator('#abdomen-fibers').is_checked()
    assert f.locator('#abdomen-transparent').is_checked()
    f.locator('#abdomen-play').click()
    page.wait_for_timeout(650)
    assert state()['privateContent']['playing'] is True
    page.locator('#tab-thigh').click()
    f = abdomen()
    assert f.locator('#abdomen-play').get_attribute('aria-pressed') == 'true'
    f.locator('#abdomen-play').click()
    stopped = f.locator('#abdomen').get_attribute('data-angle')
    page.wait_for_timeout(150)
    assert stopped == f.locator('#abdomen').get_attribute('data-angle')
    # Legacy degrees must never be restored as the new progress percentage.
    page.evaluate("localStorage.setItem('anatomy-hub-v1',JSON.stringify({active:'abdomen',states:{abdomen:{modelContent:{angle:15,camera:'front',fibers:false,transparent:true},privateContent:{playing:true}}}}))")
    page.reload()
    f = page.frame_locator('#anatomy-frame')
    f.locator('#abdomen').wait_for()
    assert f.locator('#abdomen-value').inner_text() == '100%'
    assert f.locator('#abdomen').get_attribute('data-view') == 'side'
    assert f.locator('#abdomen-play').get_attribute('aria-pressed') == 'false'
    f.locator('#abdomen-fibers').check()
    f.locator('#abdomen-transparent').uncheck()
    page.screenshot(path=str(out/'desktop.png'))
    for width, height in [(320,700),(390,844),(680,700),(1000,650)]:
        page.set_viewport_size({'width':width,'height':height})
        for view in ['front','side']:
            f.locator('#abdomen-'+view).click()
            page.wait_for_timeout(200)
            assert f.locator('#abdomen').evaluate('r=>document.documentElement.scrollWidth<=innerWidth')
            # On short screens the existing viewer scrolls vertically; controls
            # must remain reachable instead of shrinking the artwork to a dot.
            f.locator('.diagram-note').scroll_into_view_if_needed()
            assert f.locator('.diagram-note').evaluate('n=>n.getBoundingClientRect().bottom<=innerHeight+1'), (width,height)
            assert f.locator('#abdomen-angle').is_visible()
        if width == 390: page.screenshot(path=str(out/'mobile.png'))
    # Touch controls occupy more height than desktop controls at the same width.
    mobile = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    m = mobile.new_page()
    m.on('pageerror',lambda e:errors.append(str(e)))
    m.goto(url)
    m.locator('#tab-abdomen').click()
    mf = m.frame_locator('#anatomy-frame')
    mf.locator('#abdomen').wait_for()
    m.wait_for_timeout(250)
    mf.locator('.diagram-note').scroll_into_view_if_needed()
    assert mf.locator('.diagram-note').evaluate('n=>n.getBoundingClientRect().bottom<=innerHeight+1')
    mf.locator('#abdomen-front').click()
    m.screenshot(path=str(out/'touch-front.png'))
    assert not errors, errors
    browser.close()
(out/'verification.json').write_text(json.dumps({'errors':errors,'state_restore':'passed','legacy_migration':'passed','sandbox':'passed','mobile_and_touch_controls':'passed','other_topics_unchanged':True},indent=2))
print('PASS: sandbox, tab/reload/playback state, legacy migration, desktop/mobile/touch controls; other embedded topics unchanged.')
