"""Keep original controls/styles; publish two native atlas pages and hub entries."""
from pathlib import Path
import json,re,sys
w=Path(__file__).parent;root=w.parents[1];atlas=json.loads((root/'work/limb-atlas-preview/atlas-data.json').read_text());art=Path('/workspace/artifacts/limb-implementation');art.mkdir(exist_ok=True)
reference=(w/'motion-reference.json').read_text();docs={}
for region,topic,store,initial,minimum,maximum in [('forearm','아티스트 전완 회내 회외','artist-forearm-classic-v1',-80,-80,80),('thigh','대퇴부 무릎 굽힘 도해','artist-thigh-knee-v1',0,0,120)]:
 if '--forearm-only' in sys.argv and region!='forearm':continue
 if '--thigh-only' in sys.argv and region!='thigh':continue
 src=root/(region+'.html');template=w/(region+'-page-template.html')
 if not template.exists():template.write_text(src.read_text())
 document=template.read_text();document=re.sub(r'<script\b.*?</script>','',document,flags=re.S)
 document=re.sub(r'(<svg\b[^>]*>)(.*?)(</svg>)',lambda m:m[1]+''.join(re.findall(r'<(?:title|desc)\b.*?</(?:title|desc)>',m[2],re.S))+'<defs></defs><g class="native-volumes"></g><g class="native-labels"></g>'+m[3],document,count=1,flags=re.S)
 document=re.sub(r'(<div class="'+region+r'-legend[^\"]*">).*?(</div>)',r'\1\2',document,count=1,flags=re.S).replace(region+'-legend',region+'-legend native-legend')
 # Keep control IDs/order, view buttons and sliders unchanged.
 document=document.replace('aria-pressed="true">일시정지','aria-pressed="false">재생')
 views=['front','side','medial','back'] if region=='thigh' else ['front','side','back']
 if region=='thigh':
  document=document.replace('<button type="button" class="btn" id="thigh-side" aria-pressed="false">측면</button>','<button type="button" class="btn" id="thigh-side" aria-pressed="false">측면</button><button type="button" class="btn" id="thigh-medial" aria-pressed="false">측면(반대)</button>')
 css='''<style>.native-labels{fill:var(--foreground)}.native-labels text{font-size:12px}.native-labels path{fill:none;stroke:var(--muted-foreground);stroke-width:.9}.native-legend{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;font-size:11px}.native-legend span{display:inline-flex;align-items:center;gap:5px}.native-legend i{width:9px;height:9px;border-radius:50%;flex-shrink:0}.native-credit{font-size:10px;line-height:1.5;color:var(--muted-foreground);margin-top:12px}.native-credit a{color:inherit}.no-fibers .native-volumes .fiber{display:none}</style>'''
 document=document.replace('</head>',css+'</head>')
 credit='<div class="native-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a> © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman'+(' · 동작 길이: OpenSim Gait2392' if region=='thigh' else '')+'</div>'
 document=document.replace('</body>',credit+'</body>')
 cfg={'region':region,'topic':topic,'store':store,'initial':initial,'min':minimum,'max':maximum,'views':views}
 scripts=(root/'work/visual/surface-lighting.js').read_text()+'\n'+(root/'work/composition/composition.js').read_text()+'\n'+'\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])+'\n'+'\n'.join((w/f).read_text() for f in ['motion.js','collision.js','renderer.js','controls.js'])
 payload='<script type="application/json" id="limb-config">'+json.dumps(cfg)+'</script><script type="application/json" id="limb-atlas">'+json.dumps(atlas['models'][region],separators=(',',':'))+'</script><script type="application/json" id="limb-reference">'+reference+'</script><script type="application/json" id="limb-bone-fields">'+(w/(region+'-bone-fields.json')).read_text()+'</script><script>'+scripts+'</script>'
 document=document.replace('</body>',payload+'</body>');docs[region]=document;(art/(region+'.html')).write_text(document)
if '--publish' in sys.argv:
 for region,document in docs.items():(root/(region+'.html')).write_text(document)
 path=root/'index.html';hub=path.read_text();m=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(m[2]);config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
 for region,document in docs.items():data[region].update(document=document.replace('<body>','<body>'+config,1),sourceFile='work/limb/renderer.js',views=['front','side','medial','back'] if region=='thigh' else ['front','side','back'])
 hub=hub[:m.start(2)]+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+hub[m.end(2):];path.write_text(hub);print('Published native pages and hub entries:', ', '.join(docs))
else:print('Review pages:',art)
