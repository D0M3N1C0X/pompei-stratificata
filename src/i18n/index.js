/* =====================================================================
   LINGUE

   Tre regole, e da queste discende tutto il resto.

   1. I dati restano dati. In src/data/ e dentro ERCOLANO ci sono solo
      coordinate, spessori, quali gruppi accendere: niente prosa. Un
      traduttore riceve un file piatto e non può rompere il modello 3D.

   2. La prosa viene unita ai dati prima che qualcosa venga costruito.
      Le scene fabbricano cartelli e sprite di testo al momento in cui
      nascono, quindi la lingua va risolta prima, non dopo.

   3. Le fonti non si traducono. Titoli di opere, nomi di riviste,
      «E-Journal degli Scavi di Pompei» restano come sono, in qualsiasi
      lingua: sono riferimenti bibliografici, non testo.

   L'italiano è compilato dentro il file, così il prodotto continua a
   funzionare da solo e da file://. Le altre lingue sono file JSON in
   i18n/, scaricati soltanto se servono.
   ===================================================================== */

import IT from './it.js';
import { EPOCHS } from '../data/epochs.js';
import { PLACES } from '../data/places.js';
import { LUOGHI as ERC_LUOGHI } from '../data/ercolano-places.js';

// Le lingue offerte. `pronta` distingue quelle tradotte da quelle
// annunciate: mostrare una voce che poi ricade in italiano è peggio che
// non mostrarla, quindi qui c'è solo ciò che esiste davvero.
export const LINGUE = [
  { cod:'it', nome:'Italiano', pronta:true  },
  { cod:'en', nome:'English',  pronta:true  }
];

const PREDEFINITA = 'it';
const CHIAVE_SALVATA = 'dopo79.lingua';

function disponibile(cod){
  return LINGUE.some(l => l.cod === cod && l.pronta);
}

/* Ordine di precedenza: quello che l'utente ha appena chiesto
   (?lang=), poi quello che aveva scelto, poi quello del browser. */
export function risolviLingua(){
  const url = new URLSearchParams(location.search).get('lang');
  if(url && disponibile(url)) return url;

  let salvata = null;
  try { salvata = localStorage.getItem(CHIAVE_SALVATA); } catch(e){}
  if(salvata && disponibile(salvata)) return salvata;

  for(const pref of (navigator.languages || [navigator.language || ''])){
    const base = String(pref).toLowerCase().split('-')[0];
    if(disponibile(base)) return base;
  }
  return PREDEFINITA;
}

export function scegliLingua(cod){
  try { localStorage.setItem(CHIAVE_SALVATA, cod); } catch(e){}
  // Ricaricare invece di ridisegnare: la lingua entra nei cartelli 3D,
  // che sono texture cotte alla costruzione della scena. Rifarli a caldo
  // costerebbe più codice di quanto valga, e questo non sbaglia mai.
  const u = new URL(location.href);
  u.searchParams.set('lang', cod);
  location.href = u.toString();
}

export async function caricaTesti(cod){
  if(cod === 'it') return IT;
  try {
    const r = await fetch(`./i18n/${cod}.json`, { cache:'no-cache' });
    if(!r.ok) throw new Error(r.status);
    const t = await r.json();
    // Le chiavi mancanti ricadono sull'italiano invece di sparire: una
    // traduzione incompleta resta leggibile, e il buco si vede.
    return fondi(IT, t);
  } catch(e){
    console.warn(`Testi «${cod}» non caricati, resto in italiano.`, e);
    return IT;
  }
}

function fondi(base, sopra){
  if(Array.isArray(base)) return (sopra || base).map((v,i) => fondi(base[i] ?? v, v));
  if(base && typeof base === 'object'){
    const out = {};
    for(const k of new Set([...Object.keys(base), ...Object.keys(sopra || {})]))
      out[k] = fondi(base[k], sopra ? sopra[k] : undefined);
    return out;
  }
  return sopra === undefined ? base : sopra;
}

/* ------------------------------------------------------ applicazione */

// Stato risolto all'avvio. Sta qui e non in main.js per non creare un
// anello fra i due moduli: app.js legge da qui e basta.
let TESTI = IT, CODICE = PREDEFINITA, FMT = null;

export function linguaAttiva(){ return CODICE; }
export function fmt(){ return FMT || (FMT = creaFormattatori(CODICE)); }

/* Legge una chiave puntata: t('ui.tool.sezione'). Se manca, restituisce la
   chiave stessa — così un buco si vede sullo schermo invece di stampare
   «undefined» o, peggio, niente. */
export function t(chiave, valori){
  let v = frammento(TESTI, chiave);
  if(typeof v !== 'string') return chiave;
  if(valori) for(const k in valori) v = v.replaceAll('{' + k + '}', valori[k]);
  return v;
}

function frammento(testi, chiave){
  return chiave.split('.').reduce((o,k) => (o == null ? o : o[k]), testi);
}

// Unisce la prosa alle strutture dati. Va chiamata prima che le scene
// vengano costruite: dopo, i cartelli sono già texture.
export function applicaAiDati(testi, cod){
  TESTI = testi;
  if(cod){ CODICE = cod; FMT = null; }

  EPOCHS.forEach((e,i) => Object.assign(e, testi.epoche[i]));
  PLACES.forEach(p => Object.assign(p, testi.luoghi[p.id]));
  ERC_LUOGHI.forEach(p => Object.assign(p, testi.ercolano[p.id]));
}

// Riempie il markup. Tre annotazioni:
//   data-i18n       testo semplice
//   data-i18n-html  blocco di prosa con la sua formattazione
//   data-i18n-attr  attributi, «attributo:chiave» separati da virgola
export function applicaAlDom(testi, cod){
  document.documentElement.lang = cod;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = frammento(testi, el.dataset.i18n);
    if(typeof v === 'string') el.textContent = v;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = frammento(testi, el.dataset.i18nHtml);
    if(typeof v === 'string') el.innerHTML = v;
  });

  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    for(const coppia of el.dataset.i18nAttr.split(',')){
      const [attr, chiave] = coppia.split(':').map(s => s.trim());
      const v = frammento(testi, chiave);
      if(typeof v === 'string') el.setAttribute(attr, v);
    }
  });

  const t = frammento(testi, 'ui.titoloPagina');
  if(typeof t === 'string') document.title = t;
}

/* ------------------------------------------- numeri, ore, formattazione

   «3,1–3,3 m» e «12.000» sono italiani: in inglese sono «3.1–3.3 m» e
   «12,000». Non si traducono a mano, si formattano. */

export function creaFormattatori(cod){
  const numero = new Intl.NumberFormat(cod);
  const decimale = new Intl.NumberFormat(cod, { maximumFractionDigits:1 });
  // Nessun fuso qui: l'ora di Roma è già stata calcolata altrove e questa
  // formatta soltanto la coppia. Passare un timeZone la sposterebbe.
  const ora = new Intl.DateTimeFormat(cod, { hour:'2-digit', minute:'2-digit' });
  return {
    n: v => numero.format(v),
    d: v => decimale.format(v),
    orologio: (hh, mm) => ora.format(new Date(2000, 0, 1, hh, mm))
  };
}
