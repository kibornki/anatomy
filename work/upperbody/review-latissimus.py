"""Material partition, surface binding and scope checks, not physiology."""
from pathlib import Path
import base64
import json
import subprocess
import re
import numpy as np

w = Path(__file__).parent
root = w.parents[1]
data = json.loads((w / 'atlas-data.json').read_text())
old = json.loads(subprocess.check_output(['git', 'show', 'HEAD:work/upperbody/atlas-data.json'], cwd=root))
previous = {p['name']: p for p in old['parts']}
assert data['rig'] == old['rig'] and data['cameraYaw'] == old['cameraYaw']

def area(points):
    return sum(np.linalg.norm(np.cross(points[j] - points[0], points[j + 1] - points[0])) / 2 for j in range(1, len(points) - 1))

partition_error = 0
guide_points = 0
for part in data['parts']:
    before = previous[part['name']]
    assert part['v'] == before['v'] and part['f'] == before['f']
    if not part['name'].startswith('latissimus'):
        assert part['fibers'] == before['fibers']
        continue
    v, f = np.asarray(part['v']), np.asarray(part['f'])
    origins = np.array([path['origin'] for path in part['regionalPathways']])
    assert np.max(np.abs(origins[:, 0])) <= .8 + 1e-8
    assert origins[:, 1].min() < 250 and origins[:, 1].max() < 390
    for path in part['regionalPathways']:
        target = np.array(path['humeralInsertion'])
        insertion = v[np.array(part['attachments']['insertion'], dtype=int), :2]
        assert np.linalg.norm(insertion - target, axis=1).min() < 1e-7
        fold = np.array(path['axillaryFold'])
        assert abs(fold[0]) >= 92 and 230 < fold[1] < 244
    areas = np.zeros(len(f))
    for patches in part['tissuePatches'].values():
        for patch in patches:
            weights = np.asarray(patch['weights'])
            assert weights.min() >= -1e-9 and np.max(abs(weights.sum(1) - 1)) < 1e-8
            areas[patch['face']] += area(weights @ v[f[patch['face']]])
    original_areas = np.array([area(points) for points in v[f]])
    error = float(np.max(abs(areas - original_areas)))
    assert error < 1e-7
    partition_error = max(partition_error, error)
    for guide in part['surfaceGuides']:
        for face, *weights in guide['points']:
            assert 0 <= face < len(f) and min(weights) >= -1e-7 and abs(sum(weights) - 1) < 2e-8
            guide_points += 1

for frame, before in zip(data['frames'], old['frames']):
    assert frame['angle'] == before['angle']
    a = np.frombuffer(base64.b64decode(frame['displacement']), dtype='<i2')
    b = np.frombuffer(base64.b64decode(before['displacement']), dtype='<i2')
    for part in data['parts']:
        if part['kind'] != 'muscle' or part.get('mirrorOf'):
            continue
        count = len(part['v']) * 3
        if part['name'] != 'latissimus':
            count += sum(len(fiber) * 3 for fiber in part['fibers'])
        before_part = previous[part['name']]
        current_slice = a[part['frameOffset']:part['frameOffset'] + count]
        previous_slice = b[before_part['frameOffset']:before_part['frameOffset'] + count]
        if part['name'] == 'latissimus':
            baseline = np.frombuffer(base64.b64decode(frame['latissimusAxillaryBase']), dtype='<i2')
            assert np.array_equal(baseline, previous_slice)
            locked = part['attachments']['origin'] + part['attachments']['insertion']
            assert np.array_equal(current_slice.reshape(-1, 3)[locked], baseline.reshape(-1, 3)[locked])
        else:
            assert np.array_equal(current_slice, previous_slice)

def hub(text):
    return json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>', text, re.S)[1])

current_hub = hub((root / 'index.html').read_text())
before_hub = hub(subprocess.check_output(['git', 'show', 'HEAD:index.html'], cwd=root).decode())
for key in before_hub:
    if key != 'upperbody':
        assert current_hub[key] == before_hub[key], key
report = {'frames': len(data['frames']), 'guidePoints': guide_points,
          'maxMaterialPartitionAreaError': partition_error,
          'nativeNeutralSurfacesUnchanged': True, 'otherMusclesAndPosesUnchanged': True,
          'latissimusAttachmentsUnchanged': True,
          'otherHubTopicsUnchanged': True,
          'regionalOriginsAtMedialBand': True,
          'endpointChosenFromNativeHumeralInsertion': True,
          'waypointAtLateralAxillaryTransition': True,
          'scope': 'Triangle material partition and surface-attached authored guides; borders and paths are illustrative, not measured anatomical segmentation or fascicle data.'}
(w / 'latissimus-validation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
