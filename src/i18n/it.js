/* =====================================================================
   TESTI — italiano

   La lingua originale del progetto. È compilata dentro il prodotto, non
   scaricata: così index.html continua a funzionare da solo e da file://
   anche quando le altre lingue non sono raggiungibili.

   Le altre lingue sono file JSON con la stessa forma, in i18n/. Una
   chiave che manca ricade qui, quindi una traduzione incompleta resta
   leggibile e il buco si vede.

   Che cosa NON sta qui, ed è voluto:
   · i toponimi disegnati nella scena — Via dell'Abbondanza, Porta Marina,
     REGIO IX — perché restano tali in ogni lingua, compreso l'inglese;
   · le fonti bibliografiche dentro `src`, che sono riferimenti e non testo.
   ===================================================================== */

export default {
  "ui": {
    "touch": {
      "run": "Corri",
      "hint": "trascina lo schermo per guardarti intorno",
      "levettaAria": "Levetta di movimento"
    },
    "brand": {
      "titolo": "Dopo il 79 — Pompei ed Ercolano",
      "nota": "v8 · due città · modello schematico · 1 unità = 4 m · non è un rilievo"
    },
    "tool": {
      "luoghi": "Luoghi",
      "cammina": "Cammina",
      "volo": "Volo",
      "sezione": "Sezione",
      "dallAlto": "Dall'alto",
      "etichette": "Etichette",
      "qualita": "Qualità",
      "controller": "Controller",
      "ora": "Ora",
      "sonoro": "Sonoro",
      "confronto": "Confronto",
      "ercolano": "Ercolano",
      "tour": "Tour",
      "presenta": "Presenta",
      "comandi": "Comandi"
    },
    "presenta": {
      "esci": "Esci dalla presentazione"
    },
    "rail": {
      "titolo": "Luoghi con dati",
      "cerca": "Cerca un luogo…",
      "cercaAria": "Cerca un luogo",
      "vuoto": "Nessun luogo con questo nome.",
      "fuoriFase": " · fuori fase"
    },
    "erc": {
      "nome": "Ercolano — lo scavo",
      "incrocio": "Torna all'incrocio",
      "esci": "Torna a Pompei",
      "nota": "Cammini <b>solo dove si è scavato davvero</b>: quattro insulae intere più le due\nOrientalis. Tutto il resto è deposito, ed è disegnato come deposito — con la città\nmoderna sopra. <span class=\"ercWarn\">La scena è costruita nella convenzione di sito\n(Decumano Massimo a monte, mare a valle): l'orientamento vero non è verificato.</span>",
      "comandi": "<span><kbd>W A S D</kbd> cammina</span><span><kbd>mouse</kbd> guarda</span>\n<span><kbd>clic</kbd> apri la scheda</span><span><kbd>Esc</kbd> sblocca</span>",
      "avanti": "▲ avanti",
      "indietro": "▼ indietro"
    },
    "cmp": {
      "titoli": "<div class=\"cmpT\"><b>POMPEI</b><span>circa 5 m di deposito, di cui 3,1–3,3 m di lapilli pomicei</span><em>il piano superiore resta fuori</em></div>\n<div class=\"cmpT\"><b>ERCOLANO</b><span>circa 20 m di correnti piroclastiche: la casa sparisce tutta</span><em>sopra, la città moderna — Resina fino al 1969</em></div>",
      "titolo": "Perché Ercolano non è Pompei",
      "corpo": "<p><b>Pompei</b> riceve prima una ricaduta pliniana di pomici, poi le correnti\npiroclastiche: circa <b>5 m</b> nel settore indagato, di cui 3,1–3,3 m di lapilli.\nUn piano terra alto 4 m sparisce, il piano superiore no.</p>\n<p><b>Ercolano</b> non è toccata dalla fase di ricaduta — l'asse di dispersione punta\na sud-est, verso Pompei — e riceve <b>correnti piroclastiche fin dall'inizio</b>:\ncirca <b>20 m</b>. La casa sparisce tutta, e sopra ci sono altri 12 m di deposito.</p>\n<p class=\"cmpKey\">Pompei è diventata <b>illeggibile</b>. Ercolano è diventata\n<b>irraggiungibile</b>. È la stessa eruzione, e sono due storie di scavo diverse.</p>\n<p class=\"cmpWarn\">Sullo spessore di Ercolano <b>le fonti divergono</b>: circa 20 m nelle\nfonti peer-reviewed e nel sito del Parco, 25 m nella divulgazione della Herculaneum\nSociety, «16 e più metri» nella voce Treccani. Qui è disegnato 20 m, il valore modale.\nIl conflitto è dichiarato, non risolto.</p>\n<p class=\"cmpSrc\">Sparice et al. 2024, <em>Frontiers in Earth Science</em> 12 ·\nPensa et al. 2023, <em>Scientific Reports</em> 13, 5622 ·\nCamardo 2007, <em>Conservation and Management of Archaeological Sites</em> 8(4) ·\nPetrone 2019, <em>JASs</em> 97 · UNESCO WHC, lista 829 ·\nParco Archeologico di Ercolano, <em>Area archeologica</em></p>",
      "bottoni": "<button class=\"tourBtn\" id=\"cmpReset\">Rimetti in rotazione</button>\n<button class=\"tourBtn\" id=\"cmpClose\">Torna alla città</button>"
    },
    "clock": {
      "adesso": "Adesso",
      "nota": {
        "reale": "ora di Pompei",
        "scelta": "ora scelta",
        "sole": "sole a {gradi}°"
      },
      "fonte": "Pompei 40,75° N · formule NOAA · parametri orbitali odierni",
      "aria": "Ora del giorno"
    },
    "bussola": {
      "nord": "nord",
      "mare": "lato mare"
    },
    "sez": {
      "taglio": "Taglio",
      "legenda": "<div><i style=\"background:var(--lay-surge)\"></i>correnti piroclastiche · ≈ 1,8 m</div>\n<div><i style=\"background:var(--lay-grey)\"></i>lapilli pomicei grigi</div>\n<div><i style=\"background:var(--lay-white)\"></i>lapilli pomicei bianchi · 3,1–3,3 m insieme</div>",
      "suggerimento": "rotella del mouse per far scorrere il taglio · C per uscire",
      "versoNord": "Sposta il taglio verso nord",
      "versoSud": "Sposta il taglio verso sud",
      "vuota": {
        "vigilia": "in questa fase il deposito non c’è ancora — vai al seppellimento",
        "scavato": "in questa fase il deposito è stato scavato via"
      },
      "quota": "{n} m"
    },
    "tour": {
      "etichetta": "Tour",
      "indietro": "Indietro",
      "avanti": "Avanti",
      "chiudi": "Chiudi",
      "posizione": "{i} / {n}"
    },
    "panel": {
      "fonte": "Fonte",
      "aria": "Scheda del luogo",
      "chiudi": "Chiudi la scheda"
    },
    "intro": {
      "occhiello": "Esploratore v8 · dossier Pompei dopo il 79",
      "titolo": "Sedici secoli, in otto passi",
      "p1": "Cammini per le strade di Pompei — i muri ti fermano — e scorri le fasi lungo la fascia in basso. A ogni passo cambia quello che vedi: <b>il deposito sale di cinque metri e i piani terra spariscono</b>, i tetti vengono spogliati, sui piani superiori emergenti compaiono le strutture del IV–V secolo, la collina si copre di coltivo, il canale di Fontana la taglia, si aprono i cumuli di scarico borbonici.",
      "p2": "I coni verdi sono i punti in cui il dossier ha un dato: avvicinati e clicca. Con <b>Sezione</b> tagli il terreno e guardi la stratigrafia dall'interno.",
      "p3": "Si entra <b>alle nove e mezza</b>, con il sole basso: è l'ora in cui le ombre staccano i volumi e la città si legge. Con <b>Ora</b> apri l'orologio, scegli l'alba, il mezzogiorno o la notte, e con <b>Adesso</b> passi all'<b>ora reale di Pompei</b> — il sole dove sarebbe in questo momento sopra il sito, per la latitudine 40,75° N con le formule NOAA. Con <b>Controller</b> accendi i comandi su schermo; se colleghi un joypad Bluetooth viene riconosciuto da solo.",
      "tastiera": "<div><kbd>W A S D</kbd><span>cammina</span></div>\n<div><kbd>Shift</kbd><span>corri</span></div>\n<div><kbd>mouse</kbd><span>guarda</span></div>\n<div><kbd>C</kbd><span>sezione</span></div>\n<div><kbd>F</kbd><span>volo libero</span></div>\n<div><kbd>L</kbd><span>etichette</span></div>\n<div><kbd>1 – 8</kbd><span>cambia fase</span></div>\n<div><kbd>Esc</kbd><span>sblocca il mouse</span></div>\n<div><kbd>joypad</kbd><span>levette e dorsali</span></div>",
      "tatto": "<div><kbd>levetta</kbd><span>cammina</span></div>\n<div><kbd>trascina</kbd><span>guarda</span></div>\n<div><kbd>tocca il cono</kbd><span>apri la scheda</span></div>\n<div><kbd>fascia in basso</kbd><span>cambia fase</span></div>\n<div><kbd>Sezione</kbd><span>taglia il terreno</span></div>\n<div><kbd>joypad</kbd><span>levette e dorsali</span></div>",
      "avvertenza": "La pianta segue l'impianto urbano reale — nove <em>regiones</em>, assi stradali, sette porte, posizione dei monumenti — ma le volumetrie sono schematiche e la griglia è raddrizzata. Le uniche proporzioni prese da misure pubblicate sono quelle della Palestra Grande. Le texture sono disegnate dal codice, non rilevate dai materiali reali. Il tracciato del canale di Fontana è inventato: nessuna fonte scientifica lo documenta. Non usarlo come documentazione archeologica: usalo per far vedere un ragionamento.",
      "entra": "Entra in città",
      "confronto": "Vedi il confronto",
      "dossier": "Vai al dossier"
    },
    "caricamento": "Costruzione della città…",
    "epoche": {
      "aria": "Fasi cronologiche"
    },
    "titoloPagina": "Dopo il 79 — Pompei ed Ercolano",
    "qualita": {
      "alta": "Qualità alta",
      "bilanciata": "Bilanciata",
      "batteria": "Batteria"
    },
    "joypad": {
      "acceso": "Joypad ●",
      "collegato": "Collegato: "
    },
    "lingua": {
      "etichetta": "Lingua",
      "aria": "Scegli la lingua"
    }
  },
  "epoche": [
    {
      "tag": "79 d.C.",
      "name": "La vigilia",
      "caption": "La città viva. L’area archeologica misura circa <b>66 ettari</b>; le stime di popolazione al momento della distruzione oscillano tra 12.000 e 30.000 abitanti. Nove <em>regiones</em>, sette porte.",
      "src": "Parco Archeologico di Pompei, <em>Guida agli scavi</em>"
    },
    {
      "tag": "79 d.C.",
      "name": "Il seppellimento",
      "caption": "Circa <b>5 m</b> di deposito nel settore indagato, di cui 3,1–3,3 m di lapilli pomicei. I piani terra spariscono. <b>I piani superiori e i tetti restano fuori.</b> Pompei non è mai stata invisibile: è diventata illeggibile.",
      "src": "Sparice et al. 2024, <em>Frontiers in Earth Science</em> 12 · DOI 10.3389/feart.2024.1386960"
    },
    {
      "tag": "I–III sec.",
      "name": "Recuperi e cunicoli",
      "caption": "Si scava subito. I proprietari recuperano; poi lo spoglio diventa sistematico: marmi, blocchi e piombo escono da terme, Foro, teatri e Anfiteatro. Restano le brecce nelle pareti delle stanze svuotate.",
      "src": "Parco Archeologico di Pompei, <em>Pompei dopo l’eruzione</em>"
    },
    {
      "tag": "IV–V sec.",
      "name": "La rioccupazione",
      "caption": "Si torna ad abitare i piani superiori emergenti, usando quelli sepolti come cantine. Forni da pane ricavati nelle cisterne, focolari, macine a mano, lucerne con monogramma costantiniano.",
      "src": "Zuchtriegel, Borsa, Onesti, Salvatori, Scarpati 2025, <em>E-Journal degli Scavi di Pompei</em>"
    },
    {
      "tag": "XV–XVI sec.",
      "name": "Civita",
      "caption": "La collina si chiama <em>Civita</em>. Non è deserta: ceramica invetriata campana del XV secolo nell’area a sud della Basilica. Il luogo non fu dimenticato — si perse la corrispondenza tra il luogo e il nome.",
      "src": "<em>Pompei oltre il 79 d.C.</em>, E-Journal degli Scavi di Pompei 2026.09"
    },
    {
      "tag": "1592–1600",
      "name": "Il canale di Fontana",
      "caption": "Il conte Muzio Tuttavilla incarica Domenico Fontana di costruire il canale del Conte. Il tracciato taglia la collina. Emergono monete e resti di edifici. <b>Nessuno capisce di essere dentro Pompei.</b>",
      "src": "Parco Archeologico di Pompei · <em>Manifatture in Campania</em>, Giunti 1983, pp. 126–127"
    },
    {
      "tag": "1748–1763",
      "name": "Lo scavo borbonico",
      "caption": "23 marzo 1748: primo cantiere sistematico a Civita, per estrarre pezzi destinati alla reggia di Portici. Alcubierre crede di essere a Stabiae. Il nome arriva nel <b>1763</b>, con l’iscrizione <em>rei publicae Pompeianorum</em>.",
      "src": "Parslow 1995 · Britannica, <em>History of excavations</em>"
    },
    {
      "tag": "Oggi",
      "name": "Il cantiere aperto",
      "caption": "Dei circa <b>66 ettari</b> dell’area archeologica ne sono stati scavati circa <b>45</b>. Nell’Insula Meridionalis lo scavo stratigrafico sta recuperando le fasi post-79 che le campagne precedenti avevano rimosso per arrivare al livello del 79: l’«inconscio archeologico».",
      "src": "Zuchtriegel et al. 2025 · <em>Guida agli scavi di Pompei</em>"
    }
  ],
  "luoghi": {
    "vesuvio": {
      "label": "Vesuvio",
      "sub": "a nord della città",
      "body": "<p>L’eruzione è raccontata da <b>Plinio il Giovane</b> (<em>Ep.</em> 6.16 e 6.20), che descrive la morte dello zio ma non il dopo. <b>Cassio Dione</b> nomina esplicitamente le due città distrutte: «seppellì due intere città, Ercolano e Pompei» (66.23.3).</p>\n    <p class=\"warn\">La data è controversa. Dione (66.21.1) colloca l’evento alla fine dell’estate; i manoscritti pliniani divergono; l’iscrizione a carboncino trovata nel 2018 nella Regio V ha riaperto il dibattito. Dichiarala controversa, non risolverla.</p>\n    <p class=\"warn\">Il profilo del monte è schematico e fuori scala: serve a orientarti, non a rappresentare il Somma-Vesuvio prima del 79.</p>",
      "src": "Cassio Dione 66.21–23 · Plinio il Giovane, <em>Ep.</em> 6.16; 6.20"
    },
    "soccorsi": {
      "label": "Foro — i soccorsi di Tito",
      "sub": "Regio VII/VIII",
      "body": "<p class=\"lat\">Curatores restituendae Campaniae e consularium numero sorte duxit; bona oppressorum in Vesuvio, quorum heredes non exstabant, restitutioni afflictarum civitatum attribuit.</p>\n    <p>«Estrasse a sorte, tra i consolari, dei curatori per il restauro della Campania; assegnò i beni di chi era perito sul Vesuvio senza lasciare eredi alla ricostruzione delle città colpite.» Cassio Dione conferma: due ex consoli, denaro pubblico, i beni dei morti senza eredi ai superstiti.</p>\n    <p class=\"key\">L’oggetto dell’intervento imperiale è la <b>Campania come regione</b>. Nessuna fonte antica documenta un tentativo di ricostruire Pompei. L’aiuto va ai vivi, non alle rovine.</p>",
      "src": "Svetonio, <em>Tit.</em> 8.4 · Cassio Dione 66.24"
    },
    "stratigrafia": {
      "label": "Insula dei Casti Amanti",
      "sub": "Regio IX, insula 12",
      "body": "<p>Il dato materiale che condiziona tutto il resto. Nel settore indagato il seppellimento raggiunge <b>circa 5 m</b>, di cui <b>3,1–3,3 m</b> di lapilli pomicei; il resto sono depositi da correnti piroclastiche. Lo spessore massimo del solo deposito di caduta è di 2,8–2,9 m.</p>\n    <p class=\"key\">Con cinque metri, un piano terra alto quattro sparisce e il piano superiore no. È la ragione fisica per cui la città resta raggiungibile — dai recuperanti, dai saccheggiatori e, quattro secoli dopo, da chi ci torna ad abitare.</p>\n    <p class=\"hint\">Premi <b>C</b> per tagliare il terreno e guardare la stratigrafia in sezione.</p>\n    <p class=\"warn\">Lo spessore varia da un punto all’altro della città. La misura vale per il settore pubblicato, non per tutta Pompei.</p>",
      "src": "Sparice, Amoretti, Galadini, Di Vito, Terracciano, Scarpati, Zuchtriegel 2024 · DOI 10.3389/feart.2024.1386960"
    },
    "popidius": {
      "label": "Casa di N. Popidius Priscus",
      "sub": "VII.2.20, Vico del Panettiere",
      "body": "<p>All’ingresso, sul lato sud del Vico del Panettiere, Fiorelli registrò un graffito inciso con un chiodo e lo lesse come il segnale lasciato da chi aveva già svuotato l’edificio, collocando l’operazione «probabilmente all’epoca degli Antonini».</p>\n    <p class=\"warn\"><b>Il graffito era in greco.</b> <em class=\"lat\">Domus pertusa</em> non è il testo dell’iscrizione: è l’equivalente latino che ne diede Fiorelli. Le fonti raggiungibili non riproducono il testo greco, e del numero <em>CIL</em> IV non ho trovato traccia.</p>\n    <p class=\"warn\">L’Ancient Graffiti Project non registra graffiti per questa proprietà, ma non prova nulla: di Pompei copre solo il Lupanare, il campus della palestra, la Regio I ins. 8, la Regio V ins. 1 e tutta la Regio VIII. <b>La Regio VII non è coperta.</b> Cerca sul <em>CIL</em> IV a stampa e sui supplementi De Gruyter.</p>",
      "src": "Fiorelli, <em>Guida di Pompei</em>, Roma 1877, p. 59 · Ancient Graffiti Project"
    },
    "casa-giardino": {
      "label": "Casa con Giardino",
      "sub": "Regio V, scavi 2018",
      "body": "<p>In una stanza, almeno sei individui trovati «rivoltati, contorti e trascinati» da chi cercava oggetti. Anelli e piccoli oggetti sfuggiti al saccheggio erano staccati dai corpi. I cunicoli documentano un’attività di scavo molto precedente al 1748.</p>\n    <p class=\"key\">Non è un dettaglio macabro: è la prova che qualcuno sapeva dov’era la città, sapeva che c’era roba, e sapeva come arrivarci. Sedici secoli di «oblio» non reggono davanti a questa stanza.</p>",
      "src": "Parco Archeologico di Pompei, comunicato del 24/10/2018"
    },
    "foro": {
      "label": "Foro",
      "sub": "il cuore spogliato",
      "body": "<p>Il sito diventa cava. Marmi, blocchi di pietra e piombo vengono asportati dalle terme, dal Foro, dai teatri e dall’Anfiteatro. Il Foro, che era la superficie di marmo più estesa della città, è anche la più redditizia da smontare.</p>\n    <p class=\"key\">Prima causa per cui nessuno scavò «per sapere»: quando l’archeologia diventa pensabile, il valore recuperabile è già uscito dal sito da un pezzo.</p>",
      "src": "Parco Archeologico di Pompei, <em>Pompei dopo l’eruzione</em>"
    },
    "anfiteatro": {
      "label": "Anfiteatro",
      "sub": "Regio II",
      "body": "<p>Costruito nel <b>70 a.C.</b>, poteva accogliere fino a <b>20.000 spettatori</b>: è il più antico anfiteatro in pietra conosciuto del mondo romano. Resta parzialmente emergente e viene spogliato dei suoi blocchi.</p>\n    <p>È anche uno dei primi punti individuati quando lo scavo riprende: nel <b>1748</b> il cantiere di Civita riconosce parte dell’Anfiteatro e la necropoli di Porta Ercolano.</p>",
      "src": "Parco Archeologico di Pompei, <em>Guida agli scavi</em> · Pompeii Perspectives (da Parslow 1995)"
    },
    "palestra": {
      "label": "Palestra Grande",
      "sub": "Regio II, età augustea",
      "body": "<p>Una grande piazza quadrata scoperta di circa <b>140 × 140 m</b>, con al centro una piscina di <b>23 × 35 m</b>. Costruita in età augustea, all’inizio del I secolo d.C.</p>\n    <p class=\"hint\">È l’unico edificio del modello le cui proporzioni vengono da misure pubblicate dal Parco. Tutto il resto è schematico.</p>",
      "src": "Parco Archeologico di Pompei, <em>Guida agli scavi di Pompei</em>"
    },
    "horrea": {
      "label": "Horrea e Tempio di Venere",
      "sub": "Insula Meridionalis, estremità ovest",
      "body": "<p>Prima fase di frequentazione documentata: <b>fine I – inizi III secolo d.C.</b> Sigillata africana nelle forme Hayes 5–23, frammenti marmorei di riuso, e una moneta di età di Marco Aurelio (<b>161 d.C.</b>).</p>\n    <p class=\"key\">Ottantadue anni dopo l’eruzione qualcuno perdeva monete qui dentro. La città non era un deserto sigillato: era un luogo frequentato.</p>",
      "src": "Zuchtriegel, Borsa, Onesti, Salvatori, Scarpati 2025"
    },
    "mosaici": {
      "label": "Casa dei Mosaici Geometrici",
      "sub": "Regio VIII, Insula Meridionalis",
      "body": "<p>Seconda fase, <b>IV–V secolo</b>: insediamento stabile. Nell’ambiente III un <b>forno da pane ricavato in una cisterna defunzionalizzata</b>, datato al V secolo; focolari e un forno secondario associati a un <em>follis</em> di Costantino II (<b>326 d.C.</b>). Ai livelli inferiori ceramica da fuoco tardoantica, sigillata africana del IV secolo, buche di palo per strutture lignee, una macina manuale in pietra lavica e un fuso in osso lavorato.</p>\n    <p class=\"key\">Da qui viene anche il catino smaltato del <b>XV secolo</b>: la stessa casa documenta millequattrocento anni di frequentazione discontinua.</p>",
      "src": "Zuchtriegel et al. 2025 · <em>Pompei oltre il 79 d.C.</em>, E-Journal 2026.09"
    },
    "quadriportico": {
      "label": "Quadriportico dei Teatri",
      "sub": "Insula Meridionalis, estremità est",
      "body": "<p>Estremità orientale dell’Insula Meridionalis, il quartiere che va da qui alla Villa Imperiale a ovest. È il settore del cantiere di consolidamento avviato nel <b>settembre 2023</b>, da cui vengono tutte le evidenze post-79 di questa ricostruzione.</p>\n    <p class=\"key\">La tesi degli autori: le tracce post-79 <b>sono state rimosse</b> dagli scavi precedenti, perché ogni campagna puntava al livello del 79 d.C. La documentazione che risponderebbe alla domanda l’ha distrutta la disciplina che doveva raccoglierla.</p>",
      "src": "Zuchtriegel et al. 2025, «inconscio archeologico»"
    },
    "basilica": {
      "label": "Area a sud della Basilica",
      "sub": "Regio VIII",
      "body": "<p>Livelli di frequentazione con strutture lignee segnalate da buche di palo, e ceramica: un <b>catino invetriato integro, smalto bianco e decoro verde, produzione campana del XV secolo</b>; frammenti di fiasca a due anse e di brocca invetriate del XV–XVI secolo.</p>\n    <p class=\"key\">È il reperto che rovescia la premessa. Mentre a Firenze si costruiva la cupola, qualcuno mangiava qui dentro.</p>",
      "src": "<em>Pompei oltre il 79 d.C.</em>, E-Journal degli Scavi di Pompei 2026.09, 21/08/2026"
    },
    "canale": {
      "label": "Canale del Conte di Sarno",
      "sub": "1592–1600",
      "body": "<p>Nel <b>1592</b> il conte Muzio Tuttavilla incarica <b>Domenico Fontana</b> di costruire un canale per portare acqua ai mulini di Torre Annunziata. Tra il <b>1594 e il 1600</b> il tracciato attraversa la collina di Civita e restituisce monete e resti di edifici. Nessuno collega quei resti alla città romana.</p>\n    <p class=\"warn\"><b>Il tracciato che vedi è inventato.</b> Cercando una fonte scientifica sul percorso esatto sotto la città non ho trovato nulla: l’unica trattazione estesa che esiste è autopubblicata e legata a una tesi di ridatazione di Pompei, quindi inutilizzabile. Anche la versione secondo cui Fontana avrebbe intercettato affreschi e iscrizioni è ripetuta ovunque senza una fonte primaria.</p>",
      "src": "Parco Archeologico di Pompei · <em>Manifatture in Campania</em>, Giunti 1983, pp. 126–127"
    },
    "porta-ercolano": {
      "label": "Porta Ercolano",
      "sub": "necropoli suburbana",
      "body": "<p><b>23 marzo 1748.</b> Il primo cantiere sistematico a Civita individua parte dell’Anfiteatro e la necropoli di Porta Ercolano. Poi viene sospeso: pochi reperti di pregio.</p>\n    <p class=\"key\">L’obiettivo dichiarato non era conoscere. Era estrarre opere d’arte e manufatti per decorare la reggia di Portici. Alcubierre credeva peraltro di essere a Stabiae.</p>",
      "src": "Pompeii Perspectives (da Parslow 1995) · Britannica"
    },
    "giulia-felice": {
      "label": "Praedia di Giulia Felice",
      "sub": "Regio II, insula 4",
      "body": "<p>Prima proprietà scavata su via dell’Abbondanza, <b>1755–1757</b>, sotto la supervisione di <b>Karl Jakob Weber</b>. Weber produce planimetrie dettagliate — tre versioni conservate negli archivi di Napoli — e inventari settimanali dei ritrovamenti.</p>\n    <p class=\"key\">È il momento in cui la caccia al tesoro comincia a diventare documentazione. Non ancora archeologia: ma la prima volta che qualcuno registra <em>dove</em> ha trovato una cosa.</p>",
      "src": "Parslow 1995, <em>Rediscovering Antiquity</em>, Cambridge University Press"
    },
    "nome": {
      "label": "L’iscrizione del 1763",
      "sub": "la città ritrova il nome",
      "body": "<p>Il ritrovamento di un’iscrizione con la formula <em class=\"lat\">rei publicae Pompeianorum</em> identifica finalmente il sito.</p>\n    <p class=\"key\">Sono passati <b>1684 anni</b> dall’eruzione e <b>15 anni</b> dall’inizio dello scavo. Per quindici anni si è scavato Pompei senza sapere che fosse Pompei.</p>",
      "src": "Britannica, <em>Pompeii — History of excavations</em>"
    },
    "sicilo": {
      "label": "L’epitaffio di Sicilo",
      "sub": "perché non senti una melodia",
      "body": "<p>Il sonoro di questo modello riproduce il <b>timbro</b> di strumenti attestati nell’area vesuviana. <b>Non esegue nessuna melodia antica</b>, e la ragione va detta.</p>\n    <p>Della musica greco-romana sopravvivono pochissimi documenti notati. Il più completo è l’<b>epitaffio di Sicilo</b>: una stele iscritta trovata verso il 1883 durante i lavori della ferrovia a <b>Tralleis</b>, presso l’odierna Aydın in Turchia, oggi al <b>Nationalmuseet di Copenaghen, inv. 14897</b>. Alta 61 cm. Dodici righe: cinque di dedica, sette con il carme e la notazione vocale alfabetica scritta sopra le parole.</p>\n    <p class=\"lat\">ὅσον ζῇς, φαίνου· μηδὲν ὅλως σὺ λυποῦ·<br>πρὸς ὀλίγον ἐστὶ τὸ ζῆν, τὸ τέλος ὁ χρόνος ἀπαιτεῖ.</p>\n    <p>«Per quanto vivi, risplendi; non affliggerti affatto; per poco è il vivere, il tempo esige il suo termine.» <span class=\"cite-in\">testo come stampato in Rohland 2022, CUP; resa italiana mia</span></p>\n    <p class=\"key\">Perché allora non la senti. La <b>sequenza dei segni e le durate non le ho verificate sull’edizione critica</b> — Pöhlmann &amp; West, <em>Documents of Ancient Greek Music</em>, Clarendon 2001, nr. 23, pp. 88–91. Suonare una melodia che non ho controllato significherebbe mettere nel progetto l’unica cosa senza fonte, dopo che tutto il resto è annotato riga per riga. Il posto per la melodia c’è, ed è vuoto finché quel volume non è stato aperto.</p>\n    <p class=\"warn\">Aperte anche: la <b>datazione</b> (I secolo secondo Mathiesen, II secondo Pöhlmann &amp; West, entrambi su base paleografica) e lo <b>scopritore</b> (Purser secondo l’edizione standard, Ramsay secondo altre fonti; Ramsay è comunque chi pubblicò, in <em>BCH</em> 7, 1883). Conflitti dichiarati, non risolti.</p>",
      "src": "Rohland 2022, <em>Carpe Diem</em>, Cambridge University Press · Nationalmuseet, inv. 14897 · Pöhlmann &amp; West 2001, nr. 23 <b>[da verificare]</b>"
    },
    "strumenti": {
      "label": "Gli strumenti che senti",
      "sub": "reperto o iconografia",
      "body": "<p>Ogni strumento del sonoro porta con sé la sua <b>categoria di prova</b>, e le due non vanno confuse.</p>\n    <p class=\"key\"><b>Reperto</b> — oggetti effettivamente scavati.<br>\n    <b>Tibiae</b>: circa settanta rinvenimenti riferibili a tibiae da Pompei, di cui <b>quindici strumenti completi</b>. Le quattro famose sono al MANN, inv. 76891–76894, scavate nel 1867: canne d’avorio rivestite di metallo, con anelli girevoli alternati d’argento e di lega di rame.<br>\n    <b>Cornua</b>: <b>cinque</b> esemplari da Pompei al MANN.<br>\n    <b>Cymbala</b>: <b>sei coppie e tre esemplari sciolti</b> dai siti pompeiani, dischi concavi in bronzo, la maggior parte delle coppie ancora unite dalla catenella.</p>\n    <p class=\"warn\"><b>Iconografia soltanto</b> — la <b>cetra</b>. A Pompei e a Ercolano <b>non sopravvive nessuno strumento a corda</b>: legno e budello non ce la fanno. La cetra c’è dappertutto sulle pareti e nella statuaria, non c’è in nessuna vetrina. La <b>Casa del Citarista</b> (I.4.5) prende il nome da una statua bronzea di Apollo che suona la cetra, non da uno strumento trovato lì: è il caso che tiene insieme le due categorie in una riga sola.</p>\n    <p class=\"warn\"><b>Fuori</b>: arpa e liuto. Non risultano né come reperto né nell’iconografia pompeiana. È assenza di prova, non prova d’assenza — ma finché non c’è la prova, restano fuori. Fuori anche il <b>tympanum</b>: compare negli affreschi, non fra i rinvenimenti.</p>\n    <p class=\"warn\">Le <b>altezze</b> usate dalla cetra sono una convenzione moderna, non una ricostruzione. L’<b>ambiente sonoro</b> — folla, lapilli, vento, picconi — è un’evocazione dichiarata: nessuna fonte descrive il paesaggio sonoro di Pompei.</p>",
      "src": "Mungari &amp; Wysłucha 2021, <em>Open Arts Journal</em> 10 · Hagel 2008, <em>JHS</em> 128 · Pelosi et al. 2016, <em>IJCS</em> 7(SI2) · Schiattone et al. 2024, <em>Heritage</em> 7(5) · Soprintendenza Pompei, <em>Guida agli scavi</em> 2015"
    }
  },
  "ercolano": {
    "fronte": {
      "label": "Il fronte di scavo",
      "sub": "sopra: corso Resina",
      "body": "<p>Questo muro di deposito è il limite dello scavo. Il <b>Decumano Massimo</b>, la strada che hai davanti, «funge oggi da demarcazione tra la zona scavata e quella ancora sepolta <b>sotto corso Resina</b>».</p>\n      <p>Corso Resina è l'antica <em>Strada Regia delle Calabrie</em>, la via per Napoli, parte del Miglio d'Oro. Sotto ci sono il resto della città, il teatro e la Villa dei Papiri.</p>\n      <p class=\"key\">L'UNESCO lo dice senza giri di parole: l'integrità del sito «sarebbe migliorata dall'inclusione nella proprietà del teatro e della maggior parte della città antica con i suoi monumenti pubblici più significativi, ancora sepolti sotto la moderna Ercolano».</p>\n      <p class=\"warn\">L'altezza del fronte qui è disegnata a <b>20 m</b>, il valore modale per lo spessore del deposito. ⚠️ Non ho trovato una misura pubblicata dell'altezza della scarpata in quanto tale, distinta dallo spessore del deposito: le cifre di spessore vanno da «16 e più metri» (Maiuri 1960) a «circa 20 m» (Parco) a «fino a 30 m sotto la città moderna» (D'Andrea et al. 2019). <b>Da verificare</b> su una sezione dell'Herculaneum Conservation Project.</p>",
      "src": "Parco Archeologico di Ercolano, <em>Area archeologica</em> · UNESCO WHC, lista 829 · D’Andrea et al. 2019, <em>ISPRS Archives</em> XLII-2/W15, 359–364"
    },
    "fornici": {
      "label": "I dodici fornici",
      "sub": "la spiaggia antica",
      "body": "<p><b>Dodici</b> ambienti voltati sulla spiaggia antica, sei a ovest e sei a est della scalinata, probabilmente depositi per attrezzi da pesca e ricovero per piccole imbarcazioni.</p>\n      <p>Dal <b>1980</b> vi si trovano resti umani, in <b>nove dei dodici</b> vani: chi non riuscì a imbarcarsi. Con loro gioielli, ceste, borse con monete, chiavi di casa, amuleti, attrezzi da lavoro e un set chirurgico. Sulla spiaggia, una barca in legno e il pronao crollato del tempio di Venere.</p>\n      <p class=\"warn\">⚠️ <b>Il numero dei morti non è un dato stabile.</b> Il Parco dice circa <b>300</b>; Pappalardo nel 1994 scriveva <b>230</b> in tutto, di cui una sessantina sulla spiaggia; en.wikipedia riporta una progressione 55 → 296 → 340. Parte della differenza è probabilmente la data di pubblicazione, non un disaccordo di merito — ma nessuna fonte lo dice, quindi non lo do per risolto.</p>\n      <p class=\"key\">Qui sta la differenza con Pompei, in una riga: a Pompei si muore soprattutto sotto i crolli e nelle correnti, dopo ore di caduta di pomici che dà il tempo di scappare. A Ercolano le correnti piroclastiche arrivano <b>per prime</b>, e chi era sceso alla spiaggia ad aspettare le barche non ha avuto quel tempo.</p>",
      "src": "Parco Archeologico di Ercolano, <em>I fuggiaschi</em> · Pappalardo 1994, <em>Enciclopedia dell’Arte Antica</em> · Guidobaldi &amp; Esposito 2013, pp. 21–26 · Martyn et al. 2020, <em>Antiquity</em> 94(373), 76–91"
    },
    "cervi": {
      "label": "Casa dei Cervi",
      "sub": "IV.21",
      "body": "<p>All'estremità sud dell'<b>Insula IV</b>, con l'ingresso sul Cardo V e una terrazza affacciata sul golfo. Circa <b>1.190 m²</b>: una delle case più grandi dello scavo, orientata non sulla strada ma sul panorama.</p>\n      <p>Prende il nome dai due gruppi scultorei di cervi assaliti dai cani trovati nel giardino.</p>\n      <p class=\"warn\">Le volumetrie qui sono schematiche: la superficie è la sola misura pubblicata che ho verificato, il resto della sagoma è ricostruito a occhio dalla pianta. Non usarlo come rilievo.</p>",
      "src": "De Vos &amp; De Vos 1982, via it.wikipedia <b>[fonte terziaria]</b> · pianta: herculaneum.uk, Insula IV"
    },
    "palestra": {
      "label": "La Palestra",
      "sub": "Insula Orientalis II",
      "body": "<p>Il campo misura <b>77 × 47 m</b> — è la misura pubblicata più solida che ho su un edificio di Ercolano. Ingresso dal Cardo V (Ins. Or. II.4), uscita verso il Decumano Inferiore.</p>\n      <p class=\"key\">È il posto dove si vede meglio cosa vuol dire scavare a Ercolano: il campo è <b>ancora in gran parte sepolto</b>, e la vasca cruciforme al centro fu raggiunta scavando <b>come in una caverna</b> sotto il deposito, non dall'alto. Nel modello il lato ancora sepolto è disegnato come deposito, non come edificio.</p>",
      "src": "Maiuri 1960, <em>Enciclopedia dell’Arte Antica</em>, voce «Ercolano» · Parco Archeologico di Ercolano"
    },
    "graticcio": {
      "label": "Casa a Graticcio",
      "sub": "III.14 — il legno che resiste",
      "body": "<p>Insula III, sul Cardo IV Inferiore. Costruita in <b>opus craticium</b>: telaio di legno riempito di canne e malta, l'edilizia economica romana.</p>\n      <p class=\"key\">A Pompei un edificio così non ci sarebbe: il legno non sopravvive. A Ercolano le correnti piroclastiche hanno <b>carbonizzato</b> invece di bruciare, e travi, tramezzi, porte, letti e perfino una culla sono arrivati fino a noi. È l'altra faccia dei venti metri di deposito: seppelliscono peggio, conservano meglio.</p>\n      <p class=\"warn\">⚠️ L'indirizzo è in conflitto fra le fonti: <b>III.14</b> secondo herculaneum.uk, <b>III.15</b> secondo il Madain Project. Non l'ho risolto.</p>",
      "src": "herculaneum.uk, Insula III <b>[fonte documentaria, non peer-reviewed]</b> · Madain Project <b>[terziaria]</b>"
    },
    "teatro": {
      "label": "Il teatro",
      "sub": "non è qui: è sotto la città",
      "body": "<p>Non lo vedi perché non è nello scavo all'aperto: sta <b>sotto il centro storico moderno</b>, con l'ingresso su corso Resina, a circa <b>25 m dalla quota stradale</b>. Ci si arriva solo per i pozzi e le gallerie scavati dagli ingegneri borbonici.</p>\n      <p class=\"key\">Fu il <b>primo monumento trovato</b>, nel 1738, quando cominciò l'esplorazione sistematica: la storia dello scavo di Ercolano comincia da un edificio che ancora oggi non si può vedere dall'alto.</p>\n      <p class=\"warn\">⚠️ Sulla profondità le fonti divergono: <b>25 m</b> sulla pagina del Parco, <b>20 m</b> in una presentazione video del direttore Sirano rilanciata nel 2020. Ho usato la cifra del Parco.</p>",
      "src": "Parco Archeologico di Ercolano, <em>Il Teatro di Ercolano</em> e <em>La scoperta e gli scavi</em>"
    },
    "papiri": {
      "label": "Villa dei Papiri",
      "sub": "anch’essa ancora sepolta",
      "body": "<p>Da questa parte, oltre il fronte di scavo. Si sviluppa su un fronte di <b>oltre 250 m</b>, parallela alla linea di costa, su almeno <b>tre livelli di terrazzamento</b>.</p>\n      <p>Fu esplorata nel Settecento per cunicoli — la pianta di <b>Karl Weber è del 1754</b> — e da lì vennero i bronzi e i <b>rotoli di papiro carbonizzati</b> che le danno il nome. All'aperto è stata scavata pochissimo: l'atrio in parte fra il <b>1996 e il 1998</b>, il padiglione sul mare nel <b>2007</b>.</p>\n      <p class=\"warn\">⚠️ Sulla posizione le fonti ufficiali non concordano fra loro: il Ministero la dice «all'estremo limite <b>settentrionale</b>» degli scavi nuovi, Maiuri la colloca «a <b>ovest</b> dell'abitato». Compatibili solo se si intende nord-ovest, ma nessuna delle due lo dice. Nel modello è indicata di lato, senza pretesa di posizione esatta. La distanza dalla città non l'ho trovata pubblicata.</p>",
      "src": "Ministero della cultura, <em>Villa dei Papiri</em> · Parco Archeologico di Ercolano · Maiuri 1960 · Pappalardo 1994"
    },
    "quanto": {
      "label": "Quanto è scavato",
      "sub": "e perché il resto no",
      "body": "<p>Sei sul <b>Decumano Inferiore</b>, al centro dell'area archeologica. Ciò che puoi percorrere è quasi tutto quello che c'è: <b>quattro insulae intere</b> (III, IV, V, VI) più le due Insulae Orientalis, e in parte la II e la VII.</p>\n      <p>Della città antica sono visibili <b>poco più di 4 ettari</b> secondo il Parco. Sull'estensione totale le fonti non concordano: il Parco dice «circa venti ettari», dichiarandolo ipotetico; <b>Maiuri</b> nel 1960 dava un rettangolo di <b>370 × 320 m</b>, cioè 11–12 ettari compresi gli edifici extramurali. Non li riconcilio: sono l'unico dato metrico pubblicato e una stima dichiarata tale.</p>\n      <p class=\"key\">Perché il resto non si scava è la domanda vera, e la risposta non è archeologica: sopra c'è una città viva. Scavare Ercolano significa espropriare e demolire Ercolano.</p>\n      <p class=\"warn\">⚠️ Anche sul quanto è scavato c'è una discrepanza: «oltre quattro ettari» per il Parco, «circa 60.000 m²» (6 ha) nel lavoro GIS dell'Herculaneum Conservation Project. Nessuna fonte spiega la differenza.</p>",
      "src": "Parco Archeologico di Ercolano, <em>Area archeologica</em> · Maiuri 1960, <em>Enc. dell’Arte Antica</em> · D’Andrea et al. 2019, <em>ISPRS Archives</em> XLII-2/W15"
    },
    "griglia": {
      "label": "Cardini e decumani",
      "sub": "come leggere la pianta",
      "body": "<p>La città ha <b>tre decumani</b>, di cui <b>due scavati</b>, e <b>cinque cardini</b>, di cui sono visibili il <b>terzo, il quarto e il quinto</b>. Cardo I e II si conoscono solo dalle piante borboniche.</p>\n      <p>I decumani corrono paralleli alla costa, i cardini perpendicolari. Il Decumano Massimo, a monte, era chiuso ai carri: aperto ai soli pedoni, con marciapiedi bassi e larghi e un portico ombroso.</p>\n      <p class=\"warn\">⚠️ <b>L'orientamento vero non è verificato.</b> Il Parco e Maiuri danno la costa a ovest / l'asse NO-SE; una fonte universitaria britannica dà la strada costiera in direzione NE-SO. Non l'ho risolto, quindi questa scena è costruita nella <b>convenzione di sito</b> — Decumano Massimo a monte, mare a valle — e non nel nord vero. La bussola qui dice «lato mare», non «nord». Chiuderebbe la lacuna una pianta georiferita con l'azimut dichiarato.</p>",
      "src": "Parco Archeologico di Ercolano · Maiuri, citato in herculaneum.uk, <em>Decumanus Maximus</em> · it.wikipedia <b>[terziaria]</b>"
    }
  },
  "scena": {
    "vesuvio": "Vesuvio",
    "strati": {
      "correnti": "correnti piroclastiche",
      "grigi": "lapilli grigi",
      "bianchi": "lapilli bianchi",
      "piano": "piano del 79 d.C."
    }
  }
};
