/* Both motions consume one attributed 3D atlas and skeletal skinning field. */
function AbdomenTwist(host,flexion){
 return {render(angle){flexion.render(angle,'twist');},hide(){},rig:flexion.yawFrame};
}
