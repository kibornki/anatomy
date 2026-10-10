"""Rigid 3D shoulder illustration; coupling angles are not clinical data."""
import numpy as np

def turn(points,pivot,axis,degrees):
    points=np.asarray(points);pivot=np.asarray(pivot);axis=np.asarray(axis,dtype=float);axis/=np.linalg.norm(axis)
    d=points-pivot;a=np.deg2rad(degrees);c,s=np.cos(a),np.sin(a)
    return pivot+d*c+np.cross(axis,d)*s+np.outer(d@axis,axis)*(1-c)

def transforms(rig,angle):
    sc,ac,gh=(np.array(rig[k]) for k in ['sc','ac','gh'])
    t=np.clip((angle-15)/105,0,1);ease=t*t*(3-2*t)
    clav=lambda ps:turn(turn(ps,sc,[0,0,-1],angle/6),sc,[0,1,0],6*ease)
    delta=clav([ac])[0]-ac
    def scap(ps):
        q=turn(ps,ac,[0,0,-1],angle/3)
        q=turn(q,ac,[1,0,0],10*ease)
        return turn(q,ac,[0,1,0],8*ease)+delta
    gh_delta=scap([gh])[0]-gh
    # The humeral head stays with the glenoid. Axial external rotation is
    # separate from arm elevation and also transports the humeral insertion.
    def arm(ps):
        q=turn(ps,gh,rig['humeralAxis'],35*ease)
        return turn(q,gh,[0,0,-1],angle-rig['neutralAbduction'])+gh_delta
    return {'fixed':lambda ps:np.asarray(ps).copy(),'clavicle':clav,'scapula':scap,'humerus':arm,'ulna':arm,'radius':arm}
