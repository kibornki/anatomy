/* Depth-tested orthographic rendering for the twist plate. SVG keeps the
   accepted controls, fixed pelvis, camera and labels. No remote assets. */
function AnatomyDepthRenderer(svg,{meshes,lines,rig,project,palette}){
 const NS='http://www.w3.org/2000/svg',foreign=document.createElementNS(NS,'foreignObject');foreign.setAttribute('x','0');foreign.setAttribute('y','0');foreign.setAttribute('width','640');foreign.setAttribute('height','515');foreign.setAttribute('class','twist-canvas');
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1030;canvas.style.width='640px';canvas.style.height='515px';foreign.appendChild(canvas);svg.insertBefore(foreign,svg.querySelector('.diagram-volumes'));
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
 if(!gl)throw new Error('이 브라우저에서 입체 도해를 그릴 수 없습니다. WebGL 지원 브라우저를 사용해 주세요.');
 const vs=`attribute vec3 position;attribute float level;attribute vec4 color;attribute vec3 meta;varying vec4 c;varying vec3 m;uniform float angle;uniform float picking;uniform float transparent;uniform float bias;uniform float axis;
 float smoothRamp(float t){t=clamp(t,0.,1.);return t*t*(3.-2.*t);}
 void main(){float t=radians(angle)*(.82*smoothRamp((455.-level)/75.)+.18*smoothRamp((380.-level)/85.));float dz=position.z-axis;vec3 q=vec3(position.x*cos(t)+dz*sin(t),position.y,axis-position.x*sin(t)+dz*cos(t));float cam=radians(16.);float x=q.x*cos(cam)+q.z*sin(cam);float z=-q.x*sin(cam)+q.z*cos(cam)+bias;gl_Position=vec4((310.+x*1.04)/320.-1.,1.-(-42.+q.y*1.04)/257.5,-z/350.,1.);c=color;if(transparent>.5&&meta.x>0.)c.a*=.30;if(picking>.5)c=vec4(meta.x/255.,0.,0.,1.);m=meta;}`;
 const fs=`precision highp float;varying vec4 c;varying vec3 m;uniform float transparent;uniform float fibers;void main(){if((transparent>.5&&m.y>.5)||(fibers<.5&&m.z>.5))discard;gl_FragColor=c;}`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const uniforms={};for(const name of ['angle','picking','transparent','bias','fibers','axis'])uniforms[name]=gl.getUniformLocation(program,name);
 const attrs={};for(const name of ['position','level','color','meta']){attrs[name]=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(attrs[name]);}
 const ids={'serratus':1,'external-oblique':2,'internal-oblique':3,'rectus':4,'latissimus':5};
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const triangles=[],wire=[],centroids=[];
 function push(list,points,c,item,fiber=false){for(const p of points)list.push(...p,item.level??p[1],...c,ids[item.muscle]||0,item.body?1:0,fiber?1:0);}
 for(const mesh of meshes){const col=[...rgb(palette[mesh.kind]||mesh.kind),1];for(let i=1;i<mesh.points.length-1;i++){const points=[mesh.points[0],mesh.points[i],mesh.points[i+1]];push(triangles,points,col,mesh);if(mesh.muscle)centroids.push({id:mesh.muscle,point:points.reduce((a,p)=>a.map((v,k)=>v+p[k]/3),[0,0,0]),level:mesh.level});}
  if(mesh.outline)for(let i=0;i<mesh.points.length;i++)push(wire,[mesh.points[i],mesh.points[(i+1)%mesh.points.length]],[.32,.38,.45,1],mesh);
 }
 for(const item of lines){const fiber=item.className.includes('twist-fiber'),alpha=fiber?.35:item.muscle?.70:1;for(let i=1;i<item.points.length;i++)push(wire,[item.points[i-1],item.points[i]],[.27,.33,.41,alpha],item,fiber);}
 function create(data){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer,count:data.length/11};}
 const faces=create(triangles),edges=create(wire);
 function draw(data,mode){gl.bindBuffer(gl.ARRAY_BUFFER,data.buffer);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,44,0);gl.vertexAttribPointer(attrs.level,1,gl.FLOAT,false,44,12);gl.vertexAttribPointer(attrs.color,4,gl.FLOAT,false,44,16);gl.vertexAttribPointer(attrs.meta,3,gl.FLOAT,false,44,32);gl.drawArrays(mode,0,data.count);}
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,640,515,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 const pick=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,pick);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,640,515);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
 const pixels=new Uint8Array(640*515*4);
 const pickAt=(x,y)=>{x=Math.floor(x);y=514-Math.floor(y);return x<0||x>=640||y<0||y>=515?0:pixels[(y*640+x)*4];};
 function render(angle,transparent,fibers){const f=rig(angle),candidates={};
  gl.uniform1f(uniforms.angle,angle);gl.uniform1f(uniforms.axis,f.axis);gl.uniform1f(uniforms.transparent,transparent?1:0);gl.uniform1f(uniforms.fibers,fibers?1:0);gl.uniform1f(uniforms.picking,0);gl.uniform1f(uniforms.bias,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,1280,1030);gl.depthMask(true);gl.disable(gl.BLEND);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(transparent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}draw(faces,gl.TRIANGLES);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(uniforms.bias,.65);draw(edges,gl.LINES);gl.disable(gl.BLEND);
  gl.uniform1f(uniforms.bias,0);gl.uniform1f(uniforms.picking,1);gl.bindFramebuffer(gl.FRAMEBUFFER,pick);gl.viewport(0,0,640,515);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);draw(faces,gl.TRIANGLES);
  for(const item of centroids){const q=project(f.at(item.point,item.level??item.point[1]));(candidates[item.id]??=[]).push({x:310+q[0]*1.04,y:-42+q[1]*1.04,z:q[2]});}
  gl.readPixels(0,0,640,515,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const anchors={};
  for(const [id,points]of Object.entries(candidates)){points.sort((a,b)=>b.z-a.z);for(const p of points){if(p.y>=390)continue;if(pickAt(p.x,p.y)===ids[id]){anchors[id]=p;break;}}}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);return anchors;
 }
 return {render,pickAt,hide(){foreign.style.display='none';},show(){foreign.style.display='';},canvas,foreign,gl,ids};
}
