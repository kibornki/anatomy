"""Reuse the arm's closed source shell SDF pipeline for native limb bones."""
from pathlib import Path
import json,sys
w=Path(__file__).parent;root=w.parents[1];models=json.loads((root/'work/limb-atlas-preview/atlas-data.json').read_text())['models'];template=(root/'work/arm/bone-fields.py').read_text()
# Keep the existing tested voxelization code; replace only its input selection.
core=template[template.index('step=1.25'):template.index("(w/'bone-fields.json')")]
core=core.replace('step=1.25','step=2').replace("if part['name'] not in ['humerus','ulna','radius']:continue","if part['kind']!='bone' or part['name'] not in selected:continue")
for region,model in models.items():
 if "--thigh-only" in sys.argv and region!="thigh":continue
 selected=['humerus','ulna','radius'] if region=='forearm' else ['femur','patella','tibia','fibula']
 scope={'atlas':model,'selected':selected,'fields':[]}
 exec('import numpy as np,base64\nfrom scipy.ndimage import distance_transform_edt\n'+core,scope)
 for f in scope['fields']:f['moving']=f['name'] in (['radius'] if region=='forearm' else ['tibia','fibula','patella'])
 (w/(region+'-bone-fields.json')).write_text(json.dumps(scope['fields'],separators=(',',':')))
