"""Prepare a compact, attributed atlas for the native SVG abdominal plate.

Source: DBCLS BodyParts3D 3.0, CC BY-SA 2.1 Japan; OBJ-to-STL conversion
by Kevin Mattheus Moerman, pinned commit f0eeb6e843380cfe6b83797cf8c3e1af74de5e61.
The source coordinates are uniformly scaled, never independently widened.
Fibers and skinning are illustrative fields, not measured tissue trajectories.
"""
from pathlib import Path
import json, hashlib, os
import numpy as np
from scipy.spatial import cKDTree
import fast_simplification

HERE=Path(__file__).resolve().parent
SOURCE=Path(os.environ.get('BODY_PARTS_SOURCE','/workspace/artifacts/independent-anatomy-review'))
SCALE=.58
def convert(p):
    p=np.array(p,dtype=float,copy=True)
    p[...,0]*=SCALE
    p[...,1],p[...,2]=500-(p[...,2]-760)*SCALE,-p[...,1]*SCALE
    return p
cache={}
def load(id,limit):
    key=(id,limit)
    if key in cache:return cache[key]
    b=(SOURCE/(id+'.stl')).read_bytes();n=int.from_bytes(b[80:84],'little')
    dt=np.dtype([('n','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')])
    raw=np.frombuffer(b,dtype=dt,count=n,offset=84)['v']
    vertices,inv=np.unique(raw.reshape(-1,3),axis=0,return_inverse=True)
    faces=inv.reshape(-1,3).astype(np.int32)
    vs,fs=fast_simplification.simplify(vertices.astype(float),faces,target_count=limit,agg=7)
    # Preserve one coherent frame and record simplification error, not a clinical norm.
    a=convert(raw.reshape(-1,3));v=convert(vs)
    bounds_error=float(np.max(np.abs(np.stack([a.min(0),a.max(0)])-np.stack([v.min(0),v.max(0)]))))
    result=(v,fs,{'id':id,'sha256':hashlib.sha256(b).hexdigest(),'sourceFaces':n,'faces':len(fs),'boundsError':bounds_error,'sourceBounds':np.stack([a.min(0),a.max(0)]).round(4).tolist()})
    cache[key]=result;print(id,len(fs),'bounds error',round(bounds_error,3),flush=True)
    return result

parts=[];bones=[]
def add(id,name,kind,limit,side=0,**extra):
    v,f,audit=load(id,limit)
    p={'id':id,'name':name,'kind':kind,'side':side,'v':v,'f':f,'audit':audit,**extra}
    parts.append(p)
    if kind in ['bone','rib','cartilage']:
        p['bone']=len(bones);bones.append(p)
    return p
def bilateral(id,name,kind,limit,**extra):
    p=add(id,name,kind,limit,side=1,**extra)
    v=p['v'].copy();v[:,0]*=-1
    q={**p,'name':name+'-right','side':-1,'v':v,'f':p['f'][:,[0,2,1]].copy(),'mirrored':True}
    parts.append(q)
    if 'bone' in q:q['bone']=len(bones);bones.append(q)
    return p,q

spine_ids=['FMA12525','FMA9165','FMA9187','FMA9209','FMA9248','FMA9922','FMA9945','FMA9968','FMA9991','FMA10014','FMA10037','FMA10059','FMA10081','FMA13072','FMA13073','FMA13074','FMA13075','FMA13076']
spine=[]
for i,id in enumerate(spine_ids):
    name='C7' if i==0 else 'T'+str(i) if i<=12 else 'L'+str(i-12)
    p=add(id,name,'bone',240,joint='spine')
    # Anterior vertebral-body vertices, excluding posterior processes.
    v=p['v'];core=v[(v[:,2]>np.quantile(v[:,2],.65))&(np.abs(v[:,0])<12)]
    center=(core if len(core) else v).mean(0);p['center']=center.tolist();p['level']=float(center[1]);spine.append(center)
