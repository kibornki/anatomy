from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page(viewport={'width':900,'height':1000},reduced_motion='reduce');p.goto('http://127.0.0.1:8767/arm.html');p.wait_for_function('!!window.armAtlas');metrics=[]
 for view in ['front','side','back']:
  for angle in range(0,136,5):
   p.evaluate('([a,v])=>armAtlas.setPose(a,v)',[angle,view])
   data=p.evaluate('''()=>{
    const m=armAtlas.model,v=m.visibility,a=v.degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);let min=Infinity,count=0,vertexMin=Infinity;
    // Independent inverse camera reconstruction of each soft surface sample:
    // evaluate its world position against the actual bone volume fields.
    for(let id=0;id<m.atlas.parts.length;id++)if(m.atlas.parts[id].kind!=='bone'){
     for(const pt of m.debug.posed[id].v)vertexMin=Math.min(vertexMin,m.collision.minimum(pt,m.debug.angle));
     const z=v.ownerZ[id];for(let k=0;k<z.length;k++)if(Number.isFinite(z[k])){
      const x=v.x0+(k%v.w+.5)*v.step,y=v.y0+(Math.floor(k/v.w)+.5)*v.step,u=(x-v.offset)/1.05,w=z[k],pt=[u*c-w*s,29+(y-15)/1.05,u*s+w*c];
      min=Math.min(min,m.collision.minimum(pt,m.debug.angle));count++;
     }
    }return {min,vertexMin,count};
   }''')
   assert data['count']>10000,(view,angle,data)
   assert data['min']>=.64,(view,angle,data)
   assert data['vertexMin']>=2.97,(view,angle,data)
   metrics.append({'view':view,'angle':angle,**data})
  print(view,'28 angles passed',flush=True)
 b.close()
(out/'collision-validation.json').write_text(json.dumps(metrics,indent=2));print('All 84 views: raster surface positions outside bone volumes; all constrained vertices outside.')
