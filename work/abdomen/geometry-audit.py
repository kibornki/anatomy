"""Geometric diagnostic, not clinical certification.

Ray parity of simplified closed rib meshes identifies candidate overlaps;
closest-triangle distance measures them (a ray's exit length is not depth).
Original atlas contact overlaps remain recorded rather than hidden.
"""
from pathlib import Path
import json,numpy as np
from scipy.spatial import cKDTree
root=Path('/workspace/artifacts/abdomen-atlas-review');atlas=json.loads((Path(__file__).parent/'atlas-data.json').read_text());original={p['name']:p for p in atlas['parts']}
rows=[]
for file in sorted(root.glob('geometry-*.json')):
 d=json.loads(file.read_text());parts={p['name']:p for p in d['parts']};row={'pose':d['pose'],'duration':d['duration'],'attachments':[],'penetration':{},'problemVertices':[]}
 for p in d['attachments']:
  suffix='-right' if p['name'].endswith('-right') else '';scap=np.array(parts['scapula'+suffix]['vertices']);st=cKDTree(scap)
  for a in p['landmarks']:
   rib=np.array(parts['rib-'+str(a['rib'])+suffix]['vertices']);row['attachments'].append({'name':p['name'],'rib':a['rib'],'costal':float(cKDTree(rib).query(a['origin'])[0]),'scapular':float(st.query(a['insertion'])[0])})
 direction=np.array([.432,.753,.497]);direction/=np.linalg.norm(direction)
 for muscle in ['serratus','external-oblique','latissimus','rectus','internal-oblique']:
  counts=0;maxexit=0;maxdepth=0
  for suffix in ['', '-right']:
   name=muscle+suffix;indices=np.array(parts[name]['renderedIndices']);p=np.array(parts[name]['vertices'])[indices]
   for i in range(1,13):
    name='rib-'+str(i)+suffix;v=np.array(parts[name]['vertices']);faces=np.array(original[name]['f']);lo=v.min(0);hi=v.max(0)
    test_indices=np.where(np.all((p>=lo)&(p<=hi),axis=1))[0];test=p[test_indices]
    if not len(test):continue
    tri=v[faces];a=tri[:,0];e1=tri[:,1]-a;e2=tri[:,2]-a;h=np.cross(direction,e2);det=np.sum(e1*h,axis=1);inv=np.divide(1,det,out=np.zeros_like(det),where=abs(det)>1e-10)
    delta=test[:,None,:]-a;u=np.sum(delta*h,axis=2)*inv;q=np.cross(delta,e1);vv=np.sum(q*direction,axis=2)*inv;t=np.sum(q*e2,axis=2)*inv
    hit=(u>=0)&(vv>=0)&(u+vv<=1)&(t>1e-6)&(abs(det)>1e-10)
    inside=hit.sum(1)%2==1;counts+=int(inside.sum())
    if np.any(inside):
        maxexit=max(maxexit,float(np.min(np.where(hit,t,np.inf),axis=1)[inside].max()))
        delta=test[inside,None,:]-a;normal=np.cross(e1,e2);n2=np.sum(normal*normal,axis=1);height=np.sum(delta*normal,axis=2)/np.maximum(n2,1e-15);projection=delta-height[:,:,None]*normal
        d00=np.sum(e1*e1,axis=1);d01=np.sum(e1*e2,axis=1);d11=np.sum(e2*e2,axis=1);d20=np.sum(projection*e1,axis=2);d21=np.sum(projection*e2,axis=2);den=d00*d11-d01*d01;valid=np.abs(den)>1e-15
        bary1=np.divide(d11*d20-d01*d21,den,out=np.zeros_like(d20),where=valid);bary2=np.divide(d00*d21-d01*d20,den,out=np.zeros_like(d20),where=valid)
        distance=np.where((bary1>=0)&(bary2>=0)&(bary1+bary2<=1)&valid,height*height*n2,np.inf)
        for aa,bb in [(tri[:,0],tri[:,1]),(tri[:,1],tri[:,2]),(tri[:,2],tri[:,0])]:
            edge=bb-aa;dv=test[inside,None,:]-aa;ratio=np.clip(np.sum(dv*edge,axis=2)/np.maximum(np.sum(edge*edge,axis=1),1e-15),0,1);distance=np.minimum(distance,np.sum((dv-ratio[:,:,None]*edge)**2,axis=2))
        depths=np.sqrt(distance.min(1));maxdepth=max(maxdepth,float(depths.max()))
        if depths.max()>1:
            point_index=int(indices[test_indices[np.where(inside)[0][np.argmax(depths)]]]);muscle_name=muscle+suffix
            row['problemVertices'].append({'muscle':muscle_name,'index':point_index,'bone':name,'depth':float(depths.max())})
  row['penetration'][muscle]={'verticesInsideRib':counts,'maxRayExit':maxexit,'maxClosestSurfaceDistance':maxdepth}
 rows.append(row);print(d['pose'],row['penetration'],'attachmentMax',max(a['costal'] for a in row['attachments']),max(a['scapular'] for a in row['attachments']),flush=True)
baseline=next(row for row in rows if row['pose']=={'angle':0,'view':'front'})
for row in rows:
 for muscle,measurement in row['penetration'].items():
  # Preserve the original atlas's contact tolerance, rather than silently
  # allowing movement to add a new overlap. This samples retained vertices;
  # it is not exhaustive triangle intersection or tissue-strain validation.
  reference=baseline['penetration'][muscle]
  assert measurement['maxClosestSurfaceDistance']<=reference['maxClosestSurfaceDistance']+1e-4,(row['pose'],muscle,measurement)
  assert measurement['verticesInsideRib']<=reference['verticesInsideRib'],(row['pose'],muscle,measurement)
(root/'contact-audit.json').write_text(json.dumps(rows,indent=2))
print('Retained muscle vertices preserve neutral atlas rib-contact tolerance in all tested poses.')
