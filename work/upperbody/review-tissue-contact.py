"""Check saved and halfway poses for added free-face muscle penetration.

Preserve source overlaps and fixed attachment-only samples. The signed-distance
field is a voxel approximation; this does not certify exact triangle contact.
"""
from pathlib import Path
import base64
import hashlib
import json
import runpy
import tempfile
import numpy as np

w = Path(__file__).resolve().parent
data = json.loads((w / 'atlas-data.json').read_text())
parts = [p for p in data['parts'] if not p.get('mirrorOf')]
lat = next(p for p in parts if p['name'] == 'latissimus')
v, f = np.asarray(lat['v']), np.asarray(lat['f'])
free = np.ones(len(v), bool)
free[lat['attachments']['origin'] + lat['attachments']['insertion']] = False
weights = np.array([[a / 9, b / 9, 1 - (a + b) / 9] for a in range(10) for b in range(10 - a)])
faces = np.repeat(f, len(weights), axis=0)
bary = np.tile(weights, (len(f), 1))
source = np.einsum('ij,ijk->ik', bary, v[faces])
mutable = np.sum(bary * free[faces], axis=1) > 1e-8
contact = runpy.run_path(str(w / 'bone-contact.py'))['BoneContact'](parts)
core = (w.parent / 'arm/bone-fields.py').read_text()
core = core[core.index('step=1.25'):core.index("(w/'bone-fields.json')")].replace("if part['name'] not in ['humerus','ulna','radius']:continue", 'if False:continue')
cache = Path(tempfile.gettempdir()) / 'anatomy-face-clearance'
cache.mkdir(exist_ok=True)


def fields(ps):
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


neighbors = [p for p in parts if p['name'] in ['serratus', 'teres-major', 'trapezius-lower']]
masks = {field['name']: (contact.sample(field, source) > 1) & mutable for field in fields(neighbors)}
frames = [(p['angle'], np.frombuffer(base64.b64decode(p['displacement']), dtype='<i2') / 50) for p in data['frames']]
audit = []
for angle in np.arange(15, 120.01, 2.5):
    index = min(int((angle - 15) // 5), len(frames) - 2)
    a, b = frames[index:index + 2]
    t = (angle - a[0]) / (b[0] - a[0])
    values = (1 - t) * a[1] + t * b[1]
    off = lat['frameOffset']
    q = v + values[off:off + len(v) * 3].reshape(-1, 3)
    points = np.einsum('ij,ijk->ik', bary, q[faces])
    posed = []
    for p in neighbors:
        o = p['frameOffset']
        posed.append(dict(p, v=(np.asarray(p['v']) + values[o:o + len(p['v']) * 3].reshape(-1, 3)).tolist()))
    result = {'angle': float(angle), 'tissues': {}}
    for field in fields(posed):
        dist = contact.sample(field, points[masks[field['name']]])
        result['tissues'][field['name']] = {'samples': len(dist), 'minClearance': float(dist.min()), 'crossings': int(np.sum(dist < -.25))}
    audit.append(result)
    print(result, flush=True)
report = {'poses': audit, 'crossings': sum(x['crossings'] for p in audit for x in p['tissues'].values()), 'scope': __doc__.strip()}
(w / 'tissue-contact-validation.json').write_text(json.dumps(report, indent=2))
assert report['crossings'] == 0, 'Added free-face tissue penetration remains'
