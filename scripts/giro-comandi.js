/*
   Il giro dei comandi, da lanciare nella pagina aperta con ?debug, dopo
   giro.js (scripts/prova-avvio.mjs lo fa da solo):

     (0, eval)(await (await fetch('/scripts/giro-comandi.js')).text())

   giro.js apre ogni scheda; questo prova ciò che un visitatore tocca:

   1. ogni pulsante della barra e di «Altro» che si accende e si spegne:
      premuto due volte deve riportare la pagina esattamente com'era
      (la qualità ha tre gradini: tre volte);
   2. le scorciatoie da tastiera: 1–8 cambiano fase, C la sezione, F il
      volo, L le etichette, Esc chiude la scheda e la presentazione;
   3. il tour dall'inizio alla fine, la presentazione e il suo Esc;
   4. il cammino: con W il giocatore avanza e non finisce dentro un muro;
   5. le tre case con gli interni: dalla strada, con la regola vera del
      passo, si deve raggiungere quasi tutto lo spazio libero dentro i muri.
      Fino al 6 novembre 2026 nel Menandro ne restava chiuso l'8%: il passo
      usava una regola diversa da quella dichiarata per gli interni.

   Restituisce { fatti, guai, case }: guai vuoto se va tutto bene.
*/
(() => {
  const P = window.pompei, guai = [], fatti = { pulsanti:0, tasti:0, tour:0 }, case_ = [];
  const $ = id => document.getElementById(id);
  const SOSP = /\bundefined\b|\bNaN\b|\[object |\{[a-zA-Z]+\}/;
  const testo = dove => { const m = document.body.innerText.match(SOSP); if(m) guai.push(dove + ': «' + m[0] + '»'); };
  const visibile = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  // lo stato della pagina che un pulsante può cambiare
  const firma = () => [
    document.body.className.split(/\s+/).filter(c => c && c !== 'debug').sort().join(' '),
    ...[...document.querySelectorAll('#tools button, #altro button')].map(b => b.id + (b.classList.contains('on') ? '+' : '-')),
    ...['panel', 'sectionHud', 'tourBar', 'cmpHud', 'ercHud', 'clock', 'rail', 'eruBar'].map(id => id + (visibile($(id)) ? '+' : '-'))
  ].join(' ');
  const premi = codice => {
    const key = codice.startsWith('Digit') ? codice.slice(5) : codice === 'Escape' ? 'Escape' : codice.slice(3).toLowerCase();
    dispatchEvent(new KeyboardEvent('keydown', { code:codice, key, bubbles:true }));
    dispatchEvent(new KeyboardEvent('keyup', { code:codice, key, bubbles:true }));
  };
  const passi = n => P.passi(n, false);   // senza disegnare: qui contano gli stati
  const tempi = {}; let t0 = performance.now();
  const tappa = nome => { const t = performance.now(); tempi[nome] = Math.round(t - t0); t0 = t; };

  P.vista('pompei'); P.fase(0); passi(2);

  // 1. pulsanti che si accendono e si spengono
  const GIRI = { btnQuality:3 };
  for(const id of ['btnFly', 'btnTop', 'btnSection', 'btnClock', 'btnAudio', 'btnLabels', 'btnPad', 'btnRail', 'btnQuality', 'btnCompare']){
    const b = $(id);
    if(!b || b.disabled){ guai.push(id + ': manca o è disattivato'); continue; }
    try {
      const prima = firma();
      b.click(); passi(3); testo(id + ' acceso');
      if(firma() === prima && id !== 'btnAudio') guai.push(id + ': premuto, non cambia niente');
      for(let i = 1; i < (GIRI[id] || 2); i++){ b.click(); passi(3); }
      passi(40);   // il volo dall'alto e il ritorno hanno bisogno di tempo
      // «Dall'alto», spento, riporta a 48 m e resta in volo: è voluto
      if(id === 'btnTop' && $('btnFly').classList.contains('on') && !prima.includes('btnFly+')){ $('btnFly').click(); passi(3); }
      const dopo = firma();
      if(dopo !== prima) guai.push(id + ': premuto ' + (GIRI[id] || 2) + ' volte non torna com\'era — ' +
        dopo.split(' ').filter(x => !prima.split(' ').includes(x)).join(' '));
      fatti.pulsanti++;
    } catch(e){ guai.push(id + ': ' + e.message); }
  }

  tappa('pulsanti');
  // 2. scorciatoie
  try {
    const tag = () => $('epTag').textContent + ' ' + $('epName').textContent;
    const visti = new Set();
    for(let i = 1; i <= 8; i++){ premi('Digit' + i); passi(1); visti.add(tag()); testo('tasto ' + i); fatti.tasti++; }
    if(visti.size !== 8) guai.push('tasti 1–8: ' + visti.size + ' fasi diverse invece di 8');
    premi('Digit1'); passi(1);
    for(const [codice, id] of [['KeyC', 'btnSection'], ['KeyF', 'btnFly'], ['KeyL', 'btnLabels']]){
      const prima = $(id).classList.contains('on');
      premi(codice); passi(3);
      if($(id).classList.contains('on') === prima) guai.push(codice + ': non cambia ' + id);
      premi(codice); passi(3);
      if($(id).classList.contains('on') !== prima) guai.push(codice + ' due volte: ' + id + ' non torna');
      fatti.tasti += 2;
    }
    premi('KeyH'); passi(1);
    if(!document.body.classList.contains('ui-nascosta') || !visibile($('mostraUI'))) guai.push('H: l\'interfaccia non si nasconde');
    premi('KeyH'); passi(1);
    if(document.body.classList.contains('ui-nascosta')) guai.push('H due volte: l\'interfaccia non torna');
    $('btnNascondi').click(); passi(1);
    if(!document.body.classList.contains('ui-nascosta')) guai.push('«Nascondi l\'interfaccia»: non nasconde');
    $('mostraUI').click(); passi(1);
    if(document.body.classList.contains('ui-nascosta')) guai.push('«Mostra l\'interfaccia»: non la rimostra');
    fatti.tasti += 2;
    P.apri(P.luoghi()[0]);
    premi('Escape'); passi(1);
    if($('panel').classList.contains('open')) guai.push('Esc: la scheda resta aperta');
    fatti.tasti++;
  } catch(e){ guai.push('tasti: ' + e.message); }

  tappa('tasti');
  // 3. tour, presentazione
  try {
    $('btnTour').click(); passi(2);
    if(!document.body.classList.contains('touring')) guai.push('tour: non parte');
    for(let i = 0; i < 40 && document.body.classList.contains('touring'); i++){
      testo('tour ' + $('tourPos').textContent);
      if(!$('pTitle').textContent.trim()) guai.push('tour ' + $('tourPos').textContent + ': scheda senza titolo');
      $('tourNext').click(); passi(2); fatti.tour++;
    }
    if(document.body.classList.contains('touring')) guai.push('tour: l\'ultima tappa non chiude il tour');
    if($('panel').classList.contains('open')) guai.push('tour: finito, la scheda resta aperta');
    $('btnPresent').click(); passi(30);
    if(!document.body.classList.contains('presenting')) guai.push('presentazione: non parte');
    testo('presentazione');
    premi('Escape'); passi(2);
    if(document.body.classList.contains('presenting')) guai.push('presentazione: Esc non la ferma');
  } catch(e){ guai.push('tour: ' + e.message); }

  tappa('tour');
  // 4. il cammino
  try {
    P.fase(0); passi(60);
    const g0 = P.giocatore();
    if(g0.volo) guai.push('cammino: si parte in volo');
    dispatchEvent(new KeyboardEvent('keydown', { code:'KeyW', key:'w' }));
    passi(60);
    dispatchEvent(new KeyboardEvent('keyup', { code:'KeyW', key:'w' }));
    passi(20);
    const g1 = P.giocatore();
    const d = Math.hypot(g1.x - g0.x, g1.z - g0.z);
    if(d < 0.05) guai.push('cammino: con W non si avanza (' + d.toFixed(3) + ' unità in 2 s)');
    if(P.bloccato(g1.x, g1.z)) guai.push('cammino: il giocatore è finito dentro un muro');
  } catch(e){ guai.push('cammino: ' + e.message); }

  tappa('cammino');
  // 5. le case con gli interni. Prima: il passo vero (P.muovi) usa la stessa
  //    regola di P.bloccato, su duemila passi a caso vicino ai muri; poi,
  //    con quella regola, dalla strada si deve arrivare in tutte le stanze.
  //    La griglia è di 8 cm: con 16 cm la prova salta le porte più strette.
  try {
    let seme = 7; const caso = () => (seme = (seme * 1664525 + 1013904223) >>> 0) / 4294967296;
    let diversi = 0;
    for(const c of P.caseInterne()) for(let n = 0; n < 700; n++){
      const x = c.x0 + caso() * (c.x1 - c.x0), z = c.z0 + caso() * (c.z1 - c.z0);
      if(P.bloccato(x, z)) continue;
      const dx = (caso() - 0.5) * 0.1, nx = x + dx;
      const [ax] = P.muovi(x, z, dx, 0);
      if((ax === nx) === P.bloccato(nx, z)) diversi++;
    }
    if(diversi) guai.push(`case: il passo e la regola dei muri non coincidono in ${diversi} prove su 2100`);
    const PASSO = 0.02;
    for(const c of P.caseInterne()){
      const W = Math.ceil((c.x1 - c.x0) / PASSO) + 8, D = Math.ceil((c.z1 - c.z0) / PASSO) + 8;
      const X0 = c.x0 - 4 * PASSO, Z0 = c.z0 - 4 * PASSO;
      const dentro = (i, j) => { const x = X0 + i * PASSO, z = Z0 + j * PASSO; return x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1; };
      const libero = new Uint8Array(W * D);
      let liberi = 0;
      for(let j = 0; j < D; j++) for(let i = 0; i < W; i++)
        if(!P.bloccato(X0 + i * PASSO, Z0 + j * PASSO)){ libero[j * W + i] = 1; if(dentro(i, j)) liberi++; }
      // dal bordo esterno, cioè dalla strada, una cella libera alla volta
      const visto = new Uint8Array(W * D), coda = [];
      for(let i = 0; i < W; i++) coda.push(i, (D - 1) * W + i);
      for(let j = 0; j < D; j++) coda.push(j * W, j * W + W - 1);
      let raggiunti = 0;
      while(coda.length){
        const k = coda.pop();
        if(visto[k] || !libero[k]) continue;
        visto[k] = 1;
        const i = k % W, j = (k / W) | 0;
        if(dentro(i, j)) raggiunti++;
        if(i > 0) coda.push(k - 1); if(i < W - 1) coda.push(k + 1);
        if(j > 0) coda.push(k - W); if(j < D - 1) coda.push(k + W);
      }
      const quota = liberi ? raggiunti / liberi : 0;
      case_.push({ x0:c.x0, z0:c.z0, liberi, raggiunti, quota:Math.round(quota * 1000) / 10 });
      if(quota < 0.99) guai.push(`casa in ${c.x0.toFixed(1)},${c.z0.toFixed(1)}: dalla strada si raggiunge solo il ${(quota * 100).toFixed(1)}% dello spazio libero`);
    }
  } catch(e){ guai.push('case: ' + e.message); }

  tappa('case');
  P.vista('pompei'); P.fase(0); passi(2);
  fatti.tempi = tempi;
  return { fatti, guai, case:case_ };
})()
