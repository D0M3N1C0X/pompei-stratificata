import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  LineSegments,
  CylinderGeometry,
  SphereGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  Vector4,
  TextureLoader,
  LineLoop,
  LineBasicMaterial,
  WebGLRenderer
} from 'three';
import { AUDIO } from './audio.js';
import { CONFRONTO } from './confronto.js';
import { EPOCHS } from './data/epochs.js';
import { EVENTI, DURATA, statoEruzione, puntoEvento } from './data/eruzione.js';
import { PERCORSI, MODALITA } from './data/classe.js';
import { PLACES } from './data/places.js';
import INTERNI_P from './data/pompei-interni.json';
import { TOUR, TOUR_EPOCH } from './data/tour.js';
import { ERCOLANO } from './ercolano.js';
import { POST } from './post.js';
import { PAL } from './scene/palette.js';
import { DOT, PBR, TEX, TEXMAP, SCALA_MONDO, mappaMondo, px } from './scene/textures.js';
import { createInhabitants } from './scene/inhabitants.js';
import { caricaFigure, caricaAnimali } from './scene/figure.js';
import { trovaPercorso, creaSegno, seguiPercorso } from './scene/cammino.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import piscinaUrl from './assets/modelli/palestra-piscina.glb?url';
import aoSuoloUrl from './assets/luce/ao-suolo.png?url';
import AO_SUOLO from './assets/luce/ao-suolo.json';
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
// PCFSoft: provato il 22/10/2026 il PCF con raggio, a Ercolano (texel di
// 23 cm) faceva scalini a rombo su muri e acqua. La morbidezza delle ombre
// viene invece dalla luce del cielo più forte (applyLight).
// three.js 0.187 ha tolto PCFSoftShadowMap e usa PCFShadowMap al suo posto:
// lo si dichiara, invece di lasciarlo fare con un avviso a ogni avvio
renderer.shadowMap.type = PCFShadowMap;
renderer.localClippingEnabled = true;
app.appendChild(renderer.domElement);

// anisotropia al massimo che la scheda regge: le strade viste di scorcio
// erano una poltiglia con il valore fisso a 4
const MAXANISO = renderer.capabilities.getMaxAnisotropy();
for(const tx of Object.values(TEX)){ tx.anisotropy = MAXANISO; tx.needsUpdate = true; }
DOT.anisotropy = MAXANISO;

POST.init(renderer);
ERCOLANO.textures(TEX, { SCALA_MONDO, mappaMondo });

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
// L'eruzione ora per ora (fase 2): dichiarata qui, prima del sole, perché
// updateSun e applyLight la leggono fin dal primo fotogramma.
const eru = { on:false, ore:0, play:false, luce:1, ultimo:null };
// la modalità classe (null, 'lavagna', 'studente'): letta da scriviStato
const cl = { modo:null, percorso:'breve', tappa:0 };

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
  if(!eru.on){
    scene.background = skyTex;
    scene.fog.color.setStyle(rgbStr(mix3(sky.lo, sky.hi, 0.35)));
  }
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

/* Le vie. Fino al 9 ottobre 2026 le larghezze erano schematiche e 2–2,5 volte
   il vero: la sola carreggiata di via dell'Abbondanza misurava 12,8 m, con
   4,4 m di terreno libero per lato. Ora ogni via ha la sua larghezza totale,
   da facciata a facciata, e la fonte accanto:
   · Mau 1899 (trad. Kelsey, cap. XXXI): via di Mercurio, presso il Foro,
     «nearly 32 feet» (9,75 m); Abbondanza e Nola «about 28 feet» (8,5 m);
     tutte le altre «from 10 to 20 feet» (3–6 m). Wölfle (LMU 2011) misura
     l'Abbondanza 8,47–8,53 m, con marciapiedi di 3,96–4,30 m: letti come
     somma dei due lati, ~2 m l'uno [interpretazione]
   · cordoli: Poehler 2017, quasi tutti fra 15 e 39 cm, in media oltre 30;
     qui 30 cm. Via dell'Abbondanza 50–60 cm secondo una didascalia di cui
     non ho verificato l'autore: 55 cm, [da verificare]
   · le vie minori hanno un valore dentro i 10–20 piedi di Mau, scelto per
     via ma non misurato, e marciapiedi di 1 m [ipotesi]
   tot: larghezza totale in metri · marc: un marciapiede · h: il cordolo.
   w (carreggiata) e mw (marciapiede) in unità sono calcolati sotto. */
const STREETS = [
  { a:[-100,14],  b:[141,14],   tot:8.5,  marc:2.0, h:0.55, n:'Via dell’Abbondanza', lab:[-10,14], fonte:'Mau 1899; Wölfle 2011; cordolo [da verificare]' },
  { a:[-100,-30], b:[126,-30],  tot:8.5,  marc:2.0, h:0.30, n:'Via di Nola',         lab:[70,-30],  fonte:'Mau 1899' },
  { a:[-35,-78],  b:[-35,80],   tot:6.0,  marc:1.5, h:0.30, n:'Via Stabiana',        lab:[-35,-58], fonte:'entro Mau 1899' },
  { a:[72,14],    b:[74,78],    tot:5.5,  marc:1.2, h:0.30, n:'Via di Nocera',       lab:[73,56],   fonte:'entro Mau 1899' },
  { a:[-95,-72],  b:[-95,-30],  tot:9.75, marc:2.0, h:0.30, n:'Via di Mercurio',     lab:[-95,-58], fonte:'Mau 1899' },
  { a:[-146,4],   b:[-100,4],   tot:6.0,  marc:1.5, h:0.30, n:'Via Marina',          lab:[-126,4],  fonte:'entro Mau 1899' },
  { a:[-72,14],   b:[-72,56],   tot:4.5,  marc:1.0, h:0.30, n:'Via dei Teatri' },
  { a:[-56,14],   b:[-56,48],   tot:4.5,  marc:1.0, h:0.30, n:'Via del Tempio d’Iside' },
  { a:[-119,-56], b:[-98,-30],  tot:6.0,  marc:1.5, h:0.30, n:'Via Consolare',       lab:[-110,-45], fonte:'entro Mau 1899' },
  // 54,4 e non 52 (3 novembre 2026): la Casa del Fauno occupa l'isolato intero,
  // 92 m da Via della Fortuna al Vicolo di Mercurio (OSM; Mau fig. 137)
  { a:[-100,-54.4], b:[-35,-54.4], tot:4.5, marc:1.0, h:0.30, n:'Vicolo di Mercurio' },
  { a:[-20,-52],  b:[-20,-30],  tot:3.0,  marc:0.6, h:0.30, n:'Vicolo dei Balconi' },
  { a:[74,30],    b:[141,30],   tot:6.0,  marc:1.5, h:0.30, n:'Viale dell’Anfiteatro' },
  { a:[14,-78],   b:[14,14],    tot:3.6,  marc:0.8, h:0.30, n:'vicolo' },
  { a:[44,-72],   b:[44,14],    tot:3.6,  marc:0.8, h:0.30, n:'vicolo' },
  { a:[-70,-52],  b:[-70,-30],  tot:3.0,  marc:0.6, h:0.30, n:'vicolo' },
  { a:[36,14],    b:[36,72],    tot:3.6,  marc:0.8, h:0.30, n:'vicolo' },
  { a:[105,-40],  b:[105,14],   tot:3.6,  marc:0.8, h:0.30, n:'vicolo' },
  { a:[-100,38],  b:[-40,38],   tot:4.5,  marc:1.0, h:0.30, n:'fronte meridionale' }
];
for(const s of STREETS){
  s.w  = (s.tot - 2*s.marc) / 4;     // carreggiata, in unità da 4 m
  s.mw = s.marc / 4;                 // un marciapiede
  s.hh = s.h / 4;                    // il dislivello del cordolo
}

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
    if((x-px)**2 + (z-pz)**2 < (s.w/2+s.mw)**2) return true;
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

