# Piste di ricerca sui quattro limiti dichiarati

*Aggiornato al 25/09/2026.*

Questo file **non è una fonte**: è il quaderno delle ricerche. Registra che cosa
è emerso cercando di chiudere quattro dei limiti che il progetto dichiara, e
quale documento va aperto per chiuderli davvero.

**Nessun dato del modello o del dossier è stato cambiato su queste basi.** La
ricerca è stata fatta da un ambiente con la rete chiusa quasi del tutto: erano
leggibili i risultati di un motore di ricerca, cioè titoli e riassunti, ma non le
pagine, i PDF, i DOI o i siti dei Parchi. Per lo standard del dossier — ogni
affermazione verificata sulla fonte primaria o sulla pagina dell'editore — non
basta. Ogni voce qui sotto dice quindi che cosa **suggerisce** la pista, dove sta
la fonte citabile, e che cosa cambierebbe nel modello se la fonte la conferma.

Legenda dello stato:

- **pista** — indicazione trovata, fonte citabile individuata, non ancora letta
- **conflitto** — la pista contraddice qualcosa che il progetto dice oggi
- **vicolo cieco** — nessuna fonte citabile individuata

---

## 1. Il tracciato del canale di Fontana — *pista, conflitto*

**Che cosa dice oggi il progetto.** Nel modello il tracciato è «inventato» e il
registro delle verifiche lo chiude così: «nessuno studio scientifico trovato sul
percorso sotto la città» (`src/i18n/it.js`, luogo `canale`; dossier, Registro).

**Che cosa è emerso.**

- Esiste almeno un lavoro in una rivista di settore: **P. Rispoli, R. Paone,
  «Pompei, Canale Conte Sarno. Lavori di sistemazione e rifunzionalizzazione»,
  *Rivista di Studi Pompeiani* XXII (2011)**. Da un lavoro di sistemazione del
  canale dentro l'area archeologica ci si aspetta una planimetria del tratto
  urbano. Una copia è segnalata su Academia.edu (profilo di Rosario Paone).
- La voce di it.wikipedia *Canale Conte di Sarno* dà un percorso preciso per il
  tratto sotterraneo: entra da est a **Porta Sarno**, passa **a nord
  dell'Anfiteatro**, accanto al **Tempio di Iside**, attraverso l'**Edificio di
  Eumachia**, il **Foro** e il **Tempio di Apollo**, ed esce presso la **Via dei
  Sepolcri**. È una fonte terziaria e non va citata, ma dice dove guardare.
- Sempre secondo it.wikipedia, Raffaele Garrucci sostenne nell'Ottocento che per
  il canale fosse stato «rimesso in funzione» un acquedotto antico, non
  costruito uno nuovo. Se è vero, cambia il senso della frase «Fontana tagliò la
  città senza riconoscerla».
- Il canale è rimasto in esercizio a cielo aperto e in galleria fino al 1984;
  negli anni Novanta è stato coperto e trasformato in collettore misto.

**Da aprire.** Rispoli & Paone 2011 (RStPomp XXII). Poi la pianta di
H. Eschebach (*Pompeji. Erlebte antike Welt*, e la *Stadtplan*), che dovrebbe
riportare il canale, e i documenti del cantiere raccolti in Fiorelli,
*Pompeianarum antiquitatum historia*, vol. I.

**Che cosa cambierebbe.** Il tracciato del modello (`canalGroup` in
`src/app.js`) passerebbe da «inventato» a «ridisegnato su Rispoli & Paone 2011»,
e la riga del Registro da *Aperto* a *Risolto*. Va corretto in ogni caso il
dossier: «nessuno studio scientifico trovato» non è più vero, perché uno studio
esiste. Diventa «uno studio individuato, non ancora letto».

---

## 2. L'orientamento della griglia di Ercolano — *pista, conflitto*

**Che cosa dice oggi il progetto.** Il Parco e Maiuri danno l'asse NO-SE, una
pagina universitaria britannica NE-SO. La scena usa la convenzione di sito.

