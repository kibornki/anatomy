const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const repo=path.resolve(__dirname,'../..'),arm=JSON.parse(fs.readFileSync(path.join(__dirname,'atlas-data.json'),'utf8')),upper=JSON.parse(fs.readFileSync(path.join(repo,'work/upperbody/atlas-data.json'),'utf8')),marks=JSON.parse(fs.readFileSync(path.join(__dirname,'artist-landmarks.json'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'sculpt-layer.js'),'utf8'),{filename:'sculpt-layer.js'});
const geometry=ArmSculptGeometry(),parts=new Map(arm.parts.map(p=>[p.name,p])),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),mean=points=>[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/points.length);
function nearestDistance(point,names){let best=Infinity;for(const name of names)for(const p of parts.get(name).v)best=Math.min(best,distance(point,p));return best;}
function checkLandmark(id,names,max){const item=marks.landmarks.find(p=>p.id===id);assert(item,'missing landmark '+id);const d=nearestDistance(item.point,names);assert(d<=max,id+' is '+d.toFixed(2)+' units from '+names.join('/'));return d;}
const distances={
 sternoclavicular:checkLandmark('sternoclavicular',['clavicle'],2.2),
 acromioclavicular:checkLandmark('acromioclavicular',['clavicle','scapula'],2.5),
 glenohumeral:checkLandmark('glenohumeral',['humerus'],9),
 elbowAxis:checkLandmark('elbow-axis',['humerus'],4),
 olecranon:checkLandmark('olecranon',['ulna'],4),
 radialTuberosity:checkLandmark('radial-tuberosity',['radius'],6),
 inferiorAngle:checkLandmark('inferior-angle',['scapula'],3)
};
const scale=marks.sourceRegistration.scales.arm/marks.sourceRegistration.scales.upperbody,armHum=parts.get('humerus').v,upperHum=upper.parts.find(p=>p.name==='humerus-right').v,offset=mean(armHum).map((v,i)=>v-scale*mean(upperHum)[i]);
assert(offset.every((v,i)=>Math.abs(v-marks.sourceRegistration.offset[i])<1e-7),'registration offset drift');
const mappedRig=key=>{const p=upper.rig[key];return[-p[0]*scale+offset[0],p[1]*scale+offset[1],p[2]*scale+offset[2]];};
for(const [key,id] of [['sc','sternoclavicular'],['ac','acromioclavicular'],['gh','glenohumeral']])assert(distance(mappedRig(key),marks.landmarks.find(p=>p.id===id).point)<1e-7,'registered '+key);
function nearest(a,b){let n=Infinity;for(const p of b)for(const q of a)n=Math.min(n,distance(p,q));return n;}
const directed=[];for(const p of armHum){let d=Infinity;for(const q of upperHum){const r=[(p[0]-offset[0])/scale,(p[1]-offset[1])/scale,(p[2]-offset[2])/scale];d=Math.min(d,distance(r,q));}directed.push(d);}directed.sort((a,b)=>a-b);
assert(directed.reduce((s,x)=>s+x,0)/directed.length<2.5,'humerus fit mean');assert(directed[Math.floor(directed.length*.95)]<3.5,'humerus fit p95');
const forms=[
 {id:'clavicle',names:['clavicle']},{id:'humerus',names:['humerus']},{id:'radius',names:['radius']},{id:'ulna',names:['ulna']},
 {id:'deltoid',names:['deltoid-anterior','deltoid-middle','deltoid-posterior']},
 {id:'biceps',names:['biceps-long','biceps-short']},{id:'triceps',names:['triceps-long','triceps-lateral','triceps-medial']},{id:'brachialis',names:['brachialis']}
];
const geometryStats={};
for(const group of forms){
 const points=group.names.flatMap(name=>parts.get(name).v),mesh=geometry.loft(points);
 assert(mesh.v.length>=80,group.id+' has too few vertices');assert(mesh.f.length>=160,group.id+' has too few faces');assert(mesh.v.every(p=>p.length===3&&p.every(Number.isFinite)),group.id+' invalid vertex');
 assert(mesh.f.every(f=>f.length===3&&f.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.v.length)),group.id+' invalid faces');
 const endRingCenter=mean(mesh.rings.at(-1).map(i=>mesh.v[i])),endCapOffset=distance(endRingCenter,mesh.v.at(-1));assert(endCapOffset<.02,group.id+' end cap is not centered on the final muscle section');geometryStats[group.id]={sourceVertices:points.length,blockoutVertices:mesh.v.length,blockoutFaces:mesh.f.length,endCapOffset};
}
const scapula=parts.get('scapula'),glenoid=geometry.nearest(scapula.v,marks.landmarks.find(p=>p.id==='glenohumeral').point),plate=geometry.plate(scapula.v,marks.landmarks.find(p=>p.id==='acromioclavicular').point,glenoid,marks.inferiorAngle.point);
assert(plate.outlinePoints.length>=8,'scapula blockout lost its atlas outline');assert(plate.f.length>=plate.outlinePoints.length*3,'scapula plate is not a closed volume');assert(plate.thickness>=2.4,'scapula plate has no useful thickness');assert(plate.spans[0]>50&&plate.spans[1]>30,'scapula blockout collapsed to a narrow landmark triangle');assert(plate.v.every(p=>p.every(Number.isFinite)));
(async()=>{
 const {chromium}=require('playwright'),out=path.join(repo,'artifacts','arm-sculpt');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1000,height:1040},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:8767/arm.html');await page.waitForFunction(()=>!!window.armAtlas);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>!!window.armAtlas);
 const browserMatrix=[];
 for(const view of ['front','back','side'])for(const angle of [0,45,90,135]){
  await page.evaluate(([a,v])=>{armAtlas.setPose(a,v);armAtlas.setMode('compare');},[angle,view]);await page.waitForTimeout(25);
  const measure=await page.evaluate(()=>{const root=document.querySelector('#arm'),forms=[...root.querySelectorAll('.sculpt-layer [data-sculpt-form]')],fills=forms.map(n=>n.querySelector('.sculpt-fill').getAttribute('d')||''),bounds=elements=>{const rects=[...elements].map(n=>n.getBBox()).filter(r=>r.width>0&&r.height>0);return rects.length?{left:Math.min(...rects.map(r=>r.x)),right:Math.max(...rects.map(r=>r.x+r.width)),top:Math.min(...rects.map(r=>r.y)),bottom:Math.max(...rects.map(r=>r.y+r.height))}:null;};return{mode:root.dataset.mode,forms:forms.length,nonempty:fills.filter(d=>d.length>20).length,anatomy:bounds(root.querySelectorAll('.diagram-volumes [data-display-layer=\"anatomy\"] .atlas-fill')),sculpt:bounds(root.querySelectorAll('.sculpt-layer .sculpt-fill')),landmark:root.querySelector('.diagram-landmark circle')?.getAttribute('data-landmark'),view:root.dataset.camera,angle:+root.dataset.angle};});
  assert.equal(measure.mode,'compare');assert.equal(measure.forms,9);assert(measure.nonempty>=6,'too few visible blockout masses in '+view+' '+angle);assert(measure.anatomy&&measure.anatomy.left>=-1&&measure.anatomy.right<=320.5,'anatomy arm escapes the left comparison panel in '+view+' '+angle+': '+JSON.stringify(measure.anatomy));assert(measure.sculpt&&measure.sculpt.left>=319.5&&measure.sculpt.right<=640.5,'sculpt arm escapes the right comparison panel in '+view+' '+angle+': '+JSON.stringify(measure.sculpt));assert(measure.anatomy.bottom-measure.anatomy.top>240&&measure.sculpt.bottom-measure.sculpt.top>240,'full arm height is not visible in '+view+' '+angle);assert.equal(measure.view,view);assert.equal(measure.angle,angle);
  browserMatrix.push(measure);await page.screenshot({path:path.join(out,'compare-'+view+'-'+angle+'.png'),fullPage:true});if(angle===90){await page.locator('#arm svg').screenshot({path:path.join(out,'scene-'+view+'-90.png')});await page.evaluate(()=>armAtlas.setMode('sculpt'));await page.locator('#arm svg').screenshot({path:path.join(out,'sculpt-'+view+'-90.png')});await page.evaluate(()=>armAtlas.setMode('compare'));}
 }
 await page.evaluate(()=>armAtlas.setMode('anatomy'));let modes=await page.evaluate(()=>({mode:armAtlas.mode,sculptDisplay:getComputedStyle(document.querySelector('.sculpt-layer')).display,anatomyDisplay:getComputedStyle(document.querySelector('[data-atlas-part=\"humerus\"]')).display}));
 assert.equal(modes.sculptDisplay,'none');assert.notEqual(modes.anatomyDisplay,'none');
 await page.evaluate(()=>armAtlas.setMode('sculpt'));modes=await page.evaluate(()=>({mode:armAtlas.mode,sculptDisplay:getComputedStyle(document.querySelector('.sculpt-layer')).display,anatomyBoneDisplay:getComputedStyle(document.querySelector('[data-atlas-part=\"humerus\"]')).display,tendonDisplay:getComputedStyle(document.querySelector('[data-atlas-part=\"triceps-aponeurosis\"]')).display}));
 assert.equal(modes.sculptDisplay,'inline');assert.equal(modes.anatomyBoneDisplay,'none');assert.notEqual(modes.tendonDisplay,'none');
 await page.evaluate(()=>armAtlas.setLandmark('radial-tuberosity'));await page.evaluate(()=>armAtlas.setPose(0,'side'));const radial0=await page.locator('.diagram-landmark circle').getAttribute('data-point');await page.evaluate(()=>armAtlas.setPose(135,'side'));const radial135=await page.locator('.diagram-landmark circle').getAttribute('data-point');assert.notEqual(radial0,radial135,'radial insertion guide did not follow forearm pose');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('artist-arm-v1')).modelContent);assert.equal(saved.mode,'sculpt');assert.equal(saved.landmark,'radial-tuberosity');
 if(errors.length)throw new Error('browser errors: '+errors.join('\\n'));
 const viewNames=['front','back','side'],viewLabels=['정면','후면','측면'],panels=viewNames.map((view,i)=>'<figure><figcaption>'+viewLabels[i]+'</figcaption><img src="data:image/png;base64,'+fs.readFileSync(path.join(out,'scene-'+view+'-90.png')).toString('base64')+'"></figure>').join('');
 const previewPage=await browser.newPage({viewport:{width:720,height:1450},deviceScaleFactor:1});
 await previewPage.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;background:#f2f4f7;font:16px sans-serif}main{display:grid;grid-template-columns:1fr;gap:6px;padding:6px}figure{margin:0;background:white;padding:5px;border:1px solid #d8dde5}figcaption{text-align:center;font-weight:700;padding:4px}img{display:block;width:100%;height:auto}</style></head><body><main>'+panels+'</main></body></html>');
 const preview=await previewPage.screenshot({path:path.join(out,'compare-views-90.jpg'),type:'jpeg',quality:80,fullPage:true});
 if(process.env.ARM_VISUAL_AUDIT==='1')console.log('ARM_VISUAL_AUDIT_JPEG '+preview.toString('base64'));
 const sculptPanels=viewNames.map((view,i)=>'<figure><figcaption>'+viewLabels[i]+' · 조형</figcaption><img src="data:image/png;base64,'+fs.readFileSync(path.join(out,'sculpt-'+view+'-90.png')).toString('base64')+'"></figure>').join('');
 await previewPage.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;background:#f2f4f7;font:16px sans-serif}main{display:grid;grid-template-columns:1fr;gap:6px;padding:6px}figure{margin:0;background:white;padding:5px;border:1px solid #d8dde5}figcaption{text-align:center;font-weight:700;padding:4px}img{display:block;width:100%;height:auto}</style></head><body><main>'+sculptPanels+'</main></body></html>');
 const sculptPreview=await previewPage.screenshot({path:path.join(out,'sculpt-views-90.jpg'),type:'jpeg',quality:80,fullPage:true});
 if(process.env.ARM_VISUAL_AUDIT==='1')console.log('ARM_SCULPT_MODE_AUDIT_JPEG '+sculptPreview.toString('base64'));
 await previewPage.close();await browser.close();
 const report={registration:marks.sourceRegistration,landmarkNearestSurfaceDistances:distances,geometry:geometryStats,views:['front','back','side'],angles:[0,45,90,135],comparisonScreenshots:browserMatrix.length,modeChecks:modes,radialLandmarkMovesWithPose:true,pageErrors:errors,limitations:['Shoulder abduction remains on the separate upperbody motion page; this arm pilot holds scapula, clavicle and humerus fixed during elbow flexion.','Aponeurosis and radial/olecranon insertion points are explicitly identified as authoring guides where the atlas does not provide a segmented landmark.']};
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\\n');console.log('ARM_SCULPT_REVIEW '+JSON.stringify({screenshots:browserMatrix.length,forms:geometryStats,landmarkDistances:distances,errors:errors.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});