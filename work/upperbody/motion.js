function NativeUpperbodyMotion(data){
 const frames=data.frames.map(f=>{const s=atob(f.displacement),bytes=Uint8Array.from(s,c=>c.charCodeAt(0));return{angle:f.angle,values:new Int16Array(bytes.buffer)};});
 const {sc,ac,gh,neutralAbduction}=data.rig;
 const rot=(p,pivot,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=p[0]-pivot[0],y=p[1]-pivot[1];return[pivot[0]+x*c+y*s,pivot[1]-x*s+y*c,p[2]];};
 function pose(angle){
  const index=Math.min(frames.length-2,Math.max(0,Math.floor((angle-15)/5))),a=frames[index],b=frames[index+1],t=(angle-a.angle)/(b.angle-a.angle);
  const clav=p=>rot(p,sc,angle/6),delta=clav(ac).map((v,i)=>v-ac[i]),scap=p=>rot(p,ac,angle/3).map((v,i)=>v+delta[i]),ghDelta=scap(gh).map((v,i)=>v-gh[i]),arm=p=>rot(p,gh,angle-neutralAbduction).map((v,i)=>v+ghDelta[i]);
  const left=new Map();
  for(const part of data.parts.filter(p=>!p.mirrorOf)){
   let offset=part.frameOffset;
   const deform=part.kind==='muscle'?p=>p.map((v,i)=>v+((1-t)*a.values[offset+i]+t*b.values[offset+i])/50):part.name==='clavicle'?clav:part.name==='scapula'?scap:['humerus','ulna','radius'].includes(part.name)?arm:p=>p;
   const points=ps=>ps.map(p=>{const q=deform(p);if(part.kind==='muscle')offset+=3;return q;});
   left.set(part.name,{v:points(part.v),fibers:part.fibers.map(points)});
  }
  return data.parts.map(p=>{if(!p.mirrorOf)return left.get(p.name);const original=left.get(p.mirrorOf),mirror=ps=>ps.map(p=>[-p[0],p[1],p[2]]);return{v:mirror(original.v),fibers:original.fibers.map(mirror)};});
 }
 return{pose};
}
