const fs=require('fs'),vm=require('vm'),assert=require('assert'),w=__dirname;
const data=JSON.parse(fs.readFileSync(w+'/atlas-data.json')),fit=JSON.parse(fs.readFileSync(w+'/body-fit-data.json'));
for(const file of ['body-fit.js','motion.js'])vm.runInThisContext(fs.readFileSync(w+'/'+file,'utf8'));
const base=NativeUpperbodyMotion(data),motion=NativeUpperbodyMotion(data,fit),distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
const volume=(v,f)=>Math.abs(f.reduce((sum,ids)=>sum+v[ids[0]].reduce((n,x,k)=>n+x*cross(v[ids[1]],v[ids[2]])[k],0)/6,0));
let maxAttachmentError=0,maxRigidError=0,maxVolumeChange=0,maxStep=0;
const shapes=[{width:1,depth:1,length:1}];for(const width of [.95,1.05])for(const depth of [.95,1.05])for(const length of [.95,1.05])shapes.push({width,depth,length});
const exported=[];
for(const shape of shapes){
 motion.setShape(shape);const neutral=motion.pose(15),volumes=data.parts.map((p,i)=>p.kind==='muscle'?volume(neutral[i].v,p.f):0),gh=motion.resize(data.rig.gh),shift=gh.map((x,k)=>x-data.rig.gh[k]);
 let previous;
 for(let angle=15;angle<=120;angle++){
  const pose=motion.pose(angle),rig=motion.transforms(angle),baseline=shape.width===1&&shape.depth===1&&shape.length===1?base.pose(angle):null;
  data.parts.forEach((p,i)=>{
   assert(pose[i].v.every(v=>v.every(Number.isFinite)));
   if(shape.width===1&&shape.depth===1&&shape.length===1)assert.deepStrictEqual(pose[i],baseline[i]);
   if(p.kind==='muscle'){
    maxVolumeChange=Math.max(maxVolumeChange,Math.abs(volume(pose[i].v,p.f)/volumes[i]-1));
    if(!p.mirrorOf){const b=p.attachments,clav=new Set(b.clavicularInsertion);for(const [ids,bone]of [[b.origin,b.originBone],[b.insertion,b.insertionBone]])for(const j of ids){const key=clav.has(j)?'clavicle':bone,source=motion.resize(p.v[j]);maxAttachmentError=Math.max(maxAttachmentError,distance(pose[i].v[j],rig[key](source)));}}
   }else for(let j=0;j<p.v.length;j+=37)maxRigidError=Math.max(maxRigidError,Math.abs(distance(neutral[i].v[0],neutral[i].v[j])-distance(pose[i].v[0],pose[i].v[j])));
  });
  if(previous)pose.forEach((p,i)=>{for(let j=0;j<p.v.length;j+=31)maxStep=Math.max(maxStep,distance(p.v[j],previous[i].v[j]));});previous=pose;
  if([15,60,90,120].includes(angle))exported.push({shape,angle,parts:data.parts.filter(p=>!p.mirrorOf&&['latissimus','serratus','teres-major','trapezius-lower','scapula','humerus','clavicle'].includes(p.name)).map(p=>({...p,v:pose[data.parts.indexOf(p)].v}))});
 }
}
assert(maxStep<6,maxStep);assert(maxVolumeChange<.025,maxVolumeChange);assert(maxAttachmentError<.4,maxAttachmentError);assert(maxRigidError<1e-6,maxRigidError);
motion.setShape({width:999,depth:NaN,length:0});assert.deepStrictEqual(motion.getShape(),{width:1.05,depth:1,length:.95});
const report={profiles:shapes.length,posesPerProfile:106,maxAttachmentError,maxRigidError,maxVolumeChange,maxStep,neutralExactlyPreserved:true,parameterClamping:true,scope:'Small torso morph, bones resized once in neutral coordinates, attachment correction and numerical continuity; not physiological volume validation.'};
fs.writeFileSync(w+'/body-fit-validation.json',JSON.stringify(report,null,2));fs.writeFileSync(require('os').tmpdir()+'/anatomy-body-fit-poses.json',JSON.stringify(exported));console.log(report);
