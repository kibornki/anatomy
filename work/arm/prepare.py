"""Prepare the reviewed arm: atlas shells + explicitly authored tendon/fascicle guides.
The guide positions are inferred from the user's posterior anatomy reference,
not a tendon or fascicle segmentation supplied by BodyParts3D.
"""
from pathlib import Path
import json,numpy as np
from scipy.ndimage import gaussian_filter1d
w=Path(__file__).parent;d=json.loads((w/'atlas-input.json').read_text());parts=d['parts']
hum=np.array(parts[0]['v']);ys=np.arange(50,291,2);axis=[]
for y in ys:
 band=hum[np.abs(hum[:,1]-y)<7]
 if not len(band):band=hum[np.argsort(abs(hum[:,1]-y))[:12]]
 axis.append(band[:,[0,2]].mean(0))
axis=gaussian_filter1d(np.array(axis),4,axis=0)
def center(y):return np.array([np.interp(y,ys,axis[:,0]),y,np.interp(y,ys,axis[:,1])])
def ray(part,y,theta):
 tri=np.array(part['v'])[np.array(part['f'])];v0=tri[:,0];e1=tri[:,1]-v0;e2=tri[:,2]-v0;o=center(y);direction=np.array([np.cos(theta),0,np.sin(theta)])
 h=np.cross(direction,e2);det=(e1*h).sum(1);inv=np.divide(1,det,out=np.zeros_like(det),where=abs(det)>1e-8);s=o-v0;u=(s*h).sum(1)*inv;q=np.cross(s,e1);v=(direction*q).sum(1)*inv;t=(e2*q).sum(1)*inv
 valid=(abs(det)>1e-8)&(u>=-1e-6)&(v>=-1e-6)&(u+v<=1.000001)&(t>0)
 return o+direction*t[valid].max() if valid.any() else None
triceps=[p for p in parts if p['name'].startswith('triceps')]
def posterior(y,theta):
 hits=[q for p in triceps if (q:=ray(p,y,theta)) is not None]
 return max(hits,key=lambda q:np.linalg.norm(q-center(y))) if hits else None
levels=[157,165,179,200,224,245,266,280,286];widths=np.deg2rad([0,7,20,29,30,25,18,11,5])
def width(y):return np.interp(y,levels,widths)
# The broad plate is sampled ON the posterior atlas shell and shares its
# deformation. It changes the drawing surface, not the underlying atlas mass.
patch={'id':'authored-aponeurosis','name':'triceps-aponeurosis','color':'tendon','v':[],'f':[],'fibers':[],'authored':True}
rows=[]
for y in np.linspace(levels[0],levels[-1],45):
 row=[]
 for t in np.linspace(-1,1,19):
  theta=-np.pi/2+t*width(y);q=posterior(y,theta)
  if q is None:row.append(None);continue
  q+=np.array([np.cos(theta),0,np.sin(theta)])*.55
  row.append(len(patch['v']));patch['v'].append(q.round(4).tolist())
 rows.append(row)
for a,b in zip(rows,rows[1:]):
 for j in range(18):
  if all(i is not None for i in [a[j],a[j+1],b[j],b[j+1]]):patch['f'] += [[a[j],a[j+1],b[j+1]],[a[j],b[j+1],b[j]]]
for j in range(1,18,2):
 segment=[]
 for row in rows:
  if row[j] is not None:segment.append(patch['v'][row[j]])
  else:
   if len(segment)>3:patch['fibers'].append(segment)
   segment=[]
 if len(segment)>3:patch['fibers'].append(segment)
# Posterior chart: ray-cast along the back-facing normal instead of the
# humeral radial direction. A radial trace can land on a hidden side wall,
# suppressing the feathering that must be visible beside the tendon plate.
def back_hit(part,x,y):
 tri=np.array(part['v'])[np.array(part['f'])];v0=tri[:,0];e1=tri[:,1]-v0;e2=tri[:,2]-v0;o=np.array([x,y,100.]);direction=np.array([0.,0.,-1.])
 h=np.cross(direction,e2);det=(e1*h).sum(1);inv=np.divide(1,det,out=np.zeros_like(det),where=abs(det)>1e-8);delta=o-v0;u=(delta*h).sum(1)*inv;q=np.cross(delta,e1);v=(direction*q).sum(1)*inv;t=(e2*q).sum(1)*inv
 valid=(abs(det)>1e-8)&(u>=-1e-6)&(v>=-1e-6)&(u+v<=1.000001)&(t>0)
 return o+direction*t[valid].max() if valid.any() else None
def x_bounds(part,y):
 tri=np.array(part['v'])[np.array(part['f'])];xs=[]
 for i,j in [(0,1),(1,2),(2,0)]:
  a=tri[:,i];b=tri[:,j];valid=(a[:,1]-y)*(b[:,1]-y)<=0;valid&=abs(a[:,1]-b[:,1])>1e-8
  t=(y-a[valid,1])/(b[valid,1]-a[valid,1]);xs.extend((a[valid,0]+t*(b[valid,0]-a[valid,0])).tolist())
 return (min(xs),max(xs)) if xs else None
