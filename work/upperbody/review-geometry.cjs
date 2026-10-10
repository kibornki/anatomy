const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync(__dirname+'/atlas-data.json','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/motion.js','utf8'));
const motion=NativeUpperbodyMotion(data),approved=JSON.parse(fs.readFileSync(__dirname+'/../upperbody-atlas-preview/atlas-data.json','utf8'));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const at60=motion.pose(60);let maxApprovedError=0,maxRigidError=0,maxStep=0,previous;
data.parts.forEach((p,id)=>{const ref=approved.parts.find(q=>q.name===p.name);p.v.forEach((v,i)=>maxApprovedError=Math.max(maxApprovedError,distance(at60[id].v[i],ref.v[i])));});
for(let angle=15;angle<=120;angle++){
 const frame=motion.pose(angle);
 data.parts.forEach((p,id)=>{
  assert(frame[id].v.every(q=>q.every(Number.isFinite)));
  if(p.kind!=='muscle')for(let i=0;i<p.v.length;i+=23)maxRigidError=Math.max(maxRigidError,Math.abs(distance(p.v[0],p.v[i])-distance(frame[id].v[0],frame[id].v[i])));
  if(previous)for(let i=0;i<p.v.length;i+=11)maxStep=Math.max(maxStep,distance(frame[id].v[i],previous[id].v[i]));
 });previous=frame;
}
assert(maxApprovedError<.018);assert(maxRigidError<1e-6);assert(maxStep<6);
const muscleNames=[...new Set(data.parts.filter(p=>p.kind==='muscle').map(p=>p.name.replace(/-right$/,'')))];
assert(muscleNames.length===11);assert(!muscleNames.some(n=>/oblique|rectus|deltoid/.test(n)));
const report={poses:106,maxApprovedError,maxRigidError,maxStep,muscleNames,cameraYaw:data.cameraYaw};
fs.writeFileSync(__dirname+'/motion-validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
