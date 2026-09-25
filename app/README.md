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
GitHub Pages del progetto, confermato il 25 settembre 2026. Dopo la prima
pubblicazione non si cambia più: un identificativo nuovo è un'app nuova per
l'App Store.

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
ne discende, verificato su developer.apple.com il 25 settembre 2026:

- **Dal 28 aprile 2026** App Store Connect accetta solo app «built with
  Xcode 26 or later using an SDK for iOS 26» (pagina *Upcoming Requirements*).
- **Xcode 26** gira da macOS Sequoia 15.6 in su (fino a Xcode 26.3); da
  Xcode 26.4.1 serve macOS Tahoe 26.2. Su macOS Ventura 13 l'ultimo Xcode
  installabile è il 15.2, che App Store Connect non accetta più (pagina
  *Xcode system requirements*).
- Xcode occupa comunque decine di gigabyte: 8,8 GB liberi non bastano
  nemmeno a installarlo.

Quindi **da questo Mac l'app non si compila e non si pubblica**. Non serve,
però: sia la compilazione sia il caricamento avvengono su un Mac di GitHub
Actions, che ha l'Xcode attuale.

## Per pubblicarla davvero

In ordine. Solo il primo passo costa, e solo il primo va fatto da un
browser qualsiasi, senza Mac:

1. **Apple Developer Program**: 99 USD l'anno, la cifra della pagina
   *Programs*. Iscrizione come persona fisica. Senza, non si accede ad App Store
   Connect e non si arriva nemmeno a TestFlight.
2. **Registrare l'identificativo** `io.github.d0m3n1c0x.dopo79` in
   *Certificates, Identifiers & Profiles → Identifiers*, poi in **App Store
   Connect → App → «+» → Nuova app** creare la scheda dell'app scegliendo
   quell'identificativo. Apple chiede che la scheda esista prima del primo
   caricamento.
3. **Chiave API**: App Store Connect → *Utenti e accessi* → *Integrazioni* →
   *Team Keys* → *Generate API Key*, con accesso **Admin**. Serve Admin, e
   non App Manager, perché la firma usa i certificati gestiti da Apple
   (*cloud-managed certificates*), riservati ad Account Holder e Admin. Il
   file `.p8` **si scarica una volta sola**: conservalo.
4. **Quattro secrets** nel repository, in *Settings → Secrets and variables →
   Actions*:

   | Nome | Che cosa contiene |
   |---|---|
   | `ASC_KEY_ID` | il *Key ID* della chiave appena creata |
   | `ASC_ISSUER_ID` | l'*Issuer ID*, in cima alla stessa pagina |
   | `ASC_KEY_P8` | il contenuto del file `.p8`, incollato per intero |
   | `APPLE_TEAM_ID` | il *Team ID*, in *Membership details* sul sito sviluppatori |

5. **Lanciare il flusso** *App su TestFlight* dalla scheda Actions
   (`.github/workflows/app-testflight.yml`). Archivia con Xcode, firma e
   carica su App Store Connect; dopo qualche minuto di elaborazione la build
   compare in TestFlight. Ogni lancio usa un numero di build nuovo. Se manca
   un secret si ferma subito e dice quale.
6. **Provarla** da TestFlight su iPhone. Poi scheda dell'App Store,
   screenshot, informativa sulla privacy (l'app non raccoglie dati) e invio
   in revisione.

Il flusso TestFlight è scritto ma **non è mai stato eseguito**: senza un
account non c'era modo di provarlo. Il primo lancio è anche il suo collaudo.

**Il Mac viene gratis.** Per impostazione predefinita le app per iPhone e
iPad sono disponibili nel Mac App Store per i Mac con processore Apple, da
macOS 11, «provided no edits are made to the app availability»: non serve un
secondo progetto, e si può escluderle da *Prezzi e disponibilità*. Sui Mac
Intel non girano.

**Il rischio in revisione.** La linea guida 4.2 (*Minimum Functionality*)
dice: «Your app should include features, content, and UI that elevate it
beyond a repackaged website». Questa ha argomenti per passare: funziona
tutta offline ed è una scena 3D interattiva con comandi touch e joypad, non
un insieme di pagine. Resta però vero che lo stesso contenuto è un sito
pubblico, e il rischio c'è: meglio saperlo prima di pagare.

## Intanto, senza App Store

Il sito è già installabile come applicazione, e dopo la prima apertura
funziona offline:

- **iPhone e iPad**: Safari → Condividi → *Aggiungi alla schermata Home*.
- **Mac con macOS 14 o successivi**: Safari → File → *Aggiungi al Dock*.
- **Mac con macOS 13**: Chrome o Edge → icona di installazione nella barra
  dell'indirizzo.
