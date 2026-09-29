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

   Il try/catch non è prudenza generica. Il modello ha bisogno di WebGL,
   che su una macchina scolastica amministrata o su un portatile con la
   scheda in blocklist semplicemente non c'è: il costruttore del renderer
   lancia, l'eccezione risale in cima a un modulo con top-level await,
   nessuno la raccoglie, e il velo di caricamento resta su «Costruzione
   della città…» per sempre — senza che chi guarda capisca se stia
   caricando o se sia rotto. Adesso il velo diventa una pagina che lo dice
   e manda al dossier, che è testo e non ha quel vincolo.

   Da solo però non basta: se a rompersi è un modulo importato, il guasto
   avviene prima che questo corpo cominci. Per quello c'è una rete
   registrata nello scheletro HTML, prima del modulo; questo catch la usa
   per i guasti che invece avvengono qui dentro.
   ===================================================================== */

import { risolviLingua, caricaTesti, applicaAiDati, applicaAlDom } from './i18n/index.js';
import { avvia } from './app.js';

try {
  const lingua = risolviLingua();
  const testi = await caricaTesti(lingua);

  applicaAiDati(testi, lingua);
  applicaAlDom(testi, lingua);

  // «fuori fase» sta in un ::after del CSS, quindi passa da una variabile
  document.documentElement.style.setProperty(
    '--fuori-fase', JSON.stringify(testi.ui.rail.fuoriFase));

  avvia();
  // Da qui in poi la scena esiste: la rete di sicurezza si disarma, perché
  // un errore successivo è roba da console, non un motivo per coprire tutto.
  window.__avviato = true;
} catch(e){
  console.error('Avvio fallito:', e);
  // Il dettaglio tecnico serve a chi deve capire perché, non a chi guarda:
  // sta in fondo, piccolo, e non sostituisce la spiegazione in chiaro.
  if(window.__guasto) window.__guasto(String((e && e.message) || e || ''));
}

/* Il service worker rende il sito installabile e leggibile offline. La
   registrazione è andata persa con il caricamento del primo settembre 2026,
   insieme al resto del file: per tre settimane sw.js è stato pubblicato
   senza che nessuno lo accendesse. Solo su http(s): da file:// non esiste,
   e nell'applicazione per iPhone i file sono già dentro il pacchetto.

   Sta fuori dal try apposta: se il modello 3D non parte, il dossier deve
   restare leggibile offline lo stesso — anzi, è proprio il caso in cui
   serve di più. */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  // l'await in cima al file può far arrivare qui dopo il «load»
  const registra = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
  if(document.readyState === 'complete') registra();
  else addEventListener('load', registra, { once: true });
}
