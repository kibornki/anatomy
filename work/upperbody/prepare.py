"""Animate the reviewed native atlas; reuse its exact 60-degree pose."""
from pathlib import Path
import base64,json,numpy as np

w=Path(__file__).parent;root=w.parents[1]
source=root/'work/upperbody-atlas-preview/prepare.py'
# Reuse pinned source loading, neutral-frame crop and surface fibre extraction.
scope={'__file__':str(source)}
exec(source.read_text().split('for p in parts:\n neutral=')[0],scope)
parts=scope['parts'];rot=scope['rot'];sc,ac,gh=(scope[k] for k in ['sc','ac','gh'])
neutral=scope['neutral_abduction'];fit=scope['fit'];fixed=scope['fixed']
ribs=np.concatenate([p['v'] for p in fixed if p['kind']=='rib'])
muscles=scope['muscles'];frames=[];audits=[]
for angle in list(range(15,121,5)):
    clav=lambda ps:rot(ps,sc,angle/6)
    delta=clav([ac])[0]-ac
    scap=lambda ps:rot(ps,ac,angle/3)+delta
    gh_delta=scap([gh])[0]-gh
    arm=lambda ps:rot(ps,gh,angle-neutral)+gh_delta
    lat=next(p for p in muscles if p['name']=='latissimus')
    lat_pose,audit=fit(lat['v'],lat['f'],arm,ribs)
    scope.update(clav_pose=clav,scap_pose=scap,arm_pose=arm,lat_pose=lat_pose)
    values=[]
    for p in muscles:
        for points in [p['v'],*p['fibers']]:
            values.append((scope['pose_soft'](points,p['name'])-points).reshape(-1))
    values=np.concatenate(values);quantized=np.rint(values*50)
    assert np.max(np.abs(quantized))<32767
    frames.append({'angle':angle,'displacement':base64.b64encode(quantized.astype('<i2').tobytes()).decode()})
    audits.append({'angle':angle,**audit})

out_parts=[];offset=0
for p in parts:
    q={**p,'v':p['v'].round(4).tolist(),'f':p['f'].tolist(),'fibers':[v.round(4).tolist() for v in p['fibers']]}
    if p['kind']=='muscle':
        q['frameOffset']=offset;offset+=len(p['v'])*3+sum(len(f)*3 for f in p['fibers'])
    out_parts.append(q)
for p in list(out_parts):
    if p.get('side')==1 and p['name'] not in ['C4','C5','C6']:
        out_parts.append({**p,'name':p['name']+'-right','side':-1,'mirrorOf':p['name'],
            'v':(np.array(p['v'])*[-1,1,1]).tolist(),'f':np.array(p['f'])[:,[0,2,1]].tolist(),
            'fibers':[(np.array(f)*[-1,1,1]).tolist() for f in p['fibers']]})
out={'source':scope['base']['source'],'sourceCommit':scope['PIN'],'parts':out_parts,'frames':frames,
     'rig':{'sc':sc.tolist(),'ac':ac.tolist(),'gh':gh.tolist(),'neutralAbduction':neutral},
     'neckTop':float(scope['neck_top']),'cameraYaw':[0,90,180],'sources':scope['sources'],
     'limitations':'Atlas-based illustration. Attachment-constrained soft pose interpolation is not a validated physiological model.'}
(w/'atlas-data.json').write_text(json.dumps(out,separators=(',',':')))
# Compare the new interpolated frame to the actual user-approved static surface.
approved=json.loads((source.parent/'atlas-data.json').read_text())
frame=next(f for f in frames if f['angle']==60)
delta=np.frombuffer(base64.b64decode(frame['displacement']),dtype='<i2')/50
errors=[]
for p in out_parts:
    if p['kind']!='muscle' or p.get('mirrorOf'):continue
    ref=next(q for q in approved['parts'] if q['name']==p['name'])
    v=np.array(p['v']);start=p['frameOffset'];posed=v+delta[start:start+v.size].reshape(v.shape)
    errors.append(float(np.linalg.norm(posed-np.array(ref['v']),axis=1).max()))
assert max(errors)<.018,errors
(w/'geometry-validation.json').write_text(json.dumps({'approved60MaxError':max(errors),'latissimusFrames':audits},indent=2))
print('Prepared',len(out_parts),'native parts;',len(frames),'soft frames; approved 60° max error',max(errors))
