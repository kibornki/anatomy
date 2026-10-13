"""Keep original controls/styles; publish two native atlas pages and hub entries."""
from pathlib import Path
import json,re,sys,os
w=Path(__file__).parent;root=w.parents[1];atlas=json.loads((root/'work/limb-atlas-preview/atlas-data.json').read_text());art=Path('/workspace/artifacts/limb-implementation') if os.name!='nt' else root/'artifacts/limb-implementation';art.mkdir(parents=True,exist_ok=True)
reference=(w/'motion-reference.json').read_text();docs={}
for region,topic,store,initial,minimum,maximum in [('forearm','아티스트 전완 회내 회외','artist-forearm-classic-v1',-80,-80,80),('thigh','대퇴부 무릎 굽힘 도해','artist-thigh-knee-v1',0,0,120)]:
 if '--forearm-only' in sys.argv and region!='forearm':continue
 if '--thigh-only' in sys.argv and region!='thigh':continue
 src=root/(region+'.html');template=w/(region+'-page-template.html')
 if not template.exists():template.write_text(src.read_text())
 document=template.read_text();document=re.sub(r'<script\b.*?</script>','',document,flags=re.S)
 document=document.replace('<div class="text-small" id="'+region+'-view-caption">','<div class="text-small diagram-caption" id="'+region+'-view-caption">',1)
 document=re.sub(r'(<svg\b[^>]*>)(.*?)(</svg>)',lambda m:m[1]+''.join(re.findall(r'<(?:title|desc)\b.*?</(?:title|desc)>',m[2],re.S))+'<defs></defs><g class="native-volumes"></g><g class="native-labels"></g>'+m[3],document,count=1,flags=re.S)
 document=re.sub(r'(<div class="'+region+r'-legend[^\"]*">).*?(</div>)',r'\1\2',document,count=1,flags=re.S).replace(region+'-legend',region+'-legend native-legend')
 mode_controls='''<div class="artist-learning"><div class="artist-mode-buttons" role="group" aria-label="표시 모드">
  <button type="button" class="btn" data-limb-mode="anatomy" aria-pressed="true">해부학</button><button type="button" class="btn" data-limb-mode="sculpt" aria-pressed="false">도형화</button><button type="button" class="btn" data-limb-mode="compare" aria-pressed="false">비교</button><button type="button" class="btn" data-limb-toggle-muscles>근육 숨기기</button>
  <label class="form-check artist-toggle-control"><input type="checkbox" class="form-check-input" id="'''+region+'''-transparent"><span class="form-check-label">근육 반투명</span></label><label class="form-check artist-toggle-control" data-fibers-control><input type="checkbox" class="form-check-input" id="'''+region+'''-fibers" checked><span class="form-check-label">근섬유</span></label>
 </div></div>'''
 document=document.replace('<div class="'+region+'-controls">',mode_controls+'<div class="'+region+'-controls">',1)
 # Keep control IDs/order, view buttons and sliders unchanged.
 document=document.replace('aria-pressed="true">일시정지','aria-pressed="false">재생')
 for control in ['fibers','transparent']:
  document=re.sub(r'<label class="form-check">\s*<input[^>]*id="'+region+'-'+control+r'"[^>]*>.*?</label>','',document,count=1,flags=re.S)
 views=['front','side','medial','back'] if region=='thigh' else ['front','side','back']
 if region=='thigh':
  document=document.replace('<button type="button" class="btn" id="thigh-side" aria-pressed="false">측면</button>','<button type="button" class="btn" id="thigh-side" aria-pressed="false">측면</button><button type="button" class="btn" id="thigh-medial" aria-pressed="false">측면(반대)</button>')
 css='''<style>.native-labels{fill:var(--foreground)}.native-labels text{font-size:12px}.native-labels path{fill:none;stroke:var(--muted-foreground);stroke-width:.9}.native-legend{display:none!important}.native-credit{font-size:10px;line-height:1.5;color:var(--muted-foreground);margin-top:12px}.native-credit a{color:inherit}.no-fibers .native-volumes .fiber,.no-fibers .sculpt-volumes .sculpt-form-lines{display:none}
.artist-learning{display:grid;gap:6px;margin:8px 0 10px}.artist-mode-buttons{display:flex;align-items:center;gap:3px;flex-wrap:wrap}.artist-mode-buttons .btn{border:1px solid color-mix(in srgb,var(--muted-foreground) 30%,var(--background));color:var(--foreground);background:var(--background);padding:3px 5px;font-size:11px}.artist-mode-buttons .btn[aria-pressed=true]{border-color:var(--foreground);background:var(--foreground);color:var(--background)}.artist-mode-buttons .artist-toggle-control{display:inline-flex;align-items:center;gap:4px;min-width:0;min-height:28px;margin:0;padding:0 1px;font-size:11px;white-space:nowrap}.artist-mode-buttons .artist-toggle-control .form-check-input{width:14px;height:14px;margin:0}.artist-mode-buttons .artist-toggle-control .form-check-label{display:inline;min-width:0;min-height:0}
#'''+region+'''-motion[data-mode=anatomy] .sculpt-volumes,#'''+region+'''-motion[data-mode=anatomy] .sculpt-mode-header{display:none}#'''+region+'''-motion[data-mode=sculpt] .native-volumes,#'''+region+'''-motion[data-mode=sculpt] .native-labels,#'''+region+'''-motion[data-mode=compare] .native-labels{display:none}#'''+region+'''-motion[data-mode=compare] .native-volumes{clip-path:url(#limb-anatomy-panel)}#'''+region+'''-motion[data-mode=compare] .sculpt-volumes{clip-path:url(#limb-sculpt-panel)}.sculpt-mode-header{fill:var(--foreground);font-size:11px;font-weight:700;paint-order:stroke;stroke:var(--background);stroke-width:3px;stroke-linejoin:round}.sculpt-divider{fill:none;stroke:var(--muted-foreground);stroke-width:.7;stroke-dasharray:4 4}.sculpt-facet{stroke:#737985;stroke-width:.55;stroke-opacity:.18;stroke-linejoin:round}.sculpt-outline{stroke:#697486;stroke-width:.85;stroke-opacity:.38}.sculpt-form-lines{stroke:var(--foreground);stroke-width:.55;stroke-opacity:.12;pointer-events:none}.transparent .sculpt-volumes [data-kind=muscle]{opacity:.48}</style>'''
 if region=='forearm':css=css.replace('</style>','#forearm-motion .sculpt-facet{stroke:#443a50;stroke-width:.5px;stroke-opacity:.42;vector-effect:non-scaling-stroke}</style>')
 if region=='thigh':css=css.replace('</style>','#thigh-motion .sculpt-facet{stroke:#443a50;stroke-width:.9;stroke-opacity:.42}#thigh-motion .sculpt-outline{stroke-opacity:.28}</style>')
 document=document.replace('</head>',css+'</head>')
 document=document.replace('</head>','<style>'+ (root/'work/visual/split-panel-layout.css').read_text() + '</style></head>',1)
 credit='<div class="native-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a> © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman'+(' · 동작 길이: OpenSim Gait2392' if region=='thigh' else '')+'</div>'
 document=document.replace('</body>',credit+'</body>')
 cfg={'region':region,'topic':topic,'store':store,'initial':initial,'min':minimum,'max':maximum,'views':views}
 scripts=(root/'work/visual/label-leaders.js').read_text()+'\n'+(root/'work/visual/landmarks.js').read_text()+'\n'+(root/'work/visual/surface-lighting.js').read_text()+'\n'+(root/'work/composition/composition.js').read_text()+'\n'+'\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])+'\n'+'\n'.join((w/f).read_text() for f in ['motion.js','collision.js','sculpt-layer.js','renderer.js','controls.js'])+'\n'+(root/'work/visual/hub-bridge.js').read_text()
 landmarks='<script type="application/json" id="artist-landmarks">'+json.dumps(json.loads((root/'work/visual/artist-landmarks.json').read_text())[region],ensure_ascii=False)+'</script>'
 payload=landmarks+'<script type="application/json" id="limb-config">'+json.dumps(cfg)+'</script><script type="application/json" id="limb-atlas">'+json.dumps(atlas['models'][region],separators=(',',':'))+'</script><script type="application/json" id="limb-reference">'+reference+'</script><script type="application/json" id="limb-bone-fields">'+(w/(region+'-bone-fields.json')).read_text()+'</script><script>'+scripts+'</script>'
 document=document.replace('</body>',payload+'</body>');document=re.sub(r'(?m)^[ \t]+$','',document);docs[region]=document;(art/(region+'.html')).write_text(document)
if '--publish' in sys.argv:
 for region,document in docs.items():(root/(region+'.html')).write_text(document)
 path=root/'index.html';hub=path.read_text();m=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(m[2]);config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
 for region,document in docs.items():data[region].update(document=document.replace('<body>','<body>'+config,1),sourceFile='work/limb/renderer.js',views=['front','side','medial','back'] if region=='thigh' else ['front','side','back'])
 hub=hub[:m.start(2)]+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+hub[m.end(2):];path.write_text(hub);print('Published native pages and hub entries:', ', '.join(docs))
else:print('Review pages:',art)
