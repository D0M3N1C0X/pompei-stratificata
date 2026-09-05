# Dopo il 79 — Pompei ed Ercolano

Due città sepolte dalla stessa notte, in un modello che si percorre a piedi.

**Pompei** attraverso otto fasi cronologiche, dalla vigilia dell'eruzione del 79 d.C.
al cantiere di scavo di oggi. **Ercolano** limitata alla parte effettivamente
scavata, con il fronte di scavo e corso Resina sopra il resto. E una **sezione che
mette le due colonne stratigrafiche a confronto nella stessa scala**: cinque metri
contro venti.

I dati di un dossier documentario sono ancorati ai luoghi in cui sono stati raccolti.

> L'indirizzo del repository resta `pompei-stratificata`: rinominarlo avrebbe rotto
> l'indirizzo di GitHub Pages, che non viene reindirizzato dopo un cambio di nome.

**[▶ Apri il simulatore](https://d0m3n1c0x.github.io/pompei-stratificata/)** ·
**[Leggi il dossier](https://d0m3n1c0x.github.io/pompei-stratificata/dossier/)**

---

## La domanda

«Perché a Pompei non si scavò prima del XVI secolo?» è una domanda posta male, e
il progetto nasce dal rifiuto di rispondere così com'è.

Si scavò, eccome: dai giorni successivi all'eruzione e per secoli — recuperi dei
proprietari, spoglio sistematico dei materiali, saccheggi. Quello che non esisteva
non era lo scavo, era lo **scavo per conoscere**. E il sito non fu dimenticato: si
perse la corrispondenza tra il luogo, che continuò a chiamarsi *Civita*, e il nome,
recuperato solo nel 1763 con il ritrovamento dell'iscrizione
*rei publicae Pompeianorum* — 1684 anni dopo l'eruzione, e 15 anni dopo l'inizio
degli scavi borbonici.

Il modello serve a rendere visibile un ragionamento che a parole resta astratto:
con circa cinque metri di deposito, un piano terra alto quattro metri sparisce e
il piano superiore no. **Pompei non è mai stata invisibile: è diventata
illeggibile.** È la ragione fisica per cui la città è rimasta raggiungibile dai
recuperanti, dai saccheggiatori e, quattro secoli dopo, da chi ci è tornato ad
abitare.

Ercolano serve a mostrare che quella conclusione dipende dal deposito e non dagli
uomini. Stessa notte, quindici chilometri di distanza, nessuna fase di ricaduta
pliniana e circa venti metri di correnti piroclastiche: lì non torna ad abitare
nessuno, e sopra le rovine si costruisce una città nuova senza sapere che cosa ci
sia sotto. **Pompei è diventata illeggibile, Ercolano irraggiungibile.** Due modi
diversi di sparire, dalla stessa eruzione.

## Che cosa contiene

| | |
|---|---|
| **Otto fasi** | 79 d.C. (vigilia e seppellimento) · I–III sec. · IV–V sec. · XV–XVI sec. · 1592–1600 · 1748–1763 · oggi |
| **Quindici luoghi** | ciascuno con la scheda dei dati e la fonte in fondo al pannello |
| **Modalità sezione** | taglia il terreno e mostra la stratigrafia dall'interno, con le quote sulla faccia del taglio |
| **Sole reale** | posizione solare calcolata per Pompei (40,75° N) sull'ora di Europe/Rome |
| **Sonoro** | ambiente sonoro diverso per ogni fase, e il timbro degli strumenti attestati come reperto nell'area vesuviana — tibiae, cornua, cymbala. Tutto sintetizzato dal codice: nessun file audio |
| **Confronto** | la sezione stratigrafica di Pompei e quella di Ercolano affiancate, nella stessa scala, con la città moderna sopra Ercolano |
| **Ercolano** | lo scavo percorribile a piedi: due decumani, tre cardini, quattro insulae intere più le due Orientalis, le terrazze, i dodici fornici sulla spiaggia antica, e il fronte di scavo con corso Resina sopra |
| **Tour guidato** | quattordici tappe in ordine narrativo, con cambio di fase automatico |
| **Modalità presentazione** | scorre le otto fasi da sola, con didascalie ingrandite |

## Resa

Il motore disegna la scena fuori schermo e la ripassa con un solo passaggio scritto
a mano — antialiasing, un'occlusione di contatto letta dalla profondità, una
maschera di nitidezza, vignettatura — senza usare addon, così il file resta
autosufficiente. Il riquadro dell'ombra segue lo sguardo e si stringe a circa
120 m di lato quando cammini: con una mappa da 4096 fa un texel ogni pochi
centimetri, contro i 74 cm della versione precedente, ed è la ragione per cui le
ombre si leggono. La risoluzione interna sale sopra quella dello schermo quando la
macchina regge e scende da sola quando non regge, invece di scattare fra livelli
fissi.

Funziona su computer (tastiera e mouse), su telefono (controller su schermo) e con
un joypad Bluetooth. Installabile come applicazione: dopo la prima apertura
funziona **senza rete**.

## Che cosa NON è

Va detto in chiaro, perché il progetto sta in piedi solo se è onesto sui propri
limiti.

- **Non è un rilievo archeologico.** La pianta segue l'impianto urbano reale —
  nove *regiones*, assi stradali, sette porte, posizione dei monumenti — ma le
  volumetrie sono schematiche e la griglia è raddrizzata rispetto all'originale.
- **Le uniche proporzioni prese da misure pubblicate** sono quelle della Palestra
  Grande (circa 140 × 140 m, piscina 23 × 35 m), dalla guida ufficiale del Parco
  Archeologico di Pompei.
- **Il tracciato del canale del Conte di Sarno è inventato.** Cercando una fonte
  scientifica sul percorso esatto sotto la città non ne ho trovate: l'unica
  trattazione estesa è autopubblicata e legata a una tesi di ridatazione di Pompei,
  quindi inutilizzabile. Nel modello è dichiarato tale nella scheda del luogo.
- **Le texture sono disegnate dal codice**, non rilevate dai materiali reali.
- **Il profilo del Vesuvio è schematico e fuori scala.**
- **Il sonoro non è una ricostruzione.** Riproduce il *timbro* di strumenti che
  esistono come reperto — circa settanta rinvenimenti riferibili a tibiae da Pompei,
  cinque cornua, sei coppie di cymbala — ma **non esegue nessuna melodia antica**, e
  l'ambiente (folla, lapilli, vento, picconi) è un'evocazione dichiarata: nessuna
  fonte descrive il paesaggio sonoro di Pompei. La cetra suona ed è marcata come
  **sola iconografia**: da Pompei e da Ercolano non sopravvive nessuno strumento a
  corda. Arpa e liuto restano fuori perché non attestati.
- **La melodia dell'epitaffio di Sicilo non è inclusa.** È l'unica composizione
  greco-antica completa superstite e sarebbe l'aggancio giusto, ma la sequenza dei
  segni e le durate non sono state verificate sull'edizione critica (Pöhlmann &
  West 2001, nr. 23, pp. 88–91). Il posto c'è ed è vuoto finché quel volume non
  viene aperto. La scheda del luogo spiega esattamente questo.
- **Il modello di Ercolano nel confronto è una colonna stratigrafica schematica**,
  non la topografia del sito. Sullo spessore del deposito le fonti divergono fra
  16 e 25 m: è disegnato 20 m, il valore modale nelle fonti peer-reviewed e nel
  sito del Parco, e il conflitto è dichiarato nel pannello.
- **Nella scena di Ercolano si cammina solo dove si è scavato davvero.** Il resto
  della città antica non è ricostruito: è disegnato come deposito, con la città
  moderna sopra. Ricostruire ciò che non è scavato sarebbe invenzione.
- **L'orientamento di Ercolano non è verificato.** La scena è costruita nella
  *convenzione di sito* — Decumano Massimo a monte, mare a valle — perché è così
  che ogni pianta e ogni fonte lo descrivono. L'azimut vero della griglia non l'ho
  trovato pubblicato: le fonti divergono fra NO–SE e NE–SO. La bussola, in quella
  scena, dice «lato mare», non «nord».
- **Le uniche misure pubblicate usate a Ercolano** sono la Palestra (77 × 47 m,
  Maiuri 1960), la Basilica Noniana (29 × 16 m) e la superficie della Casa dei
  Cervi (circa 1.190 m²). Tutto il resto della sagoma è dedotto dalle piante.
- **La posizione del sole usa i parametri orbitali odierni**, non quelli del 79 d.C.

## Metodo

Ogni affermazione nel dossier porta la fonte a fianco. Dove una fonte non è stata
verificata, c'è scritto. Il documento ha una sezione **Lacune** che elenca ciò che
non è stato controllato, e un **Registro delle verifiche** che documenta due
correzioni fatte al testo dopo aver verificato le fonti:

1. Il graffito della Casa di N. Popidius Priscus (VII.2.20) **era in greco**:
   *domus pertusa* è la resa latina che ne diede Fiorelli, non il testo
   dell'iscrizione. Nessun numero *CIL* individuato.
2. L'ipotesi che le eruzioni successive (Pollena 472, Vesuvio 1631) avessero
   aggiunto deposito su Pompei **è stata ritirata**: nessuna fonte scientifica la
   documenta per il sito urbano.

Da quella seconda verifica è emersa una lacuna nella letteratura che il progetto
dichiara come spazio di ricerca: **non risulta pubblicato uno studio geoarcheologico
della colonna stratigrafica sopra il livello del 79 dentro le mura di Pompei**.

## Fonti principali

- Sparice, D., Amoretti, V., Galadini, F., Di Vito, M. A., Terracciano, A.,
  Scarpati, G., & Zuchtriegel, G. (2024). A novel view of the destruction of
  Pompeii during the 79 CE eruption of Vesuvius (Italy). *Frontiers in Earth
  Science*, 12. https://doi.org/10.3389/feart.2024.1386960
- Zuchtriegel, G., Borsa, L., Onesti, A., Salvatori, L., & Scarpati, G. (2025).
  La rioccupazione nell'Insula meridionalis di Pompei dopo il 79 d.C. Riflessioni
  a margine dell'«inconscio archeologico». *E-Journal degli Scavi di Pompei*.
- Amato, V., Covolan, M., Dessales, H., & Santoriello, A. (2022). Seismic
  Microzonation of the Pompeii Archaeological Park. *Geosciences*, 12(7), 275.
  https://doi.org/10.3390/geosciences12070275
- Pensa, A., Capra, L., Giordano, G., & Corrado, S. (2023). A new hazard scenario
  at Vesuvius: Deadly thermal impact of detached ash cloud surges in 79CE at
  Herculaneum. *Scientific Reports*, 13, 5622. https://doi.org/10.1038/s41598-023-32623-3
- Camardo, D. (2007). Archaeology and conservation at Herculaneum: From the Maiuri
  campaign to the Herculaneum Conservation Project. *Conservation and Management of
  Archaeological Sites*, 8(4), 205–214.
- Petrone, P. (2019). The Herculaneum victims of the 79 AD Vesuvius eruption: A
  review. *Journal of Anthropological Sciences*, 97, 1–22. https://doi.org/10.4436/jass.97008
- Mungari, M., & Wysłucha, K. (2021). Material music in ritual soundscapes of
  Pompeii. *Open Arts Journal*, 10, 89–108. https://doi.org/10.5456/issn.2050-3679/2021s05
- Hagel, S. (2008). Re-evaluating the Pompeii auloi. *The Journal of Hellenic
  Studies*, 128, 52–71.
- Pelosi, C., Agresti, G., Holmes, P., Ervas, A., De Angeli, S., & Santamaria, U.
  (2016). An X-ray fluorescence investigation of ancient Roman musical instruments
  and replica production under the aegis of the European Music Archaeological
  Project. *International Journal of Conservation Science*, 7(SI2), 847–856.
- Rohland, R. A. (2022). *Carpe diem: The poetics of presence in Greek and Latin
  literature*. Cambridge University Press.
- Parco Archeologico di Pompei, *Guida agli scavi di Pompei* e schede del sito
  ufficiale · Parco Archeologico di Ercolano, *Area archeologica* · UNESCO World
  Heritage Centre, lista 829.
- Svetonio, *Divus Titus* 8.4 · Cassio Dione, *Storia romana* 66.21–24.
- NOAA Global Monitoring Laboratory, *Solar Calculation Details* — equazioni per
  la posizione solare.

L'apparato completo, con i dati bibliografici verificati e le lacune dichiarate,
è nel dossier.

## Struttura

```
index.html              il simulatore (autosufficiente: motore 3D, città, dati)
manifest.webmanifest    metadati per l'installazione come applicazione
sw.js                   service worker: mette tutto in cache, poi funziona offline
icon-*.png              icone dell'applicazione
dossier/index.html      il dossier documentario
```

Nessuna dipendenza da installare, nessun passaggio di compilazione. Il motore 3D
(three.js) è incluso nel file. Per provare in locale:

```bash
python3 -m http.server 8000
```

e apri `http://localhost:8000`. Il service worker richiede `https` o `localhost`:
da `file://` l'app funziona, ma non si installa.

## Licenza

- **Codice**: MIT — vedi [LICENSE](LICENSE)
- **Testi, dossier e contenuti documentari**: CC BY 4.0 — vedi
  [LICENSE-CONTENUTI.md](LICENSE-CONTENUTI.md)

## Citare

Vedi [CITATION.cff](CITATION.cff). Se il repository è archiviato su Zenodo,
usa il DOI della versione che hai consultato.

## Autore

Domenico Perroni
