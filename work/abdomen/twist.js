/* Both motions consume one attributed 3D atlas and skeletal skinning field. */
function AbdomenTwist(host,flexion){
 return {render(angle,mode='anatomy',showMuscles=true){flexion.render(angle,'twist',mode,showMuscles);},hide(){},rig:flexion.yawFrame};
}
