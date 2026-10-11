import assert from 'node:assert/strict';
import { register } from 'node:module';
register('../../riverscape/tests/three-loader.mjs',import.meta.url);
const THREE=await import('three');
const {makeFishGeometry,createFishSchool,visualSpecies}=await import('../src/fish-model.js');
const {ReefSimulation,FIXED_STEP}=await import('../src/simulation.js');

const kinds=['clown','chromis','anthias','blueTang','yellowTang','moorishIdol'];
const dimensions={};
for(const kind of kinds){
  const geometry=makeFishGeometry(kind),{position,part}=geometry.attributes;
  assert.equal(part.count,position.count,kind+' anatomy vertex alignment');
  for(const attribute of Object.values(geometry.attributes))
    assert.ok([...attribute.array].every(Number.isFinite),kind+' finite vertices/normals/UVs');
  assert.ok([...geometry.index.array].every(i=>i<position.count),kind+' bounded topology');
  geometry.computeBoundingBox();
  const extent=geometry.boundingBox.getSize(new THREE.Vector3());
  const body=[];
  for(let i=0;i<position.count;i++)if(part.getX(i)===0)body.push(new THREE.Vector3().fromBufferAttribute(position,i));
  const box=new THREE.Box3().setFromPoints(body),bodySize=box.getSize(new THREE.Vector3());
  dimensions[kind]={length:extent.x,height:extent.y,thickness:extent.z,bodyHeight:bodySize.y,bodyThickness:bodySize.z};
  assert.ok(bodySize.z>.07,kind+' must have actual 3D thickness');
  assert.ok(bodySize.y>bodySize.z*2,kind+' laterally compressed anatomy');
  geometry.dispose();
}
assert.ok(dimensions.blueTang.bodyHeight>dimensions.chromis.bodyHeight*1.5,'Blue tang has a deep oval body, not a recolored chromis');
assert.ok(dimensions.yellowTang.height>dimensions.clown.height*1.3,'Yellow tang has high dorsal and anal sails');
assert.ok(dimensions.moorishIdol.height>dimensions.yellowTang.height*1.3,'Moorish idol has a physical dorsal pennant');
assert.ok(new Set(Object.values(dimensions).map(d=>JSON.stringify(d))).size===6,'All six silhouettes differ');

const simulation=new ReefSimulation(),before=simulation.fish.map(f=>({...f,position:f.position.toArray()}));
const scene=new THREE.Scene(),school=createFishSchool(scene,simulation);
school.update();
assert.deepEqual(school.speciesCounts,{clown:3,chromis:5,anthias:5,blueTang:2,yellowTang:2,moorishIdol:2});
const represented=school.groups.flatMap(group=>group.fish);
assert.equal(represented.length,19,'No additional simulation agents required');
assert.equal(new Set(represented).size,19,'Each simulation fish rendered exactly once');
for(let i=0;i<simulation.fish.length;i++){
  assert.equal(simulation.fish[i].kind,before[i].kind,'Keep original tested locomotion proxy');
  assert.deepEqual(simulation.fish[i].position.toArray(),before[i].position,'Meshing does not move fish');
  assert.equal(school.visualSpecies(simulation.fish[i]),visualSpecies(simulation.fish[i]));
}
for(const group of school.groups){
  assert.equal(group.mesh.count,group.fish.length);
  assert.ok(group.mesh.material.isMeshPhysicalMaterial,'Moist tissue uses physical material');
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};
  group.mesh.material.onBeforeCompile(shader);
  assert.ok(!/undefined|NaN/.test(shader.vertexShader+shader.fragmentShader),'Resolved shader parameters for '+group.kind);
  assert.ok(shader.vertexShader.includes('fishFlex'),'Body/tail bending survives specialization');
  if(group.kind==='moorishIdol')assert.ok(shader.vertexShader.includes('plume'),'Pennant deforms independently');
}
const initial=simulation.fish.map(f=>f.position.clone());
for(let i=0;i<120;i++)simulation.step(FIXED_STEP);
school.update();
assert.ok(simulation.fish.some((f,i)=>Math.abs(f.position.z-initial[i].z)>.01),'Visual species still move in depth');
assert.ok(school.groups.every(g=>[...g.mesh.instanceMatrix.array,...g.data,...g.gait].every(Number.isFinite)));
console.log(JSON.stringify({pass:true,species:school.speciesCounts,dimensions,meshCount:school.groups.length},null,2));
