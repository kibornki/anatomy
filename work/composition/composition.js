/* Fixed native atlas proportions. Removed appearance settings are ignored so
   stored muscle/fat values cannot reactivate the former deformation work. */
function AnatomyComposition(){
 const noop=()=>{};
 return{
  point:(part,point)=>point,
  posed:(part,vertices)=>vertices,
  posedFibers:(part,raw,scaled,fibers)=>fibers,
  restore:noop,mountControls:noop,mountFat:noop,drawFat:noop,
  paintFat:()=>0,fatMeshes:()=>[],
  get state(){return{muscle:100,fat:0,fatTransparent:false};},
  key:0,fatCount:0,fatTransparent:false
 };
}
