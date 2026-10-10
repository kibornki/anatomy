/* Lighting only: derive smooth camera-space normals from the existing depth
 * buffer. No mesh, attachment, motion or visibility data is changed. */
function ArmSurfaceLighting(make,nodes){
 const selected=n=>!!n.artistSculpt;
 const layers=nodes.map(n=>selected(n)?make('image',{'class':'arm-surface-lighting','clip-path':n.fiber.getAttribute('clip-path'),'pointer-events':'none'},n.g):null);
 layers.forEach((image,i)=>{if(image)nodes[i].g.insertBefore(image,nodes[i].outline);});
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 return function draw(visible){
  const {w,h,step,x0,y0,ownerZ}=visible;canvas.width=w;canvas.height=h;
  layers.forEach((image,id)=>{
   if(!image)return;const source=ownerZ[id],bounds=visible.bounds[id];
   let z=source.slice();
   // Smooth lighting at atlas triangle edges, retaining the original contour.
   const weights=Array.from({length:13},(_,i)=>Math.exp(-(((i-6)/2.8)**2)/2));
   for(const axis of [1,w]){
    const next=z.slice();
    for(let y=Math.max(1,bounds[1]);y<=Math.min(h-2,bounds[3]);y++)for(let x=Math.max(1,bounds[0]);x<=Math.min(w-2,bounds[2]);x++){
     const k=y*w+x;if(!Number.isFinite(z[k]))continue;let total=0,weight=0;
     for(let d=-6;d<=6;d++){
      if(axis===1&&(x+d<0||x+d>=w)||axis===w&&(y+d<0||y+d>=h))continue;
      const j=k+d*axis;if(Number.isFinite(z[j])){total+=z[j]*weights[d+6];weight+=weights[d+6];}
     }next[k]=total/weight;
    }z=next;
   }
   const pixels=ctx.createImageData(w,h),data=pixels.data;
   for(let y=Math.max(1,bounds[1]);y<=Math.min(h-2,bounds[3]);y++)for(let x=Math.max(1,bounds[0]);x<=Math.min(w-2,bounds[2]);x++){
    const k=y*w+x;if(!Number.isFinite(z[k]))continue;
    const sample=j=>Number.isFinite(z[j])?z[j]:z[k];
    const dx=(sample(k+1)-sample(k-1))/(2*step),dy=(sample(k+w)-sample(k-w))/(2*step),length=Math.hypot(dx,dy,1);
    const diffuse=Math.max(0,(.35*dx+.45*dy+.82)/length),light=.72*diffuse+.28/length;
    const bright=light>.72,alpha=bright?.14*(light-.72)/.28:.32*(.72-light)/.72,p=k*4;
    data[p]=bright?255:24;data[p+1]=bright?255:30;data[p+2]=bright?255:44;data[p+3]=Math.round(Math.min(.32,alpha)*255);
   }
   ctx.putImageData(pixels,0,0);
   for(const [key,value]of Object.entries({x:x0,y:y0,width:w*step,height:h*step,href:canvas.toDataURL()}))image.setAttribute(key,value);
  });
 };
}
