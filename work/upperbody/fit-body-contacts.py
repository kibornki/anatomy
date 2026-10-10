"""Offline contact offsets for the tested extreme torso proportions.

Uses actual posed source shells, keeps anatomical attachment bands fixed,
and restores latissimus volume using its free lower sheet. The offsets are
small illustration clearances, not reconstructed individual anatomy.
"""
from pathlib import Path
import base64,hashlib,json,runpy,tempfile
import numpy as np

w=Path(__file__).parent
atlas=json.loads((w/'atlas-data.json').read_text());parts=[p for p in atlas['parts'] if not p.get('mirrorOf')];lat=next(p for p in parts if p['name']=='latissimus');v=np.array(lat['v']);f=np.array(lat['f']);contact=runpy.run_path(str(w/'bone-contact.py'))['BoneContact'](parts)
core=(w.parent/'arm/bone-fields.py').read_text();core=core[core.index('step=1.25'):core.index("(w/'bone-fields.json')")].replace("if part['name'] not in ['humerus','ulna','radius']:continue",'if False:continue');cache=Path(tempfile.gettempdir())/'anatomy-body-fit-contact';cache.mkdir(exist_ok=True)
weights=np.array([[a/9,b/9,1-(a+b)/9] for a in range(10) for b in range(10-a)]);faces=np.repeat(f,len(weights),axis=0);bary=np.tile(weights,(len(f),1));source=np.einsum('ij,ijk->ik',bary,v[faces]);free=np.ones(len(v),bool);free[lat['attachments']['origin']+lat['attachments']['insertion']]=False;bw=bary*free[faces];den=np.maximum((bw*bw).sum(1),1e-8);mutable=(bw*bw).sum(1)>1e-8;names=['serratus','teres-major','trapezius-lower','scapula','humerus','clavicle']
def fields(ps):
 key=hashlib.sha256(json.dumps(ps,separators=(',',':')).encode()).hexdigest()[:16];file=cache/(key+'.json')
 if file.exists():out=json.loads(file.read_text())
 else:
  scope={'atlas':{'parts':ps},'fields':[]};exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n'+core,scope);out=scope['fields'];file.write_text(json.dumps(out,separators=(',',':')))
 for field in out:field['grid']=np.frombuffer(base64.b64decode(field.pop('data')),dtype='<i2').reshape(field['shape'])/16
 return out
masks={field['name']:mutable&(contact.sample(field,source)>1) for field in fields([p for p in parts if p['name'] in names])};volume=lambda q:np.einsum('ij,ij->i',q[f[:,0]],np.cross(q[f[:,1]],q[f[:,2]])).sum()/6;cases=json.loads((Path(tempfile.gettempdir())/'anatomy-body-fit-poses.json').read_text());corrections=[];reports=[]
for case in cases:
 if all(x==1 for x in case['shape'].values()):continue
 native=np.array(next(p for p in case['parts'] if p['name']=='latissimus')['v']);q=native.copy();target=volume(q);rules=fields([p for p in case['parts'] if p['name'] in names]);crossings=0
 for iteration in range(60):
  points=np.einsum('ij,ijk->ik',bary,q[faces]);shift=np.zeros_like(q);count=np.zeros(len(v));crossings=0
  for field in rules:
   d=contact.sample(field,points);mask=masks[field['name']];bad=mask&(d<.65);crossings+=int(np.sum(mask&(d<-.25)))
   if not bad.any():continue
   pts=points[bad];grad=np.column_stack([(contact.sample(field,pts+np.eye(3)[k]*.6)-contact.sample(field,pts-np.eye(3)[k]*.6))/1.2 for k in range(3)]);grad/=np.maximum(np.linalg.norm(grad,axis=1),.1)[:,None];delta=grad*np.minimum(.35,.7-d[bad])[:,None]/den[bad,None]
   for j in range(3):np.add.at(shift,faces[bad,j],delta*bw[bad,j,None]);np.add.at(count,faces[bad,j],(bw[bad,j]>0).astype(float))
  q+=shift/np.maximum(count,1)[:,None]
  error=target-volume(q);tri=q[f];gradient=np.zeros_like(q)
  for a,b,c in [(0,1,2),(1,2,0),(2,0,1)]:np.add.at(gradient,f[:,a],np.cross(tri[:,b],tri[:,c])/6)
  gradient[:,:2]=0;gradient[~free|(v[:,1]<300)]=0;q+=gradient*error/max(np.sum(gradient*gradient),1e-8)
  if iteration>8 and crossings==0:break
 delta=np.rint((q-native).reshape(-1)*50).astype('<i2');corrections.append({'shape':case['shape'],'angle':case['angle'],'displacement':base64.b64encode(delta.tobytes()).decode()});r={'shape':case['shape'],'angle':case['angle'],'crossings':crossings,'iterations':iteration,'maxOffset':float(np.linalg.norm(q-native,axis=1).max()),'volumeRatio':float(volume(q)/target)};reports.append(r);print(r,flush=True)
 assert crossings==0,r
path=w/'body-fit-data.json';data=json.loads(path.read_text());data['latissimusContactCorrections']=corrections;path.write_text(json.dumps(data,separators=(',',':')));(w/'body-fit-contact-fit-validation.json').write_text(json.dumps(reports,indent=2))
