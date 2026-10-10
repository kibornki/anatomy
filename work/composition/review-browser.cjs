const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],reports=[];
 const page=await browser.newPage({viewport:{width:1200,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 async function inspect(target,region){
  const prefix=region+'-composition-',muscle=target.locator('#'+prefix+'muscle');
  await muscle.waitFor({timeout:120000});
  const set=async(id,value)=>{await target.locator('#'+prefix+id).evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForTimeout(200);};
  const snapshot=()=>target.locator('svg [data-kind="muscle"] path, svg [data-atlas-part] path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')).join('|'));
  const baseline=await snapshot();await set('muscle',160);assert.notEqual(await snapshot(),baseline,region+' geometry must change');
  await set('muscle',100);assert.equal(await snapshot(),baseline,region+' reset geometry');
  await set('muscle',125);
  if(region!=='forearm'){
   await set('fat',65);const fat=target.locator('[data-tissue="fat"] path');
   let visible=await fat.evaluateAll(nodes=>nodes.some(n=>(n.getAttribute('d')||'').length>10));if(!visible){await target.locator('#'+region+'-side').click();await page.waitForTimeout(200);visible=await fat.evaluateAll(nodes=>nodes.some(n=>(n.getAttribute('d')||'').length>10));}assert(visible,region+' visible fat');
   await target.locator('#'+prefix+'fat-transparent').check();assert.equal(await target.locator('[data-tissue="fat"]').first().getAttribute('opacity'),'0.3');
   await target.locator('#'+region+'-transparent').check();await page.waitForTimeout(100);
   await target.locator('#'+prefix+'fat-transparent').uncheck();assert.equal(await target.locator('[data-tissue="fat"]').first().getAttribute('opacity'),'1',region+' fat transparency independent');
  }else assert.equal(await target.locator('#'+prefix+'fat').count(),0);
 }
 for(const region of ['upperbody','arm','abdomen','forearm','thigh']){
  await page.goto('http://127.0.0.1:8767/'+region+'.html',{waitUntil:'load',timeout:120000});await inspect(page,region);
  await page.reload({waitUntil:'load',timeout:120000});assert.equal(await page.locator('#'+region+'-composition-muscle').inputValue(),'125');
  if(region!=='forearm')assert.equal(await page.locator('#'+region+'-composition-fat').inputValue(),'65');
  const angle=page.locator('#'+region+'-angle');const max=await angle.getAttribute('max');await angle.evaluate((e,max)=>{e.value=max;e.dispatchEvent(new Event('input',{bubbles:true}));},max);await page.waitForTimeout(200);
  for(const view of region==='abdomen'?['side','twist','front']:region==='thigh'?['side','medial','back','front']:['side','back','front']){await page.locator('#'+region+'-'+view).click();await page.waitForTimeout(100);}
  await page.locator('#'+region+'-play').click();await page.waitForTimeout(500);await page.locator('#'+region+'-play').click();
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),region+' mobile overflow');
  await page.screenshot({path:'artifacts/composition-'+region+'.png',fullPage:true});await page.setViewportSize({width:1200,height:1000});
  reports.push({region,standalone:'passed',mobile:'passed',reload:'passed',motion:'passed'});
 }
 await page.goto('http://127.0.0.1:8767/',{waitUntil:'load',timeout:120000});
 const hub=await page.locator('#anatomy-data').textContent(),data=JSON.parse(hub);assert.deepEqual(Object.keys(data).sort(),['abdomen','arm','forearm','thigh','upperbody'].sort());
 for(const region of Object.keys(data)){assert(data[region].document.includes('function AnatomyComposition'));assert(data[region].document.includes('composition:composition.state'));}
 // Inspect the actual embedded documents with their hub messages and storage blocked.
 for(const region of Object.keys(data)){
  await page.goto('http://127.0.0.1:8767/',{waitUntil:'load',timeout:120000});
  await page.evaluate(({document,region})=>{
   document=document.replace('__HUB_CONFIG__',JSON.stringify({key:region,state:null}));
   const iframe=window.document.createElement('iframe');iframe.id='composition-test-frame';iframe.setAttribute('sandbox','allow-scripts');iframe.style.cssText='width:100%;height:900px';iframe.srcdoc=document;
   window.document.body.replaceChildren(iframe);
  },{document:data[region].document,region});
  await inspect(page.frameLocator('#composition-test-frame'),region);
  reports.push({region,embeddedSandbox:'passed'});
 }
 assert.deepEqual(errors,[],errors.join('\n'));
 fs.writeFileSync('artifacts/composition-browser-report.json',JSON.stringify(reports,null,2));console.log(reports);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
