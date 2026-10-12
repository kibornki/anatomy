from pathlib import Path
import json,re
w=Path(__file__).parent;root=w.parents[1]
doc=(w/'page-template.html').read_text()
doc=doc.replace('aria-pressed="true">일시정지','aria-pressed="false">재생')
doc=re.sub(r'(<div class="diagram-legend[^\"]*">).*?(</div>)',r'\1\2',doc,count=1,flags=re.S)
style='''<style>
.native-labels text{fill:var(--foreground)}.native-labels path{fill:none;stroke:#8593a6;stroke-width:.9}
.diagram-legend{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;font-size:11px}.diagram-legend span{display:inline-flex;align-items:center;gap:5px}.diagram-legend i{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.native-credit{font-size:10px;line-height:1.5;color:var(--muted-foreground);margin-top:12px}.native-credit a{color:inherit}.no-fibers .native-volumes .fiber{display:none}
.artist-learning{display:grid;gap:6px;margin:8px 0 10px}.artist-mode-buttons{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.artist-mode-buttons .btn{border:1px solid color-mix(in srgb,var(--muted-foreground) 30%,var(--background));color:var(--foreground);background:var(--background);padding:3px 4px;font-size:11px}.artist-mode-buttons .btn[aria-pressed=true]{border-color:var(--foreground);background:var(--foreground);color:var(--background)}
.artist-mode-buttons .artist-toggle-control{display:inline-flex;align-items:center;gap:4px;min-width:0;min-height:28px;margin:0;padding:0 1px;font-size:11px;white-space:nowrap}.artist-mode-buttons .artist-toggle-control .form-check-input{width:14px;height:14px;margin:0}.artist-mode-buttons .artist-toggle-control .form-check-label{display:inline;min-width:0;min-height:0}
.diagram[data-mode=anatomy] .sculpt-volumes,.diagram[data-mode=sculpt] .native-volumes,.diagram[data-mode=sculpt] .native-labels{display:none}.diagram[data-mode=compare] .native-volumes{clip-path:url(#upper-anatomy-half)}.diagram[data-mode=compare] .native-labels{clip-path:url(#upper-anatomy-half)}
.diagram[data-mode=compare] .sculpt-volumes{clip-path:url(#upper-sculpt-half)}.diagram[data-mode=anatomy] .diagram-mode-labels,.diagram[data-mode=sculpt] .diagram-mode-labels{display:none}.diagram-mode-labels{fill:var(--foreground);font-weight:700;paint-order:stroke;stroke:var(--background);stroke-width:3px;stroke-linejoin:round}.sculpt-facets{pointer-events:none}.sculpt-facet{stroke:#453e45;stroke-width:.5;stroke-opacity:.26;stroke-linejoin:round;fill-opacity:1}.sculpt-outline{stroke:#403a43;stroke-width:1;stroke-opacity:.68;stroke-linejoin:round}
.diagram[data-show-muscles=false] [data-kind=muscle]{display:none}.diagram[data-mode=sculpt] [data-fibers-control]{display:none}.diagram[data-mode=sculpt] [data-tissue=fat]{display:none}.diagram.transparent .sculpt-volumes [data-kind=muscle]{opacity:.42}
</style>'''
doc=doc.replace('</head>',style+'</head>')
credit='<div class="native-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a> © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman</div>'
lib='\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])
scripts=(root/'work/visual/surface-lighting.js').read_text()+'\n'+(root/'work/composition/composition.js').read_text()+'\n'+lib+'\n'+'\n'.join((w/f).read_text() for f in ['motion.js','sculpt-forms.js','renderer.js','controls.js'])
doc=doc.replace('</body>',credit+'<script type="application/json" id="upperbody-atlas">'+(w/'atlas-data.json').read_text()+'</script><script>'+scripts+'</script></body>')
(root/'upperbody.html').write_text(doc)
path=root/'index.html';hub=path.read_text();m=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(m[2]);config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
data['upperbody'].update(document=doc.replace('<body>','<body>'+config,1),sourceFile='work/upperbody/renderer.js',views=['front','back','side'])
path.write_text(hub[:m.start(2)]+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+hub[m.end(2):])
print('Applied reviewed native upperbody to standalone and hub.')
