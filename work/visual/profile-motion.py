"""Measure real hub pose changes and record drawings for before/after comparison."""
from pathlib import Path
from collections import Counter
import argparse
import hashlib
import json
import statistics
import shutil
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('phase', choices=['before', 'after'])
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
out = root / 'artifacts/motion-performance' / args.phase
out.mkdir(parents=True, exist_ok=True)
regions = {'upperbody': 'nativeUpperbody', 'arm': 'armAtlas',
           'abdomen': 'abdomenDraft', 'forearm': 'nativeLimb', 'thigh': 'nativeLimb'}
if args.phase == 'before':
    for name in ['index', *regions]:
        shutil.copy2(root / (name + '.html'), out / (name + '.html'))

errors, cases, playback, profiles = [], [], [], []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, bypass_csp=True)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8766/index.html', wait_until='load')
    page.locator('#dashboard-tab-anatomy').click()
    for region, api in regions.items():
        page.locator('#tab-' + region).click()
        frame = page.locator('#anatomy-frame').element_handle().content_frame()
        frame.wait_for_function('!!window.' + api)
        frame.evaluate('''api=>{
          const stats=window.__motionStats={render:[],solve:0,contour:0,solveCalls:0};
          for(const name of ['AbdominalVisibility']){
            if(!window[name])continue;const original=window[name];
            window[name]=(...args)=>{const buffer=original(...args),solve=buffer.solve;
              buffer.solve=(...args)=>{const t=performance.now();const result=solve(...args);
                stats.solve+=performance.now()-t;stats.solveCalls++;return result;};return buffer;};
          }
          const contour=window.AtlasContour;
          window.AtlasContour=(...args)=>{const t=performance.now();const result=contour(...args);
            stats.contour+=performance.now()-t;return result;};
          const model=window[api].model,render=model.render;
          model.render=(...args)=>{const t=performance.now();const result=render(...args);
            stats.render.push(performance.now()-t);return result;};
        }''', api)
        for mode in ['anatomy', 'sculpt', 'compare']:
            frame.evaluate('([api,mode])=>window[api].setMode(mode)', [api, mode])
            result = frame.evaluate('''api=>{
              const model=window[api],stats=window.__motionStats;
              model.setPose(26,'front');model.setPose(31,'front');
              stats.render=[];stats.solve=stats.contour=stats.solveCalls=0;
              const times=[],coverage=[];
              for(const angle of [35,42,49,56,63,70,77,84]){
                const t=performance.now();model.setPose(angle,'front');times.push(performance.now()-t);
                const d=model.model.debug||model.model.flexion?.debug;
                coverage.push(d?.coverage||d?.visible?.coverage||[]);
              }
              return {times,render:stats.render,solveMs:stats.solve,contourMs:stats.contour,
                solveCalls:stats.solveCalls,coverage};
            }''', api)
            frame.evaluate('api=>window[api].setPose(60,"front")', api)
            svg = frame.locator('svg').first
            markup = svg.evaluate('(svg)=>svg.outerHTML')
            result.update(region=region, mode=mode, medianMs=statistics.median(result['times']),
                          svgSha256=hashlib.sha256(markup.encode()).hexdigest())
            cases.append(result)
            svg.screenshot(path=str(out / f'{region}-{mode}.png'))
            print(region, mode, 'median pose ms', round(result['medianMs'], 1),
                  'solve ms/pose', round(result['solveMs']/8, 1),
                  'contour ms/pose', round(result['contourMs']/8, 1), flush=True)
        if region in ['upperbody', 'thigh']:
            frame.evaluate('api=>{window[api].setMode("anatomy");window.__motionStats.render=[]}', api)
            page.locator('[data-hub-action=play]').click()
            page.wait_for_timeout(3000)
            page.locator('[data-hub-action=play]').click()
            times = frame.evaluate('window.__motionStats.render')
            playback.append(dict(region=region, sampleSeconds=3, renderCalls=len(times),
                                 medianRenderMs=statistics.median(times) if times else None))
        if region == 'upperbody':
            session = page.context.new_cdp_session(frame)
            session.send('Profiler.enable');session.send('Profiler.start')
            frame.evaluate('''api=>{const model=window[api];for(let i=0;i<20;i++)model.setPose(36+i*2,'front')}''', api)
            profile = session.send('Profiler.stop')['profile']
            nodes = {n['id']: n['callFrame'] for n in profile['nodes']}
            samples = Counter()
            for node, delta in zip(profile.get('samples', []), profile.get('timeDeltas', [])):
                samples[nodes[node]['functionName'] or '(anonymous)'] += delta
            profiles.append(dict(region=region, topSelfTimeMs=[(name, round(t/1000, 1)) for name,t in samples.most_common(15)]))
            session.detach()
    browser.close()
report = dict(phase=args.phase, viewport=[1280,900], cases=cases, playback=playback,
              cpuProfiles=profiles, pageErrors=errors)
(out/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
assert not errors, errors
print(json.dumps({'playback':playback,'profiles':profiles,'pageErrors':errors}), flush=True)
