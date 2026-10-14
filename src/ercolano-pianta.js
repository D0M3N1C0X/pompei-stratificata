import {
  BoxGeometry,
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Shape
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import PIANTA from './data/ercolano-pianta.json';

/* =====================================================================
   ERCOLANO DALLA PIANTA VERA

   Fino al 13 ottobre 2026 la scena di Ercolano era disegnata a mano: lo
   scavo occupava 416 × 240 m invece di circa 180 × 210, i cardini stavano a
   80 m l'uno dall'altro invece di 47–49, le carreggiate erano di 7–13 m.
   Ora case, vie, perimetro dello scavo e città moderna vengono dalle piante
   di OpenStreetMap (strumenti/osm/ercolano_osm.py → src/data/ercolano-
   pianta.json), ruotate nel sistema della scena: X lungo i decumani, Z verso
   il mare, origine all'incrocio fra Cardo IV e Decumano Inferiore.

   Che cosa è dato e che cosa no:
   · piante delle case, tracciato delle vie, posizione della Palestra, dello
     scavo della Villa dei Papiri, della città moderna ......... OSM, VERO
     (tracciato dai contributori, non un rilievo archeologico)
   · azimut della griglia: cardini 58°, decumani 147° ........ OSM, VERO
   · la fossa di scavo: ricavata da ciò che è scavato, allargato di 5 m,
     più l'area sacra e la spiaggia ............................. DEDOTTA
   · altezze dei muri delle rovine, marciapiedi, quote delle terrazze, i
     fornici, l'altezza della città moderna (3 piani) ......... IPOTESI
   Dati © OpenStreetMap contributors, ODbL 1.0.
   ===================================================================== */

export const U = 4;                                  // metri per unità
const m = v => v / U;

// le quote del terreno antico, in unità
export const QUOTA = { citta:0, terrazza:m(-4.4), spiaggia:m(-10) };
export const SCARP_H = m(20);                        // il deposito, valore modale delle fonti
const Z_TERRAZZA = 80, Z_SPIAGGIA = 113;             // metri: dove il terreno scende

export function quotaDi(zMetri){
  return zMetri >= Z_SPIAGGIA ? QUOTA.spiaggia : zMetri >= Z_TERRAZZA ? QUOTA.terrazza : QUOTA.citta;
}

const centro = punti => {
  let x = 0, z = 0; const n = punti.length - 1;
  for(let i = 0; i < n; i++){ x += punti[i][0]; z += punti[i][1]; }
  return [x/n, z/n];
};
const via = nome => PIANTA.vie.filter(v => v.nome.startsWith(nome));
const media = (arr, k) => arr.reduce((a, p) => a + p[k], 0) / arr.length;

// le ancore della scena, in unità
export const ANCORE = (() => {
  const xDi = nome => m(media(via(nome).flatMap(v => v.punti), 0));
  const zDi = nome => m(media(via(nome).flatMap(v => v.punti), 1));
  const edificio = nome => { const e = PIANTA.edifici.find(e => e.nome === nome); return e ? centro(e.punti).map(m) : null; };
  const pal = PIANTA.palestra.punti, pxs = pal.map(p => p[0]), pzs = pal.map(p => p[1]);
  const teatro = centro(PIANTA.ingresso_teatro).map(m);
  return {
    C3: xDi('Cardo III'), C4: xDi('Cardo IV'), C5: xDi('Cardo V'),
    DEC_MAX: zDi('Decumano Massimo'), DEC_INF: zDi('Decumano Inferiore'),
    palestra: { x0:m(Math.min(...pxs)), x1:m(Math.max(...pxs)), z0:m(Math.min(...pzs)), z1:m(Math.max(...pzs)) },
    teatro,
    cervi: edificio('Casa dei Cervi'),
    graticcio: edificio('Casa a Graticcio'),
    papiri: PIANTA.villa_papiri ? centro(PIANTA.villa_papiri.punti).map(m) : null,
    azimut: { cardini:PIANTA.azimut_cardini, decumani:PIANTA.azimut_decumani }
  };
})();

const BOX = new BoxGeometry(1, 1, 1);
const T = new Object3D();

/* ------------------------------------------------------------ il deposito
   Le strisce non scavate della maschera, alzate a 20 m in cinque bande,
   come il fronte di scavo che c'era prima. Una InstancedMesh per banda:
   cinquecento strisce sarebbero cinquecento oggetti. «campo» è un
   rettangolo (in unità) che usa materiali propri: sopra la vasca della
   Palestra il deposito deve velarsi di più (vedi VELATI in ercolano.js). */
// Le righe di deposito secondo il momento:
//   oggi  la maschera così com'è
//   1958  in più il settore meridionale (terrazze, terme, spiaggia: scavati
//         dal 1980, Maggi) e la Villa dei Papiri (1996–2008) [delimitazione
//         per zone, non edificio per edificio]
//   1738  tutto sepolto
function righe(momento){
  const M = PIANTA.maschera;
  return M.deposito.map((dep, j) => {
    if(momento === '1738') return [[0, M.nx]];
    if(momento !== '1958') return dep;
    const zm = M.z0 + (j + 0.5) * M.cella;
    if(zm > 80) return [[0, M.nx]];
    const iVilla = Math.floor((-100 - M.x0) / M.cella);        // la Villa sta oltre x −100 m
    const out = dep.map(r => r.slice());
    out.push([0, iVilla]);
    out.sort((a, b) => a[0] - b[0]);
    const unite = [];
    for(const r of out){
      const u = unite[unite.length - 1];
      if(u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]); else unite.push(r);
    }
    return unite;
  });
}

