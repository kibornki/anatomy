"""Exercise local photo landmarks, morph controls, persistence and mobile UI."""
from pathlib import Path
import json
import struct
import zlib
from playwright.sync_api import sync_playwright, expect

w = Path(__file__).resolve().parent
root = w.parents[1]
out = Path('/workspace/artifacts/body-fit')
out.mkdir(parents=True, exist_ok=True)

def image_fixture():
    def chunk(kind, content):
        return struct.pack('>I', len(content)) + kind + content + struct.pack('>I', zlib.crc32(kind + content))
    raw = b''.join(b'\0' + bytes([160, 160, 160]) * 600 for _ in range(800))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 600, 800, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1000, 'height': 1300})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content((root / 'upperbody.html').read_text())
    page.wait_for_function('()=>!!window.nativeUpperbody')
    page.locator('#upperbody-body-fit summary').click()
    page.locator('#upperbody-shape-width').fill('104')
    page.locator('#upperbody-shape-width').dispatch_event('input')
    assert page.evaluate('nativeUpperbody.model.motion.getShape().width') == 1.04
    for view in ['front', 'back', 'side']:
        page.evaluate('(v)=>nativeUpperbody.setPose(120,v)', view)
        page.locator('#upperbody > svg').screenshot(path=str(out / f'final-{view}.png'))
    page.locator('#upperbody-transparent').check()
    assert page.locator('#upperbody').evaluate('(e)=>e.classList.contains("transparent")')
    page.locator('#upperbody-transparent').uncheck()
    page.locator('#upperbody-shape-reset').click()
    assert page.locator('#upperbody-shape-width-value').inner_text() == '100%'
    page.locator('#upperbody-photo').set_input_files({'name': 'reference.png', 'mimeType': 'image/png', 'buffer': image_fixture()})
    page.wait_for_function('()=>document.getElementById("upperbody-photo-image").naturalWidth===600')
    assert page.locator('#upperbody-photo-apply').is_disabled()
    def mark(points):
        for point in points:
            page.evaluate('''([x,y])=>{const svg=document.getElementById('upperbody-photo-marks'),p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());svg.dispatchEvent(new MouseEvent('click',{clientX:q.x,clientY:q.y,bubbles:true}));}''', point)
    # Ratio fixture within the supported band, independent of pixel resolution.
    mark([[300, 100], [300, 700], [76, 350], [524, 350]])
    assert page.locator('#upperbody-photo-apply').is_enabled()
    page.locator('#upperbody-photo-apply').click()
    reference = json.loads((w / 'body-fit-data.json').read_text())['reference']
    expected = (448 / 600) / reference['widthToLength']
    assert abs(page.evaluate('nativeUpperbody.model.motion.getShape().width') - expected) < .005
    page.locator('#upperbody-photo-undo').click()
    assert page.locator('#upperbody-photo-apply').is_disabled()
    page.locator('#upperbody-photo-view').select_option('side')
    mark([[300, 100], [300, 700], [136, 350], [464, 350]])
    page.locator('#upperbody-photo-apply').click()
    assert abs(page.evaluate('nativeUpperbody.model.motion.getShape().depth') - (328 / 600) / reference['depthToLength']) < .005
    page.locator('#upperbody-photo-clear').click()
    assert page.locator('#upperbody-photo-wrap').is_hidden()
    assert page.locator('#upperbody-photo-image').get_attribute('src') is None
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(out / 'final-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=390')
    page.locator('#upperbody-play').click()
    page.wait_for_timeout(600)
    assert page.locator('#upperbody-play').get_attribute('aria-pressed') == 'true'
    page.locator('#upperbody-play').click()
    page.set_content((root / 'index.html').read_text())
    page.locator('#tab-upperbody').click()
    frame = page.frame_locator('#anatomy-frame')
    frame.locator('#upperbody-body-fit summary').click()
    page.evaluate("window.__fitState=null;addEventListener('message',e=>{if(e.data?.type==='anatomy-hub-state')window.__fitState=e.data.state})")
    frame.locator('#upperbody-shape-width').fill('103')
    frame.locator('#upperbody-shape-width').dispatch_event('input')
    page.wait_for_function('()=>window.__fitState?.modelContent?.bodyShape?.width===1.03')
    page.locator('#tab-arm').click()
    frame.locator('#arm').wait_for()
    page.locator('#tab-upperbody').click()
    frame.locator('#upperbody').wait_for()
    frame.locator('#upperbody-body-fit summary').click()
    expect(frame.locator('#upperbody-shape-width-value')).to_have_text('103%', timeout=15000)
    assert not errors, errors
    report = {'photoUpload': True, 'frontLandmarkRatio': True, 'sideLandmarkRatio': True, 'undoAndClear': True, 'shapeControls': True, 'reset': True, 'playback': True, 'transparency': True, 'mobileOverflow': False, 'hubShapeRestoration': True, 'browserErrors': errors}
    (w / 'body-fit-ui-validation.json').write_text(json.dumps(report, indent=2))
    print(report)
    browser.close()
