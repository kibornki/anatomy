const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync(__dirname+'/atlas-data.json','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/motion.js','utf8'));
const motion=NativeUpperbodyMotion(data);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]);
const volume=(v,f)=>Math.abs(f.reduce((sum,t)=>sum+v[t[0]].reduce((n,x,i)=>n+x*cross(v[t[1]],v[t[2]])[i],0)/6,0));
const nativeVolumes=data.parts.map(p=>p.kind==='muscle'?volume(p.v,p.f):0);
let maxAttachmentError=0,maxVolumeError=0,maxRigidError=0,maxStep=0,previous;
for(let angle=15;angle<=120;angle++){
 const frame=motion.pose(angle),rig=motion.transforms(angle);
 data.parts.forEach((p,id)=>{
  assert(frame[id].v.every(q=>q.every(Number.isFinite)));
  if(p.kind==='muscle'){
   maxVolumeError=Math.max(maxVolumeError,Math.abs(volume(frame[id].v,p.f)/nativeVolumes[id]-1));
   if(!p.mirrorOf){const band=p.attachments,clav=new Set(band.clavicularInsertion);for(const [ids,bone]of [[band.origin,band.originBone],[band.insertion,band.insertionBone]])for(const index of ids){const target=rig[clav.has(index)?'clavicle':bone](p.v[index]);maxAttachmentError=Math.max(maxAttachmentError,distance(frame[id].v[index],target));}}
  }
  if(p.kind!=='muscle')for(let i=0;i<p.v.length;i+=23)maxRigidError=Math.max(maxRigidError,Math.abs(distance(p.v[0],p.v[i])-distance(frame[id].v[0],frame[id].v[i])));
  if(previous)for(let i=0;i<p.v.length;i+=11)maxStep=Math.max(maxStep,distance(frame[id].v[i],previous[id].v[i]));
 });previous=frame;
}
assert(maxAttachmentError<.4,maxAttachmentError);assert(maxVolumeError<.025,maxVolumeError);assert(maxRigidError<1e-6);assert(maxStep<6);
const muscleNames=[...new Set(data.parts.filter(p=>p.kind==='muscle').map(p=>p.name.replace(/-right$/,'')))];
assert(muscleNames.length===11);assert(!muscleNames.some(n=>/oblique|rectus|deltoid/.test(n)));
const report={poses:106,maxAttachmentError,maxVolumeError,maxRigidError,maxStep,muscleNames,cameraYaw:data.cameraYaw};
fs.writeFileSync(__dirname+'/motion-validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
