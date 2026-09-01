import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Clock,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NeutralToneMapping,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { AUDIO } from './audio.js';
import { CONFRONTO } from './confronto.js';
import { EPOCHS } from './data/epochs.js';
import { PLACES } from './data/places.js';
import { TOUR, TOUR_EPOCH } from './data/tour.js';
import { ERCOLANO } from './ercolano.js';
import { POST } from './post.js';
import { PAL } from './scene/palette.js';
import { DOT, TEX, TEXMAP, px } from './scene/textures.js';
import { t, fmt, LINGUE, linguaAttiva, scegliLingua } from './i18n/index.js';

/*
   Tutto il corpo sta dentro avvia(), e avvia() la chiama main.js dopo aver
   unito i testi ai dati.

   Non è cerimonia: la prima versione si affidava a un import dinamico per
   ottenere lo stesso ordine, e il bundler lo appiattiva — la fascia delle
   epoche usciva con otto «undefined» perché veniva costruita prima che le
   didascalie esistessero. Una funzione chiamata a mano non si può
   appiattire.
*/
export function avvia(){



/* =====================================================================
   POMPEI — CITTÀ STRATIFICATA  ·  v2
   1 unità = 4 m. Modello schematico su pianta reale. Non è un rilievo.
   ===================================================================== */

/* --------------------------------------------------------------- setup */

const app = document.getElementById('app');
const renderer = new WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
// Il tone mapping mancava: senza, le alte luci si tagliano di netto e il
// bianco dei calcari va in saturazione. Neutral (PBR Neutral di Khronos)
// arrotonda le luci senza spostare la tinta — su un modello documentario
// conta più della resa cinematografica di ACES, che vira all'arancio.
renderer.toneMapping = NeutralToneMapping;
renderer.toneMappingExposure = 1.20;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.localClippingEnabled = true;
app.appendChild(renderer.domElement);

// anisotropia al massimo che la scheda regge: le strade viste di scorcio
// erano una poltiglia con il valore fisso a 4
const MAXANISO = renderer.capabilities.getMaxAnisotropy();
for(const tx of Object.values(TEX)){ tx.anisotropy = MAXANISO; tx.needsUpdate = true; }
DOT.anisotropy = MAXANISO;

POST.init(renderer);
ERCOLANO.textures(TEX);

const scene = new Scene();
scene.fog = new Fog(PAL.fog, 240, 860);

const camera = new PerspectiveCamera(64, innerWidth/innerHeight, 0.12, 1600);

const hemi = new HemisphereLight(0xdae0d8, 0x60584b, 0.86);
scene.add(hemi);
const sun = new DirectionalLight(0xfff0d8, 1.85);
sun.position.set(-180, 168, 140);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
sun.shadow.camera.top = 46;   sun.shadow.camera.bottom = -46;
sun.shadow.camera.near = 1;   sun.shadow.camera.far = 640;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.028;
scene.add(sun, sun.target);
const rim = new DirectionalLight(0x9db4c0, 0.42);
rim.position.set(150, 50, -160);
scene.add(rim);


/* ------------------------------------------------- sole e ora del giorno */
// Posizione solare calcolata per Pompei. Declinazione ed equazione del tempo
// dalle formule NOAA (gml.noaa.gov/grad/solcalc/solareqns.PDF); l'azimut dalla
// relazione sferica standard. Parametri orbitali di oggi, non del 79 d.C.
const POMPEI_LAT = 40.7497, POMPEI_LON = 14.4869;

// Si entra alle 9:30, non all'ora di chi apre. Il sole vero resta a un clic
// di distanza («Adesso»), ma non decide più la prima impressione: chi apriva
// alle otto di sera si trovava in una strada nera, con i volumi illeggibili.
// A quest'ora il sole è basso abbastanza da staccare i muri con le ombre.
const ORA_INGRESSO = 9.5;
let timeMode = 'manual';
let manualHour = ORA_INGRESSO;
let sunEl = 0.6, sunAz = Math.PI;

function romeNow(){
  const f = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Rome',
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false });
  const p = {};
  for(const part of f.formatToParts(new Date())) p[part.type] = part.value;
  return { y:+p.year, m:+p.month, d:+p.day, hh:+p.hour, mm:+p.minute };
}
function romeOffset(){
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone:'Europe/Rome', timeZoneName:'longOffset' });
    const v = f.formatToParts(new Date()).find(x => x.type === 'timeZoneName').value;
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(v);
    if(!m) return 1;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3])/60);
  } catch(e){ return 1; }
}
function dayOfYear(y, m, d){
  const a = [0,31,59,90,120,151,181,212,243,273,304,334];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return a[m-1] + d + ((leap && m > 2) ? 1 : 0);
}
function solarPosition(doy, hourLocal, leap){
  const N = leap ? 366 : 365;
  const g = 2*Math.PI/N * (doy - 1 + (hourLocal - 12)/24);
  const eqtime = 229.18*(0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g)
               - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));
  const decl = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g)
             - 0.006758*Math.cos(2*g) + 0.000907*Math.sin(2*g)
             - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
  const timeOffset = eqtime + 4*POMPEI_LON - 60*romeOffset();
  const tst = hourLocal*60 + timeOffset;
  const ha = ((tst/4) - 180) * Math.PI/180;
  const lat = POMPEI_LAT * Math.PI/180;
  const cosZ = Math.min(1, Math.max(-1,
    Math.sin(lat)*Math.sin(decl) + Math.cos(lat)*Math.cos(decl)*Math.cos(ha)));
  const zen = Math.acos(cosZ);
  const sinZ = Math.sin(zen) || 1e-6;
  let cosA = (Math.sin(decl) - Math.sin(lat)*cosZ) / (Math.cos(lat)*sinZ);
  cosA = Math.min(1, Math.max(-1, cosA));
  let az = Math.acos(cosA);
  if(ha > 0) az = 2*Math.PI - az;
  return { el: Math.PI/2 - zen, az: az };
}

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 4; skyCanvas.height = 512;
const skyTex = new CanvasTexture(skyCanvas);
skyTex.colorSpace = SRGBColorSpace;
function mix3(a, b, t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgbStr(c){ return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
function paintSky(el){
  // Il cielo diurno era un grigio-verde molto smorzato: leggibile, ma
  // piatto. Uno zenit azzurro vero, con l'orizzonte tenuto caldo e chiaro,
  // dà profondità all'aria senza spostare la lettura dei volumi.
  const NH = [10,15,24],  NL = [24,30,40];
  const DH = [48,68,104], DL = [216,141,86];
  const YH = [78,118,163],YL = [214,210,195];
  const deg = el * 180/Math.PI;
  let hi, lo;
  if(deg <= -6)      { hi = NH; lo = NL; }
  else if(deg <= 2)  { const t = (deg+6)/8;  hi = mix3(NH,DH,t); lo = mix3(NL,DL,t); }
  else if(deg <= 16) { const t = (deg-2)/14; hi = mix3(DH,YH,t); lo = mix3(DL,YL,t); }
  else               { hi = YH; lo = YL; }
  const g = skyCanvas.getContext('2d');
  const grd = g.createLinearGradient(0,0,0,512);
  grd.addColorStop(0.00, rgbStr(hi));
  grd.addColorStop(0.30, rgbStr(mix3(hi, lo, 0.22)));
  grd.addColorStop(0.62, rgbStr(mix3(hi, lo, 0.58)));
  grd.addColorStop(0.86, rgbStr(mix3(hi, lo, 0.92)));
  grd.addColorStop(1.00, rgbStr(lo));
  g.fillStyle = grd; g.fillRect(0,0,4,512);
  skyTex.needsUpdate = true;
  return { hi: hi, lo: lo, deg: deg };
}
function currentHour(){
  if(timeMode === 'manual') return manualHour;
  const n = romeNow();
  return n.hh + n.mm/60;
}
function updateSun(){
  const n = romeNow();
  const leap = (n.y % 4 === 0 && n.y % 100 !== 0) || n.y % 400 === 0;
  const h = currentHour();
  const sp = solarPosition(dayOfYear(n.y, n.m, n.d), h, leap);
  sunEl = sp.el; sunAz = sp.az;
  const sky = paintSky(sunEl);
  scene.background = skyTex;
  scene.fog.color.setStyle(rgbStr(mix3(sky.lo, sky.hi, 0.35)));
  const hh = Math.floor(h), mm = Math.round((h - hh)*60) % 60;
  const el = document.getElementById('clockTime');
  if(el){
    el.textContent = fmt().orologio(hh, mm);
    document.getElementById('clockNote').textContent =
      t(timeMode === 'live' ? 'ui.clock.nota.reale' : 'ui.clock.nota.scelta') +
      ' · ' + t('ui.clock.nota.sole', { gradi: fmt().n(Math.round(sky.deg)) });
  }
  applyLight();
}

/* -------------------------------------------------- piano di sezione */

// normale (0,0,-1): resta visibile ciò che ha z < constant
const NO_CLIP = 1e6;
const clipPlane = new Plane(new Vector3(0,0,-1), NO_CLIP);
let sectionOn = false, sectionZ = 4;
let shadowsOn = true, labelsOn = true;

/* --------------------------------------------------- geometria a blocchi */

const BOX = new BoxGeometry(1,1,1);
const CYL = new CylinderGeometry(0.5,0.5,1,8);
const HOUSES_ROOF = [];
const isTouch = matchMedia('(pointer: coarse)').matches;

const buckets = new Map();
function block(x,y,z,w,h,d,color,geo){
  const key = color + '|' + (geo === CYL ? 'c' : 'b');
  let b = buckets.get(key);
  if(!b){ b = { color, geo: geo || BOX, list:[] }; buckets.set(key, b); }
  b.list.push([x,y+h/2,z,w,h,d]);
}

/* --------------------------------------------------------- pianta città */

const WALLS = [
  [-148,10],[-143,-16],[-128,-42],[-108,-58],[-78,-70],[-44,-78],
  [-6,-80],[34,-72],[72,-58],[104,-44],[128,-26],[141,-6],
  [145,18],[137,44],[110,62],[76,76],[40,84],[0,86],
  [-40,82],[-78,72],[-110,56],[-134,36]
];

function inPoly(x,z,poly){
  let c = false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,zi]=poly[i],[xj,zj]=poly[j];
    if(((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/(zj-zi)+xi)) c=!c;
  }
  return c;
}

const STREETS = [
  { a:[-100,14],  b:[141,14],   w:3.2, n:'Via dell’Abbondanza', lab:[-10,14] },
  { a:[-100,-30], b:[126,-30],  w:2.8, n:'Via di Nola',         lab:[70,-30] },
  { a:[-35,-78],  b:[-35,80],   w:3.0, n:'Via Stabiana',        lab:[-35,-58] },
  { a:[72,14],    b:[74,78],    w:2.6, n:'Via di Nocera',       lab:[73,56] },
  { a:[-95,-72],  b:[-95,-30],  w:2.6, n:'Via di Mercurio',     lab:[-95,-58] },
  { a:[-146,4],   b:[-100,4],   w:2.6, n:'Via Marina',          lab:[-126,4] },
  { a:[-72,14],   b:[-72,56],   w:2.2, n:'Via dei Teatri' },
  { a:[-56,14],   b:[-56,48],   w:2.2, n:'Via del Tempio d’Iside' },
  { a:[-119,-56], b:[-98,-30],  w:2.6, n:'Via Consolare',       lab:[-110,-45] },
  { a:[-100,-52], b:[-35,-52],  w:2.2, n:'Vicolo di Mercurio' },
  { a:[-20,-52],  b:[-20,-30],  w:1.8, n:'Vicolo dei Balconi' },
  { a:[74,30],    b:[141,30],   w:2.6, n:'Viale dell’Anfiteatro' },
  { a:[14,-78],   b:[14,14],    w:2.0, n:'vicolo' },
  { a:[44,-72],   b:[44,14],    w:2.0, n:'vicolo' },
  { a:[-70,-52],  b:[-70,-30],  w:1.8, n:'vicolo' },
  { a:[36,14],    b:[36,72],    w:2.0, n:'vicolo' },
  { a:[105,-40],  b:[105,14],   w:2.0, n:'vicolo' },
  { a:[-100,38],  b:[-40,38],   w:2.2, n:'fronte meridionale' }
];

const RESERVED = [
  [-119,-14,24,44],[-131,16,26,20],[-148,26,20,16],[-107,42,30,14],
  [-88,38,20,18],[-80,40,28,26],[-74,54,26,14],[-64,36,16,14],
  [-55,-3,15,13],[-96,-24,18,14],[68,22,38,38],[105,20,38,34],
  [-190,-84,30,26]
];

function onStreet(x,z){
  for(const s of STREETS){
    const [ax,az]=s.a,[bx,bz]=s.b;
    const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz;
    let t = L2 ? ((x-ax)*dx + (z-az)*dz)/L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px=ax+t*dx, pz=az+t*dz;
    if((x-px)**2 + (z-pz)**2 < (s.w/2+1.1)**2) return true;
  }
  return false;
}
function reserved(x,z){
  for(const [rx,rz,rw,rd] of RESERVED)
    if(x>=rx-1 && x<=rx+rw+1 && z>=rz-1 && z<=rz+rd+1) return true;
  return false;
}
function buildable(x,z){ return inPoly(x,z,WALLS) && !onStreet(x,z) && !reserved(x,z); }

/* ------------------------------------------------------------- terreno */

const CX = -4, CZ = 3;
const TERRACE = WALLS.map(([x,z]) => [CX + (x-CX)*1.30, CZ + (z-CZ)*1.30]);

block(-20, -3.9, -110, 1400, 1.8, 1000, 0x6f6b60);

for(let x=-210; x<210; x+=4){
  for(let z=-125; z<128; z+=4){
    if(!inPoly(x,z,TERRACE)) continue;
    const v = ((x*7 + z*13) % 3);
    block(x, -2.4, z, 4.2, 2.4, 4.2, v===0 ? 0x8f8776 : (v===1 ? PAL.terrace : 0x847c6b));
  }
}

for(const s of STREETS){
  const [ax,az]=s.a,[bx,bz]=s.b;
  const dx=bx-ax, dz=bz-az, len = Math.hypot(dx,dz), steps = Math.ceil(len/2);
  for(let i=0;i<=steps;i++){
    const t=i/steps, x=ax+dx*t, z=az+dz*t;
    if(!inPoly(x,z,WALLS)) continue;
    block(x, 0, z, Math.abs(dx)>Math.abs(dz)?2.2:s.w, 0.12,
             Math.abs(dx)>Math.abs(dz)?s.w:2.2, PAL.street);
  }
}

/* --------------------------------------------------------- mura e porte */

const GATES = [
  [-146,8,'Porta Marina'],[-119,-56,'Porta Ercolano'],[-42,-78,'Porta Vesuvio'],
  [58,-63,'Porta di Nola'],[141,-4,'Porta di Sarno'],[75,77,'Porta di Nocera'],
  [-34,82,'Porta di Stabia']
];
function nearGate(x,z){ return GATES.some(g => (x-g[0])**2 + (z-g[1])**2 < 64); }

for(let i=0;i<WALLS.length;i++){
  const [ax,az]=WALLS[i], [bx,bz]=WALLS[(i+1)%WALLS.length];
  const len=Math.hypot(bx-ax,bz-az), steps=Math.ceil(len/2.2);
  for(let k=0;k<steps;k++){
    const t=k/steps, x=ax+(bx-ax)*t, z=az+(bz-az)*t;
    if(nearGate(x,z)) continue;
    block(x,0,z,2.6,2.2 + ((k*7)%3)*0.12,2.6, k%5===0 ? PAL.wall3 : PAL.wall2);
  }
}
for(let i=0;i<WALLS.length;i+=3){
  const [x,z]=WALLS[i];
  block(x,0,z,4,3.4,4,PAL.wall3);
}

/* ------------------------------------------------------------- insulae */

let rngState = 20250806;
function rnd(){ rngState = (rngState*1664525 + 1013904223) >>> 0; return rngState/4294967296; }

const taken = [];
function overlaps(x,z,w,d){
  for(const [ax,az,aw,ad] of taken)
    if(x < ax+aw+0.8 && x+w+0.8 > ax && z < az+ad+0.8 && z+d+0.8 > az) return true;
  return false;
}

const HOUSES = [];
for(const pass of [{step:4, min:8, span:5, skip:0.55}, {step:3, min:4, span:4, skip:0.22}]){
  for(let x=-148; x<144; x+=pass.step){
    for(let z=-80; z<84; z+=pass.step){
      if(rnd() < pass.skip) continue;
      const w = pass.min + Math.floor(rnd()*pass.span);
      const d = pass.min + Math.floor(rnd()*pass.span);
      if(overlaps(x,z,w,d)) continue;
      let ok = true;
      for(let i=0;i<=w && ok;i+=1.2) for(let j=0;j<=d && ok;j+=1.2)
        if(!buildable(x+i, z+j)) ok = false;
      if(!ok) continue;
      taken.push([x,z,w,d]);
      HOUSES.push([x,z,w,d, w>=8 || d>=8]);
    }
  }
}

for(const [x,z,w,d,grand] of HOUSES){
  const cx = x+w/2, cz = z+d/2;
  const tone = [PAL.wall1,PAL.wall2,PAL.wall3][Math.floor(rnd()*3)];
  const t = 1.0;
  const floors = grand ? 2 : (rnd() > 0.32 ? 2 : 1);
  for(let f=0; f<floors; f++){
    const y = f;
    block(cx, y, z+t/2,     w, 1, t, tone);
    block(cx, y, z+d-t/2,   w, 1, t, tone);
    block(x+t/2, y, cz,     t, 1, d-2*t, tone);
    block(x+w-t/2, y, cz,   t, 1, d-2*t, tone);
  }
  if(grand && w > 7) block(x+w*0.45, 0, cz, 0.7, 1, d-2*t, tone);

  // tetto a falda a gradoni sulla fascia perimetrale
  const r = rnd() > 0.45 ? PAL.roof : PAL.roof2;
  const y0 = floors;
  const steps = [
    [w+0.7, d+0.7, 0.00, 0.22],
    [w+0.1, d+0.1, 0.22, 0.20],
    [w-0.6, d-0.6, 0.42, 0.18]
  ];
  for(const [sw,sd,off,hh] of steps){
    const th = t + 1.0 - off*1.4;
    HOUSES_ROOF.push([cx, y0+off, z+t-0.1,   sw, hh, th, r]);
    HOUSES_ROOF.push([cx, y0+off, z+d-t+0.1, sw, hh, th, r]);
    HOUSES_ROOF.push([x+t-0.1, y0+off, cz,   th, hh, sd-2*t, r]);
    HOUSES_ROOF.push([x+w-t+0.1, y0+off, cz, th, hh, sd-2*t, r]);
  }
}

/* --------------------------------------------------------- monumenti */

function colonnade(x,z,w,d,step,h,color){
  for(let i=0;i<=Math.round(w/step);i++){
    block(x+i*step, 0, z, 0.7, h, 0.7, color, CYL);
    block(x+i*step, 0, z+d, 0.7, h, 0.7, color, CYL);
  }
  for(let j=1;j<Math.round(d/step);j++){
    block(x, 0, z+j*step, 0.7, h, 0.7, color, CYL);
    block(x+w, 0, z+j*step, 0.7, h, 0.7, color, CYL);
  }
}
function temple(x,z,w,d,h,color){
  block(x,0,z,w,0.8,d,PAL.stone);
  for(let i=0;i<=Math.round(w/2.2);i++){
    block(x-w/2+0.9+i*2.2, 0.8, z-d/2+0.9, 0.8, h, 0.8, color, CYL);
    block(x-w/2+0.9+i*2.2, 0.8, z+d/2-0.9, 0.8, h, 0.8, color, CYL);
  }
  block(x, 0.8+h, z, w+0.6, 0.7, d+0.6, PAL.stone);
  block(x, 1.5+h, z, w-1.4, 0.6, d-1.4, PAL.civic);
  block(x, 2.1+h, z, w-3.0, 0.5, d-3.0, PAL.civic);
}

block(-108, 0.02, 0, 12, 0.1, 40, PAL.stone);
colonnade(-114, -20, 12, 40, 2.4, 2.6, PAL.column);
temple(-108, -24, 11, 13, 3.2, PAL.column);
temple(-122, -2, 9, 11, 2.8, PAL.column);
block(-98, 0, 10, 8, 2.2, 10, PAL.civic);
block(-98, 0, -14, 9, 2.4, 9, PAL.civic);

block(-124, 0, 24, 11, 0.5, 22, PAL.stone);
block(-124, 0.5, 24, 11, 2.6, 22, PAL.civic);
for(let i=0;i<6;i++){
  block(-127, 0.5, 16+i*3.4, 0.8, 3.2, 0.8, PAL.column, CYL);
  block(-121, 0.5, 16+i*3.4, 0.8, 3.2, 0.8, PAL.column, CYL);
}

temple(-132, 30, 10, 12, 2.6, PAL.column);
block(-138, 0, 42, 14, 2.0, 8, PAL.civic);
block(-124, 0, 42, 10, 2.0, 8, PAL.civic);
block(-146, 0, 32, 12, 2.2, 12, PAL.civic);
colonnade(-152, 26, 12, 12, 3, 2.4, PAL.column);

for(let i=0;i<5;i++){
  block(-104+i*7, 0, 48, 6, 1, 12, PAL.wall1);
  block(-104+i*7, 1, 48, 6, 1, 12, PAL.wall2);
  HOUSES_ROOF.push([-104+i*7, 2, 48, 6.6, 0.45, 12.6, PAL.roof]);
}

block(-84, 0.02, 46, 18, 0.1, 16, PAL.stone);
colonnade(-93, 38, 18, 16, 3, 2.4, PAL.column);
temple(-84, 46, 8, 10, 2.4, PAL.column);

for(let r=0;r<7;r++){
  const rad = 4 + r*1.9, h = 0.5 + r*0.45;
  for(let a=0;a<=Math.PI;a+=0.13)
    block(-66 + Math.cos(a)*rad, 0, 50 + Math.sin(a)*rad, 2, h, 2, r%2 ? PAL.stone : PAL.civic);
}
block(-66, 0, 44, 20, 2.8, 3, PAL.civic);

for(let r=0;r<4;r++){
  const rad = 2.6 + r*1.6, h = 0.5 + r*0.4;
  for(let a=0;a<=Math.PI;a+=0.2)
    block(-50 + Math.cos(a)*rad, 0, 52 + Math.sin(a)*rad, 1.8, h, 1.8, PAL.stone);
}

block(-70, 0.02, 54, 18, 0.1, 14, PAL.stone);
colonnade(-79, 54, 18, 14, 2.6, 2.4, PAL.column);
temple(-58, 42, 7, 8, 2.2, PAL.column);

block(-48, 0, 3, 14, 2.6, 12, PAL.civic);
block(-48, 2.6, 3, 12, 0.9, 10, PAL.stone);
block(-90, 0, -18, 12, 2.4, 10, PAL.civic);
block(-90, 2.4, -18, 10, 0.8, 8, PAL.stone);

// Palestra Grande: 140 x 140 m = 35 x 35 unità; piscina 23 x 35 m ≈ 6 x 9
colonnade(70, 24, 35, 34, 3.4, 2.4, PAL.column);
block(87.5, 0.05, 41, 9, 0.1, 6, 0x6d8286);

for(let r=0;r<8;r++){
  const rx = 6 + r*1.9, rz = 4.6 + r*1.55, h = 0.6 + r*0.5;
  for(let a=0;a<Math.PI*2;a+=0.08)
    block(121 + Math.cos(a)*rx, 0, 34 + Math.sin(a)*rz, 2.2, h, 2.2, r%2 ? PAL.stone : PAL.civic);
}
block(124, 0.02, 36, 12, 0.08, 9, 0x8f8674);

block(-178, 0, -72, 16, 1, 14, PAL.wall1);
block(-178, 1, -72, 16, 1, 14, PAL.wall3);
HOUSES_ROOF.push([-178, 2, -72, 17, 0.5, 15, PAL.roof]);
colonnade(-186, -79, 16, 14, 3.5, 2.2, PAL.column);

for(let i=0;i<9;i++){
  const t = i/8;
  block(-124-t*22, 0, -60-t*14, 2.2, 1.4+((i*3)%3)*0.4, 2.2, PAL.stone);
}

{
  const VX = -66, VZ = -252, R = 128, H = 104, STEP = 8;
  for(let x=-R; x<=R; x+=STEP){
    for(let z=-R; z<=R; z+=STEP){
      const dr = Math.hypot(x,z);
      if(dr > R) continue;
      let h = H * Math.pow(1 - dr/R, 1.35);
      if(dr < 20) h -= (20-dr)*1.1;
      h = Math.max(1.5, h);
      const shade = dr > R*0.8 ? 0x6d6a64 : (dr > R*0.42 ? PAL.mountain : 0x555350);
      block(VX+x, -3, VZ+z, STEP+0.6, h+3, STEP+0.6, shade);
    }
  }
}

/* ------------------------------------------------------ dettagli urbani */

const MAIN = STREETS.slice(0, 6);

// marciapiedi rialzati lungo gli assi principali
for(const s of MAIN){
  const [ax,az]=s.a,[bx,bz]=s.b;
  const dx=bx-ax, dz=bz-az, len=Math.hypot(dx,dz), n=Math.ceil(len/2);
  const ux=dx/len, uz=dz/len, nx=-uz, nz=ux;
  const off = s.w/2 + 0.6;
  const horiz = Math.abs(ux) > Math.abs(uz);
  for(let i=0;i<=n;i++){
    const t=i/n, x=ax+dx*t, z=az+dz*t;
    if(!inPoly(x,z,WALLS)) continue;
    for(const sg of [1,-1])
      block(x+nx*off*sg, 0, z+nz*off*sg, horiz?2.1:1.2, 0.3, horiz?1.2:2.1, PAL.kerb);
  }
}

// incroci fra gli assi principali
function crossPoint(s1, s2){
  const [x1,z1]=s1.a, [x2,z2]=s1.b, [x3,z3]=s2.a, [x4,z4]=s2.b;
  const den = (x1-x2)*(z3-z4) - (z1-z2)*(x3-x4);
  if(Math.abs(den) < 1e-6) return null;
  const t = ((x1-x3)*(z3-z4) - (z1-z3)*(x3-x4)) / den;
  const u = -((x1-x2)*(z1-z3) - (z1-z2)*(x1-x3)) / den;
  if(t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [x1 + t*(x2-x1), z1 + t*(z2-z1)];
}
const CROSSINGS = [];
for(let i=0;i<MAIN.length;i++) for(let j=i+1;j<MAIN.length;j++){
  const c = crossPoint(MAIN[i], MAIN[j]);
  if(c && inPoly(c[0], c[1], WALLS)) CROSSINGS.push(c);
}

// pietre di attraversamento e fontane pubbliche
CROSSINGS.forEach(([cx,cz], i) => {
  for(const [ox,oz] of [[2.6,0],[-2.6,0],[0,2.6],[0,-2.6]]){
    for(let k=-1;k<=1;k++){
      const px = cx + ox + (ox === 0 ? k*1.3 : 0);
      const pz = cz + oz + (oz === 0 ? k*1.3 : 0);
      block(px, 0.12, pz, 1.05, 0.34, 1.05, PAL.stone);
    }
  }
  if(i % 2 === 0){                       // fontana pubblica all'angolo
    const fx = cx + 3.4, fz = cz + 3.4;
    block(fx, 0, fz, 2.0, 0.62, 1.5, PAL.stone);
    block(fx, 0.62, fz, 1.5, 0.14, 1.05, 0x5d7278);
    block(fx, 0, fz-0.9, 0.6, 1.5, 0.6, PAL.civic);
  }
});

// porte sulla strada e alberi nei peristili
function distToStreet(x,z){
  let best = 1e9;
  for(const s of STREETS){
    const [ax,az]=s.a,[bx,bz]=s.b, dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz;
    let t = L2 ? ((x-ax)*dx + (z-az)*dz)/L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x-(ax+t*dx), z-(az+t*dz));
    if(d < best) best = d;
  }
  return best;
}
for(const [x,z,w,d,grand] of HOUSES){
  const cx = x+w/2, cz = z+d/2;
  const sides = [
    { p:[cx, z+0.1],     s:[1.0,0.22] },
    { p:[cx, z+d-0.1],   s:[1.0,0.22] },
    { p:[x+0.1, cz],     s:[0.22,1.0] },
    { p:[x+w-0.1, cz],   s:[0.22,1.0] }
  ];
  let bi = 0, bd = 1e9;
  sides.forEach((sd,k) => { const dd = distToStreet(sd.p[0], sd.p[1]); if(dd < bd){ bd = dd; bi = k; } });
  if(bd < 6){
    const sd = sides[bi];
    block(sd.p[0], 0, sd.p[1], sd.s[0]*1.35, 0.88, sd.s[1]*1.35, 0x3a342c);
    block(sd.p[0], 0.88, sd.p[1], sd.s[0]*1.6, 0.16, sd.s[1]*1.6, PAL.stone);
  }
  if(grand && rnd() > 0.45){             // cipresso nel peristilio
    const tx = cx + (rnd()-0.5)*1.6, tz = cz + (rnd()-0.5)*1.6;
    block(tx, 0, tz, 0.34, 0.6, 0.34, 0x5a4a37);
    for(let k=0;k<4;k++)
      block(tx, 0.6 + k*0.55, tz, 1.5 - k*0.3, 0.58, 1.5 - k*0.3, k<2 ? 0x54633f : 0x5f6e48);
  }
}

// capitelli sui colonnati principali
for(const b of [...buckets.values()]){
  if(b.geo !== CYL) continue;
  const caps = b.list.map(c => [c[0], c[1] + c[4]/2 + 0.09, c[2], c[3]*1.55, 0.18, c[5]*1.55]);
  const key = PAL.stone + '|cap';
  if(!buckets.has(key)) buckets.set(key, { color:PAL.stone, geo:BOX, list:[] });
  buckets.get(key).list.push(...caps);
}

/* -------------------------------------------------- costruzione meshes */

const cityGroup = new Group();
scene.add(cityGroup);

const dummy = new Object3D();
const allMaterials = [];
const tintColor = new Color();
function bake(list, color, geo, parent, shadows, vary){
  const texName = TEXMAP.get(color);
  const mat = new MeshLambertMaterial({ color, clippingPlanes:[clipPlane], clipShadows:true });
  if(texName && TEX[texName]) mat.map = TEX[texName];
  allMaterials.push(mat);
  const mesh = new InstancedMesh(geo, mat, list.length);
  list.forEach((b,i) => {
    dummy.position.set(b[0], b[1], b[2]);
    dummy.scale.set(b[3], b[4], b[5]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if(vary !== false){
      const n = Math.abs(Math.sin(b[0]*12.9898 + b[2]*78.233) * 43758.5453) % 1;
      const v = 0.86 + n * 0.24;
      tintColor.setRGB(v, v, v);
      mesh.setColorAt(i, tintColor);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  if(shadows !== false){ mesh.castShadow = true; mesh.receiveShadow = true; }
  parent.add(mesh);
  return mesh;
}
const shadowCasters = [];
function bakeTracked(list, color, geo, parent, shadows){
  const m = bake(list, color, geo, parent, shadows);
  if(shadows !== false) shadowCasters.push(m);
  return m;
}

for(const b of buckets.values()) bakeTracked(b.list, b.color, b.geo, cityGroup);

const roofsA = new Group(), roofsB = new Group();
scene.add(roofsA, roofsB);
{
  const a = [], b = [];
  HOUSES_ROOF.forEach((r,i) => ((i%5<3) ? a : b).push(r));
  const byColor = arr => {
    const m = new Map();
    arr.forEach(r => { const k=r[6]; if(!m.has(k)) m.set(k,[]); m.get(k).push(r); });
    return m;
  };
  for(const [col,list] of byColor(a)) bakeTracked(list, col, BOX, roofsA);
  for(const [col,list] of byColor(b)) bakeTracked(list, col, BOX, roofsB);
}

/* ------------------------------ deposito, a strati veri per la sezione */

const depositGroup = new Group(); scene.add(depositGroup);
{
  const base = [], white = [], grey = [], surge = [];
  for(let x=-212; x<212; x+=4){
    for(let z=-127; z<130; z+=4){
      if(!inPoly(x,z,TERRACE)) continue;
      base .push([x, -1.325, z, 4.2, 0.15, 4.2]);  // piano di calpestio del 79
      white.push([x, -1.05, z, 4.2, 0.40, 4.2]);   // lapilli bianchi
      grey .push([x, -0.65, z, 4.2, 0.40, 4.2]);   // lapilli grigi
      surge.push([x, -0.225, z, 4.2, 0.45, 4.2]);  // correnti piroclastiche
    }
  }
  bakeTracked(base,  0x4c4639,     BOX, depositGroup, false);
  bakeTracked(white, PAL.depWhite, BOX, depositGroup);
  bakeTracked(grey,  PAL.depGrey,  BOX, depositGroup, false);
  bakeTracked(surge, PAL.depSurge, BOX, depositGroup);
}
depositGroup.visible = false;

const shantyGroup = new Group(); scene.add(shantyGroup);
{
  const list = [];
  const spots = [[-104,44],[-97,46],[-90,44],[-83,47],[-124,42],[-136,42],[-70,54],[-118,30],[-110,46]];
  spots.forEach(([sx,sz],i) => {
    for(let k=0;k<4;k++){
      const ox = ((i*7+k*3)%5) - 2, oz = ((i*3+k*5)%5) - 2;
      list.push([sx+ox, 0.45, sz+oz, 2.4, 0.9, 2.4]);
    }
    list.push([sx, 1.02, sz, 4.4, 0.28, 4.4]);
  });
  bakeTracked(list, PAL.crude, BOX, shantyGroup);
}
shantyGroup.visible = false;

const vegGroup = new Group(); scene.add(vegGroup);
{
  const list = [];
  let s = 7717;
  const r2 = () => { s = (s*1103515245 + 12345) >>> 0; return s/4294967296; };
  for(let p=0; p<46; p++){
    const px = -190 + r2()*370, pz = -110 + r2()*220;
    if(!inPoly(px,pz,TERRACE)) continue;
    const rows = 3 + Math.floor(r2()*4), cols = 4 + Math.floor(r2()*6);
    const ang = r2()*0.6 - 0.3;
    for(let i=0;i<rows;i++) for(let j=0;j<cols;j++){
      const lx = j*4.4, lz = i*3.2;
      const x = px + lx*Math.cos(ang) - lz*Math.sin(ang);
      const z = pz + lx*Math.sin(ang) + lz*Math.cos(ang);
      if(!inPoly(x,z,TERRACE)) continue;
      list.push([x, 0.28, z, 2.2 + r2()*1.4, 0.56, 2.2 + r2()*1.4]);
    }
  }
  bakeTracked(list, PAL.veg, BOX, vegGroup);
}
vegGroup.visible = false;

const canalGroup = new Group(); scene.add(canalGroup);
{
  const list = [];
  for(let i=0;i<58;i++){
    const t = i/57;
    list.push([-146 + t*250, -0.28, 46 - Math.sin(t*2.4)*22 + t*4, 5.4, 0.62, 5.4]);
  }
  bakeTracked(list, PAL.canal, BOX, canalGroup, false);
}
canalGroup.visible = false;

const spoilGroup = new Group(); scene.add(spoilGroup);
{
  const list = [];
  [[110,52],[-128,-52],[98,6],[-96,58]].forEach(([hx,hz]) => {
    for(let r=0;r<4;r++){
      const rad = 7 - r*1.7, h = 0.4 + r*0.4;
      for(let a=0;a<Math.PI*2;a+=0.5)
        list.push([hx+Math.cos(a)*rad, h/2, hz+Math.sin(a)*rad, 2.4, h, 2.4]);
    }
  });
  bakeTracked(list, PAL.spoil, BOX, spoilGroup);
}
spoilGroup.visible = false;

/* ------------------------------------------------------- cenere in caduta */

const ashGroup = new Group(); scene.add(ashGroup);
const ashCount = 2600;
const ashPos = new Float32Array(ashCount*3);
const ashSpeed = new Float32Array(ashCount);
for(let i=0;i<ashCount;i++){
  ashPos[i*3]   = -200 + Math.random()*400;
  ashPos[i*3+1] = Math.random()*90;
  ashPos[i*3+2] = -140 + Math.random()*300;
  ashSpeed[i]   = 3 + Math.random()*7;
}
{
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(ashPos, 3));
  const m = new PointsMaterial({ color:0xcfc9bb, size:0.30, sizeAttenuation:true,
                                 map: DOT, alphaTest: 0.04,
                                 transparent:true, opacity:0.55, depthWrite:false });
  ashGroup.add(new Points(g, m));
}
ashGroup.visible = false;


/* ------------------------------------------------------------ particelle */
function makePoints(count, size, color, opacity){
  const g = new BufferGeometry();
  const pos = new Float32Array(count*3);
  g.setAttribute('position', new BufferAttribute(pos, 3));
  const m = new PointsMaterial({ color: color, size: size, sizeAttenuation:true,
                                 map: DOT, alphaTest: 0.04,
                                 transparent:true, opacity: opacity, depthWrite:false });
  const p = new Points(g, m);
  p.frustumCulled = false;
  return { points:p, pos:pos, count:count, live:count };
}

// pulviscolo: segue la telecamera e dà spessore all'aria
const dust = makePoints(1400, 0.10, 0xd9d3c4, 0.30);
scene.add(dust.points);
const dustSpeed = new Float32Array(dust.count);
for(let i=0;i<dust.count;i++){
  dust.pos[i*3]   = (Math.random()-0.5)*70;
  dust.pos[i*3+1] = Math.random()*14;
  dust.pos[i*3+2] = (Math.random()-0.5)*70;
  dustSpeed[i]    = 0.15 + Math.random()*0.5;
}

// fumo dai forni della rioccupazione
const SMOKE_SPOTS = [[-104,44],[-95,48],[-83,47],[-124,42],[-70,54]];
const smoke = makePoints(600, 0.55, 0x8d8a80, 0.28);
scene.add(smoke.points);
const smokeAge = new Float32Array(smoke.count);
const smokeSpot = new Uint8Array(smoke.count);
for(let i=0;i<smoke.count;i++){
  smokeSpot[i] = i % SMOKE_SPOTS.length;
  smokeAge[i] = Math.random();
}
smoke.points.visible = false;

// uccelli: pochi, ma tolgono l'immobilità
const birds = new Group(); scene.add(birds);
{
  const bg = new ConeGeometry(0.5, 1.5, 3);
  const bm = new MeshBasicMaterial({ color:0x3d4440 });
  for(let i=0;i<12;i++){
    const b = new Mesh(bg, bm);
    b.userData = { r:26 + Math.random()*70, a:Math.random()*7,
                   sp:0.13 + Math.random()*0.2, y:16 + Math.random()*22,
                   cx:(Math.random()-0.5)*180, cz:(Math.random()-0.5)*120 };
    b.rotation.z = Math.PI/2;
    birds.add(b);
  }
}

function setParticleDensity(k){
  dust.live  = Math.floor(dust.count * k);
  smoke.live = Math.floor(smoke.count * k);
  birds.children.forEach((b,i) => { b.userData.hidden = i >= Math.ceil(12*k); });
  dust.points.geometry.setDrawRange(0, dust.live);
  smoke.points.geometry.setDrawRange(0, smoke.live);
}

function stepParticles(dt, t){
  if(dust.live > 0){
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for(let i=0;i<dust.live;i++){
      dust.pos[i*3+1] += dustSpeed[i]*dt;
      dust.pos[i*3]   += Math.sin(t*0.3 + i)*dt*0.28;
      const dx = dust.pos[i*3] - cx, dy = dust.pos[i*3+1] - cy, dz = dust.pos[i*3+2] - cz;
      const d2 = dx*dx + dz*dz;
      if(dy > 16 || d2 > 1600 || d2 < 16){
        const a = Math.random()*Math.PI*2, rr = 6 + Math.random()*32;
        dust.pos[i*3]   = cx + Math.cos(a)*rr;
        dust.pos[i*3+1] = cy - 3 + Math.random()*5;
        dust.pos[i*3+2] = cz + Math.sin(a)*rr;
      }
    }
    dust.points.geometry.attributes.position.needsUpdate = true;
  }
  if(smoke.points.visible && smoke.live > 0){
    for(let i=0;i<smoke.live;i++){
      smokeAge[i] += dt*0.22;
      if(smokeAge[i] > 1) smokeAge[i] -= 1;
      const sp = SMOKE_SPOTS[smokeSpot[i]];
      const a = smokeAge[i];
      smoke.pos[i*3]   = sp[0] + Math.sin(a*7 + i)*a*3.2;
      smoke.pos[i*3+1] = depositCurrent + 1.1 + a*9;
      smoke.pos[i*3+2] = sp[1] + Math.cos(a*5 + i)*a*3.2;
    }
    smoke.points.geometry.attributes.position.needsUpdate = true;
  }
  if(birds.visible){
    birds.children.forEach(b => {
      const u = b.userData;
      if(u.hidden){ b.visible = false; return; }
      b.visible = true;
      u.a += dt*u.sp;
      b.position.set(u.cx + Math.cos(u.a)*u.r, u.y + Math.sin(u.a*2.1)*1.6,
                     u.cz + Math.sin(u.a)*u.r);
      b.rotation.y = -u.a;
    });
  }
}

/* ---------------------------------------------------- griglia di collisione */

const GX0 = -215, GZ0 = -130, GW = 440, GD = 275;
const solid = new Uint8Array(GW*GD);
function markRect(x,z,w,d){
  for(let i=Math.floor(x-GX0); i<Math.ceil(x-GX0+w); i++)
    for(let j=Math.floor(z-GZ0); j<Math.ceil(z-GZ0+d); j++)
      if(i>=0 && i<GW && j>=0 && j<GD) solid[j*GW+i] = 1;
}
for(const [x,z,w,d] of HOUSES) markRect(x,z,w,d);
// monumenti solidi (escluse le piazze percorribili: Foro, Foro Triangolare, Palestra)
[[-131,16,26,20],[-148,26,20,16],[-107,42,30,14],[-80,40,28,26],
 [-74,54,26,14],[-64,36,16,14],[-55,-3,15,13],[-96,-24,18,14],
 [105,20,38,34],[-190,-84,30,26],[-119,-30,24,20]].forEach(r => markRect(...r));
// circuito murario
for(let i=0;i<WALLS.length;i++){
  const [ax,az]=WALLS[i], [bx,bz]=WALLS[(i+1)%WALLS.length];
  const len=Math.hypot(bx-ax,bz-az), steps=Math.ceil(len);
  for(let k=0;k<steps;k++){
    const t=k/steps, x=ax+(bx-ax)*t, z=az+(bz-az)*t;
    if(nearGate(x,z)) continue;
    markRect(x-1.4, z-1.4, 2.8, 2.8);
  }
}
function isSolid(x,z){
  const i = Math.floor(x-GX0), j = Math.floor(z-GZ0);
  if(i<0 || i>=GW || j<0 || j>=GD) return false;
  return solid[j*GW+i] === 1;
}

/* -------------------------------------------------------------- etichette */

function makeLabel(text, color, weight, px, mul){
  const pad = 10, fs = px || 46, M = mul || 1;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${weight||600} ${fs}px "IBM Plex Sans", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2;
  c.width = w; c.height = fs + pad*2;
  const g = c.getContext('2d');
  g.font = `${weight||600} ${fs}px "IBM Plex Sans", sans-serif`;
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(14,18,16,.62)';
  g.fillRect(0,0,c.width,c.height);
  g.fillStyle = color;
  g.fillText(text, pad, c.height/2);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const sp = new Sprite(new SpriteMaterial({ map:tex, transparent:true, depthTest:true, opacity:0 }));
  sp.userData.aspect = c.width / c.height;      // proporzione reale della texture
  sp.userData.h = 2.1 * M;                      // altezza base, a distanza 70
  sp.scale.set(sp.userData.h * sp.userData.aspect, sp.userData.h, 1);
  return sp;
}

// quando ciascun tipo di etichetta è leggibile
const LABEL_RULE = {
  gate:   { near:5,  far:150, mul:0.62, minY:0,  maxY:120 },
  street: { near:5,  far:110, mul:0.55, minY:0,  maxY:70  },
  regio:  { near:40, far:520, mul:1.35, minY:38, maxY:400 },
  peak:   { near:20, far:900, mul:1.6,  minY:0,  maxY:400 }
};

const labelGroup = new Group(); scene.add(labelGroup);
const labels = [];
function addLabel(text, x, y, z, color, kind){
  const r = LABEL_RULE[kind];
  const sp = makeLabel(text, color, kind === 'regio' ? 700 : 600, 46, r.mul);
  sp.position.set(x, y, z);
  sp.userData.kind = kind;
  labelGroup.add(sp);
  labels.push(sp);
}
GATES.forEach(([x,z,name]) => addLabel(name, x, 5.2, z, '#cfe6dc', 'gate'));
STREETS.forEach(s => { if(s.lab) addLabel(s.n, s.lab[0], 3.4, s.lab[1], '#e3e8e2', 'street'); });
[['REGIO I',18,40],['REGIO II',100,30],['REGIO III',90,-25],['REGIO IV',-10,-66],
 ['REGIO V',-30,-48],['REGIO VI',-95,-48],['REGIO VII',-75,-6],['REGIO VIII',-90,40],
 ['REGIO IX',-8,-12]].forEach(([n,x,z]) => addLabel(n, x, 8.5, z, '#7fb8a3', 'regio'));
addLabel(t('scena.vesuvio'), -66, 70, -252, '#d8dcd6', 'peak');
labelGroup.visible = true;

/* ------------------------------------------------------------ hotspot */

const markerGeo = new ConeGeometry(1.2, 2.6, 4);
const beamGeo = new CylinderGeometry(0.16, 0.16, 30, 6);
const hotspots = [];
const byId = {};

PLACES.forEach(p => {
  const g = new Group();
  g.position.set(p.x, 0, p.z);
  const cone = new Mesh(markerGeo, new MeshBasicMaterial({ color:PAL.accent }));
  cone.position.y = p.y + 3.2;
  cone.rotation.y = Math.PI/4;
  g.add(cone);
  const beam = new Mesh(beamGeo, new MeshBasicMaterial({
    color:PAL.accent, transparent:true, opacity:0.16, depthWrite:false }));
  beam.position.y = p.y + 15;
  g.add(beam);
  scene.add(g);
  const h = { data:p, group:g, cone, beam, base:p.y+3.2 };
  hotspots.push(h);
  byId[p.id] = h;
});

/* -------------------------------------------------------------- stato */

let epoch = 0;
let depositTarget = 0, depositCurrent = 0;

/* ------------------------------------------- il riquadro dell'ombra ----
   Prima il riquadro era fisso a ±190 unità, cioè 1520 m di lato, con una
   mappa da 2048: un texel ogni 74 cm. Ecco perché le ombre erano molli.
   Ora il riquadro si stringe a ±30 quando cammini a terra — con la mappa
   da 4096 fa un texel ogni 1,5 cm — e si allarga salendo, perché dall'alto
   serve copertura più che nitidezza.
   L'aggancio al reticolo dei texel avviene nello spazio della luce: senza,
   l'ombra sfarfalla a ogni passo perché il riquadro scivola sotto di essa. */
const shDir = new Vector3(), shRot = new Matrix4(), shInv = new Matrix4();
const shCtr = new Vector3(), shAhead = new Vector3();
const SH_ORIG = new Vector3(0,0,0), SH_UP = new Vector3(0,1,0);
let shHalf = 46;
function updateShadowBox(){
  const ce = Math.cos(sunEl);
  shDir.set(ce * Math.sin(sunAz), Math.max(0.14, Math.sin(sunEl)), -ce * Math.cos(sunAz)).normalize();

  const camY = Math.max(0, camWorld.y);
  const want = Math.min(230, Math.max(30, 30 + camY * 2.1));
  shHalf += (want - shHalf) * 0.10;          // niente scatti quando sali o scendi

  camera.getWorldDirection(shAhead);
  const ahead = Math.min(shHalf * 0.42, 46);
  shCtr.set(camWorld.x + shAhead.x * ahead, 0, camWorld.z + shAhead.z * ahead);

  shRot.lookAt(shDir, SH_ORIG, SH_UP);
  shInv.copy(shRot).invert();
  shCtr.applyMatrix4(shInv);
  const texel = (shHalf * 2) / sun.shadow.mapSize.x;
  shCtr.x = Math.round(shCtr.x / texel) * texel;
  shCtr.y = Math.round(shCtr.y / texel) * texel;
  shCtr.applyMatrix4(shRot);

  sun.target.position.copy(shCtr);
  sun.position.copy(shCtr).addScaledVector(shDir, 300);
  sun.target.updateMatrixWorld();

  const c = sun.shadow.camera;
  if(Math.abs(c.right - shHalf) > 0.02){
    c.left = -shHalf; c.right = shHalf; c.top = shHalf; c.bottom = -shHalf;
    c.updateProjectionMatrix();
  }
  // il bias segue la dimensione del riquadro: stretto ne vuole molto meno
  sun.shadow.bias = -0.00010 - shHalf * 0.0000070;
  sun.shadow.normalBias = 0.010 + shHalf * 0.00034;
}

function applyLight(){
  const e = EPOCHS[epoch];
  const deg = sunEl * 180/Math.PI;
  const day = Math.max(0, Math.min(1, (deg + 4) / 22));   // 0 di notte, 1 in pieno giorno
  const k = sectionOn ? 1 : e.sun;
  sun.intensity = 1.95 * k * day;
  const warmth = Math.max(0, 1 - Math.max(0, deg) / 20);
  const w = Math.max(warmth, (!sectionOn && e.warm > .5) ? 1 : 0);
  sun.color.setRGB(1, 0.94 - w*0.20, 0.85 - w*0.42);
  const night = 1 - day;
  hemi.intensity = (0.34 + 0.70*day) * (sectionOn ? 1 : (0.55 + k*0.45));
  hemi.color.setRGB(0.86 - night*0.30, 0.88 - night*0.24, 0.85 - night*0.05);
  hemi.groundColor.setRGB(0.38 - night*0.20, 0.35 - night*0.18, 0.29 - night*0.14);
  rim.intensity = 0.20 + night*0.34;
  rim.color.setRGB(0.55 + night*0.05, 0.66 + night*0.06, 0.78);
}

function applyEpoch(i, silent){
  epoch = i;
  const e = EPOCHS[i];
  aggiornaSezioneVuota();
  depositTarget = e.deposit;
  roofsA.visible = !!e.roofsA;
  roofsB.visible = !!e.roofsB;
  shantyGroup.visible = !!e.shanty;
  vegGroup.visible = !!e.veg;
  canalGroup.visible = !!e.canal;
  spoilGroup.visible = !!e.spoil;
  depositGroup.visible = e.deposit > 0.01;
  ashGroup.visible = !!e.ash;
  smoke.points.visible = !!e.shanty;
  birds.visible = (i === 0 || i === 4 || i === 7);
  applyLight();

  document.querySelectorAll('.ep').forEach((el,k) => {
    el.classList.toggle('on', k===i);
    el.setAttribute('aria-selected', k===i ? 'true':'false');
  });
  document.getElementById('epTag').textContent = e.tag;
  document.getElementById('epName').textContent = e.name;
  document.getElementById('epText').innerHTML =
    e.caption + (e.src ? `<span class="cite">${e.src}</span>` : '');

  hotspots.forEach(h => { h.group.visible = i >= h.data.from && i <= h.data.to; });
  AUDIO.setEpoch(i);
  if(!silent) renderPlaceList();
}

let filterText = '';
function renderPlaceList(){
  const ul = document.getElementById('places');
  ul.innerHTML = '';
  const q = filterText.trim().toLowerCase();
  let shown = 0;
  PLACES.forEach(p => {
    if(q && !(p.label + ' ' + p.sub).toLowerCase().includes(q)) return;
    shown++;
    const on = epoch >= p.from && epoch <= p.to;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'place' + (on ? '' : ' off');
    btn.innerHTML = `<span class="pl-label">${p.label}</span><span class="pl-sub">${p.sub}</span>`;
    btn.addEventListener('click', () => {
      if(!on){ applyEpoch(p.from); }
      flyTo(p); openPanel(p);
    });
    li.appendChild(btn);
    ul.appendChild(li);
  });
  if(!ercOn && shown){
    const sep = document.createElement('li');
    sep.className = 'plSep';
    sep.innerHTML = '<span>Ercolano — lo scavo</span>';
    ul.appendChild(sep);
    ERCOLANO.luoghi.forEach(p => {
      if(q && !(p.label + ' ' + p.sub).toLowerCase().includes(q)) return;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'place';
      btn.innerHTML = `<span class="pl-label">${p.label}</span><span class="pl-sub">${p.sub}</span>`;
      btn.addEventListener('click', () => { setErc(true); ERCOLANO.apri(p.id); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }
  if(!shown){
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('ui.rail.vuoto');
    ul.appendChild(li);
  }
}

/* ------------------------------------------------------------ pannello */

const panel = document.getElementById('panel');
function openPanel(p){
  document.getElementById('pTitle').textContent = p.label;
  document.getElementById('pSub').textContent = p.sub;
  document.getElementById('pBody').innerHTML = p.body;
  document.getElementById('pSrc').innerHTML = p.src;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden','false');
  document.body.classList.add('panel-open');
}
function closePanel(){
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden','true');
  document.body.classList.remove('panel-open');
}
document.getElementById('pClose').addEventListener('click', closePanel);

/* --------------------------------------------------------- navigazione */

const keys = new Set();
let yaw = 1.57, pitch = 0.0;         // valori applicati
let yawT = 1.57, pitchT = 0.0;       // valori bersaglio: lo sguardo li insegue
let locked = false, flight = null;
let flyMode = false;                 // false = camminata con collisioni
const EYE = 0.45;                    // 1,8 m
const RADIUS = 0.34;
const vel = new Vector3();           // velocità con inerzia
let bobPhase = 0, bobAmt = 0;
const stick = { x:0, y:0 };          // levetta touch, in [-1,1]
let touchRun = false;
function setLook(y, p){ yaw = yawT = y; pitch = pitchT = p; }

function findSpawn(x0, z0){
  for(let r=0; r<40; r++){
    for(let a=0; a<24; a++){
      const th = a/24 * Math.PI*2;
      const x = x0 + Math.cos(th)*r, z = z0 + Math.sin(th)*r;
      if(blockedAt(x, z)) continue;
      let clear = true;                       // serve anche un po' di respiro attorno
      for(const [ox,oz] of [[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]])
        if(isSolid(x+ox, z+oz)) { clear = false; break; }
      if(clear) return [x, z];
    }
  }
  return [x0, z0];
}
function blockedAt(x, z){
  for(const [ox,oz] of [[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]])
    if(isSolid(x+ox, z+oz)) return true;
  return false;
}
const spawn = findSpawn(-64, 14);
const player = new Vector3(spawn[0], 0, spawn[1]);
camera.position.set(player.x, EYE, player.z);

function groundY(){ return depositCurrent; }

function tryMove(dx, dz){
  const nx = player.x + dx;
  if(!blocked(nx, player.z)) player.x = nx;
  const nz = player.z + dz;
  if(!blocked(player.x, nz)) player.z = nz;
}
function blocked(x, z){
  for(const [ox,oz] of [[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]])
    if(isSolid(x+ox, z+oz)) return true;
  return false;
}

addEventListener('keydown', e => {
  if(e.code === 'Escape'){ closePanel(); stopPresentation(); return; }
  if(e.code === 'KeyC'){ toggleSection(); return; }
  if(e.code === 'KeyF'){ setFly(!flyMode); return; }
  if(e.code === 'KeyL'){ toggleLabels(); return; }
  if(e.key >= '1' && e.key <= '8'){ applyEpoch(+e.key - 1); return; }
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ControlLeft',
      'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
    keys.add(e.code);
    if(e.code === 'Space') e.preventDefault();
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const cv = renderer.domElement;
cv.addEventListener('click', ev => {
  if(!locked && !isTouch && !sectionOn){ cv.requestPointerLock(); return; }
  pickHotspot(ev);
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === cv;
  document.getElementById('crosshair').style.opacity = locked ? '1' : '0';
});
addEventListener('mousemove', e => {
  if(!locked) return;
  yawT   -= e.movementX * 0.0022;
  pitchT -= e.movementY * 0.0022;
  pitchT = Math.max(-1.35, Math.min(1.15, pitchT));
});

let dragging = false, lastX = 0, lastY = 0;
cv.addEventListener('pointerdown', e => {
  if(locked) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => {
  if(!dragging || locked) return;
  yawT   -= (e.clientX - lastX) * 0.004;
  pitchT -= (e.clientY - lastY) * 0.004;
  pitchT = Math.max(-1.35, Math.min(1.15, pitchT));
  lastX = e.clientX; lastY = e.clientY;
});

// ---- levetta virtuale per il touch -------------------------------------
const stickEl = document.getElementById('stick');
const stickKnob = document.getElementById('stickKnob');
let stickId = null;
const STICK_R = 46;
function stickSet(dx, dy){
  const d = Math.hypot(dx, dy);
  const k = d > STICK_R ? STICK_R/d : 1;
  const nx = dx*k, ny = dy*k;
  stickKnob.style.transform = `translate(${nx}px, ${ny}px)`;
  stick.x = nx/STICK_R;
  stick.y = -ny/STICK_R;
}
function stickReset(){
  stickId = null; stick.x = 0; stick.y = 0;
  stickKnob.style.transform = 'translate(0,0)';
  stickEl.classList.remove('active');
}
stickEl.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  stickId = e.pointerId;
  stickEl.setPointerCapture(e.pointerId);
  stickEl.classList.add('active');
  const r = stickEl.getBoundingClientRect();
  stickSet(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
});
stickEl.addEventListener('pointermove', e => {
  if(e.pointerId !== stickId) return;
  e.preventDefault();
  const r = stickEl.getBoundingClientRect();
  stickSet(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
});
['pointerup','pointercancel','lostpointercapture'].forEach(ev =>
  stickEl.addEventListener(ev, e => { if(e.pointerId === stickId) stickReset(); }));

const runBtn = document.getElementById('btnRun');
runBtn.addEventListener('click', () => {
  touchRun = !touchRun;
  runBtn.classList.toggle('on', touchRun);
});

const raycaster = new Raycaster();
const ndc = new Vector2();
function pickHotspot(ev){
  if(locked) ndc.set(0,0);
  else {
    const r = cv.getBoundingClientRect();
    ndc.set(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  }
  raycaster.setFromCamera(ndc, camera);
  const targets = hotspots.filter(h => h.group.visible).map(h => h.cone);
  const hit = raycaster.intersectObjects(targets, false)[0];
  if(hit){
    const h = hotspots.find(x => x.cone === hit.object);
    if(h) openPanel(h.data);
  }
}

function flyTo(p){
  const to = new Vector3(p.x + 16, Math.max(p.y + 9, 8), p.z + 20);
  flight = { from: camera.position.clone(), to,
             target: new Vector3(p.x, p.y + 2, p.z), t:0 };
  player.set(p.x + 16, 0, p.z + 20);
  if(locked) document.exitPointerLock();
}

function setFly(on){
  flyMode = on;
  document.getElementById('btnFly').classList.toggle('on', on);
  document.getElementById('btnFly').textContent = t(on ? 'ui.tool.volo' : 'ui.tool.cammina');
  if(!on){ player.x = camera.position.x; player.z = camera.position.z; }
}

/* ------------------------------------------------------ modalità sezione */

const sectionHud = document.getElementById('sectionHud');
function toggleSection(){ setSection(!sectionOn); }
// Nelle fasi senza deposito il taglio è legittimo ma vuoto: alla vigilia non
// c'è ancora niente sopra la città, e oggi è stato scavato via. Dirlo invece
// di lasciare l'utente davanti a una legenda che elenca tre strati assenti.
function aggiornaSezioneVuota(){
  const el = document.getElementById('secEmpty');
  if(!el) return;
  const vuota = sectionOn && EPOCHS[epoch].deposit === 0;
  el.hidden = !vuota;
  if(vuota)
    el.textContent = t(epoch === 0 ? 'ui.sez.vuota.vigilia' : 'ui.sez.vuota.scavato');
}

function setSection(on){
  sectionOn = on;
  document.getElementById('btnSection').classList.toggle('on', on);
  sectionHud.classList.toggle('on', on);
  document.body.classList.toggle('section-on', on);
  applyLight();
  if(on){
    sectionZ = Math.round(Math.max(-72, Math.min(78, camera.position.z)));
    sectionX = Math.max(-140, Math.min(130, Math.round(camera.position.x)));
    if(locked) document.exitPointerLock();
    updateSection();
  } else {
    clipPlane.constant = NO_CLIP;
    camera.position.set(player.x, groundY() + EYE, player.z);
  }
  aggiornaSezioneVuota();
}
// quote della sezione, disegnate sulla faccia del taglio
const secMarks = new Group(); scene.add(secMarks); secMarks.visible = false;
const SEC_MARKS = [
  { t:t('scena.strati.correnti'), dy:-0.225, c:'#EDEEE9' },
  { t:t('scena.strati.grigi'),    dy:-0.65,  c:'#EDEEE9' },
  { t:t('scena.strati.bianchi'),  dy:-1.05,  c:'#2A2721' },
  { t:t('scena.strati.piano'),    dy:-1.28,  c:'#7FB8A3' }
];
SEC_MARKS.forEach(m => {
  const sp = makeLabel(m.t, m.c, 600, 40, 0.30);
  secMarks.add(sp);
  m.sprite = sp;
});

let sectionX = -60;
function updateSection(){
  sectionZ = Math.max(-72, Math.min(78, sectionZ));
  clipPlane.constant = sectionZ;
  document.getElementById('secZ').textContent =
    (sectionZ >= 0 ? '+' : '') + t('ui.sez.quota', { n: fmt().n(Math.round(sectionZ*4)) });
  flight = { from: camera.position.clone(),
             to: new Vector3(sectionX + 2, 2.2, sectionZ + 16),
             target: new Vector3(sectionX, 0.7, sectionZ - 3), t:0 };
}
document.getElementById('secMinus').addEventListener('click', () => { sectionZ -= 6; updateSection(); });
document.getElementById('secPlus').addEventListener('click',  () => { sectionZ += 6; updateSection(); });
addEventListener('wheel', e => {
  if(!sectionOn) return;
  sectionZ += Math.sign(e.deltaY) * 3;
  updateSection();
}, { passive:true });

/* ------------------------------------------------ presentazione e tour */

let presenting = false, presentTimer = 0;
function startPresentation(){
  presenting = true; presentTimer = 0;
  applyEpoch(0);
  document.body.classList.add('presenting');
  document.getElementById('btnPresent').classList.add('on');
  if(locked) document.exitPointerLock();
  closePanel();
  flyTo({ x:-40, z:120, y:40 });
}
function stopPresentation(){
  if(!presenting) return;
  presenting = false;
  document.body.classList.remove('presenting');
  document.getElementById('btnPresent').classList.remove('on');
}
document.getElementById('btnPresent').addEventListener('click', () =>
  presenting ? stopPresentation() : startPresentation());

let tourIdx = -1;
function tourGo(step){
  tourIdx = Math.max(0, Math.min(TOUR.length-1, tourIdx + step));
  const id = TOUR[tourIdx];
  const h = byId[id];
  if(!h) return;
  applyEpoch(TOUR_EPOCH[id] ?? h.data.from);
  flyTo(h.data);
  openPanel(h.data);
  document.getElementById('tourPos').textContent =
    t('ui.tour.posizione', { i: tourIdx+1, n: TOUR.length });
  document.getElementById('tourPrev').disabled = tourIdx === 0;
  document.getElementById('tourNext').disabled = tourIdx === TOUR.length-1;
}
function startTour(){
  document.body.classList.add('touring');
  document.getElementById('btnTour').classList.add('on');
  tourIdx = -1; tourGo(1);
}
function stopTour(){
  document.body.classList.remove('touring');
  document.getElementById('btnTour').classList.remove('on');
  closePanel();
}
document.getElementById('btnTour').addEventListener('click', () =>
  document.body.classList.contains('touring') ? stopTour() : startTour());
document.getElementById('tourPrev').addEventListener('click', () => tourGo(-1));
document.getElementById('tourNext').addEventListener('click', () => tourGo(1));
document.getElementById('tourClose').addEventListener('click', stopTour);

/* ------------------------------------------------------------- toolbar */

let overview = false;
document.getElementById('btnTop').addEventListener('click', () => {
  if(ercOn){ setErcAlto(!ERCOLANO.inVolo()); return; }
  overview = !overview;
  document.getElementById('btnTop').classList.toggle('on', overview);
  if(overview){
    setFly(true);
    flight = { from: camera.position.clone(), to: new Vector3(-6, 210, 150),
               target: new Vector3(-6, 0, 3), t:0 };
    if(locked) document.exitPointerLock();
  } else {
    flight = { from: camera.position.clone(), to: new Vector3(-92, 12, 34),
               target: new Vector3(-60, 4, 16), t:0 };
  }
});
document.getElementById('btnFly').addEventListener('click', () => {
  if(ercOn){ setErcAlto(!ERCOLANO.inVolo()); return; }
  setFly(!flyMode);
});
document.getElementById('btnSection').addEventListener('click', toggleSection);

function toggleLabels(){
  labelsOn = !labelsOn;
  labelGroup.visible = labelsOn;
  document.getElementById('btnLabels').classList.toggle('on', labelsOn);
}
document.getElementById('btnLabels').addEventListener('click', toggleLabels);
document.getElementById('btnLabels').classList.add('on');

/* ------------------------------------------------------------ controller */
let padOn = false;
function setPad(on){
  padOn = on;
  document.body.classList.toggle('pad', on);
  document.getElementById('btnPad').classList.toggle('on', on);
}
document.getElementById('btnPad').addEventListener('click', () => setPad(!padOn));

// joypad fisico: levetta sinistra muove, destra guarda, dorsali cambiano fase
let padPrev = [], gamepadSeen = false;
function pollGamepad(dt){
  if(!navigator.getGamepads) return;
  let gp = null;
  const list = navigator.getGamepads();
  for(let i=0;i<list.length;i++) if(list[i] && list[i].connected){ gp = list[i]; break; }
  if(!gp) return;
  if(!gamepadSeen){
    gamepadSeen = true;
    const b = document.getElementById('btnPad');
    b.textContent = t('ui.joypad.acceso');
    b.title = t('ui.joypad.collegato') + gp.id;
    setPad(true);
  }
  const dz = v => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v)*0.15) / 0.85;
  stick.x += dz(gp.axes[0] || 0);
  stick.y += -dz(gp.axes[1] || 0);
  yawT   -= dz(gp.axes[2] || 0) * dt * 2.6;
  pitchT -= dz(gp.axes[3] || 0) * dt * 2.0;
  pitchT = Math.max(-1.35, Math.min(1.15, pitchT));
  const pressed = gp.buttons.map(b => b.pressed);
  if(pressed[6] || pressed[7]) touchRun = true;
  if(pressed[4] && !padPrev[4]) applyEpoch(Math.max(0, epoch - 1));
  if(pressed[5] && !padPrev[5]) applyEpoch(Math.min(EPOCHS.length - 1, epoch + 1));
  if(pressed[0] && !padPrev[0]) pickHotspot({ clientX: innerWidth/2, clientY: innerHeight/2 });
  if(pressed[3] && !padPrev[3]) toggleSection();
  padPrev = pressed;
}

/* -------------------------------------------------------------- qualità */
const QUALITY = [
  { id:'alta',       label:t('ui.qualita.alta'), shadow:4096, dpr:2,   parts:1.0,  fogFar:980, shadows:true,
    rs:1.15, ao:0.34, sharp:0.26, vig:0.13 },
  { id:'bilanciata', label:t('ui.qualita.bilanciata'), shadow:2048, dpr:1.6, parts:0.55, fogFar:820, shadows:true,
    rs:1.00, ao:0.26, sharp:0.20, vig:0.11 },
  { id:'batteria',   label:t('ui.qualita.batteria'), shadow:1024, dpr:1,   parts:0.20, fogFar:660, shadows:false,
    rs:0.85, ao:0.00, sharp:0.14, vig:0.09 }
];
let renderScale = 1, renderScaleTarget = 1;
let qIndex = 0;
function applyQuality(i){
  qIndex = (i + QUALITY.length) % QUALITY.length;
  const q = QUALITY[qIndex];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = q.shadows;
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  shadowCasters.forEach(m => { m.castShadow = q.shadows; m.material.needsUpdate = true; });
  scene.fog.far = q.fogFar;
  shadowsOn = q.shadows;
  setParticleDensity(q.parts);
  renderScaleTarget = q.rs;
  renderScale = q.rs;
  POST.setQuality(q.ao, q.sharp, q.vig);
  POST.setSize(renderer, innerWidth, innerHeight, renderScale);
  const b = document.getElementById('btnQuality');
  b.textContent = q.label;
  b.classList.toggle('on', qIndex !== 0);
}
document.getElementById('btnQuality').addEventListener('click', () => applyQuality(qIndex + 1));

/* ------------------------------------------------------------- orologio */
function setClockUI(on){
  document.body.classList.toggle('clock-on', on);
  document.getElementById('btnClock').classList.toggle('on', on);
}
document.getElementById('btnClock').addEventListener('click', () =>
  setClockUI(!document.body.classList.contains('clock-on')));
document.getElementById('clockSlider').addEventListener('input', e => {
  timeMode = 'manual';
  manualHour = Number(e.target.value) / 60;
  document.getElementById('clockNow').classList.remove('on');
  updateSun();
});
document.getElementById('clockNow').addEventListener('click', () => {
  timeMode = 'live';
  document.getElementById('clockNow').classList.add('on');
  const n = romeNow();
  document.getElementById('clockSlider').value = n.hh*60 + n.mm;
  updateSun();
});
/* ---------------------------------------------------------- sonoro */
const btnAudio = document.getElementById('btnAudio');
btnAudio.addEventListener('click', () => {
  const v = AUDIO.setEnabled(!AUDIO.isOn());
  btnAudio.classList.toggle('on', v);
  btnAudio.textContent = v ? 'Sonoro acceso' : 'Sonoro';
  if(v) AUDIO.setEpoch(epoch);
});

/* -------------------------------------------------------- confronto */
let compareOn = false;
function setCompare(v){
  compareOn = !!v;
  document.body.classList.toggle('cmp-on', compareOn);
  document.getElementById('cmpHud').hidden = !compareOn;
  document.getElementById('cmpTitles').hidden = !compareOn;
  document.getElementById('btnCompare').classList.toggle('on', compareOn);
  if(compareOn){
    if(flyMode) setFly(false);
    if(document.pointerLockElement) document.exitPointerLock();
    if(sectionOn) toggleSection();
    CONFRONTO.bind(renderer.domElement);
    CONFRONTO.resize(innerWidth, innerHeight);
    CONFRONTO.reset();
  }
}
document.getElementById('btnCompare').addEventListener('click', () => setCompare(!compareOn));

/* --------------------------------------------------------- Ercolano */
let ercOn = false;
// Dentro Ercolano «Dall'alto» e «Volo» comandano la stessa cosa: salire.
// Da terra la forma dello scavo non si vede — è un cardo di cinque metri
// fra due insulae — e senza questa il visitatore resta davanti a un muro.
function setErcAlto(on){
  const v = ERCOLANO.dallAlto(on);
  document.getElementById('btnTop').classList.toggle('on', v);
  document.getElementById('btnFly').classList.toggle('on', v);
  document.getElementById('btnFly').textContent = t(v ? 'ui.tool.volo' : 'ui.tool.cammina');
  if(v && document.pointerLockElement) document.exitPointerLock();
}

// I comandi che a Ercolano non hanno niente su cui agire vengono spenti
// invece di restare accesi e inerti: la sezione taglia il deposito di
// Pompei, l'elenco dei luoghi e il tour sono di Pompei, la presentazione
// scorre le otto fasi che qui non esistono, e il sole di questa scena è
// fisso perché l'orientamento della griglia non è verificato.
const INERTI_A_ERCOLANO = ['btnRail','btnSection','btnLabels','btnTour','btnPresent','btnClock'];
function aggiornaComandiErcolano(){
  for(const id of INERTI_A_ERCOLANO){
    const b = document.getElementById(id);
    if(b) b.disabled = ercOn;
  }
}

function setErc(v){
  ercOn = !!v;
  document.body.classList.toggle('erc-on', ercOn);
  document.getElementById('ercHud').hidden = !ercOn;
  document.getElementById('btnErc').classList.toggle('on', ercOn);
  if(ercOn){
    if(compareOn) setCompare(false);
    if(flyMode) setFly(false);
    if(sectionOn) toggleSection();
    if(document.pointerLockElement) document.exitPointerLock();
    closePanel();
    if(document.body.classList.contains('rail-open'))
      document.body.classList.remove('rail-open');
    ERCOLANO.resize(innerWidth, innerHeight);
    ERCOLANO.enter(renderer.domElement, {
      openPanel: openPanel,
      onNear: nome => {
        const el = document.getElementById('ercNear');
        if(el) el.textContent = nome ? ('▸ ' + nome + ' — clicca') : '';
      }
    });
  } else {
    ERCOLANO.exit();
    closePanel();
  }
  setErcAlto(false);
  aggiornaComandiErcolano();
  if(!ercOn){
    document.getElementById('btnTop').classList.toggle('on', overview);
    document.getElementById('btnFly').classList.toggle('on', flyMode);
    document.getElementById('btnFly').textContent = t(flyMode ? 'ui.tool.volo' : 'ui.tool.cammina');
  }
}
document.getElementById('btnErc').addEventListener('click', () => setErc(!ercOn));
document.getElementById('ercExit').addEventListener('click', () => setErc(false));
document.getElementById('ercReset').addEventListener('click', () => setErcAlto(false));
{
  const fwd = document.getElementById('ercFwd'), back = document.getElementById('ercBack');
  const hold = (el, v) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); ERCOLANO.setGo(v); });
    ['pointerup','pointercancel','pointerleave'].forEach(ev =>
      el.addEventListener(ev, () => ERCOLANO.setGo(0)));
  };
  hold(fwd, 1); hold(back, -1);
}
document.getElementById('cmpClose').addEventListener('click', () => setCompare(false));
document.getElementById('cmpReset').addEventListener('click', () => CONFRONTO.reset());

document.getElementById('btnHelp').addEventListener('click', () =>
  document.getElementById('intro').classList.remove('gone'));
document.getElementById('btnStart').addEventListener('click', () => {
  document.getElementById('intro').classList.add('gone');
  AUDIO.init();
});
// Il confronto è la tesi del progetto in una schermata: cinque metri contro
// venti, stessa scala. Nascosto dietro il quinto bottone della seconda fila
// non lo trovava nessuno, quindi si può prendere direttamente dalla porta.
document.getElementById('btnStartCompare').addEventListener('click', () => {
  document.getElementById('intro').classList.add('gone');
  AUDIO.init();
  setCompare(true);
});
/* ------------------------------------------------------------ lingua */
// Cambiare lingua ricarica la pagina: i cartelli dentro la scena sono
// texture cotte alla costruzione, e rifarli a caldo costerebbe più codice
// di quanto valga. Il codice finisce nell'indirizzo, così un link a una
// lingua si può passare a qualcuno.
{
  const sel = document.getElementById('lang');
  for(const l of LINGUE.filter(l => l.pronta)){
    const o = document.createElement('option');
    o.value = l.cod; o.textContent = l.nome;
    sel.appendChild(o);
  }
  sel.value = linguaAttiva();
  sel.addEventListener('change', e => scegliLingua(e.target.value));
}

document.getElementById('btnRail').addEventListener('click', () =>
  document.body.classList.toggle('rail-open'));
document.getElementById('search').addEventListener('input', e => {
  filterText = e.target.value; renderPlaceList();
});

const epStrip = document.getElementById('epochs');
EPOCHS.forEach((e,i) => {
  const b = document.createElement('button');
  b.className = 'ep';
  b.setAttribute('role','tab');
  b.innerHTML = `<span class="ep-tag">${e.tag}</span><span class="ep-name">${e.name}</span>`;
  b.addEventListener('click', () => { stopPresentation(); applyEpoch(i); });
  epStrip.appendChild(b);
});

/* --------------------------------------------------------------- loop */

const clock = new Clock();
const fwd = new Vector3(), right = new Vector3(), up = new Vector3(0,1,0);
const camWorld = new Vector3();
const compassSvg = document.querySelector('#compass svg');
let sunTimer = 0;

/* Risoluzione dinamica. Prima c'era un solo gradino: se i primi 2,5 secondi
   andavano male scendeva di livello e non risaliva più. Ora la scala di resa
   si muove di continuo fra il minimo e il valore del livello, e solo se
   nemmeno al minimo si tiene il passo si scende di livello. Il risultato è
   che il movimento resta fluido invece di scattare quando la scena si
   complica — per esempio quando la caduta dei lapilli riempie lo schermo. */
const isMobile = isTouch || /iPhone|iPad|Android/i.test(navigator.userAgent);
let frames = 0, acc = 0, settle = 0;
function autoQuality(dt){
  frames++; acc += dt;
  if(acc < 0.9) return;
  const fps = frames/acc;
  frames = 0; acc = 0;
  const floor = Math.min(0.68, renderScaleTarget);
  let sc = renderScale;
  if(fps < 46)      sc -= 0.09;
  else if(fps > 57) sc += 0.045;
  sc = Math.max(floor, Math.min(renderScaleTarget, sc));
  if(Math.abs(sc - renderScale) > 0.004){
    renderScale = sc;
    POST.setSize(renderer, innerWidth, innerHeight, renderScale);
  }
  if(fps < 34 && renderScale <= floor + 0.006){
    if(++settle >= 2 && qIndex < QUALITY.length - 1){ settle = 0; applyQuality(qIndex + 1); }
  } else settle = 0;
}

function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if(ercOn){
    ERCOLANO.update(dt, t);
    if(!POST.render(renderer, ERCOLANO.scene, ERCOLANO.camera))
      renderer.render(ERCOLANO.scene, ERCOLANO.camera);
    return;
  }
  if(compareOn){
    CONFRONTO.update(dt);
    renderer.render(CONFRONTO.scene, CONFRONTO.camera);
    return;
  }
  autoQuality(dt);
  pollGamepad(dt);

  depositCurrent += (depositTarget - depositCurrent) * Math.min(1, dt*2.2);
  for(const g of [depositGroup, shantyGroup, vegGroup, canalGroup, spoilGroup])
    g.position.y = depositCurrent;

  stepParticles(dt, t);

  // cenere
  if(ashGroup.visible){
    const pts = ashGroup.children[0];
    const arr = pts.geometry.attributes.position.array;
    for(let i=0;i<ashCount;i++){
      arr[i*3+1] -= ashSpeed[i]*dt;
      arr[i*3]   += Math.sin(t*0.6 + i)*dt*0.6;
      if(arr[i*3+1] < depositCurrent) arr[i*3+1] = 70 + Math.random()*30;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  }

  // presentazione automatica
  if(presenting){
    presentTimer += dt;
    if(presentTimer > 9){
      presentTimer = 0;
      if(epoch >= EPOCHS.length-1) stopPresentation();
      else applyEpoch(epoch+1, true);
    }
    const a = t*0.045;
    camera.position.set(-6 + Math.cos(a)*170, 78, 3 + Math.sin(a)*170);
    const d = new Vector3(-6,6,3).sub(camera.position).normalize();
    setLook(Math.atan2(-d.x, -d.z), Math.asin(Math.max(-1, Math.min(1, d.y))));
  } else if(flight){
    flight.t = Math.min(1, flight.t + dt*0.85);
    const e = 1 - Math.pow(1-flight.t, 3);
    camera.position.lerpVectors(flight.from, flight.to, e);
    const dir = flight.target.clone().sub(camera.position).normalize();
    setLook(Math.atan2(-dir.x, -dir.z), Math.asin(Math.max(-1, Math.min(1, dir.y))));
    if(flight.t >= 1){
      flight = null;
      if(!flyMode && !sectionOn){ player.x = camera.position.x; player.z = camera.position.z; }
    }
  } else if(!sectionOn){
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touchRun;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    // input unificato: tastiera + levetta touch, in [-1,1]
    let ix = (keys.has('KeyD')||keys.has('ArrowRight') ? 1 : 0)
           - (keys.has('KeyA')||keys.has('ArrowLeft')  ? 1 : 0) + stick.x;
    let iz = (keys.has('KeyW')||keys.has('ArrowUp')    ? 1 : 0)
           - (keys.has('KeyS')||keys.has('ArrowDown')  ? 1 : 0) + stick.y;
    const mag = Math.hypot(ix, iz);
    if(mag > 1){ ix /= mag; iz /= mag; }

    const target = new Vector3(
      right.x*ix + fwd.x*iz, 0, right.z*ix + fwd.z*iz
    );
    const maxSpeed = flyMode ? (sprint ? 52 : 17) : (sprint ? 4.8 : 1.9);
    target.multiplyScalar(maxSpeed);

    if(flyMode){
      let vy = 0;
      if(keys.has('Space'))       vy += maxSpeed;
      if(keys.has('ControlLeft')) vy -= maxSpeed;
      target.y = vy;
    }

    // inerzia: accelerazione e attrito, così il movimento non è a scatti
    const acc = flyMode ? 9 : 13;
    vel.lerp(target, Math.min(1, acc*dt));
    if(vel.lengthSq() < 1e-5) vel.set(0,0,0);

    if(flyMode){
      camera.position.addScaledVector(vel, dt);
      camera.position.y = Math.max(0.6, Math.min(320, camera.position.y));
    } else {
      tryMove(vel.x*dt, vel.z*dt);
      // passo: oscillazione minima, proporzionale alla velocità
      const speed = Math.hypot(vel.x, vel.z);
      bobAmt += (Math.min(speed/maxSpeed, 1) - bobAmt) * Math.min(1, dt*6);
      bobPhase += dt * (6.5 + speed*0.9);
      const bob = Math.sin(bobPhase) * 0.022 * bobAmt;
      camera.position.set(player.x, groundY() + EYE + bob, player.z);
    }
  }

  // lo sguardo insegue il bersaglio: niente scatti sul mouse
  const lookK = Math.min(1, dt * 26);
  yaw   += (yawT - yaw) * lookK;
  pitch += (pitchT - pitch) * lookK;

  camera.rotation.set(0,0,0);
  camera.rotateY(yaw);
  camera.rotateX(pitch);

  // l'ombra segue la telecamera, con il riquadro stretto sul campo utile
  camera.getWorldPosition(camWorld);
  updateShadowBox();
  sunTimer += dt;
  if(sunTimer > 0.5){ sunTimer = 0; if(timeMode === 'live') updateSun(); }

  // marker
  let near = null, nearD = 1e9;
  hotspots.forEach((h,i) => {
    if(!h.group.visible) return;
    const d = camera.position.distanceTo(h.group.position);
    const k = Math.max(0.8, Math.min(4.2, d/75));
    h.cone.scale.setScalar(k);
    h.cone.position.y = h.base + k*1.4 + Math.sin(t*1.6 + i)*0.55;
    h.cone.rotation.y += dt*0.7;
    if(d < nearD){ nearD = d; near = h; }
  });
  const hint = document.getElementById('nearHint');
  if(near && nearD < 26 && !sectionOn && !presenting){
    hint.textContent = near.data.label;
    hint.classList.add('on');
  } else hint.classList.remove('on');

  // etichette: leggibili nella loro fascia, invisibili fuori
  const camY = camera.position.y;
  labels.forEach(sp => {
    const r = LABEL_RULE[sp.userData.kind];
    const d = camera.position.distanceTo(sp.position);
    const k = Math.max(0.55, Math.min(3.2, d/70));
    const h = sp.userData.h * k;
    sp.scale.set(h * sp.userData.aspect, h, 1);
    let o = 1;
    if(d < r.near || d > r.far) o = 0;
    else if(d < r.near*1.8) o = (d - r.near)/(r.near*0.8);
    else if(d > r.far*0.82) o = (r.far - d)/(r.far*0.18);
    if(camY < r.minY || camY > r.maxY) o = 0;
    sp.material.opacity = Math.max(0, Math.min(1, o)) * 0.92;
  });

  // bussola: il nord è −Z
  compassSvg.style.transform = `rotate(${yaw}rad)`;

  // quote sulla faccia del taglio
  secMarks.visible = sectionOn && depositCurrent > 0.05;
  if(secMarks.visible){
    SEC_MARKS.forEach(m => {
      m.sprite.position.set(sectionX + 9, depositCurrent + m.dy, sectionZ + 0.7);
      const d = camera.position.distanceTo(m.sprite.position);
      const k = Math.max(0.8, Math.min(1.6, d/22));
      const h = m.sprite.userData.h * k;
      m.sprite.scale.set(h * m.sprite.userData.aspect, h, 1);
      m.sprite.material.opacity = 0.95;
    });
  }

  if(!POST.render(renderer, scene, camera)) renderer.render(scene, camera);
}

addEventListener('resize', () => {
  CONFRONTO.resize(innerWidth, innerHeight);
  ERCOLANO.resize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  POST.setSize(renderer, innerWidth, innerHeight, renderScale);
});

setPad(isTouch);
applyQuality(isMobile ? 1 : 0);
setClockUI(!isMobile);
document.getElementById('clockSlider').value = ORA_INGRESSO * 60;
updateSun();
if(isTouch){
  document.body.classList.add('touch');
  const hint = document.getElementById('touchHint');
  setTimeout(() => hint.classList.add('faded'), 7000);
  addEventListener('pointerdown', () => hint.classList.add('faded'), { once:true });
}
applyEpoch(0);
setFly(false);
document.getElementById('loading').classList.add('gone');
tick();

}
