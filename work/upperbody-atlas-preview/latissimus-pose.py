"""Attachment-constrained static atlas surface fit, not muscle simulation."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import factorized
from scipy.spatial import cKDTree

def latissimus_fit(v, f, arm_pose, ribs):
    # Keep the native thoracolumbar/iliac origins. Only the proximal insertion
    # follows the humerus; nearest-bone weights moved the whole upper belly.
    costal_distance = cKDTree(ribs).query(v)[0]
    origin = (v[:, 0] < 5) | (v[:, 1] > 380) | ((costal_distance < 3) & (v[:, 1] > 250))
    insertion = v[:, 1] < np.quantile(v[:, 1], .04)
    origin &= ~insertion
    fixed = np.flatnonzero(origin | insertion)
    free = np.flatnonzero(~(origin | insertion))
    target = v.copy()
    target[insertion] = arm_pose(v[insertion])
    # Positive cotangent graph: local rotations penalize unnecessary surface
    # expansion, while the atlas attachments constrain the resulting pose.
    ii, jj, ww = [], [], []
    for a, b, c in [(0, 1, 2), (1, 2, 0), (2, 0, 1)]:
        u = v[f[:, a]] - v[f[:, c]]
        t = v[f[:, b]] - v[f[:, c]]
        cot = np.einsum('ij,ij->i', u, t) / np.maximum(np.linalg.norm(np.cross(u, t), axis=1), 1e-8)
        weight = np.maximum(cot, .02) / 2
        ii.extend([f[:, a], f[:, b]])
        jj.extend([f[:, b], f[:, a]])
        ww.extend([weight, weight])
    adj = coo_matrix((np.concatenate(ww), (np.concatenate(ii), np.concatenate(jj))), shape=(len(v), len(v))).tocsr()
    graph = adj.tocoo(); i, j, weight = graph.row, graph.col, graph.data
    lap = -adj + coo_matrix((np.asarray(adj.sum(1)).ravel(), (np.arange(len(v)), np.arange(len(v)))), shape=adj.shape).tocsr()
    solve = factorized(lap[free][:, free].tocsc())
    boundary = lap[free][:, fixed] @ target[fixed]
    # This shoulder rig rotates in the coronal plane. Preserve the source
    # front/back depth, so the fit cannot pull the posterior sheet through ribs.
    q = v[:, :2].copy()
    q[fixed] = target[fixed, :2]
    boundary = boundary[:, :2]
    edge = v[i, :2] - v[j, :2]
    for _ in range(18):
        cov = np.zeros((len(v), 2, 2))
        np.add.at(cov, i, weight[:, None, None] * (q[i] - q[j])[:, :, None] * edge[:, None, :])
        u, _, vt = np.linalg.svd(cov)
        sign = np.ones((len(v), 2)); sign[:, 1] = np.linalg.det(u @ vt)
        rot = (u * sign[:, None, :]) @ vt
        rhs = np.zeros_like(q)
        np.add.at(rhs, i, weight[:, None] * np.einsum('nij,nj->ni', (rot[i] + rot[j]) / 2, edge))
        q[free] = np.column_stack([solve((rhs[free] - boundary)[:, axis]) for axis in range(2)])
    q = np.column_stack([q, v[:, 2]])
    assert np.max(np.linalg.norm(q[origin] - v[origin], axis=1)) < 1e-7
    assert np.max(np.linalg.norm(q[insertion] - target[insertion], axis=1)) < 1e-7
    tree = cKDTree(v)
    def pose(points):
        points = np.asarray(points)
        distance, index = tree.query(points, k=3)
        w = 1 / np.maximum(distance, 1e-8) ** 2
        w /= w.sum(1)[:, None]
        return points + np.sum((q[index] - v[index]) * w[:, :, None], axis=1)
    def metrics(p):
        tri = p[f]
        return {'volume': float(abs(np.einsum('ij,ij->i', tri[:, 0], np.cross(tri[:, 1], tri[:, 2])).sum() / 6)),
                'area': float(np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1).sum() / 2)}
    a, b = metrics(v), metrics(q)
    audit = {'originVertices': int(origin.sum()), 'insertionVertices': int(insertion.sum()),
             'volumeRatio': b['volume'] / a['volume'], 'surfaceAreaRatio': b['area'] / a['area'],
             'limitations': 'Static attachment-constrained surface fit; not validated muscle physiology.'}
    return pose, audit
