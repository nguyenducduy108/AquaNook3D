// Wrapped gait phases are angles, not scalar coordinates. In particular, lerping
// from 2π-epsilon to epsilon must travel across zero rather than back through π.
export function interpolatePhase(from,to,alpha){
  return from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*alpha;
}

// Local swim-wave shape. Kept next to its GLSL version for an independent finite
// difference check of the normal derivative, which otherwise causes light to pop
// while a geometrically smooth tail moves. The passive wave is tiny: it describes
// a membrane yielding to current while propulsion is off, not additional thrust.
export const BODY_WAVE=Object.freeze({travel:3.7,coastTravel:4.1,coastRate:2.15});
export function sampleBodyWave(x,{length,phase,amplitude,bend,time,seed,coast}){
  const q=Math.max(0,Math.min(1,(.30-x)/length));
  const a=phase-q*BODY_WAVE.travel,b=time*BODY_WAVE.coastRate+seed-q*BODY_WAVE.coastTravel;
  const drive=Math.sin(a)*amplitude+bend+Math.sin(b)*coast;
  const offset=drive*q*q;
  const slope=q===0||q===1?0:-(2*q*drive-q*q*(BODY_WAVE.travel*Math.cos(a)*amplitude+BODY_WAVE.coastTravel*Math.cos(b)*coast))/length;
  return {offset,slope};
}

export function bodyWaveGLSL(length,coast){
  const f=n=>Number(n).toFixed(7);
  return `
    float fishCoastPhase(){return fishGait.w*${f(BODY_WAVE.coastRate)}+fishTrim.z*6.2831853;}
    float fishFlex(float x){
      float q=clamp((.30-x)/${f(length)},0.,1.);
      float thrustWave=sin(fishTrim.x-q*${f(BODY_WAVE.travel)})*fishTrim.y+fishGait.z;
      return (thrustWave+sin(fishCoastPhase()-q*${f(BODY_WAVE.coastTravel)})*${f(coast)})*q*q;
    }
    float fishSlope(float x){
      float q=clamp((.30-x)/${f(length)},0.,1.);
      if(q<=0.||q>=1.)return 0.;
      float a=fishTrim.x-q*${f(BODY_WAVE.travel)},b=fishCoastPhase()-q*${f(BODY_WAVE.coastTravel)};
      float drive=sin(a)*fishTrim.y+fishGait.z+sin(b)*${f(coast)};
      float gradient=${f(BODY_WAVE.travel)}*cos(a)*fishTrim.y+${f(BODY_WAVE.coastTravel)}*cos(b)*${f(coast)};
      return -(2.*q*drive-q*q*gradient)/${f(length)};
    }`;
}
