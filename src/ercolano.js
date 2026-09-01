import { DEC_MAX, DEC_INF, C3, C4, C5, BEACH_Y, LUOGHI } from './data/ercolano-places.js';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene
} from 'three';

export const ERCOLANO = (function(){

  const U = 4;                        // metri per unità
  const m = v => v / U;

  const eScene = new Scene();
  eScene.background = new Color(0xa8b7c2);
  eScene.fog = new Fog(0xa8b7c2, 90, 340);

  const eCam = new PerspectiveCamera(64, 1, 0.1, 900);

  const eSun = new DirectionalLight(0xfff2df, 2.15);
  eSun.position.set(-70, 96, 60);
  eSun.castShadow = true;
  eSun.shadow.mapSize.set(2048, 2048);
  eSun.shadow.camera.left = -60; eSun.shadow.camera.right = 60;
  eSun.shadow.camera.top = 60;   eSun.shadow.camera.bottom = -60;
  eSun.shadow.camera.near = 1;   eSun.shadow.camera.far = 320;
  eSun.shadow.bias = -0.0004;
  eSun.shadow.normalBias = 0.03;
  eScene.add(eSun, eSun.target);
  eScene.add(new HemisphereLight(0xe9f1f6, 0x635a4b, 1.28));
  const eRim = new DirectionalLight(0x9ec3da, 0.34);
  eRim.position.set(60, 26, -50);
  eScene.add(eRim);

  const eRoot = new Group();
  eScene.add(eRoot);

  /* ------------------------------------------------------- materiali */
  // Le texture procedurali vivono nel modulo di Pompei, che viene valutato
  // dopo questo: si registrano qui e si applicano più tardi, con textures().
  const materiali = [];
  function mat(c, tex){
    const mm = new MeshLambertMaterial({ color:c });
    materiali.push({ mm, tex });
    return mm;
  }
  function textures(TEX){
    if(!TEX) return;
    materiali.forEach(o => {
      if(o.tex && TEX[o.tex]){ o.mm.map = TEX[o.tex]; o.mm.needsUpdate = true; }
    });
  }
  const M = {
    tufo:    mat(0xc6b89c, 'plaster'),   // opus reticulatum e intonaci
    tufo2:   mat(0x9e9078, 'plaster'),
    mattone: mat(0x93705a, 'rubble'),    // opus latericium
    legno:   mat(0x7a5a3e),              // i legni carbonizzati di Ercolano
    tetto:   mat(0x9a5a3c, 'tile'),
    strada:  mat(0x60625f, 'basalt'),
    marcia:  mat(0x9b947f, 'stone'),     // marciapiedi
    colonna: mat(0xdfd8c8, 'marble'),
    terra:   mat(0x63594a, 'tuff'),
    dep1:    mat(0x86806f, 'ash'),       // le bancate del deposito
    dep2:    mat(0x6e695d, 'ash'),
    dep3:    mat(0x504c44, 'ash'),
    moderno: mat(0xd6d0c6),
    tettoM:  mat(0x7d5f52),
    asfalto: mat(0x4a4a48),
    acqua:   mat(0x5b7f8c),
    sabbia:  mat(0xa89a80, 'tuff'),
    erba:    mat(0x6f7d54, 'veg')
  };

  /* ------------------------------------ geometria + griglia collisioni */
  const BOXG = new BoxGeometry(1,1,1);
  const solids = [];                   // AABB per le collisioni

  function box(x, y, z, w, h, d, material, solid, parent){
    const mesh = new Mesh(BOXG, material);
    mesh.position.set(x, y + h/2, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true; mesh.receiveShadow = true;
    (parent || eRoot).add(mesh);
    if(solid !== false && h > 0.35)
      solids.push({ x0:x-w/2, x1:x+w/2, z0:z-d/2, z1:z+d/2, y1:y+h });
    return mesh;
  }
  function flat(x, y, z, w, d, material, parent){   // pavimentazioni: non bloccano
    const mesh = new Mesh(BOXG, material);
    mesh.position.set(x, y - 0.06, z);
    mesh.scale.set(w, 0.12, d);
    mesh.receiveShadow = true;
    (parent || eRoot).add(mesh);
    return mesh;
  }

  /* ---------------------------------------------- pianta: assi stradali */
  const NB0 = -24, NB1 = -2;                 // banda nord (fra i due decumani)
  const SB0 = 2,   SB1 = 24;                 // banda sud (verso il mare)
  const TOWN_Y = 0;

  // suolo dell'area scavata
  flat(2, TOWN_Y, -2, 104, 60, M.terra);

  // decumani
  flat(2, TOWN_Y, DEC_MAX, 104, 3.2, M.strada);
  flat(2, TOWN_Y, DEC_INF, 104, 2.2, M.strada);
  // cardini
  [C3, C4, C5].forEach(cx => flat(cx, TOWN_Y, -12, 1.8, 30, M.strada));
  [C3, C4, C5].forEach(cx => flat(cx, TOWN_Y, 13, 1.8, 26, M.strada));

  // marciapiedi lungo i decumani
  [[DEC_MAX-2.0],[DEC_MAX+2.0],[DEC_INF-1.5],[DEC_INF+1.5]].forEach(r =>
    flat(2, TOWN_Y + 0.10, r[0], 104, 0.9, M.marcia));

  /* ------------------------------------------- corpi di fabbrica romani */
  // Volumetrie schematiche: piano terra 4 m, piano superiore 3 m dove
  // documentato. Non è un rilievo.
  function casa(x, z, w, d, piani, material, tetto){
    const h1 = m(4);
    box(x, 0, z, w, h1, d, material || M.tufo);
    if(piani > 1) box(x, h1, z, w*0.98, m(3), d*0.98, M.tufo2, false);
    const top = piani > 1 ? h1 + m(3) : h1;
    if(tetto !== false) box(x, top, z, w*1.05, m(0.8), d*1.05, M.tetto, false);
    return top;
  }
  // cortile: quattro ali attorno a un vuoto
  function atrio(x, z, w, d, material){
    const t = Math.min(w, d) * 0.26;
    box(x, 0, z - d/2 + t/2, w, m(4), t, material || M.tufo);
    box(x, 0, z + d/2 - t/2, w, m(4), t, material || M.tufo);
    box(x - w/2 + t/2, 0, z, t, m(4), d - 2*t, material || M.tufo);
    box(x + w/2 - t/2, 0, z, t, m(4), d - 2*t, material || M.tufo);
  }

  // ---- INSULA VI (fra Cardo III e Cardo IV, banda nord)
  // Terme Centrali VI.1 (ingresso su Cardo III), Sede degli Augustali VI.21
  // all'incrocio Cardo III / Decumano Massimo, Casa dei Due Atri VI.29.
  atrio(-14, -18, 9, 9, M.tufo);                 // Terme Centrali, corpo ovest
  box(-14, 0, -12, 9, m(5.5), 3, M.mattone);     // sala absidata schematica
  casa(-5.5, -18.5, 7, 8, 2);                    // Casa dei Due Atri VI.29
  casa(-16, -23.5, 6, 3.5, 1, M.tufo);           // Sede degli Augustali VI.21
  casa(-7, -23.5, 8, 3.5, 2);
  atrio(-10, -6, 12, 6, M.tufo2);

  // ---- INSULA V (fra Cardo IV e Cardo V, banda nord)
  // Casa del Bicentenario V.15 sul lato sud del Decumano Massimo.
  casa(6, -23, 8, 5, 2, M.tufo);                 // Casa del Bicentenario
  casa(14, -23, 7, 5, 2, M.tufo2);
  atrio(9, -15, 14, 9, M.tufo);
  casa(15.5, -7, 6, 8, 2);
  casa(4, -6.5, 6, 7, 1);

  // ---- INSULA III (fra Cardo III e Cardo IV, banda sud)
  // Casa a Graticcio III.14 e Casa del Tramezzo di Legno III.11, entrambe
  // sul Cardo IV Inferiore. Il graticcio (opus craticium) è la ragione per
  // cui questa insula è celebre: legno e canne, conservati dal carbonio.
  casa(-4, 4.5, 7, 5, 2, M.legno);               // Casa a Graticcio III.14
  casa(-4, 11, 7, 6, 2, M.tufo);                 // Casa del Tramezzo di Legno III.11
  atrio(-13, 8, 10, 9, M.tufo2);
  casa(-13, 18, 10, 7, 1);
  casa(-4, 19, 7, 6, 2, M.tufo2);

  // ---- INSULA IV (fra Cardo IV e Cardo V, banda sud)
  // Casa dell'Atrio a Mosaico IV.2 all'estremità nord, Casa dei Cervi IV.21
  // all'estremità sud, affacciata sulla terrazza verso il mare.
  atrio(9, 4.5, 14, 6, M.tufo);                  // Casa dell'Atrio a Mosaico IV.2
  casa(4.5, 12, 6, 8, 2);
  casa(15, 12, 7, 8, 1, M.tufo2);
  atrio(9, 21, 15, 7, M.tufo);                   // Casa dei Cervi IV.21
  for(let i=-2;i<=2;i++)                          // portico verso il mare
    box(9 + i*3, 0, 24.6, 0.5, m(3.6), 0.5, M.colonna);

  // ---- INSULA ORIENTALIS II — la Palestra
  // Campo di 77 × 47 m: qui 19,25 × 11,75 unità. Il campo vero è in gran
  // parte ancora sepolto; scavato è il fronte su Cardo V e il vestibolo.
  const PX = 33, PZ = -12;
  box(PX, 0, PZ - 6.4, 19.25, m(4.5), 1.4, M.mattone);     // portico nord
  box(PX, 0, PZ + 6.4, 19.25, m(4.5), 1.4, M.mattone);     // portico sud
  box(PX - 10.0, 0, PZ, 1.4, m(4.5), 12.5, M.mattone);     // ala su Cardo V
  box(PX + 10.0, 0, PZ, 1.4, m(6.5), 12.5, M.dep2);        // il resto: ancora sepolto
  flat(PX, TOWN_Y, PZ, 18, 11.5, M.erba);
  flat(PX, TOWN_Y + 0.04, PZ, 6.5, 1.2, M.acqua);          // vasca cruciforme
  flat(PX, TOWN_Y + 0.04, PZ, 1.2, 5.5, M.acqua);
  for(let i=-4;i<=4;i++) box(PX + i*2.2, 0, PZ - 5.6, 0.45, m(3.4), 0.45, M.colonna);
  casa(24.5, -22, 4, 6, 2, M.mattone);                     // vestibolo Ins. Or. II.4

  // ---- INSULA ORIENTALIS I — terrazze verso la spiaggia
  // Casa del Rilievo di Telefo Ins. Or. I.2, su tre livelli, non tutti scavati.
  box(30, -0.9, 10, 16, m(3.6), 8, M.tufo);
  box(30, TOWN_Y - 0.9, 17, 16, m(3.0), 6, M.tufo2);
  for(let i=-2;i<=2;i++) box(30 + i*3, TOWN_Y - 0.9 + m(3.0), 17, 0.5, m(3.2), 0.5, M.colonna);
  box(41, -1.6, 13, 5, m(4.0), 14, M.dep2);                // parte non scavata

  /* ------------------------------------- terrazze, fornici, spiaggia */
  // Le terrazze (Area Sacra e Terrazza di M. Nonio Balbo) stanno sopra i
  // fornici; i fornici stanno al livello della spiaggia antica.
  const TER_Z = 27, TER_Y = -1.1;
  flat(6, TER_Y, TER_Z, 46, 6, M.marcia);
  box(-8, TER_Y, TER_Z - 1.4, 7, m(4.2), 3, M.tufo);       // tempio, Area Sacra
  for(let i=-2;i<=2;i++) box(-8 + i*1.5, TER_Y, TER_Z - 3.0, 0.5, m(3.6), 0.5, M.colonna);
  box(14, TER_Y, TER_Z - 1.0, 4, m(1.2), 2.5, M.marcia);   // ara di Nonio Balbo

  // scalinata dalla terrazza alla spiaggia
  for(let i=0;i<8;i++)
    box(4, TER_Y - i*0.175, TER_Z + 3.4 + i*0.5, 4, 0.18, 0.5, M.marcia, false);

  // spiaggia antica
  flat(6, BEACH_Y, 37, 76, 14, M.sabbia);
  flat(6, BEACH_Y - 0.05, 45, 76, 8, M.acqua);

  // I DODICI FORNICI — sei a ovest e sei a est della scalinata.
  const forniciX = [];
  for(let i=0;i<6;i++) forniciX.push(-14 + i*2.9);      // sei a ovest
  for(let i=0;i<6;i++) forniciX.push(6.5 + i*2.9);      // sei a est
  forniciX.forEach(fx => {
    box(fx, BEACH_Y, 31.6, 2.5, m(5.2), 3.4, M.mattone);       // setto e volta
    box(fx, BEACH_Y, 33.4, 1.7, m(3.4), 0.4, M.dep3, false);   // il vano, in ombra
  });
  box(6, BEACH_Y + m(5.2), 31.0, 44, m(2.0), 5, M.tufo);       // massa sopra i fornici

  /* ------------------------------------------- il fronte di scavo -----
     Non un muro solo: corre lungo il Decumano Massimo e gira a nord-ovest
     sopra la Basilica Noniana. Sopra: corso Resina e la città moderna. */
  const SCARP_H = 5.0;                 // 20 m, valore modale delle fonti
  function scarpata(x, z, w, d){
    const bande = [1.1, 0.9, 1.2, 0.8, 1.0];
    let y = 0;
    bande.forEach((h,i) => {
      box(x, y, z, w, h, d, i%2 ? M.dep2 : M.dep1);
      y += h;
    });
    box(x, y, z, w*1.02, 0.35, d*1.02, M.dep3, false);
    return y;
  }
  scarpata(2, DEC_MAX - 4.4, 104, 5);            // fronte lungo il Decumano Massimo
  scarpata(-40, -6, 12, 46);                     // ritorno a ovest, sopra Insula VII e II
  scarpata(48, 6, 12, 52);                       // ritorno a est
  scarpata(6, 44, 88, 8);                        // limite verso il mare

  // Basilica Noniana VII.16 — 29 × 16 m, scavata all'aperto solo in parte:
  // il muro est fu portato alla luce nel 1960-62, il resto resta sotto.
  box(-26, 0, -16, 7.25, m(5.0), 4, M.tufo);
  box(-31, 0, -16, 3, m(6.5), 4, M.dep2);

  // Insula II, parzialmente scavata: Casa di Aristide, d'Argo, del Genio
  casa(-27, 8, 8, 7, 1, M.tufo2);
  casa(-27, 18, 8, 6, 1, M.tufo);
  box(-34, 0, 13, 5, m(6.0), 22, M.dep2);        // oltre: Cardo II, non scavato

  /* ------------------------------------------ la città moderna, sopra */
  const modern = new Group(); eRoot.add(modern);
  // corso Resina: l'antica Strada Regia delle Calabrie, sopra la città sepolta
  box(2, SCARP_H, DEC_MAX - 4.4, 104, 0.12, 2.6, M.asfalto, false, modern);
  const palazzi = [
    [-34,-33,7,9],[-24,-34,8,8],[-13,-33,9,10],[-1,-34,8,8],
    [10,-33,9,9],[22,-34,8,8],[33,-33,9,10],[43,-34,7,8]
  ];
  palazzi.forEach((p,i) => {
    const h = m(9 + (i%3)*3.5);
    box(p[0], SCARP_H, p[1], p[2], h, p[3], M.moderno, true, modern);
    box(p[0], SCARP_H + h, p[1], p[2]*1.06, m(0.7), p[3]*1.06, M.tettoM, false, modern);
  });
  // qualche edificio anche sui ritorni laterali
  [[-40,-16,7,8],[-40,4,7,9],[48,-14,7,8],[48,10,7,9],[48,26,7,8]].forEach((p,i) => {
    const h = m(9 + (i%2)*3);
    box(p[0], SCARP_H, p[1], p[2], h, p[3], M.moderno, true, modern);
    box(p[0], SCARP_H + h, p[1], p[2]*1.06, m(0.7), p[3]*1.06, M.tettoM, false, modern);
  });




  /* ------------------------------------------------ marcatori e cartigli */
  const hotspots = [];
  const CONEG = new ConeGeometry(0.42, 1.05, 4);
  const CONEM = new MeshBasicMaterial({ color:0x7fb8a3 });
  LUOGHI.forEach(p => {
    const g = new Group();
    g.position.set(p.x, p.y, p.z);
    const cone = new Mesh(CONEG, CONEM);
    g.add(cone);
    eRoot.add(g);
    hotspots.push({ data:p, group:g, cone:cone });
  });

  /* -------------------------------------------------- collisioni ------ */
  // Griglia booleana sul rettangolo dello scavo: più rapida di scorrere
  // tutte le scatole a ogni passo.
  const GX0 = -52, GZ0 = -40, GW = 112, GD = 92, CELL = 0.5;
  const NX = Math.ceil(GW/CELL), NZ = Math.ceil(GD/CELL);
  const grid = new Uint8Array(NX*NZ);
  const EYE = 0.45, RAD = 0.32;         // 1,80 m di altezza occhio
  solids.forEach(s => {
    if(s.y1 < EYE * 0.9) return;        // sotto il ginocchio: si scavalca
    const i0 = Math.max(0, Math.floor((s.x0 - GX0 - RAD)/CELL));
    const i1 = Math.min(NX-1, Math.ceil((s.x1 - GX0 + RAD)/CELL));
    const j0 = Math.max(0, Math.floor((s.z0 - GZ0 - RAD)/CELL));
    const j1 = Math.min(NZ-1, Math.ceil((s.z1 - GZ0 + RAD)/CELL));
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) grid[j*NX+i] = 1;
  });
  function bloccato(x, z){
    const i = Math.floor((x - GX0)/CELL), j = Math.floor((z - GZ0)/CELL);
    if(i < 0 || j < 0 || i >= NX || j >= NZ) return true;
    return grid[j*NX+i] === 1;
  }
  // quota del terreno: città a 0, terrazza e spiaggia più in basso
  function quota(x, z){
    if(z > 33.5) return BEACH_Y;
    if(z > 30.0) return BEACH_Y + (33.5 - z)/3.5 * (TER_Y - BEACH_Y);
    if(z > 24.5) return TER_Y;
    return TOWN_Y;
  }

  /* ------------------------------------------------- comandi in prima persona */
  const pos = { x:0, y:0, z:-6 };
  let yaw = 0, pitch = -0.05, vx = 0, vz = 0;

  /* In volo si esce dal vincolo del terreno e dei muri. Serve perché da
     terra Ercolano non si vede: si cammina in un cardo largo cinque metri
     fra due insulae alte, e la forma dello scavo — quattro isolati, due
     decumani, il fronte che li chiude a monte — non entra mai in quadro.
     A Pompei lo stesso problema è risolto da «Dall'alto»; qui quel bottone
     agiva sulla camera dell'altra scena e non faceva niente. */
  let volo = false;
  let vy = 0;
  const keys = new Set();
  let locked = false, touchLook = null, touchGo = 0;
  let host = null, cbs = {};

  function onKeyDown(e){
    if(!active) return;
    keys.add(e.code);
    if(e.code === 'Escape' && locked) document.exitPointerLock();
  }
  function onKeyUp(e){ keys.delete(e.code); }

  function onMouseMove(e){
    if(!active || !locked) return;
    yaw   -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.25, Math.min(1.15, pitch));
  }
  function onPointerDown(e){
    if(!active) return;
    if(e.pointerType === 'touch'){ touchLook = { id:e.pointerId, x:e.clientX, y:e.clientY }; return; }
    // clic su un marcatore vicino: apre la scheda
    const near = vicino();
    if(near){ cbs.openPanel && cbs.openPanel(near.data); return; }
    if(!locked && host) host.requestPointerLock();
  }
  function onPointerMove(e){
    if(!active || !touchLook || e.pointerId !== touchLook.id) return;
    yaw   -= (e.clientX - touchLook.x) * 0.006;
    pitch -= (e.clientY - touchLook.y) * 0.005;
    pitch = Math.max(-1.25, Math.min(1.15, pitch));
    touchLook.x = e.clientX; touchLook.y = e.clientY;
  }
  function onPointerUp(e){ if(touchLook && e.pointerId === touchLook.id) touchLook = null; }
  function onLockChange(){ locked = (document.pointerLockElement === host); }

  function vicino(){
    let best = null, bd = 5.2;
    hotspots.forEach(h => {
      const dx = h.group.position.x - pos.x, dz = h.group.position.z - pos.z;
      const d = Math.hypot(dx, dz);
      if(d < bd){ bd = d; best = h; }
    });
    return best;
  }

  function muovi(dt){
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    let f = 0, r = 0;
    if(keys.has('KeyW') || keys.has('ArrowUp'))    f += 1;
    if(keys.has('KeyS') || keys.has('ArrowDown'))  f -= 1;
    if(keys.has('KeyA') || keys.has('ArrowLeft'))  r -= 1;
    if(keys.has('KeyD') || keys.has('ArrowRight')) r += 1;
    f += touchGo;
    const len = Math.hypot(f, r) || 1;
    f /= len; r /= len;

    const k = Math.min(1, dt * 12);
    const sy = Math.sin(yaw), cy = Math.cos(yaw);

    if(volo){
      // si vola nella direzione in cui si guarda: abbassando lo sguardo si
      // scende, alzandolo si sale, come a Pompei
      const speed = sprint ? 26 : 11;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const tx = (-sy * cp * f + cy * r) * speed;
      const ty = ( sp * f) * speed;
      const tz = (-cy * cp * f - sy * r) * speed;
      vx += (tx - vx) * k;
      vy += (ty - vy) * k;
      vz += (tz - vz) * k;
      pos.x += vx * dt;
      pos.z += vz * dt;
      pos.y = Math.max(quota(pos.x, pos.z) + 1.2, Math.min(180, pos.y + vy * dt));
      return;
    }

    const speed = sprint ? 4.6 : 1.9;
    const tx = (-sy * f + cy * r) * speed;
    const tz = (-cy * f - sy * r) * speed;
    vx += (tx - vx) * k;
    vz += (tz - vz) * k;
    vy = 0;

    // spostamento con scorrimento lungo i muri, un asse alla volta
    const nx = pos.x + vx * dt;
    if(!bloccato(nx, pos.z)) pos.x = nx; else vx = 0;
    const nz = pos.z + vz * dt;
    if(!bloccato(pos.x, nz)) pos.z = nz; else vz = 0;
    pos.y = quota(pos.x, pos.z);
  }

  /* ------------------------------------------------------------ ciclo */
  let active = false, t0 = 0;

  function update(dt, elapsed){
    muovi(dt);
    eCam.position.set(pos.x, volo ? pos.y : pos.y + EYE, pos.z);
    eCam.rotation.set(0,0,0);
    eCam.rotateY(yaw);
    eCam.rotateX(pitch);

    // il riquadro dell'ombra segue il giocatore
    eSun.target.position.set(volo ? C4 : pos.x, 0, volo ? -4 : pos.z);
    eSun.position.set((volo ? C4 : pos.x) - 34, 52, (volo ? -4 : pos.z) + 30);
    eSun.target.updateMatrixWorld();

    hotspots.forEach((h,i) => {
      h.cone.position.y = Math.sin(elapsed*1.6 + i) * 0.10;
      h.cone.rotation.y = elapsed * 0.7;
    });

    const near = vicino();
    if(cbs.onNear) cbs.onNear(near ? near.data.label : null);
  }

  function resize(w, h){
    eCam.aspect = w/h;
    eCam.updateProjectionMatrix();
  }

  function enter(domElement, callbacks){
    host = domElement;
    cbs = callbacks || {};
    if(!enter.bound){
      enter.bound = true;
      addEventListener('keydown', onKeyDown);
      addEventListener('keyup', onKeyUp);
      addEventListener('mousemove', onMouseMove);
      host.addEventListener('pointerdown', onPointerDown);
      addEventListener('pointermove', onPointerMove);
      addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointerlockchange', onLockChange);
    }
    active = true;
    reset();
  }
  function exit(){
    active = false;
    keys.clear(); vx = vz = 0; touchGo = 0;
    if(document.pointerLockElement === host) document.exitPointerLock();
  }
  /* La posizione d'apertura del volo è composta, non calcolata: da qui
     entrano in quadro insieme i due decumani, i cardini III–V, le quattro
     insulae, il fronte di scavo a monte con corso Resina sopra, e a valle
     la spiaggia con i fornici. È l'unica inquadratura da cui si capisce
     quanto è piccola la parte scavata rispetto a quello che le sta sopra. */
  function dallAlto(on){
    volo = !!on;
    vx = vy = vz = 0;
    if(volo){
      pos.x = C4; pos.z = 62; pos.y = 48;
      yaw = 0; pitch = -0.60;
    } else {
      reset();
    }
    return volo;
  }
  function inVolo(){ return volo; }

  function reset(){
    volo = false; vy = 0;
    // In piedi sul Cardo IV, rivolto verso monte: la prima cosa che si
    // vede è il fronte di scavo con la città moderna sopra. È l'immagine
    // che regge tutta la scena, e va data subito.
    //
    // Da z = -17 l'immagine non arrivava: a una cinquantina di metri la
    // parete riempiva il fotogramma da sola, senza cielo e senza niente
    // accanto con cui confrontarla, e si leggeva come un vicolo cieco
    // invece che come venti metri di deposito. Arretrando di una ventina
    // di metri i muri delle insulae restano ai lati e danno la scala, il
    // basolato in primo piano dice quanto è largo il cardo, e sopra il
    // fronte resta il cielo.
    pos.x = C4; pos.z = -13; pos.y = 0;
    yaw = 0; pitch = 0.11; vx = vz = 0;
  }
  function setGo(v){ touchGo = v; }
  function apri(id){
    const h = hotspots.find(x => x.data.id === id);
    if(!h) return;
    // ci si mette a qualche passo dal marcatore e si gira verso di lui:
    // con yaw fisso metà delle schede si aprivano dando le spalle al luogo
    const off = 5.0;
    pos.x = h.group.position.x; pos.z = h.group.position.z + off;
    pos.y = quota(pos.x, pos.z);
    const fx = h.group.position.x - pos.x, fz = h.group.position.z - pos.z;
    const len = Math.hypot(fx, fz) || 1;
    yaw = Math.atan2(-fx/len, -fz/len);
    pitch = 0.04;
    cbs.openPanel && cbs.openPanel(h.data);
  }

  return { scene:eScene, camera:eCam, update, resize, enter, exit, reset,
           setGo, apri, textures, dallAlto, inVolo, luoghi: LUOGHI,
           isActive: () => active };
})();