ribs=[]
for i,id in enumerate(['FMA7987','FMA8012','FMA8039','FMA8148','FMA8093','FMA8202','FMA8256','FMA8310','FMA8391','FMA8472','FMA8532','FMA8534']):
    a,b=bilateral(id,'rib-'+str(i+1),'rib',420,joint='rib',level=float(spine[i+1][1]),number=i+1)
    ribs.append(a)
for i,id in enumerate(['FMA8005','FMA8031','FMA8058','FMA8167','FMA8112','FMA8221','FMA8275']):
    bilateral(id,'cartilage-'+str(i+1),'cartilage',130,joint='cartilage',level=float(spine[i+1][1]),number=i+1)
for id,name in [('FMA7486','manubrium'),('FMA7487','sternal-body'),('FMA7488','xiphoid')]:
    add(id,name,'bone',250,joint='sternum',level=float(spine[4][1]))
scaps=bilateral('FMA13396','scapula','bone',700,joint='scapula')
bilateral('FMA13323','clavicle','bone',300,joint='clavicle',level=float(spine[1][1]))
bilateral('FMA16587','hip','bone',900,joint='pelvis')
add('FMA16202','sacrum','bone',500,joint='pelvis')
muscles={}
for id,name,color,n in [('FMA13399','serratus','orange',2200),('FMA13337','external-oblique','blue',2800),('FMA13359','latissimus','purple',1400),('FMA13378','rectus','red',1300),('FMA13893','internal-oblique','green',2400)]:
    pair=bilateral(id,name,'muscle',n,color=color);muscles[name]=pair
for id,name in [('FMA34691','pectoral-clavicular'),('FMA79980','pectoral-sternal'),('FMA45875','pectoral-abdominal')]:
    bilateral(id,name,'context',450,color='context')