**Che cosa è emerso.**

- **A. C. Sparavigna, *The Town Planning of Pompeii and Herculaneum Having
  Streets Aligned Along Sunrise on Summer Solstice* (2016)**, su SSRN e
  ResearchGate. Misura l'orientamento su immagini satellitari e sostiene che il
  decumano di Ercolano sia allineato **entro un grado** con l'alba del solstizio
  d'estate.
- A 40,81° N l'alba del solstizio d'estate cade a un azimut di circa **58°**
  (57,9° con l'obliquità del 79 d.C., 58,3° con quella di oggi; calcolo mio,
  formula standard, senza rifrazione né orizzonte). Se Sparavigna ha ragione, i
  decumani corrono **ENE-OSO**, cioè più vicino alla versione «NE-SO» che a
  «NO-SE».
- **Il conflitto.** I decumani sono paralleli alla costa, e la costa di Ercolano
  corre all'incirca NO-SE. A occhio le due cose non stanno insieme. Una
  spiegazione possibile: Sparavigna usa «decumano» per l'asse che le piante
  chiamano cardine. Va controllato sulla sua figura, non supposto.
- **Il peso della fonte.** Sparavigna è una fisica del Politecnico di Torino,
  con una lunga serie di lavori di archeoastronomia pubblicati quasi tutti su
  SSRN, arXiv e riviste minori. È una misura dichiarata con un metodo
  riproducibile, ma **non è peer-reviewed** nel senso in cui lo sono le altre
  fonti del dossier.

**Da aprire.** Il PDF di Sparavigna, per vedere quale strada ha misurato e con
quale azimut. Poi, per chiudere senza dipendere da nessuno: **misurare
l'azimut da una base georiferita**, cioè la Carta Tecnica Regionale della
Campania oppure le vie pedonali dello scavo su OpenStreetMap (Cardo III, IV,
V, Decumano Inferiore). È una misura che il progetto può fare da sé e
dichiarare come propria, con il metodo.

**Che cosa cambierebbe.** La scena di Ercolano (`src/ercolano.js`) potrebbe
ruotare nel nord vero, la bussola tornerebbe a dire «nord», e il sole reale
cadrebbe sulle facciate giuste. È la chiusura più alla portata dei quattro.

---

## 3. Lo spessore del deposito fuori dal settore pubblicato — *pista*

**Che cosa dice oggi il progetto.** Tutti i numeri vengono da un solo settore,
l'Insula dei Casti Amanti (Sparice et al. 2024), estesi al resto della città
«per necessità di rappresentazione».

**Che cosa è emerso.** Tre lavori misurano il deposito in più punti della città.

- **G. Luongo, A. Perrotta, C. Scarpati (2003a)**, «Impact of the AD 79
  explosive eruption on Pompeii, I. Relations amongst the depositional
  mechanisms of the pyroclastic products, the framework of the buildings and the
  associated destructive events», *Journal of Volcanology and Geothermal
  Research* 126, da p. 201 (pagina finale da verificare). Lavora su sezioni stratigrafiche dentro e intorno
  all'area scavata.
- **G. Luongo, A. Perrotta, C. Scarpati e altri (2003b)**, «… II. Causes of death of the inhabitants inferred by
  stratigraphic analysis and areal distribution of the human casualties»,
  *JVGR* 126, da p. 169.
- **C. Scarpati, A. Perrotta (2020)**, «Pompeian hiatuses: new stratigraphic
  data highlight pauses in the course of the AD 79 eruption at Pompeii»,
  *Geological Magazine* 157, 695–700. Contiene una sezione composita con lo
  **spessore massimo di ciascuna unità** in città.
- **L. Gurioli e altri (2007)**, «Influences of urban fabric on pyroclastic
  density currents at Pompeii (Italy): 1. Flow direction and deposition»,
  *Journal of Geophysical Research: Solid Earth*, doi 10.1029/2006JB004444.
  Mostra che lo spessore delle unità da corrente cambia da una stanza all'altra
  della stessa casa.