export function deposito({ materiali, campo, materialiCampo, parent, solids, momento = 'oggi' }){
  const M = PIANTA.maschera, C = m(M.cella), X0 = m(M.x0), Z0 = m(M.z0);
  const bande = [1.1, 0.9, 1.2, 0.8, 1.0];             // in unità, somma 5 = 20 m
  const base = QUOTA.spiaggia;
  const pezzi = { fuori:[], campo:[] };
  righe(momento).forEach((corse, j) => {
    const z = Z0 + (j + 0.5) * C;
    for(const [i0, i1] of corse){
      let a = X0 + i0*C, b = X0 + i1*C;
      const dentroZ = campo && z > campo.z0 && z < campo.z1;
      if(dentroZ && b > campo.x0 && a < campo.x1){
        if(a < campo.x0) pezzi.fuori.push([a, campo.x0, z]);
        pezzi.campo.push([Math.max(a, campo.x0), Math.min(b, campo.x1), z]);
        if(b > campo.x1) pezzi.fuori.push([campo.x1, b, z]);
      } else pezzi.fuori.push([a, b, z]);
      solids.push({ x0:a, x1:b, z0:z - C/2, z1:z + C/2, y1:SCARP_H });
    }
  });
  const meshes = [];
  for(const [chiave, mats] of [['fuori', materiali], ['campo', materialiCampo]]){
    const lista = pezzi[chiave];
    if(!lista.length || !mats) continue;
    // bande alterne: due mesh (pari, dispari) più il cappello
    // le bande vanno dalla spiaggia antica (−10 m) alla cima (20 m)
    const k = (SCARP_H - base) / bande.reduce((a, b) => a + b, 0);
    for(const pari of [0, 1]){
      const righe = [];
      let y = base;
      bande.forEach((h, i) => { if(i % 2 === pari) righe.push([y, h*k]); y += h*k; });
      const tot = righe.length * lista.length;
      const im = new InstancedMesh(BOX, mats[pari], tot);
      let n = 0;
      for(const [a, b, z] of lista) for(const [y0, h] of righe){
        T.position.set((a+b)/2, y0 + h/2, z);
        T.scale.set(b - a, h, C); T.updateMatrix(); im.setMatrixAt(n++, T.matrix);
      }
      im.castShadow = im.receiveShadow = true;
      parent.add(im); meshes.push(im);
    }
    const cap = new InstancedMesh(BOX, mats[2], lista.length);
    lista.forEach(([a, b, z], n) => {
      T.position.set((a+b)/2, SCARP_H + 0.175, z); T.scale.set(b - a, 0.35, C); T.updateMatrix(); cap.setMatrixAt(n, T.matrix);
    });
    cap.receiveShadow = true; parent.add(cap); meshes.push(cap);
  }
  return meshes;
}

/* --------------------------------------------------------- le case antiche
   Ogni lato della pianta diventa un muro di 45 cm [ipotesi], alto secondo
   la modalità: «rovina» 2,5–5 m senza tetto, come oggi; «intera» 4 m con il
   tetto sul perimetro. Tutti i muri in una geometria sola per materiale. */
function muro(a, b, spessore, h, y0){
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  if(L < 0.05) return null;
  const g = BOX.clone();
  const M4 = new Matrix4();
  T.position.set((a[0]+b[0])/2, y0 + h/2, (a[1]+b[1])/2);
  T.rotation.set(0, -Math.atan2(dz, dx), 0);
  T.scale.set(L + spessore, h, spessore);
  T.updateMatrix(); M4.copy(T.matrix);
  g.applyMatrix4(M4);
  return g;
}
function casuale(seme){ let s = seme >>> 0; return () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296; }

