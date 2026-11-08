/*
   L'impaginazione, da lanciare nella pagina aperta con ?debug a una data
   misura di finestra (scripts/prova-avvio.mjs la prova a sei misure, dal
   telefono al 1920×1080):

     (0, eval)(await (await fetch('/scripts/giro-layout.js')).text())

   Per ogni stato che un visitatore vede spesso (la città, una scheda
   aperta, l'eruzione, Ercolano, il confronto) controlla:

   · che la pagina non scorra di lato;
   · che i comandi fissi stiano dentro la finestra;
   · che la barra delle fasi mostri tutte le fasi o si possa scorrere;
   · che i pannelli non si coprano fra loro (sovrapposizione oltre 4 px);
   · quanta parte della scena resta libera: l'interfaccia non deve coprirne
     più di una certa quota (QUOTA_MAX).

   Restituisce { misura, stati: [{ stato, coperto }], guai }.
*/
(() => {
  const P = window.pompei, guai = [], stati = [];
  const $ = id => document.getElementById(id);
  const W = innerWidth, H = innerHeight, misura = W + '×' + H;
  // su schermi piccoli si accetta che l'interfaccia copra di più; uno
  // schermo alto meno di 500 px (il telefono in orizzontale) è il caso più
  // stretto, e vale come il telefono in verticale
  const QUOTA_MAX = H < 500 ? 0.6 : W >= 1200 ? 0.38 : W >= 800 ? 0.5 : 0.6;
  const visibile = el => {
    if(!el || el.hidden) return false;
    const s = getComputedStyle(el);
    if(s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false;
    const r = el.getBoundingClientRect();
    // un pannello chiuso che scivola fuori dalla finestra è nascosto per scelta
    return r.width > 2 && r.height > 2 && r.right > 1 && r.left < innerWidth - 1 && r.bottom > 1 && r.top < innerHeight - 1;
  };
  // i blocchi dell'interfaccia che stanno sopra la scena
  const BLOCCHI = ['top', 'altro', 'classeBox', 'rail', 'ercHud', 'cmpHud', 'clock', 'compass', 'sectionHud',
                   'tourBar', 'eruBar', 'eruTesto', 'caption', 'epochs', 'panel', 'stick', 'btnRun'];
  // #ercHud e #top sono cornici trasparenti larghe quanto lo schermo:
  // contano i pezzi che contengono, non la cornice
  const CORNICI = new Set(['ercHud', 'top']);
  const rettangoli = () => BLOCCHI.flatMap(id => CORNICI.has(id) && visibile($(id))
      ? [...$(id).children].map((el, i) => [id + '>' + (el.className.split(' ')[0] || i), el]) : [[id, $(id)]])
    .filter(([, el]) => visibile(el))
    .map(([id, el]) => { const r = el.getBoundingClientRect(); return { id, x0:r.left, y0:r.top, x1:r.right, y1:r.bottom }; });
  // quota della finestra coperta da almeno un blocco, su una griglia di 8 px
  const coperto = rr => {
    let n = 0, tot = 0;
    for(let y = 4; y < H; y += 8) for(let x = 4; x < W; x += 8){
      tot++;
      if(rr.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)) n++;
    }
    return n / tot;
  };
  // coppie che possono stare una sopra l'altra per scelta
  const AMMESSE = new Set(['altro/top', 'caption/epochs', 'eruBar/eruTesto', 'panel/rail']);
  function controlla(stato){
    P.passi(2, false);
    const rr = rettangoli();
    if(document.documentElement.scrollWidth > W + 1) guai.push(`${misura} ${stato}: la pagina scorre di lato (${document.documentElement.scrollWidth} px)`);
    for(const r of rr){
      if(r.x0 < -1 || r.x1 > W + 1 || r.y0 < -1 || r.y1 > H + 1)
        guai.push(`${misura} ${stato}: #${r.id} esce dalla finestra (${Math.round(r.x0)},${Math.round(r.y0)}–${Math.round(r.x1)},${Math.round(r.y1)})`);
    }
    for(let i = 0; i < rr.length; i++) for(let j = i + 1; j < rr.length; j++){
      const a = rr[i], b = rr[j], k = [a.id, b.id].sort().join('/');
      if(AMMESSE.has(k)) continue;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if(ox > 4 && oy > 4) guai.push(`${misura} ${stato}: #${a.id} e #${b.id} si coprono (${Math.round(ox)}×${Math.round(oy)} px)`);
    }
    // i pulsanti per uscire da una modalità devono vedersi per intero
    for(const id of ['ercExit', 'eruChiudi', 'cmpClose', 'pClose', 'tourClose']){
      const el = $(id);
      if(!visibile(el)) continue;
      const r = el.getBoundingClientRect();
      let cont = el.parentElement, taglio = null;
      while(cont && cont !== document.body){
        const c = cont.getBoundingClientRect(), o = getComputedStyle(cont);
        if(/auto|scroll|hidden/.test(o.overflowX) && (r.right > c.right + 1 || r.left < c.left - 1)) { taglio = cont.id || cont.className; break; }
        cont = cont.parentElement;
      }
      if(r.right > W + 1 || r.left < -1 || taglio) guai.push(`${misura} ${stato}: #${id} non si vede per intero${taglio ? ' (tagliato da ' + taglio + ')' : ''}`);
    }
    // la barra delle fasi: tutte dentro, o si scorre
    const ep = $('epochs');
    if(visibile(ep)){
      const fuori = [...ep.querySelectorAll('.ep')].filter(b => { const r = b.getBoundingClientRect(); return r.right > W + 1 || r.left < -1; });
      const scorre = ep.scrollWidth > ep.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(ep).overflowX);
      if(fuori.length && !scorre) guai.push(`${misura} ${stato}: ${fuori.length} fasi tagliate fuori dalla barra, e la barra non scorre`);
    }
    const q = coperto(rr);
    stati.push({ stato, coperto:Math.round(q * 100) });
    // l'eruzione e il confronto sono momenti di lettura: il pannello è il
    // contenuto, e gli si concede un 12% in più
    const max = QUOTA_MAX + (/eruzione|confronto/.test(stato) ? 0.12 : 0);
    if(q > max) guai.push(`${misura} ${stato}: l'interfaccia copre il ${Math.round(q * 100)}% della scena (massimo ${Math.round(max * 100)}%)`);
  }

  // la scheda d'ingresso si chiude: qui conta ciò che si vede dopo
  $('intro').classList.add('gone');
  try {
    P.vista('pompei'); P.fase(0); controlla('città');
    P.fase(5); controlla('canale');
    P.apri(P.luoghi()[2]); controlla('scheda aperta');
    $('pClose').click();
    P.fase(1); $('eruStart').click(); $('eruPlay').click(); controlla('eruzione');
    $('eruChiudi').click();
    P.vista('ercolano'); controlla('Ercolano');
    P.vista('confronto'); controlla('confronto');
  } catch(e){ guai.push(`${misura}: ${e.message}`); }
  P.vista('pompei'); P.fase(0); P.passi(2, false);
  return { misura, stati, guai };
})()
