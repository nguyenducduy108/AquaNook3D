// Additional procedural anatomy for the Windows reef. These are independently
// lofted 3D cross-sections, fins and pigments, not textures of photographed fish.
// Bodies use the same +x snout frame as fish-model.js. Values are art-direction
// proportions, not a morphometric or husbandry model.
export const EXTRA_SPECIES = {
  blueTang: {
    len:1.04,
    back:[.026,.093,.178,.240,.287,.305,.291,.250,.182,.106,.048],
    belly:[.022,.080,.155,.213,.259,.281,.267,.216,.142,.076,.040],
    half:[.012,.033,.056,.071,.082,.086,.079,.061,.041,.024,.015],
    eye:{u:.158,v:.39,r:.037},scales:[48,21],cheek:.13,veil:[.93,.72],
    dorsal:{from:.180,to:.900,sink:.012,reach:[.025,.067,.077,.084,.090,.095,.084,.059,.016]},
    anal:{from:.335,to:.900,sink:.011,reach:[.020,.060,.079,.087,.091,.083,.071,.045,.014]},
    caudal:[[-.710,.214,0],[-.710,.157,0],[-.671,.105,0],[-.625,.048,0],[-.612,0,0],[-.625,-.048,0],[-.671,-.105,0],[-.710,-.157,0],[-.710,-.214,0]],
    pectoral:{base:[[.274,.27],[.310,.00],[.336,-.32]],tip:[[.386,.060,.110],[.447,-.026,.151],[.489,-.107,.156],[.469,-.185,.105],[.407,-.172,.060]]},
    pelvic:{base:[[.352,-.87],[.410,-.97]],tip:[[.452,-.292,.045],[.508,-.347,.051],[.547,-.276,.029]]},
  },
  yellowTang: {
    // Protruding fine snout, a deep compressed trunk and two tall sail fins.
    // The diamond silhouette remains distinct even with all pigment removed.
    len:.94,
    back:[.019,.033,.098,.215,.300,.328,.313,.245,.145,.068,.027],
    belly:[.014,.026,.069,.170,.259,.286,.263,.196,.116,.055,.024],
    half:[.009,.012,.024,.043,.061,.065,.058,.045,.029,.017,.010],
    eye:{u:.191,v:.50,r:.032},scales:[56,25],cheek:.08,veil:[.93,.65],
    dorsal:{from:.205,to:.900,sink:.012,reach:[.024,.146,.206,.189,.148,.118,.090,.054,.010]},
    anal:{from:.275,to:.900,sink:.012,reach:[.022,.122,.170,.158,.131,.102,.067,.032,.010]},
    caudal:[[-.620,.150,0],[-.654,.128,0],[-.643,.088,0],[-.616,.043,0],[-.603,0,0],[-.616,-.043,0],[-.643,-.088,0],[-.654,-.128,0],[-.620,-.150,0]],
    pectoral:{base:[[.285,.24],[.328,.02],[.369,-.30]],tip:[[.383,.064,.100],[.448,-.020,.139],[.501,-.102,.143],[.473,-.177,.104],[.410,-.175,.066]]},
    pelvic:{base:[[.340,-.84],[.401,-.98]],tip:[[.425,-.319,.030],[.492,-.363,.041],[.538,-.301,.028]]},
  },
  moorishIdol: {
    // Angular long snout, tall oval body, black forked tail and sickle pennant.
    len:.98,
    back:[.016,.027,.077,.219,.342,.383,.363,.294,.195,.098,.037],
    belly:[.013,.026,.059,.163,.284,.307,.296,.235,.153,.077,.031],
    half:[.008,.012,.021,.038,.055,.058,.053,.042,.028,.018,.011],
    eye:{u:.215,v:.52,r:.033},scales:[60,25],cheek:.08,veil:[.97,.80],
    dorsal:{from:.235,to:.905,sink:.014,reach:[.046,.202,.214,.152,.105,.095,.081,.049,.012]},
    anal:{from:.280,to:.890,sink:.013,reach:[.035,.173,.215,.185,.153,.114,.073,.039,.009]},
    caudal:[[-.703,.156,0],[-.724,.130,0],[-.693,.088,0],[-.656,.043,0],[-.640,0,0],[-.656,-.043,0],[-.693,-.088,0],[-.724,-.130,0],[-.703,-.156,0]],
    pectoral:{base:[[.272,.30],[.323,.00],[.363,-.29]],tip:[[.390,.066,.113],[.463,-.034,.168],[.507,-.115,.168],[.466,-.188,.110],[.396,-.164,.057]]},
    pelvic:{base:[[.290,-.83],[.356,-.99]],tip:[[.393,-.390,.030],[.456,-.462,.036],[.481,-.378,.025]]},
    // Centreline and half-width of the thin dorsal extension, attached to the
    // anterior dorsal; bending trails along its length in the vertex shader.
    pennant:[[.235,.42,.034],[.182,.63,.045],[.072,.84,.035],[-.080,.99,.024],[-.292,1.065,.017],[-.497,1.058,.010],[-.640,1.010,.003]],
  },
};

