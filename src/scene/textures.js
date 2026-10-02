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
import plasterColorUrl from '../assets/pbr/pompeii/plaster-diffuse.webp';
import plasterNormalUrl from '../assets/pbr/pompeii/plaster-normal.webp';
import plasterRoughUrl from '../assets/pbr/pompeii/plaster-roughness.webp';
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
function seeded(seed){ let x = seed >>> 0; return () => (x = (x*1664525 + 1013904223) >>> 0) / 4294967296; }
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
  plaster: pbrSet(plasterColorUrl, plasterNormalUrl, plasterRoughUrl, 10),
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
    g.fillStyle = grd; g.beginPath(); g.arc(x,y,rad,0,7); g.fill();
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
export const TEX = {};
TEX.plaster = toTex(grain(256, 0.88, 1.0, 11, 14, 0.055), 3);
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

export const TEXMAP = new Map([
  [PAL.wall1,'plaster'],[PAL.wall2,'plaster'],[PAL.wall3,'rubble'],
  [PAL.roof,'tile'],[PAL.roof2,'tile'],
  [PAL.street,'basalt'],[PAL.kerb,'stone'],
  [PAL.stone,'stone'],[PAL.column,'marble'],[PAL.civic,'stone'],
  [PAL.terrace,'tuff'],[0x8f8776,'tuff'],[0x847c6b,'tuff'],
  [PAL.depWhite,'pumiceW'],[PAL.depGrey,'pumiceG'],[PAL.depSurge,'ash'],
  [0x4c4639,'ash'],[PAL.mountain,'ash'],[0x6d6a64,'ash'],[0x555350,'ash'],
  [PAL.veg,'veg'],[PAL.crude,'plaster'],[PAL.spoil,'tuff'],
  [0x3a342c,'plaster'],[0x5a4a37,'tuffNoise'],[0x54633f,'veg'],[0x5f6e48,'veg'],
  [0x8f8674,'tuff'],[0x5d7278,'stone'],[0x6d8286,'stone']
]);
