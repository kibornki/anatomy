"""Build the approved abdomen page; --publish also updates the integrated page."""
from pathlib import Path
import re, json, sys
w = Path(__file__).resolve().parent
root = w.parents[1]
head = (w / 'page-template.html').read_text()
head = re.sub(r'<h2>.*?</h2>', '<h2>복부 근육과 몸통 굽힘</h2>', head)
head = re.sub(r'<div class="text-small diagram-caption">.*?</div>', '<div class="text-small diagram-caption">전거근·외복사근·내복사근·복직근</div>', head)
head = re.sub(r'<div class="text-small diagram-note">.*?</div>', '<div class="text-small diagram-note">0%: 폄 · 100%: 상체 척추를 C자로 말기 · 절개창: 내복사근</div>', head)
head = head.replace('aria-pressed="true">일시정지', 'aria-pressed="false">재생')
head = head.replace('min="-10" max="45" value="15"','min="0" max="100" value="100"').replace('>15°</output>', '>100%</output>')
head = head.replace('몸통 굽힘','몸통 말기')
head = re.sub(r'<desc id="abdomen-desc">.*?</desc>', '<desc id="abdomen-desc">골반을 고정한 채 상체 척추를 점진적으로 C자로 말았다 펴는 복부 도해. 정면은 16도 사선이며 팔뼈를 생략합니다. 전거근, 외복사근, 절개창의 내복사근, 복직근과 근섬유 방향을 보여줍니다.</desc>', head)
head = head.replace('<g class="diagram-volumes"></g>', '<g class="diagram-volumes"></g>')
head = head.replace('</style>', '\n' + (w/'style.css').read_text() + '\n</style>')
scripts = '\n'.join((w/name).read_text() for name in ['classic-coronal-anatomy.js','classic-side-anatomy.js','side-skeleton.js','artwork.js','controls.js'])
out = w.parent/'abdomen-spine-curl.html'
document = head+'<script>'+scripts+'</script></body></html>'
out.write_text(document)
print(out)
if '--publish' in sys.argv:
    (root / 'abdomen.html').write_text(document)
    hub_path = root / 'index.html'
    hub = hub_path.read_text()
    pattern = r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)'
    match = re.search(pattern, hub, re.S)
    data = json.loads(match[2])
    config = '<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
    data['abdomen'].update(document=document.replace('<body>', '<body>'+config, 1), movement='몸통 말기', sourceFile='drafts/abdomen-spine-curl/artwork.js')
    payload = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    hub = hub[:match.start(2)]+payload+hub[match.end(2):]
    hub = hub.replace('<span class="movement">몸통 굽힘</span>', '<span class="movement">몸통 말기</span>')
    hub_path.write_text(hub)