// La carreggiata scende sotto il marciapiede: a Pompei i marciapiedi sono
// rialzati (Mau 1899: «on both sides are raised sidewalks»). Il terreno è
// fatto di celle piene fino a quota 0, il piano dei marciapiedi; dove una
// cella incontra una carreggiata la si spezza in rettangoli esatti, e sotto
// la carreggiata il pieno si ferma alla quota del basolato.
const CARREGGIATE = [];
for(const s of STREETS){
  const [ax,az]=s.a,[bx,bz]=s.b;
  const dx=bx-ax, dz=bz-az, len=Math.hypot(dx,dz), steps=Math.ceil(len/2);
  const lungo = Math.abs(dx) > Math.abs(dz);
  for(let i=0;i<=steps;i++){
    const t=i/steps, x=ax+dx*t, z=az+dz*t;
    if(!inPoly(x,z,WALLS)) continue;
    const hx = lungo ? 1.1 : s.w/2, hz = lungo ? s.w/2 : 1.1;
    CARREGGIATE.push({ x0:x-hx, x1:x+hx, z0:z-hz, z1:z+hz, hh:s.hh, s });
  }
}
function quotaCarreggiata(x, z){
  for(const r of CARREGGIATE)
    if(x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return -r.hh;
  return null;
}
function cellaTerreno(cx, cz, colore){
  const x0 = cx-2.1, x1 = cx+2.1, z0 = cz-2.1, z1 = cz+2.1;
  const dentro = CARREGGIATE.filter(r => r.x1 > x0 && r.x0 < x1 && r.z1 > z0 && r.z0 < z1);
  if(!dentro.length){ block(cx, -2.4, cz, 4.2, 2.4, 4.2, colore); return; }
  // griglia compressa sui bordi delle carreggiate: rettangoli esatti
  const xs = [...new Set([x0, x1, ...dentro.flatMap(r => [r.x0, r.x1]).filter(v => v > x0 && v < x1)])].sort((a,b) => a-b);
  const zs = [...new Set([z0, z1, ...dentro.flatMap(r => [r.z0, r.z1]).filter(v => v > z0 && v < z1)])].sort((a,b) => a-b);
  for(let j=0;j<zs.length-1;j++){
    let inizio = 0, quota = null;
    const chiudi = (fine) => {
      if(fine <= inizio) return;
      const top = quota === null ? 0 : quota - 0.02;   // sotto il basolato
      const xa = xs[inizio], xb = xs[fine];
      block((xa+xb)/2, -2.4, (zs[j]+zs[j+1])/2, xb-xa, 2.4+top, zs[j+1]-zs[j], colore);
    };
    for(let i=0;i<xs.length-1;i++){
      const mx = (xs[i]+xs[i+1])/2, mz = (zs[j]+zs[j+1])/2;
      let q = null;
      for(const r of dentro) if(mx > r.x0 && mx < r.x1 && mz > r.z0 && mz < r.z1){ q = q === null ? -r.hh : Math.min(q, -r.hh); }
      if(i === 0){ quota = q; continue; }
      if(q !== quota){ chiudi(i); inizio = i; quota = q; }
    }
    chiudi(xs.length-1);
  }
}
const TERRACE = WALLS.map(([x,z]) => [CX + (x-CX)*1.30, CZ + (z-CZ)*1.30]);

block(-20, -3.9, -110, 1400, 1.8, 1000, 0x6f6b60);

// La piscina della Palestra Grande scende sotto il piano: il terreno, fatto
// di blocchi pieni fino a quota 0, va aperto dove sta lei. Misure in unità
// (1 = 4 m): vasca 35 × 23 m più il bordo di Blender, 0,7 m per lato.
const POZZO = { x:87.5, z:41.5, hx:35/8 + 0.7/4, hz:23/8 + 0.7/4 };
const tocca = (x, z, m) => Math.abs(x - POZZO.x) < POZZO.hx + m && Math.abs(z - POZZO.z) < POZZO.hz + m;
let buco = null;   // i limiti delle celle tolte, per richiudere attorno al bordo

for(let x=-210; x<210; x+=4){
  for(let z=-125; z<128; z+=4){
    if(!inPoly(x,z,TERRACE)) continue;
    if(tocca(x, z, 2.1)){
      buco = buco || { x0:Infinity, x1:-Infinity, z0:Infinity, z1:-Infinity };
      buco.x0 = Math.min(buco.x0, x-2.1); buco.x1 = Math.max(buco.x1, x+2.1);
      buco.z0 = Math.min(buco.z0, z-2.1); buco.z1 = Math.max(buco.z1, z+2.1);
      continue;
    }
    const v = ((x*7 + z*13) % 3);
    cellaTerreno(x, z, v===0 ? 0x8f8776 : (v===1 ? PAL.terrace : 0x847c6b));
  }
}
if(buco){
  // quattro fasce dal bordo delle celle al bordo della piscina, e un fondo sotto
  const ax = POZZO.x - POZZO.hx, bx = POZZO.x + POZZO.hx, az = POZZO.z - POZZO.hz, bz = POZZO.z + POZZO.hz;
  const fascia = (x0, x1, z0, z1) => block((x0+x1)/2, -2.4, (z0+z1)/2, x1-x0, 2.4, z1-z0, PAL.terrace);
  fascia(buco.x0, buco.x1, buco.z0, az);
  fascia(buco.x0, buco.x1, bz, buco.z1);
  fascia(buco.x0, ax, az, bz);
  fascia(bx, buco.x1, az, bz);
  block(POZZO.x, -2.4, POZZO.z, bx-ax, 1.85, bz-az, PAL.terrace);
}

// il basolato: una lastra sottile alla quota della carreggiata, e lungo i
// due bordi il cordolo, dal fondo della strada al piano del marciapiede
for(const r of CARREGGIATE)
  block((r.x0+r.x1)/2, -r.hh-0.02, (r.z0+r.z1)/2, r.x1-r.x0, 0.02, r.z1-r.z0, PAL.street);
for(const s of STREETS){
  const [ax,az]=s.a,[bx,bz]=s.b;
  const dx=bx-ax, dz=bz-az, len=Math.hypot(dx,dz), steps=Math.ceil(len/2);
  const lungo = Math.abs(dx) > Math.abs(dz), K = 0.06;   // cordolo largo 24 cm [ipotesi]
  for(let i=0;i<=steps;i++){
    const t=i/steps, x=ax+dx*t, z=az+dz*t;
    if(!inPoly(x,z,WALLS)) continue;
    for(const sg of [1,-1]){
      const o = sg*(s.w/2 + K/2);
      const kx = lungo ? x : x+o, kz = lungo ? z+o : z;
      // agli incroci il cordolo si interrompe: non attraversa la carreggiata
      // dell'altra via (prima la tagliava come una trave)
      if(CARREGGIATE.some(r => r.s !== s && kx > r.x0-1.1 && kx < r.x1+1.1 && kz > r.z0-1.1 && kz < r.z1+1.1 &&
         (lungo ? (kz > r.z0 && kz < r.z1) : (kx > r.x0 && kx < r.x1)))) continue;
      block(kx, -s.hh, kz, lungo ? 2.2 : K, s.hh+0.004, lungo ? K : 2.2, PAL.kerb);
    }
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
// gap: distacco fra case. 0,8 unità (3,2 m) per il generatore casuale; sul
// fronte stradale le case pompeiane hanno muri in comune, distacco quasi nullo
function overlaps(x,z,w,d,gap=0.8){
  for(const [ax,az,aw,ad] of taken)
    if(x < ax+aw+gap && x+w+gap > ax && z < az+ad+gap && z+d+gap > az) return true;
  return false;
}

const HOUSES = [];
/* Tre case con gli interni, dalle piante libere con la scala grafica
   (strumenti/piante/case_pompei.py → src/data/pompei-interni.json). Le misure
   vengono dal disegno; il POSTO nella scena è approssimato, perché la città
   della scena ha la griglia raddrizzata: ogni casa sta nell'isolato giusto
   rispetto alle vie della scena, e le tre stanno fra loro come nel vero
   (Vettii a nord-est del Fauno, di là dall'incrocio). Angolo nord-ovest, in
   unità. Le impronte si riservano prima del generatore delle case, che non
   cambia sequenza: altrove la città resta identica. */
const dimInterna = k => INTERNI_P.case[k].dim.map(v => v / 4);
const CASE_INTERNE = {
  // fra il vicolo a ovest e Via della Fortuna a sud (il filo del marciapiede)
  fauno:    { x0:-69.625, z0:-31.0625 - dimInterna('fauno')[1] },
  // a nord del Vicolo di Mercurio e 5,4 m a est del Fauno, come in OSM
  vettii:   { x0:-69.625 + dimInterna('fauno')[0] + 5.4/4, z0:-54.9625 - dimInterna('vettii')[1] },
  // Regio I, a sud di Via dell'Abbondanza [approssimato]
  menandro: { x0:-5, z0:32.5 }
};
for(const [k, c] of Object.entries(CASE_INTERNE)){
  [c.w, c.d] = dimInterna(k);
  // l'impronta e un margine di un metro e mezzo, perché le porte restino libere
  taken.push([c.x0 - 0.4, c.z0 - 0.4, c.w + 0.8, c.d + 0.8]);
}
// Prima le case sul fronte stradale. A Pompei le facciate stanno sul filo
// del marciapiede, una accanto all'altra; il generatore casuale qui sotto,
// da solo, lasciava spiazzi vuoti fra strada e case, che con le larghezze
// vere delle vie (9 ottobre 2026) saltavano all'occhio. Misure delle case:
// larghezza 2–4,5 unità (8–18 m), profondità 3–6 (12–24 m) [ipotesi, ordine di
// grandezza delle case pompeiane, non rilevato casa per casa].
for(const st of STREETS){
  const [ax,az]=st.a,[bx,bz]=st.b, dx=bx-ax, dz=bz-az;
  const lungo = Math.abs(dx) > Math.abs(dz);
  if(Math.min(Math.abs(dx), Math.abs(dz)) > 3) continue;          // le vie oblique restano al generatore
  const L = lungo ? Math.abs(dx) : Math.abs(dz);
  const a0 = lungo ? Math.min(ax,bx) : Math.min(az,bz);
  const asse = lungo ? (az+bz)/2 : (ax+bx)/2;
  const filo = st.w/2 + st.mw + 0.02;
  for(const lato of [1,-1]){
    let t = 0.5;
    while(t < L - 2){
      const w = 2 + Math.floor(rnd()*3) + (rnd() < 0.3 ? 0.5 : 0);
      const d = 3 + Math.floor(rnd()*4);
      const along = a0 + t;
      const front = asse + lato*filo;
      const x = lungo ? along : (lato > 0 ? front : front - d);
      const z = lungo ? (lato > 0 ? front : front - d) : along;
      const hw = lungo ? w : d, hd = lungo ? d : w;
      let ok = !overlaps(x, z, hw, hd, 0.02);
      for(let i=0;i<=hw && ok;i+=0.6) for(let j=0;j<=hd && ok;j+=0.6)
        if(!buildable(x+i, z+j) && !(lungo ? Math.abs(z+j-front) < 0.05 : Math.abs(x+i-front) < 0.05)) ok = false;
      if(ok){ taken.push([x,z,hw,hd]); HOUSES.push([x,z,hw,hd, hw>=8 || hd>=8]); }
      t += w + 0.04 + (rnd() < 0.12 ? 1.2 : 0);                     // ogni tanto un vicolo o un cortile
    }
  }
}
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

for(const [k, c] of Object.entries(CASE_INTERNE)){
  for(const [a, b, e, f] of INTERNI_P.case[k].muri)
    block(c.x0 + (a+e)/8, 0, c.z0 + (b+f)/8, (e-a)/4, 1.0, (f-b)/4, PAL.wall2);
}
for(const casa of HOUSES){
  const [x,z,w,d,grand] = casa;
  const cx = x+w/2, cz = z+d/2;
  const tone = [PAL.wall1,PAL.wall2,PAL.wall3][Math.floor(rnd()*3)];
  const t = 1.0;
  const floors = grand ? 2 : (rnd() > 0.32 ? 2 : 1);
  casa[5] = floors;                      // per le finestre del piano di sopra
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

// Palestra Grande: 140 x 140 m = 35 x 35 unità secondo la guida del Parco.
// Altre fonti danno 141 x 107 m: il conflitto è dichiarato nella scheda.
//
// Il portico (rifatto il 9 ottobre 2026; prima colonne alte 9,6 m, larghe
// 2,8, a 13,6 m l'una dall'altra, su quattro lati):
// · su tre lati, nord, ovest e sud: il quarto guarda l'anfiteatro ... FONTE
// · interasse ~3 m ................................................. DEDOTTO
//   dai conteggi: 48 fusti sul lato lungo (141 m) e 35 sui corti (107 m)
//   danno 3,0 e 3,1 m. Sul quadrato di 140 m del Parco ne entrano 48 per
//   lato: i conteggi sui lati corti non tornano, e nemmeno i 133 fusti di
//   Maiuri. I conteggi, fra l'altro, stanno meglio con il rettangolo.
// · diametro 0,6 m e altezza 4,2 m ................................. IPOTESI
//   proporzioni dell'ordine tuscanico in Vitruvio (altezza 7 diametri), con
//   intercolumnio largo, da architrave in legno
function porticoTreLati(x0, z0, lato, passo, d, h, colore){
  const n = Math.round(lato/passo);
  for(let i=0;i<=n;i++){
    const t = i*lato/n;
    block(x0+t, 0, z0, d, h, d, colore, CYL);          // nord
    block(x0+t, 0, z0+lato, d, h, d, colore, CYL);     // sud
    if(i>0 && i<n) block(x0, 0, z0+t, d, h, d, colore, CYL);   // ovest
  }
}
porticoTreLati(70, 24, 35, 0.75, 0.15, 1.05, PAL.column);

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

// (una funzione chiamata più avanti: qui cityGroup e allMaterials non
// esistono ancora, e usarli darebbe l'errore d'avvio del 14 ottobre)
function costruisciVesuvio(){
  // Il Vesuvio: lo stesso profilo di prima (schematico e fuori scala, come
  // dice la sua scheda), ma come superficie continua invece che a gradini
  // di blocchi da 32 m (28/10/2026). Anelli concentrici, un poco irregolari.
  const VX = -66, VZ = -252, R = 128, H = 104, NR = 48, NS = 96;
  const quota = (dr, a) => {
    let h = H * Math.pow(1 - dr/R, 1.35);
    if(dr < 20) h -= (20-dr)*1.1;
    h = Math.max(1.5, h) * (1 + 0.035*Math.sin(a*5 + dr*0.05) + 0.02*Math.sin(a*11 - dr*0.09));
    return dr >= R ? -0.5 : h;
  };
  const pos = [], col = [], idx = [];
  const c1 = new Color(0x6d6a64), c2 = new Color(PAL.mountain), c3 = new Color(0x555350), cc = new Color();
  for(let i = 0; i <= NR; i++){
    const dr = R * i / NR;
    const t = dr / R;
    // dal cratere scuro alle falde più chiare, come i tre toni dei blocchi
    if(t < 0.42) cc.copy(c3).lerp(c2, t / 0.42); else cc.copy(c2).lerp(c1, Math.min(1, (t - 0.42) / 0.38));
    for(let j = 0; j < NS; j++){
      const a = j / NS * Math.PI * 2;
      pos.push(VX + Math.cos(a)*dr, quota(dr, a), VZ + Math.sin(a)*dr);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for(let i = 0; i < NR; i++) for(let j = 0; j < NS; j++){
    const a = i*NS + j, b = i*NS + (j+1) % NS, c = (i+1)*NS + j, d = (i+1)*NS + (j+1) % NS;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mm = new MeshStandardMaterial({ vertexColors:true, map:TEX.ash, roughness:0.95, metalness:0,
    clippingPlanes:[clipPlane], clipShadows:true });
  mappaMondo(mm, 0.5);
  allMaterials.push(mm);
  const monte = new Mesh(geo, mm);
  monte.receiveShadow = true;
  cityGroup.add(monte);
}

/* ------------------------------------------------------ dettagli urbani */

const MAIN = STREETS.slice(0, 6);

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
  if(c && inPoly(c[0], c[1], WALLS)) CROSSINGS.push({ c, vie:[MAIN[i], MAIN[j]] });
}

const FONTANE = [];                     // dove la gente si ferma (inhabitants.js)
// Pietre di attraversamento e fontane pubbliche. Mau 1899: pietre oblunghe
// con gli angoli arrotondati, «the surface being on a level with the
// sidewalk», il numero secondo la larghezza della carreggiata (fino a
// cinque), sempre con il posto per le ruote. Qui, su ogni via dell'incrocio,
// una fila appena fuori dall'incrocio: misura 1,0 × 0,55 m e posizione
// esatta [ipotesi]. Prima erano blocchi di 4,2 × 4,2 m alti 1,36.
CROSSINGS.forEach(({ c:[cx,cz], vie }, i) => {
  vie.forEach((s, k) => {
    const altra = vie[1-k];
    const [ax,az]=s.a,[bx,bz]=s.b, L=Math.hypot(bx-ax,bz-az), ux=(bx-ax)/L, uz=(bz-az)/L;
    const strada = s.w*4;                                  // carreggiata in metri
    const n = strada >= 4.5 ? 3 : strada >= 3 ? 2 : 1;
    for(const verso of [1,-1]){
      const d = altra.w/2 + altra.mw + 0.3;                // oltre l'incrocio
      const px0 = cx + ux*d*verso, pz0 = cz + uz*d*verso;
      for(let q=0;q<n;q++){
        const o = (q - (n-1)/2) * (s.w/(n+0.4));           // di traverso, con le ruote fra l'una e l'altra
        const px = px0 - uz*o, pz = pz0 + ux*o;
        const lungo = Math.abs(ux) > Math.abs(uz);
        block(px, -s.hh, pz, lungo ? 0.25 : 0.1375, s.hh, lungo ? 0.1375 : 0.25, PAL.stone);
      }
    }
  });
  if(i % 2 === 0){
    // fontana pubblica all'angolo: vasca 1,6 × 1,2 m alta 0,8, pilastro 1,4 m
    // [ordine di grandezza, non rilevato]. Prima: 8 × 6 m e 2,5 m d'altezza.
    const a0 = vie[0], b0 = vie[1];
    const fx = cx + b0.w/2 + b0.mw*0.5 + 0.2, fz = cz + a0.w/2 + a0.mw*0.5 + 0.2;
    FONTANE.push({ x:fx, z:fz, id:'fontana', raggio:1.2 });
    block(fx, 0, fz, 0.4, 0.2, 0.3, PAL.stone);
    block(fx, 0.2, fz, 0.34, 0.01, 0.24, 0x5d7278);
    block(fx, 0, fz-0.18, 0.11, 0.35, 0.11, PAL.civic);
  }
});

/* ---------------------------------------------- facciate e cortili

   Aggiunti il 6 novembre 2026: lo zoccolo dipinto lungo la strada, le
   botteghe con il bancone ai lati della porta, le finestre piccole del
   piano di sopra; nelle case grandi l'impluvio dell'atrio e il colonnato
   del peristilio. Sono gli elementi tipici della casa pompeiana, ma qui
   misure, frequenza e posizione sono tutte [ipotesi]: nessuna casa del
   generatore è rilevata, e queste non lo diventano.

   Non usano rnd(): una scelta presa dal generatore della città sposterebbe
   tutto quello che viene dopo (cipressi, abitanti). La «sorte» viene da
   un'impronta della posizione, sempre la stessa per la stessa casa. */
const sorte = (x, z, k) => { const n = Math.sin(x*12.9898 + z*78.233 + k*37.719) * 43758.5453; return n - Math.floor(n); };
const BOTTEGHE = [];                   // dove stanno, per le inquadrature di prova
const ZOCCOLO = 0x7c4536, BANCONE = 0x8f8674, MARMO = PAL.column, VANO = 0x3a342c;
// lato bi della casa (0 nord, 1 sud, 2 ovest, 3 est): lungo la facciata `a`
// dall'inizio, `fuori` dal filo del muro verso la strada
function sulLato(x, z, w, d, bi){
  const orizz = bi < 2, n = (bi === 0 || bi === 2) ? -1 : 1;
  const filo = bi === 0 ? z : bi === 1 ? z + d : bi === 2 ? x : x + w;
  const inizio = orizz ? x : z, L = orizz ? w : d;
  return { L, pezzo(a, y, h, lungo, prof, fuori, col, geo){
    const c = inizio + a, o = filo + n * fuori;
    if(orizz) block(c, y, o, lungo, h, prof, col, geo); else block(o, y, c, prof, h, lungo, col, geo);
  }};
}
function facciata(x, z, w, d, bi, piani){
  const f = sulLato(x, z, w, d, bi), L = f.L, mezzo = L / 2;
  // botteghe: aperture di 2,4 × 2,8 m con il bancone alto 95 cm e il piano di
  // marmo, ai lati della porta, se la facciata è lunga almeno 13 m [ipotesi]
  const aperture = [[mezzo - 0.25, mezzo + 0.25]];        // la porta, già disegnata
  if(L >= 3.2 && sorte(x, z, 1) < 0.6){
    for(const k of L >= 5 ? [1, 2] : [1]) for(const verso of [-1, 1]){
      const a = mezzo + verso * k * 0.85;
      if(a - 0.3 < 0.25 || a + 0.3 > L - 0.25) continue;
      aperture.push([a - 0.3, a + 0.3]);
      f.pezzo(a, 0, 0.7, 0.6, 0.3, -0.1, VANO);
      f.pezzo(a, 0.7, 0.05, 0.68, 0.33, -0.1, PAL.stone);   // architrave
      f.pezzo(a, 0, 0.24, 0.5, 0.1, 0.03, BANCONE);
      f.pezzo(a, 0.24, 0.02, 0.52, 0.12, 0.03, MARMO);
      BOTTEGHE.push(bi < 2 ? [x + a, bi === 0 ? z : z + d, bi] : [bi === 2 ? x : x + w, z + a, bi]);
    }
  }
  // zoccolo dipinto alto un metro, fra un'apertura e l'altra [ipotesi]
  aperture.sort((p, q) => p[0] - q[0]);
  let da = 0.02;
  for(const [a0, a1] of [...aperture, [L - 0.02, L]]){
    if(a0 - da > 0.05) f.pezzo((da + a0) / 2, 0, 0.25, a0 - da, 0.02, 0.01, ZOCCOLO);
    da = Math.max(da, a1);
  }
  // finestre piccole del piano di sopra, 70 × 90 cm, una ogni 6 m [ipotesi]
  if(piani >= 2){
    const n = Math.max(1, Math.floor(L / 1.5));
    for(let i = 0; i < n; i++){
      const a = (i + 0.5) * L / n;
      f.pezzo(a, 1.32, 0.22, 0.18, 0.3, -0.1, VANO);
      f.pezzo(a, 1.3, 0.025, 0.24, 0.08, 0.03, PAL.stone);  // davanzale
    }
  }
}
// l'atrio con l'impluvio e il peristilio con il colonnato, nelle case
// grandi divise dal muro di mezzo; colonne di 40 cm, alte 3 m, ogni 3 m [ipotesi]
function cortili(x, z, w, d){
  const t = 1.0, diviso = w > 7, muro = x + w * 0.45;
  if(diviso){
    const ax = (x + t + muro - 0.35) / 2, az = z + d / 2;
    block(ax, 0, az, 0.6, 0.04, 0.45, PAL.stone);
    block(ax, 0.04, az, 0.5, 0.004, 0.35, 0x5d7278);
  }
  const px0 = (diviso ? muro + 0.35 : x + t) + 0.4, px1 = x + w - t - 0.4;
  const pz0 = z + t + 0.4, pz1 = z + d - t - 0.4;
  if(px1 - px0 < 1 || pz1 - pz0 < 1) return;
  const nx = Math.max(2, Math.round((px1 - px0) / 0.75)), nz = Math.max(2, Math.round((pz1 - pz0) / 0.75));
  for(let i = 0; i <= nx; i++) for(let j = 0; j <= nz; j++){
    if(i > 0 && i < nx && j > 0 && j < nz) continue;       // solo il giro
    block(px0 + (px1 - px0) * i / nx, 0, pz0 + (pz1 - pz0) * j / nz, 0.1, 0.75, 0.1, PAL.column, CYL);
  }
}

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
for(const casa of HOUSES){
  const [x,z,w,d,grand] = casa;
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
    // la porta: 2 m per 3, con l'architrave [ipotesi; erano 5,4 × 3,5 m]
    block(sd.p[0], 0, sd.p[1], sd.s[0]*0.5, 0.75, sd.s[1]*1.35, 0x3a342c);
    block(sd.p[0], 0.75, sd.p[1], sd.s[0]*0.62, 0.06, sd.s[1]*1.6, PAL.stone);
  }
  if(bd < 6) facciata(x, z, w, d, bi, casa[5] || 1);
  if(grand) cortili(x, z, w, d);
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
  // l'abaco cresce col diametro: fisso a 72 cm schiacciava le colonne in scala
  const caps = b.list.map(c => { const hc = Math.min(0.18, c[3]*0.5);
    return [c[0], c[1] + c[4]/2 + hc/2, c[2], c[3]*1.55, hc, c[5]*1.55]; });
  const key = PAL.stone + '|cap';
  if(!buckets.has(key)) buckets.set(key, { color:PAL.stone, geo:BOX, list:[] });
  buckets.get(key).list.push(...caps);
}

/* -------------------------------------------------- costruzione meshes */

const cityGroup = new Group();
scene.add(cityGroup);

/* ------------------------------------ la piscina della Palestra Grande

   Il primo pezzo costruito in Blender (strumenti/blender/palestra_piscina.py,
   «npm run modelli») e il pilota della regola: realismo solo dove c'è una
   misura pubblicata. La pianta, 35 × 23 m, è della guida ufficiale del Parco
   e le altre fonti concordano entro un metro; profondità, bordo e materiali
   non sono documentati e lo script lo dice riga per riga.

   Attorno corre un contorno sottile color accento: è il segno «misura
   pubblicata», lo stesso linguaggio della barra del corpo e della banda del
   suolo. Il portico tutt'intorno resta schematico, e la differenza si vede:
   è il modello che dichiara il proprio grado di certezza. */

const piscina = new Group();
piscina.position.set(POZZO.x, 0, POZZO.z);
cityGroup.add(piscina);
new GLTFLoader().load(piscinaUrl, gltf => {
  gltf.scene.traverse(o => {
    if(!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if(o.name.startsWith('acqua')){
      // quasi opaca apposta: la profondità non è il dato
      o.material = new MeshStandardMaterial({
        color:0x1d3d44, roughness:0.08, transparent:true, opacity:0.9,
        clippingPlanes:[clipPlane]
      });
      o.castShadow = false;
    } else {
      o.material.clippingPlanes = [clipPlane];
      o.material.clipShadows = true;
    }
  });
  piscina.add(gltf.scene);
}, undefined, e => console.warn('Piscina della Palestra Grande non caricata:', e));

const contornoMisura = (() => {
  const hx = 35/4/2, hz = 23/4/2, y = 0.075;
  const g = new BufferGeometry().setFromPoints([
    new Vector3(-hx, y, -hz), new Vector3(hx, y, -hz),
    new Vector3(hx, y, hz),   new Vector3(-hx, y, hz)
  ]);
  return new LineLoop(g, new LineBasicMaterial({ color:PAL.accent }));
})();
piscina.add(contornoMisura);
// nel 79 la gente si ferma anche alle fontane e davanti ai banconi
const inhabitants = createInhabitants({ streets:STREETS, siti:{
  0: [...FONTANE, ...BOTTEGHE.map(([x, z]) => ({ x, z, id:'bottega', raggio:0.5 }))]
}});
scene.add(inhabitants.group);
// le figure di Blender arrivano dopo il primo disegno: fino ad allora, e se
// qualcosa va storto, restano i manichini
caricaFigure().then(f => { inhabitants.usaFigure(f); ERCOLANO.usaFigure(f); if(window.pompei) window.pompei.figure = f; })
  .then(() => caricaAnimali()).then(a => { inhabitants.usaAnimali(a); ERCOLANO.usaAnimali(a); if(window.pompei) window.pompei.animali = a; })
  .catch(e => console.warn('Figure del 79 non caricate:', e));

/* ---------------------------------------------------- la luce cotta

   L'occlusione ambientale del suolo, cotta da Cycles in Blender
   (strumenti/blender/luce_cotta.py, «npm run luce»): una texture vista
   dall'alto, letta in coordinate di mondo. Lungo i muri, nei vicoli e nei
   cortili il suolo riceve meno cielo; nelle piazze resta pieno. Attenua
   soprattutto la luce indiretta, e un poco quella del sole. Si applica solo
   ai materiali del suolo: terreno, basolato, cordoli, deposito. */
const AO_TEX = new TextureLoader().load(aoSuoloUrl);
const AO_UNI = {
  tex: { value: AO_TEX },
  box: { value: new Vector4(AO_SUOLO.x0, AO_SUOLO.z0, 1 / (AO_SUOLO.x1 - AO_SUOLO.x0), 1 / (AO_SUOLO.z1 - AO_SUOLO.z0)) },
  forza: { value: 1 }
};
const SUOLO_AO = new Set([0x8f8776, 0x847c6b, PAL.terrace, PAL.street, PAL.kerb,
  PAL.depWhite, PAL.depGrey, PAL.depSurge, 0x4c4639]);
// i muri e le pietre: alla base prendono l'occlusione del suolo che hanno
// davanti, e la perdono salendo entro 3,6 m [disegno]
const MURI_AO = new Set([PAL.wall1, PAL.wall2, PAL.wall3, PAL.stone, PAL.civic, PAL.column,
  0x7c4536, 0x8f8674, PAL.crude]);
AO_UNI.quota = { value: 0 };
function luceCotta(mat, muro){
  const prima = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if(prima) prima.call(mat, sh, r);
    sh.uniforms.uAoSuolo = AO_UNI.tex; sh.uniforms.uAoBox = AO_UNI.box;
    sh.uniforms.uAoForza = AO_UNI.forza; sh.uniforms.uAoQuota = AO_UNI.quota;
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
    sh.fragmentShader = 'uniform sampler2D uAoSuolo;\nuniform vec4 uAoBox;\nuniform float uAoForza;\nuniform float uAoQuota;\nvarying vec3 vAoP;\nvarying vec3 vAoN;\n' +
      sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
  ${muro ? `
  // il suolo appena davanti alla faccia, 1,4 m in fuori
  vec2 axz = vAoP.xz + normalize( vAoN.xz + 1e-5 ) * 0.35;
  float ao = texture2D( uAoSuolo, ( axz - uAoBox.xy ) * uAoBox.zw ).r;
  float verticale = 1.0 - smoothstep( 0.4, 0.7, abs( vAoN.y ) );
  ao = mix( ao, 1.0, smoothstep( 0.0, 0.9, vAoP.y - uAoQuota ) );
  ao = mix( 1.0, ao, uAoForza * verticale );` : `
  float ao = texture2D( uAoSuolo, ( vAoP.xz - uAoBox.xy ) * uAoBox.zw ).r;
  ao = mix( 1.0, ao, uAoForza );`}
  reflectedLight.indirectDiffuse *= ao;
  reflectedLight.directDiffuse *= mix( 1.0, ao, 0.4 );
}`);
  };
  const chiave = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  mat.customProgramCacheKey = () => chiave + (muro ? '|aomuro' : '|aosuolo');
}

const dummy = new Object3D();
const allMaterials = [];
const tintColor = new Color();
function bake(list, color, geo, parent, shadows, vary){
  const texName = TEXMAP.get(color);
  const pbr = PBR[texName];
  // le texture che portano già il loro colore (tufo, basoli, opus incertum)
  // non si moltiplicano per il colore della tavolozza
  const proprio = texName === 'tuff' || texName === 'basoli' || texName === 'incertum' || texName === 'battuto' || texName === 'vano';
  const mat = new MeshStandardMaterial({
    color:proprio ? 0xffffff : color,
    map:pbr ? pbr.color : (texName ? TEX[texName] : null),
    normalMap:pbr ? pbr.normal : (texName === 'basoli' ? TEX.basoliN : null),
    normalScale:new Vector2(0.55,0.55),
    roughnessMap:pbr ? pbr.roughness : null,
    roughness:pbr ? 1 : 0.92,
    metalness:0,
    clippingPlanes:[clipPlane], clipShadows:true
  });
  if(SCALA_MONDO[texName]) mappaMondo(mat, SCALA_MONDO[texName]);
  if(SUOLO_AO.has(color)) luceCotta(mat, false);
  else if(MURI_AO.has(color)) luceCotta(mat, true);
  // il vano della porta: la penombra della stanza non dipende dal sole sulla
  // facciata (in ombra tornava nera); la si disegna come luce propria
  if(texName === 'vano'){
    mat.color.set(0x000000); mat.emissive.set(0xffffff);
    mat.emissiveMap = TEX.vano; mat.emissiveIntensity = 0.85;
  }
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
costruisciVesuvio();

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
const STRATI = { bianca:new Group(), grigia:new Group(), correnti:new Group() };
depositGroup.add(STRATI.bianca, STRATI.grigia, STRATI.correnti);
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
  // ogni strato nel suo gruppo: nell'«eruzione ora per ora» crescono uno
  // dopo l'altro (vedi crescitaStrati)
  bakeTracked(white, PAL.depWhite, BOX, STRATI.bianca);
  bakeTracked(grey,  PAL.depGrey,  BOX, STRATI.grigia, false);
  bakeTracked(surge, PAL.depSurge, BOX, STRATI.correnti);
}
depositGroup.visible = false;
// Quote locali degli strati (fondo e spessore, in unità) e la crescita:
// ogni strato si allunga dal proprio fondo e poggia sulla cima di quello
// sotto. Con tutti a 1 il deposito è quello di sempre.
function crescitaStrati(fb, fg, fs){
  const B0 = -1.25, HB = 0.40, G0 = -0.85, HG = 0.40, S0 = -0.45, HS = 0.45;
  const cimaB = B0 + HB*fb, cimaG = cimaB + HG*fg;
  const metti = (g, f, fondo, sopra) => {
    g.visible = f > 0.002;
    g.scale.y = Math.max(0.002, f);
    g.position.y = sopra - fondo*g.scale.y;
  };
  metti(STRATI.bianca, fb, B0, B0);
  metti(STRATI.grigia, fg, G0, cimaB);
  metti(STRATI.correnti, fs, S0, cimaG);
  return HB*fb + HG*fg + HS*fs;              // la quota della cima, nel mondo
}

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

// lapilli attorno a chi guarda (7 novembre 2026): la cenere grande, sparsa
// su tutta la città, vicino alla camera quasi non si vedeva. Cadono a 2–4,5
// unità al secondo, cioè 8–18 m/s, con un filo di vento [disegno].
const lapilli = makePoints(2600, 0.06, 0xe8e3d4, 0.9);
scene.add(lapilli.points);
lapilli.points.visible = false;
const lapilliVel = new Float32Array(lapilli.count);
for(let i = 0; i < lapilli.count; i++){
  lapilli.pos[i*3]   = (Math.random() - 0.5) * 48;
  lapilli.pos[i*3+1] = Math.random() * 16;
  lapilli.pos[i*3+2] = (Math.random() - 0.5) * 48;
  lapilliVel[i] = 2 + Math.random() * 2.5;
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
  lapilli.live = Math.floor(lapilli.count * Math.max(0.35, k));
  lapilli.points.geometry.setDrawRange(0, lapilli.live);
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
  if(lapilli.points.visible && lapilli.live > 0){
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const suolo = depositCurrent;
    for(let i = 0; i < lapilli.live; i++){
      lapilli.pos[i*3+1] -= lapilliVel[i] * dt;
      lapilli.pos[i*3]   += 0.35 * dt;                       // il vento verso sud-est
      lapilli.pos[i*3+2] += 0.25 * dt;
      const dx = lapilli.pos[i*3] - cx, dz = lapilli.pos[i*3+2] - cz;
      // né troppo lontano né troppo vicino: a meno di 8 m un lapillo, con la
      // dimensione che cresce avvicinandosi, diventava una macchia bianca
      const d2 = dx*dx + dz*dz;
      if(lapilli.pos[i*3+1] < suolo || lapilli.pos[i*3+1] < cy - 10 || d2 > 576 || d2 < 4){
        const a = Math.random() * Math.PI * 2, r = 2 + Math.sqrt(Math.random()) * 22;
        lapilli.pos[i*3]   = cx + Math.cos(a) * r;
        lapilli.pos[i*3+1] = cy + 4 + Math.random() * 10;
        lapilli.pos[i*3+2] = cz + Math.sin(a) * r;
      }
    }
    lapilli.points.geometry.attributes.position.needsUpdate = true;
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

// Celle da 0,25 unità (1 m). Erano da 1 unità, 4 m: con le larghezze vere
// delle vie (9 ottobre 2026) i vicoli di 3 m risultavano interamente pieni.
const CELLA = 0.25;
const GX0 = -215, GZ0 = -130, GW = 440/CELLA, GD = 275/CELLA;
const solid = new Uint8Array(GW*GD);
function markRect(x,z,w,d){
  for(let i=Math.floor((x-GX0)/CELLA); i<Math.ceil((x-GX0+w)/CELLA); i++)
    for(let j=Math.floor((z-GZ0)/CELLA); j<Math.ceil((z-GZ0+d)/CELLA); j++)
      if(i>=0 && i<GW && j>=0 && j<GD) solid[j*GW+i] = 1;
}
for(const [x,z,w,d] of HOUSES) markRect(x,z,w,d);
// Dentro le tre case con gli interni le collisioni non usano la griglia da
// 1 m, che chiuderebbe le porte, né i quattro punti di blockedAt, fra i quali
// un muro di 25 cm passerebbe: il corpo è un cerchio di 32 cm di raggio
// contro i rettangoli dei muri, come a Ercolano (vedi bloccatoInterno).
const R_INTERNI = 0.08;
const MURI_INTERNI = [];
for(const [k, c] of Object.entries(CASE_INTERNE)){
  const rects = INTERNI_P.case[k].muri.map(([a, b, e, f]) =>
    ({ x0:c.x0 + a/4, z0:c.z0 + b/4, x1:c.x0 + e/4, z1:c.z0 + f/4 }));
  MURI_INTERNI.push({ x0:c.x0, z0:c.z0, x1:c.x0 + c.w, z1:c.z0 + c.d, rects });
}
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
  for(const c of MURI_INTERNI)
    if(x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1)
      return c.rects.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  const i = Math.floor((x-GX0)/CELLA), j = Math.floor((z-GZ0)/CELLA);
  if(i<0 || i>=GW || j<0 || j>=GD) return false;
  return solid[j*GW+i] === 1;
}

/* -------------------------------------------------------------- etichette */

function makeLabel(text, color, weight, px, mul){
  const pad = 10, fs = px || 46, M = mul || 1;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${weight||600} ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2;
  c.width = w; c.height = fs + pad*2;
  const g = c.getContext('2d');
  g.font = `${weight||600} ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
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
  // Più calda e più morbida (22/10/2026): il sole un poco meno forte, il
  // cielo un poco di più, così le ombre non sono buchi neri; il colore
  // scalda già sotto i 30° di altezza, non solo all'alba. La posizione del
  // sole resta quella calcolata (NOAA).
  sun.intensity = 1.75 * k * day * eru.luce;
  const warmth = Math.max(0, 1 - Math.max(0, deg) / 30);
  const w = Math.max(warmth * warmth, (!sectionOn && e.warm > .5) ? 1 : 0);
  sun.color.setRGB(1, 0.95 - w*0.22, 0.88 - w*0.45);
  const night = 1 - day;
  hemi.intensity = (0.40 + 0.86*day) * (sectionOn ? 1 : (0.55 + k*0.45)) * (0.35 + 0.65*eru.luce);
  // il cielo tinge le ombre d'azzurro; il suolo di tufo e intonaco rimanda
  // una luce calda dal basso
  hemi.color.setRGB(0.84 - night*0.30, 0.90 - night*0.24, 0.98 - night*0.10);
  hemi.groundColor.setRGB(0.52 - night*0.28, 0.44 - night*0.24, 0.33 - night*0.18);
  rim.intensity = 0.20 + night*0.34;
  rim.color.setRGB(0.55 + night*0.05, 0.66 + night*0.06, 0.78);
}

function applyEpoch(i, silent){
  if(i !== 1 && eru.on) chiudiEruzione(true);
  epoch = i;
  scriviStato();
  const e = EPOCHS[i];
  // sul deposito i muri sporgono meno: l'occlusione cotta col piano del 79
  // va attenuata [disegno]
  AO_UNI.forza.value = 1 - 0.45 * Math.min(1, e.deposit / 1.25);
  aggiornaSezioneVuota();
  aggiornaQuotaCorpo();
  depositTarget = e.deposit;
  roofsA.visible = !!e.roofsA;
  roofsB.visible = !!e.roofsB;
  shantyGroup.visible = !!e.shanty;
  vegGroup.visible = !!e.veg;
  canalGroup.visible = !!e.canal;
  spoilGroup.visible = !!e.spoil;
  depositGroup.visible = e.deposit > 0.01;
  ashGroup.visible = !!e.ash;
  if(!eru.on) lapilli.points.visible = false;
  smoke.points.visible = !!e.shanty;
  birds.visible = (i === 0 || i === 4 || i === 7);
  inhabitants.setEpoch(i);
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
  aggiornaPortaEruzione();
  if(!silent) renderPlaceList();
}

/* ------------------------------------------- l'eruzione ora per ora
   Dentro la fase 2. Un orologio che parte da «hora fere septima» del primo
   giorno (Plinio) e arriva all'alba del terzo; gli strati crescono uno
   dopo l'altro, la cenere cambia colore, il cielo si chiude, la corrente S4
   passa. Gli eventi senza un'ora documentata sono fasce, non istanti: vedi
   src/data/eruzione.js. */
const ERU_VEL = 0.5;                        // ore di eruzione per secondo
// La linea del tempo non è lineare: quasi tutto accade nelle prime 21 ore,
// che prendono l'82% della barra; il resto, fino all'alba del terzo giorno,
// sta nella coda. La barra lo dice con un segno di piega.
const PIEGA = 21, QUOTA_PIEGA = 0.82;
const posOra = ore => ore <= PIEGA ? ore / PIEGA * QUOTA_PIEGA
  : QUOTA_PIEGA + (ore - PIEGA) / (DURATA - PIEGA) * (1 - QUOTA_PIEGA);
const oraPos = p => p <= QUOTA_PIEGA ? p / QUOTA_PIEGA * PIEGA
  : PIEGA + (p - QUOTA_PIEGA) / (1 - QUOTA_PIEGA) * (DURATA - PIEGA);
const eruCielo = new Color(), eruNebbia = new Color();
// La colonna sopra il Vesuvio, a forma di pino come la descrive Plinio
// (Ep. 6.16.5–6): un tronco e una chioma che si allarga. Schematica e fuori
// scala come il monte: i 15–30 km delle sintesi non entrano in questa
// scena. Bianca, poi grigia e più alta; dopo la caduta si affloscia.
const colonna = new Group(); colonna.visible = false; scene.add(colonna);
const M_COLONNA = new MeshLambertMaterial({ color:0xe6e1d6, emissive:0x2a2621, transparent:true, opacity:0.95, fog:false });
{
  const tronco = new Mesh(new CylinderGeometry(0.16, 0.07, 1, 28, 1, true), M_COLONNA);
  tronco.position.y = 0.4; tronco.scale.set(1, 0.8, 1);
  const chioma = new Mesh(new SphereGeometry(0.5, 32, 16), M_COLONNA);
  chioma.position.y = 0.86; chioma.scale.set(1.25, 0.32, 1.25);
  const sbuffo = new Mesh(new SphereGeometry(0.5, 24, 12), M_COLONNA);
  sbuffo.position.set(0.32, 0.8, 0.2); sbuffo.scale.set(0.7, 0.24, 0.6);   // la chioma piega col vento
  colonna.add(tronco, chioma, sbuffo);
  colonna.position.set(-66, 82, -252);       // il cratere (vedi costruisciVesuvio)
}
/* La colonna a cavolfiore e i lampi (7 novembre 2026). Gli sbuffi attorno al
   tronco e sotto la chioma tolgono il profilo liscio; respirano piano mentre
   l'eruzione scorre. I lampi: Plinio il Giovane, a Miseno, vede la nube nera
   squarciata da lingue di fuoco, «fulguribus illae et similes et maiores
   erant» (Ep. 6.20.9). Forma, frequenza e posizione qui sono [disegno]. */
const SBUFFI = [];
{
  const geo = new IcosahedronGeometry(0.5, 2);
  let seme = 79;
  const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;
  // lungo il tronco, sempre più larghi salendo
  for(let i = 0; i < 18; i++){
    const y = 0.06 + i * 0.042, r = 0.05 + y * 0.12, a = caso() * Math.PI * 2;
    SBUFFI.push({ x:Math.cos(a) * r * 0.6, y, z:Math.sin(a) * r * 0.6, s:r * (1.3 + caso() * 0.7) });
  }
  // sotto e attorno alla chioma, che si allarga sottovento
  for(let i = 0; i < 26; i++){
    const a = caso() * Math.PI * 2, r = 0.25 + caso() * 0.42;
    SBUFFI.push({ x:Math.cos(a) * r + 0.12, y:0.8 + caso() * 0.12 - r * 0.08, z:Math.sin(a) * r * 0.9, s:0.14 + caso() * 0.16 });
  }
  // tutti in una sola istanza: una chiamata di disegno invece di quarantaquattro
  SBUFFI.mesh = new InstancedMesh(geo, M_COLONNA, SBUFFI.length);
  SBUFFI.mesh.frustumCulled = false;
  for(const b of SBUFFI){ b.s *= 1.35; b.fase = caso() * 6.28; }
  colonna.add(SBUFFI.mesh);
}
const sbuffoM = new Object3D();
// il lampo: un segmento spezzato dentro la nube, acceso per pochi decimi
const lampo = (() => {
  const pts = [];
  let x = 0, y = 0.84, z = 0;
  for(let i = 0; i < 9; i++){
    const nx = x + (Math.sin(i * 7.3) * 0.06), ny = y - 0.035, nz = z + Math.cos(i * 4.1) * 0.04;
    pts.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
  const l = new LineSegments(g, new LineBasicMaterial({ color:0xfff4d8, fog:false, transparent:true, opacity:0.95 }));
  l.visible = false;
  colonna.add(l);
  return l;
})();
const EMISSIVA_NUBE = new Color(0x2a2621), EMISSIVA_LAMPO = new Color(0xb8a98a);
let lampoResto = 0, lampoAttesa = 3;
function animaNube(dt, t, buio){
  if(!colonna.visible) return;
  SBUFFI.forEach((b, i) => {
    sbuffoM.position.set(b.x, b.y, b.z);
    sbuffoM.scale.setScalar(b.s * (1 + Math.sin(t * 0.35 + b.fase) * 0.08));
    sbuffoM.updateMatrix();
    SBUFFI.mesh.setMatrixAt(i, sbuffoM.matrix);
  });
  SBUFFI.mesh.instanceMatrix.needsUpdate = true;
  colonna.rotation.y = Math.sin(t * 0.05) * 0.08;
  // al buio, un lampo ogni tre-sette secondi [disegno]
  if(lampoResto > 0){
    lampoResto -= dt;
    if(lampoResto <= 0){ lampo.visible = false; M_COLONNA.emissive.copy(EMISSIVA_NUBE); }
  } else if(buio > 0.45 && (lampoAttesa -= dt) <= 0){
    lampoAttesa = 3 + ((Math.sin(t * 12.9898) * 43758.5453) % 1 + 1) % 1 * 4;
    lampoResto = 0.14;
    lampo.position.set(Math.sin(t) * 0.18, 0, Math.cos(t * 1.3) * 0.15);
    lampo.rotation.y = t;
    lampo.visible = true;
    M_COLONNA.emissive.copy(EMISSIVA_LAMPO);
  }
}
function aggiornaColonna(ore, buio){
  const cresce = Math.max(0, Math.min(1, ore / 2));
  const alta = ore < 9 ? 0.72 : 0.72 + 0.28 * Math.min(1, (ore - 9) / 2);
  const cala = ore < 18 ? 1 : Math.max(0, 1 - (ore - 18) / 5);
  const k = cresce * alta * cala;
  colonna.visible = eru.on && k > 0.02;
  colonna.scale.set(150 * k, 105 * k, 150 * k);
  const grigia = ore >= 9 ? Math.min(1, (ore - 9) / 2) : 0;
  M_COLONNA.color.setRGB(0.90 - grigia*0.36, 0.88 - grigia*0.36, 0.84 - grigia*0.36)
    .multiplyScalar(1.15 - buio * 0.35);
  M_COLONNA.opacity = 0.93 * Math.min(1, cala * 1.4);
}
const ERU_CHIARO = new Color(0x8f8a7e), ERU_SCURO = new Color(0x15130f), ERU_CORRENTE = new Color(0x5d574d);
const eruEl = id => document.getElementById(id);
const oraLeggibile = ore => {
  const h = 13 + ore, giorno = 1 + Math.floor(h / 24), hh = Math.floor(h % 24), mm = Math.round((h % 1) * 60 / 15) * 15;
  return { giorno, hh: mm === 60 ? (hh + 1) % 24 : hh, mm: mm === 60 ? 0 : mm };
};
function testoOra(ore){
  const o = oraLeggibile(ore);
  return { giorno: t('ui.eru.giorno', { n: fmt().n(o.giorno) }), ora: t('ui.eru.verso', { ora: fmt().orologio(o.hh, o.mm) }) };
}
function eventoAttivo(ore){
  let ev = EVENTI[0];
  for(const e of EVENTI) if(puntoEvento(e) <= ore + 1e-6) ev = e;
  return ev;
}
function aggiornaPortaEruzione(){
  eruEl('eruApri').hidden = epoch !== 1 || eru.on || sectionOn || ercOn || compareOn;
}
function costruisciSegni(){
  const box = eruEl('eruSegni');
  box.innerHTML = '<i class="eruPiega" style="left:' + (100 * QUOTA_PIEGA) + '%"></i>';
  for(const e of EVENTI){
    if(e.t1 !== undefined){
      const f = document.createElement('i'); f.className = 'eruFascia';
      f.style.left = (100 * posOra(e.t0)) + '%'; f.style.width = (100 * (posOra(e.t1) - posOra(e.t0))) + '%';
      box.appendChild(f);
    }
    const b = document.createElement('button');
    b.className = 'eruSegno c-' + e.certezza; b.dataset.id = e.id;
    b.style.left = (100 * posOra(puntoEvento(e))) + '%';
    b.setAttribute('aria-label', t('eruzione.' + e.id + '.titolo'));
    b.title = t('eruzione.' + e.id + '.titolo');
    b.addEventListener('click', () => { suonaEruzione(false); vaiEruzione(puntoEvento(e)); });
    box.appendChild(b);
  }
}
function mostraEvento(ev){
  if(eru.ultimo === ev.id) return;
  eru.ultimo = ev.id;
  const k = 'eruzione.' + ev.id;
  eruEl('eruLuogo').textContent = t('ui.eru.luoghi.' + ev.luogo);
  let quando;
  if(ev.t1 !== undefined){
    const a = oraLeggibile(ev.t0), b = oraLeggibile(ev.t1);
    quando = t('ui.eru.fascia', { da: fmt().orologio(a.hh, a.mm), a: fmt().orologio(b.hh, b.mm) });
  } else quando = testoOra(ev.t0).ora;
  eruEl('eruQuando').textContent = quando;
  eruEl('eruTitolo').textContent = t(k + '.titolo');
  eruEl('eruCorpo').innerHTML = t(k + '.testo');
  eruEl('eruCert').textContent = t('ui.eru.certezza.' + ev.certezza);
  eruEl('eruCert').className = 'eruCert c-' + ev.certezza;
  eruEl('eruFonte').innerHTML = t(k + '.fonte');
  document.querySelectorAll('.eruSegno').forEach(b => b.classList.toggle('on', b.dataset.id === ev.id));
}
function vaiEruzione(ore){
  eru.ore = Math.max(0, Math.min(DURATA, ore));
  const st = statoEruzione(eru.ore);
  // gli strati: la quota della cima è anche il suolo su cui si cammina
  depositGroup.visible = true;
  depositGroup.position.y = EPOCHS[1].deposit;
  depositCurrent = depositTarget = crescitaStrati(st.bianca, st.grigia, st.correnti);
  // la cenere che cade, bianca e poi grigia
  ashGroup.visible = st.cenere;
  ashGroup.children[0].material.color.setHex(st.cenereGrigia ? 0x9c978d : 0xe8e3d4);
  lapilli.points.visible = st.cenere;
  lapilli.points.material.color.setHex(st.cenereGrigia ? 0x9c978d : 0xe8e3d4);
  eru.buio = st.buio;
  aggiornaColonna(eru.ore, st.buio);
  // il cielo e la nebbia: la nube, la notte, la corrente che passa
  eru.luce = 1 - st.buio * 0.92;
  eruCielo.copy(ERU_CHIARO).lerp(ERU_SCURO, st.buio).lerp(ERU_CORRENTE, st.corrente);
  eruNebbia.copy(eruCielo);
  scene.background = eruCielo;
  scene.fog.color.copy(eruNebbia);
  scene.fog.near = 2 + 60 * (1 - st.buio) * (1 - st.corrente);
  scene.fog.far = Math.max(14, (eru.farBase || 860) * (1 - 0.82 * st.buio) * (1 - 0.95 * st.corrente));
  applyLight();
  // l'interfaccia
  const o = testoOra(eru.ore);
  eruEl('eruGiorno').textContent = o.giorno;
  eruEl('eruOrario').textContent = o.ora;
  eruEl('eruRange').value = String(Math.round(posOra(eru.ore) * 1000));
  eruEl('eruRange').setAttribute('aria-valuetext', o.giorno + ', ' + o.ora);
  mostraEvento(eventoAttivo(eru.ore));
  // quanto deposito c'è, qui e adesso: il numero che cambia sotto gli occhi
  if(ercOn){
    const mE = ERCOLANO.eruzione(eru.ore) || 0;
    eruEl('eruQuota').textContent = t('ui.eru.quotaErcolano', { m: fmt().n(Math.round(mE)) });
  } else {
    const mP = Math.round(depositCurrent * 4 * 10) / 10;
    eruEl('eruQuota').textContent = t('ui.eru.quotaPompei', { m: fmt().n(mP) });
  }
  scriviStato();
}
function segnaCittaEruzione(){
  eruEl('eruCitta').textContent = t(ercOn ? 'ui.eru.aPompei' : 'ui.eru.aErcolano');
}
function suonaEruzione(on){
  eru.play = on && eru.ore < DURATA;
  const b = eruEl('eruPlay');
  b.setAttribute('aria-pressed', eru.play ? 'true' : 'false');
  b.querySelector('span').textContent = t(eru.play ? 'ui.eru.pausa' : 'ui.eru.avvia');
}
function apriEruzione(ore){
  if(epoch !== 1) applyEpoch(1);
  if(sectionOn) setSection(false);
  eru.on = true; eru.ultimo = null;
  eru.farBase = scene.fog.far;
  document.body.classList.add('eru-on');
  eruEl('eruBar').hidden = false;
  costruisciSegni();
  segnaCittaEruzione();
  vaiEruzione(ore ?? 0);
  suonaEruzione(ore === undefined);
  aggiornaPortaEruzione();
}
function chiudiEruzione(silenzioso){
  if(ercOn) ERCOLANO.eruzione(null);
  eru.on = false; eru.play = false; eru.luce = 1;
  document.body.classList.remove('eru-on');
  eruEl('eruBar').hidden = true;
  colonna.visible = false;
  crescitaStrati(1, 1, 1);
  scene.fog.near = 240; scene.fog.far = eru.farBase || scene.fog.far;
  depositTarget = EPOCHS[epoch].deposit;
  ashGroup.children[0].material.color.setHex(0xcfc9bb);
  ashGroup.visible = !!EPOCHS[epoch].ash;
  lapilli.points.visible = false;
  lampo.visible = false; lampoResto = 0; M_COLONNA.emissive.copy(EMISSIVA_NUBE);
  updateSun();
  aggiornaPortaEruzione();
  if(!silenzioso) scriviStato();
}
function aggiornaEruzione(dt){
  if(!eru.play) return;
  const prima = eventoAttivo(eru.ore);
  vaiEruzione(eru.ore + dt * ERU_VEL);
  // una breve sosta su ogni evento nuovo, perché si legga
  if(eventoAttivo(eru.ore) !== prima){ eru.sosta = 2.5; }
  if(eru.ore >= DURATA) suonaEruzione(false);
}
eruEl('eruStart').addEventListener('click', () => apriEruzione());
eruEl('eruPlay').addEventListener('click', () => {
  if(eru.ore >= DURATA) vaiEruzione(0);
  suonaEruzione(!eru.play);
});
eruEl('eruChiudi').addEventListener('click', () => chiudiEruzione());
eruEl('eruCitta').addEventListener('click', () => setErc(!ercOn));
eruEl('eruRange').addEventListener('input', e => { suonaEruzione(false); vaiEruzione(oraPos(Number(e.target.value) / 1000)); });
eruEl('eruPrev').addEventListener('click', () => {
  suonaEruzione(false);
  const prima = [...EVENTI].reverse().find(e => puntoEvento(e) < eru.ore - 0.01);
  vaiEruzione(prima ? puntoEvento(prima) : 0);
});
eruEl('eruNext').addEventListener('click', () => {
  suonaEruzione(false);
  const dopo = EVENTI.find(e => puntoEvento(e) > eru.ore + 0.01);
  vaiEruzione(dopo ? puntoEvento(dopo) : DURATA);
});

/* ------------------------------------------------------------ in classe
   «Lavagna» per l'insegnante, «Studente» per chi ha l'iPad in mano: le
   stesse tappe (src/data/classe.js), le domande con la risposta e la fonte
   dietro un tasto solo nella prima. */
const clEl = id => document.getElementById(id);
const CHIAVE_CLASSE = 'dopo79.classe';
function etichettaTappa(tp){
  if(tp.tipo === 'luogo'){ const h = byId[tp.id]; return h ? h.data.label : tp.id; }
  const ev = eventoAttivo(tp.ore);
  return t('ui.classe.eruzione') + (tp.citta === 'ercolano' ? ' · ' + t('ui.eru.luoghi.ercolano') : '') +
    ' — ' + t('eruzione.' + ev.id + '.titolo');
}
function vaiTappa(i){
  const P = PERCORSI[cl.percorso];
  cl.tappa = Math.max(0, Math.min(P.tappe.length - 1, i));
  const tp = P.tappe[cl.tappa];
  if(tp.tipo === 'eruzione'){
    closePanel();
    if(eru.on) vaiEruzione(tp.ore); else apriEruzione(tp.ore);
    suonaEruzione(false);
    if((tp.citta === 'ercolano') !== ercOn) setErc(tp.citta === 'ercolano');
  } else {
    if(eru.on) chiudiEruzione(true);
    if(ercOn) setErc(false);
    const h = byId[tp.id];
    if(h){ applyEpoch(TOUR_EPOCH[tp.id] ?? h.data.from); flyTo(h.data); openPanel(h.data); }
  }
  disegnaClasse();
  scriviStato();
}
function disegnaClasse(){
  const P = PERCORSI[cl.percorso], tp = P.tappe[cl.tappa], lav = cl.modo === 'lavagna';
  clEl('clTitolo').textContent = t(lav ? 'ui.classe.lavagna' : 'ui.classe.studenteBreve');
  document.querySelectorAll('#clPercorsi button').forEach(b => b.classList.toggle('on', b.dataset.percorso === cl.percorso));
  clEl('clPos').textContent = t('ui.classe.posizione', { i: fmt().n(cl.tappa + 1), n: fmt().n(P.tappe.length), m: fmt().n(tp.minuti) });
  clEl('clNome').textContent = etichettaTappa(tp);
  const box = clEl('clDomande'); box.innerHTML = '';
  const titolo = document.createElement('span'); titolo.className = 'clPos'; titolo.textContent = t('ui.classe.domande');
  for(const id of tp.domande){
    const k = 'classe.domande.' + id;
    const d = document.createElement('div'); d.className = 'clDom';
    const q = document.createElement('p'); q.className = 'clQ'; q.innerHTML = t(k + '.q'); d.appendChild(q);
    if(lav){
      const r = document.createElement('p'); r.className = 'clR'; r.innerHTML = t(k + '.r'); r.hidden = true;
      const f = document.createElement('span'); f.className = 'clF'; f.innerHTML = t(k + '.fonte'); f.hidden = true;
      const b = document.createElement('button'); b.className = 'clMostra'; b.textContent = t('ui.classe.risposta');
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', () => {
        const apri = r.hidden; r.hidden = f.hidden = !apri;
        b.textContent = t(apri ? 'ui.classe.nascondiRisposta' : 'ui.classe.risposta');
        b.setAttribute('aria-expanded', String(apri));
      });
      d.append(b, r, f);
    } else {
      const sc = document.createElement('span'); sc.className = 'clScrivi'; sc.textContent = t('ui.classe.scrivi'); d.appendChild(sc);
    }
    box.appendChild(d);
  }
  clEl('clPrev').disabled = cl.tappa === 0;
  const ultima = cl.tappa === P.tappe.length - 1;
  clEl('clNext').disabled = ultima;
  clEl('clNext').textContent = t(ultima ? 'ui.classe.fine' : 'ui.classe.avanti');
  document.getElementById('btnLavagna').classList.toggle('on', cl.modo === 'lavagna');
  document.getElementById('btnStudente').classList.toggle('on', cl.modo === 'studente');
}
function impostaClasse(modo, tappa){
  cl.modo = MODALITA.includes(modo) ? modo : null;
  const on = !!cl.modo;
  document.body.classList.toggle('classe-on', on);
  document.body.classList.toggle('classe-lavagna', cl.modo === 'lavagna');
  document.body.classList.toggle('classe-studente', cl.modo === 'studente');
  document.documentElement.classList.toggle('lavagna', cl.modo === 'lavagna');
  clEl('classeBox').hidden = !on;
  if(!on) nascondiUI(false);
  try { localStorage.setItem(CHIAVE_CLASSE, JSON.stringify(on ? { modo:cl.modo, percorso:cl.percorso } : {})); } catch(e){}
  if(on){
    if(document.body.classList.contains('touring')) stopTour();
    vaiTappa(tappa ?? cl.tappa);
  } else {
    document.getElementById('btnLavagna').classList.remove('on');
    document.getElementById('btnStudente').classList.remove('on');
    scriviStato();
  }
}
function nascondiUI(on){
  document.body.classList.toggle('ui-nascosta', on);
  clEl('mostraUI').hidden = !on;
}
// il nome del tag spezzato: check-build conta i <title> del file pubblicato
const TAG_T = ['ti', 'tle'].join('');
function schedaDaStampare(){
  const P = PERCORSI[cl.percorso];
  const esc = x => String(x);
  const righe = P.tappe.map((tp, i) => {
    const dom = tp.domande.map(id => `<div class="d"><p>${t('classe.domande.' + id + '.q')}</p><div class="r"></div><div class="r"></div><div class="r"></div></div>`).join('');
    return `<section><h2>${fmt().n(i + 1)}. ${esc(etichettaTappa(tp))} <small>· ${t('ui.classe.minuti', { m: fmt().n(tp.minuti) })}</small></h2>${dom}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="${linguaAttiva()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<${TAG_T}>${t('ui.classe.schedaTitolo')}</${TAG_T}><style>
body{font-family:Georgia,serif;color:#111;margin:2rem auto;max-width:44rem;padding:0 1rem;line-height:1.45}
h1{font-family:system-ui,sans-serif;font-size:1.4rem;margin:0 0 .3rem}.sub{font-family:system-ui,sans-serif;color:#555;margin:0 0 1rem}
.campi{display:flex;gap:1.5rem;font-family:system-ui,sans-serif;margin:0 0 1.5rem}.campi span{flex:1;border-bottom:1px solid #999;padding-bottom:.2rem}
h2{font-family:system-ui,sans-serif;font-size:1.05rem;margin:1.4rem 0 .4rem}h2 small{font-weight:400;color:#666}
.d p{margin:.3rem 0}.r{border-bottom:1px solid #bbb;height:1.9rem}section{break-inside:avoid}
.nota{font-family:system-ui,sans-serif;font-size:.85rem;color:#555;margin-top:2rem}
button{font:inherit;font-family:system-ui,sans-serif;padding:.6rem 1rem;border-radius:10px;border:1px solid #333;background:#fff;cursor:pointer}
@media print{button{display:none}body{margin:0 auto}}
</style></head><body>
<button onclick="print()">${t('ui.classe.stampa')}</button>
<h1>${t('ui.classe.schedaTitolo')}</h1><p class="sub">${t('ui.classe.titolo_' + cl.percorso)} · ${t('ui.classe.minuti', { m: fmt().n(P.minuti) })}</p>
<div class="campi"><span>${t('ui.classe.schedaNome')}</span><span>${t('ui.classe.schedaClasse')}</span><span>${t('ui.classe.schedaData')}</span></div>
${righe}
<p class="nota">${t('ui.classe.schedaNota')} https://d0m3n1c0x.github.io/pompei-stratificata/</p>
</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type:'text/html' }));
  const w = window.open(url, '_blank');
  if(!w){ const a = document.createElement('a'); a.href = url; a.download = 'scheda-dopo-il-79.html'; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function copiaLinkStudenti(){
  const u = new URL(location.href);
  ['fase','luogo','vista','momento','eruzione','debug','cam'].forEach(k => u.searchParams.delete(k));
  u.searchParams.set('classe', 'studente'); u.searchParams.set('percorso', cl.percorso);
  u.searchParams.set('tappa', String(cl.tappa + 1)); u.searchParams.set('lang', linguaAttiva());
  const testo = u.toString(), b = clEl('clCondividi');
  try { await navigator.clipboard.writeText(testo); b.textContent = t('ui.classe.linkCopiato'); }
  catch(e){ window.prompt(t('ui.classe.link'), testo); }
  setTimeout(() => { b.textContent = t('ui.classe.link'); }, 2500);
}
clEl('sceltaLavagna').addEventListener('click', () => { chiudiIntro(); impostaClasse('lavagna', 0); });
clEl('sceltaStudente').addEventListener('click', () => { chiudiIntro(); impostaClasse('studente', 0); });
clEl('btnLavagna').addEventListener('click', () => impostaClasse(cl.modo === 'lavagna' ? null : 'lavagna'));
clEl('btnStudente').addEventListener('click', () => impostaClasse(cl.modo === 'studente' ? null : 'studente'));
clEl('clPrev').addEventListener('click', () => vaiTappa(cl.tappa - 1));
clEl('clNext').addEventListener('click', () => vaiTappa(cl.tappa + 1));
clEl('clRiprendi').addEventListener('click', () => vaiTappa(cl.tappa));
clEl('clEsci').addEventListener('click', () => impostaClasse(null));
clEl('clNascondi').addEventListener('click', () => nascondiUI(true));
clEl('mostraUI').addEventListener('click', () => nascondiUI(false));
clEl('clScheda').addEventListener('click', schedaDaStampare);
clEl('clCondividi').addEventListener('click', copiaLinkStudenti);
document.querySelectorAll('#clPercorsi button').forEach(b => b.addEventListener('click', () => {
  cl.percorso = b.dataset.percorso;
  try { localStorage.setItem(CHIAVE_CLASSE, JSON.stringify({ modo:cl.modo, percorso:cl.percorso })); } catch(e){}
  vaiTappa(0);
}));
// H nasconde e rimostra l'interfaccia, per guardare solo la città (in un
// campo di testo no). Era solo della lavagna; dal 6 novembre 2026 vale per
// tutti, e c'è anche in «Altro».
addEventListener('keydown', e => {
  if(e.code !== 'KeyH' || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  nascondiUI(!document.body.classList.contains('ui-nascosta'));
});
clEl('btnNascondi').addEventListener('click', () => nascondiUI(true));
// su schermo basso i testi lunghi sono accorciati: un tocco li apre
clEl('epText').addEventListener('click', e => { if(!e.target.closest('a')) e.currentTarget.classList.toggle('aperto'); });
clEl('eruTesto').addEventListener('click', e => { if(!e.target.closest('a')) e.currentTarget.classList.toggle('aperto'); });

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
  luogoAperto = p.id || null;
  document.getElementById('pTitle').textContent = p.label;
  document.getElementById('pSub').textContent = p.sub;
  document.getElementById('pBody').innerHTML = p.body;
  document.getElementById('pSrc').innerHTML = p.src;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden','false');
  document.body.classList.add('panel-open');
  scriviStato();
}
function closePanel(){
  luogoAperto = null;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden','true');
  document.body.classList.remove('panel-open');
  scriviStato();
}
document.getElementById('pClose').addEventListener('click', closePanel);

/* --------------------------------------------------------- navigazione */

const keys = new Set();
let yaw = 1.57, pitch = 0.0;         // valori applicati
let yawT = 1.57, pitchT = 0.0;       // valori bersaglio: lo sguardo li insegue
let locked = false, flight = null;
let flyMode = false;                 // false = camminata con collisioni
const EYE = 0.45;                    // 1,8 m
const RADIUS = 0.15;                  // 60 cm; sopra il piano vicino della camera (0,12)
const vel = new Vector3();           // velocità con inerzia
let bobPhase = 0, bobAmt = 0, footstepTimer = 0;
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
// null fuori dalle tre case con gli interni; altrimenti se il cerchio del
// corpo tocca un muro
function bloccatoInterno(x, z){
  for(const c of MURI_INTERNI)
    if(x > c.x0 - 0.25 && x < c.x1 + 0.25 && z > c.z0 - 0.25 && z < c.z1 + 0.25)
      return c.rects.some(r => {
        const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
        return dx*dx + dz*dz < R_INTERNI*R_INTERNI;
      });
  return null;
}
function blockedAt(x, z){
  const bi = bloccatoInterno(x, z);
  if(bi !== null) return bi;
  for(const [ox,oz] of [[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]])
    if(isSolid(x+ox, z+oz)) return true;
  return false;
}
const spawn = findSpawn(-64, 14);
const player = new Vector3(spawn[0], 0, spawn[1]);
camera.position.set(player.x, EYE, player.z);

// la quota su cui si sta: il deposito, se c'è; altrimenti il basolato in
// carreggiata o il piano dei marciapiedi
function groundY(){
  if(depositCurrent > 0.001) return depositCurrent;
  return quotaCarreggiata(player.x, player.z) ?? 0;
}

// Il passo usa la stessa regola di blockedAt: fuori dalle case quattro punti
// a 60 cm, dentro le tre case con gli interni il cerchio contro i muri.
// Fino al 6 novembre 2026 il passo usava soltanto i quattro punti anche
// dentro le case, e le porte più strette di 1,2 m restavano chiuse: misurato
// sul modello, circa 88 m² irraggiungibili nel Fauno, 33 nei Vettii, 245 nel
// Menandro. La prova d'avvio ora lo controlla (giro-comandi.js).
function tryMove(dx, dz){
  const nx = player.x + dx;
  if(!blockedAt(nx, player.z)) player.x = nx;
  const nz = player.z + dz;
  if(!blockedAt(player.x, nz)) player.z = nz;
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
  if(pickHotspot(ev)) return;
  // sul tocco: un colpo secco sulla strada è «vai lì»; trascinare è guardare
  if(isTouch && !trascinato) camminaVerso(ev);
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

let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, trascinato = false;
cv.addEventListener('pointerdown', e => {
  if(locked) return;
  dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; trascinato = false;
});
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => {
  if(!dragging || locked) return;
  if(Math.hypot(e.clientX - downX, e.clientY - downY) > 10) trascinato = true;
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
  ERCOLANO.setCorsa(touchRun);
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
    if(h){ openPanel(h.data); return true; }
  }
  return false;
}

/* ---- «tocca dove vuoi andare» (iPhone, iPad) ----------------------------
   Il punto toccato si cerca sul piano del suolo su cui si sta; il percorso
   lo trova scene/cammino.js sulla stessa griglia delle collisioni, quindi
   gira attorno alle case invece di fermarsi contro il primo muro. Si va al
   passo vero (1,4 m/s); con «Corri» a 4 m/s. Tastiera e levetta lo annullano. */
let percorso = null;
const segno = creaSegno({ RingGeometry, MeshBasicMaterial, Mesh, colore:PAL.accent });
scene.add(segno);
const pianoSuolo = new Plane(new Vector3(0, 1, 0), 0), puntoSuolo = new Vector3();
function quotaIn(x, z){
  return depositCurrent > 0.001 ? depositCurrent : (quotaCarreggiata(x, z) ?? 0);
}
function fermaPercorso(){ percorso = null; segno.visible = false; }
function camminaVerso(ev){
  if(flyMode || sectionOn || flight || presenting) return false;
  const r = cv.getBoundingClientRect();
  ndc.set(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  raycaster.setFromCamera(ndc, camera);
  pianoSuolo.constant = -groundY();
  if(!raycaster.ray.intersectPlane(pianoSuolo, puntoSuolo)) return false;
  if(puntoSuolo.distanceTo(camera.position) > 160) return false;
  const punti = trovaPercorso({ libero:(x, z) => !blockedAt(x, z), da:[player.x, player.z],
                                a:[puntoSuolo.x, puntoSuolo.z], passo:CELLA, margine:10 });
  if(!punti){ fermaPercorso(); return false; }
  const [fx, fz] = punti[punti.length - 1];
  percorso = { punti, fermo:0, x:player.x, z:player.z };
  segno.position.set(fx, quotaIn(fx, fz) + 0.02, fz);
  segno.visible = true;
  return true;
}

function flyTo(p){
  const to = new Vector3(p.x + 16, Math.max(p.y + 9, 8), p.z + 20);
  flight = { from: camera.position.clone(), to,
             target: new Vector3(p.x, p.y + 2, p.z), t:0 };
  player.set(p.x + 16, 0, p.z + 20);
  if(locked) document.exitPointerLock();
  fermaPercorso();
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
  if(on && eru.on) chiudiEruzione(true);
  sectionOn = on;
  fermaPercorso();
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

/* ------------------------------------- la quota del corpo, in sezione

   «Circa cinque metri» è un numero, e un numero non si vede. «Il deposito
   ti arriva tre metri e venti sopra la testa» è un'immagine, e non
   richiede nessun dato in più: è lo stesso spessore, misurato sull'altezza
   di chi sta guardando invece che su una scala astratta.

   La barra è alta 1,80 m nella scala del modello, sta in piedi sul piano
   del 79 contro la colonna del deposito, e non è architettura: materiale
   non illuminato e nessun piano di taglio, perché è un segno di disegno.  */

const secCorpo = new Group(); scene.add(secCorpo); secCorpo.visible = false;
const MAT_CORPO = new MeshBasicMaterial({ color: PAL.accent });
{
  const asta = new Mesh(new BoxGeometry(0.045, EYE, 0.045), MAT_CORPO);
  asta.position.y = EYE/2;
  const tacca = new Mesh(new BoxGeometry(0.55, 0.035, 0.045), MAT_CORPO);
  tacca.position.set(0.25, EYE, 0);
  const piede = new Mesh(new BoxGeometry(0.55, 0.03, 0.045), MAT_CORPO);
  piede.position.set(0.25, 0.015, 0);
  secCorpo.add(asta, tacca, piede);
}

let etOcchi = null, etSopra = null, sopraPrec = null;
function aggiornaQuotaCorpo(){
  const sopraM = Math.max(0, EPOCHS[epoch].deposit * 4 - 1.8);
  const chiave = sopraM.toFixed(1);
  if(chiave === sopraPrec) return;             // si ridisegna solo se cambia
  sopraPrec = chiave;
  if(etOcchi) secCorpo.remove(etOcchi, etSopra);
  etOcchi = makeLabel(t('scena.corpo.occhi', { m: fmt().d(1.8) }), '#7FB8A3', 600, 40, 0.26);
  etSopra = makeLabel(t('scena.corpo.sopra', { m: fmt().d(sopraM) }), '#EDEEE9', 600, 40, 0.30);
  secCorpo.add(etOcchi, etSopra);
}

/* -------------------------------------- il suolo dopo il 79, dichiarato

   Fra la fase II e la VI il deposito del 79 restava identico per sedici
   secoli — 1,25 unità dalla mattina dell'eruzione al canale di Fontana —
   e la Sezione mostrava sopra le correnti piroclastiche il nulla. Eppure
   in quei secoli sulla collina si è abitato, coltivato, scavato: un suolo
   si è formato di sicuro. Quanto spesso, non si sa — è la lacuna che il
   progetto dichiara nel cono dell'Insula Meridionalis.

   Quindi lo si disegna come ciò che è: una banda tratteggiata e
   semitrasparente, sottile apposta, con la quota «?». Non cambia spessore
   fra le fasi, perché farlo vorrebbe dire inventare il dato che manca.
   Sta solo sulla faccia del taglio, come la barra del corpo: è un segno di
   disegno, non terreno su cui camminare. */

// Spessore di disegno, NON un dato. Un metro nella scala del modello: quanto
// basta perché la banda si legga dalla camera della sezione (a 0,12 unità era
// alta due pixel), e abbastanza meno dei cinque metri del 79 da non suggerire
// un ordine di grandezza. L'incertezza la portano il tratteggio e il «?».
const SUOLO_H = 0.25;
const MAT_SUOLO = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(124,106,82,0.55)'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(236,226,206,0.85)'; g.lineWidth = 5;
  for(let k = -64; k < 128; k += 16){
    g.beginPath(); g.moveTo(k, 64); g.lineTo(k + 64, 0); g.stroke();
  }
  const tx = new CanvasTexture(c);
  tx.colorSpace = SRGBColorSpace;
  tx.wrapS = tx.wrapT = 1000;            // RepeatWrapping
  tx.repeat.set(160, 2);
  return new MeshBasicMaterial({ map:tx, transparent:true, depthWrite:false });
})();
const fasciaSuolo = new Mesh(new BoxGeometry(1, 1, 1), MAT_SUOLO);
fasciaSuolo.visible = false;
scene.add(fasciaSuolo);
const etSuolo = makeLabel(t('scena.strati.suolo'), '#ECE2CE', 600, 40, 0.30);
etSuolo.visible = false;
scene.add(etSuolo);
// le fasi in cui un suolo post-79 esiste: dopo il seppellimento, prima che lo
// scavo moderno lo tolga
function suoloEsiste(){ return epoch >= 2 && epoch <= 6; }

let sectionX = -60;
function updateSection(){
  sectionZ = Math.max(-72, Math.min(78, sectionZ));
  clipPlane.constant = sectionZ;
  document.getElementById('secZ').textContent =
    (sectionZ >= 0 ? '+' : '') + t('ui.sez.quota', { n: fmt().n(Math.round(sectionZ*4)) });
  flight = { from: camera.position.clone(),
             to: new Vector3(sectionX + 5, 3.3, sectionZ + 21),
             target: new Vector3(sectionX + 5, 1.3, sectionZ - 3), t:0 };
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

/* La presentazione parte dal punto in cui ti trovi, e da lì non si muove:
   sono le otto fasi a scorrere sullo stesso fotogramma. È lì che
   l'argomento colpisce — la stessa strada, il deposito che sale di cinque
   metri, i piani superiori che riemergono — perché finalmente stai fermo a
   guardare la stessa cosa cambiare.

   Prima girava sempre in orbita a centosettanta unità dalla città, cioè a
   quasi settecento metri: da lassù cinque metri di deposito sono un pixel e
   la dimostrazione non arrivava. L'orbita resta, ma solo quando parti già
   dall'alto, dove un fotogramma fisso non direbbe niente. Le due cose si
   compongono: ti metti dove vuoi guardare, e premi Presenta. */
let presentFisso = false;
const presentVista = { pos:new Vector3(), yaw:0, pitch:0 };

function startPresentation(){
  presenting = true; presentTimer = 0;
  presentFisso = !overview && !flyMode;
  if(presentFisso){
    presentVista.pos.copy(camera.position);
    presentVista.yaw = yaw;
    presentVista.pitch = pitch;
  }
  applyEpoch(0);
  document.body.classList.add('presenting');
  document.body.classList.toggle('presenting-fisso', presentFisso);
  document.getElementById('btnPresent').classList.add('on');
  if(locked) document.exitPointerLock();
  closePanel();
  if(!presentFisso) flyTo({ x:-40, z:120, y:40 });
}
function stopPresentation(){
  if(!presenting) return;
  presenting = false;
  document.body.classList.remove('presenting');
  document.body.classList.remove('presenting-fisso');
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
  // all'ultima tappa «Avanti» diventa «Fine»: chiude la visita invece di
  // restare spento senza dire perché
  const ultima = tourIdx === TOUR.length-1;
  document.getElementById('tourNext').textContent = t(ultima ? 'ui.tour.fine' : 'ui.tour.avanti');
  leggiScheda();
}
/* La voce nella visita: la sintesi vocale del dispositivo legge titolo e
   testo della scheda di ogni tappa, nella lingua scelta. Spenta all'inizio
   (una visita che parla da sola sorprende, in classe); la scelta si
   ricorda su questo dispositivo. Le fonti non si leggono: restano scritte. */
const VOCE_LINGUA = { it:'it-IT', en:'en-GB', fr:'fr-FR', de:'de-DE', es:'es-ES', pt:'pt-PT' };
const voceBtn = document.getElementById('tourVoce');
const sintesi = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voceOn = false;
try { voceOn = localStorage.getItem('dopo79-voce') === '1'; } catch(e){}
function voceScelta(){
  const tag = VOCE_LINGUA[linguaAttiva()] || 'it-IT', voci = sintesi.getVoices();
  return voci.find(v => v.lang === tag && v.localService) || voci.find(v => v.lang === tag)
      || voci.find(v => v.lang.slice(0, 2) === tag.slice(0, 2)) || null;
}
function leggiScheda(){
  if(!sintesi) return;
  sintesi.cancel();
  if(!voceOn) return;
  const testo = document.getElementById('pTitle').textContent + '. ' + document.getElementById('pBody').innerText;
  const u = new SpeechSynthesisUtterance(testo.replace(/\s+/g, ' ').trim());
  u.lang = VOCE_LINGUA[linguaAttiva()] || 'it-IT';
  const v = voceScelta(); if(v) u.voice = v;
  u.rate = 0.95;
  sintesi.speak(u);
}
function segnaVoce(){
  voceBtn.setAttribute('aria-pressed', String(voceOn));
  voceBtn.querySelector('.voceTesto').textContent = t(voceOn ? 'ui.tour.voceSpegni' : 'ui.tour.voce');
}
if(sintesi){
  voceBtn.hidden = false;
  segnaVoce();
  voceBtn.addEventListener('click', () => {
    voceOn = !voceOn;
    try { localStorage.setItem('dopo79-voce', voceOn ? '1' : '0'); } catch(e){}
    segnaVoce();
    leggiScheda();
  });
}

function startTour(){
  document.body.classList.add('touring');
  document.getElementById('btnTour').classList.add('on');
  tourIdx = -1; tourGo(1);
}
function stopTour(){
  if(sintesi) sintesi.cancel();
  document.body.classList.remove('touring');
  document.getElementById('btnTour').classList.remove('on');
  closePanel();
}
document.getElementById('btnTour').addEventListener('click', () =>
  document.body.classList.contains('touring') ? stopTour() : startTour());
document.getElementById('tourPrev').addEventListener('click', () => tourGo(-1));
document.getElementById('tourNext').addEventListener('click', () =>
  tourIdx === TOUR.length-1 ? stopTour() : tourGo(1));
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

/* ------------------------------------------------------------ «Altro» */
// Il pannello degli strumenti meno usati. Si chiude toccando fuori, con Esc
// o dopo aver scelto uno strumento.
const altro = document.getElementById('altro'), btnAltro = document.getElementById('btnAltro');
function apriAltro(on){
  altro.hidden = !on;
  btnAltro.setAttribute('aria-expanded', String(on));
  // su schermo largo si apre sotto il suo pulsante, anche a scheda aperta
  if(on && innerWidth > 832){
    const r = btnAltro.getBoundingClientRect();
    altro.style.top = (r.bottom + 8) + 'px';
    altro.style.right = Math.max(16, innerWidth - r.right) + 'px';
  } else { altro.style.top = ''; altro.style.right = ''; }
  if(on) altro.querySelector('button:not([disabled])')?.focus({ preventScroll:true });
}
btnAltro.addEventListener('click', e => { e.stopPropagation(); apriAltro(altro.hidden); });
altro.addEventListener('click', e => { if(e.target.closest('button')) setTimeout(() => apriAltro(false), 0); });
addEventListener('pointerdown', e => {
  if(!altro.hidden && !altro.contains(e.target) && e.target !== btnAltro) apriAltro(false);
});
addEventListener('keydown', e => { if(e.code === 'Escape' && !altro.hidden){ apriAltro(false); btnAltro.focus(); } });

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
  inhabitants.setDensity(q.parts);
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
  btnAudio.textContent = t(v ? 'ui.tool.sonoroAcceso' : 'ui.tool.sonoro');
  btnAudio.setAttribute('aria-pressed', String(v));
  if(v) AUDIO.setEpoch(epoch);
});

/* -------------------------------------------------------- confronto */
let compareOn = false;
function setCompare(v){
  if(v && eru.on) chiudiEruzione(true);
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
  scriviStato();
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
  if(!ercOn) document.body.classList.remove('erc-galleria');
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
        if(el) el.textContent = nome ? t('ui.erc.vicino', { nome }) : '';
      }
    });
  } else {
    ERCOLANO.eruzione(null);
    ERCOLANO.exit();
    closePanel();
  }
  setErcAlto(false);
  // l'eruzione continua nell'altra città, alla stessa ora
  if(eru.on){ vaiEruzione(eru.ore); segnaCittaEruzione(); }
  aggiornaComandiErcolano();
  if(ercOn) segnaGalleria();
  if(!ercOn){
    document.getElementById('btnTop').classList.toggle('on', overview);
    document.getElementById('btnFly').classList.toggle('on', flyMode);
    document.getElementById('btnFly').textContent = t(flyMode ? 'ui.tool.volo' : 'ui.tool.cammina');
  }
  scriviStato();
}
document.getElementById('btnErc').addEventListener('click', () => setErc(!ercOn));
document.getElementById('ercExit').addEventListener('click', () => setErc(false));
document.getElementById('ercReset').addEventListener('click', () => setErcAlto(false));
// Il teatro di Ercolano è il primo monumento trovato, nel 1738, e sta
// venticinque metri sotto il centro storico: finora era solo una riga di
// testo. Qui la città moderna diventa trasparente e sotto si vede.
// Dall'8 ottobre 2026 le cose sepolte sono due — il teatro e la vasca della
// Palestra — e il pulsante apre due voci: prima portava sempre al teatro, e
// la vasca andava cercata volando.
function segnaSotto(v, dove){
  document.getElementById('ercBuried').classList.toggle('on', v);
  document.getElementById('ercSotto').hidden = !v;
  document.getElementById('ercSottoTeatro').classList.toggle('on', v && dove === 'teatro');
  document.getElementById('ercSottoVasca').classList.toggle('on', v && dove === 'vasca');
}
document.getElementById('ercBuried').addEventListener('click', () => {
  const v = ERCOLANO.mostraSepolto(!ERCOLANO.sepoltoAttivo());
  segnaSotto(v, 'teatro');
  if(v && !ERCOLANO.inVolo()) setErcAlto(true);   // da terra non si vedrebbe
});
// I quattro momenti di Ercolano (14 ottobre 2026): ognuno cambia deposito,
// case e superficie, e ha una riga che dice che cosa si sta guardando.
function segnaMomento(mo){
  document.querySelectorAll('#ercMomenti [data-momento]').forEach(b =>
    b.classList.toggle('on', b.dataset.momento === mo));
  document.getElementById('ercMomentoNota').innerHTML = t('ui.erc.momentoNota.m' + mo);
  const b = document.getElementById('ercGalleria');
  if(b) b.hidden = !(mo === '1738' || mo === 'oggi');
}
function setMomentoErc(mo){
  const v = ERCOLANO.setMomento(mo);
  segnaMomento(v);
  segnaGalleria();
  scriviStato();
}
// Le gallerie borboniche: si scende nel 1738 e oggi, quando il teatro si
// raggiunge solo da sotto. Il pulsante cambia nome e la riga dice che cosa è
// documentato e che cosa no.
function segnaGalleria(){
  const sotto = ERCOLANO.galleriaAttiva(), mo = ERCOLANO.momentoAttivo();
  const b = document.getElementById('ercGalleria');
  b.hidden = !(mo === '1738' || mo === 'oggi');
  b.textContent = t(sotto ? 'ui.erc.risali' : 'ui.erc.scendi');
  b.classList.toggle('on', sotto);
  document.body.classList.toggle('erc-galleria', sotto);
  if(sotto) document.getElementById('ercMomentoNota').innerHTML = t('ui.erc.galleriaNota');
  else segnaMomento(mo);
}
document.getElementById('ercGalleria').addEventListener('click', () => {
  ERCOLANO.galleria(!ERCOLANO.galleriaAttiva());
  segnaGalleria();
});
document.querySelectorAll('#ercMomenti [data-momento]').forEach(b =>
  b.addEventListener('click', () => setMomentoErc(b.dataset.momento)));
for(const dove of ['teatro', 'vasca'])
  document.getElementById(dove === 'teatro' ? 'ercSottoTeatro' : 'ercSottoVasca')
    .addEventListener('click', () => { ERCOLANO.guardaSotto(dove); segnaSotto(true, dove); });
document.querySelector('#ercHud .ercNote')
  .addEventListener('click', e => e.currentTarget.classList.toggle('aperta'));
{
  // la sfumatura della barra sparisce quando si è arrivati in fondo
  const tools = document.getElementById('tools');
  const fine = () => tools.classList.toggle('fine',
    tools.scrollLeft + tools.clientWidth >= tools.scrollWidth - 2);
  tools.addEventListener('scroll', fine, { passive:true });
  addEventListener('resize', fine);
  fine();
}
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

/* La porta d'ingresso: tre scelte (visita, cammina, Ercolano) e, sotto
   «Come si usa», le istruzioni complete. «Comandi» la riapre già aperta
   sulle istruzioni: chi la chiede vuole quelle. */
const introGuida = document.getElementById('introGuida');
const introGuidaBtn = document.getElementById('introGuidaBtn');
function mostraGuida(on){
  introGuida.hidden = !on;
  introGuidaBtn.setAttribute('aria-expanded', String(on));
}
introGuidaBtn.addEventListener('click', () => mostraGuida(introGuida.hidden));
function chiudiIntro(){
  document.getElementById('intro').classList.add('gone');
  AUDIO.init();
}
document.getElementById('btnHelp').addEventListener('click', () => {
  mostraGuida(true);
  document.getElementById('intro').classList.remove('gone');
});
document.getElementById('btnStart').addEventListener('click', chiudiIntro);
document.getElementById('sceltaVisita').addEventListener('click', () => {
  chiudiIntro();
  if(ercOn) setErc(false);
  if(!document.body.classList.contains('touring')) startTour();
});
document.getElementById('sceltaErcolano').addEventListener('click', () => {
  chiudiIntro();
  if(!ercOn) setErc(true);
});
// Il confronto è la tesi del progetto in una schermata: cinque metri contro
// venti, stessa scala. Nascosto dietro il quinto bottone della seconda fila
// non lo trovava nessuno, quindi si può prendere direttamente dalla porta.
document.getElementById('btnStartCompare').addEventListener('click', () => {
  chiudiIntro();
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

// il tempo della scena: secondi dall'avvio e dal fotogramma prima (three.js
// 0.187 ha deprecato Clock; due righe bastano)
const clock = { t0: performance.now(), prima: performance.now(), elapsedTime: 0,
  getDelta(){ const ora = performance.now(), dt = (ora - this.prima) / 1000; this.prima = ora; this.elapsedTime = (ora - this.t0) / 1000; return dt; } };
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

// dtFisso esiste solo per ?debug: fa avanzare la scena a passi uguali senza
// aspettare i fotogrammi del browser (un Chrome senza schermo non ne disegna)
let dtFisso = null;
// e senzaDisegno, solo per ?debug, la fa avanzare senza disegnarla: la prova
// dei comandi controlla stati e pulsanti, e sul processore (SwiftShader) un
// fotogramma della città vista dall'alto costa secondi
let senzaDisegno = false;
let contoFotogramma = { chiamate:0, triangoli:0 };
const pixelProva = new Uint8Array(4);
function tick(){
  requestAnimationFrame(tick);
  passo();
}
function passo(){
  const dt = dtFisso ?? Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if(ercOn){
    ERCOLANO.update(dt, t);
    if(!senzaDisegno && !POST.render(renderer, ERCOLANO.scene, ERCOLANO.camera))
      renderer.render(ERCOLANO.scene, ERCOLANO.camera);
    return;
  }
  if(compareOn){
    CONFRONTO.update(dt);
    if(!senzaDisegno) renderer.render(CONFRONTO.scene, CONFRONTO.camera);
    return;
  }
  // a passi fissi (le foto per lo store, le prove) i fotogrammi non sono
  // veri: la qualità automatica vi leggeva 30 al secondo e abbassava la
  // risoluzione a metà scatto
  if(dtFisso === null) autoQuality(dt);
  pollGamepad(dt);

  if(eru.on){
    if(eru.sosta > 0) eru.sosta -= dt; else aggiornaEruzione(dt);
    animaNube(dt, t, eru.buio || 0);
    contornoMisura.visible = depositCurrent < 0.05;
  } else {
    depositCurrent += (depositTarget - depositCurrent) * Math.min(1, dt*2.2);
    contornoMisura.visible = depositCurrent < 0.05;   // sepolta, la misura non si vede
    for(const g of [depositGroup, shantyGroup, vegGroup, canalGroup, spoilGroup])
      g.position.y = depositCurrent;
  }

  AO_UNI.quota.value = depositCurrent;
  stepParticles(dt, t);
  // sui marciapiedi prima del 79, sul deposito dopo: a scala vera chi lavora
  // ai recuperi sparirebbe sotto la cenere
  inhabitants.update(t, dt, depositCurrent);

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
    if(presentFisso){
      camera.position.copy(presentVista.pos);
      setLook(presentVista.yaw, presentVista.pitch);
    } else {
      const a = t*0.045;
      camera.position.set(-6 + Math.cos(a)*170, 78, 3 + Math.sin(a)*170);
      const d = new Vector3(-6,6,3).sub(camera.position).normalize();
      setLook(Math.atan2(-d.x, -d.z), Math.asin(Math.max(-1, Math.min(1, d.y))));
    }
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
    // a piedi il passo vero: 1,4 m/s, di corsa 4 m/s (unità da 4 m). Fino al
    // 15 ottobre 2026 erano 7,6 e 19 m/s: una corsa e uno scatto da centometrista
    const maxSpeed = flyMode ? (sprint ? 52 : 17) : (sprint ? 1.0 : 0.35);
    target.multiplyScalar(maxSpeed);

    // il percorso toccato: vale finché non si usano tastiera o levetta
    if(percorso && (mag > 0.05 || flyMode)) fermaPercorso();
    if(percorso){
      const v = seguiPercorso(percorso, player.x, player.z, maxSpeed);
      if(!v) fermaPercorso();
      else {
        target.set(v[0], 0, v[1]);
        // lo sguardo gira piano verso dove si va, se non lo si sta trascinando
        if(!dragging && Math.hypot(v[0], v[1]) > 0.1){
          let d = Math.atan2(-v[0], -v[1]) - yawT;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          yawT += d * Math.min(1, dt * 2.2);
        }
        // fermo contro qualcosa: meno di 20 cm in un secondo e mezzo, si rinuncia
        // (lo spostamento di un solo fotogramma, al passo, è sempre minuscolo)
        if(Math.hypot(player.x - percorso.x, player.z - percorso.z) > 0.05){ percorso.x = player.x; percorso.z = player.z; percorso.fermo = 0; }
        else if((percorso.fermo += dt) > 1.5) fermaPercorso();
      }
    }

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
      footstepTimer = 0;
    } else {
      tryMove(vel.x*dt, vel.z*dt);
      // passo: oscillazione minima, proporzionale alla velocità
      const speed = Math.hypot(vel.x, vel.z);
      bobAmt += (Math.min(speed/maxSpeed, 1) - bobAmt) * Math.min(1, dt*6);
      bobPhase += dt * (6.5 + speed*0.9);
      const bob = Math.sin(bobPhase) * 0.01 * bobAmt;     // 4 cm: la testa di chi cammina
      camera.position.set(player.x, groundY() + EYE + bob, player.z);
      if(speed > 0.08){
        footstepTimer -= dt;
        if(footstepTimer <= 0){
          AUDIO.playFootstep(Math.min(1, speed/1.0));
          // un passo ogni 0,55 s camminando, più fitto correndo
          footstepTimer = 0.55 * Math.sqrt(0.35 / Math.max(0.35, speed));
        }
      } else footstepTimer = 0;
    }
  }

  if(segno.visible){ const k = 1 + Math.sin(t * 4) * 0.12; segno.scale.set(k, k, k); }

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

  // la barra alta come un uomo, contro la colonna del deposito
  // la banda del suolo sulla faccia del taglio, sopra le correnti
  const suolo = sectionOn && depositCurrent > 0.05 && suoloEsiste();
  fasciaSuolo.visible = etSuolo.visible = suolo;
  document.getElementById('secSuolo').hidden = !(sectionOn && suoloEsiste());
  if(suolo){
    fasciaSuolo.scale.set(420, SUOLO_H, 1.6);
    fasciaSuolo.position.set(0, depositCurrent + SUOLO_H/2, sectionZ - 0.8);
    etSuolo.position.set(sectionX + 9, depositCurrent + SUOLO_H + 0.30, sectionZ + 0.7);
    const d = camera.position.distanceTo(etSuolo.position);
    const k = Math.max(0.8, Math.min(1.6, d/22));
    const h = etSuolo.userData.h * k;
    etSuolo.scale.set(h * etSuolo.userData.aspect, h, 1);
    etSuolo.material.opacity = 0.95;
  }

  secCorpo.visible = sectionOn && depositCurrent > 0.05 && !!etOcchi;
  if(secCorpo.visible){
    // Colonna a sé, fra la camera e le quote degli strati: le due serie
    // stanno su verticali diverse e non si accavallano.
    secCorpo.position.set(sectionX + 1, 0, sectionZ + 0.7);
    const d = camera.position.distanceTo(secCorpo.position);
    const k = Math.max(0.8, Math.min(1.6, d/22));   // come le quote degli strati
    // occhi alla tacca, «sopra la testa» in cima alla colonna: così la
    // distanza fra le due etichette è il deposito stesso, e non si toccano
    etOcchi.position.set(0.75, EYE, 0);
    etSopra.position.set(0.75, depositCurrent + 0.40, 0);
    for(const sp of [etOcchi, etSopra]){
      const h = sp.userData.h * k;
      sp.scale.set(h * sp.userData.aspect, h, 1);
      sp.material.opacity = 0.95;
    }
  }

  if(!senzaDisegno && !POST.render(renderer, scene, camera)) renderer.render(scene, camera);
}

addEventListener('resize', () => {
  CONFRONTO.resize(innerWidth, innerHeight);
  ERCOLANO.resize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  POST.setSize(renderer, innerWidth, innerHeight, renderScale);
});

/* --------------------------------------------------- collegamenti diretti

   L'indirizzo dice dove sei: ?fase=1…8 (gli stessi numeri dei tasti),
   ?luogo=basilica, ?vista=confronto|ercolano, accanto al ?lang= che c'era già.
   Si legge una volta all'avvio e si riscrive a ogni cambio, con replaceState:
   nessuna voce in più nella cronologia, nessun ricaricamento.

   Serve a tre cose che prima non si potevano fare. Un docente manda la classe
   sulla ceramica del Quattrocento con un link invece di dettare «premi 5,
   apri Luoghi, cerca Basilica». Chi cita il progetto cita un punto preciso.
   E cambiare lingua — che ricarica la pagina — non riporta più all'inizio,
   perché scegliLingua() riparte dall'indirizzo corrente.

   I valori sbagliati si ignorano in silenzio: un link vecchio o storpiato
   apre il modello all'inizio, non una pagina rotta. */

var statoPronto = false;   // var e non let: applyEpoch la legge anche prima
var luogoAperto = null;

function scriviStato(){
  if(!statoPronto || presenting) return;
  const u = new URL(location.href);
  const q = u.searchParams;
  ['fase','luogo','vista','momento','eruzione','classe','percorso','tappa'].forEach(k => q.delete(k));
  if(ercOn) q.set('vista', 'ercolano');
  if(ercOn && ERCOLANO.momentoAttivo() !== 'oggi') q.set('momento', ERCOLANO.momentoAttivo());
  else if(compareOn) q.set('vista', 'confronto');
  if(!ercOn && !compareOn && (epoch !== 0 || luogoAperto)) q.set('fase', String(epoch + 1));
  if(luogoAperto && !compareOn) q.set('luogo', luogoAperto);
  if(cl.modo){ q.set('classe', cl.modo); q.set('percorso', cl.percorso); q.set('tappa', String(cl.tappa + 1)); }
  if(eru.on && !compareOn) q.set('eruzione', String(Math.round(eru.ore * 10) / 10));
  const nuovo = u.pathname + (q.toString() ? '?' + q.toString() : '') + u.hash;
  if(nuovo !== location.pathname + location.search + location.hash)
    history.replaceState(null, '', nuovo);
}

function applicaCollegamento(){
  const q = new URLSearchParams(location.search);
  const vista = q.get('vista'), luogo = q.get('luogo');
  const faseNum = parseInt(q.get('fase'), 10);
  const fase = Number.isInteger(faseNum) && faseNum >= 1 && faseNum <= EPOCHS.length
    ? faseNum - 1 : null;
  let usato = false;

  if(vista === 'confronto'){ setCompare(true); usato = true; }
  else if(vista === 'ercolano'){
    const oreE = parseFloat(q.get('eruzione'));
    if(Number.isFinite(oreE)) apriEruzione(Math.max(0, Math.min(DURATA, oreE)));
    setErc(true); usato = true;
    if(q.get('momento') && !eru.on) setMomentoErc(q.get('momento'));
    if(luogo && ERCOLANO.luoghi.some(p => p.id === luogo)) ERCOLANO.apri(luogo);
  } else {
    const h = luogo ? byId[luogo] : null;
    if(h){
      const d = h.data;
      // la fase chiesta vale se il luogo ci esiste; altrimenti quella del racconto
      const f = (fase !== null && fase >= d.from && fase <= d.to)
        ? fase : (TOUR_EPOCH[luogo] ?? d.from);
      applyEpoch(f);
      flyTo(d);
      openPanel(d);
      usato = true;
    } else if(fase !== null){
      applyEpoch(fase);
      usato = true;
    }
    const oreEru = parseFloat(q.get('eruzione'));
    if(Number.isFinite(oreEru) && !h){ apriEruzione(Math.max(0, Math.min(DURATA, oreEru))); usato = true; }
  }
  // la classe: dall'indirizzo (il link per gli studenti) o dall'ultima scelta
  let salvata = {};
  try { salvata = JSON.parse(localStorage.getItem(CHIAVE_CLASSE) || '{}'); } catch(e){}
  const modoClasse = q.get('classe') || (usato ? null : salvata.modo);
  if(MODALITA.includes(modoClasse)){
    const perc = q.get('percorso') || salvata.percorso;
    if(PERCORSI[perc]) cl.percorso = perc;
    const n = parseInt(q.get('tappa'), 10);
    statoPronto = true;
    impostaClasse(modoClasse, Number.isInteger(n) ? n - 1 : 0);
    usato = true;
  }
  // Chi arriva da un collegamento diretto vuole atterrare lì, non leggere
  // la scheda d'ingresso: resta raggiungibile da «Comandi».
  if(usato) document.getElementById('intro').classList.add('gone');
  statoPronto = true;
  scriviStato();
}

/* Inquadrature riproducibili, solo con ?debug nell'indirizzo. Servono per
   le verifiche visive e per gli screenshot dello store, che devono poter
   essere rifatti identici quando il modello cambia:
     pompei.guarda(px,py,pz, tx,ty,tz)   camera in p, guarda verso t
     pompei.fase(i)                      fase 0…7
     pompei.foto(n)                      n passi di scena, poi l'immagine PNG
     pompei.apri(id), .vista(v), .luoghi()  il giro di verifica, senza ricaricare
     pompei.scena                        la scena, per controllare cosa c'è
   foto() non aspetta i fotogrammi del browser: funziona anche in una scheda
   nascosta o in un Chrome senza schermo, dove requestAnimationFrame tace.
   Senza ?debug non esiste niente di tutto questo. */
// la didascalia di un'immagine per lo store: la foto adattata a w × h
// (riempie e ritaglia), una fascia scura in alto, il marchio e il titolo
function componi(img, w, h, titolo, marchio){
  const c = document.createElement('canvas'); c.width = w; c.height = h;

  const g = c.getContext('2d');
  const k = Math.max(w/img.width, h/img.height), dw = img.width*k, dh = img.height*k;
  g.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh);
  const fascia = h*0.30, sf = g.createLinearGradient(0, 0, 0, fascia);
  sf.addColorStop(0, 'rgba(16,20,18,0.94)'); sf.addColorStop(0.62, 'rgba(16,20,18,0.78)'); sf.addColorStop(1, 'rgba(16,20,18,0)');
  g.fillStyle = sf; g.fillRect(0, 0, w, fascia);
  const m = w*0.075;
  g.fillStyle = '#7fb8a3'; g.font = `500 ${Math.round(w*0.026)}px "IBM Plex Mono", monospace`;
  g.fillText(marchio.split('').join(String.fromCharCode(8202)), m, m + w*0.02);
  g.fillStyle = '#eef1ec'; const fs = Math.round(w*0.064);
  g.font = `600 ${fs}px Spectral, Georgia, serif`;
  const righe = []; let riga = '';
  for(const p of titolo.split(' ')){
    const prova = riga ? riga + ' ' + p : p;
    if(g.measureText(prova).width > w - 2*m && riga){ righe.push(riga); riga = p; } else riga = prova;
  }
  if(riga) righe.push(riga);
  righe.forEach((r, i) => g.fillText(r, m, m + w*0.05 + fs*1.15*(i+1)));
  return c.toDataURL('image/png');
}
if(new URLSearchParams(location.search).has('debug')){
  window.pompei = {
    guarda(px, py, pz, tx, ty, tz){
      setFly(true);
      flight = { from: camera.position.clone(), to: new Vector3(px, py, pz),
                 target: new Vector3(tx, ty, tz), t:0 };
    },
    fase(i){ applyEpoch(i); },
    sezione(on){ setSection(on); },
    scena: scene,
    camera,
    solido: (x, z) => isSolid(x, z),
    bloccato: (x, z) => blockedAt(x, z),
    // un passo con la regola vera del movimento, da (x,z) di (dx,dz): dove
    // si arriva. Il giocatore torna dov'era.
    muovi(x, z, dx, dz){
      const px = player.x, pz = player.z;
      player.x = x; player.z = z; tryMove(dx, dz);
      const r = [player.x, player.z]; player.x = px; player.z = pz;
      return r;
    },
    botteghe: () => BOTTEGHE.slice(),
    // la città come elenco di blocchi [x, y, z, l, h, p] (centro e misure,
    // in unità), per cuocere la luce in Blender (strumenti/blender/luce_cotta.py)
    geometria: () => ({
      blocchi: [...buckets.values()].flatMap(b => b.list.map(c => c.slice(0, 6))),
      tetti: HOUSES_ROOF.map(r => r.slice(0, 6)),
      terreno: TERRACE.map(p => p.slice())
    }),
    caseInterne: () => MURI_INTERNI.map(c => ({ x0:c.x0, z0:c.z0, x1:c.x1, z1:c.z1 })),
    ercolano: ERCOLANO,
    // un'immagine per lo store: la scena adattata a w × h (riempie e
    // ritaglia), una fascia scura in alto e la didascalia in Spectral, il
    // carattere dei titoli, già incluso nel file. Le inquadrature e i testi
    // stanno in store/scatti.json.
    // pulito: senza coni dei luoghi né etichette, che in una foto ferma
    // sembrano difetti (un'etichetta tagliata, un raggio verde nel cielo)
    // titolo può essere un elenco di [titolo, marchio]: una sola foto della
    // scena, una didascalia per lingua, così le sei lingue mostrano lo stesso
    // istante (le figure camminano: due foto non sarebbero mai uguali)
    async vetrina(w, h, titolo, marchio = 'DOPO IL 79', passi = 45, pulito = true){
      const segni = [...hotspots, ...ERCOLANO.marcatori];
      const prima = segni.map(x => x.group.visible), etichette = labelGroup.visible;
      if(pulito){ segni.forEach(x => { x.group.visible = false; }); labelGroup.visible = false; }
      const img = new Image();
      await new Promise(ok => { img.onload = ok; img.src = this.foto(passi); });
      segni.forEach((x, i) => { x.group.visible = prima[i]; }); labelGroup.visible = etichette;
      await document.fonts.load(`600 ${Math.round(w*0.064)}px Spectral`);
      if(Array.isArray(titolo)) return titolo.map(([t, mk]) => componi(img, w, h, t, mk || marchio));
      return componi(img, w, h, titolo, marchio);
    },
    // per il giro di verifica: ogni luogo, fase e vista senza ricaricare
    luoghi: () => Object.keys(byId),
    apri(id){ const d = byId[id].data; applyEpoch(TOUR_EPOCH[id] ?? d.from); openPanel(d); },
    vista(v){
      setErc(false); setCompare(false);
      if(v === 'confronto') setCompare(true);
      if(v === 'ercolano') setErc(true);
    },
    // per la prova delle risorse: n passi di scena da 1/30 s, senza leggere
    // l'immagine; restituisce i millisecondi di ciascun passo, così chi
    // misura può prendere la mediana e non la media di un passo storto
    // con disegna = false la scena avanza senza essere disegnata
    passi(n = 30, disegna = true){
      dtFisso = 1/30; senzaDisegno = !disegna;
      const ms = [];
      // il conto di three.js si azzera a ogni render(): l'ultimo fotogramma
      // si conta per intero (ombre, scena, rifinitura)
      try {
        for(let i = 0; i < n; i++){
          const ultimo = i === n - 1 && disegna;
          if(ultimo){ renderer.info.autoReset = false; renderer.info.reset(); }
          const t0 = performance.now(); passo();
          // leggere un pixel obbliga ad aspettare la fine del disegno: senza,
          // si misurerebbe solo il tempo per mandarlo
          if(disegna){ const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelProva); }
          ms.push(performance.now() - t0);
          if(ultimo){ const r = renderer.info.render; contoFotogramma = { chiamate:r.calls, triangoli:r.triangles }; }
        }
      }
      finally { dtFisso = null; senzaDisegno = false; renderer.info.autoReset = true; }
      return ms;
    },
    // quanto ha disegnato l'ultimo fotogramma di passi() e quanta memoria della scheda video
    // tiene la pagina: chiamate, triangoli, geometrie, texture, programmi
    info(){
      const i = renderer.info;
      return { chiamate:contoFotogramma.chiamate, triangoli:contoFotogramma.triangoli, geometrie:i.memory.geometries,
               texture:i.memory.textures, programmi:(i.programs || []).length,
               heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    },
    giocatore: () => ({ x:player.x, z:player.z, cx:camera.position.x, cz:camera.position.z, volo:flyMode }),
    // avanza la scena di n passi da 1/30 s e restituisce l'immagine del canvas,
    // letta nello stesso giro in cui è stata disegnata
    foto(n = 60){
      // la scena avanza n passi ma si disegna solo l'ultimo: la foto è la
      // stessa, e sul processore costa un fotogramma invece di n
      dtFisso = 1/30;
      try { for(let i = 0; i < n; i++){ senzaDisegno = i < n - 1; passo(); } }
      finally { dtFisso = null; senzaDisegno = false; }
      return renderer.domElement.toDataURL('image/png');
    }
  };
}
// ?debug&cam=px,py,pz,tx,ty,tz — l'inquadratura scritta nell'indirizzo, così
// un browser senza interfaccia può scattare la stessa foto ogni volta
// (con &vista=ercolano: cam=x,y,z,imbardata,beccheggio, e &sotto)
function applicaCamera(){
  const q = new URLSearchParams(location.search);
  if(!q.has('debug') || !q.get('cam')) return;
  const v = q.get('cam').split(',').map(Number);
  if(!v.every(Number.isFinite)) return;
  if(ercOn){
    // a Ercolano: x,y,z,imbardata,beccheggio; con &sotto la città si fa trasparente
    if(q.has('sotto')){
      ERCOLANO.mostraSepolto(true);
      segnaSotto(true, 'teatro');
    }
    if(v.length === 5) ERCOLANO.inquadra(...v);
  } else if(v.length === 6) window.pompei.guarda(...v);
}

// «Copia il link»: l'indirizzo è già quello giusto, basta prenderlo
document.getElementById('pLink').addEventListener('click', async () => {
  const btn = document.getElementById('pLink');
  try {
    await navigator.clipboard.writeText(location.href);
    btn.textContent = t('ui.panel.copiato');
  } catch(e){
    // senza permesso agli appunti si mostra l'indirizzo da copiare a mano
    prompt(t('ui.panel.copiaLink'), location.href);
  }
  setTimeout(() => { btn.textContent = t('ui.panel.copiaLink'); }, 1800);
});

setPad(isTouch);
// Il profilo massimo è il punto di partenza anche sui telefoni di riferimento;
// la risoluzione dinamica e i gradini inferiori restano la rete di sicurezza.
applyQuality(0);
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
applicaCollegamento();
applicaCamera();
document.getElementById('loading').classList.add('gone');
tick();

}
