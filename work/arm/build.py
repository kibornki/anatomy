"""Build the attributed, self-contained arm page and replace only its hub entry."""
from pathlib import Path
import json,re,sys
w=Path(__file__).resolve().parent;root=w.parents[1]
head=(w/'page-template.html').read_text()
head=head.replace('</style>',(w/'style.css').read_text()+'</style>')
head=head.replace('aria-pressed="true">일시정지','aria-pressed="false">재생').replace('value="55"','value="0"').replace('>55°</output>','>0°</output>')
head=re.sub(r'<desc id="arm-desc">.*?</desc>','<desc id="arm-desc">오른팔 아틀라스 뼈와 근육. 이두근 장두·단두, 삼두근 장두·외측두·내측두를 색으로 구분합니다. 삼두의 넓은 후면 건막과 그 가장자리로 모이는 근섬유를 표시합니다. 건막과 섬유, 팔꿈치 변형은 참고 이미지에 기반한 작화용 근사입니다.</desc>',head)
credit='<div class="text-small atlas-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a> © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman · 동작 길이: <a href="https://github.com/opensim-org/opensim-models/blob/master/Models/Arm26/arm26.osim" target="_blank" rel="noopener">OpenSim Arm26</a> (OpenSim Development Team, Kate Holzbaur · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>)</div>'
head=head.replace('0°: 펴짐 · 135°: 굽힘 · 어깨 고정 · 변형은 작화용 단순화</div>','0°: 펴짐 · 135°: 굽힘 · 어깨 고정 · 건막·섬유·변형은 작화용 근사</div>'+credit,1)
match=re.search(r'(<script type="application/json" id="diagram-config">)(.*?)(</script>)',head,re.S)
metadata=json.loads(match[2]);metadata.update(revision='arm-atlas-motion-v3',initialAngle=0,height=430,cameraYaw=16,sourceFile='work/arm/atlas-renderer.js')
head=head[:match.start(2)]+json.dumps(metadata,ensure_ascii=False)+head[match.end(2):]
scripts=(root/'work/composition/composition.js').read_text()+'\n'+'\n'.join((root/'work/abdomen'/f).read_text() for f in ['atlas-contours.js'])+'\n'+'\n'.join((w/f).read_text() for f in ['motion.js','collision.js','visibility.js','atlas-renderer.js','controls.js'])
document=head+'<script type="application/json" id="arm-atlas">'+(w/'atlas-data.json').read_text().replace('<','\\u003c')+'</script><script type="application/json" id="arm-bone-fields">'+(w/'bone-fields.json').read_text()+'</script><script type="application/json" id="arm-motion-reference">'+(w/'motion-reference.json').read_text()+'</script><script>'+scripts+'</script></body></html>'
if '--publish' in sys.argv:
 (root/'arm.html').write_text(document)
 hubPath=root/'index.html';hub=hubPath.read_text();match=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(match[2])
 config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
 data['arm'].update(document=document.replace('<body>','<body>'+config,1),sourceFile='work/arm/atlas-renderer.js',views=['front','back','side'])
 hub=hub[:match.start(2)]+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+hub[match.end(2):];hubPath.write_text(hub)
 print('Published arm.html and the arm entry in index.html')
else:
 out=Path('/workspace/artifacts/arm-implementation');out.mkdir(parents=True,exist_ok=True);(out/'arm.html').write_text(document);print(out/'arm.html')
