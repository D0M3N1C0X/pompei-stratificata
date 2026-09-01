/* =====================================================================
   FASI — struttura, non prosa.

   Qui c'è solo ciò che il modello 3D deve sapere: quanto deposito, quali
   gruppi accendere, com'è la luce. Tag, nome, didascalia e fonte stanno
   in i18n/, e vengono uniti a questi oggetti prima che la scena nasca.

   Il motivo è pratico: un traduttore riceve un file di solo testo e non
   può rompere la geometria.
   ===================================================================== */

export const EPOCHS = [
  { id:0, sun:1, warm:0, deposit:0, roofsA:1, roofsB:1, shanty:0, veg:0, canal:0, spoil:0, ash:0 },
  { id:1, sun:0.42, warm:1, deposit:1.25, roofsA:1, roofsB:1, shanty:0, veg:0, canal:0, spoil:0, ash:1 },
  { id:2, sun:0.9, warm:0.2, deposit:1.25, roofsA:1, roofsB:0, shanty:0, veg:0, canal:0, spoil:0, ash:0 },
  { id:3, sun:0.85, warm:0.15, deposit:1.25, roofsA:0, roofsB:0, shanty:1, veg:0, canal:0, spoil:0, ash:0 },
  { id:4, sun:1, warm:0, deposit:1.25, roofsA:0, roofsB:0, shanty:0, veg:1, canal:0, spoil:0, ash:0 },
  { id:5, sun:0.95, warm:0, deposit:1.25, roofsA:0, roofsB:0, shanty:0, veg:1, canal:1, spoil:0, ash:0 },
  { id:6, sun:1, warm:0, deposit:0.7, roofsA:0, roofsB:0, shanty:0, veg:1, canal:1, spoil:1, ash:0 },
  { id:7, sun:1.05, warm:0, deposit:0, roofsA:0, roofsB:0, shanty:0, veg:0, canal:0, spoil:1, ash:0 }
];
