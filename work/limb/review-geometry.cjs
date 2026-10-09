const fs=require('fs'),vm=require('vm'),assert=require('assert');
vm.runInThisContext(fs.readFileSync('work/limb/motion.js','utf8'));
vm.runInThisContext(fs.readFileSync('work/limb/collision.js','utf8'));
const atlas=JSON.parse(fs.readFileSync('work/limb-atlas-preview/atlas-data.json')),reference=JSON.parse(fs.readFileSync('work/limb/motion-reference.json')),report={};
for(const region of ['forearm','thigh']){
 const model=atlas.models[region],motion=NativeLimbMotion(model,region,reference),collision=NativeLimbCollision(JSON.parse(fs.readFileSync('work/limb/'+region+'-bone-fields.json')),motion),start=region==='forearm'?-80:0,end=region==='forearm'?80:120;
 let rigidError=0,inverseError=0,minGap=Infinity,maxCorrection=0,softSamples=0,firstDegreeMovement=0;
 for(const p of model.parts)for(const v of p.v){const q=motion.deform(v,p,start+1);firstDegreeMovement=Math.max(firstDegreeMovement,Math.hypot(...q.map((x,i)=>x-v[i])));}
 assert(firstDegreeMovement<3,'Native surface jumps away from the neutral source at the first degree.');
 for(let angle=start;angle<=end;angle++)for(const part of model.parts){
  if(part.kind==='bone'){
   const samples=part.v.filter((_,i)=>i%Math.max(1,Math.floor(part.v.length/12))===0),posed=samples.map(v=>motion.deform(v,part,angle));
   for(let i=1;i<posed.length;i++){
    rigidError=Math.max(rigidError,Math.abs(Math.hypot(...posed[i].map((v,j)=>v-posed[0][j]))-Math.hypot(...samples[i].map((v,j)=>v-samples[0][j]))));
    inverseError=Math.max(inverseError,Math.hypot(...motion.bone(posed[i],part.name,angle,true).map((v,j)=>v-samples[i][j])));
   }
  }else if((angle-start)%20===0)for(let i=0;i<part.v.length;i+=Math.max(1,Math.floor(part.v.length/40))){
   const q=motion.deform(part.v[i],part,angle),v=collision.constrain(q,angle);assert(v.every(Number.isFinite));maxCorrection=Math.max(maxCorrection,Math.hypot(...v.map((x,j)=>x-q[j])));minGap=Math.min(minGap,collision.minimum(v,angle));softSamples++;
  }
 }
 assert(rigidError<1e-7&&inverseError<1e-7);assert(minGap>=0,'Sampled native muscle surface remains inside the cortex.');
 const metrics=motion.metrics(end);
 if(region==='thigh'){
  for(const name of ['rectus-femoris','vastus-lateralis','vastus-medialis'])assert(metrics[name].bellyLengthRatio>1&&metrics[name].radialRatio<1);
  for(const name of ['biceps-femoris-long','biceps-femoris-short','semitendinosus','semimembranosus'])assert(metrics[name].bellyLengthRatio<1&&metrics[name].radialRatio>1);
 }
 report[region]={testedBoneAngles:end-start+1,rigidError,inverseError,firstDegreeMovement,minGap,maxCorrection,softSamples,metrics};
 console.log(region,'bone angles',end-start+1,'sampled soft points',softSamples,'minimum cortex gap',minGap.toFixed(3),'first degree movement',firstDegreeMovement.toFixed(3));
}
fs.writeFileSync('work/limb/geometry-validation.json',JSON.stringify(report,null,2));
