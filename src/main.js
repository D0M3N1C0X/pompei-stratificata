/* =====================================================================
   AVVIO

   Questo file fa una cosa sola e la fa prima di tutto il resto: decide in
   che lingua si parla, procura i testi e li unisce ai dati.

   L'ordine non è negoziabile. La fascia delle epoche, i cartelli della
   sezione e l'etichetta del Vesuvio nascono con il testo dentro — i due
   ultimi sono texture disegnate su canvas, non nodi del DOM — quindi la
   lingua va risolta prima che app.js cominci.

   Per questo app.js espone avvia() invece di fare il lavoro
   all'importazione: l'ordine è scritto qui sotto e si legge.
   ===================================================================== */

import { risolviLingua, caricaTesti, applicaAiDati, applicaAlDom } from './i18n/index.js';
import { avvia } from './app.js';

const lingua = risolviLingua();
const testi = await caricaTesti(lingua);

applicaAiDati(testi, lingua);
applicaAlDom(testi, lingua);

// «fuori fase» sta in un ::after del CSS, quindi passa da una variabile
document.documentElement.style.setProperty(
  '--fuori-fase', JSON.stringify(testi.ui.rail.fuoriFase));

avvia();

/* Il service worker rende il sito installabile e leggibile offline. La
   registrazione è andata persa con il caricamento del primo settembre 2026,
   insieme al resto del file: per tre settimane sw.js è stato pubblicato
   senza che nessuno lo accendesse. Solo su http(s): da file:// non esiste,
   e nell'applicazione per iPhone i file sono già dentro il pacchetto. */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  // l'await in cima al file può far arrivare qui dopo il «load»
  const registra = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
  if(document.readyState === 'complete') registra();
  else addEventListener('load', registra, { once: true });
}
