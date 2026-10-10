"""Linear torso proportion derivatives with rigid shoulder/arm attachments.

Extends the already reviewed pose surface, without fitting new tissue anatomy.
Each derivative resizes the bones once
in neutral coordinates and transported rigidly. Free muscle corrections use
Dirichlet harmonic extension from the existing anatomical attachment bands.
"""
from pathlib import Path
import base64
import hashlib
import json
import runpy
import numpy as np
from scipy.sparse.linalg import factorized
from scipy.spatial import cKDTree

w = Path(__file__).parent
data = json.loads((w / 'atlas-data.json').read_text())
parts = [p for p in data['parts'] if not p.get('mirrorOf')]
Fit = runpy.run_path(str(w / 'attachment-fit.py'))['AttachmentFit']
transforms = runpy.run_path(str(w / 'shoulder-rig.py'))['transforms']
center = np.array([0, 380, 45.])
axes = {'width': 0, 'length': 1, 'depth': 2}
channels = {name: [] for name in axes}
fits = {}
bindings = {}
for p in parts:
    if p['kind'] != 'muscle':
        continue
    fit = Fit(p, parts)
    # Use the saved attachment indices, not reclassified anatomical bands.
    band = p['attachments']
    fixed = np.array(sorted(set(band['origin'] + band['insertion'])))
    free = np.setdiff1d(np.arange(len(p['v'])), fixed)
    solve = factorized(fit.lap[free][:, free].tocsc())
    fits[p['name']] = (fixed, free, fit.lap[free][:, fixed], solve)
    if not p.get('surfaceGuides'):
        pts = np.array([point for fiber in p['fibers'] for point in fiber])
        dist, ids = cKDTree(p['v']).query(pts, k=3)
        weight = 1 / np.maximum(dist, 1e-8)**2
        weight /= weight.sum(axis=1)[:, None]
        bindings[p['name']] = [[[int(i), round(float(s), 8)] for i, s in zip(row, weights)] for row, weights in zip(ids, weight)]

for name, axis in axes.items():
    def resize(q):
        q = np.asarray(q).copy()
        q[..., axis] = center[axis] + (q[..., axis] - center[axis]) * 1.1
        return q
    rig = {**data['rig'], **{key: resize(data['rig'][key]).tolist() for key in ['sc', 'ac', 'gh']}}
    shift = np.asarray(rig['gh']) - data['rig']['gh']
    for frame in data['frames']:
        values = np.frombuffer(base64.b64decode(frame['displacement']), dtype='<i2') / 50
        old_rig, new_rig = transforms(data['rig'], frame['angle']), transforms(rig, frame['angle'])
        result = []
        for p in parts:
            if p['kind'] != 'muscle':
                continue
            v = np.asarray(p['v']);off = p['frameOffset']
            q = v + values[off:off + len(v) * 3].reshape(-1, 3)
            delta = resize(q) - q
            fixed, free, coupling, solve = fits[p['name']]
            band = p['attachments'];clavicular = set(band['clavicularInsertion'])
            boundary = {}
            for ids, bone in [(band['origin'], band['originBone']), (band['insertion'], band['insertionBone'])]:
                for i in ids:
                    key = 'clavicle' if i in clavicular else bone
                    neutral = resize(v[i:i+1])
                    boundary[i] = new_rig[key](neutral)[0] - old_rig[key](v[i:i+1])[0] - delta[i]
            correction = np.zeros_like(v)
            correction[fixed] = [boundary[i] for i in fixed]
            rhs = -coupling @ correction[fixed]
            correction[free] = np.column_stack([solve(rhs[:, k]) for k in range(3)])
            result.extend(((delta + correction) * 10).reshape(-1).tolist())
        encoded = np.rint(np.array(result) * 50).astype('<i2')
        channels[name].append({'angle': frame['angle'], 'displacement': base64.b64encode(encoded.tobytes()).decode()})

ribs = np.concatenate([p['v'] for p in parts if p['kind'] == 'rib'])
height = center[1] - data['rig']['sc'][1]
off = 0;offsets = {}
for p in parts:
    if p['kind'] == 'muscle':
        offsets[p['name']] = off;off += len(p['v']) * 3
out = {'sourceFingerprint': hashlib.sha256((w / 'atlas-data.json').read_bytes()).hexdigest(), 'revision': 'torso-proportions-v1', 'center': center.tolist(), 'range': [.95, 1.05], 'offsets': offsets, 'channels': channels, 'fiberBindings': bindings,
       'reference': {'widthToLength': float(2 * ribs[:,0].max() / height), 'depthToLength': float(np.ptp(ribs[:,2]) / height)},
       'scope': 'Photo landmark ratios and small torso proportion changes, with bones resized once in neutral coordinates and anatomical attachment corrections. Not muscle mass, tissue reconstruction or measured individual anatomy.'}
contact = runpy.run_path(str(w / 'bone-contact.py'))['BoneContact'](parts)
field = next(f for f in contact.fields if f['name'] == 'scapula')
lat = next(p for p in parts if p['name'] == 'latissimus')
free = np.ones(len(lat['v']), bool)
free[lat['attachments']['origin'] + lat['attachments']['insertion']] = False
saved = {k: value for k, value in field.items() if k != 'grid'}
saved['data'] = base64.b64encode(np.rint(field['grid'] * 16).astype('<i2').tobytes()).decode()
out['latissimusScapulaGuard'] = {'field': saved, 'vertices': np.flatnonzero(free & (contact.sample(field, np.asarray(lat['v'])) > 1)).tolist()}
(w / 'body-fit-data.json').write_text(json.dumps(out, separators=(',', ':')))
print('Prepared body proportions:', off // 3, 'muscle vertices; 3 axes x',len(data['frames']),'poses')
