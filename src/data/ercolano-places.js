/* =====================================================================
   ERCOLANO — griglia e luoghi, struttura soltanto.

   La convenzione di sito: Decumano Massimo a monte, mare a valle. Non è
   il nord vero — l'azimut della griglia non risulta pubblicato, e le
   fonti divergono fra NO-SE e NE-SO. In questa scena la bussola dice
   «lato mare», non «nord».

   Etichetta, sottotitolo, scheda e fonte di ogni luogo stanno in i18n/ e
   vengono uniti qui prima che la scena costruisca i coni.
   ===================================================================== */

export const DEC_MAX = -26, DEC_INF = 0;   // decumani (z)
export const C3 = -20, C4 = 0, C5 = 20;    // cardini (x)
export const BEACH_Y = -2.5;               // 10 m sotto il piano della città

export const LUOGHI = [
    { id:'fronte', x:2, z:DEC_MAX-2, y:3.2 },
    { id:'fornici', x:6, z:34, y:BEACH_Y+2.6 },
    { id:'cervi', x:9, z:21, y:2.4 },
    { id:'palestra', x:24.5, z:-16, y:2.6 },
    { id:'graticcio', x:-4, z:4.5, y:2.4 },
    { id:'teatro', x:-14, z:DEC_MAX-2, y:3.6 },
    { id:'papiri', x:-40, z:-14, y:6.6 },
    { id:'quanto', x:2, z:DEC_INF, y:2.6 },
    { id:'griglia', x:C4, z:-13, y:2.6 }
];