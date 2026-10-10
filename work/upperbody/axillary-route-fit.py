"""Fit a continuous posterior axillary route on the native latissimus shell.

The body stays posterior to serratus and inferior to the teres belly; the
proximal tendon turns anterior to teres toward the existing humeral band.
Use posed triangle fields and face samples, rather than arbitrary draw order
or a lateral vertex shove. Source attachment vertices and every other muscle
remain unchanged. Neighboring native shell displacements are faired together.
A harmonic attachment increment carries each solution into the next pose.

Distances and tissue-order margins are authored illustration constraints;
these are not measured physiological muscle or fascicle trajectories.
"""
from pathlib import Path
import json, base64, runpy, hashlib, tempfile, numpy as np
from scipy.spatial import cKDTree
from scipy.sparse.linalg import factorized
from scipy.ndimage import map_coordinates
from scipy.ndimage import minimum_filter

def main():
    w = Path(__file__).parent
    path = w / 'atlas-data.json'
    data = json.loads(path.read_text())
    signature = hashlib.sha256(json.dumps({'parts': data['parts'], 'rig': data['rig'], 'frames': data['frames']}, separators=(',', ':')).encode()).hexdigest()[:12]
    out = Path(tempfile.gettempdir()) / ('anatomy-axillary-' + signature)
    out.mkdir(exist_ok=True)
    parts = [p for p in data['parts'] if not p.get('mirrorOf')]
    lat = next((p for p in parts if p['name'] == 'latissimus'))
    v = np.asarray(lat['v'])
    f = np.asarray(lat['f'])
    Fit = runpy.run_path(str(w / 'attachment-fit.py'))['AttachmentFit']
    fit = Fit(lat, parts)
    transforms = runpy.run_path(str(w / 'shoulder-rig.py'))['transforms']
    contact = runpy.run_path(str(w / 'bone-contact.py'))['BoneContact'](parts)
    free = np.ones(len(v), bool)
    free[fit.fixed] = False
    bary = np.array([[a / 6, b / 6, 1 - (a + b) / 6] for a in range(7) for b in range(7 - a)])
    source = np.einsum('sj,fjk->fsk', bary, v[f]).reshape(-1, 3)
    sf = np.repeat(f, len(bary), axis=0)
    sb = np.tile(bary, (len(f), 1))
    facefree = free[sf]
    bw = sb * facefree
    den = np.maximum((bw * bw).sum(1), 0.02)
    core = (w.parent / 'arm/bone-fields.py').read_text()
    core = core[core.index('step=1.25'):core.index("(w/'bone-fields.json')")].replace("['humerus','ulna','radius']", "['teres-major','serratus','posed-scapula']")

    def fields(ps, key):
        path = out / (key + '.json')
        if path.exists():
            fs = json.loads(path.read_text())
        else:
            scope = {'atlas': {'parts': ps}, 'fields': []}
            exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n' + core, scope)
            fs = scope['fields']
            path.write_text(json.dumps(fs, separators=(',', ':')))
        for field in fs:
            field['grid'] = np.frombuffer(base64.b64decode(field.pop('data')), dtype='<i2').reshape(field['shape']) / 16
        return fs
    muscles = [next((p for p in parts if p['name'] == name)) for name in ['teres-major', 'serratus']]
    sourcefields = fields(muscles, 'source')
    masks = {field['name']: contact.sample(field, source) > 1 for field in sourcefields}
    bmasks = {field['name']: contact.sample(field, source) > 1 for field in contact.fields}
    vol = lambda q: np.einsum('ij,ij->i', q[f[:, 0]], np.cross(q[f[:, 1]], q[f[:, 2]])).sum() / 6
    nativevol = vol(v)
    audits = []
    dist, neighbors = cKDTree(v).query(v, k=16)
    nw = np.maximum(0, 1 - dist / 12) ** 2
    nw[:, 0] = 0
    nw /= np.maximum(nw.sum(1), 1e-08)[:, None]
    sw = np.clip((v[:, 1] - 205) / 15, 0, 1) * np.clip((300 - v[:, 1]) / 20, 0, 1) * 0.14
    sw[~free] = 0
    previous = None
    last_target = None
    for frame in data['frames']:
        angle = frame['angle']
        tr = transforms(data['rig'], angle)
        values = np.frombuffer(base64.b64decode(frame['displacement']), dtype='<i2').copy()
        posed = []
        for p in muscles:
            off = p['frameOffset']
            posed.append(dict(p, v=(np.asarray(p['v']) + values[off:off + len(p['v']) * 3].reshape(-1, 3) / 50).tolist()))
        posed.append({'name': 'posed-scapula', 'v': tr['scapula'](next((p['v'] for p in parts if p['name'] == 'scapula'))).tolist(), 'f': next((p['f'] for p in parts if p['name'] == 'scapula'))})
        mfields = fields(posed, 'routing-' + str(angle))
        rules = []
        for field in contact.fields:
            basis = tr.get(field['name'], tr['fixed'])([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]])
            matrix = (basis[1:] - basis[0]).T
            rules.append((field, basis[0], matrix, bmasks[field['name']]))
        for field in mfields:
            if field['name'] != 'posed-scapula':
                rules.append((field, np.zeros(3), np.eye(3), masks[field['name']]))
        off = lat['frameOffset']
        seed = data.setdefault('latissimusMotionSeed', {'angle': 15, 'displacement': base64.b64encode(values[off:off + len(v)*3].tobytes()).decode()})
        q = v + np.frombuffer(base64.b64decode(seed['displacement']), dtype='<i2').reshape(-1, 3) / 50
        target = v.copy()
        target[fit.insertion] = tr['humerus'](v[fit.insertion])
        if previous is not None:
            physical_fixed = np.flatnonzero(~free)
            physical_free = np.flatnonzero(free)
            solve = factorized(fit.lap[physical_free][:, physical_free].tocsc())
            delta = target[physical_fixed] - last_target[physical_fixed]
            rhs = -(fit.lap[physical_free][:, physical_fixed] @ delta)
            q = previous.copy()
            q[physical_fixed] = target[physical_fixed]
            q[physical_free] += np.column_stack([solve(rhs[:, axis]) for axis in range(3)])
        major = np.asarray(posed[0]['v'])
        majortri = major[np.asarray(posed[0]['f'])]

        def lower(x):
            result = np.full(len(x), -np.inf)
            for j, k in [(0, 1), (1, 2), (2, 0)]:
                a, b = (majortri[:, j], majortri[:, k])
                dx = b[:, 0] - a[:, 0]
                ok = abs(dx) > 1e-08
                a, b, dx = (a[ok], b[ok], dx[ok])
                t = (x[:, None] - a[None, :, 0]) / dx
                yy = a[None, :, 1] + t * (b[None, :, 1] - a[None, :, 1])
                result = np.maximum(result, np.max(np.where((t >= 0) & (t <= 1), yy, -np.inf), axis=1))
            return result
        depths = []
        for field in mfields:
            if field['name'] not in ['serratus', 'posed-scapula']:
                continue
            grid = field['grid']
            inside = grid < 0
            first = np.argmax(inside, axis=2)
            depth = field['origin'][2] + first * field['step'] - 1.8
            depth[~inside.any(axis=2)] = 10000
            from scipy.ndimage import minimum_filter
            depths.append((field, minimum_filter(depth, size=3)))
        field = next((field for field in mfields if field['name'] == 'teres-major'))
        inside = field['grid'] < 0
        last = inside.shape[2] - 1 - np.argmax(inside[:, :, ::-1], axis=2)
        frontdepth = field['origin'][2] + last * field['step'] + 1.8
        frontdepth[~inside.any(axis=2)] = -10000
        frontdepth = -minimum_filter(-frontdepth, size=3)
        frontfield = field
        bx = np.linspace(major[:, 0].min(), major[:, 0].max(), 300)
        by = lower(bx)
        lower = lambda x: np.interp(x, bx, by, left=-np.inf, right=-np.inf)
        for it in range(220):
            if it < 120:
                delta = q - v
                averaged = (delta[neighbors] * nw[:, :, None]).sum(1)
                q += (averaged - delta) * sw[:, None]
            points = np.einsum('ij,ijk->ik', sb, q[sf])
            corr = np.zeros_like(q)
            counts = np.zeros(len(v))
            worst = 6
            badcount = 0
            for field, depth in depths:
                xy = ((points[:, :2] - np.asarray(field['origin'])[:2]) / field['step']).T
                limit = map_coordinates(depth, xy, order=1, mode='constant', cval=10000)
                mask = (source[:, 1] > 220) & (den > 0.02)
                bad = mask & (points[:, 2] > limit) & (limit < 9000)
                if bad.any():
                    shift = np.zeros((bad.sum(), 3))
                    shift[:, 2] = -np.minimum(0.9, points[bad, 2] - limit[bad])
                    shift /= den[bad, None]
                    for j in range(3):
                        np.add.at(corr, sf[bad, j], shift * bw[bad, j, None])
                        np.add.at(counts, sf[bad, j], (bw[bad, j] > 0).astype(float))
            xy = ((points[:, :2] - np.asarray(frontfield['origin'])[:2]) / frontfield['step']).T
            limit = map_coordinates(frontdepth, xy, order=1, mode='constant', cval=-10000)
            bad = (source[:, 1] <= 220) & (den > 0.02) & (points[:, 2] < limit) & (limit > -9000)
            if bad.any():
                shift = np.zeros((bad.sum(), 3))
                shift[:, 2] = np.minimum(0.9, limit[bad] - points[bad, 2])
                shift /= den[bad, None]
                for j in range(3):
                    np.add.at(corr, sf[bad, j], shift * bw[bad, j, None])
                    np.add.at(counts, sf[bad, j], (bw[bad, j] > 0).astype(float))
            bottom = lower(points[:, 0])
            bad = (source[:, 1] > 220) & (source[:, 1] < 290) & (den > 0.02) & np.isfinite(bottom) & (points[:, 1] < bottom + 1.8) & (points[:, 2] < 38)
            if bad.any():
                shift = np.zeros((bad.sum(), 3))
                shift[:, 1] = np.minimum(0.9, bottom[bad] + 1.8 - points[bad, 1])
                shift /= den[bad, None]
                for j in range(3):
                    np.add.at(corr, sf[bad, j], shift * bw[bad, j, None])
                    np.add.at(counts, sf[bad, j], (bw[bad, j] > 0).astype(float))
            for field, org, matrix, mask in rules:
                local = (points - org) @ matrix
                dist = contact.sample(field, local)
                bad = mask & (dist < 0.65) & (den > 0.02)
                worst = min(worst, float(dist[mask].min()))
                badcount += int((mask & (dist < -0.25) & (den > 0.02)).sum())
                if not bad.any():
                    continue
                p = local[bad]
                g = np.column_stack([(contact.sample(field, p + np.eye(3)[ax] * 0.6) - contact.sample(field, p - np.eye(3)[ax] * 0.6)) / 1.2 for ax in range(3)]) @ matrix.T
                if False:
                    behind = source[bad, 2] < 30
                    g[behind, 2] = -abs(g[behind, 2])
                g /= np.maximum(np.linalg.norm(g, axis=1), 0.1)[:, None]
                shift = g * np.minimum(0.7, 0.7 - dist[bad])[:, None] / den[bad, None]
                for j in range(3):
                    np.add.at(corr, sf[bad, j], shift * bw[bad, j, None])
                    np.add.at(counts, sf[bad, j], (bw[bad, j] > 0).astype(float))
            q += corr / np.maximum(counts, 1)[:, None]
            if True:
                bound = lower(q[:, 0])
                sel = free & (v[:, 1] > 220) & (v[:, 1] < 275) & np.isfinite(bound) & (q[:, 2] < 38)
                q[sel, 1] += np.clip(bound[sel] + 1 - q[sel, 1], 0, 0.5)
            error = nativevol - vol(q)
            tri = q[f]
            grad = np.zeros_like(q)
            for a, b, c in [(0, 1, 2), (1, 2, 0), (2, 0, 1)]:
                np.add.at(grad, f[:, a], np.cross(tri[:, b], tri[:, c]) / 6)
            grad[:, :2] = 0
            grad[~free | (v[:, 1] < 280)] = 0
            step = grad * error / max(np.sum(grad * grad), 1e-09)
            q += np.clip(step, -0.08, 0.08)
            if it > 130 and badcount == 0 and (abs(error / nativevol) < 0.003):
                break
        previous = q.copy()
        last_target = target.copy()
        off = lat['frameOffset']
        count = len(v) * 3
        values[off:off + count] = np.rint((q - v).reshape(-1) * 50).astype('<i2')
        frame['displacement'] = base64.b64encode(values.tobytes()).decode()
        audits.append({'angle': angle, 'bad': badcount, 'clearance': worst, 'volumeRatio': vol(q) / nativevol, 'iterations': it, 'fields': {field['name']: int(np.sum(mask & (contact.sample(field, (np.einsum('ij,ijk->ik', sb, q[sf]) - org) @ matrix) < -0.25))) for field, org, matrix, mask in rules}})
        print(audits[-1], flush=True)
    data['axillaryFoldConstraint'] = 'Pose-relative triangle contact with scapula, teres major and serratus; preserves physical attachment bands. Authored clearance, not measured physiology.'
    (w / 'atlas-data.json').write_text(json.dumps(data, separators=(',', ':')))
    (w / 'axillary-fit-validation.json').write_text(json.dumps(audits, indent=2))

if __name__ == '__main__':
    main()
