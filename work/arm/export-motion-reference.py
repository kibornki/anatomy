"""Cache actual OpenSim Arm26 musculotendon lengths; no runtime solver dependency."""
from pathlib import Path
import hashlib,json,math
import opensim as osim
w=Path(__file__).parent;source=w/'reference/arm26.osim'
osim.Logger.setLevelString('error')
model=osim.Model(str(source));state=model.initSystem();joint=model.updCoordinateSet().get('r_elbow_flex')
names={'triceps-long':'TRIlong','triceps-lateral':'TRIlat','triceps-medial':'TRImed','biceps-long':'BIClong','biceps-short':'BICshort','brachialis':'BRA'}
lengths={k:[] for k in names}
for angle in range(136):
 joint.setValue(state,math.radians(angle));model.realizePosition(state)
 for key,name in names.items():lengths[key].append(model.getMuscles().get(name).getLength(state))
output={'source':'https://github.com/opensim-org/opensim-models/blob/master/Models/Arm26/arm26.osim','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'engine':'OpenSim 4.6','shoulderElevation':0,'angles':list(range(136)),'lengths':lengths,'limitations':'Musculotendon path lengths, not measured fascicle strain, activation or volume. Atlas morph remains illustrative.'}
(w/'motion-reference.json').write_text(json.dumps(output,separators=(',',':')))
print('Cached six Arm26 length curves over 136 angles.')
