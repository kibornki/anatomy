"""Build the reviewed abdominal flexion and axial rotation page."""
from pathlib import Path
import re, json, sys
w=Path(__file__).resolve().parent;root=w.parents[1]
head=(w/'page-template.html').read_text().replace('몸통 굽힘','몸통 움직임')
head=head.replace('<div class="diagram-legend text-small"></div>','')
head=re.sub(r'<div class="text-small diagram-caption">.*?</div>','<div class="text-small diagram-caption">전거근·외복사근·내복사근·복직근·광배근</div>',head)
head=re.sub(r'<div class="text-small diagram-note">.*?</div>','<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div>',head)
head=head.replace('aria-pressed="true">일시정지','aria-pressed="false">재생').replace('min="-10" max="45" value="15"','min="0" max="100" value="0"').replace('>15°</output>','>0%</output>')
head=head.replace('<label class="form-label" for="abdomen-angle">몸통 움직임','<label class="form-label" for="abdomen-angle"><span id="abdomen-motion-label">몸통 말기</span>')
head=head.replace('>측면</button></div>','>측면</button><button type="button" class="btn" id="abdomen-twist" aria-pressed="false">비틀기</button></div>')
for control in ['fibers','transparent']:
 head=re.sub(r'<label class="form-check">\s*<input[^>]*id="abdomen-'+control+r'"[^>]*>.*?</label>','',head,count=1,flags=re.S)
mode_controls='''<div class="artist-learning"><div class="artist-mode-buttons" role="group" aria-label="표시 모드">
<button type="button" class="btn" data-abdomen-mode="anatomy" aria-pressed="true">해부학</button><button type="button" class="btn" data-abdomen-mode="sculpt" aria-pressed="false">도형화</button><button type="button" class="btn" data-abdomen-mode="compare" aria-pressed="false">비교</button><button type="button" class="btn" data-abdomen-toggle-muscles>근육 숨기기</button>
<label class="form-check artist-toggle-control"><input type="checkbox" class="form-check-input" id="abdomen-transparent"><span class="form-check-label">근육 반투명</span></label><label class="form-check artist-toggle-control" data-fibers-control><input type="checkbox" class="form-check-input" id="abdomen-fibers" checked><span class="form-check-label">근섬유</span></label>
</div></div>'''
head=head.replace('<div class="diagram-controls">',mode_controls+'<div class="diagram-controls">',1)
head=re.sub(r'<desc id="abdomen-desc">.*?</desc>','<desc id="abdomen-desc">복부와 광배근 도해. 정면과 측면의 상체 척추 C자 말기, 골반을 고정하고 척추 축을 따라 흉추에 주로 회전을 나누고 요추의 회전은 작게 유지하는 비틀기를 제공합니다. 정면은 좌우대칭의 0도 시점이며, 비틀기는 16도 사선 시점입니다. 근육 외형과 운동 분포는 작화용 근사입니다.</desc>',head)
mode_style='''
.artist-learning{display:grid;gap:6px;margin:8px 0 10px}.artist-mode-buttons{display:flex;align-items:center;gap:3px;flex-wrap:wrap}.artist-mode-buttons .btn{border:1px solid color-mix(in srgb,var(--muted-foreground) 30%,var(--background));color:var(--foreground);background:var(--background);padding:3px 5px;font-size:11px}.artist-mode-buttons .btn[aria-pressed=true]{border-color:var(--foreground);background:var(--foreground);color:var(--background)}.artist-mode-buttons .artist-toggle-control{display:inline-flex;align-items:center;gap:4px;min-width:0;min-height:28px;margin:0;padding:0 1px;font-size:11px;white-space:nowrap}.artist-mode-buttons .artist-toggle-control .form-check-input{width:14px;height:14px;margin:0}.artist-mode-buttons .artist-toggle-control .form-check-label{display:inline;min-width:0;min-height:0}
#abdomen[data-mode=anatomy] .sculpt-volumes,#abdomen[data-mode=anatomy] .abdomen-mode-header{display:none}#abdomen[data-mode=sculpt] .diagram-volumes,#abdomen[data-mode=sculpt] .diagram-labels,#abdomen[data-mode=compare] .diagram-labels{display:none}#abdomen[data-mode=compare] .diagram-volumes{clip-path:url(#abdomen-anatomy-half)}#abdomen[data-mode=compare] .sculpt-volumes{clip-path:url(#abdomen-sculpt-half)}#abdomen[data-show-muscles=false] [data-muscle],#abdomen[data-show-muscles=false] .sculpt-volumes [data-kind=muscle]{display:none}.abdomen-mode-header{fill:var(--foreground);font-size:11px;font-weight:700;paint-order:stroke;stroke:var(--background);stroke-width:3px;stroke-linejoin:round}.sculpt-divider{fill:none;stroke:var(--muted-foreground);stroke-width:.7;stroke-dasharray:4 4}.sculpt-facet{stroke:#443a50;stroke-width:.5px;stroke-opacity:.42;vector-effect:non-scaling-stroke;stroke-linejoin:round}.sculpt-outline{stroke:#697486;stroke-width:.8;stroke-opacity:.38}.sculpt-form-lines{fill:none;stroke:var(--foreground);stroke-width:.65;stroke-opacity:.14}.transparent .sculpt-volumes [data-kind=muscle]{opacity:.42}
</style>'''
head=head.replace('</style>','\n'+(w/'style.css').read_text()+mode_style)
head=head.replace('</head>','<style>'+ (root/'work/visual/split-panel-layout.css').read_text() + '</style></head>',1)
head=head.replace('<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div>','<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div><div class="text-small atlas-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a>, © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman</div>')
scripts=(root/'work/visual/label-leaders.js').read_text()+'\n'+(root/'work/visual/landmarks.js').read_text()+'\n'+(root/'work/visual/surface-lighting.js').read_text()+'\n'+(root/'work/composition/composition.js').read_text()+'\n'+'\n'.join((w/name).read_text() for name in ['visibility.js','atlas-contours.js','sculpt-forms.js','atlas-renderer.js','twist.js','controls.js'])+'\n'+(root/'work/visual/hub-bridge.js').read_text()
atlas=(w/'atlas-data.json').read_text().replace('<','\\u003c')
landmarks='<script type="application/json" id="artist-landmarks">'+json.dumps(json.loads((root/'work/visual/artist-landmarks.json').read_text())['abdomen'],ensure_ascii=False)+'</script>'
document=head+landmarks+'<!-- BodyParts3D © DBCLS, CC BY-SA 2.1 Japan; conversion Kevin Mattheus Moerman. -->'+'<script type="application/json" id="abdomen-atlas">'+atlas+'</script><script>'+scripts+'</script></body></html>'
out=root/'drafts/abdomen-twist-reviewed.html';out.write_text(document);print(out)
if '--publish' in sys.argv:
 (root/'abdomen.html').write_text(document)
 hub_path=root/'index.html';hub=hub_path.read_text();match=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(match[2])
 config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
 data['abdomen'].update(document=document.replace('<body>','<body>'+config,1),movement='말기 · 비틀기',views=['front','side','twist'],sourceFile='work/abdomen/atlas-renderer.js')
 payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c');hub=hub[:match.start(2)]+payload+hub[match.end(2):];hub=hub.replace('<span class="movement">몸통 말기</span>','<span class="movement">말기 · 비틀기</span>');hub_path.write_text(hub)
