import { DEC_MAX, DEC_INF, C3, C4, C5, BEACH_Y, LUOGHI } from './data/ercolano-places.js';
import { ANCORE, QUOTA, SCARP_H, deposito, caseAntiche, vie, cittaModerna, terreno79, percorsi } from './ercolano-pianta.js';
import { createInhabitants } from './scene/inhabitants.js';
import { POPULATIONS_ERCOLANO } from './data/populations.js';
import { PAL } from './scene/palette.js';
import { trovaPercorso, creaSegno, seguiPercorso } from './scene/cammino.js';
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
  PointLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2
} from 'three';

export const ERCOLANO = (function(){

  const U = 4;                        // metri per unità
  const m = v => v / U;

  const eScene = new Scene();
  eScene.background = new Color(0xa8b7c2);
  eScene.fog = new Fog(0xa8b7c2, 90, 340);

  const eCam = new PerspectiveCamera(64, 1, 0.05, 900);

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
  function textures(TEX, scale){
    if(!TEX) return;
    materiali.forEach(o => {
      if(!o.tex || !TEX[o.tex]) return;
      o.mm.map = TEX[o.tex];
      // a misura vera, come a Pompei (scene/textures.js, mappaMondo)
      if(scale && scale.SCALA_MONDO[o.tex]) scale.mappaMondo(o.mm, scale.SCALA_MONDO[o.tex]);
      if(o.tex === 'basoli') o.mm.color.set(0xffffff);
      o.mm.needsUpdate = true;
    });
  }
  const M = {
    tufo:    mat(0xc6b89c, 'plaster'),   // opus reticulatum e intonaci
    tufo2:   mat(0x9e9078, 'plaster'),
    mattone: mat(0x93705a, 'rubble'),    // opus latericium
    legno:   mat(0x7a5a3e),              // i legni carbonizzati di Ercolano
    tetto:   mat(0x9a5a3c, 'tile'),
    strada:  mat(0x60625f, 'basoli'),
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

  /* ---------------------------------------------------- i quattro momenti
     79: la città intera, senza deposito · 1738: tutto sepolto, i cunicoli ·
     1958: la fine della campagna di Maiuri · oggi: lo scavo com'è.
     Ogni momento accende i suoi gruppi e ricostruisce le collisioni. */
  const MOMENTI = ['79', '1738', '1958', 'oggi'];
  const G = Object.fromEntries(['rovine', 'intere', 'dep_oggi', 'dep_1958', 'dep_1738', 'terra79'].map(k => {
    const g = new Group(); g.name = k; eRoot.add(g); return [k, g];
  }));
  const solidiDeposito = { oggi:[], '1958':[], '1738':[], '79':[] };
  caseAntiche({ materiali:[M.tufo, M.tufo2, M.mattone, M.tetto, M.acqua, M.erba], modo:'rovina', parent:G.rovine, solids });
  caseAntiche({ materiali:[M.tufo, M.tufo2, M.mattone, M.tetto, M.acqua, M.erba], modo:'intera', parent:G.intere, solids:[] });
  // gli abitanti: le stesse figure di Pompei, sulle vie della pianta vera
  const abitanti = createInhabitants({ streets:percorsi(), populations:POPULATIONS_ERCOLANO, places:false });
  eRoot.add(abitanti.group);
  const M_LINEA = new LineBasicMaterial({ color:PAL.accent });
  terreno79({ terra:M.terra, sabbia:M.sabbia, acqua:M.acqua, linea:M_LINEA, parent:G.terra79, LineLoop, BufferGeometry, Vector3 });

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
  const PALESTRA = ANCORE.palestra;
  const CAMPO = { x1:PALESTRA.x1 - 0.5, z0:(PALESTRA.z0 + PALESTRA.z1)/2 - 77/U/2, z1:(PALESTRA.z0 + PALESTRA.z1)/2 + 77/U/2 };
  CAMPO.x0 = CAMPO.x1 - 47/U;
  const PX = (CAMPO.x0 + CAMPO.x1)/2, PZ = (CAMPO.z0 + CAMPO.z1)/2;
  for(let i=-2;i<=2;i++)                                   // portico ovest, schematico
    box(PALESTRA.x0 + 0.9, 0, PZ + i*2.4, m(0.6), m(4.2), m(0.6), M.colonna);
  // Materiali propri, gli stessi colori: con «Guarda sotto la città» le sei
  // facce sovrapposte delle bande, a 0,40 l'una, sommate erano opache e la
  // vasca non si vedeva. Questi si velano di più (VELATI, più sotto).
  const DEP_CAMPO = [mat(0x86806f, 'ash'), mat(0x6e695d, 'ash'), mat(0x504c44, 'ash')];
  for(const mo of ['oggi', '1958', '1738'])
    deposito({ materiali:[M.dep1, M.dep2, M.dep3], campo:CAMPO, materialiCampo:DEP_CAMPO,
               parent:G['dep_' + mo], solids:solidiDeposito[mo], momento:mo });

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
      new CylinderGeometry(6.75, 1.75, 1.75, 28, 1, true, 0, Math.PI), M_SEPOLTO);
    cavea.position.set(TEATRO_X, ORCHESTRA_Y + 0.85, TEATRO_Z);
    cavea.rotation.y = Math.PI;           // aperto verso valle, come il pendio
    // scaena: il fondale, sul lato aperto
    const scaena = new Mesh(new BoxGeometry(1,1,1), M_SEPOLTO);
    scaena.position.set(TEATRO_X, ORCHESTRA_Y + 1.1, TEATRO_Z + 1.2);
    scaena.scale.set(13.5, 2.2, 1.1);
    // il piano dell'orchestra
    const orch = new Mesh(new CylinderGeometry(1.75, 1.75, 0.08, 28), M_SEPOLTO);
    orch.position.set(TEATRO_X, ORCHESTRA_Y, TEATRO_Z);
    // i pozzi borbonici: l'unico modo per arrivarci, allora e adesso
    const pozzo = new Mesh(new CylinderGeometry(0.22, 0.22, SCARP_H - ORCHESTRA_Y, 10), M_SEPOLTO);
    pozzo.position.set(TEATRO_X + 3.0, (SCARP_H + ORCHESTRA_Y)/2, TEATRO_Z + 1.4);
    sepolto.add(cavea, scaena, orch, pozzo);
  }
  /* ------------------------------------------------- la Basilica Noniana
     Sepolta nell'insula VII, all'angolo del Decumano Massimo col Cardo III,
     di fronte al Collegio degli Augustali; indagata dai Borbone per cunicoli,
     non visitabile [Commons, categoria «Basilica Noniana (Herculaneum)»; Pleiades].
     Misure: 29 × 16 m, da una sola fonte terziaria. La coordinata di Commons
     (40°48'24.84" N, 14°20'51.72" E), proiettata come la pianta OSM, cade a
     x −59,5, z −75 m: dentro un rettangolo di 16 m sul Decumano e 29 m sul
     Cardo, appoggiato al filo ovest del Cardo III (x −50,15) e al filo nord
     del Collegio (z −86), a 3,8 m dal centro. L'orientamento è DEDOTTO così,
     non documentato; l'altezza (8 m) è di disegno.
     Oggi se ne vede soltanto il muro est sul Cardo III, scavato nei primi
     anni Sessanta [pompeiiinpictures, Ins. VII]: si disegna solo nel momento
     «oggi»; le due porte laterali non sono disegnate, non ne ho la posizione. */
  const BAS = { x0:m(-66.15), x1:m(-50.15), z0:m(-86), z1:m(-57) };
  {
    const h = m(8), t = m(0.6), cx = (BAS.x0 + BAS.x1)/2, cz = (BAS.z0 + BAS.z1)/2;
    const W = BAS.x1 - BAS.x0, D = BAS.z1 - BAS.z0;
    const muri = [[cx, BAS.z0 + t/2, W, t], [cx, BAS.z1 - t/2, W, t], [BAS.x0 + t/2, cz, t, D], [BAS.x1 - t/2, cz, t, D]];
    for(const [x, z, w, d] of muri){
      const mu = new Mesh(BOXG, M_SEPOLTO); mu.position.set(x, TOWN_Y + h/2, z); mu.scale.set(w, h, d);
      mu.renderOrder = 10; sepolto.add(mu);
    }
    const bordo = [[BAS.x0, BAS.z0], [BAS.x1, BAS.z0], [BAS.x1, BAS.z1], [BAS.x0, BAS.z1]];
    sepolto.add(new LineLoop(new BufferGeometry().setFromPoints(bordo.map(([x, z]) => new Vector3(x, TOWN_Y + 0.05, z))),
      new LineBasicMaterial({ color:PAL.accent, depthTest:false })));
    // il muro est, l'unico a cielo aperto oggi [altezza di disegno]
    box(BAS.x1 - t/2, TOWN_Y, cz, t, m(4), D, M.tufo2, false, G.dep_oggi);
    solidiDeposito.oggi.push({ x0:BAS.x1 - t, x1:BAS.x1, z0:BAS.z0, z1:BAS.z1, y1:TOWN_Y + m(4) });
  }

  /* --------------------------------------------- le gallerie borboniche
     Si scende dall'ingresso vero (OSM, Corso Resina) e si arriva in fondo al
     pozzo, ~25 m sotto la strada [Parco]; una galleria porta alla cavità
     del teatro, svuotato dai Borbone. Documentati: la profondità,
     l'orchestra di marmo bianco, i due piloni settecenteschi di La Vega
     nella scena, la capienza (~2.500 posti, cavea in tre ordini) [Parco].
     NON documentati qui: le misure del teatro e il tracciato dei cunicoli,
     che non sono georiferiti nelle fonti che ho. Proporzioni schematiche:
     orchestra di 7 m di raggio, dieci file di gradini fino a 27 m. */
  const gal = new Group(); gal.visible = false; eScene.add(gal);
  const Y0 = -1.25, RO = 1.75, RC = 6.75, PASSO = 0.5, ALZ = 0.175, TOP = Y0 + 10*ALZ;
  const M_ROCCIA = new MeshLambertMaterial({ color:0x3b3833, side:DoubleSide });
  materiali.push({ mm:M_ROCCIA, tex:'ash' });
  const T = new Vector3(TEATRO_X, 0, TEATRO_Z);
  const dirE = new Vector3(ANCORE.teatro[0] - TEATRO_X, 0, ANCORE.teatro[1] - TEATRO_Z).normalize();
  const P1 = T.clone().addScaledVector(dirE, RC + 0.35), S0 = T.clone().addScaledVector(dirE, RC + 2.8);
  const pezzo = (geo, mat, x, y, z, ry = 0) => { const o = new Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; gal.add(o); return o; };
  // orchestra e gradini: semicerchi a nord della scena (la cavea guarda a sud)
  pezzo(new CylinderGeometry(RO, RO, 0.06, 32, 1, false, Math.PI/2, Math.PI), M.colonna, T.x, Y0 - 0.03, T.z);
  for(let k = 1; k <= 10; k++){
    const r = RO + k*PASSO;
    pezzo(new CylinderGeometry(r, r, k*ALZ, 40, 1, false, Math.PI/2, Math.PI), k % 2 ? M.tufo : M.tufo2, T.x, Y0 + k*ALZ/2, T.z);
  }
  // la scena e i due piloni di La Vega
  box(T.x, Y0, T.z + 1.2, 2*RC, 2.4, 0.4, M.tufo2, false, gal);
  for(const sx of [-2.5, 2.5]) box(T.x + sx, Y0, T.z + 0.8, 1.1, 3.6, 1.1, M.mattone, false, gal);
  // la cavità: parete curva, parete di fondo, volta
  pezzo(new CylinderGeometry(RC + 0.35, RC + 0.35, 4.6, 40, 1, true, Math.PI/2, Math.PI), M_ROCCIA, T.x, Y0 + 2.3, T.z);
  box(T.x, Y0, T.z + 1.6, 2*RC + 0.8, 4.6, 0.3, M_ROCCIA, false, gal);
  pezzo(new CylinderGeometry(RC + 0.4, RC + 0.4, 0.2, 40, 1, false, Math.PI/2, Math.PI), M_ROCCIA, T.x, Y0 + 4.6, T.z);
  box(T.x, Y0 + 4.5, T.z + 0.8, 2*RC + 0.8, 0.2, 1.6, M_ROCCIA, false, gal);
  // la galleria dal pozzo alla cavità, e il pozzo
  {
    const L = S0.distanceTo(P1), mid = S0.clone().add(P1).multiplyScalar(0.5), ang = Math.atan2(dirE.x, dirE.z);
    // un parallelepipedo senza le due teste: con le teste la galleria era
    // chiusa e dal pozzo non si vedeva la cavità (facce 4 e 5, ±z)
    const gt = new BoxGeometry(0.55, 0.62, L);
    gt.setIndex(Array.from(gt.index.array).slice(0, 24)); gt.clearGroups(); gt.addGroup(0, 24, 0);
    const tubo = new Mesh(gt, M_ROCCIA);
    tubo.position.set(mid.x, TOP + 0.31, mid.z); tubo.rotation.y = ang; gal.add(tubo);
    // il pozzo, aperto verso la galleria (altrimenti la sua parete la chiude)
    const verso = Math.atan2(-dirE.x, -dirE.z);
    pezzo(new CylinderGeometry(0.45, 0.45, SCARP_H - TOP, 20, 1, true, verso + 0.7, 2*Math.PI - 1.4), M_ROCCIA, S0.x, (SCARP_H + TOP)/2, S0.z);
    pezzo(new CylinderGeometry(0.45, 0.45, 0.05, 16), M_ROCCIA, S0.x, TOP - 0.02, S0.z);
  }
  const torcia = new PointLight(0xffc48a, 0, 9, 1.4);
  eScene.add(eCam); eCam.add(torcia);

  function inGalleriaLibero(x, z){
    const dx = x - T.x, dz = z - T.z, r = Math.hypot(dx, dz);
    if(r <= RC + 0.15 && dz <= 1.0) return true;                              // la cavità
    const ax = S0.x, az = S0.z, bx = P1.x, bz = P1.z, vx2 = bx - ax, vz2 = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax)*vx2 + (z - az)*vz2) / (vx2*vx2 + vz2*vz2)));
    return Math.hypot(x - ax - t*vx2, z - az - t*vz2) <= 0.22;                // la galleria
  }
  function quotaGalleria(x, z){
    const dx = x - T.x, dz = z - T.z, r = Math.hypot(dx, dz);
    if(r > RC || dz > 0) return r > RC ? TOP : Y0;
    return r <= RO ? Y0 : Y0 + Math.min(10, Math.ceil((r - RO)/PASSO)) * ALZ;
  }
  let inGalleria = false;
  const salvato = {};
  function galleria(on){
    on = !!on && (momento === '1738' || momento === 'oggi');
    if(on === inGalleria) return inGalleria;
    inGalleria = on;
    eRoot.visible = !on; gal.visible = on;
    if(on){
      Object.assign(salvato, { bg:eScene.background, fog:eScene.fog, sole:eSun.intensity, rim:eRim.intensity });
      eScene.background = new Color(0x050404); eScene.fog = new Fog(0x050404, 2, 16);
      eSun.intensity = 0.05; eRim.intensity = 0;
      eScene.children.filter(o => o.isHemisphereLight).forEach(h => { salvato.emi = h.intensity; h.intensity = 0.3; });
      torcia.intensity = 1.5;
      volo = false; vx = vy = vz = 0;
      pos.x = S0.x - dirE.x*0.7; pos.z = S0.z - dirE.z*0.7; pos.y = TOP;   // un passo dentro la galleria
      yaw = Math.atan2(dirE.x, dirE.z); pitch = -0.05;
    } else {
      eScene.background = salvato.bg; eScene.fog = salvato.fog;
      eSun.intensity = salvato.sole; eRim.intensity = salvato.rim;
      eScene.children.filter(o => o.isHemisphereLight).forEach(h => { h.intensity = salvato.emi; });
      torcia.intensity = 0;
      reset();
    }
    return inGalleria;
  }
  function galleriaAttiva(){ return inGalleria; }

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
  // Celle di 25 cm e un ingombro di 32 cm: le stanze delle sei case con
  // l'interno sono larghe 3-4 m e le porte poco più di un metro; con celle
  // di 2 m e un raggio di 1,3 m ogni stanza risultava piena.
  const GX0 = -90, GZ0 = -70, GW = 180, GD = 130, CELL = 0.0625;
  const NX = Math.ceil(GW/CELL), NZ = Math.ceil(GD/CELL);
  const grid = new Uint8Array(NX*NZ);
  const EYE = 0.45, RAD = 0.08;         // 1,80 m di altezza occhio
  // si ricostruisce a ogni cambio di momento: il deposito non è lo stesso
  function griglia(extra){
    grid.fill(0);
    for(const s of solids.concat(extra)){
      if(s.y1 < EYE * 0.9) continue;    // sotto il ginocchio: si scavalca
      // le celle il cui centro cade nella scatola allargata dell'ingombro
      const i0 = Math.max(0, Math.ceil((s.x0 - GX0 - RAD)/CELL - 0.5));
      const i1 = Math.min(NX-1, Math.floor((s.x1 - GX0 + RAD)/CELL - 0.5));
      const j0 = Math.max(0, Math.ceil((s.z0 - GZ0 - RAD)/CELL - 0.5));
      const j1 = Math.min(NZ-1, Math.floor((s.z1 - GZ0 + RAD)/CELL - 0.5));
      for(let j=j0;j<=j1;j++) grid.fill(1, j*NX + i0, j*NX + i1 + 1);
    }
  }
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
    if(e.pointerType === 'touch'){ touchLook = { id:e.pointerId, x:e.clientX, y:e.clientY, x0:e.clientX, y0:e.clientY, mosso:false }; return; }
    // clic su un marcatore vicino: apre la scheda
    const near = vicino();
    if(near){ cbs.openPanel && cbs.openPanel(near.data); return; }
    if(!locked && host) host.requestPointerLock();
  }
  function onPointerMove(e){
    if(!active || !touchLook || e.pointerId !== touchLook.id) return;
    if(Math.hypot(e.clientX - touchLook.x0, e.clientY - touchLook.y0) > 10) touchLook.mosso = true;
    yaw   -= (e.clientX - touchLook.x) * 0.006;
    pitch -= (e.clientY - touchLook.y) * 0.005;
    pitch = Math.max(-1.25, Math.min(1.15, pitch));
    touchLook.x = e.clientX; touchLook.y = e.clientY;
  }
  function onPointerUp(e){
    if(!touchLook || e.pointerId !== touchLook.id) return;
    const tocco = !touchLook.mosso;
    touchLook = null;
    if(tocco && active) tocca(e);
  }

  /* «Tocca dove vuoi andare», come a Pompei (scene/cammino.js): un cono
     toccato apre la scheda, la strada toccata è la meta. Il percorso si
     cerca a celle di 50 cm sulla griglia delle collisioni. Non in volo e
     non nelle gallerie, dove si va avanti e indietro con i bottoni. */
  const raggio = new Raycaster(), ndc = new Vector2();
  const piano = new Plane(new Vector3(0, 1, 0), 0), punto = new Vector3();
  let percorso = null;
  const segno = creaSegno({ RingGeometry, MeshBasicMaterial, Mesh, colore:PAL.accent });
  eScene.add(segno);
  function fermaPercorso(){ percorso = null; segno.visible = false; }
  function tocca(e){
    const r = host.getBoundingClientRect();
    ndc.set(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
    raggio.setFromCamera(ndc, eCam);
    const coni = hotspots.filter(h => h.group.visible).map(h => h.cone);
    const hit = raggio.intersectObjects(coni, false)[0];
    if(hit){
      const h = hotspots.find(x => x.cone === hit.object);
      if(h && cbs.openPanel){ cbs.openPanel(h.data); return; }
    }
    if(volo || inGalleria) return;
    piano.constant = -quota(pos.x, pos.z);
    if(!raggio.ray.intersectPlane(piano, punto)) return;
    if(punto.distanceTo(eCam.position) > 120) return;
    const punti = trovaPercorso({ libero:(x, z) => !bloccato(x, z), da:[pos.x, pos.z],
                                  a:[punto.x, punto.z], passo:0.125, margine:8 });
    if(!punti){ fermaPercorso(); return; }
    const [fx, fz] = punti[punti.length - 1];
    percorso = { punti, fermo:0, x:pos.x, z:pos.z };
    segno.position.set(fx, quota(fx, fz) + 0.02, fz);
    segno.visible = true;
  }
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

    const speed = sprint || corsa ? 1.0 : 0.35;     // 4 e 1,4 m/s: il passo vero (erano 18 e 7,6)
    let tx = (-sy * f + cy * r) * speed;
    let tz = (-cy * f - sy * r) * speed;
    // il percorso toccato, finché non si usano tasti o bottoni
    if(percorso && (f || r || inGalleria)) fermaPercorso();
    if(percorso){
      const v = seguiPercorso(percorso, pos.x, pos.z, speed);
      if(!v) fermaPercorso();
      else {
        [tx, tz] = v;
        if(!touchLook && Math.hypot(v[0], v[1]) > 0.1){
          let d = Math.atan2(-v[0], -v[1]) - yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          yaw += d * Math.min(1, dt * 2.2);
        }
        // fermo contro qualcosa: meno di 20 cm in un secondo e mezzo, si rinuncia
        // (lo spostamento di un solo fotogramma, al passo, è sempre minuscolo)
        if(Math.hypot(pos.x - percorso.x, pos.z - percorso.z) > 0.05){ percorso.x = pos.x; percorso.z = pos.z; percorso.fermo = 0; }
        else if((percorso.fermo += dt) > 1.5) fermaPercorso();
      }
    }
    vx += (tx - vx) * k;
    vz += (tz - vz) * k;
    vy = 0;

    // spostamento con scorrimento lungo i muri, un asse alla volta
    const blocca = inGalleria ? (x, z) => !inGalleriaLibero(x, z) : bloccato;
    const nx = pos.x + vx * dt;
    if(!blocca(nx, pos.z)) pos.x = nx; else vx = 0;
    const nz = pos.z + vz * dt;
    if(!blocca(pos.x, nz)) pos.z = nz; else vz = 0;
    pos.y = inGalleria ? quotaGalleria(pos.x, pos.z) : quota(pos.x, pos.z);
  }

  /* ------------------------------------------------------------ ciclo */
  let active = false, t0 = 0;

  function update(dt, elapsed){
    muovi(dt);
    abitanti.update(elapsed, dt, 0);
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

    if(segno.visible){ const k = 1 + Math.sin(elapsed * 4) * 0.12; segno.scale.set(k, k, k); }
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
    if(inGalleria) galleria(false);
    active = false;
    keys.clear(); vx = vz = 0; touchGo = 0; fermaPercorso();
    if(document.pointerLockElement === host) document.exitPointerLock();
  }
  /* La posizione d'apertura del volo è composta, non calcolata: da qui
     entrano in quadro insieme i due decumani, i cardini III–V, le quattro
     insulae, il fronte di scavo a monte con corso Resina sopra, e a valle
     la spiaggia con i fornici. È l'unica inquadratura da cui si capisce
     quanto è piccola la parte scavata rispetto a quello che le sta sopra. */
  function dallAlto(on){
    volo = !!on;
    fermaPercorso();
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
    // spegnendo la vista «sotto» nel 1738 la città di oggi torna velata
    if(!sepoltoOn && momento === '1738') setMomento('1738');
    return sepoltoOn;
  }
  function sepoltoAttivo(){ return sepoltoOn; }

  let momento = 'oggi';
  function setMomento(mo){
    if(!MOMENTI.includes(mo)) mo = 'oggi';
    if(inGalleria && mo !== '1738' && mo !== 'oggi') galleria(false);
    momento = mo;
    G.rovine.visible = mo === 'oggi' || mo === '1958';
    G.intere.visible = mo === '79';
    G.terra79.visible = mo === '79';
    G.dep_oggi.visible = mo === 'oggi';
    G.dep_1958.visible = mo === '1958';
    G.dep_1738.visible = mo === '1738';
    modern.visible = mo !== '79';
    // nel 1738 la città di oggi resta come segnaposto velato: la pianta di
    // Resina nel Settecento non l'ho (scelta di Domenico, 14 ottobre 2026)
    if(!sepoltoOn) for(const mt of [M.moderno, M.tettoM, M.asfalto]){
      mt.transparent = mo === '1738'; mt.opacity = mo === '1738' ? 0.28 : 1;
      mt.depthWrite = mo !== '1738'; mt.needsUpdate = true;
    }
    griglia(solidiDeposito[mo]);
    abitanti.setEpoch(MOMENTI.indexOf(mo));
    // nel 1738 a terra non si sta: tutto è sotto 20 m di deposito
    if(mo === '1738' && !volo){ volo = true; pos.y = SCARP_H + 6; pitch = -0.4; }
    return momento;
  }
  function momentoAttivo(){ return momento; }
  // Due cose sepolte, due inquadrature. Da qualunque altro punto restano
  // dietro il deposito: il teatro si vede da oltre il fronte, guardando a
  // monte e in basso; la vasca dall'alto, dal lato del mare.
  function guardaSotto(dove){
    volo = true; vx = vy = vz = 0;
    if(dove === 'vasca'){ pos.x = PX; pos.y = 16; pos.z = PZ + 15; yaw = 0; pitch = -0.72; }
    else { pos.x = TEATRO_X + 2; pos.z = TEATRO_Z + 20; pos.y = 15; yaw = 0; pitch = -0.58; }
  }
  // solo per ?debug: un'inquadratura fissa, in volo, per le foto di verifica
  // (sotto 1,2 unità si sta a terra, ad altezza d'occhio: il volo terrebbe
  // la camera ad almeno 4,8 m, sopra i tetti)
  function inquadra(x, y, z, imbardata, beccheggio){
    volo = y >= 1.2; vx = vy = vz = 0;
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
  // «Corri» sul tocco: vale per il percorso toccato
  let corsa = false;
  function setCorsa(v){ corsa = !!v; }
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

  setMomento('oggi');

  return { scene:eScene, camera:eCam, update, resize, enter, exit, reset,
           setGo, setCorsa, apri, textures, dallAlto, inVolo,
           mostraSepolto, sepoltoAttivo, guardaSotto, inquadra, setMomento, momentoAttivo,
           usaFigure: f => abitanti.usaFigure(f), galleria, galleriaAttiva, bloccato,
           momenti: MOMENTI, luoghi: LUOGHI,
           isActive: () => active };
})();
