"""Add the two dashboard tabs without changing embedded anatomy documents."""
from pathlib import Path
import json
import re
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
path = ROOT / 'index.html'
hub = path.read_text(encoding='utf-8')
backup = ROOT / 'artifacts/pre-dashboard-index.html'
if not backup.exists():
    shutil.copy2(path, backup)

# Strip the complete dashboard shell on later asset updates.
hub = re.sub(r'<!-- dashboard-start -->.*?<!-- dashboard-end -->\s*', '', hub, flags=re.S)
hub = re.sub(r'<style id="dashboard-style">.*?</style>\s*', '', hub, flags=re.S)
hub = re.sub(r'<script type="application/json" id="photo-data">.*?</script>\s*', '', hub, flags=re.S)
hub = re.sub(r'<script id="dashboard-controls">.*?</script>\s*', '', hub, flags=re.S)
hub = re.sub(r'<script>\s*\(\(\)=>\{\s*const topics=JSON\.parse\(document\.getElementById\(\'anatomy-data\'\)\.textContent\);.*?\}\)\(\);\s*</script>\s*', '', hub, count=1, flags=re.S)
hub = hub.replace("img-src data:; frame-src", "img-src 'self' data:; frame-src", 1)
hub = hub.replace('<title>근육과 움직임 · 해부학 애니메이션</title>', '<title>근육과 움직임 · 실사비교와 해부학</title>', 1)
hub = hub.replace('    <div class="brand"><h1>근육과 움직임</h1><p>해부학 애니메이션</p></div>\n', '', 1)
hub = hub.replace('</head>', '<style id="dashboard-style">\n' + (HERE / 'style.css').read_text(encoding='utf-8') + '\n</style>\n</head>', 1)
hub = hub.replace('<body>\n', '<body>\n' + (HERE / 'layout.html').read_text(encoding='utf-8') + '\n', 1)
hub = hub.replace('<p class="sr-only" id="selection-status"', '<!-- dashboard-anatomy-end -->\n  </section>\n</div>\n<!-- dashboard-end -->\n<p class="sr-only" id="selection-status"', 1)
photos = json.loads((HERE / 'photos.json').read_text(encoding='utf-8'))
muscle_labels = json.loads((HERE / 'muscle-labels.json').read_text(encoding='utf-8'))
for photo in photos:
    if photo['id'] in muscle_labels:
        photo['muscleLabels'] = muscle_labels[photo['id']]
data = json.dumps(photos, ensure_ascii=False).replace('<', '\\u003c')
scripts = '<script type="application/json" id="photo-data">' + data + '</script>\n<script id="dashboard-controls">\n' + (HERE / 'controls.js').read_text(encoding='utf-8') + '\n' + (HERE / 'anatomy-controls.js').read_text(encoding='utf-8') + '\n</script>\n'
hub = hub.replace('</body>', scripts + '</body>', 1)
path.write_text(hub, encoding='utf-8')
print(f'Updated dashboard with {len(photos)} photo studies; embedded anatomy data retained.')
