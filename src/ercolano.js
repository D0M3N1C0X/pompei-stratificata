import { DEC_MAX, DEC_INF, C3, C4, C5, BEACH_Y, LUOGHI } from './data/ercolano-places.js';
import { ANCORE, QUOTA, SCARP_H, deposito, caseAntiche, vie, cittaModerna } from './ercolano-pianta.js';
import { PAL } from './scene/palette.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import vascaUrl from './assets/modelli/ercolano-palestra-vasca.glb?url';
import {
  BoxGeometry,
  BufferGeometry,
  LineBasicMaterial,
  LineLoop,
  Vector3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
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

  /* ---------------------------------------------- la città scavata ----
     Case, vie e perimetro vengono dalla pianta vera (ercolano-pianta.js,
     dati OpenStreetMap): la scena disegnata a mano misurava 416 × 240 m
     invece di circa 180 × 210, con i cardini a 80 m invece che a 47–49. */
  const TOWN_Y = QUOTA.citta, TER_Y = QUOTA.terrazza;
  // il piano antico, per fasce di quota; fuori dalla fossa lo copre il deposito
  flat(-12, TOWN_Y, -5, 150, 50, M.terra);
  flat(-12, TER_Y, 24.1, 150, 8.3, M.terra);
  flat(-12, BEACH_Y, 32.2, 150, 8, M.sabbia);
  vie({ basolato:M.strada, marciapiede:M.marcia, parent:eRoot });
  caseAntiche({ materiali:[M.tufo, M.tufo2, M.mattone, M.tetto], modo:'rovina', parent:eRoot, solids });

  // ---- INSULA ORIENTALIS II — la Palestra
  // Campo di 77 × 47 m (Maiuri 1960, «l'area rettangolare della palestra»):
  // qui 19,25 × 11,75 unità. I 105 × 70 m di altre fonti sono l'intero
  // complesso, non il campo: misurano un'altra cosa, non lo contraddicono.
  //
  // All'aperto è scavato solo il lato su Cardo V: portico ovest, sala
  // d'ingresso, vestibolo, sala absidata. Il campo e la vasca cruciforme
  // stanno ancora sotto il deposito, svuotato «come una caverna» solo sopra
  // la parte centrale (Deiss 1968). Fino all'8 ottobre 2026 qui c'era un
  // prato con la vasca a cielo aperto, lunga la metà del vero: contraddiceva
  // la scheda. Ora il deposito copre il campo, e la vasca — da Blender, sulla
  // misura pubblicata dei bracci — si vede con «ciò che è sotto».
  // Il complesso, in OSM, misura 78 m lungo i decumani e 102 lungo i
  // cardini: il campo di 77 × 47 m entra solo con il lato lungo sui cardini
  // [dedotto], e il lato ovest lascia ~30 m alle sale su Cardo V, la parte
  // scavata. La vasca, con il braccio lungo sul lato lungo, ruota con lui.
  const PAL = ANCORE.palestra;
  const CAMPO = { x1:PAL.x1 - 0.5, z0:(PAL.z0 + PAL.z1)/2 - 77/U/2, z1:(PAL.z0 + PAL.z1)/2 + 77/U/2 };
  CAMPO.x0 = CAMPO.x1 - 47/U;
  const PX = (CAMPO.x0 + CAMPO.x1)/2, PZ = (CAMPO.z0 + CAMPO.z1)/2;
  for(let i=-2;i<=2;i++)                                   // portico ovest, schematico
    box(PAL.x0 + 0.9, 0, PZ + i*2.4, m(0.6), m(4.2), m(0.6), M.colonna);
  // Materiali propri, gli stessi colori: con «Guarda sotto la città» le sei
  // facce sovrapposte delle bande, a 0,40 l'una, sommate erano opache e la
  // vasca non si vedeva. Questi si velano di più (VELATI, più sotto).
  const DEP_CAMPO = [mat(0x86806f, 'ash'), mat(0x6e695d, 'ash'), mat(0x504c44, 'ash')];
  deposito({ materiali:[M.dep1, M.dep2, M.dep3], campo:CAMPO, materialiCampo:DEP_CAMPO, parent:eRoot, solids });

  const vasca = new Group();
  vasca.position.set(PX, TOWN_Y, PZ);
  vasca.rotation.y = Math.PI/2;                            // il braccio lungo lungo i cardini
  eRoot.add(vasca);
  // La geometria è quella di Blender; la superficie no: la vasca è sepolta e
  // si mostra come il teatro, nel materiale di «ciò che è sotto» (più avanti
  // il gruppo passa dentro «sepolto»). Così non c'è un secondo linguaggio
  // per la stessa cosa.
  new GLTFLoader().load(vascaUrl, gltf => {
    gltf.scene.traverse(o => { if(o.isMesh){ o.material = M_SEPOLTO; o.castShadow = o.receiveShadow = false; o.renderOrder = 10; } });
    vasca.add(gltf.scene);
  }, undefined, e => console.warn('Vasca della Palestra di Ercolano non caricata:', e));
  {
    // il contorno color accento: «misura pubblicata», come a Pompei
    const hx = 50/U/2, hy = 30/U/2, w = 5.5/U/2, y = 0.07;
    const croce = [[-hx,-w],[-w,-w],[-w,-hy],[w,-hy],[w,-w],[hx,-w],
                   [hx,w],[w,w],[w,hy],[-w,hy],[-w,w],[-hx,w]];
    vasca.add(new LineLoop(
      new BufferGeometry().setFromPoints(croce.map(([x,z]) => new Vector3(x, y, z))),
      new LineBasicMaterial({ color:PAL.accent })));
  }

  /* ------------------------------------- terrazze, fornici, spiaggia */
  // L'area sacra e la Terrazza di M. Nonio Balbo (piante OSM, sopra) stanno
  // sopra i fornici; i fornici al livello della spiaggia antica, a ~113 m
  // dal Decumano Inferiore. Dodici vani [Pappalardo 1994], larghezza e passo
  // schematici: 6 m l'uno, da x −18 a +52 m.
  const FRONTE_F = 113/U;
  box(4.5, BEACH_Y, FRONTE_F - 1, 19.5, TER_Y - BEACH_Y, 2, M.mattone);
  const forniciX = [];
  for(let i=0;i<12;i++){
    const fx = -18/U + 0.75 + i*1.5;
    forniciX.push(fx);
    box(fx, BEACH_Y, FRONTE_F + 0.02, 0.8, m(3.4), 0.1, M.dep3, false);       // il vano, in ombra
  }
  box(9.5, TER_Y, 22.75, m(3), m(1.2), m(2), M.marcia);                         // ara di Nonio Balbo
  for(let i=0;i<8;i++)                                                          // scalinata verso la spiaggia
    box(-5, TER_Y - i*(TER_Y - BEACH_Y)/8, FRONTE_F - 1 + i*0.35, 2.5, 0.18, 0.35, M.marcia, false);

  /* ---------------------------------------------------- ciò che è sotto

     Il fatto più forte di questa scena era solo testo: il teatro fu il primo
     monumento trovato, nel 1738, e sta venticinque metri sotto il centro
     storico moderno, raggiungibile ancora oggi soltanto per pozzi e gallerie.
     Adesso si può guardare: la città moderna diventa trasparente e sotto
     compare la cavea.

     Le proporzioni sono schematiche. La quota viene dal Parco — circa 25 m
     dal piano stradale moderno, contro i 20 m di deposito — quindi
     l'orchestra sta all'incirca cinque metri sotto il piano antico, il che è
     coerente con un teatro scavato nel pendio.

     La Villa dei Papiri NON è disegnata qui, ed è una scelta: la sua
     posizione è dichiarata incerta nella sua stessa scheda, con le fonti
     ufficiali che la mettono una a nord e l'altra a ovest. Disegnare un
     volume dove non si sa che cosa ci sia sarebbe invenzione. */
  // sotto l'ingresso moderno (OSM, Corso Resina): la cavea poco più a sud-est
  // [posizione approssimata: la pianta del teatro non è in OSM]
  const TEATRO_X = ANCORE.teatro[0] + 3, TEATRO_Z = ANCORE.teatro[1] + 4;
  const sepolto = new Group(); eRoot.add(sepolto); sepolto.visible = false;
  // Vista a raggi X: le cose sepolte si disegnano sopra tutto il resto
  // (depthTest spento, renderOrder alto). Con il deposito a bande ovunque,
  // altrimenti, si vedevano appena.
  const M_SEPOLTO = new MeshBasicMaterial({
    color: 0x9fe6cb, transparent:true, opacity:0.62, depthWrite:false, depthTest:false, side:DoubleSide
  });
  {
    // (TEATRO_X è dichiarato appena sopra il gruppo)
    const ORCHESTRA_Y = -1.25;            // ~25 m sotto la strada moderna
    // cavea: mezzo cilindro, raggio ~27 m
    const cavea = new Mesh(
      new CylinderGeometry(6.75, 4.2, 1.7, 28, 1, true, 0, Math.PI), M_SEPOLTO);
    cavea.position.set(TEATRO_X, ORCHESTRA_Y + 0.85, TEATRO_Z);
    cavea.rotation.y = Math.PI;           // aperto verso valle, come il pendio
    // scaena: il fondale, sul lato aperto
    const scaena = new Mesh(new BoxGeometry(1,1,1), M_SEPOLTO);
    scaena.position.set(TEATRO_X, ORCHESTRA_Y + 1.1, TEATRO_Z + 6.2);
    scaena.scale.set(13.5, 2.2, 1.1);
    // il piano dell'orchestra
    const orch = new Mesh(new CylinderGeometry(4.2, 4.2, 0.08, 28), M_SEPOLTO);
    orch.position.set(TEATRO_X, ORCHESTRA_Y, TEATRO_Z);
    // i pozzi borbonici: l'unico modo per arrivarci, allora e adesso
    const pozzo = new Mesh(new CylinderGeometry(0.22, 0.22, SCARP_H - ORCHESTRA_Y, 10), M_SEPOLTO);
    pozzo.position.set(TEATRO_X + 3.0, (SCARP_H + ORCHESTRA_Y)/2, TEATRO_Z + 1.4);
    sepolto.add(cavea, scaena, orch, pozzo);
  }
  sepolto.add(vasca);                     // la vasca della Palestra, anch'essa sotto
  sepolto.traverse(o => { o.renderOrder = 10; });

  /* ------------------------------------------ la città moderna, sopra */
  const modern = new Group(); eRoot.add(modern);
  cittaModerna({ muri:M.moderno, tetti:M.tettoM, asfalto:M.asfalto, parent:modern });

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
  const GX0 = -90, GZ0 = -70, GW = 180, GD = 130, CELL = 0.5;
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
  // in metri dal Decumano Inferiore: città fino a 76 m, rampa, terrazza,
  // rampa, spiaggia dopo 117 m (le rampe sono di disegno: il passaggio vero
  // è la scalinata accanto ai fornici)
  function quota(x, z){
    const zm = z*U;
    const rampa = (a, b, ya, yb) => ya + (yb - ya) * Math.min(1, Math.max(0, (zm - a)/(b - a)));
    if(zm < 84) return rampa(76, 84, TOWN_Y, TER_Y);
    return rampa(109, 117, TER_Y, BEACH_Y);
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

  let sepoltoOn = false;
  // Due gradi di trasparenza, non uno: la città moderna quasi sparisce
  // perché è ciò che impedisce di vedere, il deposito resta leggibile
  // perché è ciò di cui la scena parla.
  const VELATI = [
    { m:[M.moderno, M.tettoM, M.asfalto],        a:0.16 },
    // il deposito, dal 13 ottobre 2026, è fatto di bande impilate ovunque:
    // sei facce a 0,40 sommate erano opache e il teatro spariva; a 0,12
    // restano leggibili come massa e lasciano vedere sotto
    { m:[M.dep1, M.dep2, M.dep3],                a:0.12 },
    { m:[M.terra],                               a:0.40 },
    { m:DEP_CAMPO,                               a:0.10 }   // sopra la vasca della Palestra
  ];
  function mostraSepolto(on){
    sepoltoOn = !!on;
    sepolto.visible = sepoltoOn;
    if(sepoltoOn) guardaSotto('teatro');
    for(const g of VELATI) for(const m of g.m){
      m.transparent = sepoltoOn;
      m.opacity = sepoltoOn ? g.a : 1;
      m.depthWrite = !sepoltoOn;
      m.needsUpdate = true;
    }
    return sepoltoOn;
  }
  function sepoltoAttivo(){ return sepoltoOn; }
  // Due cose sepolte, due inquadrature. Da qualunque altro punto restano
  // dietro il deposito: il teatro si vede da oltre il fronte, guardando a
  // monte e in basso; la vasca dall'alto, dal lato del mare.
  function guardaSotto(dove){
    volo = true; vx = vy = vz = 0;
    if(dove === 'vasca'){ pos.x = PX; pos.y = 16; pos.z = PZ + 15; yaw = 0; pitch = -0.72; }
    else { pos.x = TEATRO_X + 2; pos.z = TEATRO_Z + 20; pos.y = 15; yaw = 0; pitch = -0.58; }
  }
  // solo per ?debug: un'inquadratura fissa, in volo, per le foto di verifica
  function inquadra(x, y, z, imbardata, beccheggio){
    volo = true; vx = vy = vz = 0;
    pos.x = x; pos.y = y; pos.z = z; yaw = imbardata; pitch = beccheggio;
  }
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
           setGo, apri, textures, dallAlto, inVolo,
           mostraSepolto, sepoltoAttivo, guardaSotto, inquadra, luoghi: LUOGHI,
           isActive: () => active };
})();
