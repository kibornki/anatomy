"""Sample latissimus contact across the tested body shape extremes."""
from pathlib import Path
import json, base64, runpy, numpy as np
w = Path(__file__).resolve().parent
data = json.loads((w / 'atlas-data.json').read_text())
cases = json.loads((Path(__import__('tempfile').gettempdir()) / 'anatomy-body-fit-poses.json').read_text())
parts = [p for p in data['parts'] if not p.get('mirrorOf')]
lat = next((p for p in parts if p['name'] == 'latissimus'))
v = np.array(lat['v'])
f = np.array(lat['f'])
contact = runpy.run_path(str(w / 'bone-contact.py'))['BoneContact'](parts)
core = (w.parent / 'arm/bone-fields.py').read_text()
core = core[core.index('step=1.25'):core.index("(w/'bone-fields.json')")].replace("if part['name'] not in ['humerus','ulna','radius']:continue", 'if False:continue')
weights = np.array([[a / 9, b / 9, 1 - (a + b) / 9] for a in range(10) for b in range(10 - a)])
source = np.einsum('sj,fjk->fsk', weights, v[f]).reshape(-1, 3)
free = np.ones(len(v), bool)
free[lat['attachments']['origin'] + lat['attachments']['insertion']] = False
mutable = np.einsum('sj,fj->fs', weights, free[f]).reshape(-1) > 0
neighbors = ['serratus', 'teres-major', 'trapezius-lower', 'scapula', 'humerus', 'clavicle']

def fields(ps):
    import hashlib
    cache = Path(__import__('tempfile').gettempdir()) / 'anatomy-body-fit-contact'
    cache.mkdir(exist_ok=True)
    key = hashlib.sha256(json.dumps(ps, separators=(',', ':')).encode()).hexdigest()[:16]
    file = cache / (key + '.json')
    if file.exists():
        out = json.loads(file.read_text())
    else:
        scope = {'atlas': {'parts': ps}, 'fields': []}
        exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n' + core, scope)
        out = scope['fields']
        file.write_text(json.dumps(out, separators=(',', ':')))
    for field in out:
        field['grid'] = np.frombuffer(base64.b64decode(field.pop('data')), dtype='<i2').reshape(field['shape']) / 16
    return out

masks = {field['name']: mutable & (contact.sample(field, source) > 1) for field in fields([p for p in parts if p['name'] in neighbors])}
report = []
for case in cases:
    posed = next((p for p in case['parts'] if p['name'] == 'latissimus'))
    points = np.einsum('sj,fjk->fsk', weights, np.array(posed['v'])[f]).reshape(-1, 3)
    r = {'shape': case['shape'], 'angle': case['angle'], 'fields': {}}
    for field in fields([p for p in case['parts'] if p['name'] in neighbors]):
        d = contact.sample(field, points[masks[field['name']]])
        r['fields'][field['name']] = {'min': float(d.min()), 'crossings': int(np.sum(d < -0.25))}
    report.append(r)
    print(r, flush=True)
(w / 'body-fit-contact-validation.json').write_text(json.dumps({'profilesAndPoses': report, 'scope': '55 samples per triangle on previously source-clear free latissimus faces; rigid attachment-only samples and native overlap exempt. Voxel approximation, crossing threshold -0.25. Checks selected poses, not all shapes and continuous contact.'}, indent=2))
assert not any((v['crossings'] for r in report for v in r['fields'].values())), 'Additional latissimus tissue contact remains'
