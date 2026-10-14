/* =====================================================================
   ERCOLANO — griglia e luoghi, struttura soltanto.

   La convenzione di sito: Decumano Massimo a monte, mare a valle. Dal 13
   ottobre 2026 la pianta viene da OpenStreetMap, che dà l'azimut vero:
   cardini a 58°, decumani a 147° (da nord-ovest a sud-est). La scena è
   ruotata perché i cardini corrano lungo Z, quindi la bussola continua a
   dire «lato mare», non «nord».

   Etichetta, sottotitolo, scheda e fonte di ogni luogo stanno in i18n/ e
   vengono uniti qui prima che la scena costruisca i coni.
   ===================================================================== */

import { ANCORE, QUOTA, SCARP_H } from '../ercolano-pianta.js';

// Dal 13 ottobre 2026 assi e luoghi vengono dalla pianta vera (OpenStreetMap,
// vedi ercolano-pianta.js): prima erano numeri messi a mano.
export const DEC_MAX = ANCORE.DEC_MAX, DEC_INF = ANCORE.DEC_INF;   // decumani (z)
export const C3 = ANCORE.C3, C4 = ANCORE.C4, C5 = ANCORE.C5;       // cardini (x)
export const BEACH_Y = QUOTA.spiaggia;                             // 10 m sotto il piano della città

export const LUOGHI = [
    { id:'fronte', x:C4, z:DEC_MAX-3, y:2.6 },
    { id:'fornici', x:2.5, z:29.6, y:BEACH_Y+2.6 },
    { id:'cervi', x:ANCORE.cervi[0], z:ANCORE.cervi[1], y:2.4 },
    { id:'terme', x:ANCORE.terme[0], z:ANCORE.terme[1], y:QUOTA.terrazza + 2.4 },
    // sul Cardo III, davanti al muro est della Basilica (vedi ercolano.js)
    { id:'basilica', x:-49/4, z:-71.5/4, y:2.4 },
    { id:'palestra', x:ANCORE.palestra.x0 + 0.6, z:-10, y:2.6 },
    { id:'graticcio', x:ANCORE.graticcio[0], z:ANCORE.graticcio[1], y:2.4 },
    { id:'teatro', x:ANCORE.teatro[0], z:ANCORE.teatro[1], y:SCARP_H + 1.2 },
    { id:'papiri', x:ANCORE.papiri[0], z:ANCORE.papiri[1], y:1.6 },
    { id:'quanto', x:C4 + 0.5, z:DEC_INF, y:2.6 },
    { id:'griglia', x:C4, z:-11, y:2.6 }
];