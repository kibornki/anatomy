/* End the leader at the rendered text bounds, including responsive font size. */
function AnatomyLabelLeader(line,text,target){
 const b=text.getBBox(),svg=text.ownerSVGElement,unit=svg.viewBox.baseVal.width/Math.max(1,svg.getBoundingClientRect().width),gap=3*unit,cx=b.x+b.width/2,cy=b.y+b.height/2,dx=target[0]-cx,dy=target[1]-cy;
 const t=Math.min(dx?((b.width/2+gap)/Math.abs(dx)):Infinity,dy?((b.height/2+gap)/Math.abs(dy)):Infinity);
 line.setAttribute('d',t<1?`M${cx+dx*t},${cy+dy*t}L${target.join(',')}`:'');
}
