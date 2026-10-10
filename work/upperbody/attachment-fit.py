"""Native surface fitting with separate anatomical attachment bands."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import factorized
from scipy.spatial import cKDTree
from scipy.sparse.csgraph import connected_components

def volume(v,f):
    tri=v[f];return np.einsum('ij,ij->i',tri[:,0],np.cross(tri[:,1],tri[:,2])).sum()/6

def metrics(v,f,original=None):
    tri=v[f];out={'volume':float(abs(volume(v,f))),'area':float(np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1).sum()/2)}
    if original is not None:
        base=metrics(original,f);out.update(volumeRatio=out['volume']/base['volume'],areaRatio=out['area']/base['area'])
        e=np.unique(np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1),axis=0)
        lengths=np.linalg.norm(original[e[:,0]]-original[e[:,1]],axis=1);ratio=np.linalg.norm(v[e[:,0]]-v[e[:,1]],axis=1)/np.maximum(lengths,1e-8)
        out['edgeRatioP95']=float(np.quantile(ratio,.95));out['edgeRatioMax']=float(ratio.max())
    return out

class AttachmentFit:
    def __init__(self,part,parts):
        self.v=np.array(part['v']);self.f=np.array(part['f']);v,f=self.v,self.f;name=part['name']
        trees={p['name']:cKDTree(np.array(p['v'])) for p in parts if p['name'] in ['scapula','clavicle','humerus']}
        fixed=np.concatenate([p['v'] for p in parts if p['kind']!='muscle' and p['name'] not in ['scapula','clavicle','humerus','ulna','radius']]);ribs=np.concatenate([p['v'] for p in parts if p['kind']=='rib'])
        distances={key:tree.query(v)[0] for key,tree in trees.items()};dc,ds,dh=(distances[k] for k in ['clavicle','scapula','humerus']);dr=cKDTree(ribs).query(v)[0];df=cKDTree(fixed).query(v)[0]
        # Regions use the actual atlas bone adjacency and the anatomical
        # end of each muscle. Do not bind the whole belly to its nearest bone.
        if name=='pectoral-clavicular':origin=(dc<3.5)&(v[:,0]<85);insertion=(dh<4.5)&(v[:,0]>85);origin_bone='clavicle'
        elif name=='pectoral-sternal':origin=(v[:,0]<7)|((df<3)&(v[:,1]>220)&(v[:,0]<50));insertion=(dh<4.5)&(v[:,0]>85);origin_bone='fixed'
        elif name=='pectoral-abdominal':origin=(v[:,1]>np.quantile(v[:,1],.85))|((df<3)&(v[:,1]>250));insertion=(dh<4.5)&(v[:,0]>85);origin_bone='fixed'
        elif name=='serratus':origin=(dr<2.5)&(v[:,2]>45);insertion=(ds<3)&(v[:,2]<35)&(v[:,0]<65);origin_bone='fixed'
        elif name=='latissimus':origin=(v[:,0]<5)|(v[:,1]>380)|((dr<3)&(v[:,1]>250));insertion=(dh<4.5)&(v[:,1]<220);origin_bone='fixed'
        elif name=='trapezius-upper':origin=(v[:,0]<7)|(v[:,1]<100);insertion=(dc<3.5)&(v[:,0]>40);origin_bone='fixed'
        elif name=='trapezius-middle':origin=v[:,0]<7;insertion=((ds<3.5)|(dc<3.5))&(v[:,0]>55);origin_bone='fixed'
        elif name=='trapezius-lower':origin=v[:,0]<7;insertion=(ds<3.5)&(v[:,1]<185)&(v[:,0]>25);origin_bone='fixed'
        elif name=='infraspinatus':origin=(ds<2.5)&(v[:,0]<95);insertion=(dh<3.5)&(v[:,0]>95);origin_bone='scapula'
        elif name=='teres-major':origin=(ds<3)&(v[:,1]>215);insertion=(dh<3.5)&(v[:,0]>80);origin_bone='scapula'
        else:origin=(ds<3)&(v[:,0]<85);insertion=(dh<3.5)&(v[:,0]>85);origin_bone='scapula'
        insertion_bone='scapula' if name in ['serratus','trapezius-middle','trapezius-lower'] else 'clavicle' if name=='trapezius-upper' else 'humerus'
        origin&=~insertion;assert origin.any() and insertion.any(),name
        self.origin_bone,self.insertion_bone=origin_bone,insertion_bone
        self.tree=cKDTree(v)
        ii,jj,ww=[],[],[]
        for a,b,c in [(0,1,2),(1,2,0),(2,0,1)]:
            u=v[f[:,a]]-v[f[:,c]];t=v[f[:,b]]-v[f[:,c]];cot=np.einsum('ij,ij->i',u,t)/np.maximum(np.linalg.norm(np.cross(u,t),axis=1),1e-8);weight=np.maximum(cot,.05)/2
            ii.extend([f[:,a],f[:,b]]);jj.extend([f[:,b],f[:,a]]);ww.extend([weight,weight])
        adj=coo_matrix((np.concatenate(ww),(np.concatenate(ii),np.concatenate(jj))),shape=(len(v),len(v))).tocsr();graph=adj.tocoo();self.i,self.j,self.weight=graph.row,graph.col,graph.data
        # Decimation may retain unused vertices or small disconnected source
        # islands. Constrain those through their nearest origin-side band.
        count,component=connected_components(adj,directed=False)
        for index in range(count):
            ids=np.flatnonzero(component==index)
            if not (origin[ids]|insertion[ids]).any():
                distance=cKDTree(v[origin]).query(v[ids])[0];origin[ids[np.argmin(distance)]]=True
        self.origin,self.insertion=origin,insertion
        self.clavicular_insertion=insertion&(dc<ds)&(dc<3.5) if name=='trapezius-middle' else np.zeros(len(v),dtype=bool)
        self.fixed=np.flatnonzero(origin|insertion);self.free=np.flatnonzero(~(origin|insertion))
        self.lap=-adj+coo_matrix((np.asarray(adj.sum(1)).ravel(),(np.arange(len(v)),np.arange(len(v)))),shape=adj.shape).tocsr()
        self.solve=factorized(self.lap[self.free][:,self.free].tocsc());self.edge=v[self.i]-v[self.j];self.native_volume=volume(v,f)

    def fit(self,transforms,contact=None):
        v,f=self.v,self.f;i,j,w=self.i,self.j,self.weight;target=v.copy();target[self.origin]=transforms[self.origin_bone](v[self.origin]);target[self.insertion]=transforms[self.insertion_bone](v[self.insertion]);q=v.copy();q[self.fixed]=target[self.fixed]
        target[self.clavicular_insertion]=transforms['clavicle'](v[self.clavicular_insertion]);q[self.fixed]=target[self.fixed]
        boundary=self.lap[self.free][:,self.fixed]@target[self.fixed]
        displacement=target[self.fixed]-v[self.fixed];rhs=-(self.lap[self.free][:,self.fixed]@displacement)
        q[self.free]=v[self.free]+np.column_stack([self.solve(rhs[:,axis]) for axis in range(3)])
        for _ in range(24):
            cov=np.zeros((len(v),3,3));np.add.at(cov,i,w[:,None,None]*(q[i]-q[j])[:,:,None]*self.edge[:,None,:]);u,_,vt=np.linalg.svd(cov);sign=np.ones((len(v),3));sign[:,2]=np.linalg.det(u@vt);rotation=(u*sign[:,None,:])@vt
            rhs=np.zeros_like(q);np.add.at(rhs,i,w[:,None]*np.einsum('nij,nj->ni',(rotation[i]+rotation[j])/2,self.edge));q[self.free]=np.column_stack([self.solve((rhs[self.free]-boundary)[:,axis]) for axis in range(3)])
        # Preserve the source closed-shell volume by adjusting free surface
        # thickness, never scaling the belly or moving its attachments.
        for _ in range(48):
            if contact is not None:q=contact(q,~(self.origin|self.insertion))
            error=self.native_volume-volume(q,f)
            if abs(error/self.native_volume)<.005:break
            tri=q[f];grad=np.zeros_like(q)
            for a,b,c in [(0,1,2),(1,2,0),(2,0,1)]:np.add.at(grad,f[:,a],np.cross(tri[:,b],tri[:,c])/6)
            grad[self.fixed]=0;step=grad*(error/max(np.sum(grad*grad),1e-9));length=np.linalg.norm(step,axis=1);step*=np.minimum(1,.35/np.maximum(length,1e-9))[:,None];q+=step
        if contact is not None:q=contact(q,~(self.origin|self.insertion))
        assert np.max(np.linalg.norm(q[self.fixed]-target[self.fixed],axis=1))<1e-7
        def deform(points):
            points=np.asarray(points);dist,ids=self.tree.query(points,k=3);weight=1/np.maximum(dist,1e-8)**2;weight/=weight.sum(1)[:,None]
            return points+np.sum((q[ids]-v[ids])*weight[:,:,None],axis=1)
        audit={**metrics(q,f,v),'originVertices':int(self.origin.sum()),'insertionVertices':int(self.insertion.sum()),'attachmentError':float(np.linalg.norm(q[self.fixed]-target[self.fixed],axis=1).max())}
        return q,deform,audit
