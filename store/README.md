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
                     × 2 formati
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
schermi più piccoli. Sono una **prima bozza**: vanno rifatti dopo il lavoro su
Ercolano, sulla luce e sui materiali, ed è un'operazione ripetibile.

Per rifarli:

```bash
python3 -m http.server 8780
```

```bash
node scripts/ricevi-foto.mjs store/immagini
```

Poi si apre `http://localhost:8780/?debug` con una finestra di **660 × 1434**
per iPhone o **1032 × 1376** per iPad (con densità 2 il canvas esce
esattamente nel formato giusto). Si porta l'ora a mezzogiorno e si chiama
`pompei.vetrina(w, h, didascalia)` per ogni scena di `scatti.json`: la
funzione fotografa la scena, la adatta al formato e scrive la didascalia.
I PNG che arrivano si convertono in JPEG di qualità 90 (`sips -s format jpeg`),
così 72 immagini scendono da 292 a 44 MB.

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
