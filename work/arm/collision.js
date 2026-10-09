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
 let lastAngle=null,rotationAngle=NaN,ca=1,sa=0,envelope=null;
 function prepare(angle){if(lastAngle===angle)return;lastAngle=angle;rotationAngle=angle;ca=Math.cos(angle*Math.PI/180);sa=Math.sin(angle*Math.PI/180);
  const bones=atlas.parts.filter(p=>['humerus','radius','ulna'].includes(p.name)),posed=bones.map(b=>b.v.map(p=>b.forearm?forearm(p,angle):p));
  const all=posed.flat(),step=.8,x0=Math.floor(Math.min(...all.map(p=>p[0]))/step)*step,y0=Math.floor(Math.min(...all.map(p=>p[1]))/step)*step,w=Math.ceil((Math.max(...all.map(p=>p[0]))-x0)/step)+2,h=Math.ceil((Math.max(...all.map(p=>p[1]))-y0)/step)+2,front=new Float32Array(w*h).fill(-Infinity);
  bones.forEach((b,i)=>b.f.forEach(f=>{const [a,c,d]=f.map(j=>posed[i][j]),den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1]);if(Math.abs(den)<1e-7)return;
   const loX=Math.max(0,Math.ceil((Math.min(a[0],c[0],d[0])-x0)/step)),hiX=Math.min(w-1,Math.floor((Math.max(a[0],c[0],d[0])-x0)/step)),loY=Math.max(0,Math.ceil((Math.min(a[1],c[1],d[1])-y0)/step)),hiY=Math.min(h-1,Math.floor((Math.max(a[1],c[1],d[1])-y0)/step));
   for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){const px=x0+x*step,py=y0+y*step,u=((c[1]-d[1])*(px-d[0])+(d[0]-c[0])*(py-d[1]))/den,v=((d[1]-a[1])*(px-d[0])+(a[0]-d[0])*(py-d[1]))/den,t=1-u-v;if(u>=0&&v>=0&&t>=0){const k=y*w+x,z=u*a[2]+v*c[2]+t*d[2];front[k]=Math.max(front[k],z);}}
  }));envelope={step,x0,y0,w,h,front};
 }
 function anteriorDepth(x,y,angle){prepare(angle);const e=envelope,qx=(x-e.x0)/e.step,qy=(y-e.y0)/e.step,ix=Math.floor(qx),iy=Math.floor(qy);if(ix<0||iy<0||ix>=e.w-1||iy>=e.h-1)return -Infinity;
  let sum=0,total=0;for(let dx=0;dx<=1;dx++)for(let dy=0;dy<=1;dy++){const z=e.front[(iy+dy)*e.w+ix+dx],w=(dx?qx-ix:1-qx+ix)*(dy?qy-iy:1-qy+iy);if(Number.isFinite(z)){sum+=z*w;total+=w;}}return total>.01?sum/total:-Infinity;
 }
 const normalize=p=>{const n=Math.hypot(...p);return n>1e-8?p.map(v=>v/n):null;};
 function constrain(point,part,angle){
  let p=point.slice();const triceps=part.name.startsWith('triceps'),anterior=part.name.startsWith('biceps')||part.name==='brachialis',clearance=3;
  // Flexor inner surfaces must stay on the anterior envelope, including
  // points already outside the posterior cortex. Local nearest escapes can
  // otherwise fold a connected triangle through the shaft.
  if(anterior)p[2]=Math.max(p[2],anteriorDepth(p[0],p[1],angle)+clearance);
  for(let pass=0;pass<5;pass++){
   let changed=false;
   for(const f of fields){let q=f.moving?forearm(p,-angle):p.slice();
    for(let iteration=0;iteration<48;iteration++){
     const d=distance(f,q);if(d>=clearance-.02)break;
     const h=.8,gradient=q.map((_,axis)=>{const a=q.slice(),b=q.slice();a[axis]+=h;b[axis]-=h;return (distance(f,a)-distance(f,b))/(2*h);});
     let normal=normalize(gradient),preferred=triceps?[0,0,-1]:anterior?[0,0,1]:normal||[0,0,-1];
     if(!normal)normal=preferred;
     // Keep extensors on the posterior route and flexors anterior. A nearest
     // point escape through the opposite cortex can swap anatomical sides.
     let direction=normal;
     if(triceps){const t=angle*Math.PI/360*(f.moving?-1:1);direction=[0,Math.sin(t),-Math.cos(t)];}
     if(anterior){const t=f.moving?-angle*Math.PI/180:0;direction=[0,-Math.sin(t),Math.cos(t)];}
     const projection=Math.max(.25,normal.reduce((s,v,i)=>s+v*direction[i],0)),amount=Math.min(5,Math.max(.3,(clearance-d)/projection));
     q=q.map((v,i)=>v+direction[i]*amount);changed=true;
    }
    p=f.moving?forearm(q,angle):q;
   }
   if(!changed)break;
  }
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
