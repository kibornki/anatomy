"""Fit pinned native surfaces to explicit attachments in each 3D shoulder pose."""
from pathlib import Path
import base64,json,numpy as np,runpy
w=Path(__file__).parent
native=json.loads((w/'atlas-data.json').read_text());parts=[p for p in native['parts'] if not p.get('mirrorOf')]
rig=native['rig'];hum=np.array(next(p['v'] for p in parts if p['name']=='humerus'));distal=hum[hum[:,1]>np.quantile(hum[:,1],.97)].mean(0);axis=distal-rig['gh'];rig['humeralAxis']=(axis/np.linalg.norm(axis)).tolist()
transforms=runpy.run_path(str(w/'shoulder-rig.py'))['transforms'];Fit=runpy.run_path(str(w/'attachment-fit.py'))['AttachmentFit']
contact=runpy.run_path(str(w/'bone-contact.py'))['BoneContact'](parts)
muscles=[p for p in parts if p['kind']=='muscle'];fits={p['name']:Fit(p,parts) for p in muscles};frames=[];audits=[]
for angle in range(15,121,5):
    poses=transforms(rig,angle);values=[];frame_audit=[]
    for p in muscles:
        fit=fits[p['name']];q,deform,audit=fit.fit(poses,contact.guard(fit.v,poses,posterior=p['name']=='latissimus'))
        assert abs(audit['volumeRatio']-1)<.016,(angle,p['name'],audit)
        values.append((q-fit.v).reshape(-1))
        for fiber in p['fibers']:values.append((deform(fiber)-fiber).reshape(-1))
        frame_audit.append({'name':p['name'],**audit})
    quantized=np.rint(np.concatenate(values)*50);assert np.max(np.abs(quantized))<32767
    frames.append({'angle':angle,'displacement':base64.b64encode(quantized.astype('<i2').tobytes()).decode()})
    audits.append({'angle':angle,'muscles':frame_audit});print('Fit shoulder',angle,'degrees',flush=True)

out_parts=[];offset=0
for p in parts:
    q=dict(p)
    if p['kind']=='muscle':
        fit=fits[p['name']];q['frameOffset']=offset;offset+=len(p['v'])*3+sum(len(f)*3 for f in p['fibers'])
        q['attachments']={'origin':np.flatnonzero(fit.origin).tolist(),'insertion':np.flatnonzero(fit.insertion).tolist(),'originBone':fit.origin_bone,'insertionBone':fit.insertion_bone}
        q['attachments']['clavicularInsertion']=np.flatnonzero(fit.clavicular_insertion).tolist()
    out_parts.append(q)
for p in list(out_parts):
    if p.get('side')==1 and p['name'] not in ['C4','C5','C6']:
        out_parts.append({**p,'name':p['name']+'-right','side':-1,'mirrorOf':p['name'],
            'v':(np.array(p['v'])*[-1,1,1]).tolist(),'f':np.array(p['f'])[:,[0,2,1]].tolist(),
            'fibers':[(np.array(f)*[-1,1,1]).tolist() for f in p['fibers']]})
out={**native,'parts':out_parts,'frames':frames,'rig':rig,'revision':'attachment-fit-3d-v2',
    'limitations':'Native atlas and anatomical attachment bands; illustrative 3D shoulder coupling and surface-volume constraint, not measured human motion or physiological validation.'}
(w/'atlas-data.json').write_text(json.dumps(out,separators=(',',':')))
(w/'geometry-validation.json').write_text(json.dumps({'frames':audits,'source':'Native BodyParts3D neutral surface','scope':'Attachment residual, closed-shell volume and edge/area deformation. Not physiological fascicle measurements.'},indent=2))
print('Prepared',len(out_parts),'native parts;',len(frames),'attachment-constrained 3D frames.')
# Tissue patches are authored on the final native triangle winding; guides
# follow these triangles at runtime and consume no displacement offsets.
runpy.run_path(str(w/'latissimus-detail.py'))['main']()
