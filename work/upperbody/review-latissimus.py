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
        assert np.array_equal(a[part['frameOffset']:part['frameOffset'] + count], b[before_part['frameOffset']:before_part['frameOffset'] + count])

def hub(text):
    return json.loads(re.search(r'<script type="application/json" id="anatomy-data">(.*?)</script>', text, re.S)[1])

current_hub = hub((root / 'index.html').read_text())
before_hub = hub(subprocess.check_output(['git', 'show', 'HEAD:index.html'], cwd=root).decode())
for key in before_hub:
    if key != 'upperbody':
        assert current_hub[key] == before_hub[key], key
report = {'frames': len(data['frames']), 'guidePoints': guide_points,
          'maxMaterialPartitionAreaError': partition_error,
          'nativeSurfacesAndPosesUnchanged': True, 'otherMusclesUnchanged': True,
          'otherHubTopicsUnchanged': True,
          'scope': 'Triangle material partition and surface-attached authored guides; borders and paths are illustrative, not measured anatomical segmentation or fascicle data.'}
(w / 'latissimus-validation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
