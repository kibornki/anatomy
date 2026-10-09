"""Native forearm/thigh atlas previews; existing muscles and camera directions."""
from pathlib import Path
import hashlib, json, numpy as np
import fast_simplification

W=Path(__file__).parent; ROOT=W.parents[1]
CACHES=[Path('/workspace/artifacts/limb-atlas-preview/source'),Path('/workspace/artifacts/arm-atlas-preview/source'),Path('/workspace/artifacts/independent-anatomy-review')]
PIN='f0eeb6e843380cfe6b83797cf8c3e1af74de5e61'
specs=json.loads((W/'specs.json').read_text())
display_colors=json.loads((W/'colors.json').read_text())
def load(id,name,color):
    path=next(p/(id+'.stl') for p in CACHES if (p/(id+'.stl')).exists())
    b=path.read_bytes(); n=int.from_bytes(b[80:84],'little')
    assert len(b)==84+n*50
    raw=np.frombuffer(b,np.dtype([('n','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')]),n,84)['v'].reshape(-1,3)
    v, inv=np.unique(raw,axis=0,return_inverse=True)
    target=1600 if color!='bone' else 1200 if name in ['femur','radius','ulna','humerus'] else 450
    f=inv.reshape(-1,3).astype(np.int32)
    if len(f)>target:v,f=fast_simplification.simplify(v.astype(float),f,target_count=target,agg=7)
    # Single uniform physical scale in the atlas's common coordinates.
    v=np.column_stack([v[:,0],-v[:,2],-v[:,1]])
    return {'id':id,'name':name,'color':color,'kind':'bone' if color=='bone' else 'muscle','v':v,'f':f,'fibers':[],
            'source':{'url':f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{PIN}/assets/BodyParts3D_data/stl/{id}.stl','sha256':hashlib.sha256(b).hexdigest(),'sourceFaces':n}}

# Share the reviewed arm's polygon clipping and section cap routine.
s=(ROOT/'work/arm/prepare.py').read_text();exec(s[s.index('def crop_bone('):s.index("for p in parts:\n if p['name'] in ['radius','ulna']")])
def crop_min(p,minimum):
    p['v'][:,1]*=-1;crop_bone(p,-minimum);p['v']=np.array(p['v']);p['v'][:,1]*=-1;p['f']=np.array(p['f']);p['displayCut']=minimum

def fiber_guides(p):
    """Radial slices on the source surface; illustrative longitudinal guides."""
    v=p['v'];tri=v[p['f']];lo,hi=np.quantile(v[:,1],[.035,.965]);lines=[[] for _ in range(40)]
    for y in np.linspace(lo,hi,62):
        seg=[]
        # Intersect triangles with a transverse plane, retaining exact source
        # surface depth rather than drawing lines through the source volume.
        for a,b in [(0,1),(1,2),(2,0)]:
            aa=tri[:,a];bb=tri[:,b];ok=((aa[:,1]-y)*(bb[:,1]-y)<0)
            t=(y-aa[ok,1])/(bb[ok,1]-aa[ok,1]);q=aa[ok]+(bb[ok]-aa[ok])*t[:,None]
            seg.append((np.flatnonzero(ok),q[:,[0,2]]))
        hits={}
        for ids,qs in seg:
            for id,q in zip(ids,qs):hits.setdefault(id,[]).append(q)
        pairs=np.array([q for q in hits.values() if len(q)==2])
        if not len(pairs):continue
        center=pairs.reshape(-1,2).mean(0)
        a=pairs[:,0]-center;b=pairs[:,1]-center;d=b-a
        for k,line in enumerate(lines):
            theta=2*np.pi*k/len(lines);direction=np.array([np.cos(theta),np.sin(theta)])
            cross=lambda x,z:x[...,0]*z[...,1]-x[...,1]*z[...,0]
            det=cross(direction,d);good=abs(det)>1e-9
            t=np.divide(cross(a,d),det,out=np.zeros_like(det),where=good)
            u=np.divide(cross(a,direction),det,out=np.zeros_like(det),where=good)
            good&=(t>0)&(u>=0)&(u<=1)
            if good.any():
                q=center+direction*t[good].max();line.append([q[0],y,q[1]])
    return [np.array(l) for l in lines if len(l)>8]

models={}
for region,sp in specs.items():
    parts=[load(*p) for p in sp]
    if region=='forearm':
        hum=next(p['v'] for p in parts if p['name']=='humerus')
        elbow=hum[hum[:,1]>np.quantile(hum[:,1],.97)].mean(0)
        context=[('FMA37695','biceps-long'),('FMA37697','biceps-short'),('FMA37699','brachialis'),('FMA37684','triceps-long'),('FMA37686','triceps-lateral'),('FMA37668','triceps-medial')]
        for id,name in context:
            p=load(id,name,'context');p['kind']='context';parts.append(p)
        for p in parts:
            p['v']-=elbow
        top=min(p['v'][:,1].min() for p in parts if p['name']=='brachioradialis')-8
        for p in parts:
            if p['name']=='humerus' or p['kind']=='context':crop_min(p,top)
        pose={'forearmRotation':-80,'description':'기존 회외 자세 · 원본 표면 정지 시안','cameraYaw':[0,90,180]}
        groups={'blue':['brachioradialis'],'orange':['flexor','palmaris'],'green':['extensor'],'pink':['pronator-teres']}
    else:
        # Reuse the native left hip, mirrored into the right side's shared
        # source coordinates. This is pelvis context, no extra muscle.
        p=load('FMA16587','hip','bone');p['v'][:,0]*=-1;p['f']=p['f'][:,[0,2,1]];p['sourceMirrored']=True;parts.append(p)
        fem=next(p['v'] for p in parts if p['name']=='femur')
        root=fem[fem[:,1]<np.quantile(fem[:,1],.05)].mean(0)
        knee=fem[fem[:,1]>np.quantile(fem[:,1],.98)].mean(0)-root
        cut=float(knee[1]+72)
        for p in parts:
            p['v']-=root
            if p['name'] in ['tibia','fibula']:
                crop_bone(p,cut);p['v']=np.array(p['v']);p['f']=np.array(p['f'])
        pose={'kneeFlexion':0,'description':'기존 무릎 폄 자세 · 무릎 아래 짧은 골격','cameraYaw':[32,90,148],'kneeY':float(knee[1]),'lowerLegCut':cut}
        groups={'red':['rectus','vastus'],'blue':['biceps','semim'],'purple':['sartorius','adductor']}
    radius_end=next((q['v'][:,1].max() for q in parts if q['name']=='radius'),None)
    for p in parts:
        if p['name'] in display_colors[region]:p['displayColor']=display_colors[region][p['name']]
        if p['kind'] in ['muscle','context']:p['fibers']=fiber_guides(p)
        # Material cues on existing source faces, never new tendon geometry.
        # These are authored illustration boundaries, not atlas segmentation.
        threshold=None
        if region=='forearm' and p['color'] in ['blue','orange','green']:
            threshold=p['v'][:,1].min()+.78*(min(radius_end,p['v'][:,1].max())-p['v'][:,1].min())
        elif region=='thigh' and p['name'] not in ['hip','femur','tibia','fibula','patella','adductor-longus']:
            offset={'rectus-femoris':65,'vastus-lateralis':28,'vastus-medialis':12,'vastus-intermedius':45,'semitendinosus':80}.get(p['name'],25)
            threshold=pose['kneeY']-offset
        if threshold is not None:
            p['tendonFaces']=np.flatnonzero(p['v'][p['f']].mean(1)[:,1]>threshold).tolist()
            p['materialGuide']={'authored':True,'thresholdY':float(threshold),'description':'White distal material cue on the original surface; not separately segmented tendon.'}
        p['v']=np.round(p['v'],4).tolist();p['f']=p['f'].tolist();p['fibers']=[np.round(f,4).tolist() for f in p['fibers']]
        print(region,p['name'],len(p['f']),len(p['fibers']),flush=True)
    models[region]={'parts':parts,'pose':pose,'groups':groups}
out={'source':'BodyParts3D 3.0 © 2008 DBCLS; CC BY-SA 2.1 Japan; STL Kevin Mattheus Moerman','sourceCommit':PIN,'models':models,'limitations':'Static source atlas surfaces. Fibers are illustration guides, not measured fascicles; no new animation model is claimed.'}
(W/'atlas-data.json').write_text(json.dumps(out,separators=(',',':')))
