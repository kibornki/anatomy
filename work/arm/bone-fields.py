"""Voxel signed distances from the actual closed atlas bone triangle meshes.
Distance fields retain multiple depth intervals, including the ulnar notch.
Coordinates are neutral bone space; the renderer queries inverse rigid poses.
"""
from pathlib import Path
import json,numpy as np,base64
from scipy.ndimage import distance_transform_edt
w=Path(__file__).parent;atlas=json.loads((w/'atlas-input.json').read_text());fields=[]
step=1.25
for part in atlas['parts']:
 if part['name'] not in ['humerus','ulna','radius']:continue
 v=np.array(part['v']);origin=np.floor((v.min(0)-6)/step)*step;shape=np.ceil((v.max(0)+6-origin)/step).astype(int)+1;nx,ny,nz=shape
 hits={}
 for tri in v[np.array(part['f'])]:
  ps=(tri[:,:2]-origin[:2])/step;a,b,c=ps
  den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
  if abs(den)<1e-8:continue
  lo=np.maximum(0,np.floor(ps.min(0)).astype(int));hi=np.minimum(shape[:2]-1,np.ceil(ps.max(0)).astype(int));xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1),indexing='ij')
  wa=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;wb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;wc=1-wa-wb;valid=(wa>=-1e-8)&(wb>=-1e-8)&(wc>=-1e-8)
  zz=wa*tri[0,2]+wb*tri[1,2]+wc*tri[2,2]
  for x,y,z in zip(xx[valid],yy[valid],zz[valid]):hits.setdefault((x,y),[]).append(float(z))
 inside=np.zeros(shape,dtype=bool);zs=origin[2]+np.arange(nz)*step;odd=0
 for (x,y),values in hits.items():
  values=sorted(set(round(z,5) for z in values));clean=[]
  for z in values:
   if not clean or z-clean[-1]>.001:clean.append(z)
  if len(clean)%2:odd+=1;continue
  for lo,hi in zip(clean[::2],clean[1::2]):inside[x,y,:]|=(zs>lo)&(zs<hi)
 # C-order data uses z fastest, then y, then x.
 sdf=(distance_transform_edt(~inside)-distance_transform_edt(inside))*step
 data=np.clip(np.rint(sdf*16),-32767,32767).astype('<i2')
 field={'name':part['name'],'moving':part['name'] in ['radius','ulna'],'origin':origin.tolist(),'shape':shape.tolist(),'step':step,'units':16,'data':base64.b64encode(data.tobytes()).decode()};fields.append(field)
 print(part['name'],'shape',shape,'occupied',int(inside.sum()),'unpaired columns',odd,flush=True)
(w/'bone-fields.json').write_text(json.dumps(fields,separators=(',',':')))