for p in triceps:
 p['fibers']=[];medial=p['name']=='triceps-long';deep=p['name']=='triceps-medial'
 for n in range(27 if not deep else 12):
  end=168+n*(3.9 if not deep else 6);start=max(108 if medial else 119,end-51)
  edge=posterior(end,-np.pi/2+(1 if medial else -1)*width(end));bounds=x_bounds(p,start)
  if edge is None or bounds is None:continue
  xa=bounds[0]+(bounds[1]-bounds[0])*(.83 if medial else .17);xb=edge[0];line=[]
  for t in np.linspace(0,1,70):
   y=start+(end-start)*t;x=xa+(xb-xa)*(t*.5+t*t*.5);q=back_hit(p,x,y)
   if q is None:
    if len(line)>3:p['fibers'].append(line)
    line=[];continue
   q[2]-=.08;line.append(q.round(4).tolist())
  if len(line)>3:p['fibers'].append(line)
# Context stops a short distance below the elbow. Clip in neutral bone
# coordinates so the cut follows the forearm's rigid rotation.
def crop_bone(part,limit=330):
 old=np.array(part['v']);verts=[];faces=[];lookup={};segments=[]
 def index(p):
  key=tuple(np.round(p,6))
  if key not in lookup:lookup[key]=len(verts);verts.append(list(key))
  return lookup[key]
 for face in part['f']:
  polygon=[];crossings=[]
  for i in range(3):
   a=old[face[i]];b=old[face[(i+1)%3]];ia=a[1]<=limit;ib=b[1]<=limit
   if ia:polygon.append(a)
   if ia!=ib:
    q=a+(b-a)*(limit-a[1])/(b[1]-a[1]);polygon.append(q);crossings.append(q)
  if len(crossings)==2:segments.append([index(q) for q in crossings])
  ids=[index(q) for q in polygon]
  for i in range(1,len(ids)-1):faces.append([ids[0],ids[i],ids[i+1]])
 # Cap each cut boundary loop; do not introduce a taper or alter the shaft.
 edges={}
 for a,b in segments:edges.setdefault(a,[]).append(b);edges.setdefault(b,[]).append(a)
 while edges:
  first=next(iter(edges));loop=[first];prev=None;cur=first
  while True:
   options=edges.pop(cur,[]);nxt=next((v for v in options if v!=prev),first)
   if nxt==first:break
   if nxt in loop:break
   loop.append(nxt);prev,cur=cur,nxt
  if len(loop)>2:
   center=np.mean(np.array(verts)[loop],0);ci=index(center)
   for i in range(len(loop)):faces.append([ci,loop[i],loop[(i+1)%len(loop)]])
 part['v']=verts;part['f']=faces;part['displayCut']=limit
for p in parts:
 if p['name'] in ['radius','ulna']:crop_bone(p)
parts.append(patch)
for p in parts:
 p['kind']='bone' if p['color']=='bone' else 'context' if p['color']=='context' else 'tendon' if p['color']=='tendon' else 'muscle'
 if p['name'] in ['radius','ulna']:p['forearm']=True
 colors={'biceps-long':'red','biceps-short':'blue','triceps-long':'red','triceps-lateral':'blue','triceps-medial':'green'}
 p['color']=colors.get(p['name'],p['color'])
 # Neutral insertion follows atlas contact with proximal radius/ulna.
 if p['name'].startswith('biceps') or p['name']=='brachialis':
  vv=np.array(p['v']);tail=vv[vv[:,1]>np.quantile(vv[:,1],.94)];p['attachment']=tail.mean(0).round(4).tolist()
 if p['name'].startswith('triceps'):p['attachment']=[-34,282,-22]
 # White distal biceps/long proximal tendinous regions are illustration cues.
 p['sourceId']=p['id'] if p['id'].startswith('FMA') else None
# Both biceps heads feed the same distal radial attachment. Rotating the
# short head's upper-arm tip as if it were an insertion would lengthen it
# backwards at deep flexion and detach it from the common distal route.
biceps_anchor=next(p['attachment'] for p in parts if p['name']=='biceps-long')
for p in parts:
 if p['name'].startswith('biceps'):p['attachment']=biceps_anchor.copy()
d['fiberGuide']='Illustrative oblique surface guides directed to an authored posterior aponeurosis; not measured fascicles.'
d['joint']=[-34,282,-5];d['axis']=[[float(y),float(x),float(z)] for y,(x,z) in zip(ys,axis)];d['limitations']='Atlas shells and static proportions; authored aponeurosis and guide fibers based on the approved reference. Elbow deformation and attachment cues are illustrative, not validated tissue mechanics.'
(w/'atlas-data.json').write_text(json.dumps(d,separators=(',',':')))
print('Parts',len(parts),'aponeurosis faces',len(patch['f']),'fascicles',[(p['name'],len(p['fibers'])) for p in triceps])
