import {
  DepthFormat,
  DepthTexture,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  UnsignedIntType,
  Vector2,
  WebGLRenderTarget
} from 'three';


/* =====================================================================
   POST-PRODUZIONE — scritta a mano, solo three.js di base.
   Nessun addon: EffectComposer e i suoi passaggi non sono nel bundle, e
   caricarli romperebbe l'autosufficienza del file.

   La scena va in un bersaglio fuori schermo, poi un quadrilatero a tutto
   schermo la ripassa con quattro operazioni, in quest'ordine:
     1. FXAA           — antialiasing sui bordi, sulla luminanza
     2. occlusione     — scurisce gli angoli fra i volumi leggendo la
                         profondità: è ciò che dà spessore ai vicoli
     3. nitidezza      — maschera di contrasto leggera
     4. vignettatura   — e una correzione di colore appena percettibile

   Il bersaglio può essere più grande dello schermo (sovracampionamento):
   è il modo più prevedibile di guadagnare definizione su una macchina
   che ne ha da spendere. Se il frame rate cala, la scala scende da sola.

   Il colore: la scena è già codificata in sRGB dal tone mapping quando
   arriva qui, quindi tutte le operazioni girano in spazio percettivo —
   che per l'antialiasing è anche il posto giusto — e l'uscita non viene
   riconvertita.
   ===================================================================== */

export const POST = (function(){

  let rt = null, sceneQ = null, camQ = null, mat = null;
  let W = 1, H = 1, scale = 1, ready = false;

  const FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2  texel;        // 1 / dimensione del bersaglio
uniform float near;
uniform float far;
uniform float aoAmount;
uniform float aoRadius;
uniform float sharpAmount;
uniform float vignetteAmount;
varying vec2 vUv;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

// Il bersaglio è in sRGB, quindi la scheda lo decodifica in lettura e qui
// arrivano valori lineari. Vanno ricodificati in uscita, altrimenti il
// fotogramma finisce sullo schermo con due gamma di scarto ed è nero.
vec3 lin2srgb(vec3 c){
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(0.4166667)) - 0.055, step(vec3(0.0031308), c));
}

// profondità di vista: negativa davanti alla telecamera
float viewZ(vec2 uv){
  float d = texture2D(tDepth, uv).x;
  float ndc = d * 2.0 - 1.0;
  return (2.0 * near * far) / (far + near - ndc * (far - near)) * -1.0;
}

/* ---------------------------------------------------------------- FXAA */
vec3 fxaa(vec2 uv){
  vec3 rgbM = texture2D(tDiffuse, uv).rgb;
  vec3 rgbNW = texture2D(tDiffuse, uv + vec2(-1.0,-1.0)*texel).rgb;
  vec3 rgbNE = texture2D(tDiffuse, uv + vec2( 1.0,-1.0)*texel).rgb;
  vec3 rgbSW = texture2D(tDiffuse, uv + vec2(-1.0, 1.0)*texel).rgb;
  vec3 rgbSE = texture2D(tDiffuse, uv + vec2( 1.0, 1.0)*texel).rgb;

  float lM = luma(rgbM), lNW = luma(rgbNW), lNE = luma(rgbNE),
        lSW = luma(rgbSW), lSE = luma(rgbSE);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if(lMax - lMin < max(0.016, lMax * 0.095)) return rgbM;   // zona piatta: lascia stare

  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE) * 0.25 * 0.20, 1.0/128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -8.0, 8.0) * texel;

  vec3 rgbA = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0/3.0 - 0.5)).rgb +
                     texture2D(tDiffuse, uv + dir * (2.0/3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb +
                                   texture2D(tDiffuse, uv + dir * 0.5).rgb);
  float lB = luma(rgbB);
  return (lB < lMin || lB > lMax) ? rgbA : rgbB;
}

/* -------------------------------------------- occlusione dalla profondità */
const vec2 K0 = vec2( 1.0,  0.0);
const vec2 K1 = vec2( 0.7,  0.7);
const vec2 K2 = vec2( 0.0,  1.0);
const vec2 K3 = vec2(-0.7,  0.7);
const vec2 K4 = vec2(-1.0,  0.0);
const vec2 K5 = vec2(-0.7, -0.7);
const vec2 K6 = vec2( 0.0, -1.0);
const vec2 K7 = vec2( 0.7, -0.7);

float occl(vec2 uv, float z, vec2 dir, float rad){
  float zs = viewZ(uv + dir * rad);
  float diff = zs - z;                       // >0: il vicino è più vicino
  if(diff <= 0.0) return 0.0;
  float range = clamp(1.0 - diff / (abs(z) * 0.10 + 0.9), 0.0, 1.0);
  return clamp(diff / (abs(z) * 0.020 + 0.10), 0.0, 1.0) * range;
}