export const EXTRA_SKIN = {
  blueTang:`
    vec3 skin=mix(vec3(.008,.060,.405),vec3(.030,.175,.620),smoothstep(.08,.60,band));
    skin=mix(skin,vec3(.155,.355,.650),smoothstep(.66,.97,band)*.60);
    // Black palette: upper dark field enclosing a blue oval and narrowing into
    // the caudal peduncle. The familiar mark wraps around actual body geometry.
    float backMark=(1.-smoothstep(.245,.295,band))*smoothstep(.20,.32,u);
    float oval=length(vec2((u-.535)/.275,(band-.340)/.166));
    float loop=(1.-smoothstep(1.03,1.09,oval))*smoothstep(.70,.79,oval);
    float stalk=smoothstep(.70,.83,u)*(1.-smoothstep(.30,.49,band));
    skin=mix(skin,vec3(.004,.007,.015),max(backMark,max(loop,stalk)));
    // The yellow wedge grows forward from the peduncle, continuous with the tail.
    float wedge=smoothstep(.87-.10*(1.-abs(band-.50)*2.),.91,u);
    skin=mix(skin,vec3(.88,.64,.016),wedge);
    skin=mix(skin,vec3(.012,.025,.045),exp(-pow((u-.912)/.032,2.)-pow((band-.49)/.030,2.)));`,
  yellowTang:`
    vec3 skin=mix(vec3(.72,.455,.006),vec3(.95,.730,.030),smoothstep(.02,.47,band));
    skin=mix(skin,vec3(.99,.835,.145),smoothstep(.64,.97,band)*.70);
    // The pale peduncular scalpel and short facial grooves are small anatomical
    // marks; the rest remains a clean yellow coat rather than decorative stripes.
    float blade=exp(-pow((u-.892)/.039,2.)-pow((band-.51)/.018,2.));
    skin=mix(skin,vec3(.92,.925,.72),blade*.94);
    float muzzle=exp(-pow((band-(.47+.3*u))/.022,2.))*(1.-smoothstep(.10,.20,u));
    skin*=1.-.18*muzzle;`,
  moorishIdol:`
    vec3 skin=mix(vec3(.82,.815,.70),vec3(.96,.94,.82),smoothstep(.10,.65,band));
    float yellow=smoothstep(.38,.48,u)*(1.-smoothstep(.77,.86,u));
    skin=mix(skin,vec3(.95,.690,.016),yellow*.90);
    float bars=min(abs(u-(.205+.065*band))-.075,abs(u-(.67+.095*band))-.093);
    float aa=max(fwidth(bars),.002);
    skin=mix(skin,vec3(.009,.011,.014),1.-smoothstep(-aa,aa,bars));
    skin=mix(skin,vec3(.91,.515,.075),exp(-pow((u-.080)/.054,2.)-pow((band-.32)/.19,2.)));
    skin=mix(skin,vec3(.94,.91,.75),smoothstep(.89,.965,u));`,
};

export const EXTRA_FINS = {
  blueTang:`
    vec3 web=mix(vec3(.018,.080,.380),vec3(.055,.190,.590),span);
    web=mix(web,vec3(.007,.015,.030),smoothstep(.86,.98,span)*(1.-paired));
    web=mix(web,vec3(.92,.710,.020),tail);
    web=mix(web,vec3(.66,.675,.290),paired*.55);`,
  yellowTang:`
    vec3 web=mix(vec3(.81,.510,.008),vec3(.98,.775,.045),span);
    web=mix(web,vec3(.97,.860,.295),smoothstep(.94,1.,span)*.35);
    web*=.97+.03*cos(axial*102.);`,
  moorishIdol:`
    vec3 web=mix(vec3(.83,.820,.730),vec3(.97,.950,.850),span);
    float bands=min(abs(axial-.26)-.073,abs(axial-.76)-.080);
    web=mix(web,vec3(.009,.011,.014),1.-smoothstep(-.010,.010,bands));
    web=mix(web,vec3(.94,.710,.040),smoothstep(.40,.49,axial)*(1.-smoothstep(.64,.69,axial)));
    web=mix(web,vec3(.007,.010,.014),tail);
    web=mix(web,vec3(.94,.93,.83),smoothstep(.58,.74,vAnatomy.y));
    web=mix(web,vec3(.69,.735,.69),paired*.66);`,
};
export const EXTRA_SHEEN={blueTang:'vec3(.025,.055,.130)',yellowTang:'vec3(.055,.048,.017)',moorishIdol:'vec3(.048,.051,.045)'};
export const EXTRA_EYE={
  blueTang:'vec3 iris=vec3(.095,.090,.065),rim=vec3(.008,.016,.040);',
  yellowTang:'vec3 iris=vec3(.48,.37,.08),rim=vec3(.175,.10,.005);',
  moorishIdol:'vec3 iris=vec3(.27,.24,.11),rim=vec3(.005,.007,.010);',
};

// Keep the existing, tested locomotion population. The extra species borrow its
// open-water movement, food pursuit and avoidance; no biological behavior claim.
// Map by stable ranks rather than current array order, preserving individual IDs.
export function visualSpecies(fish) {
  if(fish.kind==='chromis' && fish.rank<2)return 'blueTang';
  if(fish.kind==='chromis' && fish.rank<4)return 'yellowTang';
  if(fish.kind==='anthias' && fish.rank>=5)return 'moorishIdol';
  return fish.kind;
}
