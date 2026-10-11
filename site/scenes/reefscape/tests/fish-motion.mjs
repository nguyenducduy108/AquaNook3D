import assert from 'node:assert/strict';
import {register} from 'node:module';
register('../../riverscape/tests/three-loader.mjs',import.meta.url);
const THREE=await import('three');
const {createFishSchool}=await import('../src/fish-model.js');
const {ReefSimulation,FIXED_STEP}=await import('../src/simulation.js');
const {interpolatePhase,sampleBodyWave}=await import('../src/fish-motion.js');
const TAU=Math.PI*2;

// Exercise a real render buffer across the wrap, not just the interpolation helper.
const simulation=new ReefSimulation(),school=createFishSchool(new THREE.Scene(),simulation);
const f=simulation.fish.find(f=>school.visualSpecies(f)==='moorishIdol');
f.phase=TAU-.040;f.pectoral=TAU-.030;f.yaw=Math.PI-.020;f.pitch=0;f.roll=0;
f.tailAmplitude=.08;f.rowing=.60;f.bend=.04;
school.capturePrevious();
const before=f.position.clone();
simulation.time+=FIXED_STEP;
f.position.add(new THREE.Vector3(.060,.030,-.040));
f.phase=.040;f.pectoral=.030;f.yaw=-Math.PI+.020;
f.tailAmplitude=.06;f.rowing=.80;f.bend=.02;
const group=school.groups.find(g=>g.fish.includes(f)),index=group.fish.indexOf(f),offset=index*4;
const samples=[];
for(const alpha of [0,.25,.5,.75,1]){
  school.update(alpha);
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  group.mesh.getMatrixAt(index,matrix);matrix.decompose(p,q,s);
  const expected=before.clone().lerp(f.position,alpha);
  assert.ok(p.distanceTo(expected)<1e-6,'Position interpolates continuously between adjacent simulation states');
  const forward=new THREE.Vector3(1,0,0).applyQuaternion(q);
  assert.ok(forward.x<-.999,'Orientation never spins backwards through zero at the +/-π boundary');
  const phase=group.data[offset],pectoral=group.gait[offset];
  assert.ok(Math.abs(phase-TAU)<.041&&Math.abs(pectoral-TAU)<.031,'Wrapped phases travel through 2π, not backwards through π');
  assert.ok(Math.abs(group.gait[offset+3]-FIXED_STEP*alpha)<1e-7,'Flutter clock uses interpolated simulation time');
  samples.push({fin:Math.sin(pectoral-.78),tail:sampleBodyWave(-.68,{length:1.1,phase,amplitude:group.data[offset+1],bend:group.gait[offset+2],time:group.gait[offset+3],seed:.9,coast:.0045}).offset});
}
for(let i=1;i<samples.length;i++){
  assert.ok(Math.abs(samples[i].fin-samples[i-1].fin)<.025,'No paired fin jump at phase wrap');
  assert.ok(Math.abs(samples[i].tail-samples[i-1].tail)<.015,'No tail positional snap at phase wrap');
}
assert.ok(Math.abs(interpolatePhase(.02,TAU-.02,.5))<1e-12,'Reverse wrap also takes the short arc');

// Frozen simulation + same alpha must produce byte-identical uploads. No wall
// clock, implicit accumulator, smoothing timer or random jitter may keep moving.
school.update(.5);
const frozen=school.groups.map(g=>[Buffer.from(g.data.buffer.slice(0)),Buffer.from(g.gait.buffer.slice(0)),Buffer.from(g.mesh.instanceMatrix.array.buffer.slice(0))]);
for(let i=0;i<200;i++)school.update(.5);
school.groups.forEach((g,i)=>{
  assert.ok(Buffer.from(g.data.buffer).equals(frozen[i][0]));
  assert.ok(Buffer.from(g.gait.buffer).equals(frozen[i][1]));
  assert.ok(Buffer.from(g.mesh.instanceMatrix.array.buffer).equals(frozen[i][2]));
});
assert.equal(f.phase,.040,'Interpolation never changes the behavior state');

// An analytic slope used for lighting must agree with the actual displacement;
// otherwise a tail can have smooth geometry but suddenly changing highlights.
let worstDerivativeError=0;
for(let i=0;i<80;i++){
  const x=-.70+i*.012,parameters={length:1.15,phase:i*.173,amplitude:.076,bend:.08*Math.sin(i),time:i*.08,seed:.8,coast:.0055};
  const h=1e-5,numerical=(sampleBodyWave(x+h,parameters).offset-sampleBodyWave(x-h,parameters).offset)/(2*h);
  const analytic=sampleBodyWave(x,parameters).slope;
  worstDerivativeError=Math.max(worstDerivativeError,Math.abs(numerical-analytic));
}
assert.ok(worstDerivativeError<1e-7,'Smooth body normals track the full propulsive and passive waves');
const coast=[];
for(let i=0;i<90;i++)coast.push(sampleBodyWave(-.65,{length:1.10,phase:0,amplitude:0,bend:0,time:i/30,seed:.5,coast:.0045}).offset);
assert.ok(Math.max(...coast)-Math.min(...coast)>.003,'Glide retains a subtle passive wave');
assert.ok(Math.max(...coast.map(Math.abs))<.005,'Passive glide is restrained, not extra thrust');

for(const g of school.groups){
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};
  g.mesh.material.onBeforeCompile(shader);
  assert.ok(!/fishGait\.x\s*\*\s*\.?\d|fishTrim\.x\s*\*\s*\.?\d/.test(shader.vertexShader),'Wrapped phases cannot drive fractional-frequency flutter');
  assert.ok(!/\b(?:float|vec[234]|int|bool)\s+(?:active|filter|input|output|sample|partition|common)\b/.test(shader.vertexShader),'Avoid reserved GLSL ES identifiers in generated vertex shader');
  assert.ok(shader.vertexShader.includes('fishGait.w*'),'Free membrane motion has an unwrapped clock');
}
console.log(JSON.stringify({pass:true,phaseWraps:'forward/reverse',pausedBufferRepeats:200,interpolationSamples:5,worstDerivativeError,coastPeak:Math.max(...coast.map(Math.abs))},null,2));
