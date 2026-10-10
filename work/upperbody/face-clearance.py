"""Dense face clearance after the two anatomical tissue-order fit stages.

Native overlaps and rigid physical attachment-only samples are reported but
not edited. Distances are voxel approximations, not intersection certification.
"""
from pathlib import Path
import base64,hashlib,json,runpy,tempfile
import numpy as np

def main():
    w=Path(__file__).parent;path=w/'atlas-data.json';data=json.loads(path.read_text());parts=[p for p in data['parts'] if not p.get('mirrorOf')];lat=next(p for p in parts if p['name']=='latissimus');v=np.asarray(lat['v']);f=np.asarray(lat['f']);contact=runpy.run_path(str(w/'bone-contact.py'))['BoneContact'](parts);rig=runpy.run_path(str(w/'shoulder-rig.py'))['transforms'];free=np.ones(len(v),bool);free[lat['attachments']['origin']+lat['attachments']['insertion']]=False
    bary=np.array([[a/9,b/9,1-(a+b)/9] for a in range(10) for b in range(10-a)]);faces=np.repeat(f,len(bary),axis=0);bary=np.tile(bary,(len(f),1));source=np.einsum('ij,ijk->ik',bary,v[faces]);bw=bary*free[faces];den=(bw*bw).sum(1);mutable=den>1e-8;den=np.maximum(den,1e-8);reports=[]
    core=(w.parent/'arm/bone-fields.py').read_text();core=core[core.index('step=1.25'):core.index("(w/'bone-fields.json')")].replace("if part['name'] not in ['humerus','ulna','radius']:continue",'if False:continue');cache=Path(tempfile.gettempdir())/'anatomy-face-clearance';cache.mkdir(exist_ok=True)
    def fields(ps):
        key=hashlib.sha256(json.dumps(ps,separators=(',',':')).encode()).hexdigest()[:16];file=cache/(key+'.json')
        if file.exists():out=json.loads(file.read_text())
        else:
            scope={'atlas':{'parts':ps},'fields':[]};exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n'+core,scope);out=scope['fields'];file.write_text(json.dumps(out,separators=(',',':')))
        for field in out:field['grid']=np.frombuffer(base64.b64decode(field.pop('data')),dtype='<i2').reshape(field['shape'])/16
        return out
    neighbors=[p for p in parts if p['name'] in ['serratus','teres-major','trapezius-lower']];native=fields(neighbors);masks={field['name']:contact.sample(field,source)>1 for field in native+contact.fields};vol=lambda q:np.einsum('ij,ij->i',q[f[:,0]],np.cross(q[f[:,1]],q[f[:,2]])).sum()/6;native_volume=vol(v)
    for frame in data['frames']:
        values=np.frombuffer(base64.b64decode(frame['displacement']),dtype='<i2').copy();off=lat['frameOffset'];q=v+values[off:off+len(v)*3].reshape(-1,3)/50;tr=rig(data['rig'],frame['angle']);posed=[]
        for p in neighbors:
            o=p['frameOffset'];posed.append(dict(p,v=(np.asarray(p['v'])+values[o:o+len(p['v'])*3].reshape(-1,3)/50).tolist()))
        rules=[]
        for field in contact.fields:
            basis=tr.get(field['name'],tr['fixed'])([[0,0,0],[1,0,0],[0,1,0],[0,0,1]]);matrix=(basis[1:]-basis[0]).T;rules.append((field,basis[0],matrix,masks[field['name']]))
        rules.extend((field,np.zeros(3),np.eye(3),masks[field['name']]) for field in fields(posed))
        for iteration in range(100):
            points=np.einsum('ij,ijk->ik',bary,q[faces]);correction=np.zeros_like(q);count=np.zeros(len(v));crossings=0
            for field,origin,matrix,mask in rules:
                local=(points-origin)@matrix;dist=contact.sample(field,local);bad=mask&mutable&(dist<.85);crossings+=int(np.sum(mask&mutable&(dist<-.25)))
                if not bad.any():continue
                pts=local[bad];grad=np.column_stack([(contact.sample(field,pts+np.eye(3)[axis]*.6)-contact.sample(field,pts-np.eye(3)[axis]*.6))/1.2 for axis in range(3)])@matrix.T;grad/=np.maximum(np.linalg.norm(grad,axis=1),.1)[:,None];shift=grad*np.minimum(.35,.9-dist[bad])[:,None]/den[bad,None]
                for j in range(3):np.add.at(correction,faces[bad,j],shift*bw[bad,j,None]);np.add.at(count,faces[bad,j],(bw[bad,j]>0).astype(float))
            q+=correction/np.maximum(count,1)[:,None]
            error=native_volume-vol(q);tri=q[f];grad=np.zeros_like(q)
            for a,b,c in [(0,1,2),(1,2,0),(2,0,1)]:np.add.at(grad,f[:,a],np.cross(tri[:,b],tri[:,c])/6)
            grad[:,:2]=0;grad[~free|(v[:,1]<300)]=0;q+=np.clip(grad*error/max(np.sum(grad*grad),1e-8),-.03,.03)
            if iteration>8 and crossings==0 and abs(error/native_volume)<.003:break
        values[off:off+len(v)*3]=np.rint((q-v).reshape(-1)*50).astype('<i2');frame['displacement']=base64.b64encode(values.tobytes()).decode();report={'angle':frame['angle'],'iterations':iteration,'freeFaceCrossings':crossings,'volumeRatio':vol(q)/native_volume};reports.append(report);print(report,flush=True)
    path.write_text(json.dumps(data,separators=(',',':')));(w/'face-clearance-validation.json').write_text(json.dumps(reports,indent=2))

if __name__=='__main__':main()
