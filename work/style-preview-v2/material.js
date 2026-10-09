/* Abdomen materials on the existing pose, muscles and outlines.
 * Existing fiber guides are interpolated, not anatomical tractography. */
function AbdomenStylePreview(root){
 const svg=root.querySelector('svg'),ns='http://www.w3.org/2000/svg';
 const colors={red:'#e02e2a',blue:'#339cff',green:'#00a240',orange:'#e25507',purple:'#924ff7',yellow:'#ffc300',teal:'#35b8b0',brachio:'#e02e2a',flexor:'#339cff',extensor:'#00a240',pronator:'#924ff7',upper:'#e02e2a',clavicular:'#e02e2a',sternal:'#339cff',abdominal:'#00a240',middle:'#339cff',lower:'#00a240',lat:'#924ff7',teres:'#e25507',infraspinatus:'#ffc300',minor:'#35b8b0',aux:'#924ff7',quad:'#e02e2a',ham:'#339cff',calf:'#00a240',serratus:'#e25507','teres-minor':'#35b8b0'};
 const before=[...svg.querySelectorAll('path')].map(n=>({n,d:n.getAttribute('d'),transform:n.getAttribute('transform'),style:n.getAttribute('style')}));
 const style=document.createElement('style');style.textContent=`
 #${root.id} .muscle {stroke:none!important;fill-opacity:1!important;opacity:1}
 #${root.id} .bone,#${root.id} .rib {fill:#e8e9eb!important;stroke:#89919e!important;stroke-width:.9!important;stroke-opacity:.8!important;fill-opacity:1!important}
 #${root.id} .bone-detail{stroke:#89919e!important;stroke-width:.65!important;stroke-opacity:.6!important}
 #${root.id} .tendon,#${root.id} .posterior-tendon,#${root.id} .fascia {fill:#f7f7f3!important;stroke:#89919e!important;stroke-width:.65!important;stroke-opacity:.65!important}
 #${root.id} .fiber{fill:none!important;stroke:#1a1c1f!important;stroke-width:.65!important;stroke-opacity:.23!important}
 #${root.id} .attachment{display:none}
 `+Object.entries(colors).map(([key,c])=>`#${root.id} .muscle.${key}{fill:${c}!important}`).join('\n');document.head.append(style);
 let fiberAdded=0,boneMerged=0;
 // Retain each existing muscle's own clip, origin and direction. Add guides
 // between neighboring curves in that same surface, never across muscles.
 for(const group of svg.querySelectorAll('.fibers')){
  const paths=[...group.querySelectorAll('path')].filter(p=>p.getAttribute('d')&&p.getTotalLength()>8);
  for(let i=1;i<paths.length;i++){
   const a=paths[i-1],b=paths[i],la=a.getTotalLength(),lb=b.getTotalLength();
   for(const mix of [.5]){
    const ps=[];for(let j=0;j<=30;j++){const u=a.getPointAtLength(la*j/30),v=b.getPointAtLength(lb*j/30);ps.push([u.x+(v.x-u.x)*mix,u.y+(v.y-u.y)*mix]);}
    const path=document.createElementNS(ns,'path');path.setAttribute('class','fiber preview-fiber');let d='M'+ps[0].join(',');for(let j=1;j<ps.length-1;j++)d+='Q'+ps[j].join(',')+' '+ps[j].map((v,k)=>(v+ps[j+1][k])/2).join(',');d+='L'+ps.at(-1).join(',');path.setAttribute('d',d);group.append(path);fiberAdded++;
   }
  }
 }
 // A tube's old path strokes every overlapping section. Outline its filled
 // union once, using the same contour extraction as the abdomen renderer.
 for(const bone of svg.querySelectorAll('path.bone,path.rib')){
  if(bone.closest('defs')||!bone.getAttribute('d'))continue;
  const b=bone.getBBox();if(!b.width||!b.height)continue;
  const step=.6,x0=Math.floor(b.x/step)*step-2*step,y0=Math.floor(b.y/step)*step-2*step,w=Math.ceil(b.width/step)+5,h=Math.ceil(b.height/step)+5;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.setTransform(1/step,0,0,1/step,-x0/step,-y0/step);ctx.fillStyle='black';ctx.fill(new Path2D(bone.getAttribute('d')),bone.getAttribute('fill-rule')||'nonzero');
  const pixels=ctx.getImageData(0,0,w,h).data,mask=k=>pixels[k*4+3]>=128;
  const contour=AtlasContour({w,h,x0,y0,step},mask,[0,0,w-1,h-1]);
  bone.style.setProperty('stroke','none','important');const edge=document.createElementNS(ns,'path');edge.setAttribute('d',contour);edge.setAttribute('class','preview-bone-outline');if(bone.hasAttribute('transform'))edge.setAttribute('transform',bone.getAttribute('transform'));edge.setAttribute('fill','none');edge.setAttribute('stroke','#89919e');edge.setAttribute('stroke-width','.9');edge.setAttribute('stroke-opacity','.8');bone.after(edge);boneMerged++;
 }
 window.stylePreviewReset=()=>{style.remove();for(const n of svg.querySelectorAll('.preview-fiber,.preview-bone-outline'))n.remove();for(const {n,style:old}of before){if(old===null)n.removeAttribute('style');else n.setAttribute('style',old);}};
 // No source geometry, transforms, cameras, labels or muscles were replaced.
 return {sourceGeometryUnchanged:before.every(({n,d,transform})=>n.getAttribute('d')===d&&n.getAttribute('transform')===transform),fiberAdded,boneMerged};
}