- Dai riassunti: il deposito di caduta raggiunge il **massimo di 2,8 m** proprio
  a Pompei (Sigurdsson et al. 1985). Il valore coincide con il «2,8–2,9 m» già
  nel dossier. L'ultima corrente arriva sottile a nord-ovest, fuori dalle mura,
  e nella parte più settentrionale della città.

**Da aprire.** Luongo et al. 2003a (tabella o figure delle sezioni con le
località) e Scarpati & Perrotta 2020 (sezione composita). Sono gli unici lavori
individuati che danno spessori per più di un punto.

**Che cosa cambierebbe.** Il deposito del modello, oggi uno strato uniforme di
5 m, potrebbe variare per settore dove c'è un dato, e restare uniforme,
dichiarato tale, dove non c'è. **Attenzione a non confondere due cose:** questi
lavori misurano il deposito **del 79**. La lacuna del §08 riguarda ciò che sta
**sopra** il 79, e resta aperta anche se questa pista si chiude.

---

## 4. Il numero dei morti ai fornici di Ercolano — *pista*

**Che cosa dice oggi il progetto.** Circa 300 (Parco), 230 (Pappalardo 1994),
55 → 296 → 340 (en.wikipedia). «Se citi una cifra, cita anche la data.»

**Che cosa è emerso.** La progressione è in buona parte una storia di campagne
di scavo, non un disaccordo.

| Quando | Chi | Che cosa | Fonte indicata dalla pista |
|---|---|---|---|
| 16/01/1982 | scavo per il nuovo ingresso | primo gruppo di scheletri sotto gli archi delle Terme Suburbane | it.wikipedia, *Spiaggia di Ercolano* |
| estate 1982 → anni '80 | S. Bisel | studio dei primi resti | Petrone 2019 |
| 1994 | Pappalardo | 230 in tutto, una sessantina sulla spiaggia | EAA, già nel dossier |
| 1997–1999 | P. P. Petrone | nuova campagna nei fornici | Petrone 2019; Martyn et al. 2020 |
| oggi | — | **340 individui** dalla spiaggia e da **nove** fornici | riassunti di Martyn et al. 2020 e di altri lavori di York |
| oggi | — | **296** nei fornici **più 59** sulla spiaggia | sito divulgativo (History and Archaeology Online), fonte primaria non individuata |

- 296 + 59 = 355, non 340. La differenza di 15 può dipendere da come si
  contano individui incompleti o frammentari. Va letta sulla fonte, non
  aggiustata.
- «Circa 300 nei fornici» del Parco e «296 nei fornici» sono probabilmente lo
  stesso dato, arrotondato.

**Da aprire.** **P. P. Petrone (2019)**, «The Herculaneum victims of the 79 AD
Vesuvius eruption: a review», *Journal of Anthropological Sciences* 97, 1–22,
doi 10.4436/jass.97008. È una rassegna scritta da chi ha scavato: dovrebbe dare
il conteggio per fornice e per campagna. Poi Martyn et al. 2020 per il 340.

**Che cosa cambierebbe.** La nota «il numero non è un dato stabile» potrebbe
diventare una tabella per campagne con le date, che è più utile di una cifra
sola. È la pista con la fonte più facile da aprire: Petrone 2019 è open access.

---

## Sicilo

Nessuna novità: la trascrizione citabile (Pöhlmann & West 2001, nr. 23) non è
disponibile. Il posto resta vuoto e dichiarato tale.

## Per riprendere

Con la rete aperta a `doi.org`, `cambridge.org`, `sciencedirect.com`,
`isita-org.com`, `academia.edu`, `ssrn.com`, `openstreetmap.org` e ai siti dei due
Parchi, le quattro piste si possono chiudere nell'ordine:

**4** (Petrone, open access) → **2** (misura propria su base georiferita) →
**1** (Rispoli & Paone) → **3** (Luongo 2003, dietro abbonamento).
