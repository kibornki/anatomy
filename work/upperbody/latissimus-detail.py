"""Author the approved latissimus tissue illustration on native triangles.

The aponeurotic border is an illustrative regional tracing informed by the
approved concept and Gray plate, not a tissue segmentation supplied by DBCLS.
No native vertices, bones, shoulder poses or other muscles are changed.
"""
from pathlib import Path
import base64
import json
import numpy as np
from scipy.interpolate import PchipInterpolator

border = PchipInterpolator([295, 320, 340, 360, 380, 400, 425], [0, 3, 8, 16, 25, 38, 52], extrapolate=False)


def width(y):
    return float(border(np.clip(y, 295, 425)))


def tissue(point):
    x, y, _ = point
    # Lower central aponeurosis and proximal flattened tendon are separate
    # regions of the same source shell, never new overlapping geometry.
    return max(width(y) - abs(x), (227 - y) * .8)


def author(part):
    v, f = np.asarray(part['v']), np.asarray(part['f'])
    triangles = v[f]
    fields = np.array([tissue(point) for point in v])
    patches = {'muscle': [], 'aponeurosis': []}
    eye = np.eye(3)
    for i, face in enumerate(f):
        values = fields[face]
        for kind, sign in [('muscle', -1), ('aponeurosis', 1)]:
            polygon = []
            for j in range(3):
                k = (j + 1) % 3
                inside, next_inside = values[j] * sign >= 0, values[k] * sign >= 0
                if inside:
                    polygon.append(eye[j].tolist())
                if inside != next_inside:
                    t = values[j] / (values[j] - values[k])
                    polygon.append(((1 - t) * eye[j] + t * eye[k]).tolist())
            if len(polygon) >= 3:
                patches[kind].append({'face': i, 'weights': polygon})

    a = triangles[:, 0]
    u, w = triangles[:, 1] - a, triangles[:, 2] - a
    determinant = u[:, 0] * w[:, 1] - u[:, 1] * w[:, 0]
    valid_face = np.abs(determinant) > 1e-9
    divisor = np.where(valid_face, determinant, 1)

    def project(xy):
        delta = xy - a[:, :2]
        b = (delta[:, 0] * w[:, 1] - delta[:, 1] * w[:, 0]) / divisor
        c = (u[:, 0] * delta[:, 1] - u[:, 1] * delta[:, 0]) / divisor
        ids = np.flatnonzero(valid_face & (b >= -1e-8) & (c >= -1e-8) & (b + c <= 1 + 1e-8))
        if not len(ids):
            return None
        z = a[ids, 2] + b[ids] * u[ids, 2] + c[ids] * w[ids, 2]
        index = ids[np.argmin(z)]
        weights = np.array([1 - b[index] - c[index], b[index], c[index]])
        return weights @ triangles[index], int(index), weights

    guides = []

    def trace(origin, target, fold=None):
        segment, kind, previous = [], None, None

        def flush():
            if len(segment) >= 5:
                guides.append({'kind': kind, 'points': list(segment)})

        for t in np.linspace(0, 1, 110):
            if fold is None:
                xy = (1 - t) * origin + t * target
            else:
                control = origin * .7 + fold * .3
                xy = (1 - t)**3 * origin + 3 * (1 - t)**2 * t * control + 3 * (1 - t) * t**2 * fold + t**3 * target
            result = project(xy)
            if result is None:
                flush(); segment, kind, previous = [], None, None
                continue
            point, face, weights = result
            value = float(weights @ fields[f[face]])
            next_kind = 'aponeurosis' if value >= 0 else 'muscle'
            if next_kind != kind or (previous is not None and np.linalg.norm(point - previous) > 7):
                flush(); segment = []
            kind = next_kind
            segment.append([face, *weights.round(8).tolist()])
            previous = point
        flush()

    # Regional muscle origins along the medial/aponeurotic border, not the
    # inferior sacral point. A narrow axillary band flows into a white tendon.
    for i, y in enumerate(np.linspace(244, 400, 60)):
        origin = np.array([max(1.2, width(y) + .65), y])
        target = np.array([99.0 + .6 * i / 59, 204.0 + 5 * i / 59])
        fold = np.array([85 + 3 * i / 59, 244 + 9 * i / 59])
        trace(origin, target, fold)
    # Connective-tissue guides have their own pale stroke and material clip.
    for y in np.linspace(325, 418, 24):
        trace(np.array([.8, y]), np.array([max(2, width(y) + 2), y - 12]))
    for i in range(9):
        trace(np.array([83 + i * .7, 232 + i * .35]), np.array([99 + i * .1, 199 + i * 1.3]))
    part['tissuePatches'] = patches
    part['surfaceGuides'] = guides
    part['fiberDetailSource'] = 'Approved illustrative tissue border and regional directions on BodyParts3D triangles; not measured fascicles or an atlas tissue segmentation.'
    return part


def main():
    path = Path(__file__).with_name('atlas-data.json')
    data = json.loads(path.read_text())
    original = {p['name']: dict(p) for p in data['parts']}
    left = next(p for p in data['parts'] if p['name'] == 'latissimus')
    author(left)
    for p in data['parts']:
        if p['name'].startswith('latissimus'):
            p['tissuePatches'] = left['tissuePatches']
            # Mirrored triangle winding reverses barycentric indices 1 and 2.
            if p.get('mirrorOf'):
                p['tissuePatches'] = {kind: [{'face': q['face'], 'weights': [[b[0], b[2], b[1]] for b in q['weights']]} for q in patches] for kind, patches in left['tissuePatches'].items()}
            p['surfaceGuides'] = left['surfaceGuides']
            p['fiberDetailSource'] = left['fiberDetailSource']
            p['fibers'] = []
    # Reuse all previously verified surface displacement frames. Remove the
    # obsolete latissimus guide offsets; other slices remain bit-identical.
    for frame in data['frames']:
        values = np.frombuffer(base64.b64decode(frame['displacement']), dtype='<i2')
        chunks = []
        for p in data['parts']:
            if p['kind'] != 'muscle' or p.get('mirrorOf'):
                continue
            old = original[p['name']]
            length = len(p['v']) * 3
            if p['name'] != 'latissimus':
                length += sum(len(fiber) * 3 for fiber in p['fibers'])
            chunks.append(values[old['frameOffset']:old['frameOffset'] + length])
        frame['displacement'] = base64.b64encode(np.concatenate(chunks).tobytes()).decode()
    offset = 0
    for p in data['parts']:
        if p['kind'] == 'muscle' and not p.get('mirrorOf'):
            p['frameOffset'] = offset
            offset += len(p['v']) * 3 + sum(len(fiber) * 3 for fiber in p['fibers'])
    for p in data['parts']:
        if p.get('mirrorOf'):
            p['frameOffset'] = next(q['frameOffset'] for q in data['parts'] if q['name'] == p['mirrorOf']) if p['kind'] == 'muscle' else p.get('frameOffset')
            if p['kind'] != 'muscle':
                p.pop('frameOffset', None)
    data['revision'] = 'latissimus-tissue-guides-v3'
    path.write_text(json.dumps(data, separators=(',', ':')))
    print('Authored latissimus:', len(left['surfaceGuides']), 'surface-bound guide segments; reused', len(data['frames']), 'surface frames.')


if __name__ == '__main__':
    main()
