/* Twist and flexion share the reviewed native curves, fibers and skeleton.
   No separate rectangular muscle meshes or transparency depth-write path. */
function AbdomenTwist(host,flexion){
 return {render(angle){flexion.render(angle,'twist');},hide(){},rig:flexion.yawFrame,plates:flexion.plates};
}