void main(){
  vec3 col = fxaa(vUv);

  // --- occlusione di contatto
  if(aoAmount > 0.001){
    float z = viewZ(vUv);
    if(z < -0.05 && z > -200.0){
      float rad = aoRadius * texel.y * (1.0 + 14.0 / (abs(z) + 3.0));
      float ao = occl(vUv,z,K0,rad) + occl(vUv,z,K1,rad) + occl(vUv,z,K2,rad) + occl(vUv,z,K3,rad)
               + occl(vUv,z,K4,rad) + occl(vUv,z,K5,rad) + occl(vUv,z,K6,rad) + occl(vUv,z,K7,rad);
      ao *= 0.125;
      float fade = clamp((-z - 34.0) / 80.0, 0.0, 1.0);     // è un effetto di contatto: da lontano si spegne
      col *= 1.0 - ao * aoAmount * (1.0 - fade);
    }
  }

  // --- nitidezza: maschera di contrasto sui soli bordi
  if(sharpAmount > 0.001){
    vec3 b = (texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb +
              texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb +
              texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb +
              texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb) * 0.25;
    col = clamp(col + (col - b) * sharpAmount, 0.0, 1.0);
  }

  // --- vignettatura
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.92);
  float v = 1.0 - dot(q, q) * vignetteAmount;
  col *= clamp(v, 0.0, 1.0);

  // --- correzione di colore: ombre appena fredde, luci appena calde
  float l = luma(col);
  col = mix(col, col * vec3(0.978, 0.992, 1.024), (1.0 - l) * 0.18);
  col = mix(col, col * vec3(1.014, 1.003, 0.984), l * 0.16);

  gl_FragColor = vec4(lin2srgb(col), 1.0);
}
`;

  const VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

  function init(renderer){
    if(ready) return true;
    if(!renderer.capabilities.isWebGL2) return false;   // serve la texture di profondità
    const dt = new DepthTexture(2, 2);
    dt.format = DepthFormat;
    dt.type = UnsignedIntType;
    dt.minFilter = NearestFilter;
    dt.magFilter = NearestFilter;
    rt = new WebGLRenderTarget(2, 2, {
      minFilter: LinearFilter, magFilter: LinearFilter,
      format: RGBAFormat, type: UnsignedByteType,
      depthBuffer: true, stencilBuffer: false, depthTexture: dt
    });
    rt.texture.colorSpace = SRGBColorSpace;
    rt.texture.generateMipmaps = false;

    mat = new ShaderMaterial({
      uniforms: {
        tDiffuse:{ value: rt.texture }, tDepth:{ value: dt },
        texel:{ value: new Vector2(1/2, 1/2) },
        near:{ value: 0.12 }, far:{ value: 1600 },
        aoAmount:{ value: 0.55 }, aoRadius:{ value: 5.0 },
        sharpAmount:{ value: 0.26 }, vignetteAmount:{ value: 0.22 }
      },
      vertexShader: VERT, fragmentShader: FRAG,
      depthTest: false, depthWrite: false
    });
    sceneQ = new Scene();
    camQ = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    sceneQ.add(new Mesh(new PlaneGeometry(2, 2), mat));
    ready = true;
    return true;
  }

  function setSize(renderer, w, h, s){
    if(!ready) return;
    scale = s;
    const pr = renderer.getPixelRatio();
    W = Math.max(2, Math.round(w * pr * scale));
    H = Math.max(2, Math.round(h * pr * scale));
    rt.setSize(W, H);
    mat.uniforms.texel.value.set(1/W, 1/H);
  }

  function setQuality(ao, sharp, vig, radius){
    if(!ready) return;
    mat.uniforms.aoAmount.value = ao;
    mat.uniforms.sharpAmount.value = sharp;
    mat.uniforms.vignetteAmount.value = vig;
    if(radius !== undefined) mat.uniforms.aoRadius.value = radius;
  }

  function render(renderer, scene, camera){
    if(!ready) return false;
    mat.uniforms.near.value = camera.near;
    mat.uniforms.far.value = camera.far;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    const tm = renderer.toneMapping;
    renderer.toneMapping = NoToneMapping;     // già applicato nel primo passaggio
    renderer.render(sceneQ, camQ);
    renderer.toneMapping = tm;
    return true;
  }

  return { init, setSize, setQuality, render, isReady: () => ready, getScale: () => scale };
})();

/* =====================================================================
   SONORO — sintesi procedurale. Nessun file audio: tutto è generato dal
   codice, così il pacchetto resta autosufficiente e funziona offline.

   REGOLA DEL MODULO, da tenere in mente leggendo il codice:
   si riproduce il TIMBRO di strumenti attestati come reperto nell'area
   vesuviana — tibiae, cornua, cymbala — non una composizione musicale.
   Nessuna melodia antica viene eseguita. La trascrizione dell'unica
   melodia greco-romana completa superstite (Epitaffio di Sicilo,
   Nationalmuseet inv. 14897) non è stata verificata sull'edizione
   critica di riferimento, quindi non entra nel modello: vedi la scheda
   del luogo «L'epitaffio di Sicilo».
   La cetra suona, ma è dichiarata come sola iconografia: a Pompei non
   sopravvive nessuno strumento a corda.
   Le altezze usate sono una convenzione moderna, non una ricostruzione.
   ===================================================================== */