export function caseAntiche({ materiali, modo = 'rovina', parent, solids }){
  const pareti = [[], [], []], tetti = [];
  for(const e of PIANTA.edifici){
    const r = casuale(e.id);
    const p = e.punti.map(q => [m(q[0]), m(q[1])]);
    const [cx, cz] = centro(e.punti);
    const y0 = quotaDi(cz);
    const h = modo === 'rovina' ? m(2.5 + r()*2.5) : m(4 + (e.area > 400 ? 3 : 0));
    const k = Math.floor(r()*3);
    for(let i = 0; i < p.length - 1; i++){
      const g = muro(p[i], p[i+1], m(0.45), h, y0);
      if(!g) continue;
      pareti[k].push(g);
      const x0 = Math.min(p[i][0], p[i+1][0]) - 0.06, x1 = Math.max(p[i][0], p[i+1][0]) + 0.06;
      const z0 = Math.min(p[i][1], p[i+1][1]) - 0.06, z1 = Math.max(p[i][1], p[i+1][1]) + 0.06;
      solids.push({ x0, x1, z0, z1, y1:y0 + h });
    }
    if(modo === 'intera'){
      // il tetto: la pianta estrusa e ristretta verso il centro, una falda
      // larga ~4 m sul perimetro, il cortile aperto [schematico]
      const s = new Shape(p.map(([x, z]) => ({ x, y:z })));
      const g = new ExtrudeGeometry(s, { depth:m(0.6), bevelEnabled:false });
      g.rotateX(Math.PI/2); g.translate(0, y0 + h + m(0.6), 0);
      tetti.push(g);
    }
  }
  const meshes = [];
  pareti.forEach((lista, k) => {
    if(!lista.length) return;
    const mesh = new Mesh(mergeGeometries(lista, false), materiali[k]);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); meshes.push(mesh);
  });
  if(tetti.length && materiali[3]){
    const mesh = new Mesh(mergeGeometries(tetti, false), materiali[3]);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); meshes.push(mesh);
  }
  return meshes;
}

/* ------------------------------------------------------------ vie e marciapiedi
   Il basolato lungo i tracciati OSM; la larghezza da facciata a facciata è
   misurata sulle piante (mediana): cardini 4,1–6,4 m, Decumano Inferiore
   4,2, Decumano Massimo 16,9. Marciapiedi di 1 m, alti 30 cm [ipotesi, come
   Pompei]; sul Decumano Massimo, chiuso ai carri, marciapiedi di 3 m. */
const LARGHEZZE = {
  'Cardo III Superiore':4.6, 'Cardo III Inferiore':6.3, 'Cardo IV Superiore':4.7, 'Cardo IV Inferiore':5.7,
  'Cardo V Superiore':6.4, 'Cardo V Inferiore':4.1, 'Decumano Inferiore':4.2, 'Decumano Massimo':16.9
};
export function vie({ basolato, marciapiede, parent }){
  const strade = [], marc = [];
  for(const v of PIANTA.vie){
    const tot = LARGHEZZE[v.nome] || 5, mm = v.nome === 'Decumano Massimo' ? 3 : 1;
    const carr = Math.max(1.6, tot - 2*mm);
    for(let i = 0; i < v.punti.length - 1; i++){
      const a = v.punti[i].map(m), b = v.punti[i+1].map(m);
      const y0 = quotaDi((v.punti[i][1] + v.punti[i+1][1]) / 2);
      const g = muro(a, b, m(carr), 0.02, y0 - 0.01); if(g) strade.push(g);
      // i due marciapiedi, spostati di lato
      const dx = b[0]-a[0], dz = b[1]-a[1], L = Math.hypot(dx, dz) || 1, nx = -dz/L, nz = dx/L;
      for(const s of [1, -1]){
        const o = m(carr/2 + mm/2) * s;
        const g2 = muro([a[0]+nx*o, a[1]+nz*o], [b[0]+nx*o, b[1]+nz*o], m(mm), m(0.3), y0);
        if(g2) marc.push(g2);
      }
    }
  }
  const out = [];
  if(strade.length){ const s = new Mesh(mergeGeometries(strade, false), basolato); s.receiveShadow = true; parent.add(s); out.push(s); }
  if(marc.length){ const s = new Mesh(mergeGeometries(marc, false), marciapiede); s.receiveShadow = s.castShadow = true; parent.add(s); out.push(s); }
  return out;
}

/* -------------------------------------------------------- la città moderna
   Le piante OSM degli edifici sopra il deposito, alte tre piani (9,6 m) dove
   OSM non dà il numero di piani [ipotesi]; le strade come asfalto. Si
   saltano gli edifici dentro la fossa: sono coperture e servizi del Parco. */
