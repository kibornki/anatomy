"""Actual pinned BodyParts3D surfaces; static upper-body proposal only."""
from pathlib import Path
import numpy as np,json,hashlib
from scipy.spatial import cKDTree
import fast_simplification
W=Path(__file__).parent;ROOT=W.parents[1];NEW=Path('/workspace/artifacts/upperbody-atlas-preview/source');OLD=Path('/workspace/artifacts/independent-anatomy-review');ARM=Path('/workspace/artifacts/arm-atlas-preview/source')
SCALE=.58;PIN='f0eeb6e843380cfe6b83797cf8c3e1af74de5e61'
def convert(raw):return np.column_stack([raw[:,0]*SCALE,500-(raw[:,2]-760)*SCALE,-raw[:,1]*SCALE])
sources=[]
def load(id,name,kind,faces,color=None,mirror_source=False):
 path=next(p/(id+'.stl') for p in [NEW,OLD,ARM] if (p/(id+'.stl')).exists());b=path.read_bytes();n=int.from_bytes(b[80:84],'little');dt=np.dtype([('n','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')]);raw=np.frombuffer(b,dt,n,84)['v'].reshape(-1,3)
 v,inv=np.unique(raw,axis=0,return_inverse=True);v,f=fast_simplification.simplify(v.astype(float),inv.reshape(-1,3).astype(np.int32),target_count=faces,agg=7);v=convert(v)
 if mirror_source:v[:,0]*=-1;f=f[:,[0,2,1]]
 sources.append({'id':id,'sha256':hashlib.sha256(b).hexdigest(),'url':f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{PIN}/assets/BodyParts3D_data/stl/{id}.stl','sourceFaces':n,'displayFaces':len(f)})
 return {'id':id,'name':name,'kind':kind,'color':color,'v':v,'f':f,'side':1,'fibers':[],'sourceMirrored':mirror_source}
base=json.loads((ROOT/'work/abdomen/atlas-data.json').read_text());parts=[]
for p in base['parts']:
 if p['kind'] not in ['bone','rib','cartilage'] or p['name'].startswith(('scapula','clavicle')) or p.get('side')==-1:continue
 p={**p,'v':np.array(p['v']),'f':np.array(p['f']),'fibers':[]};parts.append(p)
 # Original atlas bone audit is retained; no synthetic rib or pelvis geometry.
for id,name in [('FMA12522','C4'),('FMA12523','C5'),('FMA12524','C6')]:parts.append(load(id,name,'bone',450))
scap=load('FMA13396','scapula','bone',1400);clav=load('FMA13323','clavicle','bone',650);hum=load('FMA23130','humerus','bone',1500,mirror_source=True);ulna=load('FMA23467','ulna','bone',850,mirror_source=True);radius=load('FMA23464','radius','bone',750,mirror_source=True)
parts.extend([scap,clav,hum,ulna,radius])
# The same neutral-frame crop/cap used for the reviewed arm.
prepare=(ROOT/'work/arm/prepare.py').read_text();block=prepare[prepare.index('def crop_bone('):prepare.index("for p in parts:\n if p['name'] in ['radius','ulna']")];exec(block)
elbow=float(np.mean(hum['v'][hum['v'][:,1]>np.quantile(hum['v'][:,1],.97),1]));cut=elbow+40
for p in [ulna,radius]:crop_bone(p,cut);p['v']=np.array(p['v']);p['f']=np.array(p['f'])
specs=[('FMA34691','pectoral-clavicular','red',1800),('FMA79980','pectoral-sternal','blue',2400),('FMA45875','pectoral-abdominal','green',1400),('FMA13399','serratus','orange',2800),('FMA13359','latissimus','purple',2400),('FMA33587','trapezius-upper','red',1800),('FMA33585','trapezius-middle','blue',1200),('FMA33583','trapezius-lower','green',1400),('FMA32548','infraspinatus','yellow',1800),('FMA32552','teres-major','orange',1200),('FMA32554','teres-minor','teal',900)]
muscles=[load(id,name,'muscle',faces,color) for id,name,color,faces in specs];parts+=muscles
# Static 60-degree arm elevation. Bone transforms are rigid; these motion
# choices/soft bindings are illustration guides, not measured kinematics.
def rot(points,pivot,degrees):
 p=np.array(points);a=np.deg2rad(degrees);d=p-np.array(pivot);return np.column_stack([d[:,0]*np.cos(a)+d[:,1]*np.sin(a),-d[:,0]*np.sin(a)+d[:,1]*np.cos(a),d[:,2]])+pivot
sc=clav['v'][clav['v'][:,0]<np.quantile(clav['v'][:,0],.06)].mean(0);ac=clav['v'][clav['v'][:,0]>np.quantile(clav['v'][:,0],.94)].mean(0);gh=hum['v'][hum['v'][:,1]<np.quantile(hum['v'][:,1],.07)].mean(0)
ac_delta=rot([ac],sc,10)[0]-ac
clav_pose=lambda ps:rot(ps,sc,10)
scap_pose=lambda ps:rot(ps,ac,20)+ac_delta
gh_delta=scap_pose([gh])[0]-gh
distal=hum['v'][hum['v'][:,1]>np.quantile(hum['v'][:,1],.97)].mean(0);neutral_abduction=float(np.rad2deg(np.arctan2(distal[0]-gh[0],distal[1]-gh[1])));humeral_rotation=60-neutral_abduction
arm_pose=lambda ps:rot(ps,gh,humeral_rotation)+gh_delta
posed_axis=arm_pose([gh,distal]);assert abs(np.rad2deg(np.arctan2(*(posed_axis[1]-posed_axis[0])[[0,1]]))-60)<1e-7
fixed=[p for p in parts if p['kind']!='muscle' and p['name'] not in ['scapula','clavicle','humerus','ulna','radius']]
fixed_tree=cKDTree(np.concatenate([p['v'] for p in fixed]));scap_tree=cKDTree(scap['v']);clav_tree=cKDTree(clav['v']);hum_tree=cKDTree(hum['v'])
identity=lambda ps:np.array(ps).copy()
def pose_soft(ps,name):
 ps=np.array(ps)
 if name=='serratus':bindings=[(fixed_tree,identity),(scap_tree,scap_pose)]
 elif name.startswith('trapezius'):bindings=[(fixed_tree,identity),(scap_tree,scap_pose),(clav_tree,clav_pose)]
 elif name in ['infraspinatus','teres-major','teres-minor']:bindings=[(scap_tree,scap_pose),(hum_tree,arm_pose)]
 elif name=='pectoral-clavicular':bindings=[(clav_tree,clav_pose),(hum_tree,arm_pose)]
 else:bindings=[(fixed_tree,identity),(hum_tree,arm_pose)]
 weights=np.column_stack([1/(tree.query(ps)[0]+2)**4 for tree,_ in bindings]);weights/=weights.sum(1)[:,None]
 return sum(transform(ps)*weights[:,i,None] for i,(_,transform) in enumerate(bindings))
# Reuse the abdomen's actual surface-ray method for illustrative fiber guides.
spine=base['spine'];export=(ROOT/'work/abdomen/export-atlas.py').read_text();exec(export[export.index('def surface_fiber('):export.index("for name in ['serratus','external-oblique'")])
for p in muscles:
 name=p['name'];v=p['v'];tree=cKDTree(v)
 previous=next((q for q in base['parts'] if q['name']==name),None)
 if name in ['serratus','latissimus'] and previous:p['fibers']=[np.array(f['p']) for f in previous['fibers']]
 else:
  if name=='pectoral-clavicular':origins=v[v[:,1]<np.quantile(v[:,1],.16)];sort=0
  elif name.startswith('pectoral') or name.startswith('trapezius'):origins=v[v[:,0]<np.quantile(v[:,0],.16)];sort=1
  elif name=='teres-major':origins=v[v[:,1]>np.quantile(v[:,1],.80)];sort=0
  else:origins=v[v[:,0]<np.quantile(v[:,0],.18)];sort=1
  origins=origins[np.argsort(origins[:,sort])];end=v[v[:,0]>np.quantile(v[:,0],.96)].mean(0)
  for o in origins[np.linspace(0,len(origins)-1,30 if name.startswith('pectoral') else 24).astype(int)]:
   _,a=tree.query(o);_,b=tree.query(end);curve=surface_fiber(p,int(a),int(b))
   if curve is not None:p['fibers'].append(curve)
 print(name,len(p['f']),len(p['fibers']),flush=True)
# No head; retain a short neck. Crop the atlas upper trapezius at the same
# anatomical cervical height as the visible neck, rather than creating a head.
neck_top=min(p['v'][:,1].min() for p in parts if p['name']=='C4')
for p in parts:
 neutral=p['v'].copy()
 if p['kind']=='muscle':p['v']=pose_soft(neutral,p['name']);p['fibers']=[pose_soft(f,p['name']) for f in p['fibers']]
 elif p['name']=='scapula':p['v']=scap_pose(neutral)
 elif p['name']=='clavicle':p['v']=clav_pose(neutral)
 elif p['name'] in ['humerus','radius','ulna']:p['v']=arm_pose(neutral)
 if p['kind']!='muscle':
  ids=np.linspace(0,len(neutral)-1,min(30,len(neutral))).astype(int);assert np.max(np.abs(np.linalg.norm(neutral[ids]-neutral[0],axis=1)-np.linalg.norm(p['v'][ids]-p['v'][0],axis=1)))<1e-7
 p['v']=p['v'].round(4).tolist();p['f']=p['f'].tolist();p['fibers']=[f.round(4).tolist() for f in p['fibers']]
 p.pop('bind',None)
# Reflect the same posed atlas to the other side, never widen x independently.
mirrored=[]
for p in parts:
 if p.get('side')==1 and p['name'] not in ['C4','C5','C6']:
  q={**p,'name':p['name']+'-right','side':-1,'v':(np.array(p['v'])*[-1,1,1]).tolist(),'f':np.array(p['f'])[:,[0,2,1]].tolist(),'fibers':[(np.array(f)*[-1,1,1]).tolist() for f in p['fibers']],'mirrored':True};mirrored.append(q)
parts+=mirrored
expected=set(name for _,name,_,_ in specs);assert {p['name'].removesuffix('-right') for p in parts if p['kind']=='muscle'}==expected
out={'source':'BodyParts3D 3.0 © 2008 DBCLS; CC BY-SA 2.1 Japan; STL Kevin Mattheus Moerman','sourceCommit':PIN,'scale':SCALE,'pose':{'armAbduction':60,'humeralRotation':humeral_rotation,'neutralHumeralAbduction':neutral_abduction,'clavicleElevation':10,'scapularUpwardRotation':20,'cameraYaw':[0,90,180]},'neckTop':float(neck_top),'forearmCutNeutral':cut,'parts':parts,'sources':sources,'limitations':'Static proposal using real atlas shells. Shoulder pose, skinning and surface fibers are illustrative, not measured kinematics or fascicles.'}
(W/'atlas-data.json').write_text(json.dumps(out,separators=(',',':')));print('Prepared',len(parts),'parts; muscles',sorted(expected),'neck',neck_top,'forearm cut',cut)
