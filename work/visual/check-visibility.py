"""Compare optimized raster results against the previously published solver."""
from pathlib import Path
import json
import subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page = browser.new_page()
    for region, name in [('abdomen', 'AbdominalVisibility'), ('arm', 'ArmVisibility')]:
        old = subprocess.check_output(['git', 'show', f'63794bc:work/{region}/visibility.js'], cwd=root).decode()
        page.add_script_tag(content=old.replace('function '+name+'(', 'function BeforeVisibility('))
        page.add_script_tag(content=(root/'work/abdomen/visibility.js').read_text(encoding='utf-8'))
        result = page.evaluate('''arm=>{
          let seed=42,checks=0,oldBytes=0,newBytes=0;
          const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
          for(let trial=0;trial<24;trial++){
            const options={project:p=>p.slice(0,2),depth:p=>p[2],step:[.75,1,1.5][trial%3]};
            if(arm)options.accept=(world,a,b,c,id)=>id<0||world[0][2]*a+world[1][2]*b+world[2][2]*c>-.1;
            const old=BeforeVisibility(options),now=AbdominalVisibility(options);
            for(let i=0;i<40;i++){
              const x=random()*40-20,y=random()*40-20,s=random()*18+.001,z=random()*4-2;
              const ps=[[x,y,z],[x+s,y+.5,z+.2],[x+s*.4,y+s,z-.1]];
              if(i%4===0)ps.push([x-.5,y+s*.3,z]);
              const owner=i%9-1;
              for(const buffer of [old,now])buffer.polygon(ps,owner);
            }
            for(const buffer of [old,now]){
              buffer.polygon([[0,.5,1],[.0000001,20,1],[0,20,1]],0);
              buffer.polygon([[1,1,0],[9,1,0],[4,4,0],[9,9,0],[1,9,0]],1);
              buffer.line([[0,0,0],[10,20,2],[30,5,1]],.7,2);
            }
            const config={projections:trial%2?true:id=>id%2===0,occludes:id=>id!==3,scanlineClips:trial%3!==0};
            const a=old.solve(9,config),b=now.solve(9,config);
            for(const key of ['w','h','x0','y0','clips','centers','coverage','bounds'])
              if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error(`trial ${trial} ${key}`);
            for(let k=0;k<a.w*a.h;k++){
              if(a.owners[k]!==b.owners[k]||a.zbuf[k]!==b.zbuf[k])throw Error(`trial ${trial} pixel ${k}`);
              for(let id=0;id<9;id++)if(a.ownerZ[id]&&a.ownerZ[id][k]!==b.depthAt(id,k))throw Error(`trial ${trial} owner ${id} pixel ${k}`);
              checks++;
            }
            oldBytes+=a.ownerZ.reduce((n,a)=>n+(a?.byteLength||0),0);
            newBytes+=b.ownerZ.reduce((n,a)=>n+(a?.byteLength||0),0);
          }
          return {checks,oldBytes,newBytes};
        }''', region == 'arm')
        print(region, json.dumps(result), flush=True)
    browser.close()
