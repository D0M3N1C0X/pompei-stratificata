/* =====================================================================
   L'ERUZIONE ORA PER ORA — struttura soltanto.

   Il tempo si conta in ore da «hora fere septima» del primo giorno, cioè
   verso le 13 (Plinio il Giovane, Ep. 6.16.4): l'ora settima romana è la
   prima dopo mezzogiorno in ogni stagione, quindi non dipende dalla data,
   che resta controversa (24 agosto nei manoscritti, autunno per altri
   indizi: vedi la scheda del Vesuvio). Il giorno non ha nome di mese.

   Ogni evento ha un'ora o, quando l'ora non è documentata nelle fonti che
   ho letto, una FASCIA (t0–t1): la scena e la barra la disegnano come
   fascia, non come istante. La certezza dice da dove viene il dato:
     primaria   Plinio il Giovane, testimone
     studio     articolo scientifico letto (Mastrolorenzo et al. 2010, CC BY;
                Sparice et al. 2024)
     terziaria  sintesi (en.wikipedia) di studi che non ho letto
                (Sigurdsson, Cashdollar & Sparks 1982)
     disegno    scelta del modello, dichiarata

   «vai» è il punto della fascia su cui si ferma la barra (di solito t0;
   per la S4 il centro, dove la scena disegna il passaggio).
   Testi e fonti di ogni evento stanno in i18n/ (eruzione.<id>).
   ===================================================================== */

// il modello degli strati, in ore [vedi le note in i18n eruzione.modello]
export const CADUTA_FINE = 18;      // caduta pliniana di 18–20 ore [terziaria]
export const BIANCA_FINE = 9;       // passaggio bianco → grigio: a metà, per
                                    // proporzione degli spessori [disegno]
export const S4 = [15, 19];         // la corrente che entra in Pompei: «nelle
                                    // prime ore del secondo giorno» [terziaria]
export const FINE_CORRENTI = 20;    // S5 e S6 dopo la S4 [studio; ora disegno]
export const DURATA = 43;           // fino all'alba del terzo giorno

export const EVENTI = [
  { id:'nube',      t0:0,     luogo:'miseno',   certezza:'primaria' },
  { id:'bianca',    t0:0.5,   luogo:'pompei',   certezza:'terziaria' },
  { id:'ercolano0', t0:1,     luogo:'ercolano', certezza:'terziaria' },
  { id:'navi',      t0:1.5,   t1:6, luogo:'mare', certezza:'primaria' },
  { id:'crolli',    t0:5,     t1:17, luogo:'pompei', certezza:'studio' },
  { id:'grigia',    t0:9,     luogo:'pompei',   certezza:'disegno' },
  { id:'stabia',    t0:11,    t1:16, luogo:'stabia', certezza:'primaria' },
  { id:'ercolano1', t0:11,    t1:17, luogo:'ercolano', certezza:'terziaria' },
  { id:'mura',      t0:13,    t1:17, luogo:'pompei', certezza:'studio' },
  { id:'s4',        t0:S4[0], t1:S4[1], vai:(S4[0]+S4[1])/2, luogo:'pompei', certezza:'studio' },
  { id:'miseno',    t0:17,    t1:18, vai:17.6, luogo:'miseno', certezza:'primaria' },
  { id:'plinio',    t0:17,    t1:20, vai:18.3, luogo:'stabia', certezza:'primaria' },
  { id:'ultime',    t0:19,    t1:FINE_CORRENTI, luogo:'pompei', certezza:'studio' },
  { id:'sera',      t0:29,    luogo:'miseno',   certezza:'terziaria' },
  { id:'corpo',     t0:DURATA - 1, luogo:'stabia', certezza:'primaria' }
];

const c = x => Math.max(0, Math.min(1, x));
// Lo stato della scena all'ora t: quanto è cresciuto ogni strato (0–1),
// la cenere che cade e di che colore, il buio, la nube della corrente.
export function statoEruzione(t){
  const bianca = c(t / BIANCA_FINE);
  const grigia = c((t - BIANCA_FINE) / (CADUTA_FINE - BIANCA_FINE));
  // la S4 deposita poco (3 cm, Mastrolorenzo 2010): lo strato delle correnti
  // cresce soprattutto con quelle dopo; qui un terzo alla S4, il resto entro
  // FINE_CORRENTI [disegno]
  const mezzoS4 = (S4[0] + S4[1]) / 2;
  const correnti = t < mezzoS4 ? 0 : t < mezzoS4 + 0.4 ? c((t - mezzoS4) / 0.4) / 3
                 : 1/3 + c((t - mezzoS4 - 0.4) / (FINE_CORRENTI - mezzoS4 - 0.4)) * 2/3;
  // il buio: la nube toglie la luce già nel pomeriggio, la notte fa il resto;
  // a Miseno, all'alba del secondo giorno, «come in una stanza chiusa a
  // lume spento» (Ep. 6.20.14). Proporzioni di disegno.
  const ore = 13 + t, h = ore % 24;
  const notte = h < 6.5 || h > 18 ? 1 : h < 7.5 ? 7.5 - h : h > 17 ? h - 17 : 0;
  const nube = t < 0.5 ? 0 : t < CADUTA_FINE + 2 ? 0.55 + 0.35 * c((t - 0.5) / 10) : 0.9 - 0.6 * c((t - 22) / 12);
  const buio = c(Math.max(notte * 0.85, nube));
  // la corrente che passa: 30–150 s (Mastrolorenzo 2010), qui una nube
  // di qualche minuto di tempo-modello attorno al centro della fascia
  const corrente = Math.max(0, 1 - Math.abs(t - mezzoS4) / 0.35);
  return { bianca, grigia, correnti, cenere: t > 0.3 && t < CADUTA_FINE + 1,
           cenereGrigia: t >= BIANCA_FINE, buio, corrente, ore };
}

// il punto d'arrivo di ogni evento sulla barra
export const puntoEvento = e => e.vai ?? e.t0;