# Contact guides on the actual posterior costal surface. A rigid scapular
# frame follows their fitted orientation, rather than a hard-coded T1 yaw.
mounts=[]
scap_tree=cKDTree(scaps[0]['v'])
for rib in ribs[2:8]:
    d,_=scap_tree.query(rib['v']);index=np.argsort(d)[:max(3,len(d)//35)]
    mounts.append({'point':rib['v'][index].mean(0).round(4).tolist(),'bone':rib['bone'],'distance':float(d[index].mean())})

bone_trees=[cKDTree(p['v']) for p in bones if p['kind']!='cartilage']
bone_indices=[p['bone'] for p in bones if p['kind']!='cartilage']
cartilage_tree=None;cartilage_bindings=None;rectus_costal_height=None;rectus_pubic_height=None
def bind(points,allowed=None,full=False,cartilage_support=False):
    choices=[i for i,b in enumerate(bone_indices) if allowed is None or b in allowed]
    distances=np.column_stack([bone_trees[i].query(points)[0] for i in choices])
    order=np.argsort(distances,axis=1)[:,:3];selected=np.take_along_axis(distances,order,axis=1)
    # Near bony contacts follow their bone exactly; remote soft tissue follows
    # the continuous spine field. Both neighboring muscles use the same field.
    near=selected[:,0];t=np.clip((near-5)/18,0,1);influence=1-t*t*(3-2*t)
    if full:influence=np.ones_like(influence)
    weights=1/(selected+.4)**6;weights=weights/weights.sum(1)[:,None]*influence[:,None]
    mix=np.clip((near-5)/5,0,1);mix=mix*mix*(3-2*mix)
    weights*=mix[:,None];weights[:,0]+=(1-mix)*influence
    indices=np.array([bone_indices[choices[i]] for i in order.reshape(-1)]).reshape(-1,3)
    result=np.column_stack([indices[:,0],weights[:,0],indices[:,1],weights[:,1],indices[:,2],weights[:,2]])
    if cartilage_support and cartilage_tree is not None:
        distance,index=cartilage_tree.query(points,k=3)
        t=np.clip((distance[:,0]-5)/20,0,1);influence=1-t*t*(3-2*t)
        if cartilage_support=='wall':
            # Rectus and its neighboring aponeurosis share one continuous
            # anterior-wall field. A different belly field opens false holes.
            t=np.clip((np.array(points)[:,1]-rectus_costal_height)/(rectus_pubic_height-rectus_costal_height),0,1)
            longitudinal=1-t*t*(3-2*t)
            backbone=np.array(spine);order=np.argsort(backbone[:,1]);backbone=backbone[order]
            points_array=np.array(points);axis=np.interp(points_array[:,1],backbone[:,1],backbone[:,2])
            angle=np.degrees(np.arctan2(abs(points_array[:,0]),points_array[:,2]-axis))
            t=np.clip((angle-40)/45,0,1);anterior=1-t*t*(3-2*t)
            t=np.clip((near-5)/5,0,1);free=t*t*(3-2*t)
            influence=np.maximum(influence,longitudinal*anterior*free)
        ws=1/(distance+.4)**6;ws/=ws.sum(1)[:,None]
        for row in range(len(points)):
            if influence[row]<=0:continue
            merged={}
            for j in range(0,6,2):merged[int(result[row,j])]=result[row,j+1]*(1-influence[row])
            for neighbor in range(3):
                b=cartilage_bindings[index[row,neighbor]]
                for j in range(0,6,2):merged[int(b[j])]=merged.get(int(b[j]),0)+b[j+1]*ws[row,neighbor]*influence[row]
            pairs=sorted(merged.items(),key=lambda p:-p[1])[:3]
            # Renormalize retained bone weights without losing the body fraction.
            target=sum(merged.values());total=sum(w for _,w in pairs)
            while len(pairs)<3:pairs.append((0,0))
            result[row]=np.array([[i,w*target/total] for i,w in pairs]).reshape(-1)
    return result.round(5).tolist()

sternal_indices=[p['bone'] for p in bones if p.get('joint')=='sternum']
for p in parts:
    if p['kind']=='cartilage':
        parent=next(b['bone'] for b in bones if b['kind']=='rib' and b['number']==p['number'] and b['side']==p['side'])
        # Cartilage connects its own rib to the sternum; a free spine-height
        # field is not its attachment frame, especially at the low costal tip.
        p['bind']=bind(p['v'],allowed=[parent,*sternal_indices],full=True)
cartilages=[p for p in parts if p['kind']=='cartilage']
cartilage_tree=cKDTree(np.concatenate([p['v'] for p in cartilages]))
cartilage_bindings=np.concatenate([p['bind'] for p in cartilages])
rectus_source=muscles['rectus'][0]['v'];contact_distance,_=cartilage_tree.query(rectus_source)
rectus_costal_height=float(rectus_source[contact_distance<5,1].max());rectus_pubic_height=float(rectus_source[:,1].max())
for p in parts:
    if p['kind'] in ['muscle','context']:p['bind']=bind(p['v'],cartilage_support='wall' if p['name'].startswith(('rectus','external-oblique')) else p['name'].startswith('pectoral'))

def contacts(p,rib):
    v=p['v'];candidate=rib['v'][(rib['v'][:,0]>30)&(rib['v'][:,2]>25)]
    d,j=cKDTree(v).query(candidate);valid=np.where(d<min(d.min()+1.5,5))[0]
    if not len(valid):valid=np.argsort(d)[:8]
    # The most anterior contact among the close costal attachment region.
    chosen=valid[np.argmax(candidate[valid,2])];return int(j[chosen])
def surface_fiber(p,start,end,offset=0):
    # Illustrative fascicle guides follow the curved source surface. Project
    # radial samples onto its OUTER face, not the rib-facing inner surface.
    # The atlas contains no measured fascicle trajectories.
    a=p['v'][start].copy();b=p['v'][end].copy()
    a[1]+=offset;b[1]+=offset*.35
    if np.linalg.norm(a-b)<1:return None
    backbone=np.array(spine);order=np.argsort(backbone[:,1]);backbone=backbone[order]
    cz=lambda y:np.interp(y,backbone[:,1],backbone[:,2])
    aa=np.arctan2(a[2]-cz(a[1]),a[0]);ab=np.arctan2(b[2]-cz(b[1]),b[0]);da=(ab-aa+np.pi)%(2*np.pi)-np.pi
    t=np.linspace(0,1,40);y=a[1]+(b[1]-a[1])*t;angle=aa+da*t
    origins=np.column_stack([np.zeros(len(t)),y,cz(y)])
    directions=np.column_stack([np.cos(angle),np.zeros(len(t)),np.sin(angle)])
    triangles=p['v'][p['f']];v0=triangles[:,0];e1=triangles[:,1]-v0;e2=triangles[:,2]-v0
    curves=[];tree=cKDTree(p['v'])
    radius_a=np.hypot(a[0],a[2]-cz(a[1]));radius_b=np.hypot(b[0],b[2]-cz(b[1]))
    for j,(o,d) in enumerate(zip(origins,directions)):
        h=np.cross(np.broadcast_to(d,e2.shape),e2);det=np.sum(e1*h,axis=1);valid=np.abs(det)>1e-9
        inv=np.divide(1,det,out=np.zeros_like(det),where=valid);delta=o-v0
        u=np.sum(delta*h,axis=1)*inv;q=np.cross(delta,e1);v=np.sum(d*q,axis=1)*inv;distance=np.sum(e2*q,axis=1)*inv
        valid &= (u>=0)&(v>=0)&(u+v<=1)&(distance>0)
        if np.any(valid):point=o+d*distance[valid].max()
        else:
            guide=o+d*(radius_a+(radius_b-radius_a)*t[j]);_,index=tree.query(guide);point=p['v'][index]
        curves.append(point)
    return np.array(curves)

for name in ['serratus','external-oblique','latissimus','rectus','internal-oblique']:
    p=muscles[name][0];v=p['v'];tree=cKDTree(v);fibers=[];landmarks=[]
    if name=='serratus':
        scap=scaps[0]['v'];lo,hi=scap[:,1].min(),scap[:,1].max()
        targets=lo+(hi-lo)*np.array([.06,.23,.43,.68,.86,.91,.955,.985])
        for i,rib in enumerate(ribs[:8]):
            origin=contacts(p,rib);band=scap[np.abs(scap[:,1]-targets[i])<5]
            if not len(band):band=scap[np.argsort(abs(scap[:,1]-targets[i]))[:12]]
            medial=band[np.argsort(band[:,0])[:max(3,len(band)//5)]];target=medial.mean(0)
            _,end=tree.query(target);landmarks.append({'rib':i+1,'origin':v[origin].round(4).tolist(),'insertion':v[end].round(4).tolist(),'costalError':float(cKDTree(rib['v']).query(v[origin])[0]),'scapularError':float(cKDTree(scap).query(v[end])[0])})
            # Spread neighboring fascicles across the source slip surface.
            for j in range(9):
                _,a=tree.query(v[origin]+[0,(j-4)*.8,0]);_,b=tree.query(v[end]+[0,(j-4)*.35,0]);curve=surface_fiber(p,int(a),int(b),offset=(j-4)*.65)
                if curve is not None:fibers.append(curve)
    elif name=='external-oblique':
        for i,rib in enumerate(ribs[4:12]):
            origin=contacts(p,rib);o=v[origin];target_y=min(450,o[1]+45+i*3)
            target=[42+max(0,i-3)*6,target_y,100-max(0,i-3)*9]
            for j in range(10):
                _,a=tree.query(o+[0,(j-4.5)*1.4,0]);_,b=tree.query(np.array(target)+[0,(j-4.5)*2,0]);curve=surface_fiber(p,int(a),int(b),offset=(j-4.5)*.55)
                if curve is not None:fibers.append(curve)
    elif name=='latissimus':
        top=v[v[:,1]<np.quantile(v[:,1],.04)].mean(0)
        origins=v[(v[:,1]>np.quantile(v[:,1],.7))|(v[:,0]<5)]
        origins=origins[np.argsort(origins[:,1])]
        for o in origins[np.linspace(0,len(origins)-1,55).astype(int)]:
            _,a=tree.query(o);_,b=tree.query(top);curve=surface_fiber(p,int(a),int(b))
            if curve is not None:fibers.append(curve)
    elif name=='internal-oblique':
        # Inferomedial-to-superolateral is the external oblique direction;
        # the internal layer runs from the iliac/flank region superomedially.
        origins=v[(v[:,1]>np.quantile(v[:,1],.60))&(v[:,0]>np.quantile(v[:,0],.55))]
        origins=origins[np.argsort(origins[:,1])]
        for i,o in enumerate(origins[np.linspace(0,len(origins)-1,26).astype(int)]):
            _,a=tree.query(o);_,b=tree.query([max(8,o[0]-35),max(280,o[1]-70),o[2]+25])
            curve=surface_fiber(p,int(a),int(b))
            if curve is not None:fibers.append(curve)
    else:
        for x in np.linspace(v[:,0].min()+2,v[:,0].max()-2,26):
            top=v[v[:,1]<np.quantile(v[:,1],.03)];bottom=v[v[:,1]>np.quantile(v[:,1],.97)]
            a=np.argmin(np.linalg.norm(v-np.array([x,top[:,1].mean(),top[:,2].mean()]),axis=1));b=np.argmin(np.linalg.norm(v-np.array([x,bottom[:,1].mean(),bottom[:,2].mean()]),axis=1));curve=surface_fiber(p,int(a),int(b))
            if curve is not None:fibers.append(curve)
    support='wall' if name in ['rectus','external-oblique'] else False
    p['fibers']=[{'p':curve.round(3).tolist(),'bind':bind(curve,cartilage_support=support)} for curve in fibers];p['landmarks']=landmarks
    right=muscles[name][1];right['fibers']=[{'p':(np.array(f['p'])*[-1,1,1]).tolist(),'bind':bind(np.array(f['p'])*[-1,1,1],cartilage_support=support)} for f in p['fibers']]
    right['landmarks']=[{**a,'origin':(np.array(a['origin'])*[-1,1,1]).tolist(),'insertion':(np.array(a['insertion'])*[-1,1,1]).tolist()} for a in landmarks]
    print(name,'fibers',len(fibers),'attachments',landmarks,flush=True)

for p in parts:
    if p['kind']=='context':
        v=p['v'];tree=cKDTree(v);top=v[np.argmax(abs(v[:,0]))];curves=[]
        medial=v[np.argsort(abs(v[:,0]))[:max(15,len(v)//8)]]
        for o in medial[np.linspace(0,len(medial)-1,12).astype(int)]:
            _,a=tree.query(o);_,b=tree.query(top);curve=surface_fiber(p,int(a),int(b))
            if curve is not None:curves.append({'p':curve.round(3).tolist(),'bind':bind(curve,cartilage_support=True)})
        p['fibers']=curves

result={'source':{'name':'BodyParts3D 3.0','copyright':'BodyParts3D, (c) The Database Center for Life Science','license':'CC BY-SA 2.1 Japan','conversion':'Kevin Mattheus Moerman','commit':'f0eeb6e843380cfe6b83797cf8c3e1af74de5e61','uniformScale':SCALE,'mirroring':'Left skeletal and soft-tissue atlas geometry mirrored for the right hemisphere.','limits':'Static atlas; fiber paths and skeletal skinning are illustrative, not measured physiological deformation.'},'rectusSupport':{'costalHeight':rectus_costal_height,'pubicHeight':rectus_pubic_height,'contactBand':5},'spine':np.array(spine).round(4).tolist(),'mounts':mounts,'parts':[]}
for p in parts:
    q={k:value for k,value in p.items() if k not in ['v','f']};q['v']=p['v'].round(3).tolist();q['f']=p['f'].tolist();result['parts'].append(q)
out=HERE/'atlas-data.json';out.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(out,out.stat().st_size,flush=True)
