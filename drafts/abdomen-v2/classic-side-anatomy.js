/* Qualitative lateral landmarks based on OpenStax A&P 2e, chapters 7.3/7.4.
   x is anterior, y is inferior. Drawing units are not measured millimetres.
   These are right-side ribs, not 12 repeated complete elliptical rings. */
const ClassicSideAnatomy=(()=>{
 const cervical=[[-7,101],[-2,110.5],[2,120],[2,129.5],[-2,139],[-9,148.5],[-16,158]];
 const thoracic=[[-22,171],[-29,183],[-35,195],[-40,207],[-44,219],[-45,231],[-44,243],[-39,255],[-34,267],[-27,279],[-19,291],[-12,303]];
 const lumbar=[[-6,322],[1,339],[6,356],[6,373],[0,390]];
 const vertebrae=[...cervical.map((center,i)=>({id:'C'+(i+1),region:'cervical',center,rx:7.5+i*.3,ry:3})),...thoracic.map((center,i)=>({id:'T'+(i+1),region:'thoracic',center,rx:9+i*.2,ry:4.7})),...lumbar.map((center,i)=>({id:'L'+(i+1),region:'lumbar',center,rx:12+i*.4,ry:6.4}))];
 // Vertebral bodies follow the local column tangent rather than a stack
 // of horizontal blocks. This drawing angle is not a measured Cobb angle.
 vertebrae.forEach((v,i)=>{const a=vertebrae[Math.max(0,i-1)].center,b=vertebrae[Math.min(vertebrae.length-1,i+1)].center;v.tilt=-Math.atan2(b[0]-a[0],b[1]-a[1])*180/Math.PI;});
 const sternum=[[45,177],[55,205],[60,224],[66,243],[71,261],[74,276],[73,286]];
 const ribs=thoracic.map((v,i)=>{
  const n=i+1,start=[v[0]-2,v[1]+1],angle=[v[0]-17,v[1]+12],attachment=n<=7?sternum[i]:n<=10?[[65,302],[49,315],[30,323]][i-7]:[[24,320],[15,326]][i-10];
  const end=n<=7?[attachment[0]-10,attachment[1]+3]:n<=10?[attachment[0]-9,attachment[1]-1]:attachment;
  const c1=[angle[0]+14,angle[1]+18],c2=[end[0]-32,end[1]+7];
  const cartilageEnd=n<=7?attachment:n===8?[sternum[6][0]-10,sternum[6][1]+3]:n===9?[56,301]:n===10?[40,314]:null;
  return {id:'rib-'+n,number:n,cartilageEnd,type:n<=7?'true':n<=10?'false':'floating',start,angle,c1,c2,end,attachment};
 });
 const spinous=v=>[v.center[0]-v.rx-16,v.center[1]+(v.region==='thoracic'?10:v.region==='cervical'?3:2)];
 const cubic=(r,t)=>{const u=1-t;return [0,1].map(k=>u*u*u*r.angle[k]+3*u*u*t*r.c1[k]+3*u*t*t*r.c2[k]+t*t*t*r.end[k]);};
 // Surface origins follow their corresponding rib, rather than a horizontal grid.
 const serratusOrigins=ribs.slice(0,8).map(r=>cubic(r,.76));
 const thoraxContour='M -22,166 Q 7,160 45,177 C 65,197 80,242 78,280 Q 71,314 30,334 Q 2,343 -13,318 C -31,304 -52,268 -60,233 Q -61,193 -22,166 Z';
 const sacrum='M -12,400 Q 4,397 7,410 Q 4,430 -5,450 L -2,459 Q -8,463 -16,454 Q -27,439 -26,420 Z';
 const pelvis='M -49,397 Q -49,374 -24,368 Q 0,367 26,382 Q 47,392 61,408 L 64,416 L 46,430 Q 51,437 62,438 L 66,451 Q 51,457 36,457 L 6,475 Q -10,485 -23,474 L -27,455 Q -16,438 -24,420 Z M 33,439 Q 50,440 48,451 Q 39,462 13,466 Q 8,454 19,446 Z';
 function girdle(angle){const lift=(angle-15)/105,r=30*lift*Math.PI/180;
  const scapular=p=>[p[0]+5*lift,186+(p[1]-186)*Math.cos(r)-(p[2]||0)*Math.sin(r)-8*lift];
  const shoulder=scapular([-3,174,48]);
  // Arm projection stays illustrative, while all humeral/scapular attachments
  // share these same transforms. The axial skeleton does not flex with the arm.
  const a=angle*Math.PI/180,arm=(s,o=0)=>[shoulder[0]+Math.sin(a)*s*.2+Math.cos(a)*o,shoulder[1]+Math.cos(a)*s-Math.sin(a)*o];
  return {lift,scapular,shoulder,arm};
 }
 return {vertebrae,cervical,thoracic,lumbar,sternum,ribs,spinous,cubic,serratusOrigins,thoraxContour,sacrum,pelvis,girdle};
})();
