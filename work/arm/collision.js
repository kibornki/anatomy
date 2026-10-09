/* Signed distances come from the actual atlas triangle shells. Each moving
 * bone is queried in its own neutral frame, preserving the ulnar notch.
 * This constrains the artwork surface, not a physiological contact solver. */
function ArmBoneCollision(atlas,forearm){
 const fields=JSON.parse(document.getElementById('arm-bone-fields').textContent).map(f=>{
  const bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));return {...f,values:new Int16Array(bytes.buffer)};
 });
 function distanceXYZ(f,px,py,pz){
  const qx=(px-f.origin[0])/f.step,qy=(py-f.origin[1])/f.step,qz=(pz-f.origin[2])/f.step,[nx,ny,nz]=f.shape;
  if(qx<0||qy<0||qz<0||qx>=nx-1||qy>=ny-1||qz>=nz-1)return 30;
  const x=Math.floor(qx),y=Math.floor(qy),z=Math.floor(qz),tx=qx-x,ty=qy-y,tz=qz-z,k=(x*ny+y)*nz+z,dx=ny*nz,v=f.values;
  const a=v[k]*(1-tz)+v[k+1]*tz,b=v[k+nz]*(1-tz)+v[k+nz+1]*tz,c=v[k+dx]*(1-tz)+v[k+dx+1]*tz,d=v[k+dx+nz]*(1-tz)+v[k+dx+nz+1]*tz;
  return ((a*(1-ty)+b*ty)*(1-tx)+(c*(1-ty)+d*ty)*tx)/f.units;
 }
 const distance=(f,p)=>distanceXYZ(f,...p);
 let rotationAngle=NaN,ca=1,sa=0;
 const normalize=p=>{const n=Math.hypot(...p);return n>1e-8?p.map(v=>v/n):null;};
 function constrain(point,part,angle){
  let p=point.slice();const clearance=3;
  // Correct locally along the actual cortex normal. Never escape along
  // the forearm shaft: that creates long distal needles at deep flexion.
  const original=p.slice();
  for(let pass=0;pass<4;pass++){
   let changed=false;
   for(const f of fields){let q=f.moving?forearm(p,-angle):p.slice();
    for(let iteration=0;iteration<8;iteration++){
     const d=distance(f,q);if(d>=clearance-.02)break;
     const h=.8,gradient=q.map((_,axis)=>{const a=q.slice(),b=q.slice();a[axis]+=h;b[axis]-=h;return(distance(f,a)-distance(f,b))/(2*h);}),normal=normalize(gradient);if(!normal)break;
     q=q.map((v,i)=>v+normal[i]*Math.min(3,clearance-d+.1));changed=true;
    }p=f.moving?forearm(q,angle):q;
   }if(!changed)break;
  }
  // Adjacent cortices can make sequential normals push a point back into
  // the preceding bone. Find the nearest local escape from their union;
  // every candidate remains within the same 12-unit neighborhood.
  if(minimum(p,angle)<clearance-.02){
   const directions=[];for(let i=0;i<24;i++){const a=i*Math.PI/12;directions.push([Math.cos(a),0,Math.sin(a)]);}
   for(const y of [-1,1])for(let i=0;i<8;i++){const a=i*Math.PI/4;directions.push([Math.cos(a)/Math.sqrt(2),y/Math.sqrt(2),Math.sin(a)/Math.sqrt(2)]);}
   let best=12.01,bestPoint=null;
   for(const dir of directions)for(let r=1;r<=Math.min(12,Math.ceil(best));r++){
    const q=original.map((v,j)=>v+dir[j]*r);if(minimum(q,angle)<clearance)continue;
    let lo=r-1,hi=r;for(let k=0;k<5;k++){const mid=(lo+hi)/2,test=original.map((v,j)=>v+dir[j]*mid);if(minimum(test,angle)>=clearance)hi=mid;else lo=mid;}
    if(hi<best){best=hi;bestPoint=original.map((v,j)=>v+dir[j]*hi);}break;
   }if(bestPoint)p=bestPoint;
  }
  const delta=p.map((v,i)=>v-original[i]),travel=Math.hypot(...delta);if(travel>12)p=original.map((v,i)=>v+delta[i]*12/travel);
  return p;
 }
 function minimumXYZ(x,y,z,angle){
  if(rotationAngle!==angle){rotationAngle=angle;ca=Math.cos(angle*Math.PI/180);sa=Math.sin(angle*Math.PI/180);}
  const yy=y-atlas.joint[1],zz=z-atlas.joint[2],my=atlas.joint[1]+yy*ca+zz*sa,mz=atlas.joint[2]-yy*sa+zz*ca;
  let min=30;for(const f of fields)min=Math.min(min,f.moving?distanceXYZ(f,x,my,mz):distanceXYZ(f,x,y,z));return min;
 }
 const minimum=(p,angle)=>minimumXYZ(...p,angle);
 return {constrain,minimum,minimumXYZ,fields};
}
