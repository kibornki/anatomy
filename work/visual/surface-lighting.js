/* Local material lighting from the existing camera depth buffer.
 * Geometry, tissue ownership, attachments and motion stay with each renderer.
 * Entries supply their own tissue clip; anatomy-specific guides are retained. */
function AnatomySurfaceLighting(make,entries,{depthScale=1}={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),stride=2;
 const weights=Array.from({length:9},(_,i)=>Math.exp(-(((i-4)/1.8)**2)/2));
 const layers=entries.map(entry=>{
  const image=make('image',{'class':'anatomy-surface-lighting','clip-path':entry.clip,'pointer-events':'none','aria-hidden':'true'},entry.g);
  entry.g.insertBefore(image,entry.anchor);return{...entry,image};
 });
 return function draw(visible){
  const {w,h,step,x0,y0,ownerZ}=visible;
  for(const entry of layers){
   const {owner,image}=entry,source=ownerZ[owner],b=visible.bounds[owner];
   if(!source||b[0]>b[2]||b[1]>b[3]){image.style.display='none';continue;}image.style.display='';
   const left=Math.max(0,b[0]-2),top=Math.max(0,b[1]-2),right=Math.min(w-1,b[2]+2),bottom=Math.min(h-1,b[3]+2);
   const width=Math.ceil((right-left+1)/stride),height=Math.ceil((bottom-top+1)/stride),pixelStep=step*stride;
   let z=new Float32Array(width*height).fill(-Infinity);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let total=0,n=0;
    for(let dy=0;dy<stride;dy++)for(let dx=0;dx<stride;dx++){
     const ix=left+x*stride+dx,iy=top+y*stride+dy;
     if(ix>=w||iy>=h)continue;const v=source[iy*w+ix];if(Number.isFinite(v)){total+=v;n++;}
    }if(n)z[y*width+x]=total/n;
   }
   for(const axis of [1,width]){
    const next=z.slice();
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const k=y*width+x;if(!Number.isFinite(z[k]))continue;let total=0,weight=0;
     for(let d=-4;d<=4;d++){
      if(axis===1&&(x+d<0||x+d>=width)||axis===width&&(y+d<0||y+d>=height))continue;
      const v=z[k+d*axis];if(Number.isFinite(v)){total+=v*weights[d+4];weight+=weights[d+4];}
     }next[k]=total/weight;
    }z=next;
   }
   canvas.width=width;canvas.height=height;const pixels=ctx.createImageData(width,height),data=pixels.data;
   const sample=(x,y,k)=>x<0||x>=width||y<0||y>=height||!Number.isFinite(z[y*width+x])?z[k]:z[y*width+x];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=y*width+x;if(!Number.isFinite(z[k]))continue;
    const dx=(sample(x+1,y,k)-sample(x-1,y,k))*depthScale/(2*pixelStep),dy=(sample(x,y+1,k)-sample(x,y-1,k))*depthScale/(2*pixelStep),length=Math.hypot(dx,dy,1);
    const diffuse=Math.max(0,(.35*dx+.45*dy+.82)/length),light=.72*diffuse+.28/length,bright=light>.72;
    const alpha=bright?.14*(light-.72)/.28:.32*(.72-light)/.72,p=k*4;
    data[p]=bright?255:24;data[p+1]=bright?255:30;data[p+2]=bright?255:44;data[p+3]=Math.round(Math.min(.32,alpha)*255);
   }
   ctx.putImageData(pixels,0,0);
   for(const [key,value]of Object.entries({x:x0+left*step,y:y0+top*step,width:width*pixelStep,height:height*pixelStep,opacity:getComputedStyle(entry.fill).fillOpacity,href:canvas.toDataURL()}))image.setAttribute(key,value);
  }
 };
}
