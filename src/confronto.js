import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial
} from 'three';

export const CONFRONTO = (function(){

  const U = 4;                       // metri per unità
  const m = v => v / U;              // metri -> unità

  const cScene = new Scene();
  cScene.background = new Color(0xb3b9be);
  cScene.fog = new Fog(0xb3b9be, 190, 520);

  const cCam = new PerspectiveCamera(46, 1, 0.1, 900);

  const sunC = new DirectionalLight(0xfff3e2, 1.7);
  sunC.position.set(-40, 70, 46);
  cScene.add(sunC);
  const hemiC = new HemisphereLight(0xeaf0f4, 0x5a5346, 1.15);
  cScene.add(hemiC);
  const rimC = new DirectionalLight(0x9fc0d8, 0.35);
  rimC.position.set(50, 22, -40);
  cScene.add(rimC);

  const root = new Group();
  cScene.add(root);

  /* ------------------------------------------------------- materiali */
  const MAT = {
    terra:   new MeshLambertMaterial({ color:0x6f6552 }),
    muro:    new MeshLambertMaterial({ color:0xc0b49c }),
    muro2:   new MeshLambertMaterial({ color:0xa89b84 }),
    tetto:   new MeshLambertMaterial({ color:0x9d5c3d }),
    lapilli: new MeshLambertMaterial({ color:0xded8c6 }),
    cenere:  new MeshLambertMaterial({ color:0xa79f8c }),
    flusso:  new MeshLambertMaterial({ color:0x76736c }),
    flusso2: new MeshLambertMaterial({ color:0x635f59 }),
    moderno: new MeshLambertMaterial({ color:0xd8d3ca }),
    tettoM:  new MeshLambertMaterial({ color:0x7d5f52 }),
    uomo:    new MeshLambertMaterial({ color:0x2f3a44 }),
    riga:    new MeshBasicMaterial({ color:0x2a2a28 })
  };

  function box(px,py,pz,w,h,d,mat,parent){
    const g = new Mesh(new BoxGeometry(w,h,d), mat);
    g.position.set(px, py + h/2, pz);
    (parent||root).add(g);
    return g;
  }

  /* --------------------------------------------------------- cartigli */
  function txt(text, sub, px, py, pz, w, parent){
    const c = document.createElement('canvas');
    const S = 2;
    c.width = 512*S; c.height = 168*S;
    const x = c.getContext('2d');
    x.scale(S,S);
    x.fillStyle = 'rgba(20,20,18,0.92)';
    x.beginPath();
    const r = 12, W = 512, H = 168;
    x.moveTo(r,0); x.arcTo(W,0,W,H,r); x.arcTo(W,H,0,H,r);
    x.arcTo(0,H,0,0,r); x.arcTo(0,0,W,0,r); x.fill();
    x.fillStyle = '#f2efe6';
    x.font = '600 46px ui-sans-serif, system-ui, sans-serif';
    x.textBaseline = 'top';
    x.fillText(text, 26, 26);
    if(sub){
      x.fillStyle = '#c8c2b2';
      x.font = '30px ui-sans-serif, system-ui, sans-serif';
      const words = sub.split(' ');
      let line = '', yy = 88;
      for(const wd of words){
        if(x.measureText(line + wd).width > 458){ x.fillText(line, 26, yy); line = wd + ' '; yy += 36; }
        else line += wd + ' ';
      }
      x.fillText(line, 26, yy);
    }
    const tx = new CanvasTexture(c);
    tx.anisotropy = 4;
    const sp = new Sprite(new SpriteMaterial({ map:tx, depthTest:false, transparent:true }));
    sp.scale.set(w, w*168/512, 1);
    sp.position.set(px, py, pz);
    sp.renderOrder = 20;
    (parent||root).add(sp);
    return sp;
  }

  /* ------------------------------------------------- la casa campione */
  // Stessa casa nelle due colonne: piano terra 4 m, piano superiore 3 m,
  // colmo a circa 8,5 m. Volumetria schematica, non un rilievo.
  function casa(px, pz, parent){
    const g = new Group();
    g.position.set(px, 0, pz);
    (parent||root).add(g);
    const W = m(11), D = m(9);
    box(0, 0,        0, W, m(4), D, MAT.muro,  g);   // piano terra
    box(0, m(4),     0, W, m(3), D, MAT.muro2, g);   // piano superiore
    // tetto a due falde, semplificato in due prismi bassi
    box(0, m(7), -D/4, W, m(1.5), D/2, MAT.tetto, g);
    box(0, m(7),  D/4, W, m(1.1), D/2, MAT.tetto, g);
    // portico sul fronte
    for(let i=-1;i<=1;i++) box(i*m(3.4), 0, D/2 + m(1.2), m(0.7), m(3.4), m(0.7), MAT.muro, g);
    return g;
  }

  function uomo(px, pz, parent){                     // 1,80 m, per la scala
    const g = new Group();
    g.position.set(px, 0, pz);
    (parent||root).add(g);
    box(0, 0,      0, m(0.45), m(0.95), m(0.28), MAT.uomo, g);
    box(0, m(0.95),0, m(0.62), m(0.60), m(0.32), MAT.uomo, g);
    const t = new Mesh(new SphereGeometry(m(0.13), 10, 8), MAT.uomo);
    t.position.set(0, m(1.68), 0); g.add(t);
    return g;
  }

  /* --------------------------------------------------- righello quote */
  function righello(px, pz, maxM, parent){
    const g = new Group();
    g.position.set(px, 0, pz);
    (parent||root).add(g);
    box(0, 0, 0, m(0.22), m(maxM), m(0.22), MAT.riga, g);
    for(let q=5; q<=maxM; q+=5){
      box(m(0.9), m(q) - m(0.09), 0, m(1.8), m(0.18), m(0.18), MAT.riga, g);
      txt(q + ' m', '', px + m(7.0), m(q), pz, 4.6, parent);
    }
    return g;
  }

  /* ----------------------------------------------- le due piattaforme */
  const HALF = 11;                    // semipasso fra le due colonne
  const PLAT_W = m(52), PLAT_D = m(40);

  // ---- POMPEI: ~5 m, di cui 3,1–3,3 m di lapilli pomicei
  {
    const px = -HALF;
    box(px, m(-7), 0, PLAT_W, m(7), PLAT_D, MAT.terra);   // suolo antico
    casa(px, 0);
    uomo(px + m(11), m(7));
    righello(px - m(20), m(9), 25);
    // deposito: lapilli sotto, cenere e correnti sopra
    box(px, 0,     0, PLAT_W, m(3.2), PLAT_D, MAT.lapilli);
    box(px, m(3.2),0, PLAT_W, m(1.1), PLAT_D, MAT.cenere);
    box(px, m(4.3),0, PLAT_W, m(0.7), PLAT_D, MAT.flusso);
  }

  // ---- ERCOLANO: ~20 m di correnti piroclastiche, poi la città moderna
  {
    const px = HALF;
    box(px, m(-7), 0, PLAT_W, m(7), PLAT_D, MAT.terra);
    casa(px, 0);
    uomo(px + m(11), m(7));
    righello(px + m(20), m(9), 25);
    // sei bancate alternate: le correnti si sono sovrapposte in più unità
    let y = 0;
    const unita = [3.0, 2.6, 3.4, 3.2, 4.0, 3.8];
    unita.forEach((h,i) => {
      box(px, m(y), 0, PLAT_W, m(h), PLAT_D, i%2 ? MAT.flusso2 : MAT.flusso);
      y += h;
    });
    // città moderna sopra: Ercolano, Resina fino al 1969
    const mod = new Group(); root.add(mod);
    const cols = [[-16,-9],[-16,7],[-4,-12],[-4,4],[8,-8],[8,8],[18,-2]];
    cols.forEach((c,i) => {
      const h = 7.5 + (i%3)*2.5;
      box(px + m(c[0]), m(20), m(c[1]), m(9), m(h), m(8), MAT.moderno, mod);
      box(px + m(c[0]), m(20+h), m(c[1]), m(9.6), m(0.7), m(8.6), MAT.tettoM, mod);
    });
  }


  /* ------------------------------------------------------- controlli */
  let yaw = 0.60, pitch = 0.16, dist = 50, target = m(16);
  let panX = 0;
  let drag = false, lx = 0, ly = 0, auto = true;

  function place(){
    const cy = target + Math.sin(pitch)*dist;
    cCam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist, cy, Math.cos(yaw)*Math.cos(pitch)*dist);
    cCam.lookAt(0, target, 0);
    if(panX) cCam.translateX(panX);   // sposta la vista, non il centro di rotazione
  }

  function onDown(e){ drag = true; auto = false; lx = e.clientX; ly = e.clientY; }
  function onUp(){ drag = false; }
  function onMove(e){
    if(!drag) return;
    yaw   -= (e.clientX - lx) * 0.006;
    pitch += (e.clientY - ly) * 0.004;
    pitch = Math.max(-0.12, Math.min(0.85, pitch));
    lx = e.clientX; ly = e.clientY;
    place();
  }
  function onWheel(e){
    dist = Math.max(26, Math.min(150, dist + e.deltaY * 0.05));
    place();
  }

  let bound = false;
  function bind(el){
    if(bound) return;
    bound = true;
    el.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    addEventListener('pointermove', onMove);
    el.addEventListener('wheel', onWheel, { passive:true });
  }

  function reset(){ yaw = 0.60; pitch = 0.16; dist = 50; auto = true; place(); }

  function update(dt){
    if(auto){ yaw += dt * 0.055; place(); }
  }

  function resize(w, h){
    cCam.aspect = w/h;
    cCam.updateProjectionMatrix();
    panX = (w >= 980) ? -5.5 : 0;     // a schermo largo il pannello occupa la sinistra
    place();
  }

  place();

  return { scene:cScene, camera:cCam, update, resize, reset, bind };
})();

