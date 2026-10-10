"""Pose-relative signed distances on actual source bones; offline fit guard."""
from pathlib import Path
import json,base64,hashlib,numpy as np
from scipy.ndimage import map_coordinates,minimum_filter

class BoneContact:
    def __init__(self,parts):
        moving=[p for p in parts if p['name'] in ['scapula','clavicle','humerus']]
        fixed=[p for p in parts if p['kind']!='muscle' and p['name'] not in ['scapula','clavicle','humerus','ulna','radius']]
        v=[];f=[];offset=0
        for p in fixed:v.extend(p['v']);f.extend((np.array(p['f'])+offset).tolist());offset+=len(p['v'])
        moving.append({'name':'thorax','v':v,'f':f})
        cache=Path('/workspace/artifacts/upperbody-motion-audit');cache.mkdir(exist_ok=True)
        signature=hashlib.sha256(json.dumps(moving,separators=(',',':')).encode()).hexdigest()[:12];path=cache/('contact-'+signature+'.json')
        if path.exists():self.fields=json.loads(path.read_text())
        else:
            source=(Path(__file__).parents[1]/'arm/bone-fields.py').read_text();core=source[source.index('step=1.25'):source.index("(w/'bone-fields.json')")].replace("['humerus','ulna','radius']","['humerus','scapula','clavicle','thorax']")
            scope={'atlas':{'parts':moving},'fields':[]};exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n'+core,scope);self.fields=scope['fields'];path.write_text(json.dumps(self.fields,separators=(',',':')))
        for field in self.fields:field['grid']=np.frombuffer(base64.b64decode(field.pop('data')),dtype='<i2').reshape(field['shape'])/16
        cage=next(f for f in self.fields if f['name']=='thorax');grid=cage['grid'];inside=grid<0;first=np.argmax(inside,axis=2);x,y=np.indices(first.shape);before=grid[x,y,np.maximum(0,first-1)];after=grid[x,y,first]
        surface=cage['origin'][2]+(first-1+before/np.maximum(before-after,1e-8))*cage['step']-1.5
        surface[~inside.any(axis=2)]=np.inf
        self.cage,self.posterior_surface=cage,minimum_filter(surface,size=5)
    def sample(self,field,points):
        return map_coordinates(field['grid'],((points-field['origin'])/field['step']).T,order=1,mode='constant',cval=6)
    def guard(self,source,transforms,posterior=False):
        rules=[]
        for field in self.fields:
            transform=transforms.get(field['name'],transforms['fixed']);frame=transform([[0,0,0],[1,0,0],[0,1,0],[0,0,1]]);matrix=(frame[1:]-frame[0]).T
            rules.append((field,frame[0],matrix,np.minimum(.15,self.sample(field,source))))
        def constrain(q,mutable):
            for _ in range(6):
                changed=False
                for field,origin,matrix,limit in rules:
                    local=(q-origin)@matrix;distance=self.sample(field,local);bad=mutable&(distance<limit-.025)
                    if not bad.any():continue
                    points=local[bad];gradient=np.column_stack([(self.sample(field,points+np.eye(3)[axis]*.6)-self.sample(field,points-np.eye(3)[axis]*.6))/1.2 for axis in range(3)]);norm=np.linalg.norm(gradient,axis=1);valid=norm>.1
                    world=gradient@matrix.T
                    if posterior:world[source[bad,1]>220,2]=-np.abs(world[source[bad,1]>220,2])
                    step=world/np.maximum(norm,.1)[:,None]*np.minimum(3,limit[bad]-distance[bad]+.05)[:,None];ids=np.flatnonzero(bad);q[ids[valid]]+=step[valid];changed|=valid.any()
                if not changed:break
            if posterior:
                # Keep the broad sheet outside the posterior rib surface,
                # even if a deformation crossed a whole rib in one step.
                xy=np.rint((q[:,:2]-self.cage['origin'][:2])/self.cage['step']).astype(int);shape=self.posterior_surface.shape
                valid=mutable&(source[:,1]>220)&(xy[:,0]>=0)&(xy[:,0]<shape[0])&(xy[:,1]>=0)&(xy[:,1]<shape[1]);ids=np.flatnonzero(valid);depth=self.posterior_surface[xy[ids,0],xy[ids,1]];q[ids,2]=np.minimum(q[ids,2],depth)
            return q
        return constrain
