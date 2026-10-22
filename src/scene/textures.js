import {
  CanvasTexture,
  TextureLoader,
  RepeatWrapping,
  ClampToEdgeWrapping,
  SRGBColorSpace
} from 'three';
import { PAL } from './palette.js';

import cobbleColorUrl from '../assets/pbr/pompeii/cobblestone-diffuse.webp';
import cobbleNormalUrl from '../assets/pbr/pompeii/cobblestone-normal.webp';
import cobbleRoughUrl from '../assets/pbr/pompeii/cobblestone-roughness.webp';
import roofColorUrl from '../assets/pbr/pompeii/roof-diffuse.webp';
import roofNormalUrl from '../assets/pbr/pompeii/roof-normal.webp';
import roofRoughUrl from '../assets/pbr/pompeii/roof-roughness.webp';
import tuffColorUrl from '../assets/pbr/pompeii/tuff-color.webp';


/* --------------------------------------------------------- texture */
// Le superfici minute sono procedurali; le mappe PBR principali sono asset
// locali CC0, incorporati da Vite nel singolo HTML per conservare l'offline.
// Quasi isotrope, perché i blocchi hanno proporzioni molto diverse e un motivo
// direzionale si stirerebbe.
export function px(n){ const c = document.createElement('canvas'); c.width = c.height = n; return c; }
// mulberry32: il generatore lineare di prima metteva in fila le coppie (x, y)
// e le pietre dell'opus incertum si allineavano in diagonale
function seeded(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function toTex(c, rep){
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(rep || 1, rep || 1);
  t.anisotropy = 4;
  return t;
}

const imageLoader = new TextureLoader();
function pbrSet(colorUrl, normalUrl, roughnessUrl, repeat){
  const color = imageLoader.load(colorUrl);
  color.colorSpace = SRGBColorSpace;
  const normal = imageLoader.load(normalUrl);
  const roughness = imageLoader.load(roughnessUrl);
  for(const map of [color, normal, roughness]){
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(repeat, repeat);
    map.anisotropy = 8;
  }
  return { color, normal, roughness };
}

// Mappe PBR CC0: materiale fotografico denso, affiancato alle superfici
// procedurali qui sotto. Le JPEG sono incorporate nel bundle offline da Vite.
export const PBR = {
  basalt: pbrSet(cobbleColorUrl, cobbleNormalUrl, cobbleRoughUrl, 6),
  // L'intonaco fotografico non c'è più (13 ottobre 2026): la sua mappa di
  // colore era un grigio-blu scuro, media RGB 69/73/77, e moltiplicata per il
  // beige delle pareti dava muri neri in ogni scena. Le pareti tornano
  // all'intonaco procedurale, TEX.plaster qui sotto.
  tile: pbrSet(roofColorUrl, roofNormalUrl, roofRoughUrl, 5)
};

// pallino morbido per le particelle: senza, i punti si vedono come quadratini
function dotTexture(){
  const c = px(32), g = c.getContext('2d');
  const grd = g.createRadialGradient(16,16,0,16,16,16);
  grd.addColorStop(0.0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0,0,32,32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
export const DOT = dotTexture();
function grain(n, lo, hi, seed, blots, blotA){
  const c = px(n), g = c.getContext('2d'), r = seeded(seed);
  const img = g.createImageData(n, n), d = img.data;
  for(let i=0;i<n*n;i++){
    const v = Math.round(255 * (lo + r()*(hi-lo)));
    d[i*4] = v; d[i*4+1] = v; d[i*4+2] = v; d[i*4+3] = 255;
  }
  g.putImageData(img, 0, 0);
  for(let k=0;k<(blots||0);k++){
    const x = r()*n, y = r()*n, rad = n*(0.06 + r()*0.2);
    const grd = g.createRadialGradient(x,y,0,x,y,rad);
    const a = (blotA||0.07) * (0.4 + r()*0.6);
    grd.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    // anche oltre i bordi: ripetuta, la texture non mostra cuciture
    for(const ox of [-n, 0, n]) for(const oy of [-n, 0, n]){
      g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x,y,rad,0,7); g.fill(); g.restore();
    }
  }
  return c;
}
function chunks(n, seed, count, sMin, sMax, mortar, lo, hi){
  const c = px(n), g = c.getContext('2d'), r = seeded(seed);
  g.fillStyle = 'rgb(' + mortar + ',' + mortar + ',' + (mortar-6) + ')';
  g.fillRect(0,0,n,n);
  for(let k=0;k<count;k++){
    const x = r()*n, y = r()*n, rad = n*(sMin + r()*(sMax-sMin));
    const sides = 5 + Math.floor(r()*4);
    g.beginPath();
    for(let i=0;i<sides;i++){
      const a = i/sides*Math.PI*2 + r()*0.3, rr = rad*(0.68 + r()*0.6);
      const xx = x + Math.cos(a)*rr, yy = y + Math.sin(a)*rr;
      i ? g.lineTo(xx,yy) : g.moveTo(xx,yy);
    }
    g.closePath();
    const v = Math.round(255*(lo + r()*(hi-lo)));
    g.fillStyle = 'rgb(' + v + ',' + (v-3) + ',' + (v-9) + ')';
    g.fill();
  }
  return c;
}
function veined(n, seed){
  const c = px(n), g = c.getContext('2d'), r = seeded(seed);
  g.drawImage(grain(n, 0.93, 1.0, seed), 0, 0);
  g.lineCap = 'round';
  for(let k=0;k<9;k++){
    g.beginPath();
    let x = r()*n, y = r()*n;
    g.moveTo(x,y);
    for(let i=0;i<7;i++){ x += (r()-0.5)*n*0.45; y += (r()-0.5)*n*0.45; g.lineTo(x,y); }
    g.strokeStyle = 'rgba(120,116,108,' + (0.07 + r()*0.09) + ')';
    g.lineWidth = 0.7 + r()*1.6;
    g.stroke();
  }
  return c;
}
/* Il basolato: lastre poligonali di lava, accostate, con i giunti più
   scuri e un poco più bassi. Mau (1899, cap. XXXI): «polygonal blocks of
   basalt», cioè di lava, «fitted to one another with great care». La
   misura delle lastre (circa mezzo metro) e il colore NON vengono da Mau:
   sono di disegno, come il motivo, che si ripete ogni 4 m (mappaMondo).
   Restituisce il colore e la mappa delle normali (rilievo dei giunti). */
function basoli(n, seed, celle){
  const r = seeded(seed), G = celle, passo = n / G;
  const sx = [], sz = [], tono = [];
  for(let j = 0; j < G; j++) for(let i = 0; i < G; i++){
    // semi molto spostati: lastre di forma e misura diverse, non esagoni
    sx.push((i + 0.02 + r()*0.96) * passo); sz.push((j + 0.02 + r()*0.96) * passo);
    tono.push(0.44 + r()*0.14);
  }
  const col = px(n), nor = px(n);
  const ci = col.getContext('2d').createImageData(n, n), ni = nor.getContext('2d').createImageData(n, n);
  const h = new Float32Array(n*n), t = new Float32Array(n*n);
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){
    const gi = Math.floor(x / passo), gj = Math.floor(y / passo);
    let d1 = 1e9, d2 = 1e9, k1 = 0;
    for(let dj = -1; dj <= 1; dj++) for(let di = -1; di <= 1; di++){
      const ii = (gi + di + G) % G, jj = (gj + dj + G) % G, k = jj*G + ii;
      // distanze sul toro: il motivo si ripete senza cuciture
      let dx = Math.abs(sx[k] - x); dx = Math.min(dx, n - dx);
      let dz = Math.abs(sz[k] - y); dz = Math.min(dz, n - dz);
      const d = dx*dx + dz*dz;
      if(d < d1){ d2 = d1; d1 = d; k1 = k; } else if(d < d2) d2 = d;
    }
    const bordo = Math.sqrt(d2) - Math.sqrt(d1);          // distanza dal giunto (px)
    // giunti sottili (2–3 cm) e appena più scuri: le lastre sono accostate
    const giunto = Math.min(1, bordo / (passo * 0.035));
    h[y*n + x] = Math.sqrt(giunto) * (1 - 0.12 * Math.sqrt(d1) / passo);
    t[y*n + x] = tono[k1] * (0.72 + 0.28 * giunto) * (0.94 + 0.06 * Math.sin(x*0.07 + k1) * Math.cos(y*0.05 + k1*1.7));
  }
  for(let i = 0; i < n*n; i++){
    const g = t[i] * (0.9 + r()*0.2) * 255;
    ci.data[i*4] = g * 1.0; ci.data[i*4+1] = g * 0.985; ci.data[i*4+2] = g * 0.96; ci.data[i*4+3] = 255;
    const x = i % n, y = (i / n) | 0;
    const hx = h[y*n + (x+1) % n] - h[y*n + (x-1+n) % n], hy = h[((y+1) % n)*n + x] - h[((y-1+n) % n)*n + x];
    const k = 2.2, l = Math.hypot(hx*k, hy*k, 1);
    ni.data[i*4] = (-hx*k/l*0.5 + 0.5) * 255; ni.data[i*4+1] = (hy*k/l*0.5 + 0.5) * 255;
    ni.data[i*4+2] = (1/l*0.5 + 0.5) * 255; ni.data[i*4+3] = 255;
  }
  col.getContext('2d').putImageData(ci, 0, 0); nor.getContext('2d').putImageData(ni, 0, 0);
  return { col, nor };
}
/* L'opus incertum dei muri spogliati: pietre irregolari di lava grigia e
   di calcare del Sarno, giallo-grigio, in poca malta. Mau (cap. VI): la
   muratura in pietrame è la più diffusa a Pompei, di lava nei tempi più
   antichi e poi di calcare del Sarno. Proporzioni e colori sono di disegno. */
function incertum(n, seed){
  const c = px(n), g = c.getContext('2d'), r = seeded(seed);
  // la malta si vede appena: le pietre (10–25 cm) coprono quasi tutta la parete
  g.fillStyle = 'rgb(146,139,125)'; g.fillRect(0, 0, n, n);
  // lava (tre grigi) e calcare del Sarno (due toni), consumati dal tempo:
  // contrasto basso, pietre di 15–30 cm
  const PIETRE = [[128,124,118], [140,135,127], [118,115,110], [176,166,145], [163,153,131]];
  for(let k = 0; k < 520; k++){
    const x = r()*n, y = r()*n, rad = n*(0.034 + r()*0.032), sides = 5 + Math.floor(r()*4);
    const [cr, cg, cb] = PIETRE[Math.floor(r()*PIETRE.length)], v = 0.85 + r()*0.25;
    for(const [ox, oy] of [[0,0],[n,0],[-n,0],[0,n],[0,-n]]){    // ripetibile ai bordi
      g.beginPath();
      for(let i = 0; i < sides; i++){
        const a = i/sides*Math.PI*2 + r()*0.3, rr = rad*(0.7 + r()*0.5);
        const xx = x + ox + Math.cos(a)*rr, yy = y + oy + Math.sin(a)*rr*0.8;
        i ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
      }
      g.closePath();
      g.fillStyle = `rgb(${cr*v|0},${cg*v|0},${cb*v|0})`; g.fill();
    }
  }
  const d = g.getImageData(0, 0, n, n);
  for(let i = 0; i < d.data.length; i += 4){ const q = 0.92 + r()*0.12; d.data[i] *= q; d.data[i+1] *= q; d.data[i+2] *= q; }
  g.putImageData(d, 0, 0);
  return c;
}

/* Le texture a misura vera. Gli edifici sono scatole scalate: con le
   coordinate della scatola la stessa texture si stendeva una volta su ogni
   faccia, e su una strada lunga 400 m un basolato di lastre da mezzo metro
   diventava una macchia scura (22/10/2026). Qui la texture si proietta in
   coordinate del mondo sulla faccia dominante: scala = ripetizioni per
   unità (1 unità = 4 m), quindi 1 = il motivo ogni 4 m. */
export function mappaMondo(m, scala){
  m.onBeforeCompile = sh => {
    sh.uniforms.uScalaMondo = { value: scala };
    sh.vertexShader = 'uniform float uScalaMondo;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
{
  vec4 mwp = vec4( position, 1.0 );
  vec3 mwn = normal;
  #ifdef USE_INSTANCING
    mwp = instanceMatrix * mwp;
    mwn = mat3( instanceMatrix ) * mwn;
  #endif
  mwp = modelMatrix * mwp;
  mwn = abs( mat3( modelMatrix ) * mwn );
  vec2 muv = ( mwn.y >= max( mwn.x, mwn.z ) ) ? mwp.xz : ( ( mwn.x >= mwn.z ) ? vec2( mwp.z, mwp.y ) : mwp.xy );
  muv *= uScalaMondo;
  vMapUv = muv;
  #ifdef USE_NORMALMAP
    vNormalMapUv = muv;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = muv;
  #endif
}
#endif`);
  };
  m.customProgramCacheKey = () => 'mondo';
}
// ripetizioni per unità di ogni texture (il motivo misura 4/scala metri)
export const SCALA_MONDO = { plaster:0.8, rubble:2, incertum:1.7, tile:1.3, basalt:1, basoli:1,
  stone:2, marble:2, tuffNoise:1, pumiceW:1, pumiceG:1, ash:1, veg:1 };

export const TEX = {};
// intonaco: grana fine e macchie larghe e leggere; a misura vera le macchie
// piccole si ripetevano ogni 2,5 m e da lontano facevano i pois
TEX.plaster = toTex(grain(512, 0.90, 1.0, 11, 6, 0.03), 3);
TEX.rubble  = toTex(chunks(256, 23, 190, 0.018, 0.042, 152, 0.82, 1.0), 3);
TEX.tile    = toTex(grain(256, 0.84, 1.0, 37, 10, 0.07), 4);
TEX.basalt  = toTex(chunks(256, 41, 130, 0.028, 0.062, 124, 0.74, 0.96), 3);
TEX.marble  = toTex(veined(256, 53), 2);
TEX.stone   = toTex(grain(256, 0.90, 1.0, 61, 10, 0.045), 3);
// La mappa AI è applicata una sola volta per faccia: evita giunzioni da tile.
TEX.tuff    = imageLoader.load(tuffColorUrl);
TEX.tuff.colorSpace = SRGBColorSpace;
TEX.tuff.wrapS = TEX.tuff.wrapT = ClampToEdgeWrapping;
TEX.tuff.repeat.set(1, 1);
TEX.tuff.anisotropy = 8;
TEX.tuffNoise = toTex(grain(256, 0.84, 1.0, 71, 16, 0.07), 4);
TEX.pumiceW = toTex(grain(256, 0.76, 1.0, 83, 0), 5);
TEX.pumiceG = toTex(grain(256, 0.78, 1.0, 97, 8, 0.06), 5);
TEX.ash     = toTex(grain(256, 0.86, 1.0, 103, 12, 0.06), 4);
TEX.veg     = toTex(grain(256, 0.74, 1.0, 109, 12, 0.10), 2);
{
  const b = basoli(512, 131, 8);
  TEX.basoli = toTex(b.col, 1);
  TEX.basoliN = new CanvasTexture(b.nor);
  TEX.basoliN.wrapS = TEX.basoliN.wrapT = RepeatWrapping; TEX.basoliN.anisotropy = 4;
}
TEX.incertum = toTex(incertum(512, 149), 1);

export const TEXMAP = new Map([
  [PAL.wall1,'plaster'],[PAL.wall2,'plaster'],[PAL.wall3,'incertum'],
  [PAL.roof,'tile'],[PAL.roof2,'tile'],
  [PAL.street,'basoli'],[PAL.kerb,'stone'],
  [PAL.stone,'stone'],[PAL.column,'marble'],[PAL.civic,'stone'],
  [PAL.terrace,'tuff'],[0x8f8776,'tuff'],[0x847c6b,'tuff'],
  [PAL.depWhite,'pumiceW'],[PAL.depGrey,'pumiceG'],[PAL.depSurge,'ash'],
  [0x4c4639,'ash'],[PAL.mountain,'ash'],[0x6d6a64,'ash'],[0x555350,'ash'],
  [PAL.veg,'veg'],[PAL.crude,'plaster'],[PAL.spoil,'tuff'],
  [0x3a342c,'plaster'],[0x5a4a37,'tuffNoise'],[0x54633f,'veg'],[0x5f6e48,'veg'],
  [0x8f8674,'tuff'],[0x5d7278,'stone'],[0x6d8286,'stone']
]);
