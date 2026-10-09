"""Build the isolated abdomen draft using the published controls and bone paths."""
from pathlib import Path
import re
w = Path(__file__).resolve().parent
root = w.parents[1]
page = (root / 'abdomen.html').read_text()
head = page[:page.index('<script type="application/json"')]
head = re.sub(r'<h2>.*?</h2>', '<h2>복부 근육과 몸통 굽힘</h2>', head)
head = re.sub(r'<div class="text-small diagram-caption">.*?</div>', '<div class="text-small diagram-caption">전거근·외복사근·내복사근·복직근</div>', head)
head = re.sub(r'<div class="text-small diagram-note">.*?</div>', '<div class="text-small diagram-note">0°: 바르게 폄 · 45°: 말기 · 곡선 절개창으로 내복사근 표시</div>', head)
head = head.replace('aria-pressed="true">일시정지', 'aria-pressed="false">재생')
head = head.replace('value="15"', 'value="0"').replace('>15°</output>', '>0°</output>')
head = head.replace('<g class="diagram-volumes"></g>', '<g class="diagram-volumes"></g>')
head = head.replace('</style>', '\n' + (w/'style.css').read_text() + '\n</style>')
scripts = '\n'.join((w/name).read_text() for name in ['classic-coronal-anatomy.js','classic-side-anatomy.js','side-skeleton.js','artwork.js','controls.js'])
out = w.parent/'abdomen-v2.html'
out.write_text(head+'<script>'+scripts+'</script></body></html>')
print(out)
