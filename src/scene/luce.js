/* =====================================================================
   LA LUCE COTTA

   L'occlusione ambientale del suolo, cotta da Cycles in Blender
   (strumenti/blender/luce_cotta.py, «npm run luce»): una texture vista
   dall'alto, letta in coordinate di mondo. Lungo i muri, nei vicoli e nei
   cortili il suolo riceve meno cielo; nelle piazze resta pieno. Attenua
   soprattutto la luce indiretta, e un poco quella del sole.

   Due modi:
   · suolo — il punto legge la texture dove sta;
   · muro  — la faccia legge il suolo che ha davanti (1,4 m in fuori) e
     perde l'effetto salendo entro 3,6 m dalla quota del suolo [disegno].

   La quota del suolo può cambiare per fasce di z (a Ercolano: la città, la
   terrazza, la spiaggia): uniforme fino a tre livelli, uAoLiv, separati da
   uAoZ. A Pompei i tre livelli sono uguali e seguono il deposito.

   Usato da src/app.js (Pompei) e src/ercolano.js; la texture si può
   cambiare a caldo (i momenti di Ercolano ne hanno due).
   ===================================================================== */
import { TextureLoader, Vector2, Vector3, Vector4 } from 'three';

export function creaLuceCotta(url, meta){
  const loader = new TextureLoader();
  const uni = {
    tex: { value: url ? loader.load(url) : null },
    box: { value: new Vector4() },
    forza: { value: url ? 1 : 0 },
    liv: { value: new Vector3(0, 0, 0) },
    z: { value: new Vector2(1e9, 1e9) }
  };
  const box = m => uni.box.value.set(m.x0, m.z0, 1 / (m.x1 - m.x0), 1 / (m.z1 - m.z0));
  if(meta) box(meta);
  const cache = new Map();

  function applica(mat, muro){
    const prima = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if(prima) prima.call(mat, sh, r);
      Object.assign(sh.uniforms, { uAoSuolo:uni.tex, uAoBox:uni.box, uAoForza:uni.forza, uAoLiv:uni.liv, uAoZ:uni.z });
      sh.vertexShader = 'varying vec3 vAoP;\nvarying vec3 vAoN;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
{
  vec4 aw = vec4( transformed, 1.0 );
  vec3 an = objectNormal;
  #ifdef USE_INSTANCING
    aw = instanceMatrix * aw;
    an = mat3( instanceMatrix ) * an;
  #endif
  vAoP = ( modelMatrix * aw ).xyz;
  vAoN = normalize( mat3( modelMatrix ) * an );
}`);
      sh.fragmentShader = 'uniform sampler2D uAoSuolo;\nuniform vec4 uAoBox;\nuniform float uAoForza;\nuniform vec3 uAoLiv;\nuniform vec2 uAoZ;\nvarying vec3 vAoP;\nvarying vec3 vAoN;\n' +
        sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
if( uAoForza > 0.001 ){
  ${muro ? `
  vec2 axz = vAoP.xz + normalize( vAoN.xz + 1e-5 ) * 0.35;
  float ao = texture2D( uAoSuolo, ( axz - uAoBox.xy ) * uAoBox.zw ).r;
  float quota = axz.y < uAoZ.x ? uAoLiv.x : ( axz.y < uAoZ.y ? uAoLiv.y : uAoLiv.z );
  float verticale = 1.0 - smoothstep( 0.4, 0.7, abs( vAoN.y ) );
  ao = mix( ao, 1.0, smoothstep( 0.0, 0.9, vAoP.y - quota ) );
  ao = mix( 1.0, ao, uAoForza * verticale );` : `
  float ao = texture2D( uAoSuolo, ( vAoP.xz - uAoBox.xy ) * uAoBox.zw ).r;
  ao = mix( 1.0, ao, uAoForza );`}
  reflectedLight.indirectDiffuse *= ao;
  reflectedLight.directDiffuse *= mix( 1.0, ao, 0.4 );
}`);
    };
    const chiave = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.customProgramCacheKey = () => chiave + (muro ? '|aomuro' : '|aosuolo');
    mat.needsUpdate = true;
  }

  return {
    uni, applica,
    // un'altra cottura (url + meta), già caricata una volta sola
    usa(url, meta, forza = 1){
      if(!url){ uni.forza.value = 0; return; }
      if(!cache.has(url)) cache.set(url, loader.load(url));
      uni.tex.value = cache.get(url);
      box(meta);
      uni.forza.value = forza;
    },
    // la quota del suolo: un valore solo, o tre livelli separati da due z
    quota(a, b = a, c = a, z1 = 1e9, z2 = 1e9){ uni.liv.value.set(a, b, c); uni.z.value.set(z1, z2); }
  };
}
