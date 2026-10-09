(()=>{
 const root=document.getElementById('abdomen'),model=AbdomenDraft(root),by=id=>document.getElementById('abdomen-'+id);let angle=0,view='front',playing=false,phase=0,last=0;
 const legend=root.querySelector('.diagram-legend');
 for(const [name,color] of [['전거근','orange'],['외복사근','blue'],['내복사근','green'],['복직근','red']]){const span=document.createElement('span'),dot=document.createElement('i');dot.className=color+'-key';span.append(dot,document.createTextNode(name));legend.append(span);}
 function render(){model.render(angle,view);by('angle').value=angle;by('value').textContent=Math.round(angle)+'°';by('angle').setAttribute('aria-valuetext',Math.round(angle)+'도');for(const v of ['front','side'])by(v).setAttribute('aria-pressed',view===v);}
 function play(on){playing=on;by('play').textContent=on?'일시정지':'재생';by('play').setAttribute('aria-pressed',on);last=0;}
 by('angle').addEventListener('input',()=>{play(false);angle=+by('angle').value;render();});
 by('play').addEventListener('click',()=>{if(!playing)phase=Math.acos(Math.max(-1,Math.min(1,1-2*(angle+10)/55)));play(!playing);});
 for(const v of ['front','side'])by(v).addEventListener('click',()=>{view=v;render();});
 by('fibers').addEventListener('change',()=>root.classList.toggle('no-fibers',!by('fibers').checked));
 by('transparent').addEventListener('change',()=>root.classList.toggle('transparent',by('transparent').checked));
 new ResizeObserver(render).observe(root);
 function tick(t){if(playing){if(last)phase+=(t-last)*.00085;angle=-10+55*(1-Math.cos(phase))/2;render();}last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.abdomenDraft={model,root,setPose(a,v=view){play(false);angle=a;view=v;render();}};render();
})();
