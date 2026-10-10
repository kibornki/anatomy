"""Illustrative axillary-fold clearance, preserving native attachment bands.

The two fitted muscle shells can overlap after independent shoulder fitting.
Keep the free lateral latissimus rim beside the teres-major envelope, rather
than letting that whole fold disappear beneath it in elevation. This is an
authored presentation constraint, not a measured physiological motion model.
"""
from pathlib import Path
import base64
import json
import runpy
import numpy as np


def main():
    path = Path(__file__).with_name('atlas-data.json')
    data = json.loads(path.read_text())
    parts = [p for p in data['parts'] if not p.get('mirrorOf')]
    contact = runpy.run_path(str(path.with_name('bone-contact.py')))['BoneContact'](parts)
    transforms = runpy.run_path(str(path.with_name('shoulder-rig.py')))['transforms']
    lat = next(p for p in data['parts'] if p['name'] == 'latissimus')
    major = next(p for p in data['parts'] if p['name'] == 'teres-major')
    v, faces = np.array(lat['v']), np.array(major['f'])
    lat_faces = np.array(lat['f'])
    def volume(vertices):
        tri = vertices[lat_faces]
        return np.einsum('ij,ij->i', tri[:, 0], np.cross(tri[:, 1], tri[:, 2])).sum() / 6
    locked = np.zeros(len(v), dtype=bool)
    locked[lat['attachments']['origin'] + lat['attachments']['insertion']] = True
    # Only the source shell's lateral transition; central, costal and iliac
    # origins and proximal humeral insertion remain exactly as fitted.
    native_edge = np.interp(v[:, 1], [215, 230, 240, 250, 260, 280], [102, 98, 95, 92, 89, 83])
    rim = np.clip(1 - (native_edge - v[:, 0]) / 16, 0, 1)
    band = np.clip((v[:, 1] - 218) / 12, 0, 1) * np.clip((285 - v[:, 1]) / 25, 0, 1)
    weight = rim * band
    weight[locked] = 0
    count = len(v) * 3
    for frame in data['frames']:
        values = np.frombuffer(base64.b64decode(frame['displacement']), dtype='<i2').copy()
        offset = lat['frameOffset']
        baseline = frame.setdefault('latissimusAxillaryBase', base64.b64encode(values[offset:offset + count].tobytes()).decode())
        values[offset:offset + count] = np.frombuffer(base64.b64decode(baseline), dtype='<i2')
        q = v + values[offset:offset + count].reshape(-1, 3) / 50
        target_volume = volume(q)
        mo = major['frameOffset']
        mv = np.array(major['v']) + values[mo:mo + len(major['v']) * 3].reshape(-1, 3) / 50
        # Intersect the actual posed teres-major triangles at each rim height.
        triangles = mv[faces]
        for i in np.flatnonzero(weight > 0):
            y = q[i, 1]
            xs = []
            for a, b in [(0, 1), (1, 2), (2, 0)]:
                start, end = triangles[:, a], triangles[:, b]
                cross = (start[:, 1] <= y) != (end[:, 1] <= y)
                if cross.any():
                    t = (y - start[cross, 1]) / (end[cross, 1] - start[cross, 1])
                    xs.extend((start[cross, 0] + t * (end[cross, 0] - start[cross, 0])).tolist())
            if xs:
                clearance = max(xs) + 2.5 - q[i, 0]
                if clearance > 0:
                    q[i, 0] += min(12, clearance) * weight[i]
        # Preserve the existing fitted shell volume by adjusting free belly
        # thickness, without undoing the fold or moving either attachment.
        guard = contact.guard(v, transforms(data['rig'], frame['angle']), posterior=True)
        for _ in range(48):
            q = guard(q, ~locked)
            error = target_volume - volume(q)
            if abs(error / target_volume) < .001:
                break
            tri = q[lat_faces]
            gradient = np.zeros_like(q)
            for a, b, c in [(0, 1, 2), (1, 2, 0), (2, 0, 1)]:
                np.add.at(gradient, lat_faces[:, a], np.cross(tri[:, b], tri[:, c]) / 6)
            gradient[:, :2] = 0
            gradient[locked | (weight > 0)] = 0
            change = gradient * (error / max(np.sum(gradient * gradient), 1e-9))
            q += np.clip(change, -.15, .15)
        q = guard(q, ~locked)
        assert abs(volume(q) / target_volume - 1) < .012
        values[offset:offset + count] = np.rint((q - v).reshape(-1) * 50).astype('<i2')
        frame['displacement'] = base64.b64encode(values.tobytes()).decode()
    data['axillaryFoldConstraint'] = 'Free lateral latissimus rim follows posed teres-major envelope; authored clearance, not measured anatomy. Attachments and bones unchanged.'
    path.write_text(json.dumps(data, separators=(',', ':')))
    print('Axillary clearance: adjusted lateral free rim in', len(data['frames']), 'frames.')


if __name__ == '__main__':
    main()
