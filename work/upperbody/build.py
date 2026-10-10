from pathlib import Path
import json,re
w=Path(__file__).parent;root=w.parents[1]
doc=(w/'page-template.html').read_text()
doc=doc.replace('aria-pressed="true">일시정지','aria-pressed="false">재생')
doc=re.sub(r'(<div class="diagram-legend[^\"]*">).*?(</div>)',r'\1\2',doc,count=1,flags=re.S)
style='<style>.native-labels text{fill:var(--foreground)}.native-labels path{fill:none;stroke:#8593a6;stroke-width:.9}.diagram-legend{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;font-size:11px}.diagram-legend span{display:inline-flex;align-items:center;gap:5px}.diagram-legend i{width:9px;height:9px;border-radius:50%;flex-shrink:0}.native-credit{font-size:10px;line-height:1.5;color:var(--muted-foreground);margin-top:12px}.native-credit a{color:inherit}.no-fibers .native-volumes .fiber{display:none}</style>'
doc=doc.replace('</head>',style+'</head>')
credit='<div class="native-credit">자료: <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61" target="_blank" rel="noopener">BodyParts3D</a> © 2008 DBCLS · <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener">CC BY-SA 2.1 Japan</a> · STL: Kevin Mattheus Moerman</div>'
lib='\n'.join((root/'work/abdomen'/f).read_text() for f in ['visibility.js','atlas-contours.js'])
scripts=lib+'\n'+'\n'.join((w/f).read_text() for f in ['motion.js','renderer.js','controls.js'])
doc=doc.replace('</body>',credit+'<script type="application/json" id="upperbody-atlas">'+(w/'atlas-data.json').read_text()+'</script><script>'+scripts+'</script></body>')
(root/'upperbody.html').write_text(doc)
path=root/'index.html';hub=path.read_text();m=re.search(r'(<script type="application/json" id="anatomy-data">)(.*?)(</script>)',hub,re.S);data=json.loads(m[2]);config='<script type="application/json" id="hub-config">__HUB_CONFIG__</script>'
data['upperbody'].update(document=doc.replace('<body>','<body>'+config,1),sourceFile='work/upperbody/renderer.js',views=['front','back','side'])
path.write_text(hub[:m.start(2)]+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+hub[m.end(2):])
print('Applied reviewed native upperbody to standalone and hub.')
