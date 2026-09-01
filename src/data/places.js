/* =====================================================================
   LUOGHI DI POMPEI — struttura, non prosa.

   Posizione del cono nel modello e in quali fasi esiste (`from`–`to`).
   Etichetta, sottotitolo, scheda e fonte stanno in i18n/.
   ===================================================================== */

export const PLACES = [
  { id:"vesuvio", x:-66, z:-190, y:34, from:0, to:1 },
  { id:"soccorsi", x:-108, z:-6, y:3, from:0, to:2 },
  { id:"stratigrafia", x:10, z:4, y:3, from:1, to:7 },
  { id:"popidius", x:-62, z:6, y:2.6, from:2, to:7 },
  { id:"casa-giardino", x:-22, z:-44, y:2.6, from:2, to:7 },
  { id:"foro", x:-108, z:8, y:3.4, from:2, to:7 },
  { id:"anfiteatro", x:124, z:36, y:4, from:2, to:7 },
  { id:"palestra", x:87, z:41, y:3, from:0, to:7 },
  { id:"horrea", x:-132, z:38, y:3, from:2, to:7 },
  { id:"mosaici", x:-95, z:48, y:3, from:3, to:7 },
  { id:"quadriportico", x:-62, z:60, y:3, from:3, to:7 },
  { id:"basilica", x:-118, z:30, y:3, from:4, to:7 },
  { id:"canale", x:-86, z:44, y:2.4, from:5, to:6 },
  { id:"porta-ercolano", x:-118, z:-55, y:2.6, from:6, to:7 },
  { id:"giulia-felice", x:95, z:-2, y:3, from:6, to:7 },
  { id:"nome", x:-100, z:20, y:3, from:6, to:7 },
  { id:"sicilo", x:-150, z:52, y:6, from:0, to:7 },
  { id:"strumenti", x:-96, z:44, y:6, from:0, to:7 }
];
