/* Native source bone SDFs in neutral frames, shared by every camera. */
function NativeLimbCollision(raw,motion){
 const fields=raw.map(f=>{const b=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));return{...f,values:new Int16Array(b.buffer)};});
 function distance(f,p){const q=p.map((v,i)=>(v-f.origin[i])/f.step),[nx,ny,nz]=f.shape;if(q.some((v,i)=>v<0||v>=f.shape[i]-1))return 20;
  const [x,y,z]=q.map(Math.floor),[tx,ty,tz]=q.map((v,i)=>v-[x,y,z][i]),k=(x*ny+y)*nz+z,dx=ny*nz,v=f.values;
  const a=v[k]*(1-tz)+v[k+1]*tz,b=v[k+nz]*(1-tz)+v[k+nz+1]*tz,c=v[k+dx]*(1-tz)+v[k+dx+1]*tz,d=v[k+dx+nz]*(1-tz)+v[k+dx+nz+1]*tz;return((a*(1-ty)+b*ty)*(1-tx)+(c*(1-ty)+d*ty)*tx)/f.units;
 }
 const minimum=(p,angle)=>Math.min(...fields.map(f=>distance(f,motion.bone(p,f.name,angle,true))));
 function constrain(point,angle){if(minimum(point,angle)>=1)return point;let p=point.slice();
  for(let pass=0;pass<3;pass++)for(const f of fields){let q=motion.bone(p,f.name,angle,true);
   for(let i=0;i<4;i++){const d=distance(f,q);if(d>=1)break;const gradient=q.map((_,k)=>{const a=q.slice(),b=q.slice();a[k]+=.9;b[k]-=.9;return(distance(f,a)-distance(f,b))/1.8;}),n=Math.hypot(...gradient);if(n<1e-8)break;q=q.map((v,k)=>v+gradient[k]/n*Math.min(2.5,1-d+.05));}
   p=motion.bone(q,f.name,angle);
  }
  const delta=p.map((v,i)=>v-point[i]),length=Math.hypot(...delta);return length>10?point.map((v,i)=>v+delta[i]*10/length):p;
 }
 return{constrain,minimum,fields};
}
