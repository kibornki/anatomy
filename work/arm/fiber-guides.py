"""Regenerate only authored biceps guides; never modify atlas meshes.
Surface meridians explain longitudinal fusiform flow. They are educational
approximations, not digitized or measured human fascicles (OpenStax 11.1).
"""
from pathlib import Path
import json, math
w=Path(__file__).parent
atlas=json.loads((w/'atlas-data.json').read_text())
result={'version':1,'description':'Authored surface flow guides for education, not measured fascicles. Fusiform longitudinal flow from OpenStax 11.1; distal internal aponeurosis complexity is not reconstructed.','parts':{}}
cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
def section(part,y):
 segments=[]
 for face in part['f']:
  vertices=[part['v'][i] for i in face];hits=[]
  for a,b in zip(vertices,vertices[1:]+vertices[:1]):
   if a[1]<=y<b[1] or b[1]<=y<a[1]:
    t=(y-a[1])/(b[1]-a[1]);hits.append([a[0]+t*(b[0]-a[0]),a[2]+t*(b[2]-a[2])])
  if len(hits)==2:segments.append(hits)
 points=[p for seg in segments for p in seg]
 center=[(min(p[j] for p in points)+max(p[j] for p in points))/2 for j in [0,1]]
 return y,segments,center
for part in atlas['parts']:
 if not part['name'].startswith('biceps-'):continue
 lo,hi=(69,250) if part['name']=='biceps-short' else (68,280)
 sections=[section(part,lo+(hi-lo)*i/125) for i in range(126)];fibers=[]
 for k in range(24):
  theta=2*math.pi*(k+.12*math.sin(k*2.399))/24;fiber=[]
  for i,(y,segments,center) in enumerate(sections):
   angle=theta+.055*math.sin(math.pi*i/125)*math.sin(theta+.4);direction=[math.cos(angle),math.sin(angle)];best=math.inf
   for a,b in segments:
    delta=[b[j]-a[j] for j in [0,1]];start=[a[j]-center[j] for j in [0,1]];den=cross(direction,delta)
    if abs(den)<1e-9:continue
    r=cross(start,delta)/den;t=cross(start,direction)/den
    if r>0 and 0<=t<=1:best=min(best,r)
   if math.isfinite(best):fiber.append([round(center[0]+direction[0]*best,4),round(y,4),round(center[1]+direction[1]*best,4)])
  if len(fiber)>=100:fibers.append(fiber)
 result['parts'][part['name']]=fibers
(w/'fiber-guides.json').write_text(json.dumps(result,separators=(',',':')))
print('Wrote only authored biceps surface guides; atlas geometry preserved.')
