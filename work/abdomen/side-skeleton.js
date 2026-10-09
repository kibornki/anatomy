function drawSideSkeleton(drawing,el,path){const A=ClassicSideAnatomy,f=n=>Math.round(n*100)/100,xy=p=>p.map(f).join(','),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const axial=el('g',{'data-part':'side-axial-skeleton'},drawing);
 path(A.thoraxContour,'thorax-mass',axial);
 for(const v of A.vertebrae){
  const g=el('g',{'data-vertebra':v.id,'data-region':v.region},axial),[x,y]=v.center,rx=v.rx,ry=v.ry;
  path(`M ${x-rx},${y-ry} Q ${x},${y-ry-1} ${x+rx},${y-ry+1} L ${x+rx},${y+ry} Q ${x},${y+ry+2} ${x-rx},${y+ry-1} Z`,'bone',g).setAttribute('transform',`rotate(${f(v.tilt)} ${x} ${y})`);
  const drop=v.region==='thoracic'?10:v.region==='cervical'?3:2;
  const theta=v.tilt*Math.PI/180,back=o=>[x-rx*Math.cos(theta)-o*Math.sin(theta),y-rx*Math.sin(theta)+o*Math.cos(theta)];
  path(`M ${xy(back(-2))} Q ${x-rx-6},${y-5} ${x-rx-10},${y+2} L ${x-rx-16},${y+drop} L ${x-rx-10},${y+drop+2} L ${xy(back(4))}`,'bone',g);
 }
 // Open, oblique rib ribbons: upper short, middle broad, lower diminishing.
 for(const r of A.ribs){
  const g=el('g',{'data-rib':r.number,'data-rib-type':r.type},axial),thick=r.number<=2?3:4;
  const q=p=>[p[0],p[1]+thick];
  path(`M ${xy(r.start)} Q ${xy([r.angle[0]-5,r.angle[1]-14])} ${xy(r.angle)} C ${xy(r.c1)} ${xy(r.c2)} ${xy(r.end)} L ${xy(q(r.end))} C ${xy(q(r.c2))} ${xy(q(r.c1))} ${xy(q(r.angle))} Q ${xy([r.angle[0]-3,r.angle[1]-8])} ${xy(q(r.start))} Z`,'rib',g);
  if(r.type!=='floating'){
   const end=r.cartilageEnd,c=r.type==='true'?mix(r.end,end,.5):[end[0]-2,r.end[1]-2];
   path(`M ${xy(r.end)} Q ${xy(c)} ${xy(end)} L ${xy(q(end))} Q ${xy(q(c))} ${xy(q(r.end))} Z`,'cartilage',g);
  }
 }
 const sternum=el('g',{'data-part':'side-sternum'},axial);
 path('M 42,174 Q 48,174 50,183 L 58,203 L 54,209 L 48,199 Z','bone',sternum);
 path('M 54,205 L 60,204 Q 72,237 78,273 L 77,282 L 71,282 Q 66,238 54,205 Z','bone',sternum);
 path('M 72,282 L 77,282 L 74,299 L 68,290 Z','bone',sternum);
 // Align vertical torso landmarks with the coronal plate, then reduce the
 // previously oversized lateral pelvic height without stretching the rim.
 const pelvic=(d,cls)=>{const n=path(d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,(_,x,y)=>`${x},${f(+y>390?390+(+y-390)*.6:+y)}`),cls,axial);n.setAttribute('data-part','pelvic-skeleton');return n;};
 pelvic(A.sacrum,'bone');pelvic('M -9,454 Q -3,470 6,470 Q 12,472 8,475 Q -3,474 -13,460 Z','bone');
 pelvic(A.pelvis,'bone pelvis').setAttribute('fill-rule','evenodd');
 pelvic('M -42,395 Q -26,384 -11,386 M -19,405 Q -15,412 -21,419 M 7,425 Q 30,412 38,433 Q 34,450 15,446 Q 5,440 7,425','bone-detail');

return axial;}