function scavataIn(xm, zm){
  const M = PIANTA.maschera;
  const j = Math.floor((zm - M.z0) / M.cella), i = Math.floor((xm - M.x0) / M.cella);
  if(j < 0 || j >= M.nz || i < 0 || i >= M.nx) return false;
  return !M.deposito[j].some(([a, b]) => i >= a && i < b);
}
export function cittaModerna({ muri, tetti, asfalto, parent }){
  const corpi = [], coperture = [], strade = [];
  for(const e of PIANTA.moderni){
    if(e.punti.some(([x, z]) => scavataIn(x, z))) continue;
    const piani = Number(e.piani) || 3, h = m(piani * 3.2);
    const s = new Shape(e.punti.map(([x, z]) => ({ x:m(x), y:m(z) })));
    const g = new ExtrudeGeometry(s, { depth:h, bevelEnabled:false });
    g.rotateX(Math.PI/2); g.translate(0, SCARP_H + 0.35 + h, 0);
    corpi.push(g);
    const c = new ExtrudeGeometry(s, { depth:m(0.5), bevelEnabled:false });
    c.rotateX(Math.PI/2); c.translate(0, SCARP_H + 0.35 + h + m(0.5), 0);
    coperture.push(c);
  }
  for(const v of PIANTA.strade_moderne){
    const w = v.tipo === 'primary' ? 10 : v.tipo === 'pedestrian' ? 5 : 7;
    for(let i = 0; i < v.punti.length - 1; i++){
      const a = v.punti[i], b = v.punti[i+1];
      if(scavataIn(a[0], a[1]) && scavataIn(b[0], b[1])) continue;
      const g = muro(a.map(m), b.map(m), m(w), 0.03, SCARP_H + 0.35); if(g) strade.push(g);
    }
  }
  const out = [];
  if(corpi.length){ const s = new Mesh(mergeGeometries(corpi, false), muri); s.castShadow = s.receiveShadow = true; parent.add(s); out.push(s); }
  if(coperture.length){ const s = new Mesh(mergeGeometries(coperture, false), tetti); s.receiveShadow = true; parent.add(s); out.push(s); }
  if(strade.length){ const s = new Mesh(mergeGeometries(strade, false), asfalto); s.receiveShadow = true; parent.add(s); out.push(s); }
  return out;
}

/* ----------------------------------------------------------------- il 79
   Senza deposito: il terreno antico alle sue tre quote, il mare oltre la
   spiaggia [linea di costa: ipotesi, ~140 m dal Decumano Inferiore], e una
   linea color accento attorno a ciò che è scavato. Oltre la linea la città
   continuava, ma la sua pianta è ignota: lì il terreno resta vuoto. */
function inviluppo(punti){
  const p = punti.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const giu = [], su = [];
  for(const q of p){ while(giu.length >= 2 && cr(giu[giu.length-2], giu[giu.length-1], q) <= 0) giu.pop(); giu.push(q); }
  for(const q of p.reverse()){ while(su.length >= 2 && cr(su[su.length-2], su[su.length-1], q) <= 0) su.pop(); su.push(q); }
  return giu.slice(0, -1).concat(su.slice(0, -1));
}
export function terreno79({ terra, sabbia, acqua, linea, parent, LineLoop, BufferGeometry, Vector3 }){
  const lastra = (x0, x1, z0, z1, y, mat) => {
    const g = new Mesh(BOX, mat);
    g.position.set((x0+x1)/2, y - 0.06, (z0+z1)/2); g.scale.set(x1-x0, 0.12, z1-z0);
    g.receiveShadow = true; parent.add(g);
  };
  lastra(-85, 85, -70, m(Z_TERRAZZA), QUOTA.citta, terra);
  lastra(-85, 85, m(Z_TERRAZZA), m(Z_SPIAGGIA), QUOTA.terrazza, terra);
  lastra(-85, 85, m(Z_SPIAGGIA), m(140), QUOTA.spiaggia, sabbia);
  lastra(-85, 85, m(140), 80, QUOTA.spiaggia - 0.05, acqua);
  // i salti fra le quote: senza, fra una lastra e l'altra restava il cielo
  const salto = (z, y0, y1) => {
    const g = new Mesh(BOX, terra);
    g.position.set(0, (y0 + y1)/2, z); g.scale.set(170, y1 - y0, 0.3);
    g.receiveShadow = g.castShadow = true; parent.add(g);
  };
  salto(m(Z_TERRAZZA), QUOTA.terrazza - 0.12, QUOTA.citta);
  salto(m(Z_SPIAGGIA), QUOTA.spiaggia - 0.12, QUOTA.terrazza);
  const tutti = PIANTA.edifici.flatMap(e => e.punti).concat(PIANTA.palestra ? PIANTA.palestra.punti : []);
  const h = inviluppo(tutti).map(([x, z]) => new Vector3(m(x), 0.08, m(z)));
  const l = new LineLoop(new BufferGeometry().setFromPoints(h), linea);
  parent.add(l);
  return l;
}

export { PIANTA, centro };