/* =====================================================================
   ERCOLANO — LO SCAVO PERCORRIBILE
   Scena separata, con camera, luci e collisioni proprie: non tocca il
   modello di Pompei. Scala identica: 1 unità = 4 m.

   COSA È MODELLATO E COSA NO — va detto prima del codice, perché è la
   ragione per cui questa scena ha questa forma e non un'altra.

   Si modella SOLO la parte effettivamente scavata all'aperto. Il resto
   della città antica non è ricostruito: è deposito, ed è disegnato come
   deposito, con sopra la città moderna. Ricostruire ciò che non è scavato
   sarebbe invenzione, ed è esattamente ciò che il progetto dichiara di
   non fare.

   Dati incisi qui dentro, con la fonte nel pannello del luogo:
   · Decumani paralleli alla costa, cardini perpendicolari; il Decumano
     Massimo è oggi il confine fra la zona scavata e quella sepolta sotto
     corso Resina — Parco Archeologico di Ercolano, «Area archeologica»
   · Tre decumani in tutto, due scavati; cinque cardini, visibili III, IV, V
   · Insulae esposte: quattro intere (III, IV, V, VI) più Insulae
     Orientalis I e II; VII e II solo in parte
   · Palestra 77 × 47 m — Maiuri, Enc. dell'Arte Antica, 1960
   · Basilica Noniana 29 × 16 m · Casa dei Cervi circa 1.190 m²
   · Dodici fornici sulla spiaggia antica, sei a ovest e sei a est della
     scalinata — Pappalardo 1994; Guidobaldi & Esposito 2013
   · Teatro sotto la città moderna, circa 25 m dalla quota stradale,
     raggiungibile solo dai cunicoli borbonici — Parco Archeologico

   ORIENTAMENTO — DICHIARATO: si costruisce nella CONVENZIONE DI SITO, che
   è come ogni pianta e ogni fonte descrivono Ercolano. Decumano Massimo =
   lato interno, con corso Resina e il Vesuvio oltre; terrazze, fornici e
   spiaggia = lato mare; Cardo III a un capo, Cardo V all'altro.
   L'azimut vero della griglia NON è verificato: le fonti divergono fra
   NO-SE e NE-SO. La bussola in questa scena mostra «lato mare», non nord.
   ===================================================================== */
