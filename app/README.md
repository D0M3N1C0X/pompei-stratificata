# L'applicazione per iPhone, iPad e Mac

L'app è il simulatore stesso, lo stesso `index.html` servito da GitHub Pages,
insieme ai due dossier e alle sei lingue, dentro un guscio nativo fatto con
[Capacitor](https://capacitorjs.com). Il codice resta uno solo: una modifica
a `src/` arriva al sito e all'app con la stessa build.

Funziona senza rete: tutti i file sono nel pacchetto, e il simulatore non
scarica niente da fuori.

## Com'è fatta

```
capacitor.config.json   nome, identificativo, cartella dei file
scripts/app-www.js      ricompone app/www/ con i soli file pubblicati
app/www/                (generata, non versionata) ciò che entra nel pacchetto
app/ios/                il progetto Xcode, generato da Capacitor e versionato
```

L'identificativo è `io.github.d0m3n1c0x.dopo79`, costruito sul dominio di
GitHub Pages del progetto. **Va deciso prima della prima pubblicazione.** Dopo
non si cambia più: un identificativo nuovo è un'app nuova per l'App Store.

L'icona è `icon-1024.png` (senza trasparenza, come chiede Apple). La schermata
d'avvio è un fondo pieno `#101412`, lo stesso colore dell'ingresso del
simulatore. L'app dichiara le sei lingue e nessuna cifratura propria
(`ITSAppUsesNonExemptEncryption = false`), così App Store Connect non fa la
domanda sull'esportazione.

## Aggiornare l'app dopo una modifica

```bash
npm run app
```

Ricostruisce il simulatore, ricompone `app/www/` e lo copia nel progetto
Xcode. Il flusso **App iOS** su GitHub (`.github/workflows/app-ios.yml`) fa la
stessa cosa su un Mac con l'Xcode attuale e compila per il simulatore, senza
firma. Parte da solo quando cambia qualcosa sotto `app/ios/`, e dalla scheda
Actions si può lanciare a mano.

## Il vincolo: questo Mac

Lo sviluppo avviene su macOS 13, senza Xcode, con 8,8 GB liberi. Quello che
ne discende, **da ricontrollare su developer.apple.com prima di spendere
soldi** (sono date e versioni che Apple sposta ogni anno):

- Per caricare un'app sull'App Store serve l'SDK dell'anno: dal 2026 Xcode 26.
  Xcode 26 richiede macOS 15 (Sequoia). Su macOS 13 si arriva al massimo a
  Xcode 15, che l'App Store non accetta più.
- Xcode occupa comunque decine di gigabyte: 8,8 GB liberi non bastano
  nemmeno a installarlo.

Quindi **da questo Mac l'app non si compila e non si pubblica**. Non serve,
però: la compilazione può avvenire interamente su un Mac di GitHub Actions,
come fa già il flusso qui sopra.

## Per pubblicarla davvero

In ordine, e solo il primo passo costa:

1. **Apple Developer Program**: 99 USD (o l'equivalente in euro) l'anno,
   iscrizione come persona fisica. Senza, non si firma e non si pubblica
   nulla, nemmeno su TestFlight.
2. In App Store Connect: creare l'app con l'identificativo scelto, e una
   **chiave API** (Utenti e accessi → Integrazioni) con ruolo App Manager.
3. Mettere la chiave nei *secrets* del repository. Da lì un secondo flusso
   può firmare, archiviare e caricare su **TestFlight** senza mai aprire
   Xcode. Questo flusso non è ancora scritto: dipende dall'account, e
   scriverlo prima vorrebbe dire indovinarne i dati.
4. Provare l'app da TestFlight su iPhone. Poi scheda dell'App Store,
   screenshot, informativa sulla privacy (l'app non raccoglie dati) e invio
   in revisione.

**Il Mac viene gratis.** Un'app per iPhone e iPad compare nel Mac App Store per
i Mac con processore Apple (M1 e successivi), nella forma «progettata per
iPad», se non la si esclude. Non serve un secondo progetto. Sui Mac Intel non
gira.

**Il rischio in revisione.** Apple respinge le app che sono «un sito web
impacchettato» (linea guida 4.2, funzionalità minima). Questa ha argomenti
per passare: funziona tutta offline ed è una scena 3D interattiva con comandi
touch e joypad, non un insieme di pagine. Resta però vero che lo stesso
contenuto è un sito pubblico, e il rischio c'è: meglio saperlo prima di
pagare.

## Intanto, senza App Store

Il sito è già installabile come applicazione, e dopo la prima apertura
funziona offline:

- **iPhone e iPad**: Safari → Condividi → *Aggiungi alla schermata Home*.
- **Mac con macOS 14 o successivi**: Safari → File → *Aggiungi al Dock*.
- **Mac con macOS 13**: Chrome o Edge → icona di installazione nella barra
  dell'indirizzo.
