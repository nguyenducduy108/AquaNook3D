import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sent=[], callbacks=[], pointers=[], called=[];
let listener;
const canvas={getBoundingClientRect:()=>({left:10,top:20,width:800,height:600}),dispatchEvent:event=>pointers.push(event)};
const win={chrome:{webview:{postMessage:m=>sent.push(m),addEventListener:(name,fn)=>{listener=fn;}}}};
const context=vm.createContext({window:win,
  document:{documentElement:{dataset:{motion:'host'}},querySelector:()=>canvas},
  location:{pathname:'/scenes/reefscape/wallpaper.html'},performance:{now:()=>0},
  addEventListener:()=>{},dispatchEvent:()=>{},
  CustomEvent:class {constructor(type,args){this.type=type;Object.assign(this,args);}},
  PointerEvent:class {constructor(type,args){this.type=type;Object.assign(this,args);}},
  setTimeout:fn=>{callbacks.push(fn);return callbacks.length;},clearTimeout:()=>{},
  setInterval:()=>42,clearInterval:()=>{},console:{error:()=>{}},
});
vm.runInContext(fs.readFileSync(new URL('../host-bridge.js',import.meta.url),'utf8'),context);
const send=data=>listener({data});
send({type:'rate',value:20,id:1});
send({type:'pause',value:true});
send({type:'quality',value:'eco'});
assert.equal(sent.some(m=>m.type==='ready'),false,'Never report ready at navigation before scene APIs exist');
assert.equal(win.aquaBridge.command({type:'feed'}),false,'Do not queue invisible food');
for(const [api,name] of [['sceneRate','rate'],['scenePause','pause'],['scenePower','power'],['sceneQuality','quality'],['sceneFeed','feed']]) {
  win[api]=value=>called.push([name,value]);
}
win.sceneStats=()=>({triangles:123456,frames:1});
win.sceneTelemetry=()=>({fish:[{position:[1,2,3]}],pellets:0});
callbacks.shift()();
assert.equal(sent.filter(m=>m.type==='ready').length,1);
assert.equal(called.find(c=>c[0]==='rate')[1],20,'Retain early native rate');
assert.equal(called.find(c=>c[0]==='pause')[1],true,'Retain early native pause');
assert.equal(called.find(c=>c[0]==='quality')[1],'eco');
send({type:'pause',value:false});
send({type:'pointer',x:.25,y:.75,inside:true});
assert.deepEqual([pointers[0].clientX,pointers[0].clientY],[210,470],'Map normalized input to CSS viewport exactly once');
send({type:'pointer',inside:false});
assert.equal(pointers.at(-1).type,'pointerleave');
assert.equal(win.aquaBridge.command({type:'feed'}),true);
send({type:'rate',value:0});
assert.equal(win.aquaBridge.command({type:'feed'}),false,'Rate zero must suppress feeding');
assert.equal(win.aquaBridge.command({type:'rate',value:NaN}),false);
assert.equal(win.aquaBridge.command({type:'pause',value:'false'}),false);
assert.equal(win.aquaBridge.command({type:'quality',value:'unknown'}),false);
assert.equal(win.aquaBridge.command({type:'eval',value:'alert(1)'}),false,'No arbitrary evaluation channel');
send({type:'stats'});
assert.equal(sent.at(-1).scene.triangles,123456);
assert.equal(sent.at(-1).geometry.fish[0].position[2],3);
assert.equal(sent.at(-1).host.pointerCount,1);
assert.equal(sent.find(m=>m.type==='ack').accepted,true);
console.log('PASS: native startup ordering, queued state, coordinate conversion, pause/rate/feed contract, input validation and real telemetry.');
