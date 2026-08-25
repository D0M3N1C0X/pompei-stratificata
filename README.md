# Pompei stratificata

Un modello urbano navigabile di Pompei che si può percorrere a piedi, attraversando
otto fasi cronologiche — dalla vigilia dell'eruzione del 79 d.C. al cantiere di
scavo di oggi — con i dati di un dossier documentario ancorati ai luoghi in cui
sono stati raccolti.

**[▶ Apri il simulatore](https://DOMENICO.github.io/pompei-stratificata/)** ·
**[Leggi il dossier](https://DOMENICO.github.io/pompei-stratificata/dossier/)**

> Sostituisci `DOMENICO` con il tuo nome utente GitHub dopo aver attivato Pages.

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

## Che cosa contiene

| | |
|---|---|
| **Otto fasi** | 79 d.C. (vigilia e seppellimento) · I–III sec. · IV–V sec. · XV–XVI sec. · 1592–1600 · 1748–1763 · oggi |
| **Quindici luoghi** | ciascuno con la scheda dei dati e la fonte in fondo al pannello |
| **Modalità sezione** | taglia il terreno e mostra la stratigrafia dall'interno, con le quote sulla faccia del taglio |
| **Sole reale** | posizione solare calcolata per Pompei (40,75° N) sull'ora di Europe/Rome |
| **Tour guidato** | quattordici tappe in ordine narrativo, con cambio di fase automatico |
| **Modalità presentazione** | scorre le otto fasi da sola, con didascalie ingrandite |

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
- Parco Archeologico di Pompei, *Guida agli scavi di Pompei* e schede del sito
  ufficiale.
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
