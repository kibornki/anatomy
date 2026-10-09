"""Build the reviewed abdominal flexion and axial rotation page."""
from pathlib import Path
import re, json, sys
w=Path(__file__).resolve().parent;root=w.parents[1]
head=(w/'page-template.html').read_text().replace('몸통 굽힘','몸통 움직임')
head=re.sub(r'<div class="text-small diagram-caption">.*?</div>','<div class="text-small diagram-caption">전거근·외복사근·내복사근·복직근·광배근</div>',head)
head=re.sub(r'<div class="text-small diagram-note">.*?</div>','<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div>',head)
head=head.replace('aria-pressed="true">일시정지','aria-pressed="false">재생').replace('min="-10" max="45" value="15"','min="0" max="100" value="0"').replace('>15°</output>','>0%</output>')
head=head.replace('<label class="form-label" for="abdomen-angle">몸통 움직임','<label class="form-label" for="abdomen-angle"><span id="abdomen-motion-label">몸통 말기</span>')
head=head.replace('>측면</button></div>','>측면</button><button type="button" class="btn" id="abdomen-twist" aria-pressed="false">비틀기</button></div>')
head=re.sub(r'<desc id="abdomen-desc">.*?</desc>','<desc id="abdomen-desc">복부와 광배근 도해. 정면과 측면의 상체 척추 C자 말기, 골반을 고정하고 척추 축을 따라 흉추에 주로 회전을 나누고 요추의 회전은 작게 유지하는 비틀기를 제공합니다. 비틀기는 정면과 같은 16도 사선 시점입니다. 근육 외형과 운동 분포는 작화용 근사입니다.</desc>',head)
head=head.replace('</style>','\n'+(w/'style.css').read_text()+'\n</style>')
head=head.replace('<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div>','<div class="text-small diagram-note" id="abdomen-note">골반 고정 · 상체 좌우 비틀기 · 절개창: 내복사근</div><div class="text-small atlas-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a>, © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman</div>')
scripts='\n'.join((w/name).read_text() for name in ['visibility.js','atlas-contours.js','atlas-renderer.js','twist.js','controls.js'])
atlas=(w/'atlas-data.json').read_text().replace('<','\\u003c')
document=head+'<!-- BodyParts3D © DBCLS, CC BY-SA 2.1 Japan; conversion Kevin Mattheus Moerman. -->'+'<script type="application/json" id="abdomen-atlas">'+atlas+'</script><script>'+scripts+'</script></body></html>'
out=root/'drafts/abdomen-twist-reviewed.html';out.write_text(document);print(out)
if '--publish' in sys.argv:
 (root/'abdomen.html').write_text(document)
 hub_path=root/'index.html';hub=hub_path.read_text();match=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(match[2])
 config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
 data['abdomen'].update(document=document.replace('<body>','<body>'+config,1),movement='말기 · 비틀기',views=['front','side','twist'],sourceFile='work/abdomen/twist.js')
 payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c');hub=hub[:match.start(2)]+payload+hub[match.end(2):];hub=hub.replace('<span class="movement">몸통 말기</span>','<span class="movement">말기 · 비틀기</span>');hub_path.write_text(hub)
