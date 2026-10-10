"""Regression for raised-pose latissimus faces crossing the scapular blade.

Uses denser face sampling than the old vertex-only guard, including every
interpolated integer angle. Signed distances use the existing 1.25-unit bone
field; this is a local regression check, not certification of all mesh contact.
"""
from pathlib import Path
import base64
import json
import runpy
import subprocess
import numpy as np

w = Path(__file__).resolve().parent
data = json.loads((w / 'atlas-data.json').read_text())
before = json.loads(subprocess.check_output(['git', 'show', '7c5b52905fdef0621795a86854d39a25262ed506:work/upperbody/atlas-data.json'], cwd=w))
parts = [p for p in data['parts'] if not p.get('mirrorOf')]
lat = next(p for p in parts if p['name'] == 'latissimus')
v, faces = np.asarray(lat['v']), np.asarray(lat['f'])
contact = runpy.run_path(str(w / 'bone-contact.py'))['BoneContact'](parts)
transforms = runpy.run_path(str(w / 'shoulder-rig.py'))['transforms']
field = next(f for f in contact.fields if f['name'] == 'scapula')
weights = np.array([[a / 9, b / 9, 1 - (a + b) / 9] for a in range(10) for b in range(10 - a)])
source = np.einsum('sj,fjk->fsk', weights, v[faces]).reshape(-1, 3)
mask = (contact.sample(field, source) > 1)
samples = np.flatnonzero(mask)
face_ids, bary = samples // len(weights), weights[samples % len(weights)]
count, offset = len(v) * 3, lat['frameOffset']

def decode(model):
    part = next(p for p in model['parts'] if p['name'] == 'latissimus')
    start = part['frameOffset']
    return [(f['angle'], np.frombuffer(base64.b64decode(f['displacement']), dtype='<i2')[start:start + len(part['v']) * 3].reshape(-1, 3) / 50) for f in model['frames']]

current, previous = decode(data), decode(before)
def clearance(deltas, angle):
    index = next((i for i in range(len(deltas) - 1) if deltas[i][0] <= angle <= deltas[i + 1][0]), len(deltas) - 2)
    a, b = deltas[index:index + 2]
    t = (angle - a[0]) / (b[0] - a[0])
    posed = v + (1 - t) * a[1] + t * b[1]
    points = np.einsum('ij,ijk->ik', bary, posed[faces[face_ids]])
    frame = transforms(data['rig'], angle)['scapula']([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]])
    matrix = (frame[1:] - frame[0]).T
    distances = contact.sample(field, (points - frame[0]) @ matrix)
    return float(distances.min()), int(np.sum(distances < -.25))

audit = []
for angle in range(15, 121):
    distance, crossings = clearance(current, angle)
    old_distance, old_crossings = clearance(previous, angle)
    audit.append({'angle': angle, 'minClearance': distance, 'crossings': crossings,
                  'previousMinClearance': old_distance, 'previousCrossings': old_crossings})
report = {'samplesPerAngle': len(samples),
          'raisedAngles': len(audit), 'worstClearance': min(p['minClearance'] for p in audit),
          'crossings': sum(p['crossings'] for p in audit),
          'previousCrossings': sum(p['previousCrossings'] for p in audit),
          'poses': audit, 'scope': 'Previously clear native latissimus transition faces, sampled against the existing scapular signed-distance field. Excludes native contact/overlap; not exact triangle intersection certification.'}
(w / 'contact-validation.json').write_text(json.dumps(report, indent=2))
print(json.dumps({k: value for k, value in report.items() if k != 'poses'}, indent=2))
assert report['crossings'] == 0, 'Raised-pose face penetration remains'
assert report['previousCrossings'] > 0, 'Regression fixture did not exercise the reported fault'
