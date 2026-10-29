# Materiali per App Store

Tutto quello che serve il giorno in cui ci si iscrive all'Apple Developer
Program, pronto da copiare. La parte tecnica, cioè la firma e il caricamento
su TestFlight dal Mac di GitHub Actions, è in [`app/README.md`](../app/README.md).

```
store/testi.json     nome, sottotitolo, testo promozionale, descrizione,
                     parole chiave e novità nelle sei lingue (limiti di
                     Apple verificati da npm run check)
store/scatti.json    le sei inquadrature e le didascalie degli screenshot
store/immagini/      (generata, non versionata) 72 JPEG: 6 scatti × 6 lingue
                     × 2 formati, da scripts/scatti-store.mjs
../privacy.html      l'informativa, pubblicata con il sito
```

## La scheda dell'app, campo per campo

| Campo in App Store Connect | Valore |
|---|---|
| Nome | `nome` in `testi.json`, per lingua |
| Sottotitolo | `sottotitolo` |
| Testo promozionale | `promo` |
| Descrizione | `descrizione` |
| Parole chiave | `parole_chiave` |
| Novità in questa versione | `novita` |
| Categoria principale | Istruzione |
| Categoria secondaria | Consultazione |
| Prezzo | Gratuito |
| URL privacy | https://d0m3n1c0x.github.io/pompei-stratificata/privacy.html |
| URL assistenza | https://github.com/D0M3N1C0X/pompei-stratificata/issues |
| URL marketing | https://d0m3n1c0x.github.io/pompei-stratificata/ |
| Copyright | 2026 Domenico Perroni |
| Lingua principale | Italiano |

Le localizzazioni da aggiungere sono cinque: inglese (Regno Unito e Stati
Uniti, stessi testi), francese, tedesco, spagnolo, portoghese (Portogallo e
Brasile, stessi testi; il portoghese di `testi.json` è europeo).

## Privacy dell'app

Alla domanda «Raccogli dati da questa app?» la risposta è **No**. È vero per
costruzione, e verificato nel codice il 13 ottobre 2026:

- l'unico dato salvato è la lingua scelta, in `localStorage`, e non lascia il
  dispositivo (`src/i18n/index.js`);
- l'unica richiesta di rete carica le traduzioni dai file dell'app stessa
  (`./i18n/<lingua>.json`);
- nessun account, nessuna statistica, nessuna pubblicità, nessun SDK esterno.

Se un giorno si aggiungono statistiche o un modulo di contatto, questa
risposta e `privacy.html` vanno cambiate **prima** della versione che li
contiene.

## Classificazione per età

Proposta: **4+**, rispondendo «Nessuno» a tutte le voci. Le schede parlano di
morti dell'eruzione e dei fuggiaschi di Ercolano come fatti storici, senza
immagini di corpi; il graffito di Popidius Priscus non è esplicito. Se Apple
lo ritiene necessario, la voce più vicina è «Temi spaventosi: rari/lievi»,
che porta a 9+. La decisione spetta a te.

## Gli screenshot

Sei scene del modello con una didascalia, in due formati: iPhone 6,9"
(1320 × 2868) e iPad 13" (2064 × 2752). Apple ridimensiona da sola per gli
schermi più piccoli. Rifatte il 29 ottobre 2026, con l'interfaccia, la luce,
i materiali e le figure di adesso:

| Scena | Cosa mostra |
|---|---|
| 01-strada | una strada il pomeriggio prima dell'eruzione, all'altezza degli occhi |
| 02-persone | la folla verso l'anfiteatro, vestita come nelle fonti |
| 03-citta | la città sotto il Vesuvio, dall'alto |
| 04-deposito | i tetti che affiorano dal deposito |
| 05-ercolano | il fronte di scavo, con la città moderna sopra |
| 06-oggi | il cantiere aperto di oggi |

Per rifarle, con il Mac acceso e Chrome installato:

```bash
npm run build
```

```bash
python3 -m http.server 8780
```

```bash
node scripts/scatti-store.mjs
```

Lo script apre il simulatore in un Chrome senza finestra, una scena alla
volta, e scrive in `store/immagini` 72 JPEG: 6 scene × 6 lingue × 2 formati,
in circa sette minuti. Di ogni scena fa una sola foto e ci scrive sopra le sei
didascalie, quindi tutte le lingue mostrano lo stesso istante. Per rifarne una
sola: `node scripts/scatti-store.mjs http://localhost:8780/ 02-persone`.

Nelle foto non ci sono i coni verdi dei luoghi né le etichette: in
un'immagine ferma sembrerebbero difetti. Le inquadrature, l'ora del giorno e
le didascalie stanno in `scatti.json`.

## Il Mac

Sui Mac con Apple Silicon l'app per iPad si installa così com'è: in App Store
Connect basta lasciare attiva la voce «Rendi disponibile questa app su Mac»
(*iPhone and iPad Apps on Apple Silicon Macs*). Una versione Mac nativa
(Mac Catalyst) non serve per partire.

## Il giorno dell'iscrizione, in ordine

1. Iscrizione all'Apple Developer Program (99 USD l'anno), come persona fisica.
2. Identificativo `io.github.d0m3n1c0x.dopo79` e scheda dell'app, poi la
   chiave API e i quattro secrets: i passi sono in `app/README.md`.
3. Dalla scheda Actions di GitHub, «App su TestFlight»: prima build.
4. Si compila la scheda con la tabella qui sopra e si caricano le immagini.
5. Prova su TestFlight su un iPhone vero; poi «Invia per la revisione».
