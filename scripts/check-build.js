/*
   Controllo del prodotto — la rete che oggi è mancata.

   Il primo settembre 2026 un caricamento ha sovrascritto index.html con una
   copia del dossier: il simulatore è sparito dal sito pubblico e il diff era
   di cinquemila righe, quindi illeggibile. Questi controlli costano un secondo
   e quel giorno sarebbero bastati.

   Esce con codice 1 al primo fallimento, così l'azione GitHub si ferma.
*/
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8');

const errori = [];
const ok = [];
function esigi(condizione, descrizione, dettaglio){
  if(condizione) ok.push(descrizione);
  else errori.push(dettaglio ? `${descrizione} — ${dettaglio}` : descrizione);
}

// ── il prodotto esiste e ha una taglia plausibile
esigi(existsSync(join(root, 'index.html')), 'index.html esiste');
if(!existsSync(join(root, 'index.html'))){ stampa(); process.exit(1); }

const index = read('index.html');
const kb = statSync(join(root, 'index.html')).size / 1024;
esigi(kb > 300, 'index.html ha una taglia plausibile', `${kb.toFixed(0)} kB, atteso oltre 300`);

// ── è il simulatore, non qualcos'altro
esigi(/WebGLRenderer/.test(index), 'index.html contiene il motore 3D');
esigi(/id="btnStart"/.test(index), 'index.html contiene la scheda d\'ingresso');
esigi(/id="app"/.test(index), 'index.html contiene il contenitore della scena');

// ── non è il dossier travestito da simulatore
const titolo = (index.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
esigi(!/dossier/i.test(titolo), 'il titolo non è quello del dossier', `trovato «${titolo}»`);
esigi((index.match(/<title>/g) || []).length === 1, 'c\'è un solo <title>');

if(existsSync(join(root, 'dossier/index.html'))){
  esigi(read('dossier/index.html') !== index,
        'index.html e dossier/index.html sono file diversi',
        'sono identici: il simulatore è stato sovrascritto');
}

// ── nessun collegamento che funzioni solo per chi l'ha scritto
esigi(!/claude\.ai\/code\/artifact/.test(index),
      'nessun collegamento a un artifact privato');

// ── versione dichiarata negli stessi termini ovunque
const major = JSON.parse(read('package.json')).version.split('.')[0];
esigi(index.includes(`v${major} · due città`), `la testata dichiara v${major}`);
esigi(index.includes(`Esploratore v${major}`), `la scheda d'ingresso dichiara v${major}`);
esigi(read('sw.js').includes(`dopo79-v${major}`), `la cache del service worker dichiara v${major}`);

// ── ogni lingua dichiarata pronta deve avere davvero tutte le chiavi.
//    Le mancanti ricadono sull'italiano e restano leggibili, ma è un buco
//    che va visto qui e non da un lettore.
const sorgenteIt = read('src/i18n/it.js');
const LINGUE_PRONTE = [...read('src/i18n/index.js')
  .matchAll(/cod:'([a-z]{2})',[^\n]*?pronta:true/g)].map(m => m[1]).filter(c => c !== 'it');

function chiavi(o, pre = ''){
  const out = [];
  for(const k of Object.keys(o)){
    const v = o[k];
    if(v && typeof v === 'object') out.push(...chiavi(v, pre + k + '.'));
    else out.push(pre + k);
  }
  return out;
}

let IT_JSON = null;
try {
  IT_JSON = JSON.parse(sorgenteIt.slice(sorgenteIt.indexOf('export default') + 14).trim().replace(/;\s*$/, ''));
  ok.push('src/i18n/it.js è leggibile come tabella di testi');
} catch(e){
  errori.push(`src/i18n/it.js non è più una tabella JSON pura — ${e.message}`);
}

if(IT_JSON) for(const cod of LINGUE_PRONTE){
  const f = `i18n/${cod}.json`;
  if(!existsSync(join(root, f))){
    errori.push(`${cod} è dichiarata pronta ma ${f} non esiste`);
    continue;
  }
  let tr;
  try { tr = JSON.parse(read(f)); }
  catch(e){ errori.push(`${f} non è JSON valido — ${e.message}`); continue; }
  const attese = chiavi(IT_JSON), presenti = new Set(chiavi(tr));
  const mancanti = attese.filter(k => !presenti.has(k));
  esigi(mancanti.length === 0, `${f} ha tutte le ${attese.length} chiavi`,
        `mancano ${mancanti.length}: ${mancanti.slice(0,6).join(', ')}${mancanti.length>6 ? '…' : ''}`);
}

// ── il service worker deve conoscere le lingue, o offline si rompe lì
for(const cod of LINGUE_PRONTE)
  esigi(read('sw.js').includes(`./i18n/${cod}.json`),
        `il service worker mette in cache i18n/${cod}.json`);

// ── il manifest resta leggibile
try { JSON.parse(read('manifest.webmanifest')); ok.push('manifest.webmanifest è JSON valido'); }
catch(e){ errori.push(`manifest.webmanifest non è JSON valido — ${e.message}`); }

stampa();
process.exit(errori.length ? 1 : 0);

function stampa(){
  for(const r of ok) console.log(`  ok   ${r}`);
  for(const e of errori) console.error(`  NO   ${e}`);
  console.log(errori.length
    ? `\n${errori.length} controllo/i fallito/i.`
    : `\n${ok.length} controlli superati.`);
}
