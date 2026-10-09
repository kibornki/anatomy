/* Independent finite differences and bone-distance checks of the shared kernel.
 * These are drawing regressions, not physiological validation. */
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),w=__dirname+'/';
const atlas=JSON.parse(fs.readFileSync(w+'atlas-data.json')),ref=JSON.parse(fs.readFileSync(w+'motion-reference.json'));
global.document={getElementById(){return {textContent:fs.readFileSync(w+'bone-fields.json','utf8')};}};
for(const file of ['motion.js','collision.js'])vm.runInThisContext(fs.readFileSync(w+file,'utf8'));
const motion=ArmMotion(atlas,ref),collision=ArmBoneCollision(atlas,motion.forearm);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(w+'reference/arm26.osim')).digest('hex'),ref.sha256);
for(const [name,ls]of Object.entries(ref.lengths)){assert.equal(ls.length,136);for(let i=1;i<ls.length;i++)assert(name.startsWith('triceps')?ls[i]>ls[i-1]:ls[i]<ls[i-1],name);}
const distance=(a,b)=>Math.hypot(...a.map((v,j)=>v-b[j]));
let correctionMax=0,vertexMin=Infinity,distalRadiusMax=0,worst=null;
for(let angle=0;angle<=135;angle++)for(const part of atlas.parts){
 for(const p of part.v){const raw=motion.deform(p,part,angle);assert(raw.every(Number.isFinite));
  if(part.kind==='bone')continue;
  const q=collision.constrain(raw,part,angle);correctionMax=Math.max(correctionMax,distance(raw,q));const d=collision.minimum(q,angle);if(d<vertexMin){vertexMin=d;worst={angle,name:part.name,p,raw,q,d,travel:distance(raw,q)};}
  // Source distal tendon vertices must remain near the elbow, even though
  // the collision fields contain the full (hidden) forearm shafts.
  if(p[1]>=282)distalRadiusMax=Math.max(distalRadiusMax,distance(q,atlas.joint));
 }
 for(const partName of ['biceps-long','brachialis','triceps-long']){const p=atlas.parts.find(p=>p.name===partName);assert(distance(motion.deform(p.attachment,p,angle),motion.forearm(p.attachment,angle))<1e-8);}
}
assert(correctionMax<=12.000001);assert(vertexMin>=2.97,`Unresolved surface vertices: ${vertexMin}`);assert(distalRadiusMax<75,`Distal spike: ${distalRadiusMax}`);
// Measure local length, radial thickness and Jacobian at atlas belly centers.
// This checks the deformed points, independently of motion.metrics().
const determinant=v=>v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])-v[0][1]*(v[1][0]*v[2][2]-v[1][2]*v[2][0])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]);
const measured=[];
for(const name of ['triceps-long','triceps-lateral','biceps-long','biceps-short','brachialis']){
 const part=atlas.parts.find(p=>p.name===name),y=name.startsWith('triceps')?180:name.startsWith('biceps')?145:190,band=part.v.filter(p=>Math.abs(p[1]-y)<8),center=band.reduce((a,b)=>a.map((v,j)=>v+b[j]/band.length),[0,0,0]);let previousLength=1,previousRadius=1;
 for(const angle of [0,45,90,135]){
  const axes=[0,1,2].map(j=>{const lo=center.slice(),hi=center.slice();lo[j]-=.5;hi[j]+=.5;const a=motion.deform(lo,part,angle),b=motion.deform(hi,part,angle);return b.map((v,k)=>v-a[k]);}),volume=determinant(axes),length=Math.hypot(...axes[1]),radius=Math.hypot(...axes[0]);
  assert(volume>.94&&volume<1.06,`${name} ${angle}: local volume ${volume}`);
  if(angle){const extensor=name.startsWith('triceps');assert(extensor?length>previousLength:length<previousLength);assert(extensor?radius<previousRadius:radius>previousRadius);}
  measured.push({name,angle,length,radius,localVolumeRatio:volume});previousLength=length;previousRadius=radius;
 }
}
fs.writeFileSync(w+'motion-validation.json',JSON.stringify({angles:136,correctionMax,vertexMin,distalRadiusMax,worst,bellyMeasurements:measured,limits:'Local belly Jacobians before bone correction; not total muscle volume, activation or measured fascicle strain.'},null,2)+'\n');
console.log('Passed 136 angles: bounded local correction, no distal spikes, bone exclusion, insertion tracking, measured belly length/thickness and local volume.',{correctionMax,vertexMin,distalRadiusMax});
