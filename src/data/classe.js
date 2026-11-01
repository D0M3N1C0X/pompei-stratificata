/* =====================================================================
   IN CLASSE — percorsi e domande, struttura soltanto.

   Due percorsi a tempo per l'insegnante (modalità «Lavagna») e per lo
   studente (stesse tappe, senza le risposte). Ogni tappa è un momento
   dell'eruzione ora per ora (src/data/eruzione.js) o un luogo con la sua
   scheda; i minuti sono un consiglio, non un vincolo.

   Ogni domanda poggia su una scheda già scritta e sulla sua fonte: la
   risposta non aggiunge fatti nuovi, li rimette in ordine per la classe.
   Testi in i18n/ (classe.domande.<id>: q, r, fonte).
   ===================================================================== */

export const PERCORSI = {
  breve: { minuti:20, tappe:[
    { tipo:'eruzione', ore:0,    minuti:3, domande:['nube'] },
    { tipo:'eruzione', ore:5,    minuti:3, domande:['crolli'] },
    { tipo:'eruzione', ore:17,   minuti:4, domande:['s4', 'fasce'] },
    { tipo:'eruzione', ore:12.6, citta:'ercolano', minuti:4, domande:['ercolano'] },
    { tipo:'luogo', id:'stratigrafia', minuti:3, domande:['cinqueMetri'] },
    { tipo:'luogo', id:'lacuna',       minuti:3, domande:['lacuna'] }
  ]},
  completo: { minuti:50, tappe:[
    { tipo:'eruzione', ore:0,    minuti:4, domande:['nube'] },
    { tipo:'eruzione', ore:17,   minuti:5, domande:['s4', 'fasce'] },
    { tipo:'eruzione', ore:12.6, citta:'ercolano', minuti:4, domande:['ercolano'] },
    { tipo:'luogo', id:'stratigrafia',  minuti:4, domande:['cinqueMetri', 'confronto'] },
    { tipo:'luogo', id:'soccorsi',      minuti:4, domande:['soccorsi'] },
    { tipo:'luogo', id:'foro',          minuti:3, domande:['foro'] },
    { tipo:'luogo', id:'horrea',        minuti:4, domande:['horrea'] },
    { tipo:'luogo', id:'mosaici',       minuti:4, domande:['mosaici'] },
    { tipo:'luogo', id:'quadriportico', minuti:4, domande:['quadriportico'] },
    { tipo:'luogo', id:'canale',        minuti:4, domande:['canale'] },
    { tipo:'luogo', id:'nome',          minuti:4, domande:['nome'] },
    { tipo:'luogo', id:'lacuna',        minuti:6, domande:['lacuna'] }
  ]}
};

export const MODALITA = ['lavagna', 'studente'];
