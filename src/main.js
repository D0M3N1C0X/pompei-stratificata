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
